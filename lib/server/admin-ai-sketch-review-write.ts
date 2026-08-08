import "server-only";

import {
  AI_SKETCH_REVIEW_INITIAL_STATUS,
  type AiSketchReviewStatus,
  isAiSketchReviewStatus,
} from "../ai-sketch-review-status";
import { resolveAdminCurrentFirstPreview } from "./admin-first-preview";
import { isValidFirstPreviewAssetUuid } from "./ai-sketch/first-preview-generated-assets-contract";
import { createFirstPreviewRepository } from "./ai-sketch/first-preview-persistence";
import { createSupabaseAdminClientOrNull } from "./supabase";

export type AdminAiSketchReviewWriteResult =
  | {
      ok: true;
      reviewStatus: AiSketchReviewStatus;
      aiSketchOutputId: string;
    }
  | {
      ok: false;
      reason: "invalid-input" | "unavailable" | "missing-row" | "output-mismatch" | "linkage-conflict" | "write-failed";
      message: string;
    };

type AiSketchReviewWriteRow = {
  ai_sketch_output_id: string | null;
  concept_brief_id: string | null;
  review_status: string | null;
};

const unavailableMessage = "AI sketch review persistence is temporarily unavailable.";
const writeFailedMessage = "AI sketch review state could not be saved.";

function normalizeConceptBriefId(conceptBriefId: string): string {
  return conceptBriefId.trim();
}

export function isExactAdminAiSketchReviewIdentity(
  row: Pick<AiSketchReviewWriteRow, "ai_sketch_output_id" | "concept_brief_id"> | null,
  conceptBriefId: string,
  aiSketchOutputId: string,
): boolean {
  return row?.concept_brief_id === conceptBriefId &&
    row.ai_sketch_output_id === aiSketchOutputId;
}

export function isAdminCurrentFirstPreviewReviewStatus(
  reviewStatus: string,
): reviewStatus is AiSketchReviewStatus {
  return (
    isAiSketchReviewStatus(reviewStatus) &&
    reviewStatus !== AI_SKETCH_REVIEW_INITIAL_STATUS
  );
}

function mapReviewRowStatus(
  row: AiSketchReviewWriteRow | null,
  conceptBriefId: string,
  aiSketchOutputId: string,
): AiSketchReviewStatus | null {
  const reviewStatus = row?.review_status?.trim();

  if (
    !isExactAdminAiSketchReviewIdentity(row, conceptBriefId, aiSketchOutputId) ||
    !reviewStatus ||
    !isAdminCurrentFirstPreviewReviewStatus(reviewStatus)
  ) {
    return null;
  }

  return reviewStatus;
}

export async function updateAdminAiSketchReview(
  conceptBriefId: string,
  aiSketchOutputId: string,
  reviewStatus: AiSketchReviewStatus,
): Promise<AdminAiSketchReviewWriteResult> {
  const normalizedConceptBriefId = normalizeConceptBriefId(conceptBriefId);
  const normalizedOutputId = aiSketchOutputId.trim();

  if (
    !isValidFirstPreviewAssetUuid(normalizedConceptBriefId) ||
    !isValidFirstPreviewAssetUuid(normalizedOutputId) ||
    !isAdminCurrentFirstPreviewReviewStatus(reviewStatus)
  ) {
    return {
      ok: false,
      reason: "invalid-input",
      message: writeFailedMessage,
    };
  }

  try {
    const supabase = createSupabaseAdminClientOrNull();

    if (!supabase) {
      return {
        ok: false,
        reason: "unavailable",
        message: unavailableMessage,
      };
    }

    const currentOutput = await resolveAdminCurrentFirstPreview(
      normalizedConceptBriefId,
      {
        repository: createFirstPreviewRepository({ supabaseClient: supabase }),
      },
    );

    if (!currentOutput || currentOutput.id !== normalizedOutputId) {
      return {
        ok: false,
        reason: "output-mismatch",
        message: "The displayed First Preview is no longer the current ready output. Reload before reviewing.",
      };
    }

    const { data: existingRow, error: existingError } = await supabase
      .from("ai_sketch_reviews")
      .select("ai_sketch_output_id, concept_brief_id, review_status")
      .eq("concept_brief_id", normalizedConceptBriefId)
      .maybeSingle<AiSketchReviewWriteRow>();

    if (existingError) {
      return {
        ok: false,
        reason: "write-failed",
        message: writeFailedMessage,
      };
    }

    if (!existingRow) {
      return {
        ok: false,
        reason: "missing-row",
        message: "The lifecycle-owned AI sketch review row is unavailable for this First Preview.",
      };
    }

    if (
      !isExactAdminAiSketchReviewIdentity(
        existingRow,
        normalizedConceptBriefId,
        normalizedOutputId,
      )
    ) {
      return {
        ok: false,
        reason: "linkage-conflict",
        message: "AI sketch review linkage conflicts with the current First Preview. No review was saved.",
      };
    }

    const { data: reviewRow, error: reviewError } = await supabase
      .from("ai_sketch_reviews")
      .update({
        review_status: reviewStatus,
      })
      .eq("concept_brief_id", normalizedConceptBriefId)
      .eq("ai_sketch_output_id", normalizedOutputId)
      .select("ai_sketch_output_id, concept_brief_id, review_status")
      .maybeSingle<AiSketchReviewWriteRow>();

    const savedReviewStatus = mapReviewRowStatus(
      reviewRow,
      normalizedConceptBriefId,
      normalizedOutputId,
    );

    if (reviewError) {
      return {
        ok: false,
        reason: "write-failed",
        message: writeFailedMessage,
      };
    }

    if (!savedReviewStatus) {
      return {
        ok: false,
        reason: "missing-row",
        message: "No AI sketch review row exists for this Concept Brief yet.",
      };
    }

    return {
      ok: true,
      reviewStatus: savedReviewStatus,
      aiSketchOutputId: normalizedOutputId,
    };
  } catch {
    return {
      ok: false,
      reason: "write-failed",
      message: writeFailedMessage,
    };
  }
}
