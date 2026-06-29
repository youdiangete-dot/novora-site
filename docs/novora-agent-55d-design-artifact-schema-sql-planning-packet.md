# NOVORA Agent 55D Design Artifact Schema SQL Planning Packet

## 1. Purpose

Agent 55D defines a docs-only schema and SQL planning packet for future
persisted Design Spec and Hand Sketch Instruction artifacts.

This is planning only. Agent 55D does not execute SQL, create migrations,
access Supabase, change schema, implement app or API behavior, change admin UI,
persist artifacts, generate artifacts, generate images, send email, create a
customer preview, create gallery approval, mutate status, mutate approval, or
touch production data.

## 2. Background

Agents 50A, 50B, and 50C defined the Design Spec JSON Schema v1, the Hand
Sketch Instruction Template v1, and the Concept Brief to Design Spec
transformation plan.

Agents 53D and 53E created safe pure helpers, fake fixtures, and executable
tests, but helper output and fake fixtures are not production persistence.

Agent 55B added a protected admin-only read-only display with safe empty states
because current admin records do not contain persisted Design Spec or Hand
Sketch Instruction artifacts.

Agent 55C planned the source-of-truth and persistence boundary. Agent 55D turns
that boundary into a future schema and SQL planning packet only.

## 3. Core schema planning principle

**Schema before write path, planning before SQL execution**

**Persist reviewed internal artifacts with versioned boundaries**

**A read-only display must consume persisted artifacts, not create them**

Schema design must come before any write implementation. SQL planning is not
SQL execution. Any candidate SQL in this packet is future-only and must be
separately reviewed and approved before use.

Future artifact records must be explicit, internal, versioned, and linked to
the Concept Brief source. Fake fixtures must never become the production source
of truth. Helper output must not be treated as persistence. Generation success
is never approval, and artifact persistence is not customer delivery.

Agent 55D also reaffirms:

**Admin-first AI assistance, human-controlled customer trust**

and:

**Human-approved email delivery, never automatic AI customer delivery**

## 4. Current MVP boundary

Agent 55D must not:

- run SQL
- create a migration
- alter Supabase schema
- implement API routes or server actions
- implement admin edit UI
- persist artifacts
- generate artifacts
- generate images
- send email
- expose artifacts to customers
- create a customer preview
- create gallery approval
- imply CAD, quote, order, or production approval

## 5. Existing data model context

Based on project docs only, the current NOVORA data model includes:

- `concept_briefs` for original Concept Brief submissions.
- `concept_brief_contacts` for contact information.
- `concept_brief_reference_assets` for reference image metadata.
- `ai_sketch_jobs`, `ai_sketch_outputs`, and `ai_sketch_reviews` for AI sketch
  workflow planning and review context.
- `admin_notes` for admin review state and internal notes.
- `concept_brief_notification_events` for notification idempotency context.

Agent 55D does not query Supabase, inspect live schema, or verify production
data.

## 6. Artifact persistence requirements

Future persistence should support:

- Design Spec draft and reviewed versions.
- Hand Sketch Instruction draft and reviewed versions.
- Concept Brief linkage for every artifact.
- Versioning, stale states, and superseded states.
- Validation result linkage.
- Risk flag linkage.
- Private contact and internal-note exclusion.
- Preserved unknown, not-sure, and missing-detail fields.
- Schema and template version tracking.
- Actor and timestamp tracking.
- Idempotency and duplicate prevention.
- Safe 55B read-only display consumption.
- Separation from generation and customer delivery.

## 7. Single-table vs multi-table design options

Option A is a unified artifact table such as conceptual `design_artifacts`.

Pros:

- One versioning and lifecycle model.
- One audit and idempotency model.
- Easier 55B read-only consumption.
- Easier validation and risk linkage.
- Easier duplicate protection.

Cons:

- Artifact payload differs by type.
- Stronger validation is required per `artifact_kind`.

Option B is separate artifact tables such as conceptual
`design_spec_artifacts` and `hand_sketch_instruction_artifacts`.

Pros:

- Type-specific constraints can be clearer.
- Domain separation is visually obvious.

Cons:

- Versioning and audit logic are duplicated.
- Future display and reporting need more joins and branching.
- Lifecycle handling can drift between artifact types.

Recommendation: start with a unified conceptual `design_artifacts` table using
`artifact_kind` to distinguish `design_spec` and `hand_sketch_instruction`.
Keep separate tables as a future option only if type-specific constraints become
necessary.

## 8. Recommended schema direction

The recommended future direction is:

- `design_artifacts` as the canonical internal artifact table.
- `design_artifact_validation_results` for validation snapshots, unless an
  embedded validation summary is chosen for a smaller first implementation.
- `design_artifact_risk_flags` for risk flags, unless an embedded risk summary
  is chosen for a smaller first implementation.
