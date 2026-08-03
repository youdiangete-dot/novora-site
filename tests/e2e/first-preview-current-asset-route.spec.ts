import { expect, test } from "@playwright/test";

import {
  createFirstPreviewCurrentAssetRouteHandler,
  type FirstPreviewGeneratedAssetDeliveryService,
} from "../../lib/server/ai-sketch/first-preview-generated-asset-delivery";

const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const OTHER_REFERENCE = "NOVORA-CB-20260723-B541";
const OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";
const ACCESS_PROOF = "synthetic-proof";
const PNG = Uint8Array.from([137, 80, 78, 71]);

function request(query = "") {
  return new Request(
    `http://localhost/api/first-preview-assets/${PUBLIC_REFERENCE}/current${query}`,
  );
}

function context(publicReference: string | undefined = PUBLIC_REFERENCE) {
  return { params: Promise.resolve({ publicReference }) };
}

function ready(
  publicReference = PUBLIC_REFERENCE,
  outputId = OUTPUT_ID,
) {
  return {
    state: "ready" as const,
    assetRequest: { publicReference, outputId },
  };
}

function harness(
  customerView: Awaited<
    ReturnType<
      Parameters<typeof createFirstPreviewCurrentAssetRouteHandler>[0]["readCustomerView"]
    >
  > = ready(),
) {
  const calls = {
    view: [] as string[],
    proof: 0,
    service: 0,
    reads: [] as Array<{
      publicReference: string;
      outputId: string;
      accessProof: string;
    }>,
  };
  const service: FirstPreviewGeneratedAssetDeliveryService = {
    kind: "supabase",
    async read(input) {
      calls.reads.push(input);
      return { ok: true, body: PNG, contentLength: PNG.byteLength };
    },
  };
  const handler = createFirstPreviewCurrentAssetRouteHandler({
    async readCustomerView(publicReference) {
      calls.view.push(publicReference);
      return customerView;
    },
    async readAccessProof() {
      calls.proof += 1;
      return ACCESS_PROOF;
    },
    async createService() {
      calls.service += 1;
      return service;
    },
  });
  return { calls, handler, service };
}

test.describe("GET /api/first-preview-assets/[publicReference]/current", () => {
  test("resolves one trusted ready Output server-side and reuses protected delivery", async () => {
    const state = harness();
    const response = await state.handler.get(request(), context());

    expect(response.status).toBe(200);
    expect(state.calls.view).toEqual([PUBLIC_REFERENCE]);
    expect(state.calls.proof).toBe(1);
    expect(state.calls.service).toBe(1);
    expect(state.calls.reads).toEqual([
      {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
        accessProof: ACCESS_PROOF,
      },
    ]);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("location")).toBeNull();
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from(PNG));
  });

  for (const stateName of ["pending", "unavailable", "denied"] as const) {
    test(`${stateName} never reaches proof or asset delivery`, async () => {
      const state = harness({ state: stateName } as never);
      const response = await state.handler.get(request(), context());

      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("location")).toBeNull();
      expect(await response.text()).toBe("");
      expect(state.calls.proof).toBe(0);
      expect(state.calls.service).toBe(0);
      expect(state.calls.reads).toEqual([]);
    });
  }

  test("wrong-customer reference and invalid Output identity fail closed", async () => {
    for (const customerView of [
      ready(OTHER_REFERENCE),
      ready(PUBLIC_REFERENCE, "not-an-output-uuid"),
    ]) {
      const state = harness(customerView as never);
      const response = await state.handler.get(request(), context());
      expect(response.status).toBe(404);
      expect(state.calls.proof).toBe(0);
      expect(state.calls.service).toBe(0);
    }
  });

  test("invalid route identity and query state are rejected before trusted lookup", async () => {
    for (const [routeRequest, routeContext] of [
      [request("?outputId=" + OUTPUT_ID), context()],
      [request(), context("NOVORA-CB-20260230-A540")],
      [request(), { params: Promise.resolve({}) }],
    ] as const) {
      const state = harness();
      const response = await state.handler.get(routeRequest, routeContext);
      expect(response.status).toBe(404);
      expect(state.calls.view).toEqual([]);
      expect(state.calls.proof).toBe(0);
      expect(state.calls.service).toBe(0);
    }
  });

  test("protected service denial and internal exceptions remain opaque", async () => {
    const unavailableService: FirstPreviewGeneratedAssetDeliveryService = {
      kind: "unavailable",
      async read() {
        throw new Error("must not run");
      },
    };
    const handler = createFirstPreviewCurrentAssetRouteHandler({
      async readCustomerView() {
        return ready();
      },
      async readAccessProof() {
        return ACCESS_PROOF;
      },
      async createService() {
        return unavailableService;
      },
    });
    const response = await handler.get(request(), context());
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");

    const throwing = createFirstPreviewCurrentAssetRouteHandler({
      async readCustomerView() {
        throw new Error("PRIVATE_DATABASE_DETAIL");
      },
      async readAccessProof() {
        throw new Error("must not run");
      },
      async createService() {
        throw new Error("must not run");
      },
    });
    const thrownResponse = await throwing.get(request(), context());
    expect(thrownResponse.status).toBe(404);
    expect(await thrownResponse.text()).toBe("");
  });

  test("unsupported methods never resolve state, proof, or Storage", () => {
    const state = harness();
    const response = state.handler.unsupported();
    expect(response.status).toBe(405);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(state.calls.view).toEqual([]);
    expect(state.calls.proof).toBe(0);
    expect(state.calls.service).toBe(0);
  });
});
