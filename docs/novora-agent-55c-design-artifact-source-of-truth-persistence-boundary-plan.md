# NOVORA Agent 55C Design Artifact Source Of Truth And Persistence Boundary Plan

## 1. Purpose

Agent 55C defines the docs-only plan for future internal Design Spec and Hand
Sketch Instruction source-of-truth and persistence boundaries.

This is planning only. Agent 55C does not change schema, execute SQL, implement
API routes or server actions, implement admin UI, generate artifacts, persist
data, send email, create customer previews, mutate status, mutate approval, or
touch production data.

## 2. Background

Agents 50A, 50B, and 50C defined the Design Spec JSON Schema v1, Hand Sketch
Instruction Template v1, and Concept Brief to Design Spec transformation
planning.

Agents 53D and 53E created safe pure helpers, fake fixtures, and executable
tests, but helper output and fake fixture output are not production sources of
truth.

Agents 54A, 54B, and 54C planned the agent-assisted concierge workflow, future
admin workflow, and customer email delivery control.

Agent 55A planned future admin read-only display. Agent 55B implemented the
first protected admin-only read-only display shell with safe empty states
because current admin records do not contain persisted Design Spec or Hand
Sketch Instruction artifacts.

Agent 55C now plans how future persisted internal design artifacts should exist
before any schema, API, admin edit, generation, or send-control work.

## 3. Core persistence principle

**Persist human-reviewed internal artifacts, not raw AI assumptions**

**Source-of-truth before automation**

**Read-only display consumes persisted artifacts; it does not create them**

Future persisted artifacts must be explicit records created through a controlled
workflow. Admin display must not silently generate artifacts, transform live
brief payloads on render, or treat helper output as production persistence.
Fake fixtures are never production artifacts. Generation success is never
approval. Persistence does not equal customer delivery.

Agent 55C also reaffirms:

**Admin-first AI assistance, human-controlled customer trust**

and:

**Human-approved email delivery, never automatic AI customer delivery**

## 4. Current MVP boundary

The current MVP may plan artifact persistence, but Agent 55C must not:

- implement schema
- execute SQL
- write API routes or server actions
- generate artifacts
- persist artifacts
- enable admin editing
- enable provider generation
- enable send-control
- expose artifacts to customers
- make artifacts customer-facing
- add gallery approval
- imply CAD, quote, order, or production approval

## 5. Artifact definitions

Future artifact types should be treated as internal planning and review records:

- Design Spec draft: internal structured interpretation, not approved by default
- Design Spec reviewed version: human-reviewed internal interpretation
- Hand Sketch Instruction draft: internal prompt-preparation draft
- Hand Sketch Instruction reviewed version: human-reviewed instruction for
  future internal generation consideration
- Validation result: internal result tied to a specific artifact version
- Risk flags: internal review flags tied to an artifact and/or source brief
- Source/version metadata: schema, template, source brief, actor, and timestamp
  metadata
- Human reviewer note summary: optional future safe summary, only if explicitly
  designed to exclude private/internal notes
- Customer delivery readiness snapshot: optional future internal snapshot, not a
  send event

Design Spec, Hand Sketch Instruction, validation results, risk flags, metadata,
and internal reviewer notes are admin-only. Only a separately prepared,
human-approved, customer-safe email summary may contribute to customer delivery.
Raw internal prompts and artifacts should not be sent directly.

## 6. Source-of-truth recommendation

Recommended future source-of-truth hierarchy:

- Concept Brief remains the source of truth for the original customer
  submission.
- Design Spec artifact becomes the source of truth for structured internal
  design interpretation.
- Hand Sketch Instruction artifact becomes the source of truth for internal
  sketch prompt-preparation.
- AI sketch review status remains the source of truth for review stage.
- Customer email delivery log, if implemented later, becomes the source of
  truth for the actual delivery event.
- Gallery approval must have a separate future source of truth.

Agent 55C does not propose or execute SQL.

## 7. Creation lifecycle

Recommended future lifecycle:

1. Customer submits a Concept Brief.
2. Admin opens the protected admin detail page.
3. An internal assistant may propose a Design Spec draft in a controlled future
   workflow.
4. A human reviews the Design Spec draft.
5. A human may edit the draft or request regeneration in a future controlled
   workflow.