- `design_artifact_events` for audit and event history if future audit scope
  requires durable event records.

Final SQL remains future candidate only and requires separate approval.

## 9. Candidate artifact table design

Conceptual `design_artifacts` fields:

- `id`: internal artifact UUID.
- `concept_brief_id`: foreign key to the original Concept Brief.
- `artifact_kind`: `design_spec` or `hand_sketch_instruction`.
- `artifact_status`: lifecycle state such as draft, reviewed, stale, or
  superseded.
- `version`: per-Concept Brief, per-kind version number.
- `schema_version`: Design Spec schema version when relevant.
- `template_version`: Hand Sketch Instruction template version when relevant.
- `source_concept_brief_hash`: hash of the source brief snapshot used to detect
  stale artifacts.
- `source_concept_brief_updated_at`: source brief timestamp captured at artifact
  creation or review.
- `payload`: internal structured JSON payload.
- `payload_summary`: short admin-readable summary.
- `assumptions`: explicit assumptions made during interpretation.
- `missing_details`: unresolved unknowns or customer not-sure fields.
- `private_data_excluded`: explicit confirmation that generation-facing private
  data was excluded.
- `created_by_type`: future actor type, such as admin, service, or assistant.
- `created_by_admin_id`: future admin actor reference if available.
- `reviewed_by_type`: future reviewer actor type.
- `reviewed_by_admin_id`: future reviewer reference if available.
- `created_at`: artifact creation timestamp.
- `updated_at`: latest mutable timestamp for drafts or metadata.
- `reviewed_at`: human review timestamp.
- `superseded_at`: timestamp when replaced by a newer artifact.
- `stale_at`: timestamp when source changes made the artifact stale.
- `idempotency_key`: duplicate-protection key for future create actions.

Agent 55D does not implement this table.

## 10. Candidate validation result design

Future validation storage has two options:

- Embed a validation snapshot on `design_artifacts` for a smaller first
  implementation.
- Store validation snapshots in `design_artifact_validation_results` for
  clearer history and version linkage.

Candidate validation fields:

- `artifact_id`
- `artifact_version`
- `validation_status`
- `issue_count`
- `blocking_issue_count`
- `warning_count`
- `validation_codes`
- `validation_summary`
- `validated_at`
- `validator_version`

Validation pass does not approve customer delivery. Validation results must not
include private contact fields. Failed validation should block future generation
or delivery preparation until corrected or human-reviewed.

## 11. Candidate risk flag design

Future risk storage has two options:

- Embed risk flags on `design_artifacts` for a smaller first implementation.
- Store risk flags in `design_artifact_risk_flags` for lifecycle tracking and
  resolution history.

Risk categories should include:

- private data leakage
- CAD implication
- quote implication
- order implication
- production approval implication
- gallery shortcut risk
- generation-success-as-approval risk
- unsupported material
- exact-copy reference risk
- jewelry feasibility uncertainty
- stone size or proportion uncertainty
- customer delivery risk

Risk flags are internal-only. They do not auto-approve or auto-reject. High-risk
flags require human review, and resolved risk should be auditable.

## 12. Candidate artifact event / audit design

If future audit scope requires it, conceptual `design_artifact_events` may
record:

- `artifact_created`
- `artifact_updated`
- `validation_run`
- `risk_flag_added`
- `risk_flag_resolved`
- `artifact_reviewed`
- `artifact_superseded`
- `artifact_marked_stale`
- `generation_started_from_artifact`
- `customer_email_prepared_from_artifact`
- `customer_email_sent_from_artifact`

Customer email events are future-only. Generation events are future-only. No
event storage is implemented in Agent 55D.

## 13. Lifecycle status model

Suggested artifact statuses:

- `draft`
- `reviewed_internal`
- `needs_revision`
- `superseded`
- `stale`
- `archived`

Artifact status is not the same as AI sketch review status. Artifact
`reviewed_internal` does not equal `approved_for_customer`.
`approved_for_customer` remains an AI sketch or customer-delivery readiness
status, not artifact review. No artifact status implies gallery approval, CAD,
quote, order, or production approval.

## 14. Versioning and staleness model

Future versioning should follow these rules:

- Increment `version` when the artifact payload materially changes.
- Mark an artifact stale if the source Concept Brief changes after artifact
  creation or review.
- Mark an older artifact superseded when a newer reviewed version replaces it.
- Treat reviewed versions as immutable or superseded, not silently mutated.
- Allow draft updates only with future audit tracking.

Agent 55D does not implement versioning.

## 15. Concept Brief linkage

Each artifact must link to `concept_briefs.id`. Admin display may also show the
customer-visible public reference for readability.

Artifacts must preserve customer unknowns, not-sure choices, and missing-detail
signals. An artifact is a structured interpretation, not a replacement for the
Concept Brief. Source hash and timestamp fields help detect stale artifacts.

