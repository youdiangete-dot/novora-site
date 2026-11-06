import {test, expect} from "@playwright/test";
import {createHash} from "node:crypto";
import Module, {createRequire} from "node:module";
import type {AutomaticFirstPreviewWorkerDependencies} from "../../lib/server/ai-sketch/first-preview-generation-lifecycle";
import {createSyntheticFirstPreviewPng} from "../fixtures/ai-sketch/fake-first-preview-storage-client";

const req=createRequire(__filename),loader=Module as unknown as {_resolveFilename:(...args:any[])=>string},original=loader._resolveFilename;
loader._resolveFilename=function(name,...args){return name==="server-only"?req.resolve("next/dist/compiled/server-only/empty.js"):original.call(this,name,...args);};
const beta=req("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission");
const {triggerAutomaticFirstPreviewAfterPersistence:trigger}=req("../../lib/server/ai-sketch/first-preview-automatic-trigger") as typeof import("../../lib/server/ai-sketch/first-preview-automatic-trigger");
const {consumeFirstPreviewQueueMessage:consume}=req("../../lib/server/ai-sketch/first-preview-queue") as typeof import("../../lib/server/ai-sketch/first-preview-queue");
const {InMemoryFirstPreviewRepository}=req("../../lib/server/ai-sketch/in-memory-first-preview-repository") as typeof import("../../lib/server/ai-sketch/in-memory-first-preview-repository");
const {createSourceBoundRevisionService}=req("../../lib/server/ai-sketch/first-preview-revision") as typeof import("../../lib/server/ai-sketch/first-preview-revision");
const {testPeriodSpendingContract:c,TEST_PERIOD_SPENDING_SCRIPT}=req("../../lib/server/ai-sketch/invitation-test-period-spending") as typeof import("../../lib/server/ai-sketch/invitation-test-period-spending");
const {testPeriod025SpendingContract:low,TEST_PERIOD_025_SPENDING_SCRIPT}=req("../../lib/server/ai-sketch/invitation-test-period-025-spending") as typeof import("../../lib/server/ai-sketch/invitation-test-period-025-spending");
const {sharedBudgetSpendingContract:shared,SHARED_BUDGET_SPENDING_SCRIPT}=req("../../lib/server/ai-sketch/invitation-shared-budget-spending") as typeof import("../../lib/server/ai-sketch/invitation-shared-budget-spending");
const lifecycle=req("../../lib/server/ai-sketch/first-preview-generation-lifecycle") as typeof import("../../lib/server/ai-sketch/first-preview-generation-lifecycle");
const providerPolicy=req("../../lib/server/ai-sketch/openai-first-preview-provider") as typeof import("../../lib/server/ai-sketch/openai-first-preview-provider");
loader._resolveFilename=original;
const hash=(v:string|Uint8Array)=>createHash("sha256").update(v).digest("hex");
const brief="123e4567-e89b-42d3-a456-426614174000",job="223e4567-e89b-42d3-a456-426614174000",output="323e4567-e89b-42d3-a456-426614174000",operation="423e4567-e89b-42d3-a456-426614174000",reference="NOVORA-CB-20261103-IT01";
const credential="a".repeat(43),roster=[{identity:"synthetic_a",credentialSha256:hash(credential)},{identity:"synthetic_b",credentialSha256:hash("b".repeat(43))}];
const payload={pieceType:"ring",designIntent:"A balanced heirloom ring with a pear center stone.",designDescription:"A refined silhouette suitable for daily wear.",styleDirection:["warm heirloom"],materialDirection:["warm yellow gold"],stones:[{role:"center",type:"lab-grown diamond",shape:"pear",orientation:"point toward fingertip",setting:"five prongs"}],centerStoneDirection:"Pear point aligned toward the fingertip.",stoneArrangement:"Center stone with two shoulder accents.",dimensions:["ring size to confirm"],composition:"Low center with tapered shoulders.",wearabilityRequirements:["daily wear"],manufacturingConstraints:["structurally explainable prongs"],unknowns:["exact ring size"],avoid:["hidden halo"],requestedViews:["front view","side profile"]};
function environment(){const start=Math.floor(Date.now()/1000)-2*86400;return {
 NOVORA_BETA_ADMISSION_ENABLED:"true",NOVORA_BETA_INVITATIONS_JSON:JSON.stringify(roster),NOVORA_BETA_SPENDING_AUTHORITY_ID:"synthetic_integrated_period",NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED:"true",NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE:"synthetic_integrated_period_namespace",NOVORA_INVITATION_TRIAL_SPENDING_MODE:c.MODE,
 // Smaller synthetic commitments exercise valid paths; the real commitments are denied below.
 NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:JSON.stringify({maximumInitialImages:6,maximumRevisions:2,limitMicros:8000000,expectedCostMicros:668217,reserveMicros:250000,m2CommittedMicros:1000000,mvpCommittedMicros:90000000,startsAt:start,expiresAt:start+c.PERIOD_SECONDS,maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1}),
 NOVORA_INSTANT_PREVIEW_AGENT_ENABLED:"true",NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:"true",NOVORA_TEST_IMAGE_PACKAGES_ENABLED:"false",NOVORA_PAYPAL_SANDBOX_ENABLED:"false",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview",NODE_ENV:"production",NEXT_RUNTIME:"nodejs",VERCEL_PROJECT_ID:c.PROJECT,VERCEL_GIT_COMMIT_REF:c.BRANCH,VERCEL_GIT_COMMIT_SHA:"c".repeat(40),VERCEL_DEPLOYMENT_ID:"dpl_syntheticIntegration12345678",UPSTASH_REDIS_REST_URL:"https://synthetic.invalid",UPSTASH_REDIS_REST_TOKEN:"synthetic-only"};}
function fixture(options:{unknownDispatch?:boolean;unknownRevision?:boolean;lowMode?:boolean;sharedMode?:boolean;imageOutputTokens?:number}={}){
 const env=environment(),commands:any[][]=[],published:unknown[]=[],calls:string[]=[];
 if(options.lowMode){env.NOVORA_INVITATION_TRIAL_SPENDING_MODE=low.MODE;env.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG=JSON.stringify({...JSON.parse(env.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG),limitMicros:2000000,expectedCostMicros:100000,reserveMicros:150000,m2CommittedMicros:5050000,mvpCommittedMicros:95050000,costPolicyVersion:low.POLICY,pricingAssumptionVersion:low.PRICING});}
 if(options.sharedMode){const cfg=JSON.parse(env.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG);env.NOVORA_INVITATION_TRIAL_SPENDING_MODE=shared.MODE;env.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG=JSON.stringify({limitMicros:20000000,expectedCostMicros:100000,reserveMicros:150000,m2CommittedMicros:5050000,mvpCommittedMicros:95050000,startsAt:cfg.startsAt,expiresAt:cfg.expiresAt,costPolicyVersion:shared.POLICY,pricingAssumptionVersion:shared.PRICING});}
 let tick=60,dispatches=0;
 const repository=new InMemoryFirstPreviewRepository(()=>new Date(Date.parse("2026-08-06T00:00:00Z")+tick++*1000).toISOString());
 // Injected HTTP fixture: it proves transport/application wiring, not execution or atomicity of Lua.
 const ledger=beta.createRedisBetaAdmissionLedger(env,async(_url,init)=>{
  const cmd=JSON.parse(String(init?.body));commands.push(cmd);expect(cmd[0]).toBe("EVAL");expect(cmd[1]).toBe(options.sharedMode?SHARED_BUDGET_SPENDING_SCRIPT:options.lowMode?TEST_PERIOD_025_SPENDING_SCRIPT:TEST_PERIOD_SPENDING_SCRIPT);
  const op=cmd[4],v=JSON.parse(cmd[8]);calls.push(`cost:${op}:${v.kind}`);
  if(op==="dispatch"){dispatches++;if(options.unknownDispatch||(options.unknownRevision&&v.kind==="revision"))throw Error("SYNTHETIC_UNKNOWN_DISPATCH");}
  return new Response(JSON.stringify({result:op==="record"?"recorded":"reserved"}));
 })!;
 const png=createSyntheticFirstPreviewPng();
 const worker:AutomaticFirstPreviewWorkerDependencies={repository,betaAdmissionDependencies:{environment:env,ledger},outputIdSource:()=>output,
  createProvider:()=>({adapter:{async generateFirstPreviewImage(){calls.push("provider");return {ok:true,imageBase64:Buffer.from(png).toString("base64"),mimeType:"image/png",width:1024,height:1024,byteSize:png.length,model:"gpt-image-2-2026-04-21",providerRequestId:"req_synthetic_integration"};}},readValidatedUsage:()=>({textInputTokens:100,imageOutputTokens:options.imageOutputTokens??100}),readProviderRequestId:()=>"req_synthetic_integration"}),
  createAssetStore:()=>({kind:"supabase",async persistValidatedPng(v){return {ok:true,value:{disposition:"created",asset:{assetId:`first-preview/${v.conceptBriefId}/${v.jobId}/${v.outputId}.png`,assetPersisted:true,bucketName:"novora-ai-sketches",mimeType:"image/png",byteSize:v.imageBytes.length,widthPx:1024,heightPx:1024,contentSha256:hash(v.imageBytes),assetCreatedAt:"2026-08-06T00:01:00.000Z",assetValidatedAt:"2026-08-06T00:01:00.000Z"}}};},async readAuthorizedPng(){return {ok:false,code:"access_denied"};}}),
  evaluateTrustedOutput:async(input,context)=>{calls.push("privacy");expect(await context.reserveVisualPrivacyInspection?.()).toBe(true);return {evidenceVersion:"novora_first_preview_trusted_output_evidence_v2",subject:input.subject,visualPrivacyEvidence:{subject:input.subject,inspectorVersion:"novora_openai_visual_privacy_inspector_v1",policyVersion:"novora_first_preview_visual_privacy_v1",model:"gpt-4.1-mini-2025-04-14",result:"passed",usageTrusted:true,actualCostMicros:1000},results:{contentSafetyPassed:true,privacyPassed:true,outputValidityPassed:true}};}};
 const request=new Request("https://synthetic.invalid/api/concept-briefs",{method:"POST",headers:{Authorization:`Bearer ${credential}`,"idempotency-key":"synthetic_request_0001"}});
 const triggerOne=()=>trigger({payload,admissionRequest:request,persistenceConfirmed:true,customerAccessProofEstablished:true,conceptBriefId:brief,publicReference:reference},{featureFlagValue:"true",queueExecutionCapabilityValue:"true",publisher:{async publish(v){published.push(v.message);}},betaAdmissionDependencies:{environment:env,ledger}});
 const consumeOne=()=>consume(published[0],{createRepository:()=>repository,createWorkerDependencies:()=>worker,jobIdSource:()=>job});
 return {env,ledger,commands,published,calls,repository,worker,request,triggerOne,consumeOne,dispatches:()=>dispatches};
}
let savedFetch:typeof fetch;
test.beforeEach(()=>{savedFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error("NETWORK_FORBIDDEN");};});
test.afterEach(()=>{globalThis.fetch=savedFetch;});

test("persisted initial request after day one reaches period EVAL and Queue claims once before Provider",async()=>{
 const h=fixture();expect(await h.triggerOne()).toMatchObject({status:"enqueued"});expect(h.published).toHaveLength(1);
 expect(h.published[0]).toMatchObject({betaAdmission:true});expect(await h.consumeOne()).toMatchObject({disposition:"completed"});
 expect(await h.consumeOne()).toMatchObject({status:"acknowledged"});expect(h.calls.filter(v=>v==="provider")).toHaveLength(1);expect(h.dispatches()).toBe(1);
 expect(h.calls.indexOf("cost:dispatch:initial")).toBeLessThan(h.calls.indexOf("provider"));
 const reservation=JSON.parse(h.commands[0][8]);expect(reservation).toMatchObject({identity:roster[0].identity,briefId:brief,sourceBriefId:brief,kind:"initial"});
 const settled=JSON.parse(h.commands.at(-1)![8]);expect(settled).toMatchObject({briefId:brief,kind:"initial",outcome:"delivered"});expect(settled.usageMicros).toBeGreaterThan(1000);
});
test("UNKNOWN atomic dispatch response never calls Provider or redispatches Queue work",async()=>{
 const h=fixture({unknownDispatch:true});await h.triggerOne();await h.consumeOne();await h.consumeOne();expect(h.dispatches()).toBe(1);expect(h.calls).not.toContain("provider");
});
test("real prior commitments, invalid owner and missing authority fail at the production trigger",async()=>{
 for(const mode of ["history","owner","missing"]){const h=fixture();
  if(mode==="history"){const cfg=JSON.parse(h.env.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG);h.env.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG=JSON.stringify({...cfg,m2CommittedMicros:5050000,mvpCommittedMicros:95050000});}
  if(mode==="owner")h.request.headers.set("Authorization",`Bearer ${"z".repeat(43)}`);
  const ledger=mode==="missing"?undefined:mode==="history"?beta.createRedisBetaAdmissionLedger(h.env)??undefined:h.ledger;
  const result=await trigger({payload,admissionRequest:h.request,persistenceConfirmed:true,customerAccessProofEstablished:true,conceptBriefId:brief,publicReference:reference},{featureFlagValue:"true",queueExecutionCapabilityValue:"true",publisher:{async publish(){throw Error("MUST_NOT_PUBLISH");}},betaAdmissionDependencies:{environment:h.env,ledger:mode==="missing"?{reserve:async()=>"denied",claimDispatch:async()=>false}:ledger}});
  expect(result).toMatchObject({status:"not_enqueued",reason:"beta_admission_denied"});expect(h.commands).toHaveLength(0);
 }
});
test("revision uses immutable owner/source, entitlement then cost claim; UNKNOWN cannot start a replacement",async()=>{
 for(const lowMode of [false,true]){
 const h=fixture({unknownRevision:true,lowMode});await h.triggerOne();expect(await h.consumeOne()).toMatchObject({disposition:"completed"});
 const initial=h.published[0] as import("../../lib/server/ai-sketch/first-preview-queue").FirstPreviewGenerationQueueMessage;
 const owner=beta.authenticateScopedReceiptRequest(h.request,h.env)!;
 const source={owner,purchaseId:"523e4567-e89b-42d3-a456-426614174000",subjectId:"623e4567-e89b-42d3-a456-426614174000",conceptBriefId:brief,publicReference:reference,sourceOutputId:output,originalInput:initial.generationInput,requestedDirectives:["lower_setting" as const]};
 const review=await h.repository.findReviewByConceptBriefId(brief);expect(review).not.toBeNull();
 // Fixture expresses the same persisted customer feedback required by production.
 expect(h.repository.setReviewForTest({conceptBriefId:brief,outputId:output,reviewStatus:"needs_revision",revisionInstruction:"lower_setting"})).toBe(true);
 let queued:import("../../lib/server/ai-sketch/first-preview-generation-lifecycle").FirstPreviewGenerationWork|undefined;
 const binding={owner,reservationId:operation,operationId:operation,kind:"revision" as const,briefId:brief,sourceOutputId:output};
 const service=createSourceBoundRevisionService({repository:h.repository,resolveSource:async r=>r===h.request?source:null,resolveDispatch:async id=>id===operation?binding:null,isDefiniteFailure:async()=>false,
  validatePreparedInput:prepared=>{h.calls.push("preflight:revision");return providerPolicy.isLowReservationPreviewInputAllowed(prepared,h.env);},
  entitlements:{reserve:async v=>{expect(v).toMatchObject(binding);h.calls.push("entitlement:reserve");return {ok:true,state:"reserved"};},claimDispatch:async v=>{expect(v).toEqual(binding);h.calls.push("entitlement:claim");return "claimed";},settleDispatch:async v=>{h.calls.push(`entitlement:${v.outcome}`);return {ok:true,state:v.outcome==="unknown"?"unknown":"settled"};}},
  reserveCost:async(work,b)=>{const r=await h.ledger.reserve({identity:b.owner.identity,briefId:work.jobId,sourceBriefId:work.conceptBriefId,kind:"revision",requestKey:hash(`${b.owner.scope}\n${b.owner.identity}\n${work.jobId}`),fingerprint:beta.revisionSpendingFingerprint(work)});return r==="reserved"?"reserved":"denied";},verifyCostReservation:async()=>true,
  claimCostReservation:async work=>h.ledger.claimDispatch({briefId:work.jobId,sourceBriefId:work.conceptBriefId,kind:"revision",fingerprint:beta.revisionSpendingFingerprint(work)}),publish:async work=>{queued=work;},createWorkerDependencies:()=>h.worker});
 expect(await service.prepare(new Request("https://synthetic.invalid/other"),operation)).toMatchObject({status:"denied"});
 expect(await service.prepare(h.request,operation)).toMatchObject({status:"accepted"});expect(queued).toBeTruthy();
 expect(h.calls.indexOf("preflight:revision")).toBeLessThan(h.calls.indexOf("entitlement:reserve"));
 expect(await service.execute({...queued!,sourceOutputId:"723e4567-e89b-42d3-a456-426614174000"})).toMatchObject({status:"denied"});
 expect(await service.execute(queued!)).toMatchObject({status:"unknown"});expect(h.calls.indexOf("entitlement:claim")).toBeLessThan(h.calls.indexOf("cost:dispatch:revision"));
 expect(h.calls.filter(v=>v==="provider")).toHaveLength(1); // Initial only; revision dispatch was UNKNOWN.
 expect(await service.prepare(h.request,"823e4567-e89b-42d3-a456-426614174000")).toMatchObject({status:"denied"});
 await service.execute(queued!);expect(h.calls.filter(v=>v==="cost:dispatch:revision")).toHaveLength(1);
 }
});

test("025 mode preserves internal0.10 image limit, records anomalous known usage UNKNOWN and never retries",async()=>{
 const h=fixture({lowMode:true,imageOutputTokens:10000});expect(await h.triggerOne()).toMatchObject({status:"enqueued"});expect(await h.consumeOne()).toMatchObject({disposition:"terminal_failure"});
 expect(h.calls.filter(v=>v==="provider")).toHaveLength(1);expect(h.calls).not.toContain("privacy");
 expect(JSON.parse(h.commands.at(-1)![8])).toMatchObject({outcome:"unknown",usageMicros:300500});
 expect(await h.repository.findCustomerReadyOutput(brief)).toBeNull();await h.consumeOne();expect(h.dispatches()).toBe(1);expect(h.calls.filter(v=>v==="provider")).toHaveLength(1);
});

test("025 Queue worker rejects oversized complete prompt before cost dispatch or Provider construction",async()=>{
 const h=fixture({lowMode:true});await h.triggerOne();const message=h.published[0] as import("../../lib/server/ai-sketch/first-preview-queue").FirstPreviewGenerationQueueMessage;
 const reserved=await lifecycle.reserveAutomaticFirstPreviewPreparedAttempt({persistenceConfirmed:true,customerAccessEligible:true,conceptBriefId:brief,publicReference:reference,attemptNumber:1,parentJobId:null,structured:message.generationInput,repository:h.repository,jobIdSource:()=>job});
 expect(reserved.ok).toBe(true);if(!reserved.ok)throw Error("Synthetic reservation failed");
 const work=structuredClone(reserved.work);work.structured.handSketchInstruction.source_design_spec_summary.customer_intent_summary="中".repeat(6000);
 expect(await lifecycle.runAutomaticFirstPreviewWorker({...work,betaAdmission:true},{...h.worker,createProvider:()=>{throw Error("MUST_NOT_CONSTRUCT_PROVIDER");}})).toMatchObject({status:"failed",failureCategory:"budget_blocked"});
  expect(h.commands).toHaveLength(1);expect(h.dispatches()).toBe(0);expect(h.calls).not.toContain("provider");expect(await h.repository.findJobById(job)).toMatchObject({actualCostMicros:0,providerRequestId:null});
});

test("shared trial keeps server-only selection fail-closed and removes package dependence for repeated revisions",async()=>{
 for(const unknownRevision of [false,true]){
 const h=fixture({sharedMode:true,unknownRevision});
 expect(beta.isSharedTrialBudgetActive(h.env)).toBe(true);
 for(const patch of [{NOVORA_BETA_ADMISSION_ENABLED:"false"},{NOVORA_INVITATION_TRIAL_SPENDING_MODE:undefined},{VERCEL_ENV:"production"},{NOVORA_PAYPAL_SANDBOX_ENABLED:"true"},{NOVORA_BETA_INVITATIONS_JSON:JSON.stringify(roster.slice(0,1))},{NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:'{}'}])expect(beta.isSharedTrialBudgetActive({...h.env,...patch})).toBe(false);
 expect(await h.triggerOne()).toMatchObject({status:"enqueued"});expect(await h.consumeOne()).toMatchObject({disposition:"completed"});
 const owner=beta.authenticateScopedReceiptRequest(h.request,h.env)!;
 const initial=h.published[0] as import("../../lib/server/ai-sketch/first-preview-queue").FirstPreviewGenerationQueueMessage;
 let queued:import("../../lib/server/ai-sketch/first-preview-generation-lifecycle").FirstPreviewGenerationWork|undefined;
 let nextOutput=0;
 const forbidden=async()=>{throw Error("NO_PACKAGE_OR_PAYMENT_IN_SHARED_TRIAL");};
 for(let step=0;step<(unknownRevision?1:3);step++){
  const current=(await h.repository.findCustomerReadyOutput(brief))!;
  const sourceJob=(await h.repository.findJobById(current.jobId))!;
  const op=`${step+5}23e4567-e89b-42d3-a456-426614174000`;
  const directive=step%2?"raise_setting":"lower_setting";
  expect(h.repository.setReviewForTest({conceptBriefId:brief,outputId:current.id,reviewStatus:"needs_revision",revisionInstruction:directive})).toBe(true);
  const binding={owner,reservationId:op,operationId:op,kind:"revision" as const,briefId:brief,sourceOutputId:current.id};
  const service=createSourceBoundRevisionService({sharedTrialBudgetOnly:true,repository:h.repository,
   resolveSource:async r=>r===h.request?{owner,conceptBriefId:brief,publicReference:reference,sourceOutputId:current.id,originalInput:initial.generationInput,requestedDirectives:[directive],sourceRevisionDirectives:sourceJob.revisionDirectives??[]}:null,
   resolveDispatch:async id=>id===op?binding:null,isDefiniteFailure:async()=>false,
   validatePreparedInput:v=>providerPolicy.isLowReservationPreviewInputAllowed(v,h.env),
   entitlements:{reserve:forbidden,claimDispatch:forbidden,settleDispatch:forbidden},
   reserveCost:async(w,b)=>{const r=await h.ledger.reserve({identity:b.owner.identity,briefId:w.jobId,sourceBriefId:w.conceptBriefId,kind:"revision",requestKey:hash(`${b.owner.scope}\n${b.owner.identity}\n${w.jobId}`),fingerprint:beta.revisionSpendingFingerprint(w)});return r==="reserved"?"reserved":"denied";},
   verifyCostReservation:async()=>true,claimCostReservation:async w=>h.ledger.claimDispatch({identity:owner.identity,briefId:w.jobId,sourceBriefId:w.conceptBriefId,kind:"revision",fingerprint:beta.revisionSpendingFingerprint(w)}),
   publish:async w=>{queued=w;},createWorkerDependencies:()=>({...h.worker,
    createProvider:()=>{const provider=h.worker.createProvider()!;const requestId=`req_synthetic_shared_${step}`;return {...provider,readProviderRequestId:()=>requestId,adapter:{async generateFirstPreviewImage(v,context){const result=await provider.adapter.generateFirstPreviewImage(v,context);return result.ok?{...result,providerRequestId:requestId}:result;}}};},
    outputIdSource:()=>`${++nextOutput}33e4567-e89b-42d3-a456-426614174000`})});
  expect(await service.prepare(new Request('https://wrong.invalid'),op)).toMatchObject({status:"denied"});
  expect(await service.prepare(h.request,op)).toMatchObject({status:"accepted"});
  const delivered=await service.execute(queued!);
  if(unknownRevision){
   expect(delivered).toMatchObject({status:'unknown'});
   expect(await service.prepare(h.request,'823e4567-e89b-42d3-a456-426614174000')).toMatchObject({status:'denied'});
   expect(await service.execute(queued!)).toMatchObject({status:'unknown'});
   continue;
  }
  expect(delivered,JSON.stringify({job:await h.repository.findJobById(op),output:await h.repository.findOutputByJobId(op,brief)})).toMatchObject({status:"delivered"});
  expect(await service.prepare(h.request,op)).toMatchObject({status:"existing"});
  expect(await service.execute(queued!)).toMatchObject({status:"delivered"});
 }
 expect(h.calls.filter(v=>v==='provider')).toHaveLength(unknownRevision?1:4);
 expect(h.calls.filter(v=>v==='privacy')).toHaveLength(unknownRevision?1:4);
 expect(h.commands.filter(cmd=>cmd[4]==='dispatch')).toHaveLength(unknownRevision?2:4);
 expect(h.commands.filter(cmd=>cmd[4]==='reserve')).toHaveLength(unknownRevision?2:4);
 const costRecord=h.commands.filter(cmd=>cmd[4]==='record').at(-1)!;
 expect(JSON.parse(costRecord[8])).toMatchObject({outcome:'delivered',kind:unknownRevision?'initial':'revision'});
 if(unknownRevision)expect(h.commands.filter(cmd=>cmd[4]==='record')).toHaveLength(1); // The uncertain revision claim is never released.
 }
});
