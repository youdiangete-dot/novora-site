# NOVORA Customer Sketch Preview Route UI State Plan

## 1. Purpose

This document plans the future customer route and UI state model for NOVORA's
instant first AI concept sketch preview flow.

This PR does not implement routes, components, image generation, storage, APIs,
database changes, customer-facing copy changes, tests, package changes,
environment variables, Supabase changes, Vercel configuration, email behavior,
or deployment behavior.

## 2. Product direction being served

This route and UI plan supports the owner-approved direction recorded by Agent
60I and expanded by Agent 61A:

- A customer should see the first AI-generated hand-sketch concept as soon as
  possible after submitting a Concept Brief.
- The website-based first preview is a core conversion path for the future
  MVP direction.
- Human correction should focus on structural logic errors, jewelry
  construction errors, craft issues, production feasibility issues,
  inconsistent views, wrong setting logic, proportion problems, customer
  request mismatch, correction, and regeneration.
- The sketch is a concept preview only. It is not final approval, CAD, a quote,
  order confirmation, payment confirmation, or production approval.

## 3. Existing flow context

Current documented and implemented context:

- `/design/start` introduces the guided custom jewelry Concept Brief path and
  points customers toward illustrative concept direction, not production-ready
  output.
- `/design/concept` collects structured design intake and planning-only
  reference images. Those planning files are not the final persisted reference
  upload.
- `/design/brief` submits the Concept Brief and final reference uploads. The
  submitted confirmation depends on server persistence, a valid
  customer-visible `publicReference`, and a valid Concept Brief UUID.
- `/design/submitted` currently shows a receipt after confirmed persistence,
  displays the public reference, summarizes next steps, and states that the
  receipt is not final order, payment, CAD, quote, or production confirmation.
  Current tests assert that it does not link to `/design/sketch`.
- `/design/sketch` exists as a customer-reachable mock/demo route. It reads
  browser storage and shows a CSS placeholder with clear copy that real AI
  sketch generation is not active and the visual is not the customer's actual
  generated design.
- Protected admin routes under `/admin/briefs` include internal Concept Brief
  review and an AI sketch review workflow surface. They are not customer
  preview routes.

Earlier planning used a conservative email-only, human-review-first delivery
boundary. Agent 60I pivots the future product direction toward website-first
preview after submission, while preserving the concept-only, no-CAD,
no-quote, no-payment, no-order, and no-production-approval boundary.

No current source should be read as evidence that live customer sketch preview,
image generation, customer feedback capture, or preview persistence is already
implemented.

## 4. Candidate customer route model

Candidate future route options:

- Keep `/design/submitted` as the confirmation and processing page after a
  persisted Concept Brief submission.
- Add a dedicated customer preview route such as
  `/design/preview/[public_reference]` for the first visible sketch preview.
- Consider `/design/sketch` only if a future implementation safely rewrites its
  semantics from mock/demo placeholder to the new customer preview model.
- Do not expose customer preview through `/admin/briefs`,
  `/admin/briefs/[publicReference]`, or any internal admin review route.

These route names are planning candidates only unless already implemented.
Current `/design/sketch` is implemented as a mock/demo route, not as the
future live customer preview route.

## 5. Recommended route direction

Recommended future direction:

- Keep `/design/submitted` as the receipt and processing context, not the final
  image-heavy preview surface.
- Introduce a dedicated customer preview route, likely
  `/design/preview/[public_reference]`, for the first preview and later
  revision states.
- Avoid using admin AI sketch review routes for customer preview. Admin review
  can inform customer-visible status, but the customer route should receive a
  redacted customer-safe view only.
- Treat `publicReference` as the customer-visible reference displayed in the
  UI. Do not expose internal Concept Brief UUIDs, storage paths, provider
  payloads, admin notes, private prompts, or reviewer notes.
- Plan for an additional safe access token, signed link, server-mediated access
  check, or equivalent mechanism before customer preview assets are exposed.
  A public reference alone may be too guessable for private sketch access.

This model keeps receipt, processing, preview, admin review, and production
approval concepts separate.

## 6. Customer UI state model

Candidate customer-facing states:

- `submission_received`: server persistence, valid Concept Brief UUID, and
  valid public reference are confirmed.
- `preparing_design_spec`: the brief is being structured into an internal
  Design Spec.
- `sketch_generation_queued`: a first-preview generation job is waiting to
  start.
- `sketch_generating`: the first AI hand-sketch concept is being generated.
- `first_preview_ready`: a customer-safe first preview is available.
- `generation_delayed`: generation is taking longer than expected or waiting
  for backend capacity.
- `generation_failed`: generation failed and no customer-safe first preview is
  ready.
