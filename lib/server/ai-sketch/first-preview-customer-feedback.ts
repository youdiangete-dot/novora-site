import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClientOrNull } from "../supabase";
import { FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV } from "./first-preview-customer-access-contract";
import { isValidFirstPreviewAssetUuid, isValidFirstPreviewPublicReference } from "./first-preview-generated-assets-contract";
import type { FirstPreviewCustomerView } from "./first-preview-customer-view";
import { readFirstPreviewCustomerViewBinding } from "./first-preview-customer-view-binding";

export const FIRST_PREVIEW_CUSTOMER_FEEDBACK_MAX_LENGTH = 2_000 as const;
export const FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_MAX_TOKEN_BYTES = 1_024 as const;

const FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_VERSION = 1 as const;
const FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_ALGORITHM = "HS256" as const;
const FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_AUDIENCE =
  "novora:first-preview-customer-feedback" as const;
const FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_PURPOSE =
  "rendered-output-binding" as const;
const FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_SIGNING_DOMAIN =
  "NOVORA\0first-preview-customer-feedback-binding\0v1\0hmac-sha-256\0";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MINIMUM_SIGNING_SECRET_BYTES = 32;
const MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS = 4_096;

export type FirstPreviewCustomerFeedbackBindingClaims = Readonly<{
  v: typeof FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_VERSION;
  alg: typeof FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_ALGORITHM;
  aud: typeof FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_AUDIENCE;
  purpose: typeof FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_PURPOSE;
  publicReference: string;
  outputId: string;
}>;

export type FirstPreviewCustomerFeedbackBindingInput = Readonly<{
  publicReference: string;
  outputId: string;
}>;

export type NormalizedFirstPreviewCustomerFeedbackBody = Readonly<{
  feedback: string;
  binding: string;
}>;

export type FirstPreviewCustomerFeedbackWriteResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "invalid" | "denied" | "unavailable" | "duplicate" }>;

export interface FirstPreviewCustomerFeedbackRepository {
  resolveExactCurrentPair(publicReference: string, outputId: string): Promise<Readonly<{
    conceptBriefId: string;
    outputId: string;
  }> | null>;
  insertExactFeedback(input: Readonly<{
    conceptBriefId: string;
    outputId: string;
    feedback: string;
  }>): Promise<"inserted" | "duplicate" | "unavailable">;
}

type Dependencies = Readonly<{
  readCustomerView: (request: Readonly<{ publicReference: string }>) => Promise<FirstPreviewCustomerView>;
  repository: FirstPreviewCustomerFeedbackRepository;
  signingSecret: string;
}>;

function snapshotOwnDataRecord(
  value: unknown,
  allowedKeys: readonly string[],
): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeUtilTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key))) return null;
    const snapshot: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
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
  } catch {
    return null;
  }
}

function hasExactKeys(
  record: Record<string, unknown>,
  expectedKeys: readonly string[],
): boolean {
  const keys = Object.keys(record).sort();
  const expected = [...expectedKeys].sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function isUsableSigningSecret(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS &&
    value.length === value.trim().length &&
    Buffer.byteLength(value, "utf8") >= MINIMUM_SIGNING_SECRET_BYTES
  );
}

