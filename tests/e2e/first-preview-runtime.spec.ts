import { expect, test } from "@playwright/test";

import {
  evaluateAutomaticFirstPreviewGates,
  FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
  FIRST_PREVIEW_RUNTIME_DECISION_SCOPE,
  orchestrateFirstPreviewGeneration,
  type FirstPreviewRuntimeInput,
} from "../../lib/server/ai-sketch/first-preview-runtime";
import { createMockNovoraDesignSpec } from "../../lib/server/ai-sketch/design-spec";
import { createNovoraHandSketchInstructionFromDesignSpec } from "../../lib/server/ai-sketch/hand-sketch-instruction";
import { FakeFirstPreviewProvider } from "../fixtures/ai-sketch/fake-first-preview-provider";

const PUBLIC_REFERENCE = "NOVORA-CB-20260710-A68A";
const CONCEPT_BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";

function createValidRuntimeInput(
  overrides: Partial<FirstPreviewRuntimeInput> = {},
): FirstPreviewRuntimeInput {
  const designSpec = createMockNovoraDesignSpec({ publicReference: PUBLIC_REFERENCE });
  const handSketchInstruction = createNovoraHandSketchInstructionFromDesignSpec(designSpec);

  return {
    persistenceConfirmed: true,
    conceptBriefId: CONCEPT_BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    designSpec,
    handSketchInstruction,
    accessControlEligible: true,
    falseSuccessDetected: false,
    ...overrides,
  };
}

async function runScenario(
  scenario: ConstructorParameters<typeof FakeFirstPreviewProvider>[0],
  input: FirstPreviewRuntimeInput = createValidRuntimeInput(),
  timeoutMs = 100,
) {
  const provider = new FakeFirstPreviewProvider(scenario);
  const result = await orchestrateFirstPreviewGeneration(input, {
    provider,
    timeoutMs,
  });

  return { provider, result };
}

