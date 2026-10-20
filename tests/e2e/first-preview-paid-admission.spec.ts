import { expect, test } from "@playwright/test";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { createHash } from "node:crypto";
import type { DormantFirstPreviewWorkerDependencies } from "../../lib/server/ai-sketch/first-preview-generation-lifecycle";
import type { FirstPreviewWorkerAuthority, InitiationIntent, ProviderLifecycleInput } from "../../lib/server/ai-sketch/first-preview-initiation-contract";
import { createSyntheticPaidAdmission } from "../fixtures/ai-sketch/synthetic-paid-admission";

const internals = Module as unknown as { _resolveFilename: (...args: unknown[]) => string };
const original = internals._resolveFilename;
const testRequire = createRequire(path.join(process.cwd(), "tests/e2e/first-preview-paid-admission.spec.ts"));
let paid: typeof import("../../lib/server/ai-sketch/first-preview-paid-admission");
function loadDormantModules() {
  return {
    rate: testRequire("../../lib/server/public-api-rate-limit") as typeof import("../../lib/server/public-api-rate-limit"),
    lifecycle: testRequire("../../lib/server/ai-sketch/first-preview-generation-lifecycle") as typeof import("../../lib/server/ai-sketch/first-preview-generation-lifecycle"),
    queue: testRequire("../../lib/server/ai-sketch/first-preview-queue") as typeof import("../../lib/server/ai-sketch/first-preview-queue"),
    contract: testRequire("../../lib/server/ai-sketch/first-preview-initiation-contract") as typeof import("../../lib/server/ai-sketch/first-preview-initiation-contract"),
    memory: testRequire("../../lib/server/ai-sketch/in-memory-first-preview-repository") as typeof import("../../lib/server/ai-sketch/in-memory-first-preview-repository"),
    initiation: testRequire("../fixtures/ai-sketch/fake-first-preview-initiation-repository") as typeof import("../fixtures/ai-sketch/fake-first-preview-initiation-repository"),
    png: testRequire("../fixtures/ai-sketch/fake-first-preview-storage-client") as typeof import("../fixtures/ai-sketch/fake-first-preview-storage-client"),
  };
}
let dormant: ReturnType<typeof loadDormantModules>;
try {
  internals._resolveFilename = function (request, ...args) {
    return request === "server-only"
      ? path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js")
      : original.call(this, request, ...args);
  };
  paid = testRequire("../../lib/server/ai-sketch/first-preview-paid-admission");
  dormant = loadDormantModules();
} finally { internals._resolveFilename = original; }

const JOB = "223e4567-e89b-42d3-a456-426614174000";
const DAY = 86_400_000;
const DORMANT_BRIEF = "123e4567-e89b-42d3-a456-426614174000";
const DORMANT_OWNER = "323e4567-e89b-42d3-a456-426614174000";
const DORMANT_OUTPUT = "423e4567-e89b-42d3-a456-426614174000";
const DORMANT_REFERENCE = "NOVORA-CB-20260803-DI01";

