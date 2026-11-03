'use strict';
// Pure opt-in contract. It never provisions authority, changes budget caps or
// refunds history. Actual historical commitments must be supplied by an owner.
const { createHash } = require('node:crypto');
const original = require('./invitation-trial-spending-contract.cjs');
const MODE = 'owner_expected_cost_seven_day_trial_v1';
const PREFIX = 'novora:beta-admission:test-period:v1:';
const PERIOD_SECONDS = 7 * 24 * 60 * 60;
const sha = value => createHash('sha256').update(value).digest('hex');
const extra = ['startsAt', 'maximumInitialImagesPerIdentity', 'maximumRevisionsPerIdentity'];
const baseKeys = ['maximumInitialImages','maximumRevisions','limitMicros','expectedCostMicros','reserveMicros','m2CommittedMicros','mvpCommittedMicros','expiresAt'];
function normalizeConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join() !== [...baseKeys,...extra].sort().join() ||
      !extra.every(key => Number.isSafeInteger(value[key]) && value[key] >= 0) ||
      value.expiresAt - value.startsAt !== PERIOD_SECONDS ||
      value.maximumInitialImages !== 6 || value.maximumRevisions !== 2 ||
      value.maximumInitialImagesPerIdentity !== 3 || value.maximumRevisionsPerIdentity !== 1) return null;
  const base = original.normalizeConfig(Object.fromEntries(baseKeys.map(key => [key,value[key]])));
  return base ? { ...base, ...Object.fromEntries(extra.map(key => [key,value[key]])) } : null;
}
function selection(namespace, config, roster, authorityLabel) {
  const normalized = normalizeConfig(config);
  if (!normalized || !Array.isArray(roster) || roster.length !== 2) return null;
  const selected = original.selection(namespace, Object.fromEntries(baseKeys.map(key => [key,normalized[key]])), roster, authorityLabel);
  return selected ? { ...selected, config:normalized, configDigest:sha(JSON.stringify(normalized)) } : null;
}
function binding(selected, deploymentId, sourceSha) {
  if (!selected || !normalizeConfig(selected.config) || selected.roster?.length !== 2 ||
      !/^dpl_[A-Za-z0-9]{16,80}$/.test(deploymentId ?? '') || !/^[a-f0-9]{40}$/.test(sourceSha ?? '')) return null;
  const runtimeBinding = sha([MODE,original.PROJECT,original.BRANCH,sourceSha,deploymentId,
    selected.authorityLabel,selected.receiptScope,selected.rosterDigest,selected.configDigest].join('\n'));
  return { runtimeBinding, ledgerKey:PREFIX + runtimeBinding, authorityId:'period_' + runtimeBinding.slice(0,56) };
}
function authority(selected, bound) {
  return { ...original.authority(selected,bound), costAuthorityMode:MODE };
}
module.exports = { MODE,PREFIX,PERIOD_SECONDS,PRICING:original.PRICING,PROJECT:original.PROJECT,
  BRANCH:original.BRANCH,RESERVATION:original.RESERVATION,normalizeConfig,selection,binding,authority };
