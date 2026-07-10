# NOVORA MVP Internal QA Runbook

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

This runbook defines how to perform internal QA on current `main` before any
limited external beta decision.

This is an internal QA runbook only. It is not public launch approval, not
limited external beta approval, and not permission to mutate Production. No
Production mutation, protected admin access, real email send, customer-data
inspection, SQL, Supabase, Vercel, provider, deploy, or environment action is
allowed unless a separate owner-approved task explicitly authorizes that exact
action.

Use this runbook to gather internal evidence, identify blockers, and prepare
targeted follow-up PRs or owner decisions.

## 2. Current Release-Readiness Baseline

Use current `main` and `docs/novora-current-project-state.md` as the durable
source of truth. If this runbook conflicts with the ledger or current `main`,
the ledger and current `main` win.

Current baseline for this internal QA pass:

- Agent 56F completed the QA / release readiness checklist work for the
  non-SQL MVP.
- Agent 57A / Agent 57B completed real SketchGallery asset replacement and
  visual polish, per the Agent 60B task context.
- Agent 58A normalized gallery thumbnail presentation.
- Agent 59A homepage visual consistency audit passed with minor notes, per the
  Agent 60B task context.
- Agent 60A completed a read-only NOVORA MVP beta release readiness audit with
  result: `READY FOR INTERNAL QA`.
- Current `main` includes merge commit
  `26cfa3e2f36e6c3265612318ce890ca35238d513`.

This baseline does not approve limited external beta. It means internal QA may
begin if the repository preflight is clean and the QA boundary is understood.

## 3. Preflight

Run these checks before internal QA:

| Check | Expected result | Pass / fail | Notes |
| --- | --- | --- | --- |
| `git branch --show-current` | Current branch is `main` before creating the QA runbook or QA execution branch |  |  |
| `git status --short` | Working tree is clean before branch creation or QA execution |  |  |
| `git fetch origin` | Remote refs are current |  |  |
| `git merge-base --is-ancestor 26cfa3e2f36e6c3265612318ce890ca35238d513 main` | Exit code `0` |  |  |
| `git merge-base --is-ancestor 26cfa3e2f36e6c3265612318ce890ca35238d513 origin/main` | Exit code `0` |  |  |

Stop if the worktree is not clean, if `main` is not current enough to include
the required merge commit, or if the QA task would require any forbidden action.

## 4. QA Scope

Internal QA should cover these areas without mutating Production data:

- Homepage: page load, positioning, visual consistency, and paths into the
  Concept Brief flow.
- CTA behavior: public CTAs route to allowed intake pages and do not imply
  payment, quote, CAD, order, or production approval.
- `/design/start`: start-page clarity, realistic customer expectations, and
  route continuity.
- `/design/concept`: guided concept direction, option clarity, planning-only
  reference behavior, validation, and continuation to brief.
- `/design/brief`: contact fields, final reference upload expectations,
  validation messaging, submission boundary, and fallback clarity.
- `/design/submitted`: receipt clarity after confirmed submission, next-step
  expectations, public reference visibility, and safe follow-up language.
- Public gallery / SketchGallery: real asset presentation, thumbnail
  consistency, inspiration-only framing, and no customer approval implication.
- Customer-facing sketch preview route, especially `/design/sketch`: confirm
  the route is not treated as current MVP customer delivery of real or
  unreviewed AI output.
- Admin brief list/detail: verify only the protected/admin-only expectation
  from source or owner-approved local access. Do not access protected
  Production admin pages with real credentials under this runbook.
- Email notification assumptions: confirm expected operating assumptions from
  source/docs only. Do not send real email unless a separate owner-approved task
  explicitly authorizes it.
- Reference image upload expectations: verify copy and source expectations
  without mutating Production data. Do not inspect or upload Production
  customer files under this runbook.

If an internal QA execution needs local browser interaction, use local or
non-Production environments unless a separate owner-approved task names a
Production boundary, synthetic data rules, and evidence redaction rules.

## 5. Pass / Fail Checklist

Use `pass`, `fail`, `blocked`, `not run`, or `deferred by owner`.

| Area | Pass criteria | Result | Evidence / notes |
| --- | --- | --- | --- |
| Copy clarity | Public copy is understandable and does not overstate current MVP capability |  |  |
| Concept-only positioning | Customer understands the flow captures a Concept Brief / concept direction first |  |  |
| No CAD promise | Public flow does not imply CAD is generated, approved, or included during intake |  |  |
| No quote promise | Public flow does not imply an instant or final quotation |  |  |
| No order promise | Public flow does not create or imply a final order |  |  |
| No production approval promise | Public flow does not imply production approval, manufacturability approval, or production start |  |  |
| No unreviewed AI draft delivery promise | Public flow does not promise instant or automatic delivery of unreviewed AI output |  |  |
| Human review boundary | Customer-safe concept direction remains subject to human studio review |  |  |
| Email-only customer sketch delivery | Any customer sketch delivery expectation is after human approval and by email only |  |  |
| Customer flow clarity | Customer can understand start, concept, brief, and submitted states |  |  |
| Admin review boundary | Admin review remains protected/internal and not exposed as public customer data |  |  |
| Mobile usability | Key pages have no obvious overlap, clipping, broken controls, or unreadable states on mobile |  |  |
| Visual consistency | Homepage, CTAs, gallery, and flow pages feel consistent with NOVORA's studio positioning |  |  |
| Legal/footer expectation | Footer/legal expectations do not imply final Privacy / Terms pages are published if they are not |  |  |
| Rate-limit risk acknowledgement | QA notes that Production rate-limit enforcement remains intentionally fail-open |  |  |
| Privacy / Terms status | QA notes draft legal status and any remaining placeholder or owner/legal review need |  |  |
| Fallback operations | Manual fallback paths are understood for admin review, customer follow-up, and known limitations |  |  |