6. A human confirms a reviewed Design Spec version.
7. A Hand Sketch Instruction draft is created from the reviewed Design Spec.
8. A human reviews the Hand Sketch Instruction.
9. Only then may internal image generation be considered in a separately
   approved future Agent.

Agent 55C does not implement any lifecycle step.

## 8. Human edit and review lifecycle

Future human review rules:

- artifact drafts are not approved by default
- humans can inspect and revise artifacts in a future workflow
- reviewed versions should be distinct from raw drafts
- save actions must be explicit if implemented later
- approval actions must be explicit if implemented later
- status mutation must remain controlled
- `needs_revision` blocks customer delivery
- `approved_for_customer` means email-delivery readiness only, not gallery,
  CAD, quote, order, or production approval

## 9. Versioning model

Future versioning should include:

- artifact version number
- schema or template version
- source Concept Brief version or snapshot hash
- created_by actor type
- reviewed_by actor
- created_at timestamp
- reviewed_at timestamp
- superseded_at timestamp
- stale flag if the Concept Brief changes after artifact creation
- reason for revision
- previous artifact reference

Agent 55C does not implement versioning.

## 10. Validation result persistence boundary

Future validation results should be tied to a specific artifact version.
Validation pass or fail must not approve customer delivery. Validation warnings
should remain internal, exclude private contact fields, and be recomputed when
an artifact changes. Failed validation should block future generation and
delivery workflows until reviewed or corrected.

Agent 55C does not implement validation persistence.

## 11. Risk flags persistence boundary

Future risk flags should be tied to an artifact version and/or Concept Brief.
High-risk flags should require human review, but risk flags should not
auto-approve or auto-reject. Resolved risk should be auditable, and risk flags
should remain admin-only.

Risk flag categories should include privacy leakage, CAD implication, quote
implication, order or production implication, gallery shortcut risk, and
generation-success-as-approval risk.

## 12. Private data exclusion rules

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
- secrets, environment values, or provider metadata

Contact data may remain in existing protected admin contact sections, but not
inside generation-facing artifacts.

## 13. Relationship to Concept Brief data

The Concept Brief remains the original submission source. Artifacts are
structured interpretations, not replacements.

Future artifacts should link internally to the Concept Brief ID and public
reference, preserve unknown or not-sure fields, avoid inventing unsupported
certainty, state assumptions explicitly, and become stale if the source brief
materially changes.

## 14. Relationship to 55B read-only display

Agent 55B currently shows safe empty states because persisted artifacts do not
exist yet.

A future 55B or 55D-type display may read persisted artifacts, but it must
remain read-only unless a separate edit Agent is approved. It must never
generate artifacts on render, silently transform live payloads, or use fake
fixtures as production data. It should show artifact version, status, and
staleness while continuing to hide private contact fields from artifact panels.

## 15. Relationship to future admin edit workflow

A future admin edit workflow must be explicit and protected. Editing an
artifact is separate from approving customer delivery. Saving a draft is
separate from approving it. Customer delivery approval remains separate from
gallery approval.

Future edit workflow should include audit trail, idempotency, and server
confirmation. Optimistic UI must not imply persistence unless the server
confirms the write.

Agent 55C does not implement admin edit workflow.

## 16. Relationship to future AI generation workflow

Future AI generation should consume only a reviewed Hand Sketch Instruction.
It should not consume the raw customer brief directly and must not consume
private contact fields.

Generated images are internal drafts only. Generation success does not approve
customer delivery. Human review is required after generation, and generated
output should link to the artifact version that produced it.

Agent 55C does not implement generation workflow.

## 17. Relationship to customer email delivery

Agent 55C follows Agent 54C. Future customer email may use a human-approved,
customer-safe summary. Raw Design Spec artifacts, raw Hand Sketch Instructions,
internal prompts, reviewer notes, and admin notes should not be emailed
directly.

Send remains human-controlled. A delivery log is a separate future source of
truth. `approved_for_customer` may be necessary for delivery readiness, but it
is not equivalent to sent.

## 18. Gallery approval separation

Gallery approval is separate from artifact review and customer delivery.
`approved_for_customer` does not equal `approved_for_gallery`.

Artifact persistence does not authorize gallery use. Gallery use requires
separate consent, curation, and privacy review. No delivery artifact should
auto-promote to gallery.

