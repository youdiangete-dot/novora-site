import { expect, test } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createFirstPreviewGeneratedAssetDeliveryServiceBinding,
  createFirstPreviewGeneratedAssetRouteHandler,
  type FirstPreviewGeneratedAssetDeliveryService,
} from "../../lib/server/ai-sketch/first-preview-generated-asset-delivery";
import type {
  FirstPreviewGeneratedAssetStore,
} from "../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import type {
  FirstPreviewCustomerAccessAuthorizer,
} from "../../lib/server/ai-sketch/supabase-first-preview-customer-access";
import {
  createSyntheticFirstPreviewPng,
} from "../fixtures/ai-sketch/fake-first-preview-storage-client";

const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const BRIEF_ACCESS_PROOF = "opaque-brief-scoped-test-capability";
const PNG = createSyntheticFirstPreviewPng();

function request(path = `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}`) {
  return new Request(`https://novora.test${path}`);
}

function context(
  publicReference = PUBLIC_REFERENCE,
  outputId = OUTPUT_ID,
) {
  return { params: Promise.resolve({ publicReference, outputId }) };
}

function service(
  result: Awaited<
    ReturnType<FirstPreviewGeneratedAssetDeliveryService["read"]>
  > = { ok: true, body: PNG, contentLength: PNG.byteLength },
): FirstPreviewGeneratedAssetDeliveryService {
  return {
    kind: "supabase",
    async read() {
      return result;
    },
  };
}

function routeHarness(
  options: Partial<{
    accessProof: string | null;
    deliveryService: FirstPreviewGeneratedAssetDeliveryService;
    throwCookie: boolean;
    throwService: boolean;
  }> = {},
) {
  let cookieReads = 0;
  let serviceConstructions = 0;
  let serviceReads = 0;
  const baseService = options.deliveryService ?? service();
  const monitoredService: FirstPreviewGeneratedAssetDeliveryService = {
    kind: baseService.kind,
    async read(input) {
      serviceReads += 1;
      return baseService.read(input);
    },
  };
  const handler = createFirstPreviewGeneratedAssetRouteHandler({
    async readAccessProof() {
      cookieReads += 1;
      if (options.throwCookie) throw new Error("private cookie error");
      return Object.prototype.hasOwnProperty.call(options, "accessProof")
        ? options.accessProof ?? null
        : BRIEF_ACCESS_PROOF;
    },
    async createService() {
      serviceConstructions += 1;
      if (options.throwService) throw new Error("private binding error");
      return monitoredService;
    },
  });
  return {
    handler,
    counts: () => ({ cookieReads, serviceConstructions, serviceReads }),
  };
}

async function expectOpaqueEmpty(
  response: Response,
  status: 404 | 405,
) {
  expect(response.status).toBe(status);
  expect((await response.arrayBuffer()).byteLength).toBe(0);
  expect(response.headers.get("content-length")).toBe("0");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("content-type")).toBeNull();
}

