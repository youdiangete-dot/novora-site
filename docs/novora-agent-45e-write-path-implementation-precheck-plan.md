# NOVORA Agent 45E Write Path Implementation Precheck Plan

## Purpose

This is a docs-only implementation precheck packet for the future admin-only AI
sketch review write path.

The goal is to decide whether NOVORA is ready to implement the admin-only write
path, or whether schema, duplicate-protection, admin-auth, identity, or manual
precheck work must happen first.

This packet does not implement a write path. It adds no API route, server
action, insert, update, delete, upsert, SQL execution, live Supabase connection,
live schema inspection, customer display, email delivery, OpenAI/image/storage
behavior, public gallery behavior, payment, points, auth, CAD, order,
environment, or deployment change.

## Current Readiness Summary

Current baseline:

- Agent 45C status constants and admin copy alignment have been merged.
- Agent 45D protected admin-only read path has been merged.
- Agent 45E write-path planning PR #121 has been merged into `main` at
  `0795d85bc5222b4eab7c6155ae9ca634b5f1cac5`.
- The Agent 45E planning PR was docs-only and did not implement the write path.
- Actual admin-only write-path implementation is still not approved.
- Codex must not execute SQL for this precheck.
- Codex must not connect to Supabase live for this precheck.
- Codex must not inspect live schema, query rows, inspect IDs, inspect customer
  data, inspect notes, inspect `reviewer_note`, or inspect `customer_safe_note`.

Existing final AI sketch review statuses are:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` is invalid and excluded.

The current protected admin AI sketch review read path is intentionally
admin-only. It selects only:

- `review_status`
- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at`

It does not select, inspect, or expose `reviewer_note` or
`customer_safe_note`.

## Required Preconditions Before Implementation

Before any future write-path implementation starts, confirm all of the
following through a user-run manual precheck and explicit approval:

- `public.ai_sketch_reviews` has the expected columns.
- The final `review_status` CHECK constraint exists and excludes `pending`.
- The allowed `review_status` values match the final app constants.
- Whether `concept_brief_id` has a unique constraint, unique index, or
  equivalent duplicate protection.
- No duplicate rows exist for any `concept_brief_id`.
- The total row count and current production state are understood before any
  update, insert, or upsert behavior is selected.
- Whether insert/upsert should be allowed or whether update-only should be used
  first.
- The admin identity source for `approved_by` and `revoked_by`.
- The existing admin protected route/auth/cookie pattern is sufficient for this
  write path.
- Same-origin and CSRF safeguards are sufficient, or a separate implementation
  note is needed before writing code.
- Future write path must not touch `reviewer_note` or `customer_safe_note`.
- Future write path must not trigger customer email, customer delivery, or
  public gallery behavior.

## Admin Route And Auth Precheck

Local code inspection shows the current protected Concept Brief admin review
write pattern uses:

- `POST /admin/briefs/review-state`
- legacy duplicate route `POST /api/admin/brief-review-state`
- `saveAdminReviewState` in `lib/server/admin-review-state.ts`

The route pattern:

- reads the `novora_admin_access` cookie
- validates the cookie with `isValidAdminAccessCookie`
- parses JSON request body
- validates `conceptBriefId`
- validates Concept Brief review status with `isAdminReviewStatusSlug`
- defaults non-string `internalNotes` to an empty string
- calls the server-only persistence helper
- returns safe JSON success or failure messages

The admin gate is the temporary MVP shared-key pattern:

- server-only `NOVORA_ADMIN_ACCESS_KEY`
- HMAC-derived cookie value
- cookie name `novora_admin_access`
- HTTP-only cookie
- `sameSite: strict`
- path `/`
- 8-hour max age
- `secure` in production

Existing admin mutation calls use `credentials: same-origin`.

