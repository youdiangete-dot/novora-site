# NOVORA Admin AI Sketch Review Workflow State Plan

## A. Purpose And Boundary

This is a planning and review document only. It does not implement persistence,
execute SQL, change Supabase, change RLS, grants, policies, or storage, change
app code, add API routes, call OpenAI, generate images, upload or store AI
images, expose customer-facing sketch display, implement auth, implement
payment or points, change environment variables or secrets, access Production or
protected admin pages, create submissions, send email, deploy, or touch CAD,
order, production, or customer data.

AI sketches are internal drafts until reviewed and approved. Customers must
only see sketches approved by the NOVORA design team. An AI sketch is an AI
hand-drawn concept sketch for early design direction only. It is not CAD, not a
quote, not an order, not final pricing, not sourcing confirmation, and not
production approval. Unreviewed GPT/AI drafts must never be shown directly to
customers.

This plan is intended to give a future implementation agent a safe state model
for the admin AI Sketch Review Workflow added in PR #106. It must be reviewed
before any schema, persistence, API, storage, provider, or customer-visible work
begins.

## B. Current Implemented Baseline

After PR #106, the protected admin brief detail page includes a static,
skeleton-only AI Sketch Review Workflow module. It is admin-only and appears
under `/admin/briefs/[publicReference]` after valid admin access.

Current baseline:

- Default workflow status: `Internal draft not generated`.
- Empty state: `No internal sketch drafts yet.`.
- Admin copy lists four workflow statuses:
  - `Internal draft not generated`
  - `Draft generated — internal only`
  - `Needs revision`
  - `Approved for customer`
- The workflow copy states that AI sketches are internal drafts until reviewed
  and approved, and that customers must only see sketches approved by the NOVORA
  design team.
- Customer-facing pages are tested not to expose internal AI sketch review
  workflow copy.
- The skeleton does not generate, store, deliver, or persist sketches.
- No persistence exists yet for this AI Sketch Review Workflow state machine.

Existing admin review status and internal notes may use Supabase `admin_notes`
or local fallback review state, but that is not the same as persisted AI sketch
workflow state. This plan keeps the future AI sketch workflow separate until a
future task explicitly approves the storage model.

## C. Future State Machine

Allowed future workflow statuses:

| Status | User-facing label | Admin meaning | Customer visibility | AI sketch output exists | Customer access allowed | Allowed next statuses | Disallowed transitions | Risk if misused |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `internal_draft_not_generated` | Internal draft not generated | No internal AI sketch draft exists for this Concept Brief. | None. Customer should see only a waiting or unavailable state if any customer route exists. | No. | No. | `draft_generated_internal_only` | Directly to `needs_revision` or `approved_for_customer` without an output and human review. | A customer or admin may think a sketch exists or was approved when no output exists. |
| `draft_generated_internal_only` | Draft generated - internal only | A provider or internal process produced a draft that is available only to admin/design-team review. | None. Draft remains private. | Yes. | No. | `needs_revision`, `approved_for_customer` | Back to `internal_draft_not_generated` unless the output is explicitly voided; direct customer delivery without approval. | Unreviewed AI output could be exposed, including poor quality, private details, or unsafe reference interpretation. |
| `needs_revision` | Needs revision | Human review found quality, structure, style, privacy, or brief-alignment issues. | None. Customer preview must be blocked or revoked while this status is active. | Usually yes, but the current output is not approved. | No. | `draft_generated_internal_only`, `approved_for_customer` after human review | Customer delivery, public gallery approval, or automatic approval after regeneration. | A known-problem draft may be shown to the customer or treated as acceptable. |
| `approved_for_customer` | Approved for customer | A human/admin reviewer approved a specific output for private customer-facing concept presentation. | Private customer preview may become eligible only after separate delivery rules pass. | Yes. | Conditionally; only through customer-delivery rules. | `needs_revision` or a future revoked state if added; otherwise a new output may start at `draft_generated_internal_only`. | Automatic gallery approval, direct public publishing, or approval without a reviewer. | Approval may be confused with gallery consent, CAD readiness, quotation, order, or production approval. |

The state machine should be output-aware. Approval should apply to a specific
`ai_sketch_output_id`, not vaguely to a Concept Brief. If a new draft is
generated, the new output should start private and unapproved even when a prior
output was approved.

## D. Transition Rules

Safe future transitions:

- `internal_draft_not_generated` -> `draft_generated_internal_only` after a
  successful internal draft record exists.
