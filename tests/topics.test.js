const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS/Factories/AMQInfoFact.js'), 'utf8');
const methods = source.slice(source.indexOf('factory.getUnusedTopics=function()'),
	source.indexOf('/* Delete Message */'));
const $q = {
	all: promises => Promise.all(promises),
	when: () => Promise.resolve(),
	reject: error => Promise.reject(error)
};

function topic(Name, ConsumerCount = 0, Subscriptions = []) {
	return {Name, ConsumerCount, Subscriptions};
}

function factoryWith(topics, info, postStatus = 200) {
	const errors = [];
	const posts = [];
	let refreshes = 0;
	const factory = {
		topicsUrl: 'topics', infoUrl: 'info', brokername: 'localhost',
		getPostUrl: () => 'post',
		extractProperty: (key, value) => new RegExp(key + '=([^,]*)').exec(value)[1],
		handleApiError: error => errors.push(error),
		refreshAll: () => refreshes++
	};
	const $http = request => Promise.resolve({
		data: {status: 200, value: request.url === 'topics' ? topics : info}
	});
	$http.post = (url, data) => {
		posts.push(data);
		return Promise.resolve({data: {status: postStatus}});
	};
	vm.runInNewContext(methods, {factory, $http, $q, console: {log() {}}});
	return {factory, errors, posts, get refreshes() { return refreshes; }};
}

function controllerWith(snapshots, options = {}) {
	let calls = 0;
	let confirmations = 0;
	let refreshes = 0;
	const deleted = [];
	const notifications = [];
	const scope = {};
	const factory = {
		currentTopic: topic('unused'),
		getUnusedTopics: () => {
			const snapshot = snapshots[calls++];
			return snapshot instanceof Error ? Promise.reject(snapshot) : Promise.resolve(snapshot);
		},
		deleteTopic: name => {
			deleted.push(name);
			return name === options.fail ? Promise.reject(new Error('Broker failure')) : Promise.resolve();
		},
		refreshAll: () => refreshes++
	};
	const confirm = data => {
		confirmations++;
		assert.match(data.text, /durable subscriptions are excluded/);
		return options.cancel ? Promise.reject('cancelled') : Promise.resolve();
	};
	const toasty = {};
	for (const type of ['info', 'success', 'error'])
		toasty[type] = data => notifications.push({type, ...data});
	vm.runInNewContext(fs.readFileSync(path.join(root, 'JS/Controllers/TopicsCtrl.js'), 'utf8'), {
		app: {controller(name, dependencies) {
			dependencies[dependencies.length - 1]({}, scope, () => {}, confirm, factory, $q, toasty);
		}}
	});
	return {scope, factory, deleted, notifications,
		get confirmations() { return confirmations; }, get refreshes() { return refreshes; }};
}

test('eligibility excludes consumers, advisory topics, and active/inactive durable subscriptions', async () => {
	const app = factoryWith({
		a: topic('unused'), b: topic('busy', 1), c: topic('ActiveMQ.Advisory.Connection'),
		d: topic('active-durable'), e: topic('offline-durable'),
		f: topic('subscribed', 0, [{}]), g: topic('unknown', null)
	}, {
		DurableTopicSubscribers: [{objectName: 'domain:type=Broker,destinationName=active-durable,endpoint=Consumer'}],
		InactiveDurableTopicSubscribers: [{objectName: 'domain:type=Broker,destinationName=offline-durable,endpoint=Consumer'}]
	});
	assert.deepEqual(Array.from(await app.factory.getUnusedTopics(), entry => entry.Name), ['unused']);
});

test('missing durable metadata fails closed and reports the error', async () => {
	const app = factoryWith({a: topic('unused')}, {});
	await assert.rejects(app.factory.getUnusedTopics());
	assert.equal(app.errors.length, 1);
	assert.equal(app.posts.length, 0);
});

test('unparseable durable destinations fail closed', async () => {
	const app = factoryWith({a: topic('unused')}, {
		DurableTopicSubscribers: [], InactiveDurableTopicSubscribers: [{objectName: 'domain:type=Consumer'}]
	});
	await assert.rejects(app.factory.getUnusedTopics());
	assert.equal(app.errors.length, 1);
});

test('broker-level deletion errors reject and do not refresh', async () => {
	const app = factoryWith({}, {}, 500);
	await assert.rejects(app.factory.deleteTopic('unused'));
	assert.equal(app.errors.length, 1);
	assert.equal(app.refreshes, 0);
	assert.equal(app.posts[0].operation, 'removeTopic');
});

test('successful single deletion refreshes; bulk deletion can defer refresh', async () => {
	const app = factoryWith({}, {});
	await app.factory.deleteTopic('unused');
	assert.equal(app.refreshes, 1);
	await app.factory.deleteTopic('another', null, true);
	assert.equal(app.refreshes, 1);
});

test('confirmation cancellation never deletes and clears busy state', async () => {
	const app = controllerWith([[topic('unused')]], {cancel: true});
	await app.scope.deleteUnusedTopics();
	assert.equal(app.confirmations, 1);
	assert.deepEqual(app.deleted, []);
	assert.equal(app.scope.deletingUnusedTopics, false);
});

test('no eligible topics does not prompt or delete', async () => {
	const app = controllerWith([[]]);
	await app.scope.deleteUnusedTopics();
	assert.equal(app.confirmations, 0);
	assert.equal(app.notifications[0].type, 'info');
});

test('rechecks eligibility, skips changed topics, and never deletes new unconfirmed topics', async () => {
	const app = controllerWith([
		[topic('unused'), topic('became-busy')],
		[topic('unused'), topic('new-topic')]
	]);
	const pending = app.scope.deleteUnusedTopics();
	assert.equal(app.scope.deletingUnusedTopics, true);
	assert.equal(app.scope.deleteUnusedTopics(), undefined);
	await pending;
	assert.deepEqual(app.deleted, ['unused']);
	assert.equal(app.factory.currentTopic, null);
	assert.equal(app.refreshes, 1);
	assert.match(app.notifications[0].msg, /deleted: 1\. Skipped: 1\. Failed: 0/);
	assert.equal(app.scope.deletingUnusedTopics, false);
});

test('partial failure is reported and remaining confirmed topics are attempted', async () => {
	const topics = [topic('failed'), topic('unused')];
	const app = controllerWith([topics, topics], {fail: 'failed'});
	await app.scope.deleteUnusedTopics();
	assert.deepEqual(app.deleted, ['failed', 'unused']);
	assert.equal(app.notifications[0].type, 'error');
	assert.match(app.notifications[0].msg, /Failed: 1/);
});

test('failed recheck aborts deletion and resets busy state', async () => {
	const app = controllerWith([[topic('unused')], new Error('Read failed')]);
	await app.scope.deleteUnusedTopics();
	assert.deepEqual(app.deleted, []);
	assert.equal(app.notifications[0].type, 'error');
	assert.equal(app.scope.deletingUnusedTopics, false);
});
