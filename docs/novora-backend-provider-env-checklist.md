# NOVORA Backend Provider and Environment Checklist

## 1. Purpose

This document helps choose backend providers and prepare environment variables before NOVORA implements real backend features, including:

- Real brief submission API
- Reference image upload storage
- Email notification
- Protected admin review
- Future CAD request flow
- Future payment/order center

This document does not implement any backend code. It is a planning and decision checklist only, intended to reduce provider lock-in, secret-handling mistakes, and premature production risk before implementation begins.

## 2. Current Production Safety Boundary

The current NOVORA system is a front-end-only submission MVP.

- Submitted concept brief data is stored in browser `localStorage` using the key `novora_submitted_concept_brief`.
- `/admin/briefs` and `/admin/briefs/[id]` are mock admin pages only.
- There is no real server-side persistence.
- There are no real reference image uploads.
- There is no real email delivery.
- There is no login or protected admin access.
- There is no payment flow.
- There is no CAD-ready production confirmation.

The current product experience should continue to communicate that a concept brief is exploratory and not a final CAD, production, payment, or order commitment.

## 3. Recommended Provider Options

### Database

#### Option A: Supabase Postgres

- Pros: Real Postgres database, strong dashboard, row-level security support, good fit with Supabase Storage/Auth if those are chosen later, straightforward local-to-production mental model.
- Cons: Requires careful service role key handling, schema/RLS decisions can become complex, another platform to configure outside Vercel.
- Complexity: Medium.
- Best fit for current NOVORA stage: Strong fit if NOVORA wants one platform for database, possible auth, and optional storage.
- Risk level: Medium, mostly around secret exposure and permission configuration.

#### Option B: Vercel Postgres / Neon

- Pros: Natural fit for a Vercel-hosted Next.js app, Postgres-backed, clean production deployment story, good scaling path for a conventional app database.
- Cons: Storage and auth still need separate decisions, less all-in-one than Supabase, operational details depend on the exact Vercel/Neon setup.
- Complexity: Medium.
- Best fit for current NOVORA stage: Good fit if the team wants database hosting closely aligned with Vercel deployments.
- Risk level: Medium, mostly around environment separation and schema migration discipline.

#### Option C: Airtable as Temporary Operational Database

- Pros: Very fast for internal review workflows, non-technical team members can inspect and edit records, useful while workflow shape is still changing.
- Cons: Not ideal as the durable production source of truth, API limits and schema looseness can become constraints, customer data/privacy handling must still be treated seriously.
- Complexity: Low to medium.
- Best fit for current NOVORA stage: Reasonable temporary bridge for operations, less ideal for the first durable backend architecture.
- Risk level: Medium, because convenience can blur production data governance.

### File Storage

#### Option A: Supabase Storage

- Pros: Pairs naturally with Supabase Postgres, supports bucket policies, good for reference image metadata linked to database rows.
- Cons: Access rules must be configured carefully, public/private URL decisions matter, storage and database permissions can be easy to over-broaden.
- Complexity: Medium.
- Best fit for current NOVORA stage: Strong fit if Supabase is also chosen for the database.
- Risk level: Medium, mostly around accidental public access or overly permissive policies.

#### Option B: Vercel Blob

- Pros: Good fit for Vercel-hosted apps, simple integration path, avoids managing a separate storage platform if the app is already Vercel-centric.
- Cons: Requires separate database metadata tracking, access model must be reviewed for customer reference images, may not align as tightly with Supabase Auth/RLS if those are selected.
- Complexity: Low to medium.
- Best fit for current NOVORA stage: Strong fit if speed and Vercel-native operations matter more than keeping database and storage in one provider.
- Risk level: Medium, mostly around token handling and URL access decisions.

#### Option C: Cloudflare R2

- Pros: S3-compatible object storage, cost-effective at scale, mature storage model, good long-term option for larger media volume.
- Cons: More setup and integration work, another platform to manage, may be more than the MVP needs.
- Complexity: Medium to high.
- Best fit for current NOVORA stage: Better as a scale-conscious option after upload requirements are clearer.
- Risk level: Medium, mostly around bucket permissions, signed URL handling, and operational complexity.

### Email

#### Option A: Resend

- Pros: Developer-friendly, strong fit for modern Next.js/Vercel workflows, good for transactional emails and simple internal notifications.
- Cons: Requires sender domain verification for production quality, templates and deliverability still need care.
- Complexity: Low to medium.
- Best fit for current NOVORA stage: Strong fit for the first backend email PR.
- Risk level: Low to medium, mostly around domain setup and accidentally sending misleading customer copy.

#### Option B: SendGrid

- Pros: Mature email platform, broad feature set, established deliverability tooling.
- Cons: More configuration surface than NOVORA likely needs at MVP, templates and account setup can feel heavier.
- Complexity: Medium.
- Best fit for current NOVORA stage: Good if the team already uses SendGrid or wants mature email operations from day one.
- Risk level: Medium, mostly around configuration complexity and deliverability setup.

