const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'JS/Factories/AMQInfoFact.js'), 'utf8');
const methods = source.slice(source.indexOf('factory.getUnusedQueues=function()'),
	source.indexOf('/* Topic */'));
const $q = {when: () => Promise.resolve(), reject: error => Promise.reject(error)};
const queue = (Name, ConsumerCount = 0, QueueSize = 0) => ({Name, ConsumerCount, QueueSize});

function factoryWith(value, status = 200, postStatus = 200) {
	const errors = [];
	const posts = [];
	let refreshes = 0;
	const factory = {
		queuesUrl: 'queues', brokername: 'localhost',
		getPostUrl: () => 'post', handleApiError: error => errors.push(error),
		refreshAll: () => refreshes++
	};
	const $http = () => Promise.resolve({data: {status, value}});
	$http.post = (url, data) => {
		posts.push(data);
		return Promise.resolve({data: {status: postStatus}});
	};
	vm.runInNewContext(methods, {factory, $http, $q, toasty: {success() {}}, console: {log() {}}});
	return {factory, posts, errors, get refreshes() { return refreshes; }};
}

function controllerWith(snapshots, options = {}) {
	let reads = 0;
	let confirmations = 0;
	let refreshes = 0;
	const deleted = [];
	const notifications = [];
	const scope = {$on() {}};
	const factory = {
		currentQueue: queue('unused'), filteredQueues: [],
		getUnusedQueues: () => {
			const value = snapshots[reads++];
			return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
		},
		deleteQueue: name => {
			deleted.push(name);
			return name === options.fail ? Promise.reject(new Error('Delete failed')) : Promise.resolve();
		},
		refreshAll: () => refreshes++
	};
	const toasty = {};
	for (const type of ['info', 'success', 'error'])
		toasty[type] = data => notifications.push({type, ...data});
	const confirm = data => {
		confirmations++;
		assert.match(data.text, /empty queues without consumers/);
		return options.cancel ? Promise.reject('cancelled') : Promise.resolve();
	};
	vm.runInNewContext(fs.readFileSync(path.join(root, 'JS/Controllers/QueuesCtrl.js'), 'utf8'), {
		app: {controller(name, dependencies) {
			dependencies[dependencies.length - 1]({}, scope, () => {}, () => {}, confirm, factory, toasty, {}, $q);
		}}
	});
	return {scope, factory, deleted, notifications,
		get confirmations() { return confirmations; }, get refreshes() { return refreshes; }};
}

test('requires both numeric zero consumers and zero queue size', async () => {
	const app = factoryWith({
		a: queue('unused'), b: queue('busy', 1), c: queue('messages', 0, 1),
		d: queue('missing', null), e: queue('missing-size', 0, null),
		f: queue('string-size', 0, '0'), g: null
	});
	assert.deepEqual(Array.from(await app.factory.getUnusedQueues(), item => item.Name), ['unused']);
});

test('missing or failed queue response rejects and reports an error', async () => {
	for (const app of [factoryWith(null), factoryWith({}, 500)]) {
		await assert.rejects(app.factory.getUnusedQueues());
		assert.equal(app.errors.length, 1);
	}
});

test('deletion rejects broker errors and preserves single/bulk refresh behavior', async () => {
	const failed = factoryWith({}, 200, 500);
	await assert.rejects(failed.factory.deleteQueue('unused'));
	assert.equal(failed.errors.length, 1);
	assert.equal(failed.refreshes, 0);
	const app = factoryWith({});
	await app.factory.deleteQueue('unused');
	await app.factory.deleteQueue('another', null, true);
	assert.equal(app.refreshes, 1);
	assert.equal(app.posts[0].operation, 'removeQueue');
});

test('cancelled confirmation never deletes', async () => {
	const app = controllerWith([[queue('unused')]], {cancel: true});
	await app.scope.deleteUnusedQueues();
	assert.equal(app.confirmations, 1);
	assert.deepEqual(app.deleted, []);
	assert.equal(app.scope.deletingUnusedQueues, false);
});

test('no eligible queues does not confirm', async () => {
	const app = controllerWith([[]]);
	await app.scope.deleteUnusedQueues();
	assert.equal(app.confirmations, 0);
	assert.equal(app.notifications[0].type, 'info');
});

test('rechecks each queue, skips newly busy/nonempty queues, and excludes new candidates', async () => {
	const app = controllerWith([
		[queue('unused'), queue('changed')],
		[queue('unused'), queue('changed')],
		[queue('new-candidate')]
	]);
	const pending = app.scope.deleteUnusedQueues();
	assert.equal(app.scope.deletingUnusedQueues, true);
	assert.equal(app.scope.deleteUnusedQueues(), undefined);
	await pending;
	assert.deepEqual(app.deleted, ['unused']);
	assert.equal(app.factory.currentQueue, null);
	assert.equal(app.refreshes, 1);
	assert.match(app.notifications[0].msg, /deleted: 1\. Skipped: 1\. Failed: 0/);
	assert.equal(app.scope.deletingUnusedQueues, false);
});

test('partial deletion failure is reported while remaining candidates proceed', async () => {
	const queues = [queue('failed'), queue('unused')];
	const app = controllerWith([queues, queues, queues], {fail: 'failed'});
	await app.scope.deleteUnusedQueues();
	assert.deepEqual(app.deleted, ['failed', 'unused']);
	assert.equal(app.notifications[0].type, 'error');
	assert.match(app.notifications[0].msg, /Failed: 1/);
});

test('failed recheck stops remaining deletions and refreshes partial results', async () => {
	const queues = [queue('unused'), queue('unverified')];
	const app = controllerWith([queues, queues, new Error('Read failed')]);
	await app.scope.deleteUnusedQueues();
	assert.deepEqual(app.deleted, ['unused']);
	assert.equal(app.refreshes, 1);
	assert.equal(app.notifications[0].type, 'error');
	assert.equal(app.scope.deletingUnusedQueues, false);
});
