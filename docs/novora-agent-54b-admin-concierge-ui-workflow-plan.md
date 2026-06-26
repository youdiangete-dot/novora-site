# NOVORA Agent 54B Admin Concierge UI Workflow Plan

## 1. Purpose

Agent 54B defines the admin-side UI workflow plan for NOVORA's
agent-assisted design concierge workflow.

This is docs-only planning. Agent 54B does not implement admin UI, add
provider integration, generate images, send email, expose sketches to
customers, or create customer-facing preview behavior.

The goal is to define how future admin UI should organize agent-assisted
artifacts while preserving human review and approval boundaries.

## 2. Background

NOVORA already has a customer Concept Brief flow and protected admin pages at
`/admin/briefs`. Admin review state and internal notes already exist, and the
AI sketch review write path exists.

Agents 50A, 50B, and 50C created the planning foundation for Design Spec JSON
Schema v1, Hand Sketch Instruction Template v1, and Concept Brief to Design
Spec transformation. Agents 53A through 53E planned, bounded, implemented, and
tested the internal-only AI sketch helper foundation. Agent 54A planned the
agent-assisted design concierge workflow.

Agent 54B translates the concierge concept into an admin UI workflow plan. It
still does not implement code.

## 3. Core admin principle

**Admin-first AI assistance, human-controlled customer trust**

The admin UI may help humans move faster, but it must not let AI bypass human
judgment. Internal AI artifacts must remain clearly separated from
customer-facing delivery, and approval controls must be explicit.

Customer delivery remains email-only in the current MVP.

Agent 54B also reaffirms the Agent 54A principle:

**Fast AI-assisted concept direction + human-reviewed trust layer**

## 4. Current MVP boundary

Current MVP may plan admin-side agent assistance, but it must not:

- show unreviewed AI sketches to customers
- auto-send emails
- auto-approve generated outputs
- connect image providers
- create website quick preview
- create gallery approval
- treat `approved_for_customer` as `approved_for_gallery`
- imply CAD, quote, order, or production approval

The admin UI plan may describe future panels and controls, but Agent 54B does
not implement them.

## 5. Target admin experience

When an admin opens a future brief detail page, the page may eventually show:

- original customer brief
- customer contact and reference image metadata in protected admin-only areas
- agent-generated brief summary
- Design Spec draft
- Hand Sketch Instruction draft
- validation results
- risk flags
- internal prompt preview
- internal-only draft image area
- reviewer comments
- revision request controls
- `needs_revision` state
- `approved_for_customer` control
- draft customer email preview
- audit-style history or event timeline in a future phase

All AI-generated or agent-generated content remains internal until
human-approved.

## 6. Information architecture

The future admin layout should be organized as logical sections:

1. Submission overview
2. Customer details and reference images
3. Agent preparation area
4. Design Spec draft
5. Hand Sketch Instruction draft
6. Risk and validation area
7. Internal prompt preview
8. Internal draft sketch area
9. Human review controls
10. Customer email draft preview
11. Delivery status
12. Future gallery section, separated and disabled by default

Internal and customer-facing areas should not be visually confused. Future UI
should make review state, delivery state, and gallery state separate concepts.

## 7. Customer brief summary area

A protected admin-only summary area may include:

- customer request summary
- piece type
- design style
- stone and material preferences
- reference image count
- missing details
- ambiguity summary
- customer-safe clarification questions

It must not invent unknown details, expose private contact details into prompts,
claim CAD, quote, order, or production approval, or turn customer wording into a
final prompt without Design Spec transformation.

## 8. Design Spec draft panel

A future Design Spec JSON v1 draft panel may show:

- structured design requirements
- preserved unknowns and not-sure values
- material and stone assumptions
- human review gates
- validation status
- validation issue list

Future controls may include regenerate draft, edit draft, mark requires
clarification, and accept for internal prompt preparation.

Human review is required before moving forward. The panel must not auto-approve
customer delivery, expose raw JSON to customers, include private contact data,
include a gallery approval shortcut, or treat generation success as approval.

## 9. Hand Sketch Instruction draft panel

A future Hand Sketch Instruction Template v1 panel may show:

