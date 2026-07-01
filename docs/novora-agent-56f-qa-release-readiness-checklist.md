# NOVORA Agent 56F QA / Release Readiness Checklist

## 1. Purpose

Agent 56F defines a docs-only QA and release-readiness checklist for the
current non-SQL NOVORA MVP.

This checklist converts the Agent 56B scope lock, Agent 56C admin human-review
and customer-safe email SOP, and Agent 56D public copy boundary plan into an
evidence-ready planning artifact.

This document does not approve launch, execute QA, run tests, access protected
admin, access Production data, execute SQL, access Supabase, use Supabase CLI,
create migrations, access Vercel, deploy, send email, implement app/API/UI
changes, or start Agent 55H, Agent 56E, or Agent 56G.

Evidence may be gathered later only by a separately approved QA, smoke-test, or
release-readiness execution task.

## 2. Scope

This checklist covers release-readiness planning for:

- Public route inventory and public route QA.
- Homepage, design start, design concept, design brief, submitted page, and
  sketch/preview boundary checks.
- Reference image upload expectations.
- Public gallery and public copy expectation checks.
- Timeline wording as target expectations, not guarantees.
- Contact and customer identity handling.
- Admin access and admin brief review readiness.
- Human-review SOP and customer-safe email delivery readiness.
- AI/internal-draft safety.
- CAD / quote / order / production separation.
- Privacy, sensitive data, security, abuse-control, and manual fallback.
- Soft-launch go/no-go criteria and future Agent sequencing.

This checklist remains docs-only planning. It does not create or perform the QA
run.

## 3. Non-negotiable QA principles

- Agent 56F is checklist-only.
- Agent 56F does not approve launch.
- Agent 56F does not execute QA or tests.
- Agent 56F does not access protected admin or Production data.
- AI/internal drafts are internal-only.
- Unreviewed AI, GPT, image, or internal drafts are never customer-visible.
- Customer delivery is human-reviewed and email-only.
- Website quick AI preview is future product only, not current MVP.
- `approved_for_customer` is not `approved_for_gallery`.
- Generation success is not approval.
- CAD, quote, order, gemstone procurement, timeline, and production remain
  offline and separate.
- Agent 55G does not authorize SQL execution.
- Default remains Option A - do not execute SQL now.
- Agent 55H is not default.
- Agent 56E is optional only if the owner explicitly approves safe static
  public copy implementation.
- Agent 56G is the next safest docs-only planning layer if the owner wants a
  final public-flow smoke-test plan.

Use `pass`, `fail`, `blocked`, `not run`, or `deferred by owner` for later
evidence status. `Not run` is acceptable for this docs-only Agent because this
document is not a QA execution record.

## 4. Source-of-truth hierarchy

Use this hierarchy when interpreting QA readiness:

1. `docs/novora-current-project-state.md`.
2. Current `main` branch behavior and merged project docs.
3. Agent 56B final MVP scope lock and launch-readiness definition.
4. Agent 56C admin human-review SOP and customer-safe email SOP.
5. Agent 56D website/public copy polish and expectation-setting plan.
6. This Agent 56F QA / release readiness checklist.

If this checklist conflicts with the ledger or current `main`, the ledger and
current `main` win. If public copy, QA expectations, or future plans conflict
with Agent 56B, 56C, or 56D boundaries, the stricter customer-safety boundary
wins.

Evidence field template:

| Field | Value |
| --- | --- |
| Date |  |
| Environment | Local / Preview / Production / not run |
| Route or area |  |
| Browser/device |  |
| Tester |  |
| Result | pass / fail / blocked / not run / deferred |
| Evidence reference |  |
| Notes / follow-up |  |

## 5. Current MVP launch candidate definition

The current non-SQL MVP launch candidate is:

- Public Concept Brief intake.
- Final reference image upload for studio review.
- Protected admin list and detail review.
- Admin notes and review status.
- Admin notification baseline.
- Human-reviewed customer-safe concept direction.
- Email-only customer follow-up.
- Offline CAD, quotation, gemstone procurement, order, and production handoff.
- No customer web sketch preview.
- No automatic image generation.
- No SQL artifact schema execution required.

The launch candidate is for quiet, owner-controlled MVP operation only unless a
separate task approves broader traffic readiness.

