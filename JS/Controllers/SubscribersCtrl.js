app.controller('SubscribersCtrl', ['$scope', '$confirm', 'amqInfoFactory',
	function ($scope, $confirm, amqInfoFactory) 
{
	$scope.head = {
	        DestinationName: "Topic",
	        ClientID: "Client ID",
	        ConsumerID: "Consumer ID",
	        Selector: "Selector",
			Durable: "Durable",
	        Connected: "Connected",
			EnqueueCount: "Enqueue",
	        DequeueCount: "Dequeue",
	        DispatchCount: "Dispatch",
			Actions: "Action"
		
	    };
	
	$scope.amqInfo=amqInfoFactory;
	$scope.currentSubscriber=null;
	$scope.durableOnly=true;
	$scope.notConnectedOnly=false;
	
	$scope.newDurableClientID='';
	$scope.newDurableSubscriber='';
	$scope.newDurableTopic='';
	$scope.newDurableSelector='';
	
	$scope.sort = {
	        column: 'DestinationName',
	        descending: false
	    };
	

	
	
	
	$scope.filterFunction = function(element) {
		if($scope.durableOnly)
			if(!element.Durable)
				return false;

		if($scope.notConnectedOnly)
			if(element.Connected)
				return false;

		
		if($scope.amqInfo.hideAdvisoryQueues)
			return element.DestinationName.match(/Advisory/) ? false : true;
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
	
	$scope.deleteDurable = function(sub) {
			$confirm({text: 'Are you sure you want to delete the durable subscriber '+ sub.ConsumerID +' ?'})
			        .then(function() 
			{
				$scope.amqInfo.deleteDurableSubscriber(sub);
			});

		};
	
		$scope.checkSubscribers=function()
		{
			$confirm({text: 'Checking susbscribers will trigger '+$scope.amqInfo.topicSubscribers.length
			+' REST calls and could take a few seconds. Do you want to continue ?'})
			.then(function() 
			{
				$scope.amqInfo.checkSubscribers();
			});
		}
		
		$scope.closeCheckSubscribers=function()
		{
			
				$scope.amqInfo.closeCheckSubscribers();
			
		}
		
	
	$scope.createNewDurableSubscriber=function()
	{
		$confirm({text: 'Are you sure you want to create the durable subscriber '+ $scope.newDurableSubscriber
		+" with ID "+ $scope.newDurableClientID+' on topic '+$scope.newDurableTopic+' ?'})
		        .then(function() 
		{
				$scope.amqInfo.createDurableSubscriber($scope.newDurableSubscriber,$scope.newDurableClientID,$scope.newDurableTopic,$scope.newDurableSelector);
		});
	}
	
	$scope.showDestination=function(ent)
	{
		if(ent.DestinationQueue)
		{
			angular.forEach($scope.amqInfo.filteredQueues, function(value, key) {
				if(ent.DestinationName==value.Name)
				{
					$scope.selectTab('queues');
					$scope.amqInfo.currentQueue=value;
				}
			});
		}
		else
		{
			angular.forEach($scope.amqInfo.filteredTopics, function(value, key) {
				if(ent.DestinationName==value.Name)
				{
					$scope.selectTab('topics');
					$scope.amqInfo.currentTopic=value;
				}
			});
		}
	}
}]
);