## 16. Private data exclusion rules

Design Spec and Hand Sketch Instruction artifacts must not include:

- customer email
- phone
- WhatsApp
- raw contact note
- internal admin notes
- reviewer notes
- raw storage paths
- provider output URLs
- admin-only links
- secrets
- environment values
- provider metadata

Contact data may remain in existing protected admin contact sections, but not
inside generation-facing artifacts.

## 17. Idempotency and duplicate protection

Future duplicate protection should include:

- An idempotency key for artifact creation.
- Uniqueness for `concept_brief_id`, `artifact_kind`, and `version`.
- Optional uniqueness for one active reviewed artifact per Concept Brief and
  artifact kind.
- Optional uniqueness for one non-superseded draft per Concept Brief and
  artifact kind if the future workflow needs it.
- No blind upsert unless separately planned and protected.
- Duplicate insert attempts should fail safely.

Agent 55D does not implement constraints.

## 18. RLS and access boundary planning

Future access boundaries should treat artifacts as admin-only:

- no anonymous public read
- no customer read in the current MVP
- no customer write
- service-role or server-only writes through future controlled APIs
- admin-only reads through protected admin routes
- no artifact exposure on customer pages
- separately planned RLS policy before any execution

Any RLS SQL must be future candidate only, do-not-run, not-executed, and
separately approved.

## 19. Admin write-path boundary

A future admin write path should require:

- admin-only access
- explicit create draft action
- explicit save draft action
- explicit review or confirm action
- explicit supersede action
- validation before review
- private data exclusion before save
- no blind upsert
- safe error messages
- audit event creation
- required idempotency key

Agent 55D does not implement any write path.

## 20. 55B read-only display consumption

Agent 55B currently shows safe empty states because persisted artifacts do not
exist yet.

A later display may fetch persisted artifacts, but it must not generate
artifacts on render, transform live brief payloads, or use fake fixtures. It
should show artifact kind, version, status, validation summary, risk flags,
stale status, and reviewed timestamp.

The display remains read-only until a separate edit Agent is approved.

## 21. Future generation linkage

Future generation should consume only a reviewed Hand Sketch Instruction. It
must link generated output to the artifact ID and version that produced it.

Generation must not consume the raw customer brief directly and must not consume
private contact fields. Generated images remain internal drafts. Generation
success is not approval, and human review is required after generation.

## 22. Customer email delivery linkage

A future customer-safe email summary may reference reviewed artifacts
conceptually, but raw Design Spec payloads, raw Hand Sketch Instructions,
internal prompts, reviewer notes, and admin notes should not be emailed.

Send remains human-controlled. A delivery log is a separate future source of
truth. `approved_for_customer` may be necessary for readiness, but it is not
equivalent to sent.

## 23. Gallery approval separation

Artifact persistence does not authorize gallery use.

`approved_for_customer` does not equal `approved_for_gallery`. Gallery use
requires separate consent, curation, and privacy review. No artifact, generated
output, or delivery record should auto-promote to gallery.

## 24. Candidate SQL packet - future only, do not run

FUTURE CANDIDATE ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE APPROVAL

The following SQL-like packet is a planning artifact only. It was not executed,
must not be run from Agent 55D, and requires a separate approved SQL Agent or
manual database-change decision before any use.

```sql
-- FUTURE CANDIDATE ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE APPROVAL

-- Candidate internal artifact source of truth.
create table if not exists design_artifacts (
  id uuid primary key default gen_random_uuid(),
  concept_brief_id uuid not null references concept_briefs(id),
  artifact_kind text not null check (
    artifact_kind in ('design_spec', 'hand_sketch_instruction')
  ),
  artifact_status text not null check (
    artifact_status in (
      'draft',
      'reviewed_internal',
      'needs_revision',
      'superseded',
      'stale',
      'archived'
    )
  ),
  version integer not null check (version >= 1),
  schema_version text,
  template_version text,
  source_concept_brief_hash text,
  source_concept_brief_updated_at timestamptz,
  payload jsonb not null,
  payload_summary text,
  assumptions jsonb not null default '[]'::jsonb,
  missing_details jsonb not null default '[]'::jsonb,
  private_data_excluded boolean not null default false,
  created_by_type text not null,
  created_by_admin_id uuid,
  reviewed_by_type text,
  reviewed_by_admin_id uuid,
  reviewed_at timestamptz,
  superseded_at timestamptz,
  stale_at timestamptz,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists design_artifacts_kind_version_unique
  on design_artifacts (concept_brief_id, artifact_kind, version);

create unique index if not exists design_artifacts_idempotency_unique
  on design_artifacts (idempotency_key);

create index if not exists design_artifacts_concept_brief_kind_status_idx
  on design_artifacts (concept_brief_id, artifact_kind, artifact_status);

-- Candidate validation snapshots.
create table if not exists design_artifact_validation_results (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references design_artifacts(id),
  artifact_version integer not null,
  validation_status text not null check (
    validation_status in ('not_run', 'passed', 'failed', 'warning')
  ),
  issue_count integer not null default 0,
  blocking_issue_count integer not null default 0,
  warning_count integer not null default 0,
  validation_codes jsonb not null default '[]'::jsonb,
  validation_summary text,
  validator_version text not null,
  validated_at timestamptz not null default now()
);

-- Candidate internal risk flags.
create table if not exists design_artifact_risk_flags (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references design_artifacts(id),
  risk_category text not null,
  risk_severity text not null check (
    risk_severity in ('info', 'warning', 'blocking')
  ),
  risk_summary text not null,
  resolved_at timestamptz,
  resolved_by_admin_id uuid,
  created_at timestamptz not null default now()
);

-- Candidate audit/event history.
create table if not exists design_artifact_events (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid references design_artifacts(id),
  concept_brief_id uuid not null references concept_briefs(id),
  event_type text not null,
  actor_type text not null,
  actor_admin_id uuid,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table design_artifacts is
  'FUTURE CANDIDATE ONLY. Internal Design Spec and Hand Sketch Instruction artifacts. Do not store private contact data, raw admin notes, secrets, provider URLs, or customer delivery approval here.';
```

