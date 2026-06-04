# NOVORA Partner Preview / Quiet MVP Testing Checklist

## A. Scope And Boundary

This is a docs-only checklist for a controlled NOVORA partner preview with a
small group of trusted industry reviewers.

It is not:

- a public launch;
- a paid ads, social media, or broader traffic launch;
- commercial readiness approval;
- legal compliance certification;
- final Privacy Policy or Terms publication;
- a request for partners to access Production admin pages;
- permission to inspect, export, delete, or modify real customer data; or
- approval to create real customer submissions.

Partners should review the public customer-facing experience only. The owner
should not share protected admin links, admin access keys, provider consoles,
customer records, secret values, or screenshots containing customer/admin data.

## B. Current MVP Capabilities Partners May Test

Trusted partners may review the current public/customer-facing flow as a quiet
MVP preview:

- homepage positioning and the Concept Brief entry path;
- `/design/start` as the start of the guided design flow;
- `/design/concept` guided jewelry intake for a concept direction;
- `/design/brief` contact fields, final reference upload, privacy/contact/upload
  notices, and submit boundary copy;
- `/design/submitted` receipt and manual follow-up framing;
- Concept Brief versus CAD boundary messaging;
- visible draft or future-workflow boundaries where the public pages expose
  them.

Important testing boundary:

- Live-site submissions may create real Supabase records and real admin
  notification emails.
- For partner preview, prefer controlled synthetic or low-risk test data only.
- Partner test submissions should happen only if the owner approves them and
  should use clearly marked names/emails such as `Partner preview test`.
- The partner preview does not require partners to access Production admin
  pages or inspect real customer data.

## C. What Partners Must Not Assume

Partners must not treat the current website as a complete commercial workflow.

- No real AI sketch generation is currently implemented.
- `/design/sketch` is not production AI output unless separately verified in a
  future approved task.
- No production CAD automation exists.
- No automatic quote or pricing engine exists.
- No payment or checkout exists.
- No real order tracking exists.
- No customer account system exists.
- The website does not start production.
- Draft Privacy and Terms pages are not final published legal policies.
- A Concept Brief is not an order confirmation, quote confirmation, CAD
  approval, payment confirmation, sourcing confirmation, or production
  confirmation.

## D. Partner Tester Rules

Partners should follow these rules during preview testing:

- Use synthetic or low-risk test information.
- Do not submit real customer data unless the owner separately approves that
  specific use.
- Do not upload confidential client files.
- Do not upload copyrighted competitor designs, brand artwork, third-party
  designs, or customer images unless the tester has the right to share them.
- Do not upload government IDs, payment information, medical information, or
  sensitive personal data.
- Use safe test reference images only if an upload is needed.
- Mark test submissions clearly, for example: `Partner preview test`.
- Do not share admin links, access keys, provider links, protected URLs, or
  signed reference-image URLs.
- Do not forward screenshots that include customer data, admin data, protected
  admin URLs, or uploaded reference images.
- Do not invite outside users or customers until the owner approves.

## E. Owner Pre-Test Checklist

Before inviting partners, the owner should confirm:

- [ ] Current site copy is acceptable for a controlled MVP preview.
- [ ] `privacy@novora.design` receives email as expected.
- [ ] The invited partner group is small, trusted, and named.
- [ ] Partner testers understand this is a controlled MVP preview, not public
      launch.
- [ ] No paid ads, public campaign, influencer push, or social launch is planned
      for this preview.
- [ ] Test submissions, if approved, will be clearly labeled.
- [ ] A specific owner/admin will monitor normal admin notifications and the
      protected admin queue outside the partner session.
- [ ] Feedback collection method is defined before invitations are sent.
- [ ] Owner has decided whether test records should be kept for review or later
      considered for deletion under a separately approved process.
- [ ] No real customer sensitive data will be used.

## F. Suggested Partner Testing Script

1. Open the homepage and note the first impression.
2. Start the design flow.
3. Choose a piece type and complete the guided Concept Brief path.
4. Complete the final brief page with synthetic contact details.
5. Optionally attach a safe test reference image.
6. Submit the brief only if the owner approved live test submissions.
7. Confirm whether the receipt page is clear.
8. Record any clarity, trust, jewelry-intake, or business-usefulness questions.
9. Do not expect quote, CAD, payment, customer account, production, or order
   tracking behavior.

## G. Feedback Collection Template

Use this compact template for each reviewer.

| Field | Response |
| --- | --- |
| Tester name/company |  |
| Role | Designer / factory / gem supplier / logistics / retail / other |
| Device/browser |  |
| Test path completed |  |
| Confusing copy |  |
| Missing options |  |
| Jewelry intake accuracy |  |
| Trust/privacy concerns |  |
| Perceived professionalism |  |
| Where they expected human follow-up |  |
| Was the Concept vs CAD boundary clear? | Yes / No / Partly |
| Would they show this to a customer? | Yes / No / Not yet |
| Top 3 improvement suggestions |  |
| Severity | Blocker / important / nice-to-have |

