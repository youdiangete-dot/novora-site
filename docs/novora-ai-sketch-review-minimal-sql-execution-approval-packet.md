# NOVORA AI Sketch Review Minimal SQL Execution Approval Packet

## A. Purpose And Approval Boundary

This is an approval packet only. It prepares a future explicit user approval
decision for the smallest reasonable SQL step toward admin AI Sketch Review
Workflow persistence.

No SQL was executed for this packet. No Supabase schema, RLS, grants, policies,
storage, app code, API route, OpenAI API integration, image generation, image
upload/storage, customer-facing sketch display, public gallery automation,
auth, payment, points, environment variable, secret, Production/admin page,
submission, email, deploy, CAD, order, production, or customer-data operation
was performed.

Merging this document does not approve SQL execution. SQL execution requires a
separate explicit user message that approves a concrete SQL execution step
after final SQL text, target project, RLS, grants, verification, and rollback
details have been reviewed.

This packet is not a migration file. It does not contain SQL that should be
copied into Supabase. No SQL should be copied, adapted, or executed from this
document without separate approval.

## B. Current Implemented Baseline

Current foundation:

- PR #106 added a protected admin-only AI Sketch Review Workflow skeleton on the
  admin brief detail page.
- PR #107 added the docs-only state and persistence plan for the admin AI
  Sketch Review Workflow.
- PR #108 added SQL packet planning for future AI sketch review workflow
  persistence.
- PR #110 added the implementation readiness review for future admin AI Sketch
  Review Workflow persistence.

Current limitations:

- No dedicated database persistence exists yet for AI Sketch Review Workflow
  state.
- No OpenAI image API integration exists yet.
- No real AI sketch generation exists yet.
- No generated AI sketch storage exists yet.
- No customer-facing real sketch preview exists yet.
- No public gallery automation exists yet.
- Existing general `admin_notes` persistence is not the same as persisted AI
  sketch output review state.

The product boundary remains unchanged. NOVORA AI sketches are concept sketches
only. They are not CAD, not quotes, not orders, not final pricing, not sourcing
confirmation, and not production approval. AI sketches are internal drafts until
reviewed and approved by the NOVORA design team. Unreviewed GPT/AI drafts must
never be shown directly to customers.

## C. Proposed Minimum SQL Scope

The smallest future SQL scope should support internal admin review persistence
only.

The first SQL scope should include:

- Internal admin review state for a Concept Brief and, when available, a
  specific AI sketch output.
- Internal review notes and revision instructions that never appear in
  customer-facing responses.
- Human/admin approval and revocation timestamps.
- An audit trail, either through a new `ai_sketch_review_events` table or by
  extending/using `admin_operation_audit_events` if that record is approved.

Potential first-scope records:

| Record | Purpose | First-scope posture |
| --- | --- | --- |
| `ai_sketch_reviews` | Stores current internal review status for a Concept Brief and optional AI sketch output. | Likely needed for the first persistence slice. |
| `ai_sketch_review_events` | Stores append-style status history and audit context if a dedicated event table is chosen. | Optional if `admin_operation_audit_events` is approved for this purpose. |
| `admin_operation_audit_events` | Shared admin audit record for sensitive admin operations. | Use or extend only if final review confirms fit and scope. |

Out of scope for the first SQL execution:

- Customer-facing delivery.
- OpenAI job execution.
- Generated-image storage.
- Public gallery records.
- Gallery automation.
- Auth/login.
- Payment, credits, points, packages, or point deduction.
- Any route or UI implementation.

Optional customer visibility fields should be added only if they are disabled
by default, gated by internal review status, and reviewed line by line. SQL
alone must not make any sketch customer-visible.

Exact final table names, field names, constraints, RLS, grants, and policy names
are still subject to final review. This packet is not a migration file.

## D. Proposed First-Scope Fields

Likely minimal fields for `ai_sketch_reviews`:

