# NOVORA Agent 56B Final MVP Scope Lock And Launch-Readiness Definition

## 1. Purpose

Agent 56B locks the current non-SQL NOVORA MVP scope and defines launch-readiness criteria.

This is a docs-only planning document. It does not implement app, API, UI, helper, fixture, test, package, config, migration, SQL, Supabase, provider, image generation, email sending, customer-facing sketch preview, gallery approval, CAD, quote, order, or production behavior.

Agent 56B does not execute SQL, access Supabase, use Supabase CLI, create migrations, persist artifacts, call image providers, send email, approve gallery use, start Agent 55H, start Agent 56C, or start any implementation agent.

## 2. Current MVP definition

The current NOVORA MVP is a public custom jewelry concept-brief intake and protected admin-review workflow that helps NOVORA collect customer design intent, reference images, contact information, and internal review state, while preserving a human-reviewed, email-only concept sketch delivery model.

The MVP does not require live Design Spec or Hand Sketch Instruction persistence, real image generation, automatic customer delivery, customer sketch preview, gallery workflow, CAD automation, quote automation, order automation, gemstone procurement automation, or production automation.

## 3. Non-negotiable product boundaries

- AI sketches are internal drafts only before human approval.
- Customers only see human-approved output.
- Current customer delivery remains email-only after human review.
- No unreviewed AI, GPT, or image draft is customer-visible.
- Design Spec and Hand Sketch Instruction are internal planning artifacts.
- Raw internal prompts, raw Design Specs, and raw Hand Sketch Instructions must not be emailed to customers.
- `approved_for_customer` is not `approved_for_gallery`.
- Generation success is not approval.
- Website quick preview is future product only, not current MVP.
- CAD, quotation, gem procurement, and production remain offline and separate.
- Concept sketch is not CAD, quote, order confirmation, or production approval.

## 4. Included in current MVP

Current MVP capabilities include:

- Public design-start, concept, and brief submission path.
- Customer contact fields.
- Reference image upload support.
- Public submission confirmation with reference ID.
- Protected admin brief list/detail review.
- Admin internal notes and review state persistence.
- Admin notification email baseline.
- Reference image metadata and protected admin access.
- AI sketch review status foundation.
- Internal review workflow skeleton.
- Read-only safe empty-state artifact display.
- AI sketch governance documentation.
- Final MVP scope and launch-readiness docs.

Inclusion means the current MVP has the capability, policy, or foundation needed for owner-controlled operation. It does not mean every area is fully automated.

## 5. Excluded from current MVP

Current MVP exclusions:

- SQL execution for artifact schema by default.
- Persisted Design Spec / Hand Sketch Instruction tables.
- Artifact write/read path from the database.
- Real image provider generation.
- Automatic sketch generation.
- Automatic email delivery.
- Customer web sketch preview.
- Website quick AI preview.
- Customer account, login, or payment.
- Gallery approval or publication workflow.
- CAD automation.
- Quote automation.
- Order confirmation automation.
- Gemstone procurement automation.
- Production automation.
- Third-party plugin, MCP, or Computer Use workflow.
- Live execution support.

## 6. Manual operations in current MVP

Manual operation is intentional MVP scope control.

- A human reviews each customer brief.
- A human may prepare or request a concept sketch offline or in an internal-only workflow.
- A human reviews any AI/internal draft before customer delivery.
- A human approves the customer-safe version.
- A human controls customer email content and send timing.
- A human handles CAD, quotation, order, and production offline.
- A human handles gemstone procurement offline.
- A human handles gallery consent separately if gallery use is ever needed.

## 7. Public customer flow readiness

Public customer flow is launch-ready only when:

- Public pages explain concept-brief intake clearly.
- CTAs route to the approved design flow.
- Customer expectations are set correctly.
- The site does not promise an instant AI preview.
- The site does not promise CAD, quote, order, or production approval.
- Timeline and cost expectations are honest and manually confirmed.
- No unreviewed sketch surface is visible.
- The submitted-brief path is not broken.

## 8. Customer brief intake readiness

Customer brief intake is launch-ready only when:

- Required contact fields work.
- Customer name and email are validated.
- Optional contact fields remain optional.
- Design brief fields remain understandable.
- Submission creates a traceable reference.
- Customer confirmation copy is accurate.
- No raw AI output is shown after submission.
- Failure states do not expose internal data.

## 9. Reference image readiness

Reference image handling is launch-ready only when:

