import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";

import type { FirstPreviewProviderRequest } from "../../lib/server/ai-sketch/first-preview-runtime";
import { createSyntheticFirstPreviewPng } from "../fixtures/ai-sketch/fake-first-preview-storage-client";

const moduleInternals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const testRequire = createRequire(
  path.join(process.cwd(), "tests", "e2e", "first-preview-japan-gateway.spec.ts"),
);
const nextPackage = testRequire.resolve("next/package.json");
const serverOnlyTestShim = path.join(
  path.dirname(nextPackage),
  "dist",
  "compiled",
  "server-only",
  "empty.js",
);

function loadWithServerOnlyTestShim<T>(load: () => T): T {
  const originalResolveFilename = moduleInternals._resolveFilename;
  moduleInternals._resolveFilename = function resolveTestModule(
    request,
    parent,
    isMain,
    options,
  ) {
    return request === "server-only"
      ? serverOnlyTestShim
      : originalResolveFilename.call(this, request, parent, isMain, options);
  };
  try {
    return load();
  } finally {
    moduleInternals._resolveFilename = originalResolveFilename;
  }
}

const modules = loadWithServerOnlyTestShim(() => ({
  client: testRequire(
    "../../lib/server/ai-sketch/japan-gateway-first-preview-client",
  ) as typeof import("../../lib/server/ai-sketch/japan-gateway-first-preview-client"),
  design: testRequire(
    "../../lib/server/ai-sketch/design-spec",
  ) as typeof import("../../lib/server/ai-sketch/design-spec"),
  instruction: testRequire(
    "../../lib/server/ai-sketch/hand-sketch-instruction",
  ) as typeof import("../../lib/server/ai-sketch/hand-sketch-instruction"),
  runtime: testRequire(
    "../../lib/server/ai-sketch/first-preview-runtime",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-runtime"),
}));

const PUBLIC_REFERENCE = "NOVORA-CB-20260901-G1JP";
const CONCEPT_BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const GATEWAY_REQUEST_ID = "523e4567-e89b-42d3-a456-426614174000";
const GATEWAY_TOKEN = "g1-japan-gateway-test-token-0000000000000000";
const GATEWAY_URL = "https://gateway.example.jp";
const PROVIDER_REQUEST_ID = "req_japan_gateway_openai_001";
const VALID_PNG = createSyntheticFirstPreviewPng();
const VALID_PNG_BASE64 = Buffer.from(VALID_PNG).toString("base64");
const VALID_PNG_SHA256 = createHash("sha256").update(VALID_PNG).digest("hex");

let validRequest: FirstPreviewProviderRequest;

async function captureRuntimeRequest(): Promise<FirstPreviewProviderRequest> {
  const designSpec = modules.design.createMockNovoraDesignSpec({
    publicReference: PUBLIC_REFERENCE,
  });
  const handSketchInstruction =
    modules.instruction.createNovoraHandSketchInstructionFromDesignSpec(designSpec);
  let captured: FirstPreviewProviderRequest | null = null;

  await modules.runtime.orchestrateFirstPreviewGeneration(
    {
      persistenceConfirmed: true,
      conceptBriefId: CONCEPT_BRIEF_ID,
      publicReference: PUBLIC_REFERENCE,
      designSpec,
      handSketchInstruction,
      accessControlEligible: true,
      falseSuccessDetected: false,
    },
    {
      provider: {
        async generateFirstPreview(request) {
          captured = request;
          return { outcome: "provider_failure" };
        },
      },
    },
  );

  if (!captured) throw new Error("Failed to capture the provider request.");
  return captured;
}

function configuredEnvironment(
  overrides: Record<string, string | undefined> = {},
) {
  return {
    [modules.client.JAPAN_GATEWAY_URL_ENV_NAME]: GATEWAY_URL,
    [modules.client.JAPAN_GATEWAY_TOKEN_ENV_NAME]: GATEWAY_TOKEN,
    ...overrides,
  };
}

function successBody(overrides: Record<string, unknown> = {}) {
  return {
    contract_version: modules.client.JAPAN_GATEWAY_CONTRACT_VERSION,
    request_id: GATEWAY_REQUEST_ID,
    status: "success",
    provider: "openai",
    provider_request_id: PROVIDER_REQUEST_ID,
    model: "gpt-image-2-2026-04-21",
    outputs: [
      {
        output_id: `openai_${GATEWAY_REQUEST_ID}`,
        media_type: "image/png",
        encoding: "base64",
        data_base64: VALID_PNG_BASE64,
        sha256: VALID_PNG_SHA256,
        byte_length: VALID_PNG.byteLength,
        width: 1024,
        height: 1024,
      },
    ],
    usage: {
      input_tokens: 100,
      output_tokens: 200,
      total_tokens: 300,
      image_count: 1,
    },
    error: null,
    ...overrides,
  };
}

test.beforeAll(async () => {
  validRequest = await captureRuntimeRequest();
});

test.describe("NOVORA Japan Gateway First Preview provider binding", () => {
  test("fails closed before fetch when the Gateway server configuration is missing or invalid", () => {
    let fetchCount = 0;
    const fakeFetch = (async () => {
      fetchCount += 1;
      throw new Error("Fetch must not run for invalid configuration.");
    }) as typeof fetch;

    expect(
      modules.client.createJapanGatewayFirstPreviewProviderBinding({
        environment: {},
        fetchImplementation: fakeFetch,
      }),
    ).toBeNull();
    expect(
      modules.client.createJapanGatewayFirstPreviewProviderBinding({
        environment: configuredEnvironment({
          [modules.client.JAPAN_GATEWAY_URL_ENV_NAME]: "http://gateway.example.jp",
        }),
        fetchImplementation: fakeFetch,
      }),
    ).toBeNull();
    expect(
      modules.client.createJapanGatewayFirstPreviewProviderBinding({
        environment: configuredEnvironment({
          [modules.client.JAPAN_GATEWAY_TOKEN_ENV_NAME]: "short-token",
        }),
        fetchImplementation: fakeFetch,
      }),
    ).toBeNull();
    expect(fetchCount).toBe(0);
  });

  test("posts the authenticated Gateway Contract v1 request once and normalizes the OpenAI result", async () => {
    let fetchCount = 0;
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
      fetchCount += 1;
      capturedUrl = String(url);
      capturedInit = init;
      return new Response(JSON.stringify(successBody()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;
    const binding = modules.client.createJapanGatewayFirstPreviewProviderBinding({
      environment: configuredEnvironment(),
      fetchImplementation: fakeFetch,
      requestIdSource: () => GATEWAY_REQUEST_ID,
    });
    expect(binding).not.toBeNull();

    const result = await binding!.adapter.generateFirstPreviewImage(validRequest, {
      signal: new AbortController().signal,
    });

    expect(fetchCount).toBe(1);
    expect(capturedUrl).toBe(`${GATEWAY_URL}/v1/first-preview`);
    expect(capturedInit?.method).toBe("POST");
    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${GATEWAY_TOKEN}`);
    expect(headers.get("content-type")).toBe("application/json");

    const bodyText = String(capturedInit?.body);
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "contract_version",
      "design_spec",
      "generation_options",
      "hand_sketch_instruction",
      "reference_assets",
      "request_id",
    ]);
    expect(body.contract_version).toBe("novora_gateway_first_preview_v1");
    expect(body.request_id).toBe(GATEWAY_REQUEST_ID);
    expect(body.reference_assets).toEqual([]);
    expect(body.generation_options).toEqual({
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      background: "opaque",
    });
    expect(bodyText).not.toContain(GATEWAY_TOKEN);
    expect(bodyText).not.toContain(PUBLIC_REFERENCE);
    expect(bodyText).not.toContain(CONCEPT_BRIEF_ID);
    expect(bodyText).not.toContain("OPENAI_API_KEY");
    expect(bodyText).not.toContain('"prompt":');
    expect(bodyText).not.toContain('"model":');
    expect(bodyText).not.toContain("http://");
    expect(bodyText).not.toContain("https://");

    expect(result).toMatchObject({
      ok: true,
      imageBase64: VALID_PNG_BASE64,
      mimeType: "image/png",
      width: 1024,
      height: 1024,
      byteSize: VALID_PNG.byteLength,
      model: "gpt-image-2-2026-04-21",
      providerRequestId: PROVIDER_REQUEST_ID,
    });
    expect(binding!.readValidatedUsage()).toEqual({
      textInputTokens: 100,
      imageOutputTokens: 200,
    });
    expect(binding!.readProviderRequestId()).toBe(PROVIDER_REQUEST_ID);
  });

  test("rejects mock output and response-integrity mismatches", async () => {
    const scenarios = [
      successBody({ provider: "mock", model: "mock-first-preview-v1" }),
      successBody({ model: "unapproved-image-model" }),
      successBody({
        outputs: [
          {
            ...(successBody().outputs as Record<string, unknown>[])[0],
            sha256: "0".repeat(64),
          },
        ],
      }),
      successBody({ request_id: "623e4567-e89b-42d3-a456-426614174000" }),
    ];

    for (const body of scenarios) {
      const binding = modules.client.createJapanGatewayFirstPreviewProviderBinding({
        environment: configuredEnvironment(),
        fetchImplementation: (async () =>
          new Response(JSON.stringify(body), { status: 200 })) as typeof fetch,
        requestIdSource: () => GATEWAY_REQUEST_ID,
      });
      const result = await binding!.adapter.generateFirstPreviewImage(validRequest, {
        signal: new AbortController().signal,
      });
      expect(result).toEqual({
        ok: false,
        category: "invalid_provider_response",
        retryEligible: false,
      });
    }
  });

  test("blocks privacy-sensitive structured text before dispatch", async () => {
    let fetchCount = 0;
    const binding = modules.client.createJapanGatewayFirstPreviewProviderBinding({
      environment: configuredEnvironment(),
      fetchImplementation: (async () => {
        fetchCount += 1;
        return new Response(JSON.stringify(successBody()), { status: 200 });
      }) as typeof fetch,
      requestIdSource: () => GATEWAY_REQUEST_ID,
    });
    const requestWithEmail = {
      ...validRequest,
      designSpec: {
        ...validRequest.designSpec,
        customer_intent_summary: "Contact customer@example.com about this ring.",
      },
    } as FirstPreviewProviderRequest;

    const result = await binding!.adapter.generateFirstPreviewImage(
      requestWithEmail,
      { signal: new AbortController().signal },
    );

    expect(result).toEqual({
      ok: false,
      category: "invalid_request",
      retryEligible: false,
    });
    expect(fetchCount).toBe(0);
  });
});
