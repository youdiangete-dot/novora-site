# NOVORA AI Sketch Review Revised ALTER-Only SQL Package

## A. Purpose And Boundary

This is a revised ALTER-only SQL package document for future internal admin AI
Sketch Review Workflow persistence.

No SQL was executed for this document. Codex did not connect to Supabase. Codex
did not inspect live schema. Codex did not inspect customer rows, row counts,
storage objects, private content, protected admin pages, or customer data. No
Supabase schema, RLS, storage, grants, or policies were changed.

This document does not implement status persistence, app routes, API routes,
OpenAI API calls, image generation, image upload/storage, customer-facing sketch
display, public gallery automation, auth, payment, points, environment
variables, secrets, Production/admin behavior, submissions, email, deploy, CAD,
order, production, or customer-data operations.

This package is based on user-provided manual Supabase SQL Editor metadata
results from PR #113 for target project `novora-production`. The manual metadata
changes the safe SQL direction from a possible create/verify path to an
ALTER-existing-table-only path for `public.ai_sketch_reviews`.

Merging this document does not approve SQL execution. SQL execution still
requires a separate explicit user message after the final exact SQL,
`review_status` compatibility, target project, RLS/policy posture, verification,
and rollback plan are reviewed.

The NOVORA product boundary remains unchanged. AI sketches are concept sketches
only. They are not CAD, not quotes, not orders, and not production approval. AI
sketches are internal drafts until reviewed and approved by the NOVORA design
team. Customers must only see sketches approved by the NOVORA design team.
Unreviewed GPT/AI drafts must never be shown directly to customers.
`approved_for_customer` does not equal `approved_for_gallery`, and AI generation
success alone must not approve a sketch.

## B. Live Schema Basis

The user-provided manual Supabase SQL Editor metadata from PR #113 confirmed:

- Target project shown in Supabase UI: `novora-production`.
- `public.ai_sketch_jobs` exists.
- `public.ai_sketch_outputs` exists.
- `public.ai_sketch_reviews` exists and must not be recreated.
- RLS is enabled for `public.ai_sketch_jobs`, `public.ai_sketch_outputs`, and
  `public.ai_sketch_reviews`; forced RLS is `false` for all three tables.
- `pg_policies` returned no rows for `ai_sketch_jobs`, `ai_sketch_outputs`, and
  `ai_sketch_reviews`.
- Visible grant metadata did not show `anon` or `authenticated` `SELECT`,
  `INSERT`, `UPDATE`, or `DELETE` grants for the three AI sketch tables.
- This grant/policy statement is based on visible metadata only; it is not a
  full independent security audit.

Visible `public.ai_sketch_reviews` columns:

| Column | Type | Nullability | Visible default |
| --- | --- | --- | --- |
| `id` | `uuid` | not null | `gen_random_uuid()` |
| `ai_sketch_output_id` | `uuid` | not null | none reported |
| `concept_brief_id` | `uuid` | not null | none reported |
| `review_status` | `text` | not null | `'pending'::text` |
| `reviewer_note` | `text` | nullable | none reported |
| `customer_safe_note` | `text` | nullable | none reported |
| `reviewed_at` | `timestamp with time zone` | nullable | none reported |
| `created_at` | `timestamp with time zone` | not null | `now()` |

Visible `public.ai_sketch_reviews` constraints:

- Primary key on `id`.
- Foreign key `ai_sketch_output_id` references `public.ai_sketch_outputs(id)`.
- Foreign key `concept_brief_id` references `public.concept_briefs(id)`.
- No visible `review_status` CHECK constraint was found in the supplied
  metadata.

Visible trigger posture:

- `public.ai_sketch_jobs` has trigger `set_ai_sketch_jobs_updated_at` before
  update, executing `set_updated_at()`.
- No visible trigger rows were returned for `public.ai_sketch_outputs`.
- No visible trigger rows were returned for `public.ai_sketch_reviews`.
- `public.ai_sketch_reviews` has no visible `updated_at` column and no visible
  `updated_at` trigger in the supplied metadata.

