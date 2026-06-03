# NOVORA Owner Privacy / Retention Decision Packet

## A. Scope And Boundary

This is a docs-only owner decision packet for NOVORA privacy, retention, launch,
data-sharing, and customer-data handling choices. It turns the planning from
Agents 29D, 29F, and 29G into clear owner choices.

This is not legal advice, does not claim legal compliance, and does not publish
final Privacy Policy or Terms text. Owner/legal review is required before final
public policy publication, broader launch, footer/header legal links, legal
acceptance checkbox behavior, or binding operational commitments.

Agent 29H did not access Production, protected admin pages, provider dashboards,
secrets, SQL, Supabase customer data, Vercel settings, Resend, Cloudflare, real
email, or real customer records. This packet does not perform deletion, export,
correction, data inspection, provider changes, app changes, test changes, deploys,
payment, auth, CAD, order, or AI-generation work.

## B. Current State Summary

- Concept Brief submission persistence exists and customer receipt success is
  gated on confirmed server persistence, a valid public reference, and a valid
  Concept Brief UUID.
- NOVORA collects customer name, email, optional phone/WhatsApp, country/region,
  and contact note for Concept Brief review and manual follow-up.
- Final reference images can be uploaded from `/design/brief`; planning
  references on `/design/concept` are not final uploaded files.
- Admin notification email works for owner/admin notification; it is not a
  customer confirmation email workflow.
- Protected admin list/detail review, review status, and internal notes exist.
- Draft review-only pages exist at `/legal/privacy-draft` and
  `/legal/terms-draft`; no final `/privacy` or `/terms` routes are published.
- No payment, customer login, order system, order tracking, CAD automation, quote
  engine, production workflow, or real AI-generation implementation exists.
- CAD, quote discussion, sourcing, production, QC, packaging, and logistics
  remain offline/manual and require separate owner confirmation if a project
  proceeds.

## C. Owner Decision Table

