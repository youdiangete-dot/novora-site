# NOVORA Database and Image Storage Provider Decision

## 1. Purpose

NOVORA needs a durable database and image/object storage layer before real AI sketch generation, uploaded references, admin review, quote workflow, or future order tracking can become real production features.

The future system will need to save customer Concept Briefs, contact fields, reference upload metadata, generated AI sketch job records, generated sketch image storage keys or URLs, admin review status, and later CAD/request/quote/production workflow records.

This document recommends a practical provider direction for NOVORA's first real backend MVP. It is a decision document only. It does not implement the database, storage, backend routes, provider SDKs, environment variables, or production behavior.

## 2. Current state

The current NOVORA submission and review experience is front-end-only and mock-only:

- `/design/concept` collects the customer's concept intake choices.
- `/design/brief` creates front-end-only submitted brief metadata.
- `/design/submitted` shows a success state.
- `/design/sketch` shows a front-end-only/mock-only AI Sketch Preview page.
- `/admin/briefs` and `/admin/briefs/[id]` show front-end-only mock admin review pages.

There is no real backend, database, image storage, OpenAI API integration, email delivery, payment flow, login/auth, PDF generation, Vercel config change, or provider implementation behind these pages today.

Browser `localStorage` is not acceptable as NOVORA's future source of truth. It can support temporary front-end-only prototypes, but it is not durable, queryable, secure, multi-user, auditable, or appropriate for real customer data.

## 3. What NOVORA needs to store

NOVORA's durable backend should eventually store:

- Concept Brief records
- Customer contact fields
- Reference image metadata
- Uploaded reference files later
- AI sketch jobs
- Generated sketch outputs
- Admin review states
- Internal notes
- CAD request records later
- Quote records later
- Production/order timeline records later

The first implementation should focus on Concept Brief records, contact fields, reference asset metadata, AI sketch job/output records, and admin review state. CAD, quotes, production orders, and order timeline records should be designed as later workflow extensions.

## 4. Decision criteria

Provider options should be evaluated against these NOVORA-specific criteria:

- One-person founder simplicity
- Compatibility with Next.js and Vercel
- Low implementation complexity
- Secure handling of customer data
- Object storage support for images
- Private/public access control
- Future admin review workflow support
- Future login/auth compatibility
- Migration path
- Cost visibility
- Avoiding over-engineering
- Avoiding vendor lock-in where reasonable

NOVORA is a one-person operating business with offline CAD, design, factory, QC, and logistics handled outside the website. The MVP should prioritize a clear operating model over enterprise-grade infrastructure complexity.

## 5. Candidate provider options

### Option A: Supabase Postgres + Supabase Storage

What it gives NOVORA:

- A hosted Postgres database.
- Object storage for reference images and generated sketches.
- A single provider dashboard for database, storage, and future auth planning.
- A coherent place to connect storage objects to database records.

Advantages:

- Strong fit for a one-person founder because database and storage live in one ecosystem.
- Postgres foundation supports conventional relational records for briefs, jobs, reviews, quotes, and production timelines.
- Supabase Storage can keep customer reference images and generated sketches linked to database rows.
- Future auth/admin permissions can be planned inside the same ecosystem.
- Easier to document step by step for future implementation agents.

Disadvantages:

- Requires careful environment variable and service role key handling.
- Storage bucket policies and row-level security decisions must be made deliberately.
- Adds a non-Vercel platform to operate alongside Vercel hosting.
- The team must avoid exposing private storage URLs or service keys to browser code.

Complexity level:

- Medium, but contained because database and storage are in one provider.

Best use case:

- First real backend MVP where NOVORA wants durable database records, image storage, and a simple mental model.

MVP recommendation:

- Use this for NOVORA's first real backend MVP unless later implementation testing proves a strong reason to split storage out.

### Option B: Supabase Postgres + Vercel Blob

What it gives NOVORA:

- Supabase Postgres for durable relational records.
- Vercel Blob for image/object storage.
- Vercel-native storage operations while keeping Supabase as the database.

Advantages:

- Keeps Postgres in Supabase while using storage that aligns naturally with Vercel deployments.
- May be attractive if future implementation agents find Vercel Blob easier for generated sketch uploads and delivery.
- Separates database and object storage concerns.
- Can still store Blob URLs or keys in Supabase database records.

Disadvantages:

- Two provider surfaces instead of one.
- Requires separate permission, token, retention, and access-model decisions.
- Future auth/admin permission planning may be less unified than with Supabase-only.
- More documentation and operational coordination for a one-person business.

Complexity level:

- Medium.

Best use case:

- NOVORA wants Supabase for database and future auth planning, but wants the simplest Vercel-native image storage experience.

MVP recommendation:

- Good fallback if Vercel Blob proves materially simpler during implementation. Not the recommended default because it splits database and storage earlier than necessary.

### Option C: Neon Postgres + Vercel Blob

What it gives NOVORA:

