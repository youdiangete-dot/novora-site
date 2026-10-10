import Module, { createRequire } from "node:module";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createFirstPreviewCustomerAccessProof } from "../../lib/server/ai-sketch/first-preview-customer-access-contract";
import { deriveFirstPreviewGeneratedAssetId } from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_ASSET_BUCKET,
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  type FirstPreviewAutomaticGateEvidence,
} from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import {
  FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
  FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
  FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
  FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS,
  validateFirstPreviewVisualPrivacyEvidence,
  type FirstPreviewVisualPrivacyEvidence,
  type VisualPrivacySubject,
} from "../../lib/server/ai-sketch/first-preview-visual-privacy-contract";
import { FakeFirstPreviewDatabaseClient } from "../fixtures/ai-sketch/fake-first-preview-database-client";
import { FakeFirstPreviewCustomerAccessDatabaseClient } from "../fixtures/ai-sketch/fake-first-preview-customer-access-client";

// These tests construct only synthetic clients. Loading server-only modules
// follows the existing dependency-injected test seam; no live client is made.
const internals = Module as unknown as {
  _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string;
};
const originalResolve = internals._resolveFilename;
const testRequire = createRequire(path.join(process.cwd(), "tests/e2e/first-preview-visual-privacy-gate.spec.ts"));
let modules: {
  repository: typeof import("../../lib/server/ai-sketch/supabase-first-preview-repository");
  view: typeof import("../../lib/server/ai-sketch/supabase-first-preview-customer-view");
  access: typeof import("../../lib/server/ai-sketch/supabase-first-preview-customer-access");
  customerView: typeof import("../../lib/server/ai-sketch/first-preview-customer-view");
};
try {
  internals._resolveFilename = function (request, parent, isMain, options) {
    return request === "server-only"
      ? path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js")
      : originalResolve.call(this, request, parent, isMain, options);
  };
  modules = {
    repository: testRequire("../../lib/server/ai-sketch/supabase-first-preview-repository"),
    view: testRequire("../../lib/server/ai-sketch/supabase-first-preview-customer-view"),
    access: testRequire("../../lib/server/ai-sketch/supabase-first-preview-customer-access"),
    customerView: testRequire("../../lib/server/ai-sketch/first-preview-customer-view"),
  };
} finally {
  internals._resolveFilename = originalResolve;
}

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "223e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "323e4567-e89b-42d3-a456-426614174000";
const OTHER_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const HASH = "c".repeat(64);
const NOW = Math.floor(Date.parse("2026-07-23T10:00:10.000Z") / 1_000);
const SECRET = "novora-synthetic-visual-privacy-signing-secret-000000000000";
const SUBJECT: VisualPrivacySubject = {
  conceptBriefId: BRIEF_ID, jobId: JOB_ID, outputId: OUTPUT_ID, contentSha256: HASH,
};

function visualEvidence(
  subject: VisualPrivacySubject = SUBJECT,
  overrides: Partial<FirstPreviewVisualPrivacyEvidence> = {},
): FirstPreviewVisualPrivacyEvidence {
  return {
    subject: { ...subject },
    inspectorVersion: FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
    policyVersion: FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
    model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
    result: "passed",
    usageTrusted: true,
    actualCostMicros: 1_000,
    ...overrides,
  };
}

function passingGates(subject: VisualPrivacySubject = SUBJECT): FirstPreviewAutomaticGateEvidence {
  return {
    outputValid: true, assetExists: true, ownershipConsistent: true,
    privacyPassed: true, customerAccessEligible: true, lifecycleEligible: true,
    visualPrivacyEvidence: visualEvidence(subject),
  };
}

function readyOutput(evidence: unknown = { result: "passed", ...passingGates() }, policy: string = FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION) {
  return {
    id: OUTPUT_ID, job_id: JOB_ID, concept_brief_id: BRIEF_ID,
    bucket_name: FIRST_PREVIEW_ASSET_BUCKET,
    object_path: deriveFirstPreviewGeneratedAssetId(SUBJECT),
    mime_type: "image/png", byte_size: 4096, width_px: 1024, height_px: 1024,
    content_sha256: HASH, asset_created_at: "2026-07-23T10:00:00.000Z",
    asset_validation_status: "passed", asset_validated_at: "2026-07-23T10:00:01.000Z",
    automatic_gate_status: "passed", automatic_gate_evidence: evidence,
    automatic_gate_policy_version: policy, automatic_gate_passed_at: "2026-07-23T10:00:03.000Z",
    readiness_status: "first_preview_ready", first_preview_ready_at: "2026-07-23T10:00:04.000Z",
    readiness_revoked_at: null, is_current_customer_preview: true,
    created_at: "2026-07-23T10:00:01.000Z",
  };
}

