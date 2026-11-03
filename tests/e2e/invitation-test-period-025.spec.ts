import {test,expect} from "@playwright/test";
import {createHash} from "node:crypto";
import Module,{createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {FakeOpenAiImageClient} from "../fixtures/ai-sketch/fake-openai-image-client";
import {FakeFirstPreviewProvider} from "../fixtures/ai-sketch/fake-first-preview-provider";
import {createMockNovoraDesignSpec} from "../../lib/server/ai-sketch/design-spec";
import {createNovoraHandSketchInstructionFromDesignSpec} from "../../lib/server/ai-sketch/hand-sketch-instruction";
import {orchestrateFirstPreviewGeneration,type FirstPreviewProviderRequest} from "../../lib/server/ai-sketch/first-preview-runtime";
const req=createRequire(__filename),loader=Module as unknown as {_resolveFilename:(...args:any[])=>string},original=loader._resolveFilename;
loader._resolveFilename=function(name,...args){return name==="server-only"?req.resolve("next/dist/compiled/server-only/empty.js"):original.call(this,name,...args);};
const beta=req("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission");
const {testPeriod025SpendingContract:c,TEST_PERIOD_025_SPENDING_SCRIPT:lua}=req("../../lib/server/ai-sketch/invitation-test-period-025-spending") as typeof import("../../lib/server/ai-sketch/invitation-test-period-025-spending");
const p=req("../../lib/server/ai-sketch/openai-first-preview-provider") as typeof import("../../lib/server/ai-sketch/openai-first-preview-provider");
const {createOpenAiFirstPreviewProviderBinding}=req("../../lib/server/ai-sketch/openai-first-preview-client") as typeof import("../../lib/server/ai-sketch/openai-first-preview-client");
const costs=req("../../lib/server/ai-sketch/first-preview-cost-contract") as typeof import("../../lib/server/ai-sketch/first-preview-cost-contract");
loader._resolveFilename=original;
const hash=(v:string)=>createHash("sha256").update(v).digest("hex"),roster=[{identity:"synthetic_a",credentialSha256:hash("a".repeat(43))},{identity:"synthetic_b",credentialSha256:hash("b".repeat(43))}];
function environment(){const startsAt=Math.floor(Date.now()/1000)-86400;return {NOVORA_BETA_ADMISSION_ENABLED:"true",NOVORA_BETA_INVITATIONS_JSON:JSON.stringify(roster),NOVORA_BETA_SPENDING_AUTHORITY_ID:"synthetic_025_authority",NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED:"true",NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE:"synthetic_025_namespace",NOVORA_INVITATION_TRIAL_SPENDING_MODE:c.MODE,NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:JSON.stringify({maximumInitialImages:6,maximumRevisions:2,limitMicros:2000000,expectedCostMicros:100000,reserveMicros:150000,m2CommittedMicros:5050000,mvpCommittedMicros:95050000,startsAt,expiresAt:startsAt+604800,maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1,costPolicyVersion:c.POLICY,pricingAssumptionVersion:c.PRICING}),NOVORA_INSTANT_PREVIEW_AGENT_ENABLED:"true",NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:"true",NOVORA_TEST_IMAGE_PACKAGES_ENABLED:"false",NOVORA_PAYPAL_SANDBOX_ENABLED:"false",VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview",NODE_ENV:"production",NEXT_RUNTIME:"nodejs",VERCEL_PROJECT_ID:c.PROJECT,VERCEL_GIT_COMMIT_REF:c.BRANCH,VERCEL_GIT_COMMIT_SHA:"c".repeat(40),VERCEL_DEPLOYMENT_ID:"dpl_synthetic0251234567890",UPSTASH_REDIS_REST_URL:"https://synthetic.invalid",UPSTASH_REDIS_REST_TOKEN:"synthetic-only"};}
let request:FirstPreviewProviderRequest,savedFetch:typeof fetch;
test.beforeAll(async()=>{const designSpec=createMockNovoraDesignSpec({publicReference:"NOVORA-CB-20261103-L025"}),provider=new FakeFirstPreviewProvider("success");await orchestrateFirstPreviewGeneration({persistenceConfirmed:true,conceptBriefId:"123e4567-e89b-42d3-a456-426614174000",publicReference:designSpec.public_reference,designSpec,handSketchInstruction:createNovoraHandSketchInstructionFromDesignSpec(designSpec),accessControlEligible:true,falseSuccessDetected:false},{provider});if(!provider.lastRequest)throw Error("Missing synthetic request");request=provider.lastRequest;});
test.beforeEach(()=>{savedFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error("NETWORK_FORBIDDEN");};});test.afterEach(()=>{globalThis.fetch=savedFetch;});
function requestOfBytes(bytes:number,glyph="a"){
 const v=structuredClone(request);v.handSketchInstruction.source_design_spec_summary.customer_intent_summary="";
 const fixed=Buffer.byteLength(p.buildOpenAiFirstPreviewRequest(v)!.prompt,"utf8"),remaining=bytes-fixed;
 if(remaining<0)throw Error("Test boundary below fixed prompt");const unit=Buffer.byteLength(glyph,"utf8");
 v.handSketchInstruction.source_design_spec_summary.customer_intent_summary=glyph.repeat(Math.floor(remaining/unit))+"a".repeat(remaining%unit);return v;
}
test("new reservation is versioned, default-off, payment-off and bound to full actual commitment configuration",async()=>{
 const e=environment(),b=beta.resolveBetaAdmissionBinding(e)!;expect(b.ledgerKey).toMatch(/^novora:beta-admission:test-period-025:v1:/);
 for(const patch of [{NOVORA_INVITATION_TRIAL_SPENDING_MODE:"unknown_025"},{NOVORA_TEST_IMAGE_PACKAGES_ENABLED:"true"},{NOVORA_PAYPAL_SANDBOX_ENABLED:"true"},{VERCEL_ENV:"production"},{NOVORA_BETA_ADMISSION_ENABLED:"false"}])expect(beta.resolveBetaAdmissionBinding({...e,...patch})).toBeNull();
 const calls:any[][]=[],ledger=beta.createRedisBetaAdmissionLedger(e,async(_url,options)=>{calls.push(JSON.parse(String(options?.body)));return new Response('{"result":"reserved"}');})!;
 await ledger.reserve({identity:roster[0].identity,requestKey:hash("request"),briefId:"123e4567-e89b-42d3-a456-426614174000",fingerprint:hash("input")});
 expect(calls).toHaveLength(1);expect(calls[0][1]).toBe(lua);expect(JSON.parse(calls[0][7])).toMatchObject({attemptReservationMicros:250000,limitMicros:2000000,m2CommittedMicros:5050000,mvpCommittedMicros:95050000,maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1,promptMaxUtf8Bytes:16000,imageCostLimitMicros:100000,visualPrivacyCostLimitMicros:30000,imageInput:false,pricingVersion:c.PRICING,imagePricingVersion:costs.FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION,costCeilingVerified:false});
});
test("complete prompt accepts exactly16000 UTF8 bytes and rejects16001 without truncation across unicode",async()=>{
 for(const glyph of ["a","中","😀","e\u0301"]){const exact=requestOfBytes(16000,glyph),tooLarge=requestOfBytes(16001,glyph);
  const built=p.buildOpenAiFirstPreviewRequest(exact,16000)!;expect(Buffer.byteLength(built.prompt,"utf8")).toBe(16000);expect(built.prompt).toContain(exact.handSketchInstruction.source_design_spec_summary.customer_intent_summary);
  expect(p.buildOpenAiFirstPreviewRequest(tooLarge,16000)).toBeNull();expect(p.buildOpenAiFirstPreviewRequest(tooLarge)).not.toBeNull();
  const client=new FakeOpenAiImageClient("valid_1024_png"),adapter=p.createOpenAiFirstPreviewProviderAdapter({client,configuration:{status:"configured",variableName:"OPENAI_API_KEY"},maximumPromptUtf8Bytes:16000});
  expect(await adapter.generateFirstPreviewImage(tooLarge,{signal:new AbortController().signal})).toMatchObject({ok:false,category:"invalid_request"});expect(client.callCount).toBe(0);
 }
});
test("actual HTTP binding enforces final byte gate before fetch, sends only fixed text-only generation shape",async()=>{
 const e={...environment(),OPENAI_API_KEY:"sk-synthetic_025_offline_fixture_only"},sent:any[]=[];
 const binding=createOpenAiFirstPreviewProviderBinding({environment:e,fetchImplementation:async(url,init)=>{sent.push({url,body:JSON.parse(String(init?.body))});throw Error("SYNTHETIC_RESET");}})!;
 expect(await binding.adapter.generateFirstPreviewImage(requestOfBytes(16001,"中"),{signal:new AbortController().signal})).toMatchObject({ok:false,category:"invalid_request"});expect(sent).toHaveLength(0);
 await binding.adapter.generateFirstPreviewImage(requestOfBytes(16000,"中"),{signal:new AbortController().signal});expect(sent).toHaveLength(1);expect(sent[0].url).toBe("https://api.openai.com/v1/images/generations");
 expect(sent[0].body).toMatchObject({model:"gpt-image-2-2026-04-21",n:1,size:"1024x1024",quality:"medium",moderation:"auto",output_format:"png"});expect(Object.keys(sent[0].body).sort()).toEqual(["model","moderation","n","output_format","prompt","quality","size"]);
});
test("unexpected combined usage is held not released; single-mutation UNKNOWN has no automatic transport retry",async()=>{
 const commands:any[][]=[],e=environment(),ledger=beta.createRedisBetaAdmissionLedger(e,async(_url,init)=>{commands.push(JSON.parse(String(init?.body)));return new Response('{"result":"recorded"}');})!;
 await ledger.recordOutcome!({briefId:"123e4567-e89b-42d3-a456-426614174000",sourceBriefId:"123e4567-e89b-42d3-a456-426614174000",kind:"initial",fingerprint:hash("input"),outcome:"unknown",usageMicros:500000});expect(commands).toHaveLength(1);expect(JSON.parse(commands[0][8])).toMatchObject({outcome:"unknown",usageMicros:500000});
 let count=0;const uncertain=beta.createRedisBetaAdmissionLedger(e,async()=>{count++;throw Error("SYNTHETIC_UNKNOWN_EVAL");})!;await expect(uncertain.claimDispatch({briefId:"123e4567-e89b-42d3-a456-426614174000",fingerprint:hash("input")})).rejects.toThrow();expect(count).toBe(1);
 expect(lua).toContain("v.usageMicros<=130000");expect(lua).toContain("pending or found");expect(lua).toContain("found.state='unknown'");expect(lua.match(/redis.call\('SET'/g)).toHaveLength(1);
 expect(costs.FIRST_PREVIEW_COST_CONTRACT.perAttemptReservationLimitMicros).toBe(100000);expect(costs.firstPreviewActualCostExceedsReservation(100001)).toBe(true);
 // Existing USD1 source remains unchanged, including the historical pricing policy.
 expect(hash(readFileSync("lib/server/ai-sketch/invitation-test-period-spending.ts","utf8"))).toBe("694f2ceff66cdc934f3afd7fd3410f7e0c06dffb595a09b47729daca83e7a865");
});
