import "server-only";

import {
  type AiSketchReviewStatus,
  isAiSketchReviewStatus,
} from "../ai-sketch-review-status";
import { createSupabaseAdminClientOrNull } from "./supabase";

export type AdminAiSketchReviewWriteMode = "create" | "update";

export type AdminAiSketchReviewWriteResult =
  | {
      ok: true;
      reviewStatus: AiSketchReviewStatus;
    }
  | {
      ok: false;
      reason: "invalid-input" | "unavailable" | "already-exists" | "missing-row" | "write-failed";
      message: string;
    };

type AiSketchReviewWriteRow = {
  concept_brief_id: string | null;
  review_status: string | null;
};

type SupabaseSafeError = {
  code?: string;
};

const unavailableMessage = "AI sketch review persistence is temporarily unavailable.";
const writeFailedMessage = "AI sketch review state could not be saved.";

function normalizeConceptBriefId(conceptBriefId: string): string {
  return conceptBriefId.trim();
}

function isUniqueConstraintConflict(error: SupabaseSafeError | null): boolean {
  return error?.code === "23505";
}

function mapReviewRowStatus(row: AiSketchReviewWriteRow | null): AiSketchReviewStatus | null {
  const reviewStatus = row?.review_status?.trim();

  return reviewStatus && isAiSketchReviewStatus(reviewStatus) ? reviewStatus : null;
}

export async function createAdminAiSketchReview(
  conceptBriefId: string,
  reviewStatus: AiSketchReviewStatus,
): Promise<AdminAiSketchReviewWriteResult> {
  const normalizedConceptBriefId = normalizeConceptBriefId(conceptBriefId);

  if (!normalizedConceptBriefId || !isAiSketchReviewStatus(reviewStatus)) {
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

    const { data: reviewRow, error: reviewError } = await supabase
      .from("ai_sketch_reviews")
      .insert({
        concept_brief_id: normalizedConceptBriefId,
        review_status: reviewStatus,
      })
      .select("concept_brief_id, review_status")
      .single<AiSketchReviewWriteRow>();

    if (isUniqueConstraintConflict(reviewError)) {
      return {
        ok: false,
        reason: "already-exists",
        message: "An AI sketch review row already exists for this Concept Brief.",
      };
    }

    const savedReviewStatus = mapReviewRowStatus(reviewRow);

    if (reviewError || !savedReviewStatus) {
      return {
        ok: false,
        reason: "write-failed",
        message: writeFailedMessage,
      };
    }

    return {
      ok: true,
      reviewStatus: savedReviewStatus,
    };
  } catch {
    return {
      ok: false,
      reason: "write-failed",
      message: writeFailedMessage,
    };
  }
}

export async function updateAdminAiSketchReview(
  conceptBriefId: string,
  reviewStatus: AiSketchReviewStatus,
): Promise<AdminAiSketchReviewWriteResult> {
  const normalizedConceptBriefId = normalizeConceptBriefId(conceptBriefId);

  if (!normalizedConceptBriefId || !isAiSketchReviewStatus(reviewStatus)) {
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

    const { data: reviewRow, error: reviewError } = await supabase
      .from("ai_sketch_reviews")
      .update({
        review_status: reviewStatus,
      })
      .eq("concept_brief_id", normalizedConceptBriefId)
      .select("concept_brief_id, review_status")
      .maybeSingle<AiSketchReviewWriteRow>();

    const savedReviewStatus = mapReviewRowStatus(reviewRow);

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
    };
  } catch {
    return {
      ok: false,
      reason: "write-failed",
      message: writeFailedMessage,
    };
  }
}
