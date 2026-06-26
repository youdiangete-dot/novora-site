# NOVORA Agent 54C Customer Email Delivery Control Plan

## 1. Purpose

Agent 54C defines the customer email draft and delivery control plan for
NOVORA's agent-assisted design concierge workflow.

This is docs-only planning. Agent 54C does not implement email sending, modify
Resend or other email provider code, send customer email, attach or generate
real sketch assets, or change customer/admin UI.

The purpose is to define how future email workflows should preserve human
review, customer-safe wording, explicit approval gates, and email-only customer
delivery in the current MVP.

## 2. Background

NOVORA already has customer Concept Brief submission, protected admin pages at
`/admin/briefs`, admin notification email, admin review state and internal
notes, and an AI sketch review write path.

Agents 50A, 50B, and 50C created the Design Spec JSON Schema v1, Hand Sketch
Instruction Template v1, and Concept Brief to Design Spec planning foundation.
Agents 53A through 53E planned, bounded, implemented, and tested internal-only
AI sketch helper foundations. Agent 54A planned the agent-assisted design
concierge workflow, and Agent 54B planned the admin concierge UI workflow.

Agent 54C plans the next layer: human-reviewed customer delivery by email.

## 3. Core email delivery principle

**Human-approved email delivery, never automatic AI customer delivery**

The agent may help draft email. AI may help structure customer-safe copy. A
human must review and approve the wording, approve the attached or linked
concept asset, and control sending in the current MVP.

`approved_for_customer` is required before concept delivery. Generation success
is not approval. `approved_for_customer` is not `approved_for_gallery`.

Agent 54C also reaffirms:

**Fast AI-assisted concept direction + human-reviewed trust layer**

## 4. Current MVP boundary

Current MVP may plan email drafting and delivery controls, but it must not:

- auto-send emails
- send unreviewed AI content
- send unreviewed AI sketches
- connect or modify email provider code
- create email API implementation
- attach generated images automatically
- expose internal prompts or raw Design Spec JSON
- include reviewer notes or admin notes in customer email
- claim CAD, quote, order, or production approval
- create gallery approval
- create website quick preview
- treat `approved_for_customer` as `approved_for_gallery`

Agent 54C does not implement these workflows.

## 5. Recommended MVP email workflow

The recommended current MVP workflow is:

1. Customer submits brief.
2. Admin reviews submission.
3. Agent may draft internal Design Spec, instruction, and email copy.
4. Human reviews Design Spec and Hand Sketch Instruction.
5. Human reviews risk flags and any internal sketch draft.
6. Human approves final customer-safe concept direction.
7. Admin marks or confirms `approved_for_customer`.
8. Agent may prepare a draft customer email.
9. Human reviews the email wording.
10. Human verifies disclaimers.
11. Human verifies the approved concept asset or link.
12. Human sends email manually or through a future explicitly approved
    controlled send flow.
13. Customer replies by email or through a future controlled feedback path.
14. Admin routes feedback to revision, clarification, CAD, quote, or offline
    workflow as appropriate.

Current MVP remains email-only delivery after human approval.

## 6. Agent role in email drafting

The agent may:

- draft customer email copy
- summarize concept direction in customer-safe language
- generate clarification questions
- explain next steps
- include required disclaimers
- suggest a subject line
- suggest attachment or link placeholders
- suggest response options
- flag missing approval requirements
- flag unsafe wording
- flag CAD, quote, or production implication risk
- flag private or internal data leakage
- flag gallery approval confusion
- preserve unknowns and avoid inventing details

The agent must not:

- send email automatically in current MVP
- approve wording
- approve concept assets
- choose final attachment without human review
- include internal prompts
- include raw Design Spec JSON
- include reviewer notes
- include admin notes
- include internal risk flags
- include private storage paths
- include unapproved sketch URLs
- imply CAD, quote, order, or production approval
- imply gallery approval
- treat generation success as approval

## 7. Human role in email review and sending

The human is responsible for:

- final customer-safe wording
- confirming the concept direction is approved for customer
- checking the concept asset or link is approved
- checking disclaimers
- checking jewelry feasibility wording
- deciding whether customer clarification is needed
- deciding whether to deliver concept or hold for revision
- controlling send
- deciding whether to move to CAD, quote, gem procurement, or production
  offline
- deciding whether customer feedback requires revision

Human review is mandatory before customer delivery.

## 8. Required delivery gate

Customer concept email delivery requires:

- `approved_for_customer`
- no active `needs_revision`
- no unresolved high-risk flags that block customer delivery
- concept asset approved for customer
- email copy reviewed by human
- disclaimers present
- no private or internal data leakage
- no CAD, quote, order, or production approval implication
- no gallery approval implication
- send action human-controlled

