app.controller('ConnectionsCtrl', ['$scope', '$http', 'amqInfoFactory',
	function ($scope, $http, amqInfoFactory) 
{
	
	$scope.head = {
	        ClientId: "Client Id",
	        ConnectorName: "Connector",
	        Producers: "Producers",
	        Consumers: "Consumers",
			DispatchQueue: "Dispatch Queue",
	        RemoteAddress: "Remote Address",
	        Slow: "Slow",
			Blocked: "Blocked",
			Details:""
	    };
	
	$scope.headDetails = {
		        DestinationName: "Name",
		        EnqueueCounter: "Enqueue",
		        DequeueCounter: "Dequeue",
		        DispatchedCounter: "Dispatched",
		        DiscardedCount: "Discarded",
				Durable:"Durable",
				DestinationQueue:"Queue"
		    };
	
			
	$scope.sort = {
	        column: 'ClientId',
	        descending: false
	    };
	
	$scope.sortDetails = {
		        column: 'Name',
		        descending: false
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
	
	$scope.selectedDetailsCls = function(columnDetails) {
	        return columnDetails == $scope.sortDetails.column && 'sort-' + $scope.sortDetails.descending;
	    };

	$scope.changeDetailsSorting = function(columnDetails) {
	        var sort = $scope.sortDetails;
	        if (sort.column == columnDetails) {
	            sort.descending = !sort.descending;
	        } else {
	            sort.column = columnDetails;
	            sort.descending = false;
	        }

	    };
	
	$scope.showDetails = function(ent)
	{
		$scope.amqInfo.computeConnectionDetails(ent);
		
	}

	$scope.getDestinationName = function(ent)
	{
		var re = /destinationName=([^,]*)/; 
		var match=re.exec(ent.objectName);
		return match[1];		
	}
	$scope.getDestinationType = function(ent)
	{
		var re = /destinationType=([^,]*)/; 
		var match=re.exec(ent.objectName);
		return match[1];		
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

	$scope.amqInfo=amqInfoFactory;
	
}]
);
