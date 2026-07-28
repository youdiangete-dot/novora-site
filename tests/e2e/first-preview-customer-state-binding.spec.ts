import Module, { createRequire } from "node:module";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  createFirstPreviewCustomerAccessProof,
} from "../../lib/server/ai-sketch/first-preview-customer-access-contract";
import {
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
} from "../../lib/server/ai-sketch/first-preview-persistence-contract";
import type {
  FirstPreviewCustomerStateBindingDependencies,
  FirstPreviewCustomerStateBindingRequest,
  FirstPreviewCustomerStateLookup,
  FirstPreviewCustomerStateSource,
} from "../../lib/server/ai-sketch/first-preview-customer-state-binding";

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
    "first-preview-customer-state-binding.spec.ts",
  ),
);
const { readFirstPreviewCustomerState } = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/first-preview-customer-state-binding",
    ) as typeof import("../../lib/server/ai-sketch/first-preview-customer-state-binding"),
);

const SECRET =
  "novora-test-only-state-binding-signing-secret-000000000000000";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const JOB_1_ID = "323e4567-e89b-42d3-a456-426614174000";
const JOB_2_ID = "423e4567-e89b-42d3-a456-426614174000";
const OUTPUT_1_ID = "523e4567-e89b-42d3-a456-426614174000";
const OUTPUT_2_ID = "623e4567-e89b-42d3-a456-426614174000";
const PUBLIC_REFERENCE = "NOVORA-CB-20260728-A720";
const OTHER_REFERENCE = "NOVORA-CB-20260728-B721";
const NOW_ISO = "2026-07-28T00:00:30.000Z";
const NOW = Date.parse(NOW_ISO) / 1_000;
const PENDING_EXPIRY = "2026-07-28T00:00:40.000Z";
const DESIGN_SPEC_SHA256 = "a".repeat(64);
const INSTRUCTION_SHA256 = "b".repeat(64);

function proof(
  overrides: Partial<{
    briefId: string;
    publicReference: string;
    issuedAt: number;
    expiresAt: number;
  }> = {},
): string {
  const value = createFirstPreviewCustomerAccessProof(
    {
      briefId: BRIEF_ID,
      publicReference: PUBLIC_REFERENCE,
      nonce: "state_binding_nonce_72D",
      issuedAt: NOW - 60,
      expiresAt: NOW + 1_740,
      ...overrides,
    },
    SECRET,
  );
  if (!value) throw new Error("synthetic access proof must be valid");
  return value;
}

function cookieHeader(value = proof()): string {
  return `ordinary_cookie=ignored; ${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}=${value}`;
}

function request(
  overrides: Partial<FirstPreviewCustomerStateBindingRequest> = {},
): FirstPreviewCustomerStateBindingRequest {
  return {
    publicReference: PUBLIC_REFERENCE,
    cookieHeader: cookieHeader(),
    ...overrides,
  };
}

function gates(overrides: Record<string, unknown> = {}) {
  return {
    accessControlPassed: true,
    assetValid: true,
    complexCase: false,
    contentSafetyPassed: true,
    lifecycleEligible: true,
    lowConfidence: false,
    outputValid: true,
    ownershipConsistent: true,
    privacyPassed: true,
    ...overrides,
  };
}

function attemptOneSucceeded(overrides: Record<string, unknown> = {}) {
  return {
    id: JOB_1_ID,
    conceptBriefId: BRIEF_ID,
    generationPurpose: "first_preview",
    lineageIdentity: FIRST_PREVIEW_LINEAGE_IDENTITY,
    attemptNumber: 1,
    parentJobId: null,
    sourceOutputId: null,
    designSpecVersion: "novora_design_spec_v1",
    designSpecSha256: DESIGN_SPEC_SHA256,
    handSketchInstructionVersion: "novora_hand_sketch_instruction_v1",
    handSketchInstructionSha256: INSTRUCTION_SHA256,
    status: "succeeded",
    failureCategory: null,
    retryEligible: null,
    createdAt: "2026-07-28T00:00:00.000Z",
    startedAt: "2026-07-28T00:00:01.000Z",
    deadlineAt: "2026-07-28T00:00:20.000Z",
    completedAt: "2026-07-28T00:00:08.000Z",
    failedAt: null,
    cancelledAt: null,
    timedOutAt: null,
    ...overrides,
  };
}

