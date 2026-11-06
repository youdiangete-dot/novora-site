'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createHash,randomUUID}=require('node:crypto');
const c=require('../../tools/invitation-shared-budget-contract.cjs');
const old=require('../../tools/invitation-test-period-025-contract.cjs');
const {createLocalRedisTestTransport}=require('./local-redis-test-transport.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');
const roster=[{identity:'synthetic_a',credentialSha256:sha('a'.repeat(43))},{identity:'synthetic_b',credentialSha256:sha('b'.repeat(43))}];
const config={limitMicros:20000000,expectedCostMicros:100000,reserveMicros:150000,m2CommittedMicros:5050000,mvpCommittedMicros:95050000,startsAt:1900000000,expiresAt:1900604800,costPolicyVersion:c.POLICY,pricingAssumptionVersion:c.PRICING};
test('two-person USD20 budget has no person/day/kind package quotas; old policies are unchanged',()=>{
 assert.deepEqual(c.normalizeConfig(config),config);
 assert.equal(old.normalizeConfig(config),null);assert.equal(old.RESERVATION,250000);
 for(const patch of [{maximumInitialImages:6},{maximumRevisionsPerIdentity:1},{limitMicros:20000001},{expiresAt:config.expiresAt+1},{mvpCommittedMicros:180000001},{m2CommittedMicros:0},{mvpCommittedMicros:0},{costPolicyVersion:old.POLICY}])assert.equal(c.normalizeConfig({...config,...patch}),null);
 const s=c.selection('synthetic_shared_namespace',config,roster,'synthetic_shared_authority');
 assert.equal(c.selection(s.namespace,config,[...roster,roster[0]],s.authorityLabel),null);
 const b=c.binding(s,'dpl_syntheticShared1234567890','a'.repeat(40)),a=c.authority(s,b);
 assert.match(b.ledgerKey,/^novora:beta-admission:shared-budget:v1:/);
 assert.equal(a.maximumRevisionsPerIdentity,undefined);assert.equal(a.maximumPaidAttempts,undefined);assert.equal(a.attemptReservationMicros,250000);
 assert.equal(a.costCeilingVerified,false);assert.equal(a.automaticPaidRetries,false);
 assert.notEqual(c.binding(s,'dpl_syntheticShared9999999999','a'.repeat(40)).ledgerKey,b.ledgerKey);
 for(const key of ['receiptScope','rosterDigest','configDigest','identities'])assert.equal(c.binding({...s,[key]:'forged'},'dpl_syntheticShared1234567890','a'.repeat(40)),null);
});
const redis=createLocalRedisTestTransport();
test('actual isolated Lua: shared spending, repeat revisions, races, binding, expiry, UNKNOWN and permanent history',{skip:!redis},async()=>{
 const source=fs.readFileSync('lib/server/ai-sketch/invitation-shared-budget-spending.ts','utf8');
 const script=source.match(/SHARED_BUDGET_SPENDING_SCRIPT = `([\s\S]*?)`;/)[1];
 const now=Number(redis.run('TIME').split(/\r?\n/)[0]);
 const cfg={...config,startsAt:now-10,expiresAt:now-10+604800};
 let sequence=0;
 function fixture(patch={}){
  const selected=c.selection('synthetic_shared_namespace',cfg,roster,'synthetic_'+sequence++),bound=c.binding(selected,'dpl_syntheticShared1234567890','a'.repeat(40));
  const authority={...c.authority(selected,bound),...patch};
  assert.equal(redis.run('SET',bound.ledgerKey,JSON.stringify({version:1,authority,reservations:{}}),'NX'),'OK');
  return {selected,bound,authority,run:(op,v)=>redis.run('EVAL',script,'1',bound.ledgerKey,op,bound.authorityId,bound.runtimeBinding,JSON.stringify(c.authority(selected,bound)),JSON.stringify(v)),race:(op,v)=>redis.runAsync('EVAL',script,'1',bound.ledgerKey,op,bound.authorityId,bound.runtimeBinding,JSON.stringify(c.authority(selected,bound)),JSON.stringify(v)),read:()=>JSON.parse(redis.run('GET',bound.ledgerKey))};
 }
 const value=(kind='initial',identity='synthetic_a',sourceBriefId=null)=>{const id=randomUUID();return {identity,requestKey:sha(randomUUID()),briefId:id,sourceBriefId:sourceBriefId??id,kind,fingerprint:sha(randomUUID())};};
 function deliver(f,v){assert.equal(f.run('reserve',v),'reserved');assert.equal(f.run('dispatch',v),'reserved');assert.equal(f.run('dispatch',v),'denied');assert.equal(f.run('record',{...v,outcome:'delivered',usageMicros:62421}),'recorded');assert.equal(f.run('reserve',v),'duplicate');}
 const f=fixture(),initial=value();deliver(f,initial);
 // Same day/owner/source: exceeds all old 3+1 and daily5 quotas without bypass.
 for(let i=0;i<7;i++)deliver(f,value('initial'));
 for(let i=0;i<7;i++)deliver(f,value('revision','synthetic_a',initial.briefId));
 assert.equal(f.run('reserve',value('revision','synthetic_b',initial.briefId)),'denied');
 assert.equal(f.run('reserve',value('initial','intruder')),'denied');
 const request=value('initial','synthetic_b');assert.equal(f.run('reserve',request),'reserved');
 assert.equal(f.run('dispatch',{...request,identity:'synthetic_a'}),'denied');
 const claimed=await Promise.all(Array.from({length:12},()=>f.race('dispatch',request)));assert.equal(claimed.filter(x=>x==='reserved').length,1);
 assert.equal(f.run('record',{...request,outcome:'unknown',usageMicros:null}),'recorded');
 assert.equal(f.run('reserve',value()),'denied');assert.equal(f.run('dispatch',request),'denied');
 assert.equal(f.read().reservations[request.requestKey].state,'unknown');assert.equal(redis.run('PTTL',f.bound.ledgerKey),'-1');
 const races=fixture();const attempts=Array.from({length:12},()=>value());
 const reserved=await Promise.all(attempts.map(v=>races.race('reserve',v)));assert.equal(reserved.filter(x=>x==='reserved').length,1);
 const budget=fixture();for(let i=0;i<80;i++)deliver(budget,value(i%2?'initial':'initial',i%2?'synthetic_a':'synthetic_b'));
 assert.equal(budget.run('reserve',value()),'denied');assert.equal(Object.values(budget.read().reservations).reduce((n,r)=>n+r.reservedMicros,0),20000000);
 const anomaly=fixture(),av=value();assert.equal(anomaly.run('reserve',av),'reserved');assert.equal(anomaly.run('dispatch',av),'reserved');assert.equal(anomaly.run('record',{...av,outcome:'delivered',usageMicros:130001}),'recorded');assert.equal(anomaly.read().reservations[av.requestKey].state,'unknown');assert.equal(anomaly.run('reserve',value()),'denied');
 for(const patch of [{ownerApproved:false},{expiresAt:now-1},{runtimeBinding:'b'.repeat(64)}]){const rejected=fixture(patch),before=redis.run('GET',rejected.bound.ledgerKey);assert.equal(rejected.run('reserve',value()),'denied');assert.equal(redis.run('GET',rejected.bound.ledgerKey),before);}
 const legacyKey='novora:beta-admission:trial-preview:v1:'+sha(randomUUID()),legacy='{\"historicalUnknown\":true}';assert.equal(redis.run('SET',legacyKey,legacy,'NX'),'OK');assert.equal(redis.run('EVAL',script,'1',legacyKey,'reserve',f.bound.authorityId,f.bound.runtimeBinding,JSON.stringify(f.authority),JSON.stringify(value())),'denied');assert.equal(redis.run('GET',legacyKey),legacy);
 // Even matching forged expected/actual records cannot erase known liabilities.
 const lower=fixture();for(const patch of [{m2CommittedMicros:0},{mvpCommittedMicros:0}]){const a={...lower.authority,...patch};redis.run('SET',lower.bound.ledgerKey,JSON.stringify({version:1,authority:a,reservations:{}}));assert.equal(redis.run('EVAL',script,'1',lower.bound.ledgerKey,'reserve',lower.bound.authorityId,lower.bound.runtimeBinding,JSON.stringify(a),JSON.stringify(value())),'denied');}
 console.log(JSON.stringify({redis:redis.run('PING'),luaSha256:sha(script),budgetRows:80,reserveRacers:12,dispatchRacers:12,oldKeysUnchanged:true}));
});
