# NOVORA Agent 55A Admin Read-Only Design Spec And Instruction Display Plan

## 1. Purpose

Agent 55A defines the docs-only plan for a future protected admin read-only
display of internal Design Spec and Hand Sketch Instruction artifacts.

This is planning only. Agent 55A does not implement admin UI, create API
routes, query Supabase, generate or store images, send email, expose anything
to customers, or add any mutation path. It only plans a cautious read-only
admin display layer.

## 2. Background

NOVORA already has Concept Brief submission, protected admin pages, admin review
state, internal notes, and an AI sketch review write path.

Agents 50A, 50B, and 50C created the structured Design Spec JSON Schema v1,
Hand Sketch Instruction Template v1, and Concept Brief to Design Spec planning
foundation. Agents 53D and 53E created and tested pure helper safety
boundaries. Agents 54A, 54B, and 54C planned the concierge workflow, admin
concierge UI workflow, and customer email delivery controls.

Agent 55A plans the first safe admin read-only display step before any
interactive editing, generation, approval, or sending.

## 3. Core read-only display principle

**Read-only first, human trust preserved**

The first admin display should help humans inspect internal artifacts. It must
not mutate state, generate images, send emails, approve customer delivery,
create gallery approval, or expose internal artifacts to customers.

The display should make human review boundaries more visible, not weaker.

Agent 55A also reaffirms:

**Admin-first AI assistance, human-controlled customer trust**

and:

**Human-approved email delivery, never automatic AI customer delivery**

## 4. Current MVP boundary

Current MVP may plan read-only admin display, but it must not:

- implement admin UI in Agent 55A
- add edit controls
- add generation controls
- add approve or send buttons
- add customer preview
- expose unreviewed AI output to customers
- connect image providers
- connect email provider
- send email
- run SQL
- change Supabase schema
- treat generation success as approval
- treat `approved_for_customer` as gallery approval
- imply CAD, quote, order, or production approval

## 5. Recommended read-only display scope

The first future read-only display may eventually show:

- transformed Design Spec draft
- Hand Sketch Instruction draft
- validation summary
- risk flags summary
- current review status
- internal-only indicator
- human review required indicator
- delivery readiness summary
- missing-artifact fallback messages
- source version and timestamp metadata if available in future

The first implementation should not allow editing, approval, generation,
sending, or customer publishing.

## 6. Out-of-scope actions for first implementation

The first read-only implementation should exclude:

- editing Design Spec
- editing Hand Sketch Instruction
- regeneration
- provider calls
- image generation
- email drafting implementation
- email send control
- approval mutation
- status mutation
- gallery control
- public or customer page changes
- new database schema
- new storage bucket
- new auth flow
- production data mutation

## 7. Admin page placement recommendation

The recommended future placement is the protected admin brief detail page,
likely `/admin/briefs/[id]` or the existing public-reference detail route shape
if that remains the route convention.

The read-only display should sit below or near existing review state and
internal notes, be clearly separated from customer-facing content, use an
internal-only visual label, and be collapsed by default if large.

Agent 55A does not implement any route or component.

## 8. Design Spec read-only panel

A future read-only Design Spec JSON draft panel may display:

- schema or template version
- generated or transformed timestamp if available
- piece type
- style direction
- material preferences
- stone preferences
- dimensions or unknowns
- preserved `not sure` or unknown fields
- assumptions
- missing details
- human review gate
- validation issue list

It must not include private contact fields, expose raw customer contact data,
be customer-facing, become a direct provider prompt, imply approval, or imply
CAD, quote, order, or production readiness.

## 9. Hand Sketch Instruction read-only panel

A future read-only Hand Sketch Instruction Template v1 panel may display:

- template version
- internal-only objective
- concept-only purpose
- design focus
- sketch instructions
- preserved unknowns
- forbidden outputs
- human review requirements
- prompt preparation readiness

It must clearly state:

- internal only
- not CAD
- not quote
- not order confirmation
- not production approval
- not customer delivery by itself

It must not become a customer-facing document.

## 10. Validation result summary panel

A future validation display may show:

- validation pass or fail
- issue count
- issue codes
- issue severity
- required blocking fixes
- warning-only issues
- missing required section warnings
- illegal status warnings
- private data leakage warnings
- generation success treated as approval warnings
- gallery shortcut warnings

Validation display should help humans review. It must not auto-fix or
auto-approve.

## 11. Risk flags summary panel

Future risk flags may include:

- unsupported material
- exact-copy reference request
- private contact data risk
- missing human review gate
- CAD implication
- quote implication
- order or production implication
- gallery approval implication
- generation success treated as approval
- missing internal-only flag
- jewelry feasibility concern
- stone size or proportion uncertainty
- prong or setting feasibility uncertainty
- customer delivery risk

High-risk flags should be visually prominent in future implementation, but
Agent 55A does not implement visuals.

## 12. Internal-only boundary indicators

Future display should clearly mark:

- Design Spec draft as an internal planning artifact
- Hand Sketch Instruction as an internal prompt-preparation artifact
- prompt preview, if shown later, as internal only
- draft sketch, if shown later, as internal draft only
- validation and risk flags as admin-only

Boundary labels should prevent admins from mistaking internal artifacts for
customer-ready deliverables.

## 13. Human review gate indicators

Future display may show:

- human review required before generation
- human review required after internal draft generation
- human approval required before customer email delivery
- human decision required before CAD, quote, or production
- separate human decision required before any future gallery use

The display should make gates visible without performing the gate action.

## 14. Review status display

The future read-only display may show the existing legal AI sketch review
statuses:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

