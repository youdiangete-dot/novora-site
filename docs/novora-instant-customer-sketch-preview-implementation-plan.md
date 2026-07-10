# NOVORA Instant Customer Sketch Preview Implementation Plan

## 1. Purpose

This document plans the implementation path for the owner-approved instant
customer-facing AI hand-sketch concept preview direction recorded by Agent 60I.
The target direction is that a customer submits a Concept Brief, NOVORA
structures the request, creates a hand-sketch instruction, generates the first
AI hand-drawn concept sketch, shows that first preview to the customer as soon
as the required automatic gates pass, captures customer feedback, and keeps
human intervention focused on correction, regeneration, jewelry logic, and
production feasibility.

This is an implementation plan only. It does not implement image generation,
storage writes, provider API calls, routes, UI, database changes, environment
variables, customer feedback UI, admin persistence, email, deployment, or
Production behavior.

Current Production does not have a real AI image-generation API.
`/design/preview/[public_reference]` remains mock-only, the submitted-page
preview entry remains a demo/mock connection, and no real generated customer
preview is live. This plan describes the locked target direction, not deployed
behavior.

The first sketch remains an early concept preview. It is not CAD, not a quote,
not an order confirmation, not payment confirmation, and not production
approval.

## 2. Confirmed product direction

Confirmed owner direction from Agent 60I and related limited-beta planning:

- Limited beta remains invite-only.
- Limited beta size is 5-10 users.
- Target beta language options are English and Traditional Chinese.
- Automatic submission response is desired.
- Website-based first AI hand-sketch concept preview is now the intended MVP
  product path.
- Once the first result is generated and passes the required automatic safety,
  privacy, access-control, output-validity, and safe-failure gates, it becomes
  immediately visible to the customer without waiting for per-image human
  pre-approval.
- Human intervention should focus on structure logic errors, jewelry
  construction errors, production feasibility issues, inconsistent views, wrong
  prong or setting logic, wrong gemstone placement, proportion problems,
  customer request mismatch, unsafe claims, correction, and regeneration.

This direction pivots future planning away from the earlier conservative
email-only delivery default. Earlier email-only and human-review-first docs
remain useful safety history, but future implementation must explicitly design
new customer preview, review-state, and delivery semantics instead of silently
reusing the old assumptions.

## 3. Customer-facing MVP flow

Target customer experience:

1. Customer fills the Concept Brief flow.
2. Customer uploads optional final reference images on the brief step, after
   server persistence is confirmed.
3. The system creates or finds the persisted Concept Brief record and valid
   customer-visible `publicReference`.
4. The system structures the brief into a Design Spec.
5. The system creates a Hand Sketch Instruction from the Design Spec.
6. The system creates one sketch generation job for the first preview.
7. The customer sees a waiting or processing state if generation is not ready.
8. The first generated AI hand-drawn concept sketch passes the required
   automatic gates and immediately appears to the securely authorized customer
   without waiting for per-image human pre-approval.
9. The preview page shows clear concept-only disclaimers.
10. The customer can submit feedback, request a revision, clarify details, or
    ask for human follow-up.
11. Human correction or regeneration follows when needed.

Future UI planning should avoid false success. Customer submitted/received
states must continue to depend on confirmed server persistence, a valid
Concept Brief UUID, and a valid `NOVORA-CB-...` public reference.

## 4. Required customer-facing disclaimers

Every future first preview must visibly state that the sketch is:

- An AI-generated concept sketch.
- An early visual direction.
- For communication and feedback.
- Not CAD.
- Not a quote.
- Not an order confirmation.
- Not payment confirmation.
- Not production approval.
- Not a manufacturability guarantee.
- Subject to human review, correction, CAD validation, pricing, and production
  feasibility review.

Copy should use phrases such as `AI hand-drawn concept sketch`, `concept
direction`, `early visual direction`, `manual confirmation`, and `paid CAD
later`.

Copy must not imply final design, CAD readiness, final pricing, gemstone
sourcing confirmation, order approval, payment approval, production readiness,
or manufacturing approval.

## 5. Backend generation architecture plan

Future implementation should keep generation server-controlled:

