import { createHmac } from "node:crypto";
import Module, { createRequire } from "node:module";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM,
  FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION,
  createFirstPreviewCustomerAccessProof,
  verifyFirstPreviewCustomerAccessProof,
} from "../../lib/server/ai-sketch/first-preview-customer-access-contract";
import type {
  FirstPreviewCustomerSessionIssuanceInput,
} from "../../lib/server/ai-sketch/first-preview-customer-session";
import type {
  FirstPreviewCustomerPreviewStateLookup,
  FirstPreviewCustomerPreviewStateSource,
  FirstPreviewCustomerViewDependencies,
  FirstPreviewCustomerViewRequest,
} from "../../lib/server/ai-sketch/first-preview-customer-view";

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
    "instant-first-preview-customer-flow.spec.ts",
  ),
);
const { issueFirstPreviewCustomerSession } = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/first-preview-customer-session",
    ) as typeof import("../../lib/server/ai-sketch/first-preview-customer-session"),
);
const {
  FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
  readFirstPreviewCustomerView,
} = loadWithServerOnlyTestShim(
  () =>
    testRequire(
      "../../lib/server/ai-sketch/first-preview-customer-view",
    ) as typeof import("../../lib/server/ai-sketch/first-preview-customer-view"),
);

const NOW = 1_785_283_200;
const SECRET =
  "novora-test-only-customer-session-signing-secret-000000000000";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const OTHER_REFERENCE = "NOVORA-CB-20260723-B640";
const NONCE = "session_nonce_7iJ9vH2mQ4xK";
const OUTPUT_ID = "323e4567-e89b-42d3-a456-426614174000";
const OTHER_OUTPUT_ID = "423e4567-e89b-42d3-a456-426614174000";

function sessionInput(
  overrides: Partial<FirstPreviewCustomerSessionIssuanceInput> = {},
): FirstPreviewCustomerSessionIssuanceInput {
  return {
    confirmedPersistence: true,
    conceptBriefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    signingSecret: SECRET,
    clock: () => NOW,
    nonceSource: () => NONCE,
    ...overrides,
  };
}

function issue(
  input: FirstPreviewCustomerSessionIssuanceInput = sessionInput(),
) {
  return issueFirstPreviewCustomerSession(input);
}

function issuedCookie(
  input: FirstPreviewCustomerSessionIssuanceInput = sessionInput(),
) {
  const result = issue(input);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("synthetic session issuance must succeed");
  return result.cookie;
}

function claimsFromProof(proof: string): Record<string, unknown> {
  const [payload] = proof.split(".");
  return JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as Record<string, unknown>;
}

function invalidInput(
  value: unknown,
): FirstPreviewCustomerSessionIssuanceInput {
  return value as FirstPreviewCustomerSessionIssuanceInput;
}

function expectOpaqueSessionDenial(result: unknown) {
  expect(result).toEqual({ ok: false, code: "session_denied" });
  const serialized = JSON.stringify(result);
  for (const sensitive of [
    SECRET,
    NONCE,
    BRIEF_ID,
    PUBLIC_REFERENCE,
    "eyJ",
    "signature",
    "stack",
  ]) {
    expect(serialized).not.toContain(sensitive);
  }
}

