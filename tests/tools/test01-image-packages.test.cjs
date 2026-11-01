'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Existing repository convention: compile isolated server modules, stub only
// the server-only marker. No env/client/network construction is permitted.
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name);
  const filename = `lib/server/image-packages/${name}.ts`;
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', js)(module, module.exports, dep => {
    if (dep === 'server-only') return {};
    if (dep.startsWith('./')) return load(dep.slice(2));
    throw Error(`Unexpected dependency ${dep}`);
  });
  cache.set(name, module.exports);
  return module.exports;
}
const contract = load('contract');
const { createTestImagePackageService } = load('service');
const { createImagePackageRepository } = load('repository');
const PURCHASE = '123e4567-e89b-42d3-a456-426614174000';
const SUBJECT = '223e4567-e89b-42d3-a456-426614174000';
const OTHER = '323e4567-e89b-42d3-a456-426614174000';
const OPERATION = '423e4567-e89b-42d3-a456-426614174000';
const NOW = '2026-11-01T08:00:00.000Z';
const EXPIRES = '2026-11-08T08:00:00.000Z';
const expected = {
  purchaseId: PURCHASE, subjectId: SUBJECT, provider: 'paypal_sandbox',
  packageCode: 'TEST-01', environment: 'TEST', amountMinor: 100, currency: 'USD',
};
const verified = { ...expected, paymentReference: 'TEST-CAPTURE-1', confirmedAt: NOW };
const granted = { ok: true, duplicate: false, purchaseId: PURCHASE, grantedAt: NOW, expiresAt: EXPIRES };
const reserved = { ok: true, duplicate: false, operationId: OPERATION, state: 'reserved', providerCostUsdMicros: 0 };
function fixture(options = {}) {
  const calls = [];
  const purchase = options.purchase ?? expected;
  const repo = {
    async createPurchase(value) { calls.push(['create', value]); return { ok: true }; },
    async findPurchase(id) { calls.push(['find', id]); return options.stored === undefined ? purchase : options.stored; },
    async readEntitlement(purchaseId, subjectId) { calls.push(['balance', purchaseId, subjectId]); return {
      ok: true, purchaseId, state: 'active', grantedAt: NOW, expiresAt: EXPIRES, initialRemaining: 5, revisionRemaining: 5,
    }; },
    async grantVerifiedPayment(payment, verifier) { calls.push(['grant', payment, verifier]); return options.grantResult ?? granted; },
    async reserve(value) { calls.push(['reserve', value]); return reserved; },
    async finish(value) { calls.push(['finish', value]); return { ...reserved, state: 'unknown' }; },
    ...options.repository,
  };
  const service = createTestImagePackageService({
    repository: repo,
    resolvePurchase: async () => options.binding === undefined ? purchase : options.binding,
    verifyCapture: async (request, stored) => {
      calls.push(['verify', request, stored]);
      return options.verified === undefined ? verified : options.verified;
    },
    authorizeOwner: async () => options.owner === undefined ? { role: 'owner', verifierId: 'TEST-owner' } : options.owner,
    now: () => new Date(NOW),
  });
  return { service, calls };
}

test('fixed TEST-01 is USD 1, separate five+five, seven days, frozen', () => {
  assert.deepEqual(contract.TEST_01, {
    packageCode: 'TEST-01', environment: 'TEST', amountMinor: 100, currency: 'USD',
    initialOutputs: 5, revisions: 5, validitySeconds: 604800,
  });
  assert.ok(Object.isFrozen(contract.TEST_01));
});

for (const [key, value] of Object.entries({
  purchaseId: OTHER, subjectId: OTHER, provider: 'manual_test', packageCode: 'OTHER',
  environment: 'LIVE', amountMinor: 99, currency: 'EUR', paymentReference: '\nprivate',
  confirmedAt: '2026-02-30T08:00:00.000Z',
})) {
  test(`verified capture mismatch ${key} never reaches grant`, async () => {
    const f = fixture({ verified: { ...verified, [key]: value } });
    assert.deepEqual(await f.service.confirmCapture({ status: 'paid' }), { ok: false, reason: 'invalid' });
    assert.equal(f.calls.filter(c => c[0] === 'grant').length, 0);
  });
}

test('server verifier receives exact stored purchase; browser status is insufficient', async () => {
  const f = fixture({ verified: null });
  const request = { confirmed: true, subjectId: SUBJECT, amountMinor: 100 };
  assert.deepEqual(await f.service.confirmCapture(request), { ok: false, reason: 'invalid' });
  assert.deepEqual(f.calls.find(c => c[0] === 'verify'), ['verify', request, expected]);
  assert.equal(f.calls.some(c => c[0] === 'grant'), false);
});

