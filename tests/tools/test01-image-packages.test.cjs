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
    if (dep === 'node:crypto') return require('node:crypto');
    if (dep.startsWith('./')) return load(dep.slice(2));
    throw Error(`Unexpected dependency ${dep}`);
  });
  cache.set(name, module.exports);
  return module.exports;
}
const contract = load('contract');
const { createTestImagePackageService } = load('service');
const { createImagePackageRepository } = load('repository');
const { createDurableSandboxOperationStore, sandboxOperationFor } = load('sandbox-store');
const PURCHASE = '123e4567-e89b-42d3-a456-426614174000';
const SUBJECT = '223e4567-e89b-42d3-a456-426614174000';
const OTHER = '323e4567-e89b-42d3-a456-426614174000';
const OPERATION = '423e4567-e89b-42d3-a456-426614174000';
const NOW = '2026-11-01T08:00:00.000Z';
const EXPIRES = '2026-11-08T08:00:00.000Z';
const expected = {
  purchaseId: PURCHASE, subjectId: SUBJECT, provider: 'paypal_sandbox',
  owner: { scope: 'a'.repeat(64), identity: 'TEST-owner' }, sandboxMerchantId: 'TESTMERCHANT1',
  packageCode: 'TEST-01', environment: 'TEST', amountMinor: 100, currency: 'USD',
};
const { owner: OWNER, sandboxMerchantId: MERCHANT, ...paymentFields } = expected;
const dispatch = { owner: OWNER, reservationId: OPERATION, operationId: OPERATION, kind: 'initial', briefId: OTHER };
const verified = { ...paymentFields, paymentReference: 'TEST-CAPTURE-1', confirmedAt: NOW };
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
    async claimDispatch(value) { calls.push(['claimDispatch',value]); return 'claimed'; },
    async settleDispatch(value) { calls.push(['settleDispatch',value]); return {...reserved,state:'unknown'}; },
    async isDefiniteFailure(value) { calls.push(['isDefiniteFailure',value]); return true; },
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
  for (const options of [{ binding: null }, { stored: null }, { stored: { ...expected, subjectId: OTHER } },
    { stored: {...expected,owner:{...OWNER,scope:'b'.repeat(64)}} },
    { stored: {...expected,sandboxMerchantId:'OTHERMERCHANT'} }]) {
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

const manual = { ...expected, provider: 'manual_test', sandboxMerchantId: null };
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
    ...paymentFields, provider:'manual_test', paymentReference: evidence.reference, confirmedAt: NOW,
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
  const use = { ...dispatch, purchaseId: PURCHASE, subjectId: SUBJECT };
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
  assert.equal((sql.match(/enable row level security/g) || []).length, 3);
  assert.equal((sql.match(/security invoker set search_path/g) || []).length, 11);
  assert.ok((sql.match(/for update/g) || []).length >= 5);
  assert.match(sql, /from public, anon, authenticated/);
  assert.doesNotMatch(sql, /security definer|commercial_orders|commercial_quotations|delete from|execute format/i);
});

test('dispatch requires stored owner/reservation/operation/brief/kind/source binding before RPC', async () => {
  const f = fixture();
  for (const value of [ {...dispatch,owner:{...OWNER,scope:'bad'}}, {...dispatch,reservationId:'bad'},
    {...dispatch,briefId:'bad'}, {...dispatch,kind:'revision'}, {...dispatch,sourceOutputId:OTHER} ]) {
    assert.equal(await f.service.claimDispatch(value),'denied');
  }
  assert.equal(f.calls.length,0);
  assert.equal(await f.service.claimDispatch(dispatch),'claimed');
  assert.deepEqual(f.calls,[['claimDispatch',dispatch]]);
});