test.describe("server-only First Preview customer session issuance", () => {
  test("issues a valid session only after confirmed persistence", () => {
    const cookie = issuedCookie();
    const claims = verifyFirstPreviewCustomerAccessProof(
      cookie.value,
      SECRET,
      NOW,
    );
    expect(claims).not.toBeNull();
  });

  test("issues before any Job exists", () => {
    const input = sessionInput();
    expect(input).not.toHaveProperty("jobId");
    expect(issue(input).ok).toBe(true);
  });

  test("issues before any Output exists", () => {
    const input = sessionInput();
    expect(input).not.toHaveProperty("outputId");
    expect(issue(input).ok).toBe(true);
  });

  test("binds the exact Concept Brief UUID", () => {
    const first = claimsFromProof(issuedCookie().value);
    const second = claimsFromProof(
      issuedCookie(sessionInput({ conceptBriefId: OTHER_BRIEF_ID })).value,
    );
    expect(first.briefId).toBe(BRIEF_ID);
    expect(second.briefId).toBe(OTHER_BRIEF_ID);
    expect(first.briefId).not.toBe(second.briefId);
  });

  test("binds the exact public reference", () => {
    const first = claimsFromProof(issuedCookie().value);
    const second = claimsFromProof(
      issuedCookie(sessionInput({ publicReference: OTHER_REFERENCE })).value,
    );
    expect(first.publicReference).toBe(PUBLIC_REFERENCE);
    expect(second.publicReference).toBe(OTHER_REFERENCE);
  });

  test("does not put outputId in the proof", () => {
    expect(claimsFromProof(issuedCookie().value)).not.toHaveProperty("outputId");
    expectOpaqueSessionDenial(
      issue(
        invalidInput({
          ...sessionInput(),
          outputId: "423e4567-e89b-42d3-a456-426614174000",
        }),
      ),
    );
  });

  test("uses the fixed version, algorithm, audience, and scope", () => {
    expect(claimsFromProof(issuedCookie().value)).toMatchObject({
      v: FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION,
      alg: FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM,
      aud: FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
      scope: FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
    });
  });

  test("allows but never exceeds the approved maximum lifetime", () => {
    const cookie = issuedCookie(
      sessionInput({
        lifetimeSeconds:
          FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
      }),
    );
    const claims = claimsFromProof(cookie.value);
    expect(Number(claims.exp) - Number(claims.iat)).toBe(
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
    );
    expect(cookie.maxAge).toBe(
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
    );
  });

  test("has no sliding lifetime behavior", () => {
    const cookie = issuedCookie();
    const claims = claimsFromProof(cookie.value);
    const expiry = Number(claims.exp);
    expect(
      verifyFirstPreviewCustomerAccessProof(
        cookie.value,
        SECRET,
        expiry - 1,
      ),
    ).not.toBeNull();
    expect(
      verifyFirstPreviewCustomerAccessProof(cookie.value, SECRET, expiry),
    ).toBeNull();
    expect(claimsFromProof(cookie.value)).toEqual(claims);
  });

  test("returns the exact hardened host cookie descriptor", () => {
    const cookie = issuedCookie();
    expect(cookie).toMatchObject({
      name: "__Host-novora_first_preview_access",
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
    });
    expect(cookie).not.toHaveProperty("domain");
    expect(cookie).not.toHaveProperty("authorization");
    expect(cookie).not.toHaveProperty("query");
  });

  test("uses the exact customer access cookie name", () => {
    expect(issuedCookie().name).toBe(
      "__Host-novora_first_preview_access",
    );
  });

  test("makes the customer access cookie HttpOnly", () => {
    expect(issuedCookie().httpOnly).toBe(true);
  });

  test("makes the customer access cookie Secure", () => {
    expect(issuedCookie().secure).toBe(true);
  });

  test("uses strict same-site cookie isolation", () => {
    expect(issuedCookie().sameSite).toBe("strict");
  });

  test("uses root cookie scope with no Domain", () => {
    const cookie = issuedCookie();
    expect(cookie.path).toBe("/");
    expect(cookie).not.toHaveProperty("domain");
  });

  test("denies confirmedPersistence false", () => {
    expectOpaqueSessionDenial(
      issue(invalidInput({ ...sessionInput(), confirmedPersistence: false })),
    );
  });

  test("denies missing confirmedPersistence", () => {
    const { confirmedPersistence: _omitted, ...input } = sessionInput();
    expectOpaqueSessionDenial(issue(invalidInput(input)));
  });

  test("denies an invalid Brief UUID", () => {
    expectOpaqueSessionDenial(
      issue(sessionInput({ conceptBriefId: "not-a-uuid" })),
    );
  });

  test("denies an invalid public reference", () => {
    expectOpaqueSessionDenial(
      issue(sessionInput({ publicReference: "NOVORA-CB-NOT-REAL" })),
    );
  });

  test("denies a missing signing secret", () => {
    const { signingSecret: _omitted, ...input } = sessionInput();
    expectOpaqueSessionDenial(issue(invalidInput(input)));
  });

  test("denies weak, padded, and malformed signing secrets", () => {
    for (const signingSecret of [
      "",
      "short",
      ` ${SECRET}`,
      `${SECRET} `,
    ]) {
      expectOpaqueSessionDenial(issue(sessionInput({ signingSecret })));
    }
  });

  test("denies invalid explicit nonces", () => {
    for (const nonce of ["", "short", "contains spaces", "a".repeat(65)]) {
      const input = sessionInput();
      const { nonceSource: _omitted, ...withoutSource } = input;
      expectOpaqueSessionDenial(
        issue(invalidInput({ ...withoutSource, nonce })),
      );
    }
  });

  test("denies a thrown nonce source", () => {
    expectOpaqueSessionDenial(
      issue(
        sessionInput({
          nonceSource() {
            throw new Error("synthetic nonce failure");
          },
        }),
      ),
    );
  });

  test("denies invalid and thrown clock output", () => {
    for (const clock of [
      () => Number.NaN,
      () => 1.5,
      () => Number.MAX_SAFE_INTEGER,
      () => {
        throw new Error("synthetic clock failure");
      },
    ]) {
      expectOpaqueSessionDenial(issue(sessionInput({ clock })));
    }
  });

  test("denies excessive, zero, negative, and fractional lifetime", () => {
    for (const lifetimeSeconds of [
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS + 1,
      0,
      -1,
      1.5,
    ]) {
      expectOpaqueSessionDenial(
        issue(sessionInput({ lifetimeSeconds })),
      );
    }
  });

  test("does not expose the secret, nonce, or proof fragments on failure", () => {
    const result = issue(
      sessionInput({
        signingSecret: SECRET,
        nonceSource() {
          throw new Error(`unsafe ${SECRET} ${NONCE} eyJ`);
        },
      }),
    );
    expectOpaqueSessionDenial(result);
  });

  test("never accepts or returns customer contacts", () => {
    const result = issue(
      invalidInput({
        ...sessionInput(),
        customerName: "Synthetic Customer",
        customerEmail: "synthetic@example.invalid",
        phone: "+000000000",
      }),
    );
    expectOpaqueSessionDenial(result);
    expect(JSON.stringify(result)).not.toContain("Synthetic Customer");
    expect(JSON.stringify(result)).not.toContain("synthetic@example.invalid");
  });

  test("does not mutate its source input", () => {
    const input = sessionInput();
    const snapshot = { ...input };
    const keys = Object.keys(input);
    expect(issue(input).ok).toBe(true);
    expect(input).toEqual(snapshot);
    expect(Object.keys(input)).toEqual(keys);
  });

  test("requires exactly one bounded nonce source", () => {
    expectOpaqueSessionDenial(
      issue(invalidInput({ ...sessionInput(), nonce: NONCE })),
    );
    const { nonceSource: _omitted, ...withoutNonce } = sessionInput();
    expectOpaqueSessionDenial(issue(invalidInput(withoutNonce)));
  });

  test("rejects inherited required input instead of trusting it", () => {
    const inherited = Object.create(sessionInput()) as Record<string, unknown>;
    expectOpaqueSessionDenial(issue(invalidInput(inherited)));
  });

  test("restores the guarded server-only resolver after module loading", () => {
    const originalResolveFilename = moduleInternals._resolveFilename;
    expect(() =>
      loadWithServerOnlyTestShim(() => {
        throw new Error("FORCED_CUSTOMER_MODULE_LOAD_FAILURE");
      }),
    ).toThrow("FORCED_CUSTOMER_MODULE_LOAD_FAILURE");
    expect(moduleInternals._resolveFilename).toBe(originalResolveFilename);
  });

  test("rejects accessor-backed issuance fields without invoking getters", () => {
    for (const key of [
      "confirmedPersistence",
      "conceptBriefId",
      "publicReference",
      "signingSecret",
      "clock",
      "nonce",
      "nonceSource",
    ] as const) {
      const input = sessionInput() as unknown as Record<string, unknown>;
      let getterCalls = 0;
      Object.defineProperty(input, key, {
        configurable: true,
        enumerable: true,
        get() {
          getterCalls += 1;
          throw new Error(`PRIVATE_${key.toUpperCase()}_GETTER`);
        },
      });
      if (key === "nonce") delete input.nonceSource;
      expectOpaqueSessionDenial(issue(invalidInput(input)));
      expect(getterCalls).toBe(0);
    }
  });

  test("rejects Proxy-backed issuance containers before any trap", () => {
    const trapCalls = { get: 0, ownKeys: 0, descriptor: 0, prototype: 0 };
    const input = new Proxy(sessionInput(), {
      get() {
        trapCalls.get += 1;
        throw new Error("PRIVATE_ISSUANCE_PROXY_GET");
      },
      ownKeys() {
        trapCalls.ownKeys += 1;
        throw new Error("PRIVATE_ISSUANCE_PROXY_KEYS");
      },
      getOwnPropertyDescriptor() {
        trapCalls.descriptor += 1;
        throw new Error("PRIVATE_ISSUANCE_PROXY_DESCRIPTOR");
      },
      getPrototypeOf() {
        trapCalls.prototype += 1;
        throw new Error("PRIVATE_ISSUANCE_PROXY_PROTOTYPE");
      },
    });
    expectOpaqueSessionDenial(issue(input));
    expect(trapCalls).toEqual({
      get: 0,
      ownKeys: 0,
      descriptor: 0,
      prototype: 0,
    });
  });

  test("rejects Proxy-backed issuance callables before invocation", () => {
    for (const key of ["clock", "nonceSource"] as const) {
      let applyCalls = 0;
      const callable = new Proxy(
        key === "clock" ? () => NOW : () => NONCE,
        {
          apply() {
            applyCalls += 1;
            throw new Error(`PRIVATE_${key.toUpperCase()}_PROXY`);
          },
        },
      );
      expectOpaqueSessionDenial(
        issue(sessionInput({ [key]: callable })),
      );
      expect(applyCalls).toBe(0);
    }
  });

  test("rejects boxed issuance strings and numbers", () => {
    for (const [key, value] of [
      ["conceptBriefId", new String(BRIEF_ID)],
      ["publicReference", new String(PUBLIC_REFERENCE)],
      ["signingSecret", new String(SECRET)],
      ["nonce", new String(NONCE)],
      ["lifetimeSeconds", new Number(60)],
    ] as const) {
      const input = sessionInput() as unknown as Record<string, unknown>;
      if (key === "nonce") delete input.nonceSource;
      input[key] = value;
      expectOpaqueSessionDenial(issue(invalidInput(input)));
    }
  });

  test("observes every accepted issuance data property exactly once", () => {
    const input = sessionInput({
      lifetimeSeconds: 60,
    }) as unknown as Record<string, unknown>;
    const counts = new Map<string, number>();
    const original = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = ((value: object, key: PropertyKey) => {
      if (value === input && typeof key === "string") {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return original(value, key);
    }) as typeof Object.getOwnPropertyDescriptor;
    try {
      expect(issue(invalidInput(input)).ok).toBe(true);
    } finally {
      Object.getOwnPropertyDescriptor = original;
    }
    expect(Object.fromEntries(counts)).toEqual({
      confirmedPersistence: 1,
      conceptBriefId: 1,
      publicReference: 1,
      signingSecret: 1,
      clock: 1,
      nonceSource: 1,
      lifetimeSeconds: 1,
    });
  });

  test("enforces the raw signing-secret minimum and maximum boundaries", () => {
    expect(issue(sessionInput({ signingSecret: "s".repeat(32) })).ok).toBe(
      true,
    );
    expectOpaqueSessionDenial(
      issue(sessionInput({ signingSecret: "s".repeat(31) })),
    );
    expect(
      issue(sessionInput({ signingSecret: "s".repeat(4_096) })).ok,
    ).toBe(true);
    expectOpaqueSessionDenial(
      issue(sessionInput({ signingSecret: "s".repeat(4_097) })),
    );
    expectOpaqueSessionDenial(
      issue(sessionInput({ signingSecret: " ".repeat(4_096) + "s" })),
    );
  });

  test("rejects an over-limit secret before clock or nonce invocation", () => {
    let clockCalls = 0;
    let nonceCalls = 0;
    expectOpaqueSessionDenial(
      issue(
        sessionInput({
          signingSecret: "s".repeat(4_097),
          clock: () => {
            clockCalls += 1;
            return NOW;
          },
          nonceSource: () => {
            nonceCalls += 1;
            return NONCE;
          },
        }),
      ),
    );
    expect(clockCalls).toBe(0);
    expect(nonceCalls).toBe(0);
  });

  test("accepts zero and rejects unsafe issuance clock values", () => {
    expect(issue(sessionInput({ clock: () => 0 })).ok).toBe(true);
    for (const value of [
      -0,
      -1,
      -Number.MAX_SAFE_INTEGER,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MAX_SAFE_INTEGER,
    ]) {
      expectOpaqueSessionDenial(
        issue(sessionInput({ clock: () => value })),
      );
    }
  });
});

function proof(
  overrides: Partial<{
    briefId: string;
    publicReference: string;
    nonce: string;
    issuedAt: number;
    expiresAt: number;
    signingSecret: string;
  }> = {},
): string {
  const value = createFirstPreviewCustomerAccessProof(
    {
      briefId: overrides.briefId ?? BRIEF_ID,
      publicReference: overrides.publicReference ?? PUBLIC_REFERENCE,
      nonce: overrides.nonce ?? NONCE,
      issuedAt: overrides.issuedAt ?? NOW - 30,
      expiresAt: overrides.expiresAt ?? NOW + 1770,
    },
    overrides.signingSecret ?? SECRET,
  );
  if (!value) throw new Error("synthetic proof must be valid");
  return value;
}

function proofClaims(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    v: FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION,
    alg: FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM,
    aud: FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
    scope: FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
    briefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    nonce: NONCE,
    iat: NOW - 30,
    exp: NOW + 1770,
    ...overrides,
  };
}

