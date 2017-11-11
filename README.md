Copyright 2015 Arnaud Marchand / Vassilis Papaleonidas

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


# CORS limitations:
If the ActiveMQ is protected by a password. The CORS handshake will fail on recent browsers because the Jetty web server hosting the ActiveMQ API is not CORS compliant out of the box. You can bypass this by disabling the CORS test in the browser or by tuning Jetty configuration in order to allow it.


# Active MQ 5.13
The Active MQ 5.13 version broke the compatibility with web sockets opened via Chrome, IE 11 or Safari. However, the internal stomp client still works correctly with Firefox. Fixed in version v0.77 of the console.

Live Version:[http://www.pi2s.be/AMQC/ ](http://www.pi2s.be/AMQC/) Courtesy of PI2S.

# Screenshots:
## Login Window 
![](http://www.pi2s.be/AMQCAD/Screen1.jpg)

## Queue Grapher
![](http://www.pi2s.be/AMQCAD/Screen3.jpg)

## Internal Stomp Client
![](http://www.pi2s.be/AMQCAD/Screen4.jpg)

## v0.79 Broker Statistics
![](http://www.pi2s.be/AMQCAD/Screen5.jpg)

# URI parameters:
* login
* password
* brokerip
* brokerport
* brokername
* autologin (Used to bypass the login screen)

## Example:
`http://127.0.0.1:8161/AMQC/index.html?brokerip=127.0.0.1&brokerport=8161&brokername=localhost&autologin=true`

## Docker 
There is a docker (snuids/activemq-amqcmonitoring) image that includes ActiveMQ and AMQC. The image is based on the webcenter/activemq image (https://hub.docker.com/r/webcenter/activemq/). 

More info here: https://hub.docker.com/r/snuids/activemq-amqcmonitoring/

 docker run --name AMQC -p 8161:8161 -p 61616:61616 -p 61614:61614 -p 61613:61613 -t snuids/activemq-amqcmonitoring

## Login into the Docker Image on the mac
![](http://www.pi2s.be/AMQCAD/docker.jpg)
Note that the address in the login window matches the url IP. The default user/password is admin/admin see the base image (webcenter/activemq) for more details on how to configure ActiveMQ.

Get more examples and fun by following our blog here: [https://pi2s.wordpress.com/]

