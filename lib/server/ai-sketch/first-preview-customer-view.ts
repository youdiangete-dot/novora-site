import "server-only";

import { types as nodeUtilTypes } from "node:util";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM,
  FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE,
  FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION,
  verifyFirstPreviewCustomerAccessProof,
} from "./first-preview-customer-access-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";

export const FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS = 5_000 as const;

const REQUEST_KEYS = ["accessProof", "publicReference"] as const;
const DEPENDENCY_KEYS = [
  "clock",
  "proofVerifier",
  "signingSecret",
  "stateSource",
] as const;
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
const SOURCE_KEYS = [...READY_SOURCE_KEYS, "pollAfterMs"] as const;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS = 4_096;
const STATE_SOURCE_METHOD = "readExactCustomerPreviewState";

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

type ClaimsSnapshot = Readonly<{
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

function denied(): FirstPreviewCustomerView {
  return { state: "denied" };
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

function hasExactSnapshotKeys(
  snapshot: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(snapshot).sort();
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index])
  );
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

function snapshotValidClaims(
  value: unknown,
  nowEpochSeconds: number,
): ClaimsSnapshot | null {
  const claims = snapshotOwnDataRecord(value, CLAIM_KEYS);
  if (
    !claims ||
    !hasExactSnapshotKeys(claims, CLAIM_KEYS) ||
    claims.v !== FIRST_PREVIEW_CUSTOMER_ACCESS_VERSION ||
    claims.alg !== FIRST_PREVIEW_CUSTOMER_ACCESS_ALGORITHM ||
    claims.aud !== FIRST_PREVIEW_CUSTOMER_ACCESS_AUDIENCE ||
    claims.scope !== FIRST_PREVIEW_CUSTOMER_ACCESS_SCOPE ||
    typeof claims.briefId !== "string" ||
    !isValidFirstPreviewAssetUuid(claims.briefId) ||
    typeof claims.publicReference !== "string" ||
    !isValidFirstPreviewPublicReference(claims.publicReference) ||
    typeof claims.nonce !== "string" ||
    !NONCE_PATTERN.test(claims.nonce) ||
    !isSafeClockValue(claims.iat) ||
    !isSafeClockValue(claims.exp) ||
    claims.iat > nowEpochSeconds ||
    claims.exp <= nowEpochSeconds ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat >
      FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_LIFETIME_SECONDS
  ) {
    return null;
  }

  return {
    v: claims.v,
    alg: claims.alg,
    aud: claims.aud,
    scope: claims.scope,
    briefId: claims.briefId,
    publicReference: claims.publicReference,
    nonce: claims.nonce,
    iat: claims.iat,
    exp: claims.exp,
  };
}

function hasCanonicalProofPayload(
  accessProof: string,
  claims: ClaimsSnapshot,
): boolean {
  const parts = accessProof.split(".");
  if (parts.length !== 2) return false;
  const canonicalPayload = Buffer.from(
    JSON.stringify({
      v: claims.v,
      alg: claims.alg,
      aud: claims.aud,
      scope: claims.scope,
      briefId: claims.briefId,
      publicReference: claims.publicReference,
      nonce: claims.nonce,
      iat: claims.iat,
      exp: claims.exp,
    }),
    "utf8",
  ).toString("base64url");
  return parts[0] === canonicalPayload;
}

async function verifyAccessProof(
  accessProof: string,
  publicReference: string,
  signingSecret: string | null,
  proofVerifier: FirstPreviewCustomerProofVerifier | null,
  nowEpochSeconds: number,
): Promise<ClaimsSnapshot | null> {
  let rawClaims: unknown;
  if (signingSecret !== null) {
    rawClaims = verifyFirstPreviewCustomerAccessProof(
      accessProof,
      signingSecret,
      nowEpochSeconds,
    );
  } else {
    if (!proofVerifier) return null;
    rawClaims = await proofVerifier({ accessProof, nowEpochSeconds });
  }

  const claims = snapshotValidClaims(rawClaims, nowEpochSeconds);
  return claims &&
    claims.publicReference === publicReference &&
    hasCanonicalProofPayload(accessProof, claims)
    ? claims
    : null;
}

function captureStateSourceMethod(
  source: unknown,
): ((
  lookup: FirstPreviewCustomerPreviewStateLookup,
) => unknown | Promise<unknown>) | null {
  if (
    (typeof source === "object" || typeof source === "function") &&
    source !== null &&
    nodeUtilTypes.isProxy(source)
  ) {
    return null;
  }
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    return null;
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    source,
    STATE_SOURCE_METHOD,
  );
  if (
    !descriptor ||
    descriptor.enumerable !== true ||
    !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
    Object.prototype.hasOwnProperty.call(descriptor, "get") ||
    Object.prototype.hasOwnProperty.call(descriptor, "set") ||
    !isCallableNonProxy(descriptor.value)
  ) {
    return null;
  }
  return descriptor.value as (
    lookup: FirstPreviewCustomerPreviewStateLookup,
  ) => unknown | Promise<unknown>;
}

