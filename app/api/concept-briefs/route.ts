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

type ConceptBriefResponse = {
  ok: boolean;
  mode: "supabase";
  persisted: boolean;
  message: string;
  publicReference?: string;
  conceptBriefId?: string;
  errors?: string[];
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

export async function POST(request: Request) {
  const ipRateLimit = await checkPublicApiRateLimit({
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
    const emailRateLimit = await checkPublicApiRateLimit({
      routeName: CONCEPT_BRIEF_ROUTE_NAME,
      request,
      policy: CONCEPT_BRIEF_EMAIL_RATE_LIMIT,
      normalizedEmail,
    });

    if (!emailRateLimit.allowed) {
      return rateLimitResponse(emailRateLimit.headers);
    }
  }

  const persistence = await persistConceptBriefSubmission(payload as ConceptBriefSubmissionPayload);

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

  return jsonResponse(
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
}
