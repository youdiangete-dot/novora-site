import { NextResponse } from "next/server";
import { createSupabaseAdminClientOrNull } from "../../../lib/server/supabase";

import {
  persistConceptBriefSubmission,
  persistConceptBriefSubmissionWithPreviewIntent,
  prepareAtomicConceptBriefSubmission,
  type AtomicConceptBriefIntakeDependencies,
  type AtomicAdmissionHoldReason,
} from "../../../lib/server/concept-brief-persistence";
import {
  type ConceptBriefSubmissionPayload,
  validateConceptBriefSubmission,
} from "../../../lib/server/concept-brief-validation";
import {
  checkPublicApiRateLimit,
  readEnforcedPublicApiRatePolicy,
  type EnforcedPublicApiRatePolicy,
  CONCEPT_BRIEF_ROUTE_NAME,
  CONCEPT_BRIEF_IP_RATE_LIMIT,
  CONCEPT_BRIEF_EMAIL_RATE_LIMIT,
  normalizePublicApiRateLimitEmail,
} from "../../../lib/server/public-api-rate-limit";
import {
  attachFirstPreviewCustomerSessionCookie,
  attachPreparedFirstPreviewCustomerSessionCookie,
  type PreparedFirstPreviewCustomerProof,
  type FirstPreviewSessionRouteDependencies,
} from "../../../lib/server/ai-sketch/instant-first-preview-feature-flag";
import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
} from "../../../lib/server/ai-sketch/first-preview-customer-access-contract";
import {
  triggerAutomaticFirstPreviewAfterPersistence,
  type AutomaticFirstPreviewJewelrySkillsErrorCategory,
  type AutomaticFirstPreviewStructuredInputCategory,
  type AutomaticFirstPreviewStructuredInputRejectStage,
  type AutomaticFirstPreviewTriggerDependencies,
  type AutomaticFirstPreviewTriggerResult,
} from "../../../lib/server/ai-sketch/first-preview-automatic-trigger";

export const maxDuration = 300;

type ConceptBriefResponse = {
  ok: boolean;
  mode: "supabase";
  persisted: boolean;
  message: string;
  publicReference?: string;
  conceptBriefId?: string;
  errors?: string[];
};

// Redis/KV enforcement only activates after separately approved provider/env
// setup and later Preview/Production verification. Missing provider env stays
// disabled so current Concept Brief submissions continue to fail open.
// Paid First Preview initiation requires verified enforcement from both checks.

function jsonResponse(body: ConceptBriefResponse, status: number, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers });
}

function readPayloadString(
  payload: ConceptBriefSubmissionPayload,
  field: "customerEmail",
): string | null {
  const contact =
    payload.contact && typeof payload.contact === "object" && !Array.isArray(payload.contact)
      ? payload.contact
      : {};
  const value = payload[field] ?? contact[field];

  return typeof value === "string" ? value : null;
}

function rateLimitResponse(headers?: HeadersInit) {
  return jsonResponse(
    {
      ok: false,
      mode: "supabase",
      persisted: false,
      message:
        "Too many Concept Brief submission attempts. Please wait a few minutes before trying again.",
      errors: ["Too many submission attempts. Please wait before trying again."],
    },
    429,
    headers,
  );
}

type FirstPreviewRateLimitEvidence = Readonly<
  | { status: "within_limit"; sourceResult: unknown }
  | { status: "rate_limited"; headers?: HeadersInit }
  | { status: "unverified" }
>;

function readOwnRateLimitValue(evidence: object, field: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(evidence, field);
  return descriptor && "value" in descriptor ? descriptor.value : undefined;
}

function classifyFirstPreviewRateLimitEvidence(
  evidence: unknown,
): FirstPreviewRateLimitEvidence {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    return { status: "unverified" };
  }

  const allowed = readOwnRateLimitValue(evidence, "allowed");
  const mode = readOwnRateLimitValue(evidence, "mode");
  const reason = readOwnRateLimitValue(evidence, "reason");

  if (allowed === true && mode === "enforced" && reason === "within_limit") {
    return { status: "within_limit", sourceResult: evidence };
  }

  if (allowed === false && mode === "enforced" && reason === "rate_limit_exceeded") {
    let headers: Headers | undefined;
    try {
      const suppliedHeaders = readOwnRateLimitValue(evidence, "headers");
      if (suppliedHeaders !== undefined) {
        headers = new Headers(suppliedHeaders as HeadersInit);
      }
    } catch {
      // Malformed optional headers must not erase a genuine rate-limit denial.
    }
    return { status: "rate_limited", headers };
  }

  return { status: "unverified" };
}

type PersistedConceptBriefIdentity = Readonly<{
  persisted: true;
  publicReference: string;
  conceptBriefId: string;
}>;

type AutomaticFirstPreviewTriggerDiagnostic = Readonly<{
  publicReference: string;
  status: AutomaticFirstPreviewTriggerResult["status"];
  reason:
    | AutomaticFirstPreviewTriggerResult["reason"]
    | "rate_limit_enforcement_unverified";
  structuredInputCategory?: AutomaticFirstPreviewStructuredInputCategory;
  structuredInputRejectStage?: AutomaticFirstPreviewStructuredInputRejectStage;
  jewelrySkillsErrorCategory?: AutomaticFirstPreviewJewelrySkillsErrorCategory;
}>;

