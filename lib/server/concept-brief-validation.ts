import "server-only";

export type ConceptBriefSubmissionPayload = {
  customerName?: unknown;
  customerEmail?: unknown;
  customerPhone?: unknown;
  customerCountry?: unknown;
  contactNote?: unknown;
  contact?: {
    customerName?: unknown;
    customerEmail?: unknown;
    customerPhone?: unknown;
    customerCountry?: unknown;
    contactNote?: unknown;
  };
  brief?: unknown;
  conceptBrief?: unknown;
  pieceType?: unknown;
  structure?: unknown;
  summaryItems?: unknown;
  aiSketchInstruction?: unknown;
};

type ConceptBriefValidationResult = {
  valid: boolean;
  errors: string[];
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hasBriefPayload(payload: ConceptBriefSubmissionPayload): boolean {
  return Boolean(
    payload.brief ||
      payload.conceptBrief ||
      payload.pieceType ||
      payload.structure ||
      payload.summaryItems ||
      payload.aiSketchInstruction,
  );
}

export function generateConceptBriefPublicReferencePreview(date = new Date()): string {
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");

  return `NOVORA-CB-${datePart}-${suffix}`;
}

export function validateConceptBriefSubmission(payload: unknown): ConceptBriefValidationResult {
  const errors: string[] = [];

  if (!isRecord(payload)) {
    return {
      valid: false,
      errors: ["Request body must be a JSON object."],
    };
  }

  const submission = payload as ConceptBriefSubmissionPayload;
  const contact = isRecord(submission.contact) ? submission.contact : {};
  const customerName = readString(submission.customerName ?? contact.customerName);
  const customerEmail = readString(submission.customerEmail ?? contact.customerEmail);

  if (!customerName) {
    errors.push("Customer name is required.");
  }

  if (!customerEmail) {
    errors.push("Email address is required.");
  } else if (!EMAIL_PATTERN.test(customerEmail)) {
    errors.push("Enter a valid email address.");
  }

  if (!hasBriefPayload(submission)) {
    errors.push("Concept brief payload is required.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
