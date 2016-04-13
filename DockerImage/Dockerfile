FROM webcenter/activemq:latest
MAINTAINER snuids

RUN apt-get update
RUN apt-get install zip -y
RUN curl -LOk https://github.com/snuids/AMQC/archive/master.zip
RUN unzip master.zip
RUN rm master.zip
RUN mv AMQC-master ./webapps/AMQC
RUN pwd
RUN ls -l ./webapps
