app.controller('LoginCtrl', ['$scope', '$rootScope', 'amqInfoFactory','amqClientFactory', 'Base64', 'preferencesFact',
	function ($scope, $rootScope, amqInfoFactory,amqClientFactory, Base64, preferencesFact) {
		
	$scope.prefs = preferencesFact;
	$scope.amqInfo = amqInfoFactory;
	$scope.amqClient = amqClientFactory;

		
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

	$scope.logStompOnly = function()
	{
		$scope.amqInfo.resetAll();
		$scope.amqInfo.connected=true;
		$scope.amqInfo.stompOnly=true;
		$scope.amqClient.ip=$scope.amqInfo.brokerip;
		$rootScope.$broadcast("stomponly");
	}

	if($scope.amqInfo.autologin)
		$scope.logAMQ();
}]
);
