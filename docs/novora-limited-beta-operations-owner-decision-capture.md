# NOVORA Limited Beta Operations Owner Decision Capture

## 1. Purpose

This is an owner decision capture record for limited external beta operations.
It turns the Agent 60F operations ownership decision packet into a concrete
owner-fillable record.

This is not a deployment plan, not a legal document, not production
configuration, and not code implementation. It does not approve limited
external beta, publish legal pages, change customer communication behavior, or
authorize Production operations.

## 2. Current Source Of Truth

Use this record together with the current `main` branch and the durable project
ledger in `docs/novora-current-project-state.md`.

Relevant source documents and decisions:

- Agent 60F decision packet:
  `docs/novora-limited-beta-operations-ownership-decision-packet.md`.
- Agent 60E Privacy / Terms publication readiness plan:
  `docs/novora-privacy-terms-publication-readiness-plan.md`.
- Agent 60D submitted-page mock-sketch-link removal, which preserves the
  email-only, human-reviewed customer delivery boundary.
- Agent 60C internal QA result, carried forward in current readiness docs as
  `PASS WITH NOTES` / no internal QA blockers.
- Agent 60I instant customer sketch preview MVP decision:
  `docs/novora-instant-customer-sketch-preview-mvp-decision.md`.

Internal QA readiness does not equal external beta approval. Limited external
beta remains blocked until the owner locks the operating owners, cadence,
customer-safe sender path, fallback, privacy/legal publication path, and
accepted risk decisions required below.

## 3. Decision Status Summary

