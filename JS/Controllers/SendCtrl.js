app.controller('SendCtrl',['$scope','amqInfoFactory','sendMessageFactory','toasty', function($scope,amqInfoFactory,sendMessageFactory,toasty) 
{
	$scope.msgInfo=sendMessageFactory;
	$scope.amqInfo=amqInfoFactory;

	$scope.headerName='My Header';
	$scope.headerValue='My Value';		
	
	$scope.addHeader=function()
	{
		for(var i=0 ;i< $scope.msgInfo.sendMessageHeaders.length;i++)
		{
			if($scope.msgInfo.sendMessageHeaders[i].name==$scope.headerName)
			{
				toasty.error({msg:'Header ' + $scope.headerName + ' already exists.'});
				return;
			}
		}	
		var obj={"name":$scope.headerName,"value":$scope.headerValue};				
		$scope.msgInfo.sendMessageHeaders.push(obj);
	}
	
	$scope.addIntHeader=function()
	{
		var obj={"name":$scope.headerName,"value":parseInt($scope.headerIntValue)};
		$scope.msgInfo.sendMessageHeaders.push(obj);
	}
	
	$scope.removeHeader=function(index)
	{
		$scope.msgInfo.sendMessageHeaders.splice(index,1);
	}
	
	$scope.sendMessage=function()
	{
		var props='';
		for(var i=0 ;i< $scope.msgInfo.sendMessageHeaders.length;i++)
			props+="&"+$scope.msgInfo.sendMessageHeaders[i].name+"="+$scope.msgInfo.sendMessageHeaders[i].value;
		
		for(var i=0;i<$scope.msgInfo.repeatMessages;i++)
			$scope.amqInfo.sendMessage($scope.msgInfo.selectedSendDestination,$scope.msgInfo.selectedSendDestinationName
				,$scope.msgInfo.textToSend,props);
		
		toasty.success($scope.msgInfo.repeatMessages+" message(s) sent.");	
	}
}]);