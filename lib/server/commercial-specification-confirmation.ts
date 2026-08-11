import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClientOrNull } from "./supabase";
import { FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV } from "./ai-sketch/first-preview-customer-access-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./ai-sketch/first-preview-generated-assets-contract";
import type { FirstPreviewCustomerView } from "./ai-sketch/first-preview-customer-view";
import { readFirstPreviewCustomerViewBinding } from "./ai-sketch/first-preview-customer-view-binding";

export const COMMERCIAL_SPECIFICATION_SNAPSHOT_VERSION =
  "commercial_specification_snapshot_v1" as const;
export const COMMERCIAL_SPECIFICATION_BINDING_MAX_TOKEN_BYTES = 2_048 as const;

const BINDING_VERSION = 1 as const;
const BINDING_ALGORITHM = "HS256" as const;
const BINDING_AUDIENCE =
  "novora:commercial-specification-confirmation" as const;
const BINDING_PURPOSE = "quotation-basis-specification-confirmation" as const;
const BINDING_SIGNING_DOMAIN =
  "NOVORA\0commercial-specification-confirmation-binding\0v1\0hmac-sha-256\0";
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MINIMUM_SIGNING_SECRET_BYTES = 32;
const MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS = 4_096;

const PIECE_SPECIFICATION_KEYS = [
  "pieceType",
  "branch",
  "structure",
  "subStructure",
  "earringPairDirection",
  "braceletStructureNote",
  "customUse",
  "customLook",
  "customPieceNote",
] as const;
const MATERIAL_SPECIFICATION_KEYS = [
  "metalDirection",
  "finishDirection",
  "customMetalDirection",
] as const;
const GEMSTONE_SPECIFICATION_KEYS = [
  "stoneLogic",
  "focalStoneType",
  "focalStoneColor",
  "focalStoneShape",
  "focalStoneSize",
  "multiStoneTypeMix",
  "multiStoneShapeMix",
  "multiStoneSizeRelationship",
  "multiStoneLayout",
  "repeatedStoneCoverage",
  "repeatedStoneFeeling",
  "repeatedStoneSize",
  "repeatedSettingStyle",
  "optionalStoneDirection",
  "stoneDirection",
  "stationType",
  "stationSpacing",
  "stationDetailSize",
  "stationSetting",
  "stationNote",
] as const;
const SIZE_AND_WEAR_SPECIFICATION_KEYS = [
  "sizeDirection",
  "bandWidthDirection",
  "bandProfileDirection",
  "chainStyle",
  "chainIncluded",
  "chainThickness",
  "chainLength",
  "chainNote",
  "manualChainConfirmationRequired",
  "engravingDirection",
  "wearability",
  "customScale",
  "customWearable",
] as const;
const CONSTRAINT_SPECIFICATION_KEYS = [
  "mustInclude",
  "mustAvoid",
  "personalization",
  "customSymbol",
  "customTextPattern",
  "productionConcernNote",
  "manualConfirmation",
] as const;
export const COMMERCIAL_SPECIFICATION_INPUT_KEYS = [
  ...PIECE_SPECIFICATION_KEYS,
  ...MATERIAL_SPECIFICATION_KEYS,
  ...GEMSTONE_SPECIFICATION_KEYS,
  ...SIZE_AND_WEAR_SPECIFICATION_KEYS,
  ...CONSTRAINT_SPECIFICATION_KEYS,
] as const;

export type CommercialSpecificationInputKey =
  (typeof COMMERCIAL_SPECIFICATION_INPUT_KEYS)[number];
export type CommercialSpecificationInput = Readonly<
  Partial<Record<CommercialSpecificationInputKey, string>>
>;

const REQUIRED_SPECIFICATION_KEYS = ["pieceType", "structure"] as const;
const LONG_SPECIFICATION_KEYS: readonly CommercialSpecificationInputKey[] = [
  "braceletStructureNote",
  "customPieceNote",
  "chainNote",
  "stationNote",
  "mustInclude",
  "mustAvoid",
  "productionConcernNote",
  "manualConfirmation",
];
const DEFAULT_SPECIFICATION_VALUE_MAX_LENGTH = 160;
const LONG_SPECIFICATION_VALUE_MAX_LENGTH = 500;

type SpecificationSection = Readonly<Record<string, string>>;

