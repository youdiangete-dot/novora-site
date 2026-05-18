import { NextResponse } from "next/server";

import { persistConceptBriefSubmission } from "../../../lib/server/concept-brief-persistence";
import {
  type ConceptBriefSubmissionPayload,
  validateConceptBriefSubmission,
} from "../../../lib/server/concept-brief-validation";

type ConceptBriefResponse = {
  ok: boolean;
  mode: "supabase";
  persisted: boolean;
  message: string;
  publicReference?: string;
  conceptBriefId?: string;
  errors?: string[];
};

function jsonResponse(body: ConceptBriefResponse, status: number) {
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
