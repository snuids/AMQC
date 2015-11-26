app.factory('httpRequestInterceptor', ['$rootScope', function($rootScope) {
    return {
			
			request: function($config) {
						//$config.headers['Access-Control-Request-Method'] = 'POST';
			            //$config.headers['Authorization'] = 'Basic ' + $rootScope.auth_login;
						//console.log(JSON.stringify($config));
			            return $config;
        }
    };
}]);