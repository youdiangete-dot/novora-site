import { expect, test } from "@playwright/test";
import Module, { createRequire } from "node:module";
import path from "node:path";

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
    "automatic-first-preview-route-correction.spec.ts",
  ),
);
const modules = loadWithServerOnlyTestShim(() => ({
  route: testRequire(
    "../../app/api/concept-briefs/route",
  ) as typeof import("../../app/api/concept-briefs/route"),
  memory: testRequire(
    "../../lib/server/ai-sketch/in-memory-first-preview-repository",
  ) as typeof import("../../lib/server/ai-sketch/in-memory-first-preview-repository"),
}));

const PUBLIC_REFERENCE = "NOVORA-CB-20260803-G2R1";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const JOB_ID = "223e4567-e89b-42d3-a456-426614174000";
const SIGNING_SECRET =
  "goal2-route-test-only-signing-secret-00000000000000000000";

function validPayload() {
  return {
    customerName: "Synthetic Customer",
    customerEmail: "synthetic@example.invalid",
    brief: {
      pieceType: "ring",
      designIntent: "A balanced pear-center heirloom ring.",
      designDescription: "A low sculptural silhouette for daily wear.",
    },
  };
}

function request(payload: unknown = validPayload(), headers?: HeadersInit) {
  return new Request("http://localhost/api/concept-briefs", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
}

function allowRateLimit() {
  return Promise.resolve({
    allowed: true,
    mode: "disabled" as const,
    reason: "synthetic_test",
  });
}

function persistenceSuccess(
  publicReference = PUBLIC_REFERENCE,
  conceptBriefId = BRIEF_ID,
) {
  return Promise.resolve({
    persisted: true as const,
    publicReference,
    conceptBriefId,
  });
}

function sessionDependencies(featureFlagValue: unknown = "true") {
  return {
    featureFlagValue,
    signingSecret: SIGNING_SECRET,
    clock: () => 1_785_715_200,
    nonceSource: () => "goal2_route_nonce_abcdefghijklmnop",
  };
}

test.describe("Goal 2 actual Concept Brief POST correction", () => {
  test("returns 201 before repository construction or reservation and registers one callback", async () => {
    const scheduledTasks: Array<() => void | Promise<void>> = [];
    const repository = new modules.memory.InMemoryFirstPreviewRepository();
    let repositoryConstructions = 0;
    let reservationCalls = 0;
    let releaseReservation: (() => void) | null = null;
    repository.reserveJob = async () => {
      reservationCalls += 1;
      await new Promise<void>((resolve) => { releaseReservation = resolve; });
      return { ok: false, code: "repository_unavailable" };
    };

    const post = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies: {
        featureFlagValue: "true",
        executionCapabilityValue: "true",
        createRepository: () => {
          repositoryConstructions += 1;
          return repository;
        },
        schedule: (task) => { scheduledTasks.push(task); },
        jobIdSource: () => JOB_ID,
      },
    });

    const response = await post(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
    expect(scheduledTasks).toHaveLength(1);
    expect(repositoryConstructions).toBe(0);
    expect(reservationCalls).toBe(0);

    const callbackCompletion = scheduledTasks[0]();
    await Promise.resolve();
    expect(repositoryConstructions).toBe(1);
    expect(reservationCalls).toBe(1);
    releaseReservation?.();
    await callbackCompletion;
  });

  test("exports 300 seconds and requires exact independent dual gates", async () => {
    expect(modules.route.maxDuration).toBe(300);
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
      let schedules = 0;
      let repositoryConstructions = 0;
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => persistenceSuccess(),
        sessionDependencies: sessionDependencies(),
        triggerDependencies: {
          featureFlagValue: "true",
          executionCapabilityValue,
          schedule: () => { schedules += 1; },
          createRepository: () => {
            repositoryConstructions += 1;
            return new modules.memory.InMemoryFirstPreviewRepository();
          },
        },
      });
      expect((await post(request())).status).toBe(201);
      expect(schedules).toBe(0);
      expect(repositoryConstructions).toBe(0);
    }

    for (const featureFlagValue of [undefined, "TRUE", " true", "true ", true]) {
      let schedules = 0;
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => persistenceSuccess(),
        sessionDependencies: sessionDependencies(featureFlagValue),
        triggerDependencies: {
          featureFlagValue,
          executionCapabilityValue: "true",
          schedule: () => { schedules += 1; },
        },
      });
      expect((await post(request())).status).toBe(201);
      expect(schedules).toBe(0);
    }
  });

  test("does not schedule for 400, 429, 202, false persistence, or invalid identity", async () => {
    let schedules = 0;
    const triggerDependencies = {
      featureFlagValue: "true",
      executionCapabilityValue: "true",
      schedule: () => { schedules += 1; },
    };

    const invalid = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await invalid(request({}))).status).toBe(400);

    const limited = modules.route.createConceptBriefPostHandler({
      checkRateLimit: () => Promise.resolve({
        allowed: false,
        mode: "enforced" as const,
        reason: "synthetic_limit",
      }),
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await limited(request())).status).toBe(429);

    const unavailable = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => Promise.resolve({
        persisted: false as const,
        message: "Synthetic persistence unavailable.",
      }),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await unavailable(request())).status).toBe(202);

    const invalidIdentity = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess("invalid", "invalid"),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await invalidIdentity(request())).status).toBe(201);
    expect(schedules).toBe(0);
  });

  test("scheduling failure preserves 201 and hostile headers cannot enable either gate", async () => {
    let repositoryConstructions = 0;
    const schedulingFailure = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies: {
        featureFlagValue: "true",
        executionCapabilityValue: "true",
        createRepository: () => {
          repositoryConstructions += 1;
          return new modules.memory.InMemoryFirstPreviewRepository();
        },
        schedule: () => { throw new Error("synthetic scheduler failure"); },
      },
    });
    const failedScheduleResponse = await schedulingFailure(request());
    expect(failedScheduleResponse.status).toBe(201);
    expect(repositoryConstructions).toBe(0);

    let hostileSchedules = 0;
    const hostile = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(undefined),
      triggerDependencies: {
        featureFlagValue: undefined,
        executionCapabilityValue: undefined,
        schedule: () => { hostileSchedules += 1; },
      },
    });
    const hostileResponse = await hostile(request(validPayload(), {
      "x-novora-instant-preview-agent-enabled": "true",
      "x-novora-first-preview-post-response-execution-confirmed": "true",
    }));
    expect(hostileResponse.status).toBe(201);
    expect(hostileSchedules).toBe(0);
  });
});