- Create the first preview job after a Concept Brief is confirmed persisted and
  the system can identify the brief by internal UUID plus customer-visible
  `publicReference`.
- Structure the customer brief into Design Spec JSON before generating a Hand
  Sketch Instruction. Do not use raw customer free text as the final generation
  prompt.
- Create a generation job record before calling any image provider so refresh,
  retry, redirect, or duplicate requests cannot create uncontrolled duplicate
  generations.
- Use an idempotency key scoped to the Concept Brief, generation purpose, Design
  Spec version, Hand Sketch Instruction version, and first-preview attempt.
- Reuse or return the existing active or completed first-preview job when the
  customer refreshes or lands on the preview URL again.
- Record prompt/spec/template version, provider, model, size, quality, cost
  estimate, generation type, parent generation, output metadata, and sanitized
  failure category when those fields are implemented.
- Keep provider keys and service-role keys server-only. Never expose provider
  keys through browser code, `NEXT_PUBLIC_*` variables, logs, docs, screenshots,
  or PR descriptions.
- Use polling, redirect-to-processing, or server-mediated refresh states for
  customer waiting behavior. The exact mechanism remains an open decision.
- Cap automatic retries. Provider failure, storage failure, or timeout must not
  loop indefinitely or silently charge repeated generations.
- Store generated output in NOVORA-controlled storage before any customer
  preview is made available.

The pre-display decision is locked: the first preview does not wait for
per-image human approval. Human correction remains available after preview,
while formal downstream human approvals remain separate.

### Required automatic first-preview gates

Before `first_preview_ready` becomes customer-visible, implementation must
confirm all of the following:

- Confirmed Concept Brief persistence and a valid `publicReference`.
- A secure customer access mechanism.
- A valid generation-job lifecycle state and generated-output lifecycle state.
- A valid generated image or output asset.
- No exposure of provider metadata, internal prompts, reviewer notes, admin
  notes, secrets, or private storage paths.
- Passed content-safety, privacy, and access-control checks.
- Safe timeout, failure, and invalid-output handling.
- No false-success customer-visible state.

These are automatic gates and must not be replaced with comprehensive human
pre-review.

## 6. Data model / storage planning

Documented current and planned concepts:

- `concept_briefs`: existing submitted Concept Brief parent record.
- `concept_brief_reference_assets`: existing reference image metadata linked to
  a Concept Brief.
- `novora-ai-sketches`: documented Supabase Storage bucket for generated AI
  sketch outputs.
- `ai_sketch_jobs`: documented future/planned generation orchestration and
  retry/idempotency state.
- `ai_sketch_outputs`: documented future/planned generated output metadata and
  private storage reference.
- `ai_sketch_reviews`: documented future/planned human review decision record;
  older docs also discuss compatibility for this table. A future schema
  verification task must confirm the live table shape before app code depends
  on it.

Planned responsibilities:

- `concept_briefs` owns the customer request, submission status, and
  `publicReference`.
- `concept_brief_reference_assets` owns uploaded reference image metadata,
  upload status, storage linkage, and privacy/review flags.
- Design Spec and Hand Sketch Instruction artifacts should become a versioned
  internal source of truth before generation. Agent 55D planned a future
  `design_artifacts` direction, but no SQL is executed here.
- `ai_sketch_jobs` should own generation status, idempotency, attempt count,
  provider/model/quality/size, prompt/spec/template versions, cost estimate,
  trigger source, retry caps, and sanitized failure category.
- `ai_sketch_outputs` should own generated image metadata, storage bucket/object
  reference, output dimensions or MIME type when available, customer-visible
  flags, generation metadata, and lineage to the job and brief.
- `ai_sketch_reviews` should own human review decisions, reviewer label or
  actor, internal notes, revision instruction, approval timestamp, and audit
  linkage for a specific output.
- `novora-ai-sketches` should stay private by default. Customer access should
  use signed URLs or server-mediated access only after the future visibility
  rules are satisfied.

Schema gaps remain future implementation requirements. This plan does not write
SQL, create migrations, change Supabase, change RLS, change grants, change
policies, or verify live schema.

## 7. Status model planning

Candidate future end-to-end customer/brief statuses:

