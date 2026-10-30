'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadAdapter(rpc) {
  const source = fs.readFileSync('lib/server/ai-sketch/m2-scoped-receipt.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const deps = {
    'server-only': {},
    'node:crypto': require('node:crypto'),
    '../concept-brief-validation': { generateConceptBriefPublicReferencePreview: () => 'NOVORA-CB-20261030-AB12' },
    '../supabase': { createSupabaseAdminClientOrNull: () => ({ rpc }) },
  };
  new Function('module', 'exports', 'require', js)(module, module.exports, name => {
    if (!Object.hasOwn(deps, name)) throw new Error('unexpected dependency');
    return deps[name];
  });
  return module.exports;
}
const scope = { scope: 'a'.repeat(64), identity: 'synthetic_identity' };
const id = 'b'.repeat(32);
const row = { brief_id: '123e4567-e89b-42d3-a456-426614174000', reference: 'NOVORA-CB-20261030-AB12', stage: 'accepted', reason: null };

test('production receipt adapter binds RPC to verified scope and canonical digest', async () => {
  const calls = [];
  const adapter = loadAdapter(async (name, args) => { calls.push({ name, args }); return { data: [{ outcome: 'created', ...row }], error: null }; });
  const payload = { customerEmail: 'offline@example.invalid', pieceType: 'ring' };
  const result = await adapter.createScopedReceipt(scope, id, payload);
  assert.equal(result.outcome, 'created');
  assert.equal(result.receipt.reference, row.reference);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'm2_create_scoped_receipt');
  assert.equal(calls[0].args.p_scope, scope.scope);
  assert.equal(calls[0].args.p_identity, scope.identity);
  assert.equal(calls[0].args.p_request, id);
  assert.equal(calls[0].args.p_digest, adapter.submissionDigest({ pieceType: 'ring', customerEmail: 'offline@example.invalid' }));
  assert.equal(calls[0].args.p_contact.customer_email, payload.customerEmail);
});

test('adapter fails closed on malformed rows, conflicts, and transport errors', async () => {
  for (const fixture of [ {data:[{outcome:'created',...row,reference:'invalid'}],error:null}, {data:null,error:{message:'private'}}, null ]) {
    const adapter = loadAdapter(async () => { if (!fixture) throw Error('private'); return fixture; });
    assert.deepEqual(await adapter.createScopedReceipt(scope,id,{}), { outcome:'unavailable' });
    assert.equal(await adapter.readScopedReceipt(scope,id), null);
  }
  const conflict = loadAdapter(async () => ({data:[{outcome:'conflict'}],error:null}));
  assert.deepEqual(await conflict.createScopedReceipt(scope,id,{}), {outcome:'conflict'});
});

test('read and publish outcome use only scoped arguments and fixed reason', async () => {
  const calls = [];
  const adapter = loadAdapter(async (name,args) => { calls.push({name,args}); return {data:name==='m2_read_scoped_receipt' ? [{...row,stage:'UNKNOWN',reason:'UNKNOWN'}] : true,error:null}; });
  assert.equal((await adapter.readScopedReceipt(scope,id)).stage,'UNKNOWN');
  assert.equal(await adapter.claimScopedPublish(scope,id),true);
  assert.equal(await adapter.finishScopedPublish(scope,id,'UNKNOWN','UNKNOWN'),true);
  assert.deepEqual(calls[2].args,{p_scope:scope.scope,p_identity:scope.identity,p_request:id,p_stage:'UNKNOWN',p_reason:'UNKNOWN'});
});

function loadHandler(sourcePath, deps) {
  const js = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const next = { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200, headers: options.headers || {}, cookies: { get: () => ({ value: 'fixture-cookie' }) } }) } };
  new Function('module','exports','require',js)(module,module.exports,name => {
    if (name === 'next/server') return next;
    if (Object.hasOwn(deps,name)) return deps[name];
    throw Error('unexpected dependency ' + name);
  });
  return module.exports;
}

