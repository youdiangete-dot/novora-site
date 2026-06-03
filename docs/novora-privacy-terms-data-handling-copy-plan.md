# NOVORA Privacy / Terms / Data Handling Copy Plan

## A. Scope And Legal Boundary

This is a planning-only document for NOVORA owner review. It is not legal
advice, does not create final legal text, and should not be published as a
binding Privacy Policy or Terms of Service.

This plan provides draft direction, recommended page sections, data inventory,
copy snippets for later implementation, risk review, and owner/legal review
questions. Owner/legal review is required before NOVORA publishes any Privacy
Policy, Terms page, cookie notice, consent language, footer legal links, or
final data-handling commitment.

Agent 29D prepared this document from source and documentation review only. No
Production site, protected admin page, customer data, SQL, Supabase dashboard,
Vercel configuration, Resend, Cloudflare, secrets, email send, deploy, app code,
tests, packages, payment, auth, CAD, order, or AI-generation behavior was
accessed or changed.

Evidence reviewed:

- `docs/novora-current-project-state.md`
- `docs/novora-mvp-launch-readiness-checklist.md`
- `docs/novora-public-launch-copy-boundary-audit.md`
- `docs/novora-production-security-runbook.md`
- `app/design/start/page.tsx`
- `app/design/concept/page.tsx`
- `app/design/brief/page.tsx`
- `app/design/submitted/page.tsx`
- `app/admin/briefs/page.tsx`
- `app/admin/briefs/[id]/page.tsx`
- `app/admin/briefs/[id]/AdminBriefDetailClient.tsx`
- `app/api/concept-briefs/route.ts`
- `app/api/concept-brief-reference-assets/route.ts`
- `app/api/concept-brief-admin-notification/route.ts`
- server-side Supabase, reference upload, admin review, notification, env, and
  rate-limit helpers
- `AGENTS.md`
- repo-local NOVORA copy, submission-integrity, operating, safe-PR, and
  learning-loop skills

## B. Current Data Inventory

Based on current repo evidence, NOVORA currently collects or may store the
following data.

| Data category | Evidence in current source/docs | Current storage or display path |
| --- | --- | --- |
| Customer name | Required by `validateConceptBriefSubmission`; contact form fields in `/design/brief`; displayed on `/design/submitted` and protected admin pages. | `concept_brief_contacts.customer_name`; full payload copy in `concept_briefs.brief_payload` and `api_submission`; browser localStorage submitted summary. |
| Customer email | Required by validation; used for email-format validation and email rate-limit keying; displayed on receipt/admin pages. | `concept_brief_contacts.customer_email`; full payload copy; browser localStorage submitted summary; admin notification email body. |
| Optional phone / WhatsApp | `phoneOrWhatsApp` / `customerPhone` fields in submission payload and admin display. | `concept_brief_contacts.phone_whatsapp`; full payload copy; browser localStorage submitted summary. |
| Country / region | `countryOrRegion` / `customerCountry` fields in submission payload and admin display. | `concept_brief_contacts.country_region`; full payload copy; browser localStorage submitted summary. |
| Contact note | `contactNote` field in submission payload and admin display. | `concept_brief_contacts.contact_note`; full payload copy; browser localStorage submitted summary. |
| Concept Brief answers / design preferences | `/design/concept` builds a detailed `conceptBrief` object with piece, structure, stone, material, budget, style, personalization, emotional story, wearability, production concern, and manual-confirmation direction. | `concept_briefs.brief_payload`, `summary_items`, and `api_submission`; browser sessionStorage draft; browser localStorage submitted summary. |
| Piece type / design direction / stone preferences | `piece_type`, `branch`, `structure`, `sub_structure`, `design_objective`, and `ai_sketch_instruction` are mapped into first-class Supabase columns. | `concept_briefs` columns plus full payload copy; protected admin list/detail. |
| Uploaded final reference images | `/design/brief` final upload area sends selected JPG, PNG, or WebP files after confirmed persistence. | Supabase Storage bucket configured by `SUPABASE_STORAGE_BUCKET_REFERENCES`; private protected admin signed URL access. |
| Upload metadata | Reference helper stores original filename, bucket name, object path, MIME type, size, upload status, created time, asset id, and Concept Brief id. | `concept_brief_reference_assets`; protected admin list/detail and reference opening route. |
| Planning reference image names | `/design/concept` planning-only files are not final uploads, but their names/count/notes are included in the browser draft and Concept Brief summary. | Browser sessionStorage draft and submitted local summary; may also be included in persisted `brief_payload` / `summary_items` when submitted. |
| Admin review status / internal notes | Protected admin detail can save status and internal notes after admin access; local fallback exists if Supabase review persistence is unavailable. | `admin_notes` rows with review status note type and internal note; browser localStorage fallback key `novora_admin_brief_review_state`. |
| Admin notification event metadata | Admin notification helper reserves and marks notification events. Admin detail can display notification type, status, recipient email, reserved/sent/failed times, Resend message id, error message, created/updated timestamps. | `concept_brief_notification_events`; protected admin detail. |
| Admin notification email contents | Resend payload includes public reference, customer name, customer email, piece type, reference image count, and protected admin detail link. | Resend admin email delivery and event metadata; no customer confirmation email flow is implemented. |
| Local browser/session storage | Current flow uses `novora_concept_brief`, `novora_submitted_concept_brief`, `novora_admin_brief_review_state`, and legacy/simple `novora_design_brief` helper. | Customer/admin browser storage only. Browser storage is not proof that NOVORA received a brief. |
| Rate-limit request metadata | Rate-limit helper can derive IP source from forwarded headers and creates hashed IP keys. It can also create HMAC email keys when the signing secret is configured. | Redis/KV provider only when separately configured; current ledger says Production enforcement remains deferred/fail-open. Source does not store raw IP in Supabase. |
| Server logs / operational errors | Source logs provider/database error codes/messages and concept brief ids in some server-side failure paths. | Runtime logs where the app is hosted. This plan does not assume log retention beyond code evidence. |

