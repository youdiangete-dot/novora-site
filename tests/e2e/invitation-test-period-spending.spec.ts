import { test, expect } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createLocalRedisTestTransport } from "../tools/local-redis-test-transport.cjs";

const req = createRequire(path.join(process.cwd(), "tests/e2e/invitation-test-period-spending.spec.ts"));
const loader = Module as unknown as { _resolveFilename: (...args: any[]) => string };
const original = loader._resolveFilename;
loader._resolveFilename = function(name,...args) { return name === "server-only" ? req.resolve("next/dist/compiled/server-only/empty.js") : original.call(this,name,...args); };
const beta = req("../../lib/server/ai-sketch/beta-admission") as typeof import("../../lib/server/ai-sketch/beta-admission");
const period = req("../../lib/server/ai-sketch/invitation-test-period-spending") as typeof import("../../lib/server/ai-sketch/invitation-test-period-spending");
loader._resolveFilename = original;
const c = period.testPeriodSpendingContract;
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const roster = [{identity:"synthetic_a",credentialSha256:hash("a".repeat(43))},{identity:"synthetic_b",credentialSha256:hash("b".repeat(43))}];
// Synthetic commitments only. Real 5.05/95.05 history is tested as rejected.
function config(start = Math.floor(Date.now()/1000)-1) { return { maximumInitialImages:6,maximumRevisions:2,limitMicros:8000000,
  expectedCostMicros:668217,reserveMicros:250000,m2CommittedMicros:1000000,mvpCommittedMicros:90000000,
  startsAt:start,expiresAt:start+c.PERIOD_SECONDS,maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1 }; }
function environment() { return { NOVORA_BETA_ADMISSION_ENABLED:"true",NOVORA_BETA_INVITATIONS_JSON:JSON.stringify(roster),
  NOVORA_BETA_SPENDING_AUTHORITY_ID:"synthetic_period_authority",NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED:"true",
  NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE:"synthetic_period_namespace",NOVORA_INVITATION_TRIAL_SPENDING_MODE:c.MODE,
  NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:JSON.stringify(config()),NOVORA_INSTANT_PREVIEW_AGENT_ENABLED:"true",
  NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:"true",NOVORA_TEST_IMAGE_PACKAGES_ENABLED:"false",NOVORA_PAYPAL_SANDBOX_ENABLED:"false",
  VERCEL:"1",VERCEL_ENV:"preview",VERCEL_TARGET_ENV:"preview",NODE_ENV:"production",NEXT_RUNTIME:"nodejs",
  VERCEL_PROJECT_ID:c.PROJECT,VERCEL_GIT_COMMIT_REF:c.BRANCH,VERCEL_GIT_COMMIT_SHA:"c".repeat(40),
  VERCEL_DEPLOYMENT_ID:"dpl_syntheticPeriod12345678",UPSTASH_REDIS_REST_URL:"https://synthetic.invalid",UPSTASH_REDIS_REST_TOKEN:"synthetic-only" }; }