Fail if any public path implies instant AI sketch delivery, CAD-ready output,
final quote, payment, order confirmation, production approval, or customer
access to unreviewed internal material.

## 6. High-Priority Issues Before Limited External Beta

These items were carried forward from Agent 60A. Internal QA can proceed, but
limited external beta should not proceed until the owner makes explicit
decisions for each item.

| Item | Why it matters | Internal QA impact | External beta impact | Recommended owner decision before limited beta |
| --- | --- | --- | --- | --- |
| Public `/design/sketch` is still reachable from the submitted page as `View Mock Sketch Preview` | A customer-visible preview route can blur the boundary between mock preview, real AI output, and human-reviewed delivery | QA must inspect this as a known risk and confirm no unreviewed real AI output is exposed | External testers may misunderstand the current MVP as offering customer web sketch delivery | Decide whether to remove/hide the link, reframe the route, or explicitly accept the mock-preview risk for beta |
| Final public Privacy / Terms pages are not published; draft legal review pages exist, and privacy draft still contains a placeholder privacy contact line per Agent 60A | Public beta creates legal and trust expectations around data, uploads, contact, and service boundaries | QA should record draft/legal status and avoid treating drafts as final policy | External testers may expect final Privacy / Terms pages and a usable privacy contact | Approve final legal copy, publish final pages, and confirm privacy contact before beta or explicitly accept a narrow invite-only risk |
| Production rate-limit enforcement remains intentionally fail-open | Public submission endpoint can accept repeated or abusive traffic if provider enforcement is absent/unavailable | QA should acknowledge this risk without changing providers or env vars | External beta may create spam, noisy admin email, extra Supabase rows, and operational load | Decide whether quiet invite-only beta can proceed fail-open or enable a Production-dedicated rate-limit provider in a separate approved task |
| Limited-beta operating ownership is not locked | Human review, admin queue cadence, admin email fallback, and customer-safe email sender need explicit ownership | QA should verify operating assumptions from docs/source and record unknowns | External testers need reliable follow-up and safe customer communication | Name the human reviewer, review cadence, admin email fallback, customer-safe sender, and escalation owner before beta |

## 7. Internal QA Evidence Log Template

Use this table for each QA run. Do not include secrets, admin keys, service-role
keys, protected signed URLs, private customer data, or raw Production records.

| Date | Tester | Environment | Page / flow | Expected result | Actual result | Pass / fail | Notes | Follow-up issue / PR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  | Local / Preview / Production-approved / Source-only |  |  |  |  |  |  |

Evidence should be redacted and scoped. Screenshots or notes must not expose
admin credentials, protected customer data, private file URLs, provider secrets,
or real customer submissions.

## 8. Stop Conditions

Stop internal QA and create a blocker report if any of these occur:

- A customer-facing route implies instant AI generation, CAD generation, final
  quote, order creation, payment, production approval, or production start.
- An unreviewed AI draft, internal sketch, prompt, raw design spec, internal
  instruction, reviewer note, admin note, provider metadata, or private storage
  path appears customer-facing.
- The customer submission path appears broken, shows false success, loses
  required information, or reaches submitted confirmation without confirmed
  persistence requirements.
- Admin-only data, protected brief detail, internal notes, notification status,
  private references, or customer contact data appears public.
- A legal/privacy placeholder appears public in a way that would confuse users
  into believing final legal pages or final legal approval exist.
- Continuing QA would require Production mutation, SQL, Supabase changes,
  Vercel env changes, provider configuration, real email sending, protected
  admin access with real credentials, customer-data inspection, deployment, or
  any other action not explicitly owner-approved outside this runbook.

When a stop condition is hit, record the page/flow, expected result, actual
result, risk, and recommended follow-up PR or owner decision. Do not continue by
working around the boundary.

## 9. Recommended Next Step After Internal QA

Choose the next path based on QA evidence:

- If internal QA passes: create targeted fix PRs for the high-priority external
  beta items before any limited beta decision.
- If blockers are found: create one or more focused fix PRs for the blockers
  and rerun the affected internal QA checks.
- If only known limitations remain: the owner decides whether to proceed to
  limited beta after explicitly accepting the risks and assigning operating
  ownership.

This runbook does not mark any PR ready, merge any PR, deploy Production, send
email, touch customer data, or approve public beta.