test('actual receipt GET requires verified scope and never mutates or issues a cookie', async () => {
  let reads = 0;
  const handler = loadHandler('app/api/concept-briefs/receipt/handler.ts', {
    '../../../../lib/server/ai-sketch/beta-admission': { authenticateM2ReceiptRequest: () => null },
    '../../../../lib/server/ai-sketch/m2-scoped-receipt': { isClientRequestId: value => /^[a-f0-9]{32}$/.test(value || ''), readScopedReceipt: async () => { throw Error('unexpected'); } },
  });
  const get = handler.createReceiptGetHandler({ authenticate: req => req.headers.get('authorization') === 'fixture' ? scope : null, read: async (s, requestId) => { reads++; assert.deepEqual(s,scope); assert.equal(requestId,id); return {briefId:row.brief_id,reference:row.reference,stage:'UNKNOWN',reason:'UNKNOWN'}; } });
  assert.equal((await get(new Request(`https://example.invalid/receipt?id=${id}`))).status,404);
  assert.equal(reads,0);
  const result = await get(new Request(`https://example.invalid/receipt?id=${id}`,{headers:{authorization:'fixture'}}));
  assert.equal(result.body.status,'UNKNOWN');
  assert.equal(result.body.reason,'UNKNOWN');
  assert.equal(result.headers['Cache-Control'],'no-store');
  assert.equal(reads,1);
});

test('actual POST does not republish an existing receipt or uncertain claim', async () => {
  const deps = {
    '../../../lib/server/concept-brief-persistence': { persistConceptBriefSubmission: async () => { throw Error('unexpected'); } },
    '../../../lib/server/concept-brief-validation': { validateConceptBriefSubmission: () => ({valid:true}) },
    '../../../lib/server/public-api-rate-limit': { checkPublicApiRateLimit: async () => ({allowed:true}), normalizePublicApiRateLimitEmail: () => null },
    '../../../lib/server/ai-sketch/instant-first-preview-feature-flag': { attachFirstPreviewCustomerSessionCookie: response => response },
    '../../../lib/server/ai-sketch/first-preview-customer-access-contract': { FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME:'fixture' },
    '../../../lib/server/ai-sketch/first-preview-automatic-trigger': { triggerAutomaticFirstPreviewAfterPersistence: async () => { throw Error('unexpected'); } },
    '../../../lib/server/ai-sketch/beta-admission': { authenticateM2ReceiptRequest: () => scope },
    '../../../lib/server/ai-sketch/m2-scoped-receipt': { isClientRequestId: value => value === id, createScopedReceipt: async () => { throw Error('unexpected'); }, claimScopedPublish: async () => false, finishScopedPublish: async () => { throw Error('unexpected'); } },
  };
  const handler = loadHandler('app/api/concept-briefs/handler.ts',deps);
  let triggers=0;
  const receipt={briefId:row.brief_id,reference:row.reference,stage:'UNKNOWN',reason:'UNKNOWN'};
  const req = () => new Request('https://example.invalid/api/concept-briefs',{method:'POST',headers:{'x-novora-client-request-id':id},body:'{}'});
  const options={receipt:{authenticate:()=>scope,create:async()=>({outcome:'existing',receipt})}, triggerAutomaticPreview:async()=>{triggers++;return {status:'enqueued',reason:'enqueued'};}};
  const existing=await handler.createConceptBriefPostHandler(options)(req());
  assert.equal(existing.status,200);assert.equal(existing.body.receiptStage,'UNKNOWN');assert.equal(triggers,0);
  options.receipt.create=async()=>({outcome:'created',receipt:{...receipt,stage:'accepted',reason:null}});
  options.receipt.claim=async()=>false;
  const claimed=await handler.createConceptBriefPostHandler(options)(req());
  assert.equal(claimed.status,201);assert.equal(triggers,0);
});

