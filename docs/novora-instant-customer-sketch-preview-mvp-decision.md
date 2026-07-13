# NOVORA Instant Customer Sketch Preview MVP Decision

## 1. Purpose

This document records the owner's updated MVP direction: instant
customer-facing AI hand-sketch concept preview is now the intended product
highlight and conversion driver for NOVORA.

This is a docs-only product decision record. It does not implement image
generation, connect OpenAI or any image API, expose a customer preview route,
change app code, change Supabase, change Vercel, change email behavior, or
approve CAD, quote, order, payment, or production through the website.

No manual deployment, Production deployment, Vercel configuration change,
environment variable change, or Production system action occurred. An automatic
Vercel Preview deployment may be triggered by the normal PR integration and is
not a manual or Production deployment.

## 2. Owner Decision Summary

Confirmed owner decisions:

- Limited beta remains invite-only.
- Limited beta size is 5-10 users.
- Target beta language options are English and Traditional Chinese.
- Automatic submission response is desired.
- Website-based first AI hand-sketch concept preview is now the intended MVP
  product path.
- After confirmed Concept Brief persistence, NOVORA should automatically begin
  the first AI hand-drawn concept sketch generation.
- Once the first result is generated and passes the required automatic safety,
  privacy, access-control, output-validity, and safe-failure gates, it becomes
  immediately visible to the customer without waiting for per-image human
  pre-approval.
- Human intervention should focus on structural logic errors, jewelry
  construction errors, production feasibility issues, inconsistent views, wrong
  stone setting logic, proportion problems, and correction or regeneration.
- The first sketch is a concept preview, not CAD, not a quote, not order
  approval, not payment approval, and not production approval.

## 3. Revised MVP Flow

The revised target MVP flow is:

1. Customer submits a Concept Brief and persistence is confirmed with a valid
   Concept Brief UUID and `publicReference`.
2. GPT/AI structures the design request.
3. AI/image generation creates the first hand-sketch concept through a valid
   generation-job and generated-output lifecycle.
4. Automatic safety, privacy, access-control, output-validity, and safe-failure
   gates run.
5. The website immediately shows the first concept sketch to the securely
   authorized customer when all automatic gates pass, without per-image human
   pre-approval.
6. The customer reacts and gives feedback.
7. Human review intervenes when structure logic, jewelry construction,
   production feasibility, customer-safety, or mismatch issues appear.
8. Revised versions are generated or manually corrected.
9. CAD, quote, sourcing, order, payment, and production remain offline and
   separately confirmed.

## 4. Automatic First-Preview Gates

`first_preview_ready` may become customer-visible only when all required
automatic gates pass:

- Confirmed Concept Brief persistence and a valid `publicReference`.
- A secure customer access mechanism.
- Valid generation-job and generated-output lifecycle states.
- A valid image or output asset.
- No provider metadata, internal prompts, reviewer/admin notes, secrets, or
  private storage paths exposed to the customer.
- Passed content-safety, privacy, and access-control checks.
- Safe timeout, failure, and invalid-output handling, with no false-success
  customer-visible state.

These are automatic gates, not comprehensive human pre-review.

## 5. Human Intervention Model

The revised human role is not intended to block every first sketch before the
customer sees anything. Human intervention should focus on identifying and
correcting issues that can mislead the customer or create jewelry, production,
or safety problems.

Human review should focus on:

- Structure logic errors.
- Jewelry construction errors.
- Production feasibility errors.
- Main-view, side-view, or angle-view conflicts.
- Wrong prong or setting logic.
- Wrong gemstone placement.
- Proportion problems.
- Customer request mismatch.
- Unsafe or misleading customer-facing claims.
- Cases requiring regeneration or manual correction.

## 6. Customer-Facing Disclaimers

Every future first sketch preview must be clearly labeled as:

