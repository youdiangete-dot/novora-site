import { test,expect } from "@playwright/test";
import { createHash,randomUUID } from "node:crypto";
import { execFileSync,execFile } from "node:child_process";
import Module,{createRequire} from "node:module";
import path from "node:path";
import {readFileSync} from "node:fs";
const req=createRequire(path.join(process.cwd(),"tests/e2e/invitation-trial-spending.spec.ts"));
const loader=Module as unknown as {_resolveFilename:(...args:any[])=>string}, original=loader._resolveFilename;
loader._resolveFilename=function(name,...args){return name==="server-only"?req.resolve("next/dist/compiled/server-only/empty.js"):original.call(this,name,...args);};
const beta=req("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission");
const trial=req("../../lib/server/ai-sketch/invitation-trial-spending") as typeof import("../../lib/server/ai-sketch/invitation-trial-spending");
loader._resolveFilename=original;
const c=trial.trialSpendingContract, hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const config={maximumInitialImages:1,maximumRevisions:1,limitMicros:2000000,expectedCostMicros:668217,reserveMicros:250000,m2CommittedMicros:3050000,mvpCommittedMicros:93050000,expiresAt:Math.floor(Date.now()/1000)+3500};
const roster=[{identity:"synthetic_customer",credentialSha256:hash("a".repeat(43))},{identity:"synthetic_owner",credentialSha256:hash("b".repeat(43))}];
function environment(){return {NOVORA_BETA_ADMISSION_ENABLED:"true",NOVORA_BETA_INVITATIONS_JSON:JSON.stringify(roster),NOVORA_BETA_SPENDING_AUTHORITY_ID:"synthetic_trial_authority",
 NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED:"true",NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE:"synthetic_stable_namespace",
 NOVORA_INVITATION_TRIAL_SPENDING_MODE:c.MODE,NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:JSON.stringify(config),
 NOVORA_INSTANT_PREVIEW_AGENT_ENABLED:"true",NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:"true",
 VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview",NODE_ENV:"production",NEXT_RUNTIME:"nodejs",
 VERCEL_PROJECT_ID:c.PROJECT,VERCEL_GIT_COMMIT_REF:c.BRANCH,VERCEL_GIT_COMMIT_SHA:"c".repeat(40),VERCEL_DEPLOYMENT_ID:"dpl_syntheticTrial12345678",
 UPSTASH_REDIS_REST_URL:"https://synthetic.invalid",UPSTASH_REDIS_REST_TOKEN:"synthetic-not-live"};}
const brief="123e4567-e89b-42d3-a456-426614174000", job="223e4567-e89b-42d3-a456-426614174000", fingerprint=hash("synthetic");

