import "server-only";

import {
  AI_SKETCH_REVIEW_INITIAL_STATUS,
  type AiSketchReviewStatus,
  isAiSketchReviewStatus,
} from "../ai-sketch-review-status";
import {
  resolveAdminCurrentFirstPreview,
} from "./admin-first-preview";
import { isValidFirstPreviewAssetUuid } from "./ai-sketch/first-preview-generated-assets-contract";
import { createFirstPreviewRepository } from "./ai-sketch/first-preview-persistence";
import { createSupabaseAdminClientOrNull } from "./supabase";

export type AdminAiSketchReviewBindingStatus =
  | "no-current-output"
  | "missing-review"
  | "unbound-review"
  | "exact"
  | "conflict";

export type AdminAiSketchReviewReadModel = {
  reviewStatus: AiSketchReviewStatus;
  revisionInstruction: string | null;
  approvedForCustomerAt: string | null;
  approvedBy: string | null;
  approvalRevokedAt: string | null;
  revokedBy: string | null;
  updatedAt: string | null;
  hasPersistedReview: boolean;
  currentAiSketchOutputId: string | null;
  reviewAiSketchOutputId: string | null;
  reviewBindingStatus: AdminAiSketchReviewBindingStatus;
};

type AiSketchReviewRow = {
  ai_sketch_output_id: string | null;
  concept_brief_id: string | null;
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
    currentAiSketchOutputId: null,
    reviewAiSketchOutputId: null,
    reviewBindingStatus: "no-current-output",
  };
}

export function classifyAdminAiSketchReviewBinding(input: {
  currentAiSketchOutputId: string | null;
  hasPersistedReview: boolean;
  reviewAiSketchOutputId: string | null;
  reviewConceptBriefMatches: boolean;
}): AdminAiSketchReviewBindingStatus {
  if (!input.currentAiSketchOutputId) {
    return "no-current-output";
  }

  if (!input.hasPersistedReview) {
    return "missing-review";
  }

  if (!input.reviewAiSketchOutputId) {
    return "unbound-review";
  }

  return input.reviewConceptBriefMatches &&
    input.reviewAiSketchOutputId === input.currentAiSketchOutputId
    ? "exact"
    : "conflict";
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

  try {
    const supabase = createSupabaseAdminClientOrNull();

    if (!supabase) {
      return createFallbackAdminAiSketchReviewReadModel();
    }

    const currentOutput = await resolveAdminCurrentFirstPreview(
      normalizedConceptBriefId,
      {
        repository: createFirstPreviewRepository({
          supabaseClient: supabase,
        }),
      },
    );

    const { data: reviewRow, error: reviewError } = await supabase
      .from("ai_sketch_reviews")
      .select(
        "ai_sketch_output_id, concept_brief_id, review_status, revision_instruction, approved_for_customer_at, approved_by, approval_revoked_at, revoked_by, updated_at",
      )
      .eq("concept_brief_id", normalizedConceptBriefId)
      .maybeSingle<AiSketchReviewRow>();

    if (reviewError) {
      return {
        ...createFallbackAdminAiSketchReviewReadModel(),
        currentAiSketchOutputId: currentOutput?.id ?? null,
        reviewBindingStatus: currentOutput ? "missing-review" : "no-current-output",
      };
    }

    const currentAiSketchOutputId = currentOutput?.id ?? null;
    const reviewAiSketchOutputId =
      reviewRow?.ai_sketch_output_id &&
      isValidFirstPreviewAssetUuid(reviewRow.ai_sketch_output_id)
        ? reviewRow.ai_sketch_output_id
        : null;

    if (!reviewRow) {
      return {
        ...createFallbackAdminAiSketchReviewReadModel(),
        currentAiSketchOutputId,
        reviewBindingStatus: currentOutput ? "missing-review" : "no-current-output",
      };
    }

    const reviewStatus = normalizeReviewStatus(reviewRow.review_status);
    const isApprovedForCustomer = reviewStatus === "approved_for_customer";
    const reviewConceptBriefMatches =
      reviewRow.concept_brief_id === normalizedConceptBriefId;
    const reviewBindingStatus = classifyAdminAiSketchReviewBinding({
      currentAiSketchOutputId,
      hasPersistedReview: true,
      reviewAiSketchOutputId,
      reviewConceptBriefMatches,
    });

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
      currentAiSketchOutputId,
      reviewAiSketchOutputId,
      reviewBindingStatus,
    };
  } catch {
    return createFallbackAdminAiSketchReviewReadModel();
  }
}
