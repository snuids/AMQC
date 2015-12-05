app.controller('SendCtrl',['$scope','amqInfoFactory','toasty', function($scope,amqInfoFactory,toasty) 
{
	$scope.amqInfo=amqInfoFactory;
	$scope.sendMessageClass='send_message_details';
	$scope.sendMessageVisible=true;
	$scope.selectedSendDestination='Topic';
	$scope.textToSend='Enter your text message...';
	$scope.selectedSendDestinationName="foo";	
	$scope.sendMessageHeaders=[{"name":"Origin","value":"AMQClient"},{"name":"ID","value":9999}];
	$scope.headerName='My Header';
	$scope.headerValue='My Value';	
	$scope.repeatMessages=1;
	
	$scope.destinations = [{
        name: "Topic"
    }, {
        name: "Queue"
    }];
	
	$scope.addHeader=function()
	{
		for(var i=0 ;i< $scope.sendMessageHeaders.length;i++)
		{
			if($scope.sendMessageHeaders[i].name==$scope.headerName)
			{
				toasty.error({msg:'Header ' + $scope.headerName + ' already exists.'});
				return;
			}
		}	
		var obj={"name":$scope.headerName,"value":$scope.headerValue};				
		$scope.sendMessageHeaders.push(obj);
	}
	
	$scope.addIntHeader=function()
	{
		var obj={"name":$scope.headerName,"value":parseInt($scope.headerIntValue)};
		$scope.sendMessageHeaders.push(obj);
	}
	
	$scope.removeHeader=function(index)
	{
		$scope.sendMessageHeaders.splice(index,1);
	}
	
	$scope.sendMessage=function()
	{
		var props='';
		for(var i=0 ;i< $scope.sendMessageHeaders.length;i++)
			props+=$scope.sendMessageHeaders[i].name+"="+$scope.sendMessageHeaders[i].value+",";
		if(props.length>0)
			props=props.substring(0,props.length-1);
		props+=",body="+$scope.textToSend;
		$scope.amqInfo.sendMessage($scope.selectedSendDestination,$scope.selectedSendDestinationName,props);
	}
}]);