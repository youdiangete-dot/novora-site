import "server-only";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM,
  FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION,
  verifyFirstPreviewCustomerAccessProof,
  type FirstPreviewCustomerAccessClaims,
} from "./first-preview-customer-access-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";

export const FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS = 5_000 as const;

const REQUEST_KEYS = ["accessProof", "publicReference"] as const;
const CLAIM_KEYS = [
  "alg",
  "aud",
  "briefId",
  "exp",
  "iat",
  "nonce",
  "publicReference",
  "scope",
  "v",
] as const;
const READY_SOURCE_KEYS = [
  "authorizationEligible",
  "conceptBriefId",
  "isCurrentCustomerPreview",
  "outputId",
  "publicReference",
  "readinessRevokedAt",
  "readinessStatus",
  "state",
] as const;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export type FirstPreviewCustomerViewRequest = Readonly<{
  publicReference: string;
  accessProof: string;
}>;

export type FirstPreviewCustomerPreviewStateLookup = Readonly<{
  conceptBriefId: string;
  publicReference: string;
}>;

export interface FirstPreviewCustomerPreviewStateSource {
  readExactCustomerPreviewState(
    lookup: FirstPreviewCustomerPreviewStateLookup,
  ): unknown | Promise<unknown>;
}

export type FirstPreviewCustomerProofVerifier = (
  input: Readonly<{
    accessProof: string;
    nowEpochSeconds: number;
  }>,
) => unknown | Promise<unknown>;

export type FirstPreviewCustomerViewDependencies = Readonly<{
  clock: () => number;
  stateSource: FirstPreviewCustomerPreviewStateSource;
  signingSecret?: string;
  proofVerifier?: FirstPreviewCustomerProofVerifier;
}>;

export type FirstPreviewCustomerView =
  | Readonly<{
      state: "pending";
      pollAfterMs: typeof FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS;
    }>
  | Readonly<{
      state: "ready";
      assetRequest: Readonly<{
        publicReference: string;
        outputId: string;
      }>;
    }>
  | Readonly<{ state: "unavailable" }>
  | Readonly<{ state: "denied" }>;

function denied(): FirstPreviewCustomerView {
  return { state: "denied" };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactOwnKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index])
  );
}

function hasValidClaimsSchema(
  value: unknown,
  nowEpochSeconds: number,
): value is FirstPreviewCustomerAccessClaims {
  if (!isPlainRecord(value) || !hasExactOwnKeys(value, CLAIM_KEYS)) {
    return false;
  }

  return (
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
    Number.isSafeInteger(value.exp) &&
    Number(value.iat) <= nowEpochSeconds &&
    Number(value.exp) > nowEpochSeconds &&
    Number(value.exp) > Number(value.iat) &&
    Number(value.exp) - Number(value.iat) <=
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS
  );
}

async function verifyAccessProof(
  request: FirstPreviewCustomerViewRequest,
  dependencies: FirstPreviewCustomerViewDependencies,
  nowEpochSeconds: number,
): Promise<FirstPreviewCustomerAccessClaims | null> {
  const hasSigningSecret = Object.prototype.hasOwnProperty.call(
    dependencies,
    "signingSecret",
  );
  const hasProofVerifier = Object.prototype.hasOwnProperty.call(
    dependencies,
    "proofVerifier",
  );
  if (hasSigningSecret === hasProofVerifier) return null;

  let claims: unknown;
  if (hasSigningSecret) {
    if (typeof dependencies.signingSecret !== "string") return null;
    claims = verifyFirstPreviewCustomerAccessProof(
      request.accessProof,
      dependencies.signingSecret,
      nowEpochSeconds,
    );
  } else {
    if (typeof dependencies.proofVerifier !== "function") return null;
    claims = await dependencies.proofVerifier({
      accessProof: request.accessProof,
      nowEpochSeconds,
    });
  }

  return hasValidClaimsSchema(claims, nowEpochSeconds) &&
      claims.publicReference === request.publicReference
    ? claims
    : null;
}

function mapSourceResult(
  sourceResult: unknown,
  claims: FirstPreviewCustomerAccessClaims,
): FirstPreviewCustomerView {
  if (!isPlainRecord(sourceResult) || typeof sourceResult.state !== "string") {
    return denied();
  }

  if (sourceResult.state === "pending") {
    const keys = Object.keys(sourceResult).sort();
    const hasSafeSchema =
      (keys.length === 1 && keys[0] === "state") ||
      (keys.length === 2 &&
        keys[0] === "pollAfterMs" &&
        keys[1] === "state" &&
        Number.isSafeInteger(sourceResult.pollAfterMs));
    return hasSafeSchema
      ? {
          state: "pending",
          pollAfterMs: FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
        }
      : denied();
  }

  if (sourceResult.state === "unavailable") {
    return hasExactOwnKeys(sourceResult, ["state"])
      ? { state: "unavailable" }
      : denied();
  }

  if (sourceResult.state === "denied") {
    return hasExactOwnKeys(sourceResult, ["state"]) ? denied() : denied();
  }

  if (
    sourceResult.state !== "ready" ||
    !hasExactOwnKeys(sourceResult, READY_SOURCE_KEYS) ||
    sourceResult.conceptBriefId !== claims.briefId ||
    sourceResult.publicReference !== claims.publicReference ||
    typeof sourceResult.outputId !== "string" ||
    !isValidFirstPreviewAssetUuid(sourceResult.outputId) ||
    sourceResult.readinessStatus !== "first_preview_ready" ||
    sourceResult.isCurrentCustomerPreview !== true ||
    sourceResult.readinessRevokedAt !== null ||
    sourceResult.authorizationEligible !== true
  ) {
    return denied();
  }

  return {
    state: "ready",
    assetRequest: {
      publicReference: claims.publicReference,
      outputId: sourceResult.outputId,
    },
  };
}

export async function readFirstPreviewCustomerView(
  request: FirstPreviewCustomerViewRequest,
  dependencies: FirstPreviewCustomerViewDependencies,
): Promise<FirstPreviewCustomerView> {
  try {
    if (
      !isPlainRecord(request) ||
      !hasExactOwnKeys(request, REQUEST_KEYS) ||
      typeof request.publicReference !== "string" ||
      !isValidFirstPreviewPublicReference(request.publicReference) ||
      typeof request.accessProof !== "string" ||
      request.accessProof.length === 0 ||
      Buffer.byteLength(request.accessProof, "utf8") >
        FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES ||
      !isPlainRecord(dependencies) ||
      typeof dependencies.clock !== "function" ||
      !dependencies.stateSource ||
      typeof dependencies.stateSource.readExactCustomerPreviewState !==
        "function"
    ) {
      return denied();
    }

    const nowEpochSeconds = dependencies.clock();
    if (!Number.isSafeInteger(nowEpochSeconds)) return denied();

    const claims = await verifyAccessProof(
      request,
      dependencies,
      nowEpochSeconds,
    );
    if (!claims) return denied();

    const sourceResult =
      await dependencies.stateSource.readExactCustomerPreviewState({
        conceptBriefId: claims.briefId,
        publicReference: claims.publicReference,
      });

    return mapSourceResult(sourceResult, claims);
  } catch {
    return denied();
  }
}
