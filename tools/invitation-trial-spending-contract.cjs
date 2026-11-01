'use strict';
// Pure, shared operator/runtime contract. No I/O, defaults, credentials or grants.
const { createHash } = require('node:crypto');
const MODE = 'owner_expected_cost_bounded_trial_v1';
const PREFIX = 'novora:beta-admission:trial-preview:v1:';
const PRICING = 'openai-gpt-image-2-2026-04-21-standard-1024x1024-medium-2026-08-03-v1';
const PROJECT = 'prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg';
const BRANCH = 'integration/instant-first-preview-agent';
const RESERVATION = 1000000, M2_LIMIT = 10000000, MVP_LIMIT = 200000000;
const sha = value => createHash('sha256').update(value).digest('hex');
const integer = value => Number.isSafeInteger(value) && value >= 0;
function exact(value, keys) { return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join() === [...keys].sort().join(); }
function normalizeConfig(value) {
  const keys = ['maximumInitialImages','maximumRevisions','limitMicros','expectedCostMicros','reserveMicros','m2CommittedMicros','mvpCommittedMicros','expiresAt'];
  if (!exact(value, keys) || !keys.every(key => integer(value[key])) || value.maximumInitialImages < 1 || value.maximumRevisions < 1 ||
      value.maximumInitialImages + value.maximumRevisions > 10 || value.limitMicros !== (value.maximumInitialImages + value.maximumRevisions) * RESERVATION ||
      value.expectedCostMicros < 1 || value.expectedCostMicros + value.reserveMicros > RESERVATION || value.expiresAt < 1 ||
      value.m2CommittedMicros + value.limitMicros > M2_LIMIT || value.mvpCommittedMicros < value.m2CommittedMicros ||
      value.mvpCommittedMicros + value.limitMicros > MVP_LIMIT) return null;
  return Object.fromEntries(keys.map(key => [key, value[key]]));
}
function selection(namespace, config, roster, authorityLabel) {
  const normalized = normalizeConfig(config);
  if (!normalized || !/^[A-Za-z0-9_-]{16,64}$/.test(namespace ?? '') || !/^[A-Za-z0-9_-]{1,64}$/.test(authorityLabel ?? '') ||
      !Array.isArray(roster) || roster.length < 1 || roster.length > 10 || roster.some(item => !exact(item, ['identity','credentialSha256']) ||
        !/^[A-Za-z0-9_-]{1,64}$/.test(item.identity) || !/^[a-f0-9]{64}$/.test(item.credentialSha256)) ||
      new Set(roster.map(item => item.identity)).size !== roster.length || new Set(roster.map(item => item.credentialSha256)).size !== roster.length) return null;
  const sorted = roster.map(item => ({identity:item.identity,credentialSha256:item.credentialSha256})).sort((a,b) => a.identity < b.identity ? -1 : a.identity > b.identity ? 1 : 0);
  return { config:normalized, namespace, authorityLabel, roster:sorted,
    identities:'|' + sorted.map(item => item.identity).join('|') + '|',
    rosterDigest:sha(JSON.stringify(sorted)), configDigest:sha(JSON.stringify(normalized)),
    receiptScope:sha(['novora_invitation_trial_receipt_v1', PROJECT, 'preview', namespace].join('\n')) };
}
function binding(selected, deploymentId, sourceSha) {
  if (!selected || !/^dpl_[A-Za-z0-9]{16,80}$/.test(deploymentId ?? '') || !/^[a-f0-9]{40}$/.test(sourceSha ?? '')) return null;
  const runtimeBinding = sha(['novora_test_trial_preview_v1', PROJECT, BRANCH, sourceSha, deploymentId,
    selected.authorityLabel, selected.receiptScope, selected.rosterDigest, selected.configDigest].join('\n'));
  return { runtimeBinding, ledgerKey:PREFIX + runtimeBinding, authorityId:'trial_' + runtimeBinding.slice(0,56) };
}
function authority(selected, bound) {
  const c = selected.config, count = c.maximumInitialImages + c.maximumRevisions;
  return { id:bound.authorityId, ownerApproved:true, durabilityVerified:true, currency:'USD', pricingVersion:PRICING,
    costAuthorityMode:MODE, ownerCostRiskAccepted:true, costCeilingVerified:false, automaticPaidRetries:false,
    runtimeBinding:bound.runtimeBinding, receiptScope:selected.receiptScope, rosterDigest:selected.rosterDigest,
    identities:selected.identities, configDigest:selected.configDigest, ...c,
    attemptReservationMicros:RESERVATION, maximumExperiences:count, maximumImages:count, maximumPaidAttempts:count };
}
function observationValid(value, selected, bound, identity, now, ownerDeadline) {
  if (!value || !selected || !bound || !selected.roster.some(item => item.identity === identity)) return false;
  const expected = authority(selected,bound);
  const fields = ['kind','observedAt','authorityId','ledgerKey','identity','revocationReady', ...Object.keys(expected).filter(key => key !== 'id')];
  if (!exact(value,fields) || value.kind !== 'operator_console_observation' || value.revocationReady !== true ||
      !Number.isFinite(value.observedAt) || value.observedAt > now || value.observedAt < now-60000 ||
      value.authorityId !== bound.authorityId || value.ledgerKey !== bound.ledgerKey || value.identity !== identity ||
      value.expiresAt !== selected.config.expiresAt*1000 || value.expiresAt <= now || value.expiresAt > now+3600000 || value.expiresAt > ownerDeadline) return false;
  return Object.entries(expected).every(([key,item]) => key==='id' || key==='expiresAt' || value[key] === item);
}
module.exports = { MODE,PREFIX,PRICING,PROJECT,BRANCH,RESERVATION,M2_LIMIT,MVP_LIMIT,normalizeConfig,selection,binding,authority,observationValid };