test("new mode binds exact deployment/source/namespace/complete roster while stable ownership survives deployments",()=>{
 const e=environment(),b=beta.resolveBetaAdmissionBinding(e)!;
 expect(b.ledgerKey).toMatch(/^novora:beta-admission:trial-preview:v1:[a-f0-9]{64}$/);
 const request=new Request("https://synthetic.invalid",{headers:{authorization:`Bearer ${"a".repeat(43)}`}});
 const owner=beta.authenticateScopedReceiptRequest(request,e)!;
 for(const patch of [{VERCEL_DEPLOYMENT_ID:"dpl_anotherSynthetic12345678"},{VERCEL_GIT_COMMIT_SHA:"d".repeat(40)}]){
  const changed={...e,...patch};expect(beta.resolveBetaAdmissionBinding(changed)?.ledgerKey).not.toBe(b.ledgerKey);
  expect(beta.authenticateScopedReceiptRequest(request,changed)).toEqual(owner);
 }
 for(const patch of [{NOVORA_BETA_INVITATIONS_JSON:JSON.stringify([roster[0]])},{NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE:"another_stable_namespace"},
  {NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:JSON.stringify({...config,m2CommittedMicros:config.m2CommittedMicros+1})}]) expect(beta.resolveBetaAdmissionBinding({...e,...patch})?.ledgerKey).not.toBe(b.ledgerKey);
});
test("invalid or unapproved configuration never falls back to the old M2/historical ledger",()=>{
 for(const patch of [{NOVORA_INVITATION_TRIAL_SPENDING_MODE:"true"},{NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:"{}"},
  {NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED:"false"},{VERCEL_ENV:"production"},{VERCEL_TARGET_ENV:"production"},
  {NOVORA_BETA_ADMISSION_ENABLED:"false"},{NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:"false"},
  {VERCEL_PROJECT_ID:"wrong"},{VERCEL_GIT_COMMIT_REF:"main"},{NEXT_RUNTIME:"edge"}]) expect(beta.resolveBetaAdmissionBinding({...environment(),...patch})).toBeNull();
});
test("a configured trial marker cannot become unfunded legacy work by disabling Beta",async()=>{
 const e={...environment(),NOVORA_BETA_ADMISSION_ENABLED:"false"};
 expect(await beta.reserveBetaAdmission({briefId:brief,fingerprint},{environment:e})).toBe("denied");
 expect(await beta.claimBetaDispatch({briefId:brief,fingerprint},{environment:e})).toBe(false);
});
test("one EVAL binds the finite authority, per-operation kind and real source Brief; no initialization or retry",async()=>{
 const commands:unknown[][]=[]; const e=environment();
 const ledger=beta.createRedisBetaAdmissionLedger(e,async(_u,o)=>{commands.push(JSON.parse(o!.body as string));return new Response('{"result":"reserved"}');})!;
 await ledger.reserve({identity:roster[0].identity,requestKey:hash("initial"),briefId:brief,fingerprint});
 await ledger.claimDispatch({briefId:job,sourceBriefId:brief,kind:"revision",fingerprint});
 expect(commands).toHaveLength(2);
 expect(commands[0][1]).toBe(trial.TRIAL_SPENDING_SCRIPT);
 const authority=JSON.parse(commands[0][7] as string),initial=JSON.parse(commands[0][8] as string),revision=JSON.parse(commands[1][8] as string);
 expect(authority).toMatchObject({costCeilingVerified:false,maximumInitialImages:1,maximumRevisions:1,maximumPaidAttempts:2,limitMicros:2000000,attemptReservationMicros:1000000});
 expect(initial).toMatchObject({kind:"initial",sourceBriefId:brief});expect(revision).toMatchObject({kind:"revision",briefId:job,sourceBriefId:brief});
 let calls=0; const unknown=beta.createRedisBetaAdmissionLedger(e,async()=>{calls++;throw new Error("synthetic uncertain EVAL");})!;
 await expect(unknown.reserve({identity:roster[0].identity,requestKey:hash("x"),briefId:brief,fingerprint})).rejects.toThrow();
 expect(calls).toBe(1);
});
test("trusted outcome port is absent in old modes and includes privacy-inclusive known cost without releasing allocations",async()=>{
 const e=environment(),records:any[]=[];
 const ledger={reserve:async()=>"reserved" as const,claimDispatch:async()=>true,recordOutcome:async(value:unknown)=>{records.push(value);return true;}};
 const work={conceptBriefId:brief,jobId:job,parentJobId:null,structured:{designSpecSha256:hash("design"),handSketchInstructionSha256:hash("instruction")}};
 expect(await beta.recordTrialSpendingOutcome(work,"delivered",62348,{environment:e,ledger})).toBe(true);
 expect(records[0]).toMatchObject({briefId:brief,sourceBriefId:brief,kind:"initial",outcome:"delivered",usageMicros:62348});
 await beta.recordTrialSpendingOutcome({...work,sourceOutputId:job},"unknown",null,{environment:e,ledger});
 expect(records[1]).toMatchObject({briefId:job,sourceBriefId:brief,kind:"revision",outcome:"unknown",usageMicros:null});
 await beta.recordTrialSpendingOutcome(work,"delivered",1,{environment:{},ledger});expect(records).toHaveLength(2);
});
test("old single/verified Lua declarations remain byte-for-byte unchanged from the reviewed baseline",()=>{
 const base=execFileSync("git",["show","06215d5adc747890205d9c00fc071936514ef209:lib/server/ai-sketch/beta-admission.ts"],{encoding:"utf8",windowsHide:true});
 const current=readFileSync(path.join(process.cwd(),"lib/server/ai-sketch/beta-admission.ts"),"utf8");
 for(const [start,end] of [["export const BETA_ADMISSION_SCRIPT =","export type BetaAdmissionBinding"],["export const M2_PREVIEW_ADMISSION_SCRIPT =","export function createRedisBetaAdmissionLedger"]])
  expect(current.slice(current.indexOf(start),current.indexOf(end))).toBe(base.slice(base.indexOf(start),base.indexOf(end)));
 const legacy={...environment(),NOVORA_INVITATION_TRIAL_SPENDING_MODE:undefined,NOVORA_BETA_INVITATIONS_JSON:JSON.stringify([roster[0]])};
 expect(beta.resolveBetaAdmissionBinding(legacy)?.ledgerKey).toMatch(/^novora:beta-admission:m2-e2e:v1:/);
 expect(beta.resolveBetaAdmissionBinding({...legacy,NOVORA_BETA_INVITATIONS_JSON:JSON.stringify(roster)})).toBeNull();
});