#### Option C: Postmark

- Pros: Strong transactional email reputation, clear product focus, good deliverability tooling.
- Cons: Less broad marketing-email surface, may be over-specified if only a simple notification is needed first.
- Complexity: Low to medium.
- Best fit for current NOVORA stage: Good fit for reliable transactional confirmations if the team prefers Postmark's operational model.
- Risk level: Low to medium, mostly around domain setup and message boundary clarity.

### Payments for Later

#### Option A: Stripe

- Pros: Strong developer tooling, checkout and webhook support, good fit for future deposits, invoices, and order center workflows.
- Cons: Adds compliance and customer expectation complexity, webhooks must be handled carefully, should not be added before CAD/order boundaries are clear.
- Complexity: Medium to high.
- Best fit for current NOVORA stage: Good later, after CAD request and pricing confirmation flow is defined.
- Risk level: High if added too early, because payment may imply production commitment.

#### Option B: PayPal

- Pros: Familiar to many customers, can be useful for manual or international payment preferences.
- Cons: Less ideal as the primary custom order workflow engine, still requires clear order/payment state handling.
- Complexity: Medium.
- Best fit for current NOVORA stage: Possible later as an alternate payment method, not needed for first backend PR.
- Risk level: Medium to high if introduced before order state is designed.

#### Option C: Manual Invoice First

- Pros: Keeps human review in the loop, avoids premature automation, matches bespoke jewelry workflows where feasibility and pricing need confirmation.
- Cons: Less automated, requires internal process discipline, customer experience depends on timely follow-up.
- Complexity: Low.
- Best fit for current NOVORA stage: Strong fit for early custom jewelry operations before a full order center exists.
- Risk level: Low to medium, mostly around manual process consistency.

### Admin Auth

#### Option A: Supabase Auth

- Pros: Pairs well with Supabase database and storage, supports a path toward role-based internal access.
- Cons: Requires auth architecture decisions, RLS and admin access must be implemented carefully.
- Complexity: Medium.
- Best fit for current NOVORA stage: Good if Supabase is selected as the main backend platform.
- Risk level: Medium, mostly around misconfigured policies or role checks.

#### Option B: Clerk

- Pros: Polished auth product, strong admin/user management experience, good Next.js integration.
- Cons: Another provider, customer login temptation may expand scope, pricing and architecture should be considered.
- Complexity: Medium.
- Best fit for current NOVORA stage: Good if NOVORA wants best-in-class auth and expects customer accounts later.
- Risk level: Medium, mostly around scope creep and provider coordination.

#### Option C: Simple Vercel-Protected Internal Page First

- Pros: Fastest way to prevent public access while backend data remains limited, keeps MVP scope small.
- Cons: Not a full role-based admin system, may not be enough for multi-user operations, must be revisited before broader internal access.
- Complexity: Low.
- Best fit for current NOVORA stage: Strong temporary fit before showing real customer data publicly or broadly.
- Risk level: Low to medium, depending on how protection is implemented and who needs access.

## 4. Recommended MVP Stack

The most practical next MVP stack is likely:

- Supabase Postgres for database
- Supabase Storage or Vercel Blob for reference images
- Resend for email
- No payment in the first backend PR
- No customer login in the first backend PR
- Admin protection before showing real customer data

Supabase Postgres is a strong default if NOVORA wants a durable database with a clear path toward storage and auth under one provider. Vercel Postgres / Neon is also reasonable if the team wants the database experience to stay closely tied to Vercel. Airtable can help operations move quickly, but it should be treated as a temporary operational layer rather than the long-term production source of truth.

For reference images, Supabase Storage is attractive if Supabase is already chosen for the database. Vercel Blob is attractive if the team wants a simpler Vercel-native upload path. The first backend PR can save text metadata only if storage decisions are not complete.

Resend is the recommended MVP email option because the expected first use case is simple: internal notification and customer confirmation. Payment and customer login should remain out of the first backend PR to avoid confusing a concept brief with a CAD-ready production order.

## 5. Required Environment Variables

