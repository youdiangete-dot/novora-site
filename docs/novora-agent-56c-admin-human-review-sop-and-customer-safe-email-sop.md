# NOVORA Agent 56C Admin Human-Review SOP And Customer-Safe Email SOP

## 1. Purpose

Agent 56C defines how NOVORA should operate the current non-SQL MVP manually
and safely.

This is a docs-only SOP. It does not implement app, API, UI, helper, fixture,
test, package, config, migration, SQL, Supabase, provider, image generation,
email sending, customer-facing sketch preview, gallery approval, CAD, quote,
order, or production behavior.

Agent 56C does not execute SQL, access Supabase, use Supabase CLI, create
migrations, call an image provider, generate images, send email, approve
gallery use, start Agent 55H, start Agent 56D, start live execution support, or
start any implementation agent.

## 2. Scope

This SOP covers current non-SQL MVP operations for:

- Protected admin review of submitted Concept Briefs.
- Contact and customer identity review.
- Reference image review.
- Design intent review.
- Internal draft or AI sketch review.
- Human approval workflow.
- Customer-safe email-only delivery.
- Revision, rejection, and approval handling.
- Offline CAD, quote, order, gemstone procurement, and production handoff.
- Privacy and sensitive-data handling.
- Manual fallback operation.

This SOP creates no automation and no persistence. It only defines how humans
should operate the existing MVP safely.

## 3. Non-negotiable operating principles

- AI, GPT, image, and internal drafts are internal-only until human approval.
- Customers receive only human-approved customer-safe material.
- Customer delivery remains email-only in the current MVP.
- No customer web preview is active for AI or internal drafts.
- No gallery publication is automatic.
- `approved_for_customer` is not `approved_for_gallery`.
- Generation success is not approval.
- A raw customer brief is not a final prompt.
- Raw Design Spec, raw Hand Sketch Instruction, raw prompts, reviewer internal
  notes, and internal-only drafts must not be sent to customers.
- A concept sketch is not CAD, a quote, an order confirmation, or production
  approval.
- CAD, quotation, gemstone procurement, order confirmation, and production
  remain offline and separate.

## 4. Roles and responsibilities

Admin / operator:

- Opens protected admin brief list and detail pages.
- Confirms submission reference, contact data, brief readability, and reference
  image availability.
- Records concise internal notes when needed.
- Must not approve customer delivery solely from intake review.

Human reviewer:

- Reviews design intent, reference images, draft quality, feasibility, privacy,
  and customer-safe wording.
- Explicitly approves, rejects, or requests revision for customer-safe material.
- Must not treat image generation success as approval.

Designer / CAD handoff owner:

- Reviews future CAD feasibility separately from concept sketch approval.
- Handles offline CAD discussion, material review, stone review, and production
  feasibility.
- Must not treat a concept sketch as CAD-ready or production-ready.

Customer communication owner:

- Writes and sends customer-safe email manually or through a separately
  approved future workflow.
- Confirms no raw prompts, specs, internal notes, rejected drafts, or private
  links are included.
- Must not send unreviewed or internal-only material.

Owner / launch approver:

- Accepts manual workload, escalation process, and launch/no-go criteria.
- Decides whether future automation, SQL, provider generation, gallery, or
  email delivery work should be separately scoped.
- Must not treat this SOP as authorization for implementation or live execution
  support.

## 5. Admin brief intake SOP

1. Open the protected admin brief detail.
2. Confirm the submission reference is present and matches the selected brief.
3. Confirm contact data exists.
4. Confirm design brief fields are readable.
5. Confirm reference images are accessible or safely missing.
6. Assign the initial internal review state using existing admin controls.
7. Record a concise internal note if needed.
8. Decide whether the brief is complete enough for review.
9. If incomplete, prepare a customer-safe clarification email.
10. If complete, move the brief to human review.

Admin intake confirms that a submitted brief can be reviewed. It does not
approve customer delivery.

## 6. Contact and customer identity review SOP

- Verify customer name and email are present.
- Review optional phone, WhatsApp, country, and contact notes only if provided.
- Avoid exposing contact data in docs, screenshots, public notes, gallery
  contexts, or customer-unsafe artifacts.
- Do not copy private contact data into public or gallery material.
- Use the customer's name carefully in emails and avoid unnecessary repetition.
- Do not infer sensitive identity attributes from name, location, language,
  image content, or design request.
- Do not share internal customer data with third parties without separate
  approval and a defined privacy basis.

## 7. Reference image review SOP

- Open reference images only through protected admin access.
- Verify each accessible image is relevant to the brief.
- Note missing or inaccessible images safely, without exposing private paths.
- Identify whether images communicate jewelry style, stone shape, motif,
  material, proportion, setting, mood, or finish.
