# NOVORA First Preview Data Model And SQL Plan v1

## 1. Status, Authority, And Hard Boundary

This is the Agent 69B docs-only planning packet for the NOVORA First Preview
data model. It is subordinate to
`docs/novora-first-preview-product-contract-v1.md`, which is the governing
product contract after Agent 69A / PR #193 merged at
`a368505413b244aace0a8d3dc84df5af9175d1f6`.

**Candidate SQL only. Nothing in this document has been executed. Codex did
not connect to Supabase. Current Production schema, rows, RLS, grants,
policies, Storage, and customer data were not read or changed. Every table,
column, constraint, index, trigger, function, and status name below must be
revalidated against the live schema before any execution. Execution requires a
separate, explicitly approved user-run or SQL Agent.**

In explicit terms: no SQL executed; SQL has not been executed; no Supabase
connection was made; and the current Production schema was not changed. Current
Production remains mock-only for customer First Preview and has no real image
generation.

This packet does not implement persistence, generation, provider integration,
private asset delivery, customer access, feedback, UI, API, deployment, or any
Production behavior.

## 2. Evidence Basis And Schema Certainty

This inventory distinguishes three evidence levels:

1. **User-verified live metadata:** recorded results from earlier user-run,
   read-only or ALTER verification in the project ledger and dedicated schema
   records.
2. **Current repository usage:** columns selected or written by current `main`.
   This is strong compatibility evidence, but it is not a fresh live-schema
   inspection.
3. **Historical draft only:** proposed fields in older planning documents.
   These fields must never be described as present until live metadata confirms
   them.

Agent 69B used only repository documentation and source inspection. It made no
Supabase connection and inspected no customer rows.

## 3. Existing Relevant Model Inventory

### 3.1 Inventory summary

| Object | Confirmed existence | Relevant confirmed or repository-used fields | Remaining uncertainty |
| --- | --- | --- | --- |
| `public.concept_briefs` | The ledger and current persistence path confirm the table exists. | Current code writes or reads `id`, `public_reference`, `source`, `status`, `piece_type`, `branch`, `structure`, `sub_structure`, `design_objective`, `ai_sketch_instruction`, `brief_payload`, `summary_items`, `api_submission`, `created_at`, and `updated_at`. | A fresh live metadata check must confirm exact types, defaults, constraints, indexes, RLS, grants, and policies. |
| `public.concept_brief_reference_assets` | The ledger and current reference-upload path confirm the table exists. | Current code writes or reads `id`, `concept_brief_id`, `asset_role`, `original_filename`, `bucket_name`, `object_path`, `mime_type`, `size_bytes`, `upload_status`, and `created_at`. | A fresh live metadata check must confirm exact constraints, `updated_at`, access posture, and indexes. This table is for customer references, not generated preview outputs. |
| `public.ai_sketch_jobs` | User-provided metadata recorded in `docs/novora-ai-sketch-review-live-schema-verification.md` confirms the table exists. | RLS enabled; forced RLS false; no explicit policies were visible; visible metadata did not show `anon` or `authenticated` DML grants. Trigger `set_ai_sketch_jobs_updated_at` calls `set_updated_at()` before update. | Exact columns, status values, checks, foreign keys, unique constraints, indexes, grants, and row compatibility were not recorded. Historical draft fields are not proof of live fields. |
| `public.ai_sketch_outputs` | User-provided metadata confirms the table exists. The verified review-table FK confirms outputs have an `id` referenced by `ai_sketch_reviews.ai_sketch_output_id`. | RLS enabled; forced RLS false; no explicit policies were visible; visible metadata did not show `anon` or `authenticated` DML grants. | Exact columns, job/brief linkage, status values, object locator fields, checks, indexes, and trigger posture were not recorded. |
| `public.ai_sketch_reviews` | User-verified metadata and later user-run ALTER verification confirm the table exists. | See the exact combined inventory below. | A fresh metadata check must confirm the current complete column list, constraint definitions, trigger posture, RLS, grants, and policies before more SQL. |
| `novora-ai-sketches` Storage bucket | The durable ledger records the bucket as existing. | Intended for generated AI sketch assets. | Current privacy setting, object naming, policies, access paths, retention, and whether any objects exist were not inspected by Agent 69B. |
| Gallery approval model | No current live `approved_for_gallery` column or gallery table is established by the evidence reviewed for this packet. | `approved_for_gallery` is a separate future consent, curation, privacy, and publication decision. | Exact future gallery schema remains outside Agent 69B. Do not add gallery approval to first-preview readiness. |