## 6. Non-goals and blocked actions

Agent 56F does not approve or perform:

- QA execution.
- Tests, build checks, browser checks, or Production checks.
- Protected admin access.
- Production data access.
- SQL execution.
- Supabase access.
- Supabase CLI use.
- Migration creation.
- Vercel access or deploy.
- Email sending.
- App/API/UI/lib/test/package/config/lockfile changes.
- Schema, row, status, or approval mutation.
- Artifact persistence.
- Image generation or provider integration.
- Customer preview or website quick preview.
- Gallery approval.
- CAD, quote, order, payment, or production implementation.
- Agent 55H, Agent 56E, Agent 56G, or any implementation Agent.

## 7. Pre-QA repository readiness checklist

Use this before any separately approved future QA execution task.

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Branch and scope are confirmed | QA task names its branch, environment, and exact approval boundary |  |  |
| Worktree scope is clean or understood | Unrelated local files are not touched, staged, committed, or reported as QA evidence |  |  |
| Allowed routes and data are defined | Future QA states whether Local, Preview, or controlled Production is approved |  |  |
| Test data rules are defined | Synthetic or low-risk test data is used unless real data review is separately approved |  |  |
| Evidence redaction rules are accepted | No secrets, admin keys, protected URLs, signed URLs, or private customer data enter docs/screenshots/chat |  |  |
| No forbidden action is implied | SQL, Supabase, Vercel, email, deploy, protected admin, and Production checks stay blocked unless explicitly approved |  |  |

No-go if the QA task cannot define environment, data boundary, owner approval,
and evidence redaction before starting.

## 8. Public route inventory checklist

Routes to inventory in a later approved QA run:

| Route | Expected readiness question | Status | Evidence |
| --- | --- | --- | --- |
| `/` | Does the homepage route customers into concept brief intake without unsupported promises? |  |  |
| `/design/start` | Does the start page frame the flow as a concept request, not an order? |  |  |
| `/design/concept` | Does the concept page collect design direction without implying final generation? |  |  |
| `/design/brief` | Does the brief page collect contact, final references, and safe submission acknowledgement? |  |  |
| `/design/submitted` | Does the submitted page show receipt only after confirmed persistence? |  |  |
| `/design/sketch` | Does the sketch/preview route avoid customer delivery of live or unreviewed AI output? |  |  |
| Public gallery routes or sections | Do examples remain inspiration only and separate from customer consent? |  |  |
| Draft legal routes | Are draft Privacy/Terms pages visibly draft and not final legal approval? |  |  |

No-go if a public route implies payment, quote, CAD approval, order
confirmation, production approval, instant AI delivery, or customer-visible
unreviewed output.

## 9. Homepage QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Primary CTA starts approved intake | CTA routes into the Concept Brief flow, not payment, quote, CAD, or production |  |  |
| Homepage positioning is modest | Copy frames NOVORA as guided custom jewelry concept intake |  |  |
| AI wording is safe | Any AI language is internal/reviewed/future-safe, not instant customer output |  |  |
| Gallery or example language is safe | Examples are inspiration, not CAD, quote, order, production approval, or material proof |  |  |
| Mobile readability is acceptable | No text overlap, clipped controls, or incoherent stacking on common mobile width |  |  |

No-go if homepage copy promises instant AI sketch delivery, automatic preview,
CAD, quotation, order, payment, production approval, final manufacturability, or
guaranteed material/stone availability.

## 10. Design start QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Start page frames concept request | Starting the flow does not create an order or production approval |  |  |
| Selection labels are understandable | Recipient, style, and budget planning context are clear |  |  |
| Flow continues to concept intake | Customer can proceed to the guided concept step |  |  |
| Copy avoids instant output claims | No promise of instant AI, CAD, quote, payment, order, or production |  |  |
| Mobile layout is readable | Cards, buttons, and text do not overlap or clip |  |  |

No-go if `/design/start` suggests the online flow is a transactional storefront
or production workflow.

## 11. Design concept QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Piece type logic is understandable | Piece type and structure choices guide concept direction |  |  |
| Jewelry options remain realistic | Existing materials, stone logic, and chain constraints are not expanded by copy |  |  |
| Planning references are planning-only | Earlier selected images are not presented as final saved uploads |  |  |
| Reference notes explain concept direction | Customer understands references help review, not exact copying or final generation |  |  |
| Continue action preserves brief context | The selected direction can carry into `/design/brief` |  |  |
| Copy avoids finality | No final CAD, quote, order, production, or guaranteed availability language |  |  |