test('claim RPC preserves UNKNOWN/already-claimed and transport uncertainty never claims', async () => {
  for (const claim of ['claimed','already_claimed','denied','unknown','invalid']) {
    const repo = createImagePackageRepository({async rpc(name,args) {
      assert.equal(name,'novora_test_image_package_claim_dispatch'); assert.deepEqual(args,{p_dispatch:dispatch});
      return {data:{claim},error:null};
    }});
    assert.equal(await repo.claimDispatch(dispatch),claim==='invalid'?'unknown':claim);
  }
  const repo = createImagePackageRepository({async rpc(){throw Error('private');}});
  assert.equal(await repo.claimDispatch(dispatch),'unknown');
});

test('bound settlement uses existing ledger, and no unsupported outcome or cost reaches it', async () => {
  const f = fixture();
  const settlement = {...dispatch,outcome:'unknown',providerCostUsdMicros:2345};
  assert.equal((await f.service.settleDispatch(settlement)).state,'unknown');
  assert.deepEqual(f.calls,[['settleDispatch',settlement]]);
  assert.deepEqual(await f.service.settleDispatch({...settlement,outcome:'retry'}),{ok:false,reason:'invalid'});
  assert.deepEqual(await f.service.settleDispatch({...settlement,providerCostUsdMicros:-1}),{ok:false,reason:'invalid'});
});

test('proven pre-dispatch failure uses bound settlement without obtaining a dispatch claim',async()=>{
  const f=fixture({repository:{async settleDispatch(value) {
    f.calls.push(['settleDispatch',value]); return {...reserved,state:'released'};
  }}});
  const input={...dispatch,outcome:'definite_failure',failurePhase:'before_dispatch',providerCostUsdMicros:0};
  assert.equal((await f.service.settleDispatch(input)).state,'released');
  assert.deepEqual(f.calls,[['settleDispatch',input]]);
  for(const change of [{outcome:'unknown'},{outcome:'delivered'},{failurePhase:'maybe'}]) {
    assert.deepEqual(await f.service.settleDispatch({...input,...change}),{ok:false,reason:'invalid'});
  }
});

test('pre-dispatch release RPC preserves duplicate/conflict/denied instead of faking dispatch',async()=>{
  const input={...dispatch,outcome:'definite_failure',failurePhase:'before_dispatch',providerCostUsdMicros:0};
  for(const response of [{...reserved,state:'released',duplicate:false},{...reserved,state:'released',duplicate:true},
    {ok:false,reason:'conflict'},{ok:false,reason:'denied'}]) {
    const calls=[]; const repo=createImagePackageRepository({async rpc(name,args) {
      calls.push([name,args]);return{data:response,error:null};
    }});
    assert.deepEqual(await repo.settleDispatch(input),response);
    assert.deepEqual(calls,[['novora_test_image_package_settle_dispatch',{p_dispatch:input}]]);
  }
});

function failureReadFixture(change={},options={}) {
  const calls=[];
  const row={reservation_id:dispatch.reservationId,operation_id:dispatch.operationId,kind:dispatch.kind,
    brief_id:dispatch.briefId,source_output_id:null,state:'released',outcome:'definite_failure',
    purchase:{owner_scope:OWNER.scope,owner_identity:OWNER.identity},...change};
  const query={eq(column,value){calls.push(['eq',column,value]);return this;},
    is(column,value){calls.push(['is',column,value]);return this;},
    async maybeSingle(){calls.push(['maybeSingle']);if(options.throw)throw Error('private');
      return{data:options.noRow?null:row,error:options.error?{message:'private'}:null};}};
  const reads={from(table){calls.push(['from',table]);return{select(columns){calls.push(['select',columns]);return query;}};}};
  const repo=createImagePackageRepository({async rpc(){throw Error('read must never invoke RPC');}},reads);
  return{repo,calls};
}

test('definite-failure read filters and rechecks every immutable binding using SELECT only',async()=>{
  const f=failureReadFixture();assert.equal(await f.repo.isDefiniteFailure(dispatch),true);
  assert.deepEqual(f.calls,[['from','novora_test_image_package_uses'],['select',
    'reservation_id,operation_id,kind,brief_id,source_output_id,state,outcome,purchase:novora_test_image_package_purchases!inner(owner_scope,owner_identity)'],
    ['eq','reservation_id',OPERATION],['eq','operation_id',OPERATION],['eq','kind','initial'],['eq','brief_id',OTHER],
    ['eq','purchase.owner_scope',OWNER.scope],['eq','purchase.owner_identity',OWNER.identity],['is','source_output_id',null],['maybeSingle']]);
});

