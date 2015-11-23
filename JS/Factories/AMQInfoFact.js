app.factory('amqInfoFactory', function($http,$location){			
    var factory = {}; 

	
	factory.hideAdvisoryQueues=true;

	factory.login="";
	factory.password="";
	factory.brokername="localhost";
	factory.brokerip="127.0.0.1";
	factory.brokerport=8161;
	factory.connected=false;
	factory.connecting=false;
	factory.refreshing=false;
		
	factory.refreshInfo=function()
	{
		factory.connecting=true;		
		$http({
		  method: 'GET',
		  url: factory.infoUrl,
		  timeout:5000
		}).then(function successCallback(response) {
		    factory.info=response.data.value;
			
			factory.filteredInfo=[];


			for ( property in factory.info ) {
				if((!(factory.info[property] instanceof Array))
				&&(!(factory.info[property] instanceof Object)))
				{
					var nobj={key:property,value:factory.info[property]};
					factory.filteredInfo.push(nobj);
				}
			}
			factory.filteredInfo.sort(function(a, b){return a.key.localeCompare(b.key)});
			factory.connected=true;
			factory.connecting=false;		

		  }, function errorCallback(response) {
		    alert('Unable to connect to ActiveMQ. Status:'+response.status);
			factory.connecting=false;		
		  });
	}
	
	factory.refreshQueues=function()
	{
		$http({
		  method: 'GET',
		  url: factory.queuesUrl
		  
		}).then(function successCallback(response) {
		    factory.queues=response.data.value;

			factory.filteredQueues=[];

			for ( property in factory.queues ) {
					factory.filteredQueues.push(factory.queues[property]);
			}
			//console.log(factory.filteredQueues);
		  }, function errorCallback(response) {
		    alert('Cannot read queues');
		  });
	}
	
	factory.refreshTopics=function()
	{
		
		$http({
		  method: 'GET',
		  url: factory.topicsUrl
		  
		}).then(function successCallback(response) {
		    factory.topics=response.data.value;

			factory.filteredTopics=[];
			factory.topicSubscribers=[];

			for ( property in factory.topics ) 
			{
				factory.filteredTopics.push(factory.topics[property]);
				var subs=factory.topics[property].Subscriptions;
				for ( var i=0 ; i<subs.length;i++ ) 
				{
					var obj={};

					obj.DestinationName=factory.extractProperty('destinationName',subs[i].objectName);;
					obj.DestinationType=factory.extractProperty('destinationType',subs[i].objectName);;
					obj.ClientID=factory.extractProperty('clientId',subs[i].objectName);
					var consuid=factory.extractProperty('consumerId',subs[i].objectName);
					obj.OriginalConsumerID=consuid;
					
					if(consuid.indexOf('Durable(')==0)
					{
						consuid=consuid.replace(/Durable\(/,'').replace(/\)/,'');
						obj.Durable=true;
					}
					else
						obj.Durable=false;

					obj.ConsumerID=consuid;

					obj.Connected=factory.activeConnections[obj.ClientID]!=undefined;
					factory.topicSubscribers.push(obj);
				}
			}
			factory.refreshing=false;

		  }, function errorCallback(response) {
		    alert('Cannot read topics');
		  });
	}
	
	factory.refreshConnections=function()
	{
		var connectorName = this.selectedConnector;
		
		if (this.selectedConnector === 'all')
			connectorName = '*';
		
		var curl=factory.connectionsUrl.replace(/CONNECTORNAME/g, connectorName);
		
		$http({
		  method: 'GET',
		  url: curl
		  
		}).then(function successCallback(response) {
		    factory.connections=response.data.value;

			factory.filteredConnections=[];
			factory.activeConnections={};

			for ( property in factory.connections ) {
					factory.filteredConnections.push(factory.connections[property]);
//					alert('push'+factory.connections[property].ClientId);
					factory.activeConnections[factory.connections[property].ClientId.replace(/:/g,'_')]=true;
			}
//			console.log(factory.activeConnections);
		  }, function errorCallback(response) {
		    alert('Cannot read connections');
		  });
	}

	factory.deleteDurableSubscriber=function(durablesub)
	{
		var postUrl=factory.getPostUrl();
						
		var data={
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername+",destinationType=Topic,destinationName="+durablesub.DestinationName+",endpoint=Consumer,clientId="
				+durablesub.ClientID+",consumerId="+durablesub.OriginalConsumerID,
			"operation":"destroy"
		};
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			alert('done');
			factory.refreshAll();

		  }, function errorCallback(response) {
		    alert('Unable to destroy durable consumer.');
			console.log(response);
		  });
	}

	factory.createNewQueue=function(queueName,queueAction)
	{
		var postUrl=factory.getPostUrl();
						
		var data={
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername,
			"operation":"addQueue",
			"arguments":[queueName]
		};
		
		console.log(data);
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			alert('done');
					console.log(response);
			factory.refreshAll();

		  }, function errorCallback(response) {
		    alert('Unable to create new queue.');
			console.log(response);
		  });
		
