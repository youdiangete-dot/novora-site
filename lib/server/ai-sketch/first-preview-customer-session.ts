import "server-only";

import { types as nodeUtilTypes } from "node:util";

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

const INPUT_KEYS = [
  "clock",
  "conceptBriefId",
  "confirmedPersistence",
  "lifetimeSeconds",
  "nonce",
  "nonceSource",
  "publicReference",
  "signingSecret",
] as const;

// Bounds work before trimming, encoding, HMAC construction, or dependencies run.
const MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS = 4_096;

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

function snapshotOwnDataRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  if (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    nodeUtilTypes.isProxy(value)
  ) {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;

  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.some(
      (key) => typeof key !== "string" || !allowedKeys.includes(key),
    )
  ) {
    return null;
  }

  const snapshot: Record<string, unknown> = Object.create(null);
  for (const key of ownKeys) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      Object.prototype.hasOwnProperty.call(descriptor, "get") ||
      Object.prototype.hasOwnProperty.call(descriptor, "set")
    ) {
      return null;
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function hasOwn(snapshot: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(snapshot, key);
}

function isSafeClockValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    !Object.is(value, -0)
  );
}

function isCallableNonProxy(
  value: unknown,
): value is (...args: never[]) => unknown {
  return typeof value === "function" && !nodeUtilTypes.isProxy(value);
}

export function issueFirstPreviewCustomerSession(
  input: FirstPreviewCustomerSessionIssuanceInput,
): IssueFirstPreviewCustomerSessionResult {
  try {
    const values = snapshotOwnDataRecord(input, INPUT_KEYS);
    if (
      !values ||
      !hasOwn(values, "confirmedPersistence") ||
      values.confirmedPersistence !== true ||
      !hasOwn(values, "conceptBriefId") ||
      typeof values.conceptBriefId !== "string" ||
      !isValidFirstPreviewAssetUuid(values.conceptBriefId) ||
      !hasOwn(values, "publicReference") ||
      typeof values.publicReference !== "string" ||
      !isValidFirstPreviewPublicReference(values.publicReference) ||
      !hasOwn(values, "signingSecret") ||
      typeof values.signingSecret !== "string" ||
      values.signingSecret.length > MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS ||
      !hasOwn(values, "clock") ||
      !isCallableNonProxy(values.clock)
    ) {
      return denied();
    }

    const conceptBriefId = values.conceptBriefId;
    const publicReference = values.publicReference;
    const signingSecret = values.signingSecret;
    const clock = values.clock as () => unknown;
    const hasNonce = hasOwn(values, "nonce");
    const hasNonceSource = hasOwn(values, "nonceSource");
    if (hasNonce === hasNonceSource) return denied();

    const lifetimeValue = hasOwn(values, "lifetimeSeconds")
      ? values.lifetimeSeconds
      : FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS;
    if (
      typeof lifetimeValue !== "number" ||
      !Number.isSafeInteger(lifetimeValue) ||
      lifetimeValue <= 0 ||
      lifetimeValue > FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS
    ) {
      return denied();
    }
    const lifetimeSeconds = lifetimeValue;

    let nonceSource: (() => unknown) | null = null;
    let explicitNonce: unknown;
    if (hasNonce) {
      explicitNonce = values.nonce;
    } else {
      if (!isCallableNonProxy(values.nonceSource)) return denied();
      nonceSource = values.nonceSource as () => unknown;
    }

    const issuedAtValue = clock();
    if (!isSafeClockValue(issuedAtValue)) return denied();
    const issuedAt = issuedAtValue;
    if (issuedAt > Number.MAX_SAFE_INTEGER - lifetimeSeconds) return denied();
    const expiresAt = issuedAt + lifetimeSeconds;
    if (!isSafeClockValue(expiresAt) || expiresAt <= issuedAt) return denied();

    const nonceValue = nonceSource ? nonceSource() : explicitNonce;
    if (typeof nonceValue !== "string") return denied();
    const nonce = nonceValue;

    const proof = createFirstPreviewCustomerAccessProof(
      {
        briefId: conceptBriefId,
        publicReference,
        nonce,
        issuedAt,
        expiresAt,
      },
      signingSecret,
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
        maxAge: lifetimeSeconds,
      },
    };
  } catch {
    return denied();
  }
}
