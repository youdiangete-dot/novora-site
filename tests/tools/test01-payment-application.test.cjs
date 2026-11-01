'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Real B repository/service/store + C adapter + application. Only the RPC,
// protected identity and HTTP boundaries are fakes; no database/Sandbox proof.
const loaded = new Map();
function load(file) {
  file = path.resolve(file);
  if (loaded.has(file)) return loaded.get(file);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.deepEqual(js.diagnostics, []);
  const module = { exports: {} };
  loaded.set(file, module.exports);
  new Function('module', 'exports', 'require', js.outputText)(module, module.exports, dep => {
    if (dep === 'server-only') return {};
    if (dep === 'node:crypto') return require(dep);
    if (dep.startsWith('.')) return load(path.resolve(path.dirname(file), `${dep}.ts`));
    throw Error(`Unexpected dependency ${dep}`);
  });
  return module.exports;
}
const { createTestPackagePaymentApplication } = load('lib/server/image-packages/payment-application.ts');
const PURCHASE = '123e4567-e89b-42d3-a456-426614174000';
const SUBJECT = '223e4567-e89b-42d3-a456-426614174000';
const OTHER = '323e4567-e89b-42d3-a456-426614174000';
const MANUAL = '423e4567-e89b-42d3-a456-426614174000';
const OWNER = { scope: 'a'.repeat(64), identity: 'TEST-customer' };
const MERCHANT = 'TESTMERCHANT1';
const ORDER = 'TESTORDER0001';
const CAPTURE = 'TESTCAPTURE01';
const NOW = '2026-11-01T08:00:00.000Z';
const EXPIRES = '2026-11-08T08:00:00.000Z';
const expected = {
  purchaseId: PURCHASE, subjectId: SUBJECT, owner: OWNER, sandboxMerchantId: MERCHANT,
  provider: 'paypal_sandbox', packageCode: 'TEST-01', environment: 'TEST', amountMinor: 100, currency: 'USD',
};
const customerRequest = () => new Request('https://test.example.invalid/payment', {
  headers: { 'x-test-session': 'TEST-authenticated-customer' },
});
const adminRequest = () => new Request('https://test.example.invalid/admin/payment', {
  headers: { 'x-test-admin': 'TEST-protected-owner' },
});
function providerOrder(status, captureStatus = null, purchaseId = PURCHASE, orderId = ORDER) {
  return {
    id: orderId, intent: 'CAPTURE', status,
    purchase_units: [{ reference_id: purchaseId, custom_id: purchaseId,
      payee: { merchant_id: MERCHANT }, amount: { currency_code: 'USD', value: '1.00' },
      ...(captureStatus === null ? {} : { payments: { captures: [{
        id: CAPTURE, status: captureStatus, final_capture: true, custom_id: purchaseId,
        amount: { currency_code: 'USD', value: '1.00' }, create_time: '2026-10-30T08:00:00Z',
      }] } }),
    }],
    payer: { email_address: 'TEST-payer@example.invalid' }, rawSecret: 'TEST-never-persist',
  };
}

