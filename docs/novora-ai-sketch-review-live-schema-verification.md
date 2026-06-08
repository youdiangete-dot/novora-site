# NOVORA AI Sketch Review Live Schema Verification

## A. Purpose And Boundary

This document records Agent 41A's read-only live schema verification attempt
for future admin AI Sketch Review Workflow persistence.

This task was limited to read-only schema metadata verification. It did not
execute SQL changes, did not modify Supabase, did not inspect customer content,
did not export customer data, and does not approve SQL execution.

The NOVORA product boundary remains unchanged. AI sketches are internal concept
sketch drafts only. They are not CAD, quotes, orders, production approval,
pricing, sourcing confirmation, or public gallery approval. Customers must only
see sketches approved by the NOVORA design team through a separately approved
delivery path. Unreviewed AI drafts must never be shown directly to customers.

## B. Connection / Target Confirmation

The durable project ledger identifies the Supabase project as
`novora-production`, and the branch started from the expected current `main`
HEAD `95a43e0d4f1e752027e326ef0ce4fcd2ef517e50`.

Live Supabase connection was not completed in this worktree. The existing local
environment did not expose a safe database connection path:

- No `SUPABASE_DATABASE_URL` or other Supabase/database environment variable
  names were present in the process environment.
- No `.env.local` or `.env` file was present in the worktree.
- No `node_modules` directory was present.
- `psql` was not available on PATH.
- Supabase CLI was not available on PATH.
- Node packages `pg`, `postgres`, and `@supabase/supabase-js` were not
  resolvable.
- Python packages `psycopg`, `psycopg2`, and `asyncpg` were not available.

Because the plan required using only existing secure local env/tooling and not
installing or fetching temporary database tooling, the live target project could
not be confirmed from connection metadata. This report therefore records a
blocked verification result rather than live schema findings.

No secrets, API keys, service-role keys, database URLs, passwords, tokens, or
private connection strings were printed or recorded.

## C. Read-Only Method

The allowed method, if a safe connection had been available, was metadata-only
`SELECT` inspection against:

- `information_schema.tables`
- `information_schema.columns`
- `information_schema.table_constraints`
- `information_schema.constraint_column_usage`
- `information_schema.key_column_usage`
- `pg_catalog` metadata for indexes, constraints, RLS, and attributes
- `pg_policies`
- role/grant metadata exposed through read-only views

No application table rows were selected. No row counts were queried. No customer
or business content was inspected.

The actual completed work was local preflight only: repo context review,
connection-tooling availability checks, and this documentation update. No live
metadata query reached Supabase.

## D. Relevant Table Inventory

Because the live connection could not be completed, the table inventory below is
not a live schema result. It records the verification status for each requested
table.

| Table | Live existence result | Metadata summary | RLS / policy / grant summary |
| --- | --- | --- | --- |
| `concept_briefs` | Not verified live | Repo ledger says this table exists, but live metadata was not queried in Agent 41A. | Not verified live. |
| `concept_brief_contacts` | Not verified live | Repo ledger says this table exists, but live metadata was not queried in Agent 41A. | Not verified live. |
| `concept_brief_reference_assets` | Not verified live | Repo ledger says this table exists, but live metadata was not queried in Agent 41A. | Not verified live. |
| `ai_sketch_jobs` | Not verified live | Older docs describe this as future/planned; Agent 41A could not verify live presence. | Not verified live. |
| `ai_sketch_outputs` | Not verified live | Older docs describe this as future/planned; Agent 41A could not verify live presence. | Not verified live. |
| `ai_sketch_reviews` | Not verified live | This was the special-focus table, but live presence and shape could not be verified. | Not verified live. |
| `ai_sketch_review_events` | Not verified live | Optional/future table; live presence could not be verified. | Not verified live. |
| `admin_operation_audit_events` | Not verified live | Optional/future shared audit table; live presence could not be verified. | Not verified live. |
| `admin_notes` | Not verified live | Repo ledger says this table exists, but live metadata was not queried in Agent 41A. | Not verified live. |
| `concept_brief_notification_events` | Not verified live | Repo ledger says this table exists, but live metadata was not queried in Agent 41A. | Not verified live. |

