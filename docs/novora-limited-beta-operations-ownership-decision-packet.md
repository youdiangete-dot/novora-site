# NOVORA Limited Beta Operations Ownership Decision Packet

## 1. Purpose

This is an operations ownership decision packet for NOVORA limited external
beta readiness.

It defines what the owner must decide, name, and operate before inviting
limited external beta users into the Concept Brief flow. It is not a deployment
plan, not a legal document, not final policy, and not code implementation.

This packet does not change app code, UI, routes, public copy, admin logic,
customer submission logic, email sending behavior, SQL, Supabase, Vercel
configuration, environment variables, packages, tests, assets, protected admin
pages, Production data, or customer email behavior.

## 2. Current Readiness Context

Current `main` includes the Agent 60D and Agent 60E work:

- Agent 60D removed the submitted-page link from `/design/submitted` to
  `/design/sketch`, and the e2e expectation now verifies that the mock sketch
  preview links are absent from the submitted page.
- The email-only, human-reviewed sketch and concept delivery boundary remains
  preserved. NOVORA still must not expose unreviewed AI output, internal
  drafts, raw prompts, reviewer notes, admin notes, or private storage links to
  customers.
- Agent 60E added the Privacy / Terms publication readiness plan. Final public
  Privacy and Terms pages still require owner/legal decisions and a separate
  implementation task before limited external beta depends on them.
- Production rate-limit enforcement remains a separate blocker or owner-risk
  decision. The current documented MVP posture keeps Production fail-open until
  a separately approved Production provider/environment task changes that.
- The internal QA context is `PASS WITH NOTES` / no internal QA blockers. That
  does not approve limited external beta, because beta also requires owner
  operating ownership for review, customer response, fallback, and escalation.

## 3. Why Operations Ownership Blocks Limited External Beta

Internal QA can show that the website is understandable and technically fit for
the current MVP boundary. External beta adds a different obligation: real
people may submit contact details, reference images, design intent, budget
signals, timelines, and follow-up expectations.

Before inviting external testers, NOVORA needs a reliable human response
system. Someone must check the admin queue, notice notification failures,
review every customer-safe response, decide when a brief is incomplete or
outside scope, and handle privacy or correction requests. Without named owners
and cadence, the product can technically receive briefs while operationally
failing customers.

Limited beta should therefore remain blocked until operations ownership is
explicitly confirmed.

## 4. Required Owner Decisions

The owner should lock these decisions before limited external beta:

- Primary human reviewer name and role.
- Backup human reviewer name and role.
- Admin queue review cadence.
- Maximum initial response window.
- Maximum concept follow-up window.
- Who monitors admin notification emails.
- Backup process if the admin email notification fails.
- Customer-safe sender address.
- Customer-safe reply-to address.
- Who is allowed to send customer replies.
- Who approves customer-facing sketch or concept delivery.
- How customer-safe notes are reviewed before email.
- What happens when a brief is incomplete.
- What happens when reference images are unclear, missing, inaccessible, or
  unusable.
- What happens when a request is outside NOVORA scope.
- What happens when CAD, quote, sourcing, order, or production discussion is
  requested.
- What happens if a user requests deletion or correction before final Privacy /
  Terms pages are published.
- Whether limited beta is invite-only.
- Maximum number of beta users or submissions.
- Target beta markets and languages.
- Whether weekend or holiday review is supported.
- Escalation owner for urgent customer issues.

## 5. Proposed Limited Beta Operating Model

Recommended baseline, pending owner confirmation:

- Limited beta is invite-only.
- Initial beta size is small enough for manual daily review.
- Admin queue is checked at least once per business day.
- Admin notification inbox is checked at least once per business day.
- Every customer follow-up receives human review before sending.
- No automatic sketch delivery.
- No unreviewed AI output is emailed, linked, published, or shown on customer
  pages.
- Customer follow-up is email-only.
- Customer-safe replies use a confirmed sender and reply-to address.
- Incomplete briefs receive clarification questions rather than speculative
  concept work.
- Out-of-scope requests receive a polite customer-safe response or owner
  escalation.
- CAD, quote, sourcing, production, QC, packaging, and logistics remain offline
  and separate from the website flow.
- No online payment, order approval, production approval, or production-ready
  promise is introduced for beta.
- Privacy/deletion/correction requests are escalated to the owner/legal
  decision owner until final Privacy / Terms pages and request SOP are
  published.

This model is not final owner-approved policy. It is a conservative default for
decision-making before beta.

## 6. Roles And Responsibilities Matrix

