#v6.2.0-artemis
"""
Artemis-backed variant of main.py.

The AMQC frontend (JS/) is hard-coded to talk to an ActiveMQ "Classic" style
Jolokia API (mbean names like org.apache.activemq:type=Broker,brokerName=...).
Those calls cannot be changed, so this backend keeps the exact same routes as
main.py but internally translates every request to the equivalent Apache
ActiveMQ Artemis management call (org.apache.activemq.artemis:broker=... JMX
via Jolokia at /console/jolokia), and reshapes the Artemis response back into
the shape/attribute-names the frontend expects.

Config (env vars):
  ARTEMIS_HOST          default "localhost"
  ARTEMIS_HTTP_PORT     default "8161"   (Artemis web console / Jolokia port)
  ARTEMIS_STOMP_PORT    default "61616"  (used only for sending messages)
  ARTEMIS_BROKER_NAME   default "0.0.0.0" (the <name> from broker.xml)
  ARTEMIS_JOLOKIA_PATH  default "/console/jolokia"
  AMQC_PREFIX           same meaning as in main.py

Known limitations (Artemis has no exact equivalent of these Classic features,
so they are approximated on a best-effort basis - verify against your broker):
  - Per-connection Producers/Consumers counts and "slow/blocked" flags are not
    available from Artemis' listConnections() and are left empty/False.
  - Durable subscriptions are emulated as a queue bound to the topic address
    named "<clientId>.<subscriptionName>". This matches common Artemis JMS
    naming but may not match every client/version - adjust if subscriptions
    don't show up as expected.
  - removeMessage takes a Classic JMS message ID (string) but Artemis's
    removeMessage() needs its own internal numeric message ID, so we browse
    the queue first to resolve it. This is slower and can fail to find a match
    for messages produced by non-JMS clients.
  - Sending a message (POST /api/message/{target}) has no Jolokia/JMX
    equivalent in Artemis (management API cannot produce messages). This is
    implemented with a minimal raw STOMP client instead, which requires the
    STOMP protocol to be enabled on the Artemis acceptor (enabled by default).
"""
from fastapi import FastAPI

from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

import base64
import json
import os
import re
import socket

import requests

PREFIX = os.getenv("AMQC_PREFIX", "")

ARTEMIS_HOST = os.getenv("ARTEMIS_HOST", "localhost")
ARTEMIS_HTTP_PORT = os.getenv("ARTEMIS_HTTP_PORT", "8161")
ARTEMIS_STOMP_PORT = int(os.getenv("ARTEMIS_STOMP_PORT", "61616"))
ARTEMIS_BROKER_NAME = os.getenv("ARTEMIS_BROKER_NAME", "0.0.0.0")
ARTEMIS_JOLOKIA_PATH = os.getenv("ARTEMIS_JOLOKIA_PATH", "/console/jolokia")

ARTEMIS_JOLOKIA_URL = f"http://{ARTEMIS_HOST}:{ARTEMIS_HTTP_PORT}{ARTEMIS_JOLOKIA_PATH}"

app = FastAPI()

# Mount static files - use /opt/static in Docker, ../ locally
static_dir = "/opt/static" if os.path.exists("/opt/static") else "../"
app.mount(f"{PREFIX}/AMQC", StaticFiles(directory=static_dir), name="static")

session = None


def get_session(req: Request):
    global session

    if session is None:
        session = requests.Session()

    # Always update auth headers from the current request. Artemis' Jolokia
    # endpoint enforces CORS and expects an Origin header (see
    # etc/jolokia-access.xml on the broker).
    auth = req.headers.get("authorization")
    if auth:
        session.headers.update({
            "authorization": auth,
            "referer": "http://localhost",
            "origin": "http://localhost",
        })
    return session


def decode_basic_auth(auth_header):
    """Return (username, password) from a 'Basic ...' header, or (None, None)."""
    if not auth_header or not auth_header.lower().startswith("basic "):
        return None, None
    try:
        decoded = base64.b64decode(auth_header.split(" ", 1)[1]).decode("utf-8")
        user, _, pwd = decoded.partition(":")
        return user, pwd
    except Exception:
        return None, None


