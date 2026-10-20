import "server-only";

import { randomUUID } from "node:crypto";
import type { EnforcedPublicApiRatePolicy } from "./public-api-rate-limit";
import {
  prepareFirstPreviewCustomerProof,
  type CustomerProofPreparationFailure,
  type FirstPreviewSessionRouteDependencies,
} from "./ai-sketch/instant-first-preview-feature-flag";

import {
  generateConceptBriefPublicReferencePreview,
  type ConceptBriefSubmissionPayload,
} from "./concept-brief-validation";
import {
  classifyConceptBriefPersistenceError,
  getSafeConceptBriefPersistenceErrorCode,
} from "./concept-brief-persistence-diagnostics";
import { createSupabaseAdminClientOrNull } from "./supabase";
import {
  INITIATION_VERSION,
  INITIATION_STATES,
  type InitiationState,
  isJson,
  isPrivateAdmissionContext,
  type PersistInitiationInput,
} from "./ai-sketch/first-preview-initiation-contract";

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
  // Private database receipt only; the Durable Outbox owns atomic initiation.
  atomicIntent?: Readonly<{ state: InitiationState; created: boolean }>;
  firstPreviewInitiation?: "operator_hold";
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
  | "atomic_receipt_rpc"
  | "atomic_receipt_response"
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

