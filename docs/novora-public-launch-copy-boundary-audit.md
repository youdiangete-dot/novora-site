# NOVORA Public Launch Copy Boundary Audit

## A. Audit Scope

Agent 29B completed a docs-only public-facing launch copy and product-boundary
audit on 2026-06-02 from `main` commit
`fcc5a3fff2e7a856e4ff740264dc7ad078684d36`.

This was a source-code and documentation review only. Agent 29B did not access
Production, open protected admin pages, create a Production submission, trigger
email, or change application code.

Public-facing source reviewed:

- `app/layout.tsx`
- `app/page.tsx`
- `components/HomeCarousel.tsx`
- `components/SiteHeader.tsx`
- `components/ProgressHeader.tsx`
- `app/design/start/page.tsx`
- `app/design/concept/page.tsx`
- `app/design/brief/page.tsx`
- `app/design/submitted/page.tsx`
- `app/design/sketch/page.tsx`
- `app/design/pro-cad/page.tsx`
- `app/account/orders/demo/page.tsx`

Project documentation and repo-local guidance reviewed:

- `docs/novora-current-project-state.md`
- `docs/novora-mvp-launch-readiness-checklist.md`
- `docs/novora-production-security-runbook.md`
- `.agents/skills/novora-product-boundary-copy/SKILL.md`
- `.agents/skills/novora-customer-submission-integrity/SKILL.md`
- `.agents/skills/novora-codex-learning-loop/SKILL.md`
- `.agents/skills/novora-safe-pr-workflow/SKILL.md`

The audit evaluates wording, information hierarchy, and public expectation
setting. It does not claim that the reviewed pages were browser-tested in
Production.

## B. Verified Copy Strengths

Several deeper customer-flow pages already preserve important boundaries well:

1. **Concept Brief receipt is framed as intake, not an order.**
   `app/design/brief/page.tsx` says submission does not place an order or confirm
   CAD, pricing, payment, sourcing, or production. `app/design/submitted/page.tsx`
   repeats that the received Concept Brief is not a final order, final pricing,
   CAD approval, or production confirmation.

2. **Received confirmation is protected by the server-receipt gate.**
   The submitted page checks confirmed persistence, a valid
   `NOVORA-CB-...` public reference, and a valid Concept Brief UUID before it
   shows `Concept brief received`. Local browser recovery state does not
   impersonate NOVORA receipt.

3. **The dedicated sketch-preview page is explicit about its mock status.**
   `app/design/sketch/page.tsx` says real AI sketch generation is not active,
   labels the board as a demo placeholder, and states that no AI image was
   generated. It also separates the preview from CAD, pricing, sourcing, QC,
   logistics, and production approval.

4. **Planning references and final uploaded references are distinguished.**
   `app/design/concept/page.tsx` labels concept-page images as planning only and
   explains that they are not saved as final uploads. `app/design/brief/page.tsx`
   identifies its upload area as the final optional upload and says only those
   files are saved.

5. **CAD and production feasibility are separated from concept direction in the
   detailed brief flow.**
   The concept and brief pages repeatedly state that professional CAD is a
   separate paid step and that feasibility, stone availability, material cost,
   settings, and production details are confirmed later.

6. **Gemstone choices are currently captured as directions, not guarantees.**
   The current intake offers lab diamond, natural diamond, lab-grown colored
   gemstone, natural colored gemstone, moissanite, and pearl directions. The
   brief boundary note correctly reserves stone availability, exact color
   matching, and quotation for later confirmation. No certification, sourcing,
   or price guarantee was found.

7. **Manual review is present where constrained options may not be sufficient.**
   Custom forms and special chain requests say that manual confirmation is
   required before CAD, sourcing, or production.

## C. Potential Overpromise / Ambiguity Findings

### Finding 1: Homepage implies active AI sketch delivery and a speed promise

- **Page / file:** `app/page.tsx:11`, `app/page.tsx:12`,
  `app/page.tsx:30`, `app/page.tsx:55`, `app/page.tsx:56`,
  `components/HomeCarousel.tsx:83`