async function dormantFixture() {
  const o1 = createSyntheticPaidAdmission();
  const now = () => new Date(o1.state.now).toISOString();
  const repository = new dormant.memory.InMemoryFirstPreviewRepository(now);
  const reservation = await dormant.lifecycle.reserveAutomaticFirstPreviewAttempt({
    payload: {
      pieceType: "ring", designIntent: "A balanced heirloom ring.",
      designDescription: "A refined daily silhouette.", styleDirection: ["warm heirloom"],
      materialDirection: ["warm yellow gold"],
      stones: [{ role: "center", type: "lab-grown diamond", shape: "pear",
        orientation: "point toward fingertip", setting: "five prongs" }],
      centerStoneDirection: "Pear point toward fingertip.", stoneArrangement: "Two shoulder accents.",
      dimensions: ["ring size to confirm"], composition: "Low balanced center.",
      wearabilityRequirements: ["daily wear"], manufacturingConstraints: ["explainable prongs"],
      unknowns: ["exact ring size"], avoid: ["hidden halo"], requestedViews: ["front view"],
    },
    persistenceConfirmed: true, customerAccessEligible: true,
    conceptBriefId: DORMANT_BRIEF, publicReference: DORMANT_REFERENCE,
    attemptNumber: 1, parentJobId: null, repository, jobIdSource: () => JOB,
  });
  if (!reservation.ok) throw new Error("synthetic preparation failed");
  const work = reservation.work;
  const currentRate = dormant.rate.readCurrentConceptBriefRateAuthority(o1.environment)!;
  const job = (await repository.findJobById(JOB))!;
  const shared = dormant.initiation.createSyntheticInitiationState();
  const fake = new dormant.initiation.FakeFirstPreviewInitiationRepository(shared, {
    nowMs: () => o1.state.now, available: () => true, failIntakeAt: () => null,
  });
  const row: InitiationIntent = {
    version: dormant.contract.INITIATION_VERSION, concept_brief_id: DORMANT_BRIEF,
    generation_purpose: "first_preview", attempt_number: 1, state: "queued",
    handoff_stage: "generation", handoff_epoch: "2", publication_fence: "1",
    handoff_attempts: 1, next_attempt_at: now(), lease_owner: null, lease_until: null,
    fence: "1", created_at: now(), updated_at: now(), dispatch_grant: null, last_reason: null,
    admission_context: {
      version: dormant.contract.INITIATION_VERSION,
      ip_key: "rl:v1:concept-briefs:ip:" + "a".repeat(48),
      email_key: "rl:v1:concept-briefs:email:" + "b".repeat(48),
      key_version: currentRate.key_version, rate_policy_version: currentRate.rate_policy_version,
      access_binding: { concept_brief_id: DORMANT_BRIEF, public_reference: DORMANT_REFERENCE,
        proof_version: "synthetic-proof-v1", binding_digest: "c".repeat(64) },
    },
    prepared: {
      job_id: JOB, identity_key: job.idempotencyKey, generation_input: work.structured,
      design_spec_version: job.designSpecVersion, design_spec_sha256: job.designSpecSha256,
      hand_sketch_instruction_version: job.handSketchInstructionVersion,
      hand_sketch_instruction_sha256: job.handSketchInstructionSha256,
      estimated_cost_micros: job.estimatedCostMicros, cost_currency: job.costCurrency,
      pricing_assumption_version: job.pricingAssumptionVersion,
    },
  };
  if (!dormant.contract.isInitiationIntent(row)) throw new Error("invalid synthetic intent");
  o1.seedCounters(row.admission_context!.ip_key, row.admission_context!.email_key);
  shared.intents.set(DORMANT_BRIEF, structuredClone(row));
  shared.jobs.set(JOB, { id: JOB, briefId: DORMANT_BRIEF, identityKey: job.idempotencyKey,
    state: "queued", providerRequestRecorded: false });
  const events: string[] = [];
  const lifecycleInputs: ProviderLifecycleInput[] = [];
  const controls = { providerCalls: 0, uncertain: false, conflictProvider: false,
    freshDenied: false, skipO1: false, doubleO1: false,
    rejectOperation: "" as string, replayDispatch: false, mutateArmFence: false,
    mutateClaimIdentity: false, failReadiness: false };
  const authority: FirstPreviewWorkerAuthority = {
    owner: DORMANT_OWNER,
    policy: { lease_ms: 60_000, backoff_ms: 1, batch_size: 1, max_handoff_attempts: 3, max_wait_ms: 300_000 },
    async claim(input) {
      events.push("claim");
      const result = await fake.claim(input);
      if (result.ok && controls.mutateClaimIdentity && result.value.length) {
        result.value[0].concept_brief_id = DORMANT_OUTPUT;
      }
      return result;
    },
    async transition(input) {
      events.push(input.p_action);
      if (input.p_action === "complete") {
        const output = await repository.findCustomerReadyOutput(DORMANT_BRIEF);
        if (output) shared.readyOutputs.set(output.id, { briefId: output.conceptBriefId,
          jobId: output.jobId, validated: true, current: true, contentSha256: output.contentSha256 });
      }
      const result = await fake.transition(input);
      // Model the SQL's Job write, exclusively inside the synthetic authority.
      if (result.ok && input.p_action === "arm") {
        if (!(await repository.startJob(JOB)).ok) return { ok: false, code: "identity_conflict" };
        if (controls.mutateArmFence) result.value.fence = "999";
      }
      return result;
    },
    async recordProviderLifecycle(input) {
      events.push(input.p_action);
      lifecycleInputs.push(structuredClone(input));
      if (controls.rejectOperation === input.p_action) return { ok: false, code: "repository_unavailable" };
      if (input.p_action === "record_dispatch" && controls.replayDispatch) {
        return { ok: true, value: { recorded: true, replayed: true } };
      }
      if (input.p_action === "register_provider" && controls.conflictProvider) {
        return { ok: false, code: "identity_conflict" };
      }
      if (input.p_action === "provider_result") {
        shared.readyOutputs.set(input.p_payload.output_id, {
          briefId: input.p_concept_brief_id, jobId: input.p_job_id,
          validated: true, current: false, contentSha256: input.p_payload.content_sha256,
        });
      }
      const result = await fake.recordProviderLifecycle(input);
      if (!result.ok || result.value.replayed) return result;
      const persisted = input.p_action === "record_dispatch" ? await repository.recordProviderDispatch(JOB)
        : input.p_action === "register_provider" ? await repository.recordProviderRequest(JOB, {
            providerRequestId: input.p_payload.provider_request_id })
        : input.p_action === "provider_result" ? await repository.recordJobSucceeded(JOB, {
            actualCostMicros: input.p_payload.actual_cost_micros })
        : await repository.recordJobFailure(JOB, { category: input.p_payload.category,
            retryEligible: false, actualCostMicros: null });
      return persisted.ok ? result : { ok: false, code: "identity_conflict" };
    },
  };
  const png = dormant.png.createSyntheticFirstPreviewPng();
  const hash = createHash("sha256").update(png).digest("hex");
  const dependencies: { -readonly [K in keyof DormantFirstPreviewWorkerDependencies]: DormantFirstPreviewWorkerDependencies[K] } = {
    repository, authority, paidAdmission: o1.admission, outputIdSource: () => DORMANT_OUTPUT,
    freshAdmission: {
      async prepare(intent) {
        events.push("fresh-prepare");
        return { version: intent.version, concept_brief_id: intent.concept_brief_id,
          job_id: intent.prepared!.job_id, identity_key: intent.prepared!.identity_key,
          fence: intent.fence, nonce: DORMANT_OUTPUT, deadline_ms: o1.state.now + 10_000,
          admission_context_digest: paid.deriveFirstPreviewAdmissionContextDigest(intent.admission_context!) };
      },
      async dispatch(intent, grant, commitO1) {
        events.push("fresh-dispatch");
        if (controls.freshDenied || grant.fence !== intent.fence || grant.deadline_ms <= o1.state.now) return false;
        if (controls.skipO1) return true;
        const result = await commitO1();
        if (controls.doubleO1) await commitO1();
        return result;
      },
    },
    createProvider: () => ({
      adapter: { async generateFirstPreviewImage() {
        events.push("provider"); controls.providerCalls++;
        if (controls.uncertain) throw new Error("synthetic unknown paid outcome");
        return { ok: true, imageBase64: Buffer.from(png).toString("base64"),
          mimeType: "image/png", width: 1024, height: 1024, byteSize: png.byteLength,
          model: "gpt-image-2-2026-04-21", providerRequestId: "req_dormant_synthetic" };
      } },
      readProviderRequestId: () => controls.uncertain ? null : "req_dormant_synthetic",
      readValidatedUsage: () => controls.uncertain ? null : { textInputTokens: 100, imageOutputTokens: 100 },
    }),
    createAssetStore: () => ({
      kind: "supabase",
      async persistValidatedPng(input) {
        events.push("asset");
        return { ok: true, value: { disposition: "created", asset: {
          assetId: "first-preview/" + input.conceptBriefId + "/" + input.jobId + "/" + input.outputId + ".png",
          assetPersisted: true, bucketName: "novora-ai-sketches", mimeType: "image/png",
          byteSize: png.byteLength, widthPx: 1024, heightPx: 1024, contentSha256: hash,
          assetCreatedAt: now(), assetValidatedAt: now(),
        } } };
      },
      async readAuthorizedPng() { return { ok: false, code: "access_denied" }; },
    }),
    async evaluateTrustedOutput(input) {
      return { evidenceVersion: dormant.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
        subject: input.subject, results: { contentSafetyPassed: !controls.failReadiness,
          privacyPassed: true, outputValidityPassed: true } };
    },
  };
  const wakeup = { version: row.version, concept_brief_id: row.concept_brief_id,
    publication_fence: "1", handoff_epoch: "2", stage: "generation" as const };
  return { repository, work, shared, controls, dependencies, wakeup, events, lifecycleInputs, o1,
    run: () => dormant.queue.consumeDormantFirstPreviewInitiationWakeup(wakeup, dependencies) };
}

