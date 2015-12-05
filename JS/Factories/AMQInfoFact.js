app.factory('amqInfoFactory', ['$http', '$location', '$interval', '$q', 'toasty', 'Base64'
		, function($http, $location, $interval, $q, toasty, Base64) {

	var factory = {}; 

	factory.hideAdvisoryQueues = true;

	factory.login = "";
	factory.password = "";
	factory.brokername = "localhost";
	factory.brokerip = "127.0.0.1";
	factory.brokerport = 8161;
	factory.connected = false;
	factory.connecting = false;
	factory.rememberMe = false;
	factory.host=location.host;
	
	factory.queueMessages = [];
	factory.orderedQueueList=[];
	factory.queueStats = {}; // TODO: document internals
	factory.queueStatsFields = [ 'QueueSize', 'EnqueueCount' ];//, 'ConsumerCount' ]; // TODO: user selectable from UI
	
	factory.connectionError="";
		
	// 0 - Info, 1 - Queues, 2 - Connections, 3 - Topics
	factory.currentlyRefreshing = [false, false, false, false];
	
	factory.autoRefreshInterval = 0; // in seconds, 0 == no refresh
	factory.refreshTimer = undefined;
		
	factory.getUrlParameter=function(name)
	{
		  url = location.href;
		  name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
		  var regexS = "[\\?&]"+name+"=([^&#]*)";
		  var regex = new RegExp( regexS );
		  var results = regex.exec( url );
		  return results == null ? null : results[1];		
	}
	
	factory.addQueueStat = function(queueName) {
		if (queueName in factory.queueStats) {
			//console.log('Trying to add queueStatsItem when it already exists (' + queueName + ')');
			return;
		}
		
		factory.queueStats[queueName] = {};
		console.log('added stats entry for queue ' + queueName);
	}
	
	factory.computeOrderedQueueList=function()
	{
		factory.orderedQueueList=[];
		for ( property in factory.queueStats )
		{
			factory.orderedQueueList.push(property);
		}
		factory.orderedQueueList.sort();
	}
	
	factory.isRefreshing = function() {
		return factory.currentlyRefreshing.indexOf(true) !== -1;
	}
	
	factory.showCORSBanner=function()
	{
		if((factory.login.length>0)&&(window.location.host!=(factory.brokerip+':'+factory.brokerport)))
			return true;
		else
			return false;
	}
		
	factory.stopRefreshTimer = function() {
		if (angular.isDefined(factory.refreshTimer)) {
			console.log('Removing time refresh.');
			$interval.cancel(factory.refreshTimer);
			factory.refreshTimer = undefined;
		}		
	}
	
	factory.setRefresh = function() {
		factory.stopRefreshTimer();
		
		console.log('new autoRefreshInterval:' + factory.autoRefreshInterval * 1000);
		
		if (factory.autoRefreshInterval > 0)
			factory.refreshTimer = $interval(function() { factory.refreshAll(); }, factory.autoRefreshInterval * 1000);
	}
	
	/* Loading Preferences */
	factory.loadPreferences = function() {
		if(typeof(Storage) === undefined || factory.rememberMe === false)
			return;
				
		if ((localStorage.getItem("amqc.hideAdvisoryQueues") !== undefined)
				&&(localStorage.getItem("amqc.hideAdvisoryQueues") !== null))		
			factory.hideAdvisoryQueues = localStorage.getItem("amqc.hideAdvisoryQueues") === "true";
		
		if ((localStorage.getItem("amqc.autoRefreshInterval") !== undefined)
				&&(localStorage.getItem("amqc.autoRefreshInterval") !== null))
			factory.autoRefreshInterval = parseInt(localStorage.getItem("amqc.autoRefreshInterval"));

		toasty.success({msg:'Loaded user saved preferences'});
	}

	/* Saving Preferences */	
	factory.savePreferences = function() {
		if((typeof(Storage) === undefined) || factory.rememberMe === false)
			return;
		
		localStorage.setItem('amqc.hideAdvisoryQueues', factory.hideAdvisoryQueues);
		localStorage.setItem('amqc.autoRefreshInterval', factory.autoRefreshInterval);
		toasty.success({msg:'Preferences updated'});
	}

	/* Load Connection Parameters */		
	factory.loadConnectionParameters = function()
	{
		if((typeof(Storage) !== undefined) && localStorage.getItem("amqc.rememberme") !== undefined && localStorage.getItem("amqc.rememberme") === "true") {

		    if(localStorage.getItem("amqc.brokerip") !== undefined)
				factory.brokerip = localStorage.getItem("amqc.brokerip");
			
			if(localStorage.getItem("amqc.brokerport") !== undefined)
				factory.brokerport = parseInt(localStorage.getItem("amqc.brokerport"));
			
			if(localStorage.getItem("amqc.brokername") !== undefined)
				factory.brokername = localStorage.getItem("amqc.brokername");
			
			if(localStorage.getItem("amqc.login") !== undefined)
				factory.login = localStorage.getItem("amqc.login");
			
			if(localStorage.getItem("amqc.password") !== undefined)
				factory.password = localStorage.getItem("amqc.password");
			
			if(localStorage.getItem("amqc.rememberme") !== undefined)
				factory.rememberMe = localStorage.getItem("amqc.rememberme") === "true";
		}
		// Set URI parameters if defined
		var uriparams=["login","password","brokerip","brokername","brokerport"];
		for(var i=0;i<uriparams.length;i++)
		{
			if(factory.getUrlParameter(uriparams[i])!=null)
				factory[uriparams[i]]=factory.getUrlParameter(uriparams[i]);
		}			
		factory.brokerport=parseInt(''+factory.brokerport);
		if(factory.getUrlParameter("autologin")=="true")
			factory.autologin=true;						
	}

	/* Save Connection Parameters */		
	factory.saveConnectionParameters = function() {
		if (typeof(Storage) === undefined)
			return;							// Sorry! No Web Storage support..
		
		var save = factory.rememberMe;
		
		localStorage.setItem("amqc.brokerip", factory.brokerip);
		localStorage.setItem("amqc.brokerport", factory.brokerport);
		localStorage.setItem("amqc.brokername", factory.brokername);
		localStorage.setItem("amqc.login", save ? factory.login : '');
		localStorage.setItem("amqc.password", save ? factory.password : ''); // TODO: encrypt
		localStorage.setItem("amqc.rememberme", save);
	}
		
	factory.refreshInfo = function() {
		
		if (factory.currentlyRefreshing[0])
			return;							// Hasn't returned from previous call yet
		
		factory.currentlyRefreshing[0] = true;
		
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
			factory.connected = true;
			factory.connecting = false;	
			factory.currentlyRefreshing[0] = false;
		}, function errorCallback(response) {
			toasty.error({msg:'Unable to connect to ActiveMQ. Status:' + response.status});
//			toasty.error({msg:'Unable to connect to ActiveMQ. Status:' + response.data});

//			alert(response.data);
			if(response.data!=null)
				factory.connectionError=response.data.replace("<h2>","<h4>").replace("</h2>","</h4>");
//			console.log(response);
			//alert('Unable to connect to ActiveMQ. Status:'+response.status);
			factory.connecting=false;
			factory.stopRefreshTimer();
			factory.currentlyRefreshing[0] = false;
		});
	}
	
	factory.refreshQueues = function() {
		
		if (factory.currentlyRefreshing[1])
			return;							// Hasn't returned from previous call yet
		
		factory.currentlyRefreshing[1] = true;
		
		$http({
		  method: 'GET',
		  url: factory.queuesUrl,
		  timeout:5000
		  
		}).then(function successCallback(response) {
		    factory.queues=response.data.value;

			factory.filteredQueues=[];

			for ( property in factory.queues ) {
				factory.filteredQueues.push(factory.queues[property]);
				
				var queue = factory.queues[property];
				
				factory.addQueueStat(queue.Name);
			
				var qStat = factory.queueStats[queue.Name];
				
				for (i in factory.queueStatsFields) {
					var statField = factory.queueStatsFields[i];
					
					if (qStat[statField] === undefined) {						
						qStat[statField] = { key: statField, values: [] };
						//console.log("new - " + JSON.stringify(qStat[statField]));
					}
					
					if (qStat[statField].values.length > 100)
						qStat[statField].values.shift();

					qStat[statField].values.push({x:Math.floor(Date.now()), y:queue[statField]});
				}
			}
			factory.computeOrderedQueueList();
			factory.currentlyRefreshing[1] = false; 
			//console.log(factory.filteredQueues);
		  }, function errorCallback(response) {
			  toasty.error({msg:'Cannot read queues'});
			  factory.stopRefreshTimer();
			  factory.currentlyRefreshing[1] = false;
			///alert('Cannot read queues');
		  });
	}
	
	factory.refreshTopics = function() {
		
		if (factory.currentlyRefreshing[3])
			return;							// Hasn't returned from previous call yet

		factory.currentlyRefreshing[3] = true;
		
		$http({
		  method: 'GET',
		  url: factory.topicsUrl,
		  timeout:5000
		  
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
					if((obj.Durable)&&(!obj.Connected))
					{
						factory.getSubscriberDetails(obj);
					}

									
					factory.topicSubscribers.push(obj);
				}
			}
			factory.currentlyRefreshing[3] = false;
			
		  }, function errorCallback(response) {
			  toasty.error({msg:'Cannot read topics'});
			  factory.stopRefreshTimer();
			  factory.currentlyRefreshing[3] = false;
		    //alert('Cannot read topics');
		  });
	}
	
	factory.getSubscriberDetails = function(obj)
	{		
		var postUrl=factory.getPostUrl();
		
		var data={
		    "type":"read",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername+",destinationType="+obj.DestinationType+",destinationName="+obj.DestinationName+",endpoint=Consumer,clientId="+obj.ClientID.replace(/:/g,'_')+",consumerId="+obj.OriginalConsumerID.replace(/:/g,'_')
		};
//		alert(data.mbean);
		//alert(JSON.stringify(data));
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
//			console.log("RES:");
//			console.log(response);
			obj.properties=response.data.value;
			
		  }, function errorCallback(response) {
		    console.log("ERROR while reading subscriber details.");
		  });

	}
	
	factory.refreshConnections = function() {
		
		if (factory.currentlyRefreshing[2])
			return;							// Hasn't returned from previous call yet

		factory.currentlyRefreshing[2] = true;
		
		var connectorName = this.selectedConnector;
		
		if (this.selectedConnector === 'all')
			connectorName = '*';
		
		var curl=factory.connectionsUrl.replace(/CONNECTORNAME/g, connectorName);
		
		$http({
		  method: 'GET',
		  url: curl,
		  timeout:5000
		  
		}).then(function successCallback(response) {
		    factory.connections=response.data.value;

			factory.filteredConnections=[];
			factory.activeConnections={};

			for ( property in factory.connections ) {
					factory.filteredConnections.push(factory.connections[property]);
					factory.activeConnections[factory.connections[property].ClientId.replace(/:/g,'_')]=factory.connections[property];
			}
			factory.currentlyRefreshing[2] = false;
		  }, function errorCallback(response) {
			  toasty.error({msg:'Cannot read connections'});
			  factory.stopRefreshTimer();
			  factory.currentlyRefreshing[2] = false;
		  });
	}

	/* Durables */

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
			toasty.success({msg:'Durable subscriber ' + durablesub.OriginalConsumerID + ' deleted'});
			factory.refreshAll();

		}, function errorCallback(response) {
			toasty.error({msg:'Unable to delete durable subscriber ' + durablesub.OriginalConsumerID});
		    //alert('Unable to destroy durable consumer.');
			console.log(response);
		  });
	}
	
	factory.createDurableSubscriber=function(newDurableSubscriber,newDurableClientID,newDurableTopic,newDurableSelector)
	{
		var postUrl=factory.getPostUrl();
		var selector=null;
		if(newDurableSelector!='')
			selector=newDurableSelector;
						
		var data={
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername,
			"operation":"createDurableSubscriber",
			"arguments":[newDurableClientID,newDurableSubscriber,newDurableTopic,selector]
		};
		
		console.log(data);
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			toasty.success({msg:'Durable subscriber ' + newDurableSubscriber + ' created'});
			factory.refreshAll();
			

		}, function errorCallback(response) {
			toasty.error({msg:'Unable to create durable subscriber ' + newDurableSubscriber});
		    //alert('Unable to destroy durable consumer.');
			console.log(response);
		  });
	}

	/* Queues */

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
			console.log(response);
		  });
		
	}

	factory.deleteQueue = function(queueName,queueAction) {
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
			toasty.success({msg:'Queue ' + queueName+' deleted'});
			console.log(response);
			factory.refreshAll();
			}, function errorCallback(response) {
			toasty.error({msg:'Unable to delete queue ' + queueName});
			console.log(response);
		  });
	}
	
	/* Topic */

	factory.createNewTopic=function(topicName,queueAction)
	{
		var postUrl=factory.getPostUrl();
						
		var data = {
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername,
			"operation":"addTopic",
			"arguments":[topicName]
		};
		
		console.log(data);
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			toasty.success('Topic ' + topicName + ' created.');
			console.log(response);
			factory.refreshAll();

		}, function errorCallback(response) {
			toasty.error('Unable to create topic ' + topicName);
			console.log(response);
		});		
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
			console.log(response);
			factory.refreshAll();

		  }, function errorCallback(response) {
		    alert('Unable to delete topic.');
			console.log(response);
		  });
		
