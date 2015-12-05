app.controller('TabsCtrl',['$rootScope', '$scope', '$timeout', 'amqInfoFactory','amqClientFactory', 'toasty', function($rootScope, $scope, $timeout, amqInfoFactory,amqClientFactory, toasty) {
    $scope.tabs = [{
            title: 'Info',
            url: 'Templates/Info.html',
			hasFilter:true
        }
		, {
            title: 'Connectors',
            url: 'Templates/Connectors.html',
			hasFilter:false
        }
		, {
            title: 'Queues',
            url: 'Templates/Queues.html',
			hasFilter:true
        }, {
            title: 'Topics',
            url: 'Templates/Topics.html',
			hasFilter:true
    	}
		, {
            title: 'Subscribers',
            url: 'Templates/Subscribers.html',
			hasFilter:true
    	}
		, {
            title: 'Connections',
            url: 'Templates/Connections.html',
			hasFilter:true
    	}
		/*, {
            title: 'Send',
            url: 'Templates/Send.html',
			hasFilter:true
    	}*/
		, {
            title: 'Client',
            url: 'Templates/Client.html',
			hasFilter:true
    	}		
		, {
            title: 'Preferences',
            url: 'Templates/Preferences.html',
			hasFilter:true
    	}
	];

	$scope.filterField='';

	$scope.amqInfo = amqInfoFactory;
	$scope.amqClient = amqClientFactory;
    $scope.currentTab = $scope.tabs[0];
	
	$scope.autoRefreshChanged = false;

	$scope.refreshAll = function() {
		$scope.amqInfo.refreshAll();
	}
	
	$scope.disconnectAMQ = function() {
		$scope.amqClient.disconnect();
		$scope.amqInfo.connected = false;
		$scope.amqInfo.stopRefreshTimer();
		$scope.autologin=false;

		if($scope.amqInfo.login!='')
			toasty.info({msg:'Goodbye, user ' + $scope.amqInfo.login + '.'});
		else
			toasty.info({msg:'Goodbye.'});
	}	

    $scope.onClickTab = function (tab) {
		console.log('clicked tab:' + tab.title);
		
		if (tab.url === $scope.currentTab.url)
			return;
		
		console.log('switching tab');
		
        $scope.currentTab = tab;
		$timeout(function() {
			$rootScope.$broadcast("activetab", tab.title);
		});
    }
   
    $scope.isActiveTab = function(tabUrl) {
        return tabUrl == $scope.currentTab.url;
    }
 	$scope.hasFilter = function() {
        return $scope.currentTab.hasFilter;
    }
	
	$scope.savePrefs = function() {
		$scope.amqInfo.savePreferences();
	}
	
	$scope.updateAutoRefresh = function() {
		$scope.amqInfo.setRefresh();
		$scope.autoRefreshChanged = false;
		$scope.savePrefs();
	}
	
	$scope.autoRefreshTinkered = function() {
		$scope.autoRefreshChanged = true;
	}

}]
);