async function armedCombinedFixture() {
  const f = await dormantFixture();
  const authority = f.dependencies.authority!;
  const claimed = await authority.claim({
    p_owner: authority.owner, p_policy: authority.policy, p_mode: "execute",
    p_concept_brief_id: f.wakeup.concept_brief_id, p_publication_fence: f.wakeup.publication_fence,
    p_handoff_epoch: f.wakeup.handoff_epoch, p_handoff_stage: "generation",
  });
  if (claimed.ok !== true || claimed.value.length !== 1) throw new Error("synthetic claim failed");
  const grant = await f.dependencies.freshAdmission!.prepare(claimed.value[0]);
  const subject = paid.createPaidAdmissionSubject(f.work)!;
  if (!grant || !await f.o1.admission.reserve(subject)) throw new Error("synthetic reservation failed");
  const armed = await authority.transition({
    p_concept_brief_id: DORMANT_BRIEF, p_owner: authority.owner,
    p_fence: claimed.value[0].fence, p_expected_state: "claimed", p_action: "arm",
    p_policy: authority.policy, p_payload: { grant },
  });
  if (armed.ok !== true) throw new Error("synthetic arm failed");
  const input = { intent: armed.value, owner: authority.owner, grant };
  return { ...f, subject, input,
    dispatch: () => f.o1.admission.dispatchCombined!(subject, JOB, input) };
}