- Do not use reference images for automatic public generation in the current
  MVP.
- Do not publish reference images.
- Do not include customer reference images in gallery, marketing, training, or
  public examples without explicit consent and separate approval.
- Avoid downloading, duplicating, or resharing images unless required by a
  manual offline workflow.

## 8. Design intent review SOP

The reviewer should convert the raw customer brief into structured internal
understanding before any future prompt, sketch instruction, or customer-safe
summary is prepared.

Review:

- Piece type.
- Style direction.
- Stone logic.
- Material preference.
- Motif or emotional brief.
- Budget or timeline expectations, if provided.
- Meaning of each reference image.
- Missing information.
- Feasibility risks.
- Possible clarification questions.

The raw customer brief should not be used directly as a final prompt or final
customer-facing explanation.

## 9. Internal AI sketch / internal draft SOP

- AI or internal draft creation is optional in the current MVP.
- No real provider generation is required for current MVP operation.
- If an AI or internal draft exists, it remains internal-only.
- A human must review the draft before customer delivery.
- Generation success does not equal approval.
- The draft must be checked against structured design intent.
- The draft must be rejected or revised if it contains structural, craft, style,
  privacy, or brief-alignment errors.
- An unreviewed draft must not be emailed.
- An unreviewed draft must not be shown on a customer page.
- An unreviewed draft must not be used for gallery, public examples, marketing,
  training, or publication.

## 10. Human review checklist

Before customer delivery, confirm:

- The concept matches customer intent.
- Piece type is correct.
- Stone logic is correct.
- Style direction is correct.
- Proportions are reasonable for concept discussion.
- Motifs are coherent.
- No obvious impossible structure appears.
- Views, details, and notes do not contradict each other.
- Prong, setting, and support logic are not visibly incorrect.
- Material or stone availability is not overpromised.
- CAD, quote, order, and production approval are not implied.
- Private data is not exposed.
- A customer-safe note can be written.

## 11. Jewelry feasibility review checklist

This is conceptual feasibility only, not CAD approval.

Check:

- Structural stability.
- Stone setting feasibility.
- Prong count and prong style consistency.
- Center stone and side stone relationship.
- Ring shank, pendant bail, earring post, bracelet connection, or other
  attachment logic.
- Comfort and wearability.
- Material feasibility.
- Enamel, filigree, hard-gold, or mixed-metal feasibility if mentioned.
- Manufacturability risk.
- CAD handoff risk.
- Quote uncertainty.
- Gemstone procurement uncertainty.

Escalate to the designer / CAD handoff owner when concept feasibility is unclear.

## 12. Customer-safe material definition

Customer-safe material must be:

- Human-approved.
- Free of raw internal prompt, Design Spec, Hand Sketch Instruction, and
  reviewer/admin notes.
- Written in customer-friendly language.
- Clear that any sketch is concept direction only.
- Clear that CAD, quote, materials, stones, production, and timeline are
  separate next steps.
- Free of private/internal data.
- Free of unverified promises.
- Free of gallery or publication claims.
- Free of automatic order, price, or production confirmation.
- Free of production approval language.

## 13. Material that must never be sent to customers

Do not send:

- Raw Design Spec.
- Raw Hand Sketch Instruction.
- Raw prompt.
- Provider metadata.
- Cost ledger.
- Reviewer internal notes.
- Admin notes.
- Rejected drafts.
- Unreviewed drafts.
- Internal-only drafts.
- Private storage paths.
- Signed admin links.
- Service keys or environment values.
- Database IDs that are not customer-safe.
- Internal risk comments.
- Gallery approval notes.
- SQL, schema, or implementation details.
- Other customers' data or images.

## 14. Customer-safe email-only delivery SOP

1. Confirm explicit human approval exists.
2. Confirm the material is customer-safe.
3. Confirm attachments are reviewed and intentionally selected.
4. Confirm no internal-only material is included.
5. Use a customer-safe email template.
6. State that any sketch is concept direction only.
7. State that CAD, quote, materials, stones, production, and timeline are
   separate next steps.
8. Include clarification or next-step questions if needed.
9. Send manually or through a separately approved future email workflow.
10. Record internally that customer communication occurred, without exposing
    private details in public or customer-unsafe locations.

This SOP does not implement automatic sending.

## 15. Customer-safe email structure

Use this structure:

- Greeting.
- Brief acknowledgement.
- Concept direction summary.
- Approved sketch or description reference, if available.
- Clear explanation of what the concept does and does not mean.
- Clarification questions or next-step options.
- Offline CAD, quote, materials, stones, production, and timeline note.
- Timeline expectation note.
- Polite closing.

## 16. Email template examples

### Brief received / needs clarification

Subject: NOVORA concept direction - a few clarifying questions

