import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";

import type {
  AutomaticFirstPreviewWorkerDependencies,
  FirstPreviewGenerationWork,
  FirstPreviewTrustedOutputEvaluator,
} from "../../lib/server/ai-sketch/first-preview-generation-lifecycle";
import type { FirstPreviewGeneratedAssetStore } from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import type { OpenAiFirstPreviewProviderBinding } from "../../lib/server/ai-sketch/openai-first-preview-client";
import type { OpenAiFirstPreviewAdapterResult } from "../../lib/server/ai-sketch/openai-first-preview-provider";
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
    "automatic-first-preview-generation.spec.ts",
  ),
);
const modules = loadWithServerOnlyTestShim(() => ({
  cost: testRequire(
    "../../lib/server/ai-sketch/first-preview-cost-contract",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-cost-contract"),
  client: testRequire(
    "../../lib/server/ai-sketch/openai-first-preview-client",
  ) as typeof import("../../lib/server/ai-sketch/openai-first-preview-client"),
  structured: testRequire(
    "../../lib/server/ai-sketch/first-preview-structured-input",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-structured-input"),
  lifecycle: testRequire(
    "../../lib/server/ai-sketch/first-preview-generation-lifecycle",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-generation-lifecycle"),
  route: testRequire(
    "../../app/api/concept-briefs/route",
  ) as typeof import("../../app/api/concept-briefs/route"),
  trigger: testRequire(
    "../../lib/server/ai-sketch/first-preview-automatic-trigger",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-automatic-trigger"),
  persistence: testRequire(
    "../../lib/server/ai-sketch/first-preview-persistence-contract",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-persistence-contract"),
  memory: testRequire(
    "../../lib/server/ai-sketch/in-memory-first-preview-repository",
  ) as typeof import("../../lib/server/ai-sketch/in-memory-first-preview-repository"),
  executionCapability: testRequire(
    "../../lib/server/ai-sketch/first-preview-post-response-execution-capability",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-post-response-execution-capability"),
}));

const PUBLIC_REFERENCE = "NOVORA-CB-20260803-G2A1";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_1_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_2_ID = "323e4567-e89b-42d3-a456-426614174000";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const VALID_PNG = createSyntheticFirstPreviewPng();
const SIGNING_SECRET =
  "goal2-trusted-evidence-test-signing-secret-000000000000000";

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

function repository() {
  let tick = 0;
  return new modules.memory.InMemoryFirstPreviewRepository(
    () => `2026-08-03T00:00:${String(tick++).padStart(2, "0")}.000Z`,
  );
}

function successfulBinding(options: {
  usage?: { textInputTokens: number; imageOutputTokens: number } | null;
  callCounter?: { value: number };
  providerProofFields?: boolean;
} = {}): OpenAiFirstPreviewProviderBinding {
  return {
    adapter: {
      async generateFirstPreviewImage() {
        if (options.callCounter) options.callCounter.value += 1;
        return {
          ok: true,
          imageBase64: Buffer.from(VALID_PNG).toString("base64"),
          mimeType: "image/png",
          width: 1024,
          height: 1024,
          byteSize: VALID_PNG.byteLength,
          model: "gpt-image-2-2026-04-21",
          providerRequestId: "req_goal2_synthetic_001",
          ...(options.providerProofFields
            ? {
                contentSafetyPassed: true,
                privacyPassed: true,
                outputValidityPassed: true,
              }
            : {}),
        } as OpenAiFirstPreviewAdapterResult;
      },
    },
    readValidatedUsage: () =>
      options.usage === undefined
        ? { textInputTokens: 100, imageOutputTokens: 100 }
        : options.usage,
    readProviderRequestId: () => "req_goal2_synthetic_001",
  };
}

type AttemptSignalObservation = {
  signal: AbortSignal | null;
  listenerAdds: number;
  listenerRemoves: number;
};

function instrumentAttemptSignal(
  binding: OpenAiFirstPreviewProviderBinding,
  observation: AttemptSignalObservation,
): OpenAiFirstPreviewProviderBinding {
  const originalGenerate =
    binding.adapter.generateFirstPreviewImage.bind(binding.adapter);
  binding.adapter.generateFirstPreviewImage = async (request, context) => {
    const signal = context.signal;
    observation.signal = signal;
    const originalAdd = signal.addEventListener.bind(signal);
    const originalRemove = signal.removeEventListener.bind(signal);
    Object.defineProperties(signal, {
      addEventListener: {
        configurable: true,
        value: (...args: Parameters<AbortSignal["addEventListener"]>) => {
          if (args[0] === "abort") observation.listenerAdds += 1;
          return originalAdd(...args);
        },
      },
      removeEventListener: {
        configurable: true,
        value: (...args: Parameters<AbortSignal["removeEventListener"]>) => {
          if (args[0] === "abort") observation.listenerRemoves += 1;
          return originalRemove(...args);
        },
      },
    });
    return originalGenerate(request, context);
  };
  return binding;
}

function failedBinding(
  result: Extract<OpenAiFirstPreviewAdapterResult, { ok: false }>,
): OpenAiFirstPreviewProviderBinding {
  return {
    adapter: { async generateFirstPreviewImage() { return result; } },
    readValidatedUsage: () => ({
      textInputTokens: 100,
      imageOutputTokens: 100,
    }),
    readProviderRequestId: () => "req_goal2_synthetic_failure",
  };
}

function assetStore(counter?: { value: number }): FirstPreviewGeneratedAssetStore {
  return {
    kind: "supabase",
    async persistValidatedPng(input) {
      if (counter) counter.value += 1;
      const createdAt = "2026-08-03T00:01:00.000Z";
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

function passingTrustedOutputEvaluator(
  resultOverrides: Partial<{
    contentSafetyPassed: boolean;
    privacyPassed: boolean;
    outputValidityPassed: boolean;
  }> = {},
  observation?: { signal: AbortSignal | null },
): FirstPreviewTrustedOutputEvaluator {
  return async (input, context) => {
    if (observation) observation.signal = context.signal;
    return {
      evidenceVersion:
        modules.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
      subject: { ...input.subject },
      results: {
        contentSafetyPassed: true,
        privacyPassed: true,
        outputValidityPassed: true,
        ...resultOverrides,
      },
    };
  };
}

async function preparedWork(options: {
  repository?: InstanceType<typeof modules.memory.InMemoryFirstPreviewRepository>;
  jobId?: string;
  attemptNumber?: unknown;
  parentJobId?: string | null;
} = {}) {
  const targetRepository = options.repository ?? repository();
  const result = await modules.lifecycle.reserveAutomaticFirstPreviewAttempt({
    payload: validBrief(),
    persistenceConfirmed: true,
    customerAccessEligible: true,
    conceptBriefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    attemptNumber: options.attemptNumber ?? 1,
    parentJobId: options.parentJobId ?? null,
    repository: targetRepository,
    jobIdSource: () => options.jobId ?? JOB_1_ID,
  });
  if (result.ok === false) {
    throw new Error(`reservation failed: ${result.category}`);
  }
  return { repository: targetRepository, work: result.work };
}

function workerDependencies(
  targetRepository: InstanceType<typeof modules.memory.InMemoryFirstPreviewRepository>,
  binding: OpenAiFirstPreviewProviderBinding,
  store: FirstPreviewGeneratedAssetStore = assetStore(),
  evaluator: FirstPreviewTrustedOutputEvaluator | null =
    passingTrustedOutputEvaluator(),
): AutomaticFirstPreviewWorkerDependencies {
  return {
    repository: targetRepository,
    createProvider: () => binding,
    createAssetStore: () => store,
    ...(evaluator ? { evaluateTrustedOutput: evaluator } : {}),
    outputIdSource: () => OUTPUT_ID,
  };
}

function validSubmissionPayload() {
  return {
    customerName: "Synthetic Customer",
    customerEmail: "synthetic@example.invalid",
    brief: validBrief(),
  };
}

function conceptBriefRequest() {
  return new Request("http://localhost/api/concept-briefs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(validSubmissionPayload()),
  });
}

test.describe("Goal 2 executable cost contract", () => {
  test("locks the approved reservation, lifetime budget, and actual-cost rules", () => {
    expect(modules.cost.FIRST_PREVIEW_PRICING_ASSUMPTION_VERSION).toBe(
      "openai-gpt-image-2-2026-04-21-standard-1024x1024-medium-2026-08-03-v1",
    );
    expect(modules.cost.FIRST_PREVIEW_COST_CONTRACT).toMatchObject({
      estimatedCostMicros: 100_000,
      perAttemptReservationLimitMicros: 100_000,
      lifetimeBudgetPerConceptBriefMicros: 200_000,
      maximumAttempts: 2,
      currency: "USD",
    });
    expect(
      modules.cost.calculateFirstPreviewActualCostMicros({
        textInputTokens: 100,
        imageOutputTokens: 100,
      }),
    ).toBe(3_500);
    expect(
      modules.cost.reconcileFirstPreviewActualCost({
        dispatched: true,
        usage: null,
      }),
    ).toEqual({ actualCostMicros: 100_000, usageTrusted: false });
    expect(
      modules.cost.reconcileFirstPreviewActualCost({
        dispatched: false,
        usage: { textInputTokens: 99_999, imageOutputTokens: 99_999 },
      }),
    ).toEqual({ actualCostMicros: 0, usageTrusted: false });
    expect(
      modules.cost.evaluateFirstPreviewAttemptBudget({
        attemptNumber: 2,
        parentActualCostMicros: 100_001,
      }).allowed,
    ).toBe(false);
    expect(
      modules.cost.evaluateFirstPreviewAttemptBudget({
        attemptNumber: 3,
        parentActualCostMicros: 0,
      }).allowed,
    ).toBe(false);
  });

  test("strictly validates usage and never accepts image input accounting", () => {
    expect(
      modules.client.readValidatedOpenAiFirstPreviewUsage({
        usage: {
          input_tokens: 25,
          output_tokens: 75,
          total_tokens: 100,
          input_tokens_details: { text_tokens: 25, image_tokens: 0 },
        },
      }),
    ).toEqual({ textInputTokens: 25, imageOutputTokens: 75 });
    for (const usage of [
      null,
      {},
      {
        input_tokens: 25,
        output_tokens: 75,
        total_tokens: 100,
        input_tokens_details: { text_tokens: 25, image_tokens: 1 },
      },
      {
        input_tokens: 25,
        output_tokens: 75,
        total_tokens: 99,
        input_tokens_details: { text_tokens: 25, image_tokens: 0 },
      },
    ]) {
      expect(
        modules.client.readValidatedOpenAiFirstPreviewUsage({ usage }),
      ).toBeNull();
    }
  });
});

test.describe("Goal 2 structured input and native Provider client", () => {
  test("builds consistent reference-bound structures and strips non-allowlisted PII", () => {
    const result = modules.structured.buildFirstPreviewStructuredGenerationInput({
      payload: {
        brief: validBrief(),
        customerEmail: "private@example.invalid",
        contact: { customerName: "Private Customer", phone: "+1 555 0100" },
        adminNote: "never forward",
      },
      publicReference: PUBLIC_REFERENCE,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.designSpec.public_reference).toBe(PUBLIC_REFERENCE);
    expect(result.value.handSketchInstruction.public_reference).toBe(
      PUBLIC_REFERENCE,
    );
    expect(result.value.handSketchInstruction.design_spec_version).toBe(
      result.value.designSpec.spec_version,
    );
    const serialized = JSON.stringify(result.value);
    expect(serialized).not.toContain("private@example.invalid");
    expect(serialized).not.toContain("Private Customer");
    expect(serialized).not.toContain("never forward");
  });

  test("fails closed for invalid, unsafe, oversized, and contradictory input", () => {
    for (const payload of [
      validBrief({ pieceType: "watch" }),
      validBrief({ designIntent: "Contact private@example.invalid" }),
      validBrief({ designIntent: "x".repeat(20_001) }),
      validBrief({ pieceType: "ring and necklace" }),
    ]) {
      expect(
        modules.structured.buildFirstPreviewStructuredGenerationInput({
          payload,
          publicReference: PUBLIC_REFERENCE,
        }).ok,
      ).toBe(false);
    }
  });

  test("uses one exact native Image API request and exposes only validated usage", async () => {
    const structured = modules.structured.buildFirstPreviewStructuredGenerationInput({
      payload: validBrief(),
      publicReference: PUBLIC_REFERENCE,
    });
    expect(structured.ok).toBe(true);
    if (!structured.ok) return;

    let calls = 0;
    let capturedBody: Record<string, unknown> | null = null;
    let capturedAuthorization: string | null = null;
    const binding = modules.client.createOpenAiFirstPreviewProviderBinding({
      environment: { OPENAI_API_KEY: `sk-${"a".repeat(32)}` },
      fetchImplementation: async (_url, init) => {
        calls += 1;
        capturedBody = JSON.parse(String(init?.body));
        capturedAuthorization = new Headers(init?.headers).get("authorization");
        return new Response(
          JSON.stringify({
            data: [{ b64_json: Buffer.from(VALID_PNG).toString("base64") }],
            usage: {
              input_tokens: 20,
              output_tokens: 80,
              total_tokens: 100,
              input_tokens_details: { text_tokens: 20, image_tokens: 0 },
            },
          }),
          {
            status: 200,
            headers: { "x-request-id": "req_native_goal2_001" },
          },
        );
      },
    });
    expect(binding).not.toBeNull();
    const request: FirstPreviewProviderRequest = {
      contractVersion: "novora_first_preview_provider_v1",
      purpose: "first_preview",
      imageCount: 1,
      designSpec: structured.value.designSpec,
      handSketchInstruction: structured.value.handSketchInstruction,
    };
    const result = await binding!.adapter.generateFirstPreviewImage(request, {
      signal: new AbortController().signal,
    });
    expect(result.ok).toBe(true);
    expect(calls).toBe(1);
    expect(capturedBody).toMatchObject({
      model: "gpt-image-2-2026-04-21",
      n: 1,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      moderation: "auto",
    });
    expect(Object.keys(capturedBody!).sort()).toEqual([
      "model",
      "moderation",
      "n",
      "output_format",
      "prompt",
      "quality",
      "size",
    ]);
    expect(capturedBody!.prompt).not.toBe(validBrief().designIntent);
    expect(typeof capturedBody!.prompt).toBe("string");
    expect(String(capturedBody!.prompt)).toContain(
      "validated, privacy-minimized Hand Sketch Instruction JSON",
    );
    expect(capturedAuthorization).toBe(`Bearer sk-${"a".repeat(32)}`);
    expect(binding!.readValidatedUsage()).toEqual({
      textInputTokens: 20,
      imageOutputTokens: 80,
    });
    expect(binding!.readProviderRequestId()).toBe("req_native_goal2_001");
    expect(JSON.stringify(result)).not.toContain("sk-");
    expect(JSON.stringify(result)).not.toContain("prompt");
    expect(
      modules.client.createOpenAiFirstPreviewProviderBinding({
        environment: { OPENAI_API_KEY: " malformed " },
      }),
    ).toBeNull();
  });
});

test.describe("Goal 2 idempotent trigger and lifecycle", () => {
  test("only exact flag plus confirmed proof reserves and schedules", async () => {
    for (const featureFlagValue of [
      undefined,
      "",
      "TRUE",
      " true",
      "true ",
      1,
      true,
    ]) {
      let repositoryConstructions = 0;
      const result = await modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(
        {
          payload: validBrief(),
          persistenceConfirmed: true,
          customerAccessProofEstablished: true,
          conceptBriefId: BRIEF_ID,
          publicReference: PUBLIC_REFERENCE,
        },
        {
          featureFlagValue,
          executionCapabilityValue: "true",
          createRepository: () => {
            repositoryConstructions += 1;
            return repository();
          },
        },
      );
      expect(result).toEqual({ status: "disabled" });
      expect(repositoryConstructions).toBe(0);
    }

    const targetRepository = repository();
    const scheduledTasks: Array<() => void | Promise<void>> = [];
    const result = await modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(
      {
        payload: validBrief(),
        persistenceConfirmed: true,
        customerAccessProofEstablished: true,
        conceptBriefId: BRIEF_ID,
        publicReference: PUBLIC_REFERENCE,
      },
      {
        featureFlagValue: "true",
        executionCapabilityValue: "true",
        createRepository: () => targetRepository,
        createWorkerDependencies: (repo) =>
          workerDependencies(repo as typeof targetRepository, successfulBinding()),
        schedule: (task) => { scheduledTasks.push(task); },
        jobIdSource: () => JOB_1_ID,
      },
    );
    expect(result).toEqual({ status: "scheduled" });
    expect(scheduledTasks).toHaveLength(1);
    expect(await targetRepository.findJobById(JOB_1_ID)).toBeNull();
    await scheduledTasks[0]();
    expect((await targetRepository.findJobById(JOB_1_ID))?.status).toBe("succeeded");
  });

  test("requires the exact independent post-response execution capability", async () => {
    expect(
      modules.executionCapability.FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED_ENV,
    ).toBe("NOVORA_FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED");
    for (const executionCapabilityValue of [
      undefined,
      "",
      "TRUE",
      " true",
      "true ",
      1,
      true,
      {},
    ]) {
      let repositoryConstructions = 0;
      let schedules = 0;
      const result = modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(
        {
          payload: validBrief(),
          persistenceConfirmed: true,
          customerAccessProofEstablished: true,
          conceptBriefId: BRIEF_ID,
          publicReference: PUBLIC_REFERENCE,
        },
        {
          featureFlagValue: "true",
          executionCapabilityValue,
          createRepository: () => {
            repositoryConstructions += 1;
            return repository();
          },
          schedule: () => { schedules += 1; },
        },
      );
      expect(result).toEqual({ status: "disabled" });
      expect(repositoryConstructions).toBe(0);
      expect(schedules).toBe(0);
    }
    expect(
      modules.executionCapability.isFirstPreviewPostResponseExecutionConfirmed(
        "true",
      ),
    ).toBe(true);
  });

  test("proof failure and scheduler failure never construct or dispatch a Provider", async () => {
    let providerConstructions = 0;
    let repositoryConstructions = 0;
    for (const preconditions of [
      {
        persistenceConfirmed: false,
        customerAccessProofEstablished: true,
      },
      {
        persistenceConfirmed: true,
        customerAccessProofEstablished: false,
      },
    ]) {
      const denied = await modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(
        {
          payload: validBrief(),
          ...preconditions,
          conceptBriefId: BRIEF_ID,
          publicReference: PUBLIC_REFERENCE,
        },
        {
          featureFlagValue: "true",
          executionCapabilityValue: "true",
          createRepository: () => {
            repositoryConstructions += 1;
            return repository();
          },
        },
      );
      expect(denied).toEqual({ status: "not_scheduled" });
    }
    expect(repositoryConstructions).toBe(0);

    const targetRepository = repository();
    const failed = await modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(
      {
        payload: validBrief(),
        persistenceConfirmed: true,
        customerAccessProofEstablished: true,
        conceptBriefId: BRIEF_ID,
        publicReference: PUBLIC_REFERENCE,
      },
      {
        featureFlagValue: "true",
        executionCapabilityValue: "true",
        createRepository: () => targetRepository,
        createWorkerDependencies: (repo) => ({
          ...workerDependencies(repo as typeof targetRepository, successfulBinding()),
          createProvider: () => {
            providerConstructions += 1;
            return successfulBinding();
          },
        }),
        schedule: () => { throw new Error("synthetic scheduler failure"); },
        jobIdSource: () => JOB_1_ID,
      },
    );
    expect(failed).toEqual({ status: "not_scheduled" });
    expect(providerConstructions).toBe(0);
    expect(await targetRepository.findJobById(JOB_1_ID)).toBeNull();
  });

  test("claims Provider dispatch once with the conservative reservation", async () => {
    const prepared = await preparedWork();
    expect(await prepared.repository.startJob(JOB_1_ID)).toMatchObject({
      ok: true,
      value: { status: "processing", actualCostMicros: null },
    });
    const claims = await Promise.all([
      prepared.repository.recordProviderDispatch(JOB_1_ID),
      prepared.repository.recordProviderDispatch(JOB_1_ID),
    ]);
    expect(claims.filter((claim) => claim.ok)).toHaveLength(1);
    expect(claims).toContainEqual({ ok: false, code: "idempotency_conflict" });
    expect(await prepared.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "processing",
      actualCostMicros: 100_000,
    });
  });

  test("durably claims dispatch before invoking the Provider adapter", async () => {
    const prepared = await preparedWork();
    const events: string[] = [];
    const originalClaim =
      prepared.repository.recordProviderDispatch.bind(prepared.repository);
    prepared.repository.recordProviderDispatch = async (jobId) => {
      events.push("dispatch_claim");
      return originalClaim(jobId);
    };
    const binding = successfulBinding();
    const originalGenerate = binding.adapter.generateFirstPreviewImage.bind(
      binding.adapter,
    );
    binding.adapter.generateFirstPreviewImage = async (...args) => {
      events.push("provider_invocation");
      return originalGenerate(...args);
    };

    expect(
      await modules.lifecycle.runAutomaticFirstPreviewWorker(
        prepared.work,
        workerDependencies(prepared.repository, binding),
      ),
    ).toMatchObject({ status: "ready" });
    expect(events).toEqual(["dispatch_claim", "provider_invocation"]);
  });

  test("duplicate workers dispatch once and only the complete lifecycle becomes ready", async () => {
    const prepared = await preparedWork();
    const calls = { value: 0 };
    const stores = { value: 0 };
    const dependencies = workerDependencies(
      prepared.repository,
      successfulBinding({ callCounter: calls }),
      assetStore(stores),
    );
    const results = await Promise.all([
      modules.lifecycle.runAutomaticFirstPreviewWorker(prepared.work, dependencies),
      modules.lifecycle.runAutomaticFirstPreviewWorker(prepared.work, dependencies),
    ]);
    expect(results.map((result) => result.status).sort()).toEqual([
      "duplicate",
      "ready",
    ]);
    expect(calls.value).toBe(1);
    expect(stores.value).toBe(1);
    expect(JSON.stringify(results)).not.toMatch(
      /423e4567|first-preview\/|req_goal2|prompt|provider/i,
    );
    expect(await prepared.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "succeeded",
      actualCostMicros: 3_500,
      pricingAssumptionVersion:
        "openai-gpt-image-2-2026-04-21-standard-1024x1024-medium-2026-08-03-v1",
    });
    expect(
      await prepared.repository.findCustomerReadyOutput(BRIEF_ID),
    ).toMatchObject({
      readinessStatus: "first_preview_ready",
      isCurrentCustomerPreview: true,
    });
  });

  test("structurally valid Provider PNG and Provider booleans cannot replace trusted evidence", async () => {
    const prepared = await preparedWork();
    const stores = { value: 0 };
    const result = await modules.lifecycle.runAutomaticFirstPreviewWorker(
      prepared.work,
      workerDependencies(
        prepared.repository,
        successfulBinding({ providerProofFields: true }),
        assetStore(stores),
        null,
      ),
    );

    expect(result).toEqual({
      status: "failed",
      failureCategory: "lifecycle_conflict",
    });
    expect(stores.value).toBe(0);
    expect(await prepared.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "failed",
      failureCategory: "lifecycle_conflict",
      retryEligible: false,
    });
    expect(await prepared.repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("requires every trusted result to be explicitly true before readiness", async () => {
    const failures = [
      {
        overrides: { contentSafetyPassed: false },
        category: "unsafe_output",
      },
      {
        overrides: { privacyPassed: false },
        category: "privacy_failure",
      },
      {
        overrides: { outputValidityPassed: false },
        category: "unsafe_output",
      },
    ] as const;

    for (const failure of failures) {
      const prepared = await preparedWork();
      const result = await modules.lifecycle.runAutomaticFirstPreviewWorker(
        prepared.work,
        workerDependencies(
          prepared.repository,
          successfulBinding(),
          assetStore(),
          passingTrustedOutputEvaluator(failure.overrides),
        ),
      );
      expect(result).toEqual({
        status: "failed",
        failureCategory: failure.category,
      });
      expect(
        await prepared.repository.findCustomerReadyOutput(BRIEF_ID),
      ).toBeNull();
    }

    const passing = await preparedWork();
    const successfulEvaluation = { signal: null as AbortSignal | null };
    const passingDependencies = workerDependencies(
      passing.repository,
      successfulBinding(),
      assetStore(),
      passingTrustedOutputEvaluator({}, successfulEvaluation),
    );
    expect(
      await modules.lifecycle.runAutomaticFirstPreviewWorker(
        passing.work,
        {
          ...passingDependencies,
          trustedOutputEvidenceTimeoutMs: 5,
        },
      ),
    ).toEqual({ status: "ready" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(successfulEvaluation.signal?.aborted).toBe(false);
    expect(
      await passing.repository.findCustomerReadyOutput(BRIEF_ID),
    ).toMatchObject({
      id: OUTPUT_ID,
      jobId: JOB_1_ID,
      readinessStatus: "first_preview_ready",
      isCurrentCustomerPreview: true,
    });
  });

  test("rejects trusted evidence bound to another job, output, or validated digest", async () => {
    const mismatches = [
      { jobId: JOB_2_ID },
      { outputId: "523e4567-e89b-42d3-a456-426614174000" },
      { contentSha256: "0".repeat(64) },
    ];

    for (const mismatch of mismatches) {
      const prepared = await preparedWork();
      const evaluator: FirstPreviewTrustedOutputEvaluator = async (input) => ({
        evidenceVersion:
          modules.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
        subject: { ...input.subject, ...mismatch },
        results: {
          contentSafetyPassed: true,
          privacyPassed: true,
          outputValidityPassed: true,
        },
      });
      expect(
        await modules.lifecycle.runAutomaticFirstPreviewWorker(
          prepared.work,
          workerDependencies(
            prepared.repository,
            successfulBinding(),
            assetStore(),
            evaluator,
          ),
        ),
      ).toEqual({
        status: "failed",
        failureCategory: "lifecycle_conflict",
      });
      expect(
        await prepared.repository.findCustomerReadyOutput(BRIEF_ID),
      ).toBeNull();
    }
  });

  test("rejects missing and malformed trusted evidence", async () => {
    const malformedEvidence: unknown[] = [
      null,
      {},
      {
        evidenceVersion:
          modules.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
        subject: {
          conceptBriefId: BRIEF_ID,
          jobId: JOB_1_ID,
          outputId: OUTPUT_ID,
          contentSha256: "0".repeat(64),
        },
        results: {
          contentSafetyPassed: true,
          privacyPassed: true,
        },
      },
      {
        evidenceVersion:
          modules.lifecycle.FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
        subject: {
          conceptBriefId: BRIEF_ID,
          jobId: JOB_1_ID,
          outputId: OUTPUT_ID,
          contentSha256: "0".repeat(64),
        },
        results: {
          contentSafetyPassed: "true",
          privacyPassed: true,
          outputValidityPassed: true,
        },
      },
    ];

    for (const evidence of malformedEvidence) {
      const prepared = await preparedWork();
      expect(
        await modules.lifecycle.runAutomaticFirstPreviewWorker(
          prepared.work,
          workerDependencies(
            prepared.repository,
            successfulBinding(),
            assetStore(),
            async () => evidence,
          ),
        ),
      ).toEqual({
        status: "failed",
        failureCategory: "lifecycle_conflict",
      });
      expect(
        await prepared.repository.findCustomerReadyOutput(BRIEF_ID),
      ).toBeNull();
    }
  });

  test("evaluator exception and local timeout fail closed with truthful terminal timing", async () => {
    const thrown = await preparedWork();
    expect(
      await modules.lifecycle.runAutomaticFirstPreviewWorker(
        thrown.work,
        workerDependencies(
          thrown.repository,
          successfulBinding(),
          assetStore(),
          async () => {
            throw new Error("synthetic evaluator detail must stay private");
          },
        ),
      ),
    ).toEqual({
      status: "failed",
      failureCategory: "lifecycle_conflict",
    });
    expect(await thrown.repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();

    const timedOut = await preparedWork();
    const stores = { value: 0 };
    const attemptSignal: AttemptSignalObservation = {
      signal: null,
      listenerAdds: 0,
      listenerRemoves: 0,
    };
    let evaluatorAbortCount = 0;
    let evaluatorSettled = false;
    let evaluatorSignal: AbortSignal | null = null;
    const timeoutDependencies = workerDependencies(
      timedOut.repository,
      instrumentAttemptSignal(successfulBinding(), attemptSignal),
      assetStore(stores),
      async (_input, context) =>
        new Promise<unknown>((_resolve, reject) => {
          evaluatorSignal = context.signal;
          context.signal.addEventListener(
            "abort",
            () => {
              evaluatorAbortCount += 1;
              evaluatorSettled = true;
              reject(new Error("synthetic local evidence timeout"));
            },
            { once: true },
          );
        }),
    );
    expect(
      await modules.lifecycle.runAutomaticFirstPreviewWorker(timedOut.work, {
        ...timeoutDependencies,
        trustedOutputEvidenceTimeoutMs: 1,
        attemptTimeoutMs: 20,
      }),
    ).toEqual({ status: "failed", failureCategory: "lifecycle_conflict" });
    const timedOutJob = await timedOut.repository.findJobById(JOB_1_ID);
    expect(timedOutJob).toMatchObject({
      status: "failed",
      failureCategory: "lifecycle_conflict",
      retryEligible: false,
      timedOutAt: null,
    });
    expect(evaluatorSignal?.aborted).toBe(true);
    expect(evaluatorAbortCount).toBe(1);
    expect(evaluatorSettled).toBe(true);
    expect(attemptSignal.listenerAdds).toBe(1);
    expect(attemptSignal.listenerRemoves).toBe(1);
    expect(stores.value).toBe(0);
    expect(timedOutJob?.failedAt).not.toBeNull();
    expect(timedOutJob?.deadlineAt).not.toBeNull();
    expect(
      Date.parse(timedOutJob?.deadlineAt ?? "") -
        Date.parse(timedOutJob?.startedAt ?? ""),
    ).toBe(150_000);
    expect(Date.parse(timedOutJob?.failedAt ?? "")).toBeLessThan(
      Date.parse(timedOutJob?.deadlineAt ?? ""),
    );
    expect(
      await timedOut.repository.findCustomerReadyOutput(BRIEF_ID),
    ).toBeNull();
  });

  test("outer attempt timeout aborts trusted evaluation once and leaves no ready output", async () => {
    let clockNow = "2026-08-03T00:00:00.000Z";
    const targetRepository = new modules.memory.InMemoryFirstPreviewRepository(
      () => clockNow,
    );
    const prepared = await preparedWork({ repository: targetRepository });
    const calls = { value: 0 };
    const stores = { value: 0 };
    const attemptSignal: AttemptSignalObservation = {
      signal: null,
      listenerAdds: 0,
      listenerRemoves: 0,
    };
    let evaluatorCallCount = 0;
    let evaluatorAbortCount = 0;
    let evaluatorSettled = false;
    let evaluatorSignal: AbortSignal | null = null;
    const evaluator: FirstPreviewTrustedOutputEvaluator = async (
      _input,
      context,
    ) => {
      evaluatorCallCount += 1;
      evaluatorSignal = context.signal;
      return new Promise<unknown>((_resolve, reject) => {
        context.signal.addEventListener(
          "abort",
          () => {
            evaluatorAbortCount += 1;
            evaluatorSettled = true;
            clockNow = "2026-08-03T00:02:30.000Z";
            reject(new Error("synthetic outer attempt timeout"));
          },
          { once: true },
        );
      });
    };
    const dependencies = workerDependencies(
      targetRepository,
      instrumentAttemptSignal(
        successfulBinding({ callCounter: calls }),
        attemptSignal,
      ),
      assetStore(stores),
      evaluator,
    );

    expect(
      await modules.lifecycle.runAutomaticFirstPreviewWorker(prepared.work, {
        ...dependencies,
        attemptTimeoutMs: 5,
        trustedOutputEvidenceTimeoutMs: 50,
      }),
    ).toEqual({ status: "failed", failureCategory: "timeout" });
    expect(evaluatorCallCount).toBe(1);
    expect(evaluatorAbortCount).toBe(1);
    expect(evaluatorSettled).toBe(true);
    expect(evaluatorSignal?.aborted).toBe(true);
    expect(attemptSignal.signal?.aborted).toBe(true);
    expect(attemptSignal.listenerAdds).toBe(1);
    expect(attemptSignal.listenerRemoves).toBe(1);
    expect(calls.value).toBe(1);
    expect(stores.value).toBe(0);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(evaluatorAbortCount).toBe(1);
    expect(await targetRepository.findJobById(JOB_1_ID)).toMatchObject({
      status: "timed_out",
      failureCategory: "timeout",
      retryEligible: false,
      timedOutAt: "2026-08-03T00:02:30.000Z",
      deadlineAt: "2026-08-03T00:02:30.000Z",
    });
    expect(await targetRepository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("preserves the confirmed Concept Brief response when evaluation fails closed", async () => {
    const scheduledTasks: Array<() => void | Promise<void>> = [];
    const targetRepository = repository();
    const post = modules.route.createConceptBriefPostHandler({
      checkRateLimit: () =>
        Promise.resolve({
          allowed: true,
          mode: "disabled" as const,
          reason: "synthetic_test",
        }),
      persistSubmission: () =>
        Promise.resolve({
          persisted: true as const,
          publicReference: PUBLIC_REFERENCE,
          conceptBriefId: BRIEF_ID,
        }),
      sessionDependencies: {
        featureFlagValue: "true",
        signingSecret: SIGNING_SECRET,
        clock: () => 1_785_715_200,
        nonceSource: () => "trusted_evidence_route_nonce_abcdefghijkl",
      },
      triggerDependencies: {
        featureFlagValue: "true",
        executionCapabilityValue: "true",
        createRepository: () => targetRepository,
        createWorkerDependencies: (target) =>
          workerDependencies(
            target as typeof targetRepository,
            successfulBinding(),
            assetStore(),
            null,
          ),
        schedule: (task) => {
          scheduledTasks.push(task);
        },
        jobIdSource: () => JOB_1_ID,
      },
    });

    const response = await post(conceptBriefRequest());
    const confirmedBody = await response.json();
    expect(response.status).toBe(201);
    expect(confirmedBody).toMatchObject({
      ok: true,
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
    expect(scheduledTasks).toHaveLength(1);

    await scheduledTasks[0]();
    expect(confirmedBody).toMatchObject({
      ok: true,
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
    expect(await targetRepository.findJobById(JOB_1_ID)).toMatchObject({
      status: "failed",
      failureCategory: "lifecycle_conflict",
    });
    expect(
      await targetRepository.findCustomerReadyOutput(BRIEF_ID),
    ).toBeNull();
  });

  test("missing configuration and trustworthy cost overrun fail before Storage and readiness", async () => {
    const missing = await preparedWork();
    let missingStoreConstructions = 0;
    expect(
      await modules.lifecycle.runAutomaticFirstPreviewWorker(missing.work, {
        repository: missing.repository,
        createProvider: () => null,
        createAssetStore: () => {
          missingStoreConstructions += 1;
          return assetStore();
        },
      }),
    ).toEqual({ status: "failed", failureCategory: "configuration_missing" });
    expect(missingStoreConstructions).toBe(0);
    expect(await missing.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "failed",
      actualCostMicros: 0,
      retryEligible: false,
    });

    const overrun = await preparedWork();
    const stores = { value: 0 };
    const result = await modules.lifecycle.runAutomaticFirstPreviewWorker(
      overrun.work,
      workerDependencies(
        overrun.repository,
        successfulBinding({
          usage: { textInputTokens: 20_001, imageOutputTokens: 0 },
        }),
        assetStore(stores),
      ),
    );
    expect(result).toEqual({ status: "failed", failureCategory: "budget_blocked" });
    expect(stores.value).toBe(0);
    expect(await overrun.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "failed",
      failureCategory: "budget_blocked",
      actualCostMicros: 100_005,
      retryEligible: false,
    });
    expect(await overrun.repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();
  });

  test("Provider success cannot bypass private Storage persistence", async () => {
    const prepared = await preparedWork();
    const result = await modules.lifecycle.runAutomaticFirstPreviewWorker(
      prepared.work,
      workerDependencies(prepared.repository, successfulBinding(), {
        kind: "unavailable",
        async persistValidatedPng() {
          return { ok: false, code: "storage_unavailable" };
        },
        async readAuthorizedPng() {
          return { ok: false, code: "storage_unavailable" };
        },
      }),
    );
    expect(result).toEqual({
      status: "failed",
      failureCategory: "storage_failure",
    });
    expect(await prepared.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "failed",
      failureCategory: "storage_failure",
      retryEligible: false,
    });
    expect(await prepared.repository.findCustomerReadyOutput(BRIEF_ID)).toBeNull();

    const thrown = await preparedWork();
    const thrownResult = await modules.lifecycle.runAutomaticFirstPreviewWorker(
      thrown.work,
      workerDependencies(thrown.repository, successfulBinding(), {
        kind: "unavailable",
        async persistValidatedPng() {
          throw new Error("synthetic Storage detail must stay private");
        },
        async readAuthorizedPng() {
          return { ok: false, code: "storage_unavailable" };
        },
      }),
    );
    expect(thrownResult).toEqual({
      status: "failed",
      failureCategory: "storage_failure",
    });
    expect(await thrown.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "failed",
      failureCategory: "storage_failure",
      actualCostMicros: 3_500,
    });
  });

  test("allows one valid budgeted retry and rejects attempt 3", async () => {
    const first = await preparedWork();
    const firstResult = await modules.lifecycle.runAutomaticFirstPreviewWorker(
      first.work,
      workerDependencies(
        first.repository,
        failedBinding({
          ok: false,
          category: "rate_limited",
          retryEligible: true,
        }),
      ),
    );
    expect(firstResult).toEqual({
      status: "failed",
      failureCategory: "rate_limited",
    });
    expect(await first.repository.findJobById(JOB_1_ID)).toMatchObject({
      status: "failed",
      retryEligible: true,
      actualCostMicros: 3_500,
    });

    const second = await modules.lifecycle.reserveAutomaticFirstPreviewAttempt({
      payload: validBrief(),
      persistenceConfirmed: true,
      customerAccessEligible: true,
      conceptBriefId: BRIEF_ID,
      publicReference: PUBLIC_REFERENCE,
      attemptNumber: 2,
      parentJobId: JOB_1_ID,
      repository: first.repository,
      jobIdSource: () => JOB_2_ID,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(
      await modules.lifecycle.runAutomaticFirstPreviewWorker(
        second.work,
        workerDependencies(first.repository, successfulBinding()),
      ),
    ).toEqual({ status: "ready" });

    expect(
      await modules.lifecycle.reserveAutomaticFirstPreviewAttempt({
        payload: validBrief(),
        persistenceConfirmed: true,
        customerAccessEligible: true,
        conceptBriefId: BRIEF_ID,
        publicReference: PUBLIC_REFERENCE,
        attemptNumber: 3,
        parentJobId: JOB_2_ID,
        repository: first.repository,
      }),
    ).toEqual({ ok: false, category: "precondition_failed" });
  });
});
