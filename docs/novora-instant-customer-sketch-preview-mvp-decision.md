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
- The customer should see the first AI-generated concept sketch as soon as
  possible after submitting the brief.
- Human intervention should focus on structural logic errors, jewelry
  construction errors, production feasibility issues, inconsistent views, wrong
  stone setting logic, proportion problems, and correction or regeneration.
- The first sketch is a concept preview, not CAD, not a quote, not order
  approval, not payment approval, and not production approval.

## 3. Revised MVP Flow

The revised target MVP flow is:

1. Customer submits a Concept Brief.
2. GPT/AI structures the design request.
3. AI/image generation creates the first hand-sketch concept.
4. The website shows the first concept sketch to the customer.
5. The customer reacts and gives feedback.
6. Human review intervenes when structure logic, jewelry construction,
   production feasibility, customer-safety, or mismatch issues appear.
7. Revised versions are generated or manually corrected.
8. CAD, quote, sourcing, order, payment, and production remain offline and
   separately confirmed.

## 4. Human Intervention Model

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

## 5. Customer-Facing Disclaimers

Every future first sketch preview must be clearly labeled as:

- AI-generated concept sketch.
- Early visual direction.
- For communication and feedback.
- Not CAD.
- Not a quote.
- Not order confirmation.
- Not production approval.
- Subject to human review, correction, CAD validation, pricing, and production
  feasibility review.

## 6. What Is Approved Now

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

## 7. What Is Not Approved

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

## 8. Implementation Implications

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

## 9. Relationship To Previous Email-Only Decision

Earlier MVP planning used a conservative email-only customer delivery default.
This new owner decision changes the forward product direction.

The new direction is not that AI sketches are final or production-ready. The
new direction is that the first AI concept sketch should be shown quickly on
the website as an early concept preview with strong disclaimers and later human
correction.

Earlier docs remain useful as history and safety context. Future implementation
planning should explicitly update customer preview, review-state, and delivery
semantics instead of silently reusing older email-only assumptions.

## 10. Next Recommended Agents

Recommended next steps:

- Agent 60J: review this strategy pivot doc.
- Agent 61A: plan the customer-facing instant sketch preview implementation.
- Agent 61B: implement the first safe UI route/state for customer preview
  without connecting live image generation yet, if needed.
- Later agent: wire real generation only after prompt/spec pipeline, storage,
  rate-limit, cost controls, error states, and disclaimers are defined.
