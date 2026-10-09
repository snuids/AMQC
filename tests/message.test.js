const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function controller(body) {
	let watch;
	const errors = [];
	const scope = {
		currentMessage: {message: body},
		$watch(expression, callback) {
			assert.equal(expression, 'currentMessage.message');
			watch = callback;
		}
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../JS/Controllers/MessageCtrl.js'), 'utf8'), {
		app: {controller(name, dependencies) {
			dependencies[dependencies.length - 1](scope, {error: value => errors.push(value)});
		}}
	});
	watch(body);
	return {scope, errors, watch};
}

test('pretty prints nested JSON without modifying the original body', () => {
	const body = '{"nested":{"items":[1,true,null]},"text":"<script>"}';
	const app = controller(body);
	app.scope.formatBodyAsJson();
	assert.equal(app.scope.messageBody, JSON.stringify(JSON.parse(body), null, 2));
	assert.equal(app.scope.currentMessage.message, body);
	assert.equal(app.errors.length, 0);
});

test('invalid or empty JSON reports an error and preserves display and body', () => {
	for (const body of ['not JSON', '', '{"broken":']) {
		const app = controller(body);
		app.scope.formatBodyAsJson();
		assert.equal(app.scope.messageBody, body);
		assert.equal(app.scope.currentMessage.message, body);
		assert.equal(app.errors.length, 1);
	}
});

test('supports JSON scalar values and arrays', () => {
	for (const body of ['null', 'false', '0', '"text"', '[1,2]']) {
		const app = controller(body);
		app.scope.formatBodyAsJson();
		assert.equal(app.scope.messageBody, JSON.stringify(JSON.parse(body), null, 2));
	}
});

test('switching messages resets formatting to the new original body', () => {
	const app = controller('{"first":1}');
	app.scope.formatBodyAsJson();
	app.scope.currentMessage = {message: '{"second":2}'};
	app.watch(app.scope.currentMessage.message);
	assert.equal(app.scope.messageBody, '{"second":2}');
});