//		this.execQueue(queueName,'purge','Queue');
	}
	
	/* Delete Message */
	
	factory.deleteMessage = function(queueType, queueName, msgId) {
		var execUrl = factory.execUrl;
						
		var data={
		    "type":"exec",
		    "mbean":"org.apache.activemq:type=Broker,brokerName=" + factory.brokername + ",destinationType=" + queueType + ",destinationName=" + queueName,
			"operation":"removeMessage",
			"arguments":[msgId]
		};
		
		console.log(JSON.stringify(data));
		
		return $q(function(resolve, reject) {
			$http.post(execUrl, data, {})
				.then(function successCallback(response) {
					console.log(response);
					factory.refreshAll();
					resolve(true);
				}, function errorCallback(response) {
					console.log(response);
					reject(false);				
				})
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
	
	factory.sendMessage=function(destType,destName,properties)
	{
//		alert(destType+' '+text+' '+properties);
		var postUrl=factory.getPostUrl();
				
		alert(properties);
		
		var data={
		    "type":"exec",
			"mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername+",destinationType="+destType
					+",destinationName="+destName,
			"operation":"sendTextMessageWithProperties()",
			"arguments":[properties]
		};

		console.log(data);

		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			console.log(response);
			if((response.data!=null)&&(response.data.error!=null))
			{
				toasty.error(response.data.error);
			}
			else
				alert('ok');

		  }, function errorCallback(response) {
		    alert('Unable to send Message.');
			console.log(response);
		  });
	}
	
	factory.getPostUrl = function() {
		return factory.postUrl;
	}		
	
	factory.refreshAll = function() {

		if (factory.isRefreshing()) {
			toasty.warning({msg:'Already in a refresh cycle'});
			return;
		}

		factory.refreshInfo();
		factory.refreshQueues();
		factory.refreshConnections();	
		factory.refreshTopics();	
	}
	
	factory.extractProperty = function(prop,str) {
		if((str==null)||(str == undefined))
			return '';
		var re=new RegExp("("+prop+"=)([^,}]*)"); 
		var res=re.exec(str);

		if((res!=null)&&(res.length>2))
			return res[2];
		return str;		
	}
	
	factory.getTypeOf=function(value)
	{
		return typeof(value);
	}
	
	factory.prepareURLs = function() {
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

//	alert(window.location.hostname);

/*	var rep=$location.search().ip;

	if($location.search().ip == undefined)
	{
		rep=window.location.hostname;
	}*/
	
	factory.selectedConnector='all';
	
    return factory;
}]);