No-go if the concept page implies selected options automatically generate a
final sketch, CAD file, quote, order, production approval, or exact material/
stone sourcing promise.

## 12. Design brief QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Required fields are visible | Customer name and email are clearly required |  |  |
| Email validation is safe | Invalid email shows an inline error and does not submit as success |  |  |
| Brief summary is understandable | Customer can review concept direction before submission |  |  |
| Final upload guidance is clear | Final reference files are attached here for studio review |  |  |
| Submission acknowledgement is safe | Copy says review/follow-up, not order/payment/CAD/quote/production approval |  |  |
| Failure states are safe | Errors keep customer on the brief page without exposing internals |  |  |
| Rate-limit state is safe | Intentional `429` keeps customer on `/design/brief` with retry guidance |  |  |

No-go if `/design/brief` can send customers to success without confirmed
server persistence, valid `publicReference`, and valid Concept Brief UUID.

## 13. Reference image upload QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Concept-page references remain planning-only | Earlier selected images are not final uploaded files |  |  |
| Brief-page final upload is clear | Final references support studio review and follow-up only |  |  |
| File count is constrained | Current expected cap is up to 3 files per attempt |  |  |
| File size is constrained | Current expected cap is 5 MB per file |  |  |
| Browser MIME types are constrained | Current expected types are JPG, PNG, and WebP |  |  |
| Upload associates with persisted brief | Metadata links only after confirmed Concept Brief persistence |  |  |
| Protected reference opening stays admin-only | Admin reference access uses intended gate and signed URL behavior |  |  |
| Public paths are not exposed | Customer pages, docs, logs, and screenshots do not expose private storage paths or signed URLs |  |  |
| Missing-image state is safe | Missing or unavailable images do not expose internals |  |  |

No-go if upload copy implies gallery consent, marketing consent, exact copying,
automatic customer-visible generation, CAD approval, quote approval, or
production approval.

## 14. Submitted page QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Receipt gate is truthful | Receipt appears only after server persistence is confirmed |  |  |
| Public reference format is valid | Customer-visible reference matches `NOVORA-CB-YYYYMMDD-XXXX` |  |  |
| Concept Brief UUID is valid | UUID matches canonical UUID format |  |  |
| Local-only records do not impersonate receipt | Local recovery state may preserve draft context only |  |  |
| Next-step copy is safe | Customer expects team review and email follow-up |  |  |
| CAD/quote/order/production boundary is visible | Submitted page does not imply final commercial or production approval |  |  |
| Reference upload summary is safe | Attached references are for concept review only |  |  |

No-go if `/design/submitted` shows received/submitted confirmation for
`persisted: false`, missing public reference, invalid public reference, missing
Concept Brief UUID, or invalid Concept Brief UUID.

## 15. Sketch / preview route no-go checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Route does not deliver current live AI output | `/design/sketch` is not treated as current MVP customer delivery |  |  |
| No unreviewed draft is customer-visible | No AI, GPT, image, or internal draft appears as approved customer output |  |  |
| Future/illustrative wording is clear | Any preview/demo wording is boundary-safe |  |  |
| Customer delivery remains email-only | Route does not replace human-reviewed email delivery |  |  |
| Website quick AI preview remains future product | No current workflow promises immediate website preview |  |  |

Immediate no-go if customer-facing pages expose unreviewed AI/internal drafts or
imply generation success is approval.

## 16. Public gallery QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Gallery examples are inspiration only | Examples are not CAD, quotes, orders, production approval, or material proof |  |  |
| Customer consent is not implied | Customer submissions and references are not published without separate consent |  |  |
| `approved_for_customer` is separate | Customer delivery approval is not gallery approval |  |  |
| Private data is excluded | Customer contact, reference images, notes, and protected links are not public |  |  |
| Gallery workflow remains post-MVP | No automatic publication path exists in the current MVP |  |  |

No-go if gallery copy or workflow implies customer approval, publication
consent, production approval, or exact material/stone availability.

