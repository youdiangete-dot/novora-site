# NOVORA Retention / Admin Privacy SOP Plan

## A. Scope And Boundary

This is a docs-only planning artifact for NOVORA owner/legal review. It is not
legal advice, does not create final legal policy text, and does not publish a
binding retention promise.

This document is a draft operating direction and manual SOP proposal. Owner/legal
review is required before NOVORA executes deletion/export/correction procedures,
publishes final Privacy or Terms text, promises retention periods, changes app
behavior, or expands public traffic.

Agent 29G prepared this plan from repository evidence only. No Production site,
protected admin page, customer data, SQL, Supabase dashboard, Vercel
configuration, Resend, Cloudflare, provider console, secret, email send, deploy,
app code, tests, packages, payment, auth, CAD, order, or AI-generation behavior
was accessed or changed.

Evidence reviewed:

- `docs/novora-current-project-state.md`
- `docs/novora-privacy-terms-data-handling-copy-plan.md`
- `docs/novora-mvp-launch-readiness-checklist.md`
- `docs/novora-production-security-runbook.md`
- `app/legal/privacy-draft/page.tsx`
- `app/legal/terms-draft/page.tsx`
- Concept Brief submission, submitted receipt, reference asset, admin
  notification, admin review-state, and server persistence source files

## B. Current Data Categories

Based on current repository evidence, NOVORA currently handles or may handle the
following data categories.

| Category | Current evidence | Handling surface |
| --- | --- | --- |
| Concept Brief public reference / UUID | `NOVORA-CB-...` public reference and Concept Brief UUID are returned only after confirmed persistence. | Customer receipt, Supabase rows, protected admin review, notification route, reference upload matching. |
| Customer name | Required by validation and contact form. | `concept_brief_contacts.customer_name`, full payload copies, customer receipt, protected admin detail, admin notification email. |
| Customer email | Required by validation and email format check. | `concept_brief_contacts.customer_email`, full payload copies, receipt/admin display, rate-limit email normalization, admin notification email. |
| Optional phone / WhatsApp | Optional contact field. | `concept_brief_contacts.phone_whatsapp`, payload copies, customer receipt, protected admin detail. |
| Country / region | Optional contact context field. | `concept_brief_contacts.country_region`, payload copies, customer receipt, protected admin detail. |
| Contact note | Optional free-text field. | `concept_brief_contacts.contact_note`, payload copies, customer receipt, protected admin detail. |
| Design answers / piece type / stone preferences | Concept intake collects piece, structure, style, material, stone, budget, personalization, story, reference notes, and manual-confirmation direction. | `concept_briefs` columns, `brief_payload`, `summary_items`, `api_submission`, browser draft/submitted storage, protected admin review. |
| Final reference images | Optional final upload on `/design/brief` after confirmed server persistence. | Supabase Storage private reference bucket, protected admin signed URL access. |
| Reference image metadata | Helper stores original filename, MIME type, size, bucket, object path, upload status, created time, asset id, and Concept Brief id. | `concept_brief_reference_assets`, protected admin list/detail/reference opening route. |
| Planning reference names/notes | Earlier concept-page selections are planning references only, not final uploaded files. Names, count, and notes can be included in the brief summary. | Browser session/local storage and persisted payload/summary when submitted. |
| Admin review status | Internal statuses such as `new`, `reviewing`, `needs-info`, `ready-for-sketch`, and `closed`. | `admin_notes` rows with review-status note type, protected admin UI, localStorage fallback. |
| Internal admin notes | Free-text internal notes for protected manual review. | `admin_notes.note` with `created_by: admin-mvp`, protected admin UI, localStorage fallback key `novora_admin_brief_review_state`. |
| Admin notification event metadata | Notification type, recipient email, status, reserved/sent/failed timestamps, Resend message id, error message, created/updated timestamps. | `concept_brief_notification_events`, protected admin detail. |
| Admin notification email contents | High-level notification includes public reference, customer name, customer email, piece type, reference image count, and protected admin detail link. | Resend admin-only email delivery and admin inbox. No customer confirmation email flow is implemented. |
| Browser local/session storage | Draft, submitted summary, and admin fallback review state are stored locally. | `novora_concept_brief`, `novora_submitted_concept_brief`, `novora_admin_brief_review_state`, and legacy/simple `novora_design_brief`. Browser storage is not proof of server receipt. |
| Server logs / operational errors | Source logs selected provider/database error codes/messages and some Concept Brief ids on failure paths. | Hosted runtime logs where available. This plan does not assume any log retention period beyond source evidence. |

