# NOVORA Codex Project Rules

These rules apply to the whole repository. Follow them before reading broad
swaths of code or making changes.

## NOVORA Commercial Website Completion Contract — Sole Final Authority

### Final authority

This section is the sole repository authority for deciding whether the complete
NOVORA commercial website project is finished.

Other files may record implementation, branch, deployment, test, milestone, and
historical state, but they must not lower, replace, duplicate, or reinterpret
the final commercial completion standard in this section.

When a task instruction, report, approval, review comment, project ledger,
architecture choice, workflow rule, chat memory, or other document conflicts
with this section about final project completion, this section wins.

Every NOVORA Chat and Work task must read this section before generating or
executing repository work.

A bounded Owner approval authorizes only the expressly named task. It does not
silently remove a later customer, commercial, Preview, Production, payment,
order, or end-to-end acceptance requirement.

### Final commercial outcome

NOVORA is finally complete only when a controlled Production acceptance proves
that NOVORA operates as a genuinely usable commercial jewelry-customization
website.

The complete intended customer and business journey is:

1. a real customer can discover and understand the NOVORA customization
   service;
2. the customer can start a design request;
3. the customer can submit a real Concept Brief, required contact information,
   and permitted reference materials;
4. the submission is genuinely and durably persisted;
5. the customer receives the corresponding real First Preview through the
   approved durable execution and image-generation path;
6. the same authorized customer can securely view the correct generated image;
7. NOVORA staff can perform human design review;
8. the customer can provide feedback and receive revisions or regenerated
   directions when required;
9. the customer can confirm the intended design direction;
10. gemstone, material, size, specification, and other required product details
    can be selected or confirmed;
11. the customer can receive a real and commercially valid quotation;
12. the customer can complete the Owner-approved usable payment process;
13. a durable commercial order or equivalent order record is created;
14. the order can transition accurately into CAD and production handling;
15. NOVORA staff and the customer can continue through the required order, CAD,
    production, communication, and delivery-status process.

Production-grade CAD modeling, gemstone procurement, factory production, QC,
packaging, and physical logistics may remain human-operated or use approved
offline tools.

However, offline operation must not mean that customer confirmation, quote,
payment state, order state, CAD or production handoff, required communication,
or customer-facing status is lost, fake, untracked, or impossible to continue.

Final acceptance must also prove:

- no false customer-visible success;
- no wrong-customer image, quote, payment, order, or status;
- no duplicate Provider dispatch or uncontrolled Provider cost;
- no duplicate or incorrect payment or order creation;
- no loss of a successfully accepted commercial submission or order;
- no exposure of customer data, credentials, internal prompts, private Storage
  paths, Provider metadata, admin notes, or reviewer notes;
- correct customer-to-brief-to-preview-to-order binding;
- safe failure handling for Queue, Provider, database, Storage, email, payment,
  and external-service operations;
- real Production behavior rather than mock, fixture, placeholder, synthetic,
  or administrator-only behavior.

### First Preview is an intermediate milestone

The real First Preview capability is an important commercial milestone, but it
is not final NOVORA project completion.

Completing durable execution, real image generation, private Storage,
lifecycle readiness, or secure customer Preview visibility does not by itself
complete the full commercial website.

No First Preview PASS, MVP marker, Preview deployment, Queue verification, or
Provider verification may be interpreted as complete NOVORA commercial launch.

### Fixed commercial closeout milestones

The complete commercial closeout path contains exactly these six milestones:

1. **Commercial foundation and intake**
   Public service presentation, customer intake, Concept Brief, references,
   contact information, secure persistence, and admin intake handling.

2. **Real First Preview**
   Durable background execution, approved Provider generation, private Storage,
   lifecycle persistence, secure customer viewing, and controlled Production
   First Preview acceptance.

3. **Design collaboration and confirmation**
   Human review, customer feedback, revision or regeneration handling, and
   durable confirmation of the selected design direction.

4. **Commercial configuration and transaction**
   Gemstone, material, size and specification confirmation, quotation, approved
   payment handling, and durable commercial order creation.

