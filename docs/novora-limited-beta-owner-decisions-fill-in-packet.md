# NOVORA Limited Beta Owner Decisions Fill-In Packet

## 1. Purpose

This packet helps the NOVORA owner fill in the missing operating decisions
required before limited external beta starts.

It is a worksheet only. It is not legal advice, not a deployment plan, not an
approval record, not final policy, and not permission to start limited external
beta. It does not publish Privacy or Terms pages, change app behavior, change
email behavior, configure providers, approve Production risk, or approve any
customer-facing sketch delivery.

Unresolved fields must remain `Owner to fill` or blank until the owner provides
the actual answer.

## 2. How To Use This Packet

Use this packet before updating the official owner decision capture record.

Recommended workflow:

1. Read the current known context below.
2. Fill every required owner answer field.
3. Leave unknown answers as `Owner to fill` or blank.
4. Do not treat suggested wording, reminders, or known context as approval.
5. Review the minimum go/no-go checklist.
6. Transfer final owner-confirmed answers into the official owner decision
   capture record only after the owner has actually confirmed them.

Do not invent owner names, reviewer names, dates, beta size, target markets,
target languages, cadence, response windows, sender policy, or approvals.

## 3. Current Known Context

Documented context that may be used while filling this packet:

- Privacy contact: `privacy@novora.design`.
- Admin notification sender: `NOVORA <briefs@notify.novora.design>`.
- The admin notification sender is not a customer-safe sender decision.
- Production rate-limit enforcement remains fail-open unless the owner accepts
  that risk for a narrow beta or approves a separate mitigation task.
- `/design/submitted` no longer links to `/design/sketch`.
- Unreviewed AI drafts must not be shown or delivered to customers.
- Customer-facing sketch delivery remains email-only after human approval.

These facts do not fill the owner decision fields below. They are constraints
and reminders for the owner decision process.

## 4. Required Owner Answers Before Limited External Beta

Fill each row before limited external beta. If the owner has not decided, keep
`Owner to fill`.

| Required owner answer | Owner answer | Decision owner | Date confirmed | Notes |
| --- | --- | --- | --- | --- |
| Primary human reviewer | Owner to fill | Owner to fill | Owner to fill | Name and role only after owner confirmation. |
| Backup human reviewer | Owner to fill | Owner to fill | Owner to fill | Include handoff trigger only after owner confirmation. |
| Admin queue review cadence | Owner to fill | Owner to fill | Owner to fill | Do not invent daily, weekly, weekend, or holiday cadence. |
| Initial customer response window | Owner to fill | Owner to fill | Owner to fill | Do not invent a response-time promise. |
| Concept follow-up window | Owner to fill | Owner to fill | Owner to fill | Do not invent a sketch or concept delivery window. |
| Admin notification inbox monitor | Owner to fill | Owner to fill | Owner to fill | Name only after owner confirmation. |
| Admin notification fallback | Owner to fill | Owner to fill | Owner to fill | Define only after owner confirmation. |
| Customer-safe sender address | Owner to fill | Owner to fill | Owner to fill | Must not default to the admin notification sender. |
| Customer-safe reply-to address | Owner to fill | Owner to fill | Owner to fill | Must be confirmed before customer replies. |
| Who may send customer replies | Owner to fill | Owner to fill | Owner to fill | Name allowed senders only after owner confirmation. |
| Customer-facing sketch approval owner | Owner to fill | Owner to fill | Owner to fill | Required before any customer-facing sketch delivery. |
| Customer-safe notes review owner | Owner to fill | Owner to fill | Owner to fill | Required before notes or summaries are emailed. |
| Incomplete brief handling | Owner to fill | Owner to fill | Owner to fill | Define clarification, pause, or escalation path only after owner confirmation. |
| Unclear reference image handling | Owner to fill | Owner to fill | Owner to fill | Define handling for unclear, missing, inaccessible, or unusable references. |
| Out-of-scope request handling | Owner to fill | Owner to fill | Owner to fill | Define response or escalation path only after owner confirmation. |
| CAD / quote / production discussion handling | Owner to fill | Owner to fill | Owner to fill | Must preserve the boundary that the website brief is not CAD, quote, order, or production approval. |
| Privacy deletion / correction escalation owner | Owner to fill | Owner to fill | Owner to fill | `privacy@novora.design` is a contact path, not the named escalation owner. |
| Limited beta invite-only status | Owner to fill | Owner to fill | Owner to fill | Do not assume invite-only is approved until the owner confirms it. |
| Maximum beta users | Owner to fill | Owner to fill | Owner to fill | Do not invent beta size. |
| Maximum beta submissions | Owner to fill | Owner to fill | Owner to fill | Do not invent submission cap. |
| Target beta markets | Owner to fill | Owner to fill | Owner to fill | Do not invent target markets. |
| Target beta languages | Owner to fill | Owner to fill | Owner to fill | Do not invent target languages. |
| Weekend / holiday coverage | Owner to fill | Owner to fill | Owner to fill | Do not assume coverage exists. |
| Urgent escalation owner | Owner to fill | Owner to fill | Owner to fill | Name only after owner confirmation. |
| Rate-limit fail-open risk acceptance or mitigation owner | Owner to fill | Owner to fill | Owner to fill | Owner must accept narrow-beta risk or assign mitigation ownership. |
| Privacy / Terms publication owner | Owner to fill | Owner to fill | Owner to fill | Name only after owner/legal confirmation. |
| Privacy / Terms publication decision | Owner to fill | Owner to fill | Owner to fill | Do not treat draft pages or plans as final publication approval. |
| Final go/no-go owner | Owner to fill | Owner to fill | Owner to fill | Name only after owner confirmation. |

