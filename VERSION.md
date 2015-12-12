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