test('actual invitation authentication binds receipt scope to exact isolated deployment', () => {
  const crypto = require('node:crypto');
  const bearer = 'synthetic_fixture_bearer_with_sufficient_entropy';
  const roster = JSON.stringify([{identity:'synthetic_identity',credentialSha256:crypto.createHash('sha256').update(bearer).digest('hex')}]);
  const env = { VERCEL:'1', VERCEL_ENV:'preview', NODE_ENV:'production', NEXT_RUNTIME:'nodejs', VERCEL_PROJECT_ID:'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg', VERCEL_GIT_COMMIT_REF:'integration/instant-first-preview-agent', VERCEL_GIT_COMMIT_SHA:'a'.repeat(40), VERCEL_DEPLOYMENT_ID:'dpl_1234567890abcdef', NOVORA_BETA_ADMISSION_ENABLED:'true', NOVORA_BETA_INVITATIONS_JSON:roster, NOVORA_BETA_SPENDING_AUTHORITY_ID:'fixture', NOVORA_INSTANT_PREVIEW_AGENT_ENABLED:'true', NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:'true' };
  const adapter = loadHandler('lib/server/ai-sketch/beta-admission.ts', {'server-only':{}, 'node:crypto':crypto, './first-preview-cost-contract':{FIRST_PREVIEW_COST_CONTRACT:{},FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION:'fixture'}});
  const req = value => new Request('https://example.invalid',{headers:value ? {authorization:'Bearer '+value} : {}});
  const bound = adapter.authenticateM2ReceiptRequest(req(bearer),env);
  assert.equal(bound.identity,'synthetic_identity');
  assert.match(bound.scope,/^[a-f0-9]{64}$/);
  assert.equal(adapter.authenticateM2ReceiptRequest(req('wrong'),env),null);
  assert.equal(adapter.authenticateM2ReceiptRequest(req(),env),null);
  assert.equal(adapter.authenticateM2ReceiptRequest(req(bearer),{...env,VERCEL_ENV:'production'}),null);
  const other = adapter.authenticateM2ReceiptRequest(req(bearer),{...env,VERCEL_DEPLOYMENT_ID:'dpl_abcdef1234567890'});
  assert.notEqual(other.scope,bound.scope);
});

// MOCK transactional RPC: exercises actual handlers and adapter wiring, not PostgreSQL atomicity.
function integratedFixture({dropFirstCreate=false, timeoutTrigger=false} = {}) {
  const db = new Map(); let creates=0, triggers=0, dropped=false;
  const key = a => [a.p_scope,a.p_identity,a.p_request].join('|');
  const adapter = loadAdapter(async (name,a) => {
    const k=key(a), old=db.get(k);
    if(name==='m2_create_scoped_receipt') {
      if(old) return {data:[old.digest===a.p_digest ? {outcome:'existing',...old.row} : {outcome:'conflict'}],error:null};
      creates++; const newRow={...row};db.set(k,{digest:a.p_digest,row:newRow});
      if(dropFirstCreate && !dropped){dropped=true;throw Error('simulated dropped response after commit');}
      return {data:[{outcome:'created',...newRow}],error:null};
    }
    if(name==='m2_read_scoped_receipt') return {data:old?[old.row]:[],error:null};
    if(name==='m2_claim_scoped_publish') {if(!old||old.row.stage!=='accepted')return {data:false,error:null};old.row.stage='publish_pending';return {data:true,error:null};}
    if(name==='m2_finish_scoped_publish') {if(!old||old.row.stage!=='publish_pending')return {data:false,error:null};old.row.stage=a.p_stage;old.row.reason=a.p_reason;return {data:true,error:null};}
    throw Error('unexpected RPC');
  });
  const deps = {
    '../../../lib/server/concept-brief-persistence':{persistConceptBriefSubmission:async()=>{throw Error('unexpected');}},
    '../../../lib/server/concept-brief-validation':{validateConceptBriefSubmission:()=>({valid:true})},
    '../../../lib/server/public-api-rate-limit':{checkPublicApiRateLimit:async()=>({allowed:true}),normalizePublicApiRateLimitEmail:()=>null},
    '../../../lib/server/ai-sketch/instant-first-preview-feature-flag':{attachFirstPreviewCustomerSessionCookie:r=>r},
    '../../../lib/server/ai-sketch/first-preview-customer-access-contract':{FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME:'fixture'},
    '../../../lib/server/ai-sketch/first-preview-automatic-trigger':{triggerAutomaticFirstPreviewAfterPersistence:async()=>{throw Error('unexpected');}},
    '../../../lib/server/ai-sketch/beta-admission':{authenticateM2ReceiptRequest:()=>null},
    '../../../lib/server/ai-sketch/m2-scoped-receipt':adapter,
  };
  const postFactory=loadHandler('app/api/concept-briefs/handler.ts',deps).createConceptBriefPostHandler;
  const getFactory=loadHandler('app/api/concept-briefs/receipt/handler.ts',{
    '../../../../lib/server/ai-sketch/beta-admission':{authenticateM2ReceiptRequest:()=>null},
    '../../../../lib/server/ai-sketch/m2-scoped-receipt':adapter,
  }).createReceiptGetHandler;
  const auth=req=>{const identity=req.headers.get('x-fixture-identity'),binding=req.headers.get('x-fixture-scope');return identity&&binding?{identity,scope:binding}:null;};
  const post=postFactory({receipt:{authenticate:auth},triggerAutomaticPreview:async()=>{triggers++;if(timeoutTrigger)throw Error('timeout');return {status:'enqueued',reason:'enqueued'};},logAutomaticPreviewDiagnostic:()=>{}});
  const get=getFactory({authenticate:auth});
  const headers=(who=scope)=>({'x-novora-client-request-id':id,'x-fixture-identity':who.identity,'x-fixture-scope':who.scope});
  const request=(payload={},who=scope)=>new Request('https://example.invalid/api/concept-briefs',{method:'POST',headers:headers(who),body:JSON.stringify(payload)});
  const getRequest=(who=scope)=>new Request(`https://example.invalid/api/concept-briefs/receipt?id=${id}`,{headers:headers(who)});
  return {post,get,request,getRequest,counts:()=>({creates,triggers})};
}

