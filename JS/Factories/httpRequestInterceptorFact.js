app.factory('httpRequestInterceptor', ['$rootScope', function($rootScope) {
    return {
        request: function($config) {
//            $config.headers['Authorization'] = 'Basic ' + $rootScope.apiKey;
			//alert('coucou:'+$rootScope.auth_login);
            return $config;
        }
    };
}]);