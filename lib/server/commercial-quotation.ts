import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { types as nodeUtilTypes } from "node:util";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClientOrNull } from "./supabase";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./ai-sketch/first-preview-generated-assets-contract";
import {
  commercialAmountToMinorUnits,
  isSupportedCommercialCurrency,
} from "./commercial-currency";

export const COMMERCIAL_QUOTATION_VERSION = "commercial_quotation_v1" as const;
export const COMMERCIAL_QUOTATION_MAX_LINE_ITEMS = 8 as const;

const DESCRIPTION_MAX_LENGTH = 160;
const NOTE_MAX_LENGTH = 1_000;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const QUOTE_REFERENCE_PATTERN = /^NOVORA-Q-[A-F0-9]{24}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;

export type CommercialQuotationLineItem = Readonly<{
  description: string;
  amount: string;
}>;

export type CommercialQuotationSnapshot = Readonly<{
  quotationVersion: typeof COMMERCIAL_QUOTATION_VERSION;
  currency: string;
  lineItems: readonly CommercialQuotationLineItem[];
  totalAmount: string;
  validUntil: string | null;
  note: string | null;
}>;

export type SafeCommercialQuotation = Readonly<{
  quoteReference: string;
  issuedAt: string;
  quotation: CommercialQuotationSnapshot;
}>;

type CurrentJourney = Readonly<{
  conceptBriefId: string;
  outputId: string;
}>;

type SpecificationConfirmation = Readonly<{
  id: string;
  conceptBriefId: string;
  outputId: string;
  specificationSha256: string;
}>;

type QuotationRow = Readonly<{
  quote_reference: unknown;
  quotation_version: unknown;
  quotation_snapshot: unknown;
  quotation_sha256: unknown;
  issued_at: unknown;
}>;

export interface CommercialQuotationRepository {
  resolveCurrentJourneyByConceptBriefId(
    conceptBriefId: string,
  ): Promise<CurrentJourney | null>;
  resolveCurrentJourneyByPublicReference(
    publicReference: string,
    outputId: string,
  ): Promise<CurrentJourney | null>;
  findLatestSpecificationConfirmation(
    journey: CurrentJourney,
  ): Promise<SpecificationConfirmation | null | "unavailable">;
  findLatestQuotation(
    commercialSpecificationConfirmationId: string,
  ): Promise<QuotationRow | null | "unavailable">;
  findExactQuotation(
    commercialSpecificationConfirmationId: string,
    quotationSha256: string,
  ): Promise<QuotationRow | null | "unavailable">;
  insertQuotation(input: Readonly<{
    commercialSpecificationConfirmationId: string;
    quotationVersion: typeof COMMERCIAL_QUOTATION_VERSION;
    quotationSnapshot: CommercialQuotationSnapshot;
    quotationSha256: string;
    quoteReference: string;
  }>): Promise<QuotationRow | "conflict" | null>;
}

type Dependencies = Readonly<{
  repository: CommercialQuotationRepository;
  createQuoteReference?: () => string;
}>;

export type CommercialQuotationReadResult =
  | Readonly<{ ok: true; quotation: SafeCommercialQuotation | null }>
  | Readonly<{
      ok: false;
      reason: "invalid" | "journey_unavailable" | "specification_unconfirmed" | "unavailable";
    }>;

export type CommercialQuotationWriteResult =
  | Readonly<{
      ok: true;
      status: "created" | "already_issued";
      quotation: SafeCommercialQuotation;
    }>
  | Readonly<{
      ok: false;
      reason: "invalid" | "journey_unavailable" | "specification_unconfirmed" | "unavailable";
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
    ) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string" || (allowedKeys && !allowedKeys.includes(key)))) {
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
      ) return null;
      snapshot[key] = descriptor.value;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]) {
  const keys = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length &&
    keys.every((key, index) => key === sortedExpected[index]);
}

function normalizePlainText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || CONTROL_CHARACTER_PATTERN.test(value)) return null;
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized && normalized.length <= maxLength ? normalized : null;
}

function amountToMinorUnits(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const match = AMOUNT_PATTERN.exec(normalized);
  if (!match) return null;
  const wholeUnits = Number(match[1]);
  const fractionalUnits = Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(wholeUnits) || !Number.isSafeInteger(fractionalUnits)) return null;
  const wholeMinorUnits = wholeUnits * 100;
  if (!Number.isSafeInteger(wholeMinorUnits)) return null;
  const minorUnits = wholeMinorUnits + fractionalUnits;
  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
}

