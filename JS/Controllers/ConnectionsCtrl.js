app.controller('ConnectionsCtrl', ['$scope', '$http', 'amqInfoFactory',
	function ($scope, $http, amqInfoFactory) 
{
	$scope.head = {
	        ClientId: "Client Id",
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
	
	$scope.currentConnection=null;
	$scope.amqInfo=amqInfoFactory;
	$scope.detailsObject=null;
	
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
		$scope.currentConnection=ent;

		if(ent==null)
			return;
		var postUrl=amqInfoFactory.getPostUrl();
		
		var data={
		    "type":"read",
		    "mbean":"org.apache.activemq:type=Broker,brokerName="+$scope.amqInfo.brokername+",destinationType=*,destinationName=*,endpoint=Consumer,clientId="+ent.ClientId.replace(/:/g,'_')+",consumerId=*"
		};
		//alert(data.mbean);
		//alert(JSON.stringify(data));
		
		$http.post(postUrl, data, {})
		.then(function successCallback(response) {
			console.log("RES:");
			console.log(response);
			$scope.detailsObject=[];

			for ( property in response.data.value ) {
					$scope.detailsObject.push(response.data.value[property]);

			}
			console.log("RES2:");
			console.log($scope.detailsObject);

			
		  }, function errorCallback(response) {
		    alert('ko');
		  });

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
	$scope.updateSelectedConnector=function()
	{
		amqInfoFactory.refreshConnections();
	}
	$scope.showDestination=function(ent)
	{
		if(ent.DestinationQueue)
		{
			angular.forEach($scope.amqInfo.filteredQueues, function(value, key) {
				if(ent.DestinationName==value.Name)
				{
					$scope.selectTab('Queues');
					$scope.amqInfo.currentQueue=value;
				}
			});
		}
		else
		{
			angular.forEach($scope.amqInfo.filteredTopics, function(value, key) {
				if(ent.DestinationName==value.Name)
				{
					$scope.selectTab('Topics');
					$scope.amqInfo.currentTopic=value;
				}
			});
		}
	}
	
}]
);