Missing `public.ai_sketch_reviews` columns compared with later planning:

- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at`

## C. ALTER-Only Decision

`CREATE TABLE public.ai_sketch_reviews` is prohibited and not recommended for
the next SQL step because `public.ai_sketch_reviews` already exists.

The next SQL direction is to alter the existing `public.ai_sketch_reviews` table
only, after the exact final SQL is reviewed and explicitly approved.

This package must not enable customer visibility. It does not include OpenAI API
calls, image generation, image storage, storage policy changes, app routes,
customer-facing sketch display, public gallery logic, payment, points, auth,
CAD, order, or production workflow.

## D. Status Migration Issue

The existing visible `review_status` default is `'pending'::text`.

The target first-scope review statuses from later planning are:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

The current row values were not inspected. Codex did not query rows and does not
know whether existing `public.ai_sketch_reviews` records exist or whether any
record currently stores `review_status = 'pending'`.

Conservative compatibility strategy:

- Preferred safe path: before changing the default or adding a CHECK constraint,
  run a separately approved data check that returns only distinct
  `review_status` values and counts for `public.ai_sketch_reviews`.
- If existing row values are confirmed safe, map legacy `'pending'` to
  `internal_draft_not_generated` only after the user explicitly approves that
  interpretation.
- If existing row values are unknown, leave status migration, status default
  change, and CHECK constraint execution blocked.
- Do not run an unsafe `UPDATE` from this package.

Conditional status SQL is not part of the executable candidate below. A later
execution packet may include a reviewed conditional `UPDATE`, default change, or
CHECK constraint only after current row values are known and the user explicitly
approves the exact SQL.

## E. Candidate ALTER-Only SQL — DO NOT EXECUTE WITHOUT SEPARATE USER APPROVAL

The block below is a review candidate only, not final executable SQL. It remains
blocked pending current row-value review, final exact SQL, and separate explicit
user approval. It must not be copied into Supabase, run through a CLI, converted
into a migration file, or treated as execution approval from this document
alone.

It intentionally does not create `public.ai_sketch_reviews`. It avoids
destructive changes, does not drop columns, does not loosen RLS, does not add
customer-facing policies, does not add public gallery logic, and does not include
an executable status migration.

```sql
-- Candidate ALTER-only SQL — DO NOT EXECUTE WITHOUT SEPARATE USER APPROVAL.
-- Target project must be confirmed as novora-production before any future run.
-- This candidate intentionally does not CREATE TABLE public.ai_sketch_reviews.
-- This candidate does not add anon/customer policies or customer visibility.
-- Status default, status CHECK constraint, and any legacy 'pending' row update
-- remain blocked until current review_status row values are known.

begin;

alter table public.ai_sketch_reviews
  add column if not exists revision_instruction text,
  add column if not exists approved_for_customer_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approval_revoked_at timestamptz,
  add column if not exists revoked_by text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'public.set_updated_at() was not found; stop before adding ai_sketch_reviews updated_at trigger';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.ai_sketch_reviews'::regclass
      and tgname = 'set_ai_sketch_reviews_updated_at'
      and not tgisinternal
  ) then
    create trigger set_ai_sketch_reviews_updated_at
      before update on public.ai_sketch_reviews
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists ai_sketch_reviews_concept_brief_updated_idx
  on public.ai_sketch_reviews (concept_brief_id, updated_at desc);

create index if not exists ai_sketch_reviews_output_idx
  on public.ai_sketch_reviews (ai_sketch_output_id);

