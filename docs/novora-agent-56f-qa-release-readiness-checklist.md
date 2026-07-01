# NOVORA Agent 56F QA / Release Readiness Checklist

## 1. Purpose

Agent 56F defines a docs-only QA and release-readiness checklist for the
current non-SQL NOVORA MVP.

This checklist converts the Agent 56B scope lock, Agent 56C human-review and
customer-safe email SOP, and Agent 56D public copy boundary plan into an
evidence-ready release checklist.

This document does not approve launch, public promotion, broader traffic,
commercial readiness, Production verification, protected admin access, customer
data review, SQL execution, Supabase changes, Vercel changes, provider
configuration, email sending, deploys, app code changes, or test execution.

Evidence may be gathered later by a separately approved QA, smoke-test, or
release-readiness execution task.

## 2. Current MVP release frame

The current MVP release frame is:

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

The current MVP is not:

- An instant AI sketch generator.
- A customer portal.
- A CAD generator.
- A quote engine.
- A payment or order system.
- A production approval workflow.
- A gallery consent or publication workflow.
- A live Design Spec / Hand Sketch Instruction persistence workflow.

## 3. QA execution boundary

Agent 56F is a checklist only.

Allowed future evidence-gathering tasks may include, if separately approved:

- Local or Preview browser checks.
- Focused Playwright checks.
- Read-only public page inspection.
- Controlled synthetic submission testing.
- Controlled protected admin read-only verification with the owner entering the
  admin access key manually.

Not approved by this checklist:

- Production smoke submissions.
- Protected admin access by Codex without explicit approval.
- Asking for, recording, echoing, or storing an admin key.
- Inspecting, exporting, deleting, or modifying real customer data.
- Sending customer or admin emails.
- Triggering notification retries or resends.
- Running SQL, Supabase CLI, migrations, schema changes, RLS/grant/policy
  changes, or storage changes.
- Changing Vercel, Resend, Cloudflare, Upstash, or provider configuration.
- Deploying, merging, force pushing, or approving launch.

## 4. Evidence capture rules

Use the following evidence discipline for any later QA run:

- Record date, environment, route, browser/device, and tester.
- Use synthetic or low-risk test data only unless the owner separately approves
  a real customer-data review.
- Redact customer names, emails, phone numbers, internal notes, private
  reference images, protected admin URLs, signed URLs, and provider metadata.
- Do not capture or publish admin keys, service-role keys, database URLs,
  provider keys, environment values, cookies, bearer tokens, or secret notes.
- Do not paste raw Supabase rows or full customer records into public docs.
- Keep screenshots private unless they contain no customer/admin data or
  protected context.
- Mark each checklist item as `pass`, `fail`, `blocked`, `not run`, or
  `deferred by owner`.

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

## 5. Public flow QA

Public routes to check in a later approved QA run:

- `/`
- `/design/start`
- `/design/concept`
- `/design/brief`
- `/design/submitted`
- `/design/sketch`, only to confirm it does not act as current customer sketch
  delivery.

Checklist:

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Homepage entry point routes to the approved design flow | Primary CTA starts Concept Brief intake, not payment, quote, CAD, or production |  |  |
| Homepage copy frames NOVORA as guided custom jewelry concept intake | Copy does not promise instant AI output, final design, CAD, quote, order, or production |  |  |
| `/design/start` explains concept-request intent | Starting the flow does not imply order confirmation or production approval |  |  |
| `/design/concept` collects design direction | Piece type, style, material, stone, motif, and reference planning inputs are understandable |  |  |
| `/design/concept` planning references remain planning-only | Earlier selected images are not presented as final saved uploads |  |  |
| `/design/brief` shows contact, brief, and final upload guidance | Customer understands this is studio review and follow-up, not automatic CAD or quote |  |  |
| `/design/brief` required fields are visible and understandable | Required customer name and email are clear |  |  |
| `/design/submitted` is reachable only after confirmed submission in a real test | Receipt copy depends on persisted server response, valid public reference, and valid Concept Brief UUID |  |  |
| `/design/sketch` does not deliver live customer AI output | Any visible content is demo/future/boundary-safe and does not expose unreviewed drafts |  |  |
| Mobile layout remains readable | No text overlap, clipped buttons, or incoherent stacking on common mobile width |  |  |

