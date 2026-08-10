import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

const internals = Module as unknown as { _resolveFilename(request: string, parent: unknown, isMain: boolean, options?: unknown): string };
const shim = path.join(process.cwd(), "node_modules", "next", "dist", "compiled", "server-only", "empty.js");
const original = internals._resolveFilename;
internals._resolveFilename = function (request, parent, isMain, options) {
  return request === "server-only" ? shim : original.call(this, request, parent, isMain, options);
};
const testRequire = createRequire(path.join(process.cwd(), "tests", "e2e", "first-preview-customer-feedback.spec.ts"));
const feedbackModule = testRequire("../../lib/server/ai-sketch/first-preview-customer-feedback") as typeof import("../../lib/server/ai-sketch/first-preview-customer-feedback");
const adminFeedbackModule = testRequire("../../lib/server/admin-first-preview-customer-feedback") as typeof import("../../lib/server/admin-first-preview-customer-feedback");
internals._resolveFilename = original;

const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "523e4567-e89b-42d3-a456-426614174000";
const REFERENCE = "NOVORA-CB-20260808-79C1";
const OTHER_REFERENCE = "NOVORA-CB-20260808-79C2";
const SIGNING_SECRET = "agent-79c-feedback-binding-test-secret-20260808";

function feedbackBody(
  feedback: string,
  outputId = OUTPUT_ID,
  publicReference = REFERENCE,
) {
  const binding = feedbackModule.createFirstPreviewCustomerFeedbackBinding(
    { publicReference, outputId },
    SIGNING_SECRET,
  );
  if (!binding) throw new Error("Expected a valid feedback binding fixture.");
  return { feedback, binding };
}

function dependencies(input: { state?: "ready" | "pending" | "unavailable" | "denied"; currentOutputId?: string; pairOutputId?: string | null; insert?: "inserted" | "duplicate" | "unavailable" } = {}) {
  const writes: unknown[] = [];
  const resolutions: unknown[] = [];
  return {
    writes,
    resolutions,
    value: {
      readCustomerView: async () => input.state === "ready" || !input.state
        ? { state: "ready" as const, assetRequest: { publicReference: REFERENCE, outputId: input.currentOutputId ?? OUTPUT_ID } }
        : input.state === "pending"
          ? { state: "pending" as const, pollAfterMs: 5_000 as const }
          : { state: input.state },
      repository: {
        async resolveExactCurrentPair(publicReference: string, outputId: string) {
          resolutions.push({ publicReference, outputId });
          return input.pairOutputId === null ? null : { conceptBriefId: BRIEF_ID, outputId: input.pairOutputId ?? OUTPUT_ID };
        },
        async insertExactFeedback(value: unknown) {
          writes.push(value);
          return input.insert ?? "inserted";
        },
      },
      signingSecret: SIGNING_SECRET,
    },
  };
}

function adminFeedbackQuery(rows: unknown[]) {
  const tables: string[] = [];
  const filters: Array<{ column: string; value: string }> = [];
  const limits: number[] = [];
  const query = {
    select() {
      return query;
    },
    eq(column: string, value: string) {
      filters.push({ column, value });
      return query;
    },
    async limit(value: number) {
      limits.push(value);
      return { data: rows, error: null };
    },
  };
  const client = {
    from(table: string) {
      tables.push(table);
      return query;
    },
  } as unknown as SupabaseClient;
  return { client, filters, limits, tables };
}

test("creates and verifies a domain-separated exact rendered-output binding", async () => {
  const binding = feedbackBody("Refine").binding;
  expect(feedbackModule.verifyFirstPreviewCustomerFeedbackBinding(binding, SIGNING_SECRET)).toEqual({
    v: 1,
    alg: "HS256",
    aud: "novora:first-preview-customer-feedback",
    purpose: "rendered-output-binding",
    publicReference: REFERENCE,
    outputId: OUTPUT_ID,
  });
  const tampered = `${binding.slice(0, -1)}${binding.endsWith("A") ? "B" : "A"}`;
  expect(feedbackModule.verifyFirstPreviewCustomerFeedbackBinding(tampered, SIGNING_SECRET)).toBeNull();

  const wrongReference = dependencies();
  await expect(feedbackModule.persistFirstPreviewCustomerFeedback(
    REFERENCE,
    feedbackBody("Refine", OUTPUT_ID, OTHER_REFERENCE),
    wrongReference.value,
  )).resolves.toEqual({ ok: false, reason: "denied" });
  expect(wrongReference.writes).toHaveLength(0);

  const wrongOutput = dependencies();
  await expect(feedbackModule.persistFirstPreviewCustomerFeedback(
    REFERENCE,
    feedbackBody("Refine", OTHER_OUTPUT_ID),
    wrongOutput.value,
  )).resolves.toEqual({ ok: false, reason: "unavailable" });
  expect(wrongOutput.resolutions).toHaveLength(0);
  expect(wrongOutput.writes).toHaveLength(0);
});

