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

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClientOrNull>>;

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
};

type PersistenceFailureStage =
  | "concept_briefs_insert"
  | "concept_briefs_insert_response"
  | "concept_brief_contacts_insert"
  | "concept_brief_contacts_cleanup";

const CONCEPT_BRIEF_PERSISTENCE_FAILED_MESSAGE =
  "Concept Brief persistence failed. The local submission flow continued safely.";

const CONTACT_PERSISTENCE_FAILED_MESSAGE =
  "Concept Brief contact persistence failed. The local submission flow continued safely.";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_REFERENCE_PATTERN = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;

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

function readErrorField(error: unknown, field: keyof SupabaseErrorLike): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  const value = error[field];

  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getSafeErrorName(error: unknown): string {
  return readErrorField(error, "name") || (error instanceof Error ? error.name : "UnknownError");
}

function getSafeErrorCode(error: unknown): string | undefined {
  return readErrorField(error, "code");
}

function getSafeMessageClass(error: unknown): string {
  const code = getSafeErrorCode(error);
  const name = getSafeErrorName(error);
  const message =
    readErrorField(error, "message") || (error instanceof Error ? error.message : "");
  const normalizedMessage = message.toLowerCase();

  if (name === "TypeError") {
    if (normalizedMessage.includes("url")) {
      return "type_error_invalid_url";
    }

    if (normalizedMessage.includes("fetch") || normalizedMessage.includes("network")) {
      return "type_error_fetch";
    }

    return "type_error";
  }

  if (code) {
    return "supabase_error";
  }

  if (error instanceof Error) {
    return "runtime_error";
  }

  return "unknown_error";
}

function logPersistenceFailure(
  stage: PersistenceFailureStage,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  console.error(`Concept Brief persistence failed at ${stage}.`, {
    stage,
    errorName: getSafeErrorName(error),
    errorCode: getSafeErrorCode(error),
    messageClass: getSafeMessageClass(error),
    ...extra,
  });
}

function isValidPersistedConceptBriefRow(value: ConceptBriefRow | null): boolean {
  return Boolean(
    value &&
      UUID_PATTERN.test(value.id) &&
      PUBLIC_REFERENCE_PATTERN.test(value.public_reference),
  );
}

async function cleanupConceptBriefRow(supabase: SupabaseAdminClient, conceptBriefId: string) {
  try {
    const { error } = await supabase.from("concept_briefs").delete().eq("id", conceptBriefId);

    return {
      cleanupSucceeded: !error,
      cleanupError: error,
    };
  } catch (error) {
    return {
      cleanupSucceeded: false,
      cleanupError: error,
    };
  }
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

  let conceptBrief: ConceptBriefRow | null = null;
  let conceptBriefError: SupabaseErrorLike | null = null;

  try {
    const result = await supabase
      .from("concept_briefs")
      .insert(conceptBriefInsert)
      .select("id, public_reference")
      .single<ConceptBriefRow>();

    conceptBrief = result.data;
    conceptBriefError = result.error;
  } catch (error) {
    logPersistenceFailure("concept_briefs_insert", error);

    return {
      persisted: false,
      message: CONCEPT_BRIEF_PERSISTENCE_FAILED_MESSAGE,
    };
  }

  if (conceptBriefError || !conceptBrief) {
    logPersistenceFailure("concept_briefs_insert", conceptBriefError);

    return {
      persisted: false,
      message: CONCEPT_BRIEF_PERSISTENCE_FAILED_MESSAGE,
    };
  }

  if (!isValidPersistedConceptBriefRow(conceptBrief)) {
    const cleanup = UUID_PATTERN.test(conceptBrief.id)
      ? await cleanupConceptBriefRow(supabase, conceptBrief.id)
      : null;

    logPersistenceFailure(
      "concept_briefs_insert_response",
      {
        name: "InvalidConceptBriefInsertResponse",
      },
      {
        cleanupSucceeded: cleanup?.cleanupSucceeded,
        cleanupErrorCode: cleanup?.cleanupError
          ? getSafeErrorCode(cleanup.cleanupError)
          : undefined,
        cleanupMessageClass: cleanup
          ? cleanup.cleanupSucceeded
            ? "cleanup_succeeded"
            : getSafeMessageClass(cleanup.cleanupError)
          : "cleanup_not_attempted",
      },
    );

    return {
      persisted: false,
      message: CONCEPT_BRIEF_PERSISTENCE_FAILED_MESSAGE,
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

  let contactError: SupabaseErrorLike | null = null;

  try {
    const result = await supabase.from("concept_brief_contacts").insert(contactInsert);

    contactError = result.error;
  } catch (error) {
    const cleanup = await cleanupConceptBriefRow(supabase, conceptBrief.id);

    logPersistenceFailure("concept_brief_contacts_insert", error, {
      cleanupSucceeded: cleanup.cleanupSucceeded,
      cleanupErrorCode: getSafeErrorCode(cleanup.cleanupError),
      cleanupMessageClass: cleanup.cleanupError
        ? getSafeMessageClass(cleanup.cleanupError)
        : undefined,
    });

    return {
      persisted: false,
      message: CONTACT_PERSISTENCE_FAILED_MESSAGE,
    };
  }

  if (contactError) {
    const cleanup = await cleanupConceptBriefRow(supabase, conceptBrief.id);

    logPersistenceFailure("concept_brief_contacts_insert", contactError, {
      cleanupSucceeded: cleanup.cleanupSucceeded,
      cleanupErrorCode: getSafeErrorCode(cleanup.cleanupError),
      cleanupMessageClass: cleanup.cleanupError
        ? getSafeMessageClass(cleanup.cleanupError)
        : undefined,
    });

    return {
      persisted: false,
      message: CONTACT_PERSISTENCE_FAILED_MESSAGE,
    };
  }

  return {
    persisted: true,
    publicReference: conceptBrief.public_reference,
    conceptBriefId: conceptBrief.id,
  };
}