function signClaims(claims: Record<string, unknown>): string {
  return signRawPayload(JSON.stringify(claims));
}

function signRawPayload(
  serializedClaims: string | Buffer,
  encodedPayloadOverride?: string,
): string {
  const payload =
    encodedPayloadOverride ??
    Buffer.from(serializedClaims).toString("base64url");
  const signature = createHmac("sha256", SECRET)
    .update(
      `NOVORA\0first-preview-customer-access\0v1\0hmac-sha-256\0${payload}`,
      "utf8",
    )
    .digest("base64url");
  return `${payload}.${signature}`;
}

function readySourceRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    state: "ready",
    conceptBriefId: BRIEF_ID,
    publicReference: PUBLIC_REFERENCE,
    outputId: OUTPUT_ID,
    readinessStatus: "first_preview_ready",
    isCurrentCustomerPreview: true,
    readinessRevokedAt: null,
    authorizationEligible: true,
    ...overrides,
  };
}

class FakeExactCustomerPreviewStateSource
  implements FirstPreviewCustomerPreviewStateSource
{
  readonly requests: FirstPreviewCustomerPreviewStateLookup[] = [];
  result: unknown = { state: "pending" };
  shouldThrow = false;

  readExactCustomerPreviewState = async (
    lookup: FirstPreviewCustomerPreviewStateLookup,
  ): Promise<unknown> => {
    this.requests.push({ ...lookup });
    if (this.shouldThrow) {
      throw new Error(
        `synthetic source failure ${BRIEF_ID} private/object/path`,
      );
    }
    return this.result;
  };
}

