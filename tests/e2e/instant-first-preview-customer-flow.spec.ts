import { expect, test } from "@playwright/test";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM,
  FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION,
  verifyFirstPreviewCustomerAccessProof,
} from "../../lib/server/ai-sketch/first-preview-customer-access-contract";
import {
  issueFirstPreviewCustomerSession,
  type FirstPreviewCustomerSessionIssuanceInput,
} from "../../lib/server/ai-sketch/first-preview-customer-session";

const NOW = 1_785_283_200;
const SECRET =
  "novora-test-only-customer-session-signing-secret-000000000000";
const BRIEF_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_BRIEF_ID = "223e4567-e89b-42d3-a456-426614174000";
const PUBLIC_REFERENCE = "NOVORA-CB-20260723-A540";
const OTHER_REFERENCE = "NOVORA-CB-20260723-B640";
const NONCE = "session_nonce_7iJ9vH2mQ4xK";

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
});