## 17. Public copy and expectation QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| AI wording is boundary-safe | AI/internal drafts are reviewed before customer delivery |  |  |
| Customer preview wording is absent or future-only | Current MVP does not promise instant website sketch preview |  |  |
| Email-only delivery wording is clear | Customer-safe concept direction is delivered by email after human review |  |  |
| CAD boundary is clear | Concept direction is not CAD |  |  |
| Quote boundary is clear | Concept direction is not a quote |  |  |
| Order boundary is clear | Concept Brief submission is not order confirmation |  |  |
| Production boundary is clear | Concept direction is not production approval |  |  |
| Gallery boundary is clear | Customer delivery approval is not gallery approval |  |  |
| Material and stone language is cautious | No guaranteed material, stone, certification, availability, price, or final gold weight promise |  |  |

No-go if public copy promises instant AI, automatic sketch delivery, customer
preview, CAD, quote, payment, order, production, manufacturability, material
availability, stone availability, gallery publication, or production-ready
files.

## 18. Timeline wording QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| First response wording is a target | Any 24-hour language is framed as a target after a sufficiently complete brief |  |  |
| Revisions are separate | Customer revision loops are not counted inside first-response target |  |  |
| Production timeline is separate | 15-30 day production target applies only after CAD, materials, stones, quotation, and order details are separately confirmed |  |  |
| Logistics timeline is qualified | 5-10 day logistics target is subject to destination, carrier, customs, and local delivery |  |  |
| No guaranteed delivery date exists | Copy avoids certainty around output, production, or logistics timing |  |  |

No-go if timeline copy guarantees instant AI output, final CAD, quote, order
confirmation, production approval, material availability, delivery date, or
commercial completion from brief intake.

## 19. Contact and customer identity QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Customer name is required | Intake cannot treat missing customer name as confirmed submission success |  |  |
| Customer email is required | Intake cannot treat missing or invalid email as confirmed submission success |  |  |
| Optional contact fields remain optional | Phone, WhatsApp, country, and contact notes are not over-required unless separately scoped |  |  |
| Contact data is protected | Evidence redacts names, emails, phone numbers, and contact notes unless owner approves specific use |  |  |
| Identity inference is avoided | QA notes do not infer sensitive attributes from customer name, location, language, images, or design request |  |  |

No-go if contact data appears in public screenshots, public docs, logs, or
customer-unsafe evidence.

## 20. Admin access readiness checklist

Protected admin verification requires separate approval. The owner should enter
the admin access key manually if a future QA task needs protected admin
read-only verification.

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Admin list is protected | `/admin/briefs` requires intended admin access gate |  |  |
| Admin detail is protected | `/admin/briefs/[publicReference]` requires intended admin access gate |  |  |
| Admin key handling is safe | Admin key is not requested, recorded, inferred, stored, echoed, or committed |  |  |
| Admin cookie/token evidence is excluded | Screenshots and logs do not expose cookies, tokens, or protected URLs |  |  |
| Admin access remains owner-controlled | Partner preview or public QA does not require partner admin access |  |  |

No-go if protected admin pages are accessible without the intended admin gate or
if an admin key appears in evidence, docs, logs, screenshots, or chat.

## 21. Admin brief review QA checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Admin list shows persisted Concept Briefs | Supabase-backed submissions are distinguishable from local/mock fallback where relevant |  |  |
| Admin detail matches selected reference | Detail public reference matches the selected brief |  |  |
| Contact summary is admin-only | Customer contact data is not exposed publicly |  |  |
| Internal notes persist in intended workflow | Notes remain internal and do not trigger customer delivery |  |  |
| Review status persists in intended workflow | Status remains internal and does not trigger customer delivery |  |  |
| Legal AI sketch review statuses are preserved | Allowed statuses are `internal_draft_not_generated`, `draft_generated_internal_only`, `needs_revision`, and `approved_for_customer` |  |  |
| `pending` remains illegal | Invalid status is rejected or absent |  |  |
| Safe artifact empty states remain admin-only | Read-only Design Spec / Hand Sketch Instruction placeholders do not imply live persistence or customer delivery |  |  |
| Notification status display is read-only | Display alone does not retry, resend, or mutate notification state |  |  |