| Decision area | Why it matters | Recommended default | Alternative options | Risk if undecided | Owner choice placeholder | Legal review needed? |
| --- | --- | --- | --- | --- | --- | --- |
| Public privacy contact email | Customers need a clear channel for privacy questions and requests. | Create a dedicated privacy/contact address before broader launch. | Use existing owner inbox temporarily; publish only a general contact address. | Requests may be missed or routed inconsistently. | Owner answer: ____ | Yes |
| Data retention for unresponsive submitted briefs | Submitted but inactive briefs contain PII, design notes, and possible reference context. | Pick a manual review window before broader traffic; do not publish until operationally workable. | Review at 90, 180, or 365 days; retain until owner closes the lead. | Data may be kept too long or deleted too early. | Owner answer: ____ | Yes |
| Data retention for declined briefs | Declined briefs may no longer need full contact, notes, or images. | Choose a shorter review/removal window than active briefs. | Delete/anonymize after 30, 90, or 180 days; keep minimal closure record. | Unneeded PII and reference images may linger. | Owner answer: ____ | Yes |
| Data retention for completed offline projects | Website intake may overlap with offline business records. | Separate website intake retention from offline legal/accounting/project records. | Retain intake record for a fixed period; move project history into offline system. | Policy may conflict with business or legal record needs. | Owner answer: ____ | Yes |
| Data retention for final reference images | Images carry privacy, copyright, and design-rights risk. | Retain only while needed for review or active project discussion. | Remove after verified request; review after 90/180 days; archive only with approval. | Image disputes or over-retention may be harder to resolve. | Owner answer: ____ | Yes |
| Data retention for admin notes | Notes can over-collect sensitive or subjective information. | Keep notes factual, minimal, and subject to a stricter review window. | Delete/redact with declined briefs; retain concise status history only. | Internal notes may become stale or unnecessarily sensitive. | Owner answer: ____ | Yes |
| Data retention for admin notification events | Events support idempotency and troubleshooting but include recipient/status metadata. | Retain only as long as operationally useful for troubleshooting and audit. | Review at 90, 180, or 365 days; delete older events later through approved tooling. | Operational metadata may accumulate without purpose. | Owner answer: ____ | Owner/legal |
| Manual deletion request handling | No self-service customer account exists. | Handle manually through owner-approved request channel; no backend automation yet. | Defer deletion until tooling exists; use external tracker; create future admin tool. | Owner may be unable to respond consistently. | Owner answer: ____ | Yes |
| Manual correction request handling | Customers may need contact or brief details corrected. | Verify requester, record requested field, and process only in a separately approved customer-data task. | Accept only minor contact corrections; decline changes after project closure. | Incorrect records or unauthorized changes may occur. | Owner answer: ____ | Yes |
| Manual export/access request handling | Customers may ask what NOVORA stores about them. | Prepare owner-reviewed manual summaries; do not export raw database dumps or admin notes by default. | Provide only submitted brief copy; include metadata summary; require legal review per request. | Over-disclosure or under-disclosure risk. | Owner answer: ____ | Yes |
| Identity verification method for privacy requests | Wrong-person access/deletion could expose or remove customer data. | Email-based verification using submitted email plus public reference initially. | Require additional proof; use manual owner call-back; defer high-risk requests to legal. | Weak verification may expose or delete the wrong record. | Owner answer: ____ | Yes |
| Reference image removal request handling | Images may include personal, third-party, or copyrighted material. | Verify requester and escalate to owner/legal before any storage or metadata action. | Remove image object only; remove object plus metadata; retain minimal tombstone. | Rights disputes and inconsistent deletion handling. | Owner answer: ____ | Yes |
| Designer/factory sharing of contact details vs minimized specs | Offline partners may not need customer PII. | Share minimized design specs only unless customer contact is necessary and approved. | Share contact details only for active projects; prohibit direct partner contact. | Over-sharing PII with offline partners. | Owner answer: ____ | Yes |
| Designer/factory sharing of reference images | Partners may need visuals, but images carry rights and privacy risk. | Share only when needed for approved project stage and customer notice/consent position is clear. | Do not share images externally; share watermarked/minimized references; require per-project approval. | Unauthorized redistribution or copying disputes. | Owner answer: ____ | Yes |
| Launch regions for early testing | Privacy, consumer, language, and cross-border expectations depend on region. | Keep early testing owner-led and controlled in chosen regions. | US-only; US plus selected Asia markets; invite-only international testing. | Final policy may not fit actual traffic. | Owner answer: ____ | Yes |
| Minors policy | A minor could submit personal data without a clear rule. | Exclude minors and state NOVORA is not directed to children/minors after legal review. | Add age gate later; handle suspected minor submissions case by case. | Higher privacy/legal sensitivity. | Owner answer: ____ | Yes |
| Future AI use of customer brief/images | Future AI generation or training needs separate disclosure and approval. | Do not use customer data/images for AI training; do not add AI use without separate approved disclosure. | Use brief text only for customer-requested AI generation; prohibit image AI input; allow opt-in only. | AI data-use ambiguity could undermine trust and legal review. | Owner answer: ____ | Yes |
| Whether draft legal pages can later become public final pages | Draft pages are not approved final policy. | Convert only after owner/legal review and final copy approval. | Replace with new final pages; keep drafts internal/review-only. | Draft text may be mistaken for final legal policy. | Owner answer: ____ | Yes |
| Whether footer/header legal links should be added later | Public links imply reviewed public legal pages exist. | Add only after final Privacy/Terms pages are approved. | Footer only; footer plus header; include contact link later. | Links may expose stale draft pages too early. | Owner answer: ____ | Yes |
| Whether a legal acceptance checkbox is needed later | Checkbox behavior can create legal/UX commitments. | Do not add until legal review explicitly approves wording and behavior. | Passive notice near submit; required checkbox; separate terms acknowledgement. | Checkbox may overpromise, conflict with policy, or create unwanted friction. | Owner answer: ____ | Yes |

## D. Recommended Defaults For A Cautious MVP

These are non-binding recommended defaults for owner/legal review. They are not
implemented rules and should not be published as final policy until NOVORA can
operate them consistently.

- Use a dedicated public privacy/contact email before broader launch.
- Keep no self-service deletion, export, or correction portal initially; handle
  verified requests manually through an owner-controlled tracker.
