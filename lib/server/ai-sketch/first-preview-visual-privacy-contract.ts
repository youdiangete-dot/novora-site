import { isValidFirstPreviewAssetUuid, isValidFirstPreviewContentSha256 } from "./first-preview-generated-assets-contract";

export const FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION = "novora_first_preview_visual_privacy_v1" as const;
export const FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION = "novora_openai_visual_privacy_inspector_v1" as const;
export const FIRST_PREVIEW_VISUAL_PRIVACY_MODEL = "gpt-4.1-mini-2025-04-14" as const;
export const FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS = 30_000;
export const FIRST_PREVIEW_VISUAL_PRIVACY_BRIEF_LIMIT_MICROS = 60_000;

export type VisualPrivacySubject = Readonly<{
  conceptBriefId: string;
  jobId: string;
  outputId: string;
  contentSha256: string;
}>;

export type FirstPreviewVisualPrivacyEvidence = Readonly<{
  subject: VisualPrivacySubject;
  inspectorVersion: typeof FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION;
  policyVersion: typeof FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION;
  model: typeof FIRST_PREVIEW_VISUAL_PRIVACY_MODEL;
  result: "passed" | "failed";
  usageTrusted: boolean;
  actualCostMicros: number;
}>;

// An operational disposition is not a visual inspector verdict. A reservation
// remains charged even when the Provider bill cannot be confirmed.
export type FirstPreviewInspectionInterruptionEvidence = Readonly<{
  result: "failed";
  reason: "inspection_interrupted" | "gate_pipeline_failed";
  subject: VisualPrivacySubject;
  billingStatus: "unknown";
  reservedCostMicros: typeof FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS;
  visualPrivacyEvidence?: FirstPreviewVisualPrivacyEvidence;
}>;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

export function isVisualPrivacySubject(value: unknown): value is VisualPrivacySubject {
  return record(value) && exactKeys(value, ["conceptBriefId", "jobId", "outputId", "contentSha256"]) &&
    typeof value.conceptBriefId === "string" && isValidFirstPreviewAssetUuid(value.conceptBriefId) &&
    typeof value.jobId === "string" && isValidFirstPreviewAssetUuid(value.jobId) &&
    typeof value.outputId === "string" && isValidFirstPreviewAssetUuid(value.outputId) &&
    typeof value.contentSha256 === "string" && isValidFirstPreviewContentSha256(value.contentSha256);
}

export function validateFirstPreviewVisualPrivacyEvidence(
  value: unknown,
  expectedSubject: VisualPrivacySubject,
  requirePassed = true,
): value is FirstPreviewVisualPrivacyEvidence {
  if (!isVisualPrivacySubject(expectedSubject) || !record(value) ||
    !exactKeys(value, ["subject", "inspectorVersion", "policyVersion", "model", "result", "usageTrusted", "actualCostMicros"]) ||
    !isVisualPrivacySubject(value.subject) ||
    value.subject.conceptBriefId !== expectedSubject.conceptBriefId ||
    value.subject.jobId !== expectedSubject.jobId ||
    value.subject.outputId !== expectedSubject.outputId ||
    value.subject.contentSha256 !== expectedSubject.contentSha256 ||
    value.inspectorVersion !== FIRST_PREVIEW_VISUAL_PRIVACY_INSPECTOR_VERSION ||
    value.policyVersion !== FIRST_PREVIEW_VISUAL_PRIVACY_POLICY_VERSION ||
    value.model !== FIRST_PREVIEW_VISUAL_PRIVACY_MODEL ||
    (value.result !== "passed" && value.result !== "failed") ||
    typeof value.usageTrusted !== "boolean" ||
    !Number.isSafeInteger(value.actualCostMicros) || (value.actualCostMicros as number) < 0 ||
    (value.usageTrusted === false && value.actualCostMicros !== FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS)) return false;

  return !requirePassed || (value.result === "passed" && value.usageTrusted === true &&
    (value.actualCostMicros as number) <= FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS);
}

export function validateFirstPreviewInspectionInterruptionEvidence(
  value: unknown,
  expectedSubject: VisualPrivacySubject,
): value is FirstPreviewInspectionInterruptionEvidence {
  if (!record(value) || !isVisualPrivacySubject(expectedSubject)) return false;
  const keys = value.visualPrivacyEvidence === undefined
    ? ["result", "reason", "subject", "billingStatus", "reservedCostMicros"]
    : ["result", "reason", "subject", "billingStatus", "reservedCostMicros", "visualPrivacyEvidence"];
  if (!exactKeys(value, keys) || value.result !== "failed" ||
    (value.reason !== "inspection_interrupted" && value.reason !== "gate_pipeline_failed") ||
    value.billingStatus !== "unknown" ||
    value.reservedCostMicros !== FIRST_PREVIEW_VISUAL_PRIVACY_RESERVATION_MICROS ||
    !isVisualPrivacySubject(value.subject) ||
    value.subject.conceptBriefId !== expectedSubject.conceptBriefId ||
    value.subject.jobId !== expectedSubject.jobId ||
    value.subject.outputId !== expectedSubject.outputId ||
    value.subject.contentSha256 !== expectedSubject.contentSha256) return false;
  return value.visualPrivacyEvidence === undefined ||
    validateFirstPreviewVisualPrivacyEvidence(value.visualPrivacyEvidence, expectedSubject, false);
}

// A pending v2 gate reserves the full fixed inspection amount forever. A low
// measured charge does not release room for another dispatch of that candidate.
export function hasPassedFirstPreviewAutomaticGateEvidence(value: unknown, subject: VisualPrivacySubject): boolean {
  return record(value) && exactKeys(value, ["result", "outputValid", "assetExists", "ownershipConsistent", "privacyPassed", "customerAccessEligible", "lifecycleEligible", "visualPrivacyEvidence"]) &&
    value.result === "passed" && value.outputValid === true && value.assetExists === true &&
    value.ownershipConsistent === true && value.privacyPassed === true &&
    value.customerAccessEligible === true && value.lifecycleEligible === true &&
    validateFirstPreviewVisualPrivacyEvidence(value.visualPrivacyEvidence, subject);
}