- `preview_unavailable`: the preview cannot be shown because access, asset,
  safety, or data requirements are not satisfied.
- `customer_feedback_submitted`: the customer submitted feedback about the
  visible preview.
- `revision_in_progress`: a revision, correction, or regeneration path is
  active.
- `revised_preview_ready`: a revised customer-safe preview is available.
- `human_followup_needed`: human review, clarification, or offline follow-up is
  needed before the next customer-visible step.

These are planning candidates and are not implemented statuses unless a later
task separately confirms them in code, schema, or API contracts.

## 7. Page-by-page UI state plan

Submission confirmation / processing page:

- Thank the customer for submitting the Concept Brief.
- Show the customer-visible public reference.
- Explain that NOVORA is preparing an early AI hand-drawn concept sketch
  direction after confirmed receipt.
- Show processing states if design spec preparation or sketch generation is
  pending.
- Show estimated wait copy only if a later implementation can support it with
  real product and system behavior.
- Avoid promising exact timing unless a later implementation records and
  supports that promise.

Preview page:

- Show the first AI concept sketch when the customer-safe visibility conditions
  pass.
- Show clear concept-only disclaimers near the sketch image.
- Show feedback actions for liking the direction, requesting revision,
  clarifying details, reporting mismatch, or asking for human follow-up.
- Use labels such as `request revision` or `clarify details` for feedback entry
  points.
- Show the human follow-up boundary where correction, feasibility, or
  clarification is needed.
- Avoid CAD, quote, payment, order, or production language.

Failure / fallback state:

- Explain that the concept sketch preview is not ready.
- Invite the customer to wait, refresh, or expect human follow-up depending on
  the state.
- Avoid blaming providers or exposing internal errors.
- Preserve customer trust by framing fallback as NOVORA continuing the concept
  review path manually if automation is delayed or unavailable.

## 8. Required customer-facing disclaimer placement

Required disclaimer placement:

- Near the sketch image.
- Near feedback and revision controls.
- Near any download, share, save, or copy-link action if one is later added.
- In processing and fallback copy where needed to prevent customers from
  confusing the preview with approval.

Required disclaimer content:

- AI-generated concept sketch.
- Early visual direction.
- For communication and feedback.
- Not CAD.
- Not a quote.
- Not order confirmation.
- Not payment confirmation.
- Not production approval.
- Subject to human review, CAD validation, pricing review, and production
  feasibility review.

The disclaimer should be visible in the normal reading path and should not be
hidden only in tooltips, collapsible sections, or legal footnotes.

## 9. Customer feedback entry points

Future customer feedback actions may include:

- Like or approve the concept direction.
- Request revision.
- Clarify missing information.
- Report mismatch with the submitted brief.
- Request human follow-up.
- Add a note about stone, metal, style, budget, size, or reference image.
- Upload an additional reference later only if future storage, validation,
  access control, privacy copy, and retention handling are designed.

Feedback must not imply CAD approval, quote approval, order approval, payment
approval, or production approval. This document does not implement feedback UI.

## 10. Human correction handoff

Customer-visible states should connect to human correction when the system,
customer, or reviewer identifies:

- Structural logic error.
- Jewelry construction error.
- Production feasibility issue.
- Inconsistent main, side, or angle views.
- Wrong prong or setting logic.
- Wrong gemstone placement.
- Proportion problem.
- Customer request mismatch.
- Unsafe or misleading claim.
- Regeneration needed.
- Manual correction needed.

Human review is not intended to block every first preview under the Agent 60I
direction, but it must remain available for corrections, risky cases,
production-feasibility concerns, customer confusion, and regeneration.

## 11. Localization / bilingual UI planning

Future English and Traditional Chinese copy planning should cover:

- Page titles.
- Processing states.
- Preview labels.
- Concept-only disclaimers.
- Feedback buttons.
- Failure fallback.
- Revision request.
- Human follow-up.
- Public reference display.
- Automatic submission response alignment.

Traditional Chinese should support Taiwan-market customers when that future
market direction is implemented. Localization should be treated as a product
system that may affect language, currency, sizing conventions, contact
preferences, tax or shipping notes, market-specific trust copy, and support
flow. This PR does not modify translation files, public copy, routes, or UI.

## 12. Accessibility and UX considerations

Future implementation should plan:

- Specific alt text for generated sketch images that describes the piece type,
  concept direction, and preview status without implying final approval.
- Accessible loading and processing states with clear status labels.
- Mobile layouts that keep the sketch, disclaimers, and feedback controls
  readable without overlap.
