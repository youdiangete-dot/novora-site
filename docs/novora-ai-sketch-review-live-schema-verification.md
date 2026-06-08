# NOVORA AI Sketch Review Live Schema Verification

## A. Purpose And Boundary

This document records Agent 41A's read-only live schema verification result for
future admin AI Sketch Review Workflow persistence.

The first Agent 41A pass was blocked in Codex because this worktree had no
approved local database connection path or metadata-query client. After that
blocker, the user manually completed metadata verification in the Supabase SQL
Editor for the target project.

This document is based only on the user-provided manual metadata results. Codex
did not connect to Supabase, did not execute SQL, did not inspect live schema
directly, did not read customer rows, and did not inspect customer or business
content.

This task did not execute SQL changes, did not modify Supabase, did not change
schema, RLS, storage, grants, or policies, did not export customer data, and
does not approve SQL execution.

The NOVORA product boundary remains unchanged. AI sketches are internal concept
sketch drafts only. They are not CAD, quotes, orders, production approval,
pricing, sourcing confirmation, or public gallery approval. Customers must only
see sketches approved by the NOVORA design team through a separately approved
delivery path. Unreviewed AI drafts must never be shown directly to customers.

## B. Connection / Target Confirmation

The user confirmed the target project in the Supabase UI as
`novora-production`.

Metadata queries were run manually by the user in the Supabase SQL Editor.
Codex did not connect to Supabase and did not run the metadata queries itself.

No secrets, API keys, service-role keys, database URLs, passwords, tokens, or
private connection strings were provided to Codex, printed, or recorded in this
document.

## C. Read-Only Method

The user reported running metadata queries manually in Supabase SQL Editor. The
results supplied to Codex cover table existence, visible columns, visible
constraints, RLS status, policies, grants, and triggers for the AI sketch review
related tables.

The user reported that no customer or business rows were intentionally inspected
as part of the metadata packet. Codex did not query application rows, row
counts, storage objects, file paths, customer records, private content, or admin
pages.

This report records only the metadata results supplied by the user and should
not be read as an independent security audit by Codex.

## D. Relevant Table Inventory

Manual metadata verification found these AI sketch related public tables:

| Table | Manual metadata result | RLS status | Policy / grant / trigger summary |
| --- | --- | --- | --- |
| `public.ai_sketch_jobs` | Exists. | RLS enabled `true`; forced RLS `false`. | `pg_policies` returned no rows for this table. Visible grant metadata did not show `anon` or `authenticated` DML grants. Trigger `set_ai_sketch_jobs_updated_at` exists before update and executes `set_updated_at()`. |
| `public.ai_sketch_outputs` | Exists. | RLS enabled `true`; forced RLS `false`. | `pg_policies` returned no rows for this table. Visible grant metadata did not show `anon` or `authenticated` DML grants. No visible trigger rows were returned in the screenshot. |
| `public.ai_sketch_reviews` | Exists. | RLS enabled `true`; forced RLS `false`. | `pg_policies` returned no rows for this table. Visible grant metadata did not show `anon` or `authenticated` DML grants. No visible trigger rows were returned in the screenshot. |

Other relevant tables from the original verification scope, including
`concept_briefs`, `concept_brief_contacts`,
`concept_brief_reference_assets`, `admin_notes`, and
`concept_brief_notification_events`, were not separately described in the
user-provided manual metadata update except where referenced by visible foreign
keys.

Grant interpretation is intentionally conservative. The screenshots showed
`postgres` with full DML privileges. The screenshots did not show
`anon`/`authenticated` `SELECT`, `INSERT`, `UPDATE`, or `DELETE` privileges for
`ai_sketch_jobs`, `ai_sketch_outputs`, or `ai_sketch_reviews`. Visible
`anon`/`authenticated`/`service_role` rows were limited to non-DML privileges
such as `REFERENCES`, `TRIGGER`, or `TRUNCATE` in the screenshot. This report
records that visible metadata did not show `anon`/`authenticated` DML grants;
it does not claim a complete independent grant audit.

Policy interpretation is also conservative. RLS is enabled for the three AI
sketch tables, and `pg_policies` returned no rows for them in the supplied
metadata. Treat this as RLS enabled with no explicit policies visible for those
tables.

## E. `ai_sketch_reviews` Finding

`public.ai_sketch_reviews` exists. Future SQL must not create a duplicate
`ai_sketch_reviews` table.

The user-provided metadata showed these visible columns:

| Column | Type | Nullability | Default |
| --- | --- | --- | --- |
| `id` | `uuid` | `not null` | `gen_random_uuid()` |
| `ai_sketch_output_id` | `uuid` | `not null` | none reported |
| `concept_brief_id` | `uuid` | `not null` | none reported |
| `review_status` | `text` | `not null` | `'pending'::text` |
| `reviewer_note` | `text` | nullable | none reported |
| `customer_safe_note` | `text` | nullable | none reported |
| `reviewed_at` | `timestamp with time zone` | nullable | none reported |
| `created_at` | `timestamp with time zone` | `not null` | `now()` |

The following later-planned columns were missing from the visible
`ai_sketch_reviews` metadata:

- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at`

Visible constraints for `public.ai_sketch_reviews`:

- Primary key on `id`.
- Foreign key `ai_sketch_output_id` references `public.ai_sketch_outputs(id)`.
- Foreign key `concept_brief_id` references `public.concept_briefs(id)`.
- No visible `review_status` CHECK constraint was found in the returned
  metadata.

Visible trigger posture:

- No visible trigger rows were returned for `ai_sketch_reviews`.
- `ai_sketch_reviews` has no visible `updated_at` column and no visible
  `updated_at` trigger in the supplied metadata.

Current compatibility with later planning is partial. The table exists and has
the key Concept Brief/output relationship, but it does not yet match the later
Agent 40A planning fields or status constraint posture.

## F. Agent 40A Candidate Compatibility

The Agent 40A candidate SQL must be revised before execution.

Compatibility conclusions:

- `CREATE TABLE ai_sketch_reviews` is not needed and must be avoided because
  `public.ai_sketch_reviews` already exists.
- The next SQL direction should be an ALTER existing table / verify path, not a
  duplicate CREATE path.
- The candidate's default status
  `internal_draft_not_generated` conflicts with the current visible default
  `'pending'::text` and must be reviewed before any SQL execution.
- The candidate's planned fields are not all present. Any future SQL must be
  exact ALTER-only SQL that accounts for existing columns, names, defaults,
  constraints, and missing columns.
- No visible `review_status` CHECK constraint was found, so allowed status
  values remain a required pre-execution design and migration decision.
- RLS is enabled for the AI sketch tables, but no explicit policies were
  visible in the supplied `pg_policies` results. Any future SQL must still
  include RLS/grant/policy review and post-execution verification.
- The current visible grant metadata did not show `anon` or `authenticated`
  DML grants, but this is not a full independent security audit.

The user-provided manual metadata results change the recommendation from
blocked to conditional ALTER-only planning. The candidate SQL is still not ready
to run. It must be converted into exact SQL for the existing table and reviewed
again before execution.

## G. Recommended Next SQL Direction

Recommended next SQL direction: **ALTER existing table only / verify path**.

Do not create `public.ai_sketch_reviews`.

Before any execution, prepare exact ALTER-only SQL for review that accounts for:

- Existing table and foreign keys.
- Existing `review_status` default `'pending'::text`.
- Missing later-planned approval, revocation, revision, and `updated_at` fields.
- Absence of a visible `review_status` CHECK constraint.
- RLS enabled with no explicit policies visible.
- Visible grants that did not show `anon`/`authenticated` DML access, while
  still requiring full grant review.
- Whether `reviewer_note` and `customer_safe_note` should remain, be mapped to
  later-planned note fields, or be left unchanged for compatibility.
- Whether `ai_sketch_reviews` needs an `updated_at` column and trigger aligned
  with the existing `set_updated_at()` pattern visible on `ai_sketch_jobs`.

SQL execution is not approved by this report.

## H. Pre-Execution Requirements Still Remaining

Before any SQL execution:

- Produce final exact ALTER-only SQL for the existing
  `public.ai_sketch_reviews` table.
- Review the current `pending` status default and decide the safe transition to
  the planned internal review statuses.
- Review whether to add, backfill, or leave missing later-planned columns.
- Review RLS, grants, and policies line by line.
- Verify whether no explicit policies is the intended deny-by-default posture
  for the current admin access model.
- Confirm backup/export or rollback posture.
- Prepare post-execution metadata verification steps.
- Confirm no customer route will read internal review records.
- Receive separate explicit user approval for SQL execution.

Merging this report or its PR does not approve SQL execution.

## I. Risks Discovered

Duplicate table risk is now concrete and must be avoided: `ai_sketch_reviews`
already exists, so any future CREATE path would be wrong.

Incompatible column risk remains because the existing table shape differs from
later planning. Existing columns include `reviewer_note`, `customer_safe_note`,
and `reviewed_at`; later planning expects fields such as
`revision_instruction`, `approved_for_customer_at`, `approved_by`,
`approval_revoked_at`, `revoked_by`, and `updated_at`.

Status compatibility risk remains because the existing `review_status` default
is `'pending'::text`, while later planning uses explicit internal review
statuses. No visible `review_status` CHECK constraint was found in the returned
metadata.

RLS/policy exposure risk remains a required review area. RLS is enabled, but no
explicit policies were visible for the AI sketch tables in the supplied
metadata. Visible grant metadata did not show `anon` or `authenticated` DML
grants, but this does not replace a full independent security review before
execution.

Wrong project risk was reduced by the user's Supabase UI confirmation of
`novora-production`, but future SQL execution must still explicitly name and
confirm the target project.

Customer data exposure risk was avoided during this update because Codex did
not connect to Supabase, and the user reported that no customer/business rows
were intentionally inspected as part of the metadata packet.

Accidental execution risk was avoided during this update because Codex did not
run SQL and no Supabase writes were performed.

## J. Final Conclusion

Manual metadata verification was completed by the user through Supabase SQL
Editor for `novora-production`. Codex did not connect to Supabase and did not
run SQL.

`public.ai_sketch_reviews` exists. Future SQL must not create a duplicate table.
The Agent 40A candidate SQL must be revised into exact ALTER-only SQL for the
existing schema before any execution.

SQL is not ready to execute now. Before any SQL execution, NOVORA must review
the exact ALTER-only SQL, RLS/grants/policies, backup/export or rollback
posture, and post-execution verification plan, then receive separate explicit
user approval for SQL execution.
