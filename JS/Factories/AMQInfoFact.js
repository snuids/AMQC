app.factory('amqInfoFactory', ['$http', '$location', '$interval', 'toasty', function($http, $location, $interval, toasty) {
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
	factory.rememberMe = false;
	
	factory.queueMessages=[];
	
	factory.autoRefresh = 0;		// in seconds, 0 == no refresh
	factory.timeRefresh = undefined;
	
	factory.changeRefresh = function() {
		if (angular.isDefined(factory.timeRefresh)) {
			console.log('Time refresh already running. Resetting.');
			$interval.cancel(factory.timeRefresh);
			factory.timeRefresh = undefined;
		}
		console.log('new autorefresh:' + factory.autoRefresh * 1000);
		if (factory.autoRefresh > 0)
			factory.timeRefresh = $interval(function() { factory.refreshAll(); }, factory.autoRefresh * 1000);
	}
	
	factory.loadPreferences = function() {
		if(typeof(Storage) === undefined || factory.rememberMe === false)
			return;
		
		if (localStorage.getItem("amqc.hideAdvisoryQueues") !== undefined)
			factory.hideAdvisoryQueues = localStorage.getItem("amqc.hideAdvisoryQueues");
		
		if (localStorage.getItem("amqc.autoRefresh") !== undefined)
			factory.autoRefresh = localStorage.getItem("amqc.autoRefresh");

		toasty.success({msg:'Loaded user saved preferences'});
	}
	
	factory.savePreferences = function() {
		if(typeof(Storage) === undefined || factory.rememberMe === false)
			return;
		
		localStorage.setItem('amqc.hideAdvisoryQueues', factory.hideAdvisoryQueues);
		localStorage.setItem('amqc.autoRefresh', factory.autoRefresh);
		
		toasty.success({msg:'Preferences updated'});
	}
	
	factory.loadConnectionParameters = function()
	{
		if((typeof(Storage) !== undefined) && localStorage.getItem("amqc.rememberme") !== undefined && localStorage.getItem("amqc.rememberme") === true) {
			console.log('loading conn params');
		    if(localStorage.getItem("amqc.brokerip") !== undefined)
				factory.brokerip=localStorage.getItem("amqc.brokerip");
			
			if(localStorage.getItem("amqc.brokerport") !== undefined)
				factory.brokerport=parseInt(localStorage.getItem("amqc.brokerport"));
			
			if(localStorage.getItem("amqc.brokername") !== undefined)
				factory.brokername=localStorage.getItem("amqc.brokername");
			
			if(localStorage.getItem("amqc.login") !== undefined)
				factory.login=localStorage.getItem("amqc.login");
			
			if(localStorage.getItem("amqc.rememberme") !== undefined)
				factory.rememberMe = localStorage.getItem("amqc.rememberme");
		}
		console.log('rememberme:' + JSON.stringify(factory.rememberMe));
	}

	factory.saveConnectionParameters=function()
	{
		if((factory.rememberMe)&&(typeof(Storage) !== undefined)) {
			console.log('saving conn params');
		    localStorage.setItem("amqc.brokerip", factory.brokerip);
		    localStorage.setItem("amqc.brokerport", factory.brokerport);
		    localStorage.setItem("amqc.brokername", factory.brokername);
		    localStorage.setItem("amqc.login", factory.login);
			localStorage.setItem("amqc.rememberme", factory.rememberMe);
			console.log('rememberme:'+factory.rememberMe);
		} else {
		    // Sorry! No Web Storage support..
		}
	}
		
	factory.refreshInfo=function() {
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
			toasty.error({msg:'Unable to connect to ActiveMQ. Status:' + response.status});
			//alert('Unable to connect to ActiveMQ. Status:'+response.status);
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
			  toasty.error({msg:'Cannot read queues'});
			///alert('Cannot read queues');
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
			  toasty.error({msg:'Cannot read topics'});
		    //alert('Cannot read topics');
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
			  toasty.error({msg:'Cannot read connections'});
		    //alert('Cannot read connections');
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
			toasty.success({msg:'Durable subscriber ' + durablesub + ' deleted'});
			factory.refreshAll();

		  }, function errorCallback(response) {
			  toasty.error({msg:'Unable to delete durable subscriber ' + durablesub});
		    //alert('Unable to destroy durable consumer.');
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
			toasty.success({msg:'Queue ' + queueName + ' created'});
					console.log(response);
			factory.refreshAll();

		  }, function errorCallback(response) {
			  toasty.error({msg:'Unable to create queue ' + queueName});
		    //alert('Unable to create new queue.');
			console.log(response);
		  });
		
	}

	factory.createNewTopic=function(topicName,queueAction)
	{
		var postUrl=factory.getPostUrl();
						
		var data={
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername,
			"operation":"addTopic",
			"arguments":[topicName]
		};
		
		console.log(data);
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			alert('done');
					console.log(response);
			factory.refreshAll();

		  }, function errorCallback(response) {
		    alert('Unable to create new topic.');
			console.log(response);
		  });
		
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
			toasty.success({msg:'Deleted queue ' + queueName});
			console.log(response);
			factory.refreshAll();
		}, function errorCallback(response) {
			toasty.error({msg:'Unable to delete queue ' + queueName});
			console.log(response);
		  });
		
//		this.execQueue(queueName,'purge','Queue');
	}
	
	factory.deleteTopic=function(topicName,queueAction)
	{
		var postUrl=factory.getPostUrl();
						
		var data={
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername,
			"operation":"removeTopic",
			"arguments":[topicName]
		};
		
		console.log(data);
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			alert('done');
					console.log(response);
			factory.refreshAll();

		  }, function errorCallback(response) {
		    alert('Unable to delete topic.');
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
			factory.refreshAll();
		  }, function errorCallback(response) {
		    alert('ko');
		  });
	}
	
	factory.bin2String=function(array) {
	  var result = "";
	  for (var i = 0; i < array.length; i++) {
	    result += String.fromCharCode(parseInt(array[i]));
	  }
	  return result;
	}
	
	factory.browseQueue=function(queueName)
	{
		var postUrl=factory.getPostUrl();
						
		var data={
		    "type":"exec",
			"mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername+",destinationType=Queue,destinationName="+queueName,
			"operation":"browse()"
		};
		
		console.log(data);
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			console.log(response);
			factory.queueMessages=[];
			for(var i=0;i<response.data.value.length;i++)
			{
				if(response.data.value[i].Text==undefined)
					response.data.value[i].Text=factory.bin2String(response.data.value[i].BodyPreview);
				factory.queueMessages.push(response.data.value[i]);
			}


		  }, function errorCallback(response) {
		    alert('Unable to delete topic.');
			console.log(response);
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

	factory.loadConnectionParameters();
	factory.loadPreferences();
	
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
}]);