- Customers can upload reference images.
- Reference image metadata is recorded.
- Protected admin access works.
- Public access does not expose private storage paths.
- Signed or protected links remain admin-only.
- Missing image states are safe.
- Reference images are not used for automatic public generation in the current MVP.

## 10. Admin review readiness

Admin review is launch-ready only when:

- Admin protected pages load.
- Brief list/detail views are usable.
- Internal notes persist.
- Review state persists.
- Legal statuses remain fixed.
- `pending` remains illegal.
- Admin-only boundaries are preserved.
- No customer display is triggered by admin status alone.

## 11. Internal AI sketch governance readiness

Internal AI sketch governance is launch-ready only when:

- AI sketch status language is aligned.
- The internal draft boundary is clear.
- Generation success is not approval.
- Human review is required.
- Raw customer brief is not used directly for image generation.
- Design Spec / Hand Sketch Instruction structure is defined.
- No provider calls are required for current launch.
- No public sketch preview is required for current launch.

## 12. Human review readiness

Human review is launch-ready only when:

- The reviewer understands what to check.
- The reviewer understands structure, style, craft logic, and feasibility risks.
- The reviewer can approve, reject, or request revision.
- The reviewer can create a customer-safe summary.
- The reviewer does not expose raw prompts, specs, internal instructions, or internal notes.
- The reviewer understands `approved_for_customer` is not gallery approval.

## 13. Customer-safe delivery readiness

Customer-safe delivery is launch-ready only when:

- The customer receives only human-approved customer-safe material.
- Delivery is controlled by a human.
- Raw Design Spec is not sent.
- Raw Hand Sketch Instruction is not sent.
- Internal prompt is not sent.
- Reviewer/internal note is not sent.
- Attachments are manually selected and reviewed.
- No automatic delivery is required for the current MVP.

## 14. Email-only delivery boundary

Current MVP concept sketch delivery remains email-only.

Email sending may be manual in the current MVP or separately implemented later. No automatic email delivery exists by default. The Resend admin notification foundation does not equal customer sketch delivery automation.

Customer sketch delivery implementation requires separate scope. Any customer email content must be human-approved before it is sent.

## 15. Gallery and public display boundary

The current MVP has no customer sketch public display and no automatic gallery publication.

`approved_for_customer` is not `approved_for_gallery`. Gallery use requires separate customer consent, privacy review, curation, and publication approval.

The curated mock gallery remains a non-CAD, non-quote, non-order, and non-production approval context. Gallery workflow is post-MVP unless separately approved.

## 16. CAD / quote / order / production boundary

- Concept sketch is not CAD.
- Concept sketch is not a quote.
- Concept sketch is not order confirmation.
- Concept sketch is not production approval.
- CAD remains offline by designer.
- Quotation remains offline.
- Order confirmation remains offline.
- Gemstone procurement remains offline.
- Production remains offline.
- Production timeline and cost must be confirmed outside MVP automation.

## 17. SQL and artifact persistence boundary

Agent 55G is complete, but Agent 55G does not approve SQL execution. The default remains Option A - do not execute SQL now.

Agent 55H is not the default next step. SQL execution requires separate explicit human approval. User-run execution remains the default unless a separate execution-support scope is approved.

Artifact persistence cannot start until SQL is separately approved, executed, and verified. Admin artifact write/read paths cannot start until SQL is executed and verified. Agent 56B does not start Agent 55H.

## 18. Image provider / AI generation boundary

Real provider generation is not required for current non-SQL MVP launch.

Image generation remains future/internal-only. Raw briefs must not be sent directly into image generation. Future generation must use fixed Design Spec plus Hand Sketch Instruction inputs, require a cost/provider ledger, and preserve human review before customer delivery.

Agent 56B makes no provider calls.

## 19. Website quick preview boundary

Website quick preview is future product only. It is not part of the current MVP.

No customer sketch preview should be added now. No automatic generation should be added now. Any future quick preview requires separate product, safety, cost, and review design.

## 20. Privacy and sensitive-data boundary

Privacy and sensitive-data readiness requires:

- Customer contact data remains protected.
- Internal notes remain protected.
- Raw prompts, Design Specs, and Hand Sketch Instructions remain internal.
- Reference image paths are not publicly exposed.
- Screenshots and evidence avoid secrets.
- No service role key, database URL, provider key, or API key appears in docs or chat.
- Customer private data is not copied into public or gallery context without consent.

## 21. Operational SOP readiness

Current MVP operation needs SOPs for:

