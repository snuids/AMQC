app.controller('LoginCtrl',['$scope','amqInfoFactory', function($scope, amqInfoFactory) 
{
	$scope.amqInfo = amqInfoFactory;
		
 	$scope.logAMQ = function() {
		$scope.amqInfo.saveConnectionParameters();
		console.log('rememberme after login:' + JSON.stringify($scope.amqInfo.rememberMe));
		$scope.amqInfo.prepareURLs();
		$scope.amqInfo.refreshAll();
    }
}]
);
