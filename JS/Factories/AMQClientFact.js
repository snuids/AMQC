app.factory('amqClientFactory', function($rootScope,amqInfoFactory){			
    var factory = {}; 

	factory.port=61614;
	factory.topics="BSM,BPM";
	factory.queues="foo";
	factory.login="";
	factory.password="";
	factory.messages=[];

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
			
	    	var sub = factory.client.subscribe("/topic/"+cols[j], function(message) 
			{										
				console.log(message);
				var mes={};
				mes.reception=new Date();
				mes.message=message.body;
				mes.destination=message.headers.destination;
				mes.headers=message.headers;
				factory.messages.unshift(mes);
				factory.notify('mes');
	    	});
		}
		
		cols=factory.queues.split(',');
		for(var j=0;j<cols.length;j++)
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
				factory.notify('mes');				
	    	});
		}

		factory.client.connected=true;
	  }

	factory.connect=function()
	{
		console.log("CONNECT");
		var url="ws://"+amqInfoFactory.brokerip+":61614";
		this.client = Stomp.client(url);
		this.messages=[];
		this.client.connect(this.login, this.password, this.callBackFunc);
		
	}

	factory.disconnect=function()
	{
		console.log("DISCONNECT");
		this.client.disconnect();
		this.client=null;
		this.messages=[];
	}

	
    return factory;
});