| Field | Why it is needed | Timing |
| --- | --- | --- |
| `id` | Stable internal review row identifier. | Required now. |
| `concept_brief_id` | Links review state to the persisted Concept Brief. | Required now. |
| `ai_sketch_output_id` | Links approval to a specific generated output when output records exist. Nullable because no output table exists yet. | Nullable now, required later for output approval. |
| `review_status` | Stores the current workflow state. | Required now. |
| `reviewer_label` | Human-readable reviewer/admin label when no formal admin user id exists. | Useful now. |
| `reviewer_admin_id` | Future durable admin actor id when an admin auth model exists. | Optional later. |
| `review_note_internal` | Private admin review note. Must never be shown to customers. | Optional now. |
| `revision_instruction` | Internal instruction for the next draft or manual correction. | Optional now. |
| `approved_for_customer_at` | Timestamp showing when a human/admin approved customer eligibility. | Optional now. |
| `approved_by` | Reviewer label or future admin id that approved customer eligibility. | Optional now. |
| `approval_revoked_at` | Timestamp showing customer eligibility was revoked. | Optional now. |
| `revoked_by` | Reviewer label or future admin id that revoked approval. | Optional now. |
| `created_at` | Creation timestamp for audit and debugging. | Required now. |
| `updated_at` | Last update timestamp for admin display and support review. | Required now. |

Likely minimal fields for `ai_sketch_review_events` or shared admin audit:

| Field | Why it is needed | Timing |
| --- | --- | --- |
| `id` | Stable event row identifier. | Required if event table is created. |
| `ai_sketch_review_id` | Links event to the current review row. | Required if event table is created. |
| `concept_brief_id` | Allows audit lookup by Concept Brief. | Required if event table is created. |
| `ai_sketch_output_id` | Records which output was affected when available. | Nullable now. |
| `previous_status` | Shows the state before a transition. | Required for transition events. |
| `next_status` | Shows the state after a transition. | Required for transition events. |
| `actor_label` | Records who or what performed the event. | Required until admin auth exists. |
| `reason_internal` | Private rationale, revision note, or support context. | Optional, internal only. |
| `created_at` | Event timestamp. | Required if event table is created. |

Internal notes, revision instructions, raw prompts, provider payloads, private
storage paths, internal failure reasons, and reviewer/audit notes must not be
returned to customer-facing routes.

## E. Status Values And Constraints

Only these first-scope status values should be used:

| Status | Label | Meaning | Customer-visible | Allowed next statuses | Disallowed transitions |
| --- | --- | --- | --- | --- | --- |
| `internal_draft_not_generated` | Internal draft not generated | No internal AI sketch draft exists for this Concept Brief. | No. | `draft_generated_internal_only` | Directly to `needs_revision` or `approved_for_customer` without an output/review basis. |
| `draft_generated_internal_only` | Draft generated - internal only | An internal AI sketch draft exists for admin/design-team review only. | No. | `needs_revision`, `approved_for_customer` | Direct customer delivery, public gallery approval, or automatic approval after generation. |
| `needs_revision` | Needs revision | Human review found structure, style, privacy, or brief-alignment issues. | No. | `draft_generated_internal_only`, `approved_for_customer` after human/admin review | Customer visibility, public gallery approval, or automatic approval after regeneration. |
| `approved_for_customer` | Approved for customer | Human/admin reviewer approved a specific output as eligible for later private customer presentation. | Not by SQL alone. Later customer visibility still requires separate delivery gates. | `needs_revision` or approval revocation handling | Public gallery approval, CAD approval, quote/order/production approval, or approval without human/admin action. |

Required constraints and rules:

- Successful generation must not automatically approve a sketch.
- `needs_revision` blocks customer visibility.
- `approved_for_customer` requires human/admin action.
- `approved_for_customer` does not equal `approved_for_gallery`.
- A new generated output must start as internal-only, even if an older output
  was approved.
- Approval should eventually apply to a specific `ai_sketch_output_id`, not
  vaguely to a Concept Brief.

## F. RLS / Grants / Access Boundary

Intended future security posture:

- `anon`: no access to internal review records, review events, internal notes,
  revision instructions, or private generated-output metadata.
- Customers: no direct access to internal review records.
- `service_role`: server-only controlled access.
- Protected admin route: only approved server-side admin paths may read or
  write internal review state.
- Browser/client code: no direct table access to internal review data.

Important boundary notes:

- The current admin access-key model is not a database admin role.
- A future database admin role or admin claim model must be reviewed separately.
- RLS, grants, and policies must be reviewed before execution.
- This approval packet does not activate any RLS policy.
- This packet does not approve direct browser access to review records.

## G. Customer Visibility Gate

The first SQL execution must not make anything customer-visible by itself.

A sketch can become customer-visible only in a later separately approved stage
if all of the following are true:

- Correct Concept Brief association.
- Successful AI sketch output exists.
- Human/admin status is `approved_for_customer`.
- Privacy and reference-image checks pass.
- Internal notes are excluded.
- Raw prompts, provider payloads, private storage paths, and internal failure
  reasons are excluded.
- Safe customer-facing title and copy exists.
- Delivery route is separately approved and access-controlled.

`approved_for_customer` does not approve public gallery use. Public gallery
publication requires separate consent or sample authorization, separate admin
approval, public-safe asset handling, and separate implementation approval.

## H. Execution Pre-Checklist

Before any future SQL execution, confirm:

- Target Supabase project.
- Backup/export or rollback posture.
- Exact SQL text reviewed.
- Table and field names frozen.
- Check constraints reviewed.
- RLS, grants, and policies reviewed.
- Service-role-only server path confirmed.
- Current admin access-key model is not treated as a database admin role.
- No customer route will read this data yet.
- No OpenAI or image generation is included.
- No generated image storage is included.
- No public gallery record or automation is included.
- Tests and verification steps to run after execution.
- Explicit user approval received for the concrete SQL execution step.

## I. Execution Plan Outline

Planning-only outline for a future approved SQL task:

1. Confirm backup/export or rollback posture for the target Supabase project.
2. Execute only the approved minimal internal review schema after explicit user
   approval.
3. Verify tables, columns, indexes, and check constraints.
4. Verify RLS is enabled and policies match the reviewed posture.
5. Verify `anon` and customer roles cannot access internal review records.
6. Verify future `service_role` access remains server-only and is not exposed to
   browser/client code.
7. Record execution and verification results in the project ledger.

This document intentionally includes no command that executes SQL. Do not create
a migration file from this packet unless a later task explicitly asks for that
implementation step.

## J. Rollback Plan

Future rollback planning should cover:

| Failure case | Rollback posture |
| --- | --- |
| Table creation fails | Stop immediately, do not continue partial SQL, inspect the failed statement, and record the partial state before retrying or reversing. |
| RLS policy is wrong | Disable dependent app integration, correct or remove the faulty policy, verify `anon` and customer denial before any app read/write path is added. |
| Wrong status values are used | Stop before app integration, add a reviewed correction migration or recreate the table only if no real review data exists. |
| Review data is accidentally inserted | Treat it as internal operational data, identify source, remove or correct only after owner approval, and record an audit/ledger note. |
| Customer visibility is accidentally enabled | Immediately disable customer route/display path, revoke visibility, verify no customer/public route exposes data, and review incident scope. |
| Later app route integration fails | Keep SQL records private, disable the route, and leave review state unavailable rather than implying approval or delivery. |

After real review data exists, do not casually drop or rewrite tables. Prefer
audited correction/revocation records over silent history edits.

## K. Verification After Future SQL

Post-execution verification should confirm:

- Table exists.
- Required columns exist.
- Check constraints exist.
- RLS is enabled.
- Policies match expected posture.
- `anon` is blocked.
- Customers are blocked.
- `service_role` path remains server-only.
- Protected admin route remains the only intended future read/write path.
- No customer-facing route changed.
- No public gallery route changed.
- No OpenAI/image generation path exists.
- No existing Concept Brief submission flow is broken.
- Internal notes are not returned by any customer route.
- `approved_for_customer` still does not imply `approved_for_gallery`.

## L. User Approval Required Before SQL Execution

The user would be approving only:

- Minimal internal admin AI sketch review persistence schema.
- No customer visibility.
- No image generation.
- No image storage.
- No OpenAI API.
- No public gallery.
- No payment/points.
- No app route implementation unless separately approved.

The user would not be approving:

- Production execution without a named target project.
- Customer-facing sketch display.
- Public gallery publication.
- AI job execution.
- Generated-image storage.
- Auth, payment, credits, points, CAD, order, or production workflows.