## C. Purpose Of Data Use

| Data category | Intended use direction |
| --- | --- |
| Customer name and email | Identify the submitted Concept Brief, allow NOVORA to follow up manually, and support admin review. |
| Optional phone / WhatsApp | Provide an alternate manual contact channel if the customer chooses to provide it. |
| Country / region | Help NOVORA understand contact context, follow-up expectations, and future market/support considerations. |
| Contact note | Let the customer explain timing, contact preference, or context for manual follow-up. |
| Concept Brief answers and design preferences | Support concept review, design direction clarification, manual studio review, and later discussion of paid CAD or quote path. |
| Piece type, design direction, stone preferences | Organize the brief for review and help NOVORA understand jewelry direction. These are preferences, not sourcing, pricing, or production guarantees. |
| Final reference images | Let NOVORA review visual references for concept direction, proportion, motif, and later manual discussion. |
| Upload metadata | Attach uploaded references to the correct Concept Brief, show them in protected admin review, and support protected signed access. |
| Admin review status and internal notes | Support internal operational tracking and manual review state. This is not customer-visible CAD, pricing, or production approval. |
| Admin notification event metadata | Support best-effort admin notification idempotency, status visibility, and operational tracking. |
| Local browser/session storage | Preserve draft/recovery state and local receipt summary for the browser. It must not be treated as confirmed server receipt. |
| Rate-limit keys | Reduce repeated public API abuse when provider enforcement is configured. |

Current important exclusions:

- Data is not currently used for payment or order processing because payment,
  checkout, real order creation, and real order tracking are not implemented.
- Data is not currently used for real AI generation because real AI sketch
  generation is not implemented.
- Data is not currently used for CAD automation because CAD automation is not
  implemented. CAD, quote, sourcing, production, QC, packaging, and logistics
  remain offline/manual and require separate follow-up.

## D. Third-Party / Service-Provider Map

| Provider | Current role | Boundary notes |
| --- | --- | --- |
| Vercel | Hosts the Next.js app and server routes. | Do not publish env values, deployment secrets, or raw logs. |
| Supabase | Database and private storage for Concept Briefs, contact rows, reference image metadata, uploaded reference assets, admin notes, and notification events. | Service role access is server-only. Storage references are opened through protected signed URLs. |
| Resend | Sends admin-only Concept Brief notification email. | Current email is for admin notification, not customer confirmation. Do not trigger real sends during copy work. |
| Cloudflare | DNS and sender/domain infrastructure according to docs. | No DNS/provider changes are part of this plan. |
| Upstash Redis / Vercel KV family | Optional public API rate-limit provider path in code. | Production provider enforcement remains deferred/fail-open per ledger unless separately approved. |
| OpenAI / AI provider | Future server-side AI sketch generation env readiness exists in code, but real generation is not implemented. | Treat AI data use as inactive unless a future approved task implements it and adds separate disclosure. |
| Payment provider | Not active. | No payment data is currently collected by the app. |

