# NOVORA Agent 56D Website Public Copy Polish And Expectation-Setting Plan

## 1. Purpose

Agent 56D defines how NOVORA should polish public website copy so customers
understand the current non-SQL MVP.

This is a docs-only public copy and expectation-setting plan. It does not
implement website copy changes, app edits, UI edits, API edits, helper changes,
tests, package changes, config changes, SQL, Supabase access, migrations,
provider calls, image generation, email sending, customer sketch preview,
gallery approval, CAD, quotation, order, or production automation.

Agent 56D does not start Agent 55H, Agent 56E, live execution support, or any
implementation agent.

## 2. Scope

Agent 56D covers public-facing copy strategy and expectation-setting for:

- Homepage positioning.
- Homepage CTA support copy.
- `/design/start`.
- `/design/concept`.
- `/design/brief`.
- Reference image upload guidance.
- `/design/submitted`.
- Sketch or preview route boundaries.
- Public gallery wording.
- AI concept sketch wording.
- Human review wording.
- Email-only delivery wording.
- CAD, quote, order, and production separation wording.
- Future Agent 56E implementation candidate mapping.

Agent 56D does not edit website files. Any actual website copy implementation
must be a separate future task, likely Agent 56E if the owner explicitly
approves safe static public copy implementation.

## 3. Non-negotiable public copy principles

- Do not imply instant AI sketch delivery.
- Do not imply unreviewed AI, GPT, image, or internal draft output will be
  shown to customers.
- Do not imply automatic customer preview.
- Do not imply a customer portal or account.
- Do not imply CAD generation.
- Do not imply quote generation.
- Do not imply order confirmation.
- Do not imply production approval.
- Do not imply gemstone availability.
- Do not imply final manufacturability.
- Do not imply gallery publication.
- Do not imply image provider success equals approval.
- Always state that concept direction is reviewed before customer delivery.
- Always separate concept sketch from CAD, quotation, order, and production.

## 4. Public copy source-of-truth hierarchy

Public copy should follow this hierarchy:

1. Product safety boundaries from Agent 56B.
2. Human-review and email SOP from Agent 56C.
3. Existing public site copy.
4. Future implementation PRs.

If existing website copy conflicts with Agent 56B or Agent 56C boundaries, the
Agent 56B and Agent 56C boundaries win. Future implementation PRs should cite
this Agent 56D plan when changing customer-facing expectation copy.

## 5. Current MVP public positioning

NOVORA helps customers submit a custom jewelry concept brief and reference
images so the team can review the design direction and respond with
human-reviewed concept guidance.

The current MVP is:

- Custom jewelry concept intake.
- Protected admin review.
- Human-reviewed concept direction.
- Customer-safe email follow-up.
- Offline CAD, quotation, order, and production next steps.

The current MVP is not:

- An instant AI sketch generator.
- A CAD generator.
- A quote generator.
- An order system.
- A payment system.
- A customer portal.
- A production approval platform.
- A gallery publication workflow.

## 6. Customer expectation risks

Public copy should reduce the risk that a customer thinks:

- A sketch appears immediately on the website.
- AI output is final.
- A concept sketch is CAD.
- A concept sketch gives a price.
- Submission creates an order.
- Production has started.
- Gallery examples are customer-approved final pieces.
- All materials and stones are available.
- Reference image upload gives consent for publication.
- An automated email or instant reply is guaranteed.
- NOVORA will deliver a production-ready 3D or printing file from brief intake.

Mitigation: use modest public copy that describes brief submission, human
review, email follow-up, and separate offline CAD, quotation, material, stone,
order, and production confirmation.

## 7. Recommended public vocabulary

Use:

- Concept direction.
- Early design discussion.
- Design brief.
- Reference images.
- Human review.
- Reviewed by our team.
- Customer-safe concept summary.
- Follow-up by email.
- Offline CAD discussion.
- Separate quotation.
- Separate material and stone confirmation.
- Separate production approval.
- Curated examples.
- Inspiration only.
- Not CAD.
- Not a quote.
- Not production approval.

## 8. Prohibited or risky public wording

Avoid or explicitly prohibit:

- Instant AI sketch.
- Automatic sketch.
- Generate your final design.
- Production-ready.
- CAD-ready.
- Ready for 3D printing.
- Guaranteed quote.
- Fixed price.
- Order confirmed.
- Production approved.
- AI-approved.
- Instantly delivered.
- See your sketch now.
- Customer gallery approval implied.
- Upload means consent.
- Final jewelry rendering.
- Exact stone availability.
- Exact gold weight.
- Guaranteed timeline.

