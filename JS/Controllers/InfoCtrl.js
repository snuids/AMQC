app.controller('InfoCtrl', ['$rootScope', '$scope', '$timeout', '$filter', 'amqInfoFactory', 'toasty',
	function ($rootScope, $scope, $timeout, $filter, amqInfoFactory, toasty) {
    
	/*amqInfoFactory.subscribe($scope, function somethingChanged() 
	{
		console.log("Something changed");
	});*/
	
	
	$scope.infoTabs = [{
            title: 'Info'
        }
		, {
            title: 'Statistics'
        }
		, {
            title: 'Connectors'
        }
	];

	$scope.filterField='';

	$scope.amqInfo = amqInfoFactory;
	
	
	
	$scope.currentTab = $scope.infoTabs[$scope.amqInfo.defaultinfotab];	
       
	
	
    $scope.isActiveTabInfo = function(tab) {
		
        return tab.title == $scope.currentTab.title;
    }
 	
	$scope.forceGraphRefresh=function() // used to force a graph refresh when the tab is clicked
	{
		window.dispatchEvent(new Event('resize'));
	}
	
    $scope.onClickTabInfo = function (tab) {
		console.log('clicked tab:' + tab.title);
				
		if (tab.title === $scope.currentTab)
			return;
		
		console.log('switching tab');
		
        $scope.currentTab = tab;
		$timeout(function() {$scope.forceGraphRefresh();}, 0);
		
    }

	$scope.yAxisTickFormatFunction = function(){
		return function(d)
		{
			return Math.round(d);
		}
	}
	
	$scope.xAxisTickFormatFunction = function(){
		return function(d)
		{
			return d3.time.format('%X')(new Date(d)); //uncomment for date format
		}
	}

	if($scope.amqInfo.defaultinfotab>0)
	{
		$timeout(function() {$scope.forceGraphRefresh();}, 2000);		
	}

}]
);