## 5. Suggested Owner Answer Format

Use a simple answer format so the official record can be updated safely:

| Field | Fill-in format |
| --- | --- |
| Decision | The exact owner-selected answer. |
| Owner | Person or role responsible for the decision. |
| Date confirmed | Owner-confirmed date only. Leave blank until confirmed. |
| Scope | What the answer applies to, such as limited external beta only. |
| Conditions | Any limits, prerequisites, or stop conditions the owner attaches. |
| Open risks | Risks the owner accepts, defers, or assigns for mitigation. |
| Follow-up needed | Any later PR, legal review, provider task, or operating task required. |

Example blank template:

| Field | Answer |
| --- | --- |
| Decision | Owner to fill |
| Owner | Owner to fill |
| Date confirmed | Owner to fill |
| Scope | Owner to fill |
| Conditions | Owner to fill |
| Open risks | Owner to fill |
| Follow-up needed | Owner to fill |

## 6. Minimum Go/No-Go Checklist

Limited external beta remains no-go unless all items are owner-confirmed:

- Primary and backup human reviewers are named.
- Admin queue review cadence is confirmed.
- Initial response and concept follow-up windows are confirmed.
- Admin notification inbox monitor and fallback are confirmed.
- Customer-safe sender and reply-to addresses are confirmed.
- Customer reply senders are named.
- Customer-facing sketch approval owner is named.
- Customer-safe notes review owner is named.
- Incomplete brief, unclear reference image, and out-of-scope request handling
  are confirmed.
- CAD / quote / production discussion handling preserves the current MVP
  boundary.
- Privacy deletion / correction escalation owner is named.
- Limited beta invite status, maximum users, maximum submissions, target
  markets, and target languages are confirmed.
- Weekend / holiday coverage is confirmed or explicitly not supported.
- Urgent escalation owner is named.
- Production rate-limit fail-open risk is either accepted for the defined beta
  scope or assigned to a separate mitigation owner.
- Privacy / Terms publication owner and decision are confirmed.
- Final go/no-go owner is named.

If any item remains `Owner to fill` or blank, limited external beta remains
no-go.

## 7. Decisions That Must Not Be Approved Accidentally

Do not mark any of these as approved unless the owner explicitly confirms them:

- That limited beta is invite-only.
- The maximum number of beta users.
- The maximum number of beta submissions.
- Target beta markets.
- Target beta languages.
- Any admin queue review cadence.
- Any initial customer response window.
- Any concept follow-up window.
- Any weekend or holiday coverage.
- Any customer-safe sender or reply-to address.
- Any person allowed to send customer replies.
- Any named reviewer, approval owner, escalation owner, or final go/no-go owner.
- Acceptance of Production rate-limit fail-open risk.
- Privacy / Terms publication readiness or publication approval.
- Any CAD, quote, order, payment, production, manufacturability, sourcing, QC,
  packaging, logistics, or delivery promise.
- Any customer-facing delivery of unreviewed AI drafts, internal drafts, raw
  prompts, reviewer notes, admin notes, or private links.

## 8. Relationship To The Official Owner Decision Capture Record

This packet is a fill-in aid. The official owner decision capture record is:

`docs/novora-limited-beta-operations-owner-decision-capture.md`

Use this packet to gather complete owner answers. After the owner confirms the
answers, update the official capture record in a separate scoped documentation
change or the owner-approved decision capture update path.

Do not treat this packet as the official approval record. Do not treat blank
fields, suggested format, known context, or conservative reminders as owner
approval.

## 9. Stop Conditions

Stop before limited external beta or before updating the official record if:

- Any required owner answer remains blank or `Owner to fill`.
- A proposed answer invents names, dates, cadence, response windows, sender
  policy, beta size, target markets, target languages, or approval status.
- A proposed answer treats the admin notification sender as customer-safe
  without an explicit owner decision.
- A proposed answer treats `privacy@novora.design` as the named deletion or
  correction escalation owner instead of a contact path.
- A proposed answer weakens human review, email-only delivery, or no-unreviewed
  AI boundaries.
- A proposed answer implies online payment, order approval, CAD approval, quote
  approval, production approval, production-ready files, or final
  manufacturability.
- Production rate-limit fail-open risk is neither explicitly accepted for the
  narrow beta scope nor assigned to a mitigation owner.
- Privacy / Terms publication is assumed from draft pages, plans, or
  placeholders instead of owner/legal confirmation.
- Continuing would require app code, UI, route, admin logic, email behavior,
  SQL, Supabase, Vercel, environment, package, test, asset, protected admin,
  Production data, real email, deployment, merge, or cleanup work outside the
  approved docs-only scope.
