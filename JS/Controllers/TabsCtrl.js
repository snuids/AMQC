app.controller('TabsCtrl',['$scope','amqInfoFactory', function($scope,amqInfoFactory) 
{
    $scope.tabs = [{
            title: 'Info',
            url: 'Templates/Info.html',
			hasFilter:true
        }
		, {
            title: 'Connectors',
            url: 'Templates/Connectors.html',
			hasFilter:false
        }
		, {
            title: 'Queues',
            url: 'Templates/Queues.html',
			hasFilter:true
        }, {
            title: 'Topics',
            url: 'Templates/Topics.html',
			hasFilter:true
    	}
		, {
            title: 'Connections',
            url: 'Templates/Connections.html',
			hasFilter:true
    	}
		, {
            title: 'Client',
            url: 'Templates/Client.html',
			hasFilter:true
    	}
		, {
            title: 'Preferences',
            url: 'Templates/Preferences.html',
			hasFilter:true
    	}
	];

	$scope.filterField='';
	$scope.amqInfo=amqInfoFactory;
    $scope.currentTab = $scope.tabs[0];

	$scope.refreshAll =function()
	{
		amqInfoFactory.refreshAll();
	}

    $scope.onClickTab = function (tab) {
        $scope.currentTab = tab;
    }
   
    $scope.isActiveTab = function(tabUrl) {
        return tabUrl == $scope.currentTab.url;
    }
 	$scope.hasFilter = function() {
        return $scope.currentTab.hasFilter;
    }

}]
);