function writeAutomaticFirstPreviewDiagnostic(
  diagnostic: AutomaticFirstPreviewTriggerDiagnostic,
) {
  console.info("Automatic First Preview trigger resolved.", diagnostic);
}

type ConceptBriefPostDependencies = Readonly<{
  checkRateLimit?: typeof checkPublicApiRateLimit;
  persistSubmission?: (
    payload: ConceptBriefSubmissionPayload,
    // Private, source-verified policy/key metadata only; never complete admission.
    ratePolicyEvidence?: EnforcedPublicApiRatePolicy | null,
  ) => ReturnType<typeof persistConceptBriefSubmission>;
  sessionDependencies?: FirstPreviewSessionRouteDependencies;
  // Trusted construction only; never populated from HTTP or environment flags.
  atomicIntake?: AtomicConceptBriefIntakeDependencies;
  triggerAutomaticPreview?: typeof triggerAutomaticFirstPreviewAfterPersistence;
  triggerDependencies?: AutomaticFirstPreviewTriggerDependencies;
  logAutomaticPreviewDiagnostic?: (
    diagnostic: AutomaticFirstPreviewTriggerDiagnostic,
  ) => void;
}>;

export function createPersistedConceptBriefResponse(
  persistence: PersistedConceptBriefIdentity,
  dependencies: FirstPreviewSessionRouteDependencies = {},
  atomicProof?: PreparedFirstPreviewCustomerProof | null,
) {
  const response = jsonResponse(
    {
      ok: true,
      mode: "supabase",
      persisted: true,
      message:
        "Concept Brief submitted for NOVORA review. This is not CAD approval, pricing approval, sourcing confirmation, or production confirmation.",
      publicReference: persistence.publicReference,
      conceptBriefId: persistence.conceptBriefId,
    },
    201,
  );

  if (atomicProof !== undefined) {
    return attachPreparedFirstPreviewCustomerSessionCookie(response, persistence, atomicProof, dependencies);
  }
  return attachFirstPreviewCustomerSessionCookie(
    response,
    persistence,
    dependencies,
  );
}