function fixture(options = {}) {
  const rpcCalls = [], httpCalls = [], grants = new Map(), references = new Map(), journal = new Map();
  const purchases = new Map([
    [PURCHASE, { ...expected, ...options.purchase }],
    [MANUAL, { ...expected, purchaseId: MANUAL, provider: 'manual_test', sandboxMerchantId: null }],
  ]);
  const orders = new Map();
  let status = 'CREATED', captureStatus = null, realGrantCount = 0, currentTime = NOW;
  const sameOwner = (a, b) => a?.scope === b.scope && a?.identity === b.identity;
  const clone = value => JSON.parse(JSON.stringify(value));
  const client = { async rpc(name, args) {
    rpcCalls.push([name, clone(args)]);
    if (options.rpcError?.(name, args)) return { data: null, error: { message: 'TEST private RPC error' } };
    let data;
    if (name === 'novora_test_image_package_find') {
      const p = purchases.get(args.p_purchase_id);
      data = p ? { ok: true, purchase: clone(p) } : { ok: false, reason: 'not_found' };
    } else if (name === 'novora_test_image_package_sandbox_purchase') {
      const p = purchases.get(args.p_purchase_id);
      data = p?.provider === 'paypal_sandbox' && sameOwner(args.p_owner, p.owner)
        ? { ok: true, purchase: { purchaseId: p.purchaseId, amountMinor: p.amountMinor, currency: p.currency,
          merchantId: p.sandboxMerchantId, providerOrderId: orders.get(p.purchaseId) || null } } : { ok: false };
    } else if (name === 'novora_test_image_package_sandbox_claim') {
      const p = purchases.get(args.p_purchase_id), key = `${args.p_purchase_id}/${args.p_kind}`;
      const prior = journal.get(key);
      if (!p || !sameOwner(args.p_owner, p.owner) ||
        (args.p_kind === 'capture' && args.p_order_id !== orders.get(p.purchaseId))) data = { claim: 'held' };
      else if (prior) data = prior.requestId === args.p_request_id && prior.fingerprint === args.p_fingerprint && prior.result
        ? { claim: 'completed', result: clone(prior.result) } : { claim: 'held' };
      else {
        // Synchronous fake atomic boundary; not evidence of actual SQL locking.
        journal.set(key, { requestId: args.p_request_id, fingerprint: args.p_fingerprint });
        data = { claim: 'acquired' };
      }
    } else if (name === 'novora_test_image_package_sandbox_complete') {
      const p = purchases.get(args.p_purchase_id), entry = journal.get(`${args.p_purchase_id}/${args.p_kind}`);
      if (!p || !sameOwner(args.p_owner, p.owner) || !entry || entry.requestId !== args.p_request_id ||
        entry.fingerprint !== args.p_fingerprint || (entry.result && JSON.stringify(entry.result) !== JSON.stringify(args.p_result))) data = { ok: false };
      else {
        const result = clone(args.p_result);
        const orderId = result.state === 'PAID' ? result.capture.providerOrderId : result.providerOrderId;
        if (!['UNKNOWN', 'REJECTED'].includes(result.state) && orderId) orders.set(p.purchaseId, orderId);
        entry.result = result;
        data = { ok: true };
      }
    } else if (name === 'novora_test_image_package_grant') {
      const payment = args.p_payment, p = purchases.get(payment.purchaseId);
      if (!p || ['purchaseId', 'subjectId', 'provider', 'packageCode', 'environment', 'amountMinor', 'currency']
        .some(key => payment[key] !== p[key])) data = { ok: false, reason: 'invalid' };
      else if ((p.provider === 'manual_test') !== (args.p_manual_verifier_id !== null)) data = { ok: false, reason: 'invalid' };
      else {
        const key = `${payment.provider}/${payment.paymentReference}`;
        const existing = grants.get(p.purchaseId);
        if ((references.has(key) && references.get(key) !== p.purchaseId) ||
          (existing && existing.reference !== payment.paymentReference)) data = { ok: false, reason: 'conflict' };
        else {
          if (!existing) {
            realGrantCount++;
            references.set(key, p.purchaseId);
            grants.set(p.purchaseId, { reference: payment.paymentReference, verifier: args.p_manual_verifier_id,
              grantedAt: payment.confirmedAt,
              expiresAt: new Date(Date.parse(payment.confirmedAt) + 604800000).toISOString() });
          }
          data = { ok: true, duplicate: !!existing, purchaseId: p.purchaseId,
            grantedAt: grants.get(p.purchaseId).grantedAt, expiresAt: grants.get(p.purchaseId).expiresAt };
        }
      }
    } else throw Error(`Unexpected RPC ${name}`);
    if (options.afterRpcError?.(name, args)) return { data: null, error: { message: 'TEST lost database ACK' } };
    return { data, error: null };
  } };
  const dependencies = {
    client,
    authenticateCustomer: async req => req.headers.get('x-test-session') === 'TEST-authenticated-customer'
      ? { subjectId: SUBJECT, owner: OWNER } : null,
    authorizeOwnerAdmin: async req => req.headers.get('x-test-admin') === 'TEST-protected-owner'
      ? { role: 'owner', verifierId: 'TEST-owner-verifier' } : null,
    sandboxMerchantId: MERCHANT,
    now: () => new Date(currentTime),
    sandbox: {
      endpoint: 'https://api-m.sandbox.paypal.com',
      credentials: { getAccessToken: async () => 'TEST_ACCESS_TOKEN' },
      http: async req => {
        httpCalls.push(req);
        if (options.respond) return options.respond(req, { status, captureStatus, setStatus: s => { status = s; }, providerOrder });
        if (req.method === 'POST' && req.url.endsWith('/capture')) { status = 'COMPLETED'; captureStatus = 'COMPLETED'; }
        return { status: 200, url: req.url, body: JSON.stringify(providerOrder(status, captureStatus)) };
      },
    },
    ...options.dependencies,
  };
  return {
    application: createTestPackagePaymentApplication(dependencies), dependencies,
    rpcCalls, httpCalls, grants, references, journal, purchases, orders,
    get grantCount() { return realGrantCount; },
    setStatus(next, capture = null) { status = next; captureStatus = capture; },
    setTime(time) { currentTime = time; },
  };
}