| Decision area | Current status | Owner decision needed before external beta | Source / note |
| --- | --- | --- | --- |
| Primary human reviewer | Owner decision required | Name the primary reviewer and role. | Agent 60F requires a named reviewer before beta. |
| Backup human reviewer | Owner decision required | Name the backup reviewer and handoff conditions. | Agent 60F lists missing backup reviewer as a beta stop condition. |
| Admin queue cadence | Owner decision required | Confirm the protected admin queue review cadence. | Agent 60F recommends at least once per business day, not yet owner-approved. |
| Initial customer response window | Owner decision required | Confirm the maximum initial response window. | Agent 60F requires a maximum initial response window. |
| Concept follow-up window | Owner decision required | Confirm the maximum concept follow-up window. | Agent 60F requires a maximum concept follow-up window. |
| Admin notification monitor | Owner decision required | Name who monitors admin notification emails. | Admin notification plumbing exists, but monitoring ownership is unresolved. |
| Admin notification fallback | Owner decision required | Define backup process if admin notification email fails. | Agent 60F lists no admin notification fallback as a beta stop condition. |
| Customer-safe sender | Owner decision required | Confirm the customer-safe sender address. | Documented admin notification sender is `NOVORA <briefs@notify.novora.design>`; this is not a customer-safe sender decision. |
| Customer-safe reply-to | Owner decision required | Confirm the customer-safe reply-to address. | Agent 60F says customer-safe reply-to remains undecided. |
| Customer reply sender authority | Owner decision required | Name who is allowed to send customer replies. | Customer reply sending remains manual and human-controlled. |
| Customer-facing sketch approval owner | Owner decision required | Name who approves customer-facing sketch or concept delivery. | Agent 60I changes the forward product direction toward website-based first sketch preview, but does not name an approval owner. |
| Customer-safe notes review owner | Owner decision required | Name who reviews customer-safe notes before email. | Raw prompts, internal notes, reviewer notes, and unreviewed drafts remain customer-blocked. |
| Incomplete brief handling | Owner decision required | Confirm clarification handling for incomplete briefs. | Agent 60F recommends clarification questions rather than speculative concept work. |
| Unclear reference image handling | Owner decision required | Confirm handling for unclear, missing, inaccessible, or unusable references. | Reference images remain for protected review and manual follow-up. |
| Out-of-scope request handling | Owner decision required | Confirm response or escalation path for out-of-scope requests. | Agent 60F recommends polite customer-safe response or owner escalation. |
| CAD / quote / production discussion handling | Owner decision required | Confirm offline handling for CAD, quote, sourcing, order, production, QC, packaging, and logistics. | Current MVP has no payment, order, CAD approval, or production workflow. |
| Privacy deletion / correction escalation | Owner decision required | Name deletion/correction escalation owner and request process. | `privacy@novora.design` is documented as receive-only MVP privacy contact forwarding; deletion/correction ownership remains unresolved. |
| Limited beta invite-only status | Owner confirmed: invite-only | None for invite-only status; other beta operating decisions remain required. | Agent 60I owner decision confirms invite-only limited beta direction. |
| Maximum beta users or submissions | Owner confirmed: 5-10 users; submission cap still TBD by owner | Confirm any maximum submission cap if needed. | Agent 60I owner decision confirms beta size only. |
| Target beta markets | Owner decision required | Confirm target beta markets. | No final beta market selection is documented. |
| Target beta languages | Owner confirmed: English and Traditional Chinese | None for target beta language options. | Agent 60I owner decision confirms target beta language options. |
| Automatic submission response | Owner confirmed: desired | Future implementation must define safe response content, timing, failure handling, and delivery channel. | Agent 60I records automatic submission response as desired, without implementing it. |
| Website first AI sketch preview direction | Owner confirmed: intended MVP product path | Future implementation must define safe preview flow, disclaimers, generation failure handling, feedback capture, and review-state semantics. | Agent 60I pivots the forward direction from conservative email-only delivery toward instant website-based first concept preview. |
| Human intervention focus for first sketch preview | Owner confirmed: structure, craft, production feasibility, inconsistent views, setting logic, gemstone placement, proportion, mismatch, unsafe claims, correction, and regeneration | Name operating owners and escalation process before external beta or implementation. | Agent 60I confirms human intervention should focus on correction after initial AI preview rather than blocking every first sketch. |
| Weekend / holiday coverage | Owner decision required | Confirm whether weekend or holiday review is supported. | Agent 60F says weekend/holiday coverage must not be assumed. |
| Urgent escalation owner | Owner decision required | Name urgent customer issue escalation owner. | Agent 60F requires escalation ownership before beta. |
| Rate-limit fail-open risk acceptance or mitigation owner | Owner decision required | Name who accepts narrow invite-only fail-open risk or owns mitigation. | Production rate-limit enforcement remains fail-open unless a separate approved provider/environment task changes it. |
| Privacy / Terms publication owner | Owner decision required | Name owner/legal decision owner and final publication path. | Agent 60E says final public Privacy / Terms pages are not published and require owner/legal decisions. |

## 4. Confirmed Direction And Remaining Operating Baseline

Confirmed Agent 60I direction and remaining operating baseline:

- Invite-only limited beta.
- 5-10 beta users.
- English and Traditional Chinese target language options.
- Automatic submission response is desired.
- Website-based first AI hand-sketch concept preview is now the intended MVP
  product direction.
- Business-day admin queue checks.
- Business-day admin notification inbox checks.
- Human intervention focused on structural logic errors, jewelry construction
  errors, production feasibility issues, inconsistent views, wrong setting
  logic, wrong gemstone placement, proportion problems, customer request
  mismatch, unsafe claims, and correction or regeneration.
- Customer-safe replies only through a confirmed sender and reply-to path.
- Clarification questions for incomplete briefs.
- Owner escalation for unclear, unsupported, privacy-sensitive, or urgent
  cases.
- No payment, no order approval, and no production approval.
- CAD, quote, sourcing, production, QC, packaging, and logistics handled
  offline and separately from the website flow.

The invite-only status, 5-10 user beta size, English and Traditional Chinese
language options, automatic submission response desire, website-based first
sketch preview direction, and revised human-intervention focus are confirmed by
the Agent 60I owner decision. The remaining operating fields below are still
unresolved unless explicitly filled by the owner.

