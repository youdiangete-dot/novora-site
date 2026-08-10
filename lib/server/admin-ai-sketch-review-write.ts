import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  AI_SKETCH_REVIEW_INITIAL_STATUS,
  type AiSketchReviewStatus,
  isAiSketchReviewStatus,
} from "../ai-sketch-review-status";
import { resolveAdminCurrentFirstPreview } from "./admin-first-preview";
import { isValidFirstPreviewAssetUuid } from "./ai-sketch/first-preview-generated-assets-contract";
import { createFirstPreviewRepository } from "./ai-sketch/first-preview-persistence";
import type { FirstPreviewRepository } from "./ai-sketch/first-preview-persistence-contract";
import { createSupabaseAdminClientOrNull } from "./supabase";

export const ADMIN_AI_SKETCH_REVISION_INSTRUCTION_MAX_LENGTH = 2000;

export type AdminAiSketchReviewWriteResult =
  | {
      ok: true;
      reviewStatus: AiSketchReviewStatus;
      aiSketchOutputId: string;
      revisionInstruction: string | null;
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
  revision_instruction: string | null;
};

type AdminAiSketchReviewWriteOptions = Readonly<{
  supabaseClient?: SupabaseClient | null;
  repository?: FirstPreviewRepository;
}>;

const unavailableMessage = "AI sketch review persistence is temporarily unavailable.";
const writeFailedMessage = "AI sketch review state could not be saved.";

function normalizeConceptBriefId(conceptBriefId: string): string {
  return conceptBriefId.trim();
}

export function normalizeAdminAiSketchRevisionInstruction(
  reviewStatus: AiSketchReviewStatus,
  revisionInstruction: unknown,
): string | null | undefined {
  if (reviewStatus !== "needs_revision") {
    return null;
  }

  if (typeof revisionInstruction !== "string") {
    return undefined;
  }

  const normalizedInstruction = revisionInstruction.trim();

  return normalizedInstruction.length >= 1 &&
    normalizedInstruction.length <= ADMIN_AI_SKETCH_REVISION_INSTRUCTION_MAX_LENGTH
    ? normalizedInstruction
    : undefined;
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

function mapReviewRowState(
  row: AiSketchReviewWriteRow | null,
  conceptBriefId: string,
  aiSketchOutputId: string,
  requestedReviewStatus: AiSketchReviewStatus,
  requestedRevisionInstruction: string | null,
): { reviewStatus: AiSketchReviewStatus; revisionInstruction: string | null } | null {
  const reviewStatus = row?.review_status?.trim();

  if (
    !isExactAdminAiSketchReviewIdentity(row, conceptBriefId, aiSketchOutputId) ||
    !reviewStatus ||
    !isAdminCurrentFirstPreviewReviewStatus(reviewStatus) ||
    reviewStatus !== requestedReviewStatus ||
    row.revision_instruction !== requestedRevisionInstruction
  ) {
    return null;
  }

  return {
    reviewStatus,
    revisionInstruction: row.revision_instruction,
  };
}

export async function updateAdminAiSketchReview(
  conceptBriefId: string,
  aiSketchOutputId: string,
  reviewStatus: AiSketchReviewStatus,
  revisionInstruction: string | null,
  options: AdminAiSketchReviewWriteOptions = {},
): Promise<AdminAiSketchReviewWriteResult> {
  const normalizedConceptBriefId = normalizeConceptBriefId(conceptBriefId);
  const normalizedOutputId = aiSketchOutputId.trim();
  const normalizedRevisionInstruction = normalizeAdminAiSketchRevisionInstruction(
    reviewStatus,
    revisionInstruction,
  );

  if (
    !isValidFirstPreviewAssetUuid(normalizedConceptBriefId) ||
    !isValidFirstPreviewAssetUuid(normalizedOutputId) ||
    !isAdminCurrentFirstPreviewReviewStatus(reviewStatus) ||
    normalizedRevisionInstruction === undefined ||
    normalizedRevisionInstruction !== revisionInstruction
  ) {
    return {
      ok: false,
      reason: "invalid-input",
      message: writeFailedMessage,
    };
  }

  try {
    const supabase =
      options.supabaseClient === undefined
        ? createSupabaseAdminClientOrNull()
        : options.supabaseClient;

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
        repository:
          options.repository ?? createFirstPreviewRepository({ supabaseClient: supabase }),
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
      .select("ai_sketch_output_id, concept_brief_id, review_status, revision_instruction")
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
        revision_instruction: normalizedRevisionInstruction,
      })
      .eq("concept_brief_id", normalizedConceptBriefId)
      .eq("ai_sketch_output_id", normalizedOutputId)
      .select("ai_sketch_output_id, concept_brief_id, review_status, revision_instruction")
      .maybeSingle<AiSketchReviewWriteRow>();

    const savedReviewState = mapReviewRowState(
      reviewRow,
      normalizedConceptBriefId,
      normalizedOutputId,
      reviewStatus,
      normalizedRevisionInstruction,
    );

    if (reviewError) {
      return {
        ok: false,
        reason: "write-failed",
        message: writeFailedMessage,
      };
    }

    if (!savedReviewState) {
      return {
        ok: false,
        reason: reviewRow ? "write-failed" : "missing-row",
        message: reviewRow
          ? writeFailedMessage
          : "No AI sketch review row exists for this Concept Brief yet.",
      };
    }

    return {
      ok: true,
      reviewStatus: savedReviewState.reviewStatus,
      aiSketchOutputId: normalizedOutputId,
      revisionInstruction: savedReviewState.revisionInstruction,
    };
  } catch {
    return {
      ok: false,
      reason: "write-failed",
      message: writeFailedMessage,
    };
  }
}