export type CommercialSpecificationSnapshot = Readonly<{
  specificationVersion: typeof COMMERCIAL_SPECIFICATION_SNAPSHOT_VERSION;
  piece: SpecificationSection;
  material: SpecificationSection;
  gemstones: SpecificationSection;
  sizeAndWear: SpecificationSection;
  constraints: SpecificationSection;
}>;

export type CommercialSpecificationDisplayItem = Readonly<{
  key: CommercialSpecificationInputKey;
  label: string;
  value: string;
  maxLength: number;
  multiline: boolean;
  required: boolean;
}>;

export type CommercialSpecificationConfirmationBindingClaims = Readonly<{
  v: typeof BINDING_VERSION;
  alg: typeof BINDING_ALGORITHM;
  aud: typeof BINDING_AUDIENCE;
  purpose: typeof BINDING_PURPOSE;
  publicReference: string;
  conceptBriefId: string;
  outputId: string;
}>;

type ExactCommercialSpecificationAuthority = Readonly<{
  conceptBriefId: string;
  outputId: string;
  briefPayload: unknown;
}>;

export interface CommercialSpecificationConfirmationRepository {
  resolveExactCurrentAuthority(
    publicReference: string,
    outputId: string,
  ): Promise<ExactCommercialSpecificationAuthority | null>;
  hasExactDesignDirectionConfirmation(
    conceptBriefId: string,
    outputId: string,
  ): Promise<boolean>;
  insertExactConfirmation(input: Readonly<{
    conceptBriefId: string;
    outputId: string;
    specificationVersion: typeof COMMERCIAL_SPECIFICATION_SNAPSHOT_VERSION;
    specificationSnapshot: CommercialSpecificationSnapshot;
    specificationSha256: string;
  }>): Promise<"inserted" | "already_confirmed" | "unavailable">;
}

type Dependencies = Readonly<{
  readCustomerView: (request: Readonly<{
    publicReference: string;
  }>) => Promise<FirstPreviewCustomerView>;
  repository: CommercialSpecificationConfirmationRepository;
  signingSecret: string;
}>;

export type CommercialSpecificationConfirmationWriteResult =
  | Readonly<{ ok: true; status: "created" | "already_confirmed" }>
  | Readonly<{
      ok: false;
      reason: "invalid" | "denied" | "unavailable" | "design_unconfirmed";
    }>;

function snapshotOwnDataRecord(
  value: unknown,
  allowedKeys?: readonly string[],
): Record<string, unknown> | null {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      nodeUtilTypes.isProxy(value)
    ) {
      return null;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (
      keys.some(
        (key) =>
          typeof key !== "string" ||
          (allowedKeys !== undefined && !allowedKeys.includes(key)),
      )
    ) {
      return null;
    }
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
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  );
}

function specificationValueMaxLength(key: CommercialSpecificationInputKey) {
  return LONG_SPECIFICATION_KEYS.includes(key)
    ? LONG_SPECIFICATION_VALUE_MAX_LENGTH
    : DEFAULT_SPECIFICATION_VALUE_MAX_LENGTH;
}

export function normalizeCommercialSpecificationInput(
  value: unknown,
): CommercialSpecificationInput | null {
  const record = snapshotOwnDataRecord(value, COMMERCIAL_SPECIFICATION_INPUT_KEYS);
  if (!record) return null;
  const normalized: Partial<Record<CommercialSpecificationInputKey, string>> = {};
  for (const key of Object.keys(record) as CommercialSpecificationInputKey[]) {
    const rawValue = record[key];
    if (typeof rawValue !== "string") return null;
    const normalizedValue = rawValue.trim().replace(/\s+/g, " ");
    if (!normalizedValue) continue;
    if (normalizedValue.length > specificationValueMaxLength(key)) return null;
    normalized[key] = normalizedValue;
  }
  if (!normalized.pieceType || !normalized.structure) return null;
  return normalized;
}

