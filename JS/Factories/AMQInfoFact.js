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
		if(!factory.connected)
			return;
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
		    alert('ko');
		  });
	}
	
	factory.refreshTopics=function()
	{
		if(!factory.connected)
			return;
		
		$http({
		  method: 'GET',
		  url: factory.topicsUrl
		  
		}).then(function successCallback(response) {
		    factory.topics=response.data.value;

			factory.filteredTopics=[];

			for ( property in factory.topics ) 
			{
				factory.filteredTopics.push(factory.topics[property]);
			}

		  }, function errorCallback(response) {
		    alert('ko');
		  });
	}
	
	factory.refreshConnections=function()
	{
		if(!factory.connected)
			return;
		
		var curl=factory.connectionsUrl.replace(/CONNECTORNAME/g,this.selectedConnector);

		
		$http({
		  method: 'GET',
		  url: curl
		  
		}).then(function successCallback(response) {
		    factory.connections=response.data.value;

			factory.filteredConnections=[];

			for ( property in factory.connections ) {
					factory.filteredConnections.push(factory.connections[property]);
			}
			console.log(factory.filteredConnections);
		  }, function errorCallback(response) {
		    alert('ko');
		  });
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
		factory.refreshInfo();
		factory.refreshQueues();
		factory.refreshTopics();	
		factory.refreshConnections();	
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
	factory.filteredInfo=[];
	factory.filteredQueues=[];
	factory.filteredTopics=[];		
	factory.filteredConnections=[];		


/*	var rep=$location.search().ip;

	if($location.search().ip == undefined)
	{
		rep=window.location.hostname;
	}*/
	
	factory.selectedConnector='openwire';
	
    return factory;
});