//		this.execQueue(queueName,'purge','Queue');
	}

	factory.deleteQueue=function(queueName,queueAction)
	{
		var postUrl=factory.getPostUrl();
						
		var data={
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername,
			"operation":"removeQueue",
			"arguments":[queueName]
		};
		
		console.log(data);
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			alert('done');
					console.log(response);
			factory.refreshAll();

		  }, function errorCallback(response) {
		    alert('Unable to delete queue.');
			console.log(response);
		  });
		
//		this.execQueue(queueName,'purge','Queue');
	}

	factory.resetStatsTopic=function(topicName)
	{
		this.execQueue(topicName,'resetStatistics','Topic');
	}

	factory.purgeQueue=function(queueName,queueAction)
	{
		this.execQueue(queueName,'purge','Queue');
	}		
	
	factory.resetStatsQueue=function(queueName)
	{
		this.execQueue(queueName,'resetStatistics','Queue');
	}
	
	factory.execQueue=function(queueName,queueAction,queueType)
	{
		var reseturl=factory.execUrl;
		reseturl=reseturl.replace('QUEUENAME',queueName);
		reseturl=reseturl.replace('QUEUEACTION',queueAction);
		reseturl=reseturl.replace('QUEUETYPE',queueType);

		$http({
		  method: 'GET',
		  url: reseturl
		  
		}).then(function successCallback(response) {
			console.log(response);
			this.refreshAll();
		  }, function errorCallback(response) {
		    alert('ko');
		  });
	}
	
	
	factory.getPostUrl=function ()
	{
		return factory.postUrl;
	}
		
	
	factory.refreshAll =function()
	{
		factory.refreshing=true;
		factory.refreshInfo();
		factory.refreshQueues();
		factory.refreshConnections();	
		factory.refreshTopics();	
	}
	
	factory.extractProperty=function(prop,str)
	{
		if((str==null)||(str == undefined))
			return '';
		var re=new RegExp("("+prop+"=)([^,}]*)"); 
		var res=re.exec(str);

		if((res!=null)&&(res.length>2))
			return res[2];
		return str;
		
	}
	
	factory.prepareURLs=function()
	{
		factory.infoUrl='http://REPLACEIP:REPLACEPORT/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME';
		factory.queuesUrl='http://REPLACEIP:REPLACEPORT/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,destinationType=Queue,destinationName=*';
		factory.topicsUrl='http://REPLACEIP:REPLACEPORT/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,destinationType=Topic,destinationName=*';
		factory.connectionsUrl='http://REPLACEIP:REPLACEPORT/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,connector=clientConnectors,connectorName=CONNECTORNAME,connectionViewType=clientId,connectionName=*';	
		factory.execUrl='http://REPLACEIP:REPLACEPORT/api/jolokia/exec/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,destinationType=QUEUETYPE,destinationName=QUEUENAME/QUEUEACTION';
		factory.postUrl='http://REPLACEIP:REPLACEPORT/api/jolokia';		
		
		factory.infoUrl=factory.infoUrl.replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.queuesUrl=factory.queuesUrl.replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.topicsUrl=factory.topicsUrl.replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.connectionsUrl=factory.connectionsUrl.replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.execUrl=factory.execUrl.replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.postUrl=factory.postUrl.replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);			
	}
	
	factory.info={};
	factory.activeConnections={};
	factory.filteredInfo=[];
	factory.filteredQueues=[];
	factory.filteredTopics=[];		
	factory.filteredConnections=[];		
	factory.topicSubscribers=[];	

/*	var rep=$location.search().ip;

	if($location.search().ip == undefined)
	{
		rep=window.location.hostname;
	}*/
	
	factory.selectedConnector='all';
	
    return factory;
});