commit;
```

Index justification:

- `ai_sketch_reviews_concept_brief_updated_idx` supports protected admin lookup
  by Concept Brief and recent review state.
- `ai_sketch_reviews_output_idx` supports protected admin lookup for the specific
  output under review.
- These indexes do not grant access and do not make records public.

Blocked status SQL topics for later review:

- Whether to alter the `review_status` default from `'pending'::text` to
  `'internal_draft_not_generated'`.
- Whether to add a `review_status` CHECK constraint for the four target values.
- Whether to validate the CHECK constraint immediately or use a staged
  `not valid` / `validate constraint` sequence.
- Whether any existing `'pending'` rows should be mapped to
  `internal_draft_not_generated`.

## F. RLS / Policies Recommendation

RLS is already enabled for `public.ai_sketch_jobs`,
`public.ai_sketch_outputs`, and `public.ai_sketch_reviews` according to the
user-provided visible metadata.

No visible policies were returned for the three AI sketch tables in the supplied
`pg_policies` metadata. For the first persistence stage, do not add
`anon`/customer policies and do not open customer/public access.

Future admin writes should use server-side `service_role` access through a
protected admin route. The current admin access-key model is not a database
admin role and should not be treated as an RLS identity.

Any RLS, grant, or policy change needs separate review. This package should not
open customer/public access, should not add browser-client write paths, and
should not create direct customer reads of internal review rows.

## G. Pre-Execution Checklist

Before any real SQL execution:

- Confirm target Supabase project is `novora-production`.
- Confirm the final exact SQL text.
- Confirm current `review_status` row values if changing default, adding a
  constraint, or mapping existing statuses.
- Decide how to handle existing `'pending'` values.
- Confirm backup/export or rollback posture.
- Confirm RLS and policies remain closed to `anon` and customer/browser access.
- Confirm no customer routes read `public.ai_sketch_reviews`.
- Confirm no OpenAI API call, image generation, image storage, gallery logic,
  payment, points, auth, CAD, order, or production workflow is included.
- Receive explicit user approval for SQL execution.

## H. Exact User Approval Required

The future user approval must explicitly say:

> 批准执行 Agent 42A revised ALTER-only SQL，目标 Supabase 项目 novora-production，范围仅限修改 existing public.ai_sketch_reviews 的 internal admin review persistence schema，不包含 customer visibility / OpenAI / image storage / app route / public gallery / payment points。

That approval would still apply only to the final reviewed SQL for the existing
`public.ai_sketch_reviews` table. It would not approve app code, customer
visibility, OpenAI, image storage, public gallery, auth, payment, points, CAD,
order, Production deploy, or merge.

## I. Post-Execution Verification Checklist

After any future approved SQL execution, verify:

- Added columns exist.
- Column defaults are correct, especially `updated_at`.
- `review_status` default and CHECK constraint behavior are correct if added.
- `set_ai_sketch_reviews_updated_at` trigger exists if added.
- Updating a non-sensitive test/review row updates `updated_at`, but only after
  a separately approved verification approach.
- RLS remains enabled.
- Policies remain not customer-visible.
- `anon` and `authenticated` browser/customer roles cannot read internal review
  rows.
- No customer route changed.
- Existing Concept Brief submission and submitted confirmation flow are not
  broken.
- The project ledger is updated with the actual execution result.

## J. Rollback Plan

Added columns:

- If execution has not been used by app code and no meaningful review data was
  stored in the new columns, a reviewed rollback may drop only the newly added
  columns.
- If review data exists, do not casually drop columns. Prefer additive
  correction, export/review, or a later migration plan.

Added constraint:

- If a new CHECK constraint blocks valid workflow data, stop writes, inspect
  current values, and review whether to drop, replace, or defer validation.
- Do not loosen allowed statuses without separate product and RLS review.

Updated default:

- If the default is changed incorrectly, stop app integration and review a
  follow-up `alter column review_status set default ...` correction.
- Existing rows are not automatically fixed by a default change, so row-value
  handling needs separate review.

Added trigger:

- If the trigger fails or references the wrong function, stop writes and review
  dropping or replacing only the `set_ai_sketch_reviews_updated_at` trigger.
- Confirm any trigger rollback does not affect the existing
  `set_ai_sketch_jobs_updated_at` trigger.

Unexpected existing row values:

- Stop before status constraint/default migration.
- Inspect distinct status values only through a separately approved data check.
- Prepare an explicit mapping or no-go decision before any status `UPDATE`.

Accidental customer visibility:

- Immediately disable the dependent route or policy.
- Revoke or remove the accidental customer/public policy.
- Verify `anon` and customer/browser roles cannot read internal review rows.
- Record the incident scope and corrective action in the ledger.

Wrong project execution:

- Stop all follow-up SQL and app integration.
- Record the exact target project, statements run, and observed partial state.
- Prepare a reviewed reverse plan for the wrong project before making further
  changes.

Partial SQL execution:

- Do not continue blindly.
- Inspect which columns, indexes, constraints, and triggers exist.
- Prefer additive correction over destructive rewrite once any real data may
  exist.

## K. Risk Review

| Risk | Consequence | Affected scope | Why it exists | Likelihood / severity | Mitigation | Approval implication |
| --- | --- | --- | --- | --- | --- | --- |
| Wrong Supabase project | Schema changes land in the wrong environment or create misleading ledger state. | Supabase operations, future app wiring, ledger. | Manual execution can target the wrong Supabase project. | Medium / critical. | Confirm `novora-production` in the UI and approval text before execution. | Approval must name the target project. |
| Existing `'pending'` status not migrated safely | Existing review rows may conflict with target statuses or be misinterpreted. | `ai_sketch_reviews`, admin workflow. | Current default is `'pending'::text`, but row contents were not inspected. | Medium / high. | Inspect distinct status values only after explicit approval; map only after review. | Approval must cover status handling before default/constraint changes. |
| CHECK constraint conflicts with existing rows | SQL fails or blocks future writes unexpectedly. | Database schema, admin persistence. | No visible CHECK exists and current row values are unknown. | Medium / high. | Defer CHECK until row values are known; consider staged validation. | Constraint execution remains no-go until status compatibility is confirmed. |
| Duplicate table avoided but incompatible existing schema remains | ALTER-only SQL may still leave old field names or semantics that future app code misreads. | Schema compatibility, future admin routes. | The existing table predates later planning and has `reviewer_note` / `customer_safe_note` rather than all planned fields. | Medium / medium. | Preserve existing fields; add missing fields; require route DTO review later. | Approval covers only additive schema alignment, not full app readiness. |
| RLS opened accidentally | Internal statuses or notes become readable by public/customer roles. | Privacy, Supabase, customer trust. | Policies/grants are separate from table shape and easy to misconfigure. | Low to medium / critical. | Add no customer policies in this package; verify anon/customer denial after future SQL. | Any policy/grant change needs separate approval. |
| Customer notes/internal notes confusion | Private reviewer notes or revision instructions appear in customer surfaces. | Admin data, customer privacy, support. | Existing and planned note fields sit near customer-safe fields. | Medium / critical. | Keep internal notes server-only; require redacted customer DTOs in later app work. | This package does not approve customer routes. |
| `approved_for_customer` confused with `approved_for_gallery` | Private customer work could be published publicly. | Gallery, privacy, legal/support risk. | Both names sound like approval but have different audiences. | Medium / critical. | Keep public gallery approval, consent, and public-safe records separate. | Approval must explicitly exclude gallery automation. |
| SQL interpreted as execution approval | Reviewer may think merging this doc changes Supabase. | Project operations, approval process. | The document contains SQL text. | Low / high. | Repeat no SQL was executed and exact future approval wording is required. | Merge is documentation review only. |
| Future app route bypasses service-role-only intent | Server code could expose records even if RLS stays closed. | App routes, customer privacy, admin workflow. | Service role can bypass RLS when misused. | Medium / critical. | Future route must be protected, server-only, redacted, and separately tested. | SQL approval does not approve route implementation. |
| Rollback incomplete | Bad schema, trigger, index, default, or policy remains active. | Supabase operations, future app integration. | Schema changes persist beyond the task and can be partial. | Medium / high. | Prepare rollback posture before execution; stop before app code depends on new fields. | Approval must include rollback posture and verification steps. |

## L. Go / No-Go Recommendation

This revised ALTER-only package can be reviewed.

SQL execution remains no-go until current `review_status` row values and final
exact SQL are confirmed. Even if no rows exist, explicit user approval is still
required before execution.

The recommended next step is review of this package, not SQL execution.
