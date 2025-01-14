from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request

import requests
import json

app = FastAPI()

app.mount("/AMQC", StaticFiles(directory="/opt/static"), name="static")

@app.get("/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost")
async def req1(request:Request ):
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost"
                                , headers=request.headers, data={})    
    return response.json()

@app.get("/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*")
async def req2(request:Request ):
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*"
                                , headers=request.headers, data={})    
    return response.json()

@app.get("/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
async def req3(request:Request ):
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*"
                                , headers=request.headers, data={})    
    return response.json()

@app.get("/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
async def req4(request:Request ):
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*"
                                , headers=request.headers, data={})    
    return response.json()

@app.post("/api/jolokia")
async def jolpost(request:Request ):
    print("====>"*30)
    body=await request.json()
    print(body)
    response = requests.request("POST", "http://localhost:8161/api/jolokia", headers=request.headers, data=json.dumps(body))
    return response.json()

@app.post("/api/message/{target}")
async def jolmessage(request:Request,target,type,Origin,ID ):
    print("====>"*30)
    body=await request.body()
    print(body)
    print(type)
    url=f"http://localhost:8161/api/message/{target}?type={type}&Origin={Origin}&ID={ID}"
    print(url)
    print(request.headers)
    response = requests.request("POST", url
                                , headers=request.headers, data=body.decode("utf-8"))
    
    print(response.text)
    return {"result":response.text}

