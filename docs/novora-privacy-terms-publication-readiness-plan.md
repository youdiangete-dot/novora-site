# NOVORA Privacy / Terms Publication Readiness Plan

## 1. Purpose

This is a publication readiness plan for NOVORA before limited external beta.
It is not final Privacy Policy text, not final Terms text, and not legal advice.

This plan identifies the current repository state, the remaining placeholders
and owner decisions, and the safe follow-up implementation work needed before
public Privacy / Terms pages can be published.

This plan does not publish legal pages, convert draft pages into public pages,
change routes, change UI, change footer or header links, or create binding
legal commitments.

## 2. Current Repo State

Current route and page state:

- Draft Privacy review page exists at `app/legal/privacy-draft/page.tsx`.
- Draft Terms review page exists at `app/legal/terms-draft/page.tsx`.
- Both draft pages are route-accessible under `/legal/...`, but they are visibly
  labeled as draft for owner/legal review, not final legal text, and not legal
  advice.
- No final public `/privacy` route exists in `app/privacy`.
- No final public `/terms` route exists in `app/terms`.
- `app/legal/privacy-draft/page.tsx` still contains placeholder copy:
  `[privacy contact email to be confirmed]`.
- `docs/novora-owner-privacy-retention-decision-packet.md` records
  `privacy@novora.design` as an owner-selected MVP privacy contact, but the
  draft Privacy page has not been updated to use that address.

Current navigation and link state:

- `components/SiteHeader.tsx` includes navigation for `How It Works`,
  `Concept vs CAD`, `CAD Process`, and `Start a Concept Brief`.
- `components/SiteHeader.tsx` does not include public Privacy or Terms links.
- `app/layout.tsx` renders the global `SiteHeader` and page content, but no
  footer legal links.
- No inspected public header or footer link points to final `/privacy` or
  `/terms` pages because those pages do not exist.

Current documentation and test state:

- `docs/novora-privacy-terms-data-handling-copy-plan.md` already plans
  Privacy / Terms / data-handling copy and says owner/legal review is required
  before public policy pages, cookie/consent language, or footer legal links.
- `docs/novora-owner-privacy-retention-decision-packet.md` records some owner
  MVP defaults, including `privacy@novora.design`, but leaves several
  publication decisions unresolved.
- `docs/novora-retention-admin-privacy-sop-plan.md` records privacy request,
  retention, admin handling, reference image, and SOP planning as draft
  operating direction only.
- `tests/e2e/design-concept-validation.spec.ts` includes Playwright coverage
  asserting the draft legal pages render with draft/legal-review boundaries.

Beta-readiness impact:

- NOVORA has draft legal review pages, but no final public Privacy / Terms
  pages for external users.
- The draft Privacy page still has a placeholder contact line.
- Public legal links should not be added until reviewed final pages exist.
- Limited external beta should not depend on draft pages that are explicitly
  labeled as not final legal text.

## 3. Why This Blocks Limited External Beta

NOVORA's current Concept Brief flow collects or may store customer data,
including:

- Customer name and email.
- Optional phone or WhatsApp.
- Country or region.
- Contact notes and free-text design notes.
- Concept Brief answers, jewelry preferences, budget planning range, style,
  material, stone, personalization, and story/context fields.
- Final uploaded reference images and upload metadata.
- Protected admin review status, internal notes, and admin notification
  metadata.
- Browser draft and submitted-summary storage.

External users need clear public Privacy / Terms pages before broader beta
because they are submitting identifiable contact details, design preferences,
and optional visual references. The public pages need to explain what NOVORA
collects, why it is collected, how reference images are handled, which service
providers support the MVP, how users can make privacy requests, and what the
Concept Brief does and does not promise.

This is especially important because the current MVP boundary is narrow:
submitting a Concept Brief is not checkout, not an order, not a quote, not CAD
approval, not production approval, and not an automatic AI sketch delivery.

## 4. Owner Decisions Required

Owner/legal review should resolve these items before final publication:

- Legal/business entity name, or whether pages should publish under the NOVORA
  brand only for MVP.
- Final public privacy contact email confirmation. Prior docs record
  `privacy@novora.design`, but final publication should confirm the address and
  operational handling.
- Business address handling, including whether to publish an address, omit it,
  or handle it through counsel-approved language.
- Governing law and jurisdiction for Terms.
- Target markets and regions for limited external beta.
- Confirmation that current users submit Concept Briefs only, not online
  orders.