# ---------------------------------------------------------------------------
# Classic <-> Artemis mbean helpers
# ---------------------------------------------------------------------------

def parse_classic_mbean(mbean: str) -> dict:
    """Parse an ActiveMQ Classic style mbean string into a dict of properties."""
    _, _, rest = mbean.partition(":")
    props = {}
    for part in rest.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            props[k] = v
    return props


def broker_mbean() -> str:
    return f'org.apache.activemq.artemis:broker="{ARTEMIS_BROKER_NAME}"'


def queue_mbean(address: str, queue: str, routing_type: str) -> str:
    return (
        f'org.apache.activemq.artemis:broker="{ARTEMIS_BROKER_NAME}",'
        f'component=addresses,address="{address}",subcomponent=queues,'
        f'routing-type="{routing_type}",queue="{queue}"'
    )


def routing_type_for(destination_type: str) -> str:
    return "MULTICAST" if destination_type.lower() == "topic" else "ANYCAST"


def classic_connector_key(connection_view_type: str, connector_name: str, connection_name: str) -> str:
    return (
        f"org.apache.activemq:type=Broker,brokerName={ARTEMIS_BROKER_NAME},"
        f"connector=clientConnectors,connectorName={connector_name},"
        f"connectionViewType={connection_view_type},connectionName={connection_name}"
    )


def classic_destination_key(destination_type: str, destination_name: str) -> str:
    return (
        f"org.apache.activemq:type=Broker,brokerName={ARTEMIS_BROKER_NAME},"
        f"destinationType={destination_type},destinationName={destination_name}"
    )


def classic_consumer_key(destination_type: str, destination_name: str, client_id: str, consumer_id: str) -> str:
    return (
        f"org.apache.activemq:type=Broker,brokerName={ARTEMIS_BROKER_NAME},"
        f"destinationType={destination_type},destinationName={destination_name},"
        f"endpoint=Consumer,clientId={client_id},consumerId={consumer_id}"
    )


def jolokia_call(sess, payload: dict):
    resp = sess.post(ARTEMIS_JOLOKIA_URL, data=json.dumps(payload), headers={"content-type": "application/json"})
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != 200:
        raise RuntimeError(body.get("error", f"Jolokia call failed: {body}"))
    return body


def artemis_read(sess, mbean: str, attribute: str = None):
    payload = {"type": "read", "mbean": mbean}
    if attribute:
        payload["attribute"] = attribute
    return jolokia_call(sess, payload)["value"]


def artemis_exec(sess, mbean: str, operation: str, arguments=None):
    payload = {"type": "exec", "mbean": mbean, "operation": operation}
    if arguments is not None:
        payload["arguments"] = arguments
    return jolokia_call(sess, payload)["value"]


def broker_list(sess, operation: str, filter_obj: dict = None, page: int = -1, page_size: int = -1):
    """Call one of the broker's list* JSON search operations (listQueues,
    listConnections, listConsumers, listAddresses, ...) and return the parsed
    {"data": [...], "count": N} result."""
    options = json.dumps(filter_obj) if filter_obj else ""
    # Some list* operations (e.g. listAddresses, listSessions) are overloaded,
    # so Jolokia needs the explicit signature to pick the (options,page,pageSize) one.
    signature = f"{operation}(java.lang.String,int,int)"
    raw = artemis_exec(sess, broker_mbean(), signature, [options, page, page_size])
    return json.loads(raw)


def error_response(exc: Exception, status_code: int = 502):
    return JSONResponse(status_code=status_code, content={"error": str(exc)})


# ---------------------------------------------------------------------------
# Broker info
# ---------------------------------------------------------------------------

