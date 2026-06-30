# NOVORA Agent 55E Artifact SQL Execution Safety And Migration Staging Plan

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

Agent 55E is a docs-only safety and staging plan. It does not execute SQL,
create migrations, access Supabase, change schema, implement app or API
behavior, change admin UI, persist artifacts, generate artifacts, generate
images, send email, create a customer preview, create gallery approval, mutate
status, mutate approval, or touch production data.

## 1. Purpose

Agent 55E defines the docs-only safety review and migration staging plan that
must exist before any future SQL or schema execution for persisted Design Spec
and Hand Sketch Instruction artifacts.

This is planning only. No SQL is executed. No migration is created. Supabase is
not accessed. No schema changes are made. No app or API implementation is added.
No admin UI changes are made. No artifact persistence implementation is added.
No generation, email, customer preview, gallery, CAD, quote, order, or
production implementation is added.

## 2. Background

Agent 55B implemented a protected admin-only read-only display with safe empty
states for internal Design Spec and Hand Sketch Instruction planning artifacts.

Agent 55C planned the source-of-truth and persistence boundaries for future
Design Spec and Hand Sketch Instruction artifacts.

Agent 55D planned a future artifact schema and SQL planning packet. Any SQL in
Agent 55D remains future-only, do-not-run, not-executed, and requiring separate
approval.

Agent 55E plans the execution safety layer that must exist before any future SQL
execution or schema implementation Agent.

## 3. Core execution-safety principle

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

**No SQL execution without frozen packet, human approval, and verification plan**

**Additive schema first, destructive changes blocked**

**Migration planning is not migration execution**

Agent 55E also reaffirms:

**Schema before write path, planning before SQL execution**

**Admin-first AI assistance, human-controlled customer trust**

**Human-approved email delivery, never automatic AI customer delivery**

SQL candidate text is not executable authorization. A PR merge is not permission
to run SQL. Supabase execution requires separate explicit human approval, and
the target environment and project must be confirmed before execution. First
schema work should be additive and reversible where possible. No app write path
should exist before schema safety is verified.

## 4. Current MVP boundary

Agent 55E must not:

- run SQL
- create a migration
- alter Supabase schema
- connect to Supabase
- implement API routes or server actions
- implement an admin write path
- persist artifacts
- generate artifacts
- generate images
- send email
- expose artifacts to customers
- create a customer preview
- create gallery approval
- imply CAD, quote, order, or production approval

CAD, quotation, gem procurement, and production remain offline and separate.

## 5. Relationship to Agent 55D SQL planning packet

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

Agent 55D proposed a candidate schema direction and candidate SQL planning.
Agent 55E does not change or execute Agent 55D candidate SQL.

Agent 55E defines how a future approved Agent should review, freeze, stage,
verify, and stop or roll back around that packet. If Agent 55D candidate SQL is
incomplete or unsafe, Agent 55E recommends a docs-only revision before any
execution is considered.

## 6. SQL packet freeze and review rules

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

The candidate SQL packet must be reviewed and frozen before execution. No edits
should be made during manual execution without a new review. The frozen packet
should be identified by version, date, hash, or commit reference.

Each statement should have a purpose and expected effect. Every table, index,
constraint, trigger, function reuse, and policy should have a matching
verification query. Every candidate statement remains do-not-run until explicit
human approval is granted for a later execution task.

## 7. Human approval gates

No gate is implemented by Agent 55E. Future work should use these gates:

- Gate 1: docs-only schema plan approved
- Gate 2: SQL packet frozen
- Gate 3: execution environment confirmed
- Gate 4: preflight read-only checks pass
- Gate 5: human explicitly approves SQL execution
- Gate 6: post-execution verification passes
- Gate 7: only after schema verification may API/write path planning continue

## 8. Environment and Supabase project confirmation plan

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

Future execution planning must confirm the correct Supabase project name and
the intended environment, such as production, preview, or local. The database
URL and project ID should be confirmed in a trusted Supabase or deployment UI,
not by pasting secrets into chat or docs.

The operator should confirm they are intentionally working in the intended
project. No secrets should be recorded. Service-role keys must not be exposed.
SQL execution must not be delegated to ChatGPT unless a later task explicitly
approves that execution boundary.

## 9. Read-only pre-execution verification plan

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

Before future SQL execution, read-only verification should confirm:

- current required tables exist
- no conflicting artifact tables already exist
- expected extensions or trigger functions exist if needed
- existing `set_updated_at()` function exists if the plan reuses it
- foreign key target `concept_briefs` exists
- no duplicate or conflicting names are present
- current RLS posture is understood conceptually
- no production data mutation is needed for additive schema
- candidate checks are compatible with existing status vocabulary

All such queries are future read-only verification only and must not be run by
Agent 55E.

## 10. Additive migration staging strategy

Future first schema implementation should be additive:

- create new artifact tables only
- create indexes
- create constraints
- create comments
- create RLS policies only after careful planning
- do not alter existing production tables unless separately approved
- do not backfill rows in the first schema implementation
- do not create an app write path in the same Agent
- do not expose new data to customers

## 11. No-destructive-change policy

Hard policy for the first artifact schema stage:

- no drop table
- no drop column
- no truncate
- no delete
- no update production rows
- no destructive alter
- no modifying existing customer submissions
- no changing existing AI sketch review rows
- no changing admin notes
- no changing notification event rows

Any destructive change requires a separate explicit risk review and is out of
scope for Agent 55E.

## 12. Manual SQL execution readiness checklist

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

Future manual execution should not proceed unless:

- SQL packet is frozen
- all statements are labeled and reviewed
- execution account and project are confirmed
- backup or export decision is made if needed
- rollback or stop plan is available
- read-only preflight checks pass
- expected table, index, and constraint names are reviewed
- RLS policy impact is reviewed
- no private data columns are planned
- no customer-facing exposure is included
- human explicitly says execute
- execution operator understands it is manual and not automatic

## 13. Candidate execution order planning

PLANNING ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE HUMAN APPROVAL

Future candidate execution should be staged conceptually in this order:

1. create tables
2. create constraints
3. create indexes
4. create `updated_at` triggers if needed
5. add comments
6. enable or define RLS only if separately reviewed
7. run verification queries
8. do not insert or backfill data in the same pass unless separately approved

This section does not provide executable run commands.

## 14. Post-execution verification plan

Future post-execution verification should confirm:

- table exists
- expected columns exist
- constraints exist
- indexes exist
- FK to `concept_briefs` exists
- uniqueness and idempotency constraints exist
- check constraints and status values exist
- RLS enabled or disabled state matches the plan
- no rows were inserted unintentionally
- no existing rows were changed
- no app behavior changed
- admin UI still renders safe empty states until a read path is implemented

## 15. Rollback / stop / escalation plan

Future execution must stop if:

- wrong project is detected
- unknown existing table conflict appears
- a statement fails
- unexpected schema exists
- RLS uncertainty appears
- permissions uncertainty appears
- verification mismatch appears
- accidental data mutation risk appears
- migration cannot be verified

The operator should stop immediately, record the exact failed statement, avoid
blind retries, and avoid partial follow-up statements without review. Rollback
should happen only if safe and separately approved. Additive no-data changes are
preferred because they reduce rollback risk.

## 16. Duplicate protection and idempotency verification

Future schema review should verify duplicate protection for:

- `concept_brief_id` + `artifact_kind` + `version` uniqueness
- active reviewed artifact uniqueness if recommended
- active draft uniqueness if recommended
- `idempotency_key` uniqueness if used
- duplicate insertion failure behavior
- no blind upsert unless separately planned and protected

## 17. RLS and access-boundary verification

Future RLS review should verify that artifact tables are admin-only. There
should be no anonymous public select, no current-MVP customer select, and no
customer insert, update, or delete path.

Future writes should be server/admin-only through a controlled API. Protected
admin read should remain read-only until a write path exists. Nontrivial RLS
policy must be separately reviewed before execution.

## 18. Private data exclusion verification

Future artifact schema must exclude private contact and provider-sensitive
fields:

- no customer email column
- no phone column
- no WhatsApp column
- no raw contact note column
- no internal admin note column
- no reviewer note raw column
- no raw storage path column
- no provider URL column
- no secret, env, or provider metadata columns

Contact data remains in the existing protected contact model, not in Design
Spec or Hand Sketch Instruction artifacts.

## 19. 55B read-only display compatibility verification

Agent 55B currently shows safe empty states. Schema implementation alone should
not change Agent 55B rendering. After schema exists, Agent 55B should still not
read persisted artifacts until an explicit read-path Agent is approved.

A future read path must be read-only. It must not generate artifacts during
render, transform live brief payloads during render, or use fake fixtures as
production source of truth.