- Admin intake review.
- Human sketch review.
- Customer-safe email.
- Reference image handling.
- Privacy and consent.
- Offline CAD, quote, and production handoff.
- Incident and no-go handling.

These SOPs may be developed in Agent 56C.

## 22. QA and regression readiness

QA and regression readiness requires checking:

- Existing public intake path.
- Protected admin list/detail.
- Review notes/status.
- Reference upload and admin access.
- No customer sketch preview.
- Gallery disclaimer.
- Admin notification baseline.
- Customer confirmation copy.
- No secret exposure.

Agent 56B defines readiness only. The actual QA run can be handled by a future Agent 56F.

## 23. Launch-readiness checklist

Public flow:

- [ ] Public entry points route to the approved design intake.
- [ ] Public copy frames the flow as concept-brief intake.
- [ ] No instant AI preview is promised.
- [ ] No CAD, quote, order, or production approval is implied.

Admin flow:

- [ ] Protected admin list loads.
- [ ] Protected admin detail loads.
- [ ] Internal notes persist.
- [ ] Review status persists with legal statuses only.

Reference images:

- [ ] Final reference upload works.
- [ ] Reference metadata is recorded.
- [ ] Protected admin reference access works.
- [ ] Public storage paths are not exposed.

Human review:

- [ ] Reviewer policy is understood.
- [ ] AI/internal drafts remain internal until human approval.
- [ ] `approved_for_customer` is not treated as gallery approval.

Customer delivery:

- [ ] Delivery remains human-controlled.
- [ ] Customer receives only customer-safe approved material.
- [ ] Raw prompts/specs/instructions/internal notes are not sent.

Privacy/security:

- [ ] Customer contact data remains protected.
- [ ] Reference links remain protected.
- [ ] No secrets appear in docs, logs, screenshots, or chat.

Product boundaries:

- [ ] Concept sketch is not CAD.
- [ ] Concept sketch is not a quote.
- [ ] Concept sketch is not order or production approval.

Non-SQL boundary:

- [ ] No SQL execution is required for current MVP launch.
- [ ] Artifact persistence remains blocked until SQL is approved, executed, and verified.
- [ ] Agent 55H is not started by default.

Gallery boundary:

- [ ] No automatic gallery publication exists.
- [ ] Gallery use requires separate consent, privacy review, curation, and approval.

CAD/quote/production boundary:

- [ ] CAD remains offline.
- [ ] Quotation remains offline.
- [ ] Gem procurement remains offline.
- [ ] Production remains offline.

QA evidence:

- [ ] Public intake evidence is captured.
- [ ] Admin review evidence is captured.
- [ ] Reference image evidence is captured.
- [ ] No-preview boundary evidence is captured.

Operational ownership:

- [ ] Owner accepts manual operations.
- [ ] Owner accepts email-only delivery.
- [ ] Owner accepts no SQL/artifact persistence requirement for current MVP launch.

## 24. Soft-launch criteria

Soft launch is allowed only when:

- Public brief intake works.
- Admin can see submissions.
- Reference image handling works.
- Admin notification baseline works.
- Human review workflow is understood.
- Customer communication is manual and human-controlled.
- Customer-safe delivery SOP exists.
- No unreviewed sketch preview exists.
- No SQL or artifact persistence dependency is required.
- The owner accepts manual operations.

Soft launch does not mean full automation.

## 25. No-go launch criteria

Launch is no-go if:

- Public intake is broken.
- Admin cannot access submissions.
- Reference image access is broken.
- Contact capture is broken.
- Admin notification baseline is broken without manual fallback.
- Customer sees unreviewed AI output.
- Customer preview route becomes active.
- Gallery publication lacks consent.
- CAD, quote, order, or production approval is implied.
- Secrets are exposed.
- SQL execution is accidentally required.
- Owner cannot handle manual review or delivery.

## 26. Post-MVP backlog

Post-MVP or separately scoped items:

- Agent 56C SOP docs.
- Agent 56D public copy polish plan.
- Agent 56E safe static public copy implementation if approved.
- Agent 56F QA/release readiness checklist.
- Agent 55H only if SQL path is explicitly chosen.
- Artifact persistence after SQL execution and verification.
- Persisted artifact write/read path.
- Internal provider generation.
- Customer email delivery automation.
- Gallery consent/publication workflow.
- Customer account/payment.
- CAD, quote, order, and production automation.

## 27. Dependency map

