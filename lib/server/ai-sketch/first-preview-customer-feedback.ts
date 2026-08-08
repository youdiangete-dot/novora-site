import "server-only";

import { types as nodeUtilTypes } from "node:util";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClientOrNull } from "../supabase";
import { isValidFirstPreviewAssetUuid, isValidFirstPreviewPublicReference } from "./first-preview-generated-assets-contract";
import type { FirstPreviewCustomerView } from "./first-preview-customer-view";
import { readFirstPreviewCustomerViewBinding } from "./first-preview-customer-view-binding";

export const FIRST_PREVIEW_CUSTOMER_FEEDBACK_MAX_LENGTH = 2_000 as const;

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
}>;

function plainRecord(value: unknown): Record<string, unknown> | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value) || nodeUtilTypes.isProxy(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 1 || keys[0] !== "feedback") return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, "feedback");
    return descriptor?.enumerable === true && Object.prototype.hasOwnProperty.call(descriptor, "value")
      ? { feedback: descriptor.value }
      : null;
  } catch {
    return null;
  }
}

export function normalizeFirstPreviewCustomerFeedbackBody(body: unknown): string | null {
  const record = plainRecord(body);
  if (!record || typeof record.feedback !== "string") return null;
  const feedback = record.feedback.trim();
  return feedback.length >= 1 && feedback.length <= FIRST_PREVIEW_CUSTOMER_FEEDBACK_MAX_LENGTH
    ? feedback
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
  const feedback = normalizeFirstPreviewCustomerFeedbackBody(body);
  if (!feedback) return { ok: false, reason: "invalid" };

  const supabase = dependencies ? null : createSupabaseAdminClientOrNull();
  if (!dependencies && !supabase) return { ok: false, reason: "unavailable" };
  const activeDependencies = dependencies ?? {
    readCustomerView: readFirstPreviewCustomerViewBinding,
    repository: createSupabaseFirstPreviewCustomerFeedbackRepository(supabase!),
  };

  try {
    const customerView = await activeDependencies.readCustomerView({ publicReference });
    if (customerView.state === "denied") return { ok: false, reason: "denied" };
    if (customerView.state !== "ready") return { ok: false, reason: "unavailable" };
    if (customerView.assetRequest.publicReference !== publicReference || !isValidFirstPreviewAssetUuid(customerView.assetRequest.outputId)) {
      return { ok: false, reason: "denied" };
    }

    const pair = await activeDependencies.repository.resolveExactCurrentPair(
      publicReference,
      customerView.assetRequest.outputId,
    );
    if (!pair || pair.outputId !== customerView.assetRequest.outputId || !isValidFirstPreviewAssetUuid(pair.conceptBriefId)) {
      return { ok: false, reason: "unavailable" };
    }

    const inserted = await activeDependencies.repository.insertExactFeedback({
      conceptBriefId: pair.conceptBriefId,
      outputId: pair.outputId,
      feedback,
    });
    if (inserted === "duplicate") return { ok: false, reason: "duplicate" };
    return inserted === "inserted" ? { ok: true } : { ok: false, reason: "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