test('only known released failure outcomes qualify; UNKNOWN/reserved/delivered and errors deny',async()=>{
  assert.equal(await failureReadFixture({outcome:'no_compliant_delivery'}).repo.isDefiniteFailure(dispatch),true);
  for(const change of [{state:'unknown',outcome:'unknown'},{state:'reserved',outcome:null},
    {state:'settled',outcome:'valid_delivery'},{outcome:'unknown'},{outcome:'failed'},{outcome:null}]) {
    assert.equal(await failureReadFixture(change).repo.isDefiniteFailure(dispatch),false);
  }
  for(const options of [{noRow:true},{error:true},{throw:true}])
    assert.equal(await failureReadFixture({},options).repo.isDefiniteFailure(dispatch),false);
  assert.equal(await createImagePackageRepository({async rpc(){throw Error('must not query');}}).isDefiniteFailure(dispatch),false);
});

test('failure read rejects mismatched owner, reservation, operation, kind, brief and source',async()=>{
  for(const change of [{reservation_id:OTHER},{operation_id:OTHER},{kind:'revision'},{brief_id:PURCHASE},
    {source_output_id:OTHER},{purchase:{owner_scope:'b'.repeat(64),owner_identity:OWNER.identity}},
    {purchase:{owner_scope:OWNER.scope,owner_identity:'OTHER'}},{purchase:null}]) {
    assert.equal(await failureReadFixture(change).repo.isDefiniteFailure(dispatch),false);
  }
  const revision={...dispatch,kind:'revision',sourceOutputId:PURCHASE};
  const f=failureReadFixture({kind:'revision',source_output_id:PURCHASE});
  assert.equal(await f.repo.isDefiniteFailure(revision),true);
  assert.ok(f.calls.some(c=>c[0]==='eq'&&c[1]==='source_output_id'&&c[2]===PURCHASE));
});

test('service failure reconciliation is read-only and fails closed on invalid or unavailable evidence',async()=>{
  const f=fixture(); assert.equal(await f.service.isDefiniteFailure(dispatch),true);
  assert.deepEqual(f.calls,[['isDefiniteFailure',dispatch]]);
  assert.equal(await f.service.isDefiniteFailure({...dispatch,briefId:'bad'}),false);
  assert.equal(await fixture({repository:{async isDefiniteFailure(){throw Error('private');}}}).service.isDefiniteFailure(dispatch),false);
});

const sandboxPurchase = {purchaseId:PURCHASE,amountMinor:100,currency:'USD',merchantId:MERCHANT,providerOrderId:null};
function sandboxFixture(options={}) {
  let purchase = {...sandboxPurchase,...options.purchase};
  const calls=[];
  // This is a fake RPC boundary, NOT database concurrency evidence.
  const records=new Map();
  const client={async rpc(name,args) {
    calls.push([name,args]);
    if(options.throw) throw Error('private');
    if(name.endsWith('_sandbox_purchase')) return {data:{ok:true,purchase},error:null};
    const key=args.p_request_id;
    if(name.endsWith('_sandbox_claim')) {
      const old=records.get(key);
      if(old) return {data:old.result?{claim:'completed',result:old.result}:{claim:'held'},error:null};
      records.set(key,{fingerprint:args.p_fingerprint});
      return {data:{claim:'acquired'},error:null};
    }
    if(name.endsWith('_sandbox_complete')) {
      const old=records.get(key);
      if(!old || (old.result && JSON.stringify(old.result)!==JSON.stringify(args.p_result))) return {data:{ok:false},error:null};
      old.result=args.p_result;
      if(args.p_kind==='create' && args.p_result.providerOrderId && args.p_result.state!=='UNKNOWN') purchase={...purchase,providerOrderId:args.p_result.providerOrderId};
      return {data:{ok:true},error:null};
    }
    throw Error('unexpected RPC');
  }};
  return {store:createDurableSandboxOperationStore(client,{owner:OWNER,purchaseId:PURCHASE}),calls,records};
}

