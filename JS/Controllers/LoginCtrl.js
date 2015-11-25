app.controller('LoginCtrl',['$scope','amqInfoFactory', function($scope, amqInfoFactory) 
{
	$scope.amqInfo = amqInfoFactory;
		
 	$scope.logAMQ = function() {
		$scope.amqInfo.saveConnectionParameters();
		$scope.amqInfo.prepareURLs();
		$scope.amqInfo.refreshAll();
		$scope.amqInfo.setRefresh();
    }
}]
);
