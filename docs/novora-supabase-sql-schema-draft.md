# NOVORA Supabase SQL Schema Draft

## 1. Purpose

This document converts the Agent 11 schema plan into a future Supabase/Postgres SQL draft for review.

This is not a migration file. This SQL is not executed. This document does not create database tables. This document does not connect the app to Supabase.

Future implementation agents must turn approved parts of this draft into reviewed migration files later, in separate implementation PRs.

## 2. Relationship to previous docs

This SQL draft follows the direction documented in:

- `docs/novora-real-ai-sketch-generation-architecture.md`
- `docs/novora-database-storage-provider-decision.md`
- `docs/novora-supabase-project-env-checklist.md`
- `docs/novora-supabase-schema-plan.md`

Those documents define the future AI sketch workflow, recommend Supabase Postgres plus Supabase Storage for the first backend MVP, plan manual Supabase setup, and outline the future schema. This document translates the schema plan into a documentation-only SQL draft without creating migrations, tables, storage buckets, environment variables, backend routes, or provider connections.

## 3. SQL draft assumptions

- Supabase Postgres is the target database.
- UUID primary keys are preferred for internal records.
- `public_reference` should be customer-safe and separate from internal UUIDs.
- Timestamps should use timezone-aware fields where appropriate.
- `jsonb` can preserve raw front-end intake payloads while structured fields support filtering and review.
- Customer data is sensitive.
- Row Level Security and auth must be planned before real production data is stored.
- Future migrations may need to confirm whether `gen_random_uuid()` is available in the target Supabase project before using UUID defaults.

## 4. Status value strategy

For the MVP, statuses should begin as `text` fields with documented allowed values and application-level validation.

Stricter check constraints or Postgres enums can be added later when real NOVORA workflows stabilize. This avoids over-locking early operational states before submission review, AI generation, regeneration, admin review, and customer visibility rules have been tested in practice.

## 5. Draft SQL warning block

**Draft only. Do not run directly in production. Convert to reviewed migration files in a later implementation PR.**

## 6. Draft table SQL: `concept_briefs`

```sql
create table public.concept_briefs (
  id uuid primary key default gen_random_uuid(),
  public_reference text unique not null,
  status text not null,
  piece_type text,
  design_structure text,
  sub_structure text,
  stone_direction text,
  accent_stone_direction text,
  metal_direction text,
  finish_direction text,
  size_or_measurement_notes text,
  budget_direction text,
  emotional_intent text,
  customer_notes text,
  raw_brief_payload jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.concept_briefs is
  'Draft only. Stores future NOVORA Concept Brief parent records. This is not CAD approval, quote approval, or production approval.';

comment on column public.concept_briefs.public_reference is
  'Customer-safe reference separate from internal UUIDs.';

comment on column public.concept_briefs.raw_brief_payload is
  'Preserves the original front-end intake payload for audit, debugging, and future prompt-building review.';
```

## 7. Draft table SQL: `concept_brief_contacts`

```sql
create table public.concept_brief_contacts (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete cascade,
  customer_name text,
  email text,
  phone_or_whatsapp text,
  country_or_region text,
  preferred_contact_method text,
  contact_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.concept_brief_contacts is
  'Draft only. Contact data is sensitive customer data. Admin auth is required before real data storage or display.';
```

## 8. Draft table SQL: `concept_brief_reference_assets`

```sql
create table public.concept_brief_reference_assets (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete cascade,
  asset_type text,
  original_filename text,
  storage_bucket text,
  storage_key text,
  mime_type text,
  file_size_bytes bigint,
  upload_status text,
  customer_visible boolean not null default false,
  admin_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.concept_brief_reference_assets is
  'Draft only. Stores metadata for customer reference assets, not raw file blobs.';

comment on column public.concept_brief_reference_assets.storage_key is
  'Internal storage object key. Do not expose raw storage keys to customers.';

comment on column public.concept_brief_reference_assets.storage_bucket is
  'Uploaded references should default to private storage buckets.';
```

## 9. Draft table SQL: `ai_sketch_jobs`

Allowed `status` values for the MVP draft:

- `pending`
- `generating`
- `succeeded`
- `failed`
- `cancelled`

```sql
create table public.ai_sketch_jobs (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete cascade,
  status text not null,
  trigger_source text,
  prompt_version text,
  prompt_text text,
  model text,
  quality text,
  size text,
  attempt_count integer not null default 0,
  max_attempts integer not null default 1,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_sketch_jobs is
  'Draft only. Tracks future server-side AI sketch generation attempts linked to a Concept Brief.';
```

## 10. Draft table SQL: `ai_sketch_outputs`

```sql
create table public.ai_sketch_outputs (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete cascade,
  ai_sketch_job_id uuid references public.ai_sketch_jobs(id) on delete set null,
  status text not null,
  storage_bucket text,
  storage_key text,
  image_url text,
  width integer,
  height integer,
  model text,
  quality text,
  generation_cost_estimate numeric,
  customer_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_sketch_outputs is
  'Draft only. Stores generated AI sketch output metadata after server-side generation and storage.';

comment on column public.ai_sketch_outputs.customer_visible is
  'Defaults false. Outputs should become customer-visible only after admin review approval.';

comment on column public.ai_sketch_outputs.image_url is
  'May be temporary, signed, or server-mediated later. Do not assume permanent public URLs.';
```