- Slow network handling that does not trap customers on a blank page.
- Large image display with zoom or fit behavior if later needed.
- Critical disclaimers that are visible and not hidden behind hover-only or
  collapsed affordances.
- Readable bilingual layout with enough space for Traditional Chinese and
  English labels.
- Clear distinction between concept preview, revision request, and final
  approval so customers do not mistake a sketch for CAD, quote, or production
  readiness.

## 13. Security / privacy considerations

Future implementation should plan:

- Avoid exposing internal database IDs to customers.
- Avoid exposing admin routes or admin-only data.
- Avoid exposing provider metadata, raw provider payloads, or internal failure
  details to customers.
- Avoid exposing private prompt content unless a redacted, customer-safe
  summary is intentionally designed.
- Protect reference images and generated images through private storage,
  signed URLs, server-mediated access, or another reviewed access strategy.
- Use `publicReference` or another safe customer identifier in UI copy, but do
  not rely on public references alone if the preview asset is private.
- Keep provider keys, service-role keys, admin keys, and storage secrets
  server-only.
- Avoid customer data in URLs beyond safe references and access tokens approved
  by a future privacy/security review.
- Align privacy, consent, and AI-processing copy before external beta.

## 14. Error and edge cases

Customer-safe handling should be planned for:

- Generation timeout.
- Provider failure.
- Duplicate generation.
- Missing brief data.
- Missing contact email.
- Invalid reference image.
- Unsafe image output.
- Output not jewelry-relevant.
- Output with obvious structural contradiction.
- Output unavailable after refresh.
- Customer opens preview link before generation finishes.
- Customer opens stale preview link.

Customer-facing copy should stay non-technical. Admin-visible diagnostics can
use sanitized failure categories later, but customer routes must not reveal
provider internals, stack traces, private prompts, protected storage paths, or
admin notes.

## 15. Admin / operations implications

Future admin or human review tooling may need to:

- View customer preview status.
- See sanitized generation failure reason.
- See customer feedback.
- Flag structural issue.
- Request regeneration.
- Mark human follow-up needed.
- Record customer-safe notes.
- Keep customer preview status separate from production approval.

Admin-facing state should not be mixed with production, CAD, quote, payment,
order, gallery, or fulfillment approval. This document does not modify admin
implementation.

## 16. Analytics / conversion measurement planning

Future metrics may include:

- Brief submitted.
- Processing page viewed.
- First preview shown.
- Feedback submitted.
- Revision requested.
- Human follow-up requested.
- Generation failure.
- Time to first preview.
- Conversion from preview to follow-up.

Analytics should be privacy-reviewed before implementation and should avoid
capturing private prompts, reference images, customer contact details, or
sensitive free-text notes. This PR does not implement analytics.

## 17. Implementation sequencing

Recommended future agents:

- Agent 61C: data/status model and SQL packet planning for preview states and
  feedback records.
- Agent 61D: Design Spec JSON and Hand Sketch Instruction alignment for the
  first preview route.
- Agent 61E: UI route skeleton planning or implementation behind safe mock
  states, no live image generation.
- Agent 61F: customer feedback loop planning.
- Agent 61G: server-side generation orchestration plan.
- Later agent: live image API integration only after environment, storage,
  rate-limit, cost, error handling, disclaimers, and privacy alignment are
  ready.

Each agent should keep route/UI, data model, provider integration, storage,
feedback, privacy/legal, analytics, and Production verification in separate
approval boundaries unless a future task explicitly narrows and combines them.

## 18. Open decisions

Unresolved decisions:

- Exact customer preview route path.
- Whether `/design/sketch` should be reused or replaced.
- Synchronous vs polling vs background generation.
- Whether email fallback is still used when generation is delayed.
- Exact preview expiration policy.
- Exact feedback fields.
- Exact bilingual copy.
- Exact customer-safe sender / reply-to.
- Exact Privacy / Terms publication timing.
- Exact rate-limit mitigation.
- Exact preview access token strategy.
- Exact image provider/model.
- Exact generation budget and retry limits.

Do not invent these answers during implementation.

## 19. Stop conditions

Stop before any request that would:

- Present the first sketch as final design.
- Imply CAD approval.
- Imply quote approval.
- Imply order, payment, or production approval.
- Expose admin routes or internal IDs.
- Expose provider keys client-side.
- Remove required disclaimers.
- Remove the human correction path.
- Launch broad public traffic before beta gates are resolved.
- Implement live image generation before environment, cost, storage,
  rate-limit, privacy, and error handling are planned.

Also stop before app code, route, API, Supabase, SQL, Vercel/env, email,
package, test, asset, protected admin, Production data, deployment, or merge
work unless a separate future task explicitly approves that scope.
