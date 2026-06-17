# NOVORA Agent 46A AI Sketch Review Write Path Implementation Plan

## Purpose

This is a docs-only implementation path plan for the future protected
admin-only AI sketch review write path.

This packet selects the safest future write strategy now that duplicate
protection exists on `public.ai_sketch_reviews(concept_brief_id)`. It does not
implement the write path. It adds no app code, API route, server action,
insert, update, delete, upsert behavior, SQL, Supabase live connection, live
schema inspection, customer display, email delivery, OpenAI/image generation,
image storage, public gallery behavior, payment, auth, CAD, order, environment,
RLS, storage, migration, deployment, or Production operation.

## Current Verified Prerequisite

PR #124 recorded the user-run duplicate protection execution and verification.
Codex did not execute SQL, connect to Supabase live, inspect live schema,
inspect rows, inspect customer data, inspect IDs, inspect `reviewer_note`, or
inspect `customer_safe_note`.

The user-reported verified prerequisite is:

- `public.ai_sketch_reviews(concept_brief_id)` is protected by
  `ai_sketch_reviews_concept_brief_id_key UNIQUE (concept_brief_id)`.
- The matching unique index exists and includes `concept_brief_id`.
- `duplicate_concept_brief_id_groups = 0`.
- `duplicate_extra_rows = 0`.
- `total_rows = 0`.
- `invalid_or_legacy_status_rows = 0`.
- `pending_mentioned_in_review_status_check = false`.
- `all_final_statuses_mentioned_in_check = true`.

This unblocks planning for a future insert-capable write path. It does not
approve implementation.

## Strategy Decision

Recommended future strategy: **explicit create/update split**.

Rejected alternatives:

| Strategy | Decision | Reason |
| --- | --- | --- |
| Insert-only | Reject | Repeated admin saves or already-created review rows would hit the unique constraint and produce avoidable failures. |
| Update-only | Reject for MVP write path | The verified table can have no row yet, and there is no other approved lazy row creation path. Admin saves would fail for the normal first-save case. |
| Blind upsert | Do not prefer | Approval and revocation metadata depends on the existing status. A blind upsert can blur first approval, same-status save, revocation, and reapproval behavior. |
| Explicit create/update split | Recommend | The helper can read only safe fields, derive transition metadata deliberately, update an existing row, insert when no row exists, and still rely on the unique constraint for race protection. |

The future helper should:

1. Normalize and validate the internal `conceptBriefId`.
2. Validate `reviewStatus` with the shared AI sketch review status constants.
3. Reject `pending` and every unknown status.
4. Read only the existing safe review fields needed for transition decisions.
5. If a row exists, derive approval/revocation metadata from current status plus
   requested next status, then update that row.
6. If no row exists, derive first-save metadata and insert a new row keyed by
   internal `concept_brief_id`.
7. If the unique constraint unexpectedly rejects the insert, do not create a
   duplicate row. Re-read/update the single row if the implementation can do so
   safely, or return a safe persistence error.
8. Return the same normalized protected admin read model shape used by the
   existing read path.

This is a manual create/update decision path, not a generic public upsert API.
The unique constraint is a safety backstop and race guard, not a substitute for
transition-aware server logic.

## Future Implementation Shape

A later app-code PR, only after separate user approval, should likely touch:

- `app/admin/briefs/ai-sketch-review/route.ts`
- `lib/server/admin-ai-sketch-review-write.ts`
- `app/admin/briefs/[id]/AdminBriefDetailClient.tsx`
- focused admin coverage in `tests/e2e/design-concept-validation.spec.ts` if
  the UI or route behavior is implemented in that PR

The future route should reuse the current protected admin-cookie pattern:

- read `novora_admin_access` from cookies
- validate it with `isValidAdminAccessCookie`
- keep service-role behavior server-only
- accept only `POST`
- export `dynamic = "force-dynamic"`
- use `credentials: same-origin` from the protected admin UI
- return safe JSON messages without raw Supabase errors, secrets, raw payloads,
  customer content, or note text

The future server helper should stay separate from the existing read helper:

- Do not turn `lib/server/admin-ai-sketch-review-read.ts` into a write helper.
- Keep Concept Brief admin review state in `admin_notes` separate from
  AI sketch review state in `ai_sketch_reviews`.
- Do not replace the existing Concept Brief `internalNotes` behavior.
- Preserve the read path fallback behavior for missing client, no row, read
  error, invalid legacy status, or unexpected exception.

## Allowed Future Write Fields

Future app write behavior, if separately approved, must be limited to:

- `review_status`
- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at` if app-managed

The future write path must not read, write, select, inspect, display, or return:

- `reviewer_note`
- `customer_safe_note`

It must also not read, write, display, or return customer delivery fields,
gallery approval fields, email delivery fields, payment fields, auth fields,
CAD fields, order fields, production fields, OpenAI fields, or image generation
fields.

`revision_instruction` remains internal admin workflow text. It must not be
treated as customer-facing copy and must not be emailed or delivered to
customers by this write path.

## Required Review Statuses

The only legal future statuses are:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` is illegal, excluded, and must be rejected. Invalid input must return
a safe validation failure; it must not be normalized into the initial status on
write. Invalid persisted values must never be treated as approval.

