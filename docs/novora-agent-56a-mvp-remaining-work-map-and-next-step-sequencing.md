# NOVORA Agent 56A MVP Remaining Work Map And Next-Step Sequencing

## 1. Purpose

Agent 56A creates a docs-only map of remaining NOVORA MVP work and safe next-step sequencing after Agent 55G.

This document does not implement app, API, UI, helper, fixture, test, package, config, migration, SQL, Supabase, provider, image generation, email sending, customer-facing sketch display, gallery approval, CAD, quote, order, or production behavior. It does not persist artifacts or authorize SQL execution.

## 2. Current phase summary

NOVORA is now past the basic intake/public flow foundation, protected admin review foundation, AI sketch governance planning, Design Spec / Hand Sketch Instruction schema and template planning, pure helper foundation and tests, admin read-only artifact display with safe empty states, artifact source-of-truth planning, and SQL schema/safety decision chain.

NOVORA has not crossed into live artifact schema execution, artifact persistence, admin artifact write/read paths backed by persisted artifact tables, automated image generation, customer email delivery implementation for approved sketches, customer-facing sketch preview, gallery approval, or CAD/quote/order/production automation.

## 3. Non-negotiable MVP boundaries

- AI sketches are internal drafts only before human approval.
- Customers only see a human-approved version.
- Current MVP delivery remains email-only after human review.
- No unreviewed AI, GPT, or image draft is customer-visible.
- Design Spec and Hand Sketch Instruction are internal planning artifacts.
- Raw internal prompts, raw Design Specs, and raw Hand Sketch Instructions must not be emailed to customers.
- `approved_for_customer` is not `approved_for_gallery`.
- Generation success is not approval.
- Website quick preview is future product only, not current MVP.
- CAD, quotation, gem procurement, and production remain offline and separate.

## 4. Completed foundation

- Public design intake, Concept Brief submission, and contact fields are in place.
- Supabase-backed Concept Brief persistence and reference image storage foundation exist.
- Protected admin brief list/detail foundation exists.
- Admin notes and review state persistence foundation exists.
- Admin notification email foundation exists.
- AI sketch status constants and product copy boundaries have been aligned.
- Curated gallery disclaimers and mock preview boundaries are documented.
- Duplicate protection for AI sketch review records and create/update admin review write path have been implemented.
- Pure transformation helper foundation, safe fake fixtures, executable helper tests, and admin read-only empty-state artifact display exist.

## 5. Completed AI sketch governance chain

- AI sketch output is defined as internal draft material until human review.
- Human review and approval are required before customer delivery.
- Current customer delivery model remains email-only, with no direct public sketch page delivery.
- Prompt/spec templates and cost/provider ledger planning exist.
- Image provider integration remains future, separately scoped, and internal-only.

## 6. Completed admin / review foundation

- Protected admin list/detail pages exist.
- Review status and internal notes persistence exists.
- Legal AI sketch review statuses are fixed, and `pending` is not legal.
- AI sketch review write behavior has a create/update split.
- Admin-only boundaries are preserved.
- Agent 55B read-only display shows safe empty states and does not persist artifacts.

## 7. Completed artifact planning chain

- Agent 50A completed Design Spec JSON Schema v1.
- Agent 50B completed Hand Sketch Instruction Template v1.
- Agent 50C planned Concept Brief to Design Spec transformation.
- Agent 55C planned artifact source-of-truth and persistence boundaries.
- Agent 55D planned artifact schema / SQL packet.
- Agent 55E planned SQL execution safety and migration staging.
- Agent 55F planned final SQL packet review and manual verification checklist.
- Agent 55G planned the user-run SQL execution decision packet.

## 8. Current SQL decision state

Agent 55G is complete, but it does not approve SQL execution. The default decision remains Option A - do not execute SQL now.