function viewRequest(
  overrides: Partial<FirstPreviewCustomerViewRequest> = {},
): FirstPreviewCustomerViewRequest {
  return {
    publicReference: PUBLIC_REFERENCE,
    accessProof: proof(),
    ...overrides,
  };
}

function viewDependencies(
  stateSource: FirstPreviewCustomerPreviewStateSource,
  overrides: Partial<FirstPreviewCustomerViewDependencies> = {},
): FirstPreviewCustomerViewDependencies {
  return {
    clock: () => NOW,
    stateSource,
    signingSecret: SECRET,
    ...overrides,
  };
}

function invalidRequest(value: unknown): FirstPreviewCustomerViewRequest {
  return value as FirstPreviewCustomerViewRequest;
}

async function readView(
  sourceResult: unknown,
  request: FirstPreviewCustomerViewRequest = viewRequest(),
  dependencyOverrides: Partial<FirstPreviewCustomerViewDependencies> = {},
) {
  const source = new FakeExactCustomerPreviewStateSource();
  source.result = sourceResult;
  const result = await readFirstPreviewCustomerView(
    request,
    viewDependencies(source, dependencyOverrides),
  );
  return { result, source };
}

function expectOpaqueDenied(result: unknown) {
  expect(result).toEqual({ state: "denied" });
  const serialized = JSON.stringify(result);
  for (const sensitive of [
    BRIEF_ID,
    OUTPUT_ID,
    SECRET,
    NONCE,
    "provider",
    "object_path",
    "bucket",
    "prompt",
    "reviewer",
    "automatic_gate",
    "stack",
  ]) {
    expect(serialized.toLowerCase()).not.toContain(
      sensitive.toLowerCase(),
    );
  }
}

async function expectDeniedBeforeSource(accessProof: unknown) {
  const source = new FakeExactCustomerPreviewStateSource();
  let methodRetrievals = 0;
  const original = Object.getOwnPropertyDescriptor;
  Object.getOwnPropertyDescriptor = ((value: object, key: PropertyKey) => {
    if (value === source && key === "readExactCustomerPreviewState") {
      methodRetrievals += 1;
    }
    return original(value, key);
  }) as typeof Object.getOwnPropertyDescriptor;
  try {
    const result = await readFirstPreviewCustomerView(
      invalidRequest({
        publicReference: PUBLIC_REFERENCE,
        accessProof,
      }),
      viewDependencies(source),
    );
    expectOpaqueDenied(result);
  } finally {
    Object.getOwnPropertyDescriptor = original;
  }
  expect(methodRetrievals).toBe(0);
  expect(source.requests).toEqual([]);
}