test.describe("PR287 combined Redis O1 atomic", () => {
  test.describe.configure({ mode: "default" });
  let originalFetch: typeof fetch;
  let networkCalls: number;
  let logs: unknown[][];
  let originalLog: typeof console.log, originalWarn: typeof console.warn, originalError: typeof console.error;
  test.beforeEach(() => {
    networkCalls = 0; logs = [];
    originalFetch = globalThis.fetch;
    originalLog = console.log; originalWarn = console.warn; originalError = console.error;
    globalThis.fetch = async () => { networkCalls++; throw new Error("network prohibited"); };
    console.log = console.warn = console.error = (...values: unknown[]) => { logs.push(values); };
  });
  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    console.log = originalLog; console.warn = originalWarn; console.error = originalError;
    expect(networkCalls).toBe(0);
    expect(logs.length, "no context, grants, secrets or customer data logged").toBe(0);
  });

  test("matched current authority commits once before the synthetic Provider and exposes only disposition", async () => {
    const f = await dormantFixture();
    const beforeCounters = JSON.stringify([...f.o1.state.counters]);
    const result = await f.run();
    expect(result).toEqual({ status: "acknowledged", disposition: "completed" });
    expect(f.controls.providerCalls).toBe(1);
    expect(f.o1.state.combinedCommits).toBe(1);
    expect(f.o1.state.combinedKeys).toEqual([[
      paid.FIRST_PREVIEW_PAID_ADMISSION_LEDGER_KEY,
      "rl:v1:concept-briefs:ip:" + "a".repeat(48),
      "rl:v1:concept-briefs:email:" + "b".repeat(48),
    ]]);
    expect(f.o1.state.commands.filter(script => script === paid.PAID_ADMISSION_COMBINED_COMMIT_SCRIPT)).toHaveLength(1);
    expect(JSON.stringify([...f.o1.state.counters])).toBe(beforeCounters);
    expect(f.events.indexOf("record_dispatch")).toBeLessThan(f.events.indexOf("provider"));
    expect(JSON.stringify(result)).not.toContain(f.o1.environment.NOVORA_INTERNAL_SIGNING_SECRET!);
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.controls.providerCalls).toBe(1);
    expect(f.o1.state.combinedCommits).toBe(1);
  });

  for (const [subjectName, count] of [["ip", "31"], ["email", "6"]] as const) {
    test(subjectName + " rejection leaves O1 and both counters unchanged", async () => {
      const f = await armedCombinedFixture();
      const context = f.input.intent.admission_context!;
      f.o1.state.counters.get(subjectName === "ip" ? context.ip_key : context.email_key)!.count = count;
      const before = f.o1.state.raw, counters = JSON.stringify([...f.o1.state.counters]);
      expect(await f.dispatch()).toBe(false);
      expect(f.o1.state.combinedKeys).toHaveLength(1);
      expect(f.o1.state.raw).toBe(before);
      expect(JSON.stringify([...f.o1.state.counters])).toBe(counters);
      expect(f.controls.providerCalls).toBe(0);
    });
  }
  test("O1 budget rejection cannot be replaced by valid limiter evidence", async () => {
    const f = await armedCombinedFixture();
    seedClosed(f.o1, 1, 25_000_000, 0);
    const before = f.o1.state.raw;
    expect(await f.dispatch()).toBe(false);
    expect(f.o1.state.raw).toBe(before);
    expect(f.o1.state.combinedCommits).toBe(0);
  });
  test("competing actual CAS dispatch calls permit exactly one transition", async () => {
    const f = await armedCombinedFixture();
    const other = f.o1.createInstance();
    const results = await Promise.all([
      f.dispatch(), other.dispatchCombined!(f.subject, JOB, structuredClone(f.input)),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(f.o1.state.combinedCommits).toBe(1);
    expect(await f.dispatch()).toBe(false);
    expect(JSON.parse(f.o1.state.raw).entries[f.subject.identity])
      .toMatchObject({ status: "dispatched", ownerJobId: JOB, chargeMicros: 100_000, closedAtMs: null });
  });
  test("a CAS conflict at commit is denied without retry or fallback", async () => {
    const f = await armedCombinedFixture();
    let competing = "";
    f.o1.state.beforeCombined = () => {
      const value = JSON.parse(f.o1.state.raw);
      value.entries[f.subject.identity].status = "dispatched";
      value.entries[f.subject.identity].ownerJobId = DORMANT_OUTPUT;
      competing = f.o1.state.raw = JSON.stringify(value);
    };
    expect(await f.dispatch()).toBe(false);
    expect(f.o1.state.raw).toBe(competing);
    expect(f.o1.state.combinedKeys).toHaveLength(1);
    expect(f.o1.state.combinedCommits).toBe(0);
  });
  for (const mismatch of ["owner", "fence", "job", "intent", "context", "digest", "nonce"] as const) {
    test(mismatch + " mismatch denies the combined dispatch", async () => {
      const f = await armedCombinedFixture();
      if (mismatch === "owner") f.input.owner = DORMANT_OUTPUT;
      if (mismatch === "fence") f.input.grant.fence = "999";
      if (mismatch === "job") f.input.grant.job_id = DORMANT_OUTPUT;
      if (mismatch === "intent") f.input.intent.concept_brief_id = DORMANT_OUTPUT;
      if (mismatch === "context") f.input.intent.admission_context!.ip_key = "rl:v1:concept-briefs:ip:" + "e".repeat(48);
      if (mismatch === "digest") f.input.grant.admission_context_digest = "e".repeat(64);
      if (mismatch === "nonce") f.input.grant.nonce = DORMANT_OWNER;
      const before = f.o1.state.raw;
      expect(await f.dispatch()).toBe(false);
      expect(f.o1.state.raw).toBe(before);
      expect(f.o1.state.combinedCommits).toBe(0);
    });
  }
  for (const expiry of ["deadline", "lease", "ip", "email"] as const) {
    test(expiry + " expiry during commit is checked using Redis time", async () => {
      const f = await armedCombinedFixture();
      const context = f.input.intent.admission_context!;
      if (expiry === "lease") {
        f.input.intent.lease_until = new Date(f.o1.state.now + 1).toISOString();
      }
      f.o1.state.beforeCombined = () => {
        if (expiry === "deadline") f.o1.state.now += 10_000;
        if (expiry === "lease") f.o1.state.now += 1;
        if (expiry === "ip" || expiry === "email") {
          f.o1.state.counters.get(expiry === "ip" ? context.ip_key : context.email_key)!.expiresAtMs = f.o1.state.now;
        }
      };
      const before = f.o1.state.raw;
      expect(await f.dispatch()).toBe(false);
      expect(f.o1.state.combinedKeys).toHaveLength(1);
      expect(f.o1.state.raw).toBe(before);
    });
  }
  for (const mismatch of ["secret", "key-version", "rate-policy"] as const) {
    test(mismatch + " rotation or mismatch denies current authority", async () => {
      const f = await armedCombinedFixture();
      if (mismatch === "secret") f.o1.environment.NOVORA_INTERNAL_SIGNING_SECRET = "different-synthetic-signing-material";
      else {
        const context = f.input.intent.admission_context!;
        if (mismatch === "key-version") context.key_version = "rl-hmac-v1:" + "e".repeat(64);
        else context.rate_policy_version = "e".repeat(64);
        f.input.grant.admission_context_digest = paid.deriveFirstPreviewAdmissionContextDigest(context);
        f.input.intent.dispatch_grant = structuredClone(f.input.grant);
      }
      const before = f.o1.state.raw;
      expect(await f.dispatch()).toBe(false);
      expect(f.o1.state.raw).toBe(before);
    });
  }
  test("rotation during the read denies before the combined write", async () => {
    const f = await armedCombinedFixture();
    f.o1.state.beforeRead = async () => {
      f.o1.environment.NOVORA_INTERNAL_SIGNING_SECRET = "rotated-synthetic-material";
    };
    const before = f.o1.state.raw;
    expect(await f.dispatch()).toBe(false);
    expect(f.o1.state.raw).toBe(before);
    expect(f.o1.state.combinedKeys).toHaveLength(0);
  });
  for (const missing of ["ip", "email", "ledger", "unavailable", "expiring-ledger", "ambiguous-config", "multi-key"] as const) {
    test(missing + " missing or unsupported Redis evidence fails closed", async () => {
      const f = await armedCombinedFixture();
      if (missing === "ip") f.o1.state.counters.delete(f.input.intent.admission_context!.ip_key);
      if (missing === "email") f.o1.state.counters.delete(f.input.intent.admission_context!.email_key);
      if (missing === "ledger") f.o1.state.raw = "";
      if (missing === "unavailable") f.o1.state.unavailable = true;
      if (missing === "expiring-ledger") f.o1.state.expiring = true;
      if (missing === "multi-key") f.o1.state.unsupportedMultiKey = true;
      if (missing === "ambiguous-config") {
        f.o1.environment.KV_REST_API_URL = "https://other-synthetic.example.invalid";
        f.o1.environment.KV_REST_API_TOKEN = "other-synthetic-token";
      }
      const before = f.o1.state.raw;
      expect(await f.dispatch()).toBe(false);
      expect(f.o1.state.raw).toBe(before);
      expect(f.o1.state.combinedCommits).toBe(0);
      expect(f.o1.state.combinedKeys.length).toBeLessThanOrEqual(1);
    });
  }
  test("a committed but ambiguous result denies Provider execution and holds spending across redelivery", async () => {
    const f = await dormantFixture();
    f.o1.state.ambiguousCombined = true;
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.controls.providerCalls).toBe(0);
    expect(f.o1.state.combinedCommits).toBe(1);
    expect(JSON.parse(f.o1.state.raw).entries[paid.createPaidAdmissionSubject(f.work)!.identity])
      .toMatchObject({ status: "dispatched", closedAtMs: null, chargeMicros: 100_000 });
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.o1.state.combinedCommits).toBe(1);
    expect(f.controls.providerCalls).toBe(0);
  });
  test("unknown paid outcome retains charge and concurrency and prohibits automatic Provider retry", async () => {
    const f = await dormantFixture();
    f.controls.uncertain = true;
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.controls.providerCalls).toBe(1);
    expect(f.o1.state.combinedCommits).toBe(1);
    const entry = JSON.parse(f.o1.state.raw).entries[paid.createPaidAdmissionSubject(f.work)!.identity];
    expect(entry).toMatchObject({ status: "dispatched", closedAtMs: null, chargeMicros: 100_000 });
    expect(f.shared.intents.get(DORMANT_BRIEF)).toMatchObject({ state: "operator_hold", last_reason: "paid_outcome_unknown" });
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.controls.providerCalls).toBe(1);
    expect(f.events).not.toContain("recover_preclaim");
  });
  test("absent combined capability never falls back to legacy O1 dispatch", async () => {
    const f = await dormantFixture();
    let legacyCalls = 0;
    f.dependencies.paidAdmission = { reserve: f.o1.admission.reserve, settle: f.o1.admission.settle,
      dispatch: async () => { legacyCalls++; return true; } };
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(legacyCalls).toBe(0);
    expect(f.controls.providerCalls).toBe(0);
    expect(f.events).toEqual([]);
  });
  test("legacy execution and intake limits remain unchanged", async () => {
    const f = await dormantFixture();
    const { authority: _authority, freshAdmission: _fresh, ...legacy } = f.dependencies;
    expect((await dormant.lifecycle.runAutomaticFirstPreviewWorker(f.work, legacy)).status).toBe("ready");
    expect(f.controls.providerCalls).toBe(1);
    expect(f.o1.state.combinedKeys).toHaveLength(0);
    expect(dormant.rate.CONCEPT_BRIEF_IP_RATE_LIMIT).toEqual({ limit: 30, windowSeconds: 600, keyPrefix: "rl:v1:concept-briefs" });
    expect(dormant.rate.CONCEPT_BRIEF_EMAIL_RATE_LIMIT).toEqual({ limit: 5, windowSeconds: 3600, keyPrefix: "rl:v1:concept-briefs" });
  });
});

