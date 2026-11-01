'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), crypto = require('node:crypto');
const modules = new Map();
function load(file) {
  file = path.resolve(file);
  if (modules.has(file)) return modules.get(file);
  if (file.endsWith(path.join('lib','server','supabase.ts'))) return { createSupabaseAdminClientOrNull: () => null };
  if (file.endsWith(path.join('lib','server','public-api-rate-limit.ts'))) return { checkPublicApiRateLimit: async () => ({ allowed: true }) };
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} }; modules.set(file,module.exports);
  new Function('module','exports','require',js)(module,module.exports,dep => {
    if (dep === 'server-only') return {};
    if (dep === 'crypto' || dep === 'node:crypto') return crypto;
    if (dep === 'next/server') return { NextResponse: { json: (body,opts) => Response.json(body,opts) } };
    if (dep === 'next/headers') return { cookies: async () => { throw Error('Actual cookies forbidden in synthetic test'); } };
    if (dep.startsWith('.')) return load(path.resolve(path.dirname(file),`${dep}.ts`));
    throw Error(`Unexpected dependency ${dep}`);
  }); return module.exports;
}
const beta = load('lib/server/ai-sketch/beta-admission.ts');
const { testPackageSubject, testPackagePurchase } = load('lib/server/image-packages/identity.ts');
const { createPackageHttpService } = load('lib/server/image-packages/http-service.ts');
const { createTestPackageHandlers } = load('lib/server/image-packages/routes.ts');
const { authorizePackageOwner } = load('lib/server/image-packages/runtime.ts');
const { createSandboxTransport } = load('lib/server/paypal-sandbox/transport.ts');
const token = 'a'.repeat(43), otherToken = 'b'.repeat(43), ownerToken = 'c'.repeat(43);
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
const environment = { NOVORA_BETA_ADMISSION_ENABLED:'true', NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED:'true',
  NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE:'TEST_package_namespace_v1',
  VERCEL_PROJECT_ID:'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg', VERCEL_ENV:'preview', VERCEL_TARGET_ENV:'preview',
  NOVORA_BETA_INVITATIONS_JSON: JSON.stringify([[token,'TEST-customer'],[otherToken,'TEST-other'],[ownerToken,'TEST-owner']]
    .map(([secret,identity]) => ({ identity,credentialSha256:hash(secret) }))) };
const auth = req => beta.authenticateScopedReceiptRequest(req,environment);
const request = (body, credential = token, admin = false) => new Request('https://test.example.invalid/api/test-image-packages'+(body === undefined ? '?provider=paypal_sandbox' : ''), {
  method: body === undefined ? 'GET' : 'POST', headers: { Authorization:`Bearer ${credential}`, Origin:'https://test.example.invalid',
    ...(body === undefined ? {} : {'Content-Type':'application/json'}), ...(admin ? {Cookie:'TEST-admin'} : {}) },
  ...(body === undefined ? {} : {body:JSON.stringify(body)}),
});
const ownerBinding = auth(request(undefined,ownerToken));
const ownerEnvironment = { ...environment, NOVORA_TEST_IMAGE_PACKAGES_OWNER_IDENTITY:'TEST-owner',
  NOVORA_TEST_IMAGE_PACKAGES_OWNER_SCOPE:ownerBinding.scope, NOVORA_TEST_IMAGE_PACKAGES_OWNER_VERIFIER_ID:'TEST-owner-verifier' };
const authorize = req => authorizePackageOwner(req,{ environment:ownerEnvironment,
  cookieValue:async()=>req.headers.get('cookie') || undefined, validateAdmin:value=>value==='TEST-admin' });

