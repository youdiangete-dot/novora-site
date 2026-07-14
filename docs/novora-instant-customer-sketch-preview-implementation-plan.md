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
- Compute the complete versioned canonical idempotency identity described below
  before reserving a job or calling the Provider.
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

Agent 69C selects OpenAI Image API with pinned model snapshot
`gpt-image-2-2026-04-21` for the future adapter. The selected request profile is
one 1024-by-1024, medium-quality PNG with `moderation=auto`, no streaming or
partial images, and a 150-second server attempt deadline. The initial adapter
must not forward reference images. It must use only the validated structured
Design Spec and Hand Sketch Instruction allowlist and must normalize exactly one
base64 PNG response without exposing provider URLs or payloads. The complete
decision and official-source record is in
`docs/novora-first-preview-provider-cost-privacy-decision-v1.md`.

The pre-display decision is locked: the first preview does not wait for
per-image human approval. Human correction remains available after preview,
while formal downstream human approvals remain separate.

### Canonical idempotency identity

The normative namespace is `novora:first-preview-idempotency:v1`. Build a JSON
object with exactly `version`, internal `concept_brief_id`,
`generation_purpose`, `design_spec_version`, `design_spec_sha256`,
`hand_sketch_instruction_version`, `hand_sketch_instruction_sha256`,
`lineage_identity`, `parent_job_id`, `source_output_id`, and `attempt_number`.
Serialize with RFC 8785 JSON Canonicalization Scheme rules, encode as UTF-8
without a BOM, hash with SHA-256, and store lowercase 64-character hexadecimal.
UUIDs are lowercase hyphenated strings; hashes are lowercase hexadecimal;
attempt is a JSON integer; and non-applicable parent/source identities are
explicit JSON `null`, never omitted. `version` is the exact namespace above and
the bounded initial lineage identity is `first-preview:v1`.

Any missing, blank, malformed, or omitted required component fails closed
before job reservation, idempotency reservation, Provider invocation, or
output persistence. The same complete identity produces the same key; changing
purpose, either structured artifact version/hash, lineage, parent/source, or
attempt produces a different identity. `publicReference` is not a substitute
for the internal Concept Brief UUID.

Database format/completeness CHECKs and uniqueness are defense in depth; they do
not prove canonical derivation. The future server reservation boundary must
canonicalize, hash, compare, and atomically persist the identity before any
Provider or output action.

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

Verified current and planned concepts after Agent 70B-1 / PR #197 and the
owner-run Q01-Q11 metadata collection dated 2026-07-13:

- `concept_briefs`: existing submitted Concept Brief parent record.
- `concept_brief_reference_assets`: existing reference image metadata linked to
  a Concept Brief.
- `novora-ai-sketches`: documented Supabase Storage bucket for generated AI
  sketch outputs.
- `ai_sketch_jobs`: verified ordinary public table with RLS enabled, forced RLS
  false, primary key `id`, required Concept Brief FK with `ON DELETE CASCADE`,
  `status text NOT NULL DEFAULT 'draft'`, `prompt_version`, `prompt_payload`,
  `model_name`, `error_message`, creation/update timestamps, a
  `concept_brief_id` index, and the live `set_ai_sketch_jobs_updated_at`
  trigger. Current status row values remain unknown.
- `ai_sketch_outputs`: verified ordinary public table with RLS enabled, forced
  RLS false, primary key `id`, required `job_id` and `concept_brief_id` cascade
  FKs, `bucket_name NOT NULL DEFAULT 'novora-ai-sketches'`, nullable
  `object_path`, `preview_status NOT NULL DEFAULT 'pending_review'`, `metadata`,
  and `created_at`. It has a Concept Brief index but no separate `job_id` index,
  no one-output-per-job invariant, and no current-preview invariant. Current
  `preview_status` row values and semantics remain unknown.