- `submitted`
- `structuring_brief`
- `sketch_generation_queued`
- `sketch_generating`
- `first_preview_ready`
- `generation_failed`
- `customer_feedback_submitted`
- `human_review_needed`
- `revision_requested`
- `revised_preview_ready`

These names are planning candidates only. Current mock/demo use of
`first_preview_ready` is not evidence of an implemented database status, schema
field, or live Production lifecycle. The candidates should be reviewed against
existing `concept_briefs`, admin notes, AI sketch workflow, and customer display
state before any code or SQL uses them.

Future implementation should keep these concepts separate:

- Concept Brief submission status.
- Design Spec / Hand Sketch Instruction artifact status.
- Generation job status.
- Generated output status.
- Human review status.
- Customer preview visibility status.
- Public gallery approval.
- CAD, quote, payment, order, and production status.

AI generation success must never equal CAD approval, quote approval, payment
approval, order approval, production approval, or gallery approval.

`first_preview_ready` is only the first customer-visible concept-preview
lifecycle. It is not `approved_for_customer` or `approved_for_gallery`.
`approved_for_customer` may support later formal, human-approved customer-safe
materials or downstream communication, but it is not a prerequisite for the
first preview. `approved_for_gallery` remains a separate consent and publication
decision.

## 8. Human intervention model

Agent 60I changes the human role from blocking every first preview to focusing
on correction and safety after the initial AI preview path is designed.

Human intervention should cover:

- Structure logic errors.
- Jewelry construction errors.
- Production feasibility issues.
- Inconsistent main, side, or angle views.
- Wrong prong or setting logic.
- Wrong gemstone placement.
- Proportion problems.
- Customer request mismatch.
- Unsafe or misleading claims.
- Reference-copying or privacy concerns.
- Correction, regeneration, or manual follow-up decisions.

Future admin tooling should let human reviewers see the Concept Brief, Design
Spec, Hand Sketch Instruction, generated output, failure state, prompt/spec
version, model metadata, and customer feedback history. Internal notes, raw
prompts, provider payloads, private storage paths, and reviewer risk comments
must remain internal.

## 9. Customer feedback loop

Future customer feedback should support:

- Feedback on the first preview.
- Revision request.
- Clarification of missing details.
- Human follow-up request.
- Indication that the preview does not match the customer request.
- Preserve feedback history for admin review and regeneration decisions.

Feedback should link to the Concept Brief, visible sketch output, and generation
or revision lineage. It must not imply that feedback approves CAD, quote,
order, payment, or production.

This plan does not implement feedback UI, routes, schema, email, or admin
workflow.

## 10. Localization plan

English and Traditional Chinese are confirmed target language options for the
limited beta direction.

Future localization planning should cover:

- Customer-facing labels.
- Preview disclaimers.
- Processing and waiting states.
- Error and fallback messages.
- Feedback prompts and confirmation copy.
- Automatic submission response copy.
- Any later customer email or notification copy.

Traditional Chinese should support Taiwan-market customers when that future
market direction is implemented. Localization should be treated as a system,
not as one-off text replacement, because future markets may affect language,
currency, sizing conventions, contact preferences, tax or shipping notes, trust
copy, and support flow.

This PR does not modify translation files, add multilingual routing, add a
language selector, change public copy, or implement localization UI.

## 11. Error / fallback states

Future implementation should plan safe handling for:

- Generation timeout.
- Provider failure.
- Storage failure.
- Unsafe, low-quality, or unusable output.
- Missing customer data.
- Incomplete or contradictory Concept Brief details.
- Invalid, inaccessible, unsupported, or unclear reference image.
- Duplicate generation request.
- Rate-limit or budget block.
- Customer refresh during active generation.
- Customer returning after a failed or expired job.

Customer-facing fallback should be non-technical and safe, for example that
NOVORA is still reviewing the concept direction and may continue manually.

Admin-visible failure state should include sanitized error category, generation
attempt, provider/model metadata when available, retry eligibility, and next
recommended action. It must not expose secrets, raw provider payloads, full
private prompts, or protected storage paths to customer surfaces.

## 12. Cost, rate-limit, and abuse controls

