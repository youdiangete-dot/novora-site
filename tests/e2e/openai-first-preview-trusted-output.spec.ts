import { createHash } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES,
} from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import type {
  FirstPreviewTrustedOutputEvaluator,
} from "../../lib/server/ai-sketch/first-preview-generation-lifecycle";
import type { FirstPreviewRepository } from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import {
  FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
  FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
  FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
} from "../../lib/server/ai-sketch/first-preview-visual-privacy-contract";
import { createSyntheticFirstPreviewPng } from "../fixtures/ai-sketch/fake-first-preview-storage-client";

const moduleInternals = Module as unknown as {
  _resolveFilename(
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ): string;
};
const serverOnlyTestShim = path.join(
  process.cwd(),
  "node_modules",
  "next",
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

const testRequire = createRequire(
  path.join(
    process.cwd(),
    "tests",
    "e2e",
    "openai-first-preview-trusted-output.spec.ts",
  ),
);
const modules = loadWithServerOnlyTestShim(() => ({
  lifecycle: testRequire(
    "../../lib/server/ai-sketch/first-preview-generation-lifecycle",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-generation-lifecycle"),
  trustedOutput: testRequire(
    "../../lib/server/ai-sketch/openai-first-preview-trusted-output",
  ) as typeof import("../../lib/server/ai-sketch/openai-first-preview-trusted-output"),
}));

const API_KEY = `sk-${"a".repeat(32)}`;
const CONCEPT_BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "223e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "323e4567-e89b-42d3-a456-426614174000";
const VALID_PNG = createSyntheticFirstPreviewPng();

type EvaluatorInput = Parameters<FirstPreviewTrustedOutputEvaluator>[0];

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function evaluatorInput(
  imageBytes: Uint8Array = VALID_PNG,
  overrides: Partial<EvaluatorInput> = {},
): EvaluatorInput {
  return {
    subject: {
      conceptBriefId: CONCEPT_BRIEF_ID,
      jobId: JOB_ID,
      outputId: OUTPUT_ID,
      contentSha256: sha256(imageBytes),
    },
    imageBytes,
    mimeType: "image/png",
    widthPx: 1024,
    heightPx: 1024,
    ...overrides,
  };
}

function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fetchFake(
  implementation: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<Response>,
): typeof fetch {
  return implementation as typeof fetch;
}

function visualInspectionResponse(customerContact = false): Response {
  return response({
    model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
    object: "chat.completion",
    service_tier: "default",
    choices: [{
      index: 0,
      finish_reason: "stop",
      message: {
        role: "assistant",
        refusal: null,
        content: JSON.stringify({
          inspectionComplete: true,
          allVisibleTextDetected: true,
          allVisibleTextReadable: true,
          noVisibleText: !customerContact,
          privacyRisks: {
            customerContact,
            internalPrompt: false,
            reviewerAdminNotes: false,
            credentials: false,
            privatePaths: false,
          },
          visibleText: customerContact ? ["synthetic@example.invalid"] : [],
        }),
      },
    }],
    usage: {
      prompt_tokens: 1200,
      completion_tokens: 100,
      total_tokens: 1300,
      prompt_tokens_details: { cached_tokens: 600 },
    },
  });
}

function evaluatorWithFetch(fetchImplementation: typeof fetch) {
  return modules.trustedOutput.createOpenAiFirstPreviewTrustedOutputEvaluator({
    environment: { OPENAI_API_KEY: API_KEY },
    fetchImplementation,
  });
}

function removePngChunk(imageBytes: Uint8Array, removedType: string): Uint8Array {
  const bytes = Buffer.from(imageBytes);
  const parts: Buffer[] = [bytes.subarray(0, 8)];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type !== removedType) parts.push(bytes.subarray(offset, chunkEnd));
    offset = chunkEnd;
  }
  return new Uint8Array(Buffer.concat(parts));
}

