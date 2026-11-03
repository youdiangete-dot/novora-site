const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const c=require('../../tools/invitation-test-period-025-contract.cjs'),old=require('../../tools/invitation-test-period-contract.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');
const roster=[{identity:'synthetic_a',credentialSha256:sha('a'.repeat(43))},{identity:'synthetic_b',credentialSha256:sha('b'.repeat(43))}];
const config={maximumInitialImages:6,maximumRevisions:2,limitMicros:2000000,expectedCostMicros:100000,reserveMicros:150000,m2CommittedMicros:5050000,mvpCommittedMicros:95050000,startsAt:1900000000,expiresAt:1900604800,maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1,costPolicyVersion:c.POLICY,pricingAssumptionVersion:c.PRICING};
test('new version retains confirmed obligations and unchanged caps, reserves2USD for eight operations',()=>{
 assert.deepEqual(c.normalizeConfig(config),config);assert.equal(config.m2CommittedMicros+config.limitMicros,7050000);assert.equal(config.mvpCommittedMicros+config.limitMicros,97050000);
 assert.equal(c.normalizeConfig({...config,m2CommittedMicros:8000001}),null);assert.equal(c.normalizeConfig({...config,mvpCommittedMicros:198000001}),null);
 assert.equal(c.normalizeConfig({...config,limitMicros:8000000}),null);assert.equal(old.RESERVATION,1000000);
});
test('wrong policy/pricing, quota/period, excess estimates and unrecognized fields cannot downgrade config',()=>{
 for(const patch of [{costPolicyVersion:'legacy'},{pricingAssumptionVersion:old.PRICING},{maximumInitialImagesPerIdentity:4},{maximumRevisionsPerIdentity:2},{expiresAt:config.expiresAt+1},{expectedCostMicros:250001},{reserveMicros:250001},{costCeilingVerified:true}])assert.equal(c.normalizeConfig({...config,...patch}),null);
});
test('separate ledger identity pins source/deployment/roster/config while keeping stable read scope',()=>{
 const s=c.selection('synthetic_namespace_025',config,roster,'synthetic_authority'),b=c.binding(s,'dpl_syntheticPeriod025123456','c'.repeat(40)),a=c.authority(s,b);
 assert.match(b.ledgerKey,/^novora:beta-admission:test-period-025:v1:[a-f0-9]{64}$/);
 assert.equal(a.attemptReservationMicros,250000);assert.equal(a.imageCostLimitMicros,100000);assert.equal(a.visualPrivacyCostLimitMicros,30000);assert.equal(a.promptMaxUtf8Bytes,16000);
 assert.equal(a.costCeilingVerified,false);assert.equal(a.automaticPaidRetries,false);assert.equal(a.imageInput,false);assert.equal(a.imagePricingVersion,old.PRICING);
 for(const changed of [c.selection('synthetic_namespace_025',{...config,m2CommittedMicros:5050001},roster,'synthetic_authority'),c.selection('synthetic_namespace_025',config,[{...roster[0],credentialSha256:sha('different')},roster[1]],'synthetic_authority')])assert.notEqual(c.binding(changed,'dpl_syntheticPeriod025123456','c'.repeat(40)).ledgerKey,b.ledgerKey);
 assert.notEqual(c.binding(s,'dpl_syntheticPeriod025999999','c'.repeat(40)).ledgerKey,b.ledgerKey);assert.notEqual(c.binding(s,'dpl_syntheticPeriod025123456','d'.repeat(40)).ledgerKey,b.ledgerKey);
 for(const field of ['receiptScope','rosterDigest','configDigest','identities'])assert.equal(c.binding({...s,[field]:'forged'},'dpl_syntheticPeriod025123456','c'.repeat(40)),null);
});
