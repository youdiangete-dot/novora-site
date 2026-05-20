import "server-only";

import { createSupabaseAdminClientOrNull } from "./supabase";

export type AdminReviewStatusSlug =
  | "new"
  | "reviewing"
  | "needs-info"
  | "ready-for-sketch"
  | "closed";

export type PersistedAdminReviewState = {
  conceptBriefId: string;
  reviewStatus: AdminReviewStatusSlug;
  internalNotes: string;
  createdAt: string;
};

export type AdminReviewStateLoadResult =
  | {
      ok: true;
      statesByConceptBriefId: Map<string, PersistedAdminReviewState>;
      message?: string;
    }
  | {
      ok: false;
      statesByConceptBriefId: Map<string, PersistedAdminReviewState>;
      message: string;
    };

export type AdminReviewStateSaveResult =
  | {
      ok: true;
      state: PersistedAdminReviewState;
    }
  | {
      ok: false;
      message: string;
    };

type AdminNoteRow = {
  concept_brief_id: string;
  note_type: string | null;
  note: string | null;
  created_at: string | null;
};

const REVIEW_STATUS_NOTE_TYPE_PREFIX = "review_status:";
const fallbackUnavailableMessage =
  "Admin review persistence is temporarily unavailable. This review state can be kept as local-only fallback data.";

export const adminReviewStatusSlugs: AdminReviewStatusSlug[] = [
  "new",
  "reviewing",
  "needs-info",
  "ready-for-sketch",
  "closed",
];

export function isAdminReviewStatusSlug(value: unknown): value is AdminReviewStatusSlug {
  return typeof value === "string" && adminReviewStatusSlugs.includes(value as AdminReviewStatusSlug);
}

function parseReviewStatusNoteType(value: string | null): AdminReviewStatusSlug | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  const statusValue = normalizedValue.startsWith(REVIEW_STATUS_NOTE_TYPE_PREFIX)
    ? normalizedValue.slice(REVIEW_STATUS_NOTE_TYPE_PREFIX.length)
    : normalizedValue;

  return isAdminReviewStatusSlug(statusValue) ? statusValue : null;
}

function mapAdminNoteRowToReviewState(row: AdminNoteRow): PersistedAdminReviewState | null {
  const reviewStatus = parseReviewStatusNoteType(row.note_type);

  if (!reviewStatus || !row.concept_brief_id) {
    return null;
  }

  return {
    conceptBriefId: row.concept_brief_id,
    reviewStatus,
    internalNotes: row.note || "",
    createdAt: row.created_at || new Date(0).toISOString(),
  };
}

export async function loadAdminReviewStatesByConceptBriefIds(
  conceptBriefIds: string[],
): Promise<AdminReviewStateLoadResult> {
  const uniqueConceptBriefIds = Array.from(new Set(conceptBriefIds.map((id) => id.trim()).filter(Boolean)));
  const emptyStateMap = new Map<string, PersistedAdminReviewState>();

  if (!uniqueConceptBriefIds.length) {
    return {
      ok: true,
      statesByConceptBriefId: emptyStateMap,
    };
  }

  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      ok: false,
      statesByConceptBriefId: emptyStateMap,
      message: fallbackUnavailableMessage,
    };
  }

  const { data: noteRows, error: noteError } = await supabase
    .from("admin_notes")
    .select("concept_brief_id, note_type, note, created_at")
    .in("concept_brief_id", uniqueConceptBriefIds)
    .order("created_at", { ascending: false })
    .returns<AdminNoteRow[]>();

  if (noteError || !noteRows) {
    return {
      ok: false,
      statesByConceptBriefId: emptyStateMap,
      message: fallbackUnavailableMessage,
    };
  }

  const statesByConceptBriefId = new Map<string, PersistedAdminReviewState>();

  for (const noteRow of noteRows) {
    if (statesByConceptBriefId.has(noteRow.concept_brief_id)) {
      continue;
    }

    const reviewState = mapAdminNoteRowToReviewState(noteRow);

    if (reviewState) {
      statesByConceptBriefId.set(noteRow.concept_brief_id, reviewState);
    }
  }

  return {
    ok: true,
    statesByConceptBriefId,
  };
}

export async function saveAdminReviewState(
  conceptBriefId: string,
  reviewStatus: AdminReviewStatusSlug,
  internalNotes: string,
): Promise<AdminReviewStateSaveResult> {
  const normalizedConceptBriefId = conceptBriefId.trim();

  if (!normalizedConceptBriefId || !isAdminReviewStatusSlug(reviewStatus)) {
    return {
      ok: false,
      message: "Admin review state could not be saved.",
    };
  }

  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      ok: false,
      message: fallbackUnavailableMessage,
    };
  }

  const createdAt = new Date().toISOString();
  const reviewState: PersistedAdminReviewState = {
    conceptBriefId: normalizedConceptBriefId,
    reviewStatus,
    internalNotes,
    createdAt,
  };

  const { error: noteError } = await supabase.from("admin_notes").insert({
    concept_brief_id: normalizedConceptBriefId,
    note_type: `${REVIEW_STATUS_NOTE_TYPE_PREFIX}${reviewStatus}`,
    note: internalNotes,
    created_by: "admin-mvp",
    created_at: createdAt,
  });

  if (noteError) {
    return {
      ok: false,
      message: fallbackUnavailableMessage,
    };
  }

  return {
    ok: true,
    state: reviewState,
  };
}
