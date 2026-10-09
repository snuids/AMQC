app.controller('MessageCtrl', ['$scope', 'toasty', function($scope, toasty) {
	$scope.$watch('currentMessage.message', function(body) {
		$scope.messageBody=body;
	});

	$scope.formatBodyAsJson=function() {
		try {
			$scope.messageBody=JSON.stringify(JSON.parse($scope.currentMessage.message), null, 2);
		} catch(error) {
			if(!(error instanceof SyntaxError))
				throw error;
			toasty.error({msg:'Message body is not valid JSON.', title:'JSON Format Error'});
		}
	}
}]);
