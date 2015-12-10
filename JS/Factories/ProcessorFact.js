app.factory('ProcessorFact', ['$rootScope', function($rootScope) {
	var factory = {};
	
	factory.createEmptyProcessor = function(fieldName, queueName) {
		console.log("Creating new EmptyProcessor for field " + fieldName + " of queue " + queueName);
		
		function Func() {
			this.procName = "None";
			this.suffixForLegend = "";
			
			// values: Array of {x:timestamp, y:counter value}
			this.apply = function(values) {
			}				
		}
		
		var f = new Func();
		
		return f;
	}
	
	factory.createSimplePerSecondProcessor = function(fieldName, queueName) {
		console.log("Creating new SimplePerSecondProcessor for field " + fieldName + " of queue " + queueName);
		
		function Func() {
			this.procName = "Per second";
			this.suffixForLegend = "/sec";
			this.lastTime = undefined;
			this.lastValue = 0;
			
			// values: Array of {x:timestamp, y:counter value}
			this.apply = function(values) {
				if (values.length == 0)
					return;
				
				var item = values[values.length - 1];
				
				// User changed preference and array has already items when processor was re-initialized
				// or this is the first time coming in here
				if (this.lastTime === undefined) {
					this.lastValue = item.y;
					item.y = 0;
				}
				else {
					//console.log('new:' + values[values.length - 1].y + ' - old:' + this.lastValue);
			
					var newval = (item.y - this.lastValue) / ((item.x - this.lastTime) / 1000);
					
					// probably purged stats
					if (newval < 0)
						newval = 0;
						
					this.lastValue = item.y;
					
					///console.log('newval:' + newval);
				
					item.y = Math.ceil(newval); 
				}							
				 
				this.lastTime = item.x;				
			}
		}
		
		var f = new Func();
		
		return f;
	}
	
	// Warning: must match text inside factory.getProcessorFromName()
	factory.availableProcessors = function() {
		return [
			"None",
			"Per second"
		];
	}
	
	// Warning: must match text inside factory.availableProcessors()
	factory.getProcessorFromName = function(stringName) {
		switch (stringName) {
			case "None":
				return factory.createEmptyProcessor;
			case "Per second":
				return factory.createSimplePerSecondProcessor;
		}
		
		return undefined;
	}
		
	return factory;		
}]);