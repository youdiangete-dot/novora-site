import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
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
    "preview-native-queue-probe.spec.ts",
  ),
);
const modules = loadWithServerOnlyTestShim(() => ({
  route: testRequire(
    "../../app/api/admin/preview-native-queue-probe/route",
  ) as typeof import("../../app/api/admin/preview-native-queue-probe/route"),
  queue: testRequire(
    "../../lib/server/ai-sketch/first-preview-queue",
  ) as typeof import("../../lib/server/ai-sketch/first-preview-queue"),
}));

const SOURCE_COMMIT_SHA = "ea0859acfba85794d65f19a96c83fc13689f8905";
const VALID_REQUEST_BODY = {
  action: modules.route.PREVIEW_NATIVE_QUEUE_PROBE_ACTION,
};

type PublishedProbe = Readonly<{
  topic: Parameters<
    NonNullable<
      import("../../app/api/admin/preview-native-queue-probe/route").PreviewNativeQueueProbeDependencies["publishQueueMessage"]
    >
  >[0];
  payload: Parameters<
    NonNullable<
      import("../../app/api/admin/preview-native-queue-probe/route").PreviewNativeQueueProbeDependencies["publishQueueMessage"]
    >
  >[1];
  options: Parameters<
    NonNullable<
      import("../../app/api/admin/preview-native-queue-probe/route").PreviewNativeQueueProbeDependencies["publishQueueMessage"]
    >
  >[2];
}>;

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/preview-native-queue-probe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function rawRequest(body: string): Request {
  return new Request("http://localhost/api/admin/preview-native-queue-probe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function createHarness(options: {
  environment?: unknown;
  sourceCommitSha?: unknown;
  cookie?: string;
  validAdminCookie?: boolean;
  failPublish?: boolean;
} = {}) {
  const published: PublishedProbe[] = [];
  const post = modules.route.createPreviewNativeQueueProbePostHandler({
    readVercelEnvironment: () =>
      Object.prototype.hasOwnProperty.call(options, "environment")
        ? options.environment
        : "preview",
    readSourceCommitSha: () =>
      Object.prototype.hasOwnProperty.call(options, "sourceCommitSha")
        ? options.sourceCommitSha
        : SOURCE_COMMIT_SHA,
    readAdminAccessCookie: async () => options.cookie ?? "valid-admin-cookie",
    validateAdminAccessCookie: () => options.validAdminCookie ?? true,
    publishQueueMessage: async (topic, payload, publishOptions) => {
      if (options.failPublish) {
        throw new Error("PRIVATE_SYNTHETIC_PUBLISH_FAILURE");
      }
      published.push({ topic, payload, options: publishOptions });
      return { messageId: "synthetic-preview-queue-message-id" };
    },
  });

  return { post, published };
}

let originalFetch: typeof globalThis.fetch;

test.beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network access is forbidden in Preview Queue probe tests");
  };
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Production refuses before the Queue publisher is called", async () => {
  const harness = createHarness({ environment: "production" });

  const response = await harness.post(jsonRequest(VALID_REQUEST_BODY));

  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({
    ok: false,
    message: "Preview verification is unavailable.",
  });
  expect(harness.published).toHaveLength(0);
});

test("development, undefined, and malformed environments refuse without publishing", async () => {
  for (const environment of ["development", undefined, "PREVIEW", " preview "]) {
    const harness = createHarness({ environment });

    const response = await harness.post(jsonRequest(VALID_REQUEST_BODY));

    expect(response.status).toBe(404);
    expect(harness.published).toHaveLength(0);
  }
});

test("Preview rejects an invalid admin cookie before publishing", async () => {
  const harness = createHarness({ validAdminCookie: false, cookie: "invalid" });

  const response = await harness.post(jsonRequest(VALID_REQUEST_BODY));

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({
    ok: false,
    message: "Admin access is required.",
  });
  expect(harness.published).toHaveLength(0);
});