- `draft_generated_internal_only` -> `needs_revision` when human review asks
  for revision or flags quality/privacy/brief-fit issues.
- `needs_revision` -> `draft_generated_internal_only` after a new or updated
  internal draft is generated for review.
- `draft_generated_internal_only` -> `approved_for_customer` only when a
  human/admin reviewer approves that exact output.
- `needs_revision` -> `approved_for_customer` only after human review confirms
  the revised output is acceptable and the status change is intentional.

Required safety rules:

- Only a human/admin review action can mark `approved_for_customer`.
- AI generation success alone must not approve a sketch.
- Regeneration or revision must not automatically expose prior drafts or new
  drafts.
- Customer visibility is gated by `approved_for_customer` plus separate
  customer-delivery rules.
- A status change should record actor, timestamp, previous status, next status,
  reason or note, affected Concept Brief, affected output, and whether customer
  visibility changed.
- Reapproval should be required after meaningful prompt, provider, model,
  reference image, output, or customer-facing copy changes.
- Revocation should be available before real customer delivery is implemented,
  even if the first UI only documents the placeholder.

## E. Data Model Planning

This section is future planning only. It is not SQL, not a migration, and not
permission to create tables, alter tables, change RLS, change storage, or wire
app code.

Likely future records:

| Record | Planning purpose | Likely future fields |
| --- | --- | --- |
| `concept_briefs` | Existing submitted design-intake record that owns the customer request. | `concept_brief_id`, customer/contact linkage, public reference, current brief status. |
| `concept_brief_reference_assets` | Existing reference asset metadata used to understand customer-provided images. | `concept_brief_id`, asset id, upload status, storage reference, privacy/review flags. |
| `ai_sketch_jobs` | Generation orchestration and retry/idempotency state. | `concept_brief_id`, `ai_sketch_job_id`, `prompt_version`, `model`, `quality`, `size`, `cost_estimate_usd`, `generation_type`, `parent_generation_id`, status, failure reason. |
| `ai_sketch_outputs` | Generated output metadata and private storage reference. | `concept_brief_id`, `ai_sketch_job_id`, `ai_sketch_output_id`, storage asset id, `review_status`, `is_customer_visible`, `customer_visible_asset_id`, `prompt_version`, `model`, `quality`, `size`, `generation_type`, `parent_generation_id`. |
| `ai_sketch_reviews` | Human review decisions for a specific output. | `ai_sketch_output_id`, `review_status`, `reviewer_admin_id` or `reviewer_label`, `review_note_internal`, `revision_instruction`, `approved_for_customer_at`, `approved_by`, `audit_event_id`. |
| `ai_sketch_ownership_records` | Customer/brief/package access relationship for private delivery. | `concept_brief_id`, customer/profile id if auth exists, `ai_sketch_job_id`, `ai_sketch_output_id`, access state, `is_customer_visible`, `customer_visible_asset_id`, usage-rights scope. |
| `admin_operation_audit_events` | Accountability trail for sensitive admin operations. | `audit_event_id`, actor, timestamp, operation type, previous status, next status, reason/note, target table/id, affected `concept_brief_id`, affected `ai_sketch_output_id`, customer visibility changed. |
| `credit_ledger_entries` | Future point deduction, reservation, reversal, or failed-generation accounting if paid generation is involved. | Customer/account ids, related `ai_sketch_job_id`, related `ai_sketch_output_id`, delta points, reason code, idempotency key, `audit_event_id`. |
| `final_sketch_package_orders` | Future paid final sketch package entitlement and fulfillment. | Customer/profile id, `concept_brief_id`, selected/delivered `ai_sketch_output_id`, package type, fulfillment status, ownership record id, customer-visible flag. |

The following fields are planning fields only and should be reviewed before any
schema is approved: `concept_brief_id`, `ai_sketch_job_id`,
`ai_sketch_output_id`, `review_status`, `reviewer_admin_id`,
`reviewer_label`, `review_note_internal`, `revision_instruction`,
`approved_for_customer_at`, `approved_by`, `customer_visible_asset_id`,
`is_customer_visible`, `prompt_version`, `model`, `quality`, `size`,
`cost_estimate_usd`, `generation_type`, `parent_generation_id`, and
`audit_event_id`.

## F. Admin UI Plan

Future admin controls should include:

