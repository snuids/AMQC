app.controller('ClientCtrl',['$scope','amqInfoFactory','amqClientFactory', function($scope,amqInfoFactory,amqClientFactory) 
{
	amqClientFactory.subscribe($scope, function somethingChanged() 
	{
	        $scope.$apply();
	});
	$scope.amqClient=amqClientFactory;
			
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
	}
	
	$scope.closeDetails=function()
	{
		$scope.currentMessage=null;
	}

}]
);