### 3.2 `ai_sketch_reviews` combined verified shape

Earlier user-provided live metadata confirmed these original fields:

- `id uuid not null`, default `gen_random_uuid()`.
- `ai_sketch_output_id uuid not null`, foreign key to
  `public.ai_sketch_outputs(id)`.
- `concept_brief_id uuid not null`, foreign key to
  `public.concept_briefs(id)`.
- `review_status text not null`.
- Nullable `reviewer_note`, `customer_safe_note`, and `reviewed_at`.
- `created_at timestamptz not null`, default `now()`.

The user-run Agent 44 ALTER verification later confirmed:

- `review_status` defaults to `internal_draft_not_generated`.
- CHECK `ai_sketch_reviews_review_status_check` allows exactly:
  `internal_draft_not_generated`, `draft_generated_internal_only`,
  `needs_revision`, and `approved_for_customer`.
- `pending` is excluded.
- Nullable `revision_instruction`, `approved_for_customer_at`, `approved_by`,
  `approval_revoked_at`, and `revoked_by` exist.
- `updated_at timestamptz not null default now()` exists, but automatic refresh
  was not confirmed and no trigger was added by that ALTER.

The later user-run duplicate-protection verification recorded in the ledger
confirmed `ai_sketch_reviews_concept_brief_id_key UNIQUE (concept_brief_id)`.

These review fields must remain human-review data. They must not be repurposed
as automatic-gate evidence or as the initial first-preview visibility decision.

### 3.3 Historical draft fields are not live facts

Older schema drafts propose fields such as job `prompt_text`, `model`,
`attempt_count`, and output `storage_bucket`, `storage_key`, `image_url`, and
`customer_visible`. Those documents are useful design history only. Agent 69B
does not claim those names or types exist in Production.

The old draft rule that `customer_visible` requires human approval is
superseded for the initial first preview by Product Contract v1. A later formal
`approved_for_customer` decision remains human-controlled, but it is not a
prerequisite for the initial automatically gated preview.

## 4. Smallest Reuse-First Migration Direction

The smallest defensible direction is:

1. Reuse `ai_sketch_jobs` for logical generation attempts, idempotency, retry,
   timeout, cancellation, structured-input binding, and provider-cost records.
2. Reuse `ai_sketch_outputs` for one normalized output per attempt, controlled
   private object identity, automatic-gate evidence, and the persisted
   first-preview visibility decision.
3. Keep `ai_sketch_reviews` unchanged as the later human-review boundary.
4. Do not create the previously proposed
   `concept_brief_preview_lifecycle` table merely to hold another copy of job,
   output, and visibility states.
5. Consider one append-only feedback table only after read-only metadata proves
   that no suitable feedback table already exists. A feedback record is a
   distinct customer-originated domain and must not be folded into generation,
   visibility, or human-review status.

This direction is conditional. If live metadata shows that `ai_sketch_jobs` or
`ai_sketch_outputs` cannot safely carry these responsibilities, stop and revise
the plan rather than adding duplicate or conflicting columns.

## 5. Separate State Domains

### 5.1 Generation job state

Preferred semantic states are:

- `queued`
- `processing`
- `succeeded`
- `failed`
- `timed_out`
- `cancelled`

Live status values are not yet verified. If Production already uses historical
values such as `pending` and `generating`, preserve and map them rather than
renaming live values destructively. The exact CHECK or enum delta is blocked
until metadata and aggregate-only current-value checks are available.

Job success means only that a bounded provider attempt returned a normalized
candidate output. It never means the output is valid, safe, accessible, or
customer-visible.

