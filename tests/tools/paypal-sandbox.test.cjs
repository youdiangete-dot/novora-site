'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Match existing tests/tools convention. Unlisted imports and real network fail closed.
function loadSource(file, deps) {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.deepEqual(js.diagnostics, []);
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js.outputText)(module, module.exports, name => {
    assert.ok(Object.hasOwn(deps, name), `unexpected dependency ${name}`);
    return deps[name];
  });
  return module.exports;
}
const currency = loadSource('lib/server/commercial-currency.ts', { 'server-only': {} });
const { createPayPalSandboxAdapter, PAYPAL_SANDBOX_ORIGIN } = loadSource(
  'lib/server/paypal-sandbox/adapter.ts',
  { 'server-only': {}, 'node:crypto': require('node:crypto'), '../commercial-currency': currency },
);
const purchase = Object.freeze({
  purchaseId: '123e4567-e89b-42d3-a456-426614174000',
  amountMinor: 100, currency: 'USD', merchantId: 'TESTMERCHANT1',
});
const ORDER = 'TESTORDER0001';
const CAPTURE = 'TESTCAPTURE01';
function order(status = 'COMPLETED', captureStatus = 'COMPLETED') {
  return {
    id: ORDER, intent: 'CAPTURE', status,
    purchase_units: [{
      reference_id: purchase.purchaseId, custom_id: purchase.purchaseId,
      amount: { currency_code: 'USD', value: '1.00' },
      payee: { merchant_id: purchase.merchantId },
      ...(captureStatus === null ? {} : { payments: { captures: [{
        id: CAPTURE, status: captureStatus, final_capture: true,
        amount: { currency_code: 'USD', value: '1.00' }, custom_id: purchase.purchaseId,
        create_time: '2026-11-01T08:00:00Z',
      }] } }),
    }],
    // Deliberate private fields must never escape normalized output.
    payer: { email_address: 'TEST@example.invalid' }, links: [{ href: 'https://evil.invalid/' }],
  };
}
function memoryStore() {
  // Test-only. Production integration must supply durable atomic operations.
  const entries = new Map();
  return {
    entries,
    async claim(op) {
      const prior = entries.get(op.requestId);
      if (prior) return prior.fingerprint === op.fingerprint && prior.result
        ? { completed: prior.result } : 'held';
      entries.set(op.requestId, { fingerprint: op.fingerprint });
      return 'acquired';
    },
    async complete(op, result) {
      const prior = entries.get(op.requestId);
      if (!prior || prior.fingerprint !== op.fingerprint || prior.result) return false;
      prior.result = result;
      return true;
    },
  };
}
function fixture(respond = () => order(), overrides = {}) {
  const calls = [];
  const operations = overrides.operations || memoryStore();
  const dependencies = {
    endpoint: PAYPAL_SANDBOX_ORIGIN,
    credentials: { getAccessToken: async () => 'TEST_ACCESS_TOKEN' }, operations,
    http: async req => {
      calls.push(req);
      const body = await respond(req, calls.length);
      return { status: 200, url: req.url, body: JSON.stringify(body) };
    },
    ...overrides,
  };
  return { calls, operations, dependencies, adapter: createPayPalSandboxAdapter(dependencies) };
}

test('create uses Sandbox only, server price/binding, exact decimal, stable operation IDs', async () => {
  const f = fixture(() => order('CREATED', null));
  assert.deepEqual(await f.adapter.create(purchase), { state: 'CREATED', providerOrderId: ORDER });
  const req = f.calls[0];
  assert.equal(req.url, `${PAYPAL_SANDBOX_ORIGIN}/v2/checkout/orders`);
  assert.equal(req.method, 'POST');
  assert.equal(req.redirect, 'error');
  assert.equal(req.headers.Prefer, 'return=representation');
  assert.ok(req.headers['PayPal-Request-Id'].length <= 38);
  const payload = JSON.parse(req.body);
  assert.equal(payload.intent, 'CAPTURE');
  assert.equal(payload.purchase_units[0].custom_id, purchase.purchaseId);
  assert.equal(payload.purchase_units[0].reference_id, purchase.purchaseId);
  assert.deepEqual(payload.purchase_units[0].payee, { merchant_id: purchase.merchantId });
  assert.deepEqual(payload.purchase_units[0].amount, { currency_code: 'USD', value: '1.00' });
  assert.equal(payload.payment_source.paypal.experience_context.shipping_preference, 'NO_SHIPPING');
  assert.deepEqual(await createPayPalSandboxAdapter(f.dependencies).create(purchase), { state: 'CREATED', providerOrderId: ORDER });
  assert.equal(f.calls.length, 1, 'restart/repeated create must not POST twice');
});

