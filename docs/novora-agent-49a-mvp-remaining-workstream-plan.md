# NOVORA Agent 49A Remaining MVP Workstream Plan

## Purpose

This is a docs-only planning packet for the remaining NOVORA MVP workstreams.
It summarizes the current completed baseline, organizes the remaining work into
safe tracks, recommends a next-Agent sequence, and records hard stop boundaries
before any future implementation begins.

Agent 49A does not implement app functionality, add routes, change packages,
execute SQL, connect to Supabase live, inspect live schema or customer data,
change environment variables or secrets, deploy, install plugins, enable MCP,
call OpenAI or image generation, send email, deliver customer sketches, expose
customer-facing AI sketch display, approve gallery use, connect analytics, or
connect any third-party service.

## Current Completed Baseline

Major completed workstreams on `main`:

- Public Concept Brief flow: customers can move through the guided design
  intake, submit a persisted Concept Brief, and reach submitted confirmation
  only after confirmed server persistence with a valid public reference and
  Concept Brief UUID.
- Supabase schema and storage baseline: Concept Brief records, contact rows,
  reference asset metadata, admin notes, notification events, and the
  `novora-reference-images` and `novora-ai-sketches` buckets are recorded in
  the project ledger.
- Admin brief review: protected `/admin/briefs` list and
  `/admin/briefs/[publicReference]` detail views show Supabase-backed
  submissions after the admin access gate.
- Admin notification email: submitted Concept Briefs can notify the configured
  admin inbox with durable idempotency protection.
- Reference image upload and display: final reference uploads happen from
  `/design/brief`, store metadata in Supabase, and can be opened through the
  protected admin reference route.
- Admin review persistence: Concept Brief review status and internal admin
  notes persist through `admin_notes`.