- **Current wording or paraphrased issue:** The homepage says customers start
  with an AI concept sketch, can receive a fast visual direction, and can get a
  rapid concept direction in minutes. The carousel labels example visuals as
  `AI concept sketch`.
- **Why it may mislead customers:** Real customer-specific AI sketch generation
  is not implemented. The homepage is the broadest public entry point, and
  `in minutes` reads as a timeline commitment for a capability that is currently
  mock-only.
- **Risk level:** High
- **Recommended safer wording direction:** Describe a guided Concept Brief and
  a mock or future AI sketch preview. Remove the minutes claim until a real,
  verified service level exists. Label carousel visuals as example concept
  directions or illustrative previews.
- **Fix timing:** Before any public, social, or paid traffic.

### Finding 2: Homepage and global navigation imply live order tracking

- **Page / file:** `app/page.tsx:15`, `app/page.tsx:16`,
  `app/page.tsx:20`, `app/page.tsx:31`, `components/SiteHeader.tsx:8`
- **Current wording or paraphrased issue:** The homepage presents `Paid CAD +
  order tracking`, `production updates`, QC, packaging, delivery, and
  `Transparent order milestones`. The global header exposes an `Order Tracking`
  navigation item.
- **Why it may mislead customers:** NOVORA does not have a real order system,
  customer account system, or order-tracking workflow. The wording reads as an
  active customer feature, not a future roadmap concept.
- **Risk level:** High
- **Recommended safer wording direction:** Remove live order-tracking claims
  from public navigation and launch copy. Describe later manual follow-up for
  CAD discussion, estimate review, and production decisions without presenting
  a customer portal or automated milestone tracking.
- **Fix timing:** Before any public, social, or paid traffic.

### Finding 3: Start page promises an AI sketch and order center

- **Page / file:** `app/design/start/page.tsx:38`,
  `app/design/start/page.tsx:134`, `app/design/start/page.tsx:152`
- **Current wording or paraphrased issue:** The start page says `AI concept
  sketch first`, `Order center for production updates`, `We start with an AI
  concept sketch`, and `You will receive an AI concept sketch first`.
- **Why it may mislead customers:** The intake currently leads to a persisted
  Concept Brief and a mock preview page. It does not deliver a generated sketch
  or an order center.
- **Risk level:** High
- **Recommended safer wording direction:** Say that the customer is creating a
  Concept Brief for NOVORA review and concept-direction follow-up. If the mock
  sketch route remains linked, label it as a demo preview. Replace the order
  center line with manual studio follow-up language.
- **Fix timing:** Before any public, social, or paid traffic.

### Finding 4: Core brief flow mixes truthful boundaries with active AI promises

- **Page / file:** `app/design/concept/page.tsx:1536`,
  `app/design/concept/page.tsx:1537`, `app/design/brief/page.tsx:1045`,
  `app/design/brief/page.tsx:1072`, `app/design/brief/page.tsx:1197`,
  `app/design/submitted/page.tsx:321`
- **Current wording or paraphrased issue:** The deeper flow correctly says CAD
  and production are later, but also says NOVORA will prepare the customer's
  first AI hand-drawn concept sketch, that the next step is the AI sketch, and
  offers a `View AI Sketch Preview` action without calling it mock-only.
- **Why it may mislead customers:** The dedicated sketch page later explains
  that generation is inactive, but customers may reasonably expect a real
  personalized sketch before reaching that disclosure.
- **Risk level:** High
- **Recommended safer wording direction:** Use `AI sketch brief`,
  `concept-direction preview`, or `mock AI sketch preview` consistently until
  real generation is implemented and verified. Avoid `will prepare` and
  `your next step is the AI sketch` when the available result is only a demo
  placeholder.
- **Fix timing:** Before any public, social, or paid traffic.

### Finding 5: Public order-center demo is not clearly isolated from live status

- **Page / file:** `app/account/orders/demo/page.tsx:16`,
  `app/account/orders/demo/page.tsx:17`, `app/account/orders/demo/page.tsx:18`,
  `app/account/orders/demo/page.tsx:2`, `app/account/orders/demo/page.tsx:6`,
  `app/account/orders/demo/page.tsx:10`
