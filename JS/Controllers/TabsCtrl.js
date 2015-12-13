app.controller('TabsCtrl',['$rootScope', '$scope', '$timeout', 'amqInfoFactory','amqClientFactory', 'toasty', 'preferencesFact', 'ProcessorFact',
	function($rootScope, $scope, $timeout, amqInfoFactory,amqClientFactory, toasty, preferencesFact, ProcessorFact) {
	
	$scope.prefs = preferencesFact;
	$scope.procs = ProcessorFact;
	 
	// Removed	"Options", "AlwaysRetroactive", "CacheEnabled", "DLQ", "Name", "MaxAuditDepth", "Paused",
	//			"MessageGroups", "CursorFull", "MemoryLimit", "MaxProducersToAudit", "BlockedProducerWarningInterval",
	//			"MessageGroupType", "UseCache", "SlowConsumerStrategy"
	// 			"MemoryUsageByteCount", "AverageBlockedTime", "MemoryPercentUsage", "CursorMemoryUsage",
	// 			"InFlightCount", "Subscriptions", "ForwardCount", "StoreMessageSize", "AverageEnqueueTime", "BlockedSends",
	// 			"TotalBlockedTime", "MaxPageSize", "PrioritizedMessages", "MemoryUsagePortion",
	// 			"EnqueueCount", "ConsumerCount", "AverageMessageSize", "ExpiredCount", "CursorPercentUsage",
	// 			"MinEnqueueTime", "MinMessageSize", "DispatchCount", "MaxEnqueueTime", "DequeueCount", 
	// 			"ProducerCount", "MaxMessageSize"

	
	
	
	$scope.availableQueueChartFields = [
		"QueueSize", "EnqueueCount", "DequeueCount"
	];
	
	$scope.availableQueueChartFields.sort();
	
	$scope.tabs = [{
            title: 'Info',
            url: 'Templates/Info.html',
			hasFilter:true,
			id:'info'
        }		
		, {
            title: 'Queues',
            url: 'Templates/Queues.html',
			hasFilter:true,
			id:'queues'
		}, {
            title: 'Topics',
            url: 'Templates/Topics.html',
			hasFilter:true,
			id:'topics'
    	}
		, {
            title: 'Subscribers',
            url: 'Templates/Subscribers.html',
			hasFilter:true,
			id:'subscribers'
    	}
		, {
            title: 'Connections',
            url: 'Templates/Connections.html',
			hasFilter:true,
			id:'connections'
    	}
		, {
            title: 'Send',
            url: 'Templates/Send.html',
			hasFilter:false,
			id:'send'
    	}
		, {
            title: 'Client',
            url: 'Templates/Client.html',
			hasFilter:false,
			id:'client'
    	}		
		, {
            title: 'Preferences',
            url: 'Templates/Preferences.html',
			hasFilter:false,
			id:'preferences'
    	}
	];

	$scope.filterField={};

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

	$scope.selectTab=function(tabid)
	{
		angular.forEach($scope.tabs, function(value, key) {
			if(value.id==tabid)
			{
				$scope.onClickTab(value);
			}				
			});
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
					$scope.prefs.queueChartFields[$scope.availableQueueChartFields[field]] = { procName:"None", isSelected:true };
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
	
	$scope.changedItem = function(key, value) {
		$scope.savePrefs();
		
	}
	
	$scope.$on('stomponly', function(event) {	
		console.log("Stomp Only mode triggered.");
		$scope.selectTab('client');
	}
	);
}]
);
