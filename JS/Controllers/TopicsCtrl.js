app.controller('TopicsCtrl', ['$rootScope','$scope','$timeout', '$confirm', 'amqInfoFactory', '$q', 'toasty',
	function ($rootScope,$scope, $timeout,$confirm, amqInfoFactory, $q, toasty)
{
	$scope.head = {
	        Name: "Name",
	        ConsumerCount: "Consumers",
	        BlockedSends: "Unrouted",
	        EnqueueCount: "Enqueue",
	        DequeueCount: "Dequeue",
	        DispatchCount: "Dispatch",
		    ExpiredCount: "Expired",
			Actions: "Action"
		
	    };
	
	$scope.amqInfo=amqInfoFactory;
	$scope.topicStatsVisible=false;
	$scope.newTopicName='';
	$scope.deletingUnusedTopics=false;
	
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
			return $scope.amqInfo.deleteTopic($scope.amqInfo.currentTopic.Name).then(function() {
				$scope.showDetails(null);
			}, function() {
				// The factory reports the deletion error.
			});
		});
/*		if(confirm("Are you sure you want to delete this topic " + $scope.currentTopic.Name))
		{
			$scope.amqInfo.deleteTopic($scope.currentTopic.Name);
			$scope.showDetails(null);
		}*/
	}

	$scope.deleteUnusedTopics=function()
	{
		if($scope.deletingUnusedTopics)
			return;
		$scope.deletingUnusedTopics=true;
		return $scope.amqInfo.getUnusedTopics().then(function(topics) {
			if(topics.length===0)
			{
				toasty.info({msg:'No topics without consumers are eligible for deletion.'});
				return;
			}
			var names=topics.map(function(topic) { return topic.Name; });
			return $confirm({text:'Delete '+names.length+' topics without consumers? Advisory topics and durable subscriptions are excluded. This includes topics outside the current table filter: '+names.join(', ')})
				.then(function() {
					return $scope.amqInfo.getUnusedTopics().then(function(currentTopics) {
						var eligible=currentTopics.map(function(topic) { return topic.Name; });
						var deleted=0;
						var failed=0;
						var skipped=0;
						var chain=$q.when();
						names.forEach(function(name) {
							chain=chain.then(function() {
								if(eligible.indexOf(name)===-1)
								{
									skipped++;
									return;
								}
								return $scope.amqInfo.deleteTopic(name, null, true).then(function() {
									deleted++;
									if($scope.amqInfo.currentTopic && $scope.amqInfo.currentTopic.Name===name)
										$scope.showDetails(null);
								}, function() { failed++; });
							});
						});
						return chain.then(function() {
							$scope.amqInfo.refreshAll();
							var result={msg:'Topics deleted: '+deleted+'. Skipped: '+skipped+'. Failed: '+failed+'.'};
							if(failed)
								toasty.error(result);
							else
								toasty.success(result);
						});
					});
				}, function() {
					// Cancelling confirmation performs no deletion.
				});
		}).catch(function() {
			toasty.error({msg:'Bulk topic deletion stopped. Check the reported API error; some topics may already have been deleted.'});
		}).finally(function() {
			$scope.deletingUnusedTopics=false;
		});
	}
	
	$scope.showTopicStats=function()
	{	
		$timeout(function() {
			$rootScope.$broadcast("show_queue_stats","topic");
		});	
		
		$scope.topicStatsVisible=true;		
	}
	
	$scope.hideQueueStats=function()
	{
		$scope.topicStatsVisible=false;
	}
	
	$scope.showConnection=function(con)
	{
		angular.forEach($scope.amqInfo.filteredConnections, function(value, key) {
			console.log(value);
			if(con.ClientID==value.ClientId.replace(/:/g,'_'))
			{
				$scope.amqInfo.currentConnection=value;
				$scope.amqInfo.computeConnectionDetails($scope.amqInfo.currentConnection);
				$scope.selectTab('connections');
			}
		});
	}
}]
);