test('reject live, lookalike, credential-bearing and non-origin endpoints before credentials', () => {
  for (const endpoint of [
    'https://api-m.paypal.com', 'http://api-m.sandbox.paypal.com',
    'https://api-m.sandbox.paypal.com.evil.invalid', 'https://evil@api-m.sandbox.paypal.com',
    `${PAYPAL_SANDBOX_ORIGIN}:443`, `${PAYPAL_SANDBOX_ORIGIN}/v2`, `${PAYPAL_SANDBOX_ORIGIN}?x=1`,
    `${PAYPAL_SANDBOX_ORIGIN}#x`,
  ]) assert.throws(() => fixture(undefined, { endpoint }), /Sandbox endpoint required/);
});

test('invalid input never calls credentials, journal, or transport', async () => {
  const f = fixture(() => { throw Error('unexpected'); });
  for (const changes of [
    { purchaseId: 'customer-controlled' }, { amountMinor: -1 }, { amountMinor: 0 },
    { amountMinor: 1.5 }, { amountMinor: Number.MAX_SAFE_INTEGER + 1 },
    { currency: 'TWD' }, { currency: 'usd' }, { merchantId: 'invalid' }, { merchantId: 1234567890123 },
  ]) assert.deepEqual(await f.adapter.create({ ...purchase, ...changes }), { state: 'REJECTED', reason: 'invalid_input' });
  for (const id of ['../../live', 'ORDER?x=1', 'ORDER/ID', '', 123]) {
    assert.equal((await f.adapter.capture(purchase, id)).state, 'REJECTED');
  }
  assert.equal(f.calls.length, 0);
  assert.equal(f.operations.entries.size, 0);
});

test('capture preflights order and returns minimal verified data; repeated capture only reads', async () => {
  let settled = false;
  const f = fixture(req => {
    if (req.method === 'POST') settled = true;
    return settled ? order() : order('APPROVED', null);
  });
  const result = await f.adapter.capture(purchase, ORDER);
  assert.deepEqual(result, { state: 'PAID', capture: {
    providerKey: 'paypal_sandbox', purchaseId: purchase.purchaseId,
    providerOrderId: ORDER, providerCaptureId: CAPTURE, amountMinor: 100, currency: 'USD',
    merchantId: purchase.merchantId, capturedAt: '2026-11-01T08:00:00.000Z',
  } });
  assert.equal(f.calls[0].method, 'GET');
  assert.equal(f.calls[1].url, `${PAYPAL_SANDBOX_ORIGIN}/v2/checkout/orders/${ORDER}/capture`);
  assert.equal(f.calls[1].method, 'POST');
  assert.equal(f.calls[2].method, 'GET');
  assert.deepEqual(await f.adapter.capture(purchase, ORDER), result);
  assert.equal(f.calls.filter(x => x.method === 'POST').length, 1);
  assert.doesNotMatch(JSON.stringify(result), /TEST_ACCESS_TOKEN|email_address|links|payer/);
});

test('create and capture request identities differ and changed price cannot reuse purchase operation', async () => {
  let created = false;
  const f = fixture(req => {
    if (req.url.endsWith('/capture')) return order();
    if (req.method === 'POST') { created = true; return order('CREATED', null); }
    return order('APPROVED', null);
  });
  await f.adapter.create(purchase);
  await f.adapter.capture(purchase, ORDER);
  const posts = f.calls.filter(x => x.method === 'POST');
  assert.ok(created);
  assert.notEqual(posts[0].headers['PayPal-Request-Id'], posts[1].headers['PayPal-Request-Id']);
  assert.equal((await f.adapter.create({ ...purchase, amountMinor: 200 })).state, 'UNKNOWN');
  assert.equal(f.calls.filter(x => x.method === 'POST').length, 2);
});

test('parallel create holds second caller while first is in flight', async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const f = fixture(async () => { await wait; return order('CREATED', null); });
  const first = f.adapter.create(purchase);
  const second = await f.adapter.create(purchase);
  assert.equal(second.state, 'UNKNOWN');
  assert.equal(second.reason, 'held');
  release();
  assert.equal((await first).state, 'CREATED');
  assert.equal(f.calls.length, 1);
});

