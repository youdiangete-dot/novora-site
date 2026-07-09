# NOVORA Agent 66E Private Testing Round 1 Execution Log Template

## 1. Purpose

This template helps the NOVORA owner run and record Round 1 of limited private
testing.

Use it only for a small, owner-controlled private test. It is not a public
launch plan, paid traffic tracker, customer support system, order tracker, CAD
approval log, production log, or customer delivery tracker.

The goals are:

- Confirm the owner is ready before inviting testers.
- Track each private tester with safe placeholder labels only.
- Check that submitted confirmation, admin notification, protected admin detail,
  and admin review save behavior are working.
- Capture feedback in a sanitized way.
- Pause quickly if a blocker or boundary confusion appears.

## 2. Round 1 scope

Round 1 should stay small, private, owner-controlled, and reversible.

Allowed:

- A small number of trusted private testers.
- One-to-one invitations using the Agent 66C wording pack.
- Normal Concept Brief intake testing.
- Owner checks for submitted confirmation, admin notification, protected admin
  detail loading, and admin review save behavior.
- Sanitized feedback logging using the Agent 66D template.

Not allowed:

- Public launch.
- Paid traffic.
- Broad public traffic.
- Influencer or open social sharing.
- Automated customer-facing AI sketch delivery.
- CAD approval, quote approval, payment, order creation, production approval,
  gallery approval, shipping, or customer delivery promises.
- Sharing raw private data, protected links, IDs, secrets, logs, payloads, or
  private screenshots with ChatGPT, Codex, or public docs.

## 3. Round 1 entry conditions

Start Round 1 only if every item is true.

| Entry condition | Owner check | Result |
| --- | --- | --- |
| Supabase project is active and healthy | Owner checked normal Supabase health process | [yes / no] |
| Vercel Production is Ready on expected `main` commit | Owner checked normal Vercel dashboard process | [yes / no] |
| No known submission blocker | No current `202 persisted:false`, warning-only receipt, or failed submission blocker | [yes / no] |
| Private tester count is small | Only personally selected trusted testers are invited | [yes / no] |
| Invitation copy is safe | Uses Agent 66C wording and says private testing only | [yes / no] |
| Feedback process is ready | Uses Agent 66D sanitized feedback template | [yes / no] |
| Owner can pause quickly | Owner is ready to stop new invitations if any blocker appears | [yes / no] |

Round 1 start decision:

```text
Round 1 start date:
[date]

Owner decision:
[start / do not start]

Reason:
[short sanitized owner note]
```

## 4. Round 1 stop conditions

Pause new tester invitations immediately if any item happens.

| Stop condition | Severity | Owner action |
| --- | --- | --- |
| Supabase is paused, unreachable, or suspected unhealthy | blocker / ops | Pause invitations and treat as an ops blocker first |
| `/api/concept-briefs` returns or appears to return `202 persisted:false` | blocker / ops | Pause invitations and check Supabase/Vercel health before creating a code task |
| Submitted confirmation is not reached | blocker / submission | Pause and record sanitized details |
| Receipt warning appears instead of confirmed success | blocker / submission / ops | Pause and treat as not confirmed |
| Admin notification is missing after confirmed persistence | blocker / notification | Pause expansion and investigate owner email/admin checks |
| Protected admin detail cannot open for a confirmed brief | blocker / admin | Pause expansion and investigate |
| Private data, protected link, raw log, provider detail, or secret exposure risk appears | blocker / privacy | Stop sharing, sanitize, and contain the exposure |
| AI, CAD, payment, order, production, gallery, shipping, or customer-delivery boundary confusion appears | high priority / safety-boundary | Pause or keep very limited until copy/UX is corrected |
| Tester shares the link publicly | blocker / private-test-boundary | Pause invitations and ask tester to remove or stop sharing |

Stop log:

```text
Stop event ID:
[STOP-001]

Date:
[date]

Trigger:
[stop condition]

Testing paused:
[yes / no]

Owner action:
[short sanitized action]

Next safe step:
[ops check / copy review / admin check / create sanitized Agent / wait]
```

## 5. Owner preflight checklist

Complete this before sending any Round 1 invitation.

