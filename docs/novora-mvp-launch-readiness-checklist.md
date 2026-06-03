# NOVORA MVP Launch Readiness Checklist

## 1. Purpose And Decision Boundary

This checklist helps the NOVORA owner distinguish:

- what is ready for quiet, owner-controlled MVP testing;
- what can remain deferred during that narrow stage;
- what should be fixed before public, social, or paid traffic; and
- what must stop any launch if it is broken.

This is a planning and documentation artifact. It does not approve launch,
commercial readiness, broader traffic, or any Production operation.

Evidence base:

- `docs/novora-current-project-state.md` on `main` at
  `197960a059a4fd0d9fb2ab9db424f83ab9a41f83`;
- `docs/novora-production-security-runbook.md`;
- the public API abuse-control planning and Production rate-limit decision docs;
- the current customer submission, protected admin review, upload, notification,
  and server-only helper code; and
- previously recorded controlled Production and Preview verification.

Agent 29A did not access Production, open protected admin pages, ask for or use
an admin access key, create a Production submission, send email, or mutate data.

## 2. Current Verified Production Capabilities

| Capability | Current status | Evidence and limits |
| --- | --- | --- |
| Concept Brief submission persistence | Verified in Production | Agent 28B recorded one synthetic no-image submission, `NOVORA-CB-20260602-CLJR`, with API `201`, `persisted: true`, a valid customer-visible `publicReference`, and a valid Concept Brief UUID. |
| Customer receipt gate behavior | Implemented and positive path verified in Production | PR #84 requires confirmed server persistence, a valid `NOVORA-CB-...` public reference, and a valid Concept Brief UUID before `/design/submitted` shows received/submitted confirmation. Agent 28B reached the receipt page only after that confirmed response. Local fallback preserves recovery state but must not impersonate receipt. |
| Admin email notification | Verified in Production as best-effort notification | Agent 28B passively confirmed the normal Gmail admin notification for `NOVORA-CB-20260602-CLJR`. Earlier verification recorded durable idempotency: one notification event, duplicate route calls skipped, and sent/failed event status persistence. Notification failure remains non-blocking for customer submission. |
| Protected admin list visibility | Verified in Production read-only | Agent 28C confirmed the existing synthetic brief appeared in `/admin/briefs` as a Supabase submission after the user manually entered the admin access key in browser UI only. |
| Protected admin detail visibility | Verified in Production read-only | Agent 28C confirmed `/admin/briefs/NOVORA-CB-20260602-CLJR`, matching public reference, API source, visible contact summary, and visible sent notification status. |
| Final reference upload | Implemented; earlier controlled verification recorded | Final optional upload on `/design/brief` stores files in Supabase Storage and metadata in Supabase. Agent 23B recorded that one-image submission and protected Open reference worked. Current code caps each attempt at 3 files, 5 MB per file, and JPG/PNG/WebP browser MIME types. Upload-token, signature, dimension, and durable abuse controls remain deferred. |
| Protected reference opening | Implemented; earlier controlled verification recorded | Admin reference opening is gated by the admin access cookie and redirects to a short-lived signed URL. |
| Admin review status and internal notes | Implemented with Supabase persistence path; not re-verified by Agent 28C mutation | The ledger records that `admin_notes` exists and persists admin review status and internal notes. Current protected admin code can save Supabase-backed state after valid admin access, with local-only fallback when unavailable. Agent 28C intentionally performed read-only verification and did not change status or notes. |
| Project-quality guidance | Present on `main` | PR #85 merged the customer submission integrity skill, Codex learning-loop skill, `AGENTS.md` updates, and ledger updates. The ledger remains the durable source of truth. |

## 3. Explicit Non-Goals And Not Implemented

These items are not part of the current MVP launch claim:

