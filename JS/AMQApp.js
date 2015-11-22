/*
   AMQ Angular Monitoring Tool

   Copyright (C) 2015 [Arnaud Marchand]
 */

var app=angular.module('AMQApp', []);

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
            element.after("<span ng-show='(sort.column==i && !sort.descending)' class='glyphicon glyphicon-arrow-down'></span><span ng-show='sort.column==i && sort.descending' class='glyphicon glyphicon-arrow-up'></span>");
        }
    };
});

app.filter('percentage', ['$filter', function($filter) {
    return function(input, decimals) {
        return $filter('number')(input*100, decimals)+' %';
    };
}]);




//TabsCtrl.$inject = ['$scope', 'amqInfoFactory'];


