# NOVORA Agent 66B Soft-Launch Owner Operating Checklist

## 1. Purpose

This runbook gives the NOVORA owner a practical checklist for limited
owner-controlled soft-launch and private testing after Agent 66A.

It is meant to reduce the main current operational risk: Supabase Free project
pause or reachability problems that can make Concept Brief submissions fall
back to `202 persisted:false` instead of confirmed server receipt.

This runbook is not a public launch approval. It does not change NOVORA code,
Supabase, Vercel, email, AI sketching, CAD, payment, order, production, gallery,
or customer-delivery behavior.

## 2. Who This Checklist Is For

Use this checklist if you are the owner running private NOVORA tests, reviewing
soft-launch readiness, or deciding whether a small controlled testing session
can continue.

It does not require engineering access. It should not require inspecting,
copying, sharing, or pasting secrets, API keys, service-role keys, admin cookies,
protected links, full UUIDs, full public references, customer payloads, headers,
provider IDs, or customer private data.

Record only sanitized results such as:

- `Supabase status: active`
- `Vercel Production: Ready`
- `Concept Brief result: submitted page reached`
- `Admin email: arrived`
- `Protected admin detail: opened`
- `Notification status: sent`
- `Decision: continue private testing` or `Decision: pause testing`

## 3. Soft-Launch Mode Allowed

Current allowed mode:

- Private, owner-controlled testing only.
- Small invited testing only when the owner is actively monitoring the flow.
- Human review required before any customer-facing delivery.
- Customer-facing delivery remains email-only after human review and approval.
- AI sketch behavior remains internal-only.
- Concept Brief intake is not CAD approval, pricing approval, payment, order
  creation, production approval, or customer delivery.

Current not-allowed mode:

- No paid traffic.
- No broad public launch.
- No high-volume social campaign.
- No automated customer-facing AI sketches.
- No automated CAD, quote, payment, order, production, gallery, or delivery
  workflow.
- No unreviewed customer delivery.

## 4. Before Each Private Testing Session Checklist

Before each private testing session, confirm:

- [ ] The session is private and owner-controlled.
- [ ] You are not sending paid traffic or broad public traffic.
- [ ] You know which Production deployment or main commit you expect to test.
- [ ] Supabase project health has been checked and is active.
- [ ] Vercel Production is Ready on the expected main commit.
- [ ] You can receive the admin notification inbox.
- [ ] You can access the protected admin page without sharing or recording the
      access key.
- [ ] You have a clearly synthetic test customer name and email if running a
      test brief.
- [ ] You will not record full customer data, full references, UUIDs, protected
      links, cookies, headers, or payloads in notes.
- [ ] You are ready to pause immediately if persistence is not confirmed.

Suggested owner note format:

```text
Session date:
Traffic type: private owner-controlled
Supabase: active / not checked / issue
Vercel: Ready / issue
Submission smoke test: pass / fail / not run
Admin email: pass / fail / not run
Admin detail: pass / fail / not run
Decision: continue / pause
```

## 5. Supabase Health Check Checklist

Supabase is the most important pre-test health check.

Dashboard check:

- [ ] Open the Supabase dashboard from your own saved account access.
- [ ] Confirm the NOVORA Production project status is healthy / active.
- [ ] Confirm the project is not paused.
- [ ] Do not copy or paste project secrets, service-role keys, anon keys,
      database URLs, storage keys, or environment values.

Basic API reachability check:

- [ ] Open the project REST endpoint from your own saved project information.
- [ ] Do not paste the project URL into docs, chat, tickets, screenshots, or
      shared notes.
- [ ] Do not add any API key.
- [ ] A healthy unauthenticated response can be a message such as
      `No API key found in request`.
- [ ] If the endpoint does not load, times out, shows a paused-project state,
      or shows a provider availability problem, treat Supabase as unhealthy.

Decision rule:

- If Supabase is paused or unreachable, stop testing.
- Do not submit real customer briefs until Supabase is resumed/reachable and a
  synthetic test brief passes.

## 6. Vercel Production Health Check Checklist

Before testing the live flow:

- [ ] Open the Vercel project dashboard from your own account access.
- [ ] Confirm Production is Ready.
- [ ] Confirm the Production deployment is from the expected `main` commit.
- [ ] Do not copy or share deployment secrets, environment variable values, or
      provider IDs.
- [ ] If Production is building, failed, rolled back unexpectedly, or on an
      unexpected commit, pause testing until the owner understands why.

Sanitized note format:

```text
Vercel Production: Ready
Expected main commit: yes / no / unsure
Action: continue / pause
```

## 7. Concept Brief Submission Smoke Test Checklist

Run only a controlled synthetic test brief unless you are intentionally
monitoring a real invited private tester.

Pass conditions:

- [ ] The Concept Brief flow reaches `/design/submitted`.
- [ ] The page shows received/submitted confirmation only after server
      persistence is confirmed.
