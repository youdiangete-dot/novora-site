# NOVORA Supabase Schema Plan

## 1. Purpose

This document plans the future Supabase Postgres schema for NOVORA's first real backend MVP.

It is a planning document only. It does not create database tables, add SQL migrations, connect the app to Supabase, add provider SDKs, or change production behavior. Its purpose is to prepare future implementation PRs so they can add the real schema safely, one step at a time.

## 2. Relationship to previous docs

This schema plan follows the direction already documented in:

- `docs/novora-real-ai-sketch-generation-architecture.md`
- `docs/novora-database-storage-provider-decision.md`
- `docs/novora-supabase-project-env-checklist.md`

The architecture document defines the future server-controlled AI sketch workflow. The provider decision recommends Supabase Postgres plus Supabase Storage as NOVORA's first real backend MVP direction. The Supabase checklist documents manual setup and future environment variable planning. This document turns those decisions into a practical database schema plan without implementing the schema.

## 3. Current mock data state

The current NOVORA experience remains front-end-only and mock-only:

- `/design/concept` collects concept intake data.
- `/design/brief` stores submitted Concept Brief metadata in the browser with `localStorage`.
- `/design/submitted` displays local submitted metadata.
- `/design/sketch` displays a mock AI sketch preview.
- `/admin/briefs` and `/admin/briefs/[id]` display mock admin review data.

`localStorage` is not a real database. Admin review is not persisted. Customer reference uploads are not actually stored. AI sketch jobs are not real yet. Any current submitted brief, sketch preview, or admin status should be treated as a browser-side simulation.

## 4. MVP data scope

The first real backend MVP should store:

- Concept Brief records.
- Customer contact fields.
- Piece and design intake fields.
- Reference asset metadata.
- AI sketch job records.
- AI sketch output records.
- AI sketch admin review records.
- Internal admin notes.
- Submission status and timestamps.

Later workflow areas should not be part of the first schema implementation:

- Payment records.
- Full customer accounts.
- Production orders.
- CAD file management.
- Quote approval workflow.
- Shipment tracking.
- Dispute or chargeback system.

## 5. Proposed tables overview

Planned MVP tables:

- `concept_briefs`
- `concept_brief_contacts`
- `concept_brief_reference_assets`
- `ai_sketch_jobs`
- `ai_sketch_outputs`
- `ai_sketch_reviews`
- `admin_notes`

Planned later tables:

- `cad_requests`
- `quotes`
- `production_orders`
- `order_timeline_events`
- `customer_accounts`
- `payments`
- `shipment_records`

## 6. Table: `concept_briefs`

Purpose: stores the durable parent record for each submitted customer Concept Brief.

Proposed fields:

- `id`
- `public_reference`
- `status`
- `piece_type`
- `design_structure`
- `sub_structure`
- `stone_direction`
- `accent_stone_direction`
- `metal_direction`
- `finish_direction`
- `size_or_measurement_notes`
- `budget_direction`
- `emotional_intent`
- `customer_notes`
- `raw_brief_payload`
- `submitted_at`
- `created_at`
- `updated_at`

`raw_brief_payload` can preserve the original front-end intake data while structured fields support admin filtering, future prompt building, and reporting. `public_reference` should be customer-safe and should not reveal internal database IDs.

## 7. Table: `concept_brief_contacts`

Purpose: stores contact details linked to a Concept Brief.

Proposed fields:

- `id`
- `concept_brief_id`
- `customer_name`
- `email`
- `phone_or_whatsapp`
- `country_or_region`
- `preferred_contact_method`
- `contact_note`
- `created_at`
- `updated_at`

Contact data is sensitive customer data. Admin auth and access control are required before real contact data is stored or displayed in admin pages.

## 8. Table: `concept_brief_reference_assets`

Purpose: stores metadata for customer reference images or files linked to a Concept Brief.

Proposed fields:

- `id`
- `concept_brief_id`
- `asset_type`
- `original_filename`
- `storage_bucket`
- `storage_key`
- `mime_type`
- `file_size_bytes`
- `upload_status`
- `customer_visible`
- `admin_visible`
- `created_at`
- `updated_at`

Customer uploaded references should default to private storage. The database should store metadata and storage keys, not raw image blobs.

## 9. Table: `ai_sketch_jobs`

Purpose: tracks each requested AI sketch generation attempt for a Concept Brief.

Proposed fields:

- `id`
- `concept_brief_id`
- `status`
- `trigger_source`
- `prompt_version`
- `prompt_text`
- `model`
- `quality`
- `size`
- `attempt_count`
- `max_attempts`
- `error_code`
- `error_message`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

Suggested `status` values:

