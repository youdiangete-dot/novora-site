# NOVORA Supabase Project and Environment Checklist

## 1. Purpose

This document is a manual setup and environment planning checklist for NOVORA's future Supabase-backed backend MVP.

It prepares the founder and future Codex agents to create and connect a Supabase project safely later, without changing the current app behavior.

This document does not:

- Create a Supabase project.
- Add environment variables.
- Connect the app to Supabase.
- Implement database, storage, upload, auth, or AI generation behavior.

It only prepares the next implementation steps so they can happen in small, reviewable PRs.

## 2. Relationship to previous docs

This checklist follows the direction set by:

- `docs/novora-database-storage-provider-decision.md`
- `docs/novora-real-ai-sketch-generation-architecture.md`

Agent 9 selected Supabase Postgres plus Supabase Storage as the default MVP direction for NOVORA's first real backend. Agent 8 defined the future AI sketch generation architecture, where Concept Briefs, AI sketch jobs, generated outputs, and admin review states are saved server-side before customer display.

This document turns those decisions into a practical manual setup checklist. It does not supersede the previous architecture or provider decision docs.

## 3. Manual Supabase project creation checklist

Use this checklist later when NOVORA is ready to create the real Supabase project. Do not complete these steps inside this documentation PR.

- [ ] Create or log into the Supabase account that will own NOVORA's production backend.
- [ ] Create a new Supabase project.
- [ ] Use a clear project name, such as `novora-production` or `novora-main`.
- [ ] Choose the project region carefully. Prefer a region that fits expected customer geography, founder operations, latency, and any future privacy requirements.
- [ ] Create a strong database password.
- [ ] Save the database password securely outside the repo, preferably in a password manager.
- [ ] Confirm the Supabase project URL in the Supabase dashboard.
- [ ] Confirm the anon/public key in the Supabase dashboard.
- [ ] Confirm that the service role key exists.
- [ ] Treat the service role key as server-only. It must never be exposed to browser code.
- [ ] Do not paste secrets into ChatGPT screenshots unless absolutely needed, and then only after masking them.
- [ ] Do not commit keys, passwords, connection strings, screenshots with visible secrets, or recovery codes into GitHub.

## 4. Supabase values to collect later

Collect these values only when implementation is ready. Do not add real values in this PR.

| Value name | Where to find it in Supabase | Public/browser-safe | Server-only | Intended future environment variable name | Notes |
| --- | --- | --- | --- | --- | --- |
| Supabase project URL | Project Settings, API | Yes | No | `NEXT_PUBLIC_SUPABASE_URL` | Browser-visible project URL. Safe only when paired with correct auth, RLS, and storage policies. |
| Supabase anon/public key | Project Settings, API | Yes, with correct policies | No | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-visible key. It must not grant admin behavior. |
| Supabase service role key | Project Settings, API | No | Yes | `SUPABASE_SERVICE_ROLE_KEY` | Highly privileged server key. Never expose through client components, logs, screenshots, or `NEXT_PUBLIC` variables. |
| Database connection string | Project Settings, Database | No | Yes | `SUPABASE_DATABASE_URL` | Server-only database connection value. Store securely and never commit. |
| Storage bucket for customer reference images | Storage section after bucket creation | Usually not secret | Usually server-controlled | `SUPABASE_STORAGE_BUCKET_REFERENCES` | Suggested bucket name: `novora-reference-images`. Use private access by default. |
| Storage bucket for generated AI sketches | Storage section after bucket creation | Usually not secret | Usually server-controlled | `SUPABASE_STORAGE_BUCKET_AI_SKETCHES` | Suggested bucket name: `novora-ai-sketches`. Customer display should require approval first. |
| Optional storage bucket for future CAD previews | Storage section after bucket creation | Usually not secret | Usually server-controlled | `SUPABASE_STORAGE_BUCKET_CAD_PREVIEWS` | Suggested bucket name: `novora-cad-previews`. Later only. CAD is not part of the current MVP. |
| Optional storage bucket for future quote/order attachments | Storage section after bucket creation | Usually not secret | Usually server-controlled | `SUPABASE_STORAGE_BUCKET_ORDER_ATTACHMENTS` | Suggested bucket name: `novora-order-attachments`. Later only, after quote/order flow exists. |

`NEXT_PUBLIC` values are browser-visible. They must never contain service-role secrets, database passwords, private connection strings, provider tokens, or any value that can perform privileged operations.

Implementation note: `lib/server/env.ts` now contains a server-only readiness skeleton for these future environment names. It returns presence/readiness metadata only, does not expose raw secrets, does not connect to Supabase or OpenAI, and does not require any variables to exist during normal builds.

Implementation note: `lib/server/supabase.ts` now contains a server-only Supabase client skeleton. It returns null when required environment values are missing, performs no queries or storage operations, and is not wired into pages or routes.

Implementation note: `app/api/concept-briefs/route.ts` now contains a Concept Brief API route skeleton. It validates a JSON payload and returns a safe skeleton response, but it does not write to Supabase; a future PR must connect persistence only after env, schema, RLS, and data-handling rules are ready.

## 5. Vercel environment variable checklist

When implementation is ready, Supabase-related variables will eventually be added in Vercel:

- Vercel project dashboard.
- Project Settings.
- Environment Variables.
- Production, Preview, and Development scopes.

Checklist for future setup:

- [ ] Do not add real variables in this PR.
- [ ] Do not commit `.env` files.
- [ ] Add Production variables only after the implementation that uses them is ready for production deployment.
- [ ] Add Preview variables later when preview deployments need real provider access for review.
- [ ] Add Development variables later if local or branch-specific testing needs them.
- [ ] Keep Production, Preview, and Development values separate when they point to different Supabase projects.
- [ ] After changing Vercel environment variables, create a new deployment so the app receives the updated values.

