import {test,expect} from "@playwright/test";
import Module,{createRequire} from "node:module";
import {createHash} from "node:crypto";
import {createSyntheticFirstPreviewPng} from "../fixtures/ai-sketch/fake-first-preview-storage-client";
const loader=Module as unknown as {_resolveFilename:(...args:any[])=>string},load=createRequire(__filename),original=loader._resolveFilename;
loader._resolveFilename=function(name,...args){return name==="server-only"?load.resolve("next/dist/compiled/server-only/empty.js"):original.call(this,name,...args);};
const {createCustomerImageLibrary,safeLibraryOutput}=load("../../lib/server/ai-sketch/customer-image-library") as typeof import("../../lib/server/ai-sketch/customer-image-library");
const {createCustomerImageLibraryHandlers}=load("../../app/api/customer-image-library/handler") as typeof import("../../app/api/customer-image-library/handler");
const beta=load("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission");
loader._resolveFilename=original;
const ref="NOVORA-CB-20261103-LB01",brief="123e4567-e89b-42d3-a456-426614174000",job="223e4567-e89b-42d3-a456-426614174000",id="323e4567-e89b-42d3-a456-426614174000",next="423e4567-e89b-42d3-a456-426614174000";
const created="2026-11-03T01:00:00.000Z",validated="2026-11-03T01:00:01.000Z",ready="2026-11-03T01:00:03.000Z",superseded="2026-11-03T02:00:00.000Z",secret="SYNTHETIC_LIBRARY_SIGNING_SECRET_00000000000000000000";
const png=createSyntheticFirstPreviewPng(),hash=createHash("sha256").update(png).digest("hex"),receipt={briefId:brief,publicReference:ref};
const request=(who="A",method="GET",body?:unknown,url="https://test.invalid/api/customer-image-library",cookie?:string)=>new Request(url,{method,headers:{Authorization:`Bearer ${who}`,Origin:"https://test.invalid",...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
function fixture(environment?:Record<string,string>){let active=true,now=Math.floor(Date.parse("2026-11-03T03:00:00Z")/1000),withdrawOnRead=false,publicBucket=false,corrupt=false;
 const evidence={result:"passed",outputValid:true,assetExists:true,ownershipConsistent:true,privacyPassed:true,customerAccessEligible:true,lifecycleEligible:true,visualPrivacyEvidence:{subject:{conceptBriefId:brief,jobId:job,outputId:id,contentSha256:hash},inspectorVersion:"novora_openai_visual_privacy_inspector_v1",policyVersion:"novora_first_preview_visual_privacy_v1",model:"gpt-4.1-mini-2025-04-14",result:"passed",usageTrusted:true,actualCostMicros:961}};
 const snapshot={output:{id,job_id:job,concept_brief_id:brief,bucket_name:"novora-ai-sketches",object_path:`first-preview/${brief}/${job}/${id}.png`,mime_type:"image/png",byte_size:png.length,width_px:1024,height_px:1024,content_sha256:hash,asset_created_at:created,asset_validated_at:validated,asset_validation_status:"passed",automatic_gate_status:"passed",automatic_gate_policy_version:"novora_first_preview_automatic_gates_v2",automatic_gate_evidence:evidence,automatic_gate_passed_at:"2026-11-03T01:00:02.000Z",first_preview_ready_at:ready,readiness_status:"first_preview_ready",is_current_customer_preview:true,readiness_revoked_at:null as string|null,customer_history_state:null as string|null},job:{id:job,concept_brief_id:brief,generation_purpose:"first_preview",status:"succeeded",completed_at:"2026-11-03T01:00:02.000Z"},successor:null as Record<string,unknown>|null,currentLineageVerified:true};
 const receipts=[receipt],snapshots=new Map([[id,snapshot]]);
 const repo={deliveredCandidates:async(owner:{identity:string})=>owner.identity==="A"?Array.from(snapshots.values()).map(s=>({outputId:String(s.output.id),receipt:receipts.find(r=>r.briefId===s.output.concept_brief_id)!})):[],ownedReceipt:async(owner:{identity:string},ref:string)=>owner.identity==="A"?receipts.find(r=>r.publicReference===ref)??null:null,snapshot:async(output:string)=>snapshots.get(output)??null};
 const storage={inspectBucket:async()=>({data:{name:"novora-ai-sketches",isPublic:publicBucket},error:null}),inspectObject:async()=>({data:{createdAt:created,byteSize:png.length,mimeType:"image/png"},error:null}),uploadObject:async()=>{throw Error("WRITE_FORBIDDEN");},downloadObject:async()=>{if(withdrawOnRead)snapshot.output.customer_history_state="withdrawn";return {data:corrupt?new Uint8Array(45):png,error:null};}};
 const service=createCustomerImageLibrary({authenticate:r=>environment?beta.authenticateScopedReceiptRequest(r,environment):["Bearer A","Bearer B"].includes(r.headers.get("authorization")??"")?{scope:"trusted_scope",identity:r.headers.get("authorization")!.slice(7)}:null,active:owner=>active&&(!environment||beta.isScopedReceiptOwnerActive(owner,environment)),repository:repo,storage,signingSecret:secret,now:()=>now});
 const handlers=createCustomerImageLibraryHandlers(()=>service,async()=>({allowed:true} as any));
 return {service,handlers,snapshot,receipts,snapshots,historical(){snapshot.output.readiness_status="revoked";snapshot.output.is_current_customer_preview=false;snapshot.output.readiness_revoked_at=superseded;snapshot.output.customer_history_state="superseded";snapshot.currentLineageVerified=false;snapshot.successor={id:next,concept_brief_id:brief,source_output_id:id,status:"succeeded",superseded_at:superseded};},withdraw:()=>{snapshot.output.customer_history_state="withdrawn";},expire:()=>{now+=1801;},revoke:()=>{active=false;},race:()=>{withdrawOnRead=true;},public:()=>{publicBucket=true;},corrupt:()=>{corrupt=true;}};
}
test("fresh browser recovers only owned library and renews same brief cookie without browser storage",async()=>{const h=fixture();expect(await h.service.list(request())).toHaveLength(1);expect(await h.service.list(request("B"))).toEqual([]);expect(await h.service.list(request("none"))).toBeNull();expect(await h.service.session(request("B"),ref)).toBeNull();expect(await h.service.session(request(),ref)).toBeTruthy();const text=JSON.stringify(await h.service.list(request()));for(const privateField of ["object_path","privacy","job_id",hash,"trusted_scope"])expect(text).not.toContain(privateField);});
test("historic safe supersession remains readable but generic revoked and unsafe output denied",async()=>{const h=fixture();h.historical();expect(safeLibraryOutput(h.snapshot,receipt)?.current).toBe(false);h.snapshot.output.customer_history_state=null;expect(safeLibraryOutput(h.snapshot,receipt)).toBeNull();h.snapshot.output.customer_history_state="superseded";h.snapshot.output.automatic_gate_status="failed";expect(safeLibraryOutput(h.snapshot,receipt)).toBeNull();});
test("current revision still requires existing current-lineage verification",async()=>{const h=fixture();h.snapshot.currentLineageVerified=false;expect(await h.service.list(request())).toEqual([]);});
test("download requires correct invitation plus unexpired matching brief cookie",async()=>{const h=fixture();h.historical();const cookie=await h.service.session(request(),ref);expect(await h.service.image(request(),ref,id,null)).toBeNull();expect(await h.service.image(request("B"),ref,id,cookie)).toBeNull();expect(await h.service.image(request(),ref,id,cookie)).toEqual(png);h.expire();expect(await h.service.image(request(),ref,id,cookie)).toBeNull();expect(await h.service.session(request(),ref)).toBeTruthy();});
test("explicit withdrawal, owner revocation and revocation during download deny bytes",async()=>{for(const change of ["withdraw","revoke","race"] as const){const h=fixture();h.historical();const cookie=await h.service.session(request(),ref);h[change]();expect(await h.service.image(request(),ref,id,cookie)).toBeNull();}});
test("private bucket and PNG hash/integrity gates cannot be bypassed",async()=>{for(const change of ["public","corrupt"] as const){const h=fixture();const cookie=await h.service.session(request(),ref);h[change]();expect(await h.service.image(request(),ref,id,cookie)).toBeNull();}});
test("HTTP session, attachment and cross-user/Origin denial",async()=>{const h=fixture();const session=await h.handlers.handle(request("A","POST",{publicReference:ref}));expect(session.status).toBe(200);const cookie=session.headers.getSetCookie()[0].split(";")[0];const url=`https://test.invalid/api/customer-image-library?${new URLSearchParams({publicReference:ref,outputId:id,download:"1"})}`;const r=await h.handlers.handle(request("A","GET",undefined,url,cookie));expect(r.status).toBe(200);expect(r.headers.get("content-disposition")).toContain("attachment;");expect(r.headers.get("cache-control")).toBe("private, no-store");expect((await h.handlers.handle(request("B","GET",undefined,url,cookie))).status).toBe(404);const wrong=request("A","POST",{publicReference:ref});wrong.headers.set("Origin","https://other.invalid");expect((await h.handlers.handle(wrong)).status).toBe(404);});

test("three delivered briefs plus a fourth denied/no-output receipt preserve list, exact recovery and downloads",async()=>{
 const h=fixture();
 for(const n of [2,3]){
  const bid=`1000000${n}-e89b-42d3-a456-426614174000`,jid=`2000000${n}-e89b-42d3-a456-426614174000`,oid=`3000000${n}-e89b-42d3-a456-426614174000`;
  const r={briefId:bid,publicReference:`NOVORA-CB-20261103-LB0${n}`},s=structuredClone(h.snapshot);
  s.output.id=oid;s.output.job_id=jid;s.output.concept_brief_id=bid;s.output.object_path=`first-preview/${bid}/${jid}/${oid}.png`;
  s.output.automatic_gate_evidence.visualPrivacyEvidence.subject={conceptBriefId:bid,jobId:jid,outputId:oid,contentSha256:hash};
  s.job.id=jid;s.job.concept_brief_id=bid;h.receipts.push(r);h.snapshots.set(oid,s);
 }
 // Submission persisted this receipt before quota admission rejected it. There
 // is deliberately no job/output for it; later denied receipts are irrelevant.
 for(let n=4;n<25;n++)h.receipts.push({briefId:`100000${n.toString(16).padStart(2,"0")}-e89b-42d3-a456-426614174000`,publicReference:`NOVORA-CB-20261103-X${n.toString().padStart(3,"0")}`});
 expect(h.receipts.length).toBeGreaterThan(3);
 const items=await h.service.list(request());expect(items).toHaveLength(3);
 for(const item of items!){
  const token=await h.service.session(request(),item.publicReference);expect(token).toBeTruthy();
  expect(await h.service.image(request(),item.publicReference,item.outputId,token)).toEqual(png);
  expect(await h.service.session(request("B"),item.publicReference)).toBeNull();
  expect(await h.service.image(request("B"),item.publicReference,item.outputId,token)).toBeNull();
 }
 expect(await h.service.list(request("B"))).toEqual([]);
 h.snapshot.output.automatic_gate_status="failed";expect(await h.service.list(request())).toHaveLength(2);
 h.snapshot.output.automatic_gate_status="passed";h.snapshot.output.readiness_status="revoked";h.snapshot.output.is_current_customer_preview=false;expect(await h.service.list(request())).toHaveLength(2);
});

test("expired seven-day spending still permits same-owner recovery/download while invitation remains active",async()=>{
 const credential="a".repeat(43),other="b".repeat(43),end=Math.floor(Date.now()/1000)-60;
 const env={NOVORA_BETA_ADMISSION_ENABLED:"true",NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED:"true",NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE:"synthetic_history_retained_namespace",NOVORA_BETA_INVITATIONS_JSON:JSON.stringify([{identity:"A",credentialSha256:createHash("sha256").update(credential).digest("hex")},{identity:"B",credentialSha256:createHash("sha256").update(other).digest("hex")}]),NOVORA_INVITATION_TRIAL_SPENDING_MODE:"owner_expected_cost_seven_day_trial_v1",NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:JSON.stringify({maximumInitialImages:6,maximumRevisions:2,limitMicros:8000000,expectedCostMicros:668217,reserveMicros:250000,m2CommittedMicros:1000000,mvpCommittedMicros:90000000,startsAt:end-604800,expiresAt:end,maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1}),VERCEL_PROJECT_ID:"prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview"};
 const configured={...env,NOVORA_BETA_SPENDING_AUTHORITY_ID:"synthetic_retained_authority",NOVORA_INSTANT_PREVIEW_AGENT_ENABLED:"true",NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:"true",NOVORA_TEST_IMAGE_PACKAGES_ENABLED:"false",NOVORA_PAYPAL_SANDBOX_ENABLED:"false",VERCEL:"1",NODE_ENV:"production",NEXT_RUNTIME:"nodejs",VERCEL_GIT_COMMIT_REF:"integration/instant-first-preview-agent",VERCEL_GIT_COMMIT_SHA:"c".repeat(40),VERCEL_DEPLOYMENT_ID:"dpl_syntheticRetained12345678",UPSTASH_REDIS_REST_URL:"https://synthetic.invalid",UPSTASH_REDIS_REST_TOKEN:"synthetic-only"};
 const h=fixture(configured),own=request(credential),wrong=request(other);
 expect(beta.authenticateScopedReceiptRequest(own,configured)?.identity).toBe("A");expect(beta.resolveBetaAdmissionBinding(configured)).not.toBeNull();
 own.headers.set("idempotency-key","synthetic_expired_request");let spendCalls=0;
 const expired=beta.createRedisBetaAdmissionLedger(configured,async(_url,options)=>{spendCalls++;const args=JSON.parse(String(options?.body));expect(JSON.parse(args[7]).expiresAt).toBeLessThan(Math.floor(Date.now()/1000));return new Response('{"result":"denied"}');})!;
 expect(await beta.reserveBetaAdmission({request:own,briefId:brief,fingerprint:hash},{environment:configured,ledger:expired})).toBe("denied");expect(spendCalls).toBe(1);
 // No spending adapter or network needed for list/session/image reads.
 expect(await h.service.list(own)).toHaveLength(1);const proof=await h.service.session(own,ref);expect(proof).toBeTruthy();expect(await h.service.image(own,ref,id,proof)).toEqual(png);
 expect(await h.service.list(wrong)).toEqual([]);expect(await h.service.image(wrong,ref,id,proof)).toBeNull();
 configured.NOVORA_BETA_INVITATIONS_JSON="[]";expect(await h.service.session(own,ref)).toBeNull();expect(await h.service.image(own,ref,id,proof)).toBeNull();
});
