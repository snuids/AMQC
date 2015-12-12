app.controller('TopicsCtrl', ['$scope', '$confirm', 'amqInfoFactory',
	function ($scope, $confirm, amqInfoFactory) 
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
//	$scope.amqInfo.currentTopic=null;
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
}]
);