export function commercialSpecificationPrefillFromBrief(
  briefPayload: unknown,
): CommercialSpecificationInput | null {
  const payload = snapshotOwnDataRecord(briefPayload);
  if (!payload) return null;
  const brief = snapshotOwnDataRecord(payload.brief ?? payload.conceptBrief);
  if (!brief) return null;
  const prefill: Partial<Record<CommercialSpecificationInputKey, string>> = {};
  for (const key of COMMERCIAL_SPECIFICATION_INPUT_KEYS) {
    const value = brief[key];
    if (typeof value === "string") prefill[key] = value;
    if (
      (key === "chainIncluded" || key === "manualChainConfirmationRequired") &&
      typeof value === "boolean"
    ) {
      prefill[key] = value ? "yes" : "no";
    }
  }
  return normalizeCommercialSpecificationInput(prefill);
}

function sectionFromInput(
  input: CommercialSpecificationInput,
  keys: readonly CommercialSpecificationInputKey[],
): Record<string, string> {
  const section: Record<string, string> = {};
  for (const key of keys) {
    const value = input[key];
    if (value) section[key] = value;
  }
  return section;
}

export function buildCommercialSpecificationSnapshot(
  input: CommercialSpecificationInput,
): CommercialSpecificationSnapshot {
  return {
    specificationVersion: COMMERCIAL_SPECIFICATION_SNAPSHOT_VERSION,
    piece: sectionFromInput(input, PIECE_SPECIFICATION_KEYS),
    material: sectionFromInput(input, MATERIAL_SPECIFICATION_KEYS),
    gemstones: sectionFromInput(input, GEMSTONE_SPECIFICATION_KEYS),
    sizeAndWear: sectionFromInput(input, SIZE_AND_WEAR_SPECIFICATION_KEYS),
    constraints: sectionFromInput(input, CONSTRAINT_SPECIFICATION_KEYS),
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

export function serializeCommercialSpecificationSnapshot(
  snapshot: CommercialSpecificationSnapshot,
): string {
  return JSON.stringify(canonicalize(snapshot));
}

export function hashCommercialSpecificationSnapshot(
  snapshot: CommercialSpecificationSnapshot,
): string {
  return createHash("sha256")
    .update(serializeCommercialSpecificationSnapshot(snapshot), "utf8")
    .digest("hex");
}

const DISPLAY_LABELS: Readonly<Record<string, string>> = {
  pieceType: "Piece type",
  branch: "Piece direction",
  structure: "Structure",
  subStructure: "Sub-structure",
  earringPairDirection: "Earring pair direction",
  braceletStructureNote: "Bracelet structure",
  customUse: "Intended use",
  customLook: "Custom appearance",
  customPieceNote: "Custom piece note",
  metalDirection: "Metal",
  finishDirection: "Finish",
  customMetalDirection: "Custom metal direction",
  stoneLogic: "Stone structure",
  focalStoneType: "Focal stone type",
  focalStoneColor: "Stone color direction",
  focalStoneShape: "Stone shape",
  focalStoneSize: "Focal stone size",
  multiStoneTypeMix: "Stone type mix",
  multiStoneShapeMix: "Stone shape mix",
  multiStoneSizeRelationship: "Stone size relationship",
  multiStoneLayout: "Multi-stone arrangement",
  repeatedStoneCoverage: "Repeated-stone coverage",
  repeatedStoneFeeling: "Repeated-stone direction",
  repeatedStoneSize: "Repeated-stone size",
  repeatedSettingStyle: "Repeated-stone setting",
  optionalStoneDirection: "Optional stone direction",
  stoneDirection: "Stone direction",
  stationType: "Station type",
  stationSpacing: "Station spacing",
  stationDetailSize: "Station dimensions",
  stationSetting: "Station setting",
  stationNote: "Station note",
  sizeDirection: "Size / scale direction",
  bandWidthDirection: "Band width",
  bandProfileDirection: "Band profile",
  chainStyle: "Chain style",
  chainIncluded: "Chain included",
  chainThickness: "Chain thickness",
  chainLength: "Chain length",
  chainNote: "Chain note",
  manualChainConfirmationRequired: "Chain confirmation required",
  engravingDirection: "Engraving",
  wearability: "Wearability",
  customScale: "Custom scale",
  customWearable: "Custom wear requirements",
  mustInclude: "Must include",
  mustAvoid: "Must avoid",
  personalization: "Personalization",
  customSymbol: "Custom symbol",
  customTextPattern: "Custom text / pattern",
  productionConcernNote: "Specification note",
  manualConfirmation: "To-confirm note",
};

export function commercialSpecificationDisplayItems(
  input: CommercialSpecificationInput,
): CommercialSpecificationDisplayItem[] {
  const visibleKeys = new Set<CommercialSpecificationInputKey>(
    Object.keys(input) as CommercialSpecificationInputKey[],
  );
  // Always give the customer a bounded place to record a missing specification
  // detail, even when the original Concept Brief did not contain one.
  visibleKeys.add("productionConcernNote");
  return COMMERCIAL_SPECIFICATION_INPUT_KEYS.filter((key) => visibleKeys.has(key)).map(
    (key) => ({
      key,
      label: DISPLAY_LABELS[key] ?? key,
      value: /^[a-z0-9_]+$/.test(input[key] ?? "")
        ? (input[key] ?? "")
            .split("_")
            .map((part) => (/^\d+k$/.test(part) ? part.toUpperCase() : part))
            .join(" ")
        : input[key] ?? "",
      maxLength: specificationValueMaxLength(key),
      multiline: LONG_SPECIFICATION_KEYS.includes(key),
      required: REQUIRED_SPECIFICATION_KEYS.includes(
        key as (typeof REQUIRED_SPECIFICATION_KEYS)[number],
      ),
    }),
  );
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
    return decoded.length > 0 && decoded.toString("base64url") === value
      ? decoded
      : null;
  } catch {
    return null;
  }
}

function signBinding(encodedPayload: string, signingSecret: string): Buffer {
  return createHmac("sha256", signingSecret)
    .update(`${BINDING_SIGNING_DOMAIN}${encodedPayload}`, "utf8")
    .digest();
}

export function createCommercialSpecificationConfirmationBinding(
  input: Readonly<{
    publicReference: string;
    conceptBriefId: string;
    outputId: string;
  }>,
  signingSecret: string,
): string | null {
  if (
    !isValidFirstPreviewPublicReference(input.publicReference) ||
    !isValidFirstPreviewAssetUuid(input.conceptBriefId) ||
    !isValidFirstPreviewAssetUuid(input.outputId) ||
    !isUsableSigningSecret(signingSecret)
  ) {
    return null;
  }
  const claims: CommercialSpecificationConfirmationBindingClaims = {
    v: BINDING_VERSION,
    alg: BINDING_ALGORITHM,
    aud: BINDING_AUDIENCE,
    purpose: BINDING_PURPOSE,
    publicReference: input.publicReference,
    conceptBriefId: input.conceptBriefId,
    outputId: input.outputId,
  };
  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  const token = `${encodedPayload}.${signBinding(encodedPayload, signingSecret).toString("base64url")}`;
  return Buffer.byteLength(token, "utf8") <=
    COMMERCIAL_SPECIFICATION_BINDING_MAX_TOKEN_BYTES
    ? token
    : null;
}

export function verifyCommercialSpecificationConfirmationBinding(
  token: unknown,
  signingSecret: unknown,
): CommercialSpecificationConfirmationBindingClaims | null {
  if (
    typeof token !== "string" ||
    Buffer.byteLength(token, "utf8") >
      COMMERCIAL_SPECIFICATION_BINDING_MAX_TOKEN_BYTES ||
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
  const expected = signBinding(encodedPayload, signingSecret);
  if (!timingSafeEqual(signature, expected)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.toString("utf8"));
  } catch {
    return null;
  }
  const keys = [
    "alg",
    "aud",
    "conceptBriefId",
    "outputId",
    "publicReference",
    "purpose",
    "v",
  ] as const;
  const claims = snapshotOwnDataRecord(parsed, keys);
  if (
    !claims ||
    !hasExactKeys(claims, keys) ||
    claims.v !== BINDING_VERSION ||
    claims.alg !== BINDING_ALGORITHM ||
    claims.aud !== BINDING_AUDIENCE ||
    claims.purpose !== BINDING_PURPOSE ||
    typeof claims.publicReference !== "string" ||
    !isValidFirstPreviewPublicReference(claims.publicReference) ||
    typeof claims.conceptBriefId !== "string" ||
    !isValidFirstPreviewAssetUuid(claims.conceptBriefId) ||
    typeof claims.outputId !== "string" ||
    !isValidFirstPreviewAssetUuid(claims.outputId)
  ) {
    return null;
  }
  const canonicalPayload = Buffer.from(
    JSON.stringify({
      v: claims.v,
      alg: claims.alg,
      aud: claims.aud,
      purpose: claims.purpose,
      publicReference: claims.publicReference,
      conceptBriefId: claims.conceptBriefId,
      outputId: claims.outputId,
    }),
    "utf8",
  ).toString("base64url");
  return encodedPayload === canonicalPayload
    ? {
        v: BINDING_VERSION,
        alg: BINDING_ALGORITHM,
        aud: BINDING_AUDIENCE,
        purpose: BINDING_PURPOSE,
        publicReference: claims.publicReference,
        conceptBriefId: claims.conceptBriefId,
        outputId: claims.outputId,
      }
    : null;
}

function normalizeBody(body: unknown): Readonly<{
  binding: string;
  specification: CommercialSpecificationInput;
}> | null {
  const record = snapshotOwnDataRecord(body, ["binding", "specification"]);
  const specification = record
    ? normalizeCommercialSpecificationInput(record.specification)
    : null;
  return record &&
    hasExactKeys(record, ["binding", "specification"]) &&
    typeof record.binding === "string" &&
    record.binding.length > 0 &&
    Buffer.byteLength(record.binding, "utf8") <=
      COMMERCIAL_SPECIFICATION_BINDING_MAX_TOKEN_BYTES &&
    specification
    ? { binding: record.binding, specification }
    : null;
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "23505",
  );
}

