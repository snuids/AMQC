app.factory('httpRequestInterceptor', ['$rootScope', function($rootScope) {
    return {
			
			request: function($config) {
						if($rootScope.auth_login!='')
						{
			            	$config.headers['Authorization'] = 'Basic ' + $rootScope.auth_login;
						}
			            return $config;
        }
    };
}]);