- Neon-hosted Postgres for durable relational records.
- Vercel Blob for reference uploads and generated sketch images.
- A Vercel-aligned backend provider pairing.

Advantages:

- Strong compatibility with a Vercel-hosted Next.js app.
- Clean Postgres foundation for Concept Briefs, jobs, reviews, quotes, and production records.
- Vercel Blob may offer a simple developer experience for image storage in a Vercel deployment.
- Keeps infrastructure focused on database plus object storage without a broader platform.

Disadvantages:

- Requires separate auth/admin access decisions.
- Requires two provider permission models.
- Storage metadata and access rules must be carefully tied back to database rows.
- Less all-in-one than Supabase for a founder who wants a single dashboard and future auth path.

Complexity level:

- Medium.

Best use case:

- NOVORA wants a Vercel-native deployment posture and is comfortable using separate services for database and storage.

MVP recommendation:

- Reasonable alternative, but not the default. Supabase Postgres + Supabase Storage is simpler for the first one-person MVP because it keeps database, storage, and future auth planning closer together.

### Option D: Supabase or Neon Postgres + Cloudflare R2

What it gives NOVORA:

- Postgres from Supabase or Neon.
- S3-compatible object storage through Cloudflare R2.
- A storage path that may be attractive for larger image volume or long-term media archives.

Advantages:

- S3-compatible storage model.
- Good long-term option if generated image volume grows substantially.
- Can be paired with either Supabase or Neon for relational records.
- May help with future storage portability because S3-compatible patterns are widely understood.

Disadvantages:

- More setup and provider coordination than the MVP needs.
- Adds another platform for a one-person founder to manage.
- Signed URL, access, retention, and metadata-linking rules must be implemented carefully.
- Future agents must maintain a clearer boundary between database provider and storage provider.

Complexity level:

- Medium to high for the MVP.

Best use case:

- Later storage-heavy phase where NOVORA needs S3-compatible storage, stronger media archive controls, or a specific Cloudflare operating model.

MVP recommendation:

- Do not use by default for the first MVP. Consider later if image volume, egress patterns, or portability needs justify the extra complexity.

### Option E: AWS RDS/Postgres + S3

What it gives NOVORA:

- Enterprise-grade managed Postgres through AWS RDS.
- Mature object storage through S3.
- Deep customization and operational control.

Advantages:

- Mature infrastructure with extensive enterprise capabilities.
- Strong long-term option for large-scale systems with dedicated operations expertise.
- S3 is a durable, widely understood object storage foundation.
- Clear migration target if NOVORA later needs enterprise-level customization.

Disadvantages:

- Too operationally heavy for the first NOVORA MVP.
- More setup, IAM, networking, monitoring, and maintenance complexity.
- Slower for a one-person founder to operate safely.
- Higher risk of over-engineering before product workflows are validated.

Complexity level:

- High.

Best use case:

- Future enterprise-heavy stage where NOVORA has strong infrastructure requirements and enough operational capacity to manage AWS well.

MVP recommendation:

- Not recommended for the MVP unless there is a strong business, compliance, or infrastructure reason.

## 6. Recommended MVP choice

Recommended default for NOVORA's first real backend MVP:

**Supabase Postgres + Supabase Storage.**

Reasoning:

- One provider for database and image/object storage.
- Simpler mental model for a one-person operation.
- Postgres foundation for durable workflow records.
- Storage objects can be connected cleanly to database records.
- Future auth/admin permissions can be planned in the same ecosystem.
- Easier for future Codex agents to document and implement step by step.

Important caveat:

If the team wants the simplest Vercel-native image storage experience later, Vercel Blob can be considered for generated sketches and reference uploads while keeping Supabase or Neon for Postgres.

## 7. Why not implement immediately

The provider decision should come before implementation work such as:

- Adding SDKs
- Adding environment variables
- Adding upload routes
- Adding database schema
- Adding OpenAI image generation
- Adding admin real data views

Implementing before the provider decision risks leaking secrets into browser code, creating the wrong storage access model, overbuilding routes that must be rewritten, or storing real customer data without auth and retention rules.

## 8. Proposed future architecture after decision

### Frontend

- `/design/brief` submits real Concept Brief data.
- `/design/submitted` shows real saved brief status.
- `/design/sketch` reads approved sketch output.
- `/admin/briefs` reads database records.
- `/admin/briefs/[id]` reviews real brief and sketch data.

### Backend

- Server route or server action for Concept Brief submission.
- Server route for upload signed URL or upload handling.
- Server route for AI sketch job creation later.
- Server route for admin review state updates later.

### Database

- `concept_briefs`
- `concept_brief_contacts`
- `concept_brief_reference_assets`
- `ai_sketch_jobs`
- `ai_sketch_outputs`
- `ai_sketch_reviews`
- `cad_requests` later
- `quotes` later
- `production_orders` later
- `order_timeline_events` later

