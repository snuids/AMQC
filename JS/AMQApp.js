/*
   AMQ Angular Monitoring Tool

   Copyright (C) 2015 [Arnaud Marchand]
 */

var app = angular.module('AMQApp', ['angular-toasty', 'nvd3','nvd3ChartDirectives','ui.bootstrap','angular-confirm']);


app.directive('dragMe', function() {
	return {
		restrict: 'A',
		link: function(scope, elem, attr, ctrl) {
			elem.draggable({ cancel: ".nodrag" });
			elem.addClass('dragClass');
		}
	};
});

app.directive("tableHeader", function() {
    return {
        restrict: 'A', // only for attributes
		transclude: true,
        compile: function(element) {
            element.after("<span ng-show='(sort.column==i && !sort.descending)' class='glyphicon glyphicon-arrow-up'></span><span ng-show='sort.column==i && sort.descending' class='glyphicon glyphicon-arrow-down'></span>");
        }
    };
});

app.filter('percentage', ['$filter', function($filter) {
    return function(input, decimals) {
        return $filter('number')(input*100, decimals)+' %';
    };
}]);

app.filter('rawHtml', ['$sce', function($sce){
  return function(val) {
    return $sce.trustAsHtml(val);
  };
}]);

app.config(['toastyConfigProvider', function(toastyConfigProvider) {
	toastyConfigProvider.setConfig({
		limit: 8
	});
}]);

app.config(function($httpProvider) {
    //Enable cross domain calls
    //$httpProvider.defaults.useXDomain = true;
	//$httpProvider.defaults.headers.common['Access-Control-Allow-Origin'] = '*';
});

app.config(function ($httpProvider) {
    $httpProvider.interceptors.push('httpRequestInterceptor');
});