test('missing authenticated binding and wrong stored subject fail before verifier', async () => {
  for (const options of [{ binding: null }, { stored: null }, { stored: { ...expected, subjectId: OTHER } }]) {
    const f = fixture(options);
    assert.deepEqual(await f.service.confirmCapture({}), { ok: false, reason: 'denied' });
    assert.equal(f.calls.some(c => ['verify', 'grant'].includes(c[0])), false);
  }
});

test('future capture timestamp cannot extend entitlement', async () => {
  const f = fixture({ verified: { ...verified, confirmedAt: EXPIRES } });
  assert.deepEqual(await f.service.confirmCapture({}), { ok: false, reason: 'invalid' });
  assert.equal(f.calls.some(c => c[0] === 'grant'), false);
});

test('first server confirmation starts validity, not an old capture creation time', async () => {
  const f = fixture({ verified: { ...verified, confirmedAt: '2026-10-30T08:00:00.000Z' } });
  assert.equal((await f.service.confirmCapture({})).ok, true);
  assert.equal(f.calls.find(c => c[0] === 'grant')[1].confirmedAt, NOW);
});

test('verified capture enters one atomic grant RPC; repeated grant uses repository idempotency', async () => {
  const f = fixture({ grantResult: { ...granted, duplicate: true }, verified: { ...verified, rawProviderData: 'never persist' } });
  assert.deepEqual(await f.service.confirmCapture({}), { ...granted, duplicate: true });
  assert.deepEqual(f.calls.find(c => c[0] === 'grant'), ['grant', verified, null]);
  assert.equal(f.calls.filter(c => c[0] === 'grant').length, 1);
});

const manual = { ...expected, provider: 'manual_test' };
const evidence = { reference: 'TEST-MANUAL-1', amountMinor: 100, currency: 'USD' };
test('manual requires explicit Owner; generic admin and body owner flag cannot authorize', async () => {
  for (const owner of [null, { role: 'admin', verifierId: 'TEST-admin' }, { role: 'owner', verifierId: '' }]) {
    const f = fixture({ purchase: manual, owner });
    assert.deepEqual(await f.service.confirmManualTest({ owner: true }, evidence), { ok: false, reason: 'denied' });
    assert.equal(f.calls.length, 0);
  }
});

test('manual TEST evidence shares grant path; verifier and timestamp are server supplied', async () => {
  const f = fixture({ purchase: manual });
  assert.equal((await f.service.confirmManualTest({}, {
    ...evidence, verifierId: 'attacker', confirmedAt: '2099-01-01', rawData: 'never persist',
  })).ok, true);
  assert.deepEqual(f.calls.find(c => c[0] === 'grant'), ['grant', {
    ...manual, paymentReference: evidence.reference, confirmedAt: NOW,
  }, 'TEST-owner']);
});

test('manual rejects non-TEST reference, incorrect amount/currency and PayPal purchase', async () => {
  for (const change of [{ reference: 'receipt-1' }, { amountMinor: 1000 }, { currency: 'TWD' }]) {
    const f = fixture({ purchase: manual });
    assert.deepEqual(await f.service.confirmManualTest({}, { ...evidence, ...change }), { ok: false, reason: 'invalid' });
    assert.equal(f.calls.some(c => c[0] === 'grant'), false);
  }
  assert.deepEqual(await fixture().service.confirmManualTest({}, evidence), { ok: false, reason: 'denied' });
});

test('invalid package cannot create purchase; unavailable storage never reports confirmed', async () => {
  const f = fixture({ stored: 'unavailable' });
  assert.deepEqual(await f.service.createPurchase({ ...expected, environment: 'LIVE' }), { ok: false, reason: 'invalid' });
  assert.deepEqual(await f.service.confirmCapture({}), { ok: false, reason: 'unavailable' });
  const throwing = fixture({ repository: { async grantVerifiedPayment() { throw Error('private payload'); } } });
  assert.deepEqual(await throwing.service.confirmCapture({}), { ok: false, reason: 'unavailable' });
});

