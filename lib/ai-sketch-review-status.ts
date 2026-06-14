export const AI_SKETCH_REVIEW_STATUSES = [
  'internal_draft_not_generated',
  'draft_generated_internal_only',
  'needs_revision',
  'approved_for_customer',
] as const;

export type AiSketchReviewStatus = (typeof AI_SKETCH_REVIEW_STATUSES)[number];

export const AI_SKETCH_REVIEW_INITIAL_STATUS: AiSketchReviewStatus = 'internal_draft_not_generated';

export const AI_SKETCH_REVIEW_STATUS_LABELS: Record<AiSketchReviewStatus, string> = {
  internal_draft_not_generated: 'Internal draft not generated',
  draft_generated_internal_only: 'Draft generated — internal only',
  needs_revision: 'Needs revision',
  approved_for_customer: 'Approved for customer',
};

export const AI_SKETCH_REVIEW_STATUS_HELP_TEXT: Record<AiSketchReviewStatus, string> = {
  internal_draft_not_generated: 'No internal sketch draft has been generated yet.',
  draft_generated_internal_only:
    'GPT/AI has generated an internal draft, but it is only for admin/design-team review.',
  needs_revision:
    'Human review found structure, style, or brief-alignment issues and the sketch needs revision.',
  approved_for_customer:
    'NOVORA human review has approved the sketch for later customer-facing concept presentation.',
};

export function isAiSketchReviewStatus(value: string): value is AiSketchReviewStatus {
  return (AI_SKETCH_REVIEW_STATUSES as readonly string[]).includes(value);
}
