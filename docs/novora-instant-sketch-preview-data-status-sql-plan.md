# NOVORA Instant Sketch Preview Data Status SQL Plan

## 1. Purpose

This document plans future data model, status model, feedback records, and SQL
packet direction for NOVORA's instant customer-facing AI concept sketch preview.

This is planning only:

- No SQL is executed.
- No migration is created.
- No Supabase schema is changed.
- No app code is implemented.
- No route, UI, storage, provider, email, Vercel, or Production behavior is
  changed.

The plan exists so a later approved SQL or implementation task can make
explicit decisions instead of silently mixing Concept Brief receipt, AI
generation, customer preview, human review, and production approval concepts.

## 2. Confirmed product direction

Documented owner direction from Agent 60I, Agent 61A, Agent 61B, and limited
beta planning:

- Limited beta remains invite-only.
- Limited beta size is 5-10 users.
- Target beta language options are English and Traditional Chinese.
- Automatic submission response is desired.
- Customer should see the first AI-generated hand-sketch concept as soon as
  possible after submitting a Concept Brief.
- Human intervention should focus on structure logic errors, craft issues,
  jewelry construction errors, production feasibility issues, inconsistent
  views, wrong setting logic, proportion problems, customer request mismatch,
  unsafe claims, correction, and regeneration.
- The first sketch is a concept preview only. It is not CAD, not a quote, not
  order approval, not payment approval, and not production approval.

This direction changes future planning from earlier email-only customer
delivery defaults, but it does not make AI sketches final, production-ready, or
automatically human-approved.

## 3. Existing known data model

Known current or documented planning objects:

| Item | Documented responsibility | Schema certainty |
| --- | --- | --- |
| `concept_briefs` | Existing submitted Concept Brief parent record, including customer-visible `publicReference` / `NOVORA-CB-...` semantics. | Live table exists. Exact current columns require schema inspection in a future read-only SQL verification step. |
| `concept_brief_contacts` | Existing contact details linked to a Concept Brief. | Live table exists. Exact current columns require schema inspection in a future read-only SQL verification step. |
| `concept_brief_reference_assets` | Existing metadata for customer reference uploads and private storage linkage. | Live table exists. Exact current columns require schema inspection in a future read-only SQL verification step. |
| `ai_sketch_jobs` | Documented future/planned generation orchestration, retry, cost, provider, and idempotency state. | Live shape is not claimed here. Columns require schema inspection in a future read-only SQL verification step. |
| `ai_sketch_outputs` | Documented future/planned generated output metadata and private storage reference. | Live shape is not claimed here. Columns require schema inspection in a future read-only SQL verification step. |
| `ai_sketch_reviews` | Documented existing/planned human review decision record. Prior docs identify review-status boundary work. | Exact current columns and row values require schema inspection in a future read-only SQL verification step. |
| `admin_notes` | Existing persisted admin review status and internal notes for protected admin workflow. | Live table exists. Exact current columns require schema inspection in a future read-only SQL verification step. |
| `concept_brief_notification_events` | Existing durable admin notification idempotency table. | Live table exists with service-role-only access documented. Exact current columns require schema inspection in a future read-only SQL verification step. |
| `novora-reference-images` | Existing Supabase Storage bucket for customer reference images. | Bucket exists. Policy details require future approved verification before changes. |
| `novora-ai-sketches` | Existing documented Supabase Storage bucket for generated AI sketch outputs. | Bucket exists. Policy details require future approved verification before changes. |

This document does not invent implemented columns, constraints, policies, or
migrations.

## 4. Data model goals for instant preview

Future data model work should support these needs:

- One Concept Brief can have a generation lifecycle.
- The first customer-facing preview must be distinguishable from internal
  drafts.
- Customer preview status must not mean human approval.
- Customer preview status must not mean production approval.
- Feedback must be recorded without overwriting the original brief.
- Generation retries must be traceable.
- Failed and delayed states must be visible to customer flow and admin flow.
- Provider, model, cost, prompt, spec, and template metadata must be recorded
  server-side only.