Future implementation should include cost and abuse controls before live image
generation:

- Invite-only beta gating.
- 5-10 user cap for the initial beta direction.
- Owner-confirmed submission cap before external beta if needed.
- Generation cap per Concept Brief.
- Retry cap per job or output.
- Provider/model/quality/size selection recorded per job.
- Coarse provider cost estimate recorded per job or output.
- Idempotency to prevent duplicate first-preview jobs on refresh.
- No automatic infinite retries.
- Budget block or manual hold when limits are exceeded.
- Synthetic-only test data for Preview and smoke testing unless a separate
  task explicitly approves otherwise.

Production rate-limit enforcement remains documented as fail-open during the
current MVP stage unless a separate approved provider/environment task changes
that posture. Before broader public traffic, paid ads, formal commercial
launch, increased real customer submissions, or noisy abuse risk, NOVORA should
resolve Production-dedicated rate-limit mitigation and budget ownership.

This plan does not connect KV/Redis, change rate-limit code, provision
providers, change Vercel environment variables, or run any image API.

## 13. Privacy / legal / consent considerations

The future preview flow must account for customer-provided data:

- Reference images are customer-provided materials and should be used only for
  that customer's current project unless separate consent and disclosure exist.
- AI processing should be disclosed before external beta.
- Privacy and Terms pages should be aligned before broader external beta.
- The first preview must not imply production approval, final order creation,
  CAD approval, final pricing, sourcing confirmation, or payment approval.
- Customer deletion, correction, export/access, and reference image removal
  paths remain unresolved unless separately confirmed by the owner/legal review.
- Public gallery use remains separate from private customer preview and needs
  separate consent, curation, and privacy review.

This PR does not draft legal pages, publish Privacy or Terms, add legal links,
add consent checkboxes, change retention policy, access customer data, or
implement deletion/correction workflows.

## 14. Implementation phases

Locked target sequence:

1. Confirmed Concept Brief persistence.
2. Design Spec.
3. Hand Sketch Instruction.
4. First generation job.
5. Required automatic gates.
6. Customer-visible first preview.
7. Customer feedback.
8. Human correction, redraw, or regeneration.
9. Formal downstream human-controlled CAD, quotation, payment, order, and
   production decisions.

Planning should proceed through Agent 68A First Preview Product Contract, then
separate preview data-model/SQL and provider/cost-control decisions. Code and
live-provider implementation require later, separately approved Agents.

Each phase should stay narrow. Do not combine UI, SQL, live provider calls,
storage, customer feedback, legal publication, rate-limit provider setup, and
Production smoke testing in one PR.

## 15. Open decisions

Do not invent these answers:

- Exact customer-safe sender.
- Customer-safe reply-to address.
- Exact initial response window.
- Exact concept follow-up window.
- Exact target markets beyond confirmed language options.
- Privacy / Terms publication owner.
- Rate-limit mitigation owner.
- Final limited-beta go/no-go owner.
- Exact image provider and model.
- Generation budget.
- Maximum sketches per Concept Brief.
- Maximum retries per failed generation.
- Whether preview is synchronous, polling-based, redirect-based, or backed by
  an email/manual fallback.
- Exact customer preview URL pattern.
- Operating owner for customer-facing sketch correction and regeneration.
- Customer feedback retention and deletion handling.

## 16. Stop conditions

Stop before implementation if a request would:

- Show the sketch as a final design.
- Imply CAD, quote, payment, order, or production approval.
- Expose provider keys, service-role keys, admin keys, or storage secrets
  client-side.
- Run image generation without environment, cost, rate-limit, storage, error,
  and disclosure controls.
- Mutate Production data.
- Execute SQL or change Supabase schema/RLS/grants/policies/storage without a
  separate approved task.
- Skip required preview disclaimers.
- Remove the human correction or regeneration path.
- Expose raw prompts, provider payloads, private reference image URLs, internal
  reviewer notes, admin notes, or private storage paths to customers.
- Treat `approved_for_customer` as gallery approval, CAD approval, production
  approval, sent status, or payment/order approval.
- Run broad public launch while beta gates, rate-limit posture, privacy/legal
  publication, and operating ownership remain unresolved.
