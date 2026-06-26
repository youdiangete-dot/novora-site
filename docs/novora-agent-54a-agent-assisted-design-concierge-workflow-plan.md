# NOVORA Agent 54A Agent-Assisted Design Concierge Workflow Plan

## 1. Purpose

Agent 54A defines the product and operational plan for an
agent-assisted design concierge workflow for NOVORA.

This plan clarifies:

- what can be automated
- what must remain human-reviewed
- what must remain human-approved
- what belongs in current MVP scope
- what belongs only to future phases
- how the workflow fits the existing internal-only AI sketch pipeline

Agent 54A is a planning document only. It does not implement code, connect a
provider, create images, send email, change customer-facing pages, or start an
implementation agent.

## 2. Background

The current NOVORA AI sketch planning state is:

- Agent 50A completed Design Spec JSON Schema v1.
- Agent 50B completed Hand Sketch Instruction Template v1.
- Agent 50C completed Concept Brief to Design Spec transformation planning.
- Agent 53A completed internal AI sketch draft pipeline planning.
- Agent 53B completed AI sketch implementation boundary review.
- Agent 53C completed pure helper and fake fixture test planning.
- Agent 53D completed low-risk pure helper implementation and fake fixtures.

The strategic idea is that NOVORA may use an AI agent as a design concierge
assistant to speed up admin-side brief organization, prompt drafting, sketch
preparation, and customer email drafting without removing human judgment.

The agent should improve structure and speed. It must not become an autonomous
designer, approver, sender, gallery publisher, CAD authority, quote authority,
order authority, or production authority.

## 3. Core principle

Fast AI-assisted concept direction + human-reviewed trust layer

Speed comes from AI and agent assistance. Trust comes from human review,
jewelry judgment, controlled approval, and email-only delivery in the current
MVP.

AI assistance must not bypass human approval. AI generation success is not
approval. Customer confidence depends on human-reviewed output, not raw AI
speed.

## 4. Recommended MVP workflow

The recommended current MVP workflow is:

1. Customer submits brief, contact details, and optional reference images.
2. Admin receives protected notification and reviews the submission.
3. Agent assists by transforming the brief into Design Spec JSON v1.
4. Agent assists by producing Hand Sketch Instruction Template v1.
5. Agent may prepare internal-only sketch prompt previews or draft concept direction.
6. Future provider integration may generate internal draft images only.
7. Human reviews Design Spec, instruction, draft prompt, and any internal sketch.
8. Human revises or requests regeneration as needed.
9. Human approves the final customer-safe direction.
10. Customer receives only the human-approved result by email.

Current MVP must not show unreviewed AI sketches on the website. Current MVP
must not auto-send customer emails. `approved_for_customer` is required before
customer delivery. `approved_for_gallery` is separate and not implied.

## 5. Agent role

The agent may:

- summarize the customer brief
- normalize the request into structured design language
- produce a Design Spec JSON draft
- produce a Hand Sketch Instruction draft
- preserve unknowns and "not sure" answers instead of inventing details
- flag ambiguity
- flag missing customer details
- flag jewelry feasibility risks
- flag unsupported material risks
- flag CAD, quote, order, or production implication risks
- flag private data leakage risks
- flag exact-copy reference risks
- flag gallery shortcut risks
- prepare internal sketch prompt previews
- prepare internal draft concept direction
- draft customer email text for human review
- suggest the next admin action

The agent must not:

- approve for customer
- approve for gallery
- send email automatically in current MVP
- mutate production data without explicit future implementation approval
- enable Computer Use, plugins, or MCP by itself
- connect third-party providers by itself
- display unreviewed images to customers
- treat generation success as approval
- imply CAD, quote, order confirmation, or production approval
- expose internal prompts, private notes, contact details, provider output,
  storage paths, or raw internal data to customers

## 6. Human role

The human is responsible for:

- final design judgment
- jewelry feasibility review
- production feasibility judgment
- customer-safe wording
- deciding whether customer clarification is required
- deciding whether a sketch needs revision
- approving for customer delivery
- separately approving for gallery if gallery approval is ever implemented
- controlling customer email send
- deciding when to move offline to CAD
- deciding when to quote
- deciding when to begin gem procurement
- deciding when to begin production
- protecting against AI hallucination and unsafe claims

The human review layer is not optional.

## 7. Three operating modes

Mode A: Internal agent assist only, recommended first

Mode A is the recommended first mode. It is admin-side only, has no
customer-facing AI preview, no automatic email sending, no provider
requirement, and no Computer Use requirement.

The agent prepares structured drafts and internal prompts. The human reviews
everything. This is the lowest cost and lowest risk mode, and it is the best
fit for the current MVP.

Mode B: Semi-automatic email workflow, future after stability