function fixture(configured = true) {
  const purchases = new Map(), orders = new Map(), operations = new Map(), grants = new Map(), refs = new Set();
  let posts=0, grantCount=0, unknown=false, rpcCount=0, settled=false;
  const client={ async rpc(name,args) {
    rpcCount++; let data;
    if (name.endsWith('_create')) {
      const p=args.p_purchase; if(!purchases.has(p.purchaseId)) purchases.set(p.purchaseId,structuredClone(p));
      data={ok:true};
    } else if(name.endsWith('_find')) data=purchases.has(args.p_purchase_id)?{ok:true,purchase:purchases.get(args.p_purchase_id)}:{ok:false,reason:'not_found'};
    else if(name.endsWith('_balance')) {
      const p=purchases.get(args.p_purchase_id),g=grants.get(args.p_purchase_id);
      data=p && p.subjectId===args.p_subject_id && g?{ok:true,purchaseId:p.purchaseId,state:'active',grantedAt:g.grantedAt,expiresAt:g.expiresAt,initialRemaining:5,revisionRemaining:5}:{ok:false,reason:'denied'};
    } else if(name.endsWith('_sandbox_purchase')) {
      const p=purchases.get(args.p_purchase_id);
      data=p && p.owner.scope===args.p_owner.scope && p.owner.identity===args.p_owner.identity?{ok:true,purchase:{purchaseId:p.purchaseId,amountMinor:100,currency:'USD',merchantId:'TESTMERCHANT1',providerOrderId:orders.get(p.purchaseId)||null}}:{ok:false};
    } else if(name.endsWith('_sandbox_claim')) {
      const key=args.p_request_id, old=operations.get(key);
      if(old) data=old.result?{claim:'completed',result:old.result}:{claim:'held'};
      else {operations.set(key,{});data={claim:'acquired'};}
    } else if(name.endsWith('_sandbox_complete')) {
      const old=operations.get(args.p_request_id); old.result=args.p_result;
      if(args.p_kind==='create' && args.p_result.state!=='UNKNOWN') orders.set(args.p_purchase_id,args.p_result.providerOrderId);
      data={ok:true};
    } else if(name.endsWith('_grant')) {
      const p=args.p_payment, old=grants.get(p.purchaseId);
      if(!old && refs.has(p.paymentReference)) data={ok:false,reason:'conflict'};
      else {
        if(!old) {grantCount++;refs.add(p.paymentReference);grants.set(p.purchaseId,{grantedAt:p.confirmedAt,expiresAt:new Date(Date.parse(p.confirmedAt)+604800000).toISOString()});}
        data={ok:true,duplicate:!!old,purchaseId:p.purchaseId,...grants.get(p.purchaseId)};
      }
    } else throw Error(`Unexpected RPC ${name}`);
    return {data,error:null};
  }};
  const service=createPackageHttpService({client,authenticate:auth,authorizeOwner:authorize,sandboxMerchantId:configured?'TESTMERCHANT1':null,
    now:()=>new Date('2026-11-01T08:00:00.000Z'),readHold:async()=>unknown?'unknown':'none',
    sandbox:configured?{endpoint:'https://api-m.sandbox.paypal.com',credentials:{getAccessToken:async()=>'TEST-access'},
      http:async req=>{
        if(req.method==='POST') posts++;
        if(unknown) throw Error('TEST ambiguous transport');
        const capture=req.url.endsWith('/capture');
        if(capture) settled=true;
        const purchaseId=req.url.endsWith('/orders')?JSON.parse(req.body).purchase_units[0].custom_id:[...orders.keys()][0];
        const paid=settled || grants.has(purchaseId);
        return {status:200,url:req.url,body:JSON.stringify({id:'TESTORDER1',intent:'CAPTURE',status:paid?'COMPLETED':req.method==='GET'?'APPROVED':'CREATED',
          purchase_units:[{reference_id:purchaseId,custom_id:purchaseId,payee:{merchant_id:'TESTMERCHANT1'},amount:{currency_code:'USD',value:'1.00'},
            ...(paid?{payments:{captures:[{id:'TESTCAPTURE1',status:'COMPLETED',amount:{currency_code:'USD',value:'1.00'},final_capture:true,create_time:'2026-11-01T07:00:00Z'}]}}:{})}]})};
      }}:null});
  const handlers=createTestPackageHandlers({service:()=>service,rateLimit:async()=>({allowed:true})});
  return {handlers,purchases,grants,get posts(){return posts;},get grantCount(){return grantCount;},get rpcCount(){return rpcCount;},setUnknown(){unknown=true;}};
}
test('subject/purchase identities are deterministic server partitions and vary by verified owner/scope/provider',()=>{
  const owner=auth(request());
  assert.match(testPackageSubject(owner),/^[a-f0-9-]{14}5[a-f0-9-]{21}$/);
  assert.equal(testPackageSubject(owner),testPackageSubject(auth(request())));
  assert.notEqual(testPackageSubject(owner),testPackageSubject(auth(request(undefined,otherToken))));
  assert.notEqual(testPackageSubject(owner),testPackageSubject({...owner,scope:'f'.repeat(64)}));
  assert.notEqual(testPackagePurchase(owner,'manual_test'),testPackagePurchase(owner,'paypal_sandbox'));
});
test('unauthenticated and body-forged subject/paid inputs cannot create or grant',async()=>{
  const f=fixture();
  assert.equal((await f.handlers.GET(request(undefined,'wrong'))).status,404);
  assert.equal(f.rpcCount,0);
  for(const extra of [{subjectId:testPackageSubject(auth(request()))},{paid:true},{owner:ownerBinding},{purchaseId:'123e4567-e89b-42d3-a456-426614174000'}]) {
    assert.equal((await f.handlers.POST(request({action:'create',provider:'paypal_sandbox',...extra}))).status,400);
  }
  assert.equal(f.posts,0);assert.equal(f.grantCount,0);
});
test('customer route creates stable purchase, capture grants once, balance is scoped',async()=>{
  const f=fixture();
  const create=await(await f.handlers.POST(request({action:'create',provider:'paypal_sandbox'}))).json();
  assert.equal(create.state,'checkout');assert.equal(create.snapshot.initialRemaining,0);
  const capture=await(await f.handlers.POST(request({action:'capture',provider:'paypal_sandbox'}))).json();
  assert.equal(capture.state,'confirmed');assert.equal(capture.snapshot.initialRemaining,5);assert.equal(capture.snapshot.revisionRemaining,5);
  const duplicate=await(await f.handlers.POST(request({action:'capture',provider:'paypal_sandbox'}))).json();
  assert.equal(duplicate.confirmation.duplicate,true);assert.equal(f.grantCount,1);
  const stranger=await(await f.handlers.GET(request(undefined,otherToken))).json();
  assert.equal(stranger.state,'not_started');assert.equal(stranger.purchaseId,null);
  const snapshot=await f.handlers.GET(request());assert.equal(snapshot.headers.get('cache-control'),'no-store');
  assert.equal((await snapshot.json()).initialRemaining,5);
});
test('unconfigured Sandbox and disabled runtime cause no provider request or false grant',async()=>{
  const f=fixture(false);
  const status=await(await f.handlers.GET(request())).json();assert.equal(status.paypalConfigured,false);
  const result=await(await f.handlers.POST(request({action:'create',provider:'paypal_sandbox'}))).json();
  assert.equal(result.reason,'paypal_unconfigured');assert.equal(f.purchases.size,0);assert.equal(f.posts,0);
  const disabled=createTestPackageHandlers({service:()=>null,rateLimit:async()=>({allowed:true})});
  assert.equal((await disabled.GET(request())).status,503);
});
test('UNKNOWN shows held state and cannot create replacement payment on same server identity',async()=>{
  const f=fixture();f.setUnknown();
  const first=await(await f.handlers.POST(request({action:'create',provider:'paypal_sandbox'}))).json();
  assert.equal(first.reason,'unknown');assert.equal(first.snapshot.hold,'unknown');
  await f.handlers.POST(request({action:'create',provider:'paypal_sandbox'}));
  assert.equal(f.posts,1);assert.equal(f.purchases.size,1);assert.equal(f.grantCount,0);
});
test('manual confirmation requires BOTH existing admin and allowlisted Owner invitation; replay adds no grant',async()=>{
  const f=fixture(false);
  const pending=await(await f.handlers.POST(request({action:'create',provider:'manual_test'}))).json();
  const evidence={purchaseId:pending.purchaseId,reference:'TEST-MANUAL-ROUTE',amountMinor:100,currency:'USD'};
  for(const [credential,admin] of [[token,true],[ownerToken,false],['wrong',true]]) {
    assert.equal((await f.handlers.manualPOST(request(evidence,credential,admin))).status,404);
  }
  assert.equal(f.grantCount,0);
  for(const change of [{amountMinor:101},{currency:'EUR'},{reference:'REAL-receipt'}]) assert.equal((await f.handlers.manualPOST(request({...evidence,...change},ownerToken,true))).status,400);
  const result=await(await f.handlers.manualPOST(request(evidence,ownerToken,true))).json();assert.equal(result.state,'confirmed');
  const duplicate=await(await f.handlers.manualPOST(request(evidence,ownerToken,true))).json();assert.equal(duplicate.confirmation.duplicate,true);assert.equal(f.grantCount,1);
  assert.equal((await f.handlers.manualPOST(request({...evidence,owner:true},ownerToken,true))).status,400);
});
test('mutation rejects foreign/missing Origin, oversized or unexpected bodies before any RPC',async()=>{
  const f=fixture();
  for(const origin of ['https://evil.invalid','']) {
    const req=new Request('https://test.example.invalid/api/test-image-packages',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({action:'create',provider:'manual_test'})});
    assert.equal((await f.handlers.POST(req)).status,400);
  }
  const oversized=new Request('https://test.example.invalid/api/test-image-packages',{method:'POST',headers:{Origin:'https://test.example.invalid','Content-Type':'application/json'},body:'x'.repeat(3000)});
  assert.equal((await f.handlers.POST(oversized)).status,400);
  assert.equal(f.rpcCount,0);
});
test('Sandbox transport is injected, credential-private and cannot address live endpoints',async()=>{
  const calls=[];
  const transport=createSandboxTransport('TEST-client-id','TEST-client-secret',async(url,options)=>{
    calls.push({url,options});return {ok:true,status:200,url,text:async()=>url.endsWith('/token')?JSON.stringify({access_token:'TEST-access',token_type:'Bearer',expires_in:3600}):'{}'};
  });
  assert.equal(calls.length,0);
  assert.equal(await transport.credentials.getAccessToken(),'TEST-access');
  assert.equal(await transport.credentials.getAccessToken(),'TEST-access');assert.equal(calls.length,1);
  assert.equal(calls[0].url,'https://api-m.sandbox.paypal.com/v1/oauth2/token');assert.equal(calls[0].options.redirect,'error');
  await assert.rejects(()=>transport.http({url:'https://api-m.paypal.com/v2/checkout/orders',method:'POST',headers:{},signal:new AbortController().signal,redirect:'error'}));
  assert.equal(calls.length,1);
});