### 5.2 Generated output state

Output state is distinct from job state. Candidate semantics are:

- `generated_unvalidated`
- `validation_failed`
- `ready_for_review`
- `superseded`

An output record, output UUID, provider result, object key, or URL is not a
visibility decision.

`ready_for_review` means the exact output passed the automatic validation
boundary and is available to the later internal human workflow. It does not
mean human review has occurred. The same successful automatic-gate transition
may establish `ready_for_review` and `first_preview_ready` together.

### 5.3 First-preview visibility state

Agent 69B proposes a persisted output-bound `visibility_status` with candidate
values:

- `not_ready`
- `first_preview_ready`
- `revoked`

This is justified because customer visibility is a security- and
privacy-relevant server decision that must survive retries and refreshes and be
bound to one exact output. `first_preview_ready` is not proposed as a browser
boolean, Concept Brief status, provider status, review status, or gallery
status.

The persisted decision must also include `first_preview_ready_at`, the
automatic-gate decision version, and output-bound gate evidence. It may be set
only by the future server-side readiness aggregator after all mandatory
automatic gates pass.

`first_preview_ready` does not require `approved_for_customer`. It does not
require or imply `approved_for_gallery`. Per-image human pre-approval is not a
gate for the initial first preview.

### 5.4 Human review state

`ai_sketch_reviews.review_status` remains the existing human workflow:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`approved_for_customer` remains relevant only for later formal human-approved
material or downstream communication. It is not the initial automatic
visibility gate and is not gallery, CAD, quotation, payment, order, or
production approval.

### 5.5 Gallery publication consent

`approved_for_gallery` remains completely separate. No field, constraint, or
transition in this packet maps first-preview visibility or
`approved_for_customer` to public gallery publication.

### 5.6 Customer feedback and correction

Customer feedback is append-only or history-preserving. It is not a job status,
output status, visibility status, or human review status. A regeneration job
links to the feedback that authorized or motivated it and creates a new attempt
and new output lineage. It does not overwrite the original preview or inherit
its automatic evidence.

## 6. Target Lifecycle And Transition Rules

```text
confirmed persistence
  -> validated Design Spec
  -> validated Hand Sketch Instruction
  -> queued job
  -> processing
  -> succeeded job + generated_unvalidated output
  -> all trusted automatic gates pass
  -> ready_for_review output + first_preview_ready
  -> secure customer-visible preview
  -> customer feedback
  -> human correction or regeneration
  -> later formal human-controlled decisions
```

Forbidden transitions include:

- Unconfirmed persistence, `202` fallback, `persisted: false`, `429`, local
  draft, or invalid input to `queued`.
- `processing` directly to customer-visible.
- `succeeded` directly to `first_preview_ready`.
- Output UUID, asset identifier, object key, or URL directly to ready.
- Timeout, cancellation, failure, or late provider completion to ready.
- Browser-supplied status or boolean to any authoritative transition.
- `approved_for_customer` or `approved_for_gallery` inferred from readiness.

## 7. Trusted Persisted Evidence Contract

Each `automatic_gate_evidence` entry should contain a gate code, result,
producer identifier, validator/version, validation time, and output/input
binding hash. It must not contain raw prompts, provider payloads, customer
contact data, reviewer/admin notes, secrets, or private paths.

