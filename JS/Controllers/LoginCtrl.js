app.controller('LoginCtrl',['$scope','amqInfoFactory', function($scope, amqInfoFactory) 
{
	$scope.amqInfo=amqInfoFactory;
		
 	$scope.logAMQ = function() {
		amqInfoFactory.saveConnectionParameters();
		amqInfoFactory.prepareURLs();
		amqInfoFactory.refreshAll();
    }
}]
);