- Payment collection or payment processing.
- Full authentication or customer accounts.
- Customer portal.
- Real AI sketch generation.
- CAD automation or CAD approval workflow.
- Automated quote or pricing engine.
- Real order system.
- Production job management or fulfillment workflow.
- Customer confirmation email workflow.
- Production-dedicated rate-limit provider enforcement.
- Turnstile, CAPTCHA, or equivalent bot verification.
- Full admin authentication, roles, audit logging, or account lifecycle.
- Automated admin-notification retry or resend tooling.
- Automated backup, export, deletion, or data-retention workflow.

The current Concept Brief is an intake record for manual review. It is not a
final order, final quote, CAD approval, sourcing confirmation, payment
confirmation, or production confirmation.

## 4. Launch Readiness Categories

### Ready For Quiet MVP / Owner-Controlled Soft Testing

The following are usable only for low-volume, owner-controlled testing with
manual oversight:

- Guided Concept Brief intake and Supabase persistence.
- Truthful customer receipt gating after confirmed persistence.
- Best-effort admin notification email with durable idempotency events.
- Protected admin list and detail review using the temporary admin access-key
  model.
- Optional final reference upload for controlled use, with existing basic
  file-count, MIME, and per-file size caps.
- Manual offline follow-up for sketch direction, CAD discussion, pricing,
  sourcing, and production decisions.

### Acceptable MVP Deferral

These are acceptable deferrals only while traffic is quiet and owner-controlled:

- Payment, orders, customer accounts, and a customer portal.
- Real AI generation and CAD automation.
- Automated quote, pricing, production, and fulfillment workflows.
- Full admin authentication and role management, if the temporary key remains
  tightly controlled.
- Automated notification retry/resend, if the owner checks the admin queue
  manually.

### Should Fix Before Public / Social / Paid Traffic

Complete or explicitly approve these before formal public promotion, larger
social traffic, paid ads, or materially increased submissions:

- Enable a Production-dedicated rate-limit provider using the approved Option C
  direction. Do not reuse the Preview keyspace.
- Add Turnstile or equivalent server-verified bot protection.
- Harden public reference upload with a server-issued short-lived upload token,
  durable attempt caps, and stronger file checks.
- Harden the public admin-notification trigger or move notification invocation
  into a trusted server-side path.
- Publish reviewed privacy, contact, and custom-order boundary copy, including
  reference-image and data-retention handling.
- Define an admin operational SOP for queue review, failed notification checks,
  manual follow-up, incident response, and synthetic Production test data.
- Decide backup/export, deletion, and retention expectations for Concept Briefs,
  contacts, uploads, notes, and notification events.
- Add practical monitoring for submission volume, notification failures,
  provider status, and storage growth.

### Must Stop Before Launch If Broken

Stop even quiet MVP testing if any of these conditions is true:

- A customer can see received/submitted confirmation without confirmed server
  persistence, a valid public reference, and a valid Concept Brief UUID.
- Normal persisted briefs cannot be found in the protected admin review queue.
- Protected admin pages, notes, or reference assets can be accessed without the
  intended admin gate.
- A server-only secret, service-role key, admin key, or customer PII is exposed
  in browser code, docs, logs, screenshots, or PR content.
- Reference assets can be opened outside the protected signed-URL flow.
- The owner has no workable manual way to find new briefs when admin email
  notification fails.
- Customer-facing copy implies payment, final pricing, CAD approval, sourcing,
  production approval, or order creation that the MVP does not provide.

## 5. Risk Register

Likelihood and severity are planning judgments for the current MVP shape. They
should be revisited after traffic, provider, or workflow changes.