function decodeCanonicalBase64Url(value: string): Buffer | null {
  if (!value || !BASE64URL_PATTERN.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.length > 0 && decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
}

function signFeedbackBinding(encodedPayload: string, signingSecret: string): Buffer {
  return createHmac("sha256", signingSecret)
    .update(`${FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_SIGNING_DOMAIN}${encodedPayload}`, "utf8")
    .digest();
}

function hasExactFeedbackBindingClaims(
  value: Record<string, unknown>,
): value is FirstPreviewCustomerFeedbackBindingClaims {
  return (
    hasExactKeys(value, ["alg", "aud", "outputId", "publicReference", "purpose", "v"]) &&
    value.v === FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_VERSION &&
    value.alg === FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_ALGORITHM &&
    value.aud === FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_AUDIENCE &&
    value.purpose === FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_PURPOSE &&
    typeof value.publicReference === "string" &&
    isValidFirstPreviewPublicReference(value.publicReference) &&
    typeof value.outputId === "string" &&
    isValidFirstPreviewAssetUuid(value.outputId)
  );
}

export function createFirstPreviewCustomerFeedbackBinding(
  input: FirstPreviewCustomerFeedbackBindingInput,
  signingSecret: string,
): string | null {
  const inputRecord = snapshotOwnDataRecord(input, ["outputId", "publicReference"]);
  if (
    !inputRecord ||
    !hasExactKeys(inputRecord, ["outputId", "publicReference"]) ||
    typeof inputRecord.publicReference !== "string" ||
    !isValidFirstPreviewPublicReference(inputRecord.publicReference) ||
    typeof inputRecord.outputId !== "string" ||
    !isValidFirstPreviewAssetUuid(inputRecord.outputId) ||
    !isUsableSigningSecret(signingSecret)
  ) {
    return null;
  }

  const claims: FirstPreviewCustomerFeedbackBindingClaims = {
    v: FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_VERSION,
    alg: FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_ALGORITHM,
    aud: FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_AUDIENCE,
    purpose: FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_PURPOSE,
    publicReference: inputRecord.publicReference,
    outputId: inputRecord.outputId,
  };
  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const token = `${encodedPayload}.${signFeedbackBinding(encodedPayload, signingSecret).toString("base64url")}`;
  return Buffer.byteLength(token, "utf8") <= FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_MAX_TOKEN_BYTES
    ? token
    : null;
}

export function verifyFirstPreviewCustomerFeedbackBinding(
  token: unknown,
  signingSecret: unknown,
): FirstPreviewCustomerFeedbackBindingClaims | null {
  if (
    typeof token !== "string" ||
    Buffer.byteLength(token, "utf8") > FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_MAX_TOKEN_BYTES ||
    !isUsableSigningSecret(signingSecret)
  ) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;
  const payload = decodeCanonicalBase64Url(encodedPayload);
  const signature = decodeCanonicalBase64Url(encodedSignature);
  if (!payload || !signature || signature.length !== 32) return null;
  const expectedSignature = signFeedbackBinding(encodedPayload, signingSecret);
  if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }
  const claims = snapshotOwnDataRecord(parsed, ["alg", "aud", "outputId", "publicReference", "purpose", "v"]);
  if (!claims || !hasExactFeedbackBindingClaims(claims)) return null;
  const canonicalPayload = Buffer.from(
    JSON.stringify({
      v: claims.v,
      alg: claims.alg,
      aud: claims.aud,
      purpose: claims.purpose,
      publicReference: claims.publicReference,
      outputId: claims.outputId,
    }),
    "utf8",
  ).toString("base64url");
  return encodedPayload === canonicalPayload ? claims : null;
}