function mapSourceResult(
  sourceResult: unknown,
  claims: ClaimsSnapshot,
): FirstPreviewCustomerView {
  const allowedKeys = snapshotOwnDataRecord(sourceResult, SOURCE_KEYS);
  if (!allowedKeys || typeof allowedKeys.state !== "string") return denied();
  const state = allowedKeys.state;

  if (state === "pending") {
    const keys = Object.keys(allowedKeys).sort();
    const hasSafeSchema =
      (keys.length === 1 && keys[0] === "state") ||
      (keys.length === 2 &&
        keys[0] === "pollAfterMs" &&
        keys[1] === "state" &&
        typeof allowedKeys.pollAfterMs === "number" &&
        Number.isSafeInteger(allowedKeys.pollAfterMs));
    return hasSafeSchema
      ? {
          state: "pending",
          pollAfterMs: FIRST_PREVIEW_CUSTOMER_VIEW_POLL_AFTER_MS,
        }
      : denied();
  }

  if (state === "unavailable") {
    return hasExactSnapshotKeys(allowedKeys, ["state"])
      ? { state: "unavailable" }
      : denied();
  }

  if (state === "denied") return denied();

  if (
    state !== "ready" ||
    !hasExactSnapshotKeys(allowedKeys, READY_SOURCE_KEYS) ||
    allowedKeys.conceptBriefId !== claims.briefId ||
    allowedKeys.publicReference !== claims.publicReference ||
    typeof allowedKeys.outputId !== "string" ||
    !isValidFirstPreviewAssetUuid(allowedKeys.outputId) ||
    allowedKeys.readinessStatus !== "first_preview_ready" ||
    allowedKeys.isCurrentCustomerPreview !== true ||
    allowedKeys.readinessRevokedAt !== null ||
    allowedKeys.authorizationEligible !== true
  ) {
    return denied();
  }

  const outputId = allowedKeys.outputId;
  return {
    state: "ready",
    assetRequest: {
      publicReference: claims.publicReference,
      outputId,
    },
  };
}

export async function readFirstPreviewCustomerView(
  request: FirstPreviewCustomerViewRequest,
  dependencies: FirstPreviewCustomerViewDependencies,
): Promise<FirstPreviewCustomerView> {
  try {
    const requestValues = snapshotOwnDataRecord(request, REQUEST_KEYS);
    const dependencyValues = snapshotOwnDataRecord(
      dependencies,
      DEPENDENCY_KEYS,
    );
    if (
      !requestValues ||
      !hasExactSnapshotKeys(requestValues, REQUEST_KEYS) ||
      typeof requestValues.publicReference !== "string" ||
      !isValidFirstPreviewPublicReference(requestValues.publicReference) ||
      typeof requestValues.accessProof !== "string" ||
      requestValues.accessProof.length === 0 ||
      Buffer.byteLength(requestValues.accessProof, "utf8") >
        FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES ||
      !dependencyValues ||
      !hasOwn(dependencyValues, "clock") ||
      !isCallableNonProxy(dependencyValues.clock) ||
      !hasOwn(dependencyValues, "stateSource")
    ) {
      return denied();
    }

    const publicReference = requestValues.publicReference;
    const accessProof = requestValues.accessProof;
    const clock = dependencyValues.clock as () => unknown;
    const stateSource = dependencyValues.stateSource;

    const hasSigningSecret = hasOwn(dependencyValues, "signingSecret");
    const hasProofVerifier = hasOwn(dependencyValues, "proofVerifier");
    if (hasSigningSecret === hasProofVerifier) return denied();

    let signingSecret: string | null = null;
    let proofVerifier: FirstPreviewCustomerProofVerifier | null = null;
    if (hasSigningSecret) {
      if (
        typeof dependencyValues.signingSecret !== "string" ||
        dependencyValues.signingSecret.length >
          MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS
      ) {
        return denied();
      }
      signingSecret = dependencyValues.signingSecret;
    } else {
      if (!isCallableNonProxy(dependencyValues.proofVerifier)) return denied();
      proofVerifier =
        dependencyValues.proofVerifier as FirstPreviewCustomerProofVerifier;
    }

    const nowValue = clock();
    if (!isSafeClockValue(nowValue)) return denied();
    const nowEpochSeconds = nowValue;

    const claims = await verifyAccessProof(
      accessProof,
      publicReference,
      signingSecret,
      proofVerifier,
      nowEpochSeconds,
    );
    if (!claims) return denied();

    // Source interaction starts only after the complete proof check above.
    const readState = captureStateSourceMethod(stateSource);
    if (!readState) return denied();
    const sourceInvocationResult = Reflect.apply(readState, stateSource, [
      {
        conceptBriefId: claims.briefId,
        publicReference: claims.publicReference,
      },
    ]);
    if (
      (typeof sourceInvocationResult === "object" ||
        typeof sourceInvocationResult === "function") &&
      sourceInvocationResult !== null &&
      nodeUtilTypes.isProxy(sourceInvocationResult)
    ) {
      return denied();
    }
    const sourceResult = await sourceInvocationResult;
    return mapSourceResult(sourceResult, claims);
  } catch {
    return denied();
  }
}