## 6. Local development environment checklist

Future local development may use `.env.local`, but this PR must not create or modify it.

- [ ] Use `.env.local` later only for local development.
- [ ] Keep `.env.local` gitignored.
- [ ] Never commit local secrets.
- [ ] Do not ask the founder to paste unmasked service role keys into code, GitHub issues, PR descriptions, or screenshots.
- [ ] Match local development variable names to Vercel variable names where possible.
- [ ] Prefer masked screenshots or dashboard paths over raw secret sharing.
- [ ] Rotate any secret immediately if it is accidentally exposed.

## 7. Recommended storage buckets

Default recommendation: use private buckets by default. Add signed URLs or server-mediated access later. Customer pages should show only approved images. Admin pages should access internal review images only after admin auth exists.

| Bucket | Phase | Purpose | Private/public recommendation | Customer-facing visibility | Admin visibility | Retention notes |
| --- | --- | --- | --- | --- | --- | --- |
| `novora-reference-images` | Required for MVP | Stores customer-uploaded inspiration or reference images linked to Concept Briefs. | Private by default. | Customer should see only their own relevant images later, through safe access rules. | Admin can review after admin auth exists. | Define limits for file count, file size, unsupported files, and customer deletion requests before launch. |
| `novora-ai-sketches` | Required for MVP | Stores generated AI concept sketch outputs linked to AI sketch jobs and review records. | Private by default. | Customer sees only approved sketches through signed or server-mediated access. | Admin can see generated outputs for review after admin auth exists. | Define retention for failed, rejected, regenerated, and approved sketches before repeated generation is enabled. |
| `novora-cad-previews` | Later | Stores future CAD preview files or rendered previews after a paid CAD workflow exists. | Private by default. | Customer visibility only after professional review and workflow approval. | Admin visibility after auth and workflow controls exist. | CAD is outside the current MVP and should have its own retention and access policy. |
| `novora-order-attachments` | Later | Stores future quote, order, production, or fulfillment attachments. | Private by default. | Customer visibility only for approved order materials. | Admin visibility after auth and audit controls exist. | Define retention and deletion policy before storing order documents or sensitive attachments. |

## 8. Security model notes

Future implementation must follow these rules:

- Supabase service role key is server-only.
- Service role key must never be used in client components.
- Service role key must never be exposed through `NEXT_PUBLIC` variables.
- Browser code should only use the public anon key where appropriate and only with correct Row Level Security policies.
- Row Level Security must be planned before real customer data is stored.
- Storage policies must be designed before uploads become public or customer-visible.
- Admin auth must be added before real admin pages display customer data.
- Do not store payment card data in Supabase.
- Do not expose raw storage keys, private URLs, or internal provider errors to customers.
- Server routes should validate inputs, file types, file sizes, and access permissions before database or storage writes.

## 9. Data privacy and screenshot rules

Founder-facing operational rules:

- Mask API keys before screenshots.
- Mask database passwords before screenshots.
- Mask customer emails and phone numbers in public debugging screenshots.
- Do not paste full service role keys into ChatGPT, GitHub issues, PR descriptions, or public support threads.
- Store passwords, recovery codes, and emergency access information in a password manager.
- Keep a simple private setup log outside the repo if needed.
- If a secret appears in a screenshot or commit by mistake, rotate it and document the rotation privately.
- Avoid sharing customer reference images publicly unless the customer has explicitly allowed it.

## 10. Future implementation readiness checklist

NOVORA is ready to move from docs to implementation only when:

- [ ] Supabase project exists.
- [ ] Project URL and keys are collected securely.
- [ ] Vercel environment variable plan is approved.
- [ ] Storage bucket naming is approved.
- [ ] Database schema draft is approved.
- [ ] Admin auth direction is decided.
- [ ] Retention and deletion policy is drafted.
- [ ] Implementation PR scope is limited to one area.
- [ ] Product boundary is preserved: Concept Briefs and AI sketches are early design direction, not CAD, quote, payment, or production approval.

## 11. Future PR roadmap after this checklist

Recommended future PR sequence:

- PR A: Supabase schema planning document.
- PR B: Supabase manual setup verification doc update.
- PR C: Server-side env guard and config helper skeleton.
- PR D: Database client skeleton without real queries.
- PR E: Concept Brief database submission route.
- PR F: Storage bucket access helper skeleton.
- PR G: Reference image upload route.
- PR H: Admin list reads from database.
- PR I: AI sketch job/output storage integration.
- PR J: Admin review persistence.
- PR K: Customer approved sketch display from database/storage.
- PR L: Auth, RLS policies, rate limits, audit logs, retention policy.

Each future PR should stay narrow. Avoid combining Supabase setup, database schema, storage uploads, AI generation, admin review, auth, and customer display in one change.

## 12. Strict non-goals for this documentation PR

This documentation PR intentionally does not include:

- App code changes.
- Test changes.
- Package changes.
- Supabase SDK additions.
- Environment variable additions.
- `.env` file creation.
- Vercel config changes.
- Backend route additions.
- Database implementation.
- Storage implementation.
- Real upload behavior.
- Real AI generation.
- OpenAI API calls.
- Payment integration.
- Email integration.
- Login/auth implementation.
- PDF generation.
- Production behavior changes.

The current NOVORA app remains front-end-only and mock-only for submission, sketch preview, and admin review until a future implementation PR deliberately changes that behavior.