export function normalizeFirstPreviewCustomerFeedbackBody(
  body: unknown,
): NormalizedFirstPreviewCustomerFeedbackBody | null {
  const record = snapshotOwnDataRecord(body, ["binding", "feedback"]);
  if (
    !record ||
    !hasExactKeys(record, ["binding", "feedback"]) ||
    typeof record.feedback !== "string" ||
    typeof record.binding !== "string" ||
    record.binding.length === 0 ||
    Buffer.byteLength(record.binding, "utf8") > FIRST_PREVIEW_CUSTOMER_FEEDBACK_BINDING_MAX_TOKEN_BYTES
  ) {
    return null;
  }
  const feedback = record.feedback.trim();
  return feedback.length >= 1 && feedback.length <= FIRST_PREVIEW_CUSTOMER_FEEDBACK_MAX_LENGTH
    ? { feedback, binding: record.binding }
    : null;
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export function createSupabaseFirstPreviewCustomerFeedbackRepository(
  supabase: SupabaseClient,
): FirstPreviewCustomerFeedbackRepository {
  return {
    async resolveExactCurrentPair(publicReference, outputId) {
      try {
        const { data: briefs, error: briefError } = await supabase
          .from("concept_briefs")
          .select("id, public_reference")
          .eq("public_reference", publicReference)
          .limit(2);
        if (briefError || !Array.isArray(briefs) || briefs.length !== 1) return null;
        const brief = briefs[0] as Record<string, unknown>;
        if (brief.public_reference !== publicReference || typeof brief.id !== "string" || !isValidFirstPreviewAssetUuid(brief.id)) return null;

        const { data: outputs, error: outputError } = await supabase
          .from("ai_sketch_outputs")
          .select("id, concept_brief_id, readiness_status, is_current_customer_preview, readiness_revoked_at")
          .eq("id", outputId)
          .eq("concept_brief_id", brief.id)
          .eq("readiness_status", "first_preview_ready")
          .eq("is_current_customer_preview", true)
          .is("readiness_revoked_at", null)
          .limit(2);
        if (outputError || !Array.isArray(outputs) || outputs.length !== 1) return null;
        const output = outputs[0] as Record<string, unknown>;
        return output.id === outputId && output.concept_brief_id === brief.id
          ? { conceptBriefId: brief.id, outputId }
          : null;
      } catch {
        return null;
      }
    },
    async insertExactFeedback(input) {
      try {
        const { error } = await supabase.from("first_preview_customer_feedback").insert({
          concept_brief_id: input.conceptBriefId,
          ai_sketch_output_id: input.outputId,
          feedback_text: input.feedback,
        });
        if (!error) return "inserted";
        return isUniqueConflict(error) ? "duplicate" : "unavailable";
      } catch (error) {
        return isUniqueConflict(error) ? "duplicate" : "unavailable";
      }
    },
  };
}

export async function persistFirstPreviewCustomerFeedback(
  publicReference: unknown,
  body: unknown,
  dependencies?: Dependencies,
): Promise<FirstPreviewCustomerFeedbackWriteResult> {
  if (typeof publicReference !== "string" || !isValidFirstPreviewPublicReference(publicReference)) return { ok: false, reason: "invalid" };
  const normalizedBody = normalizeFirstPreviewCustomerFeedbackBody(body);
  if (!normalizedBody) return { ok: false, reason: "invalid" };

  const signingSecret = dependencies?.signingSecret ??
    process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? null;
  if (!isUsableSigningSecret(signingSecret)) return { ok: false, reason: "unavailable" };
  const signedBinding = verifyFirstPreviewCustomerFeedbackBinding(
    normalizedBody.binding,
    signingSecret,
  );
  if (!signedBinding) return { ok: false, reason: "invalid" };
  if (signedBinding.publicReference !== publicReference) return { ok: false, reason: "denied" };

  const supabase = dependencies ? null : createSupabaseAdminClientOrNull();
  if (!dependencies && !supabase) return { ok: false, reason: "unavailable" };
  const activeDependencies = dependencies ?? {
    readCustomerView: readFirstPreviewCustomerViewBinding,
    repository: createSupabaseFirstPreviewCustomerFeedbackRepository(supabase!),
    signingSecret,
  };

  try {
    const customerView = await activeDependencies.readCustomerView({ publicReference });
    if (customerView.state === "denied") return { ok: false, reason: "denied" };
    if (customerView.state !== "ready") return { ok: false, reason: "unavailable" };
    if (
      customerView.assetRequest.publicReference !== publicReference ||
      customerView.assetRequest.publicReference !== signedBinding.publicReference ||
      !isValidFirstPreviewAssetUuid(customerView.assetRequest.outputId)
    ) {
      return { ok: false, reason: "denied" };
    }
    if (customerView.assetRequest.outputId !== signedBinding.outputId) {
      return { ok: false, reason: "unavailable" };
    }

    const pair = await activeDependencies.repository.resolveExactCurrentPair(
      publicReference,
      signedBinding.outputId,
    );
    if (!pair || pair.outputId !== signedBinding.outputId || !isValidFirstPreviewAssetUuid(pair.conceptBriefId)) {
      return { ok: false, reason: "unavailable" };
    }

    const inserted = await activeDependencies.repository.insertExactFeedback({
      conceptBriefId: pair.conceptBriefId,
      outputId: pair.outputId,
      feedback: normalizedBody.feedback,
    });
    if (inserted === "duplicate") return { ok: false, reason: "duplicate" };
    return inserted === "inserted" ? { ok: true } : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