| Role | Responsibility | Required decision before beta | Current status |
| --- | --- | --- | --- |
| Owner / business decision maker | Approves limited beta risk, workload, service boundaries, invite size, target markets, and stop/go decisions. | Name the owner and confirm beta may proceed only after remaining blockers are accepted or resolved. | proposed |
| Primary reviewer | Reviews submitted briefs, reference images, feasibility, internal notes, and customer-safe concept direction. | Name the person/role and define normal response coverage. | undecided |
| Backup reviewer | Covers review when the primary reviewer is unavailable. | Name the person/role and define handoff conditions. | undecided |
| Admin queue monitor | Checks protected admin queue and notification inbox on the agreed cadence. | Name the monitor and business-day/weekend cadence. | undecided |
| Customer email sender | Sends only human-reviewed, customer-safe email replies from the approved sender/reply-to path. | Name who can send, sender address, reply-to address, and pre-send review gate. | undecided |
| Technical fallback contact | Investigates website, admin queue, notification, rate-limit, or submission issues without mutating Production unless separately approved. | Name escalation contact and when to stop beta intake. | undecided |
| Legal/privacy decision owner | Decides Privacy / Terms publication, request handling, deletion/correction escalation, and legal wording. | Name the owner/legal reviewer and confirm request process before beta. | proposed |

Already documented context: admin-only Concept Brief notification plumbing
exists, the admin notification sender is documented as
`NOVORA <briefs@notify.novora.design>`, and protected admin review exists.
Those do not replace the still-undecided customer-safe sender, reply-to,
reviewer names, or response ownership.

## 7. Daily Beta Operating Checklist

Use this checklist on each supported beta review day:

- Check the admin notification inbox.
- Check the protected admin brief queue.
- Verify new submissions and public references.
- Review contact data completeness.
- Review reference image count and usability.
- Classify request scope.
- Decide whether the brief is complete enough for concept review.
- Prepare customer-safe response or clarification questions.
- Confirm no raw prompt, raw Design Spec, raw Hand Sketch Instruction,
  reviewer note, admin note, private link, or unreviewed AI draft is included.
- Confirm no unreviewed AI output is sent.
- Confirm concept wording does not imply CAD, quote, order, payment,
  production approval, material availability, or production-ready output.
- Send the customer-safe email follow-up only through the approved manual
  sender path.
- Record an internal note or status if supported by the existing admin flow.
- Escalate edge cases, notification failures, unclear references, privacy
  requests, unsupported requests, or urgent customer issues.

## 8. Stop Conditions Before External Beta

Do not invite limited external beta users if any of these remain unresolved:

- No named human reviewer.
- No backup reviewer.
- No admin queue review cadence.
- No customer-safe email sender.
- No customer-safe reply-to address.
- No admin notification fallback.
- No Privacy / Terms publication decision or accepted narrow beta risk.
- No deletion/correction request process or owner escalation route.
- Production rate-limit fail-open risk is neither accepted nor mitigated.
- Any flow exposes unreviewed AI output to customers.
- Any copy, email, or response implies instant CAD, quote, order, payment,
  production approval, production-ready files, or final manufacturability.
- Weekend or holiday coverage is assumed but not supported.
- The owner cannot support the manual workload created by the invited beta
  group.

If one of these conditions appears after beta begins, pause new invites and
route the issue to the owner before continuing.

## 9. Relationship To Remaining Blockers

Privacy / Terms publication:

- Agent 60E documents what is needed before public Privacy / Terms pages can be
  published.
- This packet does not publish or revise legal pages.
- Limited beta should not rely on draft legal pages as final policy.

Production rate-limit enforcement / acceptance:

- Production currently remains fail-open unless a separate approved provider,
  environment, and rollout task changes that.
- This packet does not configure providers, change Vercel, or test Production.
- The owner must either accept the narrow invite-only risk or approve a
  separate mitigation task.

Internal QA runbook:

- Internal QA readiness and `PASS WITH NOTES` do not equal beta approval.
- This packet addresses the human operating ownership that technical QA cannot
  prove by itself.

Future limited beta decision review:

- Use this packet as the owner decision checklist before inviting testers.
- Record the final named owners, cadence, sender addresses, response windows,
  and accepted risks in a later owner decision capture PR.

## 10. Recommended Follow-Up PRs

These are proposed names only. They are not started by this packet.

- Agent 60G: owner decision capture for limited beta operations.
- Agent 60H: Privacy / Terms public page implementation after owner/legal
  decisions.
- Agent 60I: rate-limit external beta risk decision / mitigation plan.

Each follow-up should preserve the current boundaries unless separately
approved: no SQL, Supabase, Vercel, provider configuration, real email,
protected admin access, Production data mutation, payment, auth, CAD, order,
production, deploy, or AI generation work by default.