Some terms may become usable only in future product tiers with explicit safety
gates, reviewed disclaimers, and implementation scope. They should not appear in
current MVP public copy as customer promises.

## 9. Homepage copy plan

Homepage copy should state that NOVORA helps customers begin a custom jewelry
concept, not instantly generate a final design.

Recommended direction:

- Present NOVORA as a guided custom jewelry concept intake.
- Explain that the team reviews the brief and follows up by email.
- Mention AI only as part of a careful internal or assisted concept process,
  not as instant customer-visible output.
- Avoid promising CAD, quotation, order, production, or material availability.
- Keep the primary CTA focused on submitting a design brief.
- Label gallery examples as curated, inspirational, or illustrative unless a
  separate approval workflow confirms customer-approved publication.

Recommended snippets:

- "Begin a custom jewelry concept with a guided design brief."
- "Share your direction, references, and preferences for human-reviewed follow-up."
- "Concept direction is reviewed before we share customer-safe material by email."
- "CAD, quotation, materials, stones, and production are confirmed separately."

## 10. Homepage CTA expectation-setting

Primary CTA text may say:

- "Start your design"
- "Share your design brief"
- "Begin a concept request"

Avoid CTA text such as:

- "Generate my sketch now"
- "Get instant CAD"
- "Get price now"
- "Start production"
- "Approve my order"

CTA support copy should say that the customer is submitting a brief for
human-reviewed concept direction, follow-up is by email, and CAD, quotation,
materials, stones, and production are separate next steps.

Recommended support snippet:

"Submit a design brief for team review. We follow up by email with
customer-safe concept direction; CAD, quotation, and production are separate
next steps."

## 11. Design start page copy plan

`/design/start` should frame the flow as the beginning of a concept brief.

Recommended direction:

- Explain that the next steps collect design direction.
- Clarify that starting the flow does not create an order.
- Clarify that no instant sketch is guaranteed.
- Mention team review after submission.

Recommended snippets:

- "Start by sharing the direction for your custom jewelry concept."
- "The next steps help us understand piece type, style, materials, stones, and references."
- "This is a concept request, not an order confirmation or production approval."
- "After submission, our team reviews the brief before customer-safe follow-up."

## 12. Design concept page copy plan

`/design/concept` should guide piece type, style, stone logic, material
preference, and motif without implying final automatic generation.

Recommended direction:

- Present choices as inputs that help the team understand direction.
- Avoid saying choices automatically generate a final design.
- Clarify that final details may be confirmed later by email or offline CAD
  discussion.

Recommended snippets:

- "These choices help us understand your design direction."
- "Your selections guide the concept brief; they do not create a final CAD file or quote."
- "Details such as structure, stone availability, pricing, and production are confirmed separately."

## 13. Design brief page copy plan

`/design/brief` should invite the customer to describe intent, reference
meaning, materials, stones, constraints, and questions.

Recommended direction:

- Explain that the raw brief is reviewed by the team.
- Avoid implying the raw brief directly becomes an AI prompt or final sketch.
- Clarify that the team may ask clarification questions by email.
- Mention that submission is not CAD, quotation, order, or production approval.

Recommended snippets:

- "Tell us what the piece should feel like, what your references mean, and any constraints we should review."
- "Your brief is reviewed by our team before customer-safe concept direction is shared."
- "We may follow up by email if details need clarification."
- "Submitting a brief does not create CAD, a quote, an order, or production approval."

## 14. Reference image upload copy plan

Reference image upload copy should explain that images are used to understand
style, motif, proportion, setting direction, mood, or finish.

Recommended direction:

- State that reference images are reviewed internally.
- State that upload does not grant gallery, marketing, or publication consent.
- State that reference images are not automatically published.
- Avoid promising exact copying.
- Avoid promising exact stone, material, or setting matching.

Recommended snippets:

- "Upload references to help us understand style, motif, proportion, and mood."
- "References are reviewed internally and are not automatically published."
- "Uploading an image does not grant gallery or marketing consent."
- "Reference images guide discussion; they do not guarantee exact copying, materials, stones, or availability."

## 15. Submitted page copy plan

`/design/submitted` should confirm brief receipt only when the existing
submission-success gate confirms server persistence, a valid public reference,
and a valid Concept Brief UUID.

Recommended direction:

- Show the public reference.
- Explain that the next step is internal review.
- Explain that customer follow-up is by email.
- Explain that concept direction is human-reviewed before delivery.
- Explain that CAD, quotation, order, and production are separate.
- Avoid linking to any sketch or preview page as customer delivery.

