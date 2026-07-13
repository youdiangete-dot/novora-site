import { expect, test } from "@playwright/test";

import {
  createOpenAiFirstPreviewProviderAdapter,
  OPENAI_API_KEY_ENV_NAME,
  OPENAI_FIRST_PREVIEW_MAX_IMAGE_BYTES,
  OPENAI_FIRST_PREVIEW_MODEL,
  OPENAI_FIRST_PREVIEW_TIMEOUT_MS,
  validateOpenAiApiKeyConfiguration,
  type OpenAiApiKeyConfiguration,
  type OpenAiFirstPreviewFailureCategory,
} from "../../lib/server/ai-sketch/openai-first-preview-provider";
import {
  orchestrateFirstPreviewGeneration,
  type FirstPreviewProviderRequest,
  type FirstPreviewRuntimeInput,
} from "../../lib/server/ai-sketch/first-preview-runtime";
import { createMockNovoraDesignSpec } from "../../lib/server/ai-sketch/design-spec";
import { createNovoraHandSketchInstructionFromDesignSpec } from "../../lib/server/ai-sketch/hand-sketch-instruction";
import { FakeFirstPreviewProvider } from "../fixtures/ai-sketch/fake-first-preview-provider";
import {
  FakeOpenAiImageClient,
  type FakeOpenAiImageClientScenario,
} from "../fixtures/ai-sketch/fake-openai-image-client";

const PUBLIC_REFERENCE = "NOVORA-CB-20260713-A70A";
const CONCEPT_BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const CONFIGURED: OpenAiApiKeyConfiguration = {
  status: "configured",
  variableName: OPENAI_API_KEY_ENV_NAME,
};

let externalNetworkRequestCount = 0;
let originalFetch: typeof globalThis.fetch;
let validRequest: FirstPreviewProviderRequest;

async function captureRuntimeRequest() {
  const designSpec = createMockNovoraDesignSpec({
    publicReference: PUBLIC_REFERENCE,
  });
  const handSketchInstruction =
    createNovoraHandSketchInstructionFromDesignSpec(designSpec);
  const input: FirstPreviewRuntimeInput = {
    persistenceConfirmed: true,
    conceptBriefId: CONCEPT_BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    designSpec,
    handSketchInstruction,
    accessControlEligible: true,
    falseSuccessDetected: false,
  };
  const provider = new FakeFirstPreviewProvider("success");

  await orchestrateFirstPreviewGeneration(input, {
    provider,
    timeoutMs: OPENAI_FIRST_PREVIEW_TIMEOUT_MS,
  });

  if (!provider.lastRequest) {
    throw new Error("Synthetic runtime request capture failed.");
  }

  return provider.lastRequest;
}

function createHarness(
  scenario: FakeOpenAiImageClientScenario,
  configuration: OpenAiApiKeyConfiguration = CONFIGURED,
) {
  const client = new FakeOpenAiImageClient(scenario);
  const adapter = createOpenAiFirstPreviewProviderAdapter({
    client,
    configuration,
  });
  const controller = new AbortController();

  return { client, adapter, controller };
}

async function runScenario(
  scenario: FakeOpenAiImageClientScenario,
  request: FirstPreviewProviderRequest = validRequest,
) {
  const harness = createHarness(scenario);
  const result = await harness.adapter.generateFirstPreviewImage(request, {
    signal: harness.controller.signal,
  });

  return { ...harness, result };
}

test.beforeAll(async () => {
  validRequest = await captureRuntimeRequest();
});

test.beforeEach(() => {
  externalNetworkRequestCount = 0;
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    externalNetworkRequestCount += 1;
    throw new Error("External network access is blocked in Agent 70A tests.");
  }) as typeof globalThis.fetch;
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  expect(externalNetworkRequestCount).toBe(0);
});

