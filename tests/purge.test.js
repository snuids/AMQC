const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../JS/Factories/AMQInfoFact.js'), 'utf8');
const methods = source.slice(
	source.indexOf('factory.purgeQueue=function('),
	source.indexOf('factory.bin2String=function(')
);

test('purge sends the explicit no-argument Jolokia signature', () => {
	const posts = [];
	const factory = {
		brokername: 'localhost',
		getPostUrl: () => 'post',
		refreshAll() {},
		handleApiError(error) { throw error; }
	};
	const $http = {
		post(url, data) {
			posts.push({url, data});
			return Promise.resolve({data: {status: 200}});
		}
	};

	vm.runInNewContext(methods, {factory, $http, console: {log() {}}});
	factory.purgeQueue('orders');

	assert.equal(posts.length, 1);
	assert.equal(posts[0].data.operation, 'purge()');
	assert.equal(
		posts[0].data.mbean,
		'org.apache.activemq:type=Broker,brokerName=localhost,destinationType=Queue,destinationName=orders'
	);
});
