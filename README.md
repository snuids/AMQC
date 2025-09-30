Copyright 2017 Arnaud Marchand / Vassilis Papaleonidas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

This Angular JS web site can be used to monitor remote [ActiveMQ](https://github.com/apache/activemq) servers. It displays basically the same information as the old ActiveMQ console written in JSP but using more modern technologies. It does not have to be hosted on the same server as the Active MQ broker.

It uses the Jolokia API in order to retrieve the broker information and the stomp protocol (Using this stomp library:[stomp-websocket](https://github.com/jmesnil/stomp-websocket)) on a web socket to connect a client to the broker. It should work with a pristine ActiveMQ installation.

![](http://www.pi2s.be/AMQCAD/Screen2.jpg)

# Installation:
Simply deploy the AMQC folder in a running web site, and browse the index.html file from any recent web browser. A better way to do it is to copy this project directly in the ActiveMQ webapps folder and to access it via the following URL: http://BROKER_IP:8161/AMQC/index.html

It should work with the recent releases of Active MQ. 
Note tha as of Version 5.15 this system does not work anymore. It is possible to build a container with the console and ActiveMQ using the Dockerfile2025 in the Docker folder. See Docker section.

# CORS limitations:
If the ActiveMQ is protected by a password. The CORS handshake will fail on recent browsers because the Jetty web server hosting the ActiveMQ API is not CORS compliant out of the box. You can bypass this by disabling the CORS test in the browser or by tuning Jetty configuration in order to allow it.


# Active MQ 5.13
The Active MQ 5.13 version broke the compatibility with web sockets opened via Chrome, IE 11 or Safari. However, the internal stomp client still works correctly with Firefox. Fixed in version v0.77 of the console.


# Screenshots:
## Login Window 
![Login](https://raw.githubusercontent.com/snuids/AMQC/master/Medias/login.png)


## Queue Grapher
![Queue](https://raw.githubusercontent.com/snuids/AMQC/master/Medias/queuechart.png)

## Internal Stomp Client
![Client](https://raw.githubusercontent.com/snuids/AMQC/master/Medias/stompclient.png)
![Client](https://raw.githubusercontent.com/snuids/AMQC/master/Medias/stomptimeline.png)

## v1.11 Broker Statistics
![Client](https://raw.githubusercontent.com/snuids/AMQC/master/Medias/stats.png)

# URI parameters:
* login
* password
* brokerip
* brokerport
* brokername
* autologin (Used to bypass the login screen)
* urlprefix (If used with a reverse proxy such as nginx)

## Example:
`http://127.0.0.1:8161/AMQC/index.html?brokerip=127.0.0.1&brokerport=8161&brokername=localhost&autologin=true`

## Docker 
There is a docker (snuids/activemq-amqcmonitoring) image that includes ActiveMQ and AMQC. The image is based on the webcenter/activemq image (https://hub.docker.com/r/webcenter/activemq/). 

More info here: https://hub.docker.com/r/snuids/activemq-amqcmonitoring/

 docker run --name AMQC -p 8161:8161 -p 61616:61616 -p 61614:61614 -p 61613:61613 -t snuids/activemq-amqcmonitoring

5.15.2 ActiveMQ version available on github here: https://hub.docker.com/r/snuids/activemq-amqcmonitoring/

Version> 56.15.2:


* Build:
`docker build -f Dockerfile2025 .`
* Run:
`docker run -p 61616:61616 -p 8161:8161 -p 8180:8180 -e ACTIVEMQ_ADMIN_PASSWORD=admin -e ACTIVEMQ_ADMIN_LOGIN=admin amqc615` (Where amqc615 is the id of the image previsouly created)
* Latest:
`docker run -p 61616:61616 -p 8161:8161 -p 8180:8180 -e ACTIVEMQ_ADMIN_PASSWORD=admin -e ACTIVEMQ_ADMIN_LOGIN=admin snuids/activemq-amqcmonitoring:v6.1.7`
  Console: http://localhost:8180/AMQC/index.html?brokerip=localhost&brokerport=8180&brokername=localhost&login=admin&password=admin

* Locally in the console use localhost as IP and 8180 as port url: http://localhost:8180/AMQC/index.html

Prebuild image:

* snuids/activemq-amqcmonitoring:v6.1.7
https://hub.docker.com/repository/docker/snuids/activemq-amqcmonitoring/general


Get more examples and fun by following our blog here: [https://pi2s.wordpress.com]