## 5. Owner-Fillable Decision Record

| Decision | Selected value | Owner | Date confirmed | Notes |
| --- | --- | --- | --- | --- |
| Primary human reviewer | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Backup human reviewer | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Admin queue cadence | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Initial customer response window | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Concept follow-up window | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Admin notification monitor | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Admin notification fallback | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Customer-safe sender | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Customer-safe reply-to | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Customer reply sender authority | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Customer-facing sketch approval owner | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Customer-safe notes review owner | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Incomplete brief handling | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Unclear reference image handling | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Out-of-scope request handling | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| CAD / quote / production discussion handling | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Privacy deletion / correction escalation | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Limited beta invite-only status | Invite-only | TBD by owner | TBD by owner | Confirmed by Agent 60I owner decision; owner/date fields not invented. |
| Maximum beta users or submissions | 5-10 users; submission cap TBD by owner | TBD by owner | TBD by owner | User count confirmed by Agent 60I owner decision; submission cap remains unresolved. |
| Target beta markets | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Target beta languages | English and Traditional Chinese | TBD by owner | TBD by owner | Confirmed by Agent 60I owner decision; owner/date fields not invented. |
| Automatic submission response | Desired | TBD by owner | TBD by owner | Confirmed by Agent 60I owner decision; implementation details remain future work. |
| Website first AI sketch preview direction | Intended MVP product path | TBD by owner | TBD by owner | Confirmed by Agent 60I owner decision; no implementation occurred. |
| Human intervention focus for first sketch preview | Structure/craft/production errors and correction after initial AI preview | TBD by owner | TBD by owner | Confirmed by Agent 60I owner decision; operating owners remain unresolved. |
| Weekend / holiday coverage | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Urgent escalation owner | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Rate-limit fail-open risk acceptance or mitigation owner | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Privacy / Terms publication owner | TBD by owner | TBD by owner | TBD by owner | TBD by owner |

## 6. External Beta Go / No-Go Gate

Limited external beta remains blocked until the required owner decisions are
filled and approved.

Minimum required approvals before external beta:

- Primary reviewer.
- Backup reviewer.
- Admin queue cadence.
- Customer-safe sender and reply-to.
- Admin notification fallback.
- Customer-facing sketch approval owner.
- Deletion / correction escalation owner.
- Privacy / Terms publication decision.
- Rate-limit risk acceptance or mitigation decision.
- Market decision and any submission cap decision.
- Remaining beta operating ownership decisions.

If any required field remains `Owner decision required` or `TBD by owner`,
limited external beta remains no-go.

## 7. Relationship To Future Work

This capture document supports later work only. It does not start or approve
that work.

Future follow-up may include:

- Later owner decision update PR.
- Later public Privacy / Terms implementation after owner/legal approval.
- Later rate-limit risk decision or mitigation plan.
- Later limited external beta go/no-go review.

Each follow-up should remain separately scoped and should preserve the current
AI concept sketch, human correction, customer safety, and no online
payment/order/CAD/production boundaries. Agent 60I explicitly changes the
forward product direction away from conservative email-only first sketch
delivery toward website-based first concept preview, but it does not implement
that preview or approve CAD, quote, order, payment, or production through the
website.

## 8. Stop Conditions

Stop and request owner clarification before accepting wording if:

- Any requested wording treats unresolved decisions as approved.
- Any requested wording invents owner names, reviewer names, dates, or
  approvals.
- Any requested wording presents the first AI sketch preview as final design,
  CAD, quote, order approval, payment approval, production approval, or broad
  public launch readiness.
- Any requested wording implies online payment, order approval, CAD approval,
  quote approval, or production approval.
- Owner decisions conflict with Privacy / Terms readiness requirements.
- Owner decisions conflict with the current Production rate-limit risk status.