function attemptOneRetryableFailure(
  overrides: Record<string, unknown> = {},
) {
  return {
    ...attemptOneSucceeded(),
    status: "failed",
    failureCategory: "provider_unavailable",
    retryEligible: true,
    completedAt: null,
    failedAt: "2026-07-28T00:00:05.000Z",
    ...overrides,
  };
}

function attemptOneProcessing(overrides: Record<string, unknown> = {}) {
  return {
    ...attemptOneSucceeded(),
    status: "processing",
    failureCategory: null,
    retryEligible: null,
    deadlineAt: "2026-07-28T00:00:35.000Z",
    completedAt: null,
    failedAt: null,
    cancelledAt: null,
    timedOutAt: null,
    ...overrides,
  };
}

function attemptTwoSucceeded(overrides: Record<string, unknown> = {}) {
  return {
    ...attemptOneSucceeded(),
    id: JOB_2_ID,
    attemptNumber: 2,
    parentJobId: JOB_1_ID,
    createdAt: "2026-07-28T00:00:06.000Z",
    startedAt: "2026-07-28T00:00:07.000Z",
    deadlineAt: "2026-07-28T00:00:25.000Z",
    completedAt: "2026-07-28T00:00:15.000Z",
    ...overrides,
  };
}

function attemptOneOutput(overrides: Record<string, unknown> = {}) {
  return {
    id: OUTPUT_1_ID,
    jobId: JOB_1_ID,
    conceptBriefId: BRIEF_ID,
    attemptNumber: 1,
    assetPersisted: true,
    assetCreatedAt: "2026-07-28T00:00:03.000Z",
    assetValidatedAt: "2026-07-28T00:00:04.000Z",
    createdAt: "2026-07-28T00:00:05.000Z",
    automaticGatePassedAt: "2026-07-28T00:00:09.000Z",
    automaticGatePolicyVersion:
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
    readyAt: "2026-07-28T00:00:10.000Z",
    readinessStatus: "first_preview_ready",
    isCurrentCustomerPreview: true,
    revokedAt: null,
    gates: gates(),
    ...overrides,
  };
}

function attemptTwoOutput(overrides: Record<string, unknown> = {}) {
  return {
    ...attemptOneOutput(),
    id: OUTPUT_2_ID,
    jobId: JOB_2_ID,
    attemptNumber: 2,
    assetCreatedAt: "2026-07-28T00:00:08.000Z",
    assetValidatedAt: "2026-07-28T00:00:09.000Z",
    createdAt: "2026-07-28T00:00:10.000Z",
    automaticGatePassedAt: "2026-07-28T00:00:16.000Z",
    readyAt: "2026-07-28T00:00:17.000Z",
    ...overrides,
  };
}

function readySnapshot(overrides: Record<string, unknown> = {}) {
  return {
    conceptBriefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    pendingExpiresAt: null,
    jobs: [attemptOneSucceeded()],
    outputs: [attemptOneOutput()],
    ...overrides,
  };
}

function pendingSnapshot(overrides: Record<string, unknown> = {}) {
  return {
    conceptBriefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    pendingExpiresAt: PENDING_EXPIRY,
    jobs: [],
    outputs: [],
    ...overrides,
  };
}

class FakeStateSource implements FirstPreviewCustomerStateSource {
  readonly lookups: FirstPreviewCustomerStateLookup[] = [];
  calls = 0;

  constructor(readonly result: unknown) {}

  readExactCustomerFirstPreviewState = async (
    lookup: FirstPreviewCustomerStateLookup,
  ): Promise<unknown> => {
    this.calls += 1;
    this.lookups.push({ ...lookup });
    return this.result;
  };
}

function dependencies(
  sourceResult: unknown,
  overrides: Partial<FirstPreviewCustomerStateBindingDependencies> = {},
) {
  let constructions = 0;
  let source: FakeStateSource | null = null;
  const value: FirstPreviewCustomerStateBindingDependencies = {
    clock: () => NOW,
    signingSecret: SECRET,
    stateSourceFactory: () => {
      constructions += 1;
      source = new FakeStateSource(sourceResult);
      return source;
    },
    ...overrides,
  };
  return {
    value,
    constructions: () => constructions,
    source: () => source,
  };
}

async function read(
  sourceResult: unknown,
  requestValue: FirstPreviewCustomerStateBindingRequest = request(),
  dependencyOverrides: Partial<FirstPreviewCustomerStateBindingDependencies> = {},
) {
  const deps = dependencies(sourceResult, dependencyOverrides);
  const result = await readFirstPreviewCustomerState(
    requestValue,
    deps.value,
  );
  return { result, deps };
}