test("seven-day mode is explicit, two-person, Preview-only and payment-off with no invalid fallback",async()=>{
  const e=environment(),b=beta.resolveBetaAdmissionBinding(e)!;
  expect(b.ledgerKey).toMatch(/^novora:beta-admission:test-period:v1:[a-f0-9]{64}$/);
  for (const patch of [{NOVORA_INVITATION_TRIAL_SPENDING_MODE:"seven_days"},{NOVORA_INVITATION_TRIAL_SPENDING_CONFIG:"{}"},
    {NOVORA_BETA_INVITATIONS_JSON:JSON.stringify(roster.slice(0,1))},{VERCEL_TARGET_ENV:"production"},{NEXT_RUNTIME:"edge"},
    {NOVORA_BETA_ADMISSION_ENABLED:"false"},{NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED:"false"},
    {NOVORA_TEST_IMAGE_PACKAGES_ENABLED:"true"},{NOVORA_PAYPAL_SANDBOX_ENABLED:"true"},{NOVORA_PAYPAL_SANDBOX_ENABLED:"invalid"}]) {
    const changed={...e,...patch};
    expect(beta.resolveBetaAdmissionBinding(changed)).toBeNull();
    expect(beta.createRedisBetaAdmissionLedger(changed)).toBeNull();
  }
  expect(await beta.reserveBetaAdmission({briefId:randomUUID(),fingerprint:hash("x")},{environment:{...e,NOVORA_BETA_ADMISSION_ENABLED:"false"}})).toBe("denied");
});
test("actual historical commitments deny funding under unchanged cap; no network attempted",()=>{
  const e=environment(); e.NOVORA_INVITATION_TRIAL_SPENDING_CONFIG=JSON.stringify({...config(),m2CommittedMicros:5050000,mvpCommittedMicros:95050000});
  let calls=0;
  expect(beta.resolveBetaAdmissionBinding(e)).toBeNull();
  expect(beta.createRedisBetaAdmissionLedger(e,async()=>{calls++;throw Error("Must not call");})).toBeNull();
  expect(calls).toBe(0);
});
test("one EVAL uses exact period authority, no initialization, no repeat mutation after transport uncertainty",async()=>{
  const commands:unknown[][]=[],e=environment();
  const ledger=beta.createRedisBetaAdmissionLedger(e,async(_url,options)=>{
    commands.push(JSON.parse(options!.body as string));return new Response('{"result":"reserved"}');
  })!;
  const brief=randomUUID();
  await ledger.reserve({identity:roster[0].identity,requestKey:hash("one"),briefId:brief,fingerprint:hash("input")});
  expect(commands).toHaveLength(1);expect(commands[0][0]).toBe("EVAL");expect(commands[0][1]).toBe(period.TEST_PERIOD_SPENDING_SCRIPT);
  expect(JSON.parse(commands[0][7] as string)).toMatchObject({costAuthorityMode:c.MODE,maximumInitialImages:6,maximumRevisions:2,
    maximumInitialImagesPerIdentity:3,maximumRevisionsPerIdentity:1,maximumPaidAttempts:8,limitMicros:8000000,attemptReservationMicros:1000000,costCeilingVerified:false});
  let calls=0;const uncertain=beta.createRedisBetaAdmissionLedger(e,async()=>{calls++;throw Error("synthetic uncertain EVAL");})!;
  await expect(uncertain.reserve({identity:roster[0].identity,requestKey:hash("one"),briefId:brief,fingerprint:hash("input")})).rejects.toThrow();
  expect(calls).toBe(1);
});
test("period outcome port records trusted work binding without making a new reservation",async()=>{
  const records:unknown[]=[],e=environment();
  const ledger={reserve:async()=>{throw Error("No reserve");},claimDispatch:async()=>{throw Error("No dispatch");},recordOutcome:async(v:unknown)=>{records.push(v);return true;}};
  const brief=randomUUID(),job=randomUUID();
  expect(await beta.recordTrialSpendingOutcome({conceptBriefId:brief,jobId:job,parentJobId:null,sourceOutputId:randomUUID(),
    structured:{designSpecSha256:hash("design"),handSketchInstructionSha256:hash("instruction")}},"unknown",null,{environment:e,ledger})).toBe(true);
  expect(records).toHaveLength(1);expect(records[0]).toMatchObject({briefId:job,sourceBriefId:brief,kind:"revision",outcome:"unknown",usageMicros:null});
});
test("prior sixty-minute contract and Lua are unchanged",()=>{
  for (const file of ["tools/invitation-trial-spending-contract.cjs","lib/server/ai-sketch/invitation-trial-spending.ts"])
    expect(readFileSync(path.join(process.cwd(),file),"utf8").replaceAll("\r\n","\n")).toBe(execFileSync("git",["show",`09b984d413a28bf0e9c8e8219d8331744dbe0ec8:${file}`],{encoding:"utf8",windowsHide:true}).replaceAll("\r\n","\n"));
});