| Gate | Evidence producer | Persistence location | Server-side validator and time | Fail-closed state | Retry behavior | Immutable or replaceable | Browser authoritative? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Concept Brief persistence confirmation | Existing server persistence result after valid insert response | Job binding plus evidence snapshot on the exact output | Revalidate UUID/reference linkage before job reservation and again at readiness | No job; `not_ready` | Retry submission separately; never generate from fallback | Immutable for the bound job/output | No |
| Concept Brief identity | Server database lookup using internal UUID and `public_reference` | Job/output FKs and identity binding hash | At job reservation, output creation, readiness, and access | Reject mismatch; `not_ready` | No blind retry; correct identity first | Immutable per lineage | No |
| Valid Design Spec | Server Design Spec validator | Version/hash and controlled snapshot on job; result in output evidence | Before provider invocation and again against the bound version at readiness | No provider call or `validation_failed` | New corrected job lineage | Immutable per attempt | No |
| Valid Hand Sketch Instruction | Server instruction validator | Version/hash and controlled snapshot on job; result in output evidence | Before provider invocation and at readiness | No provider call or `validation_failed` | New corrected job lineage | Immutable per attempt | No |
| Structured-input consistency | Server orchestrator comparing brief, reference, language, piece type, and versions | Output evidence bound to both hashes | Before provider invocation and at readiness | `validation_failed`; no asset release | New corrected lineage | Immutable per output | No |
| Generation completion | Provider-neutral server adapter | Job terminal state and sanitized completion metadata | After bounded provider processing | `failed`, `timed_out`, or `cancelled`; never ready | Only within approved caps; new attempt | Immutable terminal attempt record | No |
| Output asset existence | Server Storage verifier | Controlled bucket/object identifier on output plus verification evidence | After private storage and immediately before readiness/access | `validation_failed`; no release | Replacement creates a new output | Immutable for the verified asset version | No |
| Content safety | Future server-controlled safety evaluator | Output evidence | After generation and before readiness | `validation_failed`; quarantine privately | No blind retry; policy decides regeneration | Immutable per output | No |
| Privacy | Future server privacy evaluator | Output evidence | After normalization/storage and before readiness | `validation_failed`; sanitized category only | Correct source or regenerate | Immutable per output | No |
| Access eligibility | Future server access-policy evaluator | Initial readiness evidence plus time-bound access decision outside the asset locator | At readiness and again on every asset request | `not_ready` or deny without existence disclosure | Re-evaluate only after valid access context | Initial decision is output-bound; request authorization is replaceable/revocable | No |
| Output validity | Server exactly-one-image and render-constraint validator | Output evidence | After provider normalization and asset verification | `validation_failed` | New attempt/output | Immutable per output | No |
| Provider metadata non-exposure | Server response/DTO leakage scanner | Output evidence; provider metadata remains internal | Before readiness and every customer response | `validation_failed` or deny response | Correct DTO; do not blindly regenerate | Immutable for response schema/version | No |
| Internal-prompt non-exposure | Server response/DTO leakage scanner | Output evidence; prompt remains job-internal | Before readiness and every customer response | `validation_failed` or deny response | Correct DTO | Immutable for response schema/version | No |
| Reviewer/admin-note non-exposure | Server response/DTO leakage scanner | Output evidence; notes remain in internal tables only | Before readiness and every customer response | `validation_failed` or deny response | Correct DTO | Immutable for response schema/version | No |
| False-success prevention | Server readiness aggregator over every required current result | `automatic_gate_status`, evidence snapshot, validator version, and visibility transition | In one authorized transaction immediately before setting ready | Any missing, stale, contradictory, failed, timed-out, or cross-lineage evidence keeps `not_ready` | Re-run only with complete evidence or new lineage | Readiness event immutable; visibility may later be revoked | No |

Provider-returned booleans are untrusted inputs until a server-owned producer
and validator establish and bind the evidence. A client-supplied boolean is
never accepted for any gate.

## 8. Identity, Access, And Private Asset Boundary

`public_reference` / `publicReference` is a customer-facing reference. It is
not authentication, not authorization, not a secret, and not a bearer token.

Database readiness does not itself authorize access. A ready row says that an
exact output passed the automatic visibility decision; a future request must
still pass an approved customer access mechanism.

Required future access posture:

- Generated assets remain private by default.
- RLS remains enabled and deny-by-default on every server-owned preview table.
  Do not add direct `anon` or `authenticated` access, public asset policies, or
  browser-authoritative writes without a separate approved access design. The
  future customer path remains server-mediated even when a short-lived signed
  asset URL is issued.
- Use server-mediated delivery or a narrowly scoped, short-lived signed URL
  only after a separately approved access design.
- Public provider URLs and permanent public Storage URLs are prohibited for
  customer preview assets.
