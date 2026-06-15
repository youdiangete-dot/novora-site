# NOVORA Agent 45E Admin AI Sketch Review Write Path Plan

## Purpose

This is a planning-only packet for a future admin-only AI sketch review write
path. It documents the local app patterns that should be reused later and the
boundaries a future implementation must preserve.

This document does not implement a write path. No route, server action, helper,
SQL, Supabase connection, live schema inspection, row inspection, customer
display, email delivery, OpenAI/image/storage behavior, payment, points, auth,
or deployment work is included.

## Existing Admin Write And Access Patterns

Current protected Concept Brief admin review writes use:

- `POST /admin/briefs/review-state`
- legacy duplicate route `POST /api/admin/brief-review-state`
- server helper `saveAdminReviewState` in `lib/server/admin-review-state.ts`

The route pattern is:

- read `novora_admin_access` from cookies
- validate it with `isValidAdminAccessCookie`
- parse JSON request body
- validate `conceptBriefId`
- validate `reviewStatus` with `isAdminReviewStatusSlug`
- default non-string `internalNotes` to an empty string
- call the server-only persistence helper
- return `{ ok: true, state }` on success
- return safe `{ ok: false, message }` errors for unauthorized, invalid, or
  unavailable persistence cases

The current Concept Brief admin review state is saved to `admin_notes` as
append-only notes:

- `concept_brief_id`
- `note_type = review_status:<status>`
- `note = internalNotes`
- `created_by = admin-mvp`
- `created_at = now`

The admin access pattern is a temporary MVP shared-key gate:

- server-only `NOVORA_ADMIN_ACCESS_KEY`
- HMAC-derived cookie value
- cookie name `novora_admin_access`
- HTTP-only cookie
- `sameSite: strict`
- path `/`
- 8-hour max age
- `secure` in production

Future Agent 45E implementation should reuse the same admin-cookie protection
pattern for a narrowly scoped AI sketch review write route. It should not write
AI sketch review state into `admin_notes`, and it should not replace the
existing Concept Brief admin review state or internal notes behavior.

The current same-origin posture is:

- admin mutation calls use `credentials: same-origin`
- admin access cookie uses `sameSite: strict`
- the protected route validates the server-only admin cookie before mutation

Before a future implementation ships, CSRF/same-origin expectations should be
reviewed against this existing pattern. If the write route remains under the
protected admin path and uses the strict admin cookie, it can follow the current
MVP pattern. If the route moves outside the admin path, accepts broader clients,
or adds higher-risk side effects, stop and add an explicit CSRF/admin-token
decision before implementation.

## Proposed Future Write Path Shape

Recommended future route:

- `app/admin/briefs/ai-sketch-review/route.ts`

Recommended future server-only helper:

- `lib/server/admin-ai-sketch-review-write.ts`

The route should:

- export `dynamic = "force-dynamic"`
- accept only `POST`
- validate the `novora_admin_access` cookie before reading or writing
- parse JSON safely
- validate `conceptBriefId` as a non-empty internal Concept Brief UUID/string
- validate `reviewStatus` with `isAiSketchReviewStatus`
- reject `pending` and every unknown status
- accept optional `revisionInstruction` as a bounded string or `null`
- derive all approval and revocation metadata server-side
- call a separate server-only write helper
- return a read-model-shaped response suitable for the protected admin detail UI

Expected request payload:

```json
{
  "conceptBriefId": "internal-concept-brief-id",
  "reviewStatus": "draft_generated_internal_only",
  "revisionInstruction": "Optional admin revision instruction"
}
```

The client must not send:

- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at`
- `reviewer_note`
- `customer_safe_note`
- delivery, gallery, email, payment, points, auth, CAD, order, or production
  fields

Expected success response:

```json
{
  "ok": true,
  "review": {
    "reviewStatus": "draft_generated_internal_only",
    "revisionInstruction": "Optional admin revision instruction",
    "approvedForCustomerAt": null,
    "approvedBy": null,
    "approvalRevokedAt": null,
    "revokedBy": null,
    "updatedAt": "server-generated-iso-time",
    "hasPersistedReview": true
  }
}
```

Expected failure response:

```json
{
  "ok": false,
  "message": "AI sketch review state could not be saved."
}
```

HTTP status guidance:

- `401` when admin access is missing or invalid
- `400` when JSON, `conceptBriefId`, `reviewStatus`, or writable field input is
  invalid
- `503` when persistence is unavailable or the backend write fails safely

The route should not expose raw Supabase errors, raw payloads, secrets, customer
content, or note text in logs or responses.

## Writable Fields

Allowed future write fields are limited to:

- `review_status`
- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at` if app-managed

Do not write or plan writes for:

- `reviewer_note`
- `customer_safe_note`
- customer-visible delivery fields
- gallery/publication fields
- email/send fields
- payment, points, auth, CAD, order, or production fields

`revision_instruction` is internal admin workflow text. It must not be treated
as customer-facing copy, and it must not be sent to customers by this write
path.

## Status Transition Rules

Final allowed statuses:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

Rules:

- `pending` is invalid and excluded.
- Invalid input must be rejected with `400`; it must not be normalized to the
  initial status.
- AI generation success alone must not set `approved_for_customer`.
- `approved_for_customer` can only be set by explicit admin human approval.
- `approved_for_customer` does not mean `approved_for_gallery`.
- Approval revocation must be explicit and admin-only.
- Moving away from `approved_for_customer` is a revocation event if the existing
  row was previously approved.
- Customer-facing pages must not display unreviewed AI sketches in any status.

Recommended transition handling:

- `internal_draft_not_generated` to `draft_generated_internal_only`: allowed for
  internal draft availability only.
- `draft_generated_internal_only` to `needs_revision`: allowed after human
  review finds issues.
- `draft_generated_internal_only` or `needs_revision` to
  `approved_for_customer`: allowed only through explicit admin approval.
- `approved_for_customer` to any non-approved status: allowed only as explicit
  admin revocation.
- Any status to the same status: idempotent save; update normal save fields
  without creating false approval or revocation events.

## Approval And Revocation Metadata

When status becomes `approved_for_customer`:

- set `approved_for_customer_at` to the server time if approval is newly granted
  or re-granted after revocation
- set `approved_by` from future authenticated admin identity if available
- otherwise use the current safe MVP identifier pattern, `admin-mvp`
- clear `approval_revoked_at` and `revoked_by` on reapproval because the row
  represents current lifecycle state, not a full audit log

When the row is already `approved_for_customer` and the admin re-saves the same
status:

- preserve existing `approved_for_customer_at`
- preserve existing `approved_by`
- do not create a revocation event
- update `revision_instruction` and `updated_at` if those values changed

When approval is revoked or status moves away from `approved_for_customer`:

- set `approval_revoked_at` to server time
- set `revoked_by` from future authenticated admin identity if available
- otherwise use `admin-mvp`
- preserve `approved_for_customer_at` and `approved_by` as latest approval
  history for the current row
- do not send email
- do not expose the sketch to customers
- do not publish to any gallery

This policy is intentionally conservative: it keeps the current row readable for
admin review while avoiding a false claim of full audit-history coverage. If a
future workflow needs full approval history, add a separate audit-event design
instead of overloading this row.

## No-Record Behavior And Upsert Policy

If an admin saves AI sketch review state and no `ai_sketch_reviews` row exists,
the future implementation should insert or upsert a row keyed by internal
`concept_brief_id`, but only after confirming local schema expectations and
duplicate-row protection.

Required policy:

- `conceptBriefId` must be the internal Concept Brief id, not the public
  `NOVORA-CB-...` reference.
- Missing or empty `conceptBriefId` returns `400`.
- The write helper must avoid duplicate rows for the same Concept Brief.
- A unique constraint or equivalent safe conflict target on `concept_brief_id`
  must be confirmed before using upsert.
- If the schema requires an unavailable `ai_sketch_output_id` or other required
  key, stop and revise the implementation plan before writing.