test("actual local Redis Lua admits initial then reconciled revision, consumes UNKNOWN, and rejects another dispatch",async()=>{
 const port=process.env.NOVORA_BETA_LOCAL_REDIS_TEST_PORT,cli=process.env.NOVORA_BETA_LOCAL_REDIS_CLI;
 test.skip(!port||!cli,"No existing disposable local Redis/CLI configured; actual Lua/concurrency not claimed.");
 const redis=(...args:string[])=>execFileSync(cli!,["--raw","-h","127.0.0.1","-p",port!,...args],{encoding:"utf8",timeout:5000,windowsHide:true,env:{...process.env,REDISCLI_AUTH:"",REDISCLI_USER:""}}).trimEnd();
 expect(redis("PING")).toBe("PONG");
 const now=Number(redis("TIME").split(/\r?\n/)[0]);
 const s=c.selection("synthetic_stable_namespace",{...config,expiresAt:now+3500},roster,"synthetic_authority"),b=c.binding(s,"dpl_synthetic"+randomUUID().replaceAll("-",""),"c".repeat(40));
 const a=c.authority(s,b);expect(redis("SET",b.ledgerKey,JSON.stringify({version:1,authority:a,reservations:{}}),"NX")).toBe("OK");
 const call=(op:string,v:unknown)=>redis("EVAL",trial.TRIAL_SPENDING_SCRIPT,"1",b.ledgerKey,op,b.authorityId,b.runtimeBinding,JSON.stringify(a),JSON.stringify(v));
 const initial={identity:roster[0].identity,requestKey:hash("one"),briefId:brief,sourceBriefId:brief,kind:"initial",fingerprint};
 const revision={...initial,requestKey:hash("two"),briefId:job,kind:"revision"};
 expect(call("reserve",initial)).toBe("reserved");expect(call("reserve",revision)).toBe("denied");
 expect(call("dispatch",initial)).toBe("reserved");expect(call("dispatch",initial)).toBe("denied");
 expect(call("record",{...initial,outcome:"delivered",usageMicros:62348})).toBe("recorded");
 expect(call("reserve",revision)).toBe("reserved");expect(call("dispatch",revision)).toBe("reserved");
 expect(call("record",{...revision,outcome:"unknown",usageMicros:null})).toBe("recorded");
 expect(call("reserve",{...revision,requestKey:hash("three"),briefId:randomUUID()})).toBe("denied");
 const saved=JSON.parse(redis("GET",b.ledgerKey));expect(Object.values(saved.reservations)).toHaveLength(2);
 expect(Object.values(saved.reservations).map((r:any)=>r.reservedMicros)).toEqual([1000000,1000000]);
 // Independent connections must contend inside the actual Redis EVAL, not a
 // JavaScript mutex or a model of Lua. Only brand-new synthetic keys are used.
 const raceBinding=c.binding(s,"dpl_race"+randomUUID().replaceAll("-",""),"c".repeat(40)),raceAuthority=c.authority(s,raceBinding);
 expect(redis("SET",raceBinding.ledgerKey,JSON.stringify({version:1,authority:raceAuthority,reservations:{}}),"NX")).toBe("OK");
 const args=(op:string,v:unknown)=>["EVAL",trial.TRIAL_SPENDING_SCRIPT,"1",raceBinding.ledgerKey,op,raceBinding.authorityId,raceBinding.runtimeBinding,JSON.stringify(raceAuthority),JSON.stringify(v)];
 const asyncCall=(op:string,v:unknown)=>new Promise<string>((resolve,reject)=>execFile(cli!,["--raw","-h","127.0.0.1","-p",port!,...args(op,v)],{encoding:"utf8",timeout:5000,windowsHide:true,env:{...process.env,REDISCLI_AUTH:"",REDISCLI_USER:""}},(error,stdout)=>error?reject(error):resolve(stdout.trimEnd())));
 const contenders=Array.from({length:8},(_,i)=>{const id=randomUUID();return {...initial,requestKey:hash(`race-${i}`),briefId:id,sourceBriefId:id};});
 const admitted=await Promise.all(contenders.map(value=>asyncCall("reserve",value)));
 expect(admitted.filter(result=>result==="reserved")).toHaveLength(1);
 const winner=contenders[admitted.indexOf("reserved")];
 const dispatched=await Promise.all(Array.from({length:8},()=>asyncCall("dispatch",winner)));
 expect(dispatched.filter(result=>result==="reserved")).toHaveLength(1);
 // Even a fresh request cannot bypass an unresolved/unknown first dispatch.
 expect(await asyncCall("reserve",{...revision,requestKey:hash("race-revision")})).toBe("denied");
 const revoked=JSON.parse(redis("GET",raceBinding.ledgerKey));revoked.authority.ownerApproved=false;
 expect(redis("SET",raceBinding.ledgerKey,JSON.stringify(revoked),"XX")).toBe("OK");
 expect(await asyncCall("record",{...winner,outcome:"delivered",usageMicros:62348})).toBe("denied");
});
