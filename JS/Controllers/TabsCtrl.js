app.controller('TabsCtrl',['$rootScope', '$scope', '$timeout', 'amqInfoFactory','amqClientFactory', 'toasty', 'preferencesFact',
	function($rootScope, $scope, $timeout, amqInfoFactory,amqClientFactory, toasty, preferencesFact) {
	
	$scope.prefs = preferencesFact;
	 
	// Removed	"Options", "AlwaysRetroactive", "CacheEnabled", "DLQ", "Name", "MaxAuditDepth", "Paused",
	//			"MessageGroups", "CursorFull", "MemoryLimit", "MaxProducersToAudit", "BlockedProducerWarningInterval",
	//			"MessageGroupType", "UseCache", "SlowConsumerStrategy"
	$scope.availableQueueChartFields = [
		"MemoryUsageByteCount", "AverageBlockedTime", "MemoryPercentUsage", "CursorMemoryUsage",
		"InFlightCount", "Subscriptions", "ForwardCount", "StoreMessageSize", "AverageEnqueueTime", "BlockedSends",
		"TotalBlockedTime", "QueueSize", "MaxPageSize", "PrioritizedMessages", "MemoryUsagePortion",
		"EnqueueCount", "ConsumerCount", "AverageMessageSize", "ExpiredCount", "CursorPercentUsage",
		"MinEnqueueTime", "MinMessageSize", "DispatchCount", "MaxEnqueueTime", "DequeueCount", 
		"ProducerCount", "MaxMessageSize"
	];
	
	$scope.availableQueueChartFields.sort();
	
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
		, {
            title: 'Send',
            url: 'Templates/Send.html',
			hasFilter:true
    	}
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
	
	$scope.fieldsChanged = false;
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
		
		if (tab.title == "Preferences") {
			//console.log('doing pref things');
			var changedPrefs = false;
				
			for (var field in $scope.availableQueueChartFields) {
				//console.log(JSON.stringify($scope.prefs));
				if ($scope.prefs.queueChartFields[$scope.availableQueueChartFields[field]] === undefined) {
					$scope.prefs.queueChartFields[$scope.availableQueueChartFields[field]] = false;
					changedPrefs = true;
				}
			}
			
			if (changedPrefs)
				$scope.prefs.save();			
		}
    }
   
    $scope.isActiveTab = function(tabUrl) {
        return tabUrl == $scope.currentTab.url;
    }
 	$scope.hasFilter = function() {
        return $scope.currentTab.hasFilter;
    }
	
	// TODO: make only one save button whenever one of all the preferences changes
	$scope.savePrefs = function() {
		$scope.fieldsChanged = false;
		$scope.autoRefreshChanged = false;
		$scope.prefs.save();
	}
	
	$scope.updateAutoRefresh = function() {
		$scope.amqInfo.setRefresh();		
		$scope.savePrefs();
	}
	
	$scope.autoRefreshTinkered = function() {
		$scope.autoRefreshChanged = true;
	}

	function chunk(arr, size) {
		var newArr = [];
		for (var i=0; i<arr.length; i+=size) {
			newArr.push(arr.slice(i, i+size));
		}
		return newArr;
	}
	
	$scope.chunkedData = chunk($scope.availableQueueChartFields, 6);
	
	$scope.changedItem = function(item) {
		$scope.fieldsChanged = true;
		//console.log('show chart field ' + item + ' -> ' + $scope.prefs.	queueChartFields[item]);
	}
}]
);