## 20. Future admin write-path readiness boundary

Schema verification must complete before write-path planning. A future write
path must be admin-only and separate create draft, save draft, review, and
supersede behaviors.

Future write-path planning should include validation before review, private data
exclusion before save, safe errors, audit events, and idempotency. Agent 55E
does not implement any write path.

## 21. Future generation linkage readiness boundary

Future generation can only use a reviewed Hand Sketch Instruction. Generation
must link to an artifact id and version. Raw customer brief payloads cannot be
used directly. Private contact fields cannot be used.

Generated output remains an internal draft. Generation success is not approval.
Agent 55E does not implement generation.

## 22. Customer email delivery boundary

Raw Design Spec must not be emailed. Raw Hand Sketch Instruction must not be
emailed. Internal prompts, reviewer notes, and admin notes must not be emailed.

A customer-safe email summary requires human review. Sending remains
human-controlled. A delivery log is a separate future source of truth.
`approved_for_customer` is not equivalent to sent.

## 23. Gallery approval separation

Artifact schema does not authorize gallery use. `approved_for_customer` is not
`approved_for_gallery`.

Gallery use requires separate consent, curation, and privacy review. No artifact
auto-promotes to gallery. Future gallery source-of-truth is separate.

## 24. CAD / quote / order / production separation

Artifact persistence does not equal CAD approval. Artifact persistence does not
equal quote approval. Artifact persistence does not equal order confirmation.
Artifact persistence does not equal production approval.

CAD, quotation, gem procurement, and production remain offline and separate.

## 25. Operational logging and audit expectations

Future operational records should include:

- schema execution log
- manual executor identity kept outside public docs if sensitive
- timestamp
- SQL packet version
- verification results
- failed statement recording
- rollback or stop decisions
- audit records for future artifact writes

Agent 55E does not implement logging.

## 26. Failure modes and recovery planning

Likely future failure modes include permission failure, wrong project detection,
table already exists, constraint name conflict, FK target mismatch, RLS policy
uncertainty, check constraint too strict, verification query mismatch,
accidental exposure risk, and partial execution.

The response should be to stop, record, avoid guessing, avoid manual patching
without review, and prepare follow-up docs-only remediation if needed.

## 27. Future implementation sequence

Recommended cautious next Agents:

1. Agent 55F: Final SQL packet review and manual execution checklist, docs-only.
2. Agent 55G: Schema-only implementation or user-run SQL execution, only if explicitly approved.
3. Agent 55H: Post-execution verification docs, if schema is executed.
4. Agent 55I: Admin artifact write-path planning, docs-only.
5. Agent 55J: Admin artifact create/save draft implementation, if approved.
6. Agent 55K: Extend 55B read-only display to read persisted artifacts, if approved.
7. Later: reviewed Hand Sketch Instruction to internal generation.
8. Later: customer-safe email preview.
9. Later: human-controlled send.
10. Website quick preview remains separate future product path.

## 28. Relationship to existing Agents 50A / 50B / 50C / 53D / 53E / 54A / 54B / 54C / 55A / 55B / 55C / 55D

Agents 50A, 50B, and 50C define artifact structure and transformation planning.
Agents 53D and 53E provide a pure helper and test foundation, not production
persistence. Agents 54A, 54B, and 54C define concierge, admin, and email safety
boundaries.

Agent 55A planned read-only display. Agent 55B implemented safe read-only
empty-state display. Agent 55C planned source-of-truth and persistence
boundary. Agent 55D planned the candidate schema and SQL packet. Agent 55E
plans safety review and staging before any future SQL execution.

Agent 55E does not supersede Agent 55D and does not authorize SQL execution.

## 29. Hard stops

Stop if:

- SQL execution is attempted
- migration file is created
- Supabase live access is attempted
- schema mutation is attempted
- app/API/server action implementation is attempted
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

## 30. Decision recommendation

NOVORA should not execute artifact schema SQL until the SQL packet is frozen,
the target environment is confirmed, read-only preflight checks pass, human
approval is explicit, and post-execution verification is prepared.

Recommended path:

Agent 55D candidate schema planning -> Agent 55E execution safety and migration
staging planning -> Agent 55F final SQL packet / manual verification checklist
-> only then consider schema execution under explicit human approval.

Agent 55E reaffirms:

**No SQL execution without frozen packet, human approval, and verification plan**

**Additive schema first, destructive changes blocked**

**Migration planning is not migration execution**