function minorUnitsToAmount(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function normalizeValidUntil(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const match = DATE_PATTERN.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : undefined;
}

function normalizeOptionalNote(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  return normalizePlainText(value, NOTE_MAX_LENGTH) ?? undefined;
}

export function normalizeCommercialQuotationInput(
  value: unknown,
): Omit<CommercialQuotationSnapshot, "quotationVersion" | "totalAmount"> | null {
  const record = snapshotOwnDataRecord(value, [
    "currency",
    "lineItems",
    "validUntil",
    "note",
  ]);
  if (!record || !hasExactKeys(record, ["currency", "lineItems", "validUntil", "note"])) {
    return null;
  }
  if (typeof record.currency !== "string" || !CURRENCY_PATTERN.test(record.currency)) {
    return null;
  }
  if (
    !Array.isArray(record.lineItems) ||
    record.lineItems.length < 1 ||
    record.lineItems.length > COMMERCIAL_QUOTATION_MAX_LINE_ITEMS
  ) return null;

  const lineItems: CommercialQuotationLineItem[] = [];
  let totalMinorUnits = 0;
  for (const item of record.lineItems) {
    const itemRecord = snapshotOwnDataRecord(item, ["description", "amount"]);
    if (!itemRecord || !hasExactKeys(itemRecord, ["description", "amount"])) return null;
    const description = normalizePlainText(itemRecord.description, DESCRIPTION_MAX_LENGTH);
    const amountMinorUnits = amountToMinorUnits(itemRecord.amount);
    if (!description || amountMinorUnits === null) return null;
    const nextTotalMinorUnits = totalMinorUnits + amountMinorUnits;
    if (!Number.isSafeInteger(nextTotalMinorUnits)) return null;
    totalMinorUnits = nextTotalMinorUnits;
    lineItems.push({
      description,
      amount: minorUnitsToAmount(amountMinorUnits),
    });
  }
  const validUntil = normalizeValidUntil(record.validUntil);
  const note = normalizeOptionalNote(record.note);
  if (validUntil === undefined || note === undefined) return null;
  return { currency: record.currency, lineItems, validUntil, note };
}

export function buildCommercialQuotationSnapshot(
  input: Omit<CommercialQuotationSnapshot, "quotationVersion" | "totalAmount">,
): CommercialQuotationSnapshot {
  let totalMinorUnits = 0;
  for (const item of input.lineItems) {
    const amountMinorUnits = amountToMinorUnits(item.amount);
    const nextTotalMinorUnits = amountMinorUnits === null
      ? Number.NaN
      : totalMinorUnits + amountMinorUnits;
    if (!Number.isSafeInteger(nextTotalMinorUnits)) {
      throw new RangeError("Quotation total cannot be represented safely in minor units.");
    }
    totalMinorUnits = nextTotalMinorUnits;
  }
  return {
    quotationVersion: COMMERCIAL_QUOTATION_VERSION,
    currency: input.currency,
    lineItems: input.lineItems,
    totalAmount: minorUnitsToAmount(totalMinorUnits),
    validUntil: input.validUntil,
    note: input.note,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record).sort().map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

export function serializeCommercialQuotationSnapshot(snapshot: CommercialQuotationSnapshot) {
  return JSON.stringify(canonicalize(snapshot));
}

export function hashCommercialQuotationSnapshot(snapshot: CommercialQuotationSnapshot) {
  return createHash("sha256")
    .update(serializeCommercialQuotationSnapshot(snapshot), "utf8")
    .digest("hex");
}

function isPaymentCompatibleNewQuotation(snapshot: CommercialQuotationSnapshot): boolean {
  return isSupportedCommercialCurrency(snapshot.currency) &&
    snapshot.lineItems.every((item) =>
      commercialAmountToMinorUnits(item.amount, snapshot.currency) !== null
    ) &&
    commercialAmountToMinorUnits(snapshot.totalAmount, snapshot.currency) !== null;
}

export function generateCommercialQuotationReference() {
  return `NOVORA-Q-${randomBytes(12).toString("hex").toUpperCase()}`;
}

function safeQuotationFromRow(row: QuotationRow | null): SafeCommercialQuotation | null {
  if (
    !row ||
    typeof row.quote_reference !== "string" ||
    !QUOTE_REFERENCE_PATTERN.test(row.quote_reference) ||
    row.quotation_version !== COMMERCIAL_QUOTATION_VERSION ||
    typeof row.quotation_sha256 !== "string" ||
    !/^[0-9a-f]{64}$/.test(row.quotation_sha256) ||
    typeof row.issued_at !== "string" ||
    !Number.isFinite(Date.parse(row.issued_at))
  ) return null;
  const snapshot = snapshotOwnDataRecord(row.quotation_snapshot, [
    "quotationVersion",
    "currency",
    "lineItems",
    "totalAmount",
    "validUntil",
    "note",
  ]);
  if (
    !snapshot ||
    !hasExactKeys(snapshot, [
      "quotationVersion",
      "currency",
      "lineItems",
      "totalAmount",
      "validUntil",
      "note",
    ]) ||
    snapshot.quotationVersion !== COMMERCIAL_QUOTATION_VERSION ||
    typeof snapshot.totalAmount !== "string"
  ) return null;
  const normalized = normalizeCommercialQuotationInput({
    currency: snapshot.currency,
    lineItems: snapshot.lineItems,
    validUntil: snapshot.validUntil,
    note: snapshot.note,
  });
  if (!normalized) return null;
  const quotation = buildCommercialQuotationSnapshot(normalized);
  if (
    quotation.totalAmount !== snapshot.totalAmount ||
    hashCommercialQuotationSnapshot(quotation) !== row.quotation_sha256 ||
    serializeCommercialQuotationSnapshot(quotation) !==
      serializeCommercialQuotationSnapshot(snapshot as unknown as CommercialQuotationSnapshot)
  ) return null;
  return {
    quoteReference: row.quote_reference,
    issuedAt: row.issued_at,
    quotation,
  };
}

function isUniqueConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

export function createSupabaseCommercialQuotationRepository(
  supabase: SupabaseClient,
): CommercialQuotationRepository {
  async function resolveJourneyByBriefId(conceptBriefId: string): Promise<CurrentJourney | null> {
    try {
      const { data, error } = await supabase
        .from("ai_sketch_outputs")
        .select("id, concept_brief_id, readiness_status, is_current_customer_preview, readiness_revoked_at")
        .eq("concept_brief_id", conceptBriefId)
        .eq("readiness_status", "first_preview_ready")
        .eq("is_current_customer_preview", true)
        .is("readiness_revoked_at", null)
        .limit(2);
      if (error || !Array.isArray(data) || data.length !== 1) return null;
      const output = data[0] as Record<string, unknown>;
      return typeof output.id === "string" &&
        isValidFirstPreviewAssetUuid(output.id) &&
        output.concept_brief_id === conceptBriefId &&
        output.readiness_status === "first_preview_ready" &&
        output.is_current_customer_preview === true &&
        output.readiness_revoked_at === null
        ? { conceptBriefId, outputId: output.id }
        : null;
    } catch {
      return null;
    }
  }

  return {
    resolveCurrentJourneyByConceptBriefId: resolveJourneyByBriefId,
    async resolveCurrentJourneyByPublicReference(publicReference, outputId) {
      try {
        const { data, error } = await supabase
          .from("concept_briefs")
          .select("id, public_reference")
          .eq("public_reference", publicReference)
          .limit(2);
        if (error || !Array.isArray(data)) return null;
        if (data.length === 0) return null;
        if (data.length !== 1) return null;
        const brief = data[0] as Record<string, unknown>;
        if (
          typeof brief.id !== "string" ||
          !isValidFirstPreviewAssetUuid(brief.id) ||
          brief.public_reference !== publicReference
        ) return null;
        const journey = await resolveJourneyByBriefId(brief.id);
        return journey?.outputId === outputId ? journey : null;
      } catch {
        return null;
      }
    },
    async findLatestSpecificationConfirmation(journey) {
      try {
        const { data, error } = await supabase
          .from("commercial_specification_confirmations")
          .select("id, concept_brief_id, ai_sketch_output_id, specification_sha256, confirmed_at, created_at")
          .eq("concept_brief_id", journey.conceptBriefId)
          .eq("ai_sketch_output_id", journey.outputId)
          .order("confirmed_at", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1);
        if (error || !Array.isArray(data)) return "unavailable";
        if (data.length === 0) return null;
        if (data.length !== 1) return "unavailable";
        const confirmation = data[0] as Record<string, unknown>;
        return typeof confirmation.id === "string" &&
          isValidFirstPreviewAssetUuid(confirmation.id) &&
          confirmation.concept_brief_id === journey.conceptBriefId &&
          confirmation.ai_sketch_output_id === journey.outputId &&
          typeof confirmation.specification_sha256 === "string" &&
          /^[0-9a-f]{64}$/.test(confirmation.specification_sha256)
          ? {
              id: confirmation.id,
              conceptBriefId: journey.conceptBriefId,
              outputId: journey.outputId,
              specificationSha256: confirmation.specification_sha256,
            }
          : "unavailable";
      } catch {
        return "unavailable";
      }
    },
    async findLatestQuotation(confirmationId) {
      try {
        const { data, error } = await supabase
          .from("commercial_quotations")
          .select("quote_reference, quotation_version, quotation_snapshot, quotation_sha256, issued_at")
          .eq("commercial_specification_confirmation_id", confirmationId)
          .order("issued_at", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1);
        if (error || !Array.isArray(data)) return "unavailable";
        if (data.length === 0) return null;
        return data.length === 1 ? data[0] as QuotationRow : "unavailable";
      } catch {
        return "unavailable";
      }
    },
    async findExactQuotation(confirmationId, quotationSha256) {
      try {
        const { data, error } = await supabase
          .from("commercial_quotations")
          .select("quote_reference, quotation_version, quotation_snapshot, quotation_sha256, issued_at")
          .eq("commercial_specification_confirmation_id", confirmationId)
          .eq("quotation_sha256", quotationSha256)
          .limit(2);
        if (error || !Array.isArray(data)) return "unavailable";
        if (data.length === 0) return null;
        return data.length === 1 ? data[0] as QuotationRow : "unavailable";
      } catch {
        return "unavailable";
      }
    },
    async insertQuotation(input) {
      try {
        const { data, error } = await supabase
          .from("commercial_quotations")
          .insert({
            quote_reference: input.quoteReference,
            commercial_specification_confirmation_id:
              input.commercialSpecificationConfirmationId,
            quotation_version: input.quotationVersion,
            quotation_snapshot: input.quotationSnapshot,
            quotation_sha256: input.quotationSha256,
          })
          .select("quote_reference, quotation_version, quotation_snapshot, quotation_sha256, issued_at")
          .maybeSingle();
        if (error) return isUniqueConflict(error) ? "conflict" : null;
        return data ? data as QuotationRow : null;
      } catch (error) {
        return isUniqueConflict(error) ? "conflict" : null;
      }
    },
  };
}

function activeDependencies(dependencies?: Dependencies): Dependencies | null {
  if (dependencies) return dependencies;
  const supabase = createSupabaseAdminClientOrNull();
  return supabase
    ? { repository: createSupabaseCommercialQuotationRepository(supabase) }
    : null;
}

async function latestBasisForJourney(
  journey: CurrentJourney | null,
  repository: CommercialQuotationRepository,
): Promise<SpecificationConfirmation | null | "unavailable"> {
  return journey ? repository.findLatestSpecificationConfirmation(journey) : null;
}

async function revalidateAdminBasis(
  conceptBriefId: string,
  expectedJourney: CurrentJourney,
  expectedBasis: SpecificationConfirmation,
  repository: CommercialQuotationRepository,
) {
  const journey = await repository.resolveCurrentJourneyByConceptBriefId(conceptBriefId);
  if (
    !journey ||
    journey.conceptBriefId !== expectedJourney.conceptBriefId ||
    journey.outputId !== expectedJourney.outputId
  ) return false;
  const basis = await repository.findLatestSpecificationConfirmation(journey);
  return Boolean(
    basis && basis !== "unavailable" &&
    basis.id === expectedBasis.id &&
    basis.specificationSha256 === expectedBasis.specificationSha256,
  );
}

export async function readAdminCommercialQuotation(
  conceptBriefId: unknown,
  dependencies?: Dependencies,
): Promise<CommercialQuotationReadResult> {
  if (typeof conceptBriefId !== "string" || !isValidFirstPreviewAssetUuid(conceptBriefId)) {
    return { ok: false, reason: "invalid" };
  }
  const active = activeDependencies(dependencies);
  if (!active) return { ok: false, reason: "unavailable" };
  try {
    const journey = await active.repository.resolveCurrentJourneyByConceptBriefId(conceptBriefId);
    if (!journey) return { ok: false, reason: "journey_unavailable" };
    const basis = await latestBasisForJourney(journey, active.repository);
    if (basis === "unavailable") return { ok: false, reason: "unavailable" };
    if (!basis) return { ok: false, reason: "specification_unconfirmed" };
    const row = await active.repository.findLatestQuotation(basis.id);
    if (row === "unavailable") return { ok: false, reason: "unavailable" };
    if (!row) return { ok: true, quotation: null };
    const quotation = safeQuotationFromRow(row);
    return quotation
      ? { ok: true, quotation }
      : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function issueCommercialQuotation(
  body: unknown,
  dependencies?: Dependencies,
): Promise<CommercialQuotationWriteResult> {
  const record = snapshotOwnDataRecord(body, [
    "conceptBriefId",
    "currency",
    "lineItems",
    "validUntil",
    "note",
  ]);
  if (
    !record ||
    !hasExactKeys(record, ["conceptBriefId", "currency", "lineItems", "validUntil", "note"]) ||
    typeof record.conceptBriefId !== "string" ||
    !isValidFirstPreviewAssetUuid(record.conceptBriefId)
  ) return { ok: false, reason: "invalid" };
  const normalized = normalizeCommercialQuotationInput({
    currency: record.currency,
    lineItems: record.lineItems,
    validUntil: record.validUntil,
    note: record.note,
  });
  if (!normalized) return { ok: false, reason: "invalid" };
  const snapshot = buildCommercialQuotationSnapshot(normalized);
  if (!isPaymentCompatibleNewQuotation(snapshot)) {
    return { ok: false, reason: "invalid" };
  }
  const active = activeDependencies(dependencies);
  if (!active) return { ok: false, reason: "unavailable" };

  try {
    const journey = await active.repository.resolveCurrentJourneyByConceptBriefId(record.conceptBriefId);
    if (!journey) return { ok: false, reason: "journey_unavailable" };
    const basis = await latestBasisForJourney(journey, active.repository);
    if (basis === "unavailable") return { ok: false, reason: "unavailable" };
    if (!basis) return { ok: false, reason: "specification_unconfirmed" };
    const quotationSha256 = hashCommercialQuotationSnapshot(snapshot);
    const exactRow = await active.repository.findExactQuotation(basis.id, quotationSha256);
    if (exactRow === "unavailable") return { ok: false, reason: "unavailable" };
    const existing = safeQuotationFromRow(exactRow);
    if (existing) {
      const remainsLatest = await revalidateAdminBasis(
        record.conceptBriefId,
        journey,
        basis,
        active.repository,
      );
      return remainsLatest
        ? { ok: true, status: "already_issued", quotation: existing }
        : { ok: false, reason: "journey_unavailable" };
    }

    const remainsLatest = await revalidateAdminBasis(
      record.conceptBriefId,
      journey,
      basis,
      active.repository,
    );
    if (!remainsLatest) return { ok: false, reason: "journey_unavailable" };

    const inserted = await active.repository.insertQuotation({
      commercialSpecificationConfirmationId: basis.id,
      quotationVersion: COMMERCIAL_QUOTATION_VERSION,
      quotationSnapshot: snapshot,
      quotationSha256,
      quoteReference: (active.createQuoteReference ?? generateCommercialQuotationReference)(),
    });
    if (inserted === "conflict") {
      const idempotentRow = await active.repository.findExactQuotation(basis.id, quotationSha256);
      if (idempotentRow === "unavailable") return { ok: false, reason: "unavailable" };
      const idempotent = safeQuotationFromRow(idempotentRow);
      return idempotent
        ? { ok: true, status: "already_issued", quotation: idempotent }
        : { ok: false, reason: "unavailable" };
    }
    const quotation = safeQuotationFromRow(inserted);
    return quotation
      ? { ok: true, status: "created", quotation }
      : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function readCustomerCommercialQuotation(
  publicReference: unknown,
  outputId: unknown,
  dependencies?: Dependencies,
): Promise<SafeCommercialQuotation | null> {
  if (
    typeof publicReference !== "string" ||
    !isValidFirstPreviewPublicReference(publicReference) ||
    typeof outputId !== "string" ||
    !isValidFirstPreviewAssetUuid(outputId)
  ) return null;
  const active = activeDependencies(dependencies);
  if (!active) return null;
  try {
    const journey = await active.repository.resolveCurrentJourneyByPublicReference(
      publicReference,
      outputId,
    );
    const basis = await latestBasisForJourney(journey, active.repository);
    if (!basis || basis === "unavailable") return null;
    const row = await active.repository.findLatestQuotation(basis.id);
    return row === "unavailable" ? null : safeQuotationFromRow(row);
  } catch {
    return null;
  }
}
