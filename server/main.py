#v6.2.0
from fastapi import FastAPI

from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


import requests
import json
import os
import time

PREFIX = os.getenv("AMQC_PREFIX", "")

app = FastAPI()

# Mount static files - use /opt/static in Docker, ../ locally
static_dir = "/opt/static" if os.path.exists("/opt/static") else "../"
app.mount(f"{PREFIX}/AMQC", StaticFiles(directory=static_dir), name="static")

session=None

def parse_response(response):
    """Return parsed JSON or a JSONResponse with the upstream HTTP status code."""
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        return response.json()
    return JSONResponse(
        status_code=response.status_code,
        content={"error": response.text}
    )


def get_session(req:Request):
    global session
    
    if session is None:
        print("Create session")
        session = requests.Session()
    
    # Always update auth headers from the current request
    auth = req.headers.get("authorization")
    if auth:
        session.headers.update({"authorization": auth, "referer": "http://localhost"})
    print(auth)
    print(session.headers)
    return session


# Reading all attributes of a connection MBean calls getWireFormatInfo(), which
# throws a NullPointerException for transports without WireFormatInfo (STOMP,
# WS, ...). Read the safe attributes explicitly instead.
CONNECTION_ATTRIBUTES = [
    "Slow", "Blocked", "Connected", "Active", "RemoteAddress", "ClientId",
    "ConnectionId", "DispatchQueueSize", "UserName", "Consumers", "Producers",
    "ActiveTransactionCount", "OldestActiveTransactionDuration",
    "FaultTolerantConnection", "Manageable", "NetworkConnection",
    "ConnectedTimestamp",
]


def read_connection_view(req:Request, view_type):
    """Read a connection view, working around the ActiveMQ wildcard NPE."""
    s = get_session(req)
    mbean = (
        "org.apache.activemq:type=Broker,brokerName=localhost,"
        "connector=clientConnectors,connectorName=*,"
        f"connectionViewType={view_type},connectionName=*"
    )
    response = s.get(f"http://localhost:8161/api/jolokia/read/{mbean}")
    result = parse_response(response)

    if not isinstance(result, JSONResponse) and result.get("status", 200) < 400:
        return result

    error_type = result.get("error_type", "") if isinstance(result, dict) else ""
    if error_type not in (
        "java.lang.NullPointerException",
        "javax.management.InstanceNotFoundException",
    ):
        return result

    # Find the individual connection MBeans, then read each one with the
    # attribute list that excludes the broken WireFormatInfo getter.
    search_response = s.get(f"http://localhost:8161/api/jolokia/search/{mbean}")
    search_result = parse_response(search_response)
    names = search_result.get("value", []) if isinstance(search_result, dict) else []

    connections = {}
    for name in names:
        response = s.post(
            "http://localhost:8161/api/jolokia",
            json={"type": "read", "mbean": name, "attribute": CONNECTION_ATTRIBUTES},
        )
        connection = parse_response(response)
        if isinstance(connection, dict) and connection.get("status") == 200:
            connections[name] = connection.get("value", {})

    return {
        "request": {"mbean": mbean, "type": "read"},
        "value": connections,
        "status": 200,
        "timestamp": int(time.time()),
    }


@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost")
async def req1(request:Request ):
    print(">>>> 1")
    url="http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost"
    response = get_session(request).get(url)
    print("<<<< 1")
    res= parse_response(response)
    if isinstance(res, JSONResponse):
        print(f"Non-JSON response: HTTP {response.status_code}")
    else:
        print(res)
    
    print("<<<< 1a")
    return res

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
async def req2(request:Request ):
    return read_connection_view(request, "clientId")

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=*,connectionName=*")
async def req3(request:Request ):
    return read_connection_view(request, "remoteAddress")

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*")
async def req4(request:Request ):
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*")
    return parse_response(response)

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
async def req5(request:Request ):
    #auth = request.headers.get("authorization")
    #headers = {"authorization": auth, "referer": "http://localhost"}
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
    print(response.text)
    print("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
    print(request.headers)
    return parse_response(response)


@app.post(f"{PREFIX}/api/jolokia")
async def jolpost(request:Request ):
    body = await request.json()
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = get_session(request).post("http://localhost:8161/api/jolokia", headers=headers, data=json.dumps(body))
    result = parse_response(response)

    # A connection with no consumers has no consumer MBeans. Treat that as an
    # empty destination list instead of surfacing a 404 in the details pane.
    if (isinstance(result, dict)
            and body.get("type") == "read"
            and "endpoint=Consumer" in body.get("mbean", "")
            and result.get("error_type") == "javax.management.InstanceNotFoundException"):
        return {
            "request": result.get("request", body),
            "value": {},
            "status": 200,
            "timestamp": int(time.time()),
        }

    return result

@app.post(f"{PREFIX}/api/message/{{target}}")
async def jolmessage(request:Request, target, type, Origin, ID ):
    body = await request.body()
    url = f"http://localhost:8161/api/message/{target}?type={type}&Origin={Origin}&ID={ID}"
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = session.post(url, headers=headers, data=body.decode("utf-8"))
    print(response.text)
    return {"result": response.text}
