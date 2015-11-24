app.controller('LoginCtrl',['$scope','amqInfoFactory', function($scope, amqInfoFactory) 
{
	$scope.amqInfo=amqInfoFactory;
		
 	$scope.logAMQ = function() {
		amqInfoFactory.prepareURLs();
		amqInfoFactory.refreshAll();
    }
}]
);