test('create/capture binds durable purchase and grants once through B with C verified capture', async () => {
  const f = fixture(), request = customerRequest();
  assert.deepEqual(await f.application.createCheckout(request, PURCHASE), {
    ok: true, state: 'checkout', providerOrderId: ORDER, paymentState: 'CREATED',
  });
  assert.equal(f.orders.get(PURCHASE), ORDER);
  assert.equal(f.grantCount, 0);
  f.setStatus('APPROVED');
  const result = await f.application.captureCheckout(request, PURCHASE);
  assert.deepEqual(result, { ok: true, state: 'confirmed', confirmation: {
    ok: true, duplicate: false, purchaseId: PURCHASE, grantedAt: NOW, expiresAt: EXPIRES,
  } });
  assert.equal(f.grantCount, 1);
  const grant = f.rpcCalls.find(([name]) => name.endsWith('_grant'))[1];
  assert.deepEqual(grant, { p_payment: {
    provider: 'paypal_sandbox', paymentReference: CAPTURE, purchaseId: PURCHASE, subjectId: SUBJECT,
    packageCode: 'TEST-01', environment: 'TEST', amountMinor: 100, currency: 'USD', confirmedAt: NOW,
  }, p_manual_verifier_id: null });
  assert.doesNotMatch(JSON.stringify(grant), /TEST_ACCESS_TOKEN|rawSecret|email_address|providerOrderId|capturedAt/);
  f.setTime('2026-11-02T08:00:00.000Z');
  const duplicate = await f.application.captureCheckout(request, PURCHASE);
  assert.equal(duplicate.confirmation.duplicate, true);
  assert.equal(duplicate.confirmation.expiresAt, EXPIRES);
  assert.equal(f.grantCount, 1);
  assert.equal(f.httpCalls.filter(req => req.method === 'POST' && req.url.endsWith('/capture')).length, 1);
});

test('repeated create and page refresh reuse mapping and never create a fresh purchase/order', async () => {
  const f = fixture();
  await f.application.createCheckout(customerRequest(), PURCHASE);
  const restarted = createTestPackagePaymentApplication(f.dependencies);
  const result = await restarted.createCheckout(customerRequest(), PURCHASE);
  assert.equal(result.state, 'checkout');
  assert.equal(f.httpCalls.filter(req => req.method === 'POST').length, 1);
  assert.equal(f.rpcCalls.some(([name]) => name.endsWith('_create')), false);
});

test('forged body claims cannot replace authenticated owner/subject or order mapping', async () => {
  for (const change of [{ subjectId: OTHER }, { owner: { ...OWNER, identity: 'TEST-other' } },
    { owner: { ...OWNER, scope: 'b'.repeat(64) } }]) {
    const f = fixture({ purchase: change });
    assert.deepEqual(await f.application.createCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'denied' });
    assert.equal(f.httpCalls.length, 0);
  }
  const f = fixture();
  const forged = new Request('https://test.example.invalid/payment', { method: 'POST',
    body: JSON.stringify({ owner: OWNER, subjectId: SUBJECT, paid: true, capture: CAPTURE, providerOrderId: ORDER }) });
  assert.deepEqual(await f.application.captureCheckout(forged, PURCHASE), { ok: false, reason: 'denied' });
  assert.equal(f.rpcCalls.length, 0);
  assert.equal(f.httpCalls.length, 0);
  assert.equal(f.grantCount, 0);
});

test('wrong stored amount/currency or current merchant never reaches PayPal or grant', async () => {
  for (const change of [{ amountMinor: 99 }, { currency: 'EUR' }, { sandboxMerchantId: 'OTHERMERCHANT' }]) {
    const f = fixture({ purchase: change });
    assert.equal((await f.application.createCheckout(customerRequest(), PURCHASE)).ok, false);
    assert.equal(f.httpCalls.length, 0);
    assert.equal(f.grantCount, 0);
  }
});

