import "server-only";

import type { AdminBriefRecord, BriefStatus } from "../../app/admin/briefs/briefReviewData";
import {
  type PersistedAdminReviewState,
  loadAdminReviewStatesByConceptBriefIds,
} from "./admin-review-state";
import { createSupabaseAdminClientOrNull } from "./supabase";

type ConceptBriefListRow = {
  id: string;
  public_reference: string | null;
  status: string | null;
  source?: string | null;
  piece_type: string | null;
  branch: string | null;
  structure: string | null;
  sub_structure: string | null;
  design_objective?: string | null;
  ai_sketch_instruction: string | null;
  summary_items?: unknown;
  brief_payload?: unknown;
  api_submission?: unknown;
  created_at: string | null;
  updated_at: string | null;
};

type ConceptBriefContactRow = {
  concept_brief_id: string;
  customer_name: string | null;
  customer_email: string | null;
  phone_whatsapp: string | null;
  country_region: string | null;
  contact_note: string | null;
};

export type AdminConceptBriefLoadResult =
  | {
      ok: true;
      records: AdminBriefRecord[];
      message?: string;
    }
  | {
      ok: false;
      records: [];
      message: string;
    };

export type AdminConceptBriefDetailLoadResult =
  | {
      ok: true;
      record: AdminBriefRecord | null;
      message?: string;
    }
  | {
      ok: false;
      record: null;
      message: string;
    };

const statusMap: Record<string, BriefStatus> = {
  closed: "Closed",
  needs_more_info: "Need more info",
  new: "New",
  ready_for_cad_discussion: "Ready for CAD discussion",
  reviewing: "Reviewing",
};

function mapStatus(value: string | null): BriefStatus {
  if (!value) {
    return "New";
  }

  return statusMap[value.trim().toLowerCase()] || "New";
}

function mapReviewStatusSlug(value: PersistedAdminReviewState["reviewStatus"]): BriefStatus {
  if (value === "reviewing") {
    return "Reviewing";
  }

  if (value === "needs-info") {
    return "Need more info";
  }

  if (value === "ready-for-sketch") {
    return "Ready for CAD discussion";
  }

  if (value === "closed") {
    return "Closed";
  }

  return "New";
}

function readString(value: string | null): string {
  return value?.trim() || "";
}

function mapBriefRowToAdminRecord(
  brief: ConceptBriefListRow,
  contact?: ConceptBriefContactRow,
  reviewState?: PersistedAdminReviewState,
): AdminBriefRecord {
  const submittedAt = readString(brief.created_at) || new Date(0).toISOString();
  const publicReference = readString(brief.public_reference) || brief.id;
  const reviewStatus = reviewState ? mapReviewStatusSlug(reviewState.reviewStatus) : mapStatus(brief.status);
  const reviewUpdatedAt = reviewState?.createdAt || readString(brief.updated_at) || submittedAt;

  return {
    conceptBriefId: publicReference,
    databaseId: brief.id,
    publicReference,
    submittedAt,
    lastUpdatedAt: reviewUpdatedAt,
    customerName: readString(contact?.customer_name ?? null),
    customerEmail: readString(contact?.customer_email ?? null),
    customerCountry: readString(contact?.country_region ?? null),
    customerPhone: readString(contact?.phone_whatsapp ?? null),
    contactNote: readString(contact?.contact_note ?? null),
    pieceType: readString(brief.piece_type),
    branch: readString(brief.branch),
    structure: readString(brief.structure),
    subStructure: readString(brief.sub_structure),
    designObjective: readString(brief.design_objective ?? null),
    aiSketchInstruction: readString(brief.ai_sketch_instruction),
    databaseStatus: readString(brief.status),
    submissionSource: readString(brief.source ?? null),
    summaryItems: brief.summary_items,
    briefPayload: brief.brief_payload,
    apiSubmission: brief.api_submission,
    createdAt: readString(brief.created_at),
    updatedAt: readString(brief.updated_at),
    status: reviewStatus,
    internalNotes: reviewState?.internalNotes,
    reviewStateSource: reviewState ? "supabase" : undefined,
    reviewStatusSlug: reviewState?.reviewStatus,
    reviewUpdatedAt: reviewState?.createdAt,
    source: "supabase",
  };
}