test("Preview rejects invalid JSON and every non-exact request contract", async () => {
  const invalidRequests = [
    rawRequest("{"),
    jsonRequest({}),
    jsonRequest({ action: "other" }),
    jsonRequest({
      action: modules.route.PREVIEW_NATIVE_QUEUE_PROBE_ACTION,
      mode: "production",
    }),
    jsonRequest({
      action: modules.route.PREVIEW_NATIVE_QUEUE_PROBE_ACTION,
      conceptBriefId: "123e4567-e89b-42d3-a456-426614174000",
    }),
  ];
  const harness = createHarness();

  for (const request of invalidRequests) {
    const response = await harness.post(request);
    expect(response.status).toBe(400);
  }

  expect(harness.published).toHaveLength(0);
});

test("Preview exact admin request publishes once with the fixed invalid privacy-safe payload", async () => {
  const harness = createHarness();

  const response = await harness.post(jsonRequest(VALID_REQUEST_BODY));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    messageId: "synthetic-preview-queue-message-id",
    topic: "novora-first-preview-generation-v1",
    sourceCommitSha: SOURCE_COMMIT_SHA,
    previewOnly: true,
  });
  expect(harness.published).toHaveLength(1);

  const publication = harness.published[0];
  expect(publication.topic).toBe("novora-first-preview-generation-v1");
  expect(publication.payload).toEqual({
    schemaVersion: "novora_preview_native_queue_probe_invalid_v1",
    probe: "NOVORA_PREVIEW_NATIVE_QUEUE_VERIFICATION",
  });
  expect(
    modules.queue.validateFirstPreviewQueueMessage(publication.payload),
  ).toEqual({ ok: false });
  expect(Object.keys(publication.payload).sort()).toEqual([
    "probe",
    "schemaVersion",
  ]);

  const serialized = JSON.stringify(publication.payload).toLowerCase();
  for (const forbiddenField of [
    "conceptbriefid",
    "publicreference",
    "email",
    "name",
    "phone",
    "brief",
    "referenceasset",
    "prompt",
    "supabase",
    "storage",
  ]) {
    expect(serialized).not.toContain(forbiddenField);
  }
});

test("same deployed source identity reuses one deterministic bounded idempotency key", async () => {
  const harness = createHarness();

  expect((await harness.post(jsonRequest(VALID_REQUEST_BODY))).status).toBe(200);
  expect((await harness.post(jsonRequest(VALID_REQUEST_BODY))).status).toBe(200);

  expect(harness.published).toHaveLength(2);
  expect(harness.published[0].options).toEqual({
    idempotencyKey:
      `novora-preview-native-queue-probe:${SOURCE_COMMIT_SHA}`,
    retentionSeconds: 600,
  });
  expect(harness.published[1].options).toEqual(
    harness.published[0].options,
  );
});

test("missing or malformed source identity fails closed before publishing", async () => {
  for (const sourceCommitSha of [undefined, "", "not-a-commit", "a".repeat(39)]) {
    const harness = createHarness({ sourceCommitSha });

    const response = await harness.post(jsonRequest(VALID_REQUEST_BODY));

    expect(response.status).toBe(503);
    expect(harness.published).toHaveLength(0);
  }
});

test("publisher failures return only a bounded non-secret response", async () => {
  const harness = createHarness({ failPublish: true });

  const response = await harness.post(jsonRequest(VALID_REQUEST_BODY));
  const responseText = JSON.stringify(await response.json());

  expect(response.status).toBe(503);
  expect(responseText).toBe(
    JSON.stringify({
      ok: false,
      message: "Preview verification could not be published.",
    }),
  );
  expect(responseText).not.toContain("PRIVATE_SYNTHETIC_PUBLISH_FAILURE");
});

test("route has no Provider, repository, Supabase, Storage, email, or consumer invocation surface", () => {
  const routeSource = readFileSync(
    "app/api/admin/preview-native-queue-probe/route.ts",
    "utf8",
  );

  for (const forbiddenSurface of [
    "createFirstPreviewRepository",
    "consumeFirstPreviewQueueMessage",
    "triggerAutomaticFirstPreviewAfterPersistence",
    "openai",
    "supabase",
    "storage",
    "resend",
    "email",
    "acknowledge",
  ]) {
    expect(routeSource.toLowerCase()).not.toContain(
      forbiddenSurface.toLowerCase(),
    );
  }
  expect(routeSource).toContain("ADMIN_ACCESS_COOKIE_NAME");
  expect(routeSource).toContain("isValidAdminAccessCookie");
  expect(routeSource).toContain('from "@vercel/queue"');
});