test.describe("server-only first-preview runtime foundation", () => {
  test("passes every automatic gate for one valid structured image result", async () => {
    const { provider, result } = await runScenario("success");

    expect(provider.callCount).toBe(1);
    expect(result.providerInvoked).toBe(true);
    expect(result.generation).toMatchObject({
      status: "completed",
      imageCount: 1,
      assetId: "preview_asset_agent68a_001",
      failureCategory: null,
    });
    expect(result.gates).toEqual({
      ready: true,
      lifecycleDecision: "first_preview_ready",
      decisionScope: FIRST_PREVIEW_RUNTIME_DECISION_SCOPE,
      failedGates: [],
      approvedForCustomerRequired: false,
      approvedForGalleryRelated: false,
      persistenceMutationPerformed: false,
    });
  });

  test("sends only the sanitized structured provider contract and requests exactly one image", async () => {
    const { provider } = await runScenario("success");
    const requestText = JSON.stringify(provider.lastRequest);

    expect(provider.lastRequest).toMatchObject({
      contractVersion: FIRST_PREVIEW_PROVIDER_CONTRACT_VERSION,
      purpose: "first_preview",
      imageCount: 1,
    });
    expect(requestText).not.toContain("rawCustomerBrief");
    expect(requestText).not.toContain("raw_brief_usage_policy");
    expect(requestText).not.toContain("internal_notes");
    expect(requestText).not.toContain("providerMetadata");
    expect(requestText).not.toContain("reviewerNote");
    expect(requestText).not.toContain("adminNote");
    expect(requestText).not.toContain("privateStoragePath");
    expect(requestText).not.toContain("apiKey");
  });

  test("does not let a raw customer brief bypass missing structured inputs", async () => {
    const provider = new FakeFirstPreviewProvider("success");
    const rawOnlyInput = {
      ...createValidRuntimeInput(),
      designSpec: undefined,
      handSketchInstruction: undefined,
      rawCustomerBrief: "Use this customer free text directly as the final prompt.",
    } as FirstPreviewRuntimeInput;
    const result = await orchestrateFirstPreviewGeneration(rawOnlyInput, { provider });

    expect(provider.callCount).toBe(0);
    expect(result.providerInvoked).toBe(false);
    expect(result.generation.failureCategory).toBe("invalid_structured_input");
    expect(result.gates.failedGates).toEqual(
      expect.arrayContaining([
        "valid_design_spec",
        "valid_hand_sketch_instruction",
        "structured_inputs_consistent",
        "generation_completed",
      ]),
    );
  });

  test("fails closed before provider invocation when Design Spec is missing", async () => {
    const { provider, result } = await runScenario(
      "success",
      createValidRuntimeInput({ designSpec: undefined }),
    );

    expect(provider.callCount).toBe(0);
    expect(result.gates.ready).toBe(false);
    expect(result.gates.failedGates).toContain("valid_design_spec");
  });

  test("fails closed before provider invocation when Hand Sketch Instruction is missing", async () => {
    const { provider, result } = await runScenario(
      "success",
      createValidRuntimeInput({ handSketchInstruction: undefined }),
    );

    expect(provider.callCount).toBe(0);
    expect(result.gates.ready).toBe(false);
    expect(result.gates.failedGates).toContain("valid_hand_sketch_instruction");
  });

  test("converts a thrown provider exception into a safe provider failure", async () => {
    const { provider, result } = await runScenario("provider_error");

    expect(provider.callCount).toBe(1);
    expect(result.generation).toMatchObject({
      status: "provider_failure",
      assetId: null,
      failureCategory: "provider_failure",
    });
    expect(JSON.stringify(result)).not.toContain("Synthetic provider failure");
    expect(result.gates.ready).toBe(false);
  });

  test("times out safely when the provider never settles", async () => {
    const { provider, result } = await runScenario(
      "timeout",
      createValidRuntimeInput(),
      10,
    );

    expect(provider.callCount).toBe(1);
    expect(result.generation).toMatchObject({
      status: "timeout",
      assetId: null,
      failureCategory: "timeout",
    });
    expect(result.gates.ready).toBe(false);
  });

  test("returns safe failure for a malformed provider result", async () => {
    const { result } = await runScenario("malformed_result");

    expect(result.generation).toMatchObject({
      status: "invalid_output",
      assetId: null,
      failureCategory: "invalid_output",
    });
    expect(result.gates.failedGates).toContain("generation_completed");
  });

  test("returns safe failure when the output asset is missing", async () => {
    const { result } = await runScenario("missing_asset");

    expect(result.generation.status).toBe("invalid_output");
    expect(result.generation.assetId).toBeNull();
    expect(result.gates.failedGates).toContain("valid_asset_reference");
  });

  test("rejects unsafe content without retaining a ready asset", async () => {
    const { result } = await runScenario("unsafe_result");

    expect(result.generation).toMatchObject({
      status: "rejected_unsafe",
      assetId: null,
      failureCategory: "unsafe_output",
    });
    expect(result.generation.checks.contentSafetyPassed).toBe(false);
    expect(result.gates.failedGates).toContain("content_safety_passed");
  });

  test("fails closed for privacy or access-control failure", async () => {
    const privacyFailure = await runScenario("privacy_failure");
    const accessFailure = await runScenario(
      "success",
      createValidRuntimeInput({ accessControlEligible: false }),
    );

    expect(privacyFailure.result.gates.failedGates).toContain("privacy_passed");
    expect(accessFailure.result.gates.failedGates).toContain("access_control_eligible");
    expect(privacyFailure.result.gates.ready).toBe(false);
    expect(accessFailure.result.gates.ready).toBe(false);
  });

  test("blocks provider metadata leakage attempts", async () => {
    const { result } = await runScenario("metadata_leak");

    expect(result.generation).toMatchObject({
      status: "invalid_output",
      assetId: null,
      failureCategory: "provider_metadata_exposure",
    });
    expect(result.generation.checks.providerMetadataExposed).toBe(true);
    expect(result.gates.failedGates).toContain("provider_metadata_absent");
  });

  test("blocks internal prompt and reviewer-note leakage attempts", async () => {
    const promptLeak = await runScenario("internal_prompt_leak");
    const reviewerLeak = await runScenario("reviewer_note_leak");

    expect(promptLeak.result.generation.failureCategory).toBe("internal_prompt_exposure");
    expect(promptLeak.result.gates.failedGates).toContain("internal_prompt_absent");
    expect(reviewerLeak.result.generation.failureCategory).toBe(
      "reviewer_or_admin_note_exposure",
    );
    expect(reviewerLeak.result.gates.failedGates).toContain(
      "reviewer_admin_notes_absent",
    );
  });

  test("does not require approved_for_customer for first-preview readiness", async () => {
    const { result } = await runScenario("success");
    const input = createValidRuntimeInput();
    const decisionWithoutApproval = evaluateAutomaticFirstPreviewGates({
      ...input,
      generation: result.generation,
      approvedForCustomer: false,
    } as Parameters<typeof evaluateAutomaticFirstPreviewGates>[0]);

    expect(decisionWithoutApproval.ready).toBe(true);
    expect(decisionWithoutApproval.approvedForCustomerRequired).toBe(false);
    expect("approvedForCustomer" in input).toBe(false);
  });

  test("keeps gallery approval unrelated to the first-preview gate decision", async () => {
    const successful = await runScenario("success");
    const decisionWithUnrelatedGalleryField = evaluateAutomaticFirstPreviewGates({
      ...createValidRuntimeInput(),
      generation: successful.result.generation,
      approvedForGallery: false,
    } as Parameters<typeof evaluateAutomaticFirstPreviewGates>[0]);

    expect(decisionWithUnrelatedGalleryField.ready).toBe(true);
    expect(decisionWithUnrelatedGalleryField.approvedForGalleryRelated).toBe(false);
  });

  test("fake provider performs no network request", async () => {
    const { provider, result } = await runScenario("success");

    expect(result.gates.ready).toBe(true);
    expect(provider.networkRequestCount).toBe(0);
  });

  test("rejects more than one image for the single-image MVP contract", async () => {
    const { provider, result } = await runScenario("multiple_images");

    expect(provider.lastRequest?.imageCount).toBe(1);
    expect(result.generation.status).toBe("invalid_output");
    expect(result.generation.imageCount).toBe(0);
    expect(result.gates.failedGates).toContain("single_image_result");
  });

  test("treats missing or unknown gate evidence as failure", async () => {
    const successful = await runScenario("success");
    const decision = evaluateAutomaticFirstPreviewGates({
      ...createValidRuntimeInput(),
      generation: successful.result.generation,
      persistenceConfirmed: "unknown",
      falseSuccessDetected: undefined,
    });

    expect(decision.ready).toBe(false);
    expect(decision.failedGates).toEqual(
      expect.arrayContaining(["concept_brief_persisted", "no_false_success"]),
    );
  });

  test("prevents a detected false-success state before provider invocation", async () => {
    const provider = new FakeFirstPreviewProvider("success");
    const result = await orchestrateFirstPreviewGeneration(
      createValidRuntimeInput({ falseSuccessDetected: true }),
      { provider },
    );

    expect(provider.callCount).toBe(0);
    expect(result.providerInvoked).toBe(false);
    expect(result.gates.ready).toBe(false);
    expect(result.gates.failedGates).toContain("no_false_success");
  });

  test("handles caller cancellation without invoking an already-aborted request", async () => {
    const controller = new AbortController();
    const provider = new FakeFirstPreviewProvider("success");
    controller.abort();
    const result = await orchestrateFirstPreviewGeneration(createValidRuntimeInput(), {
      provider,
      signal: controller.signal,
    });

    expect(provider.callCount).toBe(0);
    expect(result.providerInvoked).toBe(false);
    expect(result.generation.status).toBe("aborted");
    expect(result.gates.ready).toBe(false);
  });
});