- [ ] The result has a valid customer-visible `NOVORA-CB-...` style reference.
- [ ] The result has a valid Concept Brief UUID internally, but you do not copy
      or share the full UUID.
- [ ] CAD / quote / payment / production boundary copy remains present.

Important failure interpretation:

- If `/api/concept-briefs` returns `202 persisted:false`, treat it as not
  confirmed server receipt.
- Check Supabase health first.
- Do not tell a customer their Concept Brief was safely received unless the
  submitted page is reached after confirmed persistence.
- If the browser shows a receipt warning or local fallback warning, pause and
  investigate before continuing.

Record only sanitized results:

```text
Submission smoke test: pass / fail
Submitted page reached: yes / no
Server receipt confirmed: yes / no
Public reference visible: valid format / not recorded
Full UUID recorded: no
```

## 8. Admin Notification Email Checklist

After a confirmed submitted-page success:

- [ ] Check the admin notification inbox.
- [ ] Confirm one notification email arrives for the test brief.
- [ ] Do not forward the email outside the owner/admin context.
- [ ] Do not copy full customer data, full public references, protected admin
      URLs, provider IDs, headers, or message IDs into shared notes.
- [ ] Record only `arrived`, `not arrived`, or `duplicate observed`.

Decision rule:

- If the admin email does not arrive but `/design/submitted` succeeded, inspect
  email notification separately after confirming persistence.
- Do not rerun, retry, resend, or change notification behavior from this
  checklist.

Sanitized note format:

```text
Admin notification email: arrived / not arrived / duplicate observed
Notification status later visible in admin: sent / not visible / not checked
```

## 9. Protected Admin Detail Checklist

After a confirmed submission:

- [ ] Open the protected admin detail from the normal owner/admin path.
- [ ] Do not share, paste, or record the protected admin URL.
- [ ] Do not share, paste, or record the admin access key or cookies.
- [ ] Confirm the protected admin detail opens.
- [ ] Confirm the Concept Brief detail is Supabase-backed.
- [ ] Confirm the visible details match the test brief at a high level without
      copying private customer data into notes.
- [ ] Confirm the admin notification status shows `sent` when available.

Sanitized pass note:

```text
Protected admin detail: opened
Supabase-backed detail: loaded
Notification status: sent
Full protected URL recorded: no
```

## 10. Admin Review Status/Internal Notes Checklist

For a new Supabase-backed Concept Brief:

- [ ] It is acceptable for the admin review area to show an empty state before
      the first saved review note.
- [ ] Empty-state copy should explain that no saved `admin_notes` review row
      exists yet, not that the Concept Brief failed to load.
- [ ] If you intentionally save an admin review status or internal note, confirm
      the save message says it was saved to Supabase admin notes.
- [ ] Do not put secrets, keys, full protected links, provider IDs, or sensitive
      customer data in internal notes.
- [ ] Do not use this checklist to change customer-facing delivery status.

Record only:

```text
Admin review state: empty state correct / saved state correct / issue
Internal notes persistence: not tested / pass / issue
```

## 11. AI Sketch And Customer Delivery Boundary Checklist

Before and during private testing, confirm:

- [ ] AI sketch remains internal-only.
- [ ] Any mock preview is clearly demo/planning only.
- [ ] No automated customer-facing AI sketch delivery is enabled.
- [ ] Human review remains required before customer-safe delivery.
- [ ] Customer delivery remains email-only after human review and approval.
- [ ] Concept Brief intake does not promise CAD-ready output.
- [ ] Concept Brief intake does not promise final quote, payment, order,
      production approval, gallery approval, shipping, or delivery.
- [ ] Boundary copy uses concepts such as concept direction, studio review,
      manual confirmation, and paid CAD later.

Pass condition:

- AI sketch remains internal-only, and CAD / quote / payment / production
  boundary copy remains visible in the customer flow.

## 12. Stop / Pause Testing Criteria

Stop or pause private testing immediately if any of these happen:

- Supabase dashboard does not show the Production project as healthy / active.
- Supabase REST reachability does not return a normal unauthenticated response.
- `/api/concept-briefs` returns `202 persisted:false`.
- The customer flow does not reach `/design/submitted` after submission.
- The page implies received/submitted confirmation without confirmed server
  persistence.
- Vercel Production is not Ready or is on an unexpected commit.
- Admin notification email does not arrive for a confirmed persisted test brief
  and the owner cannot confirm notification status separately.
- Protected admin detail does not open for a confirmed persisted test brief.
- Supabase-backed detail does not load.
- Boundary copy suggests automated AI sketch delivery, CAD approval, quote,
  payment, order, production, gallery approval, shipping, or delivery.
- You are unsure whether a real customer brief was confirmed by the server.

When paused, do not invite more testers or submit real customer briefs until the
blocking issue has a clear owner-reviewed resolution.