test('MOCK committed RPC with dropped response is recoverable without another publish', async()=>{
  const h=integratedFixture({dropFirstCreate:true});
  assert.equal((await h.post(h.request({pieceType:'ring'}))).status,503);
  const receipt=await h.get(h.getRequest());assert.equal(receipt.body.status,'accepted');
  assert.equal((await h.post(h.request({pieceType:'ring'}))).status,200);
  assert.deepEqual(h.counts(),{creates:1,triggers:0});
});

test('MOCK concurrent same ID yields one brief and one publication; changed payload conflicts',async()=>{
  const h=integratedFixture();
  const responses=await Promise.all([h.post(h.request({pieceType:'ring'})),h.post(h.request({pieceType:'ring'}))]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,201]);
  assert.equal((await h.post(h.request({pieceType:'necklace'}))).status,409);
  assert.deepEqual(h.counts(),{creates:1,triggers:1});
});

test('MOCK exact identity and deployment scope prevent receipt leak',async()=>{
  const h=integratedFixture();await h.post(h.request({pieceType:'ring'}));
  assert.equal((await h.get(h.getRequest({...scope,identity:'other_identity'}))).status,404);
  assert.equal((await h.get(h.getRequest({...scope,scope:'c'.repeat(64)}))).status,404);
  assert.equal((await h.get(new Request(`https://example.invalid/receipt?id=${id}`))).status,404);
  assert.equal((await h.get(h.getRequest())).status,200);
});

test('MOCK trigger timeout stores UNKNOWN; GET and duplicate POST do not republish',async()=>{
  const h=integratedFixture({timeoutTrigger:true});
  assert.equal((await h.post(h.request({pieceType:'ring'}))).status,201);
  const result=await h.get(h.getRequest());assert.equal(result.body.status,'UNKNOWN');assert.equal(result.body.reason,'UNKNOWN');
  const duplicate=await h.post(h.request({pieceType:'ring'}));assert.equal(duplicate.status,200);assert.equal(duplicate.body.receiptStage,'UNKNOWN');
  assert.deepEqual(h.counts(),{creates:1,triggers:1});
});
