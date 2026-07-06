# NOVORA Preview Lifecycle Feedback SQL Packet Draft

## 1. Purpose

This document drafts a future SQL packet for NOVORA's instant
customer-facing AI hand-sketch concept preview lifecycle and customer feedback
records.

This is planning only:

- No SQL is executed.
- No migration is created.
- No Supabase schema is changed.
- No app code is implemented.
- No route, UI, storage, provider, email, Vercel, or Production behavior is
  changed.

Any candidate SQL in this document is a draft planning aid only. It is not
ready for Production, must not be run from this task, and requires separate
owner review, schema verification, RLS/storage review, rollback planning, and
explicit SQL execution approval before use.

## 2. Confirmed product and approval boundaries

Documented Agent 60I through Agent 61D direction:

- Instant customer-facing first AI concept sketch preview is the intended MVP
  conversion path after Concept Brief submission.
- Limited beta remains invite-only.
- Limited beta size is 5-10 users.
- Target beta language options are English and Traditional Chinese.
- Automatic submission response is desired.
- Human correction remains available for structural logic errors, jewelry
  construction errors, production feasibility issues, inconsistent views,
  wrong setting logic, proportion problems, customer request mismatch, unsafe
  claims, correction, and regeneration.

The first sketch is a concept preview only. It is not CAD, not a quote, not
order approval, not payment approval, and not production approval. CAD, quote,
payment, order approval, and production approval remain offline and separately
confirmed.

`first_preview_ready` must remain separate from `approved_for_customer`.
`approved_for_customer` historically means human-approved/customer-safe
delivery for a specific output. A first preview may mean an early
customer-facing concept preview is available, but it must not imply human
approval, gallery approval, CAD approval, quote approval, order approval,
payment approval, or production approval.

## 3. Known schema context

Known or documented tables and storage buckets:

| Item | Known or likely responsibility | Unknowns requiring future read-only schema verification |
| --- | --- | --- |
| `concept_briefs` | Existing submitted Concept Brief parent record. It owns the customer request and customer-visible `public_reference` / `NOVORA-CB-...` semantics. | Exact columns, constraints, status values, RLS, grants, policies, indexes, and current row assumptions. |
| `concept_brief_contacts` | Existing contact rows linked to Concept Briefs. | Exact columns, constraints, access posture, and privacy controls. |
| `concept_brief_reference_assets` | Existing uploaded reference metadata linked to Concept Briefs and private reference storage. | Exact storage fields, visibility fields, access policy, and retention fields. |
| `ai_sketch_jobs` | Documented/live AI sketch generation orchestration table for jobs, retries, status, and metadata. | Exact live columns, allowed statuses, purpose fields, idempotency fields, retry fields, RLS, policies, and indexes. |
| `ai_sketch_outputs` | Documented/live generated output metadata table linked to jobs and Concept Briefs. | Exact live columns, output type fields, visibility fields, storage fields, metadata fields, RLS, policies, and indexes. |
| `ai_sketch_reviews` | Existing/live human review decision table for generated outputs. Prior verification found `concept_brief_id`, `ai_sketch_output_id`, `review_status`, `reviewer_note`, `customer_safe_note`, `reviewed_at`, and `created_at`; later user-reported SQL added duplicate protection on `concept_brief_id`. | Current exact constraint names, status CHECK details, default, trigger posture, RLS, policies, and whether newer fields exist. |
| `admin_notes` | Existing persisted admin review status and internal notes for protected admin workflow. | Exact columns, note taxonomy, linkage, RLS, and whether any fields overlap with preview notes. |
| `concept_brief_notification_events` | Existing durable admin notification idempotency table. The ledger documents service-role-only access and a unique delivery index. | Exact columns, constraints, indexes, and whether any event table should be reused for analytics later. |
| `novora-reference-images` | Existing Supabase Storage bucket for customer reference images. | Exact storage policy, path shape, signed URL strategy, and customer visibility posture. |
| `novora-ai-sketches` | Existing Supabase Storage bucket for generated AI sketch outputs. | Exact storage policy, path shape, signed URL strategy, generated output visibility posture, and retention rules. |

This packet does not claim undocumented columns are already present. Any column
not confirmed in the current project ledger or specific schema verification
docs must be treated as requiring future read-only schema verification.

## 4. SQL packet design principles

Future SQL should follow these principles:

- Keep this packet docs-only until a separate SQL execution task is approved.
- Split create and update behavior explicitly; do not hide state transitions
  behind blind upsert.
