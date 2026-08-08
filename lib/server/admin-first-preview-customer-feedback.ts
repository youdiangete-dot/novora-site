import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveAdminCurrentFirstPreview } from "./admin-first-preview";
import { createFirstPreviewRepository } from "./ai-sketch/first-preview-persistence";
import { createSupabaseAdminClientOrNull } from "./supabase";

export type AdminFirstPreviewCustomerFeedbackReadModel =
  | Readonly<{ state: "exact"; feedbackText: string; createdAt: string }>
  | Readonly<{ state: "none" | "unavailable" }>;

type Options = Readonly<{ supabaseClient?: SupabaseClient | null }>;

export function mapExactAdminFirstPreviewCustomerFeedback(
  row: unknown,
  conceptBriefId: string,
  outputId: string,
): AdminFirstPreviewCustomerFeedbackReadModel {
  if (!row || typeof row !== "object" || Array.isArray(row)) return { state: "unavailable" };
  const record = row as Record<string, unknown>;
  const feedbackText = typeof record.feedback_text === "string" ? record.feedback_text.trim() : "";
  const createdAt = typeof record.created_at === "string" ? record.created_at : "";
  if (record.concept_brief_id !== conceptBriefId || record.ai_sketch_output_id !== outputId ||
    feedbackText.length < 1 || feedbackText.length > 2_000 || !Number.isFinite(Date.parse(createdAt))) {
    return { state: "unavailable" };
  }
  return { state: "exact", feedbackText, createdAt };
}

export async function loadAdminFirstPreviewCustomerFeedback(
  conceptBriefId: string,
  options: Options = {},
): Promise<AdminFirstPreviewCustomerFeedbackReadModel> {
  const suppliedClient = Object.prototype.hasOwnProperty.call(options, "supabaseClient");
  const supabase = suppliedClient ? options.supabaseClient ?? null : createSupabaseAdminClientOrNull();
  if (!supabase) return { state: "unavailable" };
  try {
    const currentOutput = await resolveAdminCurrentFirstPreview(conceptBriefId, {
      repository: createFirstPreviewRepository({ supabaseClient: supabase }),
    });
    if (!currentOutput) return { state: "none" };
    const { data, error } = await supabase
      .from("first_preview_customer_feedback")
      .select("concept_brief_id, ai_sketch_output_id, feedback_text, created_at")
      .eq("concept_brief_id", conceptBriefId)
      .eq("ai_sketch_output_id", currentOutput.id)
      .limit(2);
    if (error || !Array.isArray(data)) return { state: "unavailable" };
    if (data.length === 0) return { state: "none" };
    if (data.length !== 1) return { state: "unavailable" };
    return mapExactAdminFirstPreviewCustomerFeedback(data[0], conceptBriefId, currentOutput.id);
  } catch {
    return { state: "unavailable" };
  }
}