## C. Draft Retention Questions

These are planning questions only. They are not final retention rules.

| Category | Proposed retention direction | Why retain | Why delete | Owner decision | Legal review |
| --- | --- | --- | --- | --- | --- |
| Public reference / UUID | Retain while the brief remains operationally relevant; preserve enough linkage for manual request handling. | Needed to find, review, and discuss a submitted brief. | May identify a customer record when combined with other data. | Decide whether references remain after deletion as minimal tombstones or are fully removed. | Yes |
| Customer contact fields | Retain only while follow-up, support, legal, or project history needs exist. | Manual follow-up, request verification, project continuity. | PII should not be kept longer than needed. | Choose retention windows by brief status. | Yes |
| Contact note and free text | Treat as higher-risk because customers may include sensitive context. | May contain project timing or contact preferences. | Free text can over-collect personal details. | Decide whether notes are redacted, deleted sooner, or retained with the brief. | Yes |
| Design answers and preferences | Retain while evaluating or discussing the project; consider shorter retention for declined/unresponsive briefs. | Needed to understand the jewelry concept. | May include personal stories or special meanings. | Choose windows for active, unresponsive, declined, and completed projects. | Yes |
| Final reference images | Retain only while needed for review or active project work. | Visual references support review and later manual discussion. | Images can contain personal, third-party, or copyrighted material. | Decide removal request handling and default deletion windows. | Yes |
| Reference metadata | Retain as long as needed to manage uploaded files and verify deletion/removal work. | Required to locate assets and audit upload state. | Metadata may reveal filenames or customer context. | Decide whether metadata is deleted with files or retained as a minimal record. | Yes |
| Admin review status | Retain while operationally useful; statuses can be less sensitive than notes. | Queue management and owner follow-up. | Stale status may misrepresent project state. | Decide whether closed/declined statuses expire. | Owner/legal |
| Internal admin notes | Keep minimal and professional; consider a stricter deletion/review window. | Manual continuity for owner review. | Notes can over-collect sensitive judgments or customer details. | Decide note standards and deletion window. | Yes |
| Notification events | Retain enough for idempotency, troubleshooting, and operational audit; avoid treating as customer history. | Helps diagnose missed/duplicate notifications. | Contains recipient email and provider/error metadata. | Choose retention by status: sent, failed, reserved. | Owner/legal |
| Admin notification email | Keep inbox handling minimal; avoid forwarding or copying. | Helps the owner find new briefs. | Email can expose customer name/email/reference. | Decide mailbox retention, labels, and forwarding rules. | Owner/legal |
| Browser storage | Treat as customer/admin local device state, not NOVORA system of record. | Draft recovery and receipt display. | Shared devices may retain PII. | Decide future clear/reset UX and disclosure. | Owner/legal before publication |
| Server logs | Keep only what hosting/provider settings require and operationally need. | Debugging, incident review. | Logs may contain ids or error context. | Confirm log retention and redaction policy before promising anything. | Yes |

## D. Suggested Retention Policy Options

The following options are owner decisions, not final policy. NOVORA should not
publish a retention period until it can actually operate the chosen process.

