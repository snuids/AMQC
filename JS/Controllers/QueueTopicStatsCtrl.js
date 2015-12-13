app.controller('QueueTopicStatsCtrl', ['$rootScope', '$scope', '$interval', '$timeout', 'amqInfoFactory', 'preferencesFact',
	function ($rootScope,$scope, $interval, $timeout, amqInfoFactory, preferencesFact) 
{
	$scope.destination='queue';
	$scope.graphType='QueueSize';

	$rootScope.$on('show_queue_stats', function(evt,param)
	{
		$scope.destination=param;
		if(param=='topic')
			$scope.graphType='ConsumerCount';
			
		$scope.refreshGraph()		
	});
			
	$scope.refreshGraph=function()
	{
		if(this.destination=='queue')
			this.refreshQueueGraph();
		else
		{
			this.refreshTopicGraph();
		}
	}
	/** Queues **/
	$scope.refreshQueueGraph=function()
	{
		$scope.queueData = [
            {
                key: "Queue",                
            }
        ];
		
		$scope.queueData[0].values=[];
		
		var queues=[];
		
		if($scope.graphType.indexOf('enqueue_dequeue')<0)
		{
			for(var i=0;i<amqInfoFactory.filteredQueues.length;i++)
			{
				queues.push(amqInfoFactory.filteredQueues[i]);
			}		
			queues.sort(function(a,b){return b[$scope.graphType]-a[$scope.graphType];});		
			for(var i=0;i<queues.length;i++)
			{
				var queue=queues[i];
				$scope.queueData[0].values.push({"label":queue.Name,"value":queue[$scope.graphType]});
				if(i>20)
					break;			
			}
		}
		else // double or triple graphs
		{
			$scope.queueData = [
	            {
	                key: "Enqueue",                
	            },
	            {
	                key: "Dequeue",                
	            }
	        ];
			
			$scope.queueData[0].values=[];
			$scope.queueData[1].values=[];
			if($scope.graphType=='enqueue_dequeue_size')
			{
				$scope.queueData.push({key:'Size',color:'red'});
				$scope.queueData[2].values=[];
			}
			
			for(var i=0;i<amqInfoFactory.filteredQueues.length;i++)
			{
				queues.push(amqInfoFactory.filteredQueues[i]);
			}		
			queues.sort(function(a,b){return b.EnqueueCount-a.EnqueueCount;});		
			for(var i=0;i<queues.length;i++)
			{
				var queue=queues[i];
				$scope.queueData[0].values.push({"label":queue.Name,"value":queue.EnqueueCount});
				$scope.queueData[1].values.push({"label":queue.Name,"value":queue.DequeueCount});
				$scope.queueData[2].values.push({"label":queue.Name,"value":queue.QueueSize});
				if(i>20)
					break;			
			}
		}
		
		$scope.queueStatsVisible=true;
		$timeout(function() {window.dispatchEvent(new Event('resize'));}, 500);
	}
	
	/** Topics **/
	$scope.refreshTopicGraph=function()
	{
		$scope.queueData = [
            {
                key: "Topic",                
            }
        ];
		
		$scope.queueData[0].values=[];
		
		var queues=[];
		
		if(($scope.graphType!='enqueue_dequeue'))
		{
			for(var i=0;i<amqInfoFactory.filteredTopics.length;i++)
			{
				if(preferencesFact.hideAdvisoryQueues && (amqInfoFactory.filteredTopics[i].Name.indexOf('ActiveMQ')==0))
					continue;
				queues.push(amqInfoFactory.filteredTopics[i]);
			}		
			queues.sort(function(a,b){return b[$scope.graphType]-a[$scope.graphType];});		
			for(var i=0;i<queues.length;i++)
			{
				var queue=queues[i];
				$scope.queueData[0].values.push({"label":queue.Name,"value":queue[$scope.graphType]});
				if(i>20)
					break;			
			}
		}
		else // double graphs
		{
			$scope.queueData = [
	            {
	                key: "Enqueue",                
	            },
	            {
	                key: "Dequeue",                
	            }
	        ];
			$scope.queueData[0].values=[];
			$scope.queueData[1].values=[];
			for(var i=0;i<amqInfoFactory.filteredTopics.length;i++)
			{
				if(preferencesFact.hideAdvisoryQueues && (amqInfoFactory.filteredTopics[i].Name.indexOf('ActiveMQ')==0))
					continue;
				queues.push(amqInfoFactory.filteredTopics[i]);
			}		
			queues.sort(function(a,b){return b.EnqueueCount-a.EnqueueCount;});		
			for(var i=0;i<queues.length;i++)
			{
				var queue=queues[i];
				$scope.queueData[0].values.push({"label":queue.Name,"value":queue.EnqueueCount});
				$scope.queueData[1].values.push({"label":queue.Name,"value":queue.DequeueCount});
				if(i>20)
					break;			
			}
		}
		
		$scope.queueStatsVisible=true;
		$timeout(function() {window.dispatchEvent(new Event('resize'));}, 500);
	}
	
	$scope.options = 
	{
            chart: {
                type: 'multiBarHorizontalChart',
                x: function(d){return d.label;},
                y: function(d){return d.value;},
                //yErr: function(d){ return [-Math.abs(d.value * Math.random() * 0.3), Math.abs(d.value * Math.random() * 0.3)] },
                showControls: true,
                showValues: true,
                duration: 500,
                xAxis: {
                    showMaxMin: false
                },
                yAxis: {
                    axisLabel: 'Values',
                    tickFormat: function(d){
                        return d3.format(',.2f')(d);
                    }
                }
            }
        };
					
	}
	
	
]);