SQL execution requires separate explicit human approval. User-run execution remains the default unless a future execution-support scope is separately approved. Agent 55H should not start unless the human explicitly chooses an execution-preparation path. App write/read paths cannot start until schema execution and verification are complete.

## 9. Remaining work overview

- Can continue now without SQL: docs-only MVP scope lock, admin SOP, customer-safe email SOP, website copy planning, QA/release readiness planning, and separately approved static public-flow copy polish.
- Requires product/human review decision: customer email policy, privacy/consent framing, launch readiness definition, gallery consent, and manual handoff language.
- Requires explicit SQL execution approval: SQL execution preparation and any actual artifact schema execution path.
- Requires SQL executed and verified: artifact persistence, persisted admin write/read paths, versioned source-of-truth, and persisted artifact display.
- Future product / post-MVP: provider image generation, customer web sketch preview, quick AI preview, gallery workflow, Designer Portal, CAD automation, quote automation, order automation, and production automation.

## 10. Workstream A - non-SQL docs and product sequencing

This can continue now as docs-only work.

Possible next tasks include final MVP scope lock, launch readiness checklist, admin operating procedure, human review SOP, customer-safe copy/email policy, privacy and consent policy, plugin/website optimization prioritization, and QA/release checklist planning. No implementation is required for this stream.

## 11. Workstream B - admin concierge workflow refinement

This can continue now as docs/planning, while implementation must be separately scoped.

Planning may define reviewer workflow, internal draft lifecycle, revision prompt workflow, approval handoff, customer-safe summary preparation, and handoff checks. It must preserve that unreviewed drafts are not customer-visible and that artifact persistence does not start until the schema path is approved and complete.

## 12. Workstream C - customer-safe email delivery planning

This can continue now as docs/planning.

Planning should define what the customer may receive, what the customer must not receive, the human approval gate before send, customer-safe sketch summary rules, attachment/manual send boundaries, and future Resend implementation boundaries. There is no automatic delivery, no email implementation, no email sending, and no raw prompt/spec/instruction sent.

## 13. Workstream D - website/public flow polish

This can continue now if separately approved.

Safe work includes copy polish, CTA clarity, expectation setting, timeline/cost disclaimers, AI sketch explanation, and offline CAD/quote/production explanation. It must not add customer sketch preview, quick AI preview, gallery submission automation, generation, or delivery behavior.

## 14. Workstream E - artifact persistence path, blocked

This is blocked until SQL execution is explicitly approved, executed, and verified.

Blocked work includes persisted Design Spec / Hand Sketch Instruction source-of-truth, database table read/write, artifact versioning, artifact approval state, source-of-truth selection, idempotency, and private-data exclusion. It cannot start while the Agent 55G default remains Option A.

## 15. Workstream F - SQL execution path, separately gated

This path is separately gated.

It can start only if the human explicitly chooses Option C or Option D from Agent 55G. Agent 55H can only be docs-only execution preparation unless actual execution is explicitly approved. Manual user-run Supabase UI remains the default. Codex/ChatGPT must not run SQL under the default path.

Any execution approval wording must identify the frozen packet, target project, target environment, and confirm that execution does not approve customer delivery, image generation, gallery use, CAD, quotation, order confirmation, gemstone procurement, or production.

## 16. Workstream G - post-SQL write/read path, blocked

This is blocked until SQL has been executed and verified.

Blocked work includes admin artifact create/save draft behavior, admin artifact read path from persisted tables, rendering persisted Design Spec / Hand Sketch Instruction in the Agent 55B display area, versioned source-of-truth, idempotent write path, and RLS/admin-only access verification. It must not add customer display or email send automation.

## 17. Workstream H - AI/image provider generation, internal-only future path

This is future, separately gated work.

Image provider generation must remain internal draft-only. Prompts should be generated from fixed Design Spec plus Hand Sketch Instruction, not directly from a raw brief. A cost/provider ledger and human review process are required before real calls. Future implementation must be separately scoped. Agent 56A makes no provider calls.

