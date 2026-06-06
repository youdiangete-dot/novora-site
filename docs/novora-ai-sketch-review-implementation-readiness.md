# NOVORA AI Sketch Review Implementation Readiness

## A. Purpose And Boundary

This is an implementation readiness review only. It does not approve or perform
implementation work.

No SQL was executed for this review. No Supabase schema, RLS, grants, policies,
storage, app code, API route, OpenAI API integration, image generation, image
upload, customer-facing sketch display, public gallery automation, auth,
payment, points, environment variable, secret, Production/admin, email, CAD,
order, production, or customer-data operation was performed.

The goal is to decide whether NOVORA is ready to enter a minimum safe
persistence implementation stage for the admin AI Sketch Review Workflow. The
answer is conservative: the project has enough planning foundation to prepare a
minimal persistence slice, but SQL execution and app implementation still require
separate explicit approval and final review.

The product boundary remains unchanged. A NOVORA AI sketch is an internal AI
hand-drawn concept sketch for early design direction only. It is not CAD, not a
quote, not an order, not sourcing confirmation, not final pricing, and not
production approval. AI sketches are internal drafts until reviewed and approved.
Customers must only see sketches approved by the NOVORA design team. Unreviewed
GPT/AI drafts must never be shown directly to customers.

## B. Current Completed Foundation

Completed foundation:

- PR #106 added the protected admin-only AI Sketch Review Workflow skeleton on
  the admin brief detail page.
- PR #107 added the docs-only state and persistence plan for that workflow.
- PR #108 updated the docs-only SQL packet with future admin AI sketch review
  workflow persistence planning.
- PR #109 updated the durable project ledger for consistency after the recent
  docs and admin skeleton work.
- Customer-facing pages are covered by tests that assert internal AI sketch
  workflow copy is not exposed on public/customer routes.
- The current admin skeleton states that the workflow does not generate, store,
  or deliver sketches yet.

Current limitations:

- No dedicated AI Sketch Review Workflow persistence exists yet.
- No AI image API integration exists yet.
- No real AI sketch generation exists yet.
- No customer-facing real sketch preview delivery exists yet.
- No public gallery automation exists yet.
- Existing `admin_notes` persistence for general admin review status/internal
  notes is not the same as persisted AI sketch output review state.

## C. Recommended Minimum Implementation Scope

The smallest future implementation worth considering is:

- Persist only the admin review status for a Concept Brief and AI sketch output
  relationship.
- Use only these initial status values:
  - `internal_draft_not_generated`
  - `draft_generated_internal_only`
  - `needs_revision`
  - `approved_for_customer`
- Treat status as output-aware. Approval should apply to a specific future
  `ai_sketch_output_id`, not vaguely to a Concept Brief.
- Add an internal reviewer note and revision instruction only if the write path
  is server-only, protected by admin access, excluded from customer responses,
  and audited.
- Record actor, timestamp, previous status, next status, Concept Brief id,
  output id when available, and reason/revision context.
- Keep customer preview delivery disabled in the first persistence PR.

Do not include these in the first persistence PR:

- Customer-facing sketch preview.
- OpenAI image generation.
- Image upload/storage for generated sketches.
- Public gallery approval or gallery publishing.
- Payment, points, credits, packages, auth, or customer accounts.

## D. Not Recommended Yet

The following should not be implemented yet:

- OpenAI image API integration.
- Real AI sketch generation.
- Image upload or storage for generated sketches.
- Customer-facing real sketch preview.
- Public gallery automation.
- Paid final sketch packages.
- Points deduction.
- Auth/payment integration.
- Automated customer delivery.
- Automatic approval after generation.
- Any action that treats `approved_for_customer` as `approved_for_gallery`.

## E. Readiness Assessment

NOVORA is not ready to execute SQL immediately from this review alone.

The project is ready for one more final review pass of the SQL packet and
schema/RLS details. SQL may be the next stage only after the checklist below is
complete and the user explicitly approves SQL execution for that exact task.

Before SQL execution, these must be true:

- Final table and field names are reviewed.
- The four status values are frozen for the first slice.
- The RLS and grants plan is reviewed line by line.
- The service-role access path is confirmed server-only.
- The admin access-key model is not confused with a database admin role.
- Rollback and revocation paths are documented.
- Customer-facing visibility remains disabled by SQL alone.
- A safe non-production or review context is available if practical.
- The user explicitly approves SQL execution.

