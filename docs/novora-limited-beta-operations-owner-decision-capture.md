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
| Customer-facing sketch approval owner | Owner decision required | Name who approves customer-facing sketch or concept delivery. | Human approval is required before any customer-safe concept delivery. |
| Customer-safe notes review owner | Owner decision required | Name who reviews customer-safe notes before email. | Raw prompts, internal notes, reviewer notes, and unreviewed drafts remain customer-blocked. |
| Incomplete brief handling | Owner decision required | Confirm clarification handling for incomplete briefs. | Agent 60F recommends clarification questions rather than speculative concept work. |
| Unclear reference image handling | Owner decision required | Confirm handling for unclear, missing, inaccessible, or unusable references. | Reference images remain for protected review and manual follow-up. |
| Out-of-scope request handling | Owner decision required | Confirm response or escalation path for out-of-scope requests. | Agent 60F recommends polite customer-safe response or owner escalation. |
| CAD / quote / production discussion handling | Owner decision required | Confirm offline handling for CAD, quote, sourcing, order, production, QC, packaging, and logistics. | Current MVP has no payment, order, CAD approval, or production workflow. |
| Privacy deletion / correction escalation | Owner decision required | Name deletion/correction escalation owner and request process. | `privacy@novora.design` is documented as receive-only MVP privacy contact forwarding; deletion/correction ownership remains unresolved. |
| Limited beta invite-only status | Owner decision required | Confirm whether beta is invite-only. | Agent 60F recommends invite-only, not yet owner-approved. |
| Maximum beta users or submissions | Owner decision required | Confirm maximum beta users or submissions. | No final beta size is documented. |
| Target beta markets | Owner decision required | Confirm target beta markets. | No final beta market selection is documented. |
| Target beta languages | Owner decision required | Confirm target beta languages. | No final beta language selection is documented. |
| Weekend / holiday coverage | Owner decision required | Confirm whether weekend or holiday review is supported. | Agent 60F says weekend/holiday coverage must not be assumed. |
| Urgent escalation owner | Owner decision required | Name urgent customer issue escalation owner. | Agent 60F requires escalation ownership before beta. |
| Rate-limit fail-open risk acceptance or mitigation owner | Owner decision required | Name who accepts narrow invite-only fail-open risk or owns mitigation. | Production rate-limit enforcement remains fail-open unless a separate approved provider/environment task changes it. |
| Privacy / Terms publication owner | Owner decision required | Name owner/legal decision owner and final publication path. | Agent 60E says final public Privacy / Terms pages are not published and require owner/legal decisions. |

## 4. Recommended Safe Baseline Pending Owner Confirmation

Recommended baseline, not yet owner-approved:

- Invite-only limited beta.
- Small initial group that the owner can manually support.
- Business-day admin queue checks.
- Business-day admin notification inbox checks.
- Manual human review before every customer follow-up.
- Email-only customer communication.
- No automatic sketch delivery.
- No unreviewed AI output emailed, linked, published, or shown on customer
  pages.
- Customer-safe replies only through a confirmed sender and reply-to path.
- Clarification questions for incomplete briefs.
- Owner escalation for unclear, unsupported, privacy-sensitive, or urgent
  cases.
- No payment, no order approval, and no production approval.
- CAD, quote, sourcing, production, QC, packaging, and logistics handled
  offline and separately from the website flow.

This baseline is a conservative operating recommendation from Agent 60F. It is
not final owner-approved policy.

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
| Limited beta invite-only status | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Maximum beta users or submissions | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Target beta markets | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
| Target beta languages | TBD by owner | TBD by owner | TBD by owner | TBD by owner |
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
- Beta size, market, and language decision.

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
human-review, email-only customer delivery, no-unreviewed-AI, and no online
payment/order/CAD/production boundaries unless a later task explicitly changes
them.

## 8. Stop Conditions

Stop and request owner clarification before accepting wording if:

- Any requested wording treats unresolved decisions as approved.
- Any requested wording invents owner names, reviewer names, dates, or
  approvals.
- Any requested wording weakens the human-review, email-only, or no-unreviewed
  AI boundary.
- Any requested wording implies online payment, order approval, CAD approval,
  quote approval, or production approval.
- Owner decisions conflict with Privacy / Terms readiness requirements.
- Owner decisions conflict with the current Production rate-limit risk status.