- internal-only sketch objective
- concept-only disclaimer
- preserved unknowns
- design elements
- forbidden outputs
- human review requirements
- prompt preparation readiness

The panel must clearly say the instruction is internal only, not CAD, not a
quote, not order confirmation, not production approval, and requires human
review.

It must not become a customer-facing document.

## 10. Risk flags and safety review panel

A future risk panel should follow the Agent 53D and 53E helper direction. Risk
flags may include:

- unsupported material
- exact-copy reference request
- missing human review gate
- private data
- CAD implication
- quote implication
- order or production implication
- gallery shortcut
- generation success treated as approval
- missing internal-only flag
- unrealistic jewelry feasibility risk
- stone size or proportion uncertainty
- setting or prong feasibility uncertainty

The panel should make risk visible before generation, before approval, and
before customer delivery. High-risk flags should require human action before
`approved_for_customer`.

## 11. Internal prompt preview panel

A future admin-only prompt preview panel may show:

- local-only prompt preview
- prompt version
- source Design Spec version
- source Hand Sketch Instruction version
- internal-only reminder
- provider boundary reminder

It must say the preview is not provider-ready unless future provider integration
explicitly approves it. It must also state there is no API key, no model call,
no generated image, no automatic approval, and no customer delivery.

The prompt preview must not be exposed to customers.

## 12. Internal-only draft image area

A future internal-only sketch draft area may eventually show:

- generated internal draft images
- generation status
- model, size, quality, prompt version, and cost estimate in future
- retry count in future
- reviewer notes
- needs revision marker
- rejected draft marker
- approved for customer marker

It must clearly separate internal draft generated, `needs_revision`,
`approved_for_customer`, and any future separate `approved_for_gallery` concept.

It must not show unreviewed drafts to customers. It must not make generation
success equal approval.

## 13. Human review and revision workflow

The future human review workflow should be:

1. Admin reviews customer brief.
2. Agent prepares draft structure.
3. Human reviews Design Spec.
4. Human reviews Hand Sketch Instruction.
5. Human reviews risk flags.
6. Human reviews internal prompt preview.
7. Human reviews any internal draft image.
8. Human chooses the next action.

Available human actions may include request clarification, revise Design Spec,
revise Hand Sketch Instruction, regenerate internal draft, mark
`needs_revision`, approve for customer, or hold for offline designer/CAD review.

Human review must be required before customer delivery.

## 14. Approval controls

The future UI should use these required review concepts:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

Only `approved_for_customer` allows customer email delivery. Generation success
does not approve anything. `needs_revision` blocks customer delivery.

`approved_for_customer` still does not mean CAD approval, quote approval, order
confirmation, production approval, or gallery approval.

Future UI should avoid dangerous one-click confusion. Approval controls should
use clear labels and confirmation copy.

## 15. Draft customer email preview

A future admin-only customer email draft preview area may show:

- agent-drafted email copy
- concept explanation
- customer-safe disclaimers
- next steps
- clarification questions
- approved concept attachment or link placeholder

It must require human review and must not send automatically in the current MVP.

It must not include internal prompts, raw Design Spec JSON, reviewer notes,
admin notes, private internal risk flags, unapproved sketch links, provider
paths, or storage paths.

Email copy must not claim CAD, quote, order, or production approval.

## 16. Gallery approval separation

Gallery approval is not implemented by Agent 54B.

`approved_for_customer` does not equal `approved_for_gallery`. Future gallery
approval must be a separate explicit control with separate consent, curation,
and privacy review.

Customer delivery approval must not automatically place images in a gallery.
Future gallery controls should be visually separated from customer delivery
controls.

## 17. Website/customer-facing separation

Current MVP customer-facing website may only show safe status messages such as:

- Brief received
- Design review in progress
- Concept direction being prepared
- Designer review required
- Approved concept will be sent by email

It must not show unreviewed AI sketches, internal prompts, raw Design Spec JSON,
reviewer notes, admin notes, risk flags, private contact details, provider
output, storage paths, unapproved image URLs, or gallery approval implication.

## 18. Data, privacy, and access boundaries

Future admin UI may access protected data, but implementation must protect:

- customer contact details
- reference image links
- internal notes
- reviewer notes
- risk flags
- prompt previews
- draft images
- storage paths
- provider metadata

Recommended boundaries:

- no private contact fields in generation-facing prompts
- no internal data in customer emails
- no raw prompt leakage
- no public URL exposure before approval
- protected admin-only access for internal artifacts
- future audit trail for approval and delivery actions

## 19. Status model and state transitions

The safe status model should use the existing legal statuses:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

Suggested transitions:

- `internal_draft_not_generated` to `draft_generated_internal_only`
- `draft_generated_internal_only` to `needs_revision`
- `draft_generated_internal_only` to `approved_for_customer`
- `needs_revision` to `draft_generated_internal_only`
- `needs_revision` to `approved_for_customer`, only after human review

Forbidden transitions:

- generation success to `approved_for_customer` automatically
- any state to gallery approval automatically
- `approved_for_customer` to production approval
- `approved_for_customer` to quote approval
- `approved_for_customer` to CAD approval

## 20. Failure and fallback plan

Future failure and fallback behavior should be:

- incomplete brief means request clarification
- invalid Design Spec blocks prompt preparation
- unsafe Hand Sketch Instruction requires human revision
- risk flags block delivery until reviewed
- unsafe internal prompt preview requires revision before generation
- wrong generated draft becomes `needs_revision`
- future image provider failure falls back to manual designer workflow
- unsafe email draft requires human rewrite
- customer CAD, quote, or production requests route to offline human workflow
- gallery implication blocks progress until a separate gallery decision
- admin uncertainty means hold for designer review

## 21. Relationship to existing Agents 50A / 50B / 50C / 53A / 53B / 53C / 53D / 53E / 54A

Agent 50A provides Design Spec JSON Schema v1.

Agent 50B provides Hand Sketch Instruction Template v1.

Agent 50C provides Concept Brief to Design Spec transformation planning.

Agent 53A provides internal AI sketch pipeline planning.

Agent 53B defines AI sketch implementation boundaries.

Agent 53C planned pure helper and fake fixture tests.

Agent 53D implemented low-risk pure helpers and fake fixtures.

Agent 53E added executable tests for pure helpers.

Agent 54A planned the agent-assisted design concierge workflow.

Agent 54B translates Agent 54A into admin UI workflow planning. It does not
supersede any internal-only or human-review boundary.

## 22. Recommended next implementation sequence

Recommended cautious next steps after Agent 54B:

1. Agent 54C: docs-only customer email draft, review, and send-control plan.
2. Agent 55A: low-risk admin read-only display planning or implementation, only if explicitly approved.
3. Agent 55B: internal-only prompt preview admin workflow planning.
4. Later: admin read-only Design Spec and Hand Sketch Instruction display.
5. Later: provider integration planning.
6. Later: internal-only image generation implementation.
7. Later: semi-automatic email workflow, after explicit send-control and audit planning.
8. Website quick preview remains separate future product planning, not current MVP.

Agent 54B does not authorize implementation.

## 23. Hard stops

Stop if:

- unreviewed AI output would become customer-visible
- generation success is treated as approval
- `approved_for_customer` is reused as `approved_for_gallery`
- email sending becomes automatic
- CAD approval is implied
- quote approval is implied
- order confirmation is implied
- production approval is implied
- private data appears in prompts, customer assets, or public pages
- internal prompts or raw Design Spec JSON are exposed to customers
- SQL, environment, deploy, or provider connection is required
- code, package, config, or lockfile changes are needed
- admin UI implementation is attempted
- customer UI implementation is attempted
- Computer Use, plugin/MCP, or third-party integration is required
- production data mutation is proposed
- website quick preview implementation is attempted
- gallery approval is added or implied
- any implementation agent is started

## 24. Decision recommendation

NOVORA should plan the admin concierge UI around Mode A first:

internal agent assist -> admin-visible drafts and risk flags -> human review ->
human approval -> email-only customer delivery

The admin UI should improve speed, structure, and review quality without
weakening customer trust.

Mode B email semi-automation should wait for Agent 54C and future send-control
planning.

Mode C website quick preview should remain a separate future product path, not
current MVP.

**Admin-first AI assistance, human-controlled customer trust**
