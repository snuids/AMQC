app.controller('QueuesCtrl',['$rootScope', '$scope', '$interval', '$timeout', '$confirm','amqInfoFactory', 'toasty'
, function($rootScope, $scope, $interval, $timeout, $confirm,amqInfoFactory, toasty) 
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
	    };
		
	$scope.options = {
		chart: {
			type: 'lineChart',
			height: 300,
			margin : {
				top: 0,
				right: 40,
				bottom: 40,
				left: 40
			},
			x: function(d){ return d.x; },
			y: function(d){ return d.y; },
			isArea:false,
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
	
	
	$scope.options.chart.xAxis.tickFormat=function(d) {
//	        var dx = $scope.data[0].values[d] && $scope.data[0].values[d][0] || 0;
	        return d3.time.format('%X')(new Date(d));
	      };
	
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
	
	$scope.data = [];
	
	$scope.setupChartData = function() {
		
		$scope.data = [];

		var queueStat = $scope.amqInfo.queueStats[$scope.selectedChartQueue];
		
		var i=0;
		
		for (var key in queueStat) 
		{
			if(i==0)
				$scope.data.push({ color:'red',key: key, values: queueStat[key].values});
			else
				$scope.data.push({ color:'#008',key: key, values: queueStat[key].values});
			i++;
		}
		$timeout(function() { $scope.api.refresh(); }, 10);
	}
	
	$scope.refreshData = function() {
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

			$timeout(function() {
				if (Object.keys($scope.amqInfo.queueStats).length > 0) {
					$scope.selectedChartQueue = Object.keys($scope.amqInfo.queueStats)[0]; // Pick first queue when first entering the tab
					$scope.setupChartData();
				}			
			}, 10);		
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
	
	
	/* Queue broswer functions */
	$scope.browseQueue=function()
	{
		$scope.amqInfo.browseQueue($scope.currentQueue.Name);
		$scope.queueBrowerVisible=true;
	}
	
	$scope.closeBrowseQueue=function()
	{
		$scope.queueBrowerVisible=false;		
	}
		
	$scope.purgeQueue=function()
	{
		$scope.amqInfo.purgeQueue($scope.currentQueue.Name);
	}	
	
	$scope.deleteQueue=function()
	{
		
		$confirm({text: 'Are you sure you want to delete the queue '+ $scope.currentQueue.Name +' ?'})
		        .then(function() 
		{
			$scope.amqInfo.deleteQueue($scope.currentQueue.Name);
			$scope.showDetails(null);
		});

	}
	
	$scope.createNewQueue=function()
	{
		$scope.amqInfo.createNewQueue($scope.newQueueName);
	}
	
	$scope.resetStatsQueue=function()
	{
		$scope.amqInfo.resetStatsQueue($scope.currentQueue.Name);
	}
	
	$scope.showQueueDetails = function(ent)
	{
		$scope.currentQueue=ent;
		$scope.queueBrowerVisible=false;
		if(ent !== null)
		{
			$scope.detailsTabs[1].visible=(ent.ConsumerCount>0);
			$scope.currentDetailsTab = $scope.detailsTabs[0];
		}
	}
	

	/* Message Detail Functions */
	$scope.showQueueMessageDetails=function(message)
	{

		$scope.currentMessage=message;
		$scope.currentMessage.destination=$scope.currentQueue.Name;
		$scope.currentMessage.message=message.Text;
		$scope.currentMessage.headers={};
				
		var obj=$scope.currentMessage;
//		console.log("obj message=====");
//		console.log(obj);
		
		for ( property in obj ) {
			if(
				(!(obj[property] instanceof Array))
			&&(!(obj[property] instanceof Object))
			&&(property!='Text')
			&&(property!='message')
			&&(property!='name'))
			{
				$scope.currentMessage.headers[property]=obj[property];
			}
		}
		
		if(obj.StringProperties!=null)
		{
			for ( property in obj.StringProperties ) {
				{
					$scope.currentMessage.headers[property]=obj.StringProperties[property];
				}
			}
		}
		if(obj.LongProperties!=null)
		{
			for ( property in obj.LongProperties ) {
				{
					$scope.currentMessage.headers[property]=obj.LongProperties[property];
				}
			}
		}		
	}

	$scope.closeDetails=function()
	{
		$scope.currentMessage=null;
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

	$scope.deleteMessage = function() {
		var promise = $scope.amqInfo.deleteMessage('Queue', $scope.currentMessage.destination, $scope.currentMessage.JMSMessageID);
		
		promise.then(function(result) {
			toasty.success({msg:'Message ' + $scope.currentMessage.JMSMessageID + ' deleted from Queue ' + $scope.currentMessage.destination});
			$scope.currentMessage = null;
			$scope.browseQueue(); // Reload queue contents after delete
		}, function(result) {
			toasty.error({msg:'Unable to delete message ' + $scope.currentMessage.JMSMessageID + ' from Queue ' + $scope.currentMessage.destination});
		});
	}
}]
);