test('only typed reservation kinds and authoritative terminal outcomes are accepted', async () => {
  const f = fixture();
  const use = { purchaseId: PURCHASE, subjectId: SUBJECT, operationId: OPERATION, kind: 'initial' };
  assert.deepEqual(await f.service.reserve(use), reserved);
  assert.deepEqual(await f.service.reserve({ ...use, kind: 'free' }), { ok: false, reason: 'invalid' });
  for (const cost of [-1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.deepEqual(await f.service.finish({ ...use, outcome: 'unknown', providerCostUsdMicros: cost }), { ok: false, reason: 'invalid' });
  }
  assert.deepEqual(await f.service.finish({ ...use, outcome: 'failed', providerCostUsdMicros: 0 }), { ok: false, reason: 'invalid' });
  assert.equal((await f.service.finish({ ...use, outcome: 'unknown', providerCostUsdMicros: 1234 })).state, 'unknown');
});

test('RPC mapping preserves atomic API and scrubs extra internal fields', async () => {
  const calls = [];
  const repo = createImagePackageRepository({ async rpc(name, args) {
    calls.push([name, args]);
    return { data: { ...granted, internal: 'private' }, error: null };
  } });
  assert.deepEqual(await repo.grantVerifiedPayment(verified, null), granted);
  assert.deepEqual(calls, [['novora_test_image_package_grant', { p_payment: verified, p_manual_verifier_id: null }]]);
});

test('RPC rejects malformed, mismatched, partial and transport-error success', async () => {
  for (const response of [
    { data: null, error: null }, { data: [granted], error: null },
    { data: { ...granted, purchaseId: OTHER }, error: null },
    { data: { ...granted, expiresAt: NOW }, error: null },
    { data: { ...granted, grantedAt: 'bad' }, error: null },
    { data: granted, error: { message: 'private server response' } }, null,
  ]) {
    const repo = createImagePackageRepository({ async rpc() { if (!response) throw Error('private'); return response; } });
    assert.deepEqual(await repo.grantVerifiedPayment(verified, null), { ok: false, reason: 'unavailable' });
  }
});

test('RPC preserves UNKNOWN/released states and rejects wrong operation; no retry primitive exists', async () => {
  for (const state of ['unknown', 'released', 'settled']) {
    const repo = createImagePackageRepository({ async rpc() { return { data: { ...reserved, state, duplicate: true, providerCostUsdMicros: 4567 }, error: null }; } });
    assert.deepEqual(await repo.reserve({ purchaseId: PURCHASE, subjectId: SUBJECT, operationId: OPERATION, kind: 'initial' }), {
      ...reserved, state, duplicate: true, providerCostUsdMicros: 4567,
    });
    assert.equal(Object.hasOwn(repo, 'retry'), false);
  }
  const repo = createImagePackageRepository({ async rpc() { return { data: { ...reserved, operationId: OTHER }, error: null }; } });
  assert.deepEqual(await repo.reserve({ operationId: OPERATION }), { ok: false, reason: 'unavailable' });
});

test('balance is scoped to resolved customer; unbound requests cannot read it', async () => {
  const f = fixture();
  assert.equal((await f.service.readEntitlement({ subjectId: OTHER })).initialRemaining, 5);
  assert.deepEqual(f.calls.find(c => c[0] === 'balance'), ['balance', PURCHASE, SUBJECT]);
  assert.deepEqual(await fixture({ binding: null }).service.readEntitlement({}), { ok: false, reason: 'denied' });
});

test('balance RPC validates remaining counts, expiry and exact purchase', async () => {
  const balance = { ok: true, purchaseId: PURCHASE, state: 'active', grantedAt: NOW, expiresAt: EXPIRES,
    initialRemaining: 2, revisionRemaining: 5 };
  const calls = [];
  const repo = createImagePackageRepository({ async rpc(name,args) {
    calls.push([name,args]); return { data: balance, error: null };
  } });
  assert.deepEqual(await repo.readEntitlement(PURCHASE,SUBJECT),balance);
  assert.deepEqual(calls,[['novora_test_image_package_balance',{p_purchase_id:PURCHASE,p_subject_id:SUBJECT}]]);
  for (const change of [{ initialRemaining: -1 }, { revisionRemaining: 6 }, { state: 'expired' }, { purchaseId: OTHER }]) {
    const bad = createImagePackageRepository({ async rpc() { return { data: { ...balance,...change }, error: null }; } });
    assert.deepEqual(await bad.readEntitlement(PURCHASE,SUBJECT),{ok:false,reason:'unavailable'});
  }
});

test('SQL candidate has independent counts, global capture identity, row locks, RLS and monotonic cost', () => {
  const sql = fs.readFileSync(path.join('docs', 'novora-test01-image-packages-candidate.sql'), 'utf8');
  assert.match(sql, /unique \(provider, payment_reference\)/);
  assert.match(sql, /operation_id uuid primary key/);
  assert.match(sql, /kind=p_use->>'kind' and state<>'released'\)>=5/);
  assert.match(sql, /greatest\(provider_cost_usd_micros,cost\)/);
  assert.match(sql, /interval '168 hours'/);
  assert.equal((sql.match(/enable row level security/g) || []).length, 2);
  assert.equal((sql.match(/security invoker set search_path/g) || []).length, 6);
  assert.ok((sql.match(/for update/g) || []).length >= 5);
  assert.match(sql, /from public, anon, authenticated/);
  assert.doesNotMatch(sql, /security definer|commercial_orders|commercial_quotations|delete from|execute format/i);
});