- AI sketch review status and table planning: the internal AI sketch workflow
  uses four final statuses only:
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`; `pending` is illegal and
  excluded.
- Duplicate protection: the user manually executed and verified
  `ai_sketch_reviews_concept_brief_id_key UNIQUE (concept_brief_id)`.
- Admin AI sketch review write path: the protected admin-only write foundation
  uses an explicit create/update split, validates final statuses only, and does
  not use blind upsert.
- Admin AI sketch review save UI: the protected admin detail UI saves only
  `mode`, `conceptBriefId`, and `reviewStatus`; it excludes `reviewer_note` and
  `customer_safe_note`.
- Website optimization: Agent 47A planned low-risk website optimization, and
  Agent 47B implemented metadata, homepage CTA clarity, accessibility labels,
  image attributes, and mobile/focus refinements without third-party services.
- Codex skills/plugins audit: Agent 48A recommended low-risk local workflow
  skills first and deferred or rejected plugin/MCP access unless separately
  approved.

## AI Sketch Business Boundaries

Future AI sketch work must preserve these locked MVP boundaries:

- The customer submits a Concept Brief before any sketch workflow begins.
- GPT or an image model can generate internal drafts only.
- GPT may assist revision prompts or redraw direction only inside an internal
  workflow.
- Human review and human final approval are required before any customer-facing
  sketch delivery.
- The customer only sees a human-reviewed version.
- Unreviewed AI/GPT drafts must never be shown or delivered to customers.
- An AI sketch is a concept sketch only, not CAD, not a quote, not an order,
  and not production approval.
- `approved_for_customer` is not equal to `approved_for_gallery`.
- AI generation success alone must not approve a sketch.
- Customer-facing sketch delivery remains email-only after human review,
  optimization, and approval.
- Customer pages must not display unreviewed AI sketches.

## Remaining MVP Workstreams

### A. AI Sketch Structured Input Foundation

Priority: must-have before any real AI sketch drafting implementation.

Remaining work:

- Define Design Spec JSON Schema v1 as a stable internal contract for sketch
  direction.
- Define Hand Sketch Instruction Template v1 so prompts are generated from a
  controlled instruction shape.
- Plan how persisted customer brief fields map into the structured design spec.
- Require fixed instruction generation before any internal image drafting.
- Avoid direct raw customer brief to final generation prompt behavior.

Recommended next action: Agent 50A, Agent 50B, and Agent 50C docs-only planning
before any provider or generation implementation.

### B. Internal AI Sketch Draft Pipeline Planning

Priority: should-have before MVP end; must-have before real image generation.

Remaining work:

- Plan internal-only draft generation with admin triggering, prompt versions,
  model/provider metadata, cost metadata, output metadata, and storage policy.
- Define failure, timeout, retry, and cost-control boundaries.
- Keep outputs private by default with no customer display and no automatic
  delivery.
- Defer paid customer-facing generation unless a separate approved task covers
  policy, privacy, payment, quota, provider setup, and customer delivery.

Recommended next action: Agent 53A docs-only internal draft pipeline planning
after the structured input docs are stable.

### C. Admin Review Workflow Polish

Priority: should-have before MVP end.

Remaining work:

- Verify status save UX, loading states, error messages, and admin-only access
  behavior.
- Confirm final status controls remain constrained and `pending` cannot be
  selected or written.
- Plan review history and notes strategy separately.
- Keep `reviewer_note` and `customer_safe_note` excluded unless a future task
  explicitly approves a sensitive-field strategy.
- Avoid customer-facing AI sketch display.

Recommended next action: Agent 51A UI polish or validation if review finds the
current admin save UX needs tightening.

### D. Customer Delivery Boundary

Priority: must-have boundary; implementation deferred unless separately
approved.

Remaining work:

- Preserve email-only customer sketch delivery after human review,
  optimization, and approval.
- Plan copy explaining human review before any customer delivery behavior.
- Do not add website customer sketch gallery, customer sketch route, or
  automatic email delivery in the MVP planning slice.
- Keep `approved_for_customer` separate from gallery approval.

Recommended next action: defer implementation. A later delivery planning Agent
should be separate from internal generation and admin review work.

### E. Website Quality And Conversion Polish

Priority: should-have before MVP end.

Remaining work:

- Run homepage visual QA and mobile QA against the current optimized public
  pages.
- Verify SEO metadata, social preview metadata, CTA clarity, accessibility
  labels, focus states, alt text, and no text overlap.
- Review core Concept Brief journey copy for clarity without changing
  persistence behavior.
- Do not add analytics, tracking, plugins, chat, booking, CRM, marketing, or
  monitoring unless separately approved after privacy/data review.

Recommended next action: Agent 52A website visual QA and mobile QA checklist.

### F. Production Readiness And QA

Priority: must-have before broader public traffic.

Remaining work:

- Maintain a deployment readiness checklist that includes local build,
  focused Playwright, manual browser QA, rollback, and owner signoff.
- Keep environment and secret checks value-free; never expose secret values.
- Document which Production operations require separate approval.
- Keep Production rate-limit provider enforcement deferred unless a separate
  task approves the Production-dedicated provider and env setup.

Recommended next action: Agent 54A deployment and production readiness
checklist after the near-term docs and QA tracks are clearer.

### G. Future Optional Integrations

Priority: explicitly deferred or blocked.

Deferred integrations:

- Analytics and tracking.
- Chat and booking.
- CRM, email marketing, and monitoring.
- Payments.
- Customer accounts.
- Plugin/MCP tooling.
- Customer-facing AI generation or gallery delivery.

These require separate approval, privacy/data-handling review, provider
selection, secret/env planning, rollback planning, and scoped implementation
tasks. They are not part of Agent 49A.

## Recommended Agent Sequence

1. Agent 50A: Design Spec JSON Schema v1 docs.
2. Agent 50B: Hand Sketch Instruction Template v1 docs.
3. Agent 50C: Brief-to-Design-Spec planning.
4. Agent 51A: Admin AI sketch review UI polish and validation, if needed.
5. Agent 52A: Website visual QA and mobile QA checklist.
6. Agent 53A: Internal AI sketch draft pipeline planning.
7. Agent 54A: Deployment and Production readiness checklist.

Recommended lifecycle after this PR: Review Pass, Final PR Check, Ready +
Merge, then Post-merge Cleanup. Do not start Agent 50A implementation from
this branch.

## Priority Classification

| Workstream | Priority | Reason |
| --- | --- | --- |
| Design Spec JSON Schema v1 | Must-have before MVP end | Prevents raw customer brief text from becoming the direct generation contract. |
| Hand Sketch Instruction Template v1 | Must-have before MVP end | Makes prompt creation stable, reviewable, and versionable. |
| Brief-to-Design-Spec planning | Must-have before generation | Defines how current Concept Brief data becomes structured sketch direction. |
| Customer delivery boundary | Must-have boundary | Prevents unreviewed drafts, automatic delivery, and gallery confusion. |
| Production readiness checklist | Must-have before broader traffic | Keeps launch, rollback, validation, and secret/env checks explicit. |
| Admin review UX polish | Should-have before MVP end | Improves admin confidence around the new review save flow. |
| Website visual/mobile QA | Should-have before MVP end | Protects public trust and mobile conversion after first optimization. |
| Internal draft pipeline planning | Should-have before MVP end | Needed before any real provider integration, but not a customer-facing MVP feature by itself. |
| Analytics, chat, booking, CRM, monitoring | Nice-to-have after MVP | Useful later but privacy and third-party data risk is higher than near-term value. |
| Payments and customer accounts | Explicitly deferred | Outside current Concept Brief intake and manual follow-up MVP boundary. |
| Plugin/MCP tooling | Explicitly deferred | Agent 48A recommends no plugin/MCP by default without a separate approved task. |
| Customer-facing sketch pages/gallery | Explicitly deferred | Must not expose unreviewed drafts and needs separate approval, access, copy, and privacy planning. |

## Timing Estimates

These are planning estimates only, not commitments.

| Task type | Rough range | Examples |
| --- | --- | --- |
| Short docs-only task | 0.5 to 1.5 days | JSON schema planning, instruction template planning, checklist updates. |
| Small app/UI task | 1 to 3 days | Admin save UX polish, copy refinements, accessibility or mobile fixes. |
| App plus testing task | 2 to 5 days | Admin workflow changes with build, focused Playwright, and browser QA. |
| High-risk integration task | 1 to 3+ weeks | Real image provider, customer delivery, analytics, payment, auth, CRM, or deployment/provider setup. |

High-risk integration estimates assume separate planning, approval, env/secrets
handling, privacy review, rollback planning, and validation. Real provider,
Production, email, or customer-data work should not be bundled into docs-only
or low-risk UI slices.

## Risk Table

| Workstream | Risk level | App code impact | Database impact | Customer-facing impact | Third-party/service impact | Recommended next action | Blocked actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Design Spec JSON Schema v1 | Low | None for docs | None | None | None | Agent 50A docs | App code, schema changes, provider calls |
| Hand Sketch Instruction Template v1 | Low | None for docs | None | None | None | Agent 50B docs | OpenAI/image generation, raw prompt execution |
| Brief-to-Design-Spec planning | Medium | None for docs | None | Indirect copy boundary | None | Agent 50C docs | Using raw customer brief as final prompt |
| Internal draft pipeline | High | Future server/admin code | Future job/output records may be needed | Must remain hidden | Future OpenAI/storage/provider | Agent 53A docs | Real provider call, storage writes, customer display |
| Admin review UX polish | Medium | Admin UI only if approved | Existing write route only | None | None | Agent 51A if needed | Sensitive notes, customer delivery, new SQL |
| Customer delivery boundary | High | Future routes/email only if approved | Future access/delivery records may be needed | High | Email/provider possible | Separate delivery plan | Automatic email, customer sketch page, gallery approval |
| Website QA/conversion polish | Low to medium | Public UI only if approved | None | Public copy/layout | None by default | Agent 52A checklist | Analytics, tracking, chat, CRM, booking |
| Production readiness | Medium | None for checklist | None | Indirect launch quality | Vercel/provider only if approved | Agent 54A docs | Deploy, env changes, Production smoke without approval |
| Optional integrations | High | Variable | Variable | Variable | High | Defer | Plugin/MCP install, payments, auth, CRM, analytics |

## Hard Stop Boundaries

Future tasks must stop before any of the following unless that specific
category is separately approved for the scoped task:

- SQL execution.
- Supabase live access.
- Live schema, row, customer data, customer ID, internal note,
  `reviewer_note`, or `customer_safe_note` inspection.
- Supabase schema, RLS, grants, policies, storage, migration, or bucket changes.
- Environment variable or secret changes.
- Deploy or Production operation.
- OpenAI call or image generation.
- Image upload/storage behavior for generated sketches.
- Email sending, retry/resend, or customer delivery behavior.
- Customer-facing AI sketch display.
- Public gallery approval or publishing.
- Plugin installation.
- MCP enablement.
- Codex app/plugin settings change.
- Package or lockfile changes.
- Analytics, tracking, pixels, session replay, monitoring, CRM, chat, booking,
  marketing, payment, customer accounts, or other third-party service
  connection.

## Future Decision Points

The owner should decide later:

- Exact paid/free AI sketch policy and whether any quota exists.
- Whether image generation is connected during MVP or remains deferred.
- Whether customer sketch delivery stays manual email-only or becomes
  semi-automated after human approval.
- Whether a customer-facing approved sketch page is ever added after MVP.
- Whether public gallery approval is ever introduced and how consent is handled.
- Whether analytics, chat, booking, CRM, payment, customer accounts, and
  monitoring remain deferred until after launch.
- Exact MVP launch readiness threshold and owner signoff criteria.
- Whether Production rate-limit provider enforcement is activated before
  broader public traffic.

These are not blockers for Agent 49A. They should be recorded as future
approval boundaries before implementation.

## Agent 49A Validation

Expected docs-only validation:

- `git diff --stat`
- `git diff`
- `git diff --check`
- `git diff --cached --check` after path-specific staging

Build and Playwright are skipped because Agent 49A changes documentation only.