- An asset URL is not authentication, authorization, or readiness evidence.
- Store controlled asset identifiers or private object keys in internal rows.
  Never return raw private storage paths to customers.
- Verify requester context, Concept Brief/output linkage, visibility state,
  expiry, revocation, and current asset posture on every request.
- Deny without revealing whether a private asset exists.

Agent 69B does not select or implement final customer authentication.

## 9. Idempotency, Retry, Timeout, And Cost Protection

### 9.1 Duplicate prevention

- Reserve the job before a provider call.
- One deterministic idempotency key represents the same Concept Brief,
  generation purpose, Design Spec version/hash, Hand Sketch Instruction
  version/hash, and requested attempt.
- The future reservation path must reject a null or incomplete idempotency key
  or attempt identity before any provider call. Because ordinary PostgreSQL
  unique indexes do not treat nullable identity components as equal, exact SQL
  must use verified non-null write requirements, later verified `NOT NULL`
  constraints, or another reviewed null-safe uniqueness mechanism after legacy
  compatibility is known.
- Browser refresh, replay, duplicate submission, polling, and concurrent
  requests reuse or reject the existing reservation.
- One active first-preview attempt per Concept Brief is enforced after live
  status values are verified.
- One normalized output per MVP attempt is enforced after current output
  linkage is verified.
- At most one output per Concept Brief may be marked current for customer
  preview. Replacement first revokes/supersedes the old current pointer in a
  server transaction.

### 9.2 Retry and regeneration

- Retry limits are finite and selected by Agent 69C before execution.
- Each retry is a new attempt with `parent_job_id`, incremented attempt number,
  and new output/gate evidence.
- Unsafe, privacy-failed, invalid-input, or access-failed results are not
  blindly retried.
- Customer feedback regeneration links to the feedback row and remains
  separate from the original initial request.
- Maximum attempts and retry eligibility are server-controlled, not supplied by
  the browser.

### 9.3 Timeout and cancellation

- Provider operations have a server deadline and cancellation signal.
- `timed_out` and `cancelled` are terminal for that attempt.
- Late provider results cannot overwrite a terminal attempt or a newer lineage.
- Unique indexes do not prevent a late callback from resurrecting a terminal
  row. The future server completion path must use one authorized atomic
  compare-and-set transition conditioned on the attempt still being active,
  not timed out or cancelled, and still belonging to the expected lineage. A
  zero-row transition is a rejected late result; it must not create a current
  output or enter the readiness transaction.
- No output from a timed-out/cancelled attempt becomes current or ready without
  a separate reconciliation rule approved later.

### 9.4 Cost protection

- Record a provider-neutral cost estimate, actual cost when known, currency,
  pricing assumption version, and budget decision.
- Reserve budget before provider invocation and reconcile after terminal result.
- Enforce per-brief attempt caps and owner-approved beta budget before live
  provider use.
- Do not start generation when cost cap, rate limit, provider decision, or
  operating owner is unresolved.
- Provider-cost values and budget decisions are internal-only.

## 10. Candidate SQL Packet - Not Executed

### 10.1 Mandatory preflight before exact SQL is written

The following are read-only candidate verification queries for a separate
approved schema-verification step. They were not run by Agent 69B.

```sql
-- CANDIDATE READ-ONLY PREFLIGHT. NOT EXECUTED BY AGENT 69B.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'concept_briefs',
    'concept_brief_reference_assets',
    'ai_sketch_jobs',
    'ai_sketch_outputs',
    'ai_sketch_reviews',
    'concept_brief_preview_feedback'
  )
order by table_name, ordinal_position;
```

```sql
-- CANDIDATE READ-ONLY PREFLIGHT. NOT EXECUTED BY AGENT 69B.
select
  c.conrelid::regclass as table_name,
  c.conname,
  c.contype,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.conrelid in (
  'public.ai_sketch_jobs'::regclass,
  'public.ai_sketch_outputs'::regclass,
  'public.ai_sketch_reviews'::regclass
)
order by table_name, c.conname;
```