- `ai_sketch_reviews`: verified ordinary human-review table with RLS enabled,
  forced RLS false, `ai_sketch_output_id NOT NULL`, cascade FKs to output and
  brief, and `UNIQUE (concept_brief_id)`. The exact legal review statuses remain
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`; `pending` remains illegal.
  Because output linkage is non-null, a review row cannot exist before a real
  output. The relationship and statuses remain unchanged.

All six approved public tables are verified ordinary tables with RLS enabled,
forced RLS false, and no table comments. Q07 visibly reported a complete
zero-row explicit-policy result, but it is screenshot evidence rather than a
raw CSV. Q08 direct grants do not establish effective privileges, role
membership, ownership, BYPASSRLS behavior, PostgREST behavior, or API
exploitability. Effective access posture requires separate owner-run metadata
preflights before access-control remediation or live wiring.

Planned responsibilities:

- `concept_briefs` owns the customer request, submission status, and
  `publicReference`.
- `concept_brief_reference_assets` owns uploaded reference image metadata,
  upload status, storage linkage, and privacy/review flags.
- Design Spec and Hand Sketch Instruction artifacts should become a versioned
  internal source of truth before generation. Agent 55D planned a future
  `design_artifacts` direction, but no SQL is executed here.
- `ai_sketch_jobs` should be reused for generation status, idempotency, attempt
  lineage, structured-input version/hash binding, timeout/cancellation,
  provider-neutral cost records, retry caps, and sanitized failure category
  when verified existing fields can safely support those responsibilities.
- The only permitted staged/pre-reservation job state is the existing
  `status = 'draft'`. It has NULL purpose, attempt, canonical identity, Design
  Spec identity, Hand Sketch Instruction identity, lineage, Provider profile,
  Provider request, started/deadline, terminal, failure/retry, and cost fields.
  Every non-staged future job must have complete purpose/attempt, RFC 8785-based
  canonical identity, structured-artifact version/hash fields, bounded lineage,
  and the complete pinned OpenAI request profile before it is written.
- Job lifecycle rules are bidirectional. `queued` carries no started or terminal
  evidence; `processing` requires start/deadline and no terminal evidence;
  `succeeded` requires success-only `completed_at` and no failure evidence;
  `failed` requires failure-only `failed_at`; `timed_out` requires only
  `timed_out_at`; and `cancelled` requires only `cancelled_at`, together with
  their compatible category/retry decision and terminal reason. These four
  terminal timestamps are mutually exclusive and imply their matching status in
  both directions. A terminal timestamp cannot appear on a staged or nonterminal
  job, and each populated terminal timestamp must be at or after `started_at`
  when the attempt has started.
- `ai_sketch_outputs` should be reused for generated image metadata,
  controlled private object identity, automatic-gate evidence, the persisted
  output-bound `first_preview_ready` visibility decision, and lineage to the
  job and brief. Asset existence, object ID, or URL alone is never readiness.
- A root First Preview job is attempt 1 with no parent/source. One eligible
  automatic retry may be a child First Preview attempt 2. One later authorized
  feedback regeneration extends the same lineage, increments its parent
  attempt by one (bounded at 3), and names the exact prior parent output as its
  source. Composite unique/FK guards must enforce same-brief parentage, exact
  parent purpose/attempt, same-brief source output, and output/job brief
  consistency; strictly increasing bounded attempts prevent cycles.
- `ai_sketch_reviews` should remain human-review focused. Its
  `approved_for_customer` status is relevant to later formal human-approved
  material or downstream communication and is not required for the initial
  first preview.
- `novora-ai-sketches` should stay private by default. Customer access should
  use short-lived signed access or server-mediated access only after the future
  visibility and independent request-access rules are satisfied. A permanent
  public generated-asset URL is prohibited.

Verified additive gaps include deterministic idempotency, attempt numbering and
lineage, structured Design Spec and Hand Sketch Instruction version/hash
bindings, provider request identity, status-exclusive `completed_at`,
`failed_at`, `cancelled_at`, and `timed_out_at`, normalized
failure and retry evidence, cost fields, output MIME/size/dimensions/checksum,
asset persistence time, asset-validation status/evidence/time,
automatic-gate status/evidence/passed time,
output-bound readiness, and a
database invariant allowing at most one current customer preview per Concept
Brief. Provider/model/request configuration belongs on the job; binary and
asset-integrity evidence belongs on the output. Existing `model_name`,
`prompt_version`, `error_message`, `bucket_name`, and `object_path` should be
reused within their verified responsibilities instead of duplicated.

`ai_sketch_jobs.status` is partially compatible and remains the generation-job
lifecycle field, but no CHECK/default change is allowed until owner-run grouped
status evidence passes. `ai_sketch_outputs.preview_status` remains a historical
output-workflow field; its `pending_review` default must not be repurposed as
automatic readiness without supplemental row evidence and repository-semantic
review. `ai_sketch_reviews.review_status` remains unchanged and separate.
Dedicated additive automatic-gate/readiness fields are required so provider
success, output creation, an object path, `pending_review`, or human
`approved_for_customer` cannot independently establish `first_preview_ready`.

`asset_created_at` is the authoritative proof that private generated-asset
persistence succeeded; an object path alone is not proof. The required order is
`asset_created_at <= asset_validated_at <= automatic_gate_passed_at <=
first_preview_ready_at`. Ready rows have no revocation timestamp. Revoked rows
retain the prior ready timestamp/evidence, record `readiness_revoked_at >=
first_preview_ready_at`, and are not current.

The operational sequence receives Provider output, persists the private
generated asset, records `asset_created_at`, validates the persisted binary and
image, records `asset_validated_at`, runs and passes automatic gates, marks the
output ready, and only then may select that ready output as current. Human
review remains later and `approved_for_customer` is not the initial display
gate.

Asset and gate state is also bidirectional. A populated `asset_created_at`
requires the private bucket/path locators. `asset_validation_status = 'passed'`
requires bounded validation evidence, complete PNG MIME/size/dimension/checksum
facts, and `asset_validated_at >= asset_created_at`; any validated-at timestamp
requires that passed state. Pending validation has no evidence/pass timestamp,
while failed validation may retain bounded failure evidence but no accepted
binary facts or validated-at timestamp. A passed automatic gate requires prior
passed validation, a nonblank policy version, bounded nonempty gate evidence,
and `automatic_gate_passed_at >= asset_validated_at`; any gate-pass timestamp
requires `automatic_gate_status = 'passed'`. A failed gate may retain bounded
evaluation evidence but never a pass timestamp. Gate passage does not select the
current preview and does not replace the readiness decision.

Readiness and current selection are separate. `first_preview_ready` means one
specific output passed all automatic display gates; it may be non-current.
`is_current_customer_preview = true` selects one already-ready output, with at
most one current output per Concept Brief. The later persistence writer must
replace that pointer transactionally and preserve historical ready outputs.

Agent 69B records the original reuse-first model and candidate SQL boundary in
`docs/novora-first-preview-data-model-sql-plan-v1.md`. It does not add the old
candidate preview-lifecycle table merely to duplicate jobs, outputs, and
visibility. A separate append-only feedback table is only a gated candidate
after live metadata proves no compatible feedback table already exists.

Agent 70B-2 records the evidence-led inventory, aggregate/effective-privilege
preflights, and exact additive candidate blocks in
`docs/novora-agent-70b2-first-preview-live-schema-review-and-additive-sql-plan-v1.md`.
The first independent review of Draft PR #198 returned **FAIL — CORRECTION
REQUIRED** for six blocking categories: NULL safety; ready/current separation;
purpose/attempt/Provider-profile completeness; enforceable lineage and
cross-table consistency; canonical idempotency; and asset/readiness chronology.
The second independent Re-Review also returned **FAIL — CORRECTION REQUIRED**.
It confirmed the previously resolved ready/current, lineage, composite
consistency, cycle, idempotency, review, access-evidence, and Product boundaries,
but found two remaining lifecycle defects: all-NULL job identity/profile was not
bound to exact staged `draft`, and asset-validation/gate-passed evidence was not
bidirectionally bound to its status and timestamp. This second correction closes
those areas without changing ready/current or human-review separation.

The third independent Re-Review also returned **FAIL — CORRECTION REQUIRED**.
It found that failed jobs still reused success-only `completed_at` and that one
main-plan sequence placed validation before private persistence. The third
correction adds nullable candidate `failed_at`, makes every terminal timestamp
mutually exclusive and status-specific, updates B13 and V01, and restores the
required persistence-before-validation order.

PR #198 remains Draft and requires another independent Re-Review before any
Owner-run supplemental preflight. The corrected packet still contains 30
Owner-run SELECT-only preflight blocks and 7 candidate-only SQL blocks, 37 SQL
blocks total; none was executed.
Every row-dependent CHECK, FK validation, `NOT NULL` hardening, and unique index
remains blocked until its exact owner-run aggregate preflight passes. No SQL was
executed, no migration was created, no Supabase connection was made by Codex,
and no business/customer rows were inspected. Access-control remediation,
Storage, Provider setup/calls, route wiring, automatic-gate implementation,
customer preview behavior, deployment, and Production remain separate later
approval slices.

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

The Agent 69C product boundary permits at most two attempts in the automatic
first-preview lineage: one initial attempt and one retry limited to eligible
429, provider 5xx, or network failures. Timeouts are not automatically retried
because provider completion and charge state may be unknown. One separately
authorized feedback-regeneration lineage may make one additional attempt, for
a maximum of three provider attempts per Concept Brief before human
intervention. Refreshes and duplicate events must reuse the existing identity.

Before each provider call, future server code must atomically reserve estimated
cost against per-brief, daily, and monthly owner-approved limits. Missing or
unavailable generation budget, idempotency, or internal generation-limiter
evidence fails closed. The provider's current documented price is planning
evidence only; pricing must be versioned and reconciled rather than hard-coded.

The existing public submission boundary remains 30 requests per IP fingerprint
per 10 minutes and 5 per HMAC email fingerprint per hour, with its existing
documented fail-open infrastructure posture unchanged by this plan. Cost-bearing
post-persistence generation, customer regeneration, and admin recovery are
separate server-authorized boundaries and fail closed when their limiter,
access, idempotency, audit, or budget evidence is unavailable.

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

The initial OpenAI adapter will not forward reference-image bytes, URLs,
filenames, or metadata. It also excludes customer contact details,
`publicReference`, Concept Brief UUID, database IDs, private paths, raw customer
free text, and admin/reviewer notes. A future reference-image provider flow
requires a separate approved privacy, consent, legal, retention, and private
access task.

OpenAI's published default API posture says API data is not used for training
unless the customer opts in, while abuse-monitoring content may be retained for
up to 30 days. NOVORA does not assume account-specific Zero Data Retention,
residency, or custom retention without later written verification. See the
Agent 69C decision for dated official sources and limitations.

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

Agent 68A / PR #192 merged the provider-neutral, server-only first-preview
runtime foundation. Agent 69A / PR #193 merged the governing docs-only First
Preview Product Contract v1 at
`a368505413b244aace0a8d3dc84df5af9175d1f6`. Agent 69B / PR #194 merged the
docs-only reuse-first data-model inventory and candidate SQL packet at
`184c84acda3caa8c47b81c859b511e3a061cee24`; no SQL or Production change was
implemented. Agent 69C / PR #195 merged the provider, model, privacy,
safety-evidence, cost, retry, rate-limit, and budget decision at
`3cb09d9304b67484457471af23a5a290b1051bba` without provider access or
configuration. Agent 70A / PR #196 then merged the server-only,
dependency-injected GPT Image 2 adapter foundation with fake-client tests at
normal merge commit `68c0042d1fec70cf07b87d47e6d8ef6f3b74e074`.
Agent 70A did not construct a real OpenAI client, access or configure an API
key, make a provider request, generate an image, persist output, change Storage,
activate customer visibility, wire a route, deploy, or change Production.
Agent 70B-1 / PR #197 then merged the owner-run SELECT-only metadata packet at
normal merge commit `e77d2e6267f78ecf1109198ae100149eb8e466e4`. The owner
completed Q01-Q11 on 2026-07-13, and Agent 70B-2 reviewed that evidence and
prepared a documentation-only additive candidate plan without SQL execution or
a Supabase connection.

The required next sequence is explicit:

1. Another independent read-only formal Re-Review of corrected Draft PR #198.
2. Only after that review passes, the owner manually executes separately approved supplemental SELECT-only
   effective-privilege and aggregate compatibility preflights.
3. A later documentation Agent reconciles supplemental results and regenerates
   blocked SQL when needed.
4. A separately approved SQL Agent performs only authorized additive SQL.
5. Owner-run post-execution metadata and aggregate verification.
6. A separate slice implements private generated-asset Storage and secure
   server-mediated or short-lived signed access.
7. A separate provider/environment slice constructs the real provider client,
   handles credentials, and enforces budget, limiter, and call authorization.
8. A separate implementation wires generation only after confirmed persistence.
9. Separate implementations add trusted automatic readiness gates, customer
   First Preview route/UI, and post-preview human review in that order.

Agent 70B-2 is documentation-only. It does not connect to Supabase, execute
SQL, inspect business/customer rows, or implement any later sequence stage.

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
- Owner-approved daily and monthly generation-budget amounts.
- Provider account usage tier, billing owner, data-control settings, and
  account-specific retention evidence.
- The separately approved server-side output-safety evaluator and policy.
- Hosting execution limits and whether durable asynchronous generation is
  required for the selected 150-second deadline.
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