def transport_connectors_from_acceptors(acceptors_json: str) -> dict:
    """Reshape Artemis' AcceptorsAsJSON into the {name: url} map Classic's
    TransportConnectors attribute used, which the connector dropdown reads."""
    connectors = {}
    for a in json.loads(acceptors_json or "[]"):
        params = a.get("params", {})
        scheme = params.get("scheme", "tcp")
        host = params.get("host", "0.0.0.0")
        port = params.get("port")
        url = f"{scheme}://{host}:{port}" if port else f"{scheme}://{host}"
        connectors[a.get("name", "")] = url
    return connectors


@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost")
async def req1(request: Request):
    sess = get_session(request)
    try:
        raw = artemis_read(sess, broker_mbean())
    except Exception as exc:
        return error_response(exc)

    value = dict(raw)
    value["CurrentConnectionsCount"] = raw.get("ConnectionCount", 0)
    value["TotalEnqueueCount"] = raw.get("TotalMessagesAdded", 0)
    value["TotalDequeueCount"] = raw.get("TotalMessagesAcknowledged", 0)
    value["BrokerVersion"] = raw.get("Version", "")
    value["TransportConnectors"] = transport_connectors_from_acceptors(raw.get("AcceptorsAsJSON"))
    return {"value": value, "status": 200}


# ---------------------------------------------------------------------------
# Connections
# ---------------------------------------------------------------------------

def _connections_value(sess, connection_view_type: str):
    result = broker_list(sess, "listConnections")

    # listConnections() doesn't include per-connection producers/consumers,
    # so fetch them separately and group by remoteAddress (the only field
    # that reliably correlates a consumer/producer back to its connection).
    consumers_by_addr = {}
    for c in broker_list(sess, "listConsumers").get("data", []):
        consumers_by_addr.setdefault(c.get("remoteAddress", ""), []).append(c)
    producers_by_addr = {}
    for p in broker_list(sess, "listProducers").get("data", []):
        producers_by_addr.setdefault(p.get("remoteAddress", ""), []).append(p)

    value = {}
    for c in result.get("data", []):
        # Non-JMS connections (STOMP, ...) have no clientID; fall back to the
        # remoteAddress so it lines up with the same fallback used for their
        # consumers in req4() - see showConnection() in QueuesCtrl.js.
        client_id = c.get("clientID") or c.get("remoteAddress") or c.get("connectionID", "")
        connector_name = c.get("protocol", "unknown")
        remote_address = c.get("remoteAddress", "")
        key = classic_connector_key(connection_view_type, connector_name, client_id.replace(":", "_") if client_id else c.get("connectionID", ""))
        value[key] = {
            "ClientId": client_id,
            "RemoteAddress": remote_address,
            "ConnectorName": connector_name,
            "Producers": producers_by_addr.get(remote_address, []),
            "Consumers": consumers_by_addr.get(remote_address, []),
            "DispatchQueueSize": 0,
            "Slow": False,
            "Blocked": False,
            "Active": True,
        }
    return value


@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
async def req2(request: Request):
    sess = get_session(request)
    try:
        value = _connections_value(sess, "clientId")
    except Exception as exc:
        return error_response(exc)
    return {"value": value, "status": 200}


@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=*,connectionName=*")
async def req3(request: Request):
    sess = get_session(request)
    try:
        value = _connections_value(sess, "remoteAddress")
    except Exception as exc:
        return error_response(exc)
    return {"value": value, "status": 200}