```sql
-- CANDIDATE READ-ONLY PREFLIGHT. NOT EXECUTED BY AGENT 69B.
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
order by tablename, indexname;
```

```sql
-- CANDIDATE READ-ONLY PREFLIGHT. NOT EXECUTED BY AGENT 69B.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews')
order by tablename, policyname;
```

The separate preflight must also use aggregate-only queries to inventory current
job/output status values, null counts, duplicate idempotency candidates, active
job duplicates, output/job cardinality, and current-visible duplicates. Do not
return IDs, prompts, notes, paths, provider payloads, or customer content.

### 10.2 Candidate `ai_sketch_jobs` delta shape

This block illustrates the intended additive shape. It is deliberately not
execution-ready because current columns and naming conflicts are unknown.
Overlapping live fields must be reused, not duplicated.

```sql
-- CANDIDATE ONLY. NOT EXECUTED. DO NOT RUN VERBATIM.
alter table public.ai_sketch_jobs
  add column generation_purpose text,
  add column idempotency_key text,
  add column attempt_number integer,
  add column parent_job_id uuid,
  add column design_spec_snapshot jsonb,
  add column design_spec_version text,
  add column design_spec_hash text,
  add column hand_sketch_instruction_snapshot jsonb,
  add column hand_sketch_instruction_version text,
  add column hand_sketch_instruction_hash text,
  add column timeout_at timestamptz,
  add column timed_out_at timestamptz,
  add column cancelled_at timestamptz,
  add column failure_category text,
  add column retry_eligible boolean,
  add column estimated_cost_micros bigint,
  add column actual_cost_micros bigint,
  add column cost_currency text,
  add column pricing_assumption_version text;

-- Candidate FK only after type/name verification.
alter table public.ai_sketch_jobs
  add constraint ai_sketch_jobs_parent_job_id_fkey
  foreign key (parent_job_id) references public.ai_sketch_jobs(id);
```

Structured snapshots are internal-only and must contain validated structured
artifacts, not raw provider prompts or secrets. If a verified existing artifact
table is already authoritative, replace snapshots with FKs plus immutable
version/hash bindings.

### 10.3 Candidate `ai_sketch_outputs` delta shape

```sql
-- CANDIDATE ONLY. NOT EXECUTED. DO NOT RUN VERBATIM.
alter table public.ai_sketch_outputs
  add column output_type text,
  add column output_sequence integer,
  add column controlled_asset_key text,
  add column asset_content_hash text,
  add column asset_mime_type text,
  add column asset_verified_at timestamptz,
  add column automatic_gate_status text,
  add column automatic_gate_evidence jsonb,
  add column automatic_gate_validator_version text,
  add column automatic_gates_validated_at timestamptz,
  add column visibility_status text,
  add column first_preview_ready_at timestamptz,
  add column visibility_revoked_at timestamptz,
  add column current_for_customer boolean not null default false;
```

`controlled_asset_key` is an internal locator placeholder. The exact name must
be reconciled with any existing bucket/object fields. It must not be returned to
the customer. Do not add or persist public provider URLs or permanent public
Storage URLs.

Candidate checks after existing values and types are verified:

```sql
-- CANDIDATE ONLY. NOT EXECUTED. DO NOT RUN VERBATIM.
alter table public.ai_sketch_outputs
  add constraint ai_sketch_outputs_automatic_gate_status_check
  check (automatic_gate_status in ('pending', 'passed', 'failed')),
  add constraint ai_sketch_outputs_visibility_status_check
  check (visibility_status in ('not_ready', 'first_preview_ready', 'revoked')),
  add constraint ai_sketch_outputs_ready_evidence_check
  check (
    visibility_status <> 'first_preview_ready'
    or (
      automatic_gate_status = 'passed'
      and automatic_gates_validated_at is not null
      and first_preview_ready_at is not null
      and controlled_asset_key is not null
      and asset_verified_at is not null
      and current_for_customer = true
    )
  );
```

The database check is defense in depth. It cannot prove that every JSON gate is
trustworthy; the future server validator must verify all required gate codes,
producer authority, timestamps, hashes, and current lineage in one authorized
transition.

