import "server-only";
import contract from "../../../tools/invitation-shared-budget-contract.cjs";
import { FIRST_PREVIEW_COST_CONTRACT, FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION } from "./first-preview-cost-contract";
import { FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS, FIRST_PREVIEW_VISUAL_PRIVACY_MODEL } from "./first-preview-visual-privacy-contract";
import { OPENAI_FIRST_PREVIEW_MODEL } from "./openai-first-preview-provider";

type Environment = Readonly<Record<string,string|undefined>>;
export function resolveSharedBudgetSpending(environment:Environment,roster:readonly Readonly<{identity:string;credentialSha256:string}>[]|null,runtime:string|undefined){
 try {
  if(OPENAI_FIRST_PREVIEW_MODEL!=="gpt-image-2-2026-04-21"||FIRST_PREVIEW_VISUAL_PRIVACY_MODEL!=="gpt-4.1-mini-2025-04-14"||contract.IMAGE_PRICING!==FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION||FIRST_PREVIEW_COST_CONTRACT.perAttemptReservationLimitMicros!==contract.IMAGE_COST_LIMIT||
   FIRST_PREVIEW_COST_CONTRACT.textInputTokenCostMicros!==5||FIRST_PREVIEW_COST_CONTRACT.imageOutputTokenCostMicros!==30||
   FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS!==contract.PRIVACY_COST_LIMIT||
   environment.NOVORA_INVITATION_TRIAL_SPENDING_MODE!==contract.MODE||environment.NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED!=="true"||
   environment.VERCEL!=="1"||environment.VERCEL_ENV!=="preview"||(environment.VERCEL_TARGET_ENV??environment.VERCEL_ENV)!=="preview"||
   environment.NODE_ENV!=="production"||runtime!=="nodejs"||environment.NEXT_PHASE==="phase-production-build"||
   environment.VERCEL_PROJECT_ID!==contract.PROJECT||environment.VERCEL_GIT_COMMIT_REF!==contract.BRANCH||
   environment.NOVORA_BETA_ADMISSION_ENABLED!=="true"||environment.NOVORA_INSTANT_PREVIEW_AGENT_ENABLED!=="true"||
   environment.NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED!=="true"||
   [environment.NOVORA_TEST_IMAGE_PACKAGES_ENABLED,environment.NOVORA_PAYPAL_SANDBOX_ENABLED].some(v=>v!==undefined&&v!=="false"))return null;
  const raw=environment.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG;if(!raw||raw.length>2048)return null;
  const selected=contract.selection(environment.NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE,JSON.parse(raw),roster,environment.NOVORA_BETA_SPENDING_AUTHORITY_ID);
  const binding=contract.binding(selected,environment.VERCEL_DEPLOYMENT_ID,environment.VERCEL_GIT_COMMIT_SHA);
  return binding?{selected,binding}:null;
 }catch{return null;}
}

