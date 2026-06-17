# NOVORA Agent 47A Website Plugin And Optimization Planning

## 1. Purpose

This document is the Agent 47A docs-only planning packet for NOVORA MVP website
optimization and website-plugin strategy.

It helps decide which website improvements are safe, useful, and
MVP-appropriate before any plugin installation, third-party connection, app-code
change, analytics implementation, tracking change, or customer-data integration.

Agent 47A is planning only. It does not approve implementation, plugin
installation, package changes, environment changes, SQL, Supabase work,
deployment, AI generation, customer-facing AI sketch display, email delivery, or
AI sketch review write-path work.

## 2. Current MVP Boundary

NOVORA's current online product should remain a guided Concept Brief intake
experience for a custom jewelry studio.

The website may help customers understand the studio process, submit a brief,
upload final reference images, and wait for manual studio follow-up. It must not
imply that a submitted brief creates a final order, final price, CAD approval,
production approval, payment obligation, or automatic AI sketch delivery.

Safe optimization should improve clarity, speed, trust, accessibility, and
conversion without changing backend behavior or customer-data handling.

## 3. Website Optimization Categories

| Category | MVP purpose | Safe planning direction |
| --- | --- | --- |
| SEO basics | Help search engines understand NOVORA's custom jewelry Concept Brief flow. | Plan title, description, heading, canonical, sitemap, robots, and structured content checks before implementation. |
| Metadata / Open Graph / social preview | Improve link previews for `novora.design` and core public pages. | Recommend page-specific metadata and preview-image needs without generating images or changing app code in Agent 47A. |
| Page speed | Keep the first impression fast, especially on mobile. | Inventory likely low-risk improvements such as asset sizing, unused image review, font behavior review, and route payload review. |
| Image optimization | Reduce visual load while preserving studio quality. | Recommend optimized dimensions, alt text review, compressed assets, and careful preview-image policy. |
| Reference image upload UX | Help customers understand final upload expectations. | Plan copy and interaction improvements only; do not change upload security, storage, route behavior, or file handling in this task. |
| Form conversion / brief submission UX | Reduce abandonment in the Concept Brief flow. | Plan clarity improvements for required fields, validation, next steps, and receipt expectations. |
| Homepage CTA clarity | Make the primary action easy to understand. | Recommend clearer CTA language around starting a Concept Brief and studio follow-up. |
| Gallery / mock sketch presentation clarity | Avoid confusing examples with deliverables. | Recommend labels that distinguish mock, illustrative, internal, approved, and future gallery concepts. |
| Mobile responsiveness | Protect the customer journey on phone screens. | Plan focused responsive review of homepage, concept, brief, submitted, and public gallery/mock areas. |
| Accessibility basics | Improve usability and trust. | Plan semantic heading, label, contrast, focus state, button/link, error message, and alt text checks. |
| Privacy / cookie / tracking considerations | Avoid collecting or sharing customer data without review. | Require privacy review before cookies, tracking pixels, session recording, chat widgets, analytics, CRM, or booking tools. |
| Analytics planning | Learn where customers drop off without over-collecting data. | Plan event taxonomy and consent strategy before choosing or implementing any analytics tool. |
| Customer support / chat plugin considerations | Offer faster answers later. | Defer until data handling, transcript storage, consent, staffing, and escalation rules are reviewed. |
| Appointment / consultation plugin considerations | Support manual consultation later. | Defer until booking data, calendar access, timezone, cancellation, and privacy rules are approved. |
| CRM / email marketing plugin considerations | Support follow-up and owner operations later. | Defer until consent, data minimization, unsubscribe, retention, export/deletion, and provider access are reviewed. |
| Performance monitoring / error monitoring considerations | Detect production issues without leaking sensitive data. | Plan tool choice, redaction, sampling, alerting, and environment-secret handling before implementation. |

## 4. MVP Priority

High priority for the next implementation slice:

- Docs-first planning and issue inventory before any website plugin or
  third-party service.
- Low-risk metadata, page-title, description, and social-preview recommendations.
- Homepage CTA clarity around starting a Concept Brief, not placing an order.
- Basic accessibility review for labels, headings, focus states, contrast, alt
  text, and validation messaging.
- Mobile responsive review of the homepage and core Concept Brief journey.
- Image and performance recommendations that do not require package changes,
  provider setup, secrets, or backend changes.

Medium priority after the highest-risk wording and mobile issues are understood:

- Reference image upload UX clarity while preserving existing storage and upload
  security behavior.
- Form conversion and brief submission UX review, including required-field
  clarity and confirmation boundaries.
- Gallery and mock sketch presentation clarity so examples are not mistaken for
  generated, approved, CAD-ready, or customer-deliverable sketches.
- Structured analytics and monitoring planning as a docs-only step before tool
  selection.

Low priority / defer until privacy and operations review:

- Customer support chat plugin.
- Appointment or consultation booking plugin.
- CRM or email marketing plugin.
- Deep performance monitoring or error monitoring that records request,
  session, browser, or customer-flow details.

Explicitly not MVP:

- Payment plugins.
- Customer account plugins.
- Automatic AI generation plugins.
- Automatic customer delivery plugins.
- Uncontrolled analytics, ad tracking, retargeting pixels, or session replay.
- Plugins requiring broad environment-variable, secret, admin, or service-role
  access.
- Plugins that store, forward, summarize, or train on customer Concept Brief
  data without review.
- Plugins that can expose unreviewed AI sketches.
- Plugins that change upload, storage, access-control, signed-url, RLS, or
  security behavior.

## 5. Safe MVP Rules

Safe for MVP planning:

- Keep Agent 47A docs-only.
- Prefer low-risk copy, metadata, accessibility, responsive, and performance
  recommendations.
- Treat third-party services as future decisions requiring explicit approval.
- Avoid customer-data tracking unless a privacy review approves what is
  collected, why it is collected, how long it is kept, and who can access it.
- Do not implement analytics until the tool choice, event taxonomy, consent
  strategy, retention, and redaction rules are approved.
- Do not add chat, CRM, email marketing, booking, session replay, monitoring, or
  ad pixels until data handling is reviewed.

Avoid for now:

- Payment, account, AI-generation, automatic delivery, ad-tracking, and broad
  integration plugins.
- Any plugin that needs secrets, server-side provider keys, admin keys,
  service-role keys, unrestricted webhook access, or broad write access.
- Any integration that sends customer names, emails, design notes, reference
  filenames, uploaded images, admin notes, review status, generated-output data,
  or internal sketch state to a third party before review.

## 6. AI Sketch Business Rules

Website optimization must preserve these NOVORA AI sketch boundaries:

- Customers submit a Concept Brief.
- GPT or an image model may only generate internal drafts in a future approved
  implementation.
- Human review is required before any customer-visible sketch.
- GPT may assist revision prompts or redraw work only inside a future approved
  internal workflow.
- Human final approval is required.
- The customer only sees the human-reviewed version.
- Unreviewed AI or GPT drafts must never be shown, linked, indexed, tracked,
  embedded, delivered, or exposed to customers.
- AI sketch output remains a concept sketch, not CAD, quote, order, production
  approval, or final jewelry specification.
- `approved_for_customer` is not equal to `approved_for_gallery`.
- AI generation success alone must not approve a sketch.
- Customer-facing sketch delivery remains email-only after human review,
  optimization, and approval.
- Customer pages must not display unreviewed AI sketches.

## 7. Write-Path Non-Interference

Agent 47A must not conflict with the future AI sketch review write-path work.

This planning task must not:

- Implement Agent 46B or any AI sketch review write path.
- Modify AI sketch review write behavior.
- Modify admin write behavior.
- Add insert, update, delete, or upsert behavior.
- Add an API route.
- Add a server action.
- Modify, read, display, or return `reviewer_note`.
- Modify, read, display, or return `customer_safe_note`.
- Modify Supabase schema, RLS, grants, policies, storage, migrations, or live
  data.

## 8. Phased Plan

| Phase | Scope | Allowed next step |
| --- | --- | --- |
| Agent 47A | Docs-only website optimization and plugin strategy. | Create planning PR only. |
| Agent 47B | Low-risk, no-third-party website optimization implementation. | Separate approval for app-code changes focused on metadata, copy clarity, responsive/accessibility fixes, and image/performance hygiene. |
| Agent 47C | Analytics and monitoring planning, docs-only. | Decide event taxonomy, privacy posture, consent, retention, redaction, and provider shortlist without installing tools. |
| Agent 47D | One approved third-party integration at a time, if still needed. | Separate approval per provider, including data handling, env/secrets, deploy, rollback, and owner/legal review. |
| Agent 47E | Post-optimization QA and smoke testing. | Verify core customer journey, mobile views, metadata previews, accessibility basics, and no customer-facing AI sketch exposure. |

## 9. Decision Matrix

