import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isValidFirstPreviewAssetUuid } from "./ai-sketch/first-preview-generated-assets-contract";
import { createSupabaseAdminClientOrNull } from "./supabase";

export type AdminFirstPreviewCustomerFeedbackReadModel =
  | Readonly<{
      state: "exact";
      aiSketchOutputId: string;
      feedbackText: string;
      createdAt: string;
    }>
  | Readonly<{ state: "none" | "unavailable" }>;

type Options = Readonly<{ supabaseClient?: SupabaseClient | null }>;

export function mapExactAdminFirstPreviewCustomerFeedback(
  row: unknown,
  conceptBriefId: string,
  outputId: string,
): AdminFirstPreviewCustomerFeedbackReadModel {
  if (
    !isValidFirstPreviewAssetUuid(conceptBriefId) ||
    !isValidFirstPreviewAssetUuid(outputId)
  ) {
    return { state: "unavailable" };
  }
  if (!row || typeof row !== "object" || Array.isArray(row)) return { state: "unavailable" };
  const record = row as Record<string, unknown>;
  const feedbackText = typeof record.feedback_text === "string" ? record.feedback_text.trim() : "";
  const createdAt = typeof record.created_at === "string" ? record.created_at : "";
  if (record.concept_brief_id !== conceptBriefId || record.ai_sketch_output_id !== outputId ||
    feedbackText.length < 1 || feedbackText.length > 2_000 || !Number.isFinite(Date.parse(createdAt))) {
    return { state: "unavailable" };
  }
  return { state: "exact", aiSketchOutputId: outputId, feedbackText, createdAt };
}

export async function loadAdminFirstPreviewCustomerFeedback(
  conceptBriefId: string,
  expectedOutputId: string | null,
  options: Options = {},
): Promise<AdminFirstPreviewCustomerFeedbackReadModel> {
  if (typeof conceptBriefId !== "string") return { state: "unavailable" };
  const normalizedConceptBriefId = conceptBriefId.trim();
  if (!isValidFirstPreviewAssetUuid(normalizedConceptBriefId)) {
    return { state: "unavailable" };
  }
  if (expectedOutputId === null) return { state: "none" };
  if (typeof expectedOutputId !== "string") return { state: "unavailable" };
  const normalizedExpectedOutputId = expectedOutputId.trim();
  if (!isValidFirstPreviewAssetUuid(normalizedExpectedOutputId)) {
    return { state: "unavailable" };
  }

  const suppliedClient = Object.prototype.hasOwnProperty.call(options, "supabaseClient");
  const supabase = suppliedClient ? options.supabaseClient ?? null : createSupabaseAdminClientOrNull();
  if (!supabase) return { state: "unavailable" };
  try {
    const { data, error } = await supabase
      .from("first_preview_customer_feedback")
      .select("concept_brief_id, ai_sketch_output_id, feedback_text, created_at")
      .eq("concept_brief_id", normalizedConceptBriefId)
      .eq("ai_sketch_output_id", normalizedExpectedOutputId)
      .limit(2);
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    if (data.length === 0) return { state: "none" };
    if (data.length !== 1) return { state: "unavailable" };
    return mapExactAdminFirstPreviewCustomerFeedback(
      data[0],
      normalizedConceptBriefId,
      normalizedExpectedOutputId,
    );
  } catch {
    return { state: "unavailable" };
  }
}