export function createConceptBriefPostHandler(
  dependencies: ConceptBriefPostDependencies = {},
) {
  const checkRateLimit = dependencies.checkRateLimit ?? checkPublicApiRateLimit;
  const atomicSelected = dependencies.atomicIntake !== undefined;
  const atomicIntake = dependencies.atomicIntake
    ? Object.freeze({ ...dependencies.atomicIntake }) : null;
  const persistSubmission: NonNullable<ConceptBriefPostDependencies["persistSubmission"]> =
    dependencies.persistSubmission ?? persistConceptBriefSubmission;
  const triggerAutomaticPreview =
    dependencies.triggerAutomaticPreview ??
    triggerAutomaticFirstPreviewAfterPersistence;
  const logAutomaticPreviewDiagnostic =
    dependencies.logAutomaticPreviewDiagnostic ??
    writeAutomaticFirstPreviewDiagnostic;

  async function readRateLimitEvidence(
    input: Parameters<typeof checkPublicApiRateLimit>[0],
  ): Promise<FirstPreviewRateLimitEvidence> {
    try {
      return classifyFirstPreviewRateLimitEvidence(await checkRateLimit(input));
    } catch {
      // Unavailable evidence preserves intake, but cannot admit paid generation.
      return { status: "unverified" };
    }
  }

  return async function postConceptBrief(request: Request) {
  const ipRateLimit = await readRateLimitEvidence({
    routeName: CONCEPT_BRIEF_ROUTE_NAME,
    request,
    policy: CONCEPT_BRIEF_IP_RATE_LIMIT,
  });

  if (ipRateLimit.status === "rate_limited") {
    return rateLimitResponse(ipRateLimit.headers);
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        mode: "supabase",
        persisted: false,
        message: "Invalid JSON body. No Concept Brief was saved.",
        errors: ["Request body must be valid JSON."],
      },
      400,
    );
  }

  const validation = validateConceptBriefSubmission(payload);

  if (!validation.valid) {
    return jsonResponse(
      {
        ok: false,
        mode: "supabase",
        persisted: false,
        message: "Concept Brief submission is missing required fields. No Concept Brief was saved.",
        errors: validation.errors,
      },
      400,
    );
  }

  const normalizedEmail = normalizePublicApiRateLimitEmail(
    readPayloadString(payload as ConceptBriefSubmissionPayload, "customerEmail"),
  );

  let emailRateLimit: FirstPreviewRateLimitEvidence = { status: "unverified" };
  if (normalizedEmail) {
    emailRateLimit = await readRateLimitEvidence({
      routeName: CONCEPT_BRIEF_ROUTE_NAME,
      request,
      policy: CONCEPT_BRIEF_EMAIL_RATE_LIMIT,
      normalizedEmail,
    });

    if (emailRateLimit.status === "rate_limited") {
      return rateLimitResponse(emailRateLimit.headers);
    }
  }

  // Genuine receipts must agree on request, policies and signing-key version.
  const ratePolicyEvidence = readEnforcedPublicApiRatePolicy({
    routeName: CONCEPT_BRIEF_ROUTE_NAME, request,
    ipPolicy: CONCEPT_BRIEF_IP_RATE_LIMIT, emailPolicy: CONCEPT_BRIEF_EMAIL_RATE_LIMIT,
    ipResult: ipRateLimit.status === "within_limit" ? ipRateLimit.sourceResult : undefined,
    emailResult: emailRateLimit.status === "within_limit" ? emailRateLimit.sourceResult : undefined,
  });
  const atomicPreparation = atomicSelected && atomicIntake
    ? prepareAtomicConceptBriefSubmission(
      payload as ConceptBriefSubmissionPayload, ratePolicyEvidence,
      atomicIntake, dependencies.sessionDependencies,
      process.env.VERCEL_ENV === "preview" && process.env.NODE_ENV === "production" &&
        (process.env.VERCEL_TARGET_ENV === undefined || process.env.VERCEL_TARGET_ENV === "preview")
        ? diagnostic => {
          const reasons: AtomicAdmissionHoldReason[] = [...diagnostic.reasons];
          if (ipRateLimit.status !== "within_limit") reasons.push("ip_rate_limit_enforcement_unverified");
          if (emailRateLimit.status !== "within_limit") reasons.push("email_rate_limit_enforcement_unverified");
          // Only bounded codes and the existing public reference leave this boundary.
          // No raw limiter results, proof, payload, context, keys or errors.
          console.info("Atomic First Preview admission context unavailable.", {
            publicReference: diagnostic.publicReference, reasons,
          });
        } : undefined,
    ) : null;
  const persistence = atomicSelected
    ? atomicPreparation
      ? await persistConceptBriefSubmissionWithPreviewIntent(atomicPreparation.input, atomicIntake?.rpcClient ?? null)
      : { persisted: false as const, message: "Concept Brief persistence is temporarily unavailable." }
    : await persistSubmission(payload as ConceptBriefSubmissionPayload, ratePolicyEvidence);

  if (persistence.persisted === false) {
    return jsonResponse(
      {
        ok: true,
        mode: "supabase",
        persisted: false,
        message: persistence.message,
      },
      202,
    );
  }

  const persistedIdentity = {
    persisted: true,
    publicReference: persistence.publicReference,
    conceptBriefId: persistence.conceptBriefId,
  } as const;
  const response = createPersistedConceptBriefResponse(
    persistedIdentity,
    dependencies.sessionDependencies,
    atomicSelected || persistence.atomicIntent !== undefined ||
      persistence.firstPreviewInitiation === "operator_hold"
      ? atomicPreparation?.prepared ?? null : undefined,
  );

  // Verified atomic receipts use the Durable Outbox, for both fresh and reused
  // Intents in every state. Never start a second direct generation path here.
  // Only the trusted persistence result supplies this marker, never request data.
  if (persistence.atomicIntent !== undefined ||
    persistence.firstPreviewInitiation === "operator_hold") {
    return response;
  }

  if (
    ipRateLimit.status !== "within_limit" ||
    emailRateLimit.status !== "within_limit"
  ) {
    try {
      logAutomaticPreviewDiagnostic({
        publicReference: persistedIdentity.publicReference,
        status: "not_enqueued",
        reason: "rate_limit_enforcement_unverified",
      });
    } catch {
      // Diagnostic failure must not invalidate an already persisted receipt.
    }
    return response;
  }

  const triggerResult = await triggerAutomaticPreview(
    {
      payload,
      persistenceConfirmed: true,
      customerAccessProofEstablished: Boolean(
        response.cookies.get(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value,
      ),
      conceptBriefId: persistedIdentity.conceptBriefId,
      publicReference: persistedIdentity.publicReference,
    },
    dependencies.triggerDependencies,
  );

  logAutomaticPreviewDiagnostic({
    publicReference: persistedIdentity.publicReference,
    status: triggerResult.status,
    reason: triggerResult.reason,
    ...("structuredInputCategory" in triggerResult
      ? { structuredInputCategory: triggerResult.structuredInputCategory }
      : {}),
    ...("structuredInputRejectStage" in triggerResult
      ? { structuredInputRejectStage: triggerResult.structuredInputRejectStage }
      : {}),
    ...("jewelrySkillsErrorCategory" in triggerResult
      ? {
          jewelrySkillsErrorCategory:
            triggerResult.jewelrySkillsErrorCategory,
        }
      : {}),
  });

  return response;
  };
}

export async function POST(request: Request) {
  let rpcClient: AtomicConceptBriefIntakeDependencies["rpcClient"] = null;
  try {
    // The guarded server client calls the existing EXECUTE-granted RPC. Only
    // its SECURITY DEFINER owner acquires intake authority inside the database.
    rpcClient = createSupabaseAdminClientOrNull();
  } catch {
    // Missing/invalid configuration must not select legacy split writes, and
    // must not bypass the handler's request validation or failure response.
  }
  return createConceptBriefPostHandler({ atomicIntake: { rpcClient } })(request);
}