test.describe("server-only OpenAI first-preview adapter foundation", () => {
  test("maps the exact pinned non-streaming Image API request once", async () => {
    const { client, controller, result } = await runScenario("valid_1024_png");

    expect(result.ok).toBe(true);
    expect(client.callCount).toBe(1);
    expect(client.lastSignal).toBe(controller.signal);
    expect(client.signalWasAbortedAtCall).toBe(false);
    expect(client.lastRequest).toMatchObject({
      model: "gpt-image-2-2026-04-21",
      n: 1,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      moderation: "auto",
    });
    expect(Object.keys(client.lastRequest ?? {}).sort()).toEqual(
      [
        "model",
        "moderation",
        "n",
        "output_format",
        "prompt",
        "quality",
        "size",
      ].sort(),
    );
    expect(client.lastRequest).not.toHaveProperty("stream");
    expect(client.lastRequest).not.toHaveProperty("partial_images");
    expect(client.lastRequest).not.toHaveProperty("image");
    expect(client.lastRequest).not.toHaveProperty("reference_images");
    expect(OPENAI_FIRST_PREVIEW_MODEL).toBe("gpt-image-2-2026-04-21");
    expect(OPENAI_FIRST_PREVIEW_TIMEOUT_MS).toBe(150_000);
  });

  test("uses a deep field allowlist and excludes identity, contact, notes, paths, and secrets", async () => {
    const requestWithForbiddenExtras = structuredClone(validRequest) as
      FirstPreviewProviderRequest & Record<string, unknown>;
    requestWithForbiddenExtras.rawCustomerBrief = "RAW_BRIEF_SENTINEL_A70A";
    requestWithForbiddenExtras.customerName = "CUSTOMER_NAME_SENTINEL_A70A";
    requestWithForbiddenExtras.email = "EMAIL_SENTINEL_A70A";
    requestWithForbiddenExtras.phone = "PHONE_SENTINEL_A70A";
    requestWithForbiddenExtras.whatsApp = "WHATSAPP_SENTINEL_A70A";
    requestWithForbiddenExtras.country = "COUNTRY_SENTINEL_A70A";
    requestWithForbiddenExtras.public_reference = "PUBLIC_REF_SENTINEL_A70A";
    requestWithForbiddenExtras.conceptBriefId = "DATABASE_ID_SENTINEL_A70A";
    requestWithForbiddenExtras.adminNote = "ADMIN_NOTE_SENTINEL_A70A";
    requestWithForbiddenExtras.reviewerNote = "REVIEWER_NOTE_SENTINEL_A70A";
    requestWithForbiddenExtras.privateStoragePath = "PRIVATE_PATH_SENTINEL_A70A";
    requestWithForbiddenExtras.referenceImages = ["REFERENCE_IMAGE_SENTINEL_A70A"];
    requestWithForbiddenExtras.environmentValue = "ENV_VALUE_SENTINEL_A70A";
    requestWithForbiddenExtras.apiKey = "API_KEY_SENTINEL_A70A";
    (
      requestWithForbiddenExtras.handSketchInstruction.sheet_style as unknown as Record<
        string,
        unknown
      >
    ).email = "NESTED_EMAIL_SENTINEL_A70A";

    const { client, result } = await runScenario(
      "valid_1024_png",
      requestWithForbiddenExtras,
    );
    const providerRequestText = JSON.stringify(client.lastRequest);

    expect(result.ok).toBe(true);
    expect(providerRequestText).not.toContain("RAW_BRIEF_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("CUSTOMER_NAME_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("EMAIL_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("PHONE_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("WHATSAPP_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("COUNTRY_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("PUBLIC_REF_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("DATABASE_ID_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("ADMIN_NOTE_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("REVIEWER_NOTE_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("PRIVATE_PATH_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("REFERENCE_IMAGE_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("ENV_VALUE_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("API_KEY_SENTINEL_A70A");
    expect(providerRequestText).not.toContain("NESTED_EMAIL_SENTINEL_A70A");
  });

  test("rejects sensitive data placed inside an otherwise allowlisted prompt field", async () => {
    const unsafeRequest = structuredClone(validRequest);
    unsafeRequest.handSketchInstruction.sheet_style.concept_preview_label =
      "contact synthetic-person@example.invalid";
    const { client, result } = await runScenario("valid_1024_png", unsafeRequest);

    expect(result).toEqual({
      ok: false,
      category: "invalid_request",
      retryEligible: false,
    });
    expect(client.callCount).toBe(0);
  });

  test("accepts one canonical 1024-by-1024 PNG and returns only normalized fields", async () => {
    const { client, result } = await runScenario("valid_1024_png");

    expect(result).toMatchObject({
      ok: true,
      mimeType: "image/png",
      width: 1024,
      height: 1024,
      model: OPENAI_FIRST_PREVIEW_MODEL,
      providerRequestId: "req_synthetic_agent70a_001",
    });
    if (!result.ok) {
      throw new Error("Expected deterministic success result.");
    }
    expect(result.byteSize).toBe(
      Buffer.from(result.imageBase64, "base64").length,
    );
    expect(result.byteSize).toBeLessThanOrEqual(
      OPENAI_FIRST_PREVIEW_MAX_IMAGE_BYTES,
    );
    expect(client.externalNetworkRequestCount).toBe(0);
    expect(result).not.toHaveProperty("prompt");
    expect(result).not.toHaveProperty("url");
    expect(result).not.toHaveProperty("rawResponse");
  });

  for (const scenario of [
    "zero_outputs",
    "multiple_outputs",
    "missing_base64",
    "partial_stream_event",
  ] as const) {
    test(`rejects ${scenario} as an invalid provider response`, async () => {
      const { result } = await runScenario(scenario);
      expect(result).toEqual({
        ok: false,
        category: "invalid_provider_response",
        retryEligible: false,
      });
    });
  }

  for (const scenario of ["empty_base64", "malformed_base64"] as const) {
    test(`rejects ${scenario} as invalid base64`, async () => {
      const { result } = await runScenario(scenario);
      expect(result).toEqual({
        ok: false,
        category: "invalid_base64",
        retryEligible: false,
      });
    });
  }

  for (const scenario of ["non_png", "truncated_png"] as const) {
    test(`rejects ${scenario} as an invalid PNG`, async () => {
      const { result } = await runScenario(scenario);
      expect(result).toEqual({
        ok: false,
        category: "invalid_image_format",
        retryEligible: false,
      });
    });
  }

  for (const scenario of ["wrong_width", "wrong_height"] as const) {
    test(`rejects ${scenario} as invalid image dimensions`, async () => {
      const { result } = await runScenario(scenario);
      expect(result).toEqual({
        ok: false,
        category: "invalid_image_dimensions",
        retryEligible: false,
      });
    });
  }

  test("rejects decoded output above the 16 MiB cap", async () => {
    const { result } = await runScenario("oversized_output");
    expect(result).toEqual({
      ok: false,
      category: "image_too_large",
      retryEligible: false,
    });
  });

  const errorCases: ReadonlyArray<
    readonly [
      FakeOpenAiImageClientScenario,
      OpenAiFirstPreviewFailureCategory,
      boolean,
    ]
  > = [
    ["moderation_block", "moderation_blocked", false],
    ["invalid_request", "invalid_request", false],
    ["authentication_failure", "authentication_failed", false],
    ["permission_failure", "permission_denied", false],
    ["rate_limit", "rate_limited", true],
    ["provider_500", "provider_unavailable", true],
    ["provider_502", "provider_unavailable", true],
    ["provider_503", "provider_unavailable", true],
    ["network_failure", "network_failure", true],
    ["timeout", "timeout", false],
    ["cancellation", "cancelled", false],
    ["unknown_exception", "unexpected_provider_error", false],
  ];

  for (const [scenario, category, retryEligible] of errorCases) {
    test(`normalizes ${scenario} without retrying or leaking raw details`, async () => {
      const { client, result } = await runScenario(scenario);
      const serialized = JSON.stringify(result);

      expect(result).toEqual({ ok: false, category, retryEligible });
      expect(client.callCount).toBe(1);
      expect(serialized).not.toContain("synthetic raw provider");
      expect(serialized).not.toContain("request_id");
      expect(serialized).not.toContain("prompt");
      expect(serialized).not.toContain("api_key");
    });
  }

  test("returns configuration_missing without reading or exposing an injected key", async () => {
    const syntheticKey = "synthetic-configuration-presence-only";
    const configured = validateOpenAiApiKeyConfiguration({
      [OPENAI_API_KEY_ENV_NAME]: syntheticKey,
    });
    const missing = validateOpenAiApiKeyConfiguration({});
    const { client, adapter, controller } = createHarness(
      "valid_1024_png",
      missing,
    );
    const result = await adapter.generateFirstPreviewImage(validRequest, {
      signal: controller.signal,
    });

    expect(configured).toEqual({
      status: "configured",
      variableName: "OPENAI_API_KEY",
    });
    expect(JSON.stringify(configured)).not.toContain(syntheticKey);
    expect(result).toEqual({
      ok: false,
      category: "configuration_missing",
      retryEligible: false,
    });
    expect(client.callCount).toBe(0);
  });

  test("does not invoke the client when the owning signal is already cancelled", async () => {
    const { client, adapter, controller } = createHarness("valid_1024_png");
    controller.abort();
    const result = await adapter.generateFirstPreviewImage(validRequest, {
      signal: controller.signal,
    });

    expect(result).toEqual({
      ok: false,
      category: "cancelled",
      retryEligible: false,
    });
    expect(client.callCount).toBe(0);
  });

  test("drops revised prompts, provider URLs, raw metadata, and internal details", async () => {
    const { result } = await runScenario("metadata_leak");
    const serialized = JSON.stringify(result);

    expect(result.ok).toBe(true);
    expect(serialized).not.toContain("revised prompt");
    expect(serialized).not.toContain("provider.invalid");
    expect(serialized).not.toContain("provider_metadata");
    expect(serialized).not.toContain("internal prompt");
    expect(serialized).not.toContain("raw response");
    expect(serialized).not.toContain("OPENAI_API_KEY");
    expect(serialized).not.toContain("NOVORA-CB-");
    expect(serialized).not.toContain(CONCEPT_BRIEF_ID);
  });
});
