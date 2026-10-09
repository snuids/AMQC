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

# Changes compared with master
The current `testartemis` branch and working tree add:

* An optional ActiveMQ Artemis compatibility backend that translates the
  console's Classic-style management requests.
* Improved connection details with **Destinations** and **Properties** tabs,
  longer client IDs, protocol badges, and colored status indicators.
* Artemis-compatible broker usage, expired-message counts, and browsed-message
  timestamps. Queue/topic management operations use Jolokia POST requests.
* Confirmed bulk cleanup of unused topics and empty queues without consumers.
* JSON formatting in the shared message viewer.
* A configurable STOMP WebSocket prefix and URL credential prefilling.
* HTTPS API selection for broker port `443`, including a locally hosted frontend.

These describe the source checkout, not a guarantee that an existing hosted
console or prebuilt Docker image includes the changes.

![](http://www.pi2s.be/AMQCAD/Screen2.jpg)

# Installation:
Simply deploy the AMQC folder in a running web site, and browse the index.html file from any recent web browser. A better way to do it is to copy this project directly in the ActiveMQ webapps folder and to access it via the following URL: http://BROKER_IP:8161/AMQC/index.html

It should work with the recent releases of Active MQ. 
Note tha as of Version 5.15 this system does not work anymore. It is possible to build a container with the console and ActiveMQ using the Dockerfile2025 in the Docker folder. See Docker section.

# CORS limitations:
When the frontend and broker API have different origins, the API must allow
the frontend's exact origin through CORS. Authenticated requests require an
OPTIONS preflight permitting `Authorization`; JSON POST requests also require
`Content-Type`. Configure the broker or reverse proxy rather than disabling
browser security.

For local development, `http://localhost:8080` and `http://127.0.0.1:8080` are
different origins and must be allowed separately if both are used. Apply CORS
to the broker API route, including error responses, and use an explicit origin
allowlist rather than allowing arbitrary origins with credentials.


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

## v1.13 Broker Statistics
![Client](https://raw.githubusercontent.com/snuids/AMQC/master/Medias/stats.png)

# Console features
## Connection details
The Connections tab displays protocol badges for STOMP, OpenWire, AMQP, MQTT,
and WebSocket connections. The detail window separates destination information
from connection properties. Broker properties and connection status flags use
colored boolean indicators.

## Message body formatting
Message details in both the queue browser and STOMP client include
**Format as JSON**, which pretty-prints valid JSON with two-space indentation.
Invalid JSON produces an error notification and leaves the display unchanged.
Formatting affects only the detail display, not the original message or the
broker. **Copy** continues to copy the original body.

## Deleting unused queues
The Queues tab includes **Delete empty queues without consumers** with a
confirmation listing the candidate names. Only queues with both `QueueSize = 0`
and `ConsumerCount = 0` are eligible, regardless of the current table filter.
Both values are rechecked against the broker before each sequential deletion.
Missing values are not treated as zero. Results report deleted, skipped, and
failed queues. If an eligibility check fails, remaining deletions stop.
Broker activity can change between checking and deleting, so use this action
during a quiet period. Deletion is irreversible.

## Deleting unused topics
The Topics tab includes **Delete topics without consumers**. It checks the
broker's current topic data and asks for confirmation with the candidate names.
It includes topics outside the table's search filter, but excludes ActiveMQ
advisory topics, topics with subscriptions, and topics with active or inactive
durable subscriptions. Missing subscription metadata prevents deletion.
After confirmation, eligibility is checked again before sequential deletion;
the result reports deleted, skipped, and failed topics.
Broker activity can change after the check, so use this action during a quiet
period. Deletion is irreversible.

# URI parameters:
* login
* password
* encryptedpassword (Base64-encoded password; encoding is not encryption)
* brokerip
* brokerport
* brokername
* autologin (Used to bypass the login screen)
* urlprefix (If used with a reverse proxy such as nginx)
* stompprefix (WebSocket path for the STOMP client, for example `/amqc/ws`; independent of the HTTP `urlprefix`)

## STOMP client behind an HTTPS reverse proxy
Set the STOMP client's **Port** to `443`, enable **SSL**, and set
**WebSocket Prefix** to `/amqc/ws` to connect through
`wss://BROKER_HOST:443/amqc/ws`. The prefix can also be prefilled with
`&stompprefix=/amqc/ws` in the console URL. Leading slashes are optional.
With **Remember Me** enabled, the prefix is saved alongside the STOMP port
and SSL setting; the URL parameter overrides the saved prefix.
Leave the prefix empty for a direct connection to the broker's WebSocket port.
The STOMP client's login and password are also prefilled when `login`,
`password`, or `encryptedpassword` is present in the page URL. These values
override saved client credentials, with `encryptedpassword` taking precedence
over `password`, using the same decoding as the monitoring login. Prefilling
does not automatically connect the STOMP client.

## Local frontend with a remote HTTPS broker
When `brokerport=443`, the HTTP/Jolokia API uses HTTPS even if the frontend
is served locally over HTTP. Other broker ports continue to use the frontend's
protocol.

For the `/amqc/` reverse proxy, open:
`http://localhost:8080/index.html?brokerip=BROKER_HOST&brokerport=443&brokername=localhost&urlprefix=amqc/&stompprefix=/amqc/ws`

The HTTP API prefix (`urlprefix`) and WebSocket path (`stompprefix`) are separate.
For STOMP, also set its port to `443` and enable SSL in the client panel.
Cross-origin HTTP API requests still require the remote server to allow the
local frontend origin and the `Authorization` header via CORS. Alternatively,
serve the frontend and broker API through a same-origin local reverse proxy.

### Serving the frontend locally
From the repository root:

```bash
npx http-server . -p 8080 -c-1
```

No frontend build is required. Replace `BROKER_HOST` in the URL above with your
broker hostname, then enter your credentials in the login screen. For only
WebSocket messaging, choose **Stomp Client Only** instead of the monitoring
login's **Connect** button.

The monitoring API port (`brokerport`) does **not** change the STOMP client
port. In the STOMP panel, set **Port** to `443`, **SSL** to enabled, and
**WebSocket Prefix** to `/amqc/ws`. With no saved setting, the STOMP port
defaults to `61614`.

### Reverse proxy routes
For the example URLs, your HTTPS proxy must provide:

| Public route | Backend |
| --- | --- |
| `/amqc/AMQC/` | Console static files under `/AMQC/` on the AMQC HTTP server |
| `/amqc/api/` | Broker proxy API under `/api/` on the AMQC HTTP server |
| `/amqc/ws` | Broker WebSocket listener, commonly port `61614` for Classic |

The AMQC HTTP server commonly listens on port `8180`. TLS terminates at the
proxy on public port `443`; WebSocket forwarding must use HTTP/1.1 with
`Upgrade` and `Connection` headers. A dedicated broker API prefix avoids
conflicts with another application's `/api/` route.
The optional `/amqc/` entry route can redirect to `/amqc/AMQC/index.html` with
the appropriate connection parameters.

The exact HTTP parameter is `urlprefix=amqc/`, without a leading slash.
The separate WebSocket parameter is `stompprefix=/amqc/ws`. Do not replace
`urlprefix` with `nourlprefix` or use literal `&amp;` separators in the browser
address.

## Example:
`http://127.0.0.1:8161/AMQC/index.html?brokerip=127.0.0.1&brokerport=8161&brokername=localhost&autologin=true`

## Example with encrypted password:
To use an encrypted password, first encode your password in Base64:
```javascript
// In browser console or using the password-encoder.html tool:
btoa("admin")  // Returns: "YWRtaW4="
```
Then use it in the URL (the browser will automatically handle URL encoding):
`http://127.0.0.1:8161/AMQC/index.html?login=admin&encryptedpassword=YWRtaW4=&brokerip=127.0.0.1&brokerport=8161&brokername=localhost&autologin=true`


**Password Encoder Utility**: Use the included `password-encoder.html` tool to easily generate encoded passwords for your URLs.

Note: If both `password` and `encryptedpassword` are provided, `encryptedpassword` takes precedence.

**Security Note**: Base64 encoding provides obscurity but not true encryption. Always use HTTPS for secure password transmission.
Credentials in URLs may appear in browser history and server logs. Prefer
entering credentials in the login form, and do not publish credential-bearing
URLs.

# ActiveMQ Artemis compatibility backend
[server/mainartemis.py](server/mainartemis.py) is an alternative to the Classic
backend in [server/main.py](server/main.py). It keeps Classic-style frontend
routes and translates management calls to Artemis Jolokia at
`/console/jolokia`. It maps broker statistics, queues, topic addresses,
connections, subscription operations, and message browsing into the shapes
expected by the console. Message sending uses STOMP rather than Jolokia.

With the dependencies from [server/requirements.txt](server/requirements.txt)
installed, run from the `server` directory:

```bash
uvicorn mainartemis:app --host 127.0.0.1 --port 8180
```

Open `http://localhost:8180/AMQC/index.html?brokerip=localhost&brokerport=8180&brokername=localhost`.
The frontend route uses `brokername=localhost`; the backend's
`ARTEMIS_BROKER_NAME` selects the actual Artemis broker.

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `ARTEMIS_HOST` | `localhost` | Artemis host |
| `ARTEMIS_HTTP_PORT` | `8161` | Artemis HTTP/Jolokia port |
| `ARTEMIS_STOMP_PORT` | `61616` | STOMP port used by backend message sending, not the browser WebSocket port |
| `ARTEMIS_BROKER_NAME` | `0.0.0.0` | Actual broker name from `broker.xml` |
| `ARTEMIS_JOLOKIA_PATH` | `/console/jolokia` | Jolokia endpoint path |
| `AMQC_PREFIX` | Empty | Backend prefix applied to static-file and API routes |

The adapter is experimental and has compatibility limitations:

* Per-connection producer/consumer counts and slow/blocked flags are not fully
  available from Artemis connection listings.
* Durable subscriptions use the `<clientId>.<subscriptionName>` queue naming
  convention, which may differ between clients or broker configurations.
* Deleting an individual message resolves its Classic JMS ID to an Artemis
  numeric ID by browsing first; non-JMS messages may not match.
* Backend message sending requires a STOMP-enabled Artemis acceptor.
* Bulk topic cleanup requires Classic-style active and inactive durable
  subscriber metadata. The adapter does not currently synthesize those broker
  fields, so cleanup refuses to proceed when they are absent.

# Regression tests
The focused tests use Node.js's built-in test runner and mocked broker requests:

```bash
node --test tests/message.test.js tests/queues.test.js tests/topics.test.js
```

They cover JSON formatting, cleanup eligibility, confirmation cancellation,
rechecks, and failure reporting without deleting destinations on a live broker.

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
