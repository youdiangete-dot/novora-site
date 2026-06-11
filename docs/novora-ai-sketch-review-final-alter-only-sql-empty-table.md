# NOVORA AI Sketch Review - Final ALTER-only SQL Packet for Empty ai_sketch_reviews Table

## A. Purpose And Boundary

This packet is documentation only. It prepares final SQL for later manual
execution by the user in the Supabase SQL Editor for target project
`novora-production`.

Codex must not execute this SQL. Codex must not connect to Supabase. Merging
this PR does not approve SQL execution. SQL execution requires a separate
explicit user approval after this PR is reviewed and merged.

The target table is the existing `public.ai_sketch_reviews` table. The table
must not be recreated. `CREATE TABLE public.ai_sketch_reviews` is forbidden.

This packet includes no RLS, grant, storage, policy, or customer visibility
changes. It includes no OpenAI API call, image generation, image storage,
customer-facing sketch display, public gallery automation, app route, API
route, auth, payment, points, CAD, order, production, email, deploy, or
environment-variable change.

The NOVORA product boundary remains unchanged. AI sketches are internal drafts
only until human review and approval. Unreviewed GPT/AI drafts must never be
shown directly to customers. `approved_for_customer` does not equal
`approved_for_gallery`. AI generation success alone must not approve a sketch.
Customer-facing sketch delivery remains email-only after human
review/optimization/approval. No customer-facing sketch preview, OpenAI image
API integration, image storage change, or public gallery automation is
implemented here.

## B. Source Evidence

This packet is based on these user-provided aggregate-only results from the
PR #115 precheck for `public.ai_sketch_reviews`:

- Query 1, grouped `review_status` count: no rows returned.
- Query 2, null / blank / total count:
  - `null_status_count = 0`
  - `blank_status_count = 0`
  - `total_rows = 0`
- Query 3, unknown status count: no rows returned.

Safe interpretation:

- `public.ai_sketch_reviews` is currently empty.
- No row migration is needed.
- No `pending` to new-status update is needed.
- No cleanup is needed.
- Final SQL can avoid data `UPDATE`.

These aggregate results do not approve SQL execution.

## C. Final SQL For Later Manual Execution

The following block is the final SQL intended for later manual execution by the
user in Supabase SQL Editor only after this PR is reviewed and merged, the
pre-execution checklist below passes again, and the user gives separate
explicit approval.

```sql
begin;

alter table public.ai_sketch_reviews
  add column if not exists revision_instruction text,
  add column if not exists approved_for_customer_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists approval_revoked_at timestamptz,
  add column if not exists revoked_by text,
  add column if not exists updated_at timestamptz not null default now(),
  alter column review_status set default 'internal_draft_not_generated',
  add constraint ai_sketch_reviews_review_status_check
    check (
      review_status in (
        'internal_draft_not_generated',
        'draft_generated_internal_only',
        'needs_revision',
        'approved_for_customer'
      )
    );

commit;
```

This packet adds the `updated_at` column only. It does not create or modify
triggers, and it does not claim that `updated_at` will automatically refresh on
later row changes. A future app/schema follow-up may be required if automatic
`updated_at` refresh behavior is needed, and that follow-up would require
separate review and approval.

The final CHECK constraint intentionally excludes `pending` because the
aggregate precheck showed the table is empty and no legacy rows need to be
preserved or migrated.

The final executable SQL block must not be expanded to include `UPDATE`,
`DELETE`, `INSERT`, `CREATE TABLE`, `DROP TABLE`, `GRANT`, `REVOKE`,
`CREATE POLICY`, `ALTER POLICY`, storage policy changes, RLS changes, customer
visibility changes, app/API changes, OpenAI/image generation, or public gallery
automation.

## D. Constraint Caveat

PostgreSQL does not support simple `ADD CONSTRAINT IF NOT EXISTS` syntax in
`ALTER TABLE`.

This final SQL is intended as a one-time manual execution after confirming no
existing `review_status` CHECK constraint is present. PR #113 previously found
no visible `review_status` CHECK constraint in the supplied metadata.

If Supabase reports that `ai_sketch_reviews_review_status_check` or another
equivalent `review_status` constraint already exists, stop and do not retry
blindly. Do not replace this final SQL with a `DO` block unless that
alternative is separately reviewed and approved.

Running this SQL twice may fail at constraint creation. Treat that as a stop
condition, not as permission to improvise a schema change.

## E. Pre-Execution Safety Checklist

Immediately before any future manual execution, the user must rerun the
aggregate-only PR #115 precheck in Supabase SQL Editor:

- Grouped `review_status` count.
- Null / blank / total count.
- Unknown status count.

If the table is still empty, execution can proceed only after separate explicit
user approval.

Stop and re-evaluate if any rows appear. Stop if unknown, null, or blank
statuses appear. Stop if `pending` rows appear, and prepare a migration plan
instead of running this empty-table SQL.

Before execution, also confirm:

- Target Supabase project is `novora-production`.
- Target table is existing `public.ai_sketch_reviews`.
- The table is not being recreated.
- No RLS, grant, policy, storage, customer visibility, app/API, OpenAI, image
  storage, public gallery, auth, payment, points, CAD, order, email, deploy,
  environment, or Production workflow change is included.
- This PR has been reviewed and merged.
- The user has sent the separate explicit approval wording.

## F. Exact Future Approval Wording

PR merge is not SQL execution approval. The user must explicitly send approval
later, similar to:

> 批准执行 Agent 44 final ALTER-only SQL，目标 Supabase 项目 novora-production，范围仅限 existing public.ai_sketch_reviews internal admin review persistence schema；确认刚刚重新运行 aggregate precheck 后 table 仍为空；不包含 customer visibility / OpenAI / image storage / app route / public gallery / payment / points / RLS opening。

That approval would apply only to this reviewed ALTER-only SQL for the existing
`public.ai_sketch_reviews` internal admin review persistence schema. It would
not approve app code, customer visibility, OpenAI, image storage, public
gallery, auth, payment, points, CAD, order, Production deploy, or merge.

## G. Rollback Note

Do not run destructive rollback SQL from this packet. Any rollback that drops
columns, drops a constraint, changes defaults again, or otherwise mutates
Supabase must be separately reviewed and explicitly approved.

Not for execution without separate approval:

- Dropping any newly added column.
- Dropping or replacing `ai_sketch_reviews_review_status_check`.
- Changing `review_status` defaults again.
- Any row update or cleanup.

If execution partially succeeds or fails, stop and document exactly which
statements ran and what Supabase reported before preparing a separate reviewed
correction plan.

## H. Risks

- Rows may be inserted after the aggregate check and before execution.
- The constraint may already exist if someone changed the schema separately.
- Running the SQL twice may fail at constraint creation.
- Adding the final CHECK without `pending` is only safe because the table is
  currently empty.
- If future code still writes `pending`, inserts may fail after the default and
  CHECK change.
- This PR does not implement app code, so code compatibility must be handled in
  a later Agent.
- A reviewer or operator may mistake PR merge for SQL execution approval.
- The SQL could be run against the wrong Supabase project.
- The SQL could be executed without rerunning the aggregate precheck.

## I. Go / No-Go

GO for preparing this final SQL packet as docs-only.

NO-GO for SQL execution until all of the following are true:

1. This PR is reviewed and merged.
2. The user reruns the aggregate-only precheck.
3. `public.ai_sketch_reviews` is still empty.
4. The user gives separate explicit approval for this SQL execution.

The next step after this packet is Review Pass, not SQL execution.