5. **CAD and production handoff operations**
   Admin order handling, CAD handoff, production handoff, required customer
   communication, and continued order and delivery status.

6. **Production commercial acceptance and launch**
   One controlled Production acceptance proving the complete commercial journey
   and NOVORA’s ability to operate it safely and reliably.

There is no Milestone 7.

A bug fix, technology correction, failed validation, or review response must
remain inside its existing milestone. Renaming or splitting work must not create
another permanent commercial milestone.

Every completed milestone must reduce the unfinished commercial path.

Mutable progress belongs in reports and the project ledger. It must not cause
this contract to be repeatedly rewritten.

This contract is a governance constraint and is not an additional commercial
milestone.

### Allowed launch blockers

Only the following categories may block the active commercial milestone:

1. the real customer or admin commercial path cannot operate;
2. security, privacy, legal, payment, or customer-data safety can be violated;
3. identity, asset binding, lifecycle, quote, payment, order, or customer-visible
   status can be false, incorrect, lost, or misleading;
4. Provider, Queue, payment, email, Storage, database, retry, billing, or other
   external side effects can duplicate or become uncontrolled;
5. the NOVORA team cannot safely and reliably operate the required Production
   commercial process.

The following normally belong in the post-launch backlog and must not create
new launch milestones:

- P2 or P3 refinements;
- optional refactoring;
- wording or formatting perfection;
- historical thread housekeeping;
- new process controllers;
- new rule versions;
- broad evidence frameworks;
- speculative scaling work;
- optional CRM, analytics, localization, loyalty, social, or marketing
  automation;
- features outside the Owner-approved commercial customer journey.

Before issuing a Codex-ready task, web Chat must identify:

- which of the six milestones the task belongs to;
- whether it directly completes or unblocks that milestone;
- which allowed blocker category applies when the task is corrective.

A task that belongs to no milestone, does not reduce or unblock the finite path,
and does not address an allowed blocker must not become a commercial-launch
prerequisite.

### Intermediate evidence is not final completion

Planning, documentation, local code, fake tests, mock tests, fixtures,
TypeScript, Build, commit, PR, review, integration merge, Preview deployment,
Queue-only verification, Provider-only generation, database-only verification,
Storage-only verification, email-only verification, payment-only verification,
First Preview completion, administrator-only demonstrations, and partial
Production paths are intermediate evidence only.

They must not be described as final commercial website completion.

Approval to use Vercel Queues authorizes an architecture choice only. It does
not mean Queue is live, First Preview is complete, or the commercial website is
complete.

### Final completion marker and contract freeze

The only permitted final project-completion marker is:

`NOVORA_COMMERCIAL_WEBSITE_PRODUCTION_COMPLETE`

It may be used only after Milestone 6 passes the complete controlled Production
commercial acceptance defined in this section.

Before that point, no task or report may use wording that claims the complete
NOVORA project, commercial website, customer journey, or business launch is
finished.

This contract may be changed only when the Owner gives a separate
plain-language instruction containing the exact sentence:

“I am changing the NOVORA Commercial Website Completion Contract”

and states the replacement final commercial customer outcome.

A short reply, technical approval, task start, architecture approval, PASS
result, milestone completion, branch change, review comment, or tool limitation
must not change this contract.

Do not create copied final-completion contracts in other repository files.

## Project Shape

- NOVORA is a custom jewelry MVP built with Next.js App Router, React, TypeScript,
  CSS modules, Supabase server helpers, and Playwright e2e tests.
- Core customer flow: `/design/start` -> `/design/concept` -> `/design/brief` ->
  `/design/submitted`.
- Admin review MVP lives under `/admin/briefs`. It is currently a mock/admin UI
  backed by local browser storage unless server persistence code explicitly says
  otherwise.
- Keep customer-facing copy aligned with the business boundary: AI concept sketch
  first, paid CAD later, no final order/payment/production promise during brief
  intake.

## Fast Orientation

