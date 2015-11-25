app.controller('ClientCtrl',['$scope','amqInfoFactory','amqClientFactory', function($scope,amqInfoFactory,amqClientFactory) 
{	
	amqClientFactory.subscribe($scope, function somethingChanged() 
	{
		$scope.$apply();
	});
	$scope.amqClient=amqClientFactory;
	
	$scope.destinations = [{
	        name: "Topic"
	    }, {
	        name: "Queue"
	    }];
	
	$scope.sendMessageVisible=false;
	$scope.headerName="MyHeader";
	$scope.headerValue="MyHeaderValue";
	$scope.headerIntValue=1;
	$scope.repeatMessages=1;
	
	
	$scope.connect=function()
	{
		$scope.amqClient.connect();
	}
	
	$scope.disconnect=function()
	{
		$scope.amqClient.disconnect();
	}
	
	$scope.clearTable=function()
	{
		$scope.amqClient.messages=[];
	}
	
	$scope.showDetails=function(message)
	{
		$scope.currentMessage=message;
		$scope.closeSendMessage();
	}
	
	$scope.closeDetails=function()
	{
		$scope.currentMessage=null;
	}
	
	$scope.sendMessage=function()
	{
		for(var i=0;i<$scope.repeatMessages;i++)
			$scope.amqClient.sendMessage();
	}

	$scope.showSendMessage=function()
	{
		$scope.showDetails(null);
		$scope.sendMessageVisible=true;
	}
	
	$scope.closeSendMessage=function()
	{
		$scope.sendMessageVisible=false;
	}
	
	$scope.addHeader=function()
	{
		var obj={"name":$scope.headerName,"value":$scope.headerValue};
		$scope.amqClient.sendMessageHeaders.push(obj);
	}
				
	$scope.addIntHeader=function()
	{
		var obj={"name":$scope.headerName,"value":parseInt($scope.headerIntValue)};
		$scope.amqClient.sendMessageHeaders.push(obj);
	}
	
	$scope.removeHeader=function(index)
	{
		$scope.amqClient.sendMessageHeaders.splice(index,1);
	}
		
}]
);
