import {
  isIllegalPendingAiSketchReviewStatus,
  normalizeAiSketchReviewStatus,
} from "./status-guards";

export type DesignSpecValidationIssueCode =
  | "missing_required_section"
  | "illegal_review_status"
  | "forbidden_private_contact_field"
  | "forbidden_note_field"
  | "missing_human_review_gate"
  | "generation_success_treated_as_approval"
  | "gallery_approval_present";

export type DesignSpecValidationIssue = {
  code: DesignSpecValidationIssueCode;
  path: string;
  message: string;
};

export type DesignSpecValidationResult = {
  ok: boolean;
  issues: DesignSpecValidationIssue[];
};

const REQUIRED_DESIGN_SPEC_SECTIONS = [
  "schema_version",
  "source",
  "customer_intent",
  "piece",
  "style",
  "materials",
  "stones",
  "composition",
  "unknowns",
  "human_review",
] as const;

const CONTACT_FIELD_PATTERN = /(customer_)?(name|email|phone|whatsapp|contact|address)$/i;
const FORBIDDEN_NOTE_KEYS = new Set(["reviewer_note", "customer_safe_note"]);
const STATUS_KEY_PATTERN = /status$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasRequiredHumanReviewGate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.required_before_generation === true &&
    value.required_before_customer_delivery === true
  );
}

function walkUnknown(value: unknown, callback: (path: string, key: string, value: unknown) => void, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkUnknown(item, callback, `${path}[${index}]`));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  Object.entries(value).forEach(([key, childValue]) => {
    const childPath = `${path}.${key}`;

    callback(childPath, key, childValue);
    walkUnknown(childValue, callback, childPath);
  });
}

export function validateInternalDesignSpecShape(value: unknown): DesignSpecValidationResult {
  const issues: DesignSpecValidationIssue[] = [];

  if (!isRecord(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "missing_required_section",
          path: "$",
          message: "Design Spec must be an object.",
        },
      ],
    };
  }

  REQUIRED_DESIGN_SPEC_SECTIONS.forEach((section) => {
    if (!(section in value)) {
      issues.push({
        code: "missing_required_section",
        path: `$.${section}`,
        message: `Missing required Design Spec section: ${section}.`,
      });
    }
  });

  if (!hasRequiredHumanReviewGate(value.human_review)) {
    issues.push({
      code: "missing_human_review_gate",
      path: "$.human_review",
      message: "Human review must be required before generation and before customer delivery.",
    });
  }

  walkUnknown(value, (path, key, childValue) => {
    if (FORBIDDEN_NOTE_KEYS.has(key)) {
      issues.push({
        code: "forbidden_note_field",
        path,
        message: `${key} must not be present in generation-facing Design Spec data.`,
      });
    }

    if (CONTACT_FIELD_PATTERN.test(key)) {
      issues.push({
        code: "forbidden_private_contact_field",
        path,
        message: "Private customer contact fields must not be present in generation-facing data.",
      });
    }

    if (STATUS_KEY_PATTERN.test(key) && typeof childValue === "string") {
      const normalizedStatus = normalizeAiSketchReviewStatus(childValue);

      if (!normalizedStatus || isIllegalPendingAiSketchReviewStatus(childValue)) {
        issues.push({
          code: "illegal_review_status",
          path,
          message: "Design Spec contains an illegal AI sketch review status.",
        });
      }
    }

    if (key === "gallery_approval" && childValue === true) {
      issues.push({
        code: "gallery_approval_present",
        path,
        message: "Customer approval must not be treated as gallery approval.",
      });
    }

    if (key === "generation_success_approves_customer" && childValue === true) {
      issues.push({
        code: "generation_success_treated_as_approval",
        path,
        message: "AI generation success must not approve customer delivery.",
      });
    }
  });

  return {
    ok: issues.length === 0,
    issues,
  };
}