export async function loadAdminConceptBriefRecords(): Promise<AdminConceptBriefLoadResult> {
  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      ok: false,
      records: [],
      message: "Server Supabase admin access is not configured. Showing local fallback data only.",
    };
  }

  const { data: briefRows, error: briefError } = await supabase
    .from("concept_briefs")
    .select("id, public_reference, status, source, piece_type, branch, structure, sub_structure, ai_sketch_instruction, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ConceptBriefListRow[]>();

  if (briefError || !briefRows) {
    return {
      ok: false,
      records: [],
      message: "Server concept brief data is temporarily unavailable. Showing local fallback data only.",
    };
  }

  const conceptBriefIds = briefRows.map((brief) => brief.id).filter(Boolean);
  const contactsByBriefId = new Map<string, ConceptBriefContactRow>();

  if (conceptBriefIds.length) {
    const { data: contactRows, error: contactError } = await supabase
      .from("concept_brief_contacts")
      .select("concept_brief_id, customer_name, customer_email, phone_whatsapp, country_region, contact_note")
      .in("concept_brief_id", conceptBriefIds)
      .returns<ConceptBriefContactRow[]>();

    if (contactError || !contactRows) {
      return {
        ok: false,
        records: [],
        message: "Server concept brief contact data is temporarily unavailable. Showing local fallback data only.",
      };
    }

    for (const contact of contactRows) {
      contactsByBriefId.set(contact.concept_brief_id, contact);
    }
  }

  const reviewStates = await loadAdminReviewStatesByConceptBriefIds(conceptBriefIds);

  return {
    ok: true,
    records: briefRows.map((brief) =>
      mapBriefRowToAdminRecord(
        brief,
        contactsByBriefId.get(brief.id),
        reviewStates.statesByConceptBriefId.get(brief.id),
      ),
    ),
    message: reviewStates.ok ? undefined : reviewStates.message,
  };
}

export async function loadAdminConceptBriefRecordByReference(
  reference: string,
): Promise<AdminConceptBriefDetailLoadResult> {
  const supabase = createSupabaseAdminClientOrNull();
  const normalizedReference = reference.trim();

  if (!supabase) {
    return {
      ok: false,
      record: null,
      message: "Server Supabase admin access is not configured. Showing local fallback data only.",
    };
  }

  if (!normalizedReference) {
    return {
      ok: true,
      record: null,
    };
  }

  const { data: brief, error: briefError } = await supabase
    .from("concept_briefs")
    .select(
      "id, public_reference, status, source, piece_type, branch, structure, sub_structure, design_objective, ai_sketch_instruction, summary_items, brief_payload, api_submission, created_at, updated_at",
    )
    .eq("public_reference", normalizedReference)
    .maybeSingle<ConceptBriefListRow>();

  if (briefError) {
    return {
      ok: false,
      record: null,
      message: "Server concept brief detail is temporarily unavailable. Showing local fallback data only.",
    };
  }

  if (!brief) {
    return {
      ok: true,
      record: null,
    };
  }

  const { data: contact, error: contactError } = await supabase
    .from("concept_brief_contacts")
    .select("concept_brief_id, customer_name, customer_email, phone_whatsapp, country_region, contact_note")
    .eq("concept_brief_id", brief.id)
    .maybeSingle<ConceptBriefContactRow>();

  if (contactError) {
    return {
      ok: false,
      record: null,
      message: "Server concept brief contact detail is temporarily unavailable. Showing local fallback data only.",
    };
  }

  const reviewStates = await loadAdminReviewStatesByConceptBriefIds([brief.id]);

  return {
    ok: true,
    record: mapBriefRowToAdminRecord(
      brief,
      contact ?? undefined,
      reviewStates.statesByConceptBriefId.get(brief.id),
    ),
    message: reviewStates.ok ? undefined : reviewStates.message,
  };
}