- `pending`
- `generating`
- `succeeded`
- `failed`
- `cancelled`

## 10. Table: `ai_sketch_outputs`

Purpose: stores generated sketch output metadata linked to a Concept Brief and AI sketch job.

Proposed fields:

- `id`
- `concept_brief_id`
- `ai_sketch_job_id`
- `status`
- `storage_bucket`
- `storage_key`
- `image_url`
- `width`
- `height`
- `model`
- `quality`
- `generation_cost_estimate`
- `customer_visible`
- `created_at`
- `updated_at`

Suggested `status` values:

- `generated`
- `storage_failed`
- `needs_review`
- `approved`
- `rejected`
- `archived`

`customer_visible` should remain false until admin review approves the image. `image_url` may later be temporary, signed, or server-mediated instead of permanently public.

## 11. Table: `ai_sketch_reviews`

Purpose: records admin review decisions for generated AI sketch outputs.

Proposed fields:

- `id`
- `concept_brief_id`
- `ai_sketch_output_id`
- `review_status`
- `reviewed_by`
- `admin_notes`
- `customer_safe_summary`
- `reviewed_at`
- `created_at`
- `updated_at`

Suggested `review_status` values:

- `needs_review`
- `approved_for_customer`
- `needs_regeneration`
- `unsuitable`
- `internal_only`

## 12. Table: `admin_notes`

Purpose: stores internal notes related to a Concept Brief.

Proposed fields:

- `id`
- `concept_brief_id`
- `note_type`
- `note_body`
- `created_by`
- `created_at`
- `updated_at`

Internal notes should never be customer-visible by default. Real admin identity requires future auth before `created_by` can be trusted as an authenticated admin user.

## 13. Status lifecycle

Planned lifecycle from customer submission to approved sketch:

- `draft/browser-only before submit`
- `submitted`
- `received`
- `pending_ai_sketch`
- `generating_ai_sketch`
- `ai_sketch_needs_review`
- `ai_sketch_approved`
- `ai_sketch_failed`
- `manual_review_required`
- `cad_review_available_later`

AI sketch approval does not mean CAD approval. AI sketch approval does not mean quote approval, gemstone sourcing approval, production approval, payment approval, or shipment readiness. It only means an early concept sketch is safe to show to the customer.

## 14. Relationships and foreign keys

Planned relationships:

- One `concept_brief` has one contact record.
- One `concept_brief` can have many reference assets.
- One `concept_brief` can have many `ai_sketch_jobs`.
- One `ai_sketch_job` can have one or more `ai_sketch_outputs`.
- One `ai_sketch_output` can have one or more reviews over time.
- One `concept_brief` can have many `admin_notes`.

This PR intentionally does not write real SQL migration code.

## 15. Index and filtering plan

Future implementation should consider indexes for:

- `concept_briefs.status`
- `concept_briefs.piece_type`
- `concept_briefs.created_at`
- `concept_briefs.public_reference`
- `concept_brief_contacts.email`
- `ai_sketch_jobs.status`
- `ai_sketch_outputs.status`
- `ai_sketch_reviews.review_status`

Actual SQL indexes should be added later when implementing the real schema and validating query patterns.

## 16. RLS and access control planning

Row Level Security should be planned before real customer data is stored.

Public customers should not be able to read all Concept Briefs. Admin pages must require admin auth before reading customer data. Service role operations should happen server-side only. Storage access must be private by default. Customer-visible sketch outputs should only be exposed after admin approval.

This PR does not implement RLS policies.

## 17. Data retention and deletion planning

Future implementation should define retention and deletion rules before public launch:

- Customer reference images need retention rules.
- Rejected AI sketches need retention rules.
- Failed AI sketch jobs need cleanup rules.
- Admin notes may need longer internal retention.
- Customer deletion requests should be planned before real customer data is collected publicly.

Retention rules should account for privacy, operational review needs, storage cost, and customer trust.

## 18. Future SQL migration roadmap

Recommended future PR sequence:

- PR A: Create schema SQL draft only.
- PR B: Add `concept_briefs` and contact tables.
- PR C: Add reference asset metadata table.
- PR D: Add AI sketch job, output, and review tables.
- PR E: Add admin notes table.
- PR F: Add indexes and status constraints.
- PR G: Add RLS policy draft.
- PR H: Connect Concept Brief submission route.
- PR I: Connect admin list to database.
- PR J: Connect AI sketch job and output records.
- PR K: Connect approved customer sketch display.

Each future PR should stay narrow and preserve the boundary between early concept sketches and later CAD, quote, payment, and production workflows.

## 19. Strict non-goals for this documentation PR

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

The current NOVORA app remains front-end-only and mock-only until later implementation PRs deliberately change that behavior.
