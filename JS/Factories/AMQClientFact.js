app.factory('amqClientFactory', function($rootScope,amqInfoFactory){			
    var factory = {}; 

	factory.port=61614;
	factory.topics="foo,bar";
	factory.queues="queue1";
	factory.login="";
	factory.password="";
	factory.messages=[];
	factory.messagesCount=0;
	
	factory.selectedSendDestination="Topic";	// Used by the queue/topic selector
	factory.sendMessageHeaders=[{"name":"Origin","value":"AMQClient"},{"name":"ID","value":9999}];
	factory.selectedSendDestination="Topic";
	factory.selectedSendDestinationName="foo";
	factory.textToSend="Enter your text message...";


	if ((localStorage.getItem("amqc.topics") !== undefined)
			&&(localStorage.getItem("amqc.topics") !== null))		
		factory.topics = localStorage.getItem("amqc.topics") ;

	if ((localStorage.getItem("amqc.queues") !== undefined)
			&&(localStorage.getItem("amqc.queues") !== null))		
		factory.queues = localStorage.getItem("amqc.queues") ;
	


	factory.subscribe= function(scope, callback) {
        var handler = $rootScope.$on('notifying-service-event', callback);
        scope.$on('$destroy', handler);
    },

    factory.notify= function() {
        $rootScope.$emit('notifying-service-event');
    }

	factory.callBackFunc=function(frame) 
	{		
		var cols=factory.topics.split(',');
		
		for(var j=0;j<cols.length;j++)
		{
			if(cols[j]!='')
			{		
				
		    	var sub = factory.client.subscribe("/topic/"+cols[j], function(message) 
				{										
					console.log(message);
					var mes={};
					mes.reception=new Date();
					mes.message=message.body;
					mes.destination=message.headers.destination;
					mes.headers=message.headers;
					factory.messages.unshift(mes);
					factory.messagesCount++;
					factory.notify('mes');
		    	});
			}
		}
		
		cols=factory.queues.split(',');
		for(var j=0;j<cols.length;j++)
		{
			if(cols[j]!='')
			{
		    	var sub = factory.client.subscribe("/queue/"+cols[j], function(message) 
				{										
					console.log(message);
					var mes={};
					mes.reception=new Date();
					mes.message=message.body;
					mes.destination=message.headers.destination;
					mes.headers=message.headers;
					factory.messages.unshift(mes);
					factory.messagesCount++;
					factory.notify('mes');				
		    	});
			}
		}

		factory.client.connected=true;
	  }

	factory.connect=function()
	{
		console.log("CONNECT");
		var url="ws://"+amqInfoFactory.brokerip+":61614";
		this.client = Stomp.client(url);
		this.messages=[];
		this.messagesCount=0;
		this.client.connect(this.login, this.password, this.callBackFunc);
		
		if((typeof(Storage) === undefined) || amqInfoFactory.rememberMe === false)
			return;
		
		localStorage.setItem('amqc.topics', factory.topics);
		localStorage.setItem('amqc.queues', factory.queues);
	}

	factory.disconnect=function()
	{
		console.log("DISCONNECT");
		if(this.client!=null)
			this.client.disconnect();
		this.client=null;
	}

	factory.sendMessage=function()
	{
		console.log("Send");
		var dest="";
		
		var obj={};
		for(var i=0;i<this.sendMessageHeaders.length;i++)
		{
			obj[this.sendMessageHeaders[i].name]=this.sendMessageHeaders[i].value;
		}
		
		if(this.selectedSendDestination=="Topic")
			dest="/topic/"+this.selectedSendDestinationName;
		else
			dest="/queue/"+this.selectedSendDestinationName;
			
//		alert(JSON.stringify(obj));

		this.client.send(dest,obj,this.textToSend);
		
	}
	
    return factory;
});