- Duplicate generation should be prevented or controlled.
- Customer-safe notes must be separated from internal reviewer notes.

The data model should keep these domains separate: Concept Brief submission,
Design Spec / Hand Sketch Instruction artifacts, generation job state,
generated output state, customer preview visibility, human review state,
feedback history, gallery approval, and CAD/quote/payment/order/production
status.

## 5. Status model planning

These are planning candidates only.

Customer preview lifecycle candidates:

- `submitted`
- `structuring_brief`
- `design_spec_ready`
- `hand_sketch_instruction_ready`
- `sketch_generation_queued`
- `sketch_generating`
- `first_preview_ready`
- `generation_delayed`
- `generation_failed`
- `preview_unavailable`
- `customer_feedback_submitted`
- `revision_requested`
- `revision_generating`
- `revised_preview_ready`
- `human_followup_needed`
- `closed_or_archived`

Admin / human correction candidates:

- `no_human_review_needed_yet`
- `human_review_needed`
- `structural_issue_found`
- `craft_or_production_issue_found`
- `regeneration_requested`
- `corrected_preview_ready`
- `customer_safe_note_ready`
- `escalated_to_offline_cad_or_quote`

Existing legal AI sketch review statuses must not be redefined unless a future
implementation intentionally changes them. `first_preview_ready` is not the
same as `approved_for_customer`, `approved_for_gallery`, CAD approval, quote
approval, payment approval, order approval, or production approval.

## 6. Existing AI sketch review status boundary

Documented AI sketch review statuses:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

Earlier AI sketch review planning treats `approved_for_customer` as a human
review / customer-safe delivery readiness concept for a specific output. Agent
60I creates a semantic gap because the future first-preview direction may show
an initial concept preview quickly, while `approved_for_customer` historically
meant human approval or customer-safe delivery.

Future implementation must avoid reusing `approved_for_customer` incorrectly
when a first preview is not human-reviewed. It should either:

- Add a separate customer preview lifecycle, or
- Carefully map preview states without weakening human review, gallery,
  production, CAD, quote, order, or payment boundaries.

## 7. Feedback record planning

Future feedback should be stored as append-only or history-preserving records
rather than overwriting the original Concept Brief.

Candidate fields / concepts:

- `concept_brief_id`
- `ai_sketch_output_id` or `preview_output_id`
- `public_reference` or safe customer token reference
- `feedback_type`
- `customer_message`
- `requested_changes`
- `selected_style_direction`
- `mismatch_reported`
- `human_followup_requested`
- `language`
- `customer_visible`
- `internal_only`
- `created_at`
- `reviewed_at`
- `reviewed_by`
- `reviewer_note`
- `customer_safe_note`
- `status`

Any executable SQL for feedback records belongs in a later approved SQL packet.
If future planning includes SQL examples, label them as non-executable planning
pseudocode only.

## 8. Generation job planning

Future `ai_sketch_jobs` responsibilities should include:

- Link to `concept_brief_id`.
- Idempotency key.
- Generation purpose, such as first preview, revision, internal draft, or
  admin correction.
- Status.
- Attempt number and max attempts.
- `prompt_version`.
- `design_spec_version`.
- `hand_sketch_instruction_version`.
- Model/provider.
- Size/quality.
- Cost estimate.
- `started_at`, `completed_at`, and `failed_at`.
- Sanitized failure reason.
- Retry-of relationship.
- Created server-side only.

Duplicate protection should plan for one active first-preview generation job per
Concept Brief. Future writes should prevent blind upsert behavior that hides
duplicates. Prefer explicit create/update semantics, reuse documented
idempotency patterns, and record whether duplicate prevention reused an
existing job, blocked a new job, or allowed a retry after failure.

## 9. Output record planning