// Separate budget-only mode: old USD1/025 Lua and historical allocations stay unchanged.
// No daily, per-person or image-kind quota. All decisions precede one SET.
// Usage above the existing successful-pipeline ceiling (0.10 image +0.03 privacy)
// stays UNKNOWN even below the outer0.25 reservation, stopping further dispatch.
export const SHARED_BUDGET_SPENDING_SCRIPT = `
local function integer(n) return type(n)=='number' and n>=0 and n<=9007199254740991 and n==math.floor(n) end
if KEYS[1]~='novora:beta-admission:shared-budget:v1:'..ARGV[3] or string.len(ARGV[3])~=64 then return 'denied' end
local raw=redis.call('GET',KEYS[1])
if not raw or string.len(raw)>4000000 or redis.call('PTTL',KEYS[1])~=-1 then return 'denied' end
local ok,l=pcall(cjson.decode,raw)
local expectedOk,e=pcall(cjson.decode,ARGV[4])
local inputOk,v=pcall(cjson.decode,ARGV[5])
if not ok or type(l)~='table' or l.version~=1 or type(l.authority)~='table' or type(l.reservations)~='table' or
 not expectedOk or type(e)~='table' or not inputOk or type(v)~='table' then return 'denied' end
local a=l.authority
-- Compare ALL pinned authority fields; a caller cannot downgrade an old record,
-- change roster, expiry, estimates or committed costs after a reservation.
local fields=0
for k,value in pairs(e) do fields=fields+1 if a[k]~=value then return 'denied' end end
local actualFields=0 for _ in pairs(a) do actualFields=actualFields+1 end
if fields~=actualFields or a.id~=ARGV[2] or a.runtimeBinding~=ARGV[3] or
 a.costAuthorityMode~='owner_shared_budget_seven_day_trial_v1' or
 a.costPolicyVersion~='novora_shared_usd20_retained_025_v1' or
 a.pricingVersion~='novora_image2_5_30_privacy_04_16_usd025_assumption_20261103_v1' or
 a.pricingAssumptionVersion~=a.pricingVersion or
 a.imagePricingVersion~='openai-gpt-image-2-2026-04-21-standard-1024x1024-medium-2026-08-03-v1' or
 a.promptMaxUtf8Bytes~=16000 or a.imageCostLimitMicros~=100000 or a.visualPrivacyCostLimitMicros~=30000 or
 a.imageModel~='gpt-image-2-2026-04-21' or a.imageSize~='1024x1024' or a.imageQuality~='medium' or a.imageCount~=1 or a.imageInput~=false or
 a.visualPrivacyModel~='gpt-4.1-mini-2025-04-14' or a.textInputTokenCostMicros~=5 or a.imageOutputTokenCostMicros~=30 or
 a.ownerApproved~=true or a.durabilityVerified~=true or
 a.ownerCostRiskAccepted~=true or a.costCeilingVerified~=false or a.automaticPaidRetries~=false or a.currency~='USD' or
 a.attemptReservationMicros~=250000 or not integer(a.expiresAt) or not integer(a.limitMicros) or
 not integer(a.startsAt) or a.expiresAt-a.startsAt~=604800 or
 a.limitMicros~=20000000 or
 not integer(a.expectedCostMicros) or a.expectedCostMicros<1 or not integer(a.reserveMicros) or
 a.expectedCostMicros+a.reserveMicros>250000 or not integer(a.m2CommittedMicros) or not integer(a.mvpCommittedMicros) or
 a.m2CommittedMicros<5050000 or a.mvpCommittedMicros<95050000 or a.mvpCommittedMicros<a.m2CommittedMicros or
 a.mvpCommittedMicros+a.limitMicros>200000000 then return 'denied' end
local now=tonumber(redis.call('TIME')[1])
if now<a.startsAt or now>=a.expiresAt then return 'denied' end
local function allowed(identity) return type(identity)=='string' and string.len(identity)>=1 and string.len(identity)<=64 and
 string.match(identity,'^[%w_-]+$') and string.find(a.identities,'|'..identity..'|',1,true)~=nil end
local function fingerprint(value)
 if type(value)~='string' then return false end
 return (string.len(value)==64 and string.match(value,'^[a-f0-9]+$')) or
  (string.len(value)==129 and string.sub(value,65,65)==':' and string.match(string.sub(value,1,64),'^[a-f0-9]+$') and string.match(string.sub(value,66),'^[a-f0-9]+$'))
end
local function validInput(r)
 return type(r)=='table' and allowed(r.identity) and type(r.requestKey)=='string' and string.len(r.requestKey)==64 and
 string.match(r.requestKey,'^[a-f0-9]+$') and
 type(r.briefId)=='string' and string.len(r.briefId)==36 and string.match(r.briefId,'^[a-f0-9%-]+$') and
 type(r.sourceBriefId)=='string' and string.len(r.sourceBriefId)==36 and string.match(r.sourceBriefId,'^[a-f0-9%-]+$') and
 fingerprint(r.fingerprint) and (r.kind=='initial' or r.kind=='revision') and
 (r.kind~='initial' or r.briefId==r.sourceBriefId)
end
if ARGV[1]=='reserve' and not validInput(v) then return 'denied' end
local total,size=0,0
local pending=false local found=nil local briefs={} local initialSource=nil
local day=math.floor(now/86400)
for key,r in pairs(l.reservations) do
 size=size+1
 if size>a.limitMicros/250000 or not validInput(r) or key~=r.requestKey or briefs[r.briefId] or
  r.reservedMicros~=250000 or r.authorityId~=a.id or r.configDigest~=a.configDigest or
  (r.usageMicros~=nil and not integer(r.usageMicros)) or
  not integer(r.day) or r.day>day or type(r.dispatched)~='boolean' or
  (r.state~='reserved' and r.state~='pending' and r.state~='unknown' and r.state~='reconciled') or
  (not r.dispatched and r.state~='reserved') or (r.dispatched and r.state=='reserved') or
  (r.state=='reconciled' and (not integer(r.usageMicros) or r.usageMicros>130000 or (r.outcome~='delivered' and r.outcome~='definite_failure'))) then return 'denied' end
 briefs[r.briefId]=true
 total=total+math.max(r.reservedMicros,r.usageMicros or 0)
 if r.kind=='initial' and r.identity==v.identity and r.briefId==v.sourceBriefId and r.state=='reconciled' and r.outcome=='delivered' then initialSource=r end
 if r.state~='reconciled' then pending=true end
 if r.briefId==v.briefId then found=r end
end
if total>a.limitMicros then return 'denied' end
if ARGV[1]~='reserve' and found then
 if v.identity~=nil and v.identity~=found.identity then return 'denied' end
 if v.requestKey~=nil and v.requestKey~=found.requestKey then return 'denied' end
 v.identity=found.identity v.requestKey=found.requestKey
end
if not validInput(v) then return 'denied' end
local function same(r) return r and r.identity==v.identity and r.requestKey==v.requestKey and r.briefId==v.briefId and
 r.sourceBriefId==v.sourceBriefId and r.kind==v.kind and r.fingerprint==v.fingerprint end
if ARGV[1]=='reserve' then
 local duplicate=l.reservations[v.requestKey]
 if duplicate then return same(duplicate) and 'duplicate' or 'denied' end
 if (v.kind=='revision' and not initialSource) or
  pending or found or total+250000>a.limitMicros then return 'denied' end
 local r={identity=v.identity,requestKey=v.requestKey,briefId=v.briefId,sourceBriefId=v.sourceBriefId,kind=v.kind,fingerprint=v.fingerprint,
  day=day,reservedMicros=250000,dispatched=false,state='reserved',authorityId=a.id,configDigest=a.configDigest}
 l.reservations[v.requestKey]=r
elseif ARGV[1]=='dispatch' then
 if not same(found) or found.dispatched or found.state~='reserved' then return 'denied' end
 for _,r in pairs(l.reservations) do if r~=found and r.state~='reconciled' then return 'denied' end end
 found.dispatched=true found.state='pending'
elseif ARGV[1]=='record' then
 if not same(found) or not found.dispatched or (v.outcome~='delivered' and v.outcome~='definite_failure' and v.outcome~='unknown') or
  (v.usageMicros~=cjson.null and not integer(v.usageMicros)) then return 'denied' end
 if found.state=='reconciled' then return found.outcome==v.outcome and found.usageMicros==v.usageMicros and 'recorded' or 'denied' end
 found.outcome=v.outcome
 if v.outcome~='unknown' and integer(v.usageMicros) and v.usageMicros<=130000 then
  found.usageMicros=v.usageMicros found.state='reconciled'
 else found.state='unknown' if integer(v.usageMicros) then found.usageMicros=v.usageMicros end end
else return 'denied' end
redis.call('SET',KEYS[1],cjson.encode(l))
return ARGV[1]=='record' and 'recorded' or 'reserved'
`;


export { contract as sharedBudgetSpendingContract };
