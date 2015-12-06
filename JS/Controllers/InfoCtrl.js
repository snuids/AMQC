app.controller('InfoCtrl',['$rootScope', '$scope', '$timeout', 'amqInfoFactory','toasty'
	, function($rootScope, $scope, $timeout, amqInfoFactory, toasty) {
    
	$scope.infoTabs = [{
            title: 'Info'
        }
		, {
            title: 'Statistics'
        }
	];

	$scope.filterField='';

	$scope.amqInfo = amqInfoFactory;

    $scope.currentTab = $scope.infoTabs[0];
	
	
       
    $scope.isActiveTabInfo = function(tab) {
		
        return tab.title == $scope.currentTab.title;
    }
 	
    $scope.onClickTabInfo = function (tab) {
		console.log('clicked tab:' + tab.title);
		
		if (tab.title === $scope.currentTab)
			return;
		
		console.log('switching tab');
		
        $scope.currentTab = tab;
/*		$timeout(function() {
			$rootScope.$broadcast("activetab", tab.title);
		});*/
    }

/** CHART **/
	
	



}]
);