## 18. Workstream I - gallery and customer-facing display, blocked/future

This is blocked/future work.

`approved_for_customer` is not `approved_for_gallery`. Gallery use requires separate consent, curation, and privacy review. Customer-facing sketch display and website quick preview are not current MVP behavior. No unreviewed draft may be displayed and no sketch may be automatically published.

## 19. Workstream J - CAD / quote / production offline handoff

CAD, quotation, gemstone procurement, and production remain offline processes.

AI sketch approval, Design Spec approval, or artifact persistence does not authorize CAD, quote, order, gemstone sourcing, production approval, or production start. Customer communication must keep concept sketch, CAD, quotation, order, and production boundaries distinct.

## 20. Workstream K - QA, regression, and release readiness

This can continue now for non-SQL scope.

Future QA/release work may review existing e2e coverage, verify public intake stability, verify protected admin pages, verify no customer sketch preview exists, verify gallery disclaimers, verify admin email notification baseline, and define launch-readiness checks. Tests belong in a future separately scoped implementation or release Agent.

## 21. What can continue now

- Docs-only final MVP scope lock.
- Docs-only admin operating SOP.
- Docs-only human review and customer-safe email SOP.
- Docs-only plugin/website optimization priority plan.
- Public copy polish plan.
- Static public-flow copy implementation if separately approved and no preview/generation/gallery behavior is added.
- QA/release checklist planning.
- Possible homepage/public-flow copy implementation as a separate Agent.

## 22. What must not start now

- Agent 55H unless the user explicitly chooses SQL execution preparation.
- SQL execution, Supabase live access, Supabase CLI, migrations, or schema changes.
- Artifact persistence, artifact write path, or artifact read path from DB.
- Provider image generation.
- Customer-facing sketch preview or website quick AI preview.
- Gallery approval/publication.
- Automatic email delivery.
- CAD/quote/order/production automation.

## 23. Dependency map

- Public copy polish: can start now if separately scoped.
- Admin SOP: can start now.
- Customer-safe email policy: can start now.
- SQL execution prep: requires explicit user choice from Agent 55G.
- SQL execution: requires separate explicit approval.
- Artifact write path: requires SQL executed and verified.
- Artifact read path: requires write/read schema verification.
- Image generation: requires fixed spec/instruction, cost/provider ledger, and internal review scope.
- Customer delivery: requires human approval and separate email delivery scope.
- Gallery: requires separate gallery approval and consent framework.
- CAD/quote/production: offline process.

## 24. Recommended next Agent sequence

Use this sequence unless the user explicitly chooses SQL:

1. Agent 56B - Docs-only final MVP scope lock and launch-readiness definition.
2. Agent 56C - Docs-only admin human-review SOP and customer-safe email SOP.
3. Agent 56D - Docs-only website/public copy polish and expectation-setting plan.
4. Agent 56E - Optional implementation of safe static public copy polish only, if approved.
5. Agent 56F - QA/release readiness checklist for current non-SQL MVP.
6. Agent 55H - Only if the user explicitly chooses Agent 55G Option C or D for SQL execution preparation.

Agent 55H is not the default next step. Agent 56B is the recommended immediate next step. Any implementation Agent must be separately scoped.

## 25. Stop conditions

Stop if any next task tries to execute SQL, access Supabase, use Supabase CLI, create migrations, implement artifact persistence, implement DB-backed artifact write/read behavior, expose unreviewed sketches to customers, generate images, send email automatically, use a raw brief directly for image generation, treat generation success as approval, treat `approved_for_customer` as gallery approval, imply CAD/quote/order/production approval, mutate production data, enable plugin/MCP/third-party service, or start live execution support without explicit approval.

## 26. Decision table