| Preflight item | Pass? | Owner note |
| --- | --- | --- |
| Supabase project is active and healthy | [yes / no] | [placeholder] |
| Vercel Production is Ready on expected `main` commit | [yes / no] | [placeholder] |
| No known submission blocker | [yes / no] | [placeholder] |
| No current suspected `202 persisted:false` behavior | [yes / no] | [placeholder] |
| Private tester list is small and owner-approved | [yes / no] | [placeholder] |
| Tester invitation uses Agent 66C wording | [yes / no] | [placeholder] |
| Feedback will be logged with Agent 66D template | [yes / no] | [placeholder] |
| Owner understands this is private testing only | [yes / no] | [placeholder] |
| Owner will pause invitations if any blocker appears | [yes / no] | [placeholder] |

Preflight decision:

```text
Preflight date:
[date]

Decision:
[go / pause]

Owner note:
[short sanitized note]
```

## 6. Tester invitation tracker

Use tester labels only. Do not write real names, emails, phone numbers, country,
or private profile details in this log.

| Tester label | Invited date | Invitation copy used | Link kept private? | Completed? | Owner note |
| --- | --- | --- | --- | --- | --- |
| [tester A] | [date] | [Agent 66C short DM / Agent 66C email] | [yes / no] | [yes / no] | [sanitized note] |
| [tester B] | [date] | [Agent 66C short DM / Agent 66C email] | [yes / no] | [yes / no] | [sanitized note] |
| [tester C] | [date] | [Agent 66C short DM / Agent 66C email] | [yes / no] | [yes / no] | [sanitized note] |

## 7. Per-tester execution log

Copy one block per tester. Keep it sanitized.

```text
Tester label:
[tester A]

Invited date:
[date]

Completed:
[yes / no]

Submitted confirmation reached:
[yes / no]

Receipt warning appeared:
[yes / no]

Admin notification received:
[yes / no / not applicable]

Protected admin detail opened:
[yes / no / not applicable]

Admin review save tested:
[yes / no / not applicable]

Feedback severity:
[none / minor / major / blocker / copy-content / ops / safety-boundary]

Owner action:
[continue / pause / ask tester sanitized follow-up / create Agent / batch later]

Sanitized notes:
[short note with no real customer data, full publicReference, UUID, protected URL,
raw logs, provider IDs, screenshots, or secrets]
```

## 8. Submission confirmation checklist

Use this after each tester submits.

| Check | Result | Owner note |
| --- | --- | --- |
| Tester reached submitted confirmation page | [yes / no] | [placeholder] |
| No receipt warning appeared | [yes / no] | [placeholder] |
| Owner has no reason to suspect `202 persisted:false` | [yes / no] | [placeholder] |
| Confirmation was not treated as CAD, quote, payment, order, production, or delivery approval | [yes / no] | [placeholder] |
| Sanitized result recorded | [yes / no] | [placeholder] |

If the submitted confirmation is not reached, or a receipt warning appears, do
not assume NOVORA received the Concept Brief. Pause new invitations until the
owner understands the issue.

## 9. Admin notification checklist

Use this only after confirmed submitted success.

| Check | Result | Owner note |
| --- | --- | --- |
| Owner received expected admin notification | [yes / no] | [placeholder] |
| Notification matched the tester label in a sanitized way | [yes / no] | [placeholder] |
| No resend or retry action was taken unless separately approved | [yes / no] | [placeholder] |
| No Resend message ID or provider detail was copied into this log | [yes / no] | [placeholder] |
| Missing notification was treated as a pause condition | [yes / no / not applicable] | [placeholder] |

Do not include real email addresses, full public references, message IDs,
headers, cookies, provider IDs, or screenshots with private data.

## 10. Protected admin detail checklist

Use this only after confirmed submitted success.

| Check | Result | Owner note |
| --- | --- | --- |
| Protected admin detail opened | [yes / no] | [placeholder] |
| Detail matched the submitted tester label | [yes / no] | [placeholder] |
| Concept Brief data appeared complete enough for owner review | [yes / no] | [placeholder] |
| Admin notification status was clear | [yes / no / not applicable] | [placeholder] |
| No protected admin URL was copied into this log | [yes / no] | [placeholder] |
| No admin key, cookie, header, or private screenshot was copied into this log | [yes / no] | [placeholder] |

If protected admin detail cannot open for a confirmed submitted brief, pause new
invitations.

## 11. Admin review save checklist

Use this if the owner intentionally tests admin review status or internal notes
for a Round 1 test brief.