No-go if admin notes, status, internal drafts, artifact placeholders, or
notification metadata become customer-visible.

## 22. Human-review SOP readiness checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Human reviewer is assigned | A human can approve, reject, or request revision before customer delivery |  |  |
| Reviewer understands design checks | Structure, style, motif, proportion, feasibility, and customer intent are reviewed |  |  |
| Generation success is not approval | Provider or internal draft creation does not equal approval |  |  |
| Approval is explicit | Approval identifies the customer-safe material being approved |  |  |
| Approval does not imply gallery | `approved_for_customer` remains separate from `approved_for_gallery` |  |  |
| Approval does not imply CAD/quote/order/production | Human review approves customer-safe concept material only |  |  |

No-go if customer delivery can happen without explicit human approval.

## 23. Customer-safe email delivery readiness checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Email delivery remains human-controlled | A human owns final customer email content and send timing |  |  |
| Delivery is email-only | Current MVP does not use customer web preview for sketch delivery |  |  |
| Attachments are reviewed | Any attachment is intentionally selected and customer-safe |  |  |
| Raw internal material is excluded | Raw prompt, Design Spec, Hand Sketch Instruction, provider metadata, reviewer notes, admin notes, rejected drafts, and private links are not sent |  |  |
| Concept boundary appears in email | Customer-safe email states concept direction is not CAD, quote, order, or production approval |  |  |
| Customer clarification path exists | Incomplete briefs can receive safe clarification questions |  |  |

No-go if raw internal material can be sent to customers or if an unreviewed
draft can be emailed.

## 24. AI/internal-draft safety checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| AI/internal drafts remain internal-only | Drafts are not customer-visible before human approval |  |  |
| Raw brief is not final prompt | Customer brief is transformed or reviewed before any future prompt/instruction use |  |  |
| Private data is excluded from internal artifacts | Contact fields and private admin data are not carried into generation-facing artifacts |  |  |
| Risk flags remain meaningful | CAD, quote, order, production, gallery, private data, exact-copy, and generation-success risks stay visible for review |  |  |
| No provider generation is required | Current MVP launch does not depend on real image provider calls |  |  |
| No artifact persistence is required | Current MVP launch does not require SQL artifact schema execution |  |  |

No-go if an unreviewed AI/GPT/image/internal draft becomes customer-visible or
if generation success is treated as approval.

## 25. CAD / quote / order / production separation checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| CAD remains offline | Concept direction is not CAD or production-ready file output |  |  |
| Quote remains offline | No automatic price, fixed quote, final gold weight, labor cost, or gemstone cost is promised |  |  |
| Order remains offline | Concept Brief submission is not order confirmation |  |  |
| Payment remains absent | Current MVP does not collect payment or imply checkout |  |  |
| Gemstone procurement remains offline | Stone availability, certification, grading, size, color, and price are separately confirmed |  |  |
| Production remains offline | No production approval or fulfillment workflow starts from brief intake |  |  |
| Timeline remains qualified | Production and logistics targets require separate confirmation |  |  |

No-go if any public or admin flow treats Concept Brief intake as a final
commercial, sourcing, CAD, order, payment, or production decision.

## 26. Privacy and sensitive-data checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Customer contact data is protected | Names, emails, phone numbers, notes, and preferences are redacted in evidence |  |  |
| Reference image privacy is protected | Reference images, paths, and signed URLs are not published or shared outside approved private review |  |  |
| Admin notes remain internal | Reviewer/admin comments are not copied into customer emails or public docs |  |  |
| Draft legal pages remain draft | Draft Privacy and Terms pages are not treated as final legal approval |  |  |
| Privacy contact remains owner-controlled | `privacy@novora.design` is a public contact path, not account/login/mailbox automation |  |  |
| No real customer-data mutation occurs | Live mutation needs separate explicit approval |  |  |
| Evidence is minimized | Screenshots and notes include only what is needed for readiness decisions |  |  |

No-go if real customer data, private images, internal notes, or signed URLs are
exposed outside protected/approved context.

