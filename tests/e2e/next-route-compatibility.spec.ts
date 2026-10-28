import { expect, test } from "@playwright/test";
import Module, { createRequire } from "node:module";
import path from "node:path";
import { resolveCustomerPreview } from "../../app/design/preview/[public_reference]/resolve-customer-preview";

const requireTest = createRequire(__filename);
const internals = Module as unknown as { _resolveFilename: (...args: any[]) => string };
const original = internals._resolveFilename;
internals._resolveFilename = function (name, ...args) {
  return name === "server-only"
    ? requireTest.resolve("next/dist/compiled/server-only/empty.js")
    : original.call(this, name, ...args);
};
const routes = (() => {
  try {
    return {
      asset: requireTest("../../app/api/first-preview-assets/[publicReference]/[outputId]/route") as typeof import("../../app/api/first-preview-assets/[publicReference]/[outputId]/route"),
      current: requireTest("../../app/api/first-preview-assets/[publicReference]/current/route") as typeof import("../../app/api/first-preview-assets/[publicReference]/current/route"),
      queue: requireTest("../../app/api/queues/first-preview-generation/route") as typeof import("../../app/api/queues/first-preview-generation/route"),
    };
  } finally {
    internals._resolveFilename = original;
  }
})();

test("Promise route parameters preserve opaque denial for invalid asset identities", async () => {
  const asset = await routes.asset.GET(
    new Request("https://synthetic.invalid/asset"),
    { params: Promise.resolve({ publicReference: "invalid", outputId: "invalid" }) },
  );
  const current = await routes.current.GET(
    new Request("https://synthetic.invalid/current"),
    { params: Promise.resolve({ publicReference: "invalid" }) },
  );
  for (const response of [asset, current]) {
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(response.headers.get("cache-control")).toContain("no-store");
  }
});

test("extracted preview resolver preserves exact binding and rejects mismatches", () => {
  const publicReference = "NOVORA-CB-20260731-AB12";
  const outputId = "423e4567-e89b-42d3-a456-426614174000";
  expect(resolveCustomerPreview(publicReference, { state: "ready", publicReference, outputId })).toEqual({
    state: "ready", publicReference, outputId,
    customerAssetSrc: `/api/first-preview-assets/${publicReference}/${outputId}`,
  });
  expect(resolveCustomerPreview(publicReference, {
    state: "ready", publicReference: "NOVORA-CB-20260731-ZZ99", outputId,
  }).state).toBe("unavailable");
  let reads = 0;
  const hostile = { get state() { reads++; return "ready"; } };
  expect(resolveCustomerPreview(publicReference, hostile).state).toBe("unavailable");
  expect(reads).toBe(0);
});

test("Next queue adapter preserves SDK rejection for Request and event-shaped callbacks", async () => {
  const { handleCallback } = requireTest("@vercel/queue") as typeof import("@vercel/queue");
  const baseline = handleCallback(async () => { throw new Error("Unexpected dispatch"); });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  let fetches = 0;
  globalThis.fetch = async () => { fetches++; throw new Error("Unexpected network request"); };
  console.error = () => {};
  try {
    for (const eventShape of [false, true]) {
      const request = () => new Request("https://synthetic.invalid/queue", { method: "POST" });
      const actualInput = eventShape ? { request: request() } : request();
      const expectedInput = eventShape ? { request: request() } : request();
      const actual = await Reflect.apply(routes.queue.POST, undefined, [actualInput]);
      const expected = await baseline(expectedInput);
      expect(actual.status).toBe(expected.status);
      expect(await actual.json()).toEqual(await expected.json());
      expect(actual.status).toBe(400);
    }
    expect(fetches).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});