- Prevent duplicate first-preview generation on refresh, retry, redirect, or
  repeated route visits.
- Keep customer preview lifecycle state separate from human review state.
- Keep customer preview lifecycle state separate from CAD, quote, payment,
  order, gallery, and production approval.
- Keep privileged fields server-only.
- Separate customer-safe notes from internal reviewer notes.
- Do not expose internal UUIDs, storage keys, provider payloads, raw prompts,
  or admin notes through customer routes.
- Review RLS and storage policies before execution and before any customer
  preview route reads or writes records.

## 5. Recommended data model direction

Recommended future direction:

- Add a dedicated preview lifecycle table for customer-facing preview progress.
- Add a dedicated customer feedback table for append-only or history-preserving
  feedback.
- Reuse `ai_sketch_jobs` for generation orchestration, attempts, idempotency,
  provider metadata, and failure/delay handling.
- Reuse `ai_sketch_outputs` for generated image output metadata, storage
  linkage, output type, version metadata, and visibility flags.
- Keep `ai_sketch_reviews` focused on human review, correction, and the
  historical `approved_for_customer` boundary.

This is safer than overloading `approved_for_customer` because the new product
direction may show a first concept preview quickly, while
`approved_for_customer` remains a human-review/customer-safe delivery concept.
Generation success, output visibility, customer feedback, and human approval
are separate facts and should remain separate in schema and app code.

## 6. Preview lifecycle table draft

Candidate table concept:

`concept_brief_preview_lifecycle`

Candidate fields only:

- `id`
- `concept_brief_id`
- `public_reference` or a safe token reference
- `preview_status`
- `current_first_preview_output_id`
- `current_revision_output_id`
- `customer_language`
- `customer_visible_status`
- `customer_safe_note`
- `internal_status_note`
- `human_followup_needed`
- `created_at`
- `updated_at`
- `first_preview_ready_at`
- `delayed_at`
- `failed_at`
- `closed_at`

These are candidate planning fields only. A future SQL task must verify the
live schema, naming conventions, foreign keys, status strategy, RLS posture,
and whether `public_reference` should be duplicated or joined from
`concept_briefs`.

## 7. Preview lifecycle status draft

Candidate preview lifecycle values:

- `submitted`
- `structuring_brief`
- `design_spec_ready`
- `hand_sketch_instruction_ready`
- `sketch_generation_queued`
- `sketch_generating`
- `first_preview_ready`
- `generation_delayed`
- `generation_failed`
- `preview_unavailable`
- `customer_feedback_submitted`
- `revision_requested`
- `revision_generating`
- `revised_preview_ready`
- `human_followup_needed`
- `closed_or_archived`

`first_preview_ready` is not `approved_for_customer`.
`revised_preview_ready` is not `approved_for_customer` unless a separate human
approval process explicitly approves that specific output later.

These values are planning candidates only. A future task must decide whether
to use a CHECK constraint, enum, lookup table, or application-level validation.

## 8. Customer feedback table draft

Candidate table concept:

`concept_brief_preview_feedback`

Candidate fields only:

- `id`
- `concept_brief_id`
- `preview_lifecycle_id`
- `ai_sketch_output_id` or `preview_output_id`
- `public_reference` or a safe token reference
- `feedback_type`
- `customer_message`
- `requested_changes`
- `selected_style_direction`
- `mismatch_reported`
- `human_followup_requested`
- `language`
- `customer_visible`
- `internal_only`
- `created_at`
- `reviewed_at`
- `reviewed_by`
- `reviewer_note`
- `customer_safe_note`
- `status`

Feedback should preserve history and should not overwrite the original Concept
Brief, generated output, or previous feedback. Customer feedback does not mean
CAD approval, quote approval, order approval, payment approval, or production
approval.

## 9. Feedback status draft

Candidate feedback statuses:

- `received`
- `triage_needed`
- `human_review_needed`
- `revision_requested`
- `regeneration_requested`
- `customer_safe_response_ready`
- `closed`

Customer-visible statuses should be limited to safe, non-technical states such
as received, under review, revision in progress, response ready, or closed when
a future UI copy plan approves them. Internal-only statuses include human
review routing, regeneration decision, reviewer note handling, provider or
prompt diagnostics, and any unsafe or production-feasibility notes.

## 10. `ai_sketch_jobs` integration draft

