app.controller('SendCtrl', ['$scope', 'amqInfoFactory', 'sendMessageFactory', 'toasty',
	function ($scope, amqInfoFactory, sendMessageFactory, toasty) 
{
	$scope.msgInfo=sendMessageFactory;
	$scope.amqInfo=amqInfoFactory;

	$scope.headerName='My Header';
	$scope.headerValue='My Value';		

	if((typeof(Storage) !== undefined))
	{
		if ((localStorage.getItem("sendMessageHeaders") !== undefined)&&(localStorage.getItem("sendMessageHeaders") != null))
		{
			$scope.msgInfo.sendMessageHeaders=JSON.parse(localStorage.getItem("sendMessageHeaders"));
		}
		if ((localStorage.getItem("lastMessageSent") !== undefined)&&(localStorage.getItem("lastMessageSent") != null))
		{
			$scope.msgInfo.textToSend=localStorage.getItem("lastMessageSent");
		}
		if ((localStorage.getItem("selectedSendDestination") !== undefined)&&(localStorage.getItem("selectedSendDestination") != null))
		{
			$scope.msgInfo.selectedSendDestination=localStorage.getItem("selectedSendDestination");
		}
		if ((localStorage.getItem("selectedSendDestinationName") !== undefined)&&(localStorage.getItem("selectedSendDestinationName") != null))
		{
			$scope.msgInfo.selectedSendDestinationName=localStorage.getItem("selectedSendDestinationName");
		}
		
	}
		
	
	
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
		$scope.headerName=$scope.msgInfo.sendMessageHeaders[index].name;
		$scope.headerValue=$scope.msgInfo.sendMessageHeaders[index].value;	
		$scope.msgInfo.sendMessageHeaders.splice(index,1);
	}
	
	$scope.sendMessage=function()
	{
		if((typeof(Storage) !== undefined))
		{
			localStorage.setItem("sendMessageHeaders",JSON.stringify($scope.msgInfo.sendMessageHeaders));
			localStorage.setItem("lastMessageSent",$scope.msgInfo.textToSend);
			localStorage.setItem("selectedSendDestination",$scope.msgInfo.selectedSendDestination);
			localStorage.setItem("selectedSendDestinationName",$scope.msgInfo.selectedSendDestinationName);
		}
		
		
		var props='';
		for(var i=0 ;i< $scope.msgInfo.sendMessageHeaders.length;i++)
			props+="&"+$scope.msgInfo.sendMessageHeaders[i].name+"="+$scope.msgInfo.sendMessageHeaders[i].value;
		
		$scope.amqInfo.sendMessage($scope.msgInfo.selectedSendDestination,$scope.msgInfo.selectedSendDestinationName
				,$scope.msgInfo.textToSend,props,$scope.msgInfo.repeatMessages);				
	}
}]);