Future AI sketch review writes should use a new narrow protected admin route,
preferably under `/admin/briefs`, and should reuse this cookie-gated pattern
unless a separate auth/CSRF decision approves a stronger or different control.
If the route moves outside the protected admin path, accepts broader clients, or
adds higher-risk side effects, stop before implementation and document the
CSRF/admin-token decision first.

The existing Concept Brief admin review route writes `admin_notes`. Future AI
sketch review writes must not reuse `admin_notes` for AI sketch review state and
must not replace existing Concept Brief admin review status or internal notes.

## Manual Read-only Precheck Packet

Codex must not run these queries. The user may run them later in the Supabase
SQL Editor for the target project as manual read-only checks.

These snippets are SELECT-only. Do not expand this packet to include `ALTER`,
`UPDATE`, `INSERT`, `DELETE`, `UPSERT`, `CREATE`, `DROP`, `GRANT`, `REVOKE`,
policy, RLS, storage, migration, or trigger SQL.

### Columns Present

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_sketch_reviews'
order by ordinal_position;
```

Expected precheck focus:

- `concept_brief_id`
- `review_status`
- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at`

Also record whether `reviewer_note` and `customer_safe_note` exist, but do not
query their values.

### Review Status CHECK Constraint

```sql
select conname, pg_get_constraintdef(c.oid) as constraint_definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and c.contype = 'c'
order by conname;
```

The expected final CHECK constraint should allow:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

It should exclude `pending`.

### Pending Exclusion Signal

```sql
select
  bool_or(pg_get_constraintdef(c.oid) like '%pending%') as any_check_mentions_pending,
  bool_or(pg_get_constraintdef(c.oid) like '%internal_draft_not_generated%') as has_internal_draft_not_generated,
  bool_or(pg_get_constraintdef(c.oid) like '%draft_generated_internal_only%') as has_draft_generated_internal_only,
  bool_or(pg_get_constraintdef(c.oid) like '%needs_revision%') as has_needs_revision,
  bool_or(pg_get_constraintdef(c.oid) like '%approved_for_customer%') as has_approved_for_customer
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'ai_sketch_reviews'
  and c.contype = 'c';
```

If `any_check_mentions_pending` is true, stop and review the exact constraint
definition before implementation.

### Duplicate Protection On concept_brief_id

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
  and pg_get_indexdef(ix.indexrelid) like '%concept_brief_id%'
order by i.relname;
```

This determines whether a future implementation can safely use
`concept_brief_id` as an upsert conflict target. If no unique index or unique
constraint protects `concept_brief_id`, do not implement upsert.

### Duplicate Rows By concept_brief_id

```sql
select concept_brief_id, count(*) as row_count
from public.ai_sketch_reviews
group by concept_brief_id
having count(*) > 1
order by row_count desc;
```

If this returns any rows, stop immediately and prepare a manual data-resolution
plan. Do not implement writes.

### Total Row Count

```sql
select count(*) as total_rows
from public.ai_sketch_reviews;
```

Use this to decide whether the table is still empty or whether existing
production state must be handled before write behavior is selected.

### Invalid Or Legacy Status Values

```sql
select review_status, count(*) as row_count
from public.ai_sketch_reviews
where review_status is null
  or trim(review_status) = ''
  or review_status not in (
    'internal_draft_not_generated',
    'draft_generated_internal_only',
    'needs_revision',
    'approved_for_customer'
  )
group by review_status
order by row_count desc;
```

If this returns any rows, stop and prepare a cleanup or migration decision. Do
not treat invalid or legacy statuses as approved.

### Approval And Revocation Metadata Columns

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_sketch_reviews'
  and column_name in (
    'approved_for_customer_at',
    'approved_by',
    'approval_revoked_at',
    'revoked_by',
    'updated_at'
  )
order by column_name;
```

If any approval/revocation metadata column is missing, stop before implementing
metadata writes.

## Decision Matrix After Precheck

If a unique constraint or unique index exists for `concept_brief_id` and no
duplicates exist:

- Future implementation may consider safe upsert by internal
  `concept_brief_id`.