Future SQL may need `ai_sketch_jobs` to support:

- Generation purpose: `first_preview`, `revision_preview`, `internal_draft`,
  or `admin_corrected`.
- `concept_brief_id` linkage.
- Idempotency key.
- Attempt number and max attempts.
- Job status.
- Prompt version.
- Design Spec version.
- Hand Sketch Instruction version.
- NOVORA sketch style version.
- NOVORA branding instruction version.
- Provider/model/size/quality metadata.
- Cost estimate.
- Retry relationship.
- Sanitized failure reason.
- `started_at`, `completed_at`, and `failed_at`.

Do not claim these columns already exist unless future read-only verification
confirms them. If changes are needed, they should be candidate `ALTER TABLE`
ideas only, reviewed against live `ai_sketch_jobs` shape before execution.

## 11. `ai_sketch_outputs` integration draft

Future SQL may need `ai_sketch_outputs` to support:

- `job_id`
- `concept_brief_id`
- Output type: `first_preview`, `revision_preview`, `internal_draft`, or
  `admin_corrected`
- Storage bucket and object path
- Visibility flag
- `customer_visible_at`
- `rejected_at`
- Rejection reason
- Checksum or hash if useful
- Prompt/spec/style versions
- Provider output metadata if safe
- Width, height, and format

Customer-visible output is not final approval. It is not CAD approval, quote
approval, payment approval, order approval, production approval, or gallery
approval.

## 12. `ai_sketch_reviews` boundary draft

`ai_sketch_reviews` should remain human-review focused.

Required human review statuses documented by prior planning:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

This packet does not redefine those statuses. A future implementation should
not use `approved_for_customer` as a synonym for `first_preview_ready`.
`approved_for_customer` should remain tied to a human-reviewed/customer-safe
output unless a future owner-approved migration deliberately changes the
review model.

## 13. Duplicate generation protection draft

Future constraints and indexes should support:

- One active first-preview job per `concept_brief_id`.
- Idempotency key uniqueness for generation purpose.
- One active preview lifecycle per `concept_brief_id`.
- Duplicate feedback prevention only where appropriate.
- Intentional revision history without blocking future revisions.
- Explicit create/update behavior instead of blind upsert.

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- DRAFT ONLY. Verify live schema, status values, and desired active statuses.
-- Candidate partial unique index for one active first-preview job per brief.
create unique index concept_brief_first_preview_active_job_draft_idx
  on public.ai_sketch_jobs (concept_brief_id)
  where generation_purpose = 'first_preview'
    and status in ('queued', 'generating');
```

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- DRAFT ONLY. Verify table name and lifecycle active-state policy first.
create unique index concept_brief_preview_lifecycle_active_draft_idx
  on public.concept_brief_preview_lifecycle (concept_brief_id)
  where preview_status not in ('closed_or_archived');
```

These examples are planning-only. They should not be used until future
read-only duplicate checks confirm no existing rows would violate the proposed
constraints.

## 14. Public reference / token draft

Future safe access planning:

- `public_reference` may be used if documented semantics remain unchanged.
- Internal UUIDs should not be exposed in customer URLs.
- A token, signed link, or server-mediated access check may be needed because
  `NOVORA-CB-...` public references may be too guessable for private generated
  assets.
- Token expiration and revocation may be needed.
- A preview token must not grant admin access.
- A preview token should expose only customer-safe preview data.
- Exact token strategy remains an open decision.

## 15. RLS policy draft

Candidate RLS direction:

- Customer preview reads must expose only customer-safe rows.
- Customer feedback writes should be validated by a server-side route or a
  safe reviewed policy.
- Service role remains server-only.
- Admin/internal notes remain protected.
- Provider metadata and internal failure reasons are not customer-readable.
- Production RLS changes need separate approval and verification.

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- PSEUDOCODE ONLY. Do not use as Production policy.
-- Future policy shape must be designed after token/session strategy is chosen.
alter table public.concept_brief_preview_lifecycle enable row level security;

