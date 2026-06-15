import "server-only";

import {
  AI_SKETCH_REVIEW_INITIAL_STATUS,
  type AiSketchReviewStatus,
  isAiSketchReviewStatus,
} from "../ai-sketch-review-status";
import { createSupabaseAdminClientOrNull } from "./supabase";

export type AdminAiSketchReviewReadModel = {
  reviewStatus: AiSketchReviewStatus;
  revisionInstruction: string | null;
  approvedForCustomerAt: string | null;
  approvedBy: string | null;
  approvalRevokedAt: string | null;
  revokedBy: string | null;
  updatedAt: string | null;
  hasPersistedReview: boolean;
};

type AiSketchReviewRow = {
  review_status: string | null;
  revision_instruction: string | null;
  approved_for_customer_at: string | null;
  approved_by: string | null;
  approval_revoked_at: string | null;
  revoked_by: string | null;
  updated_at: string | null;
};

export function createFallbackAdminAiSketchReviewReadModel(): AdminAiSketchReviewReadModel {
  return {
    reviewStatus: AI_SKETCH_REVIEW_INITIAL_STATUS,
    revisionInstruction: null,
    approvedForCustomerAt: null,
    approvedBy: null,
    approvalRevokedAt: null,
    revokedBy: null,
    updatedAt: null,
    hasPersistedReview: false,
  };
}

function readNullableString(value: string | null): string | null {
  return value?.trim() || null;
}

function normalizeReviewStatus(value: string | null): AiSketchReviewStatus {
  const normalizedValue = value?.trim();

  return normalizedValue && isAiSketchReviewStatus(normalizedValue)
    ? normalizedValue
    : AI_SKETCH_REVIEW_INITIAL_STATUS;
}

export async function loadAdminAiSketchReviewByConceptBriefId(
  conceptBriefId: string,
): Promise<AdminAiSketchReviewReadModel> {
  const normalizedConceptBriefId = conceptBriefId.trim();

  if (!normalizedConceptBriefId) {
    return createFallbackAdminAiSketchReviewReadModel();
  }

  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return createFallbackAdminAiSketchReviewReadModel();
  }

  const { data: reviewRow, error: reviewError } = await supabase
    .from("ai_sketch_reviews")
    .select(
      "review_status, revision_instruction, approved_for_customer_at, approved_by, approval_revoked_at, revoked_by, updated_at",
    )
    .eq("concept_brief_id", normalizedConceptBriefId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<AiSketchReviewRow>();

  if (reviewError || !reviewRow) {
    return createFallbackAdminAiSketchReviewReadModel();
  }

  const reviewStatus = normalizeReviewStatus(reviewRow.review_status);
  const isApprovedForCustomer = reviewStatus === "approved_for_customer";

  return {
    reviewStatus,
    revisionInstruction: readNullableString(reviewRow.revision_instruction),
    approvedForCustomerAt: isApprovedForCustomer
      ? readNullableString(reviewRow.approved_for_customer_at)
      : null,
    approvedBy: isApprovedForCustomer ? readNullableString(reviewRow.approved_by) : null,
    approvalRevokedAt: readNullableString(reviewRow.approval_revoked_at),
    revokedBy: readNullableString(reviewRow.revoked_by),
    updatedAt: readNullableString(reviewRow.updated_at),
    hasPersistedReview: true,
  };
}
