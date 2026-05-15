import { NextResponse } from "next/server";

import {
  generateConceptBriefPublicReferencePreview,
  validateConceptBriefSubmission,
} from "../../../lib/server/concept-brief-validation";
import { getSupabaseServerReadiness } from "../../../lib/server/supabase";

type ConceptBriefSkeletonResponse = {
  ok: boolean;
  mode: "skeleton";
  persisted: false;
  message: string;
  publicReference?: string;
  errors?: string[];
};

function jsonResponse(body: ConceptBriefSkeletonResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        mode: "skeleton",
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
        mode: "skeleton",
        persisted: false,
        message: "Concept Brief submission is missing required fields. No Concept Brief was saved.",
        errors: validation.errors,
      },
      400,
    );
  }

  const readiness = getSupabaseServerReadiness();
  const persistenceMessage = readiness.readyForAdminClient
    ? "Concept Brief API skeleton received a valid payload, but database writes are intentionally disabled until schema, RLS, and persistence rules are reviewed."
    : "Concept Brief API skeleton received a valid payload, but persistence is not configured yet.";

  // Skeleton only: this route performs no Supabase queries, database writes, or
  // storage operations. The public reference is a customer-safe preview only and
  // is not persisted. Future implementation must validate auth, RLS, schema,
  // retention, and product boundaries before enabling real persistence.
  return jsonResponse(
    {
      ok: true,
      mode: "skeleton",
      persisted: false,
      message: persistenceMessage,
      publicReference: generateConceptBriefPublicReferencePreview(),
    },
    202,
  );
}