## M. Risk Review

| Risk | Consequence | Affected scope | Why risk exists | Likelihood / severity | Mitigation | Approval implication |
| --- | --- | --- | --- | --- | --- | --- |
| Executing SQL in the wrong Supabase project | Internal review schema appears in the wrong environment or affects unintended data posture. | Supabase operations, project ledger, future app wiring. | Multiple environments and manual execution steps can be confused. | Medium / critical. | Confirm target project before execution and record target in the approval message and ledger. | Approval must name or confirm the target project. |
| RLS incorrectly exposing internal review records | Anonymous users or customers can read private statuses, notes, or review events. | Supabase tables, privacy, customer trust. | Schema and RLS/grants are separate details and can drift. | Medium / critical. | Deny by default; review policies line by line; verify anon/customer denial. | Approval must include reviewed RLS/grant posture. |
| Customers accessing internal notes | Private reviewer notes or revision instructions appear outside admin. | Customer routes, privacy, support. | Internal notes may be stored near review status. | Medium / critical. | Never return internal notes to customer routes; use redacted customer DTOs later. | Approval does not include customer routes or direct customer access. |
| Unreviewed AI draft becoming customer-visible | Customer sees low-quality, unsafe, private, or misleading output. | Customer preview, trust, privacy. | Generation success can be confused with approval. | Medium / critical. | SQL defaults internal-only; require human/admin `approved_for_customer` plus later delivery gates. | Approval must not enable customer display. |
| Successful generation treated as approval | Provider output bypasses human review. | AI jobs, admin workflow, customer visibility. | Job status and review status can be conflated. | Medium / critical. | Keep generation status separate from review status; never auto-set `approved_for_customer`. | Approval is only for review persistence, not generation logic. |
| `approved_for_customer` confused with `approved_for_gallery` | Private customer work is published publicly. | Gallery, privacy, legal/support risk. | Both are approval concepts with different audiences. | Medium / critical. | Keep gallery consent, gallery approval, and public-safe records separate. | Approval must explicitly exclude gallery publication. |
| Wrong Concept Brief association | A review or approval links to the wrong customer brief. | Admin review, customer privacy, future delivery. | Future output rows can be mislinked across briefs or jobs. | Medium / critical. | Enforce `concept_brief_id` linkage and verify association on every future write/read. | Approval should freeze association fields before SQL. |
| Rollback incomplete | Bad schema, policy, or review data remains active. | Supabase operations, future app routes. | Durable schema changes can outlive the task that created them. | Medium / high. | Prepare rollback before execution and stop before app routes depend on new tables. | Approval must include rollback posture. |
| Later app route bypassing RLS assumptions | Browser or route code exposes private review records even if SQL looked safe. | App routes, customer privacy, admin workflow. | Service-role code can bypass RLS if misused. | Medium / critical. | Keep service-role server-only and require separate route review and tests. | Approval does not include app route implementation. |
| Future migration complexity | Early minimal fields are insufficient for output-aware approval, audit, or gallery separation. | Data model, support, future implementation. | Minimal schemas can create legacy rows with missing context. | Medium / medium. | Keep first scope narrow, document nullable fields, and avoid customer delivery until output model is stable. | Approval should accept minimal persistence only, not full future product readiness. |
| User misunderstanding that this packet itself executes SQL | Reviewer assumes a merge changes Supabase. | Project operations, approval process. | The packet discusses SQL readiness and execution planning. | Low / high. | Repeat that no SQL was executed and separate explicit approval is required. | Merging this packet must not be treated as SQL approval. |

## N. Go / No-Go Recommendation

Conservative recommendation: NOVORA may be close to minimal SQL readiness for
internal admin AI Sketch Review Workflow persistence, but SQL execution should
not happen from this packet alone.

Go only after:

- This approval packet is reviewed.
- Final table and field names are frozen.
- RLS, grants, and policies are reviewed.
- Target Supabase project is confirmed.
- Rollback posture is accepted.
- Verification steps are ready.
- The user explicitly approves a concrete SQL execution step.

No-go if any prerequisite is missing, if customer visibility is included in the
same step, if OpenAI/image generation/storage is included, or if
`approved_for_customer` is treated as public gallery approval.