test.describe("PR287 dormant Worker lifecycle", () => {
  test.describe.configure({ mode: "default" });
  let originalFetch: typeof fetch;
  let networkCalls: number;
  test.beforeEach(() => {
    originalFetch = globalThis.fetch;
    networkCalls = 0;
    globalThis.fetch = async () => { networkCalls++; throw new Error("network prohibited"); };
  });
  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    expect(networkCalls).toBe(0);
  });

  test("valid protected acknowledgements preserve claim identity/fence through readiness and completion", async () => {
    const f = await dormantFixture();
    expect((await f.run()).disposition).toBe("completed");
    expect(f.controls.providerCalls).toBe(1);
    expect(f.events).toEqual(["claim", "fresh-prepare", "arm", "fresh-dispatch", "mark_dispatched",
      "record_dispatch", "provider", "register_provider", "asset", "provider_result", "complete"]);
    for (const input of f.lifecycleInputs) expect(input).toMatchObject({
      p_concept_brief_id: DORMANT_BRIEF, p_job_id: JOB, p_owner: DORMANT_OWNER,
      p_fence: "2", p_expected_state: "dispatched",
    });
    expect(f.shared.intents.get(DORMANT_BRIEF)).toMatchObject({ state: "completed", fence: "2" });
    expect(await f.repository.findCustomerReadyOutput(DORMANT_BRIEF)).not.toBeNull();
    expect(JSON.parse(f.o1.state.raw).entries[paid.createPaidAdmissionSubject(f.work)!.identity])
      .toMatchObject({ status: "settled" });
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.controls.providerCalls).toBe(1);
  });
  for (const missing of ["authority", "freshAdmission", "paidAdmission"] as const) {
    test("missing " + missing + " denies before claiming or Provider construction", async () => {
      const f = await dormantFixture();
      f.dependencies[missing] = undefined;
      f.dependencies.createProvider = () => { throw new Error("must not construct Provider"); };
      expect((await f.run()).disposition).toBe("terminal_failure");
      expect(f.events).toEqual([]);
      expect(f.controls.providerCalls).toBe(0);
    });
  }
  for (const control of ["freshDenied", "skipO1", "doubleO1", "replayDispatch", "mutateArmFence", "mutateClaimIdentity"] as const) {
    test(control + " cannot reach Provider execution", async () => {
      const f = await dormantFixture();
      f.controls[control] = true;
      expect((await f.run()).disposition).not.toBe("completed");
      expect(f.controls.providerCalls).toBe(0);
      expect(await f.repository.findCustomerReadyOutput(DORMANT_BRIEF)).toBeNull();
    });
  }
  test("denied independent O1 cannot be replaced by a positive fresh decision", async () => {
    const f = await dormantFixture();
    f.dependencies.paidAdmission = { ...f.o1.admission, dispatchCombined: async () => false };
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.controls.providerCalls).toBe(0);
  });
  for (const operation of ["record_dispatch", "register_provider", "provider_result"] as const) {
    test("missing " + operation + " acknowledgement prevents success without legacy writes", async () => {
      const f = await dormantFixture();
      f.controls.rejectOperation = operation;
      expect((await f.run()).disposition).toBe("terminal_failure");
      expect(f.controls.providerCalls).toBe(operation === "record_dispatch" ? 0 : 1);
      expect(await f.repository.findCustomerReadyOutput(DORMANT_BRIEF)).toBeNull();
      expect(JSON.parse(f.o1.state.raw).entries[paid.createPaidAdmissionSubject(f.work)!.identity].status)
        .toBe("dispatched");
    });
  }
  test("conflicting Provider registration denies readiness and retains spending", async () => {
    const f = await dormantFixture();
    f.controls.conflictProvider = true;
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(await f.repository.findCustomerReadyOutput(DORMANT_BRIEF)).toBeNull();
    expect(f.lifecycleInputs.some(input => input.p_action === "provider_result")).toBe(false);
    expect(JSON.parse(f.o1.state.raw).entries[paid.createPaidAdmissionSubject(f.work)!.identity].closedAtMs).toBeNull();
  });
  test("unknown paid outcome holds, retains O1 and never retries on redelivery", async () => {
    const f = await dormantFixture();
    f.controls.uncertain = true;
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.shared.intents.get(DORMANT_BRIEF)).toMatchObject({
      state: "operator_hold", last_reason: "paid_outcome_unknown",
    });
    expect(f.lifecycleInputs.find(input => input.p_action === "provider_failure")?.p_payload)
      .toMatchObject({ phase: "paid_outcome_unknown", actual_cost_micros: null });
    expect(JSON.parse(f.o1.state.raw).entries[paid.createPaidAdmissionSubject(f.work)!.identity])
      .toMatchObject({ status: "dispatched", closedAtMs: null, chargeMicros: 100_000 });
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(f.controls.providerCalls).toBe(1);
    expect(f.events).not.toContain("recover_preclaim");
  });
  test("automatic output gates remain mandatory", async () => {
    const f = await dormantFixture();
    f.controls.failReadiness = true;
    expect((await f.run()).disposition).toBe("terminal_failure");
    expect(await f.repository.findCustomerReadyOutput(DORMANT_BRIEF)).toBeNull();
    expect(f.events).not.toContain("complete");
  });
  test("legacy Worker and Queue execution still use their existing injected path", async () => {
    const f = await dormantFixture();
    const { authority: _authority, freshAdmission: _fresh, ...legacy } = f.dependencies;
    expect((await dormant.lifecycle.runAutomaticFirstPreviewWorker(f.work, legacy)).status).toBe("ready");
    expect(f.events).not.toContain("claim");
    expect(f.events).not.toContain("record_dispatch");
    expect(f.controls.providerCalls).toBe(1);
    let legacyCalls = 0;
    const message = { schemaVersion: dormant.queue.FIRST_PREVIEW_QUEUE_MESSAGE_SCHEMA_VERSION,
      conceptBriefId: DORMANT_BRIEF, publicReference: DORMANT_REFERENCE, generationInput: f.work.structured };
    expect((await dormant.queue.consumeFirstPreviewQueueMessage(message, {
      createRepository: () => f.repository, createWorkerDependencies: () => legacy,
      reserveAttempt: async () => ({ ok: true, disposition: "existing", work: f.work }),
      runWorker: async () => { legacyCalls++; return { status: "ready" }; },
    })).disposition).toBe("completed");
    expect(legacyCalls).toBe(1);
    expect((await dormant.queue.consumeDormantFirstPreviewInitiationWakeup(message, f.dependencies)).disposition).toBe("invalid_message");
    expect((await dormant.queue.consumeDormantFirstPreviewInitiationWakeup(f.wakeup)).disposition).toBe("terminal_failure");
  });
});
function subject(index: number) {
  return { identity: index.toString(16).padStart(64, "0"), fingerprint: "a".repeat(64) };
}
function seedClosed(target: ReturnType<typeof createSyntheticPaidAdmission>,
  count: number, cost: number, age: number,
) {
  const ledger = JSON.parse(target.state.raw);
  for (let i = 100; i < 100 + count; i++) {
    ledger.entries[subject(i).identity] = {
      fingerprint: "a".repeat(64), status: "settled", ownerJobId: JOB,
      chargeMicros: cost, closedAtMs: target.state.now - age, attribution: "unclassified",
    };
  }
  target.state.raw = JSON.stringify(ledger);
}