| Area | Status | Can proceed now? | Blocking dependency | Recommended next Agent | Forbidden shortcut |
| --- | --- | --- | --- | --- | --- |
| Final MVP scope lock | Non-SQL docs | Yes | None | Agent 56B | Treating scope lock as implementation approval |
| Admin SOP | Non-SQL docs | Yes | Human workflow review | Agent 56C | Mutating admin UI/status |
| Customer-safe email SOP | Non-SQL docs | Yes | Human delivery policy | Agent 56C | Sending email or raw prompt/spec |
| Public copy polish | Planning or static implementation | Yes, if separately scoped | Copy approval for implementation | Agent 56D/56E | Adding preview/generation/gallery behavior |
| QA/release checklist | Non-SQL docs | Yes | Current MVP scope lock | Agent 56F | Running Production-changing checks |
| SQL execution preparation | SQL-gated docs | No by default | Explicit Agent 55G Option C/D choice | Agent 55H | Treating 55G merge as approval |
| SQL execution | Separately gated | No | Separate explicit execution approval | Future approved SQL scope | Codex/ChatGPT running SQL by default |
| Artifact persistence | Blocked | No | SQL executed and verified | Future post-SQL Agent | Creating tables or migrations early |
| Artifact write/read path | Blocked | No | Verified persisted schema | Future post-SQL Agent | Fake fixture as production source |
| Image provider generation | Future | No | Fixed artifacts, ledger, internal review scope | Future generation Agent | Raw brief direct-to-image call |
| Customer sketch delivery | Human-review email-only | Planning only | Human approval and delivery scope | Future email Agent | Automatic delivery |
| Gallery | Blocked/future | No | Consent, curation, privacy review | Future gallery Agent | Reusing `approved_for_customer` |
| CAD/quote/production | Offline | No automation | Offline designer/owner process | None for current MVP | Treating sketch/artifact as production approval |

## 27. MVP completion definition

Current realistic MVP completion means public brief intake works, reference image upload and admin access work, protected admin review works, internal status/notes work, admin notification works, AI sketch governance is documented, human-review-only delivery policy is documented, no unreviewed customer preview exists, customer-safe email delivery SOP is clear, offline CAD/quote/production boundaries are clear, and launch readiness checklist is satisfied.

Persisted Design Spec / Hand Sketch Instruction artifacts and real image generation are not required for the current non-SQL MVP unless the human decides to expand scope.

## 28. Risks and mitigations

- Risk: Docs decision is mistaken for SQL approval. Mitigation: repeat that Agent 55G default remains Option A and require separate explicit approval.
- Risk: Implementation starts before schema decision. Mitigation: keep artifact persistence and DB write/read paths blocked until SQL is executed and verified.
- Risk: Customer sees unreviewed AI output. Mitigation: preserve human review and email-only delivery gates.
- Risk: Raw prompt/spec leakage. Mitigation: define customer-safe summaries and prohibit raw prompt/spec/instruction emails.
- Risk: Gallery consent confusion. Mitigation: keep `approved_for_customer` separate from `approved_for_gallery`.
- Risk: CAD/quote/order/production expectation confusion. Mitigation: state concept sketch is not CAD, quote, order, or production approval.
- Risk: Scope creep into provider generation. Mitigation: require a separate future internal-only generation scope with provider/cost ledger.
- Risk: Premature email automation. Mitigation: keep current delivery planning manual/human-controlled until a separate email implementation scope.

## 29. Recommended immediate next step

Recommended immediate next step:

**Agent 56B - Docs-only final MVP scope lock and launch-readiness definition**

This is the safest non-SQL next step because it defines the end of the current MVP phase, avoids crossing the Agent 55G SQL gate, and prepares launch-readiness and scope control before any implementation.

## 30. Final recommendation

Do not start the SQL path by default. Do not start Agent 55H unless the user explicitly chooses the Agent 55G SQL-preparation path.

Proceed with Agent 56B as the next safe non-SQL planning step. Keep implementation separate and explicitly scoped. Preserve all human-review, email-only, no-gallery, no-customer-preview, and no-CAD/quote/order/production boundaries.