# ---------------------------------------------------------------------------
# Queues / Topics
# ---------------------------------------------------------------------------

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*")
async def req4(request: Request):
    sess = get_session(request)
    try:
        result = broker_list(sess, "listQueues", {"field": "routingType", "operation": "EQUALS", "value": "ANYCAST"})
    except Exception as exc:
        return error_response(exc)

    value = {}
    for q in result.get("data", []):
        name = q.get("name", "")
        key = classic_destination_key("Queue", name)

        subscriptions = []
        if int(q.get("consumerCount", 0) or 0) > 0:
            try:
                consumers = broker_list(sess, "listConsumers", {"field": "queue", "operation": "EQUALS", "value": name})
                for c in consumers.get("data", []):
                    # STOMP (and other non-JMS) consumers have no clientID;
                    # fall back to the remote address so the row isn't blank.
                    # Sanitized the same way as showConnection() expects
                    # (colons -> underscores) so clicking through matches
                    # the connection built in _connections_value().
                    client_id = c.get("clientID") or c.get("remoteAddress", "")
                    subscriptions.append({
                        "objectName": classic_consumer_key("Queue", name, client_id.replace(":", "_"), str(c.get("id", ""))),
                    })
            except Exception:
                pass

        value[key] = {
            **q,
            "Name": name,
            "QueueSize": q.get("messageCount", 0),
            "ConsumerCount": q.get("consumerCount", 0),
            "EnqueueCount": q.get("messagesAdded", 0),
            "DequeueCount": q.get("messagesAcked", 0),
            "ExpiredCount": q.get("messagesExpired", 0),
            # Artemis has no separate "dispatched but not yet acked" counter
            # like Classic's DispatchCount, so the frontend's Dispatched
            # column shows the acked count instead of staying empty.
            "DispatchCount": q.get("messagesAcked", 0),
            # Artemis has no "blocked send" flag like Classic; messagesKilled
            # (poison/undelivered messages) is the closest available signal.
            "BlockedSends": q.get("messagesKilled", 0),
            # Classic's Queue mbean exposes Subscriptions (active consumers);
            # the frontend's Subscribers tab crashes without it - see
            # QueuesCtrl.onClickTabDetails().
            "Subscriptions": subscriptions,
        }
    return {"value": value, "status": 200}


@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
async def req5(request: Request):
    sess = get_session(request)
    try:
        addresses = broker_list(sess, "listAddresses", {"field": "routingTypes", "operation": "CONTAINS", "value": "MULTICAST"})
    except Exception as exc:
        return error_response(exc)

    value = {}
    for a in addresses.get("data", []):
        topic_name = a.get("name", "")
        try:
            queues = broker_list(sess, "listQueues", {"field": "address", "operation": "EQUALS", "value": topic_name})
        except Exception:
            queues = {"data": []}

        multicast_queues = [q for q in queues.get("data", []) if q.get("routingType") == "MULTICAST"]

        # Artemis address-settings enable both ANYCAST and MULTICAST on
        # auto-created addresses by default, so a plain queue (e.g. sent to
        # via the Send tab) ends up "MULTICAST-capable" even though it has no
        # real pub/sub subscribers. Only list it as a Topic once it actually
        # has a multicast queue bound to it; a genuinely empty topic has no
        # ANYCAST queue at all, so it isn't affected by this check.
        routing_types = json.loads(a.get("routingTypes") or "[]")
        if "ANYCAST" in routing_types and not multicast_queues:
            continue

        subscriptions = []
        for qinfo in multicast_queues:
            queue_name = qinfo.get("name", "")
            # Artemis serializes queue booleans as the strings "true"/"false",
            # so a plain `if qinfo.get("durable")` is always truthy - compare
            # against the string explicitly.
            is_durable = str(qinfo.get("durable", "")).lower() == "true"

            consumers = []
            if int(qinfo.get("consumerCount", 0) or 0) > 0:
                try:
                    consumers = broker_list(sess, "listConsumers", {"field": "queue", "operation": "EQUALS", "value": queue_name}).get("data", [])
                except Exception:
                    consumers = []

            if consumers:
                # Live consumer(s): get the real clientId/consumer id from
                # listConsumers, same as req4() does for Queues, instead of
                # guessing from the queue name (which is often just a random
                # UUID with no clientId encoded in it at all for non-durable
                # subscriptions).
                for c in consumers:
                    client_id = c.get("clientID") or c.get("remoteAddress", "")
                    consumer_id = f"Durable({c.get('id', '')})" if is_durable else str(c.get("id", ""))
                    subscriptions.append({
                        "objectName": classic_consumer_key("Topic", topic_name, client_id.replace(":", "_"), consumer_id),
                    })
            else:
                # No live consumer (e.g. an offline durable subscription) -
                # best-effort split of the queue name into a
                # (clientId, subscriptionName) pair - see module docstring.
                # rpartition (not partition) on the LAST dot: remoteAddress-based
                # client IDs (e.g. "127.0.0.1:57000") contain dots themselves, so
                # splitting on the first dot would cut the client ID apart.
                client_id, sep, sub_name = queue_name.rpartition(".")
                if not sep:
                    client_id, sub_name = "", queue_name
                consumer_id = f"Durable({sub_name})" if is_durable else sub_name
                subscriptions.append({
                    # clientId must be sanitized (colons -> underscores) like req4()
                    # does, so showConnection() in TopicsCtrl.js can match it back
                    # to the connection's ClientId.
                    "objectName": classic_consumer_key("Topic", topic_name, client_id.replace(":", "_"), consumer_id),
                })

        key = classic_destination_key("Topic", topic_name)
        value[key] = {
            **a,
            "Name": topic_name,
            "QueueSize": 0,
            "ConsumerCount": a.get("queueCount", 0),
            "EnqueueCount": 0,
            "DequeueCount": a.get("routedMessageCount", 0),
            # Artemis has no "blocked send" flag like Classic; unroutedMessageCount
            # (messages that had no matching queue to route to) is the closest signal.
            "BlockedSends": a.get("unroutedMessageCount", 0),
            "messagesExpired": sum(int(q.get("messagesExpired", 0) or 0) for q in multicast_queues),
            "Subscriptions": subscriptions,
        }
    return {"value": value, "status": 200}