test.describe("GET /api/first-preview-assets/[publicReference]/[outputId]", () => {
  test("returns verified PNG bytes with the exact private response headers and no metadata surface", async () => {
    let received: unknown = null;
    const deliveryService: FirstPreviewGeneratedAssetDeliveryService = {
      kind: "supabase",
      async read(input) {
        received = input;
        return { ok: true, body: PNG, contentLength: PNG.byteLength };
      },
    };
    const state = routeHarness({ deliveryService });
    const response = await state.handler.get(request(), context());

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe(String(PNG.byteLength));
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="novora-first-preview.png"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cross-origin-resource-policy")).toBe(
      "same-origin",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("etag")).toBeNull();
    expect(response.headers.get("last-modified")).toBeNull();
    expect(response.headers.get("x-content-sha256")).toBeNull();
    expect(received).toEqual({
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_ID,
      accessProof: BRIEF_ACCESS_PROOF,
    });
    expect(state.counts()).toEqual({
      cookieReads: 1,
      serviceConstructions: 1,
      serviceReads: 1,
    });
  });

  test("returns one empty opaque 404 for every protected authorization, database, binding, Storage, and integrity failure", async () => {
    const protectedFailures = [
      "invalid proof",
      "expired proof",
      "wrong Brief",
      "wrong Output",
      "missing Brief",
      "duplicate Brief",
      "missing Output",
      "duplicate Output",
      "missing Job",
      "duplicate Job",
      "not ready",
      "non-current",
      "revoked",
      "linkage mismatch",
      "wrong bucket",
      "invalid path",
      "invalid hash",
      "database failure",
      "Storage returned failure",
      "Storage thrown failure",
      "missing object",
      "tampered object",
      "integrity failure",
    ];

    for (const name of protectedFailures) {
      await test.step(name, async () => {
        const state = routeHarness({
          deliveryService: service({ ok: false }),
        });
        await expectOpaqueEmpty(
          await state.handler.get(request(), context()),
          404,
        );
      });
    }
  });

  test("rejects invalid identifiers and query parameters before reading the cookie or constructing authorization", async () => {
    for (const scenario of [
      {
        request: request(),
        context: context("not-a-reference", OUTPUT_ID),
      },
      {
        request: request(),
        context: context(PUBLIC_REFERENCE, "not-a-uuid"),
      },
      {
        request: request(
          `/api/first-preview-assets/${PUBLIC_REFERENCE}/${OUTPUT_ID}?proof=forbidden`,
        ),
        context: context(),
      },
    ]) {
      const state = routeHarness();
      await expectOpaqueEmpty(
        await state.handler.get(scenario.request, scenario.context),
        404,
      );
      expect(state.counts()).toEqual({
        cookieReads: 0,
        serviceConstructions: 0,
        serviceReads: 0,
      });
    }
  });

  test("requires the cookie proof and never accepts a bearer token", async () => {
    const state = routeHarness({ accessProof: null });
    const bearerOnly = new Request(request().url, {
      headers: { Authorization: `Bearer ${BRIEF_ACCESS_PROOF}` },
    });
    await expectOpaqueEmpty(
      await state.handler.get(bearerOnly, context()),
      404,
    );
    expect(state.counts()).toEqual({
      cookieReads: 1,
      serviceConstructions: 0,
      serviceReads: 0,
    });
  });

  test("normalizes missing dependencies and thrown internal failures without leaking proof, paths, hashes, Provider data, prompts, or notes", async () => {
    for (const options of [
      { throwCookie: true },
      { throwService: true },
      {
        deliveryService: {
          kind: "unavailable" as const,
          async read() {
            throw new Error("must not run");
          },
        },
      },
      {
        deliveryService: {
          kind: "supabase" as const,
          async read() {
            throw new Error("private Storage exception");
          },
        },
      },
    ]) {
      const state = routeHarness(options);
      const response = await state.handler.get(request(), context());
      const body = await response.text();
      expect(response.status).toBe(404);
      expect(body).toBe("");
      for (const forbidden of [
        BRIEF_ACCESS_PROOF,
        "first-preview/",
        "content_sha256",
        "provider",
        "prompt",
        "note",
        "private binding error",
      ]) {
        expect(body.toLowerCase()).not.toContain(forbidden.toLowerCase());
        expect(JSON.stringify([...response.headers])).not.toContain(forbidden);
      }
    }
  });

  test("returns empty 405 for HEAD and every unsupported mutation method without invoking authorization", async () => {
    const state = routeHarness();
    for (const method of [
      "HEAD",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ]) {
      await test.step(method, async () => {
        await expectOpaqueEmpty(state.handler.unsupported(), 405);
      });
    }
    expect(state.counts()).toEqual({
      cookieReads: 0,
      serviceConstructions: 0,
      serviceReads: 0,
    });
  });

  test("cannot create a usable delivery service without every reviewed Production dependency", async () => {
    const adminClient = {} as SupabaseClient;
    const authorizer = {
      kind: "supabase",
      async authorize() {
        return { authorized: false } as const;
      },
    } satisfies FirstPreviewCustomerAccessAuthorizer;
    const generatedAssetStore = {
      kind: "supabase",
      async persistValidatedPng() {
        return { ok: false, code: "storage_unavailable" } as const;
      },
      async readAuthorizedPng() {
        return { ok: false, code: "access_denied" } as const;
      },
    } satisfies FirstPreviewGeneratedAssetStore;
    const complete = {
      signingSecret: "test-only-secret",
      adminClient,
      bucketName: "novora-ai-sketches",
      authorizer,
      generatedAssetStore,
    };
    expect(
      createFirstPreviewGeneratedAssetDeliveryServiceBinding(complete).kind,
    ).toBe("supabase");

    for (const incomplete of [
      { ...complete, signingSecret: null },
      { ...complete, adminClient: null },
      { ...complete, authorizer: null },
      { ...complete, generatedAssetStore: null },
      { ...complete, bucketName: "wrong-bucket" },
    ]) {
      const unavailable =
        createFirstPreviewGeneratedAssetDeliveryServiceBinding(incomplete);
      expect(unavailable.kind).toBe("unavailable");
      expect(
        await unavailable.read({
          publicReference: PUBLIC_REFERENCE,
          outputId: OUTPUT_ID,
          accessProof: BRIEF_ACCESS_PROOF,
        }),
      ).toEqual({ ok: false });
    }
  });
});