### 10.4 Candidate feedback table, gated on absence verification

A separate table is justified only because customer feedback is append-only
customer input and must not be merged into job, output, visibility, or human
review state. Before creating it, live metadata must prove that no compatible
feedback table already exists.

```sql
-- CANDIDATE ONLY. NOT EXECUTED. CREATE ONLY AFTER ABSENCE AND NAME VERIFICATION.
create table public.concept_brief_preview_feedback (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references public.concept_briefs(id),
  ai_sketch_output_id uuid not null references public.ai_sketch_outputs(id),
  feedback_type text not null,
  customer_message text,
  requested_changes jsonb,
  feedback_status text not null default 'received',
  human_followup_requested boolean not null default false,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  regeneration_job_id uuid references public.ai_sketch_jobs(id),
  constraint concept_brief_preview_feedback_status_check
    check (feedback_status in (
      'received', 'triage_needed', 'correction_needed',
      'regeneration_requested', 'closed'
    ))
);

alter table public.concept_brief_preview_feedback enable row level security;
```

No anonymous or authenticated policy is proposed here. A future server-mediated
feedback write path and access model must be approved first. Do not duplicate
`public_reference`; derive it through the validated Concept Brief relationship.

### 10.5 Candidate duplicate protection and indexes

Names and predicates must be regenerated from verified live values.

```sql
-- CANDIDATE ONLY. NOT EXECUTED. STATUS PREDICATE REQUIRES LIVE VERIFICATION.
create unique index ai_sketch_jobs_idempotency_key_key
  on public.ai_sketch_jobs (idempotency_key)
  where idempotency_key is not null;

create unique index ai_sketch_jobs_attempt_identity_key
  on public.ai_sketch_jobs (
    concept_brief_id, generation_purpose,
    design_spec_hash, hand_sketch_instruction_hash, attempt_number
  );

create unique index ai_sketch_jobs_one_active_first_preview_idx
  on public.ai_sketch_jobs (concept_brief_id)
  where generation_purpose = 'first_preview'
    and status in ('queued', 'processing');

create unique index ai_sketch_outputs_one_per_mvp_attempt_idx
  on public.ai_sketch_outputs (ai_sketch_job_id)
  where output_type in ('first_preview', 'revision_preview');

create unique index ai_sketch_outputs_one_current_customer_preview_idx
  on public.ai_sketch_outputs (concept_brief_id)
  where current_for_customer = true;

create index ai_sketch_outputs_visibility_lookup_idx
  on public.ai_sketch_outputs (concept_brief_id, visibility_status);

create index concept_brief_preview_feedback_output_created_idx
  on public.concept_brief_preview_feedback (ai_sketch_output_id, created_at);
```

If live names use `job_id` instead of `ai_sketch_job_id`, or existing statuses
use `pending` / `generating`, exact SQL must preserve the verified schema rather
than copying this candidate block.

### 10.6 Updated-at behavior

The existing jobs trigger and `set_updated_at()` function are documented, but
their exact current definitions must be verified. Outputs have no recorded
trigger result, and reviews have `updated_at` without confirmed automatic
refresh.

Candidate execution planning should:

1. Verify the existing function and every trigger name first.
2. Reuse the existing function only if its behavior and security posture are
   correct.
3. Add missing triggers in a separate reviewed block.
4. Avoid replacing or duplicating an existing trigger.

No trigger SQL is supplied here because the current definitions are
insufficiently documented for safe exact SQL.

### 10.7 Non-destructive backfill strategy

- Add candidate columns nullable first, except safe defaults that cannot create
  readiness.
- Before any backfill, run aggregate-only row-count, null, duplicate, and status
  preflight checks and approve the expected affected-row bound. Execute only in
  bounded primary-key or other verified stable-key batches with explicit
  transaction/lock timeouts, stop conditions, and post-batch aggregate checks;
  do not issue an unbounded table-wide rewrite.
- Backfill legacy outputs to `visibility_status = 'not_ready'` and
  `automatic_gate_status = 'pending'`; never infer ready from provider success,
  asset ID, URL, old `customer_visible`, or human approval.
