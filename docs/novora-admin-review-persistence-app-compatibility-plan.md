# NOVORA Admin Review Persistence - App Compatibility Plan

## 1. Purpose

This packet plans the next app-code phase after the successful Agent 44
ALTER-only SQL execution for the existing `public.ai_sketch_reviews` table.

This is planning only. Agent 45B does not implement app code, API routes,
persistence reads, persistence writes, customer visibility, image handling, or
admin workflow behavior. Agent 45B does not execute SQL and does not connect to
Supabase.

## 2. Current Verified DB Baseline

The verified baseline comes from the user-manual Agent 44 SQL execution record
merged in PR #117, not from a live Supabase connection by Agent 45B.

- Existing table: `public.ai_sketch_reviews`.
- `review_status` default:
  `'internal_draft_not_generated'::text`.
- Final CHECK statuses:
  - `internal_draft_not_generated`
  - `draft_generated_internal_only`
  - `needs_revision`
  - `approved_for_customer`
- `pending` is excluded from the final CHECK constraint.
- Added workflow columns exist:
  - `revision_instruction text`
  - `approved_for_customer_at timestamptz`
  - `approved_by text`
  - `approval_revoked_at timestamptz`
  - `revoked_by text`
  - `updated_at timestamptz not null default now()`
- `updated_at` exists with default `now()`, but no trigger refresh is
  implemented.
- `public.ai_sketch_reviews` had `0` rows after execution.
- SQL execution was manually done by the user, not Codex.
- No insert test was run.
- No RLS, grants, storage, policy, customer visibility, OpenAI, image, app
  route, public gallery, payment, points, or auth changes were made by the SQL
  execution.

## 3. Current App/Admin Compatibility Questions

Based only on local repository inspection:

- `app/admin/briefs/[id]/AdminBriefDetailClient.tsx` currently displays an
  admin-only `AI Sketch Review Workflow` detail section.
- The AI sketch workflow labels are hardcoded in the detail client:
  `Internal draft not generated`, `Draft generated - internal only`,
  `Needs revision`, and `Approved for customer`.
- The current admin review controls do not edit `ai_sketch_reviews`. They edit
  the existing Concept Brief review state labels: `New`, `Reviewing`,
  `Need more info`, `Ready for CAD discussion`, and `Closed`.
- Current persisted admin status and notes use `admin_notes` through
  `lib/server/admin-review-state.ts`, with note types such as
  `review_status:new`, not `public.ai_sketch_reviews`.
- Existing save routes are
  `app/admin/briefs/review-state/route.ts` and
  `app/api/admin/brief-review-state/route.ts`. Both save only
  `conceptBriefId`, `reviewStatus`, and `internalNotes`.
- `lib/server/admin-concept-briefs.ts` loads Concept Brief rows, contacts,
  reference asset metadata, notification state, and `admin_notes` review state.
  It does not read `ai_sketch_reviews` or `ai_sketch_outputs`.
- Local app code does not appear to write `pending` to `ai_sketch_reviews`.
  Local `pending` matches are in docs, future planning, generation/payment
  examples, or unrelated concepts.
- No current UI or server path exposes forms/actions for `review_status`,
  `reviewer_note`, `customer_safe_note`, `revision_instruction`,
  `approved_for_customer_at`, `approved_by`, `approval_revoked_at`, or
  `revoked_by` on `public.ai_sketch_reviews`.
- No current app code handles the absence of an `ai_sketch_outputs` row for the
  admin AI sketch review workflow.
- The current AI sketch review workflow is best treated as skeleton/admin copy
  plus local hardcoded status guidance until a future app-code PR explicitly
  wires the new table.
- Live production behavior is not inferred here. Agent 45B did not query live
  schema, rows, IDs, notes, or customer data.

## 4. Required Compatibility Decisions Before Implementation

Before app-code work starts, the owner/implementation agent should decide:

- Should an `ai_sketch_reviews` row be created lazily when first opening a brief
  detail page, or only when an internal sketch output exists?
- The canonical initial UI status should be
  `internal_draft_not_generated`.
- Admin-facing status labels should be:
  - `Internal draft not generated`
  - `Draft generated - internal only`
  - `Needs revision`
  - `Approved for customer`