Do not include secret values, admin keys, service-role keys, API tokens, raw env
values, or private operational details in public pages or PR descriptions.

## E. Customer-Facing Notice Needs

The following are recommended notice locations for later implementation. This
document does not implement them.

| Location | Notice need |
| --- | --- |
| `/design/brief` contact fields | Short privacy helper explaining that contact details are used for NOVORA review and manual follow-up about the Concept Brief. |
| `/design/brief` reference upload area | Short upload helper explaining that final reference files are saved for NOVORA/studio review, may contain personal/design material, and should only be uploaded when the customer has permission to share them. |
| Final submit button area | A concise acknowledgement that submitting sends the Concept Brief, contact details, and selected final reference uploads to NOVORA for review and follow-up, and that it is not an order, payment, quote, CAD approval, or production confirmation. |
| `/design/submitted` receipt page | Privacy note that NOVORA will use submitted contact information for follow-up, no automated customer email is currently sent, and reference images support concept review only. |
| Footer/header future links | Future `Privacy`, `Terms`, and possibly `Contact` links after owner/legal-reviewed pages exist. Do not add links before pages are approved. |
| Future Privacy / Terms pages | Full owner/legal-reviewed disclosure and service boundary text. |
| Future contact email | Public privacy/contact email for access, correction, deletion, and data-use questions. Owner must choose the address. |

## F. Recommended Privacy Policy Page Structure

Planning sections only. This is draft direction, not final legal text.

1. **What we collect**
   - Contact details: name, email, optional phone/WhatsApp, country/region, and
     contact note.
   - Concept Brief details: jewelry preferences, design direction, budget
     planning range, stone/material preferences, personalization, story/context,
     wearability notes, and other free-text notes.
   - Final uploaded reference images and upload metadata.
   - Admin/internal review data where applicable.
   - Browser storage data used for draft and receipt recovery.

2. **How we use it**
   - Review the Concept Brief.
   - Follow up with the customer.
   - Clarify design direction.
   - Review uploaded references.
   - Discuss manual CAD, quote, sourcing, or production questions later.
   - Support protected admin review and operational tracking.

3. **Reference image handling**
   - Explain that uploaded final references are attached to the Concept Brief
     for NOVORA/studio review.
   - Explain that planning references on `/design/concept` are not final upload
     files, though names/notes may be included in the brief summary.
   - Ask customers not to upload images they do not have permission to share.
   - State any future retention/deletion direction after owner/legal review.

4. **Manual review / offline CAD and quote process**
   - State that Concept Brief intake supports manual review and follow-up.
   - State that CAD, pricing, gemstone sourcing, feasibility, production, QC,
     packaging, and logistics are discussed separately and offline/manual.

5. **Email/contact follow-up**
   - Explain that NOVORA may use submitted email or optional contact details for
     manual follow-up.
   - Clarify that the current MVP does not send automated customer confirmation
     email.
   - Clarify that Resend is used for admin notification only, if legal review
     agrees this should be disclosed that way.

6. **Service providers**
   - Vercel for hosting.
   - Supabase for database/storage.
   - Resend for admin notification email.
   - Cloudflare for DNS/domain infrastructure.
   - Optional future AI/payment providers only after implementation and review.

7. **Data retention draft direction**
   - Owner must decide retention for abandoned drafts, submitted briefs,
     uploaded references, admin notes, notification events, and synthetic test
     records.
   - Avoid publishing a retention period until NOVORA can actually operate it.

8. **Deletion/access/correction request direction**
   - Provide a manual request channel before customer accounts exist.
   - Explain what the owner can verify and process manually.
   - Owner/legal review must define identity verification and response timing.