Mode B is future-only. The agent may prepare customer email drafts and may
package approved assets for human review. The human must review and press send.

Automatic sending remains blocked until a future explicit implementation agent
approves quality, logging, idempotency, audit trail, rollback behavior, resend
behavior, and failure handling. `approved_for_customer` remains required.
`approved_for_gallery` remains separate.

Mode C: AI quick concept preview on website, future product only

Mode C is not current MVP and is not implemented by Agent 54A. It must be a
separate product path, UX-separated from designer-reviewed delivery, and must
not use current admin-approved delivery semantics.

Mode C must include disclaimers that the preview is:

- unreviewed
- style direction only
- not CAD
- not quote
- not order confirmation
- not production approval
- followed by a designer-reviewed version by email

Mode C should not start until the internal review workflow, quality controls,
risk flags, cost controls, and customer wording are mature.

## 8. Customer experience benefits

The customer benefits from:

- faster first response
- clearer design communication
- more structured intake
- fewer vague back-and-forth messages
- more polished first customer reply
- lower customer anxiety after submission
- better explanation of next steps
- a better bridge from emotional brief to jewelry design direction
- preserved human-reviewed trust

This does not mean instant production readiness, CAD readiness, final pricing,
order confirmation, or production approval.

## 9. Customer trust and risk

Key risks include:

- unreviewed AI image errors
- jewelry structure mistakes
- unrealistic prongs, settings, or materials
- wrong stone proportions
- hallucinated details
- exact-copy reference requests
- private customer data leakage
- customer misunderstanding a concept sketch as CAD
- customer misunderstanding a concept sketch as a quote
- customer misunderstanding a concept sketch as order confirmation
- customer misunderstanding a concept sketch as production approval
- gallery approval shortcut confusion
- automated email mistakes
- provider cost overrun
- fragile Computer Use workflows

Mitigations include:

- internal-only status
- human review gate
- explicit approval states
- email-only delivery
- required disclaimers
- risk flags
- no automatic customer delivery
- no automatic gallery approval
- no provider connection in Agent 54A
- fallback to manual designer workflow

## 10. Required disclaimers

Internal admin view:

This is an internal concept direction draft for review. It is not CAD, not a
quote, not order confirmation, and not production approval. It may require
designer refinement before any customer-facing delivery. Final CAD, quote, and
production details are confirmed separately.

Customer email:

This concept direction is an early visual and design direction for review. It
is not CAD, not a quote, not order confirmation, and not production approval.
Designer refinement may still be required. Final CAD, quote, and production
details are confirmed separately.

Future website status page:

Your concept direction is being prepared and reviewed. Any approved concept
will be shared by email. Concept direction is not CAD, not a quote, not order
confirmation, and not production approval. Final CAD, quote, and production
details are confirmed separately.

Future quick preview mode:

This is an unreviewed AI-generated style direction only. It is not CAD, not a
quote, not order confirmation, and not production approval. It may require
designer refinement. A designer-reviewed version follows by email, and final
CAD, quote, and production details are confirmed separately.

## 11. Website status experience without showing unreviewed AI sketches in current MVP

A safe current-MVP website status experience may show messages such as:

- Brief received
- Design review in progress
- Concept direction being prepared
- Designer review required
- Approved concept will be sent by email

It must not show:

- unreviewed AI sketch images
- internal prompts
- raw Design Spec JSON
- reviewer notes
- admin notes
- private contact details
- provider output
- storage paths
- internal risk flags
- generated image URLs before approval
- any gallery approval implication

This is planning only, not implementation.

## 12. Email workflow planning

Current MVP delivery remains email-only after human review and approval.

The agent may draft email copy. A human reviews customer-safe wording, verifies
disclaimers, verifies any attached or linked concept image is approved for
customer, and controls sending.

Automatic sending remains blocked in current MVP. `approved_for_customer` is
required before delivery. `approved_for_gallery` is separate and not implied.

Email must not claim CAD approval, quote approval, order confirmation, or
production approval. Customer feedback should return to the human/admin
workflow.

Future semi-automatic email sending requires a separate implementation plan
covering logging, idempotency, audit trail, rollback, resend behavior, and
failure handling.

## 13. Admin workflow planning

Future admin-side workflow possibilities include:

- brief detail page display of an agent-generated Design Spec draft
- Hand Sketch Instruction draft
- risk flags
- internal prompt preview
- internal-only draft image area
- reviewer note or revision request
- `needs_revision` state
- `approved_for_customer` control
- draft customer email preview
- separate future gallery approval control if ever implemented

Agent 54A does not implement these UI changes. The admin workflow must keep
internal-only artifacts separated from customer-facing delivery. Generation
success must not enable customer delivery without approval. Gallery approval
must remain separate.

## 14. Agent / computer-use workflow planning