- Final data categories collected and displayed, including contact fields,
  Concept Brief answers, final reference images, upload metadata, admin review
  state, notification metadata, browser storage, and logs where applicable.
- Purpose of data use, including brief review, manual follow-up, protected
  admin review, reference image review, and later offline CAD/quote discussion.
- Reference image rights, sharing, retention, removal, and partner/studio
  handling.
- Retention/deletion expectations for active, unresponsive, declined, and
  completed projects.
- User request process for deletion, export/access, correction, and reference
  image removal.
- Service-provider disclosure for Supabase, Vercel, Resend, Cloudflare, and
  any analytics/tracking if later present or enabled.
- Confirmation that there is no payment, no customer account, and no checkout
  in the current MVP.
- Offline CAD, quote, sourcing, production, QC, packaging, and logistics
  process boundaries.
- Email communication expectations, including admin notification versus any
  customer-facing email flow.
- Age/minor policy.
- Limitation, disclaimer, and service-boundary language for concept sketches,
  AI hand-drawn concept sketch direction, CAD, quote, order, and production
  approval.

## 5. Required Publication Fixes Before External Beta

Before public Privacy / Terms pages are published for external beta, a later
implementation PR should:

- Remove or replace the placeholder privacy contact line in the draft/final
  Privacy content.
- Create or finalize a public `/privacy` page only after owner/legal approval.
- Create or finalize a public `/terms` page only after owner/legal approval.
- Add footer and/or header links only after final public pages exist and the
  owner/legal link placement decision is made.
- Ensure footer/header links point to final public pages, not draft review
  pages.
- Keep draft pages clearly draft if they remain available after final pages are
  published.
- Ensure legal pages do not imply online checkout, customer accounts, instant
  quotes, direct production approval, or final order creation.
- Ensure legal pages match the MVP boundary: no payment, no login, no
  unreviewed AI sketch delivery, and CAD/quote/production handled separately
  offline.
- Avoid adding legal acceptance checkbox behavior unless separately approved by
  owner/legal review.

## 6. Suggested Structure For Final Privacy Page

Headings only:

- Overview
- Information collected
- Reference images
- How information is used
- Service providers
- Data retention
- User requests
- Security
- International users
- Children/minors
- Contact
- Changes to this policy

## 7. Suggested Structure For Final Terms Page

Headings only:

- Acceptance of terms
- NOVORA service scope
- Concept Brief submissions
- Reference images and user-provided materials
- Concept sketches are not CAD, quote, order, or production approval
- Human review and email follow-up
- No payment or checkout in MVP
- Offline CAD, quote, sourcing, production, QC, and logistics
- Intellectual property / permitted use
- Disclaimers and limitation of liability
- Governing law / disputes
- Contact
- Changes to terms

## 8. Follow-Up PR Recommendation

After owner decisions and legal review are complete, open a separate
implementation PR to publish final public Privacy / Terms pages.

The later PR should:

- Publish final public `/privacy` and `/terms` pages.
- Remove placeholders.
- Add footer/header links if owner/legal approval chooses that placement.
- Keep NOVORA's MVP boundaries intact.
- Remain app-copy/page-only unless a separate task explicitly approves more.
- Avoid SQL, Supabase, Vercel, environment files, package files, lockfiles, API
  routes, admin behavior, customer submission behavior, tests, assets,
  protected admin access, Production data, provider configuration, email
  sending, deployment, payment, authentication, CAD, order, production, or AI
  generation changes.

The later PR should include focused validation for the changed public routes and
links. If only static app pages and navigation copy change, run the narrowest
useful build or route verification required by the final implementation scope.

## 9. Stop Conditions

Future publication implementation should stop before publishing final pages or
linking public legal pages if:

- The owner cannot confirm the public privacy contact email.
- Governing law or jurisdiction for Terms is undecided.
- Final legal wording needs counsel approval and approval has not been given.
- Draft pages contain placeholder text that would become public.
- Requested wording implies online order creation, payment, CAD approval, quote
  approval, production approval, or production-ready files.
- Requested wording weakens the AI sketch, human-review, or email-only delivery
  boundaries.
- Requested wording implies real AI generation, customer preview, account,
  checkout, CAD, order, production, provider, or data workflow behavior that the
  current MVP does not implement.
- The follow-up request expands into SQL, Supabase, Vercel, environment,
  package, lockfile, API, admin, customer submission, protected admin,
  Production data, email, deployment, payment, authentication, CAD, order,
  production, or AI generation work without a separate explicit approval
  boundary.