9. **Security summary without overpromising**
   - Use modest language: NOVORA uses server-side access controls, protected
     admin routes, private storage, and service providers.
   - Avoid guarantees such as "secure", "fully protected", "bank-level", or
     "100 percent safe".

10. **International users / cross-border note as a review item**
    - Mention that users may access NOVORA from different regions and data may
      be processed by providers in other jurisdictions, subject to legal review.
    - Confirm initial launch regions before publishing.

11. **Children/minors note as a review item**
    - Owner/legal review should decide whether NOVORA is directed to adults only
      and what to do if minors submit data.

12. **Contact method for privacy requests**
    - Publish a dedicated email or contact path chosen by the owner.

13. **Effective date / updates**
    - Include an effective date and update mechanism only when the final policy
      is ready for owner/legal approval.

## G. Recommended Terms / Service Boundary Page Structure

Planning sections only. This is draft direction, not final legal text.

1. **NOVORA Concept Brief is not an order**
   - Submitting the form creates a Concept Brief intake record for review, not a
     purchase, production request, or final custom order.

2. **No payment/checkout currently**
   - The current website does not collect payment or payment-card data.

3. **No binding quote from submitted brief**
   - Budget ranges and preferences are planning inputs only.
   - Any quote/estimate must be confirmed separately by NOVORA.

4. **AI sketch preview / concept direction boundary**
   - Current public sketch experience is mock/demo/illustrative unless future
     implementation changes that with separate disclosure.
   - AI hand-drawn concept sketch language must remain separate from production
     CAD.

5. **CAD, pricing, sourcing, production, QC, logistics remain manual/offline**
   - Paid CAD, gemstone sourcing, production feasibility, final pricing, QC,
     packaging, and logistics are discussed and confirmed separately.

6. **Reference images and customer rights/permission review**
   - Customers should only upload references they have permission to share.
   - References guide concept review and do not transfer production approval.

7. **No guarantee of production acceptance**
   - NOVORA may decline, request clarification, or determine a concept is not
     feasible or not suitable for production.

8. **Follow-up and communication expectations**
   - NOVORA may use submitted contact details for manual follow-up.
   - Response timing and channels need owner/legal/operations review before
     being promised.

9. **Limitation of demo/order tracking pages if still present**
   - Any demo or future workflow page must be clearly non-functional and not a
     real customer order portal until implemented.

10. **Owner/legal review required**
    - Final terms must be reviewed before publishing and before broader traffic.

## H. Short Customer-Facing Copy Snippets For Later Implementation

These snippets are draft direction only and are not final legal text.

**Contact form privacy helper text**

> NOVORA uses your name, email, and optional contact details to review your
> Concept Brief and follow up manually about next steps. Please avoid including
> sensitive personal details that are not needed for the jewelry review.

**Reference upload helper text**

> Final reference images uploaded here are attached to your Concept Brief for
> NOVORA studio review. Please upload only images you have permission to share;
> references guide concept direction and are not CAD approval, final pricing, or
> production confirmation.

**Final submit consent/acknowledgement**

> By submitting, you ask NOVORA to review your Concept Brief, contact details,
> and any final uploaded reference images for manual follow-up. This is not an
> order, payment, binding quote, CAD approval, or production confirmation.

**Submitted receipt privacy note**

> NOVORA will use the submitted contact information to follow up about your
> Concept Brief. Uploaded reference images support concept review only. The
> current MVP does not send an automated customer confirmation email.

**Footer link labels**

- `Privacy`
- `Terms`
- `Contact`

Do not add these footer links until owner/legal-reviewed pages or contact paths
exist.

## I. Risk Register

Likelihood and severity are planning judgments for the current MVP shape and
must be revisited after owner/legal review, public traffic, provider changes, or
new product behavior.