# ---------------------------------------------------------------------------
# Generic jolokia POST passthrough (used for consumer details, durable
# subscriptions, queue/topic create+delete, browse, removeMessage, ...)
# ---------------------------------------------------------------------------

def _resolve_internal_message_id(sess, mbean: str, classic_message_id: str):
    """Classic passes a JMS message ID string; Artemis' removeMessage() needs
    its own internal numeric ID, so look it up by browsing the queue."""
    try:
        return int(classic_message_id)
    except ValueError:
        pass

    messages = artemis_exec(sess, mbean, "browse()")
    for m in messages or []:
        if str(m.get("JMSMessageID", "")) == classic_message_id or str(m.get("messageID", "")) == classic_message_id:
            return int(m["messageID"])
    raise ValueError(f"Could not resolve internal message ID for {classic_message_id}")


@app.post(f"{PREFIX}/api/jolokia")
async def jolpost(request: Request):
    sess = get_session(request)
    body = await request.json()
    req_type = body.get("type")
    mbean = body.get("mbean", "")
    props = parse_classic_mbean(mbean)

    try:
        if req_type == "read" and "endpoint" in props and props["endpoint"] == "Consumer":
            # getSubscriberDetails() / computeConnectionDetails(): consumer(s)
            # for a given clientId, optionally narrowed to one destination.
            client_id = props.get("clientId", "").replace("_", ":")
            result = broker_list(sess, "listConsumers", {"field": "clientID", "operation": "EQUALS", "value": client_id})
            consumers = result.get("data", [])
            if not consumers:
                # Non-JMS consumers (STOMP, ...) have no clientID; req4()/
                # _connections_value() fall back to remoteAddress for those,
                # so look consumers up the same way here.
                result = broker_list(sess, "listConsumers", {"field": "remoteAddress", "operation": "EQUALS", "value": client_id})
                consumers = result.get("data", [])
            destination_name = props.get("destinationName")
            if destination_name and destination_name != "*":
                consumers = [c for c in consumers if c.get("queue") == destination_name or c.get("address") == destination_name]

            value = {}
            for c in consumers:
                key = classic_consumer_key(
                    props.get("destinationType", "*"), c.get("address", ""), client_id.replace(":", "_"), str(c.get("id", "")),
                )
                value[key] = {
                    # For a topic (multicast) consumer, "queue" is the internal
                    # per-subscription queue (a UUID), not the topic name - the
                    # real destination name is always in "address" (for a plain
                    # queue/anycast consumer, "address" equals the queue name).
                    "DestinationName": c.get("address", ""),
                    "Selector": c.get("filter", ""),
                    "EnqueueCounter": c.get("messagesDelivered", 0),
                    "DequeueCounter": c.get("messagesAcknowledged", 0),
                    "DispatchedCounter": c.get("messagesDelivered", 0),
                    "DiscardedCount": 0,
                    "Durable": not c.get("browseOnly", True),
                    "DestinationQueue": c.get("queueType", "").upper() != "MULTICAST",
                    "SlowConsumer": False,
                }
            return {"value": value, "status": 200}

        if req_type == "exec":
            operation = body.get("operation", "")
            arguments = body.get("arguments", [])

            if operation == "addQueue":
                name = arguments[0]
                config = json.dumps({"name": name, "address": name, "routing-type": "ANYCAST", "durable": True})
                artemis_exec(sess, broker_mbean(), "createQueue(java.lang.String)", [config])
                return {"value": True, "status": 200}

            if operation == "removeQueue":
                artemis_exec(sess, broker_mbean(), "destroyQueue(java.lang.String)", [arguments[0]])
                return {"value": True, "status": 200}

            if operation == "addTopic":
                artemis_exec(sess, broker_mbean(), "createAddress", [arguments[0], "MULTICAST"])
                return {"value": True, "status": 200}

            if operation == "removeTopic":
                artemis_exec(sess, broker_mbean(), "deleteAddress(java.lang.String,boolean)", [arguments[0], True])
                return {"value": True, "status": 200}

            if operation == "createDurableSubscriber":
                client_id, sub_name, topic_name, selector = arguments
                queue_name = f"{client_id}.{sub_name}"
                config = {
                    "name": queue_name, "address": topic_name, "routing-type": "MULTICAST",
                    "durable": True, "filter-string": selector or "",
                }
                artemis_exec(sess, broker_mbean(), "createQueue(java.lang.String)", [json.dumps(config)])
                return {"value": True, "status": 200}

            if operation == "destroy":
                # Unsubscribe a durable subscriber: mbean carries the topic
                # name, clientId and consumerId ("Durable(<subName>)").
                client_id = props.get("clientId", "")
                consumer_id = props.get("consumerId", "")
                match = re.match(r"Durable\((.*)\)", consumer_id)
                sub_name = match.group(1) if match else consumer_id
                artemis_exec(sess, broker_mbean(), "destroyQueue(java.lang.String)", [f"{client_id}.{sub_name}"])
                return {"value": True, "status": 200}

            if operation in ("browse()", "browse"):
                destination_name = props.get("destinationName")
                destination_type = props.get("destinationType", "Queue")
                mbean_q = queue_mbean(destination_name, destination_name, routing_type_for(destination_type).lower())
                result = artemis_exec(sess, mbean_q, "browse()")
                # Artemis returns lowercase "text" (and no BodyPreview at all for
                # non-text bodies); the frontend only understands Classic's
                # capitalized "Text" / byte-array "BodyPreview", and crashes
                # (TypeError in bin2String) on the first message missing both.
                for m in result or []:
                    if "text" in m:
                        m["Text"] = m["text"]
                    elif "BodyPreview" not in m:
                        m["BodyPreview"] = []
                return {"value": result, "status": 200}

            if operation == "removeMessage":
                destination_name = props.get("destinationName")
                destination_type = props.get("destinationType", "Queue")
                mbean_q = queue_mbean(destination_name, destination_name, routing_type_for(destination_type).lower())
                internal_id = _resolve_internal_message_id(sess, mbean_q, arguments[0])
                result = artemis_exec(sess, mbean_q, "removeMessage(long)", [internal_id])
                return {"value": result, "status": 200}

            if operation == "purge":
                # Classic's DestinationViewMBean.purge(); Artemis' QueueControl
                # equivalent is removeAllMessages() (only ever called for Queues).
                destination_name = props.get("destinationName")
                destination_type = props.get("destinationType", "Queue")
                mbean_q = queue_mbean(destination_name, destination_name, routing_type_for(destination_type).lower())
                artemis_exec(sess, mbean_q, "removeAllMessages()")
                return {"value": True, "status": 200}

            if operation == "resetStatistics":
                # Classic's DestinationViewMBean.resetStatistics() resets all
                # counters in one call; Artemis' QueueControl has one reset op
                # per counter instead, and only at the queue level - so for a
                # Topic (address), reset every queue bound to that address.
                destination_name = props.get("destinationName")
                destination_type = props.get("destinationType", "Queue")
                routing_type = routing_type_for(destination_type).lower()

                if destination_type.lower() == "topic":
                    try:
                        bound_queues = broker_list(sess, "listQueues", {"field": "address", "operation": "EQUALS", "value": destination_name})
                        targets = [q.get("name", "") for q in bound_queues.get("data", [])]
                    except Exception:
                        targets = []
                else:
                    targets = [destination_name]

                for queue_name in targets:
                    mbean_q = queue_mbean(destination_name, queue_name, routing_type)
                    for reset_op in ("resetMessagesAdded()", "resetMessagesAcknowledged()", "resetMessagesExpired()", "resetMessagesKilled()"):
                        try:
                            artemis_exec(sess, mbean_q, reset_op)
                        except Exception:
                            pass
                return {"value": True, "status": 200}

        return JSONResponse(status_code=501, content={"error": f"Unsupported jolokia request for Artemis: {body}"})
    except Exception as exc:
        return error_response(exc)