export function createSupabaseCommercialSpecificationConfirmationRepository(
  supabase: SupabaseClient,
): CommercialSpecificationConfirmationRepository {
  return {
    async resolveExactCurrentAuthority(publicReference, outputId) {
      try {
        const { data: briefs, error: briefError } = await supabase
          .from("concept_briefs")
          .select("id, public_reference, brief_payload")
          .eq("public_reference", publicReference)
          .limit(2);
        if (briefError || !Array.isArray(briefs) || briefs.length !== 1) return null;
        const brief = briefs[0] as Record<string, unknown>;
        if (
          brief.public_reference !== publicReference ||
          typeof brief.id !== "string" ||
          !isValidFirstPreviewAssetUuid(brief.id)
        ) {
          return null;
        }
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
        return output.id === outputId &&
          output.concept_brief_id === brief.id &&
          output.readiness_status === "first_preview_ready" &&
          output.is_current_customer_preview === true &&
          output.readiness_revoked_at === null
          ? {
              conceptBriefId: brief.id,
              outputId,
              briefPayload: brief.brief_payload,
            }
          : null;
      } catch {
        return null;
      }
    },
    async hasExactDesignDirectionConfirmation(conceptBriefId, outputId) {
      try {
        const { data, error } = await supabase
          .from("first_preview_design_direction_confirmations")
          .select("id")
          .eq("concept_brief_id", conceptBriefId)
          .eq("ai_sketch_output_id", outputId)
          .limit(2);
        return !error && Array.isArray(data) && data.length === 1;
      } catch {
        return false;
      }
    },
    async insertExactConfirmation(input) {
      try {
        const { error } = await supabase
          .from("commercial_specification_confirmations")
          .insert({
            concept_brief_id: input.conceptBriefId,
            ai_sketch_output_id: input.outputId,
            specification_version: input.specificationVersion,
            specification_snapshot: input.specificationSnapshot,
            specification_sha256: input.specificationSha256,
          });
        if (!error) return "inserted";
        return isUniqueConflict(error) ? "already_confirmed" : "unavailable";
      } catch (error) {
        return isUniqueConflict(error) ? "already_confirmed" : "unavailable";
      }
    },
  };
}