## 19. Audit trail and idempotency planning

Future audit and idempotency planning should account for:

- artifact creation event
- artifact update event
- validation event
- review event
- approval event
- supersede event
- generation event linkage
- email delivery event linkage
- idempotency key or duplicate prevention for artifact creation
- actor and timestamp metadata

Agent 55C does not implement audit trail.

## 20. Empty and stale states

Future safe states should include:

- no Design Spec artifact yet
- no Hand Sketch Instruction artifact yet
- validation missing
- risk flags missing
- artifact stale because source brief changed
- artifact superseded
- artifact draft exists but is not reviewed
- reviewed artifact exists but delivery is not ready
- artifact cannot be loaded

All states must remain safe and must not trigger generation or delivery
automatically.

## 21. Failure and rollback states

Future failure handling should account for:

- artifact creation failed
- artifact save failed
- validation failed
- version mismatch
- stale artifact detected
- duplicate artifact attempt
- unauthorized update attempt
- corrupted artifact payload
- rollback to a previous reviewed version, if a future workflow supports it

Agent 55C does not implement rollback.

## 22. Future schema planning boundary

Future schema work may conceptually describe candidate records or tables,
candidate fields, uniqueness and idempotency needs, and privacy constraints.

Future schema work must not be smuggled into Agent 55C. Agent 55C includes no
executable SQL, migration file, Supabase access, schema mutation, or exact
"run this SQL now" packet.

Any future schema Agent must be separately approved and should likely begin
with a docs-only SQL planning packet before implementation.

## 23. Future API/server-action planning boundary

Future API or server-action implementation should be admin-only, validate
status, validate artifact schema and template versions, exclude private contact
fields, separate draft/save/review/approve actions, enforce idempotency, return
safe errors, and avoid blind upsert unless explicitly planned and protected.

Agent 55C does not implement API routes or server actions.

## 24. Future implementation sequence

Recommended cautious next Agents:

1. Agent 55D: docs-only artifact schema / SQL planning packet.
2. Agent 55E: docs-only admin artifact write-path plan.
3. Agent 55F: implement schema only, if approved.
4. Agent 55G: implement admin artifact create/save draft path, if approved.
5. Agent 55H: extend 55B display to read persisted artifacts, if approved.
6. Later: admin edit UI.
7. Later: reviewed Hand Sketch Instruction -> internal image generation.
8. Later: customer-safe email draft preview.
9. Later: human-controlled send.
10. Website quick preview remains a separate future product path, not current
    MVP.

## 25. Relationship to existing Agents 50A / 50B / 50C / 53D / 53E / 54A / 54B / 54C / 55A / 55B

- 50A provides Design Spec JSON Schema v1.
- 50B provides Hand Sketch Instruction Template v1.
- 50C provides Concept Brief to Design Spec transformation planning.
- 53D implemented low-risk pure helpers and fake fixtures.
- 53E added executable tests for pure helpers.
- 54A planned the agent-assisted design concierge workflow.
- 54B planned the admin concierge UI workflow.
- 54C planned customer email delivery control.
- 55A planned future admin read-only artifact display.
- 55B implemented a protected admin-only read-only display shell with safe empty
  states.

Agent 55C does not supersede Agent 55B. It provides a future persistence plan
so a later read-only display can consume real persisted artifacts. Agent 55C
does not authorize implementation by itself.

## 26. Hard stops

Stop if:

- executable SQL is added
- migration file is added
- Supabase live access is attempted
- app, API, or server action implementation is attempted
- admin edit UI is implemented
- customer UI is touched
- provider integration is attempted
- image generation is attempted
- email implementation is attempted
- email is sent
- artifact persistence is implemented
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

## 27. Decision recommendation

NOVORA should define artifact source-of-truth and persistence boundaries before
implementing schema, write APIs, admin edit UI, or generation.

Recommended sequence:

Concept Brief original submission -> persisted internal Design Spec draft ->
human-reviewed Design Spec version -> persisted Hand Sketch Instruction draft
-> human-reviewed Hand Sketch Instruction -> internal generation only -> human
review -> human-approved email-only customer delivery

Agent 55C reaffirms:

**Persist human-reviewed internal artifacts, not raw AI assumptions**

**Source-of-truth before automation**

**Read-only display consumes persisted artifacts; it does not create them**
