# NOVORA Agent 45E AI Sketch Reviews Duplicate Protection SQL Plan

## Purpose

This is a docs-only SQL planning packet for adding duplicate protection to:

```text
public.ai_sketch_reviews(concept_brief_id)
```

This packet prepares manual SQL for later user review and execution only. Codex
must not execute SQL, connect to Supabase live, inspect live schema, query rows,
inspect customer data, inspect IDs, inspect notes, inspect `reviewer_note`, or
inspect `customer_safe_note`.

Because duplicate protection is currently missing, the Agent 45E insert/upsert
write path must not be implemented yet.

## Current Precheck Summary

The user already ran the manual implementation precheck and reported:

- `pending_mentioned_in_review_status_check = false`
- `all_final_statuses_mentioned_in_check = true`
- `invalid_or_legacy_status_rows = 0`
- `total_rows = 0`
- `concept_brief_id_indexes` returned no rows

Interpretation:

- The table is empty.
- The final `review_status` constraint signals look good.
- No invalid or legacy status rows were reported.
- No unique index or unique constraint was detected for `concept_brief_id`.
- Duplicate protection for one AI sketch review row per internal Concept Brief
  is missing.

This PR is docs-only SQL planning. It does not approve SQL execution, implement
a write path, add an API route, add a server action, or add insert, update,
delete, or upsert behavior.

## Manual Precheck Before SQL

Codex must not run these queries. The user may run them later in the Supabase
SQL Editor for the target project as manual read-only checks.

This precheck packet is SELECT-only. Do not expand it to include `ALTER`,
`UPDATE`, `INSERT`, `DELETE`, `UPSERT`, `CREATE`, `DROP`, `GRANT`, `REVOKE`,
policy, RLS, storage, migration, trigger, or app-code behavior.

Do not paste actual `concept_brief_id` values, customer data, row IDs, note
values, brief content, contact content, reference asset data, or storage paths
back into chat or docs. Use aggregate results only.

### Table Exists

```sql
select exists (
  select 1
  from information_schema.tables
  where table_schema = 'public'
    and table_name = 'ai_sketch_reviews'
) as ai_sketch_reviews_table_exists;
```

Stop if this returns `false`.

### concept_brief_id Column Shape

```sql
select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_sketch_reviews'
  and column_name = 'concept_brief_id';
```

Confirm the column exists and record:

- data type
- whether it is nullable
- default, if any

If `concept_brief_id` is nullable, stop and do not run the unique constraint SQL
until a separate schema decision is made.

### Null concept_brief_id Row Count

```sql
select count(*) as null_concept_brief_id_rows
from public.ai_sketch_reviews
where concept_brief_id is null;
```

Stop if this returns any value above `0`.

### Total Row Count

```sql
select count(*) as total_rows
from public.ai_sketch_reviews;
```

If the table is not empty, continue only with explicit user review and approval
of the current state. Do not assume a non-empty table is safe.

### Duplicate Aggregate Count

This query intentionally does not output actual `concept_brief_id` values.

```sql
with duplicate_groups as (
  select count(*) as rows_for_concept_brief
  from public.ai_sketch_reviews
  where concept_brief_id is not null
  group by concept_brief_id
  having count(*) > 1
)
select
  count(*) as duplicate_concept_brief_id_groups,
  coalesce(sum(rows_for_concept_brief - 1), 0) as duplicate_extra_rows
from duplicate_groups;
```

Stop immediately if either result is above `0`. A manual data-resolution plan is
required before any unique constraint can be added.

### Existing Unique Index Or Constraint On concept_brief_id

```sql
select
  c.conname as constraint_name,
  c.contype as constraint_type,
  pg_get_constraintdef(c.oid) as constraint_definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and c.contype in ('u', 'p')
  and pg_get_constraintdef(c.oid) like '%concept_brief_id%'
order by c.conname;
```

```sql
select
  i.relname as index_name,
  ix.indisunique as is_unique,
  pg_get_indexdef(ix.indexrelid) as index_definition
from pg_index ix
join pg_class i on i.oid = ix.indexrelid
join pg_class t on t.oid = ix.indrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and ix.indisunique = true
  and pg_get_indexdef(ix.indexrelid) like '%concept_brief_id%'
order by i.relname;
```

