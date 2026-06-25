export type AiSketchRiskFlag =
  | "unsupported_material"
  | "unsupported_piece_type"
  | "exact_copy_reference_request"
  | "missing_human_review_gate"
  | "private_contact_data_present"
  | "reviewer_note_present"
  | "customer_safe_note_present"
  | "cad_approval_implication"
  | "quote_order_production_approval_implication"
  | "gallery_approval_implication"
  | "generation_success_treated_as_approval"
  | "missing_internal_only_flag";

export type AiSketchRiskFlagResult = {
  flags: AiSketchRiskFlag[];
};

const SUPPORTED_PIECE_TYPES = new Set(["ring", "pendant", "necklace", "bracelet", "earrings", "other"]);
const UNSUPPORTED_MATERIAL_PATTERN = /\b(titanium|platinum-iridium|meteorite|uranium|ivory)\b/i;
const EXACT_COPY_PATTERN = /\b(copy exactly|exact copy|duplicate this|same as reference|replica)\b/i;
const PRIVATE_CONTACT_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(phone|whatsapp|contact)\b/i;
const CAD_APPROVAL_PATTERN = /\b(cad[- ]?ready|cad approved|approved cad)\b/i;
const QUOTE_ORDER_PRODUCTION_PATTERN = /\b(final quote|price approved|order confirmed|production approved|start production)\b/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(collectText).join(" ");
  }

  if (isRecord(value)) {
    return Object.values(value).map(collectText).join(" ");
  }

  return "";
}

function hasKey(value: unknown, targetKey: string): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasKey(item, targetKey));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(([key, childValue]) => key === targetKey || hasKey(childValue, targetKey));
}

export function flagInternalAiSketchRisks(value: unknown): AiSketchRiskFlagResult {
  const flags = new Set<AiSketchRiskFlag>();
  const text = collectText(value);
  const root = isRecord(value) ? value : {};
  const piece = isRecord(root.piece) ? root.piece : {};
  const pieceType = typeof piece.piece_type === "string" ? piece.piece_type : "";
  const humanReview = isRecord(root.human_review) ? root.human_review : {};

  if (pieceType && !SUPPORTED_PIECE_TYPES.has(pieceType)) {
    flags.add("unsupported_piece_type");
  }

  if (UNSUPPORTED_MATERIAL_PATTERN.test(text)) {
    flags.add("unsupported_material");
  }

  if (EXACT_COPY_PATTERN.test(text)) {
    flags.add("exact_copy_reference_request");
  }

  if (
    humanReview.required_before_generation !== true ||
    humanReview.required_before_customer_delivery !== true
  ) {
    flags.add("missing_human_review_gate");
  }

  if (PRIVATE_CONTACT_PATTERN.test(text) || hasKey(value, "customer_email") || hasKey(value, "customer_phone")) {
    flags.add("private_contact_data_present");
  }

  if (hasKey(value, "reviewer_note")) {
    flags.add("reviewer_note_present");
  }

  if (hasKey(value, "customer_safe_note")) {
    flags.add("customer_safe_note_present");
  }

  if (CAD_APPROVAL_PATTERN.test(text)) {
    flags.add("cad_approval_implication");
  }

  if (QUOTE_ORDER_PRODUCTION_PATTERN.test(text)) {
    flags.add("quote_order_production_approval_implication");
  }

  if (hasKey(value, "gallery_approval") || /\bgallery approval\b/i.test(text)) {
    flags.add("gallery_approval_implication");
  }

  if (hasKey(value, "generation_success_approves_customer") || /\bgeneration success approves\b/i.test(text)) {
    flags.add("generation_success_treated_as_approval");
  }

  if (root.internal_only !== true && root.internalOnly !== true) {
    flags.add("missing_internal_only_flag");
  }

  return {
    flags: Array.from(flags),
  };
}