function exactReadyOutputFromView(
  view: FirstPreviewCustomerView,
  publicReference: string,
  outputId: string,
): "exact" | "denied" | "unavailable" {
  if (view.state === "denied") return "denied";
  if (view.state !== "ready") return "unavailable";
  if (view.assetRequest.publicReference !== publicReference) return "denied";
  return view.assetRequest.outputId === outputId ? "exact" : "unavailable";
}

export async function prepareCommercialSpecificationConfirmation(
  publicReference: string,
  outputId: string,
): Promise<
  Readonly<{
    binding: string;
    items: CommercialSpecificationDisplayItem[];
  }> | null
> {
  if (
    !isValidFirstPreviewPublicReference(publicReference) ||
    !isValidFirstPreviewAssetUuid(outputId)
  ) return null;
  const signingSecret =
    process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ?? "";
  const supabase = createSupabaseAdminClientOrNull();
  if (!supabase || !isUsableSigningSecret(signingSecret)) return null;
  const repository =
    createSupabaseCommercialSpecificationConfirmationRepository(supabase);
  const authority = await repository.resolveExactCurrentAuthority(
    publicReference,
    outputId,
  );
  if (!authority) return null;
  const prefill = commercialSpecificationPrefillFromBrief(authority.briefPayload);
  if (!prefill) return null;
  const binding = createCommercialSpecificationConfirmationBinding(
    {
      publicReference,
      conceptBriefId: authority.conceptBriefId,
      outputId,
    },
    signingSecret,
  );
  return binding
    ? {
        binding,
        items: commercialSpecificationDisplayItems(prefill),
      }
    : null;
}