test.describe("P1A independent paid generation admission", () => {
  test("uses exactly the approved aggregate budgets, rolling windows, quota and concurrency", () => {
    expect(paid.FIRST_PREVIEW_PAID_ADMISSION_POLICY).toMatchObject({
      budget24HoursMicros: 25_000_000, budget30DaysMicros: 750_000_000,
      maximumConcurrentOperations: 2, maximumGenerationDispatches24Hours: 180,
    });
    expect(paid.PAID_ADMISSION_COMMIT_SCRIPT).toContain("redis.call('GET', KEYS[1]) ~= ARGV[1]");
    expect(paid.PAID_ADMISSION_COMMIT_SCRIPT).toContain("redis.call('SET', KEYS[1]");
    expect(paid.PAID_ADMISSION_READ_SCRIPT).toContain("redis.call('TIME')");
    expect(paid.PAID_ADMISSION_READ_SCRIPT).toContain("redis.call('PTTL', KEYS[1]) ~= -1");
  });

  test("claims two aggregate slots and rejects a third independent identity", async () => {
    const target = createSyntheticPaidAdmission();
    expect(await target.admission.reserve(subject(1))).toBe(true);
    expect(await target.admission.reserve(subject(1))).toBe(true);
    expect(await target.admission.reserve(subject(2))).toBe(true);
    expect(await target.admission.reserve(subject(3))).toBe(false);
    expect(Object.keys(JSON.parse(target.state.raw).entries)).toHaveLength(2);
  });

  test("concurrent independent instances cannot commit against a stale shared snapshot", async () => {
    const target = createSyntheticPaidAdmission();
    let reads = 0;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    target.state.beforeRead = async () => { if (++reads === 3) release(); await ready; };
    const results = await Promise.all([1, 2, 3].map((id) => target.createInstance().reserve(subject(id))));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(Object.keys(JSON.parse(target.state.raw).entries)).toHaveLength(1);
  });

  test("allows exactly one dispatch for the bound subject and rejects other jobs and fingerprints", async () => {
    const target = createSyntheticPaidAdmission();
    expect(await target.admission.dispatch(subject(1), JOB)).toBe(false);
    expect(await target.admission.reserve(subject(1))).toBe(true);
    expect(await target.admission.dispatch({ ...subject(1), fingerprint: "b".repeat(64) }, JOB)).toBe(false);
    expect(await target.admission.dispatch(subject(1), JOB)).toBe(true);
    expect(await target.admission.dispatch(subject(1), JOB)).toBe(false);
    expect(await target.admission.settle(subject(1), "323e4567-e89b-42d3-a456-426614174000", {
      actualCostMicros: 0, operationCompleted: true,
    })).toBe(false);
  });

  test("uncertain billing retains the full charge and slot across both rolling windows", async () => {
    const target = createSyntheticPaidAdmission();
    await target.admission.reserve(subject(1));
    await target.admission.dispatch(subject(1), JOB);
    expect(await target.admission.settle(subject(1), JOB, {
      actualCostMicros: 0, operationCompleted: false,
    })).toBe(true);
    target.state.now += 31 * DAY;
    expect(await target.admission.reserve(subject(2))).toBe(true);
    expect(await target.admission.reserve(subject(3))).toBe(false);
    expect(JSON.parse(target.state.raw).entries[subject(1).identity]).toMatchObject({
      chargeMicros: 100_000, closedAtMs: null, status: "dispatched",
    });
  });

  test("completed work frees concurrency but never refunds reserved spending or permits replay", async () => {
    const target = createSyntheticPaidAdmission();
    await target.admission.reserve(subject(1));
    await target.admission.dispatch(subject(1), JOB);
    await target.admission.settle(subject(1), JOB, { actualCostMicros: 50_000, operationCompleted: true });
    expect(await target.admission.reserve(subject(1))).toBe(false);
    expect(await target.admission.reserve(subject(2))).toBe(true);
    expect(await target.admission.reserve(subject(3))).toBe(true);
    expect(JSON.parse(target.state.raw).entries[subject(1).identity].chargeMicros).toBe(100_000);
  });

  for (const [name, count, cost, age] of [
    ["daily budget", 1, 25_000_000, 0],
    ["monthly budget", 1, 750_000_000, 2 * DAY],
    ["generation quota", 180, 100_000, 0],
  ] as const) {
    test(`rejects ${name} exhaustion without changing shared state`, async () => {
      const target = createSyntheticPaidAdmission();
      seedClosed(target, count, cost, age);
      const before = target.state.raw;
      expect(await target.admission.reserve(subject(1))).toBe(false);
      expect(target.state.raw).toBe(before);
    });
  }

  test("uses rolling elapsed time rather than a calendar boundary", async () => {
    const target = createSyntheticPaidAdmission();
    seedClosed(target, 180, 100_000, DAY - 1);
    expect(await target.admission.reserve(subject(1))).toBe(false);
    target.state.now += 1;
    expect(await target.admission.reserve(subject(1))).toBe(true);
  });

  test("rechecks aggregate authority at dispatch after enqueue and records actual overages", async () => {
    const target = createSyntheticPaidAdmission();
    await target.admission.reserve(subject(1));
    const allowed = target.state.raw;
    seedClosed(target, 1, 25_000_000, 0);
    expect(await target.admission.dispatch(subject(1), JOB)).toBe(false);
    target.state.raw = allowed;
    await target.admission.dispatch(subject(1), JOB);
    await target.admission.settle(subject(1), JOB, { actualCostMicros: 25_000_001, operationCompleted: true });
    expect(await target.admission.reserve(subject(2))).toBe(false);
  });

  for (const name of ["missing", "malformed", "wrong policy", "future clock", "expiring", "unavailable"] as const) {
    test(`fails closed for ${name} shared-state evidence`, async () => {
      const target = createSyntheticPaidAdmission();
      if (name === "missing") target.state.raw = "";
      if (name === "malformed") target.state.raw = "{}";
      if (name === "wrong policy") target.state.raw = target.state.raw.replace(paid.FIRST_PREVIEW_PAID_ADMISSION_POLICY.version, "legacy");
      if (name === "future clock") target.state.now -= 1;
      if (name === "expiring") target.state.expiring = true;
      if (name === "unavailable") target.state.unavailable = true;
      expect(await target.admission.reserve(subject(1))).toBe(false);
      expect(await target.admission.dispatch(subject(1), JOB)).toBe(false);
    });
  }

  test("missing provider configuration denies without attempting network access", async () => {
    let networkAttempts = 0;
    const admission = paid.createFirstPreviewPaidAdmission({
      environment: {},
      fetchImplementation: async () => { networkAttempts++; throw new Error("forbidden"); },
    });
    expect(await admission.reserve(subject(1))).toBe(false);
    expect(networkAttempts).toBe(0);
  });
});