- **Current wording or paraphrased issue:** The page includes a small
  `Order Center Demo` kicker, but its headline says `Track your custom jewelry
  order`, its subtitle promises transparent milestones from concept to
  delivery, and its steps include CAD progress, quote confirmation, production,
  QC, packaging, and shipping.
- **Why it may mislead customers:** The page is publicly linked from the global
  header and CAD page. The demo label is easy to overlook, while the main copy
  resembles a live customer portal.
- **Risk level:** High
- **Recommended safer wording direction:** Remove the page from launch
  navigation or reframe it prominently as a non-functional future workflow
  illustration. It must not read as a place to track a real order.
- **Fix timing:** Before any public, social, or paid traffic.

### Finding 6: Public CAD page could read as an active online CAD workflow

- **Page / file:** `app/design/pro-cad/page.tsx:6`,
  `app/design/pro-cad/page.tsx:7`, `app/design/pro-cad/page.tsx:11`,
  `app/design/pro-cad/page.tsx:12`, `app/design/pro-cad/page.tsx:13`,
  `app/design/pro-cad/page.tsx:21`
- **Current wording or paraphrased issue:** The page describes a professional
  CAD service that translates selections into precision files suitable for
  quoting, revisions, and manufacturing preparation, then links to the order
  center demo.
- **Why it may mislead customers:** Paid CAD later is a valid business
  direction, but the public page does not explain that the current website does
  not provide an automated CAD workflow, checkout, or online order lifecycle.
- **Risk level:** Medium
- **Recommended safer wording direction:** Keep the premium CAD positioning,
  but say that CAD scope, fee, and process are discussed and confirmed
  separately after manual Concept Brief review. Remove the order-center
  continuation until it represents a real workflow.
- **Fix timing:** Before broader MVP launch.

### Finding 7: Customer-visible upload copy exposes internal admin wording

- **Page / file:** `app/design/concept/page.tsx:1601`,
  `app/design/concept/page.tsx:1838`, `app/design/brief/page.tsx:1146`,
  `app/design/brief/page.tsx:1171`
- **Current wording or paraphrased issue:** Reference-image copy repeatedly says
  final files are saved for `admin review`.
- **Why it may mislead customers:** The storage behavior is explained correctly,
  but `admin review` exposes internal tooling language. It sounds procedural
  rather than like a professional jewelry-studio service.
- **Risk level:** Low
- **Recommended safer wording direction:** Say `saved for NOVORA review`,
  `saved for studio review`, or `attached to your Concept Brief for manual
  review`. Keep the planning-only versus final-upload distinction intact.
- **Fix timing:** Before broader MVP launch.

### Finding 8: Submitted-page production heading is broader than the current next step

- **Page / file:** `app/design/submitted/page.tsx:273`,
  `app/design/submitted/page.tsx:307`
- **Current wording or paraphrased issue:** The submitted page uses the heading
  `From concept brief to production review` and lists final quote, gemstone
  sourcing, production feasibility, QC, packaging, and logistics as later
  confirmations.
- **Why it may mislead customers:** The details correctly say these decisions
  happen later, but the heading may make the Concept Brief feel like entry into
  an active production pipeline. Current downstream work remains offline and
  manual.
- **Risk level:** Medium
- **Recommended safer wording direction:** Lead with `What NOVORA reviews next`
  or `From Concept Brief to manual follow-up`. Keep later CAD, estimate,
  sourcing, and production checks explicitly conditional.
- **Fix timing:** Before broader MVP launch.

### Finding 9: Sketch page understates persisted Concept Brief reality

- **Page / file:** `app/design/sketch/page.tsx:100`,
  `app/design/sketch/page.tsx:143`
- **Current wording or paraphrased issue:** The sketch empty state refers to a
  `submitted front-end-only concept brief saved in this browser`, and the
  metadata heading says `Brief saved in this browser`.