No-go conditions:

- Public copy promises instant AI sketch delivery.
- Public flow implies CAD, quote, order, payment, production, or final
  manufacturability approval.
- A customer can see unreviewed AI, GPT, image, or internal draft output as
  current MVP delivery.
- `/design/submitted` can show a received confirmation without confirmed server
  persistence, valid `publicReference`, and valid Concept Brief UUID.

## 6. Submission integrity QA

Submission integrity is release-critical because a customer must not be told
NOVORA received a brief unless the server confirms persistence.

Checklist:

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Successful submission requires server confirmation | API result has `persisted: true`, valid `publicReference`, and valid Concept Brief UUID before success navigation |  |  |
| `publicReference` format remains stable | Customer-visible reference matches `NOVORA-CB-YYYYMMDD-XXXX` |  |  |
| Concept Brief UUID is valid | UUID matches canonical UUID format |  |  |
| Unconfirmed server response does not show receipt | Customer stays on `/design/brief` or sees safe failure state |  |  |
| Legacy or local-only fallback does not impersonate receipt | Local recovery state may preserve draft context only |  |  |
| Rate-limited response stays safe | Intentional `429` keeps customer on `/design/brief` with retry guidance |  |  |
| Admin notification failure remains non-blocking but visible operationally | Customer success does not depend on email send, and owner has manual queue-check fallback |  |  |

No-go conditions:

- `persisted: false` or missing API confirmation can show customer receipt.
- Invalid or missing public reference is shown as received.
- Invalid or missing Concept Brief UUID is treated as a confirmed receipt.
- Rate-limit or server failure navigates to false success.

## 7. Reference image QA

Final reference upload is part of the current MVP. Planning references selected
on `/design/concept` are not final saved uploads.

Checklist:

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| `/design/concept` reference copy is planning-only | Copy tells customers to attach final references again on `/design/brief` |  |  |
| `/design/brief` final upload copy is clear | Customers understand final reference images support studio review only |  |  |
| Accepted final upload count is constrained | Current expected cap is up to 3 files per attempt |  |  |
| Accepted final upload size is constrained | Current expected cap is 5 MB per file |  |  |
| Accepted browser MIME types are constrained | Current expected types are JPG, PNG, and WebP |  |  |
| Uploaded reference metadata is associated with a persisted Concept Brief | Metadata links to the confirmed brief and public reference |  |  |
| Protected admin reference opening works only after admin access | Reference open route requires intended admin gate and short-lived signed URL behavior |  |  |
| Public storage paths are not exposed | Customer pages, docs, logs, and screenshots do not expose private storage paths or signed URLs |  |  |
| Missing reference images are safe | Admin UI communicates missing or unavailable images without exposing private internals |  |  |

No-go conditions:

- Public pages expose private storage paths or signed admin URLs.
- Reference assets can be opened without the intended admin gate.
- Upload copy implies gallery consent, marketing consent, exact copying,
  CAD approval, quote approval, or production approval.
- Reference images are treated as automatic input to customer-visible AI
  generation in the current MVP.

## 8. Protected admin QA

Protected admin verification must be separately approved before any live access.
The owner should enter the admin access key manually if a future QA task needs
protected admin read-only verification.

Checklist:

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Admin list is protected | `/admin/briefs` requires intended admin access gate |  |  |
| Admin detail is protected | `/admin/briefs/[publicReference]` requires intended admin access gate |  |  |
| Admin list shows persisted Concept Briefs | Supabase-backed submissions are distinguishable from local/mock fallback where relevant |  |  |
| Admin detail shows the selected public reference | Detail reference matches the selected brief |  |  |
| Contact summary is readable to authorized admin only | Customer contact data is not exposed publicly |  |  |
| Internal notes persist in the intended admin workflow | Notes remain internal and do not trigger customer delivery |  |  |
| Review status persists in the intended admin workflow | Status remains internal and does not trigger customer delivery |  |  |
| Legal AI sketch review statuses are preserved | Allowed statuses are `internal_draft_not_generated`, `draft_generated_internal_only`, `needs_revision`, and `approved_for_customer` |  |  |
| `pending` remains illegal for AI sketch review status | Invalid status is rejected or absent |  |  |
| Safe artifact empty states remain admin-only | Read-only Design Spec / Hand Sketch Instruction placeholders do not imply live persistence or customer delivery |  |  |
| Notification status visibility is read-only | Admin notification status does not retry, resend, or mutate notification state by display alone |  |  |