## 11. Draft table SQL: `ai_sketch_reviews`

Allowed `review_status` values for the MVP draft:

- `needs_review`
- `approved_for_customer`
- `needs_regeneration`
- `unsuitable`
- `internal_only`

```sql
create table public.ai_sketch_reviews (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete cascade,
  ai_sketch_output_id uuid not null references public.ai_sketch_outputs(id) on delete cascade,
  review_status text not null,
  reviewed_by text,
  admin_notes text,
  customer_safe_summary text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_sketch_reviews is
  'Draft only. Stores future admin review decisions for generated AI sketch outputs.';
```

## 12. Draft table SQL: `admin_notes`

```sql
create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id) on delete cascade,
  note_type text,
  note_body text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.admin_notes is
  'Draft only. Internal notes should never be customer-visible by default.';

comment on column public.admin_notes.created_by is
  'Should become an authenticated admin identity later after real admin auth exists.';
```

## 13. Draft index plan

These are draft indexes only. A future real migration should validate query patterns first before adding indexes.

```sql
create index concept_briefs_status_idx
  on public.concept_briefs (status);

create index concept_briefs_piece_type_idx
  on public.concept_briefs (piece_type);

create index concept_briefs_created_at_idx
  on public.concept_briefs (created_at);

create index concept_briefs_public_reference_idx
  on public.concept_briefs (public_reference);

create index concept_brief_contacts_email_idx
  on public.concept_brief_contacts (email);

create index ai_sketch_jobs_status_idx
  on public.ai_sketch_jobs (status);

create index ai_sketch_outputs_status_idx
  on public.ai_sketch_outputs (status);

create index ai_sketch_reviews_review_status_idx
  on public.ai_sketch_reviews (review_status);
```

## 14. Draft RLS planning notes

Do not treat this section as final production policy.

Planning notes:

- Enable RLS before storing real customer data.
- Customers must not be able to read all `concept_briefs`.
- Admin access requires real admin auth.
- Service role operations must stay server-side.
- Storage objects should be private by default.
- Customer-visible outputs should only appear after review approval.
- Browser-visible Supabase anon access is safe only when paired with reviewed RLS and storage policies.

Pseudo only, not production-ready:

```sql
-- Pseudo only. Do not use as production policy.
alter table public.concept_briefs enable row level security;

-- Pseudo only. Real customer access needs auth/session design first.
-- create policy "customers can read their own approved brief state"
--   on public.concept_briefs
--   for select
--   using (...);

-- Pseudo only. Real admin access needs authenticated admin roles first.
-- create policy "admins can manage concept briefs"
--   on public.concept_briefs
--   for all
--   using (...);
```

## 15. Draft migration sequence

Recommended later sequence for turning this document into real migrations:

1. Migration 1: `concept_briefs` and `concept_brief_contacts`.
2. Migration 2: reference asset metadata.
3. Migration 3: AI sketch jobs, outputs, and reviews.
4. Migration 4: admin notes.
5. Migration 5: indexes and check constraints.
6. Migration 6: RLS draft.
7. Migration 7: storage policy draft.

Each migration should be reviewed independently and should preserve the current product boundary between Concept Briefs, AI sketches, CAD, quote approval, sourcing, payment, and production.

## 16. Validation checklist before real migration

- [ ] Supabase project exists.
- [ ] Environment variables are approved.
- [ ] Storage bucket names are approved.
- [ ] Admin auth direction is decided.
- [ ] RLS policy direction is reviewed.
- [ ] Retention and deletion policy is reviewed.
- [ ] Table names are approved.
- [ ] Status values are approved.
- [ ] Migration is reviewed before execution.
- [ ] Backup/export approach is considered.

## 17. Product boundary reminders

- Concept Brief is not a paid order.
- AI sketch is not CAD.
- AI sketch approval is not quote approval.
- AI sketch approval is not gemstone sourcing confirmation.
- AI sketch approval is not production approval.
- CAD, pricing, sourcing, production, QC, logistics, and payment remain later controlled NOVORA workflows.

## 18. Strict non-goals for this documentation PR

This documentation PR intentionally does not include:

- App code changes.
- Test changes.
- Package changes.
- Supabase SDK additions.
- SQL migration file additions.
- Database table creation.
- Environment variable additions.
- `.env` file creation.
- Vercel config changes.
- Backend route additions.
- Storage implementation.
- Real upload behavior.
- Real AI generation.
- OpenAI API calls.
- Payment integration.
- Email integration.
- Login/auth implementation.
- PDF generation.
- Production behavior changes.

The current NOVORA app remains front-end-only and mock-only for submission, sketch preview, and admin review until later implementation PRs deliberately change that behavior.