- **Why it may mislead customers:** The sketch board is front-end-only, but a
  successful Concept Brief submission is a real persisted receipt. The wording
  blurs the distinction between the local mock preview state and the server
  receipt.
- **Risk level:** Medium
- **Recommended safer wording direction:** Say that the mock preview reads the
  browser's local copy of the Concept Brief. Do not describe the received
  Concept Brief itself as front-end-only.
- **Fix timing:** Before broader MVP launch.

### Finding 10: One header link points to a missing explanatory anchor

- **Page / file:** `components/SiteHeader.tsx:6`, `app/page.tsx`
- **Current wording or paraphrased issue:** The header links `Concept Sketch` to
  `/#concept-vs-cad`, but the homepage does not define a matching section id.
- **Why it may mislead customers:** The broken jump prevents customers from
  reaching the explanation that should clarify sketch-versus-CAD boundaries.
- **Risk level:** Low
- **Recommended safer wording direction:** Add or retarget a visible
  concept-versus-CAD explanation section when Agent 29C implements copy fixes.
- **Fix timing:** Acceptable after quiet owner-controlled testing, but fix
  before broader MVP launch if the header remains.

### Required Topic Check Summary

| Topic | Audit result | Launch direction |
| --- | --- | --- |
| AI sketch | Needs change | Mock-only state is clearly disclosed on `/design/sketch`, but homepage, start, brief, and submitted entry copy still imply a real generated sketch. |
| CAD | Needs clarification | Detailed flow separates paid CAD well. Public CAD page should state separate manual confirmation and avoid implying an online CAD lifecycle. |
| Submit / received | Strong | Keep `Concept Brief` terminology and the confirmed server-receipt gate. Do not use `order received`. |
| Quote / pricing | Mostly strong | Keep planning range, estimate, discussion, and later confirmation language. Do not promise an instant or binding quote. |
| Production | Needs change | Remove order-center and production-update implications from launch navigation. Keep production conditional and later. |
| Payment | Strong | Brief page explicitly says submission does not confirm payment. Keep checkout and payment absent from launch claims. |
| Order tracking | Needs change | Remove or prominently isolate the public demo. No real order tracking exists. |
| Reference upload | Strong with one wording cleanup | Preserve planning-only versus final-upload distinction. Replace `admin review` with customer-safe studio-review language. |
| Timeline | Needs change | Remove `in minutes` and avoid delivery-timeline language until real service levels exist. |
| Lab diamond / gemstone sourcing | Strong | Options are directions only. Preserve later availability, color, sourcing, and quotation confirmation. Do not add certification or price guarantees without a supported workflow. |
| Admin review | Needs wording cleanup | Keep internal admin workflow out of customer-facing text. Say NOVORA or studio review. |
| Manual offline workflow | Needs clearer entry-point explanation | Frame manual follow-up as a high-touch studio service: NOVORA reviews the Concept Brief and follows up to discuss next steps. Do not present offline work as unfinished automation. |

## D. Recommended Copy Principles For Launch

1. Say `Concept Brief` instead of `order` before a separate commercial
   agreement, payment, and real order workflow exist.
2. Describe the current online action as guided intake and NOVORA review.
3. Use `mock AI sketch preview`, `future AI sketch preview`, `AI sketch brief`,
   or `concept direction` while real AI generation remains inactive.
4. Never imply that an AI sketch is CAD-ready, production-ready, priced,
   sourced, certified, or approved.
5. Say `paid CAD can be discussed later` and `CAD scope, fee, and process are
   confirmed separately` instead of implying automatic CAD progression.
6. Say `review and follow up` instead of `confirmed production`.
7. Say `planning range`, `estimate discussion`, or `quotation confirmed later`
   instead of implying instant or binding pricing.
8. Treat gemstone type, shape, color, size, and chain fields as preference
   directions. Keep availability, sourcing, color matching, feasibility, and
   final cost subject to later confirmation.
9. Keep payment, checkout, order creation, order tracking, QC, packaging,
   shipping, and delivery outside the current online-product claim.