test.describe("server-only exact-customer First Preview view resolver", () => {
  test("returns pending for a valid proof and explicit safe pending source", async () => {
    const { result, source } = await readView({ state: "pending" });
    expect(result).toEqual({
      state: "pending",
      pollAfterMs: FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
    });
    expect(source.requests).toEqual([
      {
        conceptBriefId: BRIEF_ID,
        publicReference: PUBLIC_REFERENCE,
      },
    ]);
  });

  test("returns ready for the exact eligible current output", async () => {
    const { result } = await readView(readySourceRecord());
    expect(result).toEqual({
      state: "ready",
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
  });

  test("ready exposes only the protected asset route identity", async () => {
    const { result } = await readView(readySourceRecord());
    expect(Object.keys(result).sort()).toEqual(["assetRequest", "state"]);
    if (result.state !== "ready") throw new Error("expected ready result");
    expect(Object.keys(result.assetRequest).sort()).toEqual([
      "outputId",
      "publicReference",
    ]);
  });

  test("returns unavailable for an explicit safe terminal source", async () => {
    const { result } = await readView({ state: "unavailable" });
    expect(result).toEqual({ state: "unavailable" });
  });

  test("denies a missing proof before source access", async () => {
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({ accessProof: "" }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a malformed proof before source access", async () => {
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({ accessProof: "not.a.capability" }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a forged proof before source access", async () => {
    const valid = proof();
    const forged = `${valid.slice(0, -1)}${valid.endsWith("a") ? "b" : "a"}`;
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({ accessProof: forged }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies an expired proof before source access", async () => {
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({
        accessProof: signClaims(
          proofClaims({ iat: NOW - 1800, exp: NOW }),
        ),
      }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a future-issued proof before source access", async () => {
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({
        accessProof: signClaims(
          proofClaims({ iat: NOW + 1, exp: NOW + 1800 }),
        ),
      }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a wrong-audience proof before source access", async () => {
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({
        accessProof: signClaims(proofClaims({ aud: "novora:other" })),
      }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a wrong-scope proof before source access", async () => {
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({
        accessProof: signClaims(
          proofClaims({ scope: "first_preview:write" }),
        ),
      }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a wrong signed reference before source access", async () => {
    const { result, source } = await readView(
      { state: "pending" },
      viewRequest({
        accessProof: proof({ publicReference: OTHER_REFERENCE }),
      }),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a cross-Brief source record", async () => {
    const { result } = await readView(
      readySourceRecord({ conceptBriefId: OTHER_BRIEF_ID }),
    );
    expectOpaqueDenied(result);
  });

  test("denies a cross-customer attempt before source access", async () => {
    const source = new FakeExactCustomerPreviewStateSource();
    const result = await readFirstPreviewCustomerView(
      invalidRequest({
        ...viewRequest(),
        conceptBriefId: OTHER_BRIEF_ID,
      }),
      viewDependencies(source),
    );
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("denies a revoked output", async () => {
    const { result } = await readView(
      readySourceRecord({
        readinessRevokedAt: "2026-07-23T10:00:00.000Z",
      }),
    );
    expectOpaqueDenied(result);
  });

  test("denies a non-current output", async () => {
    const { result } = await readView(
      readySourceRecord({ isCurrentCustomerPreview: false }),
    );
    expectOpaqueDenied(result);
  });

  test("does not return ready for a not-ready output", async () => {
    const { result } = await readView(
      readySourceRecord({ readinessStatus: "not_ready" }),
    );
    expectOpaqueDenied(result);
  });

  test("denies an invalid outputId", async () => {
    const { result } = await readView(
      readySourceRecord({ outputId: "not-a-uuid" }),
    );
    expectOpaqueDenied(result);
  });

  test("denies duplicate source records", async () => {
    const ready = readySourceRecord();
    const { result } = await readView([ready, { ...ready }]);
    expectOpaqueDenied(result);
  });

  test("denies an ambiguous source result", async () => {
    const { result } = await readView({
      state: "ready",
      candidates: [readySourceRecord(), readySourceRecord()],
    });
    expectOpaqueDenied(result);
  });

  test("denies a primitive source result", async () => {
    for (const sourceResult of [null, undefined, true, 1, "pending"]) {
      const { result } = await readView(sourceResult);
      expectOpaqueDenied(result);
    }
  });

  test("denies an array source result", async () => {
    const { result } = await readView([{ state: "pending" }]);
    expectOpaqueDenied(result);
  });

  test("denies a ready source with a missing required field", async () => {
    const record = readySourceRecord();
    delete record.authorizationEligible;
    const { result } = await readView(record);
    expectOpaqueDenied(result);
  });

  test("denies inherited required source properties", async () => {
    const record = readySourceRecord();
    delete record.authorizationEligible;
    const inherited = Object.assign(
      Object.create({ authorizationEligible: true }),
      record,
    );
    const { result } = await readView(inherited);
    expectOpaqueDenied(result);
  });

  test("denies truthy non-boolean readiness fields", async () => {
    for (const value of [1, "true", {}, []]) {
      const { result } = await readView(
        readySourceRecord({ isCurrentCustomerPreview: value }),
      );
      expectOpaqueDenied(result);
    }
  });

  test("rejects extra unsafe fields under the exact source schema", async () => {
    const { result } = await readView(
      readySourceRecord({
        objectPath: "private/object/path",
        provider: "synthetic-provider",
      }),
    );
    expectOpaqueDenied(result);
  });

  test("normalizes a thrown source exception to denied", async () => {
    const source = new FakeExactCustomerPreviewStateSource();
    source.shouldThrow = true;
    const result = await readFirstPreviewCustomerView(
      viewRequest(),
      viewDependencies(source),
    );
    expectOpaqueDenied(result);
  });

  test("normalizes a returned source error to denied", async () => {
    const { result } = await readView({
      state: "error",
      error: "synthetic database error",
    });
    expectOpaqueDenied(result);
  });

  test("denies an unsupported source state", async () => {
    const { result } = await readView({ state: "generating" });
    expectOpaqueDenied(result);
  });

  test("returns a bounded deterministic pending poll delay", async () => {
    const { result } = await readView({ state: "pending" });
    expect(result).toEqual({
      state: "pending",
      pollAfterMs: FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
    });
    if (result.state !== "pending") throw new Error("expected pending");
    expect(result.pollAfterMs).toBeGreaterThanOrEqual(1_000);
    expect(result.pollAfterMs).toBeLessThanOrEqual(30_000);
  });

  test("does not trust a source-controlled zero poll delay", async () => {
    const { result } = await readView({
      state: "pending",
      pollAfterMs: 0,
    });
    expect(result).toEqual({
      state: "pending",
      pollAfterMs: FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
    });
  });

  test("does not trust a source-controlled excessive poll delay", async () => {
    const { result } = await readView({
      state: "pending",
      pollAfterMs: 86_400_000,
    });
    expect(result).toEqual({
      state: "pending",
      pollAfterMs: FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
    });
  });

  test("keeps denied responses opaque", async () => {
    const { result } = await readView(
      readySourceRecord({
        providerError: "synthetic sensitive provider error",
      }),
    );
    expectOpaqueDenied(result);
    expect(Object.keys(result)).toEqual(["state"]);
  });

  test("keeps unavailable responses opaque", async () => {
    const { result } = await readView({ state: "unavailable" });
    expect(result).toEqual({ state: "unavailable" });
    expect(Object.keys(result)).toEqual(["state"]);
  });

  test("ready contains no Concept Brief UUID", async () => {
    const { result } = await readView(readySourceRecord());
    expect(JSON.stringify(result)).not.toContain(BRIEF_ID);
  });

  test("ready contains no Job UUID", async () => {
    const jobId = "523e4567-e89b-42d3-a456-426614174000";
    const { result } = await readView(readySourceRecord());
    expect(JSON.stringify(result)).not.toContain(jobId);
    expect(result).not.toHaveProperty("jobId");
  });

  test("ready contains no bucket", async () => {
    const { result } = await readView(readySourceRecord());
    expect(JSON.stringify(result).toLowerCase()).not.toContain("bucket");
  });

  test("ready contains no private object path", async () => {
    const { result } = await readView(readySourceRecord());
    expect(JSON.stringify(result)).not.toContain("private/object/path");
    expect(JSON.stringify(result).toLowerCase()).not.toContain("objectpath");
  });

  test("ready contains no content hash", async () => {
    const hash = "a".repeat(64);
    const { result } = await readView(readySourceRecord());
    expect(JSON.stringify(result)).not.toContain(hash);
  });

  test("ready contains no Provider metadata", async () => {
    const { result } = await readView(readySourceRecord());
    expect(JSON.stringify(result).toLowerCase()).not.toContain("provider");
  });

  test("ready contains no prompt", async () => {
    const { result } = await readView(readySourceRecord());
    expect(JSON.stringify(result).toLowerCase()).not.toContain("prompt");
  });

  test("ready contains no reviewer or admin notes", async () => {
    const { result } = await readView(readySourceRecord());
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("reviewer");
    expect(serialized).not.toContain("admin");
    expect(serialized).not.toContain("note");
  });

  test("ready contains no gate evidence or policy version", async () => {
    const { result } = await readView(readySourceRecord());
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("gate");
    expect(serialized).not.toContain("policy");
  });

  test("returns no public or signed Storage URL", async () => {
    const { result } = await readView(readySourceRecord());
    const serialized = JSON.stringify(result).toLowerCase();
    expect(serialized).not.toContain("http");
    expect(serialized).not.toContain("url");
    expect(serialized).not.toContain("storage");
    expect(serialized).not.toContain("signed");
  });

  test("does not expose a raw exception", async () => {
    const source = new FakeExactCustomerPreviewStateSource();
    source.shouldThrow = true;
    const result = await readFirstPreviewCustomerView(
      viewRequest(),
      viewDependencies(source),
    );
    expectOpaqueDenied(result);
    expect(JSON.stringify(result)).not.toContain("synthetic source failure");
  });

  test("does not retain the source record by reference", async () => {
    const sourceRecord = readySourceRecord();
    const { result } = await readView(sourceRecord);
    expect(result).not.toBe(sourceRecord);
    sourceRecord.outputId = OTHER_OUTPUT_ID;
    expect(result).toEqual({
      state: "ready",
      assetRequest: {
        publicReference: PUBLIC_REFERENCE,
        outputId: OUTPUT_ID,
      },
    });
  });

  test("accepts a dependency-injected verifier only after exact claim validation", async () => {
    const source = new FakeExactCustomerPreviewStateSource();
    const dependencies = viewDependencies(source);
    const { signingSecret: _omitted, ...withoutSecret } = dependencies;
    const result = await readFirstPreviewCustomerView(viewRequest(), {
      ...withoutSecret,
      proofVerifier: ({ accessProof, nowEpochSeconds }) => {
        expect(accessProof).toBe(proof());
        expect(nowEpochSeconds).toBe(NOW);
        return proofClaims();
      },
    });
    expect(result).toEqual({
      state: "pending",
      pollAfterMs: FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
    });
  });

  test("denies rotated-secret and ambiguous verifier configuration before source access", async () => {
    const rotated = await readView(
      { state: "pending" },
      viewRequest(),
      { signingSecret: `${SECRET}-rotated` },
    );
    expectOpaqueDenied(rotated.result);
    expect(rotated.source.requests).toEqual([]);

    const source = new FakeExactCustomerPreviewStateSource();
    const ambiguous = await readFirstPreviewCustomerView(
      viewRequest(),
      viewDependencies(source, {
        proofVerifier: () => proofClaims(),
      }),
    );
    expectOpaqueDenied(ambiguous);
    expect(source.requests).toEqual([]);
  });

  test("denies invalid clock and verifier failures before source access", async () => {
    for (const clock of [
      () => Number.NaN,
      () => {
        throw new Error("synthetic clock error");
      },
    ]) {
      const source = new FakeExactCustomerPreviewStateSource();
      const result = await readFirstPreviewCustomerView(
        viewRequest(),
        viewDependencies(source, { clock }),
      );
      expectOpaqueDenied(result);
      expect(source.requests).toEqual([]);
    }

    const source = new FakeExactCustomerPreviewStateSource();
    const dependencies = viewDependencies(source);
    const { signingSecret: _omitted, ...withoutSecret } = dependencies;
    const result = await readFirstPreviewCustomerView(viewRequest(), {
      ...withoutSecret,
      proofVerifier() {
        throw new Error("synthetic verifier error");
      },
    });
    expectOpaqueDenied(result);
    expect(source.requests).toEqual([]);
  });

  test("invalid proof never retrieves or invokes a throwing source getter", async () => {
    let getterCalls = 0;
    const source = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(source, "readExactCustomerPreviewState", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("PRIVATE_SOURCE_GETTER");
      },
    });
    const result = await readFirstPreviewCustomerView(
      viewRequest({ accessProof: "invalid.proof" }),
      viewDependencies(source as unknown as FirstPreviewCustomerPreviewStateSource),
    );
    expectOpaqueDenied(result);
    expect(getterCalls).toBe(0);
  });

  test("invalid proof performs no Proxy-backed source interaction", async () => {
    const traps = { get: 0, ownKeys: 0, descriptor: 0, prototype: 0 };
    const source = new Proxy(
      {
        readExactCustomerPreviewState: () => {
          throw new Error("PRIVATE_PROXY_SOURCE_INVOCATION");
        },
      },
      {
        get() {
          traps.get += 1;
          throw new Error("PRIVATE_PROXY_SOURCE_GET");
        },
        ownKeys() {
          traps.ownKeys += 1;
          throw new Error("PRIVATE_PROXY_SOURCE_KEYS");
        },
        getOwnPropertyDescriptor() {
          traps.descriptor += 1;
          throw new Error("PRIVATE_PROXY_SOURCE_DESCRIPTOR");
        },
        getPrototypeOf() {
          traps.prototype += 1;
          throw new Error("PRIVATE_PROXY_SOURCE_PROTOTYPE");
        },
      },
    );
    const result = await readFirstPreviewCustomerView(
      viewRequest({ accessProof: "invalid.proof" }),
      viewDependencies(source),
    );
    expectOpaqueDenied(result);
    expect(traps).toEqual({ get: 0, ownKeys: 0, descriptor: 0, prototype: 0 });
  });

  test("valid proof retrieves and invokes the source method exactly once", async () => {
    const source = new FakeExactCustomerPreviewStateSource();
    let methodRetrievals = 0;
    const original = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = ((value: object, key: PropertyKey) => {
      if (value === source && key === "readExactCustomerPreviewState") {
        methodRetrievals += 1;
      }
      return original(value, key);
    }) as typeof Object.getOwnPropertyDescriptor;
    try {
      const result = await readFirstPreviewCustomerView(
        viewRequest(),
        viewDependencies(source),
      );
      expect(result.state).toBe("pending");
    } finally {
      Object.getOwnPropertyDescriptor = original;
    }
    expect(methodRetrievals).toBe(1);
    expect(source.requests).toHaveLength(1);
  });

  test("valid proof rejects accessor and Proxy source methods without disclosure", async () => {
    let getterCalls = 0;
    const accessorSource = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(
      accessorSource,
      "readExactCustomerPreviewState",
      {
        enumerable: true,
        get() {
          getterCalls += 1;
          throw new Error("PRIVATE_SOURCE_ACCESSOR");
        },
      },
    );
    expectOpaqueDenied(
      await readFirstPreviewCustomerView(
        viewRequest(),
        viewDependencies(
          accessorSource as unknown as FirstPreviewCustomerPreviewStateSource,
        ),
      ),
    );
    expect(getterCalls).toBe(0);

    const proxyTraps = { descriptor: 0, prototype: 0 };
    const proxySource = new Proxy(
      { readExactCustomerPreviewState: () => ({ state: "pending" }) },
      {
        getOwnPropertyDescriptor() {
          proxyTraps.descriptor += 1;
          throw new Error("PRIVATE_SOURCE_DESCRIPTOR");
        },
        getPrototypeOf() {
          proxyTraps.prototype += 1;
          throw new Error("PRIVATE_SOURCE_PROTOTYPE");
        },
      },
    );
    expectOpaqueDenied(
      await readFirstPreviewCustomerView(
        viewRequest(),
        viewDependencies(proxySource),
      ),
    );
    expect(proxyTraps).toEqual({ descriptor: 0, prototype: 0 });
  });

  test("rejects accessor and Proxy view boundary containers without getters or traps", async () => {
    const source = new FakeExactCustomerPreviewStateSource();
    for (const key of ["accessProof", "publicReference"] as const) {
      const request = viewRequest() as unknown as Record<string, unknown>;
      let calls = 0;
      Object.defineProperty(request, key, {
        enumerable: true,
        get() {
          calls += 1;
          throw new Error(`PRIVATE_REQUEST_${key}`);
        },
      });
      expectOpaqueDenied(
        await readFirstPreviewCustomerView(
          request as unknown as FirstPreviewCustomerViewRequest,
          viewDependencies(source),
        ),
      );
      expect(calls).toBe(0);
    }

    const trapCalls = { get: 0, ownKeys: 0 };
    const dependencies = new Proxy(viewDependencies(source), {
      get() {
        trapCalls.get += 1;
        throw new Error("PRIVATE_DEPENDENCY_GET");
      },
      ownKeys() {
        trapCalls.ownKeys += 1;
        throw new Error("PRIVATE_DEPENDENCY_KEYS");
      },
    });
    expectOpaqueDenied(
      await readFirstPreviewCustomerView(viewRequest(), dependencies),
    );
    expect(trapCalls).toEqual({ get: 0, ownKeys: 0 });
    expect(source.requests).toEqual([]);
  });

  test("rejects accessor-backed view dependencies without invoking them", async () => {
    for (const key of ["clock", "signingSecret", "proofVerifier"] as const) {
      const source = new FakeExactCustomerPreviewStateSource();
      const dependencies = viewDependencies(source) as unknown as Record<
        string,
        unknown
      >;
      if (key === "proofVerifier") delete dependencies.signingSecret;
      let calls = 0;
      Object.defineProperty(dependencies, key, {
        enumerable: true,
        get() {
          calls += 1;
          throw new Error(`PRIVATE_DEPENDENCY_${key}`);
        },
      });
      expectOpaqueDenied(
        await readFirstPreviewCustomerView(
          viewRequest(),
          dependencies as unknown as FirstPreviewCustomerViewDependencies,
        ),
      );
      expect(calls).toBe(0);
      expect(source.requests).toEqual([]);
    }
  });

  test("rejects wrong version, algorithm, and rotated-secret proofs before source access", async () => {
    await expectDeniedBeforeSource(signClaims(proofClaims({ v: 2 })));
    await expectDeniedBeforeSource(signClaims(proofClaims({ alg: "none" })));
    await expectDeniedBeforeSource(
      proof({ signingSecret: `${SECRET}-rotated` }),
    );
    await expectDeniedBeforeSource(new String(proof()));
  });

  test("rejects non-canonical, duplicate, and unexpected proof encodings before source access", async () => {
    const canonical = JSON.stringify(proofClaims());
    const paddedPayload = `${Buffer.from(canonical).toString("base64url")}=`;
    for (const candidate of [
      signRawPayload(` ${canonical}`),
      signRawPayload(canonical, paddedPayload),
      signRawPayload(
        canonical.replace(
          `"v":${FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION}`,
          `"v":${FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION},"v":${FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION}`,
        ),
      ),
      signClaims(proofClaims({ unexpected: "PRIVATE_PROOF_FIELD" })),
      signRawPayload(Buffer.from([0xff, 0xfe, 0xfd])),
      signRawPayload("{"),
    ]) {
      await expectDeniedBeforeSource(candidate);
    }
  });

  test("rejects unsafe verification clocks before source access", async () => {
    for (const value of [
      -0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      const source = new FakeExactCustomerPreviewStateSource();
      const result = await readFirstPreviewCustomerView(
        viewRequest(),
        viewDependencies(source, { clock: () => value }),
      );
      expectOpaqueDenied(result);
      expect(source.requests).toEqual([]);
    }
  });

  test("rejects accessor, Proxy, inherited, and custom-prototype source records", async () => {
    for (const key of [
      "state",
      "conceptBriefId",
      "publicReference",
      "outputId",
      "readinessStatus",
      "isCurrentCustomerPreview",
      "readinessRevokedAt",
      "authorizationEligible",
    ]) {
      const record = readySourceRecord();
      let calls = 0;
      Object.defineProperty(record, key, {
        enumerable: true,
        get() {
          calls += 1;
          throw new Error(`PRIVATE_SOURCE_RECORD_${key}`);
        },
      });
      expectOpaqueDenied((await readView(record)).result);
      expect(calls).toBe(0);
    }

    const traps = { get: 0, ownKeys: 0, descriptor: 0, prototype: 0 };
    const proxyRecord = new Proxy(readySourceRecord(), {
      get() {
        traps.get += 1;
        throw new Error("PRIVATE_RECORD_GET");
      },
      ownKeys() {
        traps.ownKeys += 1;
        throw new Error("PRIVATE_RECORD_KEYS");
      },
      getOwnPropertyDescriptor() {
        traps.descriptor += 1;
        throw new Error("PRIVATE_RECORD_DESCRIPTOR");
      },
      getPrototypeOf() {
        traps.prototype += 1;
        throw new Error("PRIVATE_RECORD_PROTOTYPE");
      },
    });
    const proxyRecordSource = {
      readExactCustomerPreviewState: () => proxyRecord,
    };
    expectOpaqueDenied(
      await readFirstPreviewCustomerView(
        viewRequest(),
        viewDependencies(proxyRecordSource),
      ),
    );
    expect(traps).toEqual({ get: 0, ownKeys: 0, descriptor: 0, prototype: 0 });

    const inherited = Object.assign(
      Object.create({ authorizationEligible: true }),
      readySourceRecord({ authorizationEligible: undefined }),
    );
    delete inherited.authorizationEligible;
    expectOpaqueDenied((await readView(inherited)).result);

    const custom = Object.assign(
      Object.create({ customPrototype: true }),
      readySourceRecord(),
    );
    expectOpaqueDenied((await readView(custom)).result);
  });

  test("snapshots every ready source primitive exactly once", async () => {
    const record = readySourceRecord();
    const counts = new Map<string, number>();
    const original = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = ((value: object, key: PropertyKey) => {
      if (value === record && typeof key === "string") {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return original(value, key);
    }) as typeof Object.getOwnPropertyDescriptor;
    try {
      expect((await readView(record)).result.state).toBe("ready");
    } finally {
      Object.getOwnPropertyDescriptor = original;
    }
    expect([...counts.values()]).toEqual(new Array(8).fill(1));
    expect([...counts.keys()].sort()).toEqual(
      Object.keys(readySourceRecord()).sort(),
    );
  });

  test("treats explicit authorization ineligibility as opaque non-ready denial", async () => {
    const result = (
      await readView(readySourceRecord({ authorizationEligible: false }))
    ).result;
    expectOpaqueDenied(result);
    expect(result).not.toHaveProperty("assetRequest");
  });

  test("rejects Proxy-backed verifier claims and accessor claims without source access", async () => {
    for (const rawClaims of [
      new Proxy(proofClaims(), {}),
      Object.defineProperty(proofClaims(), "briefId", {
        enumerable: true,
        get() {
          throw new Error("PRIVATE_CLAIM_GETTER");
        },
      }),
    ]) {
      const source = new FakeExactCustomerPreviewStateSource();
      const result = await readFirstPreviewCustomerView(viewRequest(), {
        clock: () => NOW,
        stateSource: source,
        proofVerifier: () => rawClaims,
      });
      expectOpaqueDenied(result);
      expect(source.requests).toEqual([]);
    }
  });
});
