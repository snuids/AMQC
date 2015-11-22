app.controller('SubscribersCtrl',['$scope','amqInfoFactory', function($scope,amqInfoFactory) 
{
	$scope.head = {
	        Name: "Name",
	        ClientID: "ClientID",
	        ConsumerID: "ConsumerID",
	        Durable: "Durable",
	        Connected: "Connected",
			Actions: "Action"
		
	    };
	
	$scope.amqInfo=amqInfoFactory;
	$scope.currentSubscriber=null;
	
	$scope.sort = {
	        column: 'Name',
	        descending: false
	    };
	

	
	
	
	$scope.filterFunction = function(element) {
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
	
}]
);