Generation success alone does not allow delivery. An internal draft generated
state does not allow delivery. A draft email generated state does not allow
delivery. `approved_for_customer` still does not mean gallery approval.

## 9. Customer email content structure

A customer concept email should include:

1. Greeting
2. Thank-you or brief received acknowledgement
3. Short concept direction summary
4. Approved concept image, attachment, or link reference, if available
5. Key design notes
6. Clarifications or assumptions
7. Required disclaimers
8. Next steps
9. Expected timeline, if appropriate and separately confirmed
10. Request for customer feedback
11. Sign-off

It must not include internal prompts, raw JSON, admin notes, reviewer notes,
internal risk flags, provider metadata, storage paths, unapproved draft URLs,
pricing unless separately confirmed, or CAD/prototype/production claims unless
separately confirmed.

## 10. Required disclaimers

Customer concept emails must explain that the concept is:

- concept direction only
- early visual or design direction
- not CAD
- not a quote
- not order confirmation
- not production approval
- subject to designer refinement
- followed by separately confirmed final CAD, quote, and production details

If an image is included, the email should clarify that the image is a concept
sketch or visual direction only. Details may change during designer review and
CAD development, and gemstone size, metal weight, setting structure, and
production details require separate confirmation.

The wording must not overpromise production readiness.

## 11. Approved asset and attachment rules

Attachments or links are allowed only if:

- the asset is marked or confirmed `approved_for_customer`
- a human reviewed the asset
- the asset is customer-safe
- the asset does not include private notes or internal overlays
- the asset does not imply CAD, quote, or production approval
- the asset is not a gallery asset unless separately approved for gallery in a
  future workflow

Attachments or links must not include unreviewed AI drafts, internal prompt
output, raw provider output, images with internal notes, assets with visible
private data, assets from unapproved storage paths, gallery shortcut assets, or
CAD/production files unless separately approved in a future offline workflow.

## 12. Link and storage safety rules

Future implementation should ensure:

- customer links use customer-safe assets only
- internal storage paths are not exposed
- signed URLs, if used, are scoped and time-limited
- admin-only links are not sent to customers
- reference image links are not sent back unless appropriate and safe
- provider output URLs are not sent directly
- draft images remain internal until approved
- broken or expired link handling is planned
- resend behavior handles links safely

Agent 54C does not implement storage or link behavior.

## 13. Customer-safe language rules

Customer email must not say:

- CAD approved
- quote approved
- order confirmed
- production approved
- ready for manufacturing
- final production design
- guaranteed identical to reference
- exact copy of reference
- automatically generated and approved
- gallery approved

Customer email should say:

- concept direction
- early visual direction
- designer-reviewed concept
- subject to refinement
- final CAD, quote, and production details confirmed separately
- we can revise based on your feedback

## 14. Customer clarification email flow

Use a clarification email when the brief is incomplete, stone or material choice
is unclear, size, budget, or timeline is unclear, reference images conflict, the
request implies an exact copy, the request implies CAD/quote/production approval
too early, or risk flags require clarification.

The agent may draft questions. Human must review and send. Clarification email
should not include unapproved sketches unless separately approved.

## 15. Approved concept delivery email flow

Use approved concept delivery only after:

- concept direction is approved for customer
- email copy is reviewed
- disclaimers are confirmed
- asset or link is verified
- delivery gate passes

The email may include an approved concept image, attachment, or link, a short
design explanation, assumptions and open questions, and next steps for revision
or CAD discussion.

It must not imply gallery approval or production approval.

## 16. Revision / needs_revision email flow

If an internal draft is wrong or unsafe:

- do not email the draft to the customer
- mark or keep the item as `needs_revision`
- revise Design Spec, Hand Sketch Instruction, or prompt
- regenerate or manually revise internally
- email the customer only if clarification is needed, using text-only
  clarification if appropriate

If the customer requests changes after approved concept delivery, route
feedback to admin/human review. The human decides whether the revision is
concept-level, CAD-level, quote-level, or production-level. The system must not
auto-regenerate and auto-send.

## 17. Customer feedback loop

Customer feedback may arrive by reply email or a future structured feedback
form.

Admin should classify feedback as:

- clarification answer
- concept revision request
- CAD request
- quote request
- material or stone change
- production timeline question
- budget question
- cancellation or hold request

Feedback should return to the human/admin workflow, not automatic AI delivery.
The agent may summarize feedback and propose next action, but the human decides.

## 18. Admin review and send-control workflow

Future admin UI may eventually show:

- draft email preview
- required disclaimer checklist
- approved asset checklist
- risk flag summary
- delivery gate status
- send readiness indicator
- send button disabled until gate passes
- manual override blocked for high-risk states
- confirmation modal before send
- post-send status

Agent 54C does not implement this UI.

## 19. Audit trail and logging plan

Future implementation should record:

- who approved concept for customer
- when approval happened
- which asset or version was approved
- who reviewed email copy
- who sent email
- when email was sent
- recipient address used
- subject line
- delivery provider event id, if applicable
- delivery status
- failure and retry history
- resend history
- customer response summary

Logs must not store secrets or private provider tokens.

## 20. Idempotency and duplicate-send prevention plan

Future implementation should prevent:

- duplicate concept delivery for the same approval event
- duplicate sends from repeated button clicks
- duplicate sends from retry loops
- sending outdated concept after a new revision
- sending if status changed to `needs_revision`
- sending if asset approval was revoked

Possible future controls include a send intent id, approval version id, email
draft version id, asset version id, idempotency key, delivery event ledger, and
explicit resend workflow.

Agent 54C does not implement this.

## 21. Failure and fallback plan

Planned failure handling:

- unsafe draft email means human rewrites
- missing disclaimer blocks send readiness
- unapproved asset blocks delivery
- `needs_revision` status blocks delivery
- unresolved high-risk flag blocks delivery
- future email provider failure retries only under controlled policy
- duplicate-send risk blocks and requires review
- broken customer link requires regenerating a safe link or sending a corrected
  email after review
- customer CAD, quote, or production requests route offline
- customer concept disputes route to human review
- wrong-recipient risk requires human verification before send

Manual human email remains fallback.

## 22. Semi-automatic email mode, future only

Mode B semi-automatic email workflow may be considered only after:

- admin review controls are stable
- `approved_for_customer` gate is reliable
- asset approval and versioning are reliable
- draft email preview is stable
- audit trail exists
- idempotency exists
- failure handling exists
- resend behavior exists
- human confirmation remains required

Automatic send without human review remains blocked unless a future explicit
Agent approves a different product mode.

Mode B is future-only, not current MVP.

## 23. Relationship to existing Agents 50A / 50B / 50C / 53A / 53B / 53C / 53D / 53E / 54A / 54B

Agent 50A provides Design Spec JSON Schema v1. Agent 50B provides Hand Sketch
Instruction Template v1. Agent 50C provides Concept Brief to Design Spec
transformation planning.

Agent 53A provides internal AI sketch pipeline planning. Agent 53B defines AI
sketch implementation boundaries. Agent 53C planned pure helper and fake
fixture tests. Agent 53D implemented low-risk pure helpers and fake fixtures.
Agent 53E added executable tests for pure helpers.

Agent 54A planned the agent-assisted design concierge workflow. Agent 54B
planned the admin concierge UI workflow. Agent 54C plans the email delivery
control layer after human approval.

Agent 54C does not supersede any internal-only, human-review,
gallery-separation, or email-only MVP boundary.

## 24. Recommended next implementation sequence

Recommended cautious next steps after Agent 54C:

1. Agent 55A: docs-only implementation readiness plan for admin read-only
   Design Spec and Hand Sketch Instruction display.
2. Agent 55B: low-risk admin read-only UI implementation, only if explicitly
   approved.
3. Agent 55C: admin risk flag read-only display planning or implementation,
   only after 55A/55B are stable.
4. Later: draft customer email preview planning or UI implementation.
5. Later: send-control implementation planning.
6. Later: email sending implementation only with explicit approval, audit
   trail, idempotency, and failure handling.
7. Later: provider integration planning.
8. Later: internal-only image generation implementation.
9. Website quick preview remains separate future product planning, not current
   MVP.

Agent 54C does not authorize implementation.

## 25. Hard stops

Stop if:

- email sending is implemented
- email is sent
- auto-send is introduced
- unreviewed AI output would be sent to customer
- unreviewed AI image would be attached or linked
- generation success is treated as approval
- `approved_for_customer` is reused as `approved_for_gallery`
- gallery approval is added or implied
- CAD approval is implied
- quote approval is implied
- order confirmation is implied
- production approval is implied
- private data appears in prompts, customer assets, or public pages
- internal prompts or raw Design Spec JSON are exposed to customers
- reviewer notes or admin notes are exposed to customers
- SQL, environment, deploy, or provider connection is required
- code, package, config, or lockfile changes are needed
- email provider implementation is attempted
- admin UI implementation is attempted
- customer UI implementation is attempted
- Computer Use, plugin, MCP, or third-party integration is required
- production data mutation is proposed
- website quick preview implementation is attempted
- any implementation agent is started

## 26. Decision recommendation

NOVORA should plan customer delivery around:

agent-assisted email drafting -> human review -> explicit delivery gate ->
human-controlled send -> email-only customer delivery

Current MVP should keep sending manual or human-controlled.

Semi-automatic email workflow should remain future-only until audit trail,
idempotency, asset approval, review controls, and failure handling are
implemented.

**Human-approved email delivery, never automatic AI customer delivery**