| Variable | Purpose | Server-only or browser-safe | Required for first backend PR | Risk if exposed |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL used by browser or server Supabase clients. | Browser-safe if project is configured correctly. | Yes, if Supabase is chosen. | Low by itself, but can help attackers target the project if other keys/policies are weak. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous Supabase key for browser-safe operations governed by RLS/policies. | Browser-safe only when RLS and policies are correct. | Maybe, only if browser-side Supabase access is used. | Medium if policies are weak; should never grant admin behavior. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side privileged key for trusted backend operations. | Server-only. | Yes, if server API writes use service role access. | Critical; exposure can allow broad database/storage access. |
| `SUPABASE_STORAGE_BUCKET` | Name of the bucket used for reference images. | Usually server-safe configuration; not a secret. | No, only required when storage is added. | Low by itself, but bucket policy mistakes can expose uploads. |
| `RESEND_API_KEY` | API key used to send emails through Resend. | Server-only. | No for first metadata-only PR; yes for email PR. | High; exposure can allow unauthorized email sending. |
| `NOVORA_INTERNAL_NOTIFICATION_EMAIL` | Internal destination for new brief notifications. | Server-only configuration. | No for first metadata-only PR; yes for email PR. | Medium; exposure reveals internal contact routing. |
| `NOVORA_FROM_EMAIL` | Verified sender address for customer and internal emails. | Server-only configuration; value may appear in emails. | No for first metadata-only PR; yes for email PR. | Low to medium; misuse can affect brand trust and deliverability. |
| `ADMIN_ACCESS_SECRET` | Simple secret used for temporary internal admin protection, if selected. | Server-only. | Yes before real customer data appears in admin pages. | High; exposure can allow unauthorized admin access. |
| `ADMIN_AUTH_PROVIDER` | Identifies selected admin auth method, such as Supabase Auth, Clerk, or Vercel protection. | Server-side or build-time configuration. | Yes before real customer data appears in admin pages. | Low to medium; not usually a secret, but can reveal architecture. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for upload/read-write operations. | Server-only. | No, only required if Vercel Blob is chosen for storage. | High; exposure can allow unauthorized blob operations. |
| `STRIPE_SECRET_KEY` | Stripe server key for future payment operations. | Server-only. | No; later only. | Critical; exposure can compromise payment operations. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe key used by browser checkout components. | Browser-safe. | No; later only. | Low by itself, but must match the intended environment. |
| `STRIPE_WEBHOOK_SECRET` | Secret used to verify Stripe webhook signatures. | Server-only. | No; later only. | High; exposure can allow forged webhook attempts. |

## 6. Security Rules

- Never expose service role keys to browser code.
- Never commit `.env` files.
- Never paste real secrets into GitHub issues, PR descriptions, or Codex prompts.
- Production environment variables must be configured in the Vercel dashboard only.
- Use preview/staging variables carefully and keep them separate from production secrets.
- Admin pages must not show real customer data before protection exists.
- Uploaded reference images may contain personal information and must be treated as private customer data unless the customer explicitly permits broader use.

## 7. First Real Backend PR Scope

Suggested branch: `codex/add-real-brief-submission-api`

Safest first real backend PR scope:

- Add API route for concept brief submission.
- Save text metadata only first, if storage is not ready.
- Validate required fields.
- Generate server-side Concept Brief ID.
- Keep `/design/submitted`.
- Add admin mock compatibility so existing mock admin flows are not abruptly broken.
- No payment.
- No CAD request.
- No customer login.
- No order center.

## 8. Second Backend PR Scope

Suggested branch: `codex/add-reference-image-upload-storage`

Safest second backend PR scope:

- Add reference image storage.
- Upload images to the chosen storage provider.
- Save file metadata and URLs.
- Enforce file count limits.
- Enforce file size limits.
- Add safe error handling for upload failures, partial failures, unsupported files, and provider errors.

## 9. Third Backend PR Scope

Suggested branch: `codex/add-brief-email-notifications`

Safest third backend PR scope:

- Send internal NOVORA notification email.
- Send customer confirmation email.
- Include clear boundary copy in customer-facing email:

```text
This is not a CAD-ready production order.
Final CAD, pricing, sourcing, and production feasibility are confirmed later.
```

The email PR should avoid payment language unless the payment/order flow has already been designed and approved.

## 10. Decision Checklist for the User

Before implementation begins, answer:

- Which database provider should NOVORA use?
- Which file storage provider should NOVORA use?
- Which email provider should NOVORA use?
- Which admin protection method should NOVORA use?
- What email address receives internal notifications?
- What sender domain will be used?
- What is the max number of reference images per brief?
- What is the max file size per reference image?
- Should phone number be optional?
- Should customer account login be skipped for MVP?
- Should payment be delayed until the CAD request flow?

## 11. Risk Checklist

- Wrong environment variable configured in Production.
- Service role key exposed to browser code.
- Upload abuse from large files, unsupported files, or repeated attempts.
- Fake submissions.
- Duplicate submissions.
- Email delivery failure.
- Admin data exposure.
- Customer thinks a concept brief equals a final CAD or order.
- Payment/CAD confusion if payment language appears too early.
- Privacy policy missing or not updated for real customer submissions and uploaded images.

## 12. Non-Goals

- No backend implementation in this PR.
- No database tables created.
- No upload integration.
- No email integration.
- No payment integration.
- No login integration.
- No AI generation API.
- No CAD automation.
- No order center.
