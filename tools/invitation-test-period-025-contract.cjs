'use strict';
// Separate engineering reservation policy. No I/O, grants or historical repricing.
const {createHash}=require('node:crypto');
const previous=require('./invitation-test-period-contract.cjs');
const MODE='owner_expected_cost_seven_day_trial_025_v1';
const PREFIX='novora:beta-admission:test-period-025:v1:';
const POLICY='novora_seven_day_usd025_utf8_16000_v1';
const PRICING='novora_image2_5_30_privacy_04_16_usd025_assumption_20261103_v1';
const RESERVATION=250000,MAX_PROMPT_UTF8_BYTES=16000,IMAGE_COST_LIMIT=100000,PRIVACY_COST_LIMIT=30000;
const sha=s=>createHash('sha256').update(s).digest('hex');
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const keys=['maximumInitialImages','maximumRevisions','limitMicros','expectedCostMicros','reserveMicros','m2CommittedMicros','mvpCommittedMicros','startsAt','expiresAt','maximumInitialImagesPerIdentity','maximumRevisionsPerIdentity','costPolicyVersion','pricingAssumptionVersion'];
function exact(v,ks){return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join() === [...ks].sort().join();}
function normalizeConfig(v){
 if(!exact(v,keys)||keys.filter(k=>!['costPolicyVersion','pricingAssumptionVersion'].includes(k)).some(k=>!integer(v[k]))||
  v.costPolicyVersion!==POLICY||v.pricingAssumptionVersion!==PRICING||v.expiresAt-v.startsAt!==previous.PERIOD_SECONDS||
  v.maximumInitialImages!==6||v.maximumRevisions!==2||v.maximumInitialImagesPerIdentity!==3||v.maximumRevisionsPerIdentity!==1||
  v.limitMicros!==8*RESERVATION||v.expectedCostMicros<1||v.expectedCostMicros+v.reserveMicros>RESERVATION||
  v.m2CommittedMicros+v.limitMicros>10000000||v.mvpCommittedMicros<v.m2CommittedMicros||v.mvpCommittedMicros+v.limitMicros>200000000)return null;
 return Object.fromEntries(keys.map(k=>[k,v[k]]));
}
function selection(namespace,config,roster,authorityLabel){
 const normalized=normalizeConfig(config);
 if(!normalized||!/^[A-Za-z0-9_-]{16,64}$/.test(namespace??'')||!/^[A-Za-z0-9_-]{1,64}$/.test(authorityLabel??'')||
  !Array.isArray(roster)||roster.length!==2||roster.some(r=>!exact(r,['identity','credentialSha256'])||!/^[A-Za-z0-9_-]{1,64}$/.test(r.identity)||!/^[a-f0-9]{64}$/.test(r.credentialSha256))||
  new Set(roster.map(r=>r.identity)).size!==2||new Set(roster.map(r=>r.credentialSha256)).size!==2)return null;
 const sorted=roster.map(r=>({identity:r.identity,credentialSha256:r.credentialSha256})).sort((a,b)=>a.identity<b.identity?-1:a.identity>b.identity?1:0);
 return {config:normalized,namespace,authorityLabel,roster:sorted,identities:'|'+sorted.map(r=>r.identity).join('|')+'|',
  rosterDigest:sha(JSON.stringify(sorted)),configDigest:sha(JSON.stringify(normalized)),
  receiptScope:sha(['novora_invitation_trial_receipt_v1',previous.PROJECT,'preview',namespace].join('\n'))};
}
function binding(s,deploymentId,sourceSha){
 const checked=s&&selection(s.namespace,s.config,s.roster,s.authorityLabel);
 if(!checked||['receiptScope','identities','rosterDigest','configDigest'].some(k=>s[k]!==checked[k])||!/^dpl_[A-Za-z0-9]{16,80}$/.test(deploymentId??'')||!/^[a-f0-9]{40}$/.test(sourceSha??''))return null;
 const runtimeBinding=sha([MODE,previous.PROJECT,previous.BRANCH,sourceSha,deploymentId,checked.authorityLabel,checked.receiptScope,checked.rosterDigest,checked.configDigest].join('\n'));
 return {runtimeBinding,ledgerKey:PREFIX+runtimeBinding,authorityId:'period025_'+runtimeBinding.slice(0,54)};
}
function authority(s,b){return {id:b.authorityId,ownerApproved:true,durabilityVerified:true,currency:'USD',pricingVersion:PRICING,
 imagePricingVersion:previous.PRICING,costAuthorityMode:MODE,ownerCostRiskAccepted:true,costCeilingVerified:false,automaticPaidRetries:false,
 runtimeBinding:b.runtimeBinding,receiptScope:s.receiptScope,rosterDigest:s.rosterDigest,identities:s.identities,configDigest:s.configDigest,...s.config,
 attemptReservationMicros:RESERVATION,maximumExperiences:8,maximumImages:8,maximumPaidAttempts:8,
 promptMaxUtf8Bytes:MAX_PROMPT_UTF8_BYTES,imageCostLimitMicros:IMAGE_COST_LIMIT,visualPrivacyCostLimitMicros:PRIVACY_COST_LIMIT,
 imageModel:'gpt-image-2-2026-04-21',imageSize:'1024x1024',imageQuality:'medium',imageCount:1,imageInput:false,
 visualPrivacyModel:'gpt-4.1-mini-2025-04-14',textInputTokenCostMicros:5,imageOutputTokenCostMicros:30};}
module.exports={MODE,PREFIX,POLICY,PRICING,IMAGE_PRICING:previous.PRICING,RESERVATION,MAX_PROMPT_UTF8_BYTES,IMAGE_COST_LIMIT,PRIVACY_COST_LIMIT,
 PERIOD_SECONDS:previous.PERIOD_SECONDS,PROJECT:previous.PROJECT,BRANCH:previous.BRANCH,normalizeConfig,selection,binding,authority};