## F. SQL Execution Readiness Checklist

Before any future SQL:

- [ ] Final table names reviewed.
- [ ] Final field names reviewed.
- [ ] Status values frozen.
- [ ] RLS plan reviewed.
- [ ] Grant/revoke plan reviewed.
- [ ] Service-role access path confirmed server-only.
- [ ] Rollback plan prepared.
- [ ] Supabase backup/export considered.
- [ ] No customer-facing visibility enabled by SQL alone.
- [ ] Migration tested in a non-production or safe review context if available.
- [ ] Explicit user approval obtained for SQL execution.

## G. RLS / Grants Readiness Checklist

Future RLS and grants must enforce:

- `anon` must not access internal review records.
- Customers must not access internal review records.
- The current admin access-key model is not the same as a database admin role.
- `service_role` must remain server-only.
- Future customer preview routes may return only approved customer-safe assets.
- Internal notes must never be returned to customer routes.
- Raw prompts, provider payloads, private storage paths, internal failure
  reasons, and reviewer notes must not be exposed to customer or public routes.
- Public gallery records must be separate from private review records.

## H. Admin Route Readiness Checklist

A future server route for AI sketch review status persistence must:

- Be server-only.
- Require protected admin access.
- Validate `concept_brief_id` and `ai_sketch_output_id` relationships.
- Prevent invalid transitions.
- Log audit events.
- Exclude internal notes from customer pages and customer APIs.
- Avoid creating a customer-visible asset automatically.
- Avoid approving a sketch automatically after generation.
- Keep generation status separate from human review status.
- Handle partial write failure without implying approval or delivery.

## I. Customer Visibility Gate Readiness

A sketch can only become customer-visible if all of the following are true:

- Correct Concept Brief association.
- Successful AI sketch output exists.
- Human/admin review status is `approved_for_customer`.
- Privacy and reference-image checks pass.
- No internal notes are exposed.
- No raw prompt, private storage path, provider payload, or internal failure
  reason is exposed.
- Safe customer-facing title and copy exists.
- The delivery route is separately approved and access-controlled.

`approved_for_customer` does not mean `approved_for_gallery`.

`approved_for_customer` is necessary but not sufficient for private customer
preview. It does not approve CAD, quote, order, sourcing, payment, production,
manufacturing, public gallery use, or public publishing.

Private customer preview, public gallery approval, and commercial package
delivery remain separate future stages. Each needs its own approved route,
access rules, tests, and explicit implementation task.

## J. Test Readiness

Future implementation should include focused tests for:

- Admin can view persisted AI sketch review status.
- Admin can update status through a protected path.
- Invalid transitions are blocked.
- `needs_revision` blocks customer visibility.
- Unapproved drafts are never customer-visible.
- `approved_for_customer` does not create a public gallery entry.
- Internal notes never appear on customer routes.
- Customer pages do not show internal workflow text.
- AI generation success does not set `approved_for_customer`.
- Wrong Concept Brief/output association is rejected.
- Customer preview remains unavailable until a separate delivery route is
  approved.

For this docs-only review, validation is limited to:

- `git diff --check`
- `git diff --cached --check` after path-specific staging

Build and e2e tests are skipped because this task changes documentation only
and does not change runtime behavior, UI behavior, API behavior, persisted data,
or asserted test copy.

## K. Rollback / Failure Handling

Future implementation must plan for:

- Reverting a bad admin status change by writing a new audited correction event,
  not silently editing history.
- Revoking customer approval by moving the status back to `needs_revision` or a
  future explicit revoked state and disabling any linked customer visibility.
- Disabling customer visibility without deleting the underlying internal review
  record.
- Handling migration failure by stopping before app code depends on the new
  table and documenting whether the migration can be safely rolled back.
- Handling partial persistence write failure by leaving the review state
  unchanged or marked unavailable, never implicitly approved.
- Auditing manual corrections with actor, timestamp, reason, previous status,
  next status, Concept Brief id, and output id.

## L. Recommended Implementation Sequence

Conservative next steps:

1. Review this readiness review PR; merge only after normal review if accepted.
2. Perform final review of the SQL packet.
3. Obtain explicit user approval for SQL execution only.
4. Execute minimal SQL/schema only if approved.
5. Verify schema, RLS, and grants.
6. Implement a server-only admin persistence route.
7. Update the admin UI to read/write persisted status.
8. Add focused admin and customer-visibility tests.
9. Later connect AI generation jobs.
10. Later add private customer preview.
11. Later add gallery approval.
12. Later add paid/points integration.