# ---------------------------------------------------------------------------
# Send message - Artemis' management API cannot produce messages, so this
# uses a minimal raw STOMP client instead (requires STOMP enabled on the
# Artemis acceptor, which is the default).
# ---------------------------------------------------------------------------

def ensure_destination(sess, name: str, destination_type: str):
    """Pre-create the destination with the right routing type before sending.
    Without this, Artemis auto-creates an unknown destination using the
    broker's default routing type, which can silently turn a "queue" send
    into an empty topic-like address (no queue, message just dropped)."""
    if routing_type_for(destination_type) == "ANYCAST":
        config = json.dumps({"name": name, "address": name, "routing-type": "ANYCAST", "durable": True})
        artemis_exec(sess, broker_mbean(), "createQueue(java.lang.String,boolean)", [config, True])
    else:
        try:
            artemis_exec(sess, broker_mbean(), "createAddress", [name, "MULTICAST"])
        except Exception:
            pass  # address already exists


def stomp_send(host: str, port: int, destination: str, body: str, username: str = None, password: str = None, timeout: float = 5.0):
    NUL = "\x00"
    with socket.create_connection((host, port), timeout=timeout) as sock:
        connect_frame = "STOMP\naccept-version:1.2\nhost:/\n"
        if username:
            connect_frame += f"login:{username}\n"
        if password:
            connect_frame += f"passcode:{password}\n"
        connect_frame += "\n" + NUL
        sock.sendall(connect_frame.encode("utf-8"))
        resp = sock.recv(4096).decode("utf-8", errors="replace")
        if not resp.startswith("CONNECTED"):
            raise RuntimeError(f"STOMP CONNECT failed: {resp}")

        body_bytes = body.encode("utf-8")
        send_frame = f"SEND\ndestination:{destination}\ncontent-length:{len(body_bytes)}\n\n".encode("utf-8") + body_bytes + NUL.encode("utf-8")
        sock.sendall(send_frame)
        sock.sendall(("DISCONNECT\n\n" + NUL).encode("utf-8"))


@app.post(f"{PREFIX}/api/message/{{target}}")
async def jolmessage(request: Request, target, type, Origin, ID):
    body = await request.body()
    auth = request.headers.get("authorization")
    username, password = decode_basic_auth(auth)
    sess = get_session(request)

    try:
        ensure_destination(sess, target, type)
        stomp_send(ARTEMIS_HOST, ARTEMIS_STOMP_PORT, target, body.decode("utf-8"), username, password)
    except Exception as exc:
        return error_response(exc)

    return {"result": "ok"}
