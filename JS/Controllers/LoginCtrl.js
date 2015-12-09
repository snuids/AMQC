app.controller('LoginCtrl', ['$scope', '$rootScope', 'amqInfoFactory', 'Base64', 'preferencesFact',
	function ($scope, $rootScope, amqInfoFactory, Base64, preferencesFact) {
		
	$scope.prefs = preferencesFact;
	$scope.amqInfo = amqInfoFactory;
		
 	$scope.logAMQ = function() {		
		
		$scope.amqInfo.connectionError="";

		if(($scope.amqInfo.login+$scope.amqInfo.password).length>0)
			$rootScope.auth_login=Base64.encode($scope.amqInfo.login+":"+$scope.amqInfo.password);
		else
			$rootScope.auth_login='';
		$scope.amqInfo.resetAll();
		$scope.amqInfo.saveConnectionParameters();
		$scope.amqInfo.prepareURLs();
		$scope.amqInfo.refreshAll();
		if ($scope.amqInfo.rememberMe)
			$scope.prefs.load();
		$scope.amqInfo.setRefresh();
    }

	if($scope.amqInfo.autologin)
		$scope.logAMQ();
}]
);
