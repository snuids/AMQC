#v6.2.0
from fastapi import FastAPI

from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request

import requests
import json
import os

PREFIX = os.getenv("AMQC_PREFIX", "")

app = FastAPI()

# Mount static files - use /opt/static in Docker, ../ locally
static_dir = "/opt/static" if os.path.exists("/opt/static") else "../"
app.mount(f"{PREFIX}/AMQC", StaticFiles(directory=static_dir), name="static")

session=None

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
    return response.json()

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
async def req2(request:Request ):
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
    return response.json()

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=*,connectionName=*")
async def req3(request:Request ):
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connectionViewType=remoteAddress,connector=clientConnectors,connectorName=*,connectionName=*")
    
    result = response.json()
    
    return result

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
async def req4(request:Request ):
    #auth = request.headers.get("authorization")
    #headers = {"authorization": auth, "referer": "http://localhost"}
    response = get_session(request).get("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
    print(response.text)
    print("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
    print(request.headers)
    return response.json()


@app.post(f"{PREFIX}/api/jolokia")
async def jolpost(request:Request ):
    body = await request.json()
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = get_session(request).post("http://localhost:8161/api/jolokia", headers=headers, data=json.dumps(body))
    return response.json()

@app.post(f"{PREFIX}/api/message/{{target}}")
async def jolmessage(request:Request, target, type, Origin, ID ):
    body = await request.body()
    url = f"http://localhost:8161/api/message/{target}?type={type}&Origin={Origin}&ID={ID}"
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = session.post(url, headers=headers, data=body.decode("utf-8"))
    print(response.text)
    return {"result": response.text}