test('stable trial identity does not bypass missing, invalid or unfunded spending authority',async()=>{
  const fundedEnvironment={...environment,NOVORA_BETA_INVITATIONS_JSON:JSON.stringify([{identity:'TEST-customer',credentialSha256:hash(token)}]),
    VERCEL:'1',NODE_ENV:'production',NEXT_RUNTIME:'nodejs',VERCEL_GIT_COMMIT_REF:'integration/instant-first-preview-agent',
    VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),VERCEL_DEPLOYMENT_ID:'dpl_TESTintegrationDeployment123',
    NOVORA_INSTANT_PREVIEW_AGENT_ENABLED:'true',NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:'true',
    UPSTASH_REDIS_REST_URL:'https://test-redis.example.invalid',UPSTASH_REDIS_REST_TOKEN:'TEST-fake-redis-token'};
  const stable=beta.authenticateScopedReceiptRequest(request(),fundedEnvironment);
  assert.ok(stable);assert.equal(beta.isScopedReceiptOwnerActive(stable,fundedEnvironment),true);
  let network=0;
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{network++;throw Error('Real network forbidden');};
  try {
    for(const authority of [undefined,'invalid authority with spaces']) {
      const env={...fundedEnvironment,NOVORA_BETA_SPENDING_AUTHORITY_ID:authority};
      assert.deepEqual(beta.authenticateScopedReceiptRequest(request(),env),stable);
      assert.equal(beta.createRedisBetaAdmissionLedger(env,globalThis.fetch),null);
      const req=request();req.headers.set('idempotency-key','d'.repeat(32));
      assert.equal(await beta.reserveBetaAdmission({request:req,briefId:'123e4567-e89b-42d3-a456-426614174000',fingerprint:'e'.repeat(64)},
        {environment:env}),'denied');
    }
    assert.equal(network,0);
    let fundingReads=0;
    const env={...fundedEnvironment,NOVORA_BETA_SPENDING_AUTHORITY_ID:'TEST-funded-authority'};
    const ledger=beta.createRedisBetaAdmissionLedger(env,async()=>{
      fundingReads++;return Response.json({result:'denied'}); // durable authority absent/invalid; synthetic RPC only
    });
    assert.ok(ledger);assert.deepEqual(beta.authenticateScopedReceiptRequest(request(),env),stable);
    assert.equal(await ledger.reserve({identity:stable.identity,briefId:'123e4567-e89b-42d3-a456-426614174000',requestKey:'d'.repeat(64),fingerprint:'e'.repeat(64)}),'denied');
    assert.equal(fundingReads,1);assert.equal(network,0);
  } finally {globalThis.fetch=originalFetch;}
});
