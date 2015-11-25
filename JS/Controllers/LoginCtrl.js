app.controller('LoginCtrl',['$scope','$rootScope','amqInfoFactory', function($scope,$rootScope, amqInfoFactory) 
{
	$scope.amqInfo = amqInfoFactory;
		
 	$scope.logAMQ = function() {
		
//		alert($scope.amqInfo.login);
		$rootScope.auth_login=$scope.amqInfo.login;
		$scope.amqInfo.saveConnectionParameters();
		$scope.amqInfo.prepareURLs();
		$scope.amqInfo.refreshAll();
		$scope.amqInfo.loadPreferences();
		$scope.amqInfo.setRefresh();

    }
}]
);
