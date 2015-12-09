app.factory('sendMessageFactory', [function($rootScope)
{			
    var factory = {}; 

	
	factory.selectedSendDestination='Topic';
	factory.textToSend='Enter your text message...';
	factory.selectedSendDestinationName="foo";	
	factory.sendMessageHeaders=[{"name":"Origin","value":"AMQClient"},{"name":"ID","value":9999}];
	factory.repeatMessages=1;
	
	factory.destinations = [{
        name: "Topic"
    }, {
        name: "Queue"
    }];
	
	return factory;
}]);