- If duplicate-row risk cannot be ruled out, stop before implementation.

Recommended future behavior:

- read the existing AI sketch review row for the Concept Brief inside the write
  helper
- calculate metadata transitions from existing status plus requested next status
- upsert/update the single row for the Concept Brief
- return the same normalized admin read model shape as Agent 45D

Admin UI failure behavior:

- show a safe message that AI sketch review persistence is unavailable or could
  not be saved
- do not fall through to customer-visible success
- do not write local fallback AI sketch approval state that could later be
  mistaken for persisted approval

## Read/Write Separation

Agent 45D read helper remains read-only:

- `lib/server/admin-ai-sketch-review-read.ts` must not be changed into a write
  helper.
- The read fallback must continue returning
  `internal_draft_not_generated`, `hasPersistedReview: false`, and nullable
  metadata fields as `null` for missing client, no row, read error, invalid
  legacy status, or unexpected exception.
- Invalid or legacy status, including `pending`, must never be treated as
  approved.

Future write behavior must be separate:

- add a dedicated write helper only when implementation is approved
- keep Concept Brief admin review state in `admin_notes` separate from AI sketch
  review state in `ai_sketch_reviews`
- do not replace existing `internalNotes` behavior
- do not select, inspect, write, or expose `reviewer_note` or
  `customer_safe_note`

## Customer Visibility And Delivery Boundary

The future write path is admin-only.

Customer-facing rules:

- customer pages must not read or display unreviewed AI sketches
- `approved_for_customer` still does not mean `approved_for_gallery`
- writing `approved_for_customer` must not automatically send email
- email delivery remains a separate future human-reviewed delivery workflow
- no public gallery automation is allowed
- no customer-facing sketch delivery is implemented by Agent 45E
- no payment, points, auth, CAD, order, or production workflow is added

Customer delivery remains email-only after human review, optimization, and
approval in a separately approved future workflow.

## Future Testing Plan

Future implementation should include focused tests for:

- valid status save after admin access
- invalid status rejection, including `pending`
- malformed JSON rejection
- missing `conceptBriefId` rejection
- no-record insert/upsert behavior when duplicate protection is confirmed
- read after write in the protected admin detail page
- approval metadata on newly granted approval
- idempotent same-status approved save preserving approval metadata
- revocation metadata when moving away from `approved_for_customer`
- reapproval after revocation clearing current revocation metadata
- no customer-facing visibility regression
- no `reviewer_note` or `customer_safe_note` read/write
- no email, delivery, gallery, payment, points, auth, CAD, order, or production
  side effect

Suggested baseline checks for a future code implementation:

- focused Playwright coverage around `/admin/briefs/[publicReference]`
- route-level tests where available
- `npm run build`
- `git diff --check`

## Risk Checklist And Stop Conditions

Stop before implementation if any of these are needed or discovered:

- SQL execution
- Supabase schema, RLS, grant, policy, or storage change
- live schema inspection not explicitly approved for that task
- schema mismatch between local expectations and implementation needs
- missing unique constraint or duplicate-row risk
- missing required identifying key
- `concept_brief_id` unavailable
- required `ai_sketch_output_id` or output row unavailable
- admin auth protection unclear
- admin identity unavailable and `admin-mvp` is not accepted for the task
- any need to read, write, select, inspect, expose, or plan mutation for
  `reviewer_note` or `customer_safe_note`
- any need to expose AI sketches to customers
- any need to trigger email delivery
- any need for public gallery automation
- any need for payment, points, auth, CAD, order, or production behavior
- any need to touch env vars, secrets, Production/admin pages, provider
  settings, or deployment

## Agent 45E Planning-Only Boundary

This Agent 45E planning PR should remain docs-only. After review and merge, the
next step is an implementation decision for the future write path, not SQL.

No future implementation should begin from this document alone if it requires a
must-stop action. SQL, live Supabase access, schema changes, customer data
inspection, sensitive-note access, email delivery, environment changes, and
deployment all require separate explicit approval.
