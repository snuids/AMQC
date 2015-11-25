app.controller('QueuesCtrl',['$rootScope', '$scope', '$interval', 'amqInfoFactory', function($rootScope, $scope, $interval, amqInfoFactory) 
{
	$scope.head = {
			Name: "Name",
			QueueSize: "Queue Size",
	        ConsumerCount: "Consumers",
	        BlockedSends: "Blocked",
	        EnqueueCount: "Enqueued",
	        DequeueCount: "Dequeued",
	        DispatchCount: "Dispatched",
		    ExpiredCount: "Expired",
//			Actions: "Action"
	    };
		
	$scope.options = {
		chart: {
			type: 'lineChart',
			height: 450,
			margin : {
				top: 20,
				right: 20,
				bottom: 60,
				left: 55
			},
			x: function(d){ return d.x; },
			y: function(d){ return d.y; },
			useInteractiveGuideline: true,
			refreshDataOnly: false,
			//deepWatchData: true,
			//showys: true,
			yFormat: function(d){
				return d3.format(',.0f')(d);
			},
			transitionDuration: 500,
			xAxis: {
				axisx: 'X Axis'
			},
			yAxis: {
				axisx: 'Y Axis',
				axisxDistance: -10
			}
		}
	};
	
	$scope.data = [
		{
			key: "Queue Size",
			values: [{x:0, y:0}]
		}
	];
	
	$scope.timer = undefined;
	
	$scope.stopTimer = function() {
		if (angular.isDefined($scope.timer)) {
			console.log('Removing QueuesCtrl time refresh.');
			$interval.cancel($scope.timer);
			$scope.timer = undefined;
		}		
	}
	
	$scope.setTimer = function() {
		$scope.stopTimer();
		
		console.log('new QueuesCtrl autoRefreshInterval:' + $scope.amqInfo.autoRefreshInterval * 1000);
		
		if ($scope.amqInfo.autoRefreshInterval > 0)
			$scope.refreshTimer = $interval(function() { $scope.refreshData(); }, $scope.amqInfo.autoRefreshInterval * 1000);
	}
	
	$scope.refreshData = function() {
		console.log('refreshing chart data');
		
		$scope.data[0].values = $scope.amqInfo.queueStats[$scope.selectedChartQueue];
		//$scope.data[0].values.push({x:$scope.x++, y:Math.floor((Math.random() * 10) + 1)});
		$scope.api.update();
	}
	
	$scope.$on('$destroy', function(e) {
		console.log("Destroying QueuesCtrl");
		$scope.stopTimer();
	});
	
	$scope.$on('activetab', function(event, tabName) {
		if (tabName == 'Queues') {
			console.log('Queues tab is now active');
			
			$scope.setTimer();

			if (Object.keys($scope.amqInfo.queueStats).length > 0) {
				console.log('getting new chart data');
				$scope.selectedChartQueue = Object.keys($scope.amqInfo.queueStats)[0];
				
				$scope.data[0].values = $scope.amqInfo.queueStats[$scope.selectedChartQueue];

				$scope.api.update();
			}				
		}		
	});
	
	$scope.amqInfo = amqInfoFactory;
	$scope.queues = $scope.amqInfo.filteredQueues;
	$scope.currentQueue=null;
	$scope.newQueueName='';
	
	$scope.subscribers=[];
	$scope.queueBrowerVisible=false;
	
	$scope.sort = {
		column: 'Name',
		descending: false
	};
	
	$scope.detailsTabs = [{
	            title: 'Info',
	            url: 'Templates/Info.html',
				visible:true
	        }
			, {
	            title: 'Subscribers',
	            url: 'Templates/Connectors.html',
				visible:true
	        }];
	
	$scope.currentDetailsTab = $scope.detailsTabs[0];

	$scope.onClickTabDetails = function (tab) {
        $scope.currentDetailsTab = tab;
		if($scope.currentDetailsTab.title=='Subscribers')
		{
			$scope.subscribers=[];
			for ( var i=0 ; i<$scope.currentQueue.Subscriptions.length;i++ ) 
			{
				var obj={};
//				console.log($scope.currentQueue.Subscriptions[i]);
				//alert($scope.amqInfo.extractProperty('clientId',$scope.currentQueue.Subscriptions[i].objectName));
				
				obj.ClientID=$scope.amqInfo.extractProperty('clientId',$scope.currentQueue.Subscriptions[i].objectName);
				obj.ConsumerID=$scope.amqInfo.extractProperty('consumerId',$scope.currentQueue.Subscriptions[i].objectName);


				$scope.subscribers.push(obj);
			}
		}
    }
   
    $scope.isActiveTabDetails = function(tabUrl) {
        return tabUrl == $scope.currentDetailsTab.url;
    }
	
	$scope.purgeQueue=function()
	{
		$scope.amqInfo.purgeQueue($scope.currentQueue.Name);
	}
	
	$scope.browseQueue=function()
	{
		$scope.amqInfo.browseQueue($scope.currentQueue.Name);
		//$scope.showDetails(null);
		$scope.queueBrowerVisible=true;
	}
	
	$scope.deleteQueue=function()
	{
		if(confirm("Are you sure you want to delete the queue " + $scope.currentQueue.Name))
		{
			$scope.amqInfo.deleteQueue($scope.currentQueue.Name);
			$scope.showDetails(null);
		}
	}
	
	$scope.createNewQueue=function()
	{
		$scope.amqInfo.createNewQueue($scope.newQueueName);
	}
	
	$scope.resetStatsQueue=function()
	{
		$scope.amqInfo.resetStatsQueue($scope.currentQueue.Name);
	}
	
	$scope.showDetails = function(ent)
	{
		$scope.currentQueue=ent;
		//alert($scope.currentQueue.Name);
		if(ent !== null)
		{
			$scope.detailsTabs[1].visible=(ent.ConsumerCount>0);
			$scope.currentDetailsTab = $scope.detailsTabs[0];
		}
	}
	
	$scope.showQueueDetails = function(ent)
	{
		$scope.queueBrowerVisible=false;
	}
	
	$scope.selectedCls = function(column) {
		return column == $scope.sort.column ? 'sort-' + $scope.sort.descending : '';
	};	

	$scope.changeSorting = function(column) {
		var sort = $scope.sort;
		if (sort.column == column) {
			sort.descending = !sort.descending;
		} else {
			sort.column = column;
			sort.descending = true;
		}	
	};
	
}]
);