function succeededJob() {
  return {
    id: JOB_ID, concept_brief_id: BRIEF_ID, generation_purpose: "first_preview",
    attempt_number: 1, lineage_identity: "first-preview:v1", parent_job_id: null,
    parent_generation_purpose: null, parent_attempt_number: null, source_output_id: null,
    design_spec_version: "novora_design_spec_v1", design_spec_hash: "a".repeat(64),
    hand_sketch_instruction_version: "novora_hand_sketch_instruction_v1", hand_sketch_instruction_hash: "b".repeat(64),
    status: "succeeded", failure_category: null, retry_eligible: null, terminal_reason: null,
    started_at: "2026-07-23T10:00:00.000Z", deadline_at: "2026-07-23T10:02:30.000Z",
    completed_at: "2026-07-23T10:00:02.000Z", failed_at: null, cancelled_at: null, timed_out_at: null,
    created_at: "2026-07-23T10:00:00.000Z", updated_at: "2026-07-23T10:00:04.000Z",
  };
}

async function readBothExposureBoundaries(output: ReturnType<typeof readyOutput>) {
  const brief = { id: BRIEF_ID, public_reference: PUBLIC_REFERENCE };
  const job = succeededJob();
  const source = modules.view.createSupabaseFirstPreviewCustomerViewStateSource({
    async findBriefCandidates() { return { data: [brief], error: null }; },
    async findOutputCandidates() { return { data: [output], error: null }; },
    async findJobCandidates() { return { data: [job], error: null }; },
  }, { clock: () => NOW });
  const database = new FakeFirstPreviewCustomerAccessDatabaseClient();
  database.briefCandidates = [brief];
  database.outputCandidates = [output];
  database.jobCandidates = [job];
  const authorizer = modules.access.createSupabaseFirstPreviewCustomerAccessAuthorizer(database, SECRET, { clock: () => NOW });
  const proof = createFirstPreviewCustomerAccessProof({
    briefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE, nonce: "synthetic_privacy_nonce_000001",
    issuedAt: NOW - 30, expiresAt: NOW + 1_000,
  }, SECRET);
  if (!proof) throw new Error("Synthetic proof must be valid");
  return {
    view: await source.readExactCustomerPreviewState({ conceptBriefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE }),
    asset: await authorizer.authorize({ publicReference: PUBLIC_REFERENCE, outputId: OUTPUT_ID, accessProof: proof }),
  };
}

async function candidateHarness() {
  const client = new FakeFirstPreviewDatabaseClient();
  const repository = modules.repository.createSupabaseFirstPreviewRepository(client, {
    clock: () => "2026-07-23T10:00:05.000Z",
  });
  expect(await repository.reserveJob({
    jobId: JOB_ID, conceptBriefId: BRIEF_ID, attemptNumber: 1, parentJobId: null, sourceOutputId: null,
    designSpecVersion: "novora_design_spec_v1", designSpecSha256: "a".repeat(64),
    handSketchInstructionVersion: "novora_hand_sketch_instruction_v1", handSketchInstructionSha256: "b".repeat(64),
    estimatedCostMicros: 42_000, costCurrency: "USD", pricingAssumptionVersion: "synthetic-priced-profile-v1",
  })).toMatchObject({ ok: true });
  expect(await repository.startJob(JOB_ID)).toMatchObject({ ok: true });
  expect(await repository.recordProviderDispatch(JOB_ID)).toMatchObject({ ok: true });
  expect(await repository.recordProviderRequest(JOB_ID, { providerRequestId: "synthetic-privacy-candidate-request" })).toMatchObject({ ok: true });
  expect(await repository.persistOutput({
    outputId: OUTPUT_ID, jobId: JOB_ID, conceptBriefId: BRIEF_ID,
    assetId: deriveFirstPreviewGeneratedAssetId(SUBJECT)!, assetPersisted: true,
    bucketName: FIRST_PREVIEW_ASSET_BUCKET, mimeType: "image/png", byteSize: 4096,
    widthPx: 1024, heightPx: 1024, contentSha256: HASH,
    assetCreatedAt: "2026-07-23T10:00:00.000Z", assetValidatedAt: "2026-07-23T10:00:01.000Z",
  })).toMatchObject({ ok: true });
  return { client, repository };
}

