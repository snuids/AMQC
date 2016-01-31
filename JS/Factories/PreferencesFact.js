app.factory('preferencesFact', ['$rootScope',
	function($rootScope) {
	var factory = {};
	
	factory.hideAdvisoryQueues = true;
	console.log("Creating pref fact:"+factory.hideAdvisoryQueues);
	factory.autoRefreshInterval = 10; // in seconds, no auto-refresh when equals to zero
	
	// contains entries of type: Field => Processor Name (procName), is selected/used (isSelected)
	factory.queueChartFields = {};
	
	factory.checkStorageItem = function(itemName) {
		var item = localStorage.getItem(itemName);

		return { isOk: (item !== "undefined" && item !== null), value: item };
	}
	
	factory.load = function() {
		//console.log('prefs.load()');
		if(typeof(Storage) === undefined)
			return false;
		
		var pref = factory.checkStorageItem("amqc.hideAdvisoryQueues");
		factory.hideAdvisoryQueues = pref.isOk ? (pref.value == "true") : true;
		
//		alert("OK:"+pref.isOk);
//		alert("Val:"+pref.value);
//		alert("Hide:"+factory.hideAdvisoryQueues);
		
		//factory.hideAdvisoryQueues=!factory.hideAdvisoryQueues;						
		//factory.hideAdvisoryQueues=!factory.hideAdvisoryQueues;
//				alert(factory.hideAdvisoryQueues);
		console.log("Fact Hide="+factory.hideAdvisoryQueues+" Obj:"+typeof factory.hideAdvisoryQueues);
								
		pref = factory.checkStorageItem("amqc.autoRefreshInterval");
		factory.autoRefreshInterval = pref.isOk ? parseInt(pref.value) : 0;
		
		pref = factory.checkStorageItem("amqc.queueChartFields");
		factory.queueChartFields = pref.isOk ? JSON.parse(pref.value) : {};
		
		if(Object.keys(factory.queueChartFields).length!=3)
		{
			console.log("Resetting preferences."+Object.keys(factory.queueChartFields).length);
			factory.queueChartFields={};
		}
				
		return true;
	}
	
	factory.save = function() {
		//console.log('prefs.save()');
		if((typeof(Storage) === undefined))
			return false;
		
		//console.log('hideAdvisoryQueues:' + factory.hideAdvisoryQueues);
		//console.log('autoRefreshInterval:' + factory.autoRefreshInterval);
		//console.log('queueChartFields:' + JSON.stringify(factory.queueChartFields));
		
		localStorage.setItem('amqc.hideAdvisoryQueues', factory.hideAdvisoryQueues);
		localStorage.setItem('amqc.autoRefreshInterval', factory.autoRefreshInterval);
		localStorage.setItem('amqc.queueChartFields', JSON.stringify(factory.queueChartFields));
		
		return true;
	}
	
	factory.getActiveFields = function() {
		var fv = [];

		for (var key in factory.queueChartFields)
			if (factory.queueChartFields[key].isSelected === true) {
				fv.push(key);
			}

		return fv;
	}

	
	return factory;
}]);