## M. Stop Gates

Stop and ask for explicit approval before:

- SQL execution.
- Supabase schema changes.
- RLS, grants, or policy changes.
- Storage bucket or storage policy changes.
- OpenAI API integration.
- Image generation.
- Image upload or generated-image storage.
- Server route implementation.
- Customer-facing sketch display.
- Public gallery automation.
- Auth/login implementation.
- Payment/provider logic.
- Points deduction.
- Production rollout.
- Protected Production/admin access.
- Real customer-data operations.
- CAD, order, or production workflow.

## N. Risk Review

| Risk | Consequence | Affected scope | Why risk exists | Likelihood / severity | Mitigation |
| --- | --- | --- | --- | --- | --- |
| Executing SQL before RLS is ready | Internal review rows could be readable or mutable through the wrong role. | Supabase tables, customer privacy, admin workflow. | SQL structure and RLS/grants are separate decisions and can drift. | Medium / critical. | Review RLS/grants line by line before execution; deny anon/customer access by default. |
| Exposing internal review records to customers | Customers see private status, notes, prompts, or provider metadata. | Customer routes, privacy, trust. | Review records are operational data, not customer DTOs. | Medium / critical. | Use server-side redaction; customer routes must never return internal review rows. |
| Unreviewed draft customer exposure | Customer sees low-quality, unsafe, private, or misleading output. | Customer preview, support, brand trust. | Generation success can be mistaken for human approval. | Medium / critical. | Default outputs to internal-only; require `approved_for_customer` plus delivery gates. |
| `needs_revision` exposure | A known-problem draft reaches the customer. | Customer preview, brand quality, support. | A rejected/revision output may still exist in storage or metadata. | Medium / high. | Block or revoke preview whenever status is `needs_revision`. |
| `approved_for_customer` confused with `approved_for_gallery` | Private customer work could be published publicly. | Public gallery, privacy, legal risk, trust. | Both are approval concepts with different audiences. | Medium / critical. | Keep gallery approval, customer approval, consent, and public-safe records separate. |
| Internal notes leaked | Reviewer notes or revision instructions appear in customer pages. | Customer routes, public APIs, privacy. | Internal notes may be stored near review status. | Medium / critical. | Never include internal notes in customer responses; test customer routes for absence. |
| Wrong Concept Brief/output association | A customer or admin sees or approves the wrong sketch. | Admin review, customer preview, privacy. | Future output records can be mislinked across briefs, jobs, or assets. | Medium / critical. | Validate `concept_brief_id`, `ai_sketch_output_id`, and ownership/access on every write/read. |
| Accidental admin approval | Wrong output becomes eligible for customer presentation. | Admin workflow, customer preview, brand trust. | Approval UI can be ambiguous or rushed. | Medium / high. | Show brief reference, output metadata, confirmation, and audit trail before approval. |
| AI generation success auto-approval | Provider output becomes visible without human review. | AI jobs, customer preview, privacy. | Job status and review status can be conflated. | Medium / critical. | Keep generation status separate from review status; never auto-set `approved_for_customer`. |
| Invalid status transition | Review state skips required checks or leaves stale visibility active. | Admin workflow, customer preview. | Manual state machines need explicit transition rules. | Medium / high. | Enforce allowed transitions server-side; audit every transition. |
| Missing audit trail | NOVORA cannot identify who approved, revised, or exposed a sketch. | Admin accountability, support, incident review. | Current skeleton has no dedicated persistence. | Medium / high. | Add audit events before enabling review mutation or delivery. |
| Rollback not possible | Bad approval or migration cannot be safely reversed. | Supabase, admin workflow, customer preview. | Persistence introduces durable state and customer-visible effects. | Medium / high. | Prepare rollback and revocation plan before SQL and before customer delivery. |
| Customer misunderstands sketch as CAD, quote, order, or production approval | Customer expects manufacturable jewelry, pricing, or fulfillment. | Product trust, support, commercial expectations. | High-quality sketches can look final. | Medium / high. | Repeat concept-sketch-only copy near preview, delivery, packages, and gallery. |
| Future migration complexity | Early rows lack fields needed for review, audit, delivery, or gallery safety. | Data model, analytics, support, privacy. | Shipping minimal persistence can create legacy gaps. | Medium / medium. | Freeze required fields before SQL; keep first slice narrow and migration-safe. |