- AI-generated concept sketch.
- Early visual direction.
- For communication and feedback.
- Not CAD.
- Not a quote.
- Not order confirmation.
- Not production approval.
- Not a manufacturability guarantee.
- Subject to human review, correction, CAD validation, pricing, and production
  feasibility review.

## 7. What Is Approved Now

Approved as product direction:

- Invite-only beta.
- 5-10 users.
- English and Traditional Chinese options.
- Automatic submission confirmation.
- Automated customer brief structuring.
- Automated first AI hand-sketch concept generation.
- Website-based first sketch preview as a conversion goal.
- Human intervention focused on structural, craft, and production errors.
- Customer feedback loop after first preview.

## 8. What Is Not Approved

Still not approved:

- Presenting the AI sketch as final design.
- Presenting the AI sketch as CAD.
- Presenting the AI sketch as a quote.
- Presenting the AI sketch as order approval.
- Presenting the AI sketch as payment approval.
- Presenting the AI sketch as production approval.
- Online payment.
- Online checkout.
- Automatic production approval.
- Broad public launch.
- Unlimited public traffic while rate-limit remains fail-open.
- Removing the need for later CAD, quote, and production feasibility review.

## 9. Lifecycle And Approval Separation

`first_preview_ready` means only that the first concept preview passed the
automatic customer-visibility gates. It is not `approved_for_customer`,
`approved_for_gallery`, CAD approval, quotation approval, payment confirmation,
order approval, or production approval.

`approved_for_customer` may remain relevant for later formal, human-approved
customer-safe material or downstream communication, but it is not a prerequisite
for the first concept preview. `approved_for_gallery` remains a separate consent,
curation, privacy, and publication decision.

## 10. Implementation Implications

Future implementation work should plan a customer-facing sketch preview flow
and must not misuse existing approval states.

Implementation notes:

- A future implementation should distinguish `first customer concept preview`
  from `approved for customer` and `approved for production`.
- Existing admin review states may need new semantics, new statuses, or careful
  mapping.
- The website preview should include clear disclaimers.
- The generation step should record prompt/spec version, model, output
  metadata, and cost estimate when implemented.
- The preview path should have clear error handling if generation fails.
- The customer should see a useful waiting or processing state if generation
  takes time.
- Customer feedback should be captured for correction or regeneration.
- Human correction should be available after preview.

Current Production does not yet implement real AI image generation.
`/design/preview/[public_reference]` remains mock-only, the submitted-page
preview entry remains a demo/mock connection, and no real generated customer
preview is live. This locked direction is not evidence of deployment.

## 11. Relationship To Previous Email-Only Decision

Earlier MVP planning used a conservative email-only customer delivery default.
This new owner decision changes the forward product direction.

The new direction is not that AI sketches are final or production-ready. The
new direction is that the first AI concept sketch should be shown quickly on
the website as an early concept preview with strong disclaimers and later human
correction.

This post-Agent-60I direction supersedes former forward-looking rules that kept
the first AI concept sketch internal-only, required human approval before first
customer visibility, or limited customer delivery to email. Those rules remain
historical context only.

Earlier docs remain useful as history and safety context. Future implementation
planning should explicitly update customer preview, review-state, and delivery
semantics instead of silently reusing older email-only assumptions.

## 12. Next Recommended Work

Recommended next steps:

- Optional Agent 67B: safely decide the disposition of the obsolete Agent 66E
  branch in a separate task.
- Agent 68A / PR #192 merged the provider-neutral, server-only first-preview
  runtime foundation at merge commit
  `5777498c2db6c52b1d97127206578760acea0d3f`.
- Agent 69A defines the docs-only First Preview Product Contract v1 in
  `docs/novora-first-preview-product-contract-v1.md` and aligns the
  post-Agent-68A source of truth.
- Later separate planning should use a preview data-model and SQL packet, then a
  provider, safety-evidence, access, retry, budget, and cost-control decision.
  SQL execution, provider setup, and implementation Agents each require
  separate explicit approval.
