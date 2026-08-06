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
}));

const PUBLIC_REFERENCE = "NOVORA-CB-20260803-G2R1";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
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

test.describe("Goal 2 actual Concept Brief POST Queue correction", () => {
  test("awaits one durable publish without constructing or running the worker", async () => {
    let publishCalls = 0;
    let releasePublish: (() => void) | null = null;
    let signalPublishStarted: (() => void) | null = null;
    const publishStarted = new Promise<void>((resolve) => {
      signalPublishStarted = resolve;
    });
    const publishReleased = new Promise<void>((resolve) => {
      releasePublish = resolve;
    });

    const post = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies: {
        featureFlagValue: "true",
        queueExecutionCapabilityValue: "true",
        publisher: {
          async publish() {
            publishCalls += 1;
            signalPublishStarted?.();
            await publishReleased;
          },
        },
      },
    });

    const responsePromise = post(request());
    await publishStarted;
    expect(publishCalls).toBe(1);
    releasePublish?.();

    const response = await responsePromise;
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
  });

  test("exports 300 seconds and requires exact independent dual gates", async () => {
    expect(modules.route.maxDuration).toBe(300);
    for (const queueExecutionCapabilityValue of [
      undefined,
      "",
      "TRUE",
      " true",
      "true ",
      1,
      true,
      {},
    ]) {
      let publishCalls = 0;
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => persistenceSuccess(),
        sessionDependencies: sessionDependencies(),
        triggerDependencies: {
          featureFlagValue: "true",
          queueExecutionCapabilityValue,
          publisher: {
            async publish() {
              publishCalls += 1;
            },
          },
        },
      });
      expect((await post(request())).status).toBe(201);
      expect(publishCalls).toBe(0);
    }

    for (const featureFlagValue of [undefined, "TRUE", " true", "true ", true]) {
      let publishCalls = 0;
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: allowRateLimit,
        persistSubmission: () => persistenceSuccess(),
        sessionDependencies: sessionDependencies(featureFlagValue),
        triggerDependencies: {
          featureFlagValue,
          queueExecutionCapabilityValue: "true",
          publisher: {
            async publish() {
              publishCalls += 1;
            },
          },
        },
      });
      expect((await post(request())).status).toBe(201);
      expect(publishCalls).toBe(0);
    }
  });

  test("does not publish for 400, 429, 202, false persistence, or invalid identity", async () => {
    let publishCalls = 0;
    const triggerDependencies = {
      featureFlagValue: "true",
      queueExecutionCapabilityValue: "true",
      publisher: {
        async publish() {
          publishCalls += 1;
        },
      },
    };

    const invalid = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies,
    });
    expect((await invalid(request({}))).status).toBe(400);

    const limited = modules.route.createConceptBriefPostHandler({
      checkRateLimit: () =>
        Promise.resolve({
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
      persistSubmission: () =>
        Promise.resolve({
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
    expect(publishCalls).toBe(0);
  });

  test("Queue failure preserves 201 and hostile headers cannot enable either gate", async () => {
    let publishCalls = 0;
    const failedPublish = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(),
      triggerDependencies: {
        featureFlagValue: "true",
        queueExecutionCapabilityValue: "true",
        publisher: {
          async publish() {
            publishCalls += 1;
            throw new Error("synthetic Queue failure");
          },
        },
      },
    });
    const failedResponse = await failedPublish(request());
    expect(failedResponse.status).toBe(201);
    expect(publishCalls).toBe(1);
    expect(JSON.stringify(await failedResponse.json())).not.toContain("Queue");

    let hostilePublishes = 0;
    const hostile = modules.route.createConceptBriefPostHandler({
      checkRateLimit: allowRateLimit,
      persistSubmission: () => persistenceSuccess(),
      sessionDependencies: sessionDependencies(undefined),
      triggerDependencies: {
        featureFlagValue: undefined,
        queueExecutionCapabilityValue: undefined,
        publisher: {
          async publish() {
            hostilePublishes += 1;
          },
        },
      },
    });
    const hostileResponse = await hostile(
      request(validPayload(), {
        "x-novora-instant-preview-agent-enabled": "true",
        "x-novora-first-preview-queue-execution-confirmed": "true",
        "x-novora-first-preview-post-response-execution-confirmed": "true",
      }),
    );
    expect(hostileResponse.status).toBe(201);
    expect(hostilePublishes).toBe(0);
  });
});