test.describe("P1A F2 strict ledger status validation", () => {
  async function expectMalformedEntryDenied(
    label: string, status: unknown, closedAt: (now: number) => unknown,
    chargeMicros = 25_000_000,
  ) {
    for (const action of ["reserve", "dispatch"] as const) {
      const target = createSyntheticPaidAdmission();
      if (action === "dispatch") {
        expect(await target.admission.reserve(subject(1))).toBe(true);
      }
      seedClosed(target, 1, chargeMicros, 0);
      const ledger = JSON.parse(target.state.raw);
      const entry = ledger.entries[subject(100).identity];
      entry.status = status;
      entry.ownerJobId = status === "reserved" ? null : JOB;
      entry.closedAtMs = closedAt(target.state.now);
      target.state.raw = JSON.stringify(ledger);
      const before = target.state.raw;
      const commandsBefore = target.state.commands.length;
      const admitted = action === "reserve"
        ? await target.admission.reserve(subject(1))
        : await target.admission.dispatch(subject(1), JOB);
      expect(admitted, `${label}: ${action}`).toBe(false);
      expect(target.state.raw, `${label}: no reservation, dispatch or reset`).toBe(before);
      expect(target.state.commands.slice(commandsBefore)).toEqual([paid.PAID_ADMISSION_READ_SCRIPT]);
    }
  }

  test("rejects the R1 budget bypass and every malformed status type without writes", async () => {
    const cases: Array<[string, unknown]> = [
      ["R1 array settled", ["settled"]],
      ["array reserved", ["reserved"]],
      ["array dispatched", ["dispatched"]],
      ["nested coercible array", [["settled"]]],
      ["empty array", []],
      ["object", {}],
      ["null", null],
      ["number", 1],
      ["boolean", true],
      ["missing", undefined],
      ["invalid enum", "unknown"],
      ["empty string", ""],
    ];
    for (const [label, status] of cases) {
      await expectMalformedEntryDenied(label, status, () => "invalid");
    }
  });

  test("preserves timestamp invariants for each valid status without writes", async () => {
    // Keep budgets below their limits so they cannot mask missing validation.
    await expectMalformedEntryDenied("reserved timestamp", "reserved", (now) => now, 100_000);
    await expectMalformedEntryDenied("dispatched timestamp", "dispatched", (now) => now, 100_000);
    await expectMalformedEntryDenied("settled missing timestamp", "settled", () => null, 100_000);
    await expectMalformedEntryDenied("settled invalid timestamp", "settled", () => "invalid", 100_000);
    await expectMalformedEntryDenied("settled future timestamp", "settled", (now) => now + 1, 100_000);
  });

  test("accepts valid state transitions while preserving charge and rejecting replay", async () => {
    const target = createSyntheticPaidAdmission();
    expect(await target.admission.reserve(subject(1))).toBe(true);
    expect(await target.admission.reserve(subject(1))).toBe(true);
    expect(await target.admission.dispatch(subject(1), JOB)).toBe(true);
    expect(await target.admission.dispatch(subject(1), JOB)).toBe(false);
    expect(await target.admission.settle(subject(1), JOB, {
      actualCostMicros: 50_000, operationCompleted: true,
    })).toBe(true);
    expect(JSON.parse(target.state.raw).entries[subject(1).identity]).toMatchObject({
      status: "settled", ownerJobId: JOB, chargeMicros: 100_000,
      closedAtMs: target.state.now,
    });
    expect(await target.admission.reserve(subject(1))).toBe(false);
    expect(await target.admission.reserve(subject(2))).toBe(true);
    expect(await target.admission.reserve(subject(3))).toBe(true);
  });
});