If an equivalent unique constraint or unique index already exists, do not run
new constraint SQL. Proceed to post-SQL-style verification and future write-path
planning only after explicit review.

### Invalid Or Legacy review_status Rows

```sql
select count(*) as invalid_or_legacy_status_rows
from public.ai_sketch_reviews
where review_status is null
  or trim(review_status) = ''
  or review_status not in (
    'internal_draft_not_generated',
    'draft_generated_internal_only',
    'needs_revision',
    'approved_for_customer'
  );
```

Stop if this returns any value above `0`. Invalid or legacy values must not be
treated as approved.

### Final review_status CHECK Signals

```sql
select
  bool_or(pg_get_constraintdef(c.oid) like '%pending%') as pending_mentioned_in_review_status_check,
  bool_or(pg_get_constraintdef(c.oid) like '%internal_draft_not_generated%')
    and bool_or(pg_get_constraintdef(c.oid) like '%draft_generated_internal_only%')
    and bool_or(pg_get_constraintdef(c.oid) like '%needs_revision%')
    and bool_or(pg_get_constraintdef(c.oid) like '%approved_for_customer%')
    as all_final_statuses_mentioned_in_check
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and c.contype = 'c'
  and c.conname = 'ai_sketch_reviews_review_status_check';
```

Expected:

- `pending_mentioned_in_review_status_check = false`
- `all_final_statuses_mentioned_in_check = true`

Stop if `pending` is mentioned or if any final status is missing.

## Manual SQL Packet Proposal

Manual SQL - do not run through Codex.

Only consider this SQL if every precondition is true:

- `public.ai_sketch_reviews` exists.
- `concept_brief_id` exists.
- `concept_brief_id` is NOT NULL.
- No null `concept_brief_id` rows exist.
- No duplicate `concept_brief_id` groups exist.
- No equivalent unique index or unique constraint already exists.
- No invalid or legacy `review_status` rows exist.
- The final `review_status` CHECK excludes `pending` and includes all final
  statuses.
- If the table is not empty, the user has explicitly approved adding the
  constraint after reviewing the aggregate precheck results.

```sql
alter table public.ai_sketch_reviews
add constraint ai_sketch_reviews_concept_brief_id_key
unique (concept_brief_id);
```

If `concept_brief_id` is nullable, the schema does not match expectations, or
any precondition fails, stop and do not run this SQL. A separate schema decision
is required before choosing between a NOT NULL plan, a partial unique index, or
another approach.

## Post-SQL Verification Packet

Codex must not run these queries. The user may run them manually after SQL
execution.

### Unique Protection Exists

```sql
select
  c.conname as constraint_name,
  c.contype as constraint_type,
  pg_get_constraintdef(c.oid) as constraint_definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and c.conname = 'ai_sketch_reviews_concept_brief_id_key';
```

```sql
select
  i.relname as index_name,
  ix.indisunique as is_unique,
  pg_get_indexdef(ix.indexrelid) as index_definition
from pg_index ix
join pg_class i on i.oid = ix.indexrelid
join pg_class t on t.oid = ix.indrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and ix.indisunique = true
  and pg_get_indexdef(ix.indexrelid) like '%concept_brief_id%'
order by i.relname;
```

### No Duplicates Exist

This query intentionally does not output actual `concept_brief_id` values.

```sql
with duplicate_groups as (
  select count(*) as rows_for_concept_brief
  from public.ai_sketch_reviews
  where concept_brief_id is not null
  group by concept_brief_id
  having count(*) > 1
)
select
  count(*) as duplicate_concept_brief_id_groups,
  coalesce(sum(rows_for_concept_brief - 1), 0) as duplicate_extra_rows
from duplicate_groups;
```

### Total Row Count Remains Expected

```sql
select count(*) as total_rows
from public.ai_sketch_reviews;
```

For the current reported precheck state, the expected total remains `0` unless
the user intentionally accepts a later non-empty state before SQL execution.

### Invalid Or Legacy Status Count Remains 0

```sql
select count(*) as invalid_or_legacy_status_rows
from public.ai_sketch_reviews
where review_status is null
  or trim(review_status) = ''
  or review_status not in (
    'internal_draft_not_generated',
    'draft_generated_internal_only',
    'needs_revision',
    'approved_for_customer'
  );
```