Recommended metadata behavior:

- First save as `approved_for_customer`: set approval metadata server-side.
- Transition into `approved_for_customer`: set approval metadata server-side.
- Same-status save while already approved: preserve existing approval metadata.
- Transition away from `approved_for_customer`: set revocation metadata
  server-side and preserve latest approval metadata as history for the row.
- Reapproval after revocation: set approval metadata for the new approval and
  clear current revocation metadata.
- Any non-approved same-status save: update normal save fields without creating
  false approval or revocation events.

For the MVP shared-key admin gate, `admin-mvp` remains the likely fallback
identity unless a future approved task introduces real admin identity. A future
implementation must stop if the owner does not accept that fallback.

## Customer And Product Boundaries

The future write path is protected admin-only.

It must preserve these boundaries:

- Customer submits a Concept Brief.
- GPT or an image model can only generate internal drafts.
- Human review is required.
- GPT may assist revision prompts or redraw work only inside an internal
  workflow.
- Human final approval is required before customer-facing delivery.
- Customer only sees the human-reviewed version.
- Unreviewed AI/GPT drafts must never be shown or delivered to customers.
- AI sketch is a concept sketch, not CAD, quote, order, or production approval.
- `approved_for_customer` is not equal to `approved_for_gallery`.
- AI generation success alone must not approve a sketch.
- Customer-facing sketch delivery remains email-only after human review,
  optimization, and approval in a separately approved future workflow.
- Customer pages must not display unreviewed AI sketches.
- The write path must not trigger email, customer delivery, gallery publishing,
  OpenAI calls, image generation, image upload/storage, payment, auth, CAD,
  order, or production behavior.

Approval in `ai_sketch_reviews` is internal review state. It does not publish,
deliver, charge, quote, create CAD, or create an order.

## Error Handling And Race Behavior

Future implementation should use safe, bounded errors:

- `401` for missing or invalid admin access.
- `400` for malformed JSON, missing `conceptBriefId`, invalid status, or
  unsupported writable fields.
- `503` for unavailable persistence or backend write failure.

The write helper should treat duplicate or constraint failures conservatively:

- Never attempt to create a second review row for the same Concept Brief.
- On insert conflict, prefer a safe re-read/update of the single protected row
  only if the logic can preserve approval/revocation metadata correctly.
- If the conflict state is unclear, return a safe persistence error and leave
  the admin UI in a non-customer-visible failed-save state.
- Do not fall back to local browser storage for AI sketch approval state.
- Do not show customer-facing success or delivery messaging after a failed
  admin write.

## Future PR Sequence

Recommended small PR sequence:

1. Agent 46A docs-only implementation path plan.
2. Future app-code PR: add the protected route/helper and explicit create/update
   write behavior after separate user approval.
3. Future test/review PR if needed: focused admin write-path tests and
   no-customer-display regression coverage.
4. Future delivery PR only if separately approved: human-reviewed email-only
   customer delivery. This must remain separate from write-path persistence.

No further SQL is expected for the basic duplicate-protected write path unless
the implementation discovers a schema mismatch later. Any SQL would require a
separate docs/approval/manual-execution flow and must not be silently included
in an app-code PR.

Implementation still requires separate user approval. This Agent 46A docs PR
does not authorize Agent 46B app-code work by itself.

## Future Test Plan

Future implementation should include focused coverage for:

- admin access required before save
- valid status save for each legal status
- `pending` rejection
- unknown status rejection
- malformed JSON rejection
- missing `conceptBriefId` rejection
- first-save insert when no row exists
- update when a row already exists
- insert-race or unique-constraint behavior
- approval metadata on newly granted approval
- same-status approved save preserving approval metadata
- revocation metadata when moving away from `approved_for_customer`
- reapproval after revocation
- no `reviewer_note` read/write/display/return
- no `customer_safe_note` read/write/display/return
- no customer-facing AI sketch visibility regression
- no email, delivery, gallery, payment, auth, CAD, order, production, OpenAI, or
  image-generation side effect

Suggested validation for a future app-code implementation:

- focused route/helper tests where available
- focused Playwright coverage around `/admin/briefs/[publicReference]`
- `npm run build`
- `git diff --check`

## Agent 46A Validation

Expected validation for this docs-only PR:

- `git status --short --branch`
- `git diff --stat`
- `git diff`
- `git diff --check`

Build, Playwright, npm tests, Supabase checks, SQL, live schema inspection,
customer data inspection, email, OpenAI/image generation, and deployment are
not required and should be skipped because this PR is documentation-only.

## Stop Conditions

Stop before implementation if any future task requires:

- app code without separate approval
- API route or server action without separate approval
- SQL execution
- Supabase live connection or live schema inspection
- customer rows, customer data, IDs, notes, `reviewer_note`, or
  `customer_safe_note` inspection
- Supabase schema, RLS, grant, policy, storage, migration, or bucket changes
- Vercel environment changes
- Resend, Cloudflare, retry/resend, or email behavior changes
- OpenAI call, image generation, image upload, or image storage behavior
- customer-facing AI sketch display
- customer delivery or gallery publishing
- payment, auth, CAD, quote, order, or production behavior
- deployment or Production operation
