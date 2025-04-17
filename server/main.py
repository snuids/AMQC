from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request

import requests
import json
import os

PREFIX = os.getenv("AMQC_PREFIX", "")

app = FastAPI()


app.mount("/AMQC", StaticFiles(directory="/opt/static"), name="static")

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost")
async def req1(request:Request ):
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost"
                                , headers=headers, data={})    
    #print("====>"*30)
    #print("http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost")
    #print(response.text)
    #print(request.headers)
    return response.json()

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*")
async def req2(request:Request ):
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*"
                                , headers=headers, data={})    
    return response.json()

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*")
async def req3(request:Request ):
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=*,connectionViewType=clientId,connectionName=*"
                                , headers=headers, data={})    
    return response.json()

@app.get(f"{PREFIX}/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*")
async def req4(request:Request ):
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = requests.request("GET", "http://localhost:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*"
                                , headers=headers, data={})    
    return response.json()

@app.post(f"{PREFIX}/api/jolokia")
async def jolpost(request:Request ):
    #print("====>"*30)
    body=await request.json()
    #print(body)
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = requests.request("POST", "http://localhost:8161/api/jolokia", headers=headers, data=json.dumps(body))
    return response.json()

@app.post(f"{PREFIX}/api/message/{{target}}")
async def jolmessage(request:Request,target,type,Origin,ID ):
    #print("====>"*30)
    body=await request.body()
    #print(body)
    #print(type)
    url=f"http://localhost:8161/api/message/{target}?type={type}&Origin={Origin}&ID={ID}"
    #print(url)
    #print(request.headers)
    auth = request.headers.get("authorization")
    headers = {"authorization": auth, "referer": "http://localhost"}
    response = requests.request("POST", url
                                , headers=headers, data=body.decode("utf-8"))
    
    print(response.text)
    return {"result":response.text}

