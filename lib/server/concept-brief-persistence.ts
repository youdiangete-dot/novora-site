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

function buildCustomerNotes(submission: ConceptBriefSubmissionPayload, brief: Record<string, unknown>): string | null {
  const notes = [
    readString(brief.referenceDetails),
    readString(brief.referenceNotes),
    readString(brief.mustInclude),
    readString(brief.mustAvoid),
    readString(brief.productionConcernNote),
    readString(brief.manualConfirmation),
  ].filter(Boolean);

  return notes.length ? notes.join("\n\n") : readString(submission.contactNote);
}

export async function persistConceptBriefSubmission(
  payload: ConceptBriefSubmissionPayload,
): Promise<ConceptBriefPersistenceResult> {
  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      persisted: false,
      message: "Concept Brief persistence is temporarily unavailable.",
    };
  }

  const brief = readBriefRecord(payload);
  const publicReference = generateConceptBriefPublicReferencePreview();
  const submittedAt = new Date().toISOString();

  const conceptBriefInsert = {
    public_reference: publicReference,
    status: "new",
    piece_type: readBriefString(payload, brief, "pieceType"),
    design_structure: readBriefString(payload, brief, "structure"),
    sub_structure: readBriefString(payload, brief, "subStructure"),
    stone_direction:
      readBriefString(payload, brief, "stoneDirection") ??
      readBriefString(payload, brief, "stoneLogic"),
    accent_stone_direction:
      readBriefString(payload, brief, "optionalStoneDirection") ??
      readBriefString(payload, brief, "repeatedStoneFeeling"),
    metal_direction: readBriefString(payload, brief, "metalDirection"),
    finish_direction: readBriefString(payload, brief, "finishDirection"),
    size_or_measurement_notes:
      readBriefString(payload, brief, "sizeDirection") ??
      readBriefString(payload, brief, "customScale"),
    budget_direction: readBriefString(payload, brief, "budgetDirection"),
    emotional_intent:
      readBriefString(payload, brief, "emotionalStory") ??
      readBriefString(payload, brief, "customSymbol"),
    customer_notes: buildCustomerNotes(payload, brief),
    raw_brief_payload: payload,
    submitted_at: submittedAt,
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

  const contactInsert = {
    concept_brief_id: conceptBrief.id,
    customer_name: readContactString(payload, "customerName"),
    email: readContactString(payload, "customerEmail"),
    phone_or_whatsapp:
      readString(payload.phoneOrWhatsApp) ?? readContactString(payload, "customerPhone"),
    country_or_region:
      readString(payload.countryOrRegion) ?? readContactString(payload, "customerCountry"),
    preferred_contact_method: null,
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