Future `ai_sketch_outputs` responsibilities should include:

- `job_id`.
- `concept_brief_id`.
- Output type, such as `first_preview`, `revision_preview`, `internal_draft`,
  or `admin_corrected`.
- Storage bucket / object path.
- Width / height / format.
- Provider output id if safe to store.
- Checksum or hash if useful.
- Prompt, Design Spec, and Hand Sketch Instruction versions.
- Visibility flag.
- `customer_visible_at`.
- `rejected_at`.
- Rejection reason.
- Output metadata.
- `created_at`.

Customer-visible output is not final approval. Output visibility must remain
separate from CAD approval, quote approval, payment approval, order approval,
production approval, and public gallery approval.

## 10. Storage planning

Storage responsibilities:

- Customer reference images remain separate from generated sketch outputs.
- Generated sketch output files should live in the AI sketch storage bucket if
  that remains the approved storage direction.
- Storage paths should avoid exposing private database IDs when served to
  customers.
- Customer preview access should use signed URLs, safe public tokens, or a
  future approved public access strategy.
- Provider raw metadata should not be exposed to customers.

This document does not change storage policies, buckets, object paths, signed
URL behavior, or access rules.

## 11. Public reference / token planning

Future customer preview access should avoid internal IDs:

- `publicReference` / `NOVORA-CB-...` can identify the brief to customers if
  the documented semantics remain unchanged.
- A preview route may need a safe token, signed access, or server-mediated
  access check.
- Internal database IDs should not appear in customer URLs.
- Admin routes must remain protected.
- Customer preview tokens should have expiration and revocation strategy if a
  future implementation requires customer-link access.

A public reference alone may be too guessable for private generated-asset
access.

## 12. SQL packet planning outline

Future SQL workstreams should be separate and explicitly reviewed:

- Read-only schema verification packet.
- Status enum / check constraint review.
- Feedback table candidate.
- Preview lifecycle table or columns candidate.
- `ai_sketch_jobs` indexes / unique constraints candidate.
- `ai_sketch_outputs` visibility / output type candidate.
- RLS / policy review candidate.
- Storage policy review candidate.
- Duplicate generation protection candidate.
- Rollback / verification queries.

This document does not include final executable SQL and does not execute SQL.
If a future packet includes draft SQL, it must be clearly labeled as draft
planning or reviewed execution SQL according to that task's approval boundary.

## 13. RLS and server-only boundary planning

Future RLS and access planning should preserve these boundaries:

- Public customer routes should never need the service role key.
- Writes that require privileged access should happen server-side only.
- Provider keys must stay server-only.
- Customer feedback submission should use a safe public route, server action,
  or API route with validation.
- Generated output visibility must not expose internal-only drafts.
- Admin reviewer notes and customer-safe notes must be separated.
- Production data access requires separate explicit approval.

RLS, grants, policies, and storage access must be reviewed before any customer
preview data or generated assets become externally visible.

## 14. Idempotency and duplicate protection planning

Future implementation should plan:

- Idempotency key per Concept Brief plus generation purpose.
- Avoid multiple first-preview jobs for one brief.
- Handle browser refresh.
- Handle duplicate customer submission.
- Handle retry after failure.
- Handle webhook/provider retry if used later.
- Avoid blind upsert.
- Prefer explicit create/update split when writing generation or review
  records.
- Log the duplicate prevention result.

Duplicate protection should not hide whether a duplicate was blocked, reused,
or retried.

## 15. Error, retry, and delay state data planning

Future data should support safe customer and admin states for:

- Timeout.
- Provider failure.
- Invalid input.
- Unsafe output.
- Output not jewelry-relevant.
- Generation rate-limited.
- Budget blocked.
- Duplicate generation blocked.
- Retry pending.
- Retry failed.
- Delayed but not failed.
- Human follow-up needed.

