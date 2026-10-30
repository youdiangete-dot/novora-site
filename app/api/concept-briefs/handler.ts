import { NextResponse } from "next/server";

import { persistConceptBriefSubmission } from "../../../lib/server/concept-brief-persistence";
import {
  type ConceptBriefSubmissionPayload,
  validateConceptBriefSubmission,
} from "../../../lib/server/concept-brief-validation";
import {
  checkPublicApiRateLimit,
  type FixedWindowRateLimitPolicy,
  normalizePublicApiRateLimitEmail,
} from "../../../lib/server/public-api-rate-limit";
import {
  attachFirstPreviewCustomerSessionCookie,
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

import { authenticateM2ReceiptRequest } from "../../../lib/server/ai-sketch/beta-admission";
import { isClientRequestId, createScopedReceipt, claimScopedPublish, finishScopedPublish } from "../../../lib/server/ai-sketch/m2-scoped-receipt";

type ConceptBriefResponse = {
  ok: boolean;
  mode: "supabase";
  persisted: boolean;
  message: string;
  publicReference?: string;
  conceptBriefId?: string;
  errors?: string[];
  receiptStage?: "accepted" | "admission_denied" | "publish_pending" | "published" | "UNKNOWN";
  receiptReason?: string | null;
};

const CONCEPT_BRIEF_ROUTE_NAME = "/api/concept-briefs";

// Redis/KV enforcement only activates after separately approved provider/env
// setup and later Preview/Production verification. Missing provider env stays
// disabled so current Concept Brief submissions continue to fail open.

// MVP defaults: intentionally generous for first beta/manual testing. Revisit
// after real traffic patterns and provider telemetry are available.
const CONCEPT_BRIEF_IP_RATE_LIMIT: FixedWindowRateLimitPolicy = {
  limit: 30,
  windowSeconds: 10 * 60,
  keyPrefix: "rl:v1:concept-briefs",
};

// MVP default: tighter than broad IP volume, but still allows normal correction
// and retry behavior. Requires NOVORA_INTERNAL_SIGNING_SECRET to avoid raw PII keys.
const CONCEPT_BRIEF_EMAIL_RATE_LIMIT: FixedWindowRateLimitPolicy = {
  limit: 5,
  windowSeconds: 60 * 60,
  keyPrefix: "rl:v1:concept-briefs",
};

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

type PersistedConceptBriefIdentity = Readonly<{
  persisted: true;
  publicReference: string;
  conceptBriefId: string;
}>;

type AutomaticFirstPreviewTriggerDiagnostic = Readonly<{
  publicReference: string;
  status: AutomaticFirstPreviewTriggerResult["status"];
  reason: AutomaticFirstPreviewTriggerResult["reason"];
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
  receipt?: Readonly<{ authenticate?: typeof authenticateM2ReceiptRequest; create?: typeof createScopedReceipt; claim?: typeof claimScopedPublish; finish?: typeof finishScopedPublish }>;
  checkRateLimit?: typeof checkPublicApiRateLimit;
  persistSubmission?: typeof persistConceptBriefSubmission;
  sessionDependencies?: FirstPreviewSessionRouteDependencies;
  triggerAutomaticPreview?: typeof triggerAutomaticFirstPreviewAfterPersistence;
  triggerDependencies?: AutomaticFirstPreviewTriggerDependencies;
  logAutomaticPreviewDiagnostic?: (
    diagnostic: AutomaticFirstPreviewTriggerDiagnostic,
  ) => void;
}>;

export function createPersistedConceptBriefResponse(
  persistence: PersistedConceptBriefIdentity,
  dependencies: FirstPreviewSessionRouteDependencies = {},
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
  const persistSubmission =
    dependencies.persistSubmission ?? persistConceptBriefSubmission;
  const triggerAutomaticPreview =
    dependencies.triggerAutomaticPreview ??
    triggerAutomaticFirstPreviewAfterPersistence;
  const logAutomaticPreviewDiagnostic =
    dependencies.logAutomaticPreviewDiagnostic ??
    writeAutomaticFirstPreviewDiagnostic;

  return async function postConceptBrief(request: Request) {
  const ipRateLimit = await checkRateLimit({
    routeName: CONCEPT_BRIEF_ROUTE_NAME,
    request,
    policy: CONCEPT_BRIEF_IP_RATE_LIMIT,
  });

  if (!ipRateLimit.allowed) {
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

  if (normalizedEmail) {
    const emailRateLimit = await checkRateLimit({
      routeName: CONCEPT_BRIEF_ROUTE_NAME,
      request,
      policy: CONCEPT_BRIEF_EMAIL_RATE_LIMIT,
      normalizedEmail,
    });

    if (!emailRateLimit.allowed) {
      return rateLimitResponse(emailRateLimit.headers);
    }
  }

  const receiptId = request.headers.get("x-novora-client-request-id");
  let scope: ReturnType<typeof authenticateM2ReceiptRequest> = null;
  let scopedCreated = false;
  let persistence: Awaited<ReturnType<typeof persistConceptBriefSubmission>>;
  if (receiptId !== null) {
    scope = (dependencies.receipt?.authenticate ?? authenticateM2ReceiptRequest)(request);
    if (!scope || !isClientRequestId(receiptId)) return jsonResponse({ ok: false, mode: "supabase", persisted: false, message: "Submission unavailable." }, 404);
    const result = await (dependencies.receipt?.create ?? createScopedReceipt)(scope, receiptId, payload as ConceptBriefSubmissionPayload);
    if (result.outcome === "conflict") return jsonResponse({ ok: false, mode: "supabase", persisted: false, message: "Submission conflict." }, 409);
    if (result.outcome === "unavailable") return jsonResponse({ ok: false, mode: "supabase", persisted: false, message: "Submission status unavailable." }, 503);
    if (result.outcome === "existing") return jsonResponse({ ok: true, mode: "supabase", persisted: true, message: "Submission already recorded.", publicReference: result.receipt.reference, conceptBriefId: result.receipt.briefId, receiptStage: result.receipt.stage, receiptReason: result.receipt.reason }, 200);
    if (!("receipt" in result)) return jsonResponse({ ok: false, mode: "supabase", persisted: false, message: "Submission status unavailable." }, 503);
    scopedCreated = true;
    persistence = { persisted: true, publicReference: result.receipt.reference, conceptBriefId: result.receipt.briefId };
  } else {
    persistence = await persistSubmission(payload as ConceptBriefSubmissionPayload);
  }

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
  );

  // Only the transaction's creator may claim publication. A lost claim reply
  // is uncertain and must not result in another Queue or Provider operation.
  if (scopedCreated && scope && receiptId && !(await (dependencies.receipt?.claim ?? claimScopedPublish)(scope, receiptId))) return response;
  let triggerResult: Awaited<ReturnType<typeof triggerAutomaticFirstPreviewAfterPersistence>>;
  try { triggerResult = await triggerAutomaticPreview(
    {
      payload,
      admissionRequest: request,
      persistenceConfirmed: true,
      customerAccessProofEstablished: Boolean(
        response.cookies.get(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value,
      ),
      conceptBriefId: persistedIdentity.conceptBriefId,
      publicReference: persistedIdentity.publicReference,
    },
    dependencies.triggerDependencies,
  ); } catch (error) {
    if (!scopedCreated) throw error;
    if (scope && receiptId) await (dependencies.receipt?.finish ?? finishScopedPublish)(scope, receiptId, "UNKNOWN", "UNKNOWN");
    return response;
  }
  if (scopedCreated && scope && receiptId) {
    const stage = triggerResult.status === "enqueued" ? "published" : triggerResult.reason === "beta_admission_denied" ? "admission_denied" : "UNKNOWN";
    const reason = triggerResult.reason === "queue_publish_failed" ? "UNKNOWN" : triggerResult.reason;
    await (dependencies.receipt?.finish ?? finishScopedPublish)(scope, receiptId, stage, reason);
  }

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