| Area | Dependency |
| --- | --- |
| Scope lock | Agent 56B |
| SOPs | Agent 56C |
| Public copy plan | Agent 56D |
| Static public copy implementation | Agent 56E, only if approved |
| QA readiness | Agent 56F |
| SQL prep | Agent 55H only by explicit user choice |
| Artifact persistence | SQL executed and verified |
| Image generation | Fixed artifacts, provider/cost ledger, and human-review scope |
| Customer delivery automation | Customer-safe email SOP and separate implementation |
| Gallery | Consent, curation, and privacy approval |
| CAD/quote/production automation | Post-MVP/offline |

## 28. Recommended next Agent sequence

Recommended sequence:

1. Agent 56C - Docs-only admin human-review SOP and customer-safe email SOP.
2. Agent 56D - Docs-only website/public copy polish and expectation-setting plan.
3. Agent 56E - Optional safe static public copy implementation only, if separately approved.
4. Agent 56F - QA/release readiness checklist for current non-SQL MVP.
5. Agent 55H - Only if the user explicitly chooses Agent 55G Option C or D.

After Agent 56B, Agent 56C is the safest next step.

## 29. What can proceed after 56B

- Docs-only SOP planning.
- Docs-only website copy planning.
- Docs-only QA checklist planning.
- Separately approved static copy implementation.
- Manual soft-launch preparation.
- Non-SQL operational readiness.

## 30. What must not proceed after 56B

- SQL execution.
- Supabase live access.
- Supabase CLI.
- Migrations.
- Artifact persistence.
- Artifact database write/read path.
- Provider image generation.
- Automatic customer delivery.
- Customer preview.
- Gallery publication.
- CAD, quote, order, or production automation.
- Agent 55H unless explicitly chosen.
- Implementation without separate scope.

## 31. Risk register

| Risk | Impact | Mitigation | Launch implication |
| --- | --- | --- | --- |
| Scope creep into SQL | Live schema boundary crossed without approval | Keep Agent 55G Option A as default and require separate approval | No launch dependency on artifact SQL |
| Scope creep into provider generation | Cost, safety, and customer-output risk | Keep generation future/internal-only with fixed artifacts and review | No provider call required for launch |
| Customer sees unreviewed output | Trust and safety failure | Preserve human review and no-preview boundary | Immediate no-go |
| Email sends raw internal material | Privacy and quality failure | Use customer-safe email SOP and manual approval | No-go until SOP is accepted |
| Gallery approval confused with customer approval | Unauthorized public display risk | Keep `approved_for_customer` separate from `approved_for_gallery` | No gallery launch without consent |
| CAD/quote/order/production expectation confusion | Customer expectation and operations risk | Repeat concept sketch is not CAD/quote/order/production approval | No-go if public copy implies automation |
| Manual operations not staffed | Submissions cannot be handled reliably | Owner accepts staffing and manual workflow before soft launch | No-go if owner cannot support review/delivery |
| Admin notification fails | Brief may be missed | Confirm baseline and define manual fallback | Soft launch blocked without fallback |
| Reference images inaccessible | Review quality degraded | Verify protected admin access and safe missing-image states | No-go if review depends on unavailable images |
| Secrets or private data exposure | Security/privacy failure | Avoid secrets in docs/evidence and keep private data protected | Immediate no-go |

## 32. Human approval gates

Each approval gate is separate and non-transferable:

- Launch / soft-launch approval.
- Customer-safe sketch delivery approval.
- Gallery approval.
- SQL execution approval.
- Provider/image generation approval.
- Email automation approval.
- CAD/quote/order/production approval.

Approval for one area does not approve any other area.

## 33. MVP completion statement

The current non-SQL MVP can be considered complete when the public brief intake, reference image capture, protected admin review, internal notes/status, admin notification baseline, human-review policy, customer-safe email SOP, no-preview/no-gallery boundary, offline CAD/quote/production handoff, privacy boundary, and launch-readiness checklist are in place and accepted by the owner.

This does not require:

- SQL artifact schema execution.
- Persisted Design Spec / Hand Sketch Instruction artifacts.
- Real image generation.
- Automatic customer email delivery.
- Customer web preview.
- Gallery workflow.
- CAD, quote, order, or production automation.

## 34. Final recommendation

Keep the current MVP non-SQL. Do not start Agent 55H by default.

Proceed to Agent 56C after Agent 56B. Keep implementation separately scoped. Keep customer delivery human-reviewed and email-only.

Keep gallery, quick preview, provider generation, artifact persistence, SQL execution, and CAD/quote/order/production automation out of the current MVP unless separately approved.