## 27. Security and abuse-control checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Secrets are not exposed | No service-role key, database URL, admin key, provider token, API key, cookie, or env value appears in docs, logs, screenshots, or chat |  |  |
| Admin key handling is safe | Admin key is not requested, recorded, inferred, stored, echoed, or committed |  |  |
| Production rate-limit posture is understood | Production enforcement remains fail-open for quiet MVP only unless separately approved |  |  |
| Broader traffic blockers are understood | Production-dedicated rate limit, bot protection, upload hardening, monitoring, and operations are separate future work |  |  |
| Upload abuse risk remains documented | Current upload caps are MVP controls, not full public-traffic hardening |  |  |
| Notification abuse risk remains documented | Admin notification baseline is not retry/resend tooling or hardened public-traffic architecture |  |  |

Immediate no-go if any secret or admin key appears in evidence, docs, logs,
screenshots, or chat.

## 28. Operational manual fallback checklist

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Owner accepts manual workload | Owner can manually review each new Concept Brief |  |  |
| Queue-check cadence is defined | Owner/admin checks protected admin queue even if email notification appears healthy |  |  |
| Admin notification fallback exists | Owner knows how to find persisted briefs if admin email fails |  |  |
| Customer-safe email owner is assigned | A human owns final customer email content and send timing |  |  |
| No-go escalation path is known | Owner knows when to stop delivery and escalate |  |  |
| Offline CAD handoff is accepted | CAD, materials, stones, quote, order, timeline, and production remain separate offline steps |  |  |
| Synthetic test data handling is decided | Owner knows how to label, review, retain, or later clean test records under separate approval |  |  |

No-go if owner cannot monitor new submissions, handle notification failure
manually, or assign customer-safe review and delivery ownership.

## 29. Soft-launch go criteria

Quiet owner-controlled MVP can move toward owner acceptance only if:

- Public Concept Brief intake works.
- Receipt confirmation is truthful and server-persistence gated.
- Protected admin review works for the owner.
- Reference image handling is safe enough for controlled use.
- Admin notification baseline has a manual queue-check fallback.
- Human review and customer-safe email SOP are accepted.
- No customer web preview or unreviewed AI output is active.
- Copy does not imply CAD, quote, order, payment, or production approval.
- Owner accepts manual operations and current deferrals.
- Evidence handling avoids secrets and private customer/admin data.

This is not public launch approval.

## 30. Soft-launch no-go criteria

Quiet owner-controlled MVP is no-go if:

- Submission receipt can be false.
- Admin cannot access persisted briefs.
- Protected admin pages are exposed.
- Reference assets are exposed.
- Customer-visible unreviewed AI/internal output exists.
- Secrets, admin keys, or private customer data leak.
- Owner cannot manually monitor and respond to submissions.
- Owner cannot handle admin email failure manually.
- Nobody owns human review or customer-safe email delivery.
- Public copy overpromises unsupported current-MVP behavior.

Broader public, social, or paid traffic remains no-go until separately approved
work addresses abuse control, bot protection, upload hardening, reviewed legal
and privacy publication, operational monitoring, retention/deletion/export
expectations, and support ownership.

## 31. Recommended next Agent sequence

Recommended next steps:

1. Agent 56G - docs-only final public-flow smoke-test plan, if the owner wants
   another non-mutating QA planning layer before any live evidence gathering.
2. Optional separately approved QA execution - gather evidence against this
   checklist in Local, Preview, or controlled Production scope.
3. Optional Agent 56E - safe static public copy implementation, only if the
   owner explicitly approves website copy implementation.
4. Agent 55H - only if the owner explicitly chooses the Agent 55G SQL execution
   preparation path.

Do not proceed from this checklist to SQL, Supabase live access, Supabase CLI,
migrations, provider generation, customer preview, gallery workflow, email
automation, CAD, quote, order, payment, production, broader traffic, Production
operations, Agent 55H, Agent 56E, Agent 56G, or implementation without a
separate reviewed task and explicit approval.

## 32. Final recommendation

Use this checklist as the release-readiness control surface for the current
non-SQL MVP.

Keep the MVP modest: public Concept Brief intake, protected admin review,
human-reviewed customer-safe email follow-up, and offline CAD/quote/order/
production handoff. Keep AI/internal drafts internal-only until human approval.
Keep customer delivery email-only. Keep website quick AI preview future-only.
Keep gallery approval separate. Keep SQL and artifact persistence out of the
current default path.

This checklist is necessary for readiness discipline, but it is not launch
approval and it is not QA execution.
