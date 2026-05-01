#v6.2.0
from fastapi import FastAPI

from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


import requests
import json
import os

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
    
    return session


@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost")
async def req1(request:Request ):
    print(">>>> 1")
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost")
    print("<<<< 1")
    return parse_response(response)

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
async def req2(request:Request ):
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
    return parse_response(response)

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=*,connectionName=*")
async def req3(request:Request ):
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=*,connectionName=*")
    
    result = parse_response(response)
    
    return result

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
    return parse_response(response)

@app.post(f"{PREFIX}/api/message/{{target}}")
async def jolmessage(request:Request, target, type, Origin, ID ):
    body = await request.body()
    url = f"http://localhost:8161/api/message/{target}?type={type}&Origin={Origin}&ID={ID}"
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = session.post(url, headers=headers, data=body.decode("utf-8"))
    print(response.text)
    return {"result": response.text}