## H. Partner Preview Invitation Draft

Hi [Name],

NOVORA is preparing a quiet MVP preview for a small group of trusted industry
partners. This is not a public launch.

Please use synthetic or low-risk test information only, and do not submit
sensitive customer data or confidential client files. The website currently
collects Concept Briefs for NOVORA review. CAD, quote discussion, sourcing, and
production remain manual follow-up steps outside the website.

I would value your feedback on clarity, trust, the jewelry intake flow, and
whether this feels useful from your business perspective. Please note anything
that feels confusing, overpromised, missing, or not yet ready to show customers.

Thank you for reviewing carefully.

## I. Test Data Handling Note

If partner testing happens on the live site, test submissions may enter
Supabase and may trigger real admin notification emails. For this reason:

- use synthetic details;
- mark test submissions clearly;
- avoid sensitive personal, payment, medical, ID, confidential client, or
  unauthorized third-party design information;
- owner should later decide whether to keep or delete test data under a
  separately approved process; and
- this Agent must not inspect, export, delete, or modify real customer data.

## J. Launch Readiness Implication

A limited partner preview can begin before full public launch only if:

- invited testers are trusted and controlled by the owner;
- synthetic or low-risk data is used;
- expectations are clear before testing starts;
- the owner monitors feedback and normal operational signals; and
- no paid traffic, public campaign, or outside-user invitation is sent.

Broader public launch still needs:

- final Privacy/Terms owner/legal review;
- owner/legal decision on footer or header legal links;
- retention and privacy-request SOP readiness;
- public copy final check;
- Production rate-limit/provider enforcement decision if traffic grows; and
- a clear support and response process.

## K. Risk Register

| Risk | What may happen | Affected area | Likelihood | Severity | Mitigation |
| --- | --- | --- | --- | --- | --- |
| Partner uses real customer data | Personal or business-sensitive information enters live systems during preview. | Concept Briefs, Supabase, admin notification | Medium | High | Require synthetic or low-risk data and owner-approved test labeling. |
| Partner misunderstands AI/CAD capability | Partner thinks NOVORA already generates production-ready AI sketches or CAD. | Product trust, partner feedback | Medium | High | State that real AI generation and CAD automation are not implemented. |
| Partner expects quote/payment/order tracking | Reviewer evaluates the MVP as a transactional storefront. | Commercial expectations | Medium | Medium | Explain that quote, payment, production, and order tracking remain manual or unavailable. |
| Reference image copyright/privacy issue | Unauthorized designs or sensitive images are uploaded. | Uploads, storage, legal/privacy | Medium | High | Use safe test images only and require rights to share anything uploaded. |
| Test submissions pollute admin data | Test records look like real leads or create noisy notifications. | Admin queue, email operations | Medium | Medium | Mark tests clearly and decide later whether to retain or delete under approved process. |
| Privacy/legal draft mistaken as final policy | Partner assumes draft pages are published legal commitments. | Legal review, trust | Low | High | Repeat that draft Privacy/Terms pages are not final policy. |
| Admin link/key exposure | Protected admin access or URLs are shared beyond owner control. | Admin security, customer data | Low | Critical | Do not share admin links, keys, protected URLs, or screenshots containing admin data. |
| Screenshots shared externally | Customer/admin data or protected context leaks through images. | Privacy, reputation | Medium | High | Only share screenshots cleared of customer/admin data and protected URLs. |
| Feedback too vague to act on | Owner receives general opinions without implementation value. | Product planning | Medium | Medium | Use the structured feedback template with severity. |
| Scaling from partner preview to public launch too fast | NOVORA gets public traffic before legal, privacy, abuse-control, and operations gaps are ready. | Launch readiness | Medium | High | Keep preview invite-only and treat public launch as a separate approval gate. |

## L. Recommended Next Agent Sequence

1. **Agent 30B: owner-approved partner preview copy/message refinement**
   - Refine invitation wording, tester rules, and owner-facing notes after owner
     review.
2. **Agent 30C: optional lightweight feedback form/template doc or spreadsheet**
   - Convert the feedback template into an owner-usable external form or
     spreadsheet plan without adding app features.
3. **Agent 30D: controlled partner preview smoke plan**
   - Plan exactly how the owner will run a small preview without accessing real
     customer data or creating unmanaged Production records.
4. **Agent 30E: post-preview findings summary**
   - Summarize feedback, blockers, important improvements, and nice-to-have
     ideas after the owner completes preview testing.
5. **Agent 30F: public launch readiness gap review**
   - Re-evaluate privacy/legal, operations, abuse-control, support, and public
     copy gaps before any public/social/paid traffic.