test.describe("First Preview visual privacy exposure and durable dispatch gates", () => {
  test("legacy v1 passed metadata cannot expose a ready image through either boundary", async () => {
    const { visualPrivacyEvidence: _omitted, ...legacyGates } = passingGates();
    const result = await readBothExposureBoundaries(readyOutput({ result: "passed", ...legacyGates }, "novora_first_preview_automatic_gates_v1"));
    expect(result.view).toEqual({ state: "unavailable" });
    expect(result.asset).toEqual({ authorized: false });
  });

  test("valid bound v2 evidence allows automatic viewing without a human approval record", async () => {
    const result = await readBothExposureBoundaries(readyOutput());
    expect(result.view).toMatchObject({ state: "ready", outputId: OUTPUT_ID, authorizationEligible: true });
    expect(result.asset).toMatchObject({ authorized: true, descriptor: { outputId: OUTPUT_ID, conceptBriefId: BRIEF_ID } });
  });

  for (const [name, mutation] of [
    ["brief UUID", { subject: { ...SUBJECT, conceptBriefId: OTHER_ID } }],
    ["job UUID", { subject: { ...SUBJECT, jobId: OTHER_ID } }],
    ["output UUID", { subject: { ...SUBJECT, outputId: OTHER_ID } }],
    ["content SHA-256", { subject: { ...SUBJECT, contentSha256: "d".repeat(64) } }],
    ["inspector version", { inspectorVersion: "novora_openai_visual_privacy_inspector_v0" }],
    ["policy version", { policyVersion: "novora_first_preview_visual_privacy_v0" }],
    ["model", { model: "gpt-4.1-mini" }],
    ["failed visual result", { result: "failed" }],
    ["untrusted usage", { usageTrusted: false, actualCostMicros: 30_000 }],
    ["oversized charge", { actualCostMicros: 30_001 }],
  ] as const) {
    test(`v2 evidence with a wrong ${name} denies view and direct asset authorization`, async () => {
      const result = await readBothExposureBoundaries(readyOutput({
        result: "passed", ...passingGates(), visualPrivacyEvidence: { ...visualEvidence(), ...mutation },
      }));
      expect(result.view).toEqual({ state: "unavailable" });
      expect(result.asset).toEqual({ authorized: false });
    });
  }

  test("v2 outer policy and missing visual evidence fail closed independently", async () => {
    const { visualPrivacyEvidence: _omitted, ...gates } = passingGates();
    for (const row of [
      readyOutput({ result: "passed", ...gates }),
      readyOutput(undefined, "novora_first_preview_automatic_gates_v999"),
    ]) {
      const result = await readBothExposureBoundaries(row);
      expect(result.view).toEqual({ state: "unavailable" });
      expect(result.asset).toEqual({ authorized: false });
    }
  });

  test("simultaneous durable reservation claims exactly once and pending replay cannot redispatch", async () => {
    const { client, repository } = await candidateHarness();
    const results = await Promise.all([
      repository.reserveVisualPrivacyInspection(SUBJECT), repository.reserveVisualPrivacyInspection(SUBJECT),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect(client.outputs.get(OUTPUT_ID)).toMatchObject({ automatic_gate_status: "pending", automatic_gate_policy_version: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION });
    const reopened = modules.repository.createSupabaseFirstPreviewRepository(client, { clock: () => "2026-07-23T10:00:06.000Z" });
    expect(await reopened.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: false });
    expect(await reopened.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("crash-consistency settles an expired reservation once without inventing an inspector verdict", async () => {
    const { client, repository } = await candidateHarness();
    expect(await repository.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: true });
    const recovered = modules.repository.createSupabaseFirstPreviewRepository(client, {
      clock: () => "2026-07-23T10:10:00.000Z",
    });
    const results = await Promise.all([
      recovered.reconcileInterruptedInspection(JOB_ID, BRIEF_ID),
      recovered.reconcileInterruptedInspection(JOB_ID, BRIEF_ID),
    ]);
    expect(results.every((result) => result.ok)).toBe(true);
    expect(client.outputs.get(OUTPUT_ID)).toMatchObject({
      automatic_gate_status: "failed", readiness_status: "not_ready",
      automatic_gate_evidence: {
        reason: "inspection_interrupted", billingStatus: "unknown",
        reservedCostMicros: 30_000, subject: SUBJECT,
      },
    });
    expect(client.jobs.get(JOB_ID)?.status).toBe("timed_out");
    const settlementAttempts = client.outputUpdates.filter((update) =>
      "patch" in update && typeof update.patch === "object" && update.patch !== null &&
      "automatic_gate_status" in update.patch && update.patch.automatic_gate_status === "failed",
    );
    expect(settlementAttempts.length).toBeGreaterThanOrEqual(1);
    expect(settlementAttempts.length).toBeLessThanOrEqual(2);
    expect(client.jobs.get(JOB_ID)?.timed_out_at).not.toBeNull();
    expect(await repository.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: false });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
    expect(await recovered.reconcileInterruptedInspection(JOB_ID, OTHER_ID)).toMatchObject({ ok: false });
  });

  test("crash-consistency settles a terminal failed Job before its deadline", async () => {
    const { client, repository } = await candidateHarness();
    await repository.reserveVisualPrivacyInspection(SUBJECT);
    expect(await repository.recordJobFailure(JOB_ID, {
      category: "unexpected_provider_error", retryEligible: false, actualCostMicros: 42_000,
    })).toMatchObject({ ok: true });
    expect(await repository.reconcileInterruptedInspection(JOB_ID, BRIEF_ID)).toMatchObject({
      ok: true, value: { automaticGateStatus: "failed", readinessStatus: "not_ready" },
    });
    expect(client.outputs.get(OUTPUT_ID)?.automatic_gate_evidence).toMatchObject({
      reason: "inspection_interrupted", billingStatus: "unknown", reservedCostMicros: 30_000,
    });
  });

  test("crash-consistency authenticates exact-Brief status recovery before any database mutation", async () => {
    const { client, repository } = await candidateHarness();
    await repository.reserveVisualPrivacyInspection(SUBJECT);
    // This status fixture must meet the customer reader's stricter chronology:
    // the private asset cannot predate its owning Job's start.
    const jobStart = client.jobs.get(JOB_ID)!.started_at!;
    client.outputs.set(OUTPUT_ID, {
      ...client.outputs.get(OUTPUT_ID)!,
      asset_created_at: jobStart,
      asset_validated_at: jobStart,
    });
    const lateNow = Math.floor(Date.parse("2026-07-23T10:10:00.000Z") / 1_000);
    const recovered = modules.repository.createSupabaseFirstPreviewRepository(client, {
      clock: () => "2026-07-23T10:10:00.000Z",
    });
    const source = modules.view.createSupabaseFirstPreviewCustomerViewStateSource({
      async findBriefCandidates() {
        return { data: [{ id: BRIEF_ID, public_reference: PUBLIC_REFERENCE }], error: null };
      },
      async findOutputCandidates() {
        return { data: [...client.outputs.values()], error: null };
      },
      async findJobCandidates() {
        return { data: [...client.jobs.values()], error: null };
      },
    }, { clock: () => lateNow, recoveryRepository: recovered });
    const request = { publicReference: PUBLIC_REFERENCE, accessProof: "forged" };
    expect(await modules.customerView.readFirstPreviewCustomerView(request, {
      clock: () => lateNow, signingSecret: SECRET, stateSource: source,
    })).toEqual({ state: "denied" });
    expect(client.outputs.get(OUTPUT_ID)?.automatic_gate_status).toBe("pending");
    const proof = createFirstPreviewCustomerAccessProof({
      briefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE,
      nonce: "synthetic_privacy_nonce_000002", issuedAt: lateNow - 30, expiresAt: lateNow + 300,
    }, SECRET);
    expect(proof).not.toBeNull();
    expect(await modules.customerView.readFirstPreviewCustomerView({
      publicReference: PUBLIC_REFERENCE, accessProof: proof!,
    }, { clock: () => lateNow, signingSecret: SECRET, stateSource: source })).toEqual({ state: "unavailable" });
    expect(client.outputs.get(OUTPUT_ID)?.automatic_gate_status).toBe("failed");
  });

  test("crash-consistency preserves the succeeded pending claim through 1799 seconds and settles once at 1800", async () => {
    const { client, repository } = await candidateHarness();
    await repository.reserveVisualPrivacyInspection(SUBJECT);
    expect(await repository.recordJobSucceeded(JOB_ID, { actualCostMicros: 42_000 })).toMatchObject({ ok: true });
    expect(await repository.reconcileInterruptedInspection(JOB_ID, BRIEF_ID)).toMatchObject({
      ok: true, value: { automaticGateStatus: "pending" },
    });
    const completedAt = Date.parse(client.jobs.get(JOB_ID)!.completed_at!);
    const beforeBoundary = modules.repository.createSupabaseFirstPreviewRepository(client, {
      clock: () => new Date(completedAt + 1_799_000).toISOString(),
    });
    expect(await beforeBoundary.reconcileInterruptedInspection(JOB_ID, BRIEF_ID)).toMatchObject({
      ok: true, value: { automaticGateStatus: "pending" },
    });
    expect(client.outputs.get(OUTPUT_ID)?.automatic_gate_status).toBe("pending");
    const jobStart = client.jobs.get(JOB_ID)!.started_at!;
    client.outputs.set(OUTPUT_ID, {
      ...client.outputs.get(OUTPUT_ID)!, asset_created_at: jobStart, asset_validated_at: jobStart,
    });
    const beforeBoundarySeconds = Math.floor((completedAt + 1_799_000) / 1_000);
    let recoveryCalls = 0;
    const source = modules.view.createSupabaseFirstPreviewCustomerViewStateSource({
      async findBriefCandidates() {
        return { data: [{ id: BRIEF_ID, public_reference: PUBLIC_REFERENCE }], error: null };
      },
      async findOutputCandidates() {
        return { data: [...client.outputs.values()], error: null };
      },
      async findJobCandidates() {
        return { data: [...client.jobs.values()], error: null };
      },
    }, {
      clock: () => beforeBoundarySeconds,
      recoveryRepository: {
        async reconcileInterruptedInspection(jobId, conceptBriefId) {
          recoveryCalls += 1;
          return beforeBoundary.reconcileInterruptedInspection(jobId, conceptBriefId);
        },
      },
    });
    const proof = createFirstPreviewCustomerAccessProof({
      briefId: BRIEF_ID, publicReference: PUBLIC_REFERENCE,
      nonce: "synthetic_success_pending_nonce_000001",
      issuedAt: beforeBoundarySeconds - 30, expiresAt: beforeBoundarySeconds + 300,
    }, SECRET);
    expect(proof).not.toBeNull();
    expect(await modules.customerView.readFirstPreviewCustomerView({
      publicReference: PUBLIC_REFERENCE, accessProof: "forged",
    }, { clock: () => beforeBoundarySeconds, signingSecret: SECRET, stateSource: source })).toEqual({ state: "denied" });
    expect(await modules.customerView.readFirstPreviewCustomerView({
      publicReference: PUBLIC_REFERENCE, accessProof: proof!,
    }, { clock: () => beforeBoundarySeconds, signingSecret: SECRET, stateSource: source })).toEqual({
      state: "pending", pollAfterMs: 5_000,
    });
    expect(recoveryCalls).toBe(0);
    expect(client.outputs.get(OUTPUT_ID)?.automatic_gate_status).toBe("pending");
    const atBoundary = modules.repository.createSupabaseFirstPreviewRepository(client, {
      clock: () => new Date(completedAt + 1_800_000).toISOString(),
    });
    expect(await atBoundary.reconcileInterruptedInspection(JOB_ID, BRIEF_ID)).toMatchObject({
      ok: true, value: { automaticGateStatus: "failed" },
    });
    const afterBoundary = modules.repository.createSupabaseFirstPreviewRepository(client, {
      clock: () => new Date(completedAt + 1_801_000).toISOString(),
    });
    expect(await afterBoundary.reconcileInterruptedInspection(JOB_ID, BRIEF_ID)).toMatchObject({
      ok: true, value: { automaticGateStatus: "failed" },
    });
    expect(client.outputUpdates.filter((update) =>
      "patch" in update && typeof update.patch === "object" && update.patch !== null &&
      "automatic_gate_status" in update.patch && update.patch.automatic_gate_status === "failed",
    )).toHaveLength(1);
    expect(client.outputs.get(OUTPUT_ID)?.automatic_gate_evidence).toMatchObject({
      reason: "inspection_interrupted", billingStatus: "unknown", reservedCostMicros: 30_000,
    });
    expect(await repository.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: false });
    expect(await repository.markOutputReady({
      ...SUBJECT, gates: passingGates(), automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    })).toMatchObject({ ok: false });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("failed and unknown-charge reservations stay durable and cannot redispatch", async () => {
    const { client, repository } = await candidateHarness();
    expect(await repository.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: true });
    const unknownUsage = visualEvidence(SUBJECT, {
      result: "failed", usageTrusted: false, actualCostMicros: FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS,
    });
    expect(validateFirstPreviewVisualPrivacyEvidence(unknownUsage, SUBJECT, false)).toBe(true);
    expect(validateFirstPreviewVisualPrivacyEvidence({ ...unknownUsage, actualCostMicros: 0 }, SUBJECT, false)).toBe(false);
    expect(await repository.recordVisualPrivacyInspectionFailure(SUBJECT, unknownUsage)).toMatchObject({ ok: true });
    const reopened = modules.repository.createSupabaseFirstPreviewRepository(client);
    expect(await reopened.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: false });
    expect(client.outputs.get(OUTPUT_ID)).toMatchObject({
      automatic_gate_status: "failed", readiness_status: "not_ready", is_current_customer_preview: false,
      automatic_gate_evidence: { visualPrivacyEvidence: { usageTrusted: false, actualCostMicros: 30_000 } },
    });
  });

  test("a passed result cannot become ready without a durable pending inspection claim", async () => {
    const { repository } = await candidateHarness();
    expect(await repository.recordJobSucceeded(JOB_ID, { actualCostMicros: 41_000 })).toMatchObject({ ok: true });
    expect(await repository.markOutputReady({
      ...SUBJECT, gates: passingGates(), automaticGatePolicyVersion: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    })).toMatchObject({ ok: false });
    expect(await repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("inspection attempts above two are denied before a durable reservation", async () => {
    const { client, repository } = await candidateHarness();
    const job = client.jobs.get(JOB_ID)!;
    client.jobs.set(JOB_ID, { ...job, attempt_number: 3 });
    expect(await repository.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: false });
    expect(client.outputs.get(OUTPUT_ID)?.automatic_gate_status).toBeNull();
  });

  for (const historicalState of ["pending", "failed", "revoked"] as const) {
    test(`brief lifetime accounting retains ${historicalState} inspection reservations`, async () => {
      const { client, repository } = await candidateHarness();
      const row = client.outputs.get(OUTPUT_ID)!;
      const historicalSubject = { ...SUBJECT, jobId: OTHER_ID, outputId: OTHER_OUTPUT_ID };
      client.outputs.set(OTHER_OUTPUT_ID, {
        ...row, id: OTHER_OUTPUT_ID, job_id: OTHER_ID,
        automatic_gate_status: historicalState === "revoked" ? "passed" : historicalState,
        automatic_gate_policy_version: FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
        automatic_gate_evidence: historicalState === "pending" ? null : {
          result: historicalState === "failed" ? "failed" : "passed",
          visualPrivacyEvidence: visualEvidence(historicalSubject, {
            result: historicalState === "failed" ? "failed" : "passed", actualCostMicros: 1_000,
          }),
        },
        readiness_status: historicalState === "revoked" ? "revoked" : "not_ready",
        first_preview_ready_at: historicalState === "revoked" ? "2026-07-23T10:00:03.000Z" : null,
        readiness_revoked_at: historicalState === "revoked" ? "2026-07-23T10:00:04.000Z" : null,
        automatic_gate_passed_at: historicalState === "revoked" ? "2026-07-23T10:00:03.000Z" : null,
      });
      // One prior reservation and this candidate consume the full 60,000
      // micros even when the measured prior charge was only 1,000.
      expect(await repository.reserveVisualPrivacyInspection(SUBJECT)).toMatchObject({ ok: true });
      const thirdId = "623e4567-e89b-42d3-a456-426614174000";
      client.outputs.set(thirdId, { ...row, id: thirdId, job_id: "723e4567-e89b-42d3-a456-426614174000" });
      const thirdSubject = { ...SUBJECT, outputId: thirdId, jobId: "723e4567-e89b-42d3-a456-426614174000" };
      const candidateJob = client.jobs.get(JOB_ID)!;
      client.jobs.set(thirdSubject.jobId, { ...candidateJob, id: thirdSubject.jobId, attempt_number: 2, parent_job_id: JOB_ID, parent_generation_purpose: "first_preview", parent_attempt_number: 1 });
      expect(await repository.reserveVisualPrivacyInspection(thirdSubject)).toMatchObject({ ok: false });
      expect(client.outputs.get(thirdId)?.automatic_gate_status).toBeNull();
    });
  }
});
