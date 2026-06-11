# NOVORA AI Sketch Review - Agent 44 SQL Execution Result

## 1. Purpose

This document records the completed user-manual Agent 44 final ALTER-only SQL
execution result for the existing `public.ai_sketch_reviews` table.

This is a historical execution record. It is not a new SQL execution request,
not SQL approval, and not instructions for Codex to connect to Supabase or
inspect live schema.

Codex did not execute SQL. Codex did not connect to Supabase. Codex did not
inspect live schema, query rows, inspect IDs, inspect notes, or inspect
customer data.

## 2. Scope

- Target Supabase project: `novora-production`
- Target table: existing `public.ai_sketch_reviews`
- Scope: internal admin review persistence schema only
- Excluded: customer visibility, OpenAI, image storage, app route, public
  gallery, payment, points, and RLS opening

No RLS changes were made. No grants changes were made. No storage changes were
made. No policy changes were made. No app route or API route changes were made.
No OpenAI/image generation/image storage changes were made. No public gallery
automation was made. No payment, points, or auth changes were made.

## 3. Approval And Precheck

The user provided this explicit approval before execution:

> “批准执行 Agent 44 final ALTER-only SQL，目标 Supabase 项目 novora-production，范围仅限 existing public.ai_sketch_reviews internal admin review persistence schema；确认刚刚重新运行 aggregate precheck 后 table 仍为空；不包含 customer visibility / OpenAI / image storage / app route / public gallery / payment / points / RLS opening。”

Fresh aggregate-only precheck immediately before execution:

- Query 1, grouped `review_status` count: no rows returned.
- Query 2, null / blank / total count:
  - `null_status_count = 0`
  - `blank_status_count = 0`
  - `total_rows = 0`
- Query 3, unknown status count: no rows returned.

The table was empty before execution.

## 4. Execution Result

The user manually ran the Agent 44 final ALTER-only SQL in Supabase SQL Editor
for project `novora-production`.

Supabase SQL Editor reported success / no rows returned.

Codex did not execute SQL.

## 5. Post-Execution Verification

The user provided these post-execution verification results.

### Column And Default Verification

| Column | Data type | Nullable | Default |
| --- | --- | --- | --- |
| `review_status` | `text` | `NO` | `'internal_draft_not_generated'::text` |
| `revision_instruction` | `text` | `YES` | `NULL` |
| `approved_for_customer_at` | `timestamp with time zone` | `YES` | `NULL` |
| `approved_by` | `text` | `YES` | `NULL` |
| `approval_revoked_at` | `timestamp with time zone` | `YES` | `NULL` |
| `revoked_by` | `text` | `YES` | `NULL` |
| `updated_at` | `timestamp with time zone` | `NO` | `now()` |

### CHECK Constraint Verification

- Constraint name: `ai_sketch_reviews_review_status_check`
- `has_internal_draft_not_generated`: `true`
- `has_draft_generated_internal_only`: `true`
- `has_needs_revision`: `true`
- `has_approved_for_customer`: `true`
- `has_pending`: `false`

### Final Row Count Verification

The user verified:

```sql
select count(*) as total_rows from public.ai_sketch_reviews;
```

Result:

- `total_rows = 0`

No insert test was run.

## 6. Current Verified Schema Outcome

- Review workflow columns now exist on `public.ai_sketch_reviews`.
- `review_status` default is now `internal_draft_not_generated`.
- The final CHECK constraint allows exactly:
  - `internal_draft_not_generated`
  - `draft_generated_internal_only`
  - `needs_revision`
  - `approved_for_customer`
- `pending` is excluded from the final CHECK constraint.
- `updated_at` exists with default `now()`, but no trigger was created or
  modified, so automatic refresh is not confirmed or implemented by this SQL.
- `public.ai_sketch_reviews` remains empty with `total_rows = 0`.

## 7. Product And Security Boundaries

- AI sketches are internal drafts only.
- Unreviewed GPT/AI drafts must never be shown directly to customers.
- `approved_for_customer` does not equal `approved_for_gallery`.
- AI generation success alone must not approve a sketch.
- Customer-facing sketch delivery remains email-only after human
  review/optimization/approval.
- No customer-facing sketch preview is implemented here.
- No OpenAI image API integration is implemented here.
- No image storage changes are implemented here.
- No public gallery automation is implemented here.
- No customer visibility changes were made.
- No customer data was inspected.
- No IDs or notes were inspected.
- No app compatibility code was implemented.

## 8. Remaining Follow-Ups

Future work should be handled as separate PRs/Agents:

- App compatibility with the new final review statuses.
- Admin UI persistence read/write integration.
- Optional future `updated_at` trigger review if automatic refresh is needed.
- Tests for admin review persistence.
- Customer visibility remains blocked unless separately approved.
