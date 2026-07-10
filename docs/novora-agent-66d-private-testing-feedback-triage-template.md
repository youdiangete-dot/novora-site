# NOVORA Agent 66D Private Testing Feedback Log And Issue Triage Template

> **Transition notice — do not use for new private testing under the former AI
> visibility rules.** Historical submission, admin, notification, privacy,
> Supabase-health, and operational checks in this document may still be useful.
> Former rules that kept the first AI concept sketch internal-only, required
> human review before customer display, or limited delivery to email were
> superseded by the post-Agent-60I instant-preview direction. A new limited-beta
> runbook must be created only after real instant-preview implementation exists
> and has passed implementation QA. Current Production remains mock-only for
> preview and does not generate real AI customer previews.

## 1. Purpose

This template helps the NOVORA owner collect private tester feedback, remove
private details, and decide what to do next.

Use it only for limited owner-controlled private testing. It is not a public
launch tracker, paid traffic tracker, customer support system, production
incident system, or product roadmap approval.

The goal is simple:

- Capture what testers experienced.
- Remove private or sensitive details before sharing with ChatGPT or Codex.
- Separate urgent blockers from feedback that can wait.
- Protect the current NOVORA boundaries around AI sketches, CAD, pricing,
  payment, orders, production, gallery approval, shipping, and customer
  delivery.

## 2. Who should use this template

This template is for:

- The NOVORA owner.
- A trusted operator helping the owner review private test feedback.
- A Codex Agent only after the owner has sanitized the notes.

Do not send raw customer feedback, screenshots, logs, headers, cookies,
payloads, protected admin links, public references, database IDs, provider IDs,
or secret values to ChatGPT or Codex.

Owner observations must be sanitized before they are sent to ChatGPT or Codex.

## 3. Feedback capture rules

Capture feedback in plain language. Write what happened, where it happened, and
what the tester expected.

Do capture:

- Tester role as a general label, such as `[private tester]`.
- Test date as `[date]`.
- Page or step as a general label, such as `[concept step]` or
  `[submitted page]`.
- The tester's plain-language confusion or issue.
- Whether the issue blocked submission.
- Whether the tester saw a submitted confirmation page.
- Whether the owner saw expected email or admin review signals.

Do not capture:

- Real names.
- Real email addresses.
- Phone numbers.
- Home addresses.
- Full customer messages.
- Full public references.
- Concept Brief UUIDs.
- Protected admin URLs.
- Supabase project URLs.
- Service role keys.
- API keys.
- Resend IDs.
- Headers, cookies, request payloads, or raw logs.
- Screenshots containing private data.
- Provider IDs or dashboard identifiers.

Use placeholders such as `[tester name removed]`, `[email removed]`,
`[public reference removed]`, `[uuid removed]`, `[admin link removed]`, and
`[screenshot omitted]`.

## 4. Sanitized feedback log template

Copy one entry per issue or observation.

```text
Feedback ID:
[FB-001]

Date:
[date]

Tester:
[private tester label only]

Test context:
[private test / owner check / follow-up review]

Page or step:
[general page or step name]

What the tester tried to do:
[short sanitized description]

What happened:
[short sanitized description]

What the tester expected:
[short sanitized description]

Severity:
[blocker / major / minor / copy-content / ops / safety-boundary]

Issue type:
[submission / copy / UX / admin / notification / ops / safety-boundary / other]

Was testing paused?
[yes / no]

Owner action taken:
[paused testing / asked tester to wait / added to backlog / created Agent / no action yet]

Sanitization check:
[confirmed no private data, secrets, protected links, IDs, raw logs, or private screenshots]

Notes for Codex:
[safe summary only]
```

## 5. Issue severity categories

Use one main severity for each issue.

`blocker`: Must pause testing. Use this when submissions may not be received,
customer-facing confirmation may be wrong, private data may be exposed, the site
looks publicly unsafe, or testers may believe NOVORA is taking orders,
payments, CAD approvals, production approvals, or customer delivery requests.

`major`: Fix before expanding private testing. Use this when a trusted tester
can complete the flow, but the problem causes serious confusion, weak trust, a
missed admin follow-up signal, or repeated owner workarounds.

