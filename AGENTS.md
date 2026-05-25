# NOVORA Codex Project Rules

These rules apply to the whole repository. Follow them before reading broad
swaths of code or making changes.

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
- Do not introduce auth, payments, real order creation, production workflows, file
  uploads, or AI image generation unless the task explicitly asks for that slice.
- Treat `docs/novora-current-project-state.md` on GitHub `main` as the durable
  project ledger. When chat memory, older notes, or assumptions conflict with
  the ledger and current `main`, the ledger and current `main` win.

## Codex Operating Mode

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
- Do not run `git add .` unless the user explicitly approves that exact action.
  Prefer path-specific staging when staging is requested.

## Must-Stop Actions

Stop and ask before editing app code, executing SQL, changing Supabase schema,
RLS, grants, policies, storage, or customer data; changing Vercel environment
variables; changing Resend or Cloudflare; sending real email; touching secrets,
API keys, service-role keys, or admin keys; changing retry/resend behavior;
adding payment, auth, CAD, order, or AI generation behavior; running `git add .`;
force pushing; merging a PR; or deploying Production.

## Product And UX Rules

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
- Changes to server validation or persistence should include a build check at
  minimum. Add focused tests if a test harness exists or if the change affects
  accepted payload shape.
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