| Risk | What may happen | Affected area | Why the risk exists | Likelihood | Severity | Current mitigation | Recommended next action | MVP-blocking? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Collecting contact data before a published privacy page exists | Customers may submit PII without a clear public explanation of collection, use, retention, or request handling. | `/design/brief`, `/design/submitted`, footer/legal pages | Real submission persistence exists, but reviewed privacy pages are not published. | High | High | Internal docs identify privacy/legal copy as a broader-traffic gap. | Publish owner/legal-reviewed privacy/contact notices before broader public traffic. | Depends for quiet owner-controlled testing; yes before broader traffic |
| Reference image uploads may contain personal or third-party copyrighted/design material | Customers may upload photos, logos, designer work, personal images, or images they cannot authorize NOVORA to review. | Final upload, Supabase Storage, admin review | Upload accepts customer-selected image files and stores them privately for review. | Medium | High | File count, type, and size limits; protected admin signed URL access. | Add upload-rights acknowledgement and reference-image policy after legal review. | Depends |
| Customer design descriptions may contain personal/sensitive context | Free-text story, personalization, contact notes, or reference notes may include sensitive personal details. | Concept Brief payload, admin detail, browser storage | Design intake includes emotional story, custom symbol, contact note, and other free-text fields. | Medium | High | Protected admin access; server-only Supabase helpers; security runbook redaction reminders. | Add customer helper text discouraging unnecessary sensitive details and define internal handling. | Depends |
| No customer account/self-service deletion flow | Customers cannot log in to view, export, correct, or delete their own data. | Privacy operations, customer support | Full customer auth/accounts are not implemented. | High | Medium to High | Manual owner review can locate records by public reference/contact details. | Define manual access/correction/deletion process and identity checks before publishing policy. | No for quiet MVP if manual process exists; yes before broader traffic |
| Manual privacy request handling | Requests may be missed, inconsistently verified, or processed without a documented SOP. | Owner operations, privacy contact channel | No automated support or ticketing workflow is recorded in the repo. | Medium | High | Security runbook contains customer-data handling reminders. | Create privacy request SOP with owner/legal review. | Depends |
| Data retention not yet defined | Data may be kept too long, deleted too early, or handled inconsistently. | Concept Briefs, contacts, uploads, admin notes, notification events, browser data | Current docs call retention a future decision; no operational retention policy is implemented. | High | High | Supabase is current system of record; docs identify retention as a readiness gap. | Decide retention periods before publishing final policy. | Yes before broader traffic |
| Cross-border/international users | Users from California, EU, UK, Taiwan, or other regions may trigger additional privacy/legal expectations. | Public site, Privacy Policy, Terms, support | NOVORA is accessible online and future markets include Taiwan, Japan, and Europe. | Medium | High | Future localization is documented as not implemented. | Owner/legal review should define initial launch regions and cross-border language. | Depends on launch regions |
| Minors/children not targeted | A minor may submit a Concept Brief or contact data without a clear policy. | Design intake, Privacy Policy, Terms | No age gate or children/minors statement exists. | Low to Medium | High | Product positioning is custom jewelry, not child-directed. | Decide adult-only/minors handling language with legal review. | Depends |
| Email notification contents | Admin emails contain customer name, email, piece type, public reference, reference image count, and protected admin link. | Resend, Gmail/admin inbox, notification workflow | Admin notification is active and includes PII for review routing. | Medium | High | Admin notification is idempotent and admin-only; no customer confirmation email. | Include email/provider handling in Privacy Policy and admin SOP; avoid forwarding externally. | Depends |
| Admin notes/internal review data | Internal notes may contain sensitive judgments, customer context, or operational decisions. | Protected admin detail, `admin_notes`, local fallback | Admin review notes are free text and can persist to Supabase. | Medium | High | Protected admin gate; service-role key server-only; fallback is local browser storage. | Define note-writing standards, retention, and deletion behavior. | Depends |
| Local browser/session storage behavior | Customer draft/submitted summary data or admin fallback notes may remain in a browser after use. | `novora_concept_brief`, `novora_submitted_concept_brief`, `novora_admin_brief_review_state`, `novora_design_brief` | Browser storage is used for draft recovery, receipt summary, and fallback review state. | High | Medium | Receipt integrity rules prevent local storage from impersonating confirmed server receipt. | Add browser-storage disclosure and consider clear/reset behavior in a later app task. | No for quiet MVP; depends before broader traffic |
| No payment data currently collected | Customers may still assume payment/order protections exist if copy is unclear. | Terms, checkout expectations, public copy | Payment provider is not active and no checkout exists. | Low after PR #90 copy fixes | Medium | Public copy boundaries say Concept Brief is not order/payment. | Keep Terms explicit that no payment data is collected by the current app. | No |
| No real AI generation currently, but future AI use would require separate disclosure | Future AI use could process customer brief text or references without adequate notice if added later casually. | Future AI generation, Privacy Policy, Terms, design flow | OpenAI env readiness is documented, but real generation is not implemented. | Medium as future risk | High | Repo rules prohibit AI-generation implementation without explicit task approval. | Create separate AI data-use disclosure plan before any real AI implementation. | No now; yes before AI launch |
| Service provider dependence | Provider outages or policy changes may affect app hosting, storage, database, admin notification, or DNS. | Vercel, Supabase, Resend, Cloudflare, optional rate-limit provider | The MVP relies on managed service providers. | Medium | Medium to High | Runbook identifies systems and incident response boundaries. | Include service-provider section in Privacy Policy and owner operations plan. | No for quiet MVP; depends for broader traffic |
| Breach/security incident response wording risk | Public policy might promise specific breach response timing or security guarantees NOVORA cannot operate. | Privacy Policy, security statements, owner operations | Incident SOP exists, but no legal incident-notice process is finalized. | Medium | High | Production security runbook gives internal incident steps. | Legal review should approve any incident wording and avoid over-specific promises. | Depends |
| Overpromising security | Copy could imply customer data is fully safe or protected beyond actual MVP controls. | Privacy Policy, upload notice, admin pages | Current security is practical MVP protection, not a certified compliance program. | Medium | High | Runbook says avoid exposing secrets and protect admin routes/storage. | Use modest security language and avoid absolute guarantees. | Yes if public copy overpromises |