Recommended snippets:

- "Your Concept Brief was received."
- "Reference: `NOVORA-CB-...`"
- "Our team will review your brief and references before sharing customer-safe concept direction by email."
- "CAD, quotation, materials, stones, order confirmation, and production are separate next steps."

## 16. Sketch / preview route boundary

`/design/sketch` or any quick preview route must not be used in the current MVP
for customer delivery of AI or internal drafts.

Boundary:

- Current MVP customer pages must not show unreviewed AI sketches.
- If a route exists, future implementation should disable it, keep it internal,
  label it demo-only, or safely redirect it if it could be customer-facing.
- Unreviewed AI, GPT, image, or internal drafts must not be customer-visible.
- Website quick AI preview is future product only, not current MVP.
- Any future preview requires separate scope, safety gates, human-review rules,
  and explicit approval.

Agent 56D only plans the copy and boundary. It does not implement route changes.

## 17. Gallery copy plan

Gallery copy should make clear that examples are curated inspiration or mock
examples unless explicitly customer-approved through a separate gallery workflow.

Gallery examples are:

- Curated inspiration or illustrative examples.
- Not CAD.
- Not quotation.
- Not an order.
- Not production approval.
- Not proof of material or stone availability.

Customer submission does not imply gallery consent. `approved_for_customer` is
not `approved_for_gallery`.

Recommended snippets:

- "Gallery examples are curated inspiration for design discussion."
- "Examples are not CAD files, quotes, orders, production approvals, or proof of material availability."
- "Customer references and submissions are not published without separate consent."

## 18. AI concept sketch wording

Safe AI wording:

- AI-assisted internal draft.
- Internal concept draft.
- Early visual direction.
- Reviewed before customer delivery.
- Human-approved customer-safe concept.

Avoid:

- AI final design.
- AI-approved.
- Automatically generated customer sketch.
- Instant sketch result.
- Production-ready AI design.

AI and internal drafts are not customer-visible until a human reviewer approves
customer-safe delivery.

## 19. Human review wording

Use wording such as:

- "Reviewed by our team."
- "Human-reviewed before delivery."
- "Concept direction is checked before we share it."
- "We may ask follow-up questions."
- "We refine the direction before sending customer-safe material."

Avoid overpromising expert certification, production guarantee, CAD approval,
quote approval, stone availability, or manufacturability approval.

## 20. Email-only delivery wording

Use wording such as:

- "We will follow up by email."
- "Approved concept direction is sent by email."
- "Customer-safe follow-up happens after review."
- "There is no instant website preview in the current MVP."

Avoid:

- "View your sketch immediately."
- "Download now."
- "Your portal is ready."
- "Live preview."

## 21. CAD / quote / order / production boundary wording

Exact boundary language:

- Concept direction is not CAD.
- Concept direction is not a quote.
- Concept direction is not an order confirmation.
- Concept direction is not production approval.
- CAD, materials, stones, pricing, timeline, and production are confirmed
  separately.

Short disclaimer:

"Concept direction is reviewed by our team and is not CAD, a quote, an order,
or production approval."

Medium disclaimer:

"Your Concept Brief helps us prepare human-reviewed concept direction. CAD,
quotation, material and stone confirmation, order approval, timeline, and
production are separate offline next steps."

Long disclaimer:

"NOVORA's current online flow collects a custom jewelry Concept Brief for team
review. Any concept sketch or direction is an early visual discussion aid, not a
CAD file, quote, order confirmation, production approval, gemstone procurement
commitment, or manufacturability guarantee. CAD, materials, stones, pricing,
timeline, and production are confirmed separately."

## 22. Timeline wording

Safe timeline language:

- "After a sufficiently complete brief is submitted, NOVORA targets a first human-reviewed customer-safe concept draft or first concept response within 24 hours."
- "The first draft target does not include customer-requested revision cycles, waiting for customer feedback, or repeated back-and-forth adjustments."
- "Revision cycles are separate customer-driven interaction time."
- "After CAD is confirmed and materials, stones, quotation, and order details are separately approved, production target is 15-30 days."
- "Logistics target is 5-10 days, depending on destination, carrier, customs, and local delivery conditions."
- "CAD, quotation, materials, stones, production, and logistics remain separate offline confirmations."

Avoid guaranteed language. Do not promise instant AI output, automatic preview,
final CAD, quote, order confirmation, production approval, material
availability, stone availability, or delivery date certainty.

## 23. Pricing and material wording