| Risk | What may happen | Affected area | Why the risk exists | Likelihood | Severity | Current mitigation | Recommended next action | MVP-blocking |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public API abuse and spam submissions | Automated or repeated requests may create fake leads, noisy PII, database growth, admin triage load, and notification pressure. | `/api/concept-briefs`, admin queue, Supabase, email operations | The submission endpoint is public. Production provider enforcement is deferred. | Medium before promotion; High after promotion | High | Payload validation, receipt integrity gate, Preview-tested rate-limit code foundation | Agent 29D should prepare the approved Production abuse-control decision and implementation sequence. | No for quiet soft testing with manual oversight; Yes before broader traffic |
| Production rate-limit provider deferred | Production requests continue when Redis/KV provider configuration is missing or unavailable. | `/api/concept-briefs` | The current approved MVP-stage decision is fail-open. Preview enforcement passed, but Production provider setup was intentionally deferred. | High as a configuration fact | High under traffic or attack | Fail-open preserves legitimate availability; Option C decision packet exists | Revisit Option C: create a Production-dedicated Upstash Redis resource separate from Preview before promotion. | No for quiet soft testing; Yes before public/social/paid traffic |
| No Turnstile or CAPTCHA | Automated submissions can pass normal form validation without a bot challenge. | Final Concept Brief submission | Turnstile is planned but not implemented or configured. | Medium before promotion; High after promotion | High | Manual review and low-volume owner control only | Plan server-side Turnstile verification before Supabase writes, with Production-safe test bypass rules. | No for narrow testing; Yes before broader traffic |
| Temporary admin access-key model | Shared-key exposure, weak revocation workflow, or overly broad access could expose customer data. | `/admin/briefs`, admin detail, notes, reference opening | The MVP uses one server-only access key and an 8-hour protected cookie, not full auth or roles. | Low to Medium with disciplined handling | High | Server-side comparison, HTTP-only secure Production cookie, protected routes, runbook rotation guidance | Keep key tightly controlled for quiet MVP; plan full admin auth, role boundaries, and audit expectations before expanding staff or workflow. | No for single-owner quiet MVP; Yes if access cannot be controlled |
| Customer PII handling | Names, emails, phone details, notes, and uploaded files may be over-shared, retained too long, or exposed during debugging. | Supabase rows, admin UI, email, logs, screenshots, docs | Real Concept Brief intake stores customer contact and free-text data. | Medium | High | Server-only helpers, protected admin routes, redaction rules in security runbook | Agent 29C should plan privacy, contact, retention, deletion, and disclosure copy. | Yes before broad public intake if statements and handling rules are missing |
| Admin email notification reliability | A persisted brief may not generate a usable admin email, delaying manual follow-up. | Resend, Gmail, notification events, admin operations | Notification is intentionally best-effort and non-blocking after persistence. Provider or configuration failure can occur. | Medium | Medium to High | Durable reservation and sent/failed events, idempotency, protected admin detail visibility | Agent 29F should define a manual queue-check cadence and failed/reserved notification review SOP. | No if manual queue review is active; Yes if email is the only discovery path |
| Supabase service-role and server-only boundaries | A privileged credential exposure could allow broad data or storage access. | Server routes, Supabase, logs, client bundles | Persistence and protected admin operations use a highly privileged server-only client. | Low if boundaries hold | Critical | `server-only` modules, server env classification, no browser delivery of the service-role key, runbook secret rules | Preserve boundaries; add explicit bundle/log review to future backend changes. Stop immediately on suspected exposure. | Yes |
| Public upload and storage abuse | Attackers may attempt repeated multipart parsing, storage growth, unwanted attachments, or cost pressure. | `/api/concept-brief-reference-assets`, Supabase Storage, metadata table | Upload route is public after a brief id/reference pair is supplied. It lacks a short-lived upload token and durable attempt caps. | Medium before promotion; High after promotion | High | Brief pair verification, 3-file cap, 5 MB per-file cap, JPG/PNG/WebP browser MIME allowlist, private admin signed-URL opening | Agent 29E should review token binding, durable caps, MIME signature checks, dimensions, total-size limits, cleanup, and storage monitoring. | No for controlled soft testing; Yes before broader traffic |
| Local browser fallback and receipt truthfulness | A customer could mistakenly believe a browser-only record was received by NOVORA. | `/design/brief`, `/design/submitted`, local storage | Local recovery state remains part of the MVP for graceful failure handling. | Low after PR #84 if guard remains intact | High | Confirmed persistence plus valid public reference plus valid UUID are required before receipt copy and success navigation | Keep the integrity skill mandatory for future intake changes; preserve focused regression coverage. | Yes if regressed |
| Manual CAD, pricing, and production boundaries | Customers may infer a sketch brief is CAD-ready, priced, sourced, or approved for production. | Customer copy, admin review, owner follow-up | The MVP intake sits before offline manual business decisions. | Medium | Medium to High | Boundary copy repeatedly states sketch first, paid CAD later, no final order or pricing | Agent 29B should audit public-facing copy and owner follow-up language before promotion. | Yes if copy overpromises |
| No payment or order system | Customer expectations may be unclear, and the owner cannot use the MVP as a transactional storefront. | Commercial workflow | Payment, checkout, order creation, and order management are intentionally absent. | High as a product fact | Medium | Copy frames the flow as Concept Brief intake and later manual follow-up | Keep explicitly deferred for soft testing. Define a separate future payment/order scope before selling through the site. | No for lead-intake MVP; Yes for transactional launch claims |
| Legal, privacy, and contact copy readiness | Customers may not have adequate statements about data use, uploads, retention, contact, or custom-order boundaries. | Public site, customer trust, operations | Current repository has planning notes, but no dedicated `app/privacy`, `app/terms`, or `app/contact` route. | High as a readiness gap | High | Internal planning docs identify privacy and retention needs | Agent 29C should plan reviewed privacy, terms, contact, and data-handling pages before broader launch. | Yes before broader traffic |
| Operational response when admin email fails | A real brief may sit unnoticed even though persistence succeeded. | Admin operations | Customer success does not wait for notification delivery, and automatic retry/resend tooling is intentionally absent. | Medium | High for customer response time | Admin queue exists; notification event status is visible on protected detail; runbook has incident guidance | Agent 29F should define queue-check cadence, ownership, failed/reserved event review, and approved escalation steps without adding resend behavior. | No if manual SOP is active; Yes otherwise |
| Monitoring and observability limits | Spam bursts, storage growth, provider errors, or notification failures may be noticed late. | APIs, Supabase, Resend, storage, operations | Current counters and event rows are useful signals but not a full operational monitoring system. | Medium | Medium to High | Safe warning logs, notification event rows, Upstash Preview counters, manual admin review | Define a minimal owner dashboard or manual review checklist and alert thresholds before broader traffic. | No for quiet soft testing; Yes before scale |
| Backup, export, deletion, and retention concerns | Data may be hard to recover, remove, or retain consistently. Storage and privacy obligations may drift. | Concept Briefs, contacts, uploads, notes, notification events | Repository docs identify this as future work; no completed operational policy is recorded. | Medium | High | Supabase is the current system of record; docs call out retention planning | Define retention periods, deletion handling, export ownership, backup expectations, and incident recovery before broader launch. | No for tightly limited testing if owner accepts the gap; Yes before broader traffic |
| Synthetic test data in Production | Test records may pollute the admin queue, complicate reporting, or be mistaken for real leads. | Supabase, admin queue, Gmail notifications | Controlled Production smoke verification has created synthetic briefs, including `NOVORA-CB-20260602-CLJR`. | Medium | Medium | Ledger records known synthetic references and test purpose | Agent 29F should define naming, labeling, review, retention, and approved cleanup policy for Production synthetic records. | No, but operational cleanup policy is needed |
| Public admin-notification trigger route | Repeated calls may consume route capacity, create log noise, or pressure email-provider operations even when idempotency prevents duplicate delivery. | `/api/concept-brief-admin-notification`, Supabase notification events, Resend | The browser calls a public route after persistence. Durable idempotency protects repeated valid brief-recipient delivery, but a signed internal trigger is not implemented. | Medium | Medium to High | Concept Brief pair verification, reservation-before-send, unique delivery guard, duplicate skip | Include notification route hardening in Agent 29D: prefer trusted server-side invocation or a signed short-lived internal token. | No for quiet testing; Yes before broader traffic |

