import "server-only";

import {
  generateConceptBriefPublicReferencePreview,
  type ConceptBriefSubmissionPayload,
} from "./concept-brief-validation";
import { createSupabaseAdminClientOrNull } from "./supabase";

type ConceptBriefRow = {
  id: string;
  public_reference: string;
};

type ConceptBriefInsertPayload = {
  public_reference: string;
  source: "api";
  status: "new";
  piece_type: string | null;
  branch: string | null;
  structure: string | null;
  sub_structure: string | null;
  design_objective: string | null;
  ai_sketch_instruction: string | null;
  brief_payload: ConceptBriefSubmissionPayload;
  summary_items: unknown;
  api_submission: {
    submitted_at: string;
    public_reference: string;
    payload: ConceptBriefSubmissionPayload;
  };
};

type ConceptBriefContactInsertPayload = {
  concept_brief_id: string;
  customer_name: string | null;
  customer_email: string | null;
  phone_whatsapp: string | null;
  country_region: string | null;
  contact_note: string | null;
};

type ConceptBriefPersistenceSuccess = {
  persisted: true;
  publicReference: string;
  conceptBriefId: string;
};

type ConceptBriefPersistenceFailure = {
  persisted: false;
  message: string;
};

export type ConceptBriefPersistenceResult =
  | ConceptBriefPersistenceSuccess
  | ConceptBriefPersistenceFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readContactString(
  submission: ConceptBriefSubmissionPayload,
  field: keyof NonNullable<ConceptBriefSubmissionPayload["contact"]>,
): string | null {
  const contact = isRecord(submission.contact) ? submission.contact : {};

  return readString(submission[field] ?? contact[field]);
}

function readBriefRecord(submission: ConceptBriefSubmissionPayload): Record<string, unknown> {
  const conceptBrief = isRecord(submission.conceptBrief) ? submission.conceptBrief : {};
  const brief = isRecord(submission.brief) ? submission.brief : {};

  return {
    ...brief,
    ...conceptBrief,
  };
}

function readBriefString(
  submission: ConceptBriefSubmissionPayload,
  brief: Record<string, unknown>,
  field: string,
): string | null {
  return readString(submission[field as keyof ConceptBriefSubmissionPayload] ?? brief[field]);
}

export async function persistConceptBriefSubmission(
  payload: ConceptBriefSubmissionPayload,
): Promise<ConceptBriefPersistenceResult> {
  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      persisted: false,
      message: "Concept Brief persistence is temporarily unavailable due to server configuration.",
    };
  }

  const brief = readBriefRecord(payload);
  const publicReference = generateConceptBriefPublicReferencePreview();
  const submittedAt = new Date().toISOString();

  const conceptBriefInsert: ConceptBriefInsertPayload = {
    public_reference: publicReference,
    source: "api",
    status: "new",
    piece_type: readBriefString(payload, brief, "pieceType"),
    branch: readBriefString(payload, brief, "branch"),
    structure: readBriefString(payload, brief, "structure"),
    sub_structure: readBriefString(payload, brief, "subStructure"),
    design_objective:
      readBriefString(payload, brief, "designObjective") ??
      readBriefString(payload, brief, "emotionalStory") ??
      readBriefString(payload, brief, "customSymbol"),
    ai_sketch_instruction: readBriefString(payload, brief, "aiSketchInstruction"),
    brief_payload: payload,
    summary_items: payload.summaryItems ?? brief.summaryItems ?? null,
    api_submission: {
      submitted_at: submittedAt,
      public_reference: publicReference,
      payload,
    },
  };

  const { data: conceptBrief, error: conceptBriefError } = await supabase
    .from("concept_briefs")
    .insert(conceptBriefInsert)
    .select("id, public_reference")
    .single<ConceptBriefRow>();

  if (conceptBriefError || !conceptBrief) {
    console.error("Concept Brief persistence failed at concept_briefs insert.", {
      code: conceptBriefError?.code,
      message: conceptBriefError?.message,
    });

    return {
      persisted: false,
      message: "Concept Brief persistence failed. The local submission flow continued safely.",
    };
  }

  const contactInsert: ConceptBriefContactInsertPayload = {
    concept_brief_id: conceptBrief.id,
    customer_name: readContactString(payload, "customerName"),
    customer_email: readContactString(payload, "customerEmail"),
    phone_whatsapp:
      readString(payload.phoneOrWhatsApp) ?? readContactString(payload, "customerPhone"),
    country_region:
      readString(payload.countryOrRegion) ?? readContactString(payload, "customerCountry"),
    contact_note: readContactString(payload, "contactNote"),
  };

  const { error: contactError } = await supabase.from("concept_brief_contacts").insert(contactInsert);

  if (contactError) {
    const { error: cleanupError } = await supabase
      .from("concept_briefs")
      .delete()
      .eq("id", conceptBrief.id);

    console.error("Concept Brief persistence failed at concept_brief_contacts insert.", {
      code: contactError.code,
      message: contactError.message,
      conceptBriefId: conceptBrief.id,
      cleanupSucceeded: !cleanupError,
      cleanupCode: cleanupError?.code,
    });

    return {
      persisted: false,
      message: "Concept Brief contact persistence failed. The local submission flow continued safely.",
    };
  }

  return {
    persisted: true,
    publicReference: conceptBrief.public_reference,
    conceptBriefId: conceptBrief.id,
  };
}