-- create policy "customer can read safe preview lifecycle"
--   on public.concept_brief_preview_lifecycle
--   for select
--   using (
--     customer_visible_status is not null
--     and internal_status_note is null
--     and <future safe token or server-mediated access condition>
--   );
```

This is not final RLS policy. It is a placeholder for future security review.

## 16. Storage policy draft

Future storage direction:

- Generated sketches should be stored separately from reference images.
- Customer reference images remain under `novora-reference-images`.
- Generated sketch outputs should use `novora-ai-sketches` if that remains the
  approved bucket.
- Customer preview access should use signed URLs or a future approved public
  access strategy.
- Storage paths should avoid exposing private IDs.
- Provider raw metadata should not be exposed.
- Exact storage policy requires separate review.

No storage bucket, object, policy, signed URL behavior, or path strategy is
changed by this packet.

## 17. Candidate SQL packet outline

Future SQL packet order:

1. Read-only schema verification.
2. Create preview lifecycle table if approved.
3. Create feedback table if approved.
4. Add indexes and constraints.
5. Add or adjust `ai_sketch_jobs` fields if approved.
6. Add or adjust `ai_sketch_outputs` fields if approved.
7. Add RLS policies if approved.
8. Add storage policy changes if approved.
9. Add verification queries.
10. Add rollback queries.

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- DRAFT ONLY. Candidate table concept. Verify naming, FK policy, statuses,
-- RLS, and rollback before creating any table.
create table public.concept_brief_preview_lifecycle (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id),
  public_reference text,
  preview_status text not null,
  current_first_preview_output_id uuid,
  current_revision_output_id uuid,
  customer_language text,
  customer_visible_status text,
  customer_safe_note text,
  internal_status_note text,
  human_followup_needed boolean not null default false,
  first_preview_ready_at timestamptz,
  delayed_at timestamptz,
  failed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- DRAFT ONLY. Candidate feedback table concept. Verify privacy, retention,
-- feedback status model, and customer write path before execution.
create table public.concept_brief_preview_feedback (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id),
  preview_lifecycle_id uuid references public.concept_brief_preview_lifecycle(id),
  ai_sketch_output_id uuid,
  public_reference text,
  feedback_type text,
  customer_message text,
  requested_changes jsonb,
  selected_style_direction text,
  mismatch_reported boolean not null default false,
  human_followup_requested boolean not null default false,
  language text,
  customer_visible boolean not null default true,
  internal_only boolean not null default false,
  reviewed_at timestamptz,
  reviewed_by text,
  reviewer_note text,
  customer_safe_note text,
  status text not null default 'received',
  created_at timestamptz not null default now()
);
```

These blocks are intentionally incomplete drafts. They do not include final
CHECK constraints, indexes, RLS policies, storage policies, triggers, grants,
or rollback SQL.

## 18. Verification query draft

Future read-only verification queries should check:

- Candidate tables exist.
- Candidate constraints exist.
- Candidate indexes exist.
- Status values match the approved model.
- Duplicate active first-preview jobs do not exist.
- Duplicate active lifecycle records do not exist.
- Feedback records link to existing briefs, lifecycle records, and outputs.
- RLS is enabled where required.
- Required policies exist where approved.

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- FUTURE READ-ONLY VERIFICATION ONLY. Do not run in this task.
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'concept_brief_preview_lifecycle',
    'concept_brief_preview_feedback'
  )
order by table_name;
```

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- FUTURE READ-ONLY VERIFICATION ONLY. Do not run in this task.
with active_first_preview_jobs as (
  select concept_brief_id, count(*) as active_jobs
  from public.ai_sketch_jobs
  where generation_purpose = 'first_preview'
    and status in ('queued', 'generating')
  group by concept_brief_id
  having count(*) > 1
)
select count(*) as duplicate_active_first_preview_job_groups
from active_first_preview_jobs;
```

DRAFT SQL - NOT EXECUTED - DO NOT RUN UNTIL SEPARATELY APPROVED

```sql
-- FUTURE READ-ONLY VERIFICATION ONLY. Do not run in this task.
select
  schemaname,
  tablename,
  policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'concept_brief_preview_lifecycle',
    'concept_brief_preview_feedback'
  )
order by tablename, policyname;
```

Any future verification output should avoid exposing customer data, internal
UUIDs, notes, prompts, storage paths, provider payloads, or private content in
chat or documentation.

## 19. Rollback planning

Rollback planning should consider:

- Drop candidate tables only if empty or after an explicitly approved export.
- Drop candidate indexes and constraints only after confirming dependent app
  code is not relying on them.
- Revert enum or CHECK constraint changes carefully because they can block
  existing rows.
- Avoid data loss.
- Preserve submitted briefs and customer feedback unless explicit owner
  approval authorizes data deletion.
- Rollback requires explicit approval.

Rollback SQL is intentionally not finalized here because the exact future SQL
packet is not approved.

