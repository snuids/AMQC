app.controller('TopicsCtrl', ['$rootScope','$scope','$timeout', '$confirm', 'amqInfoFactory',
	function ($rootScope,$scope, $timeout,$confirm, amqInfoFactory) 
{
	$scope.head = {
	        Name: "Name",
	        ConsumerCount: "Consumers",
	        BlockedSends: "Blocked",
	        EnqueueCount: "Enqueue",
	        DequeueCount: "Dequeue",
	        DispatchCount: "Dispatch",
		    ExpiredCount: "Expired",
			Actions: "Action"
		
	    };
	
	$scope.amqInfo=amqInfoFactory;
	$scope.topicStatsVisible=false;
	$scope.newTopicName='';
	
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
				for ( var i=0 ; i<$scope.amqInfo.currentTopic.Subscriptions.length;i++ ) 
				{
					var obj={};

					obj.ClientID=$scope.amqInfo.extractProperty('clientId',$scope.amqInfo.currentTopic.Subscriptions[i].objectName);
					obj.ConsumerID=$scope.amqInfo.extractProperty('consumerId',$scope.amqInfo.currentTopic.Subscriptions[i].objectName);


					$scope.subscribers.push(obj);
				}
			}
	    }

	    $scope.isActiveTabDetails = function(tabUrl) {
	        return tabUrl == $scope.currentDetailsTab.url;
	}
	
	$scope.resetStatsTopic=function()
	{
		$scope.amqInfo.resetStatsTopic($scope.amqInfo.currentTopic.Name);
		$scope.amqInfo.refreshAll();
	}
	
	$scope.showDetails = function(ent)
	{
		$scope.amqInfo.currentTopic=ent;
		$scope.currentDetailsTab = $scope.detailsTabs[0];
	}
	
	$scope.filterFunction = function(element) {
		if($scope.amqInfo.prefs.hideAdvisoryQueues)
			return element.Name.match(/Advisory/) ? false : true;
		return true;
	};
	
	$scope.selectedCls = function(column) {
	        return column == $scope.sort.column && 'sort-' + $scope.sort.descending;
	    };

	$scope.changeSorting = function(column) {
	       var sort = $scope.sort;
        if (sort.column == column) {
            sort.descending = !sort.descending;
        } else {
            sort.column = column;
            sort.descending = false;
        }
	
    };

	$scope.createNewTopic=function(){
			$scope.amqInfo.createNewTopic($scope.newTopicName);
	}
	
	$scope.deleteTopic=function()
	{
		
		$confirm({text: 'Are you sure you want to delete the topic '+ $scope.amqInfo.currentTopic.Name +' ?'})
		        .then(function() 
		{
			$scope.amqInfo.deleteTopic($scope.amqInfo.currentTopic.Name);
			$scope.showDetails(null);
		});
/*		if(confirm("Are you sure you want to delete this topic " + $scope.currentTopic.Name))
		{
			$scope.amqInfo.deleteTopic($scope.currentTopic.Name);
			$scope.showDetails(null);
		}*/
	}
	
	$scope.showTopicStats=function()
	{	
		$timeout(function() {
			$rootScope.$broadcast("show_queue_stats","topic");
		});	
		
		$scope.topicStatsVisible=true;		
	}
	
	$scope.hideQueueStats=function()
	{
		$scope.topicStatsVisible=false;
	}
	
	$scope.showConnection=function(con)
	{
		angular.forEach($scope.amqInfo.filteredConnections, function(value, key) {
			console.log(value);
			if(con.ClientID==value.ClientId.replace(/:/g,'_'))
			{
				$scope.amqInfo.currentConnection=value;
				$scope.amqInfo.computeConnectionDetails($scope.amqInfo.currentConnection);
				$scope.selectTab('connections');
			}
		});
	}
}]
);