Customer-facing errors should remain non-technical. Admin-facing diagnostics can
store sanitized categories, attempt counts, retry eligibility, and next action,
but must not expose secrets, raw provider payloads, private prompts, protected
storage paths, or internal reviewer notes to customer surfaces.

## 16. Customer-visible vs internal-only fields

Plan clear separation between:

- Customer-visible sketch label.
- Customer-visible status.
- Customer-safe note.
- Internal reviewer note.
- Internal failure reason.
- Provider metadata.
- Cost estimate.
- Admin-only correction flag.
- Customer feedback text.

Provider metadata, cost estimates, internal reviewer notes, internal failure
reasons, raw prompts, raw provider payloads, private storage paths, service
role/admin details, and admin-only correction flags must not be exposed to
customers.

Customer feedback text may be customer-originated, but future customer display
still needs validation, privacy review, and customer-safe rendering.

## 17. Localization data considerations

Future data planning should account for:

- Feedback language.
- Customer-facing status language.
- Bilingual disclaimer copy version.
- Original customer brief language.
- Translated or structured spec language.
- Avoiding loss of Traditional Chinese / English intent during structuring.

Localization should be treated as a product system. It may later affect copy,
market-specific trust language, sizing conventions, currency, contact
preferences, tax/shipping notes, and customer support flow.

## 18. Analytics / conversion event data planning

Future event tracking can be planned for:

- `brief_submitted`
- `preview_processing_viewed`
- `first_preview_ready`
- `first_preview_viewed`
- `feedback_submitted`
- `revision_requested`
- `human_followup_requested`
- `generation_failed`
- `generation_delayed`
- `time_to_first_preview`
- `preview_to_followup_conversion`

Analytics should not capture private prompts, raw provider payloads, reference
images, customer contact details, or sensitive free-text notes unless a future
privacy-reviewed implementation explicitly approves the field and retention
policy.

## 19. Implementation sequencing

Recommended future agents:

- Agent 61D: Design Spec JSON and Hand Sketch Instruction alignment for first
  preview generation.
- Agent 61E: SQL packet draft for preview lifecycle and feedback records.
- Agent 61F: customer preview route skeleton implementation behind mock states,
  no live image generation.
- Agent 61G: feedback loop planning / implementation behind safe gates.
- Agent 61H: server-side generation orchestration plan.
- Later agent: live image API integration only after env, storage, rate-limit,
  cost, error handling, privacy, disclaimers, and data model are ready.

Keep route/UI, data model, SQL, provider integration, storage, feedback, legal,
analytics, and Production verification in separate approval boundaries unless a
future task explicitly narrows and combines them.

## 20. Open decisions

Unresolved decisions:

- Exact preview route path.
- Whether `/design/sketch` is reused or replaced.
- Exact preview status names.
- Exact feedback table shape.
- Exact storage path pattern.
- Exact access token strategy.
- Exact RLS policy shape.
- Exact image provider/model.
- Exact generation budget.
- Maximum sketches per brief.
- Maximum retries per brief.
- Exact customer-safe sender / reply-to.
- Exact Privacy / Terms publication timing.
- Exact rate-limit mitigation owner.
- Final go/no-go owner.

Do not invent these answers during SQL or implementation work.

## 21. Stop conditions

Stop before any request to:

- Execute SQL in this planning step.
- Create migrations in this planning step.
- Mutate Supabase or Production data.
- Expose provider keys client-side.
- Expose internal IDs in customer URLs.
- Present first preview as CAD, quote, order, payment, or production approval.
- Remove disclaimers.
- Remove the human correction path.
- Launch broad public traffic before beta gates, privacy, rate-limit, cost, and
  abuse controls are resolved.
- Connect live image generation before data/status/storage/error handling are
  approved.

Also stop before app code, routes, UI, tests, package changes, assets,
protected admin access, email sending, Vercel/env changes, Production deploy,
or PR merge unless a separate task explicitly approves that exact scope.