- Should `approved_for_customer_at` and `approved_by` be set automatically when
  status becomes `approved_for_customer`?
- Should `approval_revoked_at` and `revoked_by` be set automatically when status
  moves away from `approved_for_customer`?
- Should `revision_instruction` be editable only when status is
  `needs_revision`, or always editable as internal review context?
- Should `customer_safe_note` be blocked until approval, or editable before
  approval while remaining not customer-visible?
- What should the admin UI show if no `ai_sketch_outputs` row exists yet?
- Should the admin UI show a `no internal draft generated` empty state?
- Should app writes explicitly set `updated_at` because the table currently has
  no trigger that refreshes it automatically, or should a later separately
  approved SQL task add an update trigger?

## 5. Proposed Phased Implementation

Recommended future sequence:

- Agent 45C - Type/status constants and admin copy alignment
  - Add shared TypeScript constants/types for the final review statuses.
  - Align admin copy to the final status labels.
  - Remove or migrate any app reference that could write legacy `pending`.
  - Do not add DB writes.

- Agent 45D - Admin review persistence read path
  - Read existing `ai_sketch_reviews` data server-side for protected admin
    detail.
  - Display persisted status and notes if present.
  - Show a safe empty state if no review row or no internal output exists.
  - Do not add writes.

- Agent 45E - Admin review persistence write path
  - Add a protected server action or route for internal admin review updates.
  - Write only allowed fields.
  - Enforce the final status enum.
  - Preserve the admin-only boundary.
  - Do not enable customer visibility.

- Agent 45F - Approval/revocation metadata behavior
  - Decide and implement `approved_by`, `approved_for_customer_at`,
    `revoked_by`, and `approval_revoked_at` behavior.
  - Keep `approved_for_customer` separate from gallery approval.

- Agent 45G - Focused tests
  - Add unit or Playwright coverage for admin review persistence.
  - Confirm no customer-facing sketch display is enabled.

The exact Agent numbers may shift if another urgent review pass appears, but
the recommended order should stay: constants/copy first, read path second,
write path third, approval metadata fourth, tests once the behavior is concrete.

## 6. Product/Security Boundaries

Future implementation must preserve these boundaries:

- AI sketches are internal drafts only.
- Unreviewed GPT/AI drafts must never be shown directly to customers.
- `approved_for_customer` does not equal `approved_for_gallery`.
- AI generation success alone must not approve a sketch.
- Customer-facing sketch delivery remains email-only after human
  review/optimization/approval.
- No customer-facing sketch preview should be implemented in this compatibility
  phase.
- No OpenAI image API integration should be implemented in this compatibility
  phase.
- No image storage changes should be implemented in this compatibility phase.
- No public gallery automation should be implemented in this compatibility
  phase.
- No payment, points, or auth changes should be implemented in this
  compatibility phase.
- No RLS opening should be implemented in this compatibility phase.

## 7. Risk Review

- App code that writes `pending` to `ai_sketch_reviews` will fail after the
  final CHECK constraint.
- Admin UI may show stale mock or `admin_notes` status if not wired to
  `ai_sketch_reviews`.
- `approved_for_customer` may be mistaken as customer delivery or public gallery
  approval.
- `updated_at` may not refresh automatically without a trigger or explicit app
  update behavior.
- Missing review row creation strategy could create inconsistent admin empty
  states.
- A write path could accidentally expose customer-facing sketch data if review
  persistence is mixed with delivery behavior.
- Overbuilding app/API before confirming the minimal admin flow could blur the
  MVP boundary.
- Running more SQL unnecessarily could reopen schema risk after the successful
  empty-table ALTER.
- Mixing public customer visibility with internal admin review persistence could
  expose unreviewed drafts or private work.
- Confusing Concept Brief admin status with AI sketch review status could wire
  the wrong status model to `ai_sketch_reviews` or make admins think existing
  `admin_notes` persistence is the new review workflow.

## 8. Recommended Next Step

The next step should be a small app-code preparation PR, not more SQL.

Recommended next Agent: Agent 45C - Type/status constants and admin copy
alignment.

Agent 45C should not add customer visibility, OpenAI integration, image storage,
public gallery automation, payment, points, auth, or deploy.