- Still require explicit user approval before implementing writes.

If no unique constraint exists but the table is empty:

- Stop before implementation.
- Decide whether a separate approved SQL constraint planning/manual SQL flow is
  needed.
- Do not implement upsert without duplicate protection.

If duplicates exist:

- Stop immediately.
- Require a manual data-resolution plan.
- Do not implement write behavior.

If invalid or legacy statuses exist:

- Stop and decide whether cleanup or migration is needed.
- Do not treat invalid values as approved.
- Do not normalize invalid persisted values into approval.

If admin identity source is unclear:

- Do not set `approved_by` or `revoked_by` blindly.
- Either approve a safe MVP fallback such as `admin-mvp` or block approval
  metadata implementation until real admin identity exists.

If same-origin or CSRF safeguards are unclear:

- Stop before implementation.
- Add a separate auth/CSRF decision note before code changes.

## Future Implementation Scope Recommendation

The conservative recommendation is update-only first unless duplicate
protection and row-creation policy are explicitly confirmed.

Recommended order:

1. Complete the manual read-only precheck.
2. Review the results without pasting customer data, row IDs, note values, or
   sensitive content into docs or chat.
3. Decide whether update-only, insert, or upsert is allowed.
4. If a SQL constraint is required, handle it through a separate approved SQL
   planning/execution flow.
5. Only then start a future app-code implementation PR.

No write implementation should start until the manual precheck is completed and
explicitly approved by the user.

If SQL constraint changes are required, they must not be silently included in
an app-code PR.

## Future Writable Fields

Future app write behavior, if later approved, must remain limited to:

- `review_status`
- `revision_instruction`
- `approved_for_customer_at`
- `approved_by`
- `approval_revoked_at`
- `revoked_by`
- `updated_at` if app-managed

Explicitly excluded:

- `reviewer_note`
- `customer_safe_note`
- customer-visible delivery fields
- gallery approval fields
- email delivery fields
- payment fields
- points fields
- auth fields
- CAD fields
- order or production fields

`revision_instruction` is internal admin workflow text. It must not be treated
as customer-facing copy and must not be emailed or delivered to customers by
this write path.

## Customer Boundary Precheck

Future write behavior must preserve these boundaries:

- The write path is admin-only.
- Customer pages must not read or display unreviewed AI sketches.
- `approved_for_customer` does not mean `approved_for_gallery`.
- `approved_for_customer` does not automatically trigger email or customer
  delivery.
- Customer-facing sketch delivery remains a future separate workflow after
  human review, optimization, and approval.
- No public gallery automation is allowed.
- AI generation success alone must never approve a sketch.
- Codex is used to develop the controlled admin/backend system, not to operate
  Production as a full-access autonomous agent.

## Stop Conditions

Stop before implementation if any of the following are needed or discovered:

- SQL needed
- missing unique constraint or unclear duplicate protection
- duplicates exist
- schema mismatch
- invalid or legacy statuses exist
- admin identity unavailable or unclear
- auth or CSRF protection unclear
- need to read, write, select, inspect, or expose `reviewer_note`
- need to read, write, select, inspect, or expose `customer_safe_note`
- need to expose customer-facing sketches
- need to trigger email or customer delivery
- need to touch env, secrets, or deploy
- need to alter RLS, grants, policies, schema, storage, or migrations
- package or dependency changes required
- need to add payment, points, auth, CAD, order, production, OpenAI, image
  generation, image storage, or gallery behavior

## Validation For This Docs-only PR

Expected validation:

- `git status --short --branch`
- `git diff --check`
- after path-specific staging of the intended docs files:
  `git diff --cached --check`

No build is required because this PR is docs-only and changes no app behavior.

## Next Step

The next step after this PR is reviewed should be Final PR Check / Ready
decision. After that, the user should decide whether to run the manual
read-only precheck packet.

Implementation must not start automatically from this packet.