Computer Use is not enabled in Agent 54A. Plugins are not enabled. MCP is not
enabled. Third-party providers are not connected.

Future evaluation should prefer deterministic server-side helpers and explicit
APIs before Computer Use. Computer Use may be explored later only for
admin-assist operations.

Any future Computer Use agent must:

- not autonomously deliver customer-facing output
- require human confirmation
- have an audit trail
- not mutate production data without explicit approval

Provider integrations require separate planning and approval.

## 15. Cost strategy

Mode A has the lowest cost because it can use local and deterministic helpers
and does not require image provider calls.

Image generation should remain internal-only and budgeted. Future provider
integrations should record:

- model
- size
- quality
- prompt version
- cost estimate
- retry count
- generation status

NOVORA should avoid anonymous public free image generation. Current MVP should
not offer customer-facing paid generation. Automatic retry loops should not be
added. Generation should stop when budget or retry limits are reached, and the
manual designer workflow should remain the fallback.

Draft tiers should be introduced only after explicit provider integration
approval.

## 16. Failure and fallback plan

If the brief is invalid or incomplete, the agent flags missing information and
asks the human to decide whether clarification is needed.

If Design Spec validation fails, do not proceed to sketch instruction or image
generation.

If Hand Sketch Instruction is incomplete, the human revises it.

If risk flags are present, block customer delivery until reviewed.

If a future provider fails, fall back to the manual designer workflow.

If a generated image is wrong, mark it `needs_revision` and do not send it.

If a generated image is structurally unsafe, do not send it.

If an email draft is unclear or unsafe, the human rewrites it.

If there is accidental gallery implication, block and require separate gallery
approval.

If a cost limit is reached, stop generation and use the manual workflow.

If a customer asks for CAD, quote, or production confirmation, route the request
to the human/offline workflow.

## 17. Relationship to existing Agents 50A / 50B / 50C / 53A / 53B / 53C / 53D / 53E

Agent 50A provides the Design Spec JSON Schema v1 foundation.

Agent 50B provides the Hand Sketch Instruction Template v1 foundation.

Agent 50C provides Concept Brief to Design Spec transformation planning.

Agent 53A provides internal AI sketch pipeline planning.

Agent 53B defines AI sketch implementation boundaries.

Agent 53C planned pure helper and fake fixture tests.

Agent 53D implemented the low-risk pure local helper layer and fake fixtures.

Agent 53E may still add executable tests if the existing test setup allows
without package or config changes.

Agent 53E can remain paused while Agent 54A clarifies the concierge strategy.

Agent 54A does not supersede the hard internal-only and human-review boundaries
from Agents 53A through 53D. Agent 54A expands the product and operations
strategy around agent assistance, but does not authorize unsafe automation.

## 18. Recommended next implementation sequence

The cautious sequence after Agent 54A is:

1. Optional Agent 53E: add executable tests for existing pure helpers only if the existing test setup allows without package or config changes.
2. Agent 54B: docs-only detailed admin concierge UI plan.
3. Agent 54C: docs-only customer email draft, review, and send-control plan.
4. Agent 55A: low-risk admin read-only display of structured Design Spec and Hand Sketch Instruction drafts, only if existing helper surfaces allow.
5. Agent 55B: internal-only prompt preview and admin action planning.
6. Later provider integration planning only after review controls are stable.
7. Later internal-only provider integration implementation.
8. Semi-automatic email workflow only after explicit review and send-control planning.
9. Website quick preview remains separate future product planning, not current MVP implementation.

Provider integration, auto-email, Computer Use, plugin/MCP, and website quick
preview are not part of Agent 54A.

## 19. Hard stops

Stop if:

- unreviewed AI output would become customer-visible
- generation success is treated as approval
- `approved_for_customer` is reused as `approved_for_gallery`
- email sending becomes automatic without explicit future approval
- CAD approval is implied
- quote approval is implied
- order confirmation is implied
- production approval is implied
- private data appears in prompts, customer assets, or public pages
- internal prompts or raw Design Spec JSON are exposed to customers
- SQL, environment, deploy, or provider connection is required
- code, package, config, or lockfile changes are needed
- Computer Use, plugin, MCP, or third-party integration is required
- production data mutation is proposed
- website quick preview implementation is attempted
- gallery approval is added or implied
- any implementation agent is started

## 20. Decision recommendation

NOVORA should adopt Mode A first:

Internal agent assist only -> human review -> human approval -> email-only
customer delivery.

Mode A is the best fit for current MVP because it improves speed and clarity
without weakening the trust layer.

Mode B should be future-only after stability, review controls, audit controls,
and send-control planning.

Mode C should remain a separate future product path, not current MVP.

Fast AI-assisted concept direction + human-reviewed trust layer