function logPersistenceFailure(
  stage: PersistenceFailureStage,
  error: unknown,
  extra?: Record<string, unknown>,
) {
  const diagnostics = classifyConceptBriefPersistenceError(error);

  console.error(`Concept Brief persistence failed at ${stage}.`, {
    stage,
    ...diagnostics,
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

/**
 * Source adapter for the transactional receipt RPC. The exported HTTP handler
 * supplies its guarded server client through the existing trusted atomic seam.
 * This adapter performs no env lookup, capability probe or activation switch.
 * Installed function equivalence and runtime readiness require separate evidence.
 * Context shape checks do not authenticate admission or customer access. Explicit
 * NULL context is held intake only; absent/malformed non-null context is rejected.
 * Held Intents have no accepted automatic recovery transition in this candidate.
 */
export async function persistConceptBriefSubmissionWithPreviewIntent(
  input: PersistInitiationInput,
  rpcClient: Pick<SupabaseAdminClient, "rpc"> | null,
): Promise<ConceptBriefPersistenceResult> {
  const failure: ConceptBriefPersistenceFailure = {
    persisted: false,
    message: CONCEPT_BRIEF_PERSISTENCE_FAILED_MESSAGE,
  };

  if (
    !rpcClient || !isRecord(input) ||
    typeof input.p_concept_brief_id !== "string" || !UUID_PATTERN.test(input.p_concept_brief_id) ||
    typeof input.p_public_reference !== "string" || !PUBLIC_REFERENCE_PATTERN.test(input.p_public_reference) ||
    !isRecord(input.p_brief) || !isJson(input.p_brief) ||
    !isRecord(input.p_contact) || !isJson(input.p_contact) ||
    !(input.p_admission_context === null ||
      isPrivateAdmissionContext(input.p_admission_context, input.p_concept_brief_id, input.p_public_reference))
  ) {
    return failure;
  }

  // Capture the requested identity before awaiting the RPC. Do not generate a
  // replacement identity/reference or accept another submission's valid receipt.
  const conceptBriefId = input.p_concept_brief_id;
  const publicReference = input.p_public_reference;
  const admissionContext = input.p_admission_context;

  try {
    const { data, error } = await rpcClient.rpc(
      "novora_persist_concept_brief_with_preview_intent",
      {
        p_concept_brief_id: conceptBriefId,
        p_public_reference: publicReference,
        p_brief: input.p_brief,
        p_contact: input.p_contact,
        p_admission_context: admissionContext,
      },
    );

    if (error) {
      // Never log RPC payloads, context, or untrusted database error text.
      logPersistenceFailure("atomic_receipt_rpc", { name: "AtomicReceiptRpcFailed" });
      return failure;
    }

    const receipt = isRecord(data) && data.ok === true ? data.value : null;
    if (
      !isRecord(receipt) || receipt.persisted !== true ||
      receipt.concept_brief_id !== conceptBriefId || receipt.public_reference !== publicReference ||
      receipt.intent_version !== INITIATION_VERSION
    ) {
      logPersistenceFailure("atomic_receipt_response", { name: "InvalidAtomicReceipt" });
      return failure;
    }

    const intentState = INITIATION_STATES.find(state => state === receipt.intent_state);
    const intentCreated = receipt.intent_created;
    if (!intentState || typeof intentCreated !== "boolean" ||
      (intentCreated && intentState !== "pending" && intentState !== "operator_hold") ||
      (admissionContext === null && intentState !== "operator_hold" && intentState !== "cancelled")) {
      logPersistenceFailure("atomic_receipt_response", { name: "InvalidAtomicReceipt" });
      return failure;
    }

    // State comes from the database, never from submitted context shape.
    // Neither a fresh nor a reused receipt authorizes a second direct trigger.
    const atomicIntent = Object.freeze({ state: intentState, created: intentCreated });
    return intentState === "operator_hold"
      ? { persisted: true, publicReference, conceptBriefId, atomicIntent, firstPreviewInitiation: "operator_hold" }
      : { persisted: true, publicReference, conceptBriefId, atomicIntent };
  } catch {
    logPersistenceFailure("atomic_receipt_rpc", { name: "AtomicReceiptRpcFailed" });
    return failure;
  }
  // No split-write fallback, compensating delete, RPC retry, or preview dispatch.
}


/** Trusted server construction only; never populated from submitted authority. */
export type AtomicConceptBriefIntakeDependencies = Readonly<{
  rpcClient: Pick<SupabaseAdminClient, "rpc"> | null;
  identitySource?: () => Readonly<{ conceptBriefId: string; publicReference: string }>;
}>;

export type AtomicAdmissionHoldReason = CustomerProofPreparationFailure
  | "ip_rate_limit_enforcement_unverified"
  | "email_rate_limit_enforcement_unverified"
  | "rate_policy_provenance_unverified"
  | "admission_context_validation_rejected";

/** Limiter metadata must come from the route's genuine enforcement receipts,
 * never submission JSON. A pending Intent is not paid admission: publication
 * and dispatch retain their independent admission/spending gates.
 */
export function prepareAtomicConceptBriefSubmission(
  payload: ConceptBriefSubmissionPayload,
  rateEvidence: EnforcedPublicApiRatePolicy | null,
  dependencies: AtomicConceptBriefIntakeDependencies,
  sessionDependencies: FirstPreviewSessionRouteDependencies = {},
  onAdmissionHold?: (diagnostic: Readonly<{
    publicReference: string; reasons: readonly AtomicAdmissionHoldReason[];
  }>) => void,
) {
  try {
    const selected = dependencies.identitySource?.() ?? {
      conceptBriefId: randomUUID(),
      publicReference: generateConceptBriefPublicReferencePreview(),
    };
    const identity = Object.freeze({
      conceptBriefId: selected.conceptBriefId, publicReference: selected.publicReference,
    });
    if (!UUID_PATTERN.test(identity.conceptBriefId) ||
        !PUBLIC_REFERENCE_PATTERN.test(identity.publicReference)) return null;
    // Detached fixed JSON representation: caller mutation cannot replace intake data.
    const snapshot = JSON.parse(JSON.stringify(payload)) as ConceptBriefSubmissionPayload;
    const brief = readBriefRecord(snapshot);
    const reasons: AtomicAdmissionHoldReason[] = [];
    const prepared = prepareFirstPreviewCustomerProof(identity, sessionDependencies,
      onAdmissionHold ? reason => reasons.push(reason) : undefined);
    const context = prepared && rateEvidence ? Object.freeze({
      version: INITIATION_VERSION,
      ip_key: rateEvidence.ip.redisKey, email_key: rateEvidence.email.redisKey,
      key_version: rateEvidence.key_version, rate_policy_version: rateEvidence.rate_policy_version,
      access_binding: prepared.binding,
    }) : null;
    const admissionContext = context &&
      rateEvidence?.ip.subject === "ip" && rateEvidence.ip.derivation === "hmac_sha256" &&
      rateEvidence.email.subject === "email" && rateEvidence.email.derivation === "hmac_sha256" &&
      isPrivateAdmissionContext(context, identity.conceptBriefId, identity.publicReference)
      ? context : null;
    if (onAdmissionHold && admissionContext === null) {
      if (!rateEvidence) reasons.push("rate_policy_provenance_unverified");
      if (context) reasons.push("admission_context_validation_rejected");
      try {
        onAdmissionHold({ publicReference: identity.publicReference, reasons });
      } catch {
        // Diagnostics must not change RPC input, HTTP receipt or cookie behavior.
      }
    }
    const customerName = readContactString(snapshot, "customerName");
    const customerEmail = readContactString(snapshot, "customerEmail");
    if (!customerName || !customerEmail) return null;
    const candidate = {
      p_concept_brief_id: identity.conceptBriefId,
      p_public_reference: identity.publicReference,
      p_brief: {
        piece_type: readBriefString(snapshot, brief, "pieceType"),
        branch: readBriefString(snapshot, brief, "branch"),
        structure: readBriefString(snapshot, brief, "structure"),
        sub_structure: readBriefString(snapshot, brief, "subStructure"),
        design_objective: readBriefString(snapshot, brief, "designObjective") ??
          readBriefString(snapshot, brief, "emotionalStory") ?? readBriefString(snapshot, brief, "customSymbol"),
        ai_sketch_instruction: readBriefString(snapshot, brief, "aiSketchInstruction"),
        brief_payload: snapshot,
        summary_items: snapshot.summaryItems ?? brief.summaryItems ?? null,
        api_submission: {
          submitted_at: new Date().toISOString(), public_reference: identity.publicReference, payload: snapshot,
        },
      },
      p_contact: {
        customer_name: customerName, customer_email: customerEmail,
        phone_whatsapp: readString(snapshot.phoneOrWhatsApp) ?? readContactString(snapshot, "customerPhone"),
        country_region: readString(snapshot.countryOrRegion) ?? readContactString(snapshot, "customerCountry"),
        contact_note: readContactString(snapshot, "contactNote"),
      },
      p_admission_context: admissionContext,
    };
    if (!isJson(candidate.p_brief)) return null;
    const input: PersistInitiationInput = Object.freeze({
      ...candidate, p_brief: candidate.p_brief as PersistInitiationInput["p_brief"],
    });
    // NULL context is held intake without a persisted binding or atomic cookie.
    return Object.freeze({ input, prepared: admissionContext ? prepared : null });
  } catch {
    return null;
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
          ? getSafeConceptBriefPersistenceErrorCode(cleanup.cleanupError)
          : undefined,
        cleanupMessageClass: cleanup
          ? cleanup.cleanupSucceeded
            ? "cleanup_succeeded"
            : classifyConceptBriefPersistenceError(cleanup.cleanupError).messageClass
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
      cleanupErrorCode: getSafeConceptBriefPersistenceErrorCode(cleanup.cleanupError),
      cleanupMessageClass: cleanup.cleanupError
        ? classifyConceptBriefPersistenceError(cleanup.cleanupError).messageClass
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
      cleanupErrorCode: getSafeConceptBriefPersistenceErrorCode(cleanup.cleanupError),
      cleanupMessageClass: cleanup.cleanupError
        ? classifyConceptBriefPersistenceError(cleanup.cleanupError).messageClass
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