## 20. Migration ordering and dependency plan

Safe future order:

1. Run read-only schema verification first.
2. Create new tables before writing app code that depends on them.
3. Add constraints only after checking duplicates and current row shape.
4. Add RLS before exposing any customer route.
5. Connect app write path only after schema verification passes.
6. Connect live generation only after env, storage, rate-limit, cost, privacy,
   error handling, disclaimers, branding, and data model are ready.

Do not combine SQL execution, customer route implementation, live image
generation, storage policy changes, and Production verification in one broad
task.

## 21. Customer-visible vs internal-only data separation

Customer-visible:

- Preview image if customer-visible rules pass.
- Customer-safe status.
- Customer-safe note.
- Public reference.
- Selected language.
- Disclaimer text.

Internal-only:

- Provider metadata.
- Cost estimate.
- Internal failure reason.
- Reviewer notes.
- Prompt internals if not customer-safe.
- Service role paths.
- Admin correction flags.
- Model retry internals.

Customer-originated feedback text may later be shown back to the customer only
through a validated, customer-safe rendering path. Internal notes and provider
diagnostics must never be returned directly to customer routes.

## 22. Bilingual and localization data draft

Future data should plan for:

- Customer language.
- Feedback language.
- Customer-facing status locale.
- Traditional Chinese and English label support.
- Preserving original customer intent.
- Structured spec language handling.
- Disclaimer copy version.

Traditional Chinese should support Taiwan-market customers when that future
market direction is implemented. Localization should remain a product system,
not one-off text replacement, because later markets may affect language,
currency, sizing conventions, contact preferences, tax or shipping notes,
market-specific trust copy, and support flow.

## 23. Analytics event data draft

Future event planning may include:

- `brief_submitted`
- `preview_processing_viewed`
- `first_preview_ready`
- `first_preview_viewed`
- `feedback_submitted`
- `revision_requested`
- `human_followup_requested`
- `generation_failed`
- `generation_delayed`
- `time_to_first_preview`
- `preview_to_followup_conversion`

This packet does not implement analytics. Analytics should avoid private
prompts, provider payloads, customer contact details, reference images, and
sensitive free-text notes unless a future privacy-reviewed implementation
explicitly approves those fields and retention rules.

## 24. Implementation sequencing

Recommended future agents:

- Agent 61F: customer preview route skeleton behind mock states, no live image
  generation.
- Agent 61G: Design Spec JSON helper / fake fixture implementation or
  planning.
- Agent 61H: Hand Sketch Instruction builder implementation or planning.
- Agent 61I: server-side generation orchestration plan.
- Agent 61J: SQL execution packet review after owner approval.
- Later agent: live image API integration only after env, storage, rate-limit,
  cost, error handling, privacy, disclaimers, branding, and data model are
  ready.

Each future agent should stay narrow. SQL, UI, provider integration, storage,
feedback, privacy/legal, analytics, and Production verification should remain
separate approval boundaries unless a future task explicitly approves a
combined scope.

## 25. Open decisions

Unresolved decisions:

- Exact table names.
- Exact status names.
- Exact feedback table fields.
- Exact token strategy.
- Exact RLS policy shape.
- Exact storage policy.
- Exact `ai_sketch_jobs` alterations.
- Exact `ai_sketch_outputs` alterations.
- Exact maximum active jobs.
- Exact maximum retries.
- Exact retention / expiration policy.
- Exact analytics event table or provider.
- Exact owner approval for SQL execution.
- Exact Privacy / Terms timing.
- Final go/no-go owner.

Do not invent these answers during SQL or implementation work.

## 26. Stop conditions

Stop before any request to:

- Execute SQL in this Agent.
- Create migration files in this Agent.
- Mutate Supabase.
- Alter Production schema.
- Expose internal IDs in customer URLs.
- Use `approved_for_customer` as `first_preview_ready`.
- Present preview as CAD, quote, order, payment, or production approval.
- Remove disclaimers.
- Remove the human correction path.
- Expose provider keys client-side.
- Launch broad public traffic before beta, privacy, rate-limit, cost, and
  abuse controls are resolved.
- Connect live image generation before data, status, storage, and error
  handling are approved.

Also stop before app code, routes, UI, tests, package changes, assets,
protected admin access, email sending, Vercel/env changes, Production deploy,
PR merge, or cleanup unless a separate task explicitly approves that exact
scope.
