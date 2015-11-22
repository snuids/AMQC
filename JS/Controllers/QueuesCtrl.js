app.controller('QueuesCtrl',['$scope','amqInfoFactory', function($scope,amqInfoFactory) 
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
	$scope.queues=amqInfoFactory.filteredQueues;
	$scope.currentQueue=null;
	$scope.newQueueName='';
	
	$scope.subscribers=[];
	
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
	
	$scope.deleteQueue=function()
	{
		if(confirm("Are you sure you want to delete the queue "+$scope.currentQueue.Name))
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
		if(ent!=null)
		{
			$scope.detailsTabs[1].visible=(ent.ConsumerCount>0);
			$scope.currentDetailsTab = $scope.detailsTabs[0];
		}
	}
	
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