test("validates the exact feedback and opaque-binding browser body", () => {
  const binding = feedbackBody("Refine").binding;
  expect(feedbackModule.normalizeFirstPreviewCustomerFeedbackBody({ feedback: "", binding })).toBeNull();
  expect(feedbackModule.normalizeFirstPreviewCustomerFeedbackBody({ feedback: "   ", binding })).toBeNull();
  expect(feedbackModule.normalizeFirstPreviewCustomerFeedbackBody({ feedback: "x".repeat(2_001), binding })).toBeNull();
  expect(feedbackModule.normalizeFirstPreviewCustomerFeedbackBody({ feedback: "refine" })).toBeNull();
  expect(feedbackModule.normalizeFirstPreviewCustomerFeedbackBody({ feedback: "refine", binding, aiSketchOutputId: OUTPUT_ID })).toBeNull();
  expect(feedbackModule.normalizeFirstPreviewCustomerFeedbackBody({ feedback: "refine", binding, conceptBriefId: BRIEF_ID })).toBeNull();
  expect(feedbackModule.normalizeFirstPreviewCustomerFeedbackBody({ feedback: "  refine  ", binding })).toEqual({ feedback: "refine", binding });
});

test("fails closed for denied, unavailable, pending, stale, and wrong linkage", async () => {
  for (const state of ["denied", "unavailable", "pending"] as const) {
    const setup = dependencies({ state });
    const result = await feedbackModule.persistFirstPreviewCustomerFeedback(REFERENCE, feedbackBody("Refine the setting"), setup.value);
    expect(result.ok).toBe(false);
    expect(setup.writes).toHaveLength(0);
  }
  for (const pairOutputId of [null, OTHER_OUTPUT_ID]) {
    const setup = dependencies({ pairOutputId });
    await expect(feedbackModule.persistFirstPreviewCustomerFeedback(REFERENCE, feedbackBody("Refine the setting"), setup.value)).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(setup.writes).toHaveLength(0);
  }
});

test("persists only when the signed rendered output is still current", async () => {
  const accepted = dependencies();
  await expect(feedbackModule.persistFirstPreviewCustomerFeedback(REFERENCE, feedbackBody("Refine the setting"), accepted.value)).resolves.toEqual({ ok: true });
  expect(accepted.resolutions).toEqual([{ publicReference: REFERENCE, outputId: OUTPUT_ID }]);
  expect(accepted.writes).toEqual([{ conceptBriefId: BRIEF_ID, outputId: OUTPUT_ID, feedback: "Refine the setting" }]);

  const changedBeforeSubmit = dependencies({ currentOutputId: OTHER_OUTPUT_ID });
  await expect(feedbackModule.persistFirstPreviewCustomerFeedback(
    REFERENCE,
    feedbackBody("Feedback about displayed output A", OUTPUT_ID),
    changedBeforeSubmit.value,
  )).resolves.toEqual({ ok: false, reason: "unavailable" });
  expect(changedBeforeSubmit.resolutions).toHaveLength(0);
  expect(changedBeforeSubmit.writes).toHaveLength(0);
});

test("returns deterministic duplicate behavior for the signed exact pair", async () => {
  const duplicate = dependencies({ insert: "duplicate" });
  await expect(feedbackModule.persistFirstPreviewCustomerFeedback(REFERENCE, feedbackBody("Again"), duplicate.value)).resolves.toEqual({ ok: false, reason: "duplicate" });
});

test("customer source exposes feedback only with a server binding and never submits a standalone output ID", () => {
  const pageSource = readFileSync(path.join(process.cwd(), "app", "design", "preview", "[public_reference]", "page.tsx"), "utf8");
  const formSource = readFileSync(path.join(process.cwd(), "app", "design", "preview", "[public_reference]", "FirstPreviewFeedbackForm.tsx"), "utf8");
  expect(pageSource).toContain("createFirstPreviewCustomerFeedbackBinding");
  expect(pageSource).toContain("feedbackBinding={feedbackBinding}");
  expect(pageSource).toContain("outputId: trusted.outputId");
  expect(pageSource).toContain("outputId: preview.outputId");
  expect(pageSource).toContain(
    "`/api/first-preview-assets/${encodeURIComponent(publicReference)}/${encodeURIComponent(trusted.outputId)}`",
  );
  expect(pageSource).not.toContain("/first-preview-assets/${publicReference}/current");
  expect(formSource).toContain("JSON.stringify({ feedback: normalized, binding: feedbackBinding })");
  expect(formSource).not.toContain("aiSketchOutputId");
  expect(formSource).not.toContain("outputId");
  expect(formSource).not.toContain("conceptBriefId");
});

