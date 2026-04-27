# ActiveMQ Bug Report: NullPointerException when querying connections via Jolokia

## Summary
ActiveMQ 6.2.0 throws `NullPointerException: Cannot invoke "org.apache.activemq.command.WireFormatInfo.toString()"` when querying connection MBeans with wildcards via Jolokia API.

## Issue Type
Bug

## Priority
Major

## Affects Version
- ActiveMQ 6.2.0 (confirmed)
- Possibly affects 6.2.x series (needs testing on 6.2.5)

## Environment
- **ActiveMQ Version**: 6.2.0
- **JMX Access Method**: Jolokia HTTP API (http://localhost:8161/api/jolokia/)
- **Connector Type**: WebSocket (ws)
- **Connection Status**: Active connection exists
- **Authentication**: Basic Auth (admin:admin)

## Description

When attempting to query connection information using Jolokia with wildcard patterns in the MBean name, ActiveMQ 6.2.0 returns a `NullPointerException` instead of the connection data.

The error occurs specifically when:
1. One or more active connections exist to the broker
2. Querying with wildcards in the MBean pattern for connections
3. Using either `connectionViewType=clientId` or `connectionViewType=remoteAddress`

## Steps to Reproduce

### 1. Start ActiveMQ 6.2.0
```bash
docker run -p 8161:8161 -p 61616:61616 activemq:6.2.0
```

### 2. Create an active connection
Create any WebSocket connection to the broker (or any other transport).

### 3. Query connections via Jolokia with wildcards

**Using clientId view:**
```bash
curl -s 'http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=clientId,connector=clientConnectors,connectorName=*,connectionName=*' \
  --header 'Authorization: Basic YWRtaW46YWRtaW4=' \
  --header 'Referer: http://localhost/'
```

**Using remoteAddress view:**
```bash
curl -s 'http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=*,connectionName=*' \
  --header 'Authorization: Basic YWRtaW46YWRtaW4=' \
  --header 'Referer: http://localhost/'
```

## Actual Result

```json
{
    "request": {
        "mbean": "org.apache.activemq:brokerName=localhost,connectionName=*,connectionViewType=clientId,connector=clientConnectors,connectorName=*,type=Broker",
        "type": "read"
    },
    "error_type": "java.lang.NullPointerException",
    "error": "java.lang.NullPointerException : Cannot invoke \"org.apache.activemq.command.WireFormatInfo.toString()\" because the return value of \"org.apache.activemq.broker.TransportConnection.getRemoteWireFormatInfo()\" is null",
    "status": 500
}
```

## Expected Result

Should return connection information similar to:
```json
{
    "request": {
        "mbean": "org.apache.activemq:brokerName=localhost,connectionName=*,connectionViewType=clientId,connector=clientConnectors,connectorName=*,type=Broker",
        "type": "read"
    },
    "value": {
        "org.apache.activemq:brokerName=localhost,connectionName=ID_...,connectionViewType=clientId,connector=clientConnectors,connectorName=ws,type=Broker": {
            "ClientId": "...",
            "ConnectionId": "...",
            // ... other connection attributes
        }
    },
    "status": 200
}
```

Or, if no connections exist, return empty value with status 200 (not an error).

## Additional Context

### Connection MBeans DO Exist
When searching for connection MBeans, they are present:

```bash
curl -s 'http://localhost:8161/api/jolokia/search/org.apache.activemq:type=Broker,brokerName=localhost,*' \
  --header 'Authorization: Basic YWRtaW46YWRtaW4=' \
  --header 'Referer: http://localhost/' | \
  python3 -c "import sys,json; data=json.load(sys.stdin); [print(m) for m in data.get('value',[]) if 'connection' in m.lower()]"
```

**Output:**
```
org.apache.activemq:brokerName=localhost,connectionName=ID_ca7bf6fc3f30-42395-1777304164972-3_1,connectionViewType=clientId,connector=clientConnectors,connectorName=ws,type=Broker
org.apache.activemq:brokerName=localhost,connectionName=ws_//192.168.65.1_34960,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=ws,type=Broker
```

### Querying Specific Connection Works
Querying a **specific** connection (without wildcards) returns data successfully:

```bash
curl -s 'http://localhost:8161/api/jolokia/read/org.apache.activemq:brokerName=localhost,connectionName=ID_ca7bf6fc3f30-42395-1777304164972-3_1,connectionViewType=clientId,connector=clientConnectors,connectorName=ws,type=Broker' \
  --header 'Authorization: Basic YWRtaW46YWRtaW4=' \
  --header 'Referer: http://localhost/'
```

This suggests the issue is specifically with **wildcard resolution** triggering a code path where `getRemoteWireFormatInfo()` returns `null`.

### Other Wildcard Queries Work Fine
Querying queues and topics with wildcards works without issues:

**Queues:**
```bash
curl 'http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*'
```

**Topics:**
```bash
curl 'http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*'
```

Both return successful results with status 200.

## Impact

This bug prevents monitoring and management tools from:
- Listing all active connections via Jolokia API
- Building connection dashboards
- Implementing automated connection monitoring
- Using web-based management consoles that rely on Jolokia

## Workaround

Currently handling this by catching the 500 error and returning an empty connection list:

```python
response = session.get("http://localhost:8161/api/jolokia/read/...")
result = response.json()
if result.get("status") in [404, 500]:
    if "InstanceNotFoundException" in result.get("error_type", "") or "NullPointerException" in result.get("error_type", ""):
        return {"request": {...}, "value": {}, "status": 200}
return result
```

## Possible Root Cause

The error message indicates that when processing connections during wildcard matching, ActiveMQ attempts to call `.toString()` on the result of `TransportConnection.getRemoteWireFormatInfo()`, which returns `null` in certain scenarios (possibly during connection initialization or for certain transport types).

The code should either:
1. Null-check before calling `.toString()`
2. Skip connections where wire format info is not yet available
3. Return a placeholder value for incomplete connection data

## Related Issues

Similar issues have been reported for older versions:
- AMQ-7229: Connection-related errors with JmsConnector (5.15.x series)
- Community reports suggest this may have been resolved in 5.17.x+

## Testing Request

Would appreciate if this could be tested on:
- ActiveMQ 6.2.5 (latest 6.2.x)
- ActiveMQ 6.1.x series
- Different transport types (tcp, ssl, nio, ws)

## How to File This Report

1. Go to: https://issues.apache.org/jira/projects/AMQ/issues
2. Click "Create Issue"
3. Use this information to fill in the bug report
4. Attach any relevant logs or stack traces

---

**Reported by:** Your Name/Organization
**Date:** April 27, 2026
**Contact:** your.email@example.com (optional)