## 6. Recommended Next Agent Sequence

Each item below should remain a separate scoped task with its own approval
boundary. Do not combine planning approval with Production execution, and do
not treat any item here as launch approval or commercial readiness.

Completed recent sequence items:

- **Agent 29B public-copy boundary audit is complete.** It documented public
  wording risks without changing app behavior.
- **Agent 29C public-copy boundary fixes are complete.** The current public copy
  is framed around Concept Brief intake, studio review, and later separate CAD,
  quotation, order, and production decisions.
- **Agent 29D Privacy / Terms / Data Handling planning is complete.** It created
  a planning packet for owner/legal review; it did not publish final Privacy or
  Terms pages and does not claim legal compliance.

Recommended next scoped work:

1. **Agent 29E: Minimal privacy, contact, and upload notices**
   - Add short, non-legal customer-facing notices where the current intake and
     final reference upload flows need clearer expectations.
   - Do not create final Privacy or Terms pages, legal acceptance checkboxes, or
     new backend behavior in this notice task.

2. **Agent 29F: Privacy and Terms page drafting for owner/legal review**
   - Draft review-ready Privacy and Terms page copy based on the Agent 29D
     planning packet.
   - Keep the draft clearly separated from legal approval and commercial launch
     readiness.

3. **Agent 29G: Retention, admin SOP, or abuse-control work**
   - Define retention/deletion/export ownership, admin queue-check cadence,
     failed/reserved notification review, synthetic Production test-data
     handling, or public abuse-control implementation planning as separately
     approved slices.
   - Keep SQL, Supabase, provider, environment, email, deploy, Production
     verification, retry/resend, payment, auth, CAD, order, and AI-generation
     changes behind explicit later approvals.

