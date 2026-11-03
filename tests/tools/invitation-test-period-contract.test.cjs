'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const c = require('../../tools/invitation-test-period-contract.cjs');
const original = require('../../tools/invitation-trial-spending-contract.cjs');
// Synthetic engineering fixture, NOT the actual historical commitments.
const config = { maximumInitialImages:6,maximumRevisions:2,limitMicros:8000000,
  expectedCostMicros:668217,reserveMicros:250000,m2CommittedMicros:1000000,mvpCommittedMicros:90000000,
  startsAt:1000,expiresAt:1000+c.PERIOD_SECONDS,maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1 };
const roster = [{identity:'synthetic_a',credentialSha256:'a'.repeat(64)},{identity:'synthetic_b',credentialSha256:'b'.repeat(64)}];
const select = value => c.selection('synthetic_period_namespace',value ?? config,roster,'synthetic_period_authority');

test('period is exactly seven days, two identities, three initial and one revision each',()=>{
  const s=select(); assert.equal(s.config.maximumInitialImages,6); assert.equal(s.config.maximumRevisions,2);
  for (const patch of [{startsAt:1001},{expiresAt:config.expiresAt+1},{maximumInitialImagesPerIdentity:4},
    {maximumRevisionsPerIdentity:2},{maximumInitialImages:5},{maximumRevisions:3},{limitMicros:7000000},{unexpected:true}])
    assert.equal(select({...config,...patch}),null);
  for (const rows of [roster.slice(0,1),[...roster,{identity:'synthetic_c',credentialSha256:'c'.repeat(64)}],[roster[0],roster[0]]])
    assert.equal(c.selection('synthetic_period_namespace',config,rows,'synthetic_period_authority'),null);
});
test('actual confirmed commitments fail closed under unchanged M2 cap; no reserve reduction or refund',()=>{
  assert.equal(c.RESERVATION,1000000);
  assert.equal(select({...config,m2CommittedMicros:5050000,mvpCommittedMicros:95050000}),null);
  assert.equal(select({...config,limitMicros:124777}),null);
  assert.equal(select({...config,m2CommittedMicros:2000000}).config.limitMicros,8000000);
  assert.equal(select({...config,m2CommittedMicros:2000001}),null);
  assert.equal(select({...config,mvpCommittedMicros:192000001}),null);
});
test('mode and namespace are distinct while receipt ownership remains compatible',()=>{
  const s=select(), bound=c.binding(s,'dpl_syntheticPeriod12345678','c'.repeat(40));
  const legacyConfig=Object.fromEntries(Object.entries(config).filter(([key])=>!['startsAt','maximumInitialImagesPerIdentity','maximumRevisionsPerIdentity'].includes(key)));
  const legacy=original.selection(s.namespace,legacyConfig,roster,s.authorityLabel);
  assert.equal(s.receiptScope,legacy.receiptScope);
  assert.notEqual(bound.ledgerKey,original.binding(legacy,'dpl_syntheticPeriod12345678','c'.repeat(40)).ledgerKey);
  assert.match(bound.ledgerKey,/^novora:beta-admission:test-period:v1:[a-f0-9]{64}$/);
  assert.notEqual(c.binding(s,'dpl_syntheticPeriod12345679','c'.repeat(40)).runtimeBinding,bound.runtimeBinding);
  assert.notEqual(c.binding(select({...config,startsAt:1001,expiresAt:config.expiresAt+1}),'dpl_syntheticPeriod12345678','c'.repeat(40)).runtimeBinding,bound.runtimeBinding);
});
test('authority retains risk declaration, full reserve and immutable original limits',()=>{
  const s=select(), bound=c.binding(s,'dpl_syntheticPeriod12345678','c'.repeat(40)),a=c.authority(s,bound);
  assert.equal(a.costAuthorityMode,c.MODE); assert.equal(a.maximumPaidAttempts,8);
  assert.equal(a.maximumInitialImagesPerIdentity,3);assert.equal(a.maximumRevisionsPerIdentity,1);
  assert.equal(a.costCeilingVerified,false);assert.equal(a.automaticPaidRetries,false);
  assert.equal(a.attemptReservationMicros,1000000);assert.equal(a.limitMicros,8000000);
  assert.equal(original.RESERVATION,1000000);assert.equal(original.MODE,'owner_expected_cost_bounded_trial_v1');
});