This first read-only display does not mutate status. Status mutation remains
part of existing or future controlled admin workflow.

`needs_revision` blocks customer delivery. `approved_for_customer` permits only
human-reviewed customer email delivery readiness, not gallery, CAD, quote,
order, or production approval.

## 15. Customer delivery readiness summary

A future read-only delivery readiness summary may show:

- review status
- no active `needs_revision`
- risk flags resolved or reviewed
- Design Spec present
- Hand Sketch Instruction present
- approved customer asset exists, if applicable in future
- draft customer email exists, if applicable in future
- disclaimers required
- human-controlled send required

It must not enable sending and must not imply readiness for CAD, quote, order,
or production.

## 16. Customer email delivery relationship

Agent 55A follows Agent 54C. The read-only display may help admins understand
whether customer email delivery could later be prepared, but it does not draft
email, send email, implement send-control, bypass the Agent 54C delivery gate,
or expose internal artifacts to customers.

## 17. Gallery approval separation

Gallery approval is separate from customer delivery. `approved_for_customer`
does not equal `approved_for_gallery`.

The first read-only display must not include gallery approval control. Any
future gallery workflow requires separate consent, curation, and privacy
review. No customer delivery asset should be auto-promoted to gallery.

## 18. Data privacy and leakage controls

Future implementation must avoid showing or leaking:

- customer email or phone in prompt-facing sections
- internal notes in customer-facing areas
- reviewer notes in customer email
- raw storage paths
- provider output URLs
- admin-only links
- private contact data in Design Spec or instruction
- secret, environment, or provider metadata

Admin display can show protected contact or reference metadata only in existing
protected admin areas, not inside generation-facing artifact panels.

## 19. Source-of-truth and version display

Future display should identify:

- Design Spec schema version
- Hand Sketch Instruction template version
- prompt version if future prompt preview exists
- source concept brief reference
- generated or transformed timestamp if available
- reviewer timestamp if available
- approval version if available in future
- stale or outdated artifact warning if the brief changes after artifact
  creation

Agent 55A does not create new persistence or versioning.

## 20. Empty, missing, and fallback states

Safe empty states should cover:

- no Design Spec draft yet
- no Hand Sketch Instruction yet
- validation not run
- risk flags unavailable
- internal draft not generated
- concept not approved for customer
- customer delivery not ready
- artifact unavailable due to future storage or provider failure

Empty states should be safe and should not invite automatic customer delivery.

## 21. Accessibility and admin usability notes

Future implementation should use clear headings, avoid dense raw JSON as the
only view, allow collapsible sections, show concise summaries before raw
details, use plain-language warnings, avoid relying only on color for risk or
severity, keep internal and customer-facing labels visually distinct, and avoid
copy that encourages sending or approving too early.

## 22. Future implementation sequence

Recommended cautious next steps after Agent 55A:

1. Agent 55B: implement low-risk read-only admin display using existing data
   and helpers only, if explicitly approved.
2. Agent 55C: plan or implement validation and risk flag read-only display, if
   not included in 55B.
3. Later: admin edit workflow planning for Design Spec and Hand Sketch
   Instruction.
4. Later: internal prompt preview display planning.
5. Later: internal image generation workflow planning.
6. Later: customer email draft preview and send-control implementation
   planning.
7. Later: email sending implementation only after audit, idempotency, and
   failure planning.
8. Website quick preview remains separate future product planning, not current
   MVP.

Agent 55A does not authorize implementation.

## 23. Relationship to existing Agents 50A / 50B / 50C / 53A / 53B / 53C / 53D / 53E / 54A / 54B / 54C

- 50A provides Design Spec JSON Schema v1.
- 50B provides Hand Sketch Instruction Template v1.
- 50C provides Concept Brief to Design Spec transformation planning.
- 53A provides internal AI sketch pipeline planning.
- 53B defines AI sketch implementation boundaries.
- 53C planned pure helper and fake fixture tests.
- 53D implemented low-risk pure helpers and fake fixtures.
- 53E added executable tests for pure helpers.
- 54A planned agent-assisted design concierge workflow.
- 54B planned admin concierge UI workflow.
- 54C planned customer email delivery control.
- 55A plans the cautious read-only admin display layer before interactive
  implementation.

Agent 55A does not supersede internal-only, human-review, email-only, or
gallery-separation boundaries.

## 24. Hard stops

Stop if:

- admin UI implementation is attempted
- customer UI implementation is attempted
- email implementation is attempted
- email is sent
- image generation is implemented
- provider integration is attempted
- Supabase live access or SQL is required
- schema changes are required
- app, API, package, test, config, or lockfile changes are needed
- status mutation is implemented
- approval mutation is implemented
- generation control is implemented
- send control is implemented
- unreviewed AI output would become customer-visible
- internal prompt or raw Design Spec JSON would be exposed to customers
- reviewer or admin notes would be exposed to customers
- private data appears in prompts, customer assets, or public pages
- generation success is treated as approval
- `approved_for_customer` is reused as `approved_for_gallery`
- CAD approval is implied
- quote approval is implied
- order confirmation is implied
- production approval is implied
- Computer Use, plugin, MCP, or third-party integration is required
- production data mutation is proposed
- website quick preview implementation is attempted
- any implementation agent is started

## 25. Decision recommendation

NOVORA should proceed with read-only admin display planning before interactive
UI implementation.

The safest next product step is:

internal structured artifacts -> admin read-only visibility -> clearer human
review -> later controlled implementation -> human-approved email-only customer
delivery

Agent 55A reaffirms:

**Read-only first, human trust preserved**

and:

**Admin-first AI assistance, human-controlled customer trust**