export async function persistCommercialSpecificationConfirmation(
  publicReference: unknown,
  body: unknown,
  dependencies?: Dependencies,
): Promise<CommercialSpecificationConfirmationWriteResult> {
  if (
    typeof publicReference !== "string" ||
    !isValidFirstPreviewPublicReference(publicReference)
  ) return { ok: false, reason: "invalid" };
  const normalized = normalizeBody(body);
  if (!normalized) return { ok: false, reason: "invalid" };
  const signingSecret =
    dependencies?.signingSecret ??
    process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV] ??
    "";
  const claims = verifyCommercialSpecificationConfirmationBinding(
    normalized.binding,
    signingSecret,
  );
  if (!claims) return { ok: false, reason: "invalid" };
  if (claims.publicReference !== publicReference) {
    return { ok: false, reason: "denied" };
  }

  const supabase = dependencies ? null : createSupabaseAdminClientOrNull();
  if (!dependencies && !supabase) return { ok: false, reason: "unavailable" };
  const active = dependencies ?? {
    readCustomerView: readFirstPreviewCustomerViewBinding,
    repository: createSupabaseCommercialSpecificationConfirmationRepository(
      supabase!,
    ),
    signingSecret,
  };

  try {
    const firstView = await active.readCustomerView({ publicReference });
    const firstViewResult = exactReadyOutputFromView(
      firstView,
      publicReference,
      claims.outputId,
    );
    if (firstViewResult !== "exact") {
      return { ok: false, reason: firstViewResult };
    }
    const authority = await active.repository.resolveExactCurrentAuthority(
      publicReference,
      claims.outputId,
    );
    if (
      !authority ||
      authority.conceptBriefId !== claims.conceptBriefId ||
      authority.outputId !== claims.outputId
    ) return { ok: false, reason: "unavailable" };

    const snapshot = buildCommercialSpecificationSnapshot(normalized.specification);
    const specificationSha256 = hashCommercialSpecificationSnapshot(snapshot);
    const hasM3Confirmation =
      await active.repository.hasExactDesignDirectionConfirmation(
        authority.conceptBriefId,
        authority.outputId,
      );
    if (!hasM3Confirmation) {
      return { ok: false, reason: "design_unconfirmed" };
    }

    const finalView = await active.readCustomerView({ publicReference });
    const finalViewResult = exactReadyOutputFromView(
      finalView,
      publicReference,
      claims.outputId,
    );
    if (finalViewResult !== "exact") {
      return { ok: false, reason: finalViewResult };
    }
    const finalAuthority = await active.repository.resolveExactCurrentAuthority(
      publicReference,
      claims.outputId,
    );
    if (
      !finalAuthority ||
      finalAuthority.conceptBriefId !== authority.conceptBriefId ||
      finalAuthority.outputId !== authority.outputId
    ) return { ok: false, reason: "unavailable" };
    const inserted = await active.repository.insertExactConfirmation({
      conceptBriefId: authority.conceptBriefId,
      outputId: authority.outputId,
      specificationVersion: COMMERCIAL_SPECIFICATION_SNAPSHOT_VERSION,
      specificationSnapshot: snapshot,
      specificationSha256,
    });
    if (inserted === "inserted") return { ok: true, status: "created" };
    if (inserted === "already_confirmed") {
      return { ok: true, status: "already_confirmed" };
    }
    return { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