test('sandbox deterministic operation identity matches C protocol and wrong fingerprint never reaches claim',async()=>{
  const crypto=require('node:crypto'); const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
  const op=sandboxOperationFor(sandboxPurchase,'create');
  assert.deepEqual(op,{requestId:hash(`NOVORA/paypal-sandbox/v1/${PURCHASE}/create`).slice(0,32),
    fingerprint:hash(JSON.stringify([`NOVORA/paypal-sandbox/v1/${PURCHASE}/create`,100,'USD',MERCHANT,'']))});
  const f=sandboxFixture();
  assert.equal(await f.store.claim({...op,fingerprint:'b'.repeat(64)}),'held');
  assert.equal(f.calls.some(c=>c[0].endsWith('_sandbox_claim')),false);
  assert.equal(await f.store.claim(op),'acquired');
  assert.equal(await f.store.claim(op),'held');
});

test('sandbox completion strips raw data, persists order mapping, and returns immutable replay',async()=>{
  const f=sandboxFixture(); const op=sandboxOperationFor(sandboxPurchase,'create');
  assert.equal(await f.store.claim(op),'acquired');
  assert.equal(await f.store.complete(op,{state:'CREATED',providerOrderId:'TESTORDER1',raw:'never persist'}),true);
  const completion=f.calls.find(c=>c[0].endsWith('_sandbox_complete'));
  assert.deepEqual(completion[1].p_result,{state:'CREATED',providerOrderId:'TESTORDER1'});
  assert.equal((await f.store.readPurchase()).providerOrderId,'TESTORDER1');
  assert.deepEqual(await f.store.claim(op),{completed:{state:'CREATED',providerOrderId:'TESTORDER1'}});
  assert.equal(await f.store.complete(op,{state:'CREATED',providerOrderId:'OTHERORDER1'}),false);
});

test('sandbox UNKNOWN is completed/held without reset; storage failures cannot acquire',async()=>{
  const f=sandboxFixture();const op=sandboxOperationFor(sandboxPurchase,'create');
  assert.equal(await f.store.claim(op),'acquired');
  assert.equal(await f.store.complete(op,{state:'UNKNOWN',reason:'transport'}),true);
  assert.deepEqual(await f.store.claim(op),{completed:{state:'UNKNOWN',reason:'transport'}});
  assert.equal((await f.store.readPurchase()).providerOrderId,null);
  assert.equal(Object.hasOwn(f.store,'reset'),false);
  assert.equal(await sandboxFixture({throw:true}).store.claim(op),'held');
});

test('sandbox capture requires durable order binding and exact verified merchant/amount/purchase',async()=>{
  const f=sandboxFixture({purchase:{providerOrderId:'TESTORDER1'}});
  const purchase={...sandboxPurchase,providerOrderId:'TESTORDER1'};
  const op=sandboxOperationFor(purchase,'capture');
  assert.equal(await f.store.claim(op),'acquired');
  const capture={providerKey:'paypal_sandbox',purchaseId:PURCHASE,providerOrderId:'TESTORDER1',providerCaptureId:'TESTCAPTURE1',
    amountMinor:100,currency:'USD',merchantId:MERCHANT,capturedAt:NOW};
  for(const change of [{purchaseId:OTHER},{merchantId:'OTHERMERCHANT'},{amountMinor:99},{providerOrderId:'WRONGORDER1'}]) {
    assert.equal(await f.store.complete(op,{state:'PAID',capture:{...capture,...change}}),false);
  }
  assert.equal(await f.store.complete(op,{state:'PAID',capture}),true);
  assert.equal(await sandboxFixture().store.claim(op),'held');
});