| Optimization/plugin category | Business value | Implementation risk | Customer data/privacy risk | Env/secrets requirement | Deployment risk | Recommended timing | Allowed next step |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO basics | Medium: improves discoverability and page clarity. | Low if limited to metadata and content structure. | Low if no tracking is added. | None expected. | Low. | High priority. | Plan metadata/content audit; implement later in no-third-party Agent 47B. |
| Metadata / Open Graph / social preview | Medium: improves shared links and brand trust. | Low to medium depending on image asset needs. | Low if no external preview service is used. | None expected. | Low. | High priority. | Plan page-specific titles, descriptions, and preview asset requirements. |
| Page speed | High: protects mobile conversion and trust. | Low to medium depending on asset/code changes. | Low if no monitoring tool is added. | None expected for basic optimization. | Low to medium. | High priority. | Audit asset sizes and route behavior in a future implementation slice. |
| Image optimization | High: improves load time and visual polish. | Low for compression/sizing; medium if asset replacement is broad. | Low unless images contain customer data, which public assets should not. | None expected. | Low. | High priority. | Recommend dimensions, alt text, compression, and safe public asset policy. |
| Reference image upload UX | Medium: can reduce customer confusion. | Medium because upload copy must not imply unsafe storage or final review promises. | Medium because uploads are customer data. | None for copy-only; possible future storage/security review if behavior changes. | Medium if upload behavior changes. | Medium priority. | Plan copy/UX clarity only; no storage or route behavior change in Agent 47A. |
| Form conversion / brief submission UX | High: directly affects Concept Brief completion. | Medium because submitted confirmation has strict persistence rules. | Medium because forms collect customer and design data. | None for low-risk UI copy. | Medium if form logic changes. | Medium priority. | Plan required-field and validation clarity without changing persistence in Agent 47A. |
| Homepage CTA clarity | High: directs customers to the correct MVP action. | Low if copy-only. | Low. | None. | Low. | High priority. | Recommend CTA language around Concept Brief intake and studio follow-up. |
| Gallery / mock sketch presentation clarity | Medium: builds trust while avoiding false promises. | Medium because sketch wording can cross AI/CAD/order boundaries. | Low if only public mock examples are used. | None. | Low. | Medium priority. | Plan labels that separate mock examples, internal drafts, customer approval, and gallery approval. |
| Mobile responsiveness | High: likely affects most first visits. | Low to medium depending on layout changes. | Low. | None. | Low. | High priority. | Plan focused mobile review and future browser verification. |
| Accessibility basics | Medium: improves usability and professionalism. | Low to medium. | Low. | None. | Low. | High priority. | Plan labels, headings, focus, contrast, alt text, and visible error checks. |
| Privacy / cookie / tracking considerations | High: prevents risky data collection. | Medium if policy/legal copy changes; high if tracking is added. | High. | Possible, depending on tool. | Medium to high. | High priority for planning; implementation deferred. | Require owner/privacy review before adding cookies, pixels, session replay, or tracking. |
| Analytics planning | Medium: helps understand drop-off. | Medium if event instrumentation changes app code. | Medium to high depending on event payloads and identifiers. | Possible. | Medium. | Agent 47C docs-only before implementation. | Define event taxonomy, consent, retention, and provider criteria before tool choice. |
| Customer support / chat plugin | Medium later: can answer customer questions. | Medium to high. | High because transcripts may include design and contact data. | Likely. | Medium. | Low priority / defer. | Do not install; prepare data-handling review first. |
| Appointment / consultation plugin | Medium later: can support manual studio follow-up. | Medium. | Medium to high because booking data can include contact and availability. | Likely. | Medium. | Low priority / defer. | Do not install; review booking data, calendar access, consent, and staffing first. |
| CRM / email marketing plugin | Medium later: can organize follow-up and campaigns. | High. | High because it stores or syncs customer contact and brief context. | Likely. | Medium to high. | Low priority / defer. | Do not install; require consent, retention, unsubscribe, export/deletion, and provider review. |
| Performance monitoring / error monitoring | Medium: helps find Production issues. | Medium. | Medium to high if request/session data is captured. | Likely. | Medium. | Agent 47C docs-only before implementation. | Plan redaction, sampling, alerting, and secret handling before choosing a tool. |
| Payment plugins | Not aligned with current MVP. | High. | High. | Yes. | High. | Explicitly not MVP. | Avoid. Separate future payment/auth/order planning required. |
| Customer account plugins | Not aligned with current MVP. | High. | High. | Yes. | High. | Explicitly not MVP. | Avoid. Separate future auth/account planning required. |
| Automatic AI generation plugins | Conflicts with current AI review boundary. | High. | High because prompts, references, and outputs may be exposed or stored. | Yes. | High. | Explicitly not MVP. | Avoid. Separate approved AI generation architecture required. |
| Automatic customer delivery plugins | Conflicts with human review and email-only delivery boundary. | High. | High. | Likely. | High. | Explicitly not MVP. | Avoid. Separate approved delivery workflow required. |
| Uncontrolled analytics / ad tracking | Low near-term value and high trust risk. | High. | High. | Likely. | Medium to high. | Explicitly not MVP. | Avoid until privacy, consent, and launch strategy are approved. |
| Broad env/secrets plugins | Low near-term value. | High. | High. | Yes. | High. | Explicitly not MVP. | Avoid unless a future task approves exact secret scope. |
| Customer brief data forwarding plugins | Operationally risky before review. | High. | High. | Likely. | High. | Explicitly not MVP. | Avoid until provider, retention, and privacy review are complete. |
| Upload/storage/security-changing plugins | Not safe during MVP optimization. | High. | High. | Likely. | High. | Explicitly not MVP. | Avoid unless a separate storage/security task approves exact behavior. |

## 10. Recommended Next Work

The recommended next Agent after this planning PR is Agent 47B: a low-risk,
no-third-party implementation slice.

Agent 47B should be separately approved and should stay limited to changes such
as metadata, copy clarity, mobile/accessibility fixes, public image hygiene, and
performance improvements that do not require new packages, plugins, services,
environment variables, SQL, Supabase changes, uploads/storage changes, OpenAI,
image generation, customer-facing sketch display, email delivery, payments,
accounts, CAD, orders, or production workflows.

Agent 47C should be the next step before any analytics or monitoring tool is
chosen. It should define the event taxonomy, consent posture, data minimization,
redaction, retention, provider shortlist, and owner/privacy review requirements.
