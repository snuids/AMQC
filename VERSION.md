v0.66 23Nov2015	Send Interface added
v0.67 25Nov2015	Queue Browser, Remember me interface added
v0.69 25Nov2015	Fixed a preference issue when window.location is not defined. Refresh icon added.
v0.70 25Nov2015	Message browser finished
v0.71 26Nov2015 Ability to delete a message from the queue message browser
v0.73 29Nov2015 All dependencies are handled by bower. (.bowerrc folder must be bower_dep in the main folder) Angular-confirm dialog boxes instead of the regular javascript ones.
v0.74 29Nov2015 Subscribers panel improved. Added the possibility to create a durable subscriber
v0.75 29Nov2015 Selector added.
v0.76 02Nov2015 Second filter added.
v0.77 05Dec2015 Stomp protocol forced in the client connection
v0.78 05Dec2015 Message sending via the Active MQ Rest API panel added
v0.79 06Dec2015 Broker stats added
v0.80 07Dec2015 Queues panel css enhanced
v0.81 09Dec2015 User can now select which queue stats will be displayed from the Preferences tab (rough initial version, need to also add automatic different colors), moved preferences to PreferencesFact (new) from amqInfoFact, added angular-component for using component() before 1.5.0
v0.82 10Dec2015 Queue chart stats can be processed via an option in the preferences (currently just one kind of processing available) to enable e.g. viewing per second stats like in Info->Statistics chart.
v0.83 12Dec2015 Fixed a problem with old version of preferences. The hide advisory queue is working again. Processors are on by default in the preferences.
v0.84 12Dec2015 Hyperlinks added from connections to queues and topics
v0.85 13Dec2015 Hyperlinks finished. Connectors moved to a panel in the info tab
v0.86 13Dec2015 Stomp Client Only mode added. Filter Field linked to a single tab
v0.87 13Dec2015 Better stomp client error handling
v0.88 13Dec2015 Queue and Topic stats added
v0.89 18Dec2015 CSS fix for connector list. Refresh rate set to 10 seconds by default.
v0.90 23Dec2015 Stomp message time line interface added.
v0.91 23Dec2015 Client Time Lines on click issues fixed.
v0.92 17Jan2016 Display refresh cycle details
v0.93 26Jan2016 Slow column added in the connection details interface
v0.95 28Jan2016 Selector added in the connection detail
v0.96 28Jan2016 Fixed a message time line button visibility issue
v1.00 01Feb2016 Fixed a bug in the hide advisory topic preference. Refresh button added in connection details. Connection tester added.
v1.01 01Feb2016 Cosmetic css change
v1.02 01Feb2016 Connection details table is no longer draggable
v1.03 14Feb2016 Connection details table is no longer draggable. Main view should no longer have a scrollbar.
v1.04 17Feb2016 Date format of message browser changed in order to add the day
v1.05 18Feb2016 defaultinfotab and defaultrefreshrate url parameters added
v1.06 20Mar2016 Fixed a bug that occured when a queue was deleted.
v1.07 28Mar2016 Glyph Icons added. Send Message parameters saved in the local storage.
v1.08 22May2016 Correctly sets the Queue/Topic radio box in the Send Tab. Fixed a CSS issue with the time line view.
v1.09 19Jun2016 Fixed a bug in the send message via the Stomp Client interface
v1.10 05May2018 added urlprefix parameter and support https if used with a reverse proxy
v1.11 06May2018 Save the stomp login and password in local storage