`minor`: Can batch. Use this for small wording, layout, or flow issues that do
not block submission and do not weaken the main safety boundaries.

`copy/content`: Wording only. Use this when the app works, but text is unclear,
too long, too vague, or too promising.

`ops`: Supabase, Vercel, email monitoring, or owner-run process issue. Use this
when the app may be healthy but the operating environment needs attention.

`safety/boundary`: AI, CAD, payment, quote, order, production, gallery approval,
shipping, or customer delivery promise risk. Treat this as high priority even if
the technical fix looks small.

## 6. Issue type categories

Use one or more issue types.

- `submission`: The tester could not finish or was unsure whether NOVORA
  received the Concept Brief.
- `copy`: Wording is unclear, too strong, too vague, or too promising.
- `UX`: The flow is confusing, hard to use, too long, or visually unclear.
- `admin`: The owner cannot review the submitted brief clearly.
- `notification`: The expected owner email signal is missing or unclear.
- `ops`: Supabase, Vercel, email routing, monitoring, or owner process issue.
- `safety-boundary`: The experience may imply AI sketch delivery, CAD approval,
  pricing, payment, order creation, production approval, gallery approval,
  shipping, or customer delivery.
- `privacy`: Private data may be exposed or captured in the wrong place.
- `duplicate`: Similar feedback already exists.
- `other`: Use only when none of the above fit.

## 7. Stop / pause testing triggers

Pause private testing before inviting more testers if any of these happen:

- A tester sees a submitted confirmation when the owner cannot confirm receipt.
- The submission response is suspected to be `202` with `persisted: false`.
- Supabase may be paused, unreachable, or unhealthy.
- The owner does not receive expected admin notification for a confirmed
  submitted brief.
- Protected admin review cannot load a confirmed submitted brief.
- A page implies CAD approval, quote approval, payment, order creation,
  production approval, gallery approval, shipping, or customer delivery.
- A page implies automated customer-facing AI sketch generation or delivery.
- A tester shares the private test publicly.
- Private customer data, protected admin data, raw logs, provider details, or
  secrets may have been exposed.
- More than one tester has the same serious confusion about whether NOVORA
  received the brief or what happens next.

Suspected Supabase pause or `202` with `persisted: false` should be treated as
an ops blocker first, not immediately as an app code failure. Check owner-run
Supabase/Vercel health steps before assuming code is broken.

## 8. Triage decision rules

Use this order:

1. Protect private data and secrets.
2. Protect the AI sketch, CAD, payment, order, production, and customer-delivery
   boundaries.
3. Confirm whether testing must pause.
4. Decide whether the issue is ops, copy, UX, admin, notification, submission,
   or safety-boundary.
5. Decide whether it needs a Codex Agent now, a future batch, or no action.

If an issue could make a customer believe NOVORA has received an order, approved
CAD, confirmed pricing, taken payment, approved production, or promised
delivery, treat it as high priority.

Repeated tester confusion may become a UX/copy Agent even if no technical bug
exists.

No triage decision may introduce automated customer-facing AI sketch delivery,
CAD quote, payment, order, production, gallery approval, shipping, or customer
delivery behavior.

## 9. When to create a Codex Agent

Create a Codex Agent when:

- A blocker remains after owner-run ops checks.
- A safety/boundary issue appears in app copy, docs, or flow behavior.
- Multiple testers are confused by the same wording or step.
- The submitted confirmation, server persistence, public reference, or Concept
  Brief UUID behavior may be unclear.
- The admin review page or notification status may mislead the owner.
- A small batch of clear copy fixes is ready.
- The owner has sanitized all notes and can state the allowed files or scope.

Before creating an Agent, prepare:

- A sanitized summary.
- Severity and issue type.
- Exact allowed files if known.
- Clear out-of-scope list.
- Validation requested.
- Confirmation that no raw private data, secrets, protected links, IDs, payloads,
  or private screenshots are included.

## 10. When to create a PR

Create a PR only after an Agent has made a scoped change that should be reviewed
and merged.

A PR may be appropriate for:

- Docs-only clarification.
- Copy-only boundary fixes.
- Small UI wording fixes.
- Submission safety fixes.
- Admin review copy or state clarity fixes.
- Tests that confirm an approved app behavior fix.

