app.controller('LoginCtrl',['$scope','$rootScope','amqInfoFactory','Base64', function($scope,$rootScope, amqInfoFactory,Base64) 
{
	$scope.amqInfo = amqInfoFactory;
		
 	$scope.logAMQ = function() {
		
//		alert($scope.amqInfo.login);
		$rootScope.auth_login=Base64.encode($scope.amqInfo.login+":"+$scope.amqInfo.password);
//		alert($rootScope.auth_login);
		$scope.amqInfo.saveConnectionParameters();
		$scope.amqInfo.prepareURLs();
		$scope.amqInfo.refreshAll();
		$scope.amqInfo.loadPreferences();
		$scope.amqInfo.setRefresh();
		

    }
}]
);
