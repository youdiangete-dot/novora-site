'use strict';
// Two-person nonpayment pilot. No per-person, daily or image-kind package quota.
// 0.25 is a retained engineering allocation per dispatch, NOT a provider bill cap.
const {createHash}=require('node:crypto');
const profile=require('./invitation-test-period-025-contract.cjs');
const MODE='owner_shared_budget_seven_day_trial_v1';
const PREFIX='novora:beta-admission:shared-budget:v1:';
const POLICY='novora_shared_usd20_retained_025_v1';
const keys=['limitMicros','expectedCostMicros','reserveMicros','m2CommittedMicros','mvpCommittedMicros','startsAt','expiresAt','costPolicyVersion','pricingAssumptionVersion'];
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const sha=s=>createHash('sha256').update(s).digest('hex');
function exact(v,ks){return v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===[...ks].sort().join();}
function normalizeConfig(v){
 if(!exact(v,keys)||keys.filter(k=>!['costPolicyVersion','pricingAssumptionVersion'].includes(k)).some(k=>!integer(v[k]))||
  v.costPolicyVersion!==POLICY||v.pricingAssumptionVersion!==profile.PRICING||v.expiresAt-v.startsAt!==profile.PERIOD_SECONDS||
  v.limitMicros!==20000000||v.expectedCostMicros<1||v.expectedCostMicros+v.reserveMicros>profile.RESERVATION||
  v.m2CommittedMicros<5050000||v.mvpCommittedMicros<95050000||v.mvpCommittedMicros<v.m2CommittedMicros||v.mvpCommittedMicros+v.limitMicros>200000000)return null;
 // Owner's new pilot allocation does not rewrite or refund previous M2 costs.
 // Old modes still enforce their original USD10 M2 ceiling unchanged.
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
  receiptScope:sha(['novora_invitation_trial_receipt_v1',profile.PROJECT,'preview',namespace].join('\n'))};
}
function binding(s,deploymentId,sourceSha){
 const checked=s&&selection(s.namespace,s.config,s.roster,s.authorityLabel);
 if(!checked||['receiptScope','identities','rosterDigest','configDigest'].some(k=>s[k]!==checked[k])||!/^dpl_[A-Za-z0-9]{16,80}$/.test(deploymentId??'')||!/^[a-f0-9]{40}$/.test(sourceSha??''))return null;
 const runtimeBinding=sha([MODE,profile.PROJECT,profile.BRANCH,sourceSha,deploymentId,checked.authorityLabel,checked.receiptScope,checked.rosterDigest,checked.configDigest].join('\n'));
 return {runtimeBinding,ledgerKey:PREFIX+runtimeBinding,authorityId:'shared_'+runtimeBinding.slice(0,55)};
}
function authority(s,b){
 return {id:b.authorityId,ownerApproved:true,durabilityVerified:true,currency:'USD',pricingVersion:profile.PRICING,
  imagePricingVersion:profile.IMAGE_PRICING,costAuthorityMode:MODE,ownerCostRiskAccepted:true,costCeilingVerified:false,automaticPaidRetries:false,
  runtimeBinding:b.runtimeBinding,receiptScope:s.receiptScope,rosterDigest:s.rosterDigest,identities:s.identities,configDigest:s.configDigest,...s.config,
  attemptReservationMicros:profile.RESERVATION,
  promptMaxUtf8Bytes:profile.MAX_PROMPT_UTF8_BYTES,imageCostLimitMicros:profile.IMAGE_COST_LIMIT,visualPrivacyCostLimitMicros:profile.PRIVACY_COST_LIMIT,
  imageModel:'gpt-image-2-2026-04-21',imageSize:'1024x1024',imageQuality:'medium',imageCount:1,imageInput:false,
  visualPrivacyModel:'gpt-4.1-mini-2025-04-14',textInputTokenCostMicros:5,imageOutputTokenCostMicros:30};
}
module.exports={...profile,MODE,PREFIX,POLICY,normalizeConfig,selection,binding,authority};