Keep each PR narrow. A PR should not mix private testing feedback, app code,
Supabase changes, email changes, AI work, CAD work, payment work, order work,
and production workflow work unless the owner explicitly approves that exact
combined scope.

## 11. When not to create a PR

Do not create a PR when:

- The feedback is not sanitized.
- The issue may be caused by Supabase pause, Vercel health, email routing, or
  another owner-run ops condition that has not been checked.
- The owner has only one vague comment and no clear problem yet.
- The issue is a personal preference that does not affect trust, clarity, or
  safety.
- The proposed fix would add unsupported AI sketch delivery, CAD quote, payment,
  order, production, gallery approval, shipping, or customer delivery behavior.
- The owner has not approved a code change, SQL, Supabase, env, deployment,
  email, AI/image, payment, CAD, order, or production scope.

Do not create an Agent yet if the next useful action is simply to ask one tester
for a sanitized clarification or to run the owner health checklist.

## 12. Customer-facing wording issue checklist

Review customer-facing wording if testers ask:

- "Did I place an order?"
- "Did I approve CAD?"
- "Do I have a price now?"
- "Did I pay?"
- "Will NOVORA make this now?"
- "Will I receive a sketch automatically?"
- "When will it ship?"
- "Where is my gallery?"

Safe wording should say:

- NOVORA collects a Concept Brief.
- The brief is a concept direction.
- Human review is required.
- Any AI hand-drawn concept sketch remains internal-only until reviewed.
- Paid CAD, pricing, sourcing, production feasibility, and final decisions are
  separate later steps.
- Customer-facing follow-up is email-only after human review and approval.

Unsafe wording includes:

- Any promise of instant AI sketch delivery.
- Any promise of CAD approval or CAD-ready output.
- Any confirmed quote, price, payment, order, production, gallery approval,
  shipping, or delivery.

## 13. Concept Brief submission issue checklist

Pause or investigate if:

- The tester cannot submit.
- The tester sees a warning instead of the submitted confirmation page.
- The tester reaches a submitted page but the owner cannot confirm receipt.
- A suspected response is `202` with `persisted: false`.
- The submitted confirmation does not clearly depend on confirmed server
  persistence, a valid customer-visible public reference, and a valid Concept
  Brief UUID.
- The tester thinks a submitted brief means CAD, price, payment, order,
  production, shipping, or delivery.

For suspected `202` with `persisted: false`, treat the issue as an ops blocker
first. Check whether Supabase may be paused or unreachable before creating an
app-code Agent.

## 14. Admin / notification issue checklist

Pause expansion and investigate if:

- The owner cannot find a confirmed submitted brief in protected admin review.
- The owner cannot open the protected admin detail for a confirmed brief.
- Admin review status or internal notes are unclear.
- The expected owner notification email does not arrive for a confirmed
  submitted brief.
- Notification copy suggests retry, resend, or delivery guarantees that do not
  exist.
- Admin-facing copy sounds like CAD, quote, order, production, or customer
  delivery approval.

Do not include protected admin URLs, screenshots with private data, admin access
keys, message IDs, headers, cookies, or raw payloads in Agent notes.

## 15. AI sketch / human review / customer delivery safety checklist

Treat these as high priority:

- Any tester expects instant AI sketch generation.
- Any tester expects automatic customer-facing AI sketch delivery.
- Any page says or implies the AI sketch is CAD-ready, priced, production-ready,
  or approved for customer delivery.
- Any page suggests the customer can approve production from a sketch.
- Any triage suggestion would add customer-facing AI delivery, CAD quote,
  payment, order, production, gallery approval, shipping, or delivery behavior.

Safe boundary:

- AI sketch remains internal-only.
- Human review remains required.
- Customer-facing delivery remains email-only after human review and approval.
- Concept Brief submission is not CAD approval, final pricing, payment, order
  creation, production approval, gallery approval, shipping, or customer
  delivery.

## 16. Supabase / Vercel operations issue checklist

Treat as ops first if:

- Supabase Free project pause is suspected.
- The site returns a warning instead of confirmed submitted success.
- A suspected response is `202` with `persisted: false`.
- Vercel appears unhealthy or recently redeployed.
- Email monitoring is unclear.
- The owner cannot complete the owner-run health checklist.

Owner-safe next steps:

- Pause inviting new testers.
- Check the owner operating checklist.
- Confirm Supabase project health using the owner's normal dashboard process.
- Confirm Vercel Production status using the owner's normal dashboard process.
- Confirm whether one controlled test can reach submitted success only after
  owner approval.
- Record only sanitized results in this log.

Do not send Supabase project URLs, dashboard screenshots with private data,
environment values, API keys, service-role keys, provider IDs, raw logs, or
request payloads to ChatGPT or Codex.

## 17. Duplicate / repeated feedback handling

If the same issue appears again:

- Link it to the first sanitized feedback ID.
- Count how many testers hit it.
- Note whether it blocks submission, trust, or boundary clarity.
- Upgrade severity if repeated confusion affects trust or safety.
- Create a UX/copy Agent if repeated confusion continues even without a
  technical bug.

Example:

```text
Duplicate of:
[FB-003]

Tester count:
[3 private testers]

Pattern:
[Several testers thought submitted brief meant a quote would be sent
automatically.]

Decision:
[Create copy/boundary Agent before expanding private testing.]
```

## 18. Weekly feedback review template

Use this once per week during private testing.

```text
Week:
[date range]

Number of invited testers:
[number]

Number of completed submissions:
[number]

Number of submitted confirmations reached:
[number]

Any suspected 202 persisted:false or Supabase pause risk:
[yes / no / unknown]

Blockers:
[list sanitized feedback IDs]

Major issues:
[list sanitized feedback IDs]

Minor issues:
[list sanitized feedback IDs]

Copy/content issues:
[list sanitized feedback IDs]

Ops issues:
[list sanitized feedback IDs]

Safety/boundary issues:
[list sanitized feedback IDs]

Repeated confusion:
[short sanitized summary]

Owner decision:
[continue limited private testing / pause / create Agent / batch later]

Do not expand private testing until:
[conditions]
```

## 19. Example sanitized feedback entries

```text
Feedback ID:
[FB-001]

Date:
[date]

Tester:
[private tester A]

Page or step:
[submitted page]

What happened:
Tester reached a warning instead of a clear submitted confirmation.

Severity:
blocker

Issue type:
ops, submission

Owner action taken:
Paused new tester invitations. Checked owner Supabase/Vercel health steps before
asking Codex to inspect app code.

Sanitization check:
Confirmed no customer name, email, public reference, UUID, protected admin URL,
raw response, screenshot, provider ID, or secret is included.
```

```text
Feedback ID:
[FB-002]

Date:
[date]

Tester:
[private tester B]

Page or step:
[Concept Brief wording]

What happened:
Tester asked whether the submitted brief meant NOVORA would now make the ring.

Severity:
safety/boundary

Issue type:
copy, safety-boundary

Owner action taken:
Marked high priority for copy review before inviting more testers.

Sanitization check:
Confirmed only a paraphrased tester question is included.
```

```text
Feedback ID:
[FB-003]

Date:
[date]

Tester:
[private tester C]

Page or step:
[admin review follow-up]

What happened:
Owner received the submission, but the tester expected an automatic AI sketch.

Severity:
major

Issue type:
copy, UX, safety-boundary

Owner action taken:
Added to repeated-confusion watch list. Do not add automated AI sketch delivery
from triage.

Sanitization check:
Confirmed no private customer detail or admin data is included.
```

## 20. Final recommendation

Use this template to keep private testing calm, small, and owner-controlled.

NOVORA is suitable only for limited owner-controlled private testing right now.
Do not treat this log as approval for full public launch, paid traffic, broad
public traffic, automated AI sketch delivery, CAD quote automation, payment,
order creation, production approval, gallery approval, shipping, or customer
delivery.

The safest triage rule is:

"Pause first for blockers, sanitize before sharing, treat Supabase pause and
`persisted: false` as ops blockers first, protect the AI/CAD/payment/order/
production/customer-delivery boundaries, and create a Codex Agent only when the
owner has a clear sanitized scope."
