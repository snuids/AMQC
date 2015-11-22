app.controller('TopicsCtrl',['$scope','amqInfoFactory', function($scope,amqInfoFactory) 
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
	$scope.currentTopic=null;
	
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
				for ( var i=0 ; i<$scope.currentTopic.Subscriptions.length;i++ ) 
				{
					var obj={};

					obj.ClientID=$scope.amqInfo.extractProperty('clientId',$scope.currentTopic.Subscriptions[i].objectName);
					obj.ConsumerID=$scope.amqInfo.extractProperty('consumerId',$scope.currentTopic.Subscriptions[i].objectName);


					$scope.subscribers.push(obj);
				}
			}
	    }

	    $scope.isActiveTabDetails = function(tabUrl) {
	        return tabUrl == $scope.currentDetailsTab.url;
	}
	
	$scope.resetStatsTopic=function()
	{
		$scope.amqInfo.resetStatsTopic($scope.currentTopic.Name);
		$scope.amqInfo.refreshAll();
	}
	
	$scope.showDetails = function(ent)
	{
		$scope.currentTopic=ent;
	}
	
	$scope.filterFunction = function(element) {
		if($scope.amqInfo.hideAdvisoryQueues)
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
	
}]
);