## J. Owner Decision Checklist

Answer these before final policy/terms drafting:

- [ ] What privacy contact email should be public?
- [ ] What retention period should apply to abandoned briefs and browser-only
      drafts, if any server-side abandoned state exists later?
- [ ] What retention period should apply to submitted briefs?
- [ ] What retention period should apply to uploaded reference images?
- [ ] What retention period should apply to admin notes and notification events?
- [ ] Are reference images allowed to include third-party designs, inspiration
      photos, logos, symbols, or customer-owned images?
- [ ] Are customers required to confirm upload rights before submitting final
      references?
- [ ] Will NOVORA serve minors?
- [ ] Which launch regions are in scope first?
- [ ] Are California, EU, UK, Taiwan, Japan, or other international users in
      initial traffic scope?
- [ ] Will customer data ever be used for AI generation?
- [ ] If AI generation is added later, will uploaded reference images be used as
      AI input or only as manual review context?
- [ ] Will customer data be shared with designers, CAD contractors, factories,
      gemstone suppliers, logistics partners, or other vendors later?
- [ ] What manual deletion/export/correction process will be used before
      customer accounts exist?
- [ ] Who owns privacy requests and what response cadence is realistic?
- [ ] How should synthetic Production test records be labeled, retained, or
      removed?

## K. Recommended Next Agent Sequence

Keep each follow-up in its own scoped branch and approval boundary. Do not
combine legal/page planning with Production access, provider changes, or app
behavior changes.

1. **Agent 29E: implement minimal privacy/contact/upload notices in app copy**
   - Implemented minimal helper/acknowledgement copy in `/design/brief` and
     `/design/submitted`.
   - No final legal pages, footer links, consent behavior, or legal compliance
     claims were added.

2. **Agent 29F: draft Privacy Policy and Terms pages for owner/legal review**
   - Added draft review-only pages at `/legal/privacy-draft` and
     `/legal/terms-draft`, explicitly marked as draft for owner/legal review,
     not final legal text, and not legal advice.
   - Final Privacy/Terms publication, owner/legal approval, footer/header legal
     links, acceptance language, compliance claims, and launch approval remain
     future work.

3. **Agent 29G: retention/admin SOP planning**
   - Define manual queue checks, failed notification review, privacy request
     handling, deletion/export/correction workflow, admin note standards, and
     synthetic test-data handling.

4. **Agent 29H: future AI-data-use disclosure plan**
   - Prepare separate disclosure and consent planning before any real AI sketch
     generation uses customer text, reference images, or design preferences.

5. **Later separate task: final owner/legal approval and publication**
   - Only after the owner/legal review checklist is complete should NOVORA add
     final Privacy / Terms pages, footer links, or consent/banner behavior.