test('PayPal amount/currency/merchant/purchase/order mismatches never grant', async () => {
  for (const mutate of [
    b => { b.purchase_units[0].amount.value = '2.00'; },
    b => { b.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR'; },
    b => { b.purchase_units[0].payee.merchant_id = 'OTHERMERCHANT'; },
    b => { b.purchase_units[0].custom_id = OTHER; },
    b => { b.id = 'WRONGORDER'; },
  ]) {
    let corrupt = false;
    const f = fixture({ respond: async req => {
      const body = corrupt ? providerOrder('COMPLETED', 'COMPLETED') : providerOrder('CREATED');
      if (corrupt) mutate(body);
      return { status: 200, url: req.url, body: JSON.stringify(body) };
    } });
    await f.application.createCheckout(customerRequest(), PURCHASE);
    corrupt = true;
    assert.deepEqual(await f.application.captureCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'unknown' });
    assert.equal(f.grantCount, 0);
    assert.equal(f.httpCalls.filter(req => req.method === 'POST').length, 1);
  }
});

test('unknown create stays held across restart with no new POST or invented order mapping', async () => {
  const f = fixture({ respond: async () => { throw Error('TEST timeout after possible create'); } });
  assert.deepEqual(await f.application.createCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'unknown' });
  const restarted = createTestPackagePaymentApplication(f.dependencies);
  assert.deepEqual(await restarted.createCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'unknown' });
  assert.deepEqual(await restarted.reconcileCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'unknown' });
  assert.equal(f.httpCalls.length, 1);
  assert.equal(f.orders.size, 0);
  assert.equal(f.grantCount, 0);
});

test('ambiguous capture reconciles by read and grants once without a second capture', async () => {
  let status = 'CREATED', captureStatus = null;
  const f = fixture({ respond: async req => {
    if (req.url.endsWith('/capture')) { status = 'COMPLETED'; captureStatus = 'COMPLETED'; throw Error('TEST lost ACK'); }
    return { status: 200, url: req.url, body: JSON.stringify(providerOrder(status, captureStatus)) };
  } });
  await f.application.createCheckout(customerRequest(), PURCHASE);
  status = 'APPROVED';
  assert.deepEqual(await f.application.captureCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'unknown' });
  assert.equal(f.grantCount, 0);
  const result = await f.application.reconcileCheckout(customerRequest(), PURCHASE);
  assert.equal(result.state, 'confirmed');
  assert.equal(f.grantCount, 1);
  assert.equal((await f.application.reconcileCheckout(customerRequest(), PURCHASE)).confirmation.duplicate, true);
  assert.equal(f.grantCount, 1);
  assert.equal(f.httpCalls.filter(req => req.url.endsWith('/capture')).length, 1);
});

test('pending/denied/cancelled/reversed results do not grant', async () => {
  const f = fixture();
  await f.application.createCheckout(customerRequest(), PURCHASE);
  for (const [status, capture, expectedState] of [
    ['COMPLETED', 'PENDING', 'checkout'], ['COMPLETED', 'DECLINED', 'payment_denied'],
    ['VOIDED', null, 'payment_cancelled'], ['COMPLETED', 'REFUNDED', 'payment_reversed'],
  ]) {
    f.setStatus(status, capture);
    const result = await f.application.reconcileCheckout(customerRequest(), PURCHASE);
    assert.equal(result.state || result.reason, expectedState);
  }
  assert.equal(f.grantCount, 0);
});

test('parallel capture callers share durable claim and unique grant policy', async () => {
  const f = fixture();
  await f.application.createCheckout(customerRequest(), PURCHASE);
  f.setStatus('APPROVED');
  const results = await Promise.all([
    f.application.captureCheckout(customerRequest(), PURCHASE),
    f.application.captureCheckout(customerRequest(), PURCHASE),
  ]);
  assert.equal(results.filter(r => r.state === 'confirmed').length >= 1, true);
  assert.equal(f.grantCount, 1);
  assert.equal(f.httpCalls.filter(req => req.url.endsWith('/capture')).length, 1);
});