## 13. Recovery Steps If Supabase Is Paused Or Unreachable

If Supabase appears paused or unreachable:

1. Stop testing.
2. Do not submit real customer briefs.
3. Open the Supabase dashboard from your own saved account access.
4. Resume the Production project if the dashboard shows it is paused.
5. Wait until the dashboard shows healthy / active.
6. Run the basic unauthenticated REST reachability check.
7. Confirm the expected unauthenticated response, such as
   `No API key found in request`.
8. Run one synthetic Concept Brief smoke test.
9. Continue private testing only after the synthetic brief reaches
   `/design/submitted`, admin email arrives, protected admin detail opens, and
   Supabase-backed detail loads.

If Supabase remains unreachable after resume:

- Keep testing paused.
- Do not change Supabase schema, RLS, grants, storage, environment variables,
  or application code from this runbook.
- Escalate to a separate technical task with sanitized evidence only.

## 14. What Not To Do During Soft Launch

Do not:

- Run paid ads.
- Announce broad public launch.
- Drive large social traffic.
- Change Supabase schema, RLS, grants, policies, storage, or customer data from
  this checklist.
- Change Vercel environment variables.
- Change Resend, Cloudflare, email routing, or notification retry/resend
  behavior.
- Inspect, copy, paste, screenshot, or share secrets or environment values.
- Share protected admin links, admin keys, cookies, full UUIDs, full public
  references, customer payloads, headers, provider IDs, or customer private
  data.
- Send unreviewed customer-facing AI sketches.
- Tell customers that a Concept Brief is CAD-ready, quoted, paid, ordered,
  approved for production, or ready for delivery.
- Add or imply automated CAD, quote, payment, order, production, gallery, or
  customer-delivery behavior.

## 15. Weekly Owner Review Checklist

Once per week during private testing:

- [ ] Confirm Supabase Production project is healthy / active.
- [ ] Confirm Vercel Production is Ready on the expected main commit.
- [ ] Review the number of private test submissions at a high level.
- [ ] Confirm admin notification emails are arriving for confirmed submissions.
- [ ] Confirm protected admin details open for recent test submissions.
- [ ] Confirm admin review empty-state or saved-state copy is correct.
- [ ] Confirm no unreviewed customer delivery occurred.
- [ ] Confirm AI sketch remains internal-only.
- [ ] Confirm CAD / quote / payment / production boundary copy remains present.
- [ ] Decide whether to continue, pause, or plan infrastructure upgrades before
      more testing.

Suggested weekly decision note:

```text
Week:
Supabase health: pass / issue
Vercel health: pass / issue
Private test flow: pass / issue
Admin notification: pass / issue
Admin detail: pass / issue
Boundary copy: pass / issue
Decision: continue private testing / pause / upgrade planning needed
```

## 16. Go/No-Go Decision Template

Use this template before each private testing session or weekly review.

```text
Decision date:
Decision owner:

Supabase project active/healthy: yes / no / unsure
Vercel Production Ready on expected main commit: yes / no / unsure
Test Concept Brief reaches submitted page: yes / no / not run
Admin notification email arrives: yes / no / not run
Protected admin detail opens: yes / no / not run
Supabase-backed detail loads: yes / no / not run
Admin review empty state or saved state copy correct: yes / no / not run
AI sketch remains internal-only: yes / no / unsure
CAD/quote/payment/production boundary copy present: yes / no / unsure

Decision:
- GO for private owner-controlled testing only
- NO-GO / pause testing

Reason:
Next owner action:
```

GO for private owner-controlled testing only if all required checks are `yes` or
intentionally `not run` for a non-submission review session.

NO-GO / pause testing if Supabase is paused or unreachable, Vercel Production is
not Ready, server receipt is not confirmed, admin detail cannot load, or product
boundary copy is wrong.

## 17. Final Operating Recommendation

NOVORA is suitable only for limited owner-controlled soft-launch / private
testing at this stage.

Full public launch, paid traffic, broad public traffic, automated
customer-facing AI sketch delivery, CAD automation, quote automation, payment,
order creation, production approval, gallery approval, shipping, and customer
delivery automation are not recommended.

The owner should check Supabase health before each private testing session and
pause immediately if Supabase is paused, unreachable, or if
`/api/concept-briefs` returns `202 persisted:false`.

Private testing can be considered PASS only when:

- Supabase project is active/healthy.
- Vercel Production is Ready on the expected main commit.
- A test Concept Brief reaches the submitted page.
- Admin notification email arrives.
- Protected admin detail opens.
- Supabase-backed Concept Brief detail loads.
- Admin review empty-state or saved-state copy is correct.
- AI sketch remains internal-only.
- CAD / quote / payment / production boundary copy remains present.

If any required check fails, pause testing and resolve the operational issue
before accepting additional real customer submissions.