test("actual isolated Redis: per-owner caps, eight total slots, one dispatch, UNKNOWN, bindings, expiry and concurrent reserve",async()=>{
  const transport=createLocalRedisTestTransport();
  test.skip(!transport,"No authorized disposable Redis configured. Actual new Lua/concurrency proof remains pending.");
  const redis=(...args:string[])=>transport!.run(...args);
  expect(redis("PING")).toBe("PONG");
  const now=Number(redis("TIME").split(/\r?\n/)[0]);
  function setup(start=now-1) {
    const s=c.selection("synthetic_period_namespace",config(start),roster,"synthetic_period_authority");
    const b=c.binding(s,"dpl_synthetic"+randomUUID().replaceAll("-",""),"c".repeat(40)),a=c.authority(s,b);
    expect(redis("SET",b.ledgerKey,JSON.stringify({version:1,authority:a,reservations:{}}),"NX")).toBe("OK");
    const args=(op:string,v:unknown)=>["EVAL",period.TEST_PERIOD_SPENDING_SCRIPT,"1",b.ledgerKey,op,b.authorityId,b.runtimeBinding,JSON.stringify(a),JSON.stringify(v)];
    return {b,a,args,call:(op:string,v:unknown)=>redis(...args(op,v)),read:()=>JSON.parse(redis("GET",b.ledgerKey))};
  }
  const initial=(identity=roster[0].identity)=>{const briefId=randomUUID();return {identity,requestKey:hash(randomUUID()),briefId,sourceBriefId:briefId,kind:"initial",fingerprint:hash("synthetic")};};
  const revision=(source:ReturnType<typeof initial>,identity=source.identity)=>({...source,identity,kind:"revision",briefId:randomUUID(),requestKey:hash(randomUUID())});
  const deliver=(s:ReturnType<typeof setup>,v:ReturnType<typeof initial>)=>{
    expect(s.call("reserve",v)).toBe("reserved");expect(s.call("reserve",v)).toBe("duplicate");
    expect(s.call("dispatch",{...v,fingerprint:hash("wrong")})).toBe("denied");
    expect(s.call("dispatch",v)).toBe("reserved");expect(s.call("dispatch",v)).toBe("denied");
    expect(s.call("record",{...v,outcome:"delivered",usageMicros:62356})).toBe("recorded");
  };
  const s=setup(),a=initial(),b=initial(roster[1].identity);
  expect(s.call("reserve",revision(a))).toBe("denied");deliver(s,a);deliver(s,initial());deliver(s,initial());
  expect(s.call("reserve",initial())).toBe("denied");expect(s.call("reserve",revision(a,roster[1].identity))).toBe("denied");
  deliver(s,revision(a));expect(s.call("reserve",revision(a))).toBe("denied");
  deliver(s,b);deliver(s,initial(roster[1].identity));deliver(s,initial(roster[1].identity));deliver(s,revision(b));
  const rows=Object.values(s.read().reservations) as any[];
  expect(rows).toHaveLength(8);expect(rows.reduce((sum,r)=>sum+Math.max(r.reservedMicros,r.usageMicros),0)).toBe(8000000);
  for (const owner of roster) {expect(rows.filter(r=>r.identity===owner.identity&&r.kind==="initial")).toHaveLength(3);expect(rows.filter(r=>r.identity===owner.identity&&r.kind==="revision")).toHaveLength(1);}
  expect(redis("PTTL",s.b.ledgerKey)).toBe("-1");
  const u=setup(),unknown=initial();expect(u.call("reserve",unknown)).toBe("reserved");expect(u.call("dispatch",unknown)).toBe("reserved");
  expect(u.call("record",{...unknown,outcome:"unknown",usageMicros:null})).toBe("recorded");
  expect(u.call("dispatch",unknown)).toBe("denied");expect(u.call("reserve",b)).toBe("denied");
  expect(Object.values(u.read().reservations)).toMatchObject([{state:"unknown",reservedMicros:1000000}]);
  const revoked=u.read();revoked.authority.ownerApproved=false;expect(redis("SET",u.b.ledgerKey,JSON.stringify(revoked),"XX")).toBe("OK");
  expect(u.call("record",{...unknown,outcome:"delivered",usageMicros:1})).toBe("denied");
  expect(setup(now+120).call("reserve",initial())).toBe("denied");
  expect(setup(now-c.PERIOD_SECONDS).call("reserve",initial())).toBe("denied");
  const race=setup(),contenders=Array.from({length:8},(_,i)=>initial(roster[i%2].identity));
  const admitted=await Promise.all(contenders.map(v=>transport!.runAsync(...race.args("reserve",v))));
  expect(admitted.filter(v=>v==="reserved")).toHaveLength(1);
  const winner=contenders[admitted.indexOf("reserved")];
  const dispatched=await Promise.all(Array.from({length:8},()=>transport!.runAsync(...race.args("dispatch",winner))));
  expect(dispatched.filter(v=>v==="reserved")).toHaveLength(1);
});