test('Owner-only manual confirmation uses same seven-day atomic grant and stable replay', async () => {
  const f = fixture(), evidence = { reference: 'TEST-MANUAL-1', amountMinor: 100, currency: 'USD' };
  assert.deepEqual(await f.application.confirmManualTest(customerRequest(), MANUAL, evidence), { ok: false, reason: 'denied' });
  assert.equal(f.rpcCalls.length, 0);
  const genericAdmin = fixture({ dependencies: {
    authorizeOwnerAdmin: async () => ({ role: 'admin', verifierId: 'TEST-generic-admin' }),
  } });
  assert.deepEqual(await genericAdmin.application.confirmManualTest(adminRequest(), MANUAL, evidence), { ok: false, reason: 'denied' });
  assert.equal(genericAdmin.rpcCalls.length, 0);
  for (const change of [{ amountMinor: 101 }, { currency: 'TWD' }, { reference: 'LIVE-reference' }]) {
    assert.equal((await f.application.confirmManualTest(adminRequest(), MANUAL, { ...evidence, ...change })).ok, false);
  }
  const result = await f.application.confirmManualTest(adminRequest(), MANUAL, {
    ...evidence, verifierId: 'TEST-forged', confirmedAt: '2099-01-01', rawReceipt: 'TEST-never-persist',
  });
  assert.equal(result.state, 'confirmed');
  assert.equal(result.confirmation.expiresAt, EXPIRES);
  assert.equal(f.grantCount, 1);
  f.setTime('2026-11-02T08:00:00.000Z');
  const duplicate = await f.application.confirmManualTest(adminRequest(), MANUAL, evidence);
  assert.equal(duplicate.confirmation.duplicate, true);
  assert.equal(duplicate.confirmation.expiresAt, EXPIRES);
  assert.equal(f.grants.get(MANUAL).verifier, 'TEST-owner-verifier');
  assert.equal(f.grantCount, 1);
  assert.equal(f.httpCalls.length, 0);
  assert.doesNotMatch(JSON.stringify(f.rpcCalls), /TEST-forged|rawReceipt|2099/);
});

test('grant storage uncertainty cannot become confirmed; replay cannot grant twice', async () => {
  let unavailable = true;
  const f = fixture({ rpcError: name => name.endsWith('_grant') && unavailable });
  await f.application.createCheckout(customerRequest(), PURCHASE);
  f.setStatus('COMPLETED', 'COMPLETED');
  assert.deepEqual(await f.application.reconcileCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'unavailable' });
  assert.equal(f.grantCount, 0);
  unavailable = false;
  assert.equal((await f.application.reconcileCheckout(customerRequest(), PURCHASE)).state, 'confirmed');
  assert.equal((await f.application.reconcileCheckout(customerRequest(), PURCHASE)).confirmation.duplicate, true);
  assert.equal(f.grantCount, 1);
});

test('duplicate capture identity cannot grant a second stored purchase', async () => {
  const f = fixture();
  await f.application.createCheckout(customerRequest(), PURCHASE);
  f.setStatus('COMPLETED', 'COMPLETED');
  assert.equal((await f.application.reconcileCheckout(customerRequest(), PURCHASE)).state, 'confirmed');
  // A second trusted purchase/order still cannot reuse the provider capture ID.
  f.purchases.set(OTHER, { ...expected, purchaseId: OTHER });
  f.orders.set(OTHER, 'TESTORDER0002');
  f.dependencies.sandbox.http = async req => ({ status: 200, url: req.url,
    body: JSON.stringify(providerOrder('COMPLETED', 'COMPLETED', OTHER, 'TESTORDER0002')) });
  assert.deepEqual(await f.application.reconcileCheckout(customerRequest(), OTHER), { ok: false, reason: 'conflict' });
  assert.equal(f.grantCount, 1);
});

test('lost grant ACK preserves first confirmation/expiry and cannot cause another grant', async () => {
  let loseAck = true;
  const f = fixture({ afterRpcError: name => name.endsWith('_grant') && loseAck });
  await f.application.createCheckout(customerRequest(), PURCHASE);
  f.setStatus('COMPLETED', 'COMPLETED');
  assert.deepEqual(await f.application.reconcileCheckout(customerRequest(), PURCHASE), { ok: false, reason: 'unavailable' });
  assert.equal(f.grantCount, 1, 'database fake committed before losing the ACK');
  loseAck = false;
  f.setTime('2026-11-02T08:00:00.000Z');
  const result = await f.application.reconcileCheckout(customerRequest(), PURCHASE);
  assert.equal(result.confirmation.duplicate, true);
  assert.equal(result.confirmation.grantedAt, NOW);
  assert.equal(result.confirmation.expiresAt, EXPIRES);
  assert.equal(f.grantCount, 1);
});