No migration file is created. No live Supabase access occurs. No production data
is read or changed.

## 25. Rollback and migration safety planning

Future migration safety should use:

- docs-only SQL planning first
- separate SQL packet review
- separate user-run manual SQL decision if needed
- preflight checks before execution
- backup or export recommendation if needed later
- dry-run or `information_schema` checks
- no destructive operations in the first schema implementation
- additive schema first
- rollback plan for failed migration
- post-execution verification plan

Agent 55D does not execute any migration.

## 26. Future implementation sequence

Recommended cautious next Agents:

1. Agent 55E: Finalize artifact SQL packet and manual verification checklist,
   docs-only.
2. Agent 55F: Implement schema only, if explicitly approved.
3. Agent 55G: Plan admin artifact write path, docs-only.
4. Agent 55H: Implement admin artifact create/save draft path, if approved.
5. Agent 55I: Extend 55B display to read persisted artifacts, if approved.
6. Later: admin edit UI.
7. Later: reviewed Hand Sketch Instruction -> internal generation.
8. Later: customer-safe email draft preview.
9. Later: human-controlled send.
10. Website quick preview remains a separate future product path.

## 27. Relationship to existing Agents 50A / 50B / 50C / 53D / 53E / 54A / 54B / 54C / 55A / 55B / 55C

- 50A provides Design Spec JSON Schema v1.
- 50B provides Hand Sketch Instruction Template v1.
- 50C provides Concept Brief to Design Spec transformation planning.
- 53D and 53E provide pure helper and test foundations, not production
  persistence.
- 54A, 54B, and 54C define concierge, admin workflow, and email boundaries.
- 55A planned read-only admin display.
- 55B implemented safe read-only empty-state display.
- 55C planned source-of-truth and persistence boundaries.
- 55D plans future schema and SQL packet boundaries only.

Agent 55D does not supersede Agent 55C and does not authorize schema execution.

## 28. Hard stops

Stop if:

- SQL is executed
- a migration file is created
- Supabase live access is attempted
- schema mutation is attempted
- app, API, or server action implementation is attempted
- admin UI implementation is attempted
- customer UI is touched
- artifact persistence is implemented
- provider integration is attempted
- image generation is attempted
- email implementation is attempted
- email is sent
- status mutation is implemented
- approval mutation is implemented
- fake fixtures are used as production source of truth
- helper output is treated as persisted production artifact
- raw customer brief is used directly for image generation
- private contact data enters Design Spec or Hand Sketch Instruction artifacts
- generation success is treated as approval
- `approved_for_customer` is reused as `approved_for_gallery`
- CAD, quote, order, or production approval is implied
- website quick preview implementation is attempted
- Computer Use, plugin, MCP, or third-party integration is required
- production data mutation is proposed
- any implementation agent is started

## 29. Decision recommendation

NOVORA should plan the artifact schema before implementing any artifact write
path.

Recommended direction:

Concept Brief original submission -> versioned internal `design_artifacts`
source of truth -> human-reviewed Design Spec artifact -> human-reviewed Hand
Sketch Instruction artifact -> internal generation only after reviewed
instruction -> human review -> human-approved email-only customer delivery

Agent 55D reaffirms:

**Schema before write path, planning before SQL execution**

**Persist reviewed internal artifacts with versioned boundaries**

**A read-only display must consume persisted artifacts, not create them**
