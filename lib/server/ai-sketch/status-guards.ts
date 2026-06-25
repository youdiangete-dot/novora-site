import {
  AI_SKETCH_REVIEW_STATUSES,
  type AiSketchReviewStatus,
} from "../../ai-sketch-review-status";

export const LEGAL_AI_SKETCH_REVIEW_STATUSES = AI_SKETCH_REVIEW_STATUSES;

export type LegalAiSketchReviewStatus = AiSketchReviewStatus;

export function normalizeAiSketchReviewStatus(value: unknown): LegalAiSketchReviewStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  return isLegalAiSketchReviewStatus(normalizedValue) ? normalizedValue : null;
}

export function isLegalAiSketchReviewStatus(value: unknown): value is LegalAiSketchReviewStatus {
  return (
    typeof value === "string" &&
    (LEGAL_AI_SKETCH_REVIEW_STATUSES as readonly string[]).includes(value)
  );
}

export function isIllegalPendingAiSketchReviewStatus(value: unknown): boolean {
  return typeof value === "string" && value.trim() === "pending";
}

export function generationSuccessRequiresHumanApproval(value: {
  generationSucceeded?: unknown;
  reviewStatus?: unknown;
}): boolean {
  if (value.generationSucceeded !== true) {
    return true;
  }

  return normalizeAiSketchReviewStatus(value.reviewStatus) !== "approved_for_customer";
}