### pending Remains Excluded And Final Statuses Remain Present

```sql
select
  bool_or(pg_get_constraintdef(c.oid) like '%pending%') as pending_mentioned_in_review_status_check,
  bool_or(pg_get_constraintdef(c.oid) like '%internal_draft_not_generated%')
    and bool_or(pg_get_constraintdef(c.oid) like '%draft_generated_internal_only%')
    and bool_or(pg_get_constraintdef(c.oid) like '%needs_revision%')
    and bool_or(pg_get_constraintdef(c.oid) like '%approved_for_customer%')
    as all_final_statuses_mentioned_in_check
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and c.contype = 'c'
  and c.conname = 'ai_sketch_reviews_review_status_check';
```

Expected:

- `pending_mentioned_in_review_status_check = false`
- `all_final_statuses_mentioned_in_check = true`

## Manual Execution Status

After PR #123 merged, the user manually executed the candidate duplicate
protection SQL in Supabase SQL Editor:

```sql
alter table public.ai_sketch_reviews
add constraint ai_sketch_reviews_concept_brief_id_key
unique (concept_brief_id);
```

Codex did not execute SQL, connect to Supabase live, inspect live schema,
inspect rows, inspect customer data, inspect IDs, inspect `reviewer_note`, or
inspect `customer_safe_note`.

User-reported post-SQL verification confirms:

- constraint `ai_sketch_reviews_concept_brief_id_key` exists
- constraint definition is `UNIQUE (concept_brief_id)`
- matching unique index exists with `is_unique = true`
- `duplicate_concept_brief_id_groups = 0`
- `duplicate_extra_rows = 0`
- `total_rows = 0`
- `invalid_or_legacy_status_rows = 0`
- `pending_mentioned_in_review_status_check = false`
- `all_final_statuses_mentioned_in_check = true`

Duplicate protection is now manually executed and verified. This unblocks
discussion of a future write-path implementation path, but it does not
automatically start implementation.

## Decision Matrix

| Precheck result | Decision |
| --- | --- |
| `concept_brief_id` is NOT NULL, table is empty, no duplicates exist, no invalid statuses exist, and no unique constraint/index exists | User may manually run the proposed unique constraint SQL after explicit approval. |
| Equivalent unique constraint or unique index already exists | Do not run new constraint SQL. Proceed to verification and then future write-path planning. |
| `concept_brief_id` is nullable | Stop. Decide whether a separate NOT NULL schema plan is required or whether a partial unique index is acceptable. Do not proceed to write-path upsert planning blindly. |
| Any duplicate `concept_brief_id` aggregate count is above `0` | Stop immediately. Prepare a manual data-resolution plan. Do not add the unique constraint until duplicates are resolved. |
| Invalid or legacy `review_status` rows exist | Stop. Prepare cleanup or migration planning. Do not treat invalid values as approved. |
| Table is not empty but no duplicates exist | Still require explicit user approval before adding the constraint. Do not assume the SQL is safe automatically. |

## Future Write-path Implication

Successful duplicate protection is a prerequisite for any insert/upsert-capable
Agent 45E implementation.

Until duplicate protection is verified:

- insert/upsert must remain blocked
- future Agent 45E implementation may only consider update-only behavior
- even update-only behavior must not start until explicitly approved by the user

After duplicate protection is verified, future write-path planning still must
preserve admin-only access, final status validation, customer visibility
boundaries, and the sensitive-note exclusions below.

## Boundaries

This PR does not include:

- write path implementation
- API route
- server action
- insert, update, delete, or upsert behavior in app code
- customer-facing AI sketch display
- email or customer delivery
- OpenAI calls
- image generation
- image upload or storage behavior
- public gallery automation
- payment, points, or auth changes
- Vercel, environment, secret, provider, deploy, Production, or admin-page
  operation
- migration files
- RLS, grant, policy, or storage changes

Product boundaries:

- `approved_for_customer` does not mean gallery approval.
- Customer pages must not show unreviewed AI sketches.
- Future customer delivery remains email-only after human review, optimization,
  and approval in a separately approved workflow.
- Future write path must not touch `reviewer_note`.
- Future write path must not touch `customer_safe_note`.
