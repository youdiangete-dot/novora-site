import "server-only";

import type { AdminBriefRecord, BriefStatus } from "../../app/admin/briefs/briefReviewData";
import { createSupabaseAdminClientOrNull } from "./supabase";

type ConceptBriefListRow = {
  id: string;
  public_reference: string | null;
  status: string | null;
  piece_type: string | null;
  branch: string | null;
  structure: string | null;
  sub_structure: string | null;
  ai_sketch_instruction: string | null;
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
    }
  | {
      ok: false;
      records: [];
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

function readString(value: string | null): string {
  return value?.trim() || "";
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
    .select("id, public_reference, status, piece_type, branch, structure, sub_structure, ai_sketch_instruction, created_at, updated_at")
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

  return {
    ok: true,
    records: briefRows.map((brief): AdminBriefRecord => {
      const contact = contactsByBriefId.get(brief.id);
      const submittedAt = readString(brief.created_at) || new Date(0).toISOString();

      return {
        conceptBriefId: readString(brief.public_reference) || brief.id,
        submittedAt,
        lastUpdatedAt: readString(brief.updated_at) || submittedAt,
        customerName: readString(contact?.customer_name ?? null),
        customerEmail: readString(contact?.customer_email ?? null),
        customerCountry: readString(contact?.country_region ?? null),
        customerPhone: readString(contact?.phone_whatsapp ?? null),
        contactNote: readString(contact?.contact_note ?? null),
        pieceType: readString(brief.piece_type),
        branch: readString(brief.branch),
        structure: readString(brief.structure),
        subStructure: readString(brief.sub_structure),
        aiSketchInstruction: readString(brief.ai_sketch_instruction),
        status: mapStatus(brief.status),
        source: "supabase",
      };
    }),
  };
}