Hi [Customer First Name],

Thank you for sharing your design brief with NOVORA. We have reviewed the early
design direction and would like to confirm a few details before preparing the
next concept discussion.

Could you clarify [question 1] and [question 2]?

At this stage, we are discussing concept direction only. This is not CAD, not a
quote, and not production approval. We will confirm CAD, materials, stones,
pricing, and timeline separately if you decide to continue.

Warmly,
NOVORA

### Concept direction approved for customer delivery

Subject: NOVORA concept direction for your review

Hi [Customer First Name],

Thank you for your brief. Our team has reviewed the concept direction and
prepared the attached approved material for early design discussion.

This concept direction is meant to help align style, motif, proportion, and
overall design intent. It is not CAD, not a quote, not an order confirmation,
and not production approval.

If this direction feels close, the next step is a separate CAD, materials,
stones, pricing, and timeline discussion.

Warmly,
NOVORA

### Revision required before customer delivery, no sketch attached

Subject: NOVORA design direction update

Hi [Customer First Name],

Thank you for your patience. Our team is still refining the early design
direction before sending anything for review.

We do not want to share a concept before it has passed human review. We may
follow up with one or two clarification questions so the next version better
matches your brief.

This remains an early design discussion. It is not CAD, not a quote, and not
production approval.

Warmly,
NOVORA

### CAD / quote offline next-step handoff

Subject: NOVORA next steps for CAD and quotation

Hi [Customer First Name],

Thank you for reviewing the concept direction. If you would like to continue,
we can move into a separate offline discussion for CAD, materials, stones,
pricing, and timeline.

The concept direction is not CAD, not a quote, not an order confirmation, and
not production approval. We will confirm CAD, materials, stones, pricing, and
timeline separately before any production decision.

Warmly,
NOVORA

## 17. Revision SOP

Revision is required when:

- The draft conflicts with the customer brief.
- Structure, style, proportion, or motif is wrong.
- Jewelry feasibility is unclear or unsafe.
- Private data appears.
- The output implies CAD, quote, order, or production approval.
- The reviewer cannot write a customer-safe explanation.

Revision discipline:

- Reviewer writes concise internal revision notes.
- GPT may assist with revision prompts internally only.
- Raw prompts, revision notes, rejected drafts, and internal-only drafts remain
  internal.
- Regenerate, redraw, or revise internally only when the reviewer has clear
  correction guidance.
- Ask the customer for clarification when the brief is ambiguous.
- Never send the rejected draft.
- Preserve manual version discipline by labeling which draft or description was
  reviewed, rejected, revised, or approved.

Revision does not automatically approve customer delivery.

## 18. Rejection / no-go SOP

No-go cases include:

- Draft conflicts with the customer brief.
- Obvious jewelry structure error.
- Impossible setting or unsafe connection.
- Misleading CAD, quote, order, or production implication.
- Private data exposure.
- Reference image is inaccessible when needed for review.
- Customer intent is unclear.
- Legal, privacy, or consent issue.
- Customer asks for an unsupported service.
- Reviewer cannot create a customer-safe explanation.

Stop-and-escalate process:

1. Stop customer delivery.
2. Mark or note the issue internally.
3. Escalate to the owner, human reviewer, or designer / CAD handoff owner.
4. Prepare a customer-safe clarification or delay email only if appropriate.
5. Do not continue automation, gallery use, or customer preview.

## 19. Approval SOP

Approval for customer delivery means:

- A human reviewer approves customer-safe concept material only.
- Approval is explicit.
- Approval identifies what is approved.
- Approval does not imply gallery approval.
- Approval does not imply CAD, quote, order, or production approval.
- Approval does not imply that image provider success equals approval.
- Approval does not expose internal notes.

`approved_for_customer` remains separate from `approved_for_gallery`.

## 20. Status language and admin-note discipline