test('network ambiguity stays UNKNOWN across restart; known order reconciles by GET only', async () => {
  const f = fixture(() => { throw Error('TEST private response and token'); });
  assert.deepEqual(await f.adapter.create(purchase), { state: 'UNKNOWN', reason: 'transport' });
  assert.deepEqual(await createPayPalSandboxAdapter(f.dependencies).create(purchase), { state: 'UNKNOWN', reason: 'transport' });
  assert.equal(f.calls.length, 1);
  const reader = createPayPalSandboxAdapter({ ...f.dependencies, http: async req => {
    f.calls.push(req); return { status: 200, url: req.url, body: JSON.stringify(order()) };
  } });
  assert.equal((await reader.reconcile(purchase, ORDER)).state, 'PAID');
  assert.equal(f.calls.at(-1).method, 'GET');
});

test('capture UNKNOWN cannot dispatch twice even if provider still says APPROVED', async () => {
  const f = fixture(req => {
    if (req.method === 'POST') throw Error('TEST timeout after accepted');
    return order('APPROVED', null);
  });
  assert.equal((await f.adapter.capture(purchase, ORDER)).state, 'UNKNOWN');
  assert.equal((await createPayPalSandboxAdapter(f.dependencies).capture(purchase, ORDER)).state, 'UNKNOWN');
  assert.equal(f.calls.filter(x => x.method === 'POST').length, 1);
});

for (const [name, body, state] of [
  ['pending capture', () => order('COMPLETED', 'PENDING'), 'PENDING'],
  ['declined capture', () => order('COMPLETED', 'DECLINED'), 'DENIED'],
  ['failed capture', () => order('COMPLETED', 'FAILED'), 'DENIED'],
  ['voided order', () => order('VOIDED', null), 'CANCELLED'],
  ['refunded capture', () => order('COMPLETED', 'REFUNDED'), 'REVERSED'],
  ['partially refunded capture', () => order('COMPLETED', 'PARTIALLY_REFUNDED'), 'REVERSED'],
  ['created order', () => order('CREATED', null), 'CREATED'],
  ['payer action required', () => order('PAYER_ACTION_REQUIRED', null), 'PENDING'],
  ['completed without capture', () => order('COMPLETED', null), 'UNKNOWN'],
  ['invented cancellation status', () => order('CANCELLED', null), 'UNKNOWN'],
]) test(`${name} is never proof of payment`, async () => {
  const f = fixture(body);
  const result = await f.adapter.reconcile(purchase, ORDER);
  assert.equal(result.state, state);
  assert.equal(result.capture, undefined);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].method, 'GET');
});

for (const [name, change] of [
  ['order ID', b => { b.id = 'OTHERORDER'; }],
  ['intent', b => { b.intent = 'AUTHORIZE'; }],
  ['purchase ID', b => { b.purchase_units[0].custom_id = 'other-purchase'; }],
  ['unit reference', b => { b.purchase_units[0].reference_id = 'other-reference'; }],
  ['merchant', b => { b.purchase_units[0].payee.merchant_id = 'OTHERSELLER01'; }],
  ['missing merchant', b => { delete b.purchase_units[0].payee; }],
  ['unit amount', b => { b.purchase_units[0].amount.value = '2.00'; }],
  ['unit currency', b => { b.purchase_units[0].amount.currency_code = 'TWD'; }],
  ['capture amount', b => { b.purchase_units[0].payments.captures[0].amount.value = '0.99'; }],
  ['capture currency', b => { b.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR'; }],
  ['capture purchase binding', b => { b.purchase_units[0].payments.captures[0].custom_id = 'other'; }],
  ['partial capture', b => { b.purchase_units[0].payments.captures[0].final_capture = false; }],
  ['multiple captures', b => { b.purchase_units[0].payments.captures.push(b.purchase_units[0].payments.captures[0]); }],
  ['multiple units', b => { b.purchase_units.push(b.purchase_units[0]); }],
  ['invalid timestamp', b => { b.purchase_units[0].payments.captures[0].create_time = 'yesterday'; }],
  ['impossible calendar timestamp', b => { b.purchase_units[0].payments.captures[0].create_time = '2026-02-30T00:00:00Z'; }],
]) test(`mismatched ${name} holds UNKNOWN without paid data`, async () => {
  const b = order(); change(b);
  const f = fixture(() => b);
  const result = await f.adapter.capture(purchase, ORDER);
  assert.equal(result.state, 'UNKNOWN');
  assert.equal(result.capture, undefined);
  assert.equal(f.calls.filter(x => x.method === 'POST').length, 0);
});

test('malformed JSON, HTTP errors, redirected URLs, and oversized responses remain UNKNOWN', async () => {
  for (const response of [
    { status: 201, body: '{' }, { status: 500, body: '{}' }, { status: 422, body: '{"name":"ORDER_ALREADY_CAPTURED"}' },
    { status: 200, url: 'https://api-m.paypal.com/v2/checkout/orders', body: '{}' },
    { status: 302, body: '{}' }, { status: 200, body: 'x'.repeat(131073) },
  ]) {
    let calls = 0;
    const f = fixture(undefined, { http: async req => { calls++; return { url: req.url, ...response }; } });
    assert.equal((await f.adapter.create(purchase)).state, 'UNKNOWN');
    assert.equal((await f.adapter.create(purchase)).state, 'UNKNOWN');
    assert.equal(calls, 1);
  }
});

test('timeout aborts transport and late successful response cannot overwrite UNKNOWN', async () => {
  let release, signal;
  const wait = new Promise(resolve => { release = resolve; });
  const f = fixture(undefined, { timeoutMs: 5, http: async req => {
    signal = req.signal;
    await wait;
    return { url: req.url, status: 201, body: JSON.stringify(order()) };
  } });
  assert.equal((await f.adapter.create(purchase)).state, 'UNKNOWN');
  assert.equal(signal.aborted, true);
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await f.adapter.create(purchase)).state, 'UNKNOWN');
  assert.equal(f.operations.entries.size, 1);
});