| Scenario | Option A | Option B | Option C | Draft direction |
| --- | --- | --- | --- | --- |
| Abandoned local/browser-only drafts | Customer/browser controlled only; no server deletion process. | Add future clear-draft UX. | Add future browser-storage disclosure plus clear-all control. | Treat as future app/disclosure work; no server-side promise now. |
| Submitted but unresponsive briefs | Manual review after 90 days. | Manual review after 180 days. | Retain up to 365 days for owner follow-up. | Choose one before broader traffic. |
| Active review briefs | Retain while review is active. | Retain with periodic owner review every 90 days. | Retain until moved to declined/completed/offline project category. | Active work likely needs retention, but status hygiene is needed. |
| Declined briefs | Delete or anonymize after 30 days. | Delete or anonymize after 90 days. | Retain minimal closure record for 180 days. | Decide whether references/images are removed sooner than text. |
| Completed offline projects | Retain for 365 days after completion. | Retain according to offline business/legal record needs. | Split project records from website intake records. | Requires owner/legal and accounting/business review. |
| Final reference images | Delete on verified request unless retention reason exists. | Review/delete after 90 or 180 days for inactive briefs. | Retain while project remains active, then remove or archive under offline policy. | Images need the clearest policy because they carry copyright/privacy risk. |
| Reference image metadata | Delete with the file. | Keep minimal deletion/tombstone metadata. | Retain metadata with the Concept Brief while removing object path. | Owner/legal must decide based on audit and privacy needs. |
| Internal admin notes | Review after 90 days. | Delete/redact when brief is declined or inactive. | Retain only concise status history, remove sensitive free text. | Prefer stricter minimization than core design data. |
| Notification events | Retain sent/failed/reserved status for 90 or 180 days. | Retain for 365 days for troubleshooting history. | Periodically delete older event rows after idempotency value expires. | Must be future technical planning, not Agent 29G execution. |
| Synthetic Production test records | Label and retain until reviewed. | Delete after owner/legal approves a cleanup procedure. | Keep minimal ledger of test references and remove customer-like details later. | Requires a separate approved real-data cleanup task. |

## E. Manual Privacy Request SOP

This is a manual SOP proposal only. No backend deletion/export/correction
workflow is implemented by this document.

1. Intake the request through the owner-approved privacy/contact email once one
   exists.
2. Record the request in an owner-controlled tracker outside the public app:
   request date, request type, submitted contact channel, public reference if
   provided, requested action, verification state, decision, completion date,
   and reviewer.
3. Verify identity before acting. Practical options include matching the
   request email to the submitted customer email, asking for the public
   reference plus submitted email, or using another owner/legal-approved method.
4. For access requests, prepare a manual summary of the customer-facing Concept
   Brief data and uploaded reference metadata that the owner/legal reviewer
   approves for release. Do not include internal admin notes by default unless
   legal review says otherwise.
5. For correction requests, confirm the specific field to correct and decide
   whether correction is operationally appropriate. Any actual data mutation is
   a future approved customer-data task.
6. For deletion requests, identify affected categories: contact row, brief
   payload, reference assets, reference metadata, admin notes, notification
   events, browser storage guidance, and provider/inbox copies. Actual deletion
   requires future approval and a written execution plan.
7. For reference image removal requests, verify the requester and identify the
   asset(s). Decide whether object deletion, metadata deletion, or metadata
   minimization is appropriate before execution.
8. For contact preference requests, record the customer preference manually and
   avoid further non-essential contact through channels the customer asked not
   to use, subject to owner/legal review.
9. For export requests, prepare only the minimum reviewed customer-facing export
   material. Do not export database dumps, admin notes, provider logs, secret
   values, admin links, or unrelated records.
10. Escalate to owner/legal review when identity is unclear, a request conflicts
    with business/legal retention needs, uploaded images include third-party
    material, the requester is not the original submitter, cross-border rights
    may apply, or the request involves a minor.

## F. Admin Handling Rules

The following rules are draft operating direction for protected admin review.

- Keep internal notes professional, factual, brief, and limited to the jewelry
  review task.
- Do not put sensitive personal details, medical/financial/family details,
  speculation, subjective judgments, passwords, secrets, or unrelated customer
  context into internal notes.
- Avoid copying full customer data into external tools, chats, spreadsheets, or
  screenshots unless owner/legal review explicitly approves the purpose.
- Do not forward reference images unnecessarily.
- Do not download uploaded reference images unless needed for the current manual
  review task.
- Do not share customer files with designers, CAD contractors, factories,
  gemstone suppliers, or logistics partners until the customer project moves
  forward and appropriate owner/legal review is complete.
- Keep admin email notifications minimal and avoid forwarding them outside the
  trusted owner/admin inbox.
- Use the protected admin queue as the source of truth for submitted briefs; do
  not rely only on email notification.
- Treat public references, protected admin links, signed reference URLs, and
  screenshots as sensitive operational material.

