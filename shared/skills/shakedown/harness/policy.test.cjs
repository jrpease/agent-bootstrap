// node --test shared/skills/shakedown/harness/policy.test.cjs
// Covers the production block without Playwright: policy decisions and the API client.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const policy = require('./policy.cjs');
const { client } = require('./api.cjs');

const config = {
  product: 'lanternly',
  targets: {
    nonprod: { app: 'https://staging.lanternly.example', api: 'https://api-staging.lanternly.example' },
    prod: { app: 'https://lanternly.example', api: 'https://api.lanternly.example' },
  },
  api: { tokenEnv: 'SHAKEDOWN_TEST_TOKEN' },
};

function ctx(target) {
  return { config, target, qa: '/qa', runDir: fs.mkdtempSync(path.join(os.tmpdir(), 'shakedown-')), lane: 'api-contract' };
}

function fakeFetch(calls) {
  return async (url, init) => { calls.push({ url, ...init }); return new Response('{"ok":true}', { status: 201, headers: { 'content-type': 'application/json' } }); };
}

test('production blocks every data-changing method and nothing else', () => {
  const c = ctx('prod');
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'post']) assert.deepStrictEqual(policy.decide({ method: m, url: 'https://api.lanternly.example/x' }, c), { blocked: true, log: false });
  for (const m of ['GET', 'HEAD', 'OPTIONS']) assert.deepStrictEqual(policy.decide({ method: m, url: 'https://api.lanternly.example/x' }, c), { blocked: false, log: false });
  // Third-party hosts are blocked on production too.
  assert.strictEqual(policy.decide({ method: 'POST', url: 'https://analytics.example/collect' }, c).blocked, true);
});

test('non-production allows writes and logs only the product\'s own hosts', () => {
  const c = ctx('nonprod');
  assert.deepStrictEqual(policy.decide({ method: 'POST', url: 'https://api-staging.lanternly.example/items' }, c), { blocked: false, log: true });
  assert.deepStrictEqual(policy.decide({ method: 'POST', url: 'https://staging.lanternly.example/form' }, c), { blocked: false, log: true });
  assert.deepStrictEqual(policy.decide({ method: 'POST', url: 'https://analytics.example/collect' }, c), { blocked: false, log: false });
  assert.deepStrictEqual(policy.decide({ method: 'GET', url: 'https://api-staging.lanternly.example/items' }, c), { blocked: false, log: false });
});

test('API client refuses writes on production before any request leaves', async () => {
  const calls = [];
  const api = client(ctx('prod'), fakeFetch(calls));
  await assert.rejects(api.post('/items', { name: 'x' }), /BLOCKED: POST/);
  await assert.rejects(api.delete('/items/1'), /BLOCKED: DELETE/);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(api.blocked.length, 2);
  await api.get('/items');
  assert.strictEqual(calls.length, 1);
});

test('production never reads the API token', async () => {
  process.env.SHAKEDOWN_TEST_TOKEN = 'secret-token';
  try {
    const calls = [];
    const api = client(ctx('prod'), fakeFetch(calls));
    await assert.rejects(api.get('/me', { auth: true }), /no credentials on production/);
    assert.strictEqual(calls.length, 0);
    const nonprod = client(ctx('nonprod'), fakeFetch(calls));
    await nonprod.get('/me', { auth: true });
    assert.strictEqual(calls[0].headers.authorization, 'Bearer secret-token');
  } finally {
    delete process.env.SHAKEDOWN_TEST_TOKEN;
  }
});

test('non-production writes land in writes.jsonl', async () => {
  const c = ctx('nonprod');
  const api = client(c, fakeFetch([]));
  await api.post('/items', { name: 'QA1028 api-contract thing' });
  await api.get('/items');
  const lines = fs.readFileSync(path.join(c.runDir, 'writes.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.strictEqual(lines.length, 1);
  assert.strictEqual(lines[0].method, 'POST');
  assert.strictEqual(lines[0].status, 201);
  assert.strictEqual(lines[0].lane, 'api-contract');
  assert.strictEqual(lines[0].url, 'https://api-staging.lanternly.example/items');
});

test('a non-production run cannot write to a production host by absolute URL', async () => {
  const c = ctx('nonprod');
  assert.deepStrictEqual(policy.decide({ method: 'POST', url: 'https://api.lanternly.example/signup' }, c), { blocked: true, log: false });
  assert.deepStrictEqual(policy.decide({ method: 'POST', url: 'https://lanternly.example/contact' }, c), { blocked: true, log: false });
  assert.deepStrictEqual(policy.decide({ method: 'GET', url: 'https://api.lanternly.example/items' }, c), { blocked: false, log: false });
  const calls = [];
  const api = client(c, fakeFetch(calls));
  await assert.rejects(api.post('https://api.lanternly.example/signup', {}), /BLOCKED/);
  assert.strictEqual(calls.length, 0);
});