test('journal and credentials failure never leak private error text or allow unrecorded POST', async () => {
  const error = Error('TEST private credential details');
  for (const operations of [
    { claim: async () => { throw error; }, complete: async () => true },
    { claim: async () => 'held', complete: async () => true },
  ]) {
    const f = fixture(undefined, { operations });
    assert.equal((await f.adapter.create(purchase)).state, 'UNKNOWN');
    assert.equal(f.calls.length, 0);
  }
  const f = fixture(undefined, { credentials: { getAccessToken: async () => { throw error; } } });
  assert.deepEqual(await f.adapter.create(purchase), { state: 'UNKNOWN', reason: 'transport' });
  assert.equal(f.calls.length, 0);
  const g = fixture(() => order(), { operations: { claim: async () => 'acquired', complete: async () => false } });
  assert.equal((await g.adapter.create(purchase)).state, 'UNKNOWN');
});

test('concurrent capture performs at most one POST and binds the same durable operation', async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const f = fixture(async req => {
    if (req.method === 'POST') { await wait; return order('COMPLETED', 'PENDING'); }
    return order('APPROVED', null);
  });
  const first = f.adapter.capture(purchase, ORDER);
  await new Promise(resolve => setImmediate(resolve));
  const second = await f.adapter.capture(purchase, ORDER);
  assert.deepEqual(second, { state: 'UNKNOWN', reason: 'held', providerOrderId: ORDER });
  release();
  assert.equal((await first).state, 'PENDING');
  assert.equal(f.calls.filter(x => x.method === 'POST').length, 1);
});

test('capture POST mismatch cannot become a verified capture or authorize a retry', async () => {
  const f = fixture(req => {
    if (req.method === 'GET') return order('APPROVED', null);
    const response = order(); response.purchase_units[0].payments.captures[0].amount.value = '5.00';
    return response;
  });
  assert.equal((await f.adapter.capture(purchase, ORDER)).state, 'UNKNOWN');
  assert.equal((await f.adapter.capture(purchase, ORDER)).state, 'UNKNOWN');
  assert.equal(f.calls.filter(x => x.method === 'POST').length, 1);
});

test('current reversal overrides an earlier successful capture instead of replaying PAID', async () => {
  let status = 'APPROVED';
  const f = fixture(req => {
    if (req.method === 'POST') status = 'COMPLETED';
    return status === 'APPROVED' ? order('APPROVED', null) : order('COMPLETED', status);
  });
  assert.equal((await f.adapter.capture(purchase, ORDER)).state, 'PAID');
  status = 'REFUNDED';
  assert.equal((await f.adapter.capture(purchase, ORDER)).state, 'REVERSED');
  assert.equal(f.calls.filter(x => x.method === 'POST').length, 1);
});

test('purchase values are snapshotted before an awaited claim can mutate caller memory', async () => {
  const mutable = { ...purchase };
  const operations = memoryStore();
  const claim = operations.claim.bind(operations);
  operations.claim = async op => { mutable.amountMinor = 500; return claim(op); };
  const f = fixture(() => order('CREATED', null), { operations });
  assert.equal((await f.adapter.create(mutable)).state, 'CREATED');
  assert.equal(JSON.parse(f.calls[0].body).purchase_units[0].amount.value, '1.00');
});