- Use submitted email plus `NOVORA-CB-...` public reference as the initial
  identity verification method, with owner/legal escalation when unclear.
- Choose manual review windows for unresponsive, declined, completed, image,
  admin-note, and notification-event retention before public promotion.
- Share minimized design specs with offline designers/factories by default; do
  not share full customer contact details unless necessary and approved.
- Share reference images externally only for an approved project stage with clear
  customer notice/consent position.
- Do not use customer brief text or uploaded images for AI training. Do not add
  real AI use without separate approval and disclosure.
- Exclude minors and avoid directing NOVORA to children/minors.
- Start with controlled, owner-led launch regions and revisit cross-border
  language before broader international traffic.
- Add final legal pages, footer/header legal links, and any legal acceptance
  checkbox only after owner/legal review.

## E. Owner Decision Form

Copy this checklist into the owner review workspace and fill in the blanks.
Items marked `legal review` should not become public policy until reviewed.

- [ ] Privacy contact email: ____ `legal review`
- [ ] Unresponsive submitted briefs: choose 90 / 180 / 365 days / manual review only. Owner answer: ____ `legal review`
- [ ] Declined briefs: choose 30 / 90 / 180 days / minimal closure record. Owner answer: ____ `legal review`
- [ ] Completed offline projects: website intake retention separate from offline records? Yes / No. Owner answer: ____ `legal review`
- [ ] Final reference images: delete on verified request? Yes / No / case by case. Owner answer: ____ `legal review`
- [ ] Admin notes: shorter review window than core brief data? Yes / No. Owner answer: ____ `legal review`
- [ ] Notification events: choose 90 / 180 / 365 days / operational review only. Owner answer: ____ `owner/legal`
- [ ] Deletion requests: manual only for MVP? Yes / No. Owner answer: ____ `legal review`
- [ ] Correction requests: manual owner-approved changes only? Yes / No. Owner answer: ____ `legal review`
- [ ] Export/access requests: manual owner-reviewed summary only? Yes / No. Owner answer: ____ `legal review`
- [ ] Identity verification: submitted email plus public reference? Yes / No / stronger method. Owner answer: ____ `legal review`
- [ ] Reference image removal: owner/legal escalation before action? Yes / No. Owner answer: ____ `legal review`
- [ ] Designers/factories receive customer contact details? No / only when necessary / yes for active projects. Owner answer: ____ `legal review`
- [ ] Designers/factories receive reference images? No / only when needed / per-project approval. Owner answer: ____ `legal review`
- [ ] Early launch regions: ____ `legal review`
- [ ] Minors excluded? Yes / No / legal to decide. Owner answer: ____ `legal review`
- [ ] Future AI use of customer brief/images: never without opt-in / customer-requested generation only / undecided. Owner answer: ____ `legal review`
- [ ] Draft legal pages may become final after review? Yes / replace with new pages / undecided. Owner answer: ____ `legal review`
- [ ] Footer/header legal links later? Footer only / footer plus header / undecided. Owner answer: ____ `legal review`
- [ ] Legal acceptance checkbox later? No / passive notice / required checkbox / legal to decide. Owner answer: ____ `legal review`

## F. Launch Readiness Implications

Unresolved owner decisions block different launch steps:

- Broader public traffic: blocked by no privacy contact, no retention direction,
  no request-handling SOP, unresolved launch regions, and stale draft legal pages.
- Paid ads or larger social launch: blocked by unresolved privacy/retention,
  partner-sharing, reference-image, minors, and AI-use positions.
- Final Privacy/Terms publication: blocked until owner choices and legal review
  convert draft review pages into approved public text.
- Footer/header legal links: blocked until final public legal pages exist.
- Deletion/correction SOP: blocked until request channel, verification method,
  owner tracker, response ownership, and retention exceptions are chosen.
- Designer/factory sharing workflow: blocked until minimized data rules,
  reference-image sharing rules, customer notice/consent position, and recipient
  logging expectations are chosen.