## G. Reference Image Handling SOP

Reference image handling should remain cautious until final owner/legal policy
is approved.

- Customers should upload only files they have the right to share.
- Final reference images guide manual concept review only.
- Uploaded references are not CAD approval, final design approval, pricing,
  production approval, sourcing permission, or permission to copy a third-party
  design.
- Earlier `/design/concept` planning references are not final uploaded files,
  though names/notes may be included in the Concept Brief summary.
- Avoid unnecessary redistribution, forwarding, downloading, or re-uploading of
  customer reference files.
- If a customer asks to remove a reference image, verify identity first and
  escalate to owner/legal review before any real storage or metadata change.
- Future designer/factory sharing needs a separate partner-sharing policy that
  defines permitted recipients, minimized data, customer notice/consent, and
  secure transfer method.

## H. Security And Incident Response Planning

This section is planning-only and does not claim that a full incident response
program exists.

If a mistaken email, file exposure, admin access issue, suspected credential
exposure, or customer-data handling issue is suspected:

1. Pause unrelated operations and preserve basic evidence with secrets and PII
   redacted.
2. Record timestamps, affected routes, public references if necessary, provider
   names, deployment context, and what was observed.
3. Do not send additional emails, retry notifications, access more customer data,
   run SQL, change providers, rotate secrets, or deploy unless a separate
   approved incident task authorizes the action.
4. Owner should decide whether to pause intake, pause admin review, restrict
   access, or seek legal/provider support.
5. Escalate to owner/legal review before customer-facing statements or any
   formal incident notice.
6. Document what happened, known/unknown impact, containment steps, reviewer,
   and follow-up prevention after approval.

## I. Data Sharing / Offline Partner Review

Future CAD designers, factories, gemstone suppliers, logistics partners, or
other offline partners may need limited project information. This workflow is
not implemented by the current website and requires future owner/legal review.

Draft direction:

- Share the minimum information needed for the specific manual task.
- Prefer design specifications without full customer contact details when
  partner contact with the customer is not needed.
- Do not share internal admin notes unless there is a specific approved business
  reason.
- Do not share uploaded reference images unless the partner needs them for the
  approved project stage and the customer notice/consent position is clear.
- Define cross-border partner handling before using partners outside the initial
  launch region.
- Document partner recipient, purpose, shared fields/files, date, and reviewer
  when partner sharing becomes operational.

## J. Future Implementation Roadmap

Keep each item in its own scoped branch and approval boundary.

1. **Agent 29H: owner decision packet**
   - Added `docs/novora-owner-privacy-retention-decision-packet.md` to turn the
     retention/admin SOP planning into owner choices, recommended cautious MVP
     defaults, a fill-in decision form, launch implications, and risk register.
   - It does not choose final retention periods, implement deletion/export/
     correction workflows, access Production data, change app behavior, or
     publish final policy.

2. **Agent 29I: owner-filled decision packet integration**
   - Incorporate owner answers into the decision packet or a follow-up decision
     record after owner/legal review.
   - No protected admin access, customer-data operations, app behavior, or final
     policy publication.

3. **Agent 29J: final Privacy/Terms revision after owner/legal review**
   - Update draft legal text only after owner/legal decisions are complete.
   - Still do not publish final `/privacy` or `/terms` unless explicitly
     approved.

4. **Agent 29K: optional app links after final owner approval**
   - Add footer/header legal links, contact route/linking, or acknowledgement
     copy only after final owner/legal approval.
   - Treat checkbox/form behavior as a separate explicit approval item.

5. **Agent 29L: admin privacy SOP checklist and manual request log template**
   - Convert the SOP direction into a concise owner checklist and request log
     template for queue review, privacy requests, admin notes, reference-image
     handling, notification review, and escalation.
   - No protected admin access or customer-data operations.

6. **Agent 30A or later: technical deletion/export workflow planning**
   - Plan technical deletion, export, correction, retention automation, audit
     logging, or customer/admin tooling only after accounts/admin tooling and
     legal decisions mature.
   - Any SQL, Supabase, real data, backend, auth, or Production work must be
     separately approved.

## K. Risk Register

