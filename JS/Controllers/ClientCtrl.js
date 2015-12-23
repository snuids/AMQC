app.controller('ClientCtrl', ['$scope','$interval','$timeout', 'amqInfoFactory', 'amqClientFactory', 'toasty',
	function ($scope,$interval,$timeout, amqInfoFactory, amqClientFactory, toasty) 
{	
	var GRAPHBORDERX=5;
	var POINTWIDTH=5;
	
	$scope.getMouse = function(event,canvas) {
		var x = event.offsetX;
	    var y = event.offsetY;

		return {x: x, y: y};
	}
	
	
	amqClientFactory.subscribe($scope, function somethingChanged() 
	{
		$scope.$apply();
	});
	
	amqClientFactory.subscribeToConnectionEvents($scope, function connectionEventHandler(evt,param) 
	{
//		toasty.sucees({msg:'Header already exists.'});
		if(param.toLowerCase().indexOf("ok")>=0)
			toasty.success({msg:param});
		else
			toasty.error({msg:param});
		$scope.$apply();
	});
	
	$scope.amqClient=amqClientFactory;
	
	$scope.destinations = [{
	        name: "Topic"
	    }, {
	        name: "Queue"
	    }];
	
	$scope.eventListenersAdded=false;
	$scope.sendMessageVisible=false;
	$scope.headerName="MyHeader";
	$scope.headerValue="MyHeaderValue";
	$scope.headerIntValue=1;
	$scope.repeatMessages=1;
	$scope.timeLineVisible=false;
	$scope.queuesAndTopics=[];
	$scope.queuesAndTopicsData={};
	$scope.orgsecond=0;
		
	$scope.connect=function()
	{
		toasty.success({msg:"Trying to connect"});		
			
		
		$scope.amqClient.connect();
	}
	
	$scope.disconnect=function()
	{
		$scope.amqClient.disconnect();
	}
	
	$scope.clearTable=function()
	{
		$scope.amqClient.messages=[];
	}
	
	$scope.showDetails=function(message)
	{
		$scope.currentMessage=message;
		$scope.closeSendMessage();
	}
	
	$scope.closeDetails=function()
	{
		$scope.currentMessage=null;
	}
	
	$scope.sendMessage=function()
	{
		for(var i=0;i<$scope.repeatMessages;i++)
			$scope.amqClient.sendMessage();
	}

	$scope.showSendMessage=function()
	{
		$scope.showDetails(null);
		$scope.sendMessageVisible=true;
		
	}
	
	$scope.closeSendMessage=function()
	{
		$scope.sendMessageVisible=false;
	}
	
	$scope.addHeader=function()
	{
		for(var i=0 ;i< $scope.amqClient.sendMessageHeaders.length;i++)
		{
			if($scope.amqClient.sendMessageHeaders[i].name==$scope.headerName)
			{
				toasty.error({msg:'Header ' + $scope.headerName + ' already exists.'});
				return;
			}
		}	
		var obj={"name":$scope.headerName,"value":$scope.headerValue};
		$scope.amqClient.sendMessageHeaders.push(obj);
	}
				
	$scope.addIntHeader=function()
	{
		var obj={"name":$scope.headerName,"value":parseInt($scope.headerIntValue)};
		$scope.amqClient.sendMessageHeaders.push(obj);
	}
	
	$scope.removeHeader=function(index)
	{
		$scope.amqClient.sendMessageHeaders.splice(index,1);
	}
		
	$scope.showMessageGrapher=function()
	{
		$scope.queuesAndTopics=[];
		var queues=$scope.amqClient.queues.split(',');
		var topics=$scope.amqClient.topics.split(',');		
		
		for(var i=0;i<queues.length;i++)
		{
			if(queues[i]!='')
			{
				$scope.queuesAndTopics.push({type:'queue',name:queues[i]});
				$scope.queuesAndTopicsData['queue_'+queues[i]]={data:[]};
			}
		}
		for(var i=0;i<topics.length;i++)
		{
			if(topics[i]!='')
			{
				$scope.queuesAndTopics.push({type:'topic',name:topics[i]});		
				$scope.queuesAndTopicsData['topic_'+topics[i]]={data:[]};
			}
		}
		
		$scope.queuesAndTopics.sort(function(a,b){return a.name.localeCompare(b.name);});	
		$scope.timeLineVisible=true;
		
		$scope.refreshCurvesTimer = $interval(function() 
		{ 
			$scope.drawCurves(); 
		}, 
		1000);
		
		$(window).resize( resizeCanvas );
		$timeout(function() {window.dispatchEvent(new Event('resize'));}, 100);
	}
	
    function resizeCanvas()
    {
		var w = window.innerWidth;			
		
		for(var i=0 ;i< $scope.queuesAndTopics.length;i++)
		{
			var curve=$scope.queuesAndTopics[i];
			var id='#can_'+curve.type+'_'+curve.name;
	        console.log(" hei:"+$(id).parent().height());
			var h=$(id).parent().innerHeight();
			var c = $(id);
            c.attr('width', w ); //max width
            c.attr('height', h); //max height			
			
			if(!$scope.eventListenersAdded)
			{
                $(id).mousedown(function(e) {
					$scope.mouseClickOnCanvas(e);
                });
			}
			
		}
		$scope.eventListenersAdded=true;
		$scope.drawCurves();
    }

	$scope.prepareCurves=function()
	{
		//$scope.queuesAndTopicsData['queue_'+queues[i]]={data:[]};
		var w = window.innerWidth;
	
		$scope.orgsecond=Math.floor(new Date().getTime()/1000);
		
		
		for(var i=0 ;i< $scope.queuesAndTopics.length;i++)
		{
			var curve=$scope.queuesAndTopics[i];
			$scope.queuesAndTopicsData[curve.type+'_'+curve.name].data=[];
			$scope.queuesAndTopicsData[curve.type+'_'+curve.name].max=1;
		}
		
		for(var i=0;i<$scope.amqClient.messages.length;i++)
		{
			var message=$scope.amqClient.messages[i];
			var dest='queue_';
			if(message.destination.indexOf("topic")>=0)
				dest='topic_';
			var cols=message.destination.split('/');
			var name=cols[cols.length-1];
			var cursecond=$scope.orgsecond-Math.floor(message.reception/1000);
			if($scope.queuesAndTopicsData[dest+name].data[cursecond]==undefined)
			{
				$scope.queuesAndTopicsData[dest+name].data[cursecond]=[message];
			}
			else
			{
				$scope.queuesAndTopicsData[dest+name].data[cursecond].push(message);
//						=$scope.queuesAndTopicsData[dest+name].data[cursecond]+1;
			}
			if($scope.queuesAndTopicsData[dest+name].data[cursecond].length>$scope.queuesAndTopicsData[dest+name].max)
			{
				$scope.queuesAndTopicsData[dest+name].max=$scope.queuesAndTopicsData[dest+name].data[cursecond].length;
			}
		}
		
		
		//console.log($scope.queuesAndTopicsData);
	}

	
	$scope.drawCurves=function()
	{
		console.log("Draw Curves");
		$scope.prepareCurves();
		for(var i=0 ;i< $scope.queuesAndTopics.length;i++)
		{
			$scope.drawCurve($scope.queuesAndTopics[i]);
		}
	}
	
	$scope.drawCurve=function(curve)
	{
//		console.log(curve);
		var id='#can_'+curve.type+'_'+curve.name;
		var c = $(id);
		var ctx = c.get(0).getContext('2d');
        var W = window.innerWidth;
        var H = $(id).parent().height();  			
        $scope.fillRect(ctx,0,0,W,H,'#FFF');
		
        var lingrad = ctx.createLinearGradient(0,0,0,H);
        lingrad.addColorStop(0, '#fff');
        lingrad.addColorStop(0.5, '#eee');
        lingrad.addColorStop(1, '#fff');
	
        $scope.fillRect(ctx,5,5,W-(GRAPHBORDERX*2),H-10,lingrad/*'#EEE'*/);
        $scope.paintRect(ctx,5,5,W-(GRAPHBORDERX*2),H-10,'#000');
	
		var cursecond=$scope.orgsecond;
		
		// set max to main table
		
		for(var i=0;i<$scope.queuesAndTopics.length;i++)
		{
			if(($scope.queuesAndTopics[i].type==curve.type)&&
				($scope.queuesAndTopics[i].name==curve.name))
			{
				$scope.queuesAndTopics[i].max=$scope.queuesAndTopicsData[curve.type+'_'+curve.name].max;
			}
		}
		
		var t=0;
		
        for(u=(cursecond%10)*5;u<W-(GRAPHBORDERX*2);u+=(10*POINTWIDTH),t++)
        {
            ctx.beginPath();
            ctx.moveTo(5+u,5);
            ctx.lineTo(5+u,5+H-10);
            ctx.strokeStyle='#ddd';
									
            ctx.closePath();
            ctx.stroke();
			
			ctx.textAlign = "center";
			ctx.fillStyle='black';
			ctx.fillText("-"+((cursecond%10)+(t*10))+" s", 5+u,5+(H/2)-10);
        }
        ctx.beginPath();
        ctx.moveTo(5,5+(H-10)/2);
        ctx.lineTo(W-10,5+(H-10)/2);
        ctx.strokeStyle='#ccc';
        ctx.closePath();
        ctx.stroke();
				
//	console.log("U="+cursecond+" UMAX="+(W-(GRAPHBORDERX*2))/POINTWIDTH);	
		var lastvaluey=0;
		var lastvaluex=-1;		
		var hull=[];
		$scope.queuesAndTopicsData[curve.type+'_'+curve.name].balls=[];

       for(u=0;u<(W-(GRAPHBORDERX*2))/POINTWIDTH;u++)
       {
		   var y=H-(GRAPHBORDERX);
		   if($scope.queuesAndTopicsData[curve.type+'_'+curve.name].data[u]!=undefined)
		   {
			   y=((H-(GRAPHBORDERX*2))/$scope.queuesAndTopicsData[curve.type+'_'+curve.name].max)
			   			*$scope.queuesAndTopicsData[curve.type+'_'+curve.name].data[u].length;			   
			   y=H-GRAPHBORDERX-y;
			   $scope.queuesAndTopicsData[curve.type+'_'+curve.name].balls.push({x:GRAPHBORDERX+(u*POINTWIDTH)-2,y:y,data:$scope.queuesAndTopicsData[curve.type+'_'+curve.name].data[u]})
		   }
		   if((lastvaluey!=y)||(lastvaluey!=H-(GRAPHBORDERX)))
		   {
			   if((y!=H-(GRAPHBORDERX))&&(lastvaluex!=u-1))
				   hull.push({x:GRAPHBORDERX+((u-1)*POINTWIDTH)-2,y:H-(GRAPHBORDERX)})
		   	   hull.push({x:GRAPHBORDERX+(u*POINTWIDTH)-2,y:y})
			   lastvaluey=y;
			   lastvaluex=u;
		   }
       }
	   
	   
//	   console.log(hull);
	   if(hull.length>0)
	   {  		
		   ctx.beginPath();	 
		   ctx.strokeStyle='#00F'
		   ctx.moveTo(hull[0].x,hull[0].y)

		   for(var i=1;i<hull.length;i++)
		   {
			   ctx.lineTo(hull[i].x,hull[i].y)
		   }
	       ctx.stroke();
		   ctx.lineTo(GRAPHBORDERX,H-(GRAPHBORDERX));		   
		   ctx.fillStyle='#4682B4';
 		   ctx.fill();
	       ctx.closePath();
	   }
	   for(var i=0;i<$scope.queuesAndTopicsData[curve.type+'_'+curve.name].balls.length;i++)
	   {
		   ctx.strokeStyle='#ccc';
		  ctx.beginPath();
		  ctx.arc($scope.queuesAndTopicsData[curve.type+'_'+curve.name].balls[i].x, $scope.queuesAndTopicsData[curve.type+'_'+curve.name].balls[i].y, 5, 0, Math.PI * 2, true);
		  ctx.fillStyle='#FFF';
		  ctx.fill();
  
		  ctx.strokeStyle='#00F'
		  ctx.stroke();
		  ctx.closePath();
	   	 
	   }
	}
	
    $scope.fillRect=function(ctx,x,y,w,h,color) 
    {
        ctx.beginPath();
        ctx.rect(x,y,w,h);
        ctx.closePath();
        ctx.fillStyle=color;
        ctx.fill();
    }

    $scope.paintRect=function(ctx,x,y,w,h,color) 
    {
        ctx.beginPath();
        ctx.rect(x,y,w,h);
        ctx.closePath();
        ctx.strokeStyle=color;
        ctx.stroke();
    }
	
	$scope.hideMessageGrapher=function()
	{
		$interval.cancel($scope.refreshCurvesTimer);
		
		$scope.timeLineVisible=false;
	}

	$scope.mouseClickOnCanvas=function(e,canvas)
	{	
		var mouse = $scope.getMouse(e,canvas);
		var balls=$scope.queuesAndTopicsData[e.target.id.replace("can_","")].balls;
		var found=false;
		
		for(var i=0;i<balls.length;i++)
		{
			console.log((Math.abs(mouse.x-balls[i].x)<5)+","+(Math.abs(mouse.y-balls[i].y)<5))
			if((Math.abs(mouse.x-balls[i].x)<5)&&(Math.abs(mouse.y-balls[i].y)<5))
			{
				$scope.selectedMessages=balls[i].data;
				found=true;
				break;
			}
		}
		if(!found)
			$scope.selectedMessages=null;
	}
	
	$scope.closeCurveMessagesPicker=function()
	{
		$scope.selectedMessages=null;		
	}
	
	$scope.showDetailsFromTimeLine=function(message)
	{
		$scope.currentMessage=message;
	}

}]
);