No-go conditions:

- Protected admin pages are accessible without the intended admin gate.
- Admin notes, status, internal drafts, artifact placeholders, or notification
  metadata are customer-visible.
- `approved_for_customer` triggers gallery approval, customer web preview,
  automatic email delivery, CAD handoff, quote, order, or production action.
- Generation success is treated as human approval.

## 9. Copy and expectation QA

Public and admin copy must preserve the current MVP product boundary.

Checklist:

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
| Reference image consent boundary is clear | Uploading references does not grant publication, gallery, marketing, or training consent |  |  |
| Material and stone language is cautious | No guaranteed material, stone, certification, availability, price, or final gold weight promise |  |  |
| Timeline language is non-guaranteed | First concept response target, production target, and logistics target remain qualified and separately confirmed |  |  |

No-go conditions:

- Copy promises instant AI, automatic sketch delivery, customer preview, CAD,
  quote, payment, order, production, manufacturability, material availability,
  stone availability, gallery publication, or production-ready files.
- Copy suggests a raw customer brief directly becomes a final prompt, final
  sketch, CAD file, quote, or order.

## 10. Manual operations QA

Manual operation is intentional for the current MVP.

Checklist:

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Owner accepts manual workload | Owner can manually review each new Concept Brief |  |  |
| Queue-check cadence is defined | Owner/admin has a schedule to check protected admin queue even if email notification appears healthy |  |  |
| Admin notification fallback exists | Owner knows how to find persisted briefs if admin email fails |  |  |
| Customer-safe email owner is assigned | A human owns final customer email content and send timing |  |  |
| Human reviewer is assigned | A human approves, rejects, or requests revision before customer delivery |  |  |
| Customer-safe email SOP is accepted | Raw prompts, specs, instructions, internal notes, rejected drafts, and private links are not sent |  |  |
| No-go escalation path is known | Owner knows when to stop delivery and escalate |  |  |
| Offline CAD handoff is accepted | CAD, materials, stones, quote, order, timeline, and production remain separate offline steps |  |  |
| Gallery consent remains separate | Gallery use requires separate customer consent, privacy review, curation, and publication approval |  |  |
| Synthetic test data handling is decided | Owner knows how to label, review, retain, or later clean test records under separate approval |  |  |

No-go conditions:

- Owner cannot monitor new submissions.
- Owner cannot handle admin email failure manually.
- Nobody owns customer-safe email review.
- Customer delivery can happen without explicit human approval.
- Offline CAD, quote, order, and production handoff is not understood.

## 11. Security and privacy QA

Checklist:

| Item | Expected result | Status | Evidence |
| --- | --- | --- | --- |
| Secrets are not exposed | No service-role key, database URL, admin key, provider token, API key, cookie, or env value appears in docs, logs, screenshots, or chat |  |  |
| Admin key handling is safe | Admin key is not requested, recorded, inferred, stored, echoed, or committed |  |  |
| Customer contact data is protected | Names, emails, phone numbers, notes, and contact preferences are redacted in evidence |  |  |
| Reference image privacy is protected | Reference images, paths, and signed URLs are not published or shared outside approved private review |  |  |
| Internal notes remain internal | Admin notes and reviewer comments are not copied into customer emails or public docs |  |  |
| Draft legal pages remain draft | Draft Privacy and Terms pages are not treated as final legal approval |  |  |
| Privacy contact remains owner-controlled | `privacy@novora.design` receive-only MVP forwarding remains a contact path, not account/login/mailbox automation |  |  |
| No real customer-data mutation occurs during docs QA | Any live mutation needs separate explicit approval |  |  |

No-go conditions:

- Any secret or admin key appears in evidence, docs, logs, screenshots, or chat.
- Real customer data is exposed outside protected admin context.
- Private reference images or signed URLs are shared publicly.
- Draft legal pages are represented as final legal compliance.

## 12. Release decision matrix