| Risk | What may happen | Affected area | Likelihood | Severity | Current mitigation | Recommended next action |
| --- | --- | --- | --- | --- | --- | --- |
| Undefined retention periods | Data may be kept too long, deleted too early, or handled inconsistently. | Concept Briefs, contacts, uploads, notes, notifications, browser storage | High | High | Prior docs identify retention as a readiness gap. | Agent 29H owner decision packet. |
| No self-service deletion/export | Customers cannot log in to manage their own data. | Privacy requests, support | High | Medium to High | Manual owner review can use public reference/contact details. | Define manual SOP and verification before broader traffic. |
| Manual identity verification | Owner may act on the wrong request or miss a valid request. | Access, correction, deletion, export | Medium | High | No automated workflow is promised. | Choose verification method and tracker. |
| Reference image copyright/privacy risk | Customers may upload personal images, third-party designs, logos, or files they cannot authorize. | Final uploads, storage, admin review | Medium | High | Upload helper asks customers to upload files they have the right to share; protected signed access exists. | Decide removal policy and partner-sharing rules. |
| Internal admin notes over-collection | Notes may include sensitive judgments or unnecessary PII. | `admin_notes`, local admin fallback | Medium | High | Protected admin access and internal-only framing. | Adopt note-writing standards and deletion/review window. |
| Email notification exposure | Admin emails contain customer name, email, reference, piece type, image count, and protected link. | Resend/admin inbox | Medium | High | Admin-only notification, idempotency, no customer confirmation email. | Keep email minimal; define forwarding/mailbox retention rules. |
| Sharing data with offline designers/factories later | Customer data or images may be shared before notice/consent and minimization rules exist. | Future CAD/factory/logistics workflow | Medium as future risk | High | Partner sharing is not implemented online. | Create partner-sharing policy before operational sharing. |
| Cross-border customers | Users from California, EU, UK, Taiwan, Japan, or other regions may raise additional privacy expectations. | Public site, legal text, support | Medium | High | Future markets are documented as not implemented. | Owner/legal must choose launch regions and cross-border wording. |
| Minors not targeted | A minor may submit data without a clear rule. | Intake, Privacy/Terms, support | Low to Medium | High | Product is not child-directed; draft legal page flags minors as a review item. | Decide adult-only/minors handling language. |
| Security incident response not finalized | Owner may be unsure who pauses operations, what to document, or when to contact legal/provider support. | Operations and customer trust | Medium | High | Production security runbook has practical internal steps. | Convert planning into an owner incident checklist. |
| Overpromising privacy/security | Public copy may promise compliance or perfect security the MVP cannot support. | Privacy/Terms, customer trust | Medium | High | Draft pages say not final legal text and avoid guarantees. | Keep final copy modest and legal-reviewed. |
| Stale draft legal pages if not reviewed | Draft `/legal/privacy-draft` and `/legal/terms-draft` could remain outdated and be mistaken as final direction. | Legal review pages and owner workflow | Medium | Medium to High | Pages are visibly marked draft and not final legal text. | Track review owner, decision date, and publication status. |

## L. Owner Decision Checklist

Answer these before final policy publication or broader public traffic.

- [ ] Public privacy contact email: choose one approved address.
- [ ] Abandoned/unresponsive briefs: choose 30, 90, 180, 365 days, or manual
      review.
- [ ] Declined briefs: choose 30, 90, 180, 365 days, or manual review.
- [ ] Completed offline projects: choose website-intake retention separately
      from offline business/project records.
- [ ] Reference images: choose deletion/review window and request-removal rule.
- [ ] Internal admin notes: decide whether notes have a shorter deletion or
      review window than core Concept Brief records.
- [ ] Identity verification: decide whether matching email plus public
      reference is sufficient, or whether additional verification is required.
- [ ] Reference image removal: decide whether customers can request removal
      before, during, or after manual review.
- [ ] Designers/factories: decide whether they may receive customer details or
      only minimized design specifications.
- [ ] Launch regions: choose initial regions before publishing final privacy
      text.
- [ ] Minors: decide whether NOVORA excludes minors and how to handle suspected
      minor submissions.
- [ ] Future AI use: decide whether customer text, design preferences, or
      uploaded images may ever be used for AI generation, training, or provider
      processing, and require a separate disclosure before implementation.
