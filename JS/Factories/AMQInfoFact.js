app.factory('amqInfoFactory', ['$timeout','$http', '$location', '$interval', '$q', 'toasty', 'Base64', '$rootScope', 'preferencesFact', 'ProcessorFact',
	function ($timeout,$http, $location, $interval, $q, toasty, Base64, $rootScope, preferencesFact, ProcessorFact) {    	

	var factory = {};
	
	factory.prefs = preferencesFact;
	factory.procs = ProcessorFact;
	factory.connectionDetailsObject=[];
	factory.subscriberTesterList=[];
	factory.subscriberTesterVisible=false;
	
	// queue => stat => processor
	factory.assignedProcs = {};

	/** Reset ALL **/
	factory.resetAll=function()
	{
		factory.loginok=false;
		factory.updates=0;
		factory.stompOnly=false;
	    factory.connectionsData = [
		{
			"key": "Current Number of Connections",
			"values": []
		}
		];
		
	    factory.messagesData = [
		{
			"startValue":-1,
			"startTime":new Date(),
			"key": "Enqueues / Second",
			"values": [],
			 color: 'orange'
		}
		,
		{
			"startValue":-1,
			"startTime":new Date(),
			"key": "Dequeues / Second",
			"values": [],
			color: '#2ca02c'
		}
		];		
	}
		
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
		
		//console.log('new autoRefreshInterval:' + factory.prefs.autoRefreshInterval * 1000);
		
		if(factory.defaultrefreshrate>0)
		{		
			factory.prefs.autoRefreshInterval=factory.defaultrefreshrate;
			factory.defaultrefreshrate=0;
		}
		
		
		if (factory.prefs.autoRefreshInterval > 0)
			factory.refreshTimer = $interval(function() 
			{ 
				//console.log('interval triggered');
				factory.refreshAll(); 
			}, 
			factory.prefs.autoRefreshInterval * 1000);
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
		var uriparams=["login","password","brokerip","brokername","brokerport","defaultinfotab","defaultrefreshrate"];
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
			
//			console.log(factory.info.TransportConnectors);
			
			factory.filteredInfo=[];
			factory.loginok=true;

			for ( var property in factory.info ) {
				if((!(factory.info[property] instanceof Array))
				&&(!(factory.info[property] instanceof Object)))
				{
					var nobj={key:property,value:factory.info[property]};
					factory.filteredInfo.push(nobj);
					if(property=='CurrentConnectionsCount')
					{
						factory.connectionsData[0].values.push([new Date(),parseInt(factory.info[property])]);
						if(factory.connectionsData[0].values.length>factory.MAXGRAPHVALUES)
							factory.connectionsData[0].values.shift();
						
					}					
					else if((property=='TotalEnqueueCount')||(property=='TotalDequeueCount'))
					{
						var k=0;
						if(property=='TotalDequeueCount')
							k=1;
						var mes=factory.messagesData[k];
						if(mes.startValue==-1)
						{
							mes.startValue=parseInt(factory.info[property]);
							mes.lastValue=mes.startValue;
							mes.startTime=new Date();
						}
						else
						{
							var times=(new Date()-mes.startTime)/1000;
							if(times>0)
							{
								mes.values.push([new Date(),(parseInt(factory.info[property])-mes.lastValue)/times]);
								if(mes.values.length>factory.MAXGRAPHVALUES)
									mes.values.shift();
								mes.lastValue=parseInt(factory.info[property]);
								mes.startTime=new Date();
							}
						}
					}

				}
			}
			factory.filteredInfo.sort(function(a, b){return a.key.localeCompare(b.key)});
			factory.connected = true;
			factory.connecting = false;	
			factory.currentlyRefreshing[0] = false;
//			factory.notify();
		}, function errorCallback(response) {
			toasty.error({msg:'Unable to connect to ActiveMQ. Status:' + response.status});
			if(response.data!=null)
				factory.connectionError=response.data.replace("<h2>","<h4>").replace("</h2>","</h4>");
			factory.connecting=false;
			if(!factory.loginok)
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

			for ( var property in factory.queues ) {
				factory.filteredQueues.push(factory.queues[property]);
				
				var queue = factory.queues[property];
								
				factory.addQueueStat(queue.Name);
			
				var qStat = factory.queueStats[queue.Name];
				
				if (factory.assignedProcs[queue.Name] === undefined) {
					factory.assignedProcs[queue.Name] = {};
				}
				
				factory.queueStatsFields = factory.prefs.getActiveFields();
				
				// Delete keys that were existing, but are no longer included in queueStatsFields (user preference change)
				for (var key in qStat)
					if (factory.queueStatsFields.indexOf(key) == -1)
						delete qStat[key];
				

				
				// Grab data for included queueStatsFields
				for (var i in factory.queueStatsFields) {
					var statField = factory.queueStatsFields[i];
					
					
					// Remove old processor in case user changed preference
					if (factory.assignedProcs[queue.Name][statField] !== undefined
						&& factory.assignedProcs[queue.Name][statField].procName != factory.prefs.queueChartFields[statField].procName) {
						delete factory.assignedProcs[queue.Name][statField];
						
						// Restore original name also
						if (qStat[statField] !== undefined) {
							console.log("Restoring statField.key:" + statField);
							qStat[statField].key = statField;
						}
					}
					
					if (qStat[statField] === undefined) {
						qStat[statField] = { key: statField, values: [] };
					}
					
					if (factory.assignedProcs[queue.Name][statField] === undefined) {
						var ProcFunc = factory.procs.getProcessorFromName(factory.prefs.queueChartFields[statField].procName);
						factory.assignedProcs[queue.Name][statField] = new ProcFunc(statField, queue.Name);
						//console.log(ProcFunc);
						qStat[statField].key += factory.assignedProcs[queue.Name][statField].suffixForLegend;
					}
					
					if (qStat[statField].values.length > factory.MAXGRAPHVALUES)
						qStat[statField].values.shift();

					qStat[statField].values.push({x:Math.floor(Date.now()), y:queue[statField]});
					
					// process data to apply changes (e.g. per second) based on selected processor for the field
					factory.assignedProcs[queue.Name][statField].apply(qStat[statField].values);
				}
			}
						
			
			factory.computeOrderedQueueList();
			factory.currentlyRefreshing[1] = false; 
			//console.log(factory.filteredQueues);
		  }, function errorCallback(response) {
			  toasty.error({msg:'Cannot read queues'});
			  if(!factory.loginok)
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

			for ( var property in factory.topics ) 
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
			  if(!factory.loginok)			  
			  	factory.stopRefreshTimer();
			  factory.currentlyRefreshing[3] = false;
		    //alert('Cannot read topics');
		  });
	}
	
	factory.getSubscriberDetails = function(obj,isTester)
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
			obj.properties=response.data.value;
			
			if(isTester)
			{
				obj.isOk=((obj.properties.EnqueueCounter==obj.properties.DequeueCounter)
					&&(obj.properties.EnqueueCounter==obj.properties.DispatchedCounter));
												
				//if(!obj.isOk)
				factory.subscriberTesterList.push(obj);
			}
			
		  }, function errorCallback(response) {
		    console.log("ERROR while reading subscriber details.");
		  });

	}
	
	/* Connections */
	
	factory.refreshConnections = function() {
		
		if (factory.currentlyRefreshing[2])
			return;							// Hasn't returned from previous call yet

		factory.currentlyRefreshing[2] = true;
		
		var connectorName = this.selectedConnector;
		
//		if (this.selectedConnector === 'all')
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
				
//				console.log(factory.extractProperty("connectorName",property));
				factory.connections[property].ConnectorName=factory.extractProperty("connectorName",property);
					factory.filteredConnections.push(factory.connections[property]);
					factory.activeConnections[factory.connections[property].ClientId.replace(/:/g,'_')]=factory.connections[property];
			}
			factory.currentlyRefreshing[2] = false;
		  }, function errorCallback(response) {
			  toasty.error({msg:'Cannot read connections'});
			  if(!factory.loginok)			  			  
			  	factory.stopRefreshTimer();
			  factory.currentlyRefreshing[2] = false;
		  });
	}
	
	factory.computeConnectionDetails = function(ent)
	{
		factory.currentConnection=ent;

		if(ent==null)
			return;
		var postUrl=factory.getPostUrl();
		
		var data={
		    "type":"read",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+factory.brokername+",destinationType=*,destinationName=*,endpoint=Consumer,clientId="+ent.ClientId.replace(/:/g,'_')+",consumerId=*"
		};
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			factory.connectionDetailsObject=[];


			for ( property in response.data.value ) {
					factory.connectionDetailsObject.push(response.data.value[property]);

			}
			factory.detailsComputingUnderway=false;
		  }, function errorCallback(response) {
		    alert('ko');
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
	
	factory.sendMessage=function(destType,destName,text,properties,repeat)
	{
		var postUrl=factory.getAPIUrl()+"message/"+destName+"?type="+destType.toLowerCase()+properties;
				
		var data=text;
//		console.log(data);

		for(var j=0;j<repeat;j++)
		{
			$http.post(postUrl, data, {})
			.then(function successCallback(response) {
				if((response.data!=null)&&(response.data.error!=null))
				{
					toasty.error(response.data.error);
				}
				else
					toasty.success("Message sent.");	

			  }, function errorCallback(response) {
				  	console.log(response);
				  	toasty.error('Unable to send message.');
					console.log(response);
			  });
		  }
	}
	
	factory.getPostUrl = function() {
		return factory.postUrl;
	}
	
	factory.getAPIUrl = function() {
		return factory.apiUrl;
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
		factory.updates++;
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

		var urlprefix=""
		if(factory.getUrlParameter("urlprefix")!=null)
			urlprefix=factory.getUrlParameter("urlprefix");


		factory.infoUrl='http://REPLACEIP:REPLACEPORT/'+urlprefix+'api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME';
		factory.queuesUrl='http://REPLACEIP:REPLACEPORT/'+urlprefix+'api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,destinationType=Queue,destinationName=*';
		factory.topicsUrl='http://REPLACEIP:REPLACEPORT/'+urlprefix+'api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,destinationType=Topic,destinationName=*';
		factory.connectionsUrl='http://REPLACEIP:REPLACEPORT/'+urlprefix+'api/jolokia/read/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,connector=clientConnectors,connectorName=CONNECTORNAME,connectionViewType=clientId,connectionName=*';	
		factory.execUrl='http://REPLACEIP:REPLACEPORT/'+urlprefix+'api/jolokia/exec/org.apache.activemq:type=Broker,brokerName=REPLACEBROKERNAME,destinationType=QUEUETYPE,destinationName=QUEUENAME/QUEUEACTION';
		factory.postUrl='http://REPLACEIP:REPLACEPORT/'+urlprefix+'api/jolokia';		
		factory.apiUrl='http://REPLACEIP:REPLACEPORT/'+urlprefix+'api/';		
		
		var protocolrep="http://";
		//alert(location.href.indexOf("http://"))
		if(location.href.indexOf("https://")==0)
			protocolrep="https://"

		
		

		factory.infoUrl=factory.infoUrl.replace(/http:\/\//g,protocolrep).replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.queuesUrl=factory.queuesUrl.replace(/http:\/\//g,protocolrep).replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.topicsUrl=factory.topicsUrl.replace(/http:\/\//g,protocolrep).replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.connectionsUrl=factory.connectionsUrl.replace(/http:\/\//g,protocolrep).replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.execUrl=factory.execUrl.replace(/http:\/\//g,protocolrep).replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);
		factory.postUrl=factory.postUrl.replace(/http:\/\//g,protocolrep).replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);			
		factory.apiUrl=factory.apiUrl.replace(/http:\/\//g,protocolrep).replace(/REPLACEIP/g,factory.brokerip).replace(/REPLACEPORT/g,factory.brokerport).replace(/REPLACEBROKERNAME/g,factory.brokername);			

	}

	factory.MAXGRAPHVALUES=100;
	factory.resetAll();

	factory.subscribe= function(scope, callback) {
        var handler = $rootScope.$on('amq_info_updated', callback);
        scope.$on('$destroy', handler);
    },

    factory.notify= function() {
        $rootScope.$emit('amq_info_updated');
    }
	
	factory.checkSubscribers=function()
	{				
		factory.subscriberTesterList=[];
		factory.subscriberTesterVisible=true;
		for(var i=0;i<factory.topicSubscribers.length;i++)
		{			
			factory.getSubscriberDetails(factory.topicSubscribers[i],true);
		}
	}
	
	factory.closeCheckSubscribers=function()
	{
		factory.subscriberTesterVisible=false;
		
	}

	//factory.hideAdvisoryQueues = true;

	factory.login = "";
	factory.password = "";
	factory.brokername = "localhost";
	factory.brokerip = "127.0.0.1";
	factory.brokerport = 8161;
	factory.connected = false;
	factory.connecting = false;
	factory.rememberMe = false;
	factory.defaultinfotab=0;
	factory.host=location.host;
	factory.defaultrefreshrate=0;
	
	factory.queueMessages = [];
	factory.orderedQueueList=[];
	factory.queueStats = {}; // TODO: document internals
	factory.queueStatsFields = []; // [ 'QueueSize', 'EnqueueCount' ];//, 'ConsumerCount' ]; // TODO: user selectable from UI
	
	factory.connectionError="";
		
	// 0 - Info, 1 - Queues, 2 - Connections, 3 - Topics
	factory.currentlyRefreshing = [false, false, false, false];
	
	factory.refreshTimer = undefined;
    
	factory.loadConnectionParameters();
	if (factory.rememberMe)
		factory.prefs.load();
	
	factory.info={};
	factory.activeConnections={};
	factory.filteredInfo=[];
	factory.filteredQueues=[];
	factory.filteredTopics=[];		
	factory.filteredConnections=[];		
	factory.topicSubscribers=[];	
	
	factory.selectedConnector = '';
	
	
	
    return factory;
}]);