test.describe("OpenAI First Preview trusted-output evaluator", () => {
  test("returns bound v2 evidence after moderation and one durably reserved visual inspection", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    let reservations = 0;
    const evaluator = evaluatorWithFetch(fetchFake(async (input, init) => {
      requests.push({ url: String(input), init });
      return String(input).endsWith("/moderations")
        ? response({ results: [{ flagged: false }] })
        : visualInspectionResponse();
    }));

    await expect(
      evaluator(evaluatorInput(), {
        signal: new AbortController().signal,
        reserveVisualPrivacyInspection: async () => {
          reservations += 1;
          return true;
        },
      }),
    ).resolves.toEqual({
      evidenceVersion:
        modules.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
      subject: {
        conceptBriefId: CONCEPT_BRIEF_ID,
        jobId: JOB_ID,
        outputId: OUTPUT_ID,
        contentSha256: sha256(VALID_PNG),
      },
      results: {
        contentSafetyPassed: true,
        privacyPassed: true,
        outputValidityPassed: true,
      },
      visualPrivacyEvidence: {
        subject: evaluatorInput().subject,
        inspectorVersion: FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
        policyVersion: FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
        model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
        result: "passed",
        usageTrusted: true,
        actualCostMicros: 640,
      },
    });

    expect(reservations).toBe(1);
    expect(requests).toHaveLength(2);
    expect(requests[0].url).toBe("https://api.openai.com/v1/moderations");
    expect(requests[0].init?.method).toBe("POST");
    const body = JSON.parse(String(requests[0].init?.body));
    expect(body).toEqual({
      model: "omni-moderation-latest",
      input: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${Buffer.from(VALID_PNG).toString("base64")}`,
          },
        },
      ],
    });
    const serializedBody = JSON.stringify(body);
    expect(serializedBody).not.toContain(CONCEPT_BRIEF_ID);
    expect(serializedBody).not.toContain(JOB_ID);
    expect(serializedBody).not.toContain(OUTPUT_ID);
    expect(serializedBody).not.toContain("NOVORA-CB-");
    expect(serializedBody).not.toContain("customer");
    expect(requests[1].url).toBe("https://api.openai.com/v1/chat/completions");
    const inspectionBody = JSON.parse(String(requests[1].init?.body));
    expect(inspectionBody.model).toBe(FIRST_PREVIEW_VISUAL_PRIVACY_MODEL);
    expect(inspectionBody.messages[1].content[0].image_url.url).toBe(
      `data:image/png;base64,${Buffer.from(VALID_PNG).toString("base64")}`,
    );
  });

  test("never dispatches visual inspection without a successful durable reservation", async () => {
    for (const reserveVisualPrivacyInspection of [
      undefined,
      async () => false,
      async () => { throw new Error("synthetic reservation failure"); },
    ]) {
      const requests: string[] = [];
      const evaluator = evaluatorWithFetch(fetchFake(async (input) => {
        requests.push(String(input));
        return response({ results: [{ flagged: false }] });
      }));
      await expect(evaluator(evaluatorInput(), {
        signal: new AbortController().signal,
        reserveVisualPrivacyInspection,
      })).rejects.toThrow();
      expect(requests).toEqual(["https://api.openai.com/v1/moderations"]);
    }
  });

  test("preserves moderation success while a visual privacy failure prevents passing evidence", async () => {
    let fetchCalls = 0;
    const evaluator = evaluatorWithFetch(fetchFake(async (input) => {
      fetchCalls += 1;
      return String(input).endsWith("/moderations")
        ? response({ results: [{ flagged: false }] })
        : visualInspectionResponse(true);
    }));
    const evidence = await evaluator(evaluatorInput(), {
      signal: new AbortController().signal,
      reserveVisualPrivacyInspection: async () => true,
    }) as import("../../lib/server/ai-sketch/first-preview-generation-lifecycle").FirstPreviewTrustedOutputEvidence;
    expect(fetchCalls).toBe(2);
    expect(evidence.results).toEqual({
      contentSafetyPassed: true,
      privacyPassed: false,
      outputValidityPassed: true,
    });
    expect(evidence.visualPrivacyEvidence).toEqual({
      subject: evaluatorInput().subject,
      inspectorVersion: FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION,
      policyVersion: FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION,
      model: FIRST_PREVIEW_VISUAL_PRIVACY_MODEL,
      result: "failed",
      usageTrusted: true,
      actualCostMicros: 640,
    });
  });

  test("rejects identity, declared-container, and size mismatches before fetch", async () => {
    let fetchCalls = 0;
    const evaluator = evaluatorWithFetch(fetchFake(async () => {
      fetchCalls += 1;
      return response({ results: [{ flagged: false }] });
    }));
    const signal = new AbortController().signal;
    const oversized = new Uint8Array(FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES + 1);

    for (const input of [
      evaluatorInput(VALID_PNG, {
        subject: {
          conceptBriefId: CONCEPT_BRIEF_ID,
          jobId: JOB_ID,
          outputId: OUTPUT_ID,
          contentSha256: "0".repeat(64),
        },
      }),
      evaluatorInput(new Uint8Array()),
      evaluatorInput(oversized),
      {
        ...evaluatorInput(),
        mimeType: "image/jpeg",
      } as unknown as EvaluatorInput,
      { ...evaluatorInput(), widthPx: 512 } as unknown as EvaluatorInput,
      { ...evaluatorInput(), heightPx: 512 } as unknown as EvaluatorInput,
    ]) {
      await expect(evaluator(input, { signal })).rejects.toThrow();
    }
    expect(fetchCalls).toBe(0);
  });

  test("rejects invalid PNG structure, dimensions, missing IDAT, and malformed terminal bytes before fetch", async () => {
    let fetchCalls = 0;
    const evaluator = evaluatorWithFetch(fetchFake(async () => {
      fetchCalls += 1;
      return response({ results: [{ flagged: false }] });
    }));
    const wrongSignature = new Uint8Array(VALID_PNG);
    wrongSignature[0] ^= 0x01;
    const trailingBytes = new Uint8Array(
      Buffer.concat([Buffer.from(VALID_PNG), Buffer.from([0x00])]),
    );

    for (const imageBytes of [
      wrongSignature,
      createSyntheticFirstPreviewPng(512, 1024),
      createSyntheticFirstPreviewPng(1024, 512),
      removePngChunk(VALID_PNG, "IDAT"),
      trailingBytes,
    ]) {
      await expect(
        evaluator(evaluatorInput(imageBytes), {
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow();
    }
    expect(fetchCalls).toBe(0);
  });

  for (const metadataChunk of ["tEXt", "zTXt", "iTXt", "eXIf"]) {
    test(`rejects privacy-bearing ${metadataChunk} metadata before fetch`, async () => {
      let fetchCalls = 0;
      const evaluator = evaluatorWithFetch(fetchFake(async () => {
        fetchCalls += 1;
        return response({ results: [{ flagged: false }] });
      }));
      const imageBytes = createSyntheticFirstPreviewPng(1024, 1024, [
        { type: metadataChunk, data: "private metadata" },
      ]);

      await expect(
        evaluator(evaluatorInput(imageBytes), {
          signal: new AbortController().signal,
        }),
      ).rejects.toThrow();
      expect(fetchCalls).toBe(0);
    });
  }

  test("fails closed for flagged, missing, multiple, and ambiguous moderation results", async () => {
    for (const moderationValue of [
      { results: [{ flagged: true }] },
      { results: [] },
      { results: [{ flagged: false }, { flagged: false }] },
      { results: [{ flagged: "false" }] },
      {},
    ]) {
      let fetchCalls = 0;
      const evaluator = evaluatorWithFetch(fetchFake(async () => {
        fetchCalls += 1;
        return response(moderationValue);
      }));
      await expect(
        evaluator(evaluatorInput(), { signal: new AbortController().signal }),
      ).rejects.toThrow();
      expect(fetchCalls).toBe(1);
    }
  });

  test("fails closed for malformed and oversized moderation responses", async () => {
    for (const moderationResponse of [
      new Response("not-json", { status: 200 }),
      new Response("x".repeat(64 * 1024 + 1), { status: 200 }),
    ]) {
      const evaluator = evaluatorWithFetch(
        fetchFake(async () => moderationResponse),
      );
      await expect(
        evaluator(evaluatorInput(), { signal: new AbortController().signal }),
      ).rejects.toThrow();
    }
  });

  test("does not retry an HTTP failure", async () => {
    let fetchCalls = 0;
    const evaluator = evaluatorWithFetch(fetchFake(async () => {
      fetchCalls += 1;
      return response({ error: { code: "synthetic_failure" } }, 503);
    }));

    await expect(
      evaluator(evaluatorInput(), { signal: new AbortController().signal }),
    ).rejects.toThrow();
    expect(fetchCalls).toBe(1);
  });

  test("propagates AbortSignal cancellation to the single moderation request", async () => {
    let fetchCalls = 0;
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    const evaluator = evaluatorWithFetch(fetchFake(async (_input, init) => {
      fetchCalls += 1;
      requestStarted();
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new Error("synthetic abort")),
          { once: true },
        );
      });
    }));
    const controller = new AbortController();
    const evaluation = evaluator(evaluatorInput(), { signal: controller.signal });
    await started;
    controller.abort();

    await expect(evaluation).rejects.toThrow();
    expect(fetchCalls).toBe(1);
  });

  test("sequential deadline cancellation reaches the one reserved visual request", async () => {
    const requests: string[] = [];
    let reservations = 0;
    let visualSignal: AbortSignal | undefined;
    let visualStarted!: () => void;
    const started = new Promise<void>((resolve) => { visualStarted = resolve; });
    const evaluator = evaluatorWithFetch(fetchFake(async (input, init) => {
      const url = String(input);
      requests.push(url);
      if (url.endsWith("/moderations")) return response({ results: [{ flagged: false }] });
      visualSignal = init?.signal;
      visualStarted();
      return new Promise<Response>((resolve) => {
        init?.signal?.addEventListener("abort", () => resolve(visualInspectionResponse()), { once: true });
      });
    }));
    const controller = new AbortController();
    const evaluation = evaluator(evaluatorInput(), {
      signal: controller.signal,
      reserveVisualPrivacyInspection: async () => { reservations += 1; return true; },
    });
    await started;
    controller.abort();
    await expect(evaluation).rejects.toThrow();
    expect(reservations).toBe(1);
    expect(requests).toEqual([
      "https://api.openai.com/v1/moderations",
      "https://api.openai.com/v1/chat/completions",
    ]);
    expect(visualSignal?.aborted).toBe(true);
  });

  test("fails closed without a valid server-only API key before fetch", async () => {
    let fetchCalls = 0;
    const evaluator =
      modules.trustedOutput.createOpenAiFirstPreviewTrustedOutputEvaluator({
        environment: { OPENAI_API_KEY: "invalid" },
        fetchImplementation: fetchFake(async () => {
          fetchCalls += 1;
          return response({ results: [{ flagged: false }] });
        }),
      });

    await expect(
      evaluator(evaluatorInput(), { signal: new AbortController().signal }),
    ).rejects.toThrow();
    expect(fetchCalls).toBe(0);
  });

  test("production worker dependencies supply the trusted-output evaluator", () => {
    const dependencies =
      modules.lifecycle.createProductionAutomaticFirstPreviewWorkerDependencies(
        {} as FirstPreviewRepository,
      );
    expect(typeof dependencies.evaluateTrustedOutput).toBe("function");
  });
});
