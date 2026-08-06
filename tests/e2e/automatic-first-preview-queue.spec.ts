import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

import type { FirstPreviewGeneratedAssetStore } from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import type {
  AutomaticFirstPreviewWorkerDependencies,
  FirstPreviewTrustedOutputEvaluator,
} from "../../lib/server/ai-sketch/first-preview-generation-lifecycle";
import type { OpenAiFirstPreviewProviderBinding } from "../../lib/server/ai-sketch/openai-first-preview-client";
import type { OpenAiFirstPreviewAdapterResult } from "../../lib/server/ai-sketch/openai-first-preview-provider";
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
    "automatic-first-preview-queue.spec.ts",
  ),
);
const modules = loadWithServerOnlyTestShim(() => ({
  queue: testRequire(
    "../../lib/server/ai-sketch/first-preview-queue",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-queue"),
  structured: testRequire(
    "../../lib/server/ai-sketch/first-preview-structured-input",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-structured-input"),
  lifecycle: testRequire(
    "../../lib/server/ai-sketch/first-preview-generation-lifecycle",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-generation-lifecycle"),
  trigger: testRequire(
    "../../lib/server/ai-sketch/first-preview-automatic-trigger",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-automatic-trigger"),
  memory: testRequire(
    "../../lib/server/ai-sketch/in-memory-first-preview-repository",
  ) as typeof import("../../lib/server/ai-sketch/in-memory-first-preview-repository"),
}));

const PUBLIC_REFERENCE = "NOVORA-CB-20260806-Q761";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_1_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_2_ID = "323e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const VALID_PNG = createSyntheticFirstPreviewPng();

function validBrief(overrides: Record<string, unknown> = {}) {
  return {
    pieceType: "ring",
    designIntent: "A balanced heirloom ring with a pear center stone.",
    designDescription: "A refined silhouette suitable for daily wear.",
    styleDirection: ["warm heirloom", "clean sculptural"],
    materialDirection: ["warm yellow gold"],
    stones: [
      {
        role: "center",
        type: "lab-grown diamond",
        shape: "pear",
        orientation: "point toward fingertip",
        setting: "five prongs",
      },
    ],
    centerStoneDirection: "Pear point aligned toward the fingertip.",
    stoneArrangement: "Center stone with two smaller shoulder accents.",
    dimensions: ["ring size to confirm"],
    composition: "Low balanced center with tapered shoulders.",
    wearabilityRequirements: ["daily wear"],
    manufacturingConstraints: ["structurally explainable prongs"],
    unknowns: ["exact ring size"],
    avoid: ["hidden halo"],
    requestedViews: ["front view", "side profile", "setting detail"],
    ...overrides,
  };
}

function validMessage() {
  const structured = modules.structured.buildFirstPreviewStructuredGenerationInput({
    payload: validBrief(),
    publicReference: PUBLIC_REFERENCE,
  });
  if (!structured.ok) throw new Error("synthetic structured input failed");
  const message = modules.queue.createFirstPreviewQueueMessage({
    conceptBriefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    generationInput: modules.lifecycle.prepareFirstPreviewGenerationInput(
      structured.value,
    ),
  });
  if (!message.ok) throw new Error("synthetic Queue message failed");
  return message.value;
}

function repository() {
  let tick = 0;
  return new modules.memory.InMemoryFirstPreviewRepository(
    () => `2026-08-06T00:00:${String(tick++).padStart(2, "0")}.000Z`,
  );
}

function successfulBinding(callCounter: { value: number }): OpenAiFirstPreviewProviderBinding {
  return {
    adapter: {
      async generateFirstPreviewImage() {
        callCounter.value += 1;
        return {
          ok: true,
          imageBase64: Buffer.from(VALID_PNG).toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          byteSize: VALID_PNG.byteLength,
          model: "gpt-image-2-2026-04-21",
          providerRequestId: "req_queue_synthetic_001",
        } as OpenAiFirstPreviewAdapterResult;
      },
    },
    readValidatedUsage: () => ({
      textInputTokens: 100,
      imageOutputTokens: 100,
    }),
    readProviderRequestId: () => "req_queue_synthetic_001",
  };
}

function assetStore(counter: { value: number }): FirstPreviewGeneratedAssetStore {
  return {
    kind: "supabase",
    async persistValidatedPng(input) {
      counter.value += 1;
      const createdAt = "2026-08-06T00:01:00.000Z";
      return {
        ok: true,
        value: {
          disposition: "created",
          asset: {
            assetId: [
              "first-preview",
              input.conceptBriefId,
              input.jobId,
              `${input.outputId}.png`,
            ].join("/"),
            assetPersisted: true,
            bucketName: "novora-ai-sketches",
            mimeType: "image/png",
            byteSize: input.imageBytes.byteLength,
            widthPx: 1024,
            heightPx: 1024,
            contentSha256: createHash("sha256")
              .update(input.imageBytes)
              .digest("hex"),
            assetCreatedAt: createdAt,
            assetValidatedAt: createdAt,
          },
        },
      };
    },
    async readAuthorizedPng() {
      return { ok: false, code: "access_denied" };
    },
  };
}

function trustedEvaluator(
  privacyPassed = true,
): FirstPreviewTrustedOutputEvaluator {
  return async (input) => ({
    evidenceVersion:
      modules.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
    subject: { ...input.subject },
    results: {
      contentSafetyPassed: true,
      privacyPassed,
      outputValidityPassed: true,
    },
  });
}

function workerDependencies(
  targetRepository: ReturnType<typeof repository>,
  providerCalls: { value: number },
  storageCalls: { value: number },
  privacyPassed = true,
): AutomaticFirstPreviewWorkerDependencies {
  return {
    repository: targetRepository,
    createProvider: () => successfulBinding(providerCalls),
    createAssetStore: () => assetStore(storageCalls),
    evaluateTrustedOutput: trustedEvaluator(privacyPassed),
    outputIdSource: () => OUTPUT_ID,
  };
}

let originalFetch: typeof globalThis.fetch;

test.beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network access is forbidden in Queue fake tests");
  };
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test.describe("First Preview Queue contract and producer", () => {
  test("publishes exactly one privacy-bounded message with deterministic identity", async () => {
    const published: Array<
      import("../../lib/server/ai-sketch/first-preview-queue").FirstPreviewQueuePublishRequest
    > = [];
    const payload = {
      customerName: "PRIVATE_NAME_SENTINEL",
      customerEmail: "PRIVATE_EMAIL_SENTINEL@example.invalid",
      customerPhone: "PRIVATE_PHONE_SENTINEL",
      whatsapp: "PRIVATE_WHATSAPP_SENTINEL",
      country: "PRIVATE_COUNTRY_SENTINEL",
      contactNote: "PRIVATE_CONTACT_NOTE_SENTINEL",
      cookie: "PRIVATE_COOKIE_SENTINEL",
      headers: "PRIVATE_HEADERS_SENTINEL",
      ipAddress: "PRIVATE_IP_SENTINEL",
      accessProof: "PRIVATE_ACCESS_PROOF_SENTINEL",
      storagePath: "PRIVATE_STORAGE_PATH_SENTINEL",
      signedUrl: "PRIVATE_SIGNED_URL_SENTINEL",
      rawPrompt: "PRIVATE_RAW_PROMPT_SENTINEL",
      adminNotes: "PRIVATE_ADMIN_NOTES_SENTINEL",
      providerResponse: "PRIVATE_PROVIDER_RESPONSE_SENTINEL",
      credential: "PRIVATE_CREDENTIAL_SENTINEL",
      brief: validBrief(),
    };
    const dependencies = {
      featureFlagValue: "true",
      queueExecutionCapabilityValue: "true",
      publisher: {
        async publish(request: (typeof published)[number]) {
          published.push(request);
        },
      },
    };

    expect(
      await modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(
        {
          payload,
          persistenceConfirmed: true,
          customerAccessProofEstablished: true,
          conceptBriefId: BRIEF_ID,
          publicReference: PUBLIC_REFERENCE,
        },
        dependencies,
      ),
    ).toEqual({ status: "enqueued" });
    expect(published).toHaveLength(1);

    const firstKey = published[0].idempotencyKey;
    published.length = 0;
    expect(
      await modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(
        {
          payload: { ...payload },
          persistenceConfirmed: true,
          customerAccessProofEstablished: true,
          conceptBriefId: BRIEF_ID,
          publicReference: PUBLIC_REFERENCE,
        },
        dependencies,
      ),
    ).toEqual({ status: "enqueued" });
    expect(published).toHaveLength(1);
    expect(published[0].idempotencyKey).toBe(firstKey);
    expect(published[0].topic).toBe(
      "novora-first-preview-generation-v1",
    );

    const serialized = JSON.stringify(published[0].message);
    for (const sentinel of [
      "PRIVATE_NAME_SENTINEL",
      "PRIVATE_EMAIL_SENTINEL",
      "PRIVATE_PHONE_SENTINEL",
      "PRIVATE_WHATSAPP_SENTINEL",
      "PRIVATE_COUNTRY_SENTINEL",
      "PRIVATE_CONTACT_NOTE_SENTINEL",
      "PRIVATE_COOKIE_SENTINEL",
      "PRIVATE_HEADERS_SENTINEL",
      "PRIVATE_IP_SENTINEL",
      "PRIVATE_ACCESS_PROOF_SENTINEL",
      "PRIVATE_STORAGE_PATH_SENTINEL",
      "PRIVATE_SIGNED_URL_SENTINEL",
      "PRIVATE_RAW_PROMPT_SENTINEL",
      "PRIVATE_ADMIN_NOTES_SENTINEL",
      "PRIVATE_PROVIDER_RESPONSE_SENTINEL",
      "PRIVATE_CREDENTIAL_SENTINEL",
    ]) {
      expect(serialized).not.toContain(sentinel);
    }
    expect(Object.keys(published[0].message).sort()).toEqual([
      "conceptBriefId",
      "generationInput",
      "publicReference",
      "schemaVersion",
    ]);
  });

  test("strictly rejects malformed, inherited, accessor, class, array, Proxy, and unknown shapes", () => {
    const message = validMessage();
    const plain = JSON.parse(JSON.stringify(message)) as Record<string, unknown>;
    class QueueMessageClass {
      schemaVersion = modules.queue.FIRST_PREVIEW_QUEUE_MESSAGE_SCHEMA_VERSION;
    }
    const inherited = Object.create(plain) as object;
    const accessor = { ...plain } as Record<string, unknown>;
    Object.defineProperty(accessor, "conceptBriefId", {
      enumerable: true,
      get: () => BRIEF_ID,
    });
    const unknownTop = { ...plain, unexpected: true };
    const unknownNested = JSON.parse(JSON.stringify(message)) as {
      generationInput: { designSpec: Record<string, unknown> };
    };
    unknownNested.generationInput.designSpec.unexpected = true;
    const reflectionFailure = new Proxy(
      {},
      {
        ownKeys() {
          throw new Error("synthetic reflection failure");
        },
      },
    );

    for (const candidate of [
      null,
      [],
      new QueueMessageClass(),
      inherited,
      accessor,
      unknownTop,
      unknownNested,
      reflectionFailure,
      { ...plain, schemaVersion: "wrong" },
      { ...plain, conceptBriefId: "wrong" },
      { ...plain, publicReference: "wrong" },
      { ...plain, nonSerializable: BigInt(1) },
    ]) {
      expect(modules.queue.validateFirstPreviewQueueMessage(candidate)).toEqual({
        ok: false,
      });
    }
  });
});

test.describe("First Preview Queue consumer", () => {
  test("valid delivery runs the existing lifecycle and duplicate redelivery cannot charge twice", async () => {
    const targetRepository = repository();
    const providerCalls = { value: 0 };
    const storageCalls = { value: 0 };
    const dependencies = {
      createRepository: () => targetRepository,
      createWorkerDependencies: (target: typeof targetRepository) =>
        workerDependencies(target, providerCalls, storageCalls),
      jobIdSource: () => JOB_1_ID,
    };

    const results = await Promise.all([
      modules.queue.consumeFirstPreviewQueueMessage(validMessage(), dependencies),
      modules.queue.consumeFirstPreviewQueueMessage(validMessage(), dependencies),
    ]);
    expect(results).toContainEqual({
      status: "acknowledged",
      disposition: "completed",
    });
    expect(results).toContainEqual({
      status: "acknowledged",
      disposition: "duplicate",
    });
    expect(providerCalls.value).toBe(1);
    expect(storageCalls.value).toBe(1);
    expect(await targetRepository.findCustomerReadyOutput(BRIEF_ID)).not.toBeNull();

    expect(
      await modules.queue.consumeFirstPreviewQueueMessage(
        validMessage(),
        dependencies,
      ),
    ).toEqual({ status: "acknowledged", disposition: "permanent_failure" });
    expect(providerCalls.value).toBe(1);
  });

  test("invalid messages acknowledge before any external construction", async () => {
    let repositoryConstructions = 0;
    expect(
      await modules.queue.consumeFirstPreviewQueueMessage(
        { schemaVersion: "wrong" },
        {
          createRepository: () => {
            repositoryConstructions += 1;
            throw new Error("must not construct");
          },
        },
      ),
    ).toEqual({ status: "acknowledged", disposition: "invalid_message" });
    expect(repositoryConstructions).toBe(0);
  });

  test("transient fake infrastructure exceptions remain retryable", async () => {
    await expect(
      modules.queue.consumeFirstPreviewQueueMessage(validMessage(), {
        createRepository: () => {
          throw new Error("synthetic transient repository failure");
        },
      }),
    ).rejects.toThrow("synthetic transient repository failure");

    const targetRepository = repository();
    await expect(
      modules.queue.consumeFirstPreviewQueueMessage(validMessage(), {
        createRepository: () => targetRepository,
        reserveAttempt: async () => {
          throw new Error("synthetic transient reservation failure");
        },
      }),
    ).rejects.toThrow("synthetic transient reservation failure");
  });

  test("delivery metadata cannot create attempt three", async () => {
    const targetRepository = repository();
    let reservedAttempt: unknown = null;
    const result = await modules.queue.consumeFirstPreviewQueueMessage(
      validMessage(),
      {
        createRepository: () => targetRepository,
        reserveAttempt: async (input) => {
          reservedAttempt = input.attemptNumber;
          return { ok: false, category: "budget_blocked" } as const;
        },
      },
    );
    expect(result).toEqual({
      status: "acknowledged",
      disposition: "permanent_failure",
    });
    expect(reservedAttempt).toBe(1);

    const withDeliveryCount = {
      ...validMessage(),
      deliveryCount: 999,
    };
    expect(
      await modules.queue.consumeFirstPreviewQueueMessage(withDeliveryCount, {
        createRepository: () => {
          throw new Error("must not construct");
        },
      }),
    ).toEqual({ status: "acknowledged", disposition: "invalid_message" });
    expect(await targetRepository.findJobById(JOB_2_ID)).toBeNull();
  });

  test("terminal automatic-gate failure remains non-ready and never persists an asset", async () => {
    const targetRepository = repository();
    const providerCalls = { value: 0 };
    const storageCalls = { value: 0 };
    const result = await modules.queue.consumeFirstPreviewQueueMessage(
      validMessage(),
      {
        createRepository: () => targetRepository,
        createWorkerDependencies: (target) =>
          workerDependencies(
            target as typeof targetRepository,
            providerCalls,
            storageCalls,
            false,
          ),
        jobIdSource: () => JOB_1_ID,
      },
    );
    expect(result).toEqual({
      status: "acknowledged",
      disposition: "terminal_failure",
    });
    expect(providerCalls.value).toBe(1);
    expect(storageCalls.value).toBe(0);
    expect(await targetRepository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });
});

test("Queue configuration binds the exact private route and preserves build commands", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
    installCommand: string;
    buildCommand: string;
    functions: Record<
      string,
      { experimentalTriggers: Array<{ type: string; topic: string }> }
    >;
  };
  expect(config.installCommand).toBe("npx --yes npm@11.13.0 ci");
  expect(config.buildCommand).toBe("npx --yes npm@11.13.0 run build");
  expect(Object.keys(config.functions)).toEqual([
    "app/api/queues/first-preview-generation/route.ts",
  ]);
  expect(
    config.functions["app/api/queues/first-preview-generation/route.ts"]
      .experimentalTriggers,
  ).toEqual([
    {
      type: "queue/v2beta",
      topic: modules.queue.FIRST_PREVIEW_QUEUE_TOPIC,
    },
  ]);

  const route = readFileSync(
    "app/api/queues/first-preview-generation/route.ts",
    "utf8",
  );
  expect(route).toContain('handleCallback');
  expect(route).toContain('consumeFirstPreviewQueueMessage');
  expect(route).not.toContain("deliveryCount");
});