- Start with `package.json` for scripts.
- Before starting a new agent, stage, or implementation slice, read
  `docs/novora-current-project-state.md`.
- Read `docs/novora-codex-operating-mode.md` before changing repository
  workflow, branching, PR, deployment, permission, or agent-handoff rules.
- Check `app/design/concept/page.tsx`, `app/design/brief/page.tsx`,
  `app/design/submitted/page.tsx`, and `app/api/concept-briefs/route.ts` for
  concept brief behavior.
- Check `lib/server/concept-brief-persistence.ts`,
  `lib/server/concept-brief-validation.ts`, `lib/server/supabase.ts`, and
  `lib/server/env.ts` before changing persistence or env handling.
- Check `tests/e2e/design-concept-validation.spec.ts` before changing intake,
  brief submission, admin review, or copy that tests assert.

## Commands

- Install dependencies only when needed; `node_modules` may already exist.
- Development: `npm run dev`
- Production check: `npm run build`
- E2E tests: `npm run test:e2e`
- Prefer running the narrowest useful check first, then broaden if shared flow,
  persistence, or customer journey behavior changed.

## Implementation Rules

- Use existing patterns: App Router pages in `app/`, shared components in
  `components/`, server-only code in `lib/server/`, and CSS modules beside their
  route/component files.
- Preserve the current multi-step intake behavior and session/localStorage keys
  unless the task explicitly changes data migration:
  - `novora_concept_brief`
  - `novora_submitted_concept_brief`
  - `novora_admin_brief_review_state`
- Treat `publicReference` / `NOVORA-CB-...` IDs as customer-visible references.
  Do not casually change their format.