| Release stage | Minimum readiness | Allowed | Blocked |
| --- | --- | --- | --- |
| Docs-only readiness | This checklist exists and owner understands boundaries | Planning, owner review, later QA task scoping | Treating this as launch approval |
| Quiet owner-controlled MVP | Public intake, protected admin review, manual queue check, customer-safe email SOP, no-preview boundary, privacy discipline | Low-volume owner-controlled testing with manual oversight | Paid traffic, broad social launch, commercial-scale submissions |
| Trusted partner preview | Quiet MVP readiness plus partner rules, synthetic/low-risk data, feedback template, owner monitoring | Small named partner group reviewing public flow only | Partner admin access, real customer-data review, public invitations |
| Broader public/social/paid traffic | Abuse-control, bot protection, upload hardening, reviewed privacy/terms, operations, monitoring, retention decisions, support process | Public promotion only after separate approval | Current fail-open rate-limit posture as default commercial-scale posture |
| Commercial workflow | Payment/order/CAD/quote/production scopes implemented and approved separately | Separately scoped future product | Treating Concept Brief intake as transaction, order, quote, CAD approval, or production approval |

## 13. Go / no-go summary

Quiet owner-controlled MVP can be considered for owner acceptance only if:

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

Quiet MVP is no-go if:

- Submission receipt can be false.
- Admin cannot access persisted briefs.
- Protected admin or reference assets are exposed.
- Customer-visible unreviewed AI/internal output exists.
- Secrets, admin keys, or private customer data are exposed.
- Owner cannot manually monitor and respond to submissions.
- Public copy overpromises unsupported current-MVP behavior.

Broader public/social/paid traffic remains no-go until separately approved work
addresses abuse control, bot protection, upload hardening, reviewed legal and
privacy publication, operational monitoring, retention/deletion/export
expectations, and support ownership.

## 14. Owner acceptance checklist

| Owner decision | Accepted? | Notes |
| --- | --- | --- |
| Current launch frame is quiet owner-controlled MVP only |  |  |
| Current MVP remains non-SQL |  |  |
| Agent 55H is not started by default |  |  |
| Production rate-limit provider enforcement remains deferred/fail-open for quiet MVP only |  |  |
| Broader traffic requires separate abuse-control and bot-protection approval |  |  |
| Manual admin queue monitoring is accepted |  |  |
| Human review before customer delivery is accepted |  |  |
| Customer-safe email-only delivery is accepted |  |  |
| CAD, quote, order, and production remain offline |  |  |
| Gallery approval requires separate consent and approval |  |  |
| Draft legal pages are not final legal approval |  |  |
| Evidence will avoid secrets and private customer/admin data |  |  |

## 15. Recommended future sequence

Recommended future steps:

1. Optional Agent 56G - docs-only final public-flow smoke-test plan, if the
   owner wants a precise non-mutating QA runbook before any live testing.
2. Optional separately approved QA execution - gather evidence against this
   checklist in Local, Preview, or controlled Production scope.
3. Optional Agent 56E - safe static public copy implementation, only if the
   owner still wants copy edits and accepts that it is separate from this QA
   checklist.
4. Agent 55H - only if the owner explicitly chooses the Agent 55G SQL
   execution preparation path.

Do not proceed from this checklist to SQL, Supabase live access, provider
generation, customer preview, gallery workflow, email automation, CAD, quote,
order, payment, production, broader traffic, or Production operations without a
separate reviewed task and explicit approval.

## 16. Public route evidence package

A later approved QA run should collect one evidence row per public route:

- `/`
- `/design/start`
- `/design/concept`
- `/design/brief`
- `/design/submitted`
- `/design/sketch`

Evidence should focus on route availability, customer expectation safety, and
whether the route preserves the current non-SQL MVP boundary.

## 17. Public copy evidence package

A later approved QA run should confirm public copy avoids unsupported current
MVP promises.

Evidence should show that NOVORA is framed as Concept Brief intake with
human-reviewed follow-up, not instant AI delivery, CAD, quotation, order,
payment, production approval, gallery publication, or final manufacturability.

## 18. Admin review evidence package

A later approved protected-admin QA run should confirm the admin list and detail
remain gated, readable, and operationally useful.

Evidence should avoid customer private data and should not include admin keys,
protected URLs, cookies, signed reference URLs, or full customer records.