### Storage

- Customer reference images
- Generated AI sketch images
- Future CAD preview files
- Future quote/order attachments

## 9. Storage access model

The future storage model should use:

- Private buckets or private objects by default.
- Signed URLs or server-mediated access for customer and admin views.
- No direct public bucket for sensitive customer uploads.
- Customer-facing pages that show only approved images.
- Admin pages that can see internal review outputs after admin auth exists.
- Generated images linked to database records.

Storage keys should be treated as internal implementation details. Customer-facing pages should receive only the minimum URL or server-rendered asset access required for the approved view.

## 10. Security and privacy rules

Future implementation must follow these rules:

- Never store provider service keys in browser code.
- Use environment variables later.
- Keep upload, generation, and review operations server-side.
- Validate file type and size before storage.
- Avoid exposing raw storage keys unnecessarily.
- Avoid showing unreviewed generated images to customers.
- Add admin auth before real customer data is stored.
- Do not store payment card data in the NOVORA database.

These rules apply regardless of whether the final storage provider is Supabase Storage, Vercel Blob, Cloudflare R2, or S3.

## 11. Cost and operating model

Do not include exact provider pricing numbers in implementation docs unless they are verified from official provider documentation at implementation time.

Qualitative comparison:

- Supabase Postgres + Supabase Storage is likely the clearest MVP operating model because one provider handles both database and storage.
- Supabase Postgres + Vercel Blob or Neon Postgres + Vercel Blob may be operationally clean for a Vercel-hosted app, but they split provider responsibilities.
- Cloudflare R2 may become attractive if image storage volume grows or S3-compatible storage becomes important.
- AWS RDS/S3 is likely too operationally heavy until NOVORA needs enterprise-level control.

Future cost planning should consider:

- MVP simplicity
- Likely operational predictability
- Future scale
- Image storage growth
- Bandwidth and egress considerations
- Generated image retention policy
- Archive/delete policy

Generated image storage can grow quickly. NOVORA should define how long failed, unreviewed, rejected, and approved generated sketch outputs are retained before large-scale generation is enabled.

## 12. Migration strategy

Recommended future migration phases:

- Phase 1: Document decision only.
- Phase 2: Add provider environment checklist.
- Phase 3: Add schema draft.
- Phase 4: Add backend API skeleton without real provider calls.
- Phase 5: Connect database for Concept Brief submission.
- Phase 6: Connect storage for reference uploads.
- Phase 7: Connect AI sketch output storage.
- Phase 8: Connect admin review to real database.
- Phase 9: Add auth, rate limits, audit logs, and backup/export policy.

Each phase should be a separate, reviewable PR where possible. Implementation PRs should avoid combining provider setup, schema, uploads, AI generation, and admin review persistence all at once.

## 13. Risk analysis

Key risks:

- Choosing too many providers too early.
- Exposing private image URLs.
- Putting provider keys in client code.
- Relying on `localStorage`.
- Storing real customer data before admin auth exists.
- Overbuilding enterprise infrastructure too early.
- Not planning deletion/retention for customer images.
- Uncontrolled storage growth from generated AI images.

Mitigations:

- Start with one database and storage decision.
- Keep all secrets server-side.
- Use private storage by default.
- Add admin auth before real customer data is stored.
- Store image metadata and storage keys in database records.
- Define retention and deletion rules before enabling repeated generation.

## 14. Final recommendation

For NOVORA's first real backend MVP:

**Use Supabase Postgres + Supabase Storage unless a later implementation test proves a strong reason to split storage to Vercel Blob or Cloudflare R2.**

Keep Vercel as the hosting/deployment platform.

Do not use AWS RDS/S3 for the first MVP unless the project later needs enterprise-level customization and the founder is ready for higher operational complexity.

## 15. Future PR roadmap

- PR A: Backend provider environment checklist update.
- PR B: Database schema planning doc update.
- PR C: Supabase project setup manual checklist.
- PR D: Server-side environment guard and provider client skeleton.
- PR E: Concept Brief database submission route.
- PR F: Admin list reads from database.
- PR G: Reference image upload storage route.
- PR H: Generated AI sketch output storage route.
- PR I: Admin review state persistence.
- PR J: Customer approved sketch display from database/storage.
- PR K: Auth, rate limiting, audit log, and retention policy.

Future PRs should preserve NOVORA's product direction: AI sketches are early concept artifacts, while CAD, design, factory, QC, logistics, quotes, payment, and production remain controlled workflow steps handled separately.

## 16. Strict non-goals for this documentation PR

This documentation PR does not include:

- App code changes
- Database implementation
- Storage implementation
- Provider SDK dependency
- Environment variable changes
- Backend routes
- Real upload behavior
- Real AI generation
- Payment integration
- Email integration
- Login/auth
- PDF generation
- Production behavior changes

No provider should be configured from this document alone. It is intended to guide future implementation PRs after the provider decision is accepted.