| Check | Result | Owner note |
| --- | --- | --- |
| Admin review save was necessary for this tester | [yes / no] | [placeholder] |
| Review status/internal note save was tested | [yes / no / not applicable] | [placeholder] |
| Saved state appeared after save | [yes / no / not applicable] | [placeholder] |
| No customer-facing delivery was triggered by the save | [yes / no] | [placeholder] |
| No private internal note was copied into this log | [yes / no] | [placeholder] |

Admin review save is an owner review check only. It is not CAD approval, quote
approval, payment approval, order approval, production approval, gallery
approval, shipping, or customer delivery.

## 12. AI sketch / customer delivery boundary checklist

Complete this during each daily review.

| Boundary check | Clear? | Owner note |
| --- | --- | --- |
| Tester did not expect instant AI sketch generation | [yes / no] | [placeholder] |
| Tester did not expect automated customer-facing sketch delivery | [yes / no] | [placeholder] |
| Tester understood human review is required | [yes / no] | [placeholder] |
| Tester understood customer-facing follow-up is email-only after review and approval | [yes / no] | [placeholder] |
| Tester did not think the Concept Brief was CAD approval | [yes / no] | [placeholder] |
| Tester did not think the Concept Brief created a quote, payment, order, production approval, shipping, or delivery | [yes / no] | [placeholder] |

Treat AI/CAD/payment/order/production/customer-delivery confusion as high
priority, even when the fix may be wording-only.

## 13. Feedback capture checklist

Use the Agent 66D feedback template for detailed feedback. This Round 1 log
should only contain short sanitized summaries.

| Feedback check | Result | Owner note |
| --- | --- | --- |
| Feedback was written in plain language | [yes / no] | [placeholder] |
| Real customer data was removed | [yes / no] | [placeholder] |
| Full public references and UUIDs were removed | [yes / no] | [placeholder] |
| Protected admin links were removed | [yes / no] | [placeholder] |
| Raw logs, headers, cookies, payloads, provider IDs, and secrets were removed | [yes / no] | [placeholder] |
| Private screenshots were omitted or safely redacted before any sharing | [yes / no] | [placeholder] |
| Severity was assigned | [yes / no] | [placeholder] |
| Owner action was assigned | [yes / no] | [placeholder] |

## 14. Issue escalation rules

Use these rules before creating any new Codex Agent or PR.

- If any blocker appears, pause new tester invitations.
- If suspected Supabase pause or `202 persisted:false` appears, treat it as an
  ops blocker first.
- If submitted confirmation is not reached, do not assume receipt.
- If admin notification is missing after confirmed persistence, pause expansion.
- If protected admin detail cannot open, pause expansion.
- If private data, protected links, secrets, logs, payloads, provider IDs, or
  private screenshots may be exposed, stop and sanitize before sharing.
- If repeated tester confusion appears, create a copy/UX Agent before expanding.
- If AI/CAD/payment/customer-delivery boundary confusion appears, treat it as
  high priority.
- Do not create code PRs from vague unsanitized feedback.
- Do not use a code Agent to solve an owner-run ops issue until basic owner
  health checks are complete.

Escalation decision:

```text
Issue ID:
[ISSUE-001]

Severity:
[blocker / major / minor / copy-content / ops / safety-boundary]

Testing status:
[continue small round / pause invitations]

Owner action:
[ops check / sanitized feedback request / docs Agent / copy UX Agent / app code Agent / batch later]

Reason:
[short sanitized reason]
```

## 15. Daily owner summary template

Use this at the end of each private testing day.

```text
Date:
[date]

Invited testers today:
[number]

Total invited testers:
[number]

Completed submissions today:
[number]

Total completed submissions:
[number]

Submitted confirmations reached:
[number]

Receipt warnings appeared:
[number]

Admin notifications received:
[number]

Protected admin details opened:
[number]

Admin review saves tested:
[number / not applicable]

Blockers:
[none / sanitized issue IDs]

Major issues:
[none / sanitized issue IDs]

Safety-boundary issues:
[none / sanitized issue IDs]

Ops issues:
[none / sanitized issue IDs]

Repeated confusion:
[none / short sanitized pattern]

Owner decision for tomorrow:
[continue small private test / pause / invite no one / create sanitized Agent / batch fixes]
```

## 16. Round 1 completion criteria

Round 1 is complete only when the owner can answer yes to all required items.