Safe pricing and material wording:

- "Pricing is not generated automatically."
- "Final cost depends on gold weight, stones, labor, CAD, and production details."
- "Materials and stone availability are confirmed separately."
- "No exact gold weight, gemstone cost, or final price is promised from concept intake."

Avoid:

- Guaranteed price.
- Fixed quote.
- Exact material weight.
- Guaranteed stone availability.

## 24. Lab diamond / gemstone wording

Safe lab diamond and gemstone wording:

- NOVORA can discuss lab diamond and lab colored stone directions.
- Availability, grading, size, shape, color, certification, and price are
  confirmed separately.
- IGI or other certification references must not be promised unless stones are
  sourced and confirmed.
- Natural and lab options should be discussed clearly.
- Brief submission alone does not create a stone procurement promise.

## 25. Customer-safe disclaimers

One-line disclaimer:

"Concept direction is human-reviewed and is not CAD, a quote, an order, or
production approval."

Submitted page disclaimer:

"We received your Concept Brief and will review it before following up by
email. CAD, quotation, materials, stones, and production are separate next
steps."

Gallery disclaimer:

"Gallery examples are curated inspiration only and do not imply CAD, quotation,
material availability, production approval, or customer publication consent."

Sketch/concept disclaimer:

"Any concept sketch is an early visual direction reviewed before customer
delivery; it is not a final design or production file."

Email follow-up disclaimer:

"Customer-safe concept direction is shared by email after review. The current
MVP does not provide instant website preview."

CAD/quote/production disclaimer:

"CAD, quotation, order confirmation, gemstone procurement, timeline, and
production are handled separately after concept review."

Reference image consent disclaimer:

"Reference images help us understand your direction and are not automatically
published or used for gallery/marketing without separate consent."

## 26. Copy QA checklist

- No instant AI promise.
- No customer preview promise.
- No CAD promise.
- No quote promise.
- No order promise.
- No production promise.
- No gallery consent implication.
- No material or stone availability guarantee.
- Human review is clear.
- Email-only delivery is clear.
- Offline next steps are clear.
- Customer privacy is respected.
- Public copy matches Agent 56B and Agent 56C boundaries.

## 27. Future Agent 56E implementation candidate map

If separately approved, Agent 56E could implement safe static public copy only:

- Update homepage copy only.
- Update CTA support copy only.
- Update design start explanatory copy.
- Update design concept helper copy.
- Update design brief helper copy.
- Update reference upload consent/support copy.
- Update submitted page next-step copy.
- Update gallery disclaimer copy.
- Disable, redirect, or reframe a sketch preview link only if it is
  customer-facing and the task explicitly includes that change.

Agent 56E should not include behavioral changes unless explicitly scoped. It
should not execute SQL, access Supabase, create migrations, call providers,
generate images, implement email, expose customer preview, create gallery
approval, mutate status or approval, or start live execution support.

Agent 56D does not start Agent 56E.

## 28. Post-MVP copy backlog

Future copy areas:

- Customer portal wording.
- Quick AI preview wording.
- Paid concept package wording.
- Gallery consent workflow wording.
- CAD package wording.
- Quote, order, and payment wording.
- Production timeline wording.
- Refund and cancellation wording.
- Privacy, training, and data-use wording.
- Region-specific legal disclaimers.

These areas are post-MVP unless separately approved.

## 29. Recommended next Agent sequence

Recommended sequence:

1. Agent 56E - optional safe static public copy implementation only, if the
   owner separately approves it.
2. Agent 56F - QA/release readiness checklist for the current non-SQL MVP.
3. Agent 56G - optional final public-flow smoke-test plan.
4. Agent 55H - only if the owner explicitly chooses Agent 55G Option C or D.

Agent 56E is optional and should be narrow/static copy only. Agent 55H is not
the default. SQL remains blocked unless separately approved. Implementation
remains separately scoped.

## 30. Final recommendation

Keep NOVORA public copy modest and expectation-safe.

- Do not promise instant AI, automatic preview, CAD, quotation, order,
  production, final manufacturability, material availability, stone
  availability, production-ready files, or gallery publication.
- Keep customer delivery human-reviewed and email-only in the current MVP.
- Keep CAD, quotation, order, gemstone procurement, and production offline and
  separate.
- Use this Agent 56D plan as the source plan for future optional Agent 56E
  static public copy implementation.
- Do not execute SQL by default.
- Do not start Agent 55H by default.
- Proceed to optional Agent 56E only if the owner wants safe static public copy
  implementation.