10. Distinguish concept-page planning references from final brief-page uploads.
    Tell customers that final files are attached to the Concept Brief for
    NOVORA or studio review.
11. Preserve a premium studio tone by describing the manual workflow as
    attentive professional review and follow-up, not as missing automation.
12. Avoid timeline promises until NOVORA has a verified operational service
    level and a workflow that can support them.

## E. Priority Fix List

### P0 Before Any Public / Social / Paid Traffic

1. Rewrite homepage and carousel AI-sketch claims so they describe guided
   Concept Brief intake and illustrative or future preview state. Remove the
   `in minutes` promise.
2. Remove order tracking, transparent order milestones, production updates,
   QC, packaging, and delivery from homepage launch claims and global
   navigation.
3. Rewrite `/design/start` so it does not promise generated AI sketch delivery
   or an order center.
4. Align `/design/concept`, `/design/brief`, and `/design/submitted` with the
   mock-only sketch state. Rename the submitted-page preview action so it is
   clearly a demo or mock preview.
5. Remove `/account/orders/demo` from public launch navigation or make its
   non-functional future-demo status impossible to miss.

**P0 count: 5**

Agent 29C addressed these five P0 copy items in a scoped app-copy implementation.
This status note does not approve launch or commercial readiness, and it does
not claim that AI generation, CAD automation, payment, customer accounts, order
tracking, production workflows, or Production rate-limit provider enforcement
exist.

### P1 Before Broader MVP Launch

1. Reframe `/design/pro-cad` as a separately discussed manual paid-CAD service,
   with scope, fee, and process confirmed after Concept Brief review.
2. Replace customer-visible `admin review` upload wording with NOVORA or studio
   review wording.
3. Correct `/design/sketch` browser-copy language so the mock preview state does
   not describe a persisted Concept Brief as front-end-only.
4. Reframe the submitted-page production-review heading as conditional manual
   follow-up while preserving later CAD, estimate, sourcing, and production
   checks.

**P1 count: 4**

### P2 Acceptable After Quiet Owner-Controlled Testing

1. Repair or retarget the missing `/#concept-vs-cad` header anchor as part of a
   visible boundary explanation.
2. Review the currently unused `components/ProgressHeader.tsx` before any future
   use so its `Concept Sketch` and `Professional CAD` steps cannot be mistaken
   for active automated progression.

**P2 count: 2**

## F. Suggested Implementation Sequence

Keep each future Agent in its own scoped branch and approval boundary:

1. **Agent 29C: Implement highest-priority public copy fixes**
   - Apply the P0 list first, then the P1 wording adjustments that fit the same
     customer-copy scope.
   - Update focused tests intentionally if asserted UI copy changes.
   - Browser-check the homepage and customer intake flow in a non-Production
     environment when approved.

2. **Agent 29D: Privacy, terms, contact, and data-handling copy plan**
   - Define public statements for Concept Brief data, contact details,
     reference-image handling, retention, deletion requests, and custom-order
     boundaries.
   - Keep legal review and implementation as explicit follow-up decisions.

3. **Agent 29E: Public API abuse-control next decision**
   - Reconfirm the Production-dedicated Redis Option C direction.
   - Plan rate-limit provider enablement, Turnstile or equivalent server
     verification, notification-trigger hardening, monitoring, safe rollout,
     and rollback.
   - Keep provider provisioning, environment changes, secrets, deploys, and
     Production verification behind explicit approval.

4. **Agent 29F: Reference-upload abuse-limits review**
   - Plan upload-token binding, durable caps, stronger file checks, storage
     monitoring, retention, and cleanup policy.

5. **Agent 29G: Manual admin operations SOP**
   - Define queue-review cadence, notification-failure checks, manual customer
     follow-up, incident handling, and synthetic Production-test-data rules
     without adding resend behavior.

## Audit Recommendation

The detailed Concept Brief and submitted flow already contain a solid boundary
foundation, but the broadest public surfaces still describe future capabilities
as active product features. Complete the P0 copy fixes before public, social, or
paid traffic. This audit does not approve launch, commercial readiness, or any
Production operation.
