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
  trigger: testRequire(
    "../../lib/server/ai-sketch/first-preview-automatic-trigger",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-automatic-trigger"),
}));

type ConceptBriefPostDependencies = NonNullable<
  Parameters<typeof modules.route.createConceptBriefPostHandler>[0]
>;
type RateLimitResult = Awaited<
  ReturnType<NonNullable<ConceptBriefPostDependencies["checkRateLimit"]>>
>;

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

function trustedRateLimitEvidence() {
  return {
    allowed: true,
    mode: "enforced",
    reason: "within_limit",
  } as const;
}

function allowRateLimit() {
  return Promise.resolve(trustedRateLimitEvidence());
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

function expectedPersistedReceipt() {
  return modules.route.createPersistedConceptBriefResponse(
    {
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    },
    sessionDependencies(),
  );
}

test.describe("Goal 2 actual Concept Brief POST Queue correction", () => {
  test("awaits one durable publish without constructing or running the worker", async () => {
    const checkedBoundaries: string[] = [];
    let persistenceCalls = 0;
    let triggerCalls = 0;
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
      checkRateLimit: async ({ normalizedEmail }) => {
        checkedBoundaries.push(normalizedEmail ? "email" : "ip");
        return trustedRateLimitEvidence();
      },
      persistSubmission: () => {
        persistenceCalls += 1;
        return persistenceSuccess();
      },
      sessionDependencies: sessionDependencies(),
      triggerAutomaticPreview: async (input, dependencies) => {
        triggerCalls += 1;
        return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
      },
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
    expect(checkedBoundaries).toEqual(["ip", "email"]);
    expect(persistenceCalls).toBe(1);
    expect(triggerCalls).toBe(1);
    expect(publishCalls).toBe(1);
    expect(response.headers.get("set-cookie")).toBeTruthy();
    expect(response.headers.get("set-cookie")).toBe(
      expectedPersistedReceipt().headers.get("set-cookie"),
    );
    expect(await response.json()).toMatchObject({
      persisted: true,
      publicReference: PUBLIC_REFERENCE,
      conceptBriefId: BRIEF_ID,
    });
  });

  const insufficientEvidenceCases: ReadonlyArray<{
    name: string;
    evidence?: unknown;
    throws?: boolean;
  }> = [
    { name: "missing result", evidence: undefined },
    { name: "null result", evidence: null },
    { name: "primitive result", evidence: true },
    { name: "array result", evidence: Object.assign([], trustedRateLimitEvidence()) },
    { name: "missing allowed", evidence: { mode: "enforced", reason: "within_limit" } },
    { name: "truthy allowed", evidence: { ...trustedRateLimitEvidence(), allowed: "true" } },
    { name: "missing mode", evidence: { allowed: true, reason: "within_limit" } },
    { name: "non-string mode", evidence: { ...trustedRateLimitEvidence(), mode: true } },
    { name: "unknown mode", evidence: { ...trustedRateLimitEvidence(), mode: "unknown" } },
    { name: "padded mode", evidence: { ...trustedRateLimitEvidence(), mode: " enforced" } },
    { name: "uppercase mode", evidence: { ...trustedRateLimitEvidence(), mode: "ENFORCED" } },
    { name: "missing provider", evidence: { allowed: true, mode: "disabled", reason: "provider_env_missing" } },
    { name: "missing email signing secret", evidence: { allowed: true, mode: "disabled", reason: "email_signing_secret_missing" } },
    { name: "provider error", evidence: { allowed: true, mode: "provider_error", reason: "provider_error" } },
    { name: "missing reason", evidence: { allowed: true, mode: "enforced" } },
    { name: "non-string reason", evidence: { ...trustedRateLimitEvidence(), reason: true } },
    { name: "unknown reason", evidence: { ...trustedRateLimitEvidence(), reason: "unknown" } },
    { name: "padded reason", evidence: { ...trustedRateLimitEvidence(), reason: "within_limit " } },
    { name: "uppercase reason", evidence: { ...trustedRateLimitEvidence(), reason: "WITHIN_LIMIT" } },
    { name: "inconsistent denial", evidence: { ...trustedRateLimitEvidence(), allowed: false } },
    { name: "unenforced denial", evidence: { allowed: false, mode: "provider_error", reason: "provider_error" } },
    { name: "inconsistent permission", evidence: { ...trustedRateLimitEvidence(), reason: "rate_limit_exceeded" } },
    { name: "inherited fields", evidence: Object.create(trustedRateLimitEvidence()) },
    { name: "checker rejection", throws: true },
  ];

  for (const boundary of ["ip", "email"] as const) {
    for (const insufficient of insufficientEvidenceCases) {
      test(`preserves receipt and withholds generation for ${boundary} ${insufficient.name}`, async () => {
        const checkedBoundaries: string[] = [];
        const diagnostics: unknown[] = [];
        let persistenceCalls = 0;
        let triggerCalls = 0;
        let publishCalls = 0;
        const post = modules.route.createConceptBriefPostHandler({
          checkRateLimit: async ({ normalizedEmail }) => {
            const checkedBoundary = normalizedEmail ? "email" : "ip";
            checkedBoundaries.push(checkedBoundary);
            if (checkedBoundary !== boundary) {
              return trustedRateLimitEvidence();
            }
            if (insufficient.throws) {
              throw new Error(`Synthetic private limiter detail: ${SIGNING_SECRET}`);
            }
            return insufficient.evidence as RateLimitResult;
          },
          persistSubmission: (payload) => {
            persistenceCalls += 1;
            expect(payload).toEqual(validPayload());
            return persistenceSuccess();
          },
          sessionDependencies: sessionDependencies(),
          triggerAutomaticPreview: async (input, dependencies) => {
            triggerCalls += 1;
            return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
          },
          triggerDependencies: {
            featureFlagValue: "true",
            queueExecutionCapabilityValue: "true",
            publisher: { async publish() { publishCalls += 1; } },
          },
          logAutomaticPreviewDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
        });

        const response = await post(request());
        const expected = expectedPersistedReceipt();
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(await expected.json());
        expect(response.headers.get("set-cookie")).toBeTruthy();
        expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
        expect(checkedBoundaries).toEqual(["ip", "email"]);
        expect(persistenceCalls).toBe(1);
        expect(triggerCalls).toBe(0);
        expect(publishCalls).toBe(0);
        expect(diagnostics).toEqual([{
          publicReference: PUBLIC_REFERENCE,
          status: "not_enqueued",
          reason: "rate_limit_enforcement_unverified",
        }]);
        expect(JSON.stringify(diagnostics)).not.toContain("synthetic@example.invalid");
        expect(JSON.stringify(diagnostics)).not.toContain(SIGNING_SECRET);
      });
    }

    test(`rejects ${boundary} accessor evidence without reading its getter`, async () => {
      let getterReads = 0;
      let persistenceCalls = 0;
      let triggerCalls = 0;
      let publishCalls = 0;
      const evidence = Object.defineProperty(
        { mode: "enforced", reason: "within_limit" },
        "allowed",
        { get() { getterReads += 1; return true; } },
      );
      const post = modules.route.createConceptBriefPostHandler({
        checkRateLimit: async ({ normalizedEmail }) =>
          (normalizedEmail ? "email" : "ip") === boundary
            ? evidence as RateLimitResult
            : trustedRateLimitEvidence(),
        persistSubmission: () => { persistenceCalls += 1; return persistenceSuccess(); },
        sessionDependencies: sessionDependencies(),
        triggerAutomaticPreview: async (input, dependencies) => {
          triggerCalls += 1;
          return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
        },
        triggerDependencies: {
          featureFlagValue: "true",
          queueExecutionCapabilityValue: "true",
          publisher: { async publish() { publishCalls += 1; } },
        },
        logAutomaticPreviewDiagnostic: () => {},
      });
      const response = await post(request());
      expect(response.status).toBe(201);
      expect(response.headers.get("set-cookie")).toBeTruthy();
      expect(persistenceCalls).toBe(1);
      expect(getterReads).toBe(0);
      expect(triggerCalls).toBe(0);
      expect(publishCalls).toBe(0);
    });

    for (const malformedHeaders of [false, true]) {
      test(`preserves ${boundary} 429 with ${malformedHeaders ? "malformed" : "valid"} optional headers`, async () => {
        let persistenceCalls = 0;
        let triggerCalls = 0;
        let publishCalls = 0;
        const headers: Record<string, string> = malformedHeaders
          ? { "invalid header name": "synthetic" }
          : { "Retry-After": "60", "X-RateLimit-Remaining": "0" };
        const post = modules.route.createConceptBriefPostHandler({
          checkRateLimit: async ({ normalizedEmail }) =>
            (normalizedEmail ? "email" : "ip") === boundary
              ? {
                  allowed: false,
                  mode: "enforced",
                  reason: "rate_limit_exceeded",
                  headers,
                }
              : trustedRateLimitEvidence(),
          persistSubmission: () => { persistenceCalls += 1; return persistenceSuccess(); },
          sessionDependencies: sessionDependencies(),
          triggerAutomaticPreview: async (input, dependencies) => {
            triggerCalls += 1;
            return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
          },
          triggerDependencies: {
            featureFlagValue: "true",
            queueExecutionCapabilityValue: "true",
            publisher: { async publish() { publishCalls += 1; } },
          },
        });
        const response = await post(request());
        expect(response.status).toBe(429);
        expect(await response.json()).toMatchObject({ ok: false, persisted: false });
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(response.headers.get("retry-after")).toBe(malformedHeaders ? null : "60");
        expect(response.headers.get("x-ratelimit-remaining")).toBe(malformedHeaders ? null : "0");
        expect(persistenceCalls).toBe(0);
        expect(triggerCalls).toBe(0);
        expect(publishCalls).toBe(0);
      });
    }
  }

  test("withheld diagnostic failure cannot invalidate a persisted receipt", async () => {
    let persistenceCalls = 0;
    let triggerCalls = 0;
    let publishCalls = 0;
    const post = modules.route.createConceptBriefPostHandler({
      checkRateLimit: async ({ normalizedEmail }) => normalizedEmail
        ? trustedRateLimitEvidence()
        : { allowed: true, mode: "disabled", reason: "provider_env_missing" },
      persistSubmission: () => { persistenceCalls += 1; return persistenceSuccess(); },
      sessionDependencies: sessionDependencies(),
      triggerAutomaticPreview: async (input, dependencies) => {
        triggerCalls += 1;
        return modules.trigger.triggerAutomaticFirstPreviewAfterPersistence(input, dependencies);
      },
      triggerDependencies: {
        featureFlagValue: "true",
        queueExecutionCapabilityValue: "true",
        publisher: { async publish() { publishCalls += 1; } },
      },
      logAutomaticPreviewDiagnostic: () => { throw new Error("Synthetic diagnostic failure"); },
    });
    const response = await post(request());
    const expected = expectedPersistedReceipt();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(await expected.json());
    expect(response.headers.get("set-cookie")).toBe(expected.headers.get("set-cookie"));
    expect(persistenceCalls).toBe(1);
    expect(triggerCalls).toBe(0);
    expect(publishCalls).toBe(0);
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
          reason: "rate_limit_exceeded",
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