- Do not fabricate structured-input hashes or gate evidence for old rows.
- Use aggregate-only prechecks before adding uniqueness or NOT NULL rules.
- Enable new write behavior only after the app and schema agree on exact names.
- Apply stricter constraints only after verified rows comply.

### 10.8 Candidate post-change verification

```sql
-- CANDIDATE READ-ONLY VERIFICATION. NOT EXECUTED BY AGENT 69B.
select visibility_status, automatic_gate_status, count(*)
from public.ai_sketch_outputs
group by visibility_status, automatic_gate_status
order by visibility_status, automatic_gate_status;

select count(*) as invalid_ready_rows
from public.ai_sketch_outputs
where visibility_status = 'first_preview_ready'
  and (
    automatic_gate_status is distinct from 'passed'
    or automatic_gates_validated_at is null
    or first_preview_ready_at is null
    or controlled_asset_key is null
    or asset_verified_at is null
    or current_for_customer is distinct from true
  );

select concept_brief_id, count(*) as current_preview_count
from public.ai_sketch_outputs
where current_for_customer = true
group by concept_brief_id
having count(*) > 1;

select concept_brief_id, count(*) as active_job_count
from public.ai_sketch_jobs
where generation_purpose = 'first_preview'
  and status in ('queued', 'processing')
group by concept_brief_id
having count(*) > 1;
```

Verification outputs must be aggregate-only. Do not paste IDs, customer text,
prompts, notes, object keys, or provider payloads into chat or docs.

### 10.9 Rollback considerations

Rollback must be non-destructive and separately approved:

- Disable future writes and customer visibility before schema rollback.
- Revert dependent application behavior before relaxing constraints.
- Preserve Concept Briefs, jobs, outputs, feedback, and audit evidence.
- Prefer leaving unused additive columns in place over deleting data during an
  incident.
- Do not delete rows or rewrite readiness history to simplify rollback.
- Any constraint or column removal requires verified dependency review,
  backup/export planning, and explicit approval. No destructive rollback SQL is
  included in this packet.

## 11. Failure And Visibility Enforcement

- `202` fallback, `429`, `persisted: false`, unconfirmed persistence, local
  fallback, or invalid structured input cannot reserve a generation job.
- Provider success alone cannot set `first_preview_ready`.
- Asset ID, output ID, controlled object key, or URL existence alone cannot set
  readiness.
- Missing automatic evidence fails closed.
- `processing`, `failed`, `timed_out`, `cancelled`, and invalid outputs are
  never successful customer previews.
- The exact first preview becomes customer-visible immediately after all
  trusted automatic gates pass and a future secure access check succeeds.
- Per-image human pre-approval is not required for the initial first preview.
- Human review follows initial visibility for correction, manufacturability,
  feedback interpretation, regeneration, and formal downstream decisions.
- Human `approved_for_customer` remains separate and later;
  `approved_for_gallery` remains wholly separate.

## 12. Remaining Unknowns And Required Sequence

The packet is intentionally blocked from exact SQL until a separate approved
read-only live-schema verification confirms:

- Full jobs and outputs columns, types, defaults, constraints, indexes, status
  values, and row compatibility.
- Whether output linkage uses `job_id` or `ai_sketch_job_id`.
- Current object locator names and private Storage posture.
- Current policies and complete grant posture.
- Whether a feedback table already exists.
- Current job/output duplicates and aggregate status values.
- Exact provider-neutral cost fields and limits selected by Agent 69C.
- Final access mechanism and operating owner.

Recommended sequence after Agent 69B:

1. Agent 69C: provider, model, privacy, safety-evidence, cost, retry,
   rate-limit, and budget decision.
2. Separate explicitly approved read-only live-schema verification and exact
   SQL regeneration.
3. Separate explicitly approved SQL/schema execution.
4. Private asset Storage and server-mediated or short-lived signed access.
5. Provider adapter implementation.
6. Confirmed-persistence trigger and customer preview route wiring.

None of those later steps is implemented or approved by this document.