## 19. Human-review SOP evidence package

A later approved operations review should confirm that a human reviewer is
assigned and understands the current review boundary.

Evidence should show that generation success is not approval and that
`approved_for_customer` does not approve gallery use, customer preview, CAD,
quotation, order, or production.

## 20. Customer-safe email evidence package

A later approved operations review should confirm that customer-safe email is
human-controlled and email-only.

Evidence should show that raw prompts, raw Design Specs, raw Hand Sketch
Instructions, reviewer notes, admin notes, rejected drafts, private links, and
internal-only drafts are not sent to customers.

## 21. AI and internal-draft evidence package

A later approved QA run should confirm that AI and internal drafts remain
internal-only until human approval.

Evidence should show no customer page exposes unreviewed AI, GPT, image, or
internal draft output as current MVP delivery.

## 22. Gallery evidence package

A later approved QA run should confirm gallery approval remains separate.

Evidence should show that customer delivery approval is not gallery approval
and that customer submissions, reference images, or private data are not
published without separate consent, privacy review, curation, and approval.

## 23. CAD / quote / order / production evidence package

A later approved QA run should confirm CAD, quotation, order, gemstone
procurement, timeline, and production are offline next steps.

Evidence should show that Concept Brief intake and concept direction are not
presented as CAD, quote, order confirmation, payment confirmation, production
approval, production-ready files, or sourcing confirmation.

## 24. Privacy evidence package

A later approved QA run should confirm private customer and admin data remain
protected.

Evidence should redact contact data, reference images, internal notes,
protected admin URLs, signed URLs, and any customer-specific details not needed
for the readiness decision.

## 25. Security evidence package

A later approved QA run should confirm no secrets appear in artifacts.

Evidence must not include service-role keys, database URLs, admin keys,
provider tokens, API keys, cookies, bearer tokens, environment values, local
secret notes, or screenshots containing secret material.

## 26. Manual fallback evidence package

A later approved operations review should confirm the owner has a fallback if
admin email notification fails.

Evidence should show the owner can check the protected admin queue manually and
knows how to identify new persisted Concept Briefs without relying only on
email delivery.

## 27. Soft-launch go checklist

Quiet owner-controlled MVP can move toward owner acceptance only when public
intake, truthful receipt, protected admin review, reference handling, manual
queue checks, human review, customer-safe email, no-preview boundary, and
privacy/security evidence are acceptable.

This is not public launch approval.

## 28. Soft-launch no-go checklist

Quiet owner-controlled MVP is no-go if receipt can be false, protected admin is
inaccessible or exposed, reference assets are exposed, customer-visible
unreviewed output exists, secrets or private data leak, manual queue monitoring
is unavailable, or public copy overpromises unsupported behavior.

## 29. Partner preview readiness

Trusted partner preview requires quiet MVP readiness plus small named tester
scope, synthetic or low-risk data, no partner admin access, owner monitoring,
and structured feedback collection.

Partner preview is not public launch, commercial readiness, or approval for
real customer-data review.

## 30. Broader traffic readiness

Broader public, social, or paid traffic remains no-go until separately approved
work addresses abuse control, bot protection, upload hardening, reviewed legal
and privacy publication, operational monitoring, retention/deletion/export
expectations, and support ownership.

Production rate-limit provider enforcement remains fail-open for quiet MVP only
unless a later approved task changes that posture.

## 31. Handoff requirements for a future QA execution task

A future QA execution task should start from this checklist, define exact
environment and data boundaries, identify which evidence will be gathered, and
confirm whether any live action is approved.

It must stop before Production checks, protected admin access, customer-data
review, email sending, SQL, Supabase, Vercel, deploy, or implementation unless
that exact action is separately approved.

## 32. Final recommendation

Use this checklist as the release-readiness control surface for the current
non-SQL MVP.

Keep the MVP modest: public Concept Brief intake, protected admin review,
human-reviewed customer-safe email follow-up, and offline CAD/quote/order/
production handoff. Keep AI/internal drafts internal-only until human approval.
Keep gallery approval separate. Keep SQL and artifact persistence out of the
current default path.

This checklist is necessary for readiness discipline, but it is not launch
approval.