- Future AI feature disclosure: blocked until the owner decides whether customer
  brief text or images may be used for AI input, generation, training, or provider
  processing.

## G. Future Implementation Sequence

Keep each item in a separate scoped branch and approval boundary.

1. **Agent 29I: owner-filled decision packet integration**
   - Incorporate owner answers into this packet or a follow-up decision record.
   - Do not implement app behavior or publish final legal text.
2. **Agent 29J: final Privacy/Terms revision draft**
   - Revise `/legal/privacy-draft` and `/legal/terms-draft` based on owner/legal
     choices.
   - Still keep pages draft unless final publication is explicitly approved.
3. **Agent 29K: footer/legal link implementation**
   - Add footer/header legal links only if final pages and owner/legal approval
     exist.
   - Treat checkbox/form behavior as a separate explicit approval item.
4. **Agent 29L: admin privacy SOP checklist and manual request log template**
   - Create owner-operable docs for queue checks, privacy request tracking,
     identity verification, notes, reference images, and escalation.
5. **Agent 30A or later: technical deletion/export workflow planning**
   - Plan backend/admin tooling only after owner decisions, legal review, and
     admin tooling maturity.
   - SQL, Supabase, real customer data, backend behavior, auth, Production, and
     provider changes require separate explicit approval.

## H. Risk Register

| Risk | What may happen | Affected area | Likelihood | Severity | Mitigation | Owner decision needed |
| --- | --- | --- | --- | --- | --- | --- |
| No public privacy contact selected | Customers cannot find a request channel. | Privacy requests, public trust | High | High | Choose a dedicated email before broader launch. | Privacy contact email |
| No retention periods selected | Data may be kept too long or deleted inconsistently. | Briefs, contacts, uploads, notes, events | High | High | Choose review windows before final policy. | Retention by status/category |
| No deletion/export request SOP | Requests may be missed or handled ad hoc. | Owner operations | High | High | Manual tracker and owner/legal escalation. | Manual request workflow |
| Weak identity verification | Wrong-person access or deletion may occur. | Access, deletion, correction, export | Medium | High | Use submitted email plus public reference at minimum. | Verification method |
| Reference image rights disputes | Customer may upload third-party or unauthorized images. | Uploads, storage, partner review | Medium | High | Upload-rights notice and removal escalation. | Image rights/removal policy |
| Reference image removal requests | NOVORA may not know whether to delete file, metadata, or both. | Storage and metadata | Medium | High | Define verified request path before execution. | Removal handling |
| Over-sharing with offline designers/factories | Customer PII or images may be shared unnecessarily. | Offline partner workflow | Medium | High | Share minimized specs by default. | Partner sharing rules |
| Future AI data use ambiguity | Future AI use may be added without clear notice. | AI roadmap, privacy copy | Medium | High | Prohibit AI use without separate approval/disclosure. | AI data-use position |
| Minors/cross-border customers | Additional legal expectations may apply. | Intake, Privacy/Terms, support | Medium | High | Choose launch regions and minors policy. | Regions and minors |
| Stale draft legal pages | Draft pages may be mistaken for final policy. | Legal review pages | Medium | Medium to High | Keep draft labels and track review status. | Publication readiness |
| Launching before legal review | Public traffic may arrive before policy and SOP are ready. | Public site, owner operations | Medium | High | Hold broader launch until reviewed. | Launch approval gate |
| Adding footer legal links too early | Links may point to draft or incomplete pages. | Navigation, public trust | Medium | Medium | Add links only after final pages. | Link timing |
| Adding checkbox without legal review | Checkbox may create unsupported commitments or friction. | Brief form, legal UX | Medium | High | Keep no checkbox until approved. | Acceptance behavior |

## I. Clear Non-Goals

- No real data deletion, export, correction, or inspection.
- No SQL execution.
- No app code, test, package, backend, API, form, footer, header, or checkbox
  changes.
- No final Privacy Policy or Terms publication.
- No Production access, protected admin access, provider dashboard access, email
  send, or deployment.
- No customer-data inspection, compliance certification, launch approval, or
  commercial-readiness claim.
- No payment, auth, CAD, order, production, or AI-generation implementation.