Legal AI sketch review statuses are:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` is illegal for AI sketch review status.

Status is an admin/internal control only. Status alone must not trigger customer
display, email sending, gallery publication, CAD handoff, quote creation, order
creation, or production action.

Admin notes must remain internal. They should be concise, avoid secrets, avoid
private data that is not needed for review, and avoid wording that would be
unsafe if copied into a customer email. Customer-safe notes must be separately
written.

## 21. Gallery consent separation

- Customer delivery approval is not gallery approval.
- Gallery use requires explicit customer consent.
- Gallery use requires privacy review.
- Gallery use requires curation approval.
- Gallery use requires a separate publication decision.
- Reference images and customer private data must not be published without
  explicit consent.
- The curated mock gallery remains separate from customer submissions.
- Gallery workflow is post-MVP unless separately approved.

## 22. CAD / quote / order / production offline handoff SOP

- A concept sketch may inform offline CAD discussion.
- The CAD owner reviews feasibility separately.
- A quote requires separate material, stone, labor, and timeline estimate.
- Gemstone procurement requires a separate sourcing decision.
- Order confirmation requires separate customer approval.
- Production requires separate CAD, quote, order, and owner/customer approval.
- The customer must not be told the concept sketch is production-ready.
- Timeline remains manually confirmed.

## 23. Privacy and sensitive-data SOP

- Protect customer contact data.
- Protect admin links.
- Protect signed links.
- Protect reference image paths.
- Do not expose service role keys, API keys, database URLs, provider tokens, or
  environment values.
- Do not include private screenshots in public docs.
- Avoid copying customer data into prompts unless a future approved workflow
  defines the privacy boundary.
- Avoid using customer materials for gallery, training, marketing, or public
  display without consent.
- Redact sensitive information in manual evidence.

## 24. Incident and escalation SOP

Incidents include:

- Accidental customer exposure of an internal draft.
- Accidental email with raw internal notes, prompt, Design Spec, or Hand Sketch
  Instruction.
- Wrong customer attachment.
- Broken reference image access.
- Suspected secret exposure.
- Customer confusion about CAD, quote, order, or production approval.
- Gallery or public display mistake.
- Admin cannot access a submission.
- Notification failure without fallback.

Escalation:

- Stop delivery.
- Preserve evidence safely.
- Notify the owner.
- Do not continue automation.
- Correct customer communication manually.
- Document internal resolution without exposing secrets or private customer
  data.

## 25. Manual fallback SOP

Use manual fallback when:

- Admin notification fails.
- Reference image link fails.
- Admin status persistence has an issue.
- Customer email automation is unavailable.
- AI draft is unavailable.
- SQL or artifact persistence is unavailable.
- Provider is unavailable.
- Vercel or GitHub preview is irrelevant to the operational issue.

The current MVP can still operate manually if public intake and protected admin
review are available. Manual operation means the team reviews submissions,
checks references, prepares customer-safe responses, and handles CAD, quote,
order, and production offline without requiring SQL artifact persistence or
provider generation.

## 26. Soft-launch operating checklist

- [ ] Admin can access new submissions.
- [ ] Contact data is readable.
- [ ] Reference images are accessible or safely missing.
- [ ] Human reviewer is assigned.
- [ ] Customer-safe email template is accepted.
- [ ] No customer preview is active.
- [ ] No automatic sketch delivery is active.
- [ ] No gallery publication is active.
- [ ] CAD, quote, order, and production offline handoff is accepted.
- [ ] No SQL or artifact persistence is required.
- [ ] Owner accepts manual workload.
- [ ] No-go escalation path is known.

## 27. SOP acceptance criteria

The SOP is accepted when the owner agrees:

- Who reviews briefs.
- Who approves customer-safe material.
- Who sends customer email.
- What is never sent.
- How revisions are handled.
- How no-go cases are escalated.
- How gallery consent is separated.
- How CAD, quote, order, and production are handed off offline.
- That no SQL, provider generation, customer preview, gallery workflow, or
  automation is required for current MVP operation.

## 28. Post-MVP automation candidates

Future automation candidates, all separately scoped:

- Customer-safe email draft creation.
- Email send automation.
- Persisted Design Spec / Hand Sketch Instruction artifacts.
- Artifact write/read path after SQL.
- Internal image provider generation.
- Revision prompt helper.
- Reviewer checklist UI.
- Gallery consent workflow.
- CAD handoff tracker.
- Quote/order tracker.
- Customer portal.
- Payment/account system.

None are implemented by Agent 56C.

## 29. Recommended next Agent sequence

Recommended sequence:

1. Agent 56D - Docs-only website/public copy polish and expectation-setting plan.
2. Agent 56E - Optional safe static public copy implementation only, if separately approved.
3. Agent 56F - QA/release readiness checklist for current non-SQL MVP.
4. Agent 55H - Only if the user explicitly chooses Agent 55G Option C or D.

After Agent 56C, Agent 56D is the safest next docs-only step. Agent 55H is not
the default next step. Implementation remains separately scoped. Email
automation is not automatically next.

## 30. Final recommendation

Operate the current MVP manually and safely.

Keep AI and internal drafts internal-only. Keep customer delivery human-reviewed
and email-only. Keep raw prompts, raw specs, raw instructions, reviewer notes,
admin notes, rejected drafts, unreviewed drafts, and internal-only material out
of customer emails. Keep gallery approval separate. Keep CAD, quote, order,
gemstone procurement, and production offline.

Do not execute SQL by default. Do not start Agent 55H by default. Proceed to
Agent 56D after Agent 56C for the website/public copy expectation-setting plan.