| Completion criterion | Required? | Result |
| --- | --- | --- |
| Small number of invited testers completed | yes | [yes / no] |
| No active blockers remain | yes | [yes / no] |
| Submitted confirmations were reached for completed valid submissions | yes | [yes / no] |
| No unresolved `202 persisted:false` or receipt-warning issue remains | yes | [yes / no] |
| Admin emails were received for confirmed persisted submissions | yes | [yes / no] |
| Protected admin details opened for confirmed submissions | yes | [yes / no] |
| Admin review save behavior was checked when needed | yes | [yes / no / not applicable] |
| Feedback was sanitized | yes | [yes / no] |
| No unresolved AI/CAD/payment/order/production/customer-delivery confusion remains | yes | [yes / no] |
| Owner selected continue, pause, or batch fixes | yes | [yes / no] |

## 17. Round 1 go / pause / continue decision template

Use this after reviewing all logs.

```text
Decision date:
[date]

Round 1 decision:
[continue limited private testing / pause / batch fixes before more testers]

Reason:
[short sanitized reason]

Active blockers:
[none / sanitized issue IDs]

Ops risks:
[Supabase pause risk / Vercel health concern / notification concern / none]

Copy or UX risks:
[short sanitized summary / none]

AI/CAD/payment/order/production/customer-delivery boundary risks:
[short sanitized summary / none]

Owner next step:
[continue small group / stop invitations / create sanitized Agent / owner ops check / wait]
```

Decision rules:

- Choose `pause` if any blocker remains.
- Choose `pause` if Supabase is paused, unreachable, or suspected unhealthy.
- Choose `pause` if `202 persisted:false` appears or is suspected.
- Choose `pause` if submitted confirmation, admin notification, or protected
  admin detail checks fail.
- Choose `batch fixes before more testers` if repeated confusion appears.
- Choose `continue limited private testing` only when the round is small,
  controlled, sanitized, and no blocker or unresolved boundary confusion remains.

## 18. Sanitization rules

This log must use placeholders only.

Do not include:

- Real customer email.
- Real customer name.
- Phone number or country.
- Full `publicReference`.
- Concept Brief database UUID.
- Protected admin URL.
- Supabase project URL.
- Service role key.
- API key.
- Resend message ID.
- Headers.
- Cookies.
- Raw request or response payload data.
- Provider IDs.
- Private screenshots.
- Full customer messages.
- Internal notes containing private data.

Use placeholders:

- `[tester A]`
- `[email removed]`
- `[public reference removed]`
- `[uuid removed]`
- `[admin link removed]`
- `[provider id removed]`
- `[screenshot omitted]`
- `[private note summarized]`

Before sharing any Round 1 notes with ChatGPT, Codex, a contractor, or a public
document, re-check the notes for private data and secrets.

## 19. Example sanitized Round 1 log

```text
Round:
[Round 1]

Date range:
[date] to [date]

Owner:
[NOVORA owner]

Tester summary:
- [tester A]: completed, submitted confirmation reached, admin notification
  received, protected admin detail opened, feedback minor.
- [tester B]: completed, receipt warning appeared, testing paused.
- [tester C]: not invited yet because testing paused.

Stop events:
- [STOP-001]: [tester B] saw receipt warning. Owner paused new invitations and
  treated it as an ops blocker first.

Feedback summary:
- [FB-001]: [tester A] said one form step was slightly unclear. Severity minor.
- [FB-002]: [tester B] did not reach confirmed submitted success. Severity
  blocker / ops.

Sanitization check:
Confirmed this log has no real names, real emails, phone/country details, full
public references, UUIDs, protected admin URLs, Supabase URLs, provider IDs,
headers, cookies, payloads, secrets, or private screenshots.

Owner decision:
[pause new invitations until Supabase/Vercel health and submission confirmation
are checked]
```

## 20. Final recommendation

Keep Round 1 small, owner-controlled, private, and reversible.

Passing Round 1 does not mean NOVORA is ready for full public launch, paid
traffic, broad public traffic, automated customer-facing AI sketch delivery,
CAD/quote/payment/order/production automation, gallery approval, shipping, or
customer delivery.

Broader public launch still requires a Supabase reliability plan, monitoring,
and separate owner approval. Supabase Free project pause remains an operational
risk, so the owner should keep health checks and stop conditions active during
all limited private testing.