function invalidRequest(value: unknown): FirstPreviewCustomerStateBindingRequest {
  return value as FirstPreviewCustomerStateBindingRequest;
}

function expectUnavailable(result: unknown) {
  expect(result).toEqual({ state: "unavailable" });
  expect(Object.keys(result as object)).toEqual(["state"]);
}

function expectDenied(result: unknown) {
  expect(result).toEqual({ state: "denied" });
  expect(Object.keys(result as object)).toEqual(["state"]);
}

test.describe("server-only First Preview customer state binding", () => {
  test("returns ready for one exact fully gated lineage", async () => {
    const { result, deps } = await read(readySnapshot());
    expect(result).toEqual({
      state: "ready",
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_1_ID,
    });
    expect(deps.constructions()).toBe(1);
    expect(deps.source()?.calls).toBe(1);
    expect(deps.source()?.lookups).toEqual([
      {
        conceptBriefId: BRIEF_ID,
        publicReference: PUBLIC_REFERENCE,
      },
    ]);
  });

  test("ready discloses only publicReference and outputId", async () => {
    const { result } = await read(readySnapshot());
    expect(Object.keys(result).sort()).toEqual([
      "outputId",
      "publicReference",
      "state",
    ]);
    const serialized = JSON.stringify(result).toLowerCase();
    for (const forbidden of [
      BRIEF_ID,
      JOB_1_ID,
      "storage",
      "bucket",
      "provider",
      "prompt",
      "secret",
      "reviewer",
      "admin",
      "contact",
      "email",
      "approved_for_customer",
    ]) {
      expect(serialized).not.toContain(forbidden.toLowerCase());
    }
  });

  test("uses only the exact frozen cookie name", async () => {
    const valid = await read(readySnapshot());
    expect(valid.result.state).toBe("ready");

    for (const cookieHeaderValue of [
      proof(),
      `novora_first_preview_access=${proof()}`,
      `__Secure-novora_first_preview_access=${proof()}`,
      `${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME.toUpperCase()}=${proof()}`,
      "",
    ]) {
      const attempt = await read(
        readySnapshot(),
        request({ cookieHeader: cookieHeaderValue }),
      );
      expectDenied(attempt.result);
      expect(attempt.deps.constructions()).toBe(0);
    }
  });

  test("accepts strict ordinary-cookie separation and exact access-cookie casing", async () => {
    for (const cookieHeaderValue of [
      `ordinary_cookie=value; ${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}=${proof()}`,
      `ordinary_cookie=value; \t${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}=${proof()}`,
    ]) {
      const attempt = await read(
        readySnapshot(),
        request({ cookieHeader: cookieHeaderValue }),
      );
      expect(attempt.result.state).toBe("ready");
      expect(attempt.deps.constructions()).toBe(1);
      expect(attempt.deps.source()?.calls).toBe(1);
    }
  });

  test("strict Cookie grammar denies every malformed segment before any source exists", async () => {
    const accessCookie =
      `${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}=${proof()}`;
    const malformedHeaders = [
      `bad name=value; ${accessCookie}`,
      `${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME} =${proof()}`,
      `${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}= ${proof()}`,
      `ordinary_cookie=value ; ${accessCookie}`,
      `ordinary_cookie=bad value; ${accessCookie}`,
      `ordinary_cookie="quoted"; ${accessCookie}`,
      `ordinary_cookie=bad,value; ${accessCookie}`,
      `ordinary_cookie=bad\\value; ${accessCookie}`,
      `ordinary_cookie=value;; ${accessCookie}`,
      `ordinary_cookie; ${accessCookie}`,
      `ordinary_cookie=value; ${accessCookie};`,
      `${accessCookie}; ${accessCookie}`,
      `ordinary_cookie=value\r; ${accessCookie}`,
      `ordinary_cookie=value\n; ${accessCookie}`,
      `ordinary_cookie=value\0; ${accessCookie}`,
    ];

    for (const cookieHeaderValue of malformedHeaders) {
      const deps = dependencies(readySnapshot());
      const result = await readFirstPreviewCustomerState(
        request({ cookieHeader: cookieHeaderValue }),
        deps.value,
      );
      expectDenied(result);
      expect(deps.constructions()).toBe(0);
      expect(deps.source()).toBeNull();
    }
  });

  test("rejects query-like, bearer-like, and direct proof request fields", async () => {
    for (const extra of [
      { accessProof: proof() },
      { authorization: `Bearer ${proof()}` },
      { query: { access: proof() } },
    ]) {
      const attempt = await read(
        readySnapshot(),
        invalidRequest({ ...request(), ...extra }),
      );
      expectDenied(attempt.result);
      expect(attempt.deps.constructions()).toBe(0);
    }
  });

  test("constructs and invokes no source before a valid proof", async () => {
    for (const requestValue of [
      request({ cookieHeader: null }),
      request({ cookieHeader: "ordinary_cookie=value" }),
      request({
        cookieHeader: `${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}=invalid.proof`,
      }),
      request({
        cookieHeader: `${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}=${proof()}; ${FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME}=${proof()}`,
      }),
      request({
        publicReference: OTHER_REFERENCE,
        cookieHeader: cookieHeader(),
      }),
    ]) {
      const deps = dependencies(readySnapshot(), {
        stateSourceFactory: () => {
          throw new Error("SOURCE_MUST_NOT_BE_CONSTRUCTED");
        },
      });
      const result = await readFirstPreviewCustomerState(
        requestValue,
        deps.value,
      );
      expectDenied(result);
      expect(deps.constructions()).toBe(0);
    }
  });

  test("denies cross-customer source evidence without disclosure", async () => {
    for (const snapshot of [
      readySnapshot({ conceptBriefId: OTHER_BRIEF_ID }),
      readySnapshot({ publicReference: OTHER_REFERENCE }),
    ]) {
      const { result } = await read(snapshot);
      expectDenied(result);
      expect(JSON.stringify(result)).not.toContain(OTHER_BRIEF_ID);
      expect(JSON.stringify(result)).not.toContain(OTHER_REFERENCE);
    }
  });

  test("future failed evidence is unavailable, never retry-pending", async () => {
    const { result } = await read(
      pendingSnapshot({
        jobs: [
          attemptOneRetryableFailure({
            deadlineAt: "2026-07-28T00:00:35.000Z",
            failedAt: "2026-07-28T00:00:31.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("future completed evidence is unavailable", async () => {
    const { result } = await read(
      pendingSnapshot({
        jobs: [
          attemptOneSucceeded({
            deadlineAt: "2026-07-28T00:00:35.000Z",
            completedAt: "2026-07-28T00:00:31.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("future automatic-gate evidence is unavailable", async () => {
    const { result } = await read(
      readySnapshot({
        outputs: [
          attemptOneOutput({
            automaticGatePassedAt: "2026-07-28T00:00:40.000Z",
            readyAt: "2026-07-28T00:00:40.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("future ready evidence is unavailable", async () => {
    const { result } = await read(
      readySnapshot({
        outputs: [
          attemptOneOutput({
            readyAt: "2026-07-28T00:00:40.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("future asset and lifecycle evidence cannot authorize disclosure", async () => {
    for (const snapshot of [
      pendingSnapshot({
        jobs: [
          attemptOneSucceeded({
            createdAt: "2026-07-28T00:00:31.000Z",
            startedAt: "2026-07-28T00:00:31.000Z",
            completedAt: "2026-07-28T00:00:31.000Z",
            deadlineAt: "2026-07-28T00:00:35.000Z",
          }),
        ],
      }),
      readySnapshot({
        outputs: [
          attemptOneOutput({
            assetCreatedAt: "2026-07-28T00:00:31.000Z",
            assetValidatedAt: "2026-07-28T00:00:31.000Z",
            createdAt: "2026-07-28T00:00:31.000Z",
            automaticGatePassedAt: "2026-07-28T00:00:31.000Z",
            readyAt: "2026-07-28T00:00:31.000Z",
          }),
        ],
      }),
    ]) {
      expectUnavailable((await read(snapshot)).result);
    }
  });

  test("future started evidence cannot create a processing pending state", async () => {
    const { result } = await read(
      pendingSnapshot({
        jobs: [
          attemptOneProcessing({
            createdAt: "2026-07-28T00:00:29.000Z",
            startedAt: "2026-07-28T00:00:31.000Z",
            deadlineAt: "2026-07-28T00:00:35.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("a future deadline bounds legal processing pending without becoming event evidence", async () => {
    const { result } = await read(
      pendingSnapshot({
        jobs: [attemptOneProcessing()],
      }),
    );
    expect(result).toEqual({ state: "pending" });
  });

  test("processing remains pending one second before its future deadline", async () => {
    const { result } = await read(
      pendingSnapshot({
        jobs: [
          attemptOneProcessing({
            deadlineAt: "2026-07-28T00:00:35.000Z",
          }),
        ],
      }),
      request(),
      {
        clock: () => Date.parse("2026-07-28T00:00:34.000Z") / 1_000,
      },
    );
    expect(result).toEqual({ state: "pending" });
  });

  test("processing is unavailable exactly at and after its deadline", async () => {
    for (const observation of [
      "2026-07-28T00:00:35.000Z",
      "2026-07-28T00:00:36.000Z",
    ]) {
      const { result } = await read(
        pendingSnapshot({
          jobs: [attemptOneProcessing()],
        }),
        request(),
        {
          clock: () => Date.parse(observation) / 1_000,
        },
      );
      expectUnavailable(result);
    }
  });

  test("processing requires startedAt to be strictly before deadlineAt", async () => {
    for (const startedAt of [
      "2026-07-28T00:00:35.000Z",
      "2026-07-28T00:00:36.000Z",
    ]) {
      const { result } = await read(
        pendingSnapshot({
          jobs: [
            attemptOneProcessing({
              startedAt,
              deadlineAt: "2026-07-28T00:00:35.000Z",
            }),
          ],
        }),
        request(),
        {
          clock: () => Date.parse("2026-07-28T00:00:34.000Z") / 1_000,
        },
      );
      expectUnavailable(result);
    }
  });

  test("a future deadline never authorizes ready disclosure", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [
          attemptOneSucceeded({
            deadlineAt: "2026-07-28T00:00:35.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("protects every cross-attempt causal timestamp comparison", async () => {
    const mutations = [
      { name: "created", overrides: { createdAt: "2026-07-28T00:00:04.000Z" } },
      {
        name: "started",
        overrides: {
          createdAt: "2026-07-28T00:00:03.000Z",
          startedAt: "2026-07-28T00:00:04.000Z",
        },
      },
      {
        name: "deadline",
        overrides: {
          createdAt: "2026-07-28T00:00:01.000Z",
          startedAt: "2026-07-28T00:00:02.000Z",
          completedAt: "2026-07-28T00:00:03.000Z",
          deadlineAt: "2026-07-28T00:00:04.000Z",
        },
      },
      {
        name: "terminal",
        overrides: {
          createdAt: "2026-07-28T00:00:01.000Z",
          startedAt: "2026-07-28T00:00:02.000Z",
          completedAt: "2026-07-28T00:00:04.000Z",
        },
      },
    ];
    for (const mutation of mutations) {
      const { result } = await read(
        readySnapshot({
          jobs: [
            attemptOneRetryableFailure(),
            attemptTwoSucceeded(mutation.overrides),
          ],
          outputs: [attemptTwoOutput()],
        }),
      );
      expectUnavailable(result);
    }
  });

  test("requires exact parent and structured lineage across attempts", async () => {
    for (const attemptTwo of [
      attemptTwoSucceeded({ parentJobId: OTHER_BRIEF_ID }),
      attemptTwoSucceeded({ designSpecVersion: "novora_design_spec_v2" }),
      attemptTwoSucceeded({ designSpecSha256: "c".repeat(64) }),
      attemptTwoSucceeded({
        handSketchInstructionVersion: "novora_hand_sketch_instruction_v2",
      }),
      attemptTwoSucceeded({ handSketchInstructionSha256: "d".repeat(64) }),
      attemptTwoSucceeded({ generationPurpose: "regeneration" }),
    ]) {
      const { result } = await read(
        readySnapshot({
          jobs: [attemptOneRetryableFailure(), attemptTwo],
          outputs: [attemptTwoOutput()],
        }),
      );
      expectUnavailable(result);
    }
  });

  test("attempt 2 exists only after a legally retryable attempt-1 failure", async () => {
    for (const first of [
      attemptOneSucceeded(),
      attemptOneRetryableFailure({ retryEligible: false }),
      attemptOneRetryableFailure({
        retryEligible: true,
        failureCategory: "privacy_failure",
      }),
    ]) {
      const { result } = await read(
        readySnapshot({
          jobs: [first, attemptTwoSucceeded()],
          outputs: [attemptTwoOutput()],
        }),
      );
      expectUnavailable(result);
    }
  });

  test("duplicate Job UUID is unavailable with attempt 1 first", async () => {
    const { result } = await read(
      pendingSnapshot({
        jobs: [
          attemptOneRetryableFailure(),
          attemptTwoSucceeded({ id: JOB_1_ID }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("duplicate Job UUID is unavailable with attempt 2 first", async () => {
    const { result } = await read(
      pendingSnapshot({
        jobs: [
          attemptTwoSucceeded({ id: JOB_1_ID }),
          attemptOneRetryableFailure(),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("duplicate Job UUID cannot authorize an otherwise valid attempt-2 Output", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [
          attemptOneRetryableFailure(),
          attemptTwoSucceeded({ id: JOB_1_ID }),
        ],
        outputs: [attemptTwoOutput({ jobId: JOB_1_ID })],
      }),
    );
    expectUnavailable(result);
  });

  test("two distinct Job UUIDs preserve a valid attempt-2 ready lineage", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [attemptOneRetryableFailure(), attemptTwoSucceeded()],
        outputs: [attemptTwoOutput()],
      }),
    );
    expect(result).toEqual({
      state: "ready",
      publicReference: PUBLIC_REFERENCE,
      outputId: OUTPUT_2_ID,
    });
  });

  test("a retryable-looking attempt-2 failure is unavailable because no third attempt is legal", async () => {
    const attemptTwoFailed = attemptTwoSucceeded({
      status: "failed",
      failureCategory: "provider_unavailable",
      retryEligible: true,
      completedAt: null,
      failedAt: "2026-07-28T00:00:15.000Z",
    });
    const { result } = await read(
      pendingSnapshot({
        jobs: [attemptOneRetryableFailure(), attemptTwoFailed],
      }),
    );
    expectUnavailable(result);
  });

  test("enforces completed_at less than or equal to deadline_at", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [
          attemptOneSucceeded({
            completedAt: "2026-07-28T00:00:21.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("accepts completed before gate before ready", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [
          attemptOneSucceeded({
            completedAt: "2026-07-28T00:00:08.000Z",
          }),
        ],
        outputs: [
          attemptOneOutput({
            automaticGatePassedAt: "2026-07-28T00:00:09.000Z",
            readyAt: "2026-07-28T00:00:10.000Z",
          }),
        ],
      }),
    );
    expect(result.state).toBe("ready");
  });

  test("accepts Job completion exactly at the automatic gate boundary", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [
          attemptOneSucceeded({
            completedAt: "2026-07-28T00:00:09.000Z",
          }),
        ],
        outputs: [
          attemptOneOutput({
            automaticGatePassedAt: "2026-07-28T00:00:09.000Z",
            readyAt: "2026-07-28T00:00:10.000Z",
          }),
        ],
      }),
    );
    expect(result.state).toBe("ready");
  });

  test("gate before Job completion is unavailable", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [
          attemptOneSucceeded({
            completedAt: "2026-07-28T00:00:10.000Z",
          }),
        ],
        outputs: [
          attemptOneOutput({
            automaticGatePassedAt: "2026-07-28T00:00:09.000Z",
            readyAt: "2026-07-28T00:00:11.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("ready before Job completion is unavailable", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [
          attemptOneSucceeded({
            completedAt: "2026-07-28T00:00:10.000Z",
          }),
        ],
        outputs: [
          attemptOneOutput({
            automaticGatePassedAt: "2026-07-28T00:00:08.000Z",
            readyAt: "2026-07-28T00:00:09.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("ready before the automatic gate is unavailable", async () => {
    const { result } = await read(
      readySnapshot({
        outputs: [
          attemptOneOutput({
            automaticGatePassedAt: "2026-07-28T00:00:11.000Z",
            readyAt: "2026-07-28T00:00:10.000Z",
          }),
        ],
      }),
    );
    expectUnavailable(result);
  });

  test("enforces created <= started <= terminal <= deadline", async () => {
    for (const job of [
      attemptOneSucceeded({
        createdAt: "2026-07-28T00:00:02.000Z",
      }),
      attemptOneSucceeded({
        completedAt: "2026-07-28T00:00:00.000Z",
      }),
      attemptOneSucceeded({
        completedAt: "2026-07-28T00:00:21.000Z",
      }),
    ]) {
      expectUnavailable(
        (
          await read(
            readySnapshot({
              jobs: [job],
            }),
          )
        ).result,
      );
    }
  });

  test("enforces asset_created <= asset_validated <= gate <= ready", async () => {
    for (const output of [
      attemptOneOutput({
        assetCreatedAt: "2026-07-28T00:00:05.000Z",
      }),
      attemptOneOutput({
        assetValidatedAt: "2026-07-28T00:00:10.000Z",
      }),
      attemptOneOutput({
        automaticGatePassedAt: "2026-07-28T00:00:11.000Z",
        readyAt: "2026-07-28T00:00:10.000Z",
      }),
    ]) {
      expectUnavailable(
        (
          await read(
            readySnapshot({
              outputs: [output],
            }),
          )
        ).result,
      );
    }
  });

  test("requires Output chronology compatible with its exact Job", async () => {
    for (const output of [
      attemptOneOutput({ jobId: JOB_2_ID }),
      attemptOneOutput({ attemptNumber: 2 }),
      attemptOneOutput({
        assetCreatedAt: "2026-07-28T00:00:00.000Z",
      }),
      attemptOneOutput({
        createdAt: "2026-07-28T00:00:09.000Z",
      }),
    ]) {
      expectUnavailable(
        (
          await read(
            readySnapshot({
              outputs: [output],
            }),
          )
        ).result,
      );
    }
  });

  test("pending has one exact finite expiry boundary", async () => {
    const before = await read(pendingSnapshot(), request(), {
      clock: () => Date.parse("2026-07-28T00:00:39.000Z") / 1_000,
    });
    expect(before.result).toEqual({ state: "pending" });

    const atBoundary = await read(pendingSnapshot(), request(), {
      clock: () => Date.parse(PENDING_EXPIRY) / 1_000,
    });
    expectUnavailable(atBoundary.result);

    const after = await read(pendingSnapshot(), request(), {
      clock: () => Date.parse("2026-07-28T00:00:41.000Z") / 1_000,
    });
    expectUnavailable(after.result);
  });

  test("rejects missing, noncanonical, or proof-ambiguous pending expiry", async () => {
    for (const pendingExpiresAt of [
      null,
      "2026-07-28T00:00:40Z",
      "2026-07-28T00:00:40.000+00:00",
      "not-a-timestamp",
      "2026-07-28T00:30:30.000Z",
    ]) {
      const { result } = await read(
        pendingSnapshot({ pendingExpiresAt }),
      );
      expectUnavailable(result);
    }
  });

  test("allows at most two attempts and exactly one ready output", async () => {
    const thirdJob = {
      ...attemptTwoSucceeded(),
      id: "723e4567-e89b-42d3-a456-426614174000",
    };
    for (const snapshot of [
      readySnapshot({
        jobs: [
          attemptOneRetryableFailure(),
          attemptTwoSucceeded(),
          thirdJob,
        ],
        outputs: [attemptTwoOutput()],
      }),
      readySnapshot({
        jobs: [attemptOneSucceeded()],
        outputs: [
          attemptOneOutput(),
          attemptOneOutput({ id: OUTPUT_2_ID }),
        ],
      }),
      readySnapshot({
        jobs: [attemptOneSucceeded(), attemptOneSucceeded({ id: JOB_2_ID })],
      }),
    ]) {
      expectUnavailable((await read(snapshot)).result);
    }
  });

  test("rejects extra string own keys on Job and Output arrays", async () => {
    const jobs = [attemptOneSucceeded()];
    const outputs = [attemptOneOutput()];
    Object.defineProperty(jobs, "extra", {
      value: "unexpected",
      enumerable: true,
    });
    Object.defineProperty(outputs, "extra", {
      value: "unexpected",
      enumerable: true,
    });

    expectUnavailable(
      (
        await read(
          readySnapshot({
            jobs,
            outputs: [attemptOneOutput()],
          }),
        )
      ).result,
    );
    expectUnavailable(
      (
        await read(
          readySnapshot({
            jobs: [attemptOneSucceeded()],
            outputs,
          }),
        )
      ).result,
    );
  });

  test("rejects symbol own keys on authority-bearing arrays", async () => {
    const jobs = [attemptOneSucceeded()];
    const outputs = [attemptOneOutput()];
    Object.defineProperty(jobs, Symbol("unexpected-job-key"), {
      value: true,
      enumerable: true,
    });
    Object.defineProperty(outputs, Symbol("unexpected-output-key"), {
      value: true,
      enumerable: true,
    });

    expectUnavailable(
      (
        await read(
          readySnapshot({
            jobs,
          }),
        )
      ).result,
    );
    expectUnavailable(
      (
        await read(
          readySnapshot({
            outputs,
          }),
        )
      ).result,
    );
  });

  test("rejects sparse Job and Output arrays", async () => {
    const sparseJobs = new Array(1);
    const sparseOutputs = new Array(1);
    expectUnavailable(
      (
        await read(
          readySnapshot({
            jobs: sparseJobs,
          }),
        )
      ).result,
    );
    expectUnavailable(
      (
        await read(
          readySnapshot({
            outputs: sparseOutputs,
          }),
        )
      ).result,
    );
  });

  test("rejects accessor array indices without invoking them", async () => {
    let jobGetterCalls = 0;
    let outputGetterCalls = 0;
    const accessorJobs = new Array(1);
    const accessorOutputs = new Array(1);
    Object.defineProperty(accessorJobs, "0", {
      enumerable: true,
      configurable: true,
      get: () => {
        jobGetterCalls += 1;
        return attemptOneSucceeded();
      },
    });
    Object.defineProperty(accessorOutputs, "0", {
      enumerable: true,
      configurable: true,
      get: () => {
        outputGetterCalls += 1;
        return attemptOneOutput();
      },
    });

    expectUnavailable(
      (
        await read(
          readySnapshot({
            jobs: accessorJobs,
          }),
        )
      ).result,
    );
    expectUnavailable(
      (
        await read(
          readySnapshot({
            outputs: accessorOutputs,
          }),
        )
      ).result,
    );
    expect(jobGetterCalls).toBe(0);
    expect(outputGetterCalls).toBe(0);
  });

  test("rejects Proxy arrays and custom Array prototypes", async () => {
    const proxiedJobs = new Proxy([attemptOneSucceeded()], {});
    const proxiedOutputs = new Proxy([attemptOneOutput()], {});
    const customPrototypeJobs = [attemptOneSucceeded()];
    const customPrototypeOutputs = [attemptOneOutput()];
    Object.setPrototypeOf(
      customPrototypeJobs,
      Object.create(Array.prototype),
    );
    Object.setPrototypeOf(
      customPrototypeOutputs,
      Object.create(Array.prototype),
    );

    for (const snapshot of [
      readySnapshot({ jobs: proxiedJobs }),
      readySnapshot({ outputs: proxiedOutputs }),
      readySnapshot({ jobs: customPrototypeJobs }),
      readySnapshot({ outputs: customPrototypeOutputs }),
    ]) {
      expectUnavailable((await read(snapshot)).result);
    }
  });

  test("accepts normal dense exact arrays for a distinct two-Job lineage", async () => {
    const { result } = await read(
      readySnapshot({
        jobs: [attemptOneRetryableFailure(), attemptTwoSucceeded()],
        outputs: [attemptTwoOutput()],
      }),
    );
    expect(result.state).toBe("ready");
  });

  test("low-confidence, complex, unsafe, invalid, or ambiguous gates fail closed", async () => {
    for (const gateMutation of [
      { lowConfidence: true },
      { complexCase: true },
      { contentSafetyPassed: false },
      { privacyPassed: false },
      { accessControlPassed: false },
      { assetValid: false },
      { outputValid: false },
      { ownershipConsistent: false },
      { lifecycleEligible: false },
    ]) {
      const { result } = await read(
        readySnapshot({
          outputs: [
            attemptOneOutput({
              gates: gates(gateMutation),
            }),
          ],
        }),
      );
      expectUnavailable(result);
    }

    expectUnavailable(
      (
        await read(
          readySnapshot({
            outputs: [
              attemptOneOutput({
                automaticGatePolicyVersion: "unknown_gate_policy",
              }),
            ],
          }),
        )
      ).result,
    );
  });

  test("does not require human pre-approval or approved_for_customer", async () => {
    const snapshot = readySnapshot();
    expect(JSON.stringify(snapshot)).not.toContain("approved_for_customer");
    expect((await read(snapshot)).result.state).toBe("ready");
  });

  test("normalizes source construction, invocation, and evidence errors", async () => {
    const construction = dependencies(readySnapshot(), {
      stateSourceFactory: () => {
        throw new Error("private constructor failure");
      },
    });
    expectUnavailable(
      await readFirstPreviewCustomerState(request(), construction.value),
    );

    const invocation = dependencies(readySnapshot(), {
      stateSourceFactory: () => ({
        readExactCustomerFirstPreviewState: () => {
          throw new Error("private source failure");
        },
      }),
    });
    expectUnavailable(
      await readFirstPreviewCustomerState(request(), invocation.value),
    );

    expectUnavailable((await read({ state: "ready" })).result);
  });
});
