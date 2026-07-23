import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";

export const FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME =
  "__Host-novora_first_preview_access" as const;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE =
  "novora:first-preview" as const;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE =
  "first_preview:read" as const;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM = "HS256" as const;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION = 1 as const;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS = 30 * 60;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES = 1024;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT = 2 as const;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV =
  "NOVORA_FIRST_PREVIEW_ACCESS_SIGNING_SECRET" as const;
export const FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
  maxAge: FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
} as const;

const SIGNING_DOMAIN =
  "NOVORA\0first-preview-customer-access\0v1\0hmac-sha-256\0";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const MINIMUM_SIGNING_SECRET_BYTES = 32;

export type FirstPreviewCustomerAccessClaims = Readonly<{
  v: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION;
  alg: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM;
  aud: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE;
  scope: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE;
  briefId: string;
  publicReference: string;
  nonce: string;
  iat: number;
  exp: number;
}>;

export type FirstPreviewCustomerAccessProofInput = Readonly<{
  briefId: string;
  publicReference: string;
  nonce: string;
  issuedAt: number;
  expiresAt?: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactClaimsSchema(
  value: Record<string, unknown>,
): value is FirstPreviewCustomerAccessClaims {
  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "alg",
    "aud",
    "briefId",
    "exp",
    "iat",
    "nonce",
    "publicReference",
    "scope",
    "v",
  ];

  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    value.v === FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION &&
    value.alg === FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM &&
    value.aud === FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE &&
    value.scope === FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE &&
    typeof value.briefId === "string" &&
    isValidFirstPreviewAssetUuid(value.briefId) &&
    typeof value.publicReference === "string" &&
    isValidFirstPreviewPublicReference(value.publicReference) &&
    typeof value.nonce === "string" &&
    NONCE_PATTERN.test(value.nonce) &&
    Number.isSafeInteger(value.iat) &&
    Number.isSafeInteger(value.exp)
  );
}

function isUsableSigningSecret(secret: string): boolean {
  return (
    secret.length === secret.trim().length &&
    Buffer.byteLength(secret, "utf8") >= MINIMUM_SIGNING_SECRET_BYTES
  );
}

function signingInput(encodedPayload: string): string {
  return `${SIGNING_DOMAIN}${encodedPayload}`;
}

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update(signingInput(encodedPayload), "utf8")
    .digest();
}

function decodeCanonicalBase64Url(value: string): Buffer | null {
  if (!value || !BASE64URL_PATTERN.test(value)) return null;

  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.length > 0 && decoded.toString("base64url") === value
      ? decoded
      : null;
  } catch {
    return null;
  }
}

export function createFirstPreviewCustomerAccessProof(
  input: FirstPreviewCustomerAccessProofInput,
  signingSecret: string,
): string | null {
  if (
    !isUsableSigningSecret(signingSecret) ||
    !isValidFirstPreviewAssetUuid(input.briefId) ||
    !isValidFirstPreviewPublicReference(input.publicReference) ||
    !NONCE_PATTERN.test(input.nonce) ||
    !Number.isSafeInteger(input.issuedAt)
  ) {
    return null;
  }

  const expiresAt =
    input.expiresAt ??
    input.issuedAt + FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS;
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= input.issuedAt ||
    expiresAt - input.issuedAt >
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS
  ) {
    return null;
  }

  const claims: FirstPreviewCustomerAccessClaims = {
    v: FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION,
    alg: FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM,
    aud: FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
    scope: FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
    briefId: input.briefId,
    publicReference: input.publicReference,
    nonce: input.nonce,
    iat: input.issuedAt,
    exp: expiresAt,
  };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  const proof = `${payload}.${sign(payload, signingSecret).toString("base64url")}`;

  return Buffer.byteLength(proof, "utf8") <=
    FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES
    ? proof
    : null;
}

export function verifyFirstPreviewCustomerAccessProof(
  proof: string,
  signingSecret: string,
  nowEpochSeconds: number,
): FirstPreviewCustomerAccessClaims | null {
  if (
    !isUsableSigningSecret(signingSecret) ||
    typeof proof !== "string" ||
    Buffer.byteLength(proof, "utf8") >
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES ||
    !Number.isSafeInteger(nowEpochSeconds)
  ) {
    return null;
  }

  const parts = proof.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;
  const payload = decodeCanonicalBase64Url(encodedPayload);
  const signature = decodeCanonicalBase64Url(encodedSignature);
  if (!payload || !signature || signature.length !== 32) return null;

  const expectedSignature = sign(encodedPayload, signingSecret);
  if (
    signature.length !== expectedSignature.length ||
    !timingSafeEqual(signature, expectedSignature)
  ) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !hasExactClaimsSchema(parsed)) return null;
  if (
    parsed.iat > nowEpochSeconds ||
    parsed.exp <= nowEpochSeconds ||
    parsed.exp <= parsed.iat ||
    parsed.exp - parsed.iat >
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS
  ) {
    return null;
  }

  return parsed;
}