- Keep server secrets server-only. Never expose or log values for
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL`, storage bucket secrets, or
  `OPENAI_API_KEY`. Browser-visible env vars must stay `NEXT_PUBLIC_*`.
- Do not commit local secret note files, password notes, env dumps, or files
  named like `SUPABASE *.txt` / `NOVORA-Supabase-env-*.txt`. Treat them as
  local-only and ignore them during feature work.
- When adding Supabase behavior, keep graceful fallback behavior where the MVP
  already allows local front-end flow to continue without persistence.
- Customer-facing submitted or received confirmation must not be shown unless
  server persistence, a valid `publicReference`, and a valid Concept Brief UUID
  are confirmed. Local fallback may preserve draft or summary state only.
- Do not introduce auth, payments, real order creation, production workflows, file
  uploads, or AI image generation unless the task explicitly asks for that slice.
- Treat `docs/novora-current-project-state.md` on GitHub `main` as the durable
  project ledger. When chat memory, older notes, or assumptions conflict with
  the ledger and current `main`, the ledger and current `main` win.
  Final commercial completion semantics are the sole exception and are governed
  exclusively by “NOVORA Commercial Website Completion Contract — Sole Final
  Authority.”

## Codex Operating Mode

### One-Step Scope Brake v1.2

- NOVORA One-Step Scope Brake v1.2 is active and mandatory. Follow
  `docs/novora-one-step-scope-brake-v1.md`.
- Each Work task must answer exactly one acceptance question, cross exactly one
  execution gate, and stop after PASS, BLOCKED, or insufficient evidence.
  Build, validation, commit, push, PR creation, review, Ready, merge,
  deployment, and cleanup remain separate gates. Conditional continuation and
  uncontrolled retry are prohibited.
- WIP is one: no more than one NOVORA Work task may be active at a time.
- The newest exact current-task instruction controls. Starting a Codex-ready
  task authorizes every low-risk, reversible operation expressly named and
  identity/scope-bound in that task; Work must not request duplicate approval.
  Earlier read-only wording cannot override the current authorization.
- Chat owns technical coordination decisions. With sufficient evidence, it
  selects the single technically appropriate next gate and provides one bounded
  Codex-ready instruction; it does not transfer Git, test, implementation, or
  ordinary workflow choices to the Owner. With insufficient evidence, it asks
  for only one missing fact or one narrow verification.
- Failures have three classes. A real test assertion, compiler diagnostic, or
  Build diagnostic is not automatically Class 1. Class 2 applies only when the
  defect is directly attributable to one narrow local implementation issue,
  remains within the acceptance question and authorized file/product scope,
  crosses no safety, privacy, security, identity, authorization, high-risk, or
  material product boundary, fits an unused explicit Class 2 budget, and needs
  no architecture, dependency, unrelated-refactor, product-scope, or approval
  expansion. Class 1 applies to identity or scope drift, safety/privacy/security/
  authorization/high-risk risk, cross-scope behavior, architecture/dependency/
  product-scope/approval expansion, an insufficient correction budget, or
  insufficient evidence of a narrow bound; genuine ambiguity fails closed as
  Class 1 for Chat-side root-cause replanning. Class 2 defaults to one primary
  implementation plus at most two focused correction cycles. Class 3
  mechanical execution failures may be corrected in-task at most twice, do not
  consume code-correction cycles, and must never disguise source-behavior
  changes.
- After the original task exhausts its budget, Chat may create at most one
  recovery task for the same acceptance goal. A material failure in that
  recovery requires a root-cause replan; renaming the goal does not reset the
  cap.
- Reuse accepted validation when exact hashes/diff and relevant environment are
  unchanged. Git/PR gates verify identity instead of rerunning tests. Chat
  directly verifies available read-only GitHub facts and distinguishes that
  evidence from Work reports.
- After a result, Chat first evaluates the Owner's broader stated goal. If it is
  complete, stop with `STOP / HOLD FOR OWNER DECISION`. If it is incomplete,
  Chat may choose one low-risk, technically determined next gate within that
  goal; the Owner manually starting that task provides its bounded
  authorization. High-risk approval boundaries still require separate
  plain-language Owner approval.
- Optimize MVP closeout for one clear outcome, minimum necessary evidence,
  evidence reuse, bounded corrections, and no unnecessary Agent, document,
  test, review, approval, or task expansion.

- Use a new Codex task/thread when the work needs a new branch, a new PR, a
  separate approval boundary, Production-affecting setup, SQL, environment
  changes, provider configuration, or a materially different scope.
- Continue the current thread when the work is the same scoped task, follow-up
  validation, documentation cleanup, or review-response work on the same branch.
- Start each implementation from latest `main` unless the user explicitly asks
  to continue another branch.
- Use one normal local branch per scoped task. Use the `codex/` prefix unless
  the user asks for another branch name.
- Worktrees are allowed only for isolated exploration or when the user explicitly
  requests them. Do not commit from a detached-HEAD worktree. If worktree git
  metadata permissions block branch creation or commits, re-apply the accepted
  changes on a normal local branch from latest `main`.
- Treat auto-review permissions as permission to perform the listed safe actions
  only. If a requested action appears in a must-stop list, stop and ask even if
  it looks adjacent to the current task.
- When a task reveals a reusable safety, quality, or workflow rule, propose a
  durable repo-local update. Keep `AGENTS.md` concise and put detailed
  procedures in repo-local skills.
- Do not run `git add .` unless the user explicitly approves that exact action.
  Prefer path-specific staging when staging is requested.

## Must-Stop Actions

Stop for separate plain-language Owner approval before Production deployment or
mutation; paid Provider or paid external-service use; customer-data access or
mutation; Secret or environment-variable changes; live Supabase, Storage, or
SQL mutation; destructive or difficult-to-reverse operations; legal,
commercial, customer-delivery, or human-review policy changes; or material
product/business scope expansion. The approval must state one recommended
decision, the plain-language outcome, material risk, exact bounded
authorization, and a simple approve / do-not-approve choice.

App/server/test edits and normal local Git/PR operations require exact bounded
current-task authorization, but once expressly authorized must not trigger a
duplicate approval prompt. Do not run `git add .` unless that exact command is
approved; prefer path-specific staging.

## Product And UX Rules

- The locked target MVP direction is an instant first customer preview: after a
  Concept Brief is confirmed persisted, NOVORA should automatically generate
  the first AI hand-drawn concept sketch and make it immediately visible when
  the required automatic gates pass.
- The first concept preview must not require per-image human pre-approval.
  Automatic safety, privacy, access-control, output-validity, and safe-failure
  gates remain mandatory, and no false-success state may be shown.
- Human review focuses on post-preview structural logic, gemstone orientation
  and composition, jewelry construction, manufacturability, correction,
  regeneration, customer-feedback interpretation, and formal downstream
  decisions.
- An AI concept preview is not CAD, a quotation, payment confirmation, order
  approval, production approval, or a manufacturability guarantee. Those
  decisions remain offline and human-controlled.
- Current Production still has no real AI generation implementation; the
  customer preview route and submitted-page entry remain mock/demo-only.
- NOVORA should feel like a professional custom jewelry studio: warm, guided,
  precise, and trustworthy.
- Avoid implying that an AI sketch is CAD-ready. Use language like "concept
  direction", "AI hand-drawn concept sketch", "manual confirmation", and
  "paid CAD later" where appropriate.
- Keep jewelry options realistic and constrained to the current model. Do not add
  unsupported materials, stone sizes, chain specs, or pricing claims without a
  matching data and validation update.
- If changing frontend UI, maintain responsive behavior and accessibility:
  semantic buttons/links, labels for form fields, visible validation errors, and
  no text overlap on mobile.

## Future Product Directions

- NOVORA should later support Traditional Chinese and Taiwan as an important
  target market.
- NOVORA should later support Japan as an important future Asia market.
- NOVORA should later support major European markets as future target regions,
  including the UK, Germany, France, Italy, Spain, and other suitable European
  markets.
- NOVORA should later include a visible language selector.
- Future language options should include English, Simplified Chinese,
  Traditional Chinese, Japanese, and major European language options when those
  markets are supported.
- Traditional Chinese should support Taiwan-market customers.
- Japanese should support future Japan-market customers.
- European localization may later include languages such as French, German,
  Italian, Spanish, and other suitable market languages.
- Language selection should be treated as a future localization system, not just
  text replacement.
- Future localization may also affect currency, sizing conventions, contact
  preferences, tax/shipping notes, market-specific trust copy, and customer
  support flow.
- A future Designer Portal may be added for designers, trade customers, and
  Taiwan-market / international-market users.
- The Designer Portal may support AI hand-drawn concept sketch generation.
- A future free quota may allow each registered user to generate 5 AI hand-drawn
  concept sketches.
- More sketch volume, trade/customer support, designer support, and manual
  review should be paid features.
- Keep AI sketches clearly separate from production CAD, pricing, sourcing, and
  production approval.
- Do not implement the language selector, multilingual routing, translation
  files, UI code changes, country routing, pricing, tax, shipping, accounts,
  quota system, AI generation, or Designer Portal unless a task explicitly asks
  for that slice.

## Testing Guidance

- Changes to `/design/concept`, `/design/brief`, `/design/submitted`,
  `/admin/briefs`, or `app/api/concept-briefs/route.ts` usually need Playwright
  coverage or updates to `tests/e2e/design-concept-validation.spec.ts`.
- Changes to server validation or persistence require appropriate focused
  validation and a separate Build gate before delivery. A bounded
  implementation-and-validation task may run only the focused checks expressly
  named in that task; it must not absorb the separate Build gate.
- After visual changes, run or request browser verification for the affected
  route when feasible.

## Git Hygiene

- Branch names should use the `codex/` prefix unless the user asks otherwise.
- The repo may contain unrelated local untracked files. Do not delete, stage, or
  rewrite them unless the user explicitly asks.
- Keep changes scoped to the requested task. Avoid opportunistic refactors.

## NOVORA Task Report Format

When reporting completed NOVORA work, include:

- Current branch.
- Changed files.
- Validation run, including skipped checks and why.
- Relevant behavior or documentation summary.
- `git status --short`.
- Confirmation that no forbidden app, SQL, Supabase, Vercel, email, deploy, or
  staging/commit/push action was taken when those actions were out of scope.