test("admin source reads and displays only the captured review output pair", async () => {
  const readSource = readFileSync(path.join(process.cwd(), "lib", "server", "admin-first-preview-customer-feedback.ts"), "utf8");
  const pageSource = readFileSync(path.join(process.cwd(), "app", "admin", "briefs", "[id]", "page.tsx"), "utf8");
  const adminSource = readFileSync(path.join(process.cwd(), "app", "admin", "briefs", "[id]", "AdminBriefDetailClient.tsx"), "utf8");
  expect(readSource).toContain('.eq("concept_brief_id", normalizedConceptBriefId)');
  expect(readSource).toContain('.eq("ai_sketch_output_id", normalizedExpectedOutputId)');
  expect(readSource).not.toContain("resolveAdminCurrentFirstPreview");
  expect(pageSource).toContain("aiSketchReview.currentAiSketchOutputId");
  expect(adminSource).toContain("customerFeedback.aiSketchOutputId !== outputId");
  expect(adminSource).toContain("No customer feedback submitted for this First Preview.");
  const row = {
    concept_brief_id: BRIEF_ID,
    ai_sketch_output_id: OUTPUT_ID,
    feedback_text: "Refine the setting",
    created_at: "2026-08-08T10:00:00.000Z",
  };
  expect(adminFeedbackModule.mapExactAdminFirstPreviewCustomerFeedback(row, BRIEF_ID, OUTPUT_ID)).toEqual({
    state: "exact",
    aiSketchOutputId: OUTPUT_ID,
    feedbackText: "Refine the setting",
    createdAt: "2026-08-08T10:00:00.000Z",
  });
  expect(adminFeedbackModule.mapExactAdminFirstPreviewCustomerFeedback(row, BRIEF_ID, OTHER_OUTPUT_ID)).toEqual({ state: "unavailable" });
  expect(adminFeedbackModule.mapExactAdminFirstPreviewCustomerFeedback(row, "not-a-brief-id", OUTPUT_ID)).toEqual({ state: "unavailable" });

  const exact = adminFeedbackQuery([row]);
  await expect(adminFeedbackModule.loadAdminFirstPreviewCustomerFeedback(
    BRIEF_ID,
    OUTPUT_ID,
    { supabaseClient: exact.client },
  )).resolves.toEqual({
    state: "exact",
    aiSketchOutputId: OUTPUT_ID,
    feedbackText: "Refine the setting",
    createdAt: "2026-08-08T10:00:00.000Z",
  });
  expect(exact.tables).toEqual(["first_preview_customer_feedback"]);
  expect(exact.filters).toEqual([
    { column: "concept_brief_id", value: BRIEF_ID },
    { column: "ai_sketch_output_id", value: OUTPUT_ID },
  ]);
  expect(exact.limits).toEqual([2]);

  const promotedToB = adminFeedbackQuery([{ ...row, ai_sketch_output_id: OTHER_OUTPUT_ID }]);
  await expect(adminFeedbackModule.loadAdminFirstPreviewCustomerFeedback(
    BRIEF_ID,
    OUTPUT_ID,
    { supabaseClient: promotedToB.client },
  )).resolves.toEqual({ state: "unavailable" });
  expect(promotedToB.filters).toContainEqual({ column: "ai_sketch_output_id", value: OUTPUT_ID });

  const noCapturedOutput = adminFeedbackQuery([row]);
  await expect(adminFeedbackModule.loadAdminFirstPreviewCustomerFeedback(
    BRIEF_ID,
    null,
    { supabaseClient: noCapturedOutput.client },
  )).resolves.toEqual({ state: "none" });
  expect(noCapturedOutput.tables).toHaveLength(0);

  const malformedOutput = adminFeedbackQuery([row]);
  await expect(adminFeedbackModule.loadAdminFirstPreviewCustomerFeedback(
    BRIEF_ID,
    "not-an-output-id",
    { supabaseClient: malformedOutput.client },
  )).resolves.toEqual({ state: "unavailable" });
  expect(malformedOutput.tables).toHaveLength(0);
});
