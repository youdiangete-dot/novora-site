import "server-only";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES,
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
  createFirstPreviewCustomerAccessProof,
} from "./first-preview-customer-access-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";

const INPUT_KEYS = new Set([
  "confirmedPersistence",
  "conceptBriefId",
  "publicReference",
  "signingSecret",
  "clock",
  "nonce",
  "nonceSource",
  "lifetimeSeconds",
]);

export type FirstPreviewCustomerSessionIssuanceInput = Readonly<{
  confirmedPersistence: true;
  conceptBriefId: string;
  publicReference: string;
  signingSecret: string;
  clock: () => number;
  nonce?: string;
  nonceSource?: () => string;
  lifetimeSeconds?: number;
}>;

export type FirstPreviewCustomerSessionCookie = Readonly<{
  name: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME;
  value: string;
  httpOnly: true;
  secure: true;
  sameSite: "strict";
  path: "/";
  maxAge: number;
}>;

export type IssueFirstPreviewCustomerSessionResult =
  | Readonly<{
      ok: true;
      cookie: FirstPreviewCustomerSessionCookie;
    }>
  | Readonly<{
      ok: false;
      code: "session_denied";
    }>;

function denied(): IssueFirstPreviewCustomerSessionResult {
  return { ok: false, code: "session_denied" };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyAllowedOwnKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).every((key) => INPUT_KEYS.has(key));
}

export function issueFirstPreviewCustomerSession(
  input: FirstPreviewCustomerSessionIssuanceInput,
): IssueFirstPreviewCustomerSessionResult {
  try {
    if (
      !isPlainRecord(input) ||
      !hasOnlyAllowedOwnKeys(input) ||
      !Object.prototype.hasOwnProperty.call(input, "confirmedPersistence") ||
      input.confirmedPersistence !== true ||
      !Object.prototype.hasOwnProperty.call(input, "conceptBriefId") ||
      typeof input.conceptBriefId !== "string" ||
      !isValidFirstPreviewAssetUuid(input.conceptBriefId) ||
      !Object.prototype.hasOwnProperty.call(input, "publicReference") ||
      typeof input.publicReference !== "string" ||
      !isValidFirstPreviewPublicReference(input.publicReference) ||
      !Object.prototype.hasOwnProperty.call(input, "signingSecret") ||
      typeof input.signingSecret !== "string" ||
      !Object.prototype.hasOwnProperty.call(input, "clock") ||
      typeof input.clock !== "function"
    ) {
      return denied();
    }

    const hasNonce = Object.prototype.hasOwnProperty.call(input, "nonce");
    const hasNonceSource = Object.prototype.hasOwnProperty.call(
      input,
      "nonceSource",
    );
    if (hasNonce === hasNonceSource) return denied();

    const lifetimeSeconds = Object.prototype.hasOwnProperty.call(
      input,
      "lifetimeSeconds",
    )
      ? input.lifetimeSeconds
      : FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS;
    if (
      !Number.isSafeInteger(lifetimeSeconds) ||
      Number(lifetimeSeconds) <= 0 ||
      Number(lifetimeSeconds) >
        FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS
    ) {
      return denied();
    }

    const issuedAt = input.clock();
    if (!Number.isSafeInteger(issuedAt)) return denied();

    const expiresAt = issuedAt + Number(lifetimeSeconds);
    if (!Number.isSafeInteger(expiresAt)) return denied();

    let nonce: unknown;
    if (hasNonce) {
      nonce = input.nonce;
    } else {
      if (typeof input.nonceSource !== "function") return denied();
      nonce = input.nonceSource();
    }
    if (typeof nonce !== "string") return denied();

    const proof = createFirstPreviewCustomerAccessProof(
      {
        briefId: input.conceptBriefId,
        publicReference: input.publicReference,
        nonce,
        issuedAt,
        expiresAt,
      },
      input.signingSecret,
    );
    if (typeof proof !== "string" || proof.length === 0) return denied();

    return {
      ok: true,
      cookie: {
        name: FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
        value: proof,
        httpOnly: FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES.httpOnly,
        secure: FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES.secure,
        sameSite: FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES.sameSite,
        path: FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES.path,
        maxAge: Number(lifetimeSeconds),
      },
    };
  } catch {
    return denied();
  }
}