## 7. Owner Decision Checklist

Before quiet MVP testing:

- [ ] Are we limiting this stage to quiet, owner-controlled soft testing?
- [ ] Are we accepting fail-open Production rate limiting for quiet MVP only?
- [ ] Are we willing to manually review every Concept Brief?
- [ ] Are we willing to check the protected admin queue on a defined schedule
      even when email notification appears healthy?
- [ ] Are we ready to handle admin email failures manually without retry/resend
      tooling?
- [ ] Are we okay launching this narrow intake MVP without payment, full auth,
      customer accounts, or a customer portal?
- [ ] Are we ready to keep CAD, pricing, sourcing, and production fully offline
      and manual?
- [ ] Is the temporary admin access key limited to the smallest practical set of
      trusted operators?
- [ ] Do we have a documented rule for recognizing and handling synthetic
      Production test records?

Before public, social, or paid traffic:

- [ ] Is a Production-dedicated rate-limit provider enabled and verified without
      sharing the Preview keyspace?
- [ ] Is server-verified Turnstile or equivalent bot protection enabled?
- [ ] Are reference-upload token binding and durable abuse limits implemented?
- [ ] Is the public admin-notification trigger hardened or moved server-side?
- [ ] Are privacy, contact, upload-use, and data-retention statements reviewed
      and published?
- [ ] Are terms and customer-facing copy clear that this is Concept Brief intake,
      not an order, quote, CAD approval, payment, or production confirmation?
- [ ] Is the admin SOP active for queue review, notification failures, incidents,
      and synthetic test data?
- [ ] Are monitoring, backup/export ownership, deletion handling, and retention
      expectations documented?

## 8. Current Recommendation

NOVORA can continue quiet, owner-controlled MVP soft testing only if the owner
accepts the explicit manual-operation model and the current fail-open abuse risk.

Do not treat the site as approved for formal public promotion, larger social
traffic, paid advertising, or commercial-scale submissions yet. Before that
step, complete the abuse-control, bot-protection, upload-hardening,
legal/privacy, operations, monitoring, and retention work identified above.