## E. `ai_sketch_reviews` Finding

`ai_sketch_reviews` existence remains unknown from live schema inspection.

Agent 41A could not verify whether the table exists, whether it has the expected
columns, whether `review_status` has a constraint, whether RLS is enabled, or
whether policies/grants expose anything to `anon` or customer roles.

The following special-focus fields were not verified live:

- `concept_brief_id`
- `ai_sketch_job_id`
- `ai_sketch_output_id`
- `review_status`
- `reviewer_label` or `reviewer_admin_id`
- `review_note_internal`
- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `created_at`
- `updated_at`

Because live schema was not inspected, Agent 41A cannot say whether
`ai_sketch_reviews` can support the Agent 40A minimum persistence direction.
Duplicate `CREATE TABLE` risk remains unresolved and must be verified before
any SQL execution.

## F. Agent 40A Candidate Compatibility

The Agent 40A candidate SQL remains unverified and is not safe to execute as-is.

Current compatibility assessment:

- `CREATE TABLE ai_sketch_reviews` cannot be recommended because live existence
  is unknown and duplicate table risk remains.
- The ALTER-only direction remains a conservative conditional direction only if
  a future live schema check confirms `public.ai_sketch_reviews` exists with
  compatible identifiers.
- Existing columns, types, constraint names, status values, indexes, RLS,
  policies, and grants were not verified.
- Required status values were not verified live.
- RLS/policy posture for AI sketch review related tables was not verified.
- The candidate must be revised or re-reviewed after successful live schema
  metadata inspection.

Live schema verification did not change the recommendation because it could not
be completed. The recommendation remains: do not execute SQL until live schema,
target project, exact final SQL, RLS/grants/policies, rollback posture, and
post-execution verification are reviewed and explicitly approved.

## G. Recommended Next SQL Direction

Recommended next SQL direction: **blocked / cannot recommend until more
verification**.

Do not choose no-op, ALTER, or CREATE from the current evidence. The next safe
step is to complete read-only live schema metadata verification with an
approved, secure, existing connection path or a separately approved tooling and
credential setup.

## H. Pre-Execution Requirements Still Remaining

Before any SQL execution:

- Confirm the live target project is `novora-production`.
- Confirm backup/export or rollback posture.
- Produce final exact SQL after live schema inspection.
- Review RLS, grants, and policies line by line.
- Verify whether `ai_sketch_reviews` exists and whether a duplicate create must
  be avoided.
- Verify any existing columns, constraints, indexes, and status values.
- Verify `anon` and customer-role exposure posture.
- Prepare post-execution verification steps.
- Receive separate explicit user approval for SQL execution.

Merging this report or its PR does not approve SQL execution.

## I. Risks Discovered

Duplicate table risk remains unresolved because `ai_sketch_reviews` live
existence was not verified.

Incompatible column risk remains unresolved because live column names, types,
nullability, defaults, constraints, and indexes were not verified.

RLS/policy exposure risk remains unresolved because live RLS flags, policies,
and grants were not verified. Internal review records, internal notes, revision
instructions, and draft visibility must not be readable by anonymous or
customer roles.

Wrong project risk remains unresolved because `novora-production` was confirmed
only from the repo ledger, not from a live connection target.

Customer data exposure risk was avoided during this task because no application
table rows, row counts, storage objects, file paths, customer records, private
content, or admin pages were queried.

Accidental execution risk was avoided during this task because no SQL client was
available through the approved local path and no DDL/DML was run.

## J. Final Conclusion

SQL is not ready to execute now.

Agent 41A could not complete live Supabase schema verification because the
current worktree did not provide an approved existing secure connection path or
metadata-query client. No SQL changes were executed, no customer data was
inspected, and no live Supabase metadata was retrieved.

Before any SQL execution, NOVORA must complete read-only live schema metadata
verification for `novora-production`, revise or confirm the exact SQL against
that live schema, review RLS/grants/policies and rollback posture, and receive
separate explicit user approval for SQL execution.
