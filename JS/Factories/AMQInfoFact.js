app.factory('amqInfoFactory', function($http,$location){			
    var factory = {}; 
	factory.infoUrl='http://REPLACE:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost';
	factory.queuesUrl='http://REPLACE:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=*';
	factory.topicsUrl='http://REPLACE:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Topic,destinationName=*';
	factory.connectionsUrl='http://REPLACE:8161/api/jolokia/read/org.apache.activemq:type=Broker,brokerName=localhost,connector=clientConnectors,connectorName=CONNECTORNAME,connectionViewType=clientId,connectionName=*';
	
	factory.execUrl='http://REPLACE:8161/api/jolokia/exec/org.apache.activemq:type=Broker,brokerName=localhost,destinationType=QUEUETYPE,destinationName=QUEUENAME/QUEUEACTION';
	factory.postUrl='http://REPLACE:8161/api/jolokia';
	
	factory.hideAdvisoryQueues=true;
	
	factory.refreshInfo=function()
	{
		$http({
		  method: 'GET',
		  url: factory.infoUrl
		  
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
//			console.log(factory.info);

			factory.filteredInfo.sort(function(a, b){return a.key.localeCompare(b.key)});
			//console.log(factory.info.TransportConnectors);

		  }, function errorCallback(response) {
		    alert('ko');
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
		    alert('ko');
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

			for ( property in factory.topics ) 
			{
//				console.log(property);
//				if(factory.hideAdvisoryQueues && (factory.topics[property].Name.indexOf("ActiveMQ.Advisory")==0))
//					continue;
				factory.filteredTopics.push(factory.topics[property]);
			}

		  }, function errorCallback(response) {
		    alert('ko');
		  });
	}
	
	factory.refreshConnections=function()
	{
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
//	factory.infoUrl='http://localhost/~snuids/AMQ/index.html';
	
//	alert(factory.extractProperty('str','str'));
	
	factory.info={};
	factory.filteredInfo=[];
	factory.filteredQueues=[];
	factory.filteredTopics=[];		
	factory.filteredConnections=[];		

	var rep=$location.search().ip;


	if($location.search().ip == undefined)
	{
		rep=window.location.hostname;
	}

	factory.infoUrl=factory.infoUrl.replace(/REPLACE/g,rep);
	factory.queuesUrl=factory.queuesUrl.replace(/REPLACE/g,rep);
	factory.topicsUrl=factory.topicsUrl.replace(/REPLACE/g,rep);
	factory.connectionsUrl=factory.connectionsUrl.replace(/REPLACE/g,rep);
	factory.execUrl=factory.execUrl.replace(/REPLACE/g,rep);
	factory.postUrl=factory.postUrl.replace(/REPLACE/g,rep);
	    
	
	factory.selectedConnector='openwire';
		
	factory.refreshAll();

	
    return factory;
});
