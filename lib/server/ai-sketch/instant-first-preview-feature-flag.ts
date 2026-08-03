import "server-only";

import { randomBytes } from "node:crypto";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
} from "./first-preview-customer-access-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";
import {
  issueFirstPreviewCustomerSession,
  type FirstPreviewCustomerSessionCookie,
} from "./first-preview-customer-session";

export const INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV =
  "NOVORA_INSTANT_PREVIEW_AGENT_ENABLED" as const;
export const INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENABLED_VALUE = "true" as const;

export function isInstantFirstPreviewAgentEnabled(
  value: unknown = process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV],
): boolean {
  return value === INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENABLED_VALUE;
}

export type FirstPreviewSessionRouteDependencies = Readonly<{
  featureFlagValue?: unknown;
  signingSecret?: string | null;
  clock?: () => number;
  nonceSource?: () => string;
  issueSession?: typeof issueFirstPreviewCustomerSession;
}>;

type PersistedConceptBriefIdentity = Readonly<{
  persisted: true;
  publicReference: string;
  conceptBriefId: string;
}>;

type FirstPreviewCookieResponse = {
  cookies: {
    set(
      name: string,
      value: string,
      options: Omit<FirstPreviewCustomerSessionCookie, "name" | "value">,
    ): unknown;
  };
};

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasUsableSigningSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 4_096 &&
    value.length === value.trim().length &&
    Buffer.byteLength(value, "utf8") >= 32
  );
}

export function attachFirstPreviewCustomerSessionCookie<
  ResponseType extends FirstPreviewCookieResponse,
>(
  response: ResponseType,
  persistence: PersistedConceptBriefIdentity,
  dependencies: FirstPreviewSessionRouteDependencies = {},
): ResponseType {
  const featureFlagValue = hasOwn(dependencies, "featureFlagValue")
    ? dependencies.featureFlagValue
    : process.env[INSTANT_FIRST_PREVIEW_FEATURE_FLAG_ENV];
  if (
    persistence.persisted !== true ||
    !isInstantFirstPreviewAgentEnabled(featureFlagValue) ||
    !isValidFirstPreviewPublicReference(persistence.publicReference) ||
    !isValidFirstPreviewAssetUuid(persistence.conceptBriefId)
  ) {
    return response;
  }

  try {
    const signingSecret = hasOwn(dependencies, "signingSecret")
      ? dependencies.signingSecret
      : process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV];
    if (!hasUsableSigningSecret(signingSecret)) return response;

    const issuance = (
      dependencies.issueSession ?? issueFirstPreviewCustomerSession
    )({
      confirmedPersistence: true,
      conceptBriefId: persistence.conceptBriefId,
      publicReference: persistence.publicReference,
      signingSecret,
      clock: dependencies.clock ?? (() => Math.floor(Date.now() / 1_000)),
      nonceSource:
        dependencies.nonceSource ??
        (() => randomBytes(24).toString("base64url")),
    });
    if (issuance.ok) {
      response.cookies.set(issuance.cookie.name, issuance.cookie.value, {
        httpOnly: issuance.cookie.httpOnly,
        secure: issuance.cookie.secure,
        sameSite: issuance.cookie.sameSite,
        path: issuance.cookie.path,
        maxAge: issuance.cookie.maxAge,
      });
    }
  } catch {
    // A confirmed Concept Brief remains successful when optional session
    // issuance is unavailable. The response body and status stay unchanged.
  }

  return response;
}