- View internal drafts and compare output metadata.
- Mark `needs_revision`.
- Add an internal reviewer note.
- Write a revision instruction for the next draft.
- Mark a specific output `approved_for_customer`.
- Revoke approval if needed.
- Show status history.
- Show generation metadata: provider/model, quality, size, prompt version,
  generation type, parent generation, cost estimate, and failure state.
- Show whether a customer-visible copy or delivery asset exists.
- Show whether gallery approval is missing, requested, approved, or rejected.

Controls that must remain disabled or placeholder until persistence exists:

- Status-changing buttons.
- Internal review note save.
- Revision instruction save.
- Approval and revocation actions.
- Customer preview creation.
- Gallery approval actions.
- Any action that writes audit events, storage records, ownership records,
  credit ledger entries, package orders, or customer delivery state.

The admin UI should keep the skeleton boundary clear: this workflow does not
generate, store, persist, or deliver sketches until a future approved
implementation adds server-only persistence and tests.

## G. Customer Visibility Gate

A sketch can become customer-visible only if all of the following are true:

- It belongs to the correct Concept Brief.
- It has a successful AI sketch output record.
- Human review status is `approved_for_customer`.
- It passes privacy and reference-image checks.
- It exposes no internal notes, raw prompts with sensitive details, private
  storage paths, provider payloads, or internal failure reasons.
- It has a safe customer-facing title and copy.
- Customer permission or gallery authorization is handled separately from
  private customer delivery.

Separate delivery concepts:

- Customer preview delivery: private to the customer or Concept Brief, and
  still concept-only.
- Public gallery approval: separate public publishing authorization and admin
  approval.
- Commercial package delivery: future paid entitlement or package fulfillment,
  separate from CAD, quote, order, or production approval.

`approved_for_customer` is necessary but not sufficient for delivery. A future
route must also verify ownership/access, delivery asset readiness, and safe
customer-facing copy.

## H. Customer Preview Versus Public Gallery

`approved_for_customer` does not automatically mean `approved_for_gallery`.

Customer preview:

- May be private to one customer, one Concept Brief, or one authenticated
  account if auth exists later.
- Should use server-mediated or signed access, not public bucket exposure.
- Must keep the concept-sketch-only boundary visible.

Public gallery:

- Needs separate consent or internal sample authorization.
- Needs separate admin approval.
- Must never expose customer name, email, phone, WhatsApp, private notes,
  private prompt details, raw reference images, private storage paths, or
  protected signed URLs.
- Should use public-safe records or assets that are decoupled from private
  generation rows.
- Must be revocable.

Commercial package delivery:

- May depend on payment, points, ownership records, package status, and support
  policy in future work.
- Must not imply CAD, final quote, order creation, production readiness, or
  manufacturing approval.

## I. Audit And Accountability

Future audit event types should include:

- `status_changed`
- `revision_requested`
- `draft_approved_for_customer`
- `approval_revoked`
- `customer_preview_created`
- `gallery_approval_requested`
- `gallery_approved`
- `gallery_rejected`

Each audit event should record:

- Actor or service label.
- Timestamp.
- Previous status.
- Next status.
- Reason or note.
- Affected Concept Brief.
- Affected AI sketch job or output.
- Whether customer visibility changed.
- Whether gallery visibility changed.
- Related ownership, customer preview, package, or credit ledger record where
  relevant.

Audit notes should be concise, factual, and private by default. Customer-facing
routes must not display internal audit notes, reviewer notes, raw prompts,
provider payloads, or internal failure reasons.

## J. Test Plan

Future implementation should add or update focused tests before enabling real
persistence or customer delivery:

- Admin can see workflow status.
- Customer-facing pages cannot see internal statuses.
- Unapproved drafts are not customer-visible.
- `approved_for_customer` enables customer preview only when a delivery route
  and access rules exist.
- `needs_revision` hides or blocks customer preview.
- Internal notes never appear on customer pages.
- Gallery approval is separate from customer approval.
- AI generation success does not automatically approve output.
- A regenerated draft remains private until human review approves that specific
  output.
- Wrong brief/customer association cannot access a sketch.
- Revoked approval removes customer preview eligibility.

For this docs-only task, validation is limited to:

- `git diff --check`
- `git diff --cached --check` after path-specific staging

Build and e2e tests are skipped because this task changes documentation only
and does not change runtime behavior, UI behavior, API behavior, or asserted
test copy.

## K. Implementation Sequence And Stop Gates

Recommended future order:

1. Review this docs-only state plan.
2. Decide storage model and table/field names.
3. Update a SQL packet if needed.
4. Review Supabase schema, RLS, grants, policies, and storage design.
5. Plan admin UI persistence endpoints.
6. Implement server-only persistence route in a separate approved task.
7. Add admin tests.
8. Add customer visibility gate tests.
9. Integrate with AI sketch jobs only after API integration is separately
   approved.
10. Add private customer preview later.
11. Add public gallery approval later.

Stop before:

- SQL execution.
- Supabase schema, storage, RLS, grants, or policy changes.
- OpenAI API integration.
- Image generation.
- Image upload or storage.
- Customer-facing sketch display.
- Public gallery automation.
- Paid or points deduction integration.
- Auth/login implementation.
- Production rollout.
- Protected Production/admin access.
- Real customer-data operations.
- CAD, order, or production workflow.

## L. Risk Review

| Risk | Consequence | Affected scope | Why the risk exists | Likelihood / severity | Mitigation |
| --- | --- | --- | --- | --- | --- |
| Unreviewed AI draft shown to customer | Customer sees low-quality, unsafe, private, or misleading output. | Customer preview, trust, privacy, support. | Generation success can be confused with approval. | Medium / critical. | Gate customer visibility on human `approved_for_customer` plus delivery checks; keep drafts private by default. |
| `needs_revision` draft exposed | A known-problem draft reaches the customer. | Customer preview, brand quality, support. | Revision states may still have stored output assets. | Medium / high. | Block preview when status is `needs_revision`; revoke or hide existing preview on transition. |
| `approved_for_customer` confused with `approved_for_gallery` | Private customer work is published publicly. | Public gallery, privacy, legal risk, trust. | Both states sound like approval but have different audiences. | Medium / critical. | Separate customer approval, gallery consent, gallery approval, and public-safe records. |
| Internal admin notes leaked | Private reviewer notes appear in customer pages or public APIs. | Customer routes, public APIs, privacy. | Directly exposing review rows can include internal notes. | Medium / critical. | Use redacted customer DTOs; never return `review_note_internal` or audit notes to customer surfaces. |
| Raw prompt or reference image leaked | Customer story, private inspiration, or third-party image appears publicly. | Storage, gallery, customer preview, legal risk. | Prompt/output rows may link to reference assets or sensitive instructions. | Medium / critical. | Keep raw references private; expose only approved generated assets and safe customer copy. |
| Wrong brief/customer association | A customer sees another customer's sketch. | Customer preview, ownership, privacy. | Future auth, brief linkage, and signed delivery can be miswired. | Medium / critical. | Verify `concept_brief_id`, ownership/access record, and customer identity on every delivery request. |
| Status transition mistake | Output skips review or remains visible after revocation/revision. | Admin workflow, customer preview, gallery. | Manual state machines are easy to misclick or under-specify. | Medium / high. | Define allowed transitions, require confirmation for approval/revocation, and write audit events. |
| Missing audit trail | NOVORA cannot explain who approved, changed, or exposed an output. | Admin accountability, support, incident review. | Skeleton state has no persistence yet. | Medium / high. | Add append-only audit events before enabling status mutation. |
| Accidental admin approval | A reviewer approves the wrong output or brief. | Customer preview, gallery, brand quality. | Approval UI may be rushed or ambiguous. | Medium / high. | Show brief reference, output preview, metadata, privacy flags, and confirmation before approval. |
| AI generation success auto-approves output | Every successful provider response becomes eligible for customer display. | AI jobs, customer preview, privacy. | Job status and review status can be conflated. | Medium / critical. | Keep generation status separate from review status; default outputs to internal-only. |
| RLS or policy mistake later | Anonymous or wrong authenticated users read private outputs. | Supabase tables, storage, customer data. | RLS and storage policies depend on exact auth and ownership claims. | Medium / critical. | Deny by default, review policies separately, test anon/auth/admin/service paths. |
| Customer misunderstands sketch as CAD, quote, order, or production approval | Customer expects final manufacturable jewelry, price, or order fulfillment. | Product trust, support, legal/commercial expectations. | High-quality images can look final. | Medium / high. | Repeat concept-sketch-only copy near previews, packages, and gallery. Paid CAD happens later. |
| Future migration complexity | Early outputs lack fields needed for review, cost, ownership, or gallery safety. | Data model, analytics, support, privacy. | Shipping generation before stable metadata creates legacy rows. | Medium / medium. | Define required metadata from first real generation; allow nullable migration-safe fields only where reviewed. |
