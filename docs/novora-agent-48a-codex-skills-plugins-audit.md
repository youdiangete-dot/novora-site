# NOVORA Agent 48A Codex Skills And Plugins Audit

## 1. Purpose

This document is the Agent 48A docs-only audit and planning packet for Codex
skills and plugins in the NOVORA project.

It helps decide which Codex skills, plugin-backed workflows, or MCP-connected
capabilities are safe and useful for NOVORA, and which should be deferred or
rejected until a separate approved task exists.

Agent 48A is planning only. It does not install plugins, enable plugins, connect
MCP servers, change Codex app settings, modify app code, modify API routes,
modify packages or lockfiles, execute SQL, connect to Supabase live, inspect
live schema or customer data, modify environment variables or secrets, deploy,
send email, call OpenAI/image generation, connect third-party services, continue
Agent 46C app work, or implement website optimization.

## 2. NOVORA Boundaries For Codex Capabilities

Codex skills and plugins must support the existing NOVORA workflow rather than
override it.

Required operating boundaries:

- New functionality uses a new `codex/` branch and a scoped Draft PR.
- The standard lifecycle remains: Draft PR, Review Pass, Final PR Check,
  Ready + Merge, and Post-merge Cleanup.
- Ready + Merge only marks the PR ready and merges it.
- Post-merge Cleanup only performs Git cleanup.
- Plugin installation must be a separate approved task, not bundled into
  feature PRs or docs-only planning PRs.
- Codex skills/plugins must not override NOVORA PR lifecycle rules, must-stop
  actions, or AI sketch business boundaries.
- If active Codex worktree residue is encountered, do not force delete it and
  do not manually remove physical folders. Report the residue path only.

Hard capability boundaries:

- No SQL execution through Codex.
- No Supabase live database connection through Codex.
- No live schema, row, customer data, customer ID, internal note, or AI sketch
  note inspection through Codex.
- No `reviewer_note` or `customer_safe_note` inspection.
- No deploy.
- No environment variable or secret changes.
- No RLS, grant, policy, storage, or schema changes.
- No real email sending.
- No OpenAI or image generation unless a future task explicitly approves that
  exact slice.
- No customer-facing unreviewed AI sketch display or automatic customer
  delivery.
- No package installation or lockfile change inside a plugin/skill audit task.
- No third-party service connection without separate approval.

AI sketch business boundaries:

- GPT or image-model output may only be an internal draft until a future
  approved implementation says otherwise.
- Human review and final approval are required before any customer-visible
  sketch.
- Unreviewed AI/GPT drafts must never be shown, linked, indexed, tracked,
  embedded, emailed, or otherwise delivered to customers.
- `approved_for_customer` is not equal to `approved_for_gallery`.
- AI generation success alone must not approve a sketch.
- Customer-facing sketch delivery remains email-only after human review,
  optimization, and approval.
- AI sketches remain concept sketches, not CAD, quotes, orders, production
  approval, or final jewelry specifications.

## 3. Recommended Skills And Plugin Strategy

Safe default: allow only low-risk local workflow skills first.

Explicit NOVORA safe default:

- No skill or plugin installation by default.
- No MCP server by default.
- No Codex app, plugin, or settings change by default.
- No broad filesystem, network, environment variable, secrets, database, or
  customer-data access.
- No Supabase live access, SQL execution, deploy, email sending, OpenAI/image
  generation, CRM, analytics, chat, booking, payment, or customer-account
  plugin.
- Actual plugin installation remains a separate approved task.

Recommended now:

- Repo-local NOVORA skills that encode existing workflow rules and do not need
  network, secrets, customer data, SQL, deployment, package changes, or MCP.
- Local checklist-style skills for PR lifecycle, Review Pass, Final PR Check,
  Ready + Merge, Post-merge Cleanup, AI sketch boundaries, sensitive-field
  exclusion, docs ledger updates, and local-only validation.
- Local read-only review helpers for diffs, Markdown consistency, TypeScript
  patterns, Next.js App Router conventions, and dependency-risk review.

Deferred until separately approved:

- Plugin-backed GitHub helpers for PR metadata, comments, and checks.
- Browser/Playwright automation helpers that only touch local preview targets.
- Vercel or deployment-adjacent tools in read-only planning mode.
- Any dependency/security scanner that needs network access or reads package
  metadata from an external service.

Rejected for now:

- SQL execution plugins.
- Supabase live database plugins.
- Vercel deploy plugins.
- Email sending plugins.
- OpenAI/image generation plugins.
- Analytics, tracking, session replay, CRM, marketing, chat, booking, payment,
  customer account, and broad MCP access plugins.
- Any MCP server requiring broad filesystem, network, environment, secrets,
  database, or customer-data access.

## 4. Decision Matrix

| Category | Usefulness | Risk | Repo access | Network | Env/secrets | Customer data | SQL | Deploy | Packages | Recommendation | Safe NOVORA default |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Git / PR lifecycle helper | Keeps branch, Draft PR, review, merge, and cleanup steps consistent. | Low if local checklist only; medium if GitHub-connected. | Yes | No for local; yes for GitHub PR actions | No | No | No | No | No | Allowed now for local skills; defer plugin actions. | Use repo-local PR lifecycle skills first; use network PR creation only as a separate requested action. |
| Branch cleanup / worktree residue reporting helper | Prevents unsafe cleanup and records residue without deleting active worktrees. | Low | Yes | No | No | No | No | No | No | Allowed now | Report residue paths only; never force delete or manually remove physical worktree folders. |
| Next.js / TypeScript review helper | Catches App Router, React, TypeScript, and CSS-module risks before review. | Low to medium | Yes | No preferred | No | No | No | No | No | Allowed now if local/read-only; defer external analysis plugins. | Use local static review checklists and existing patterns; no package changes. |
| Safe code review / diff review helper | Focuses review on bugs, regressions, boundary violations, and missing tests. | Low | Yes | No | No | No | No | No | No | Allowed now | Review local diffs only; do not inspect secrets or live data. |
| Docs / project state ledger helper | Keeps `docs/novora-current-project-state.md` and planning docs durable. | Low | Yes | No | No | No | No | No | No | Allowed now | Use local docs-only skills that preserve source-of-truth and forbidden-action confirmations. |
| Playwright / testing helper, local-only | Verifies local flows when app code changes. | Medium | Yes | No for local tests | No | No live data | No | No | No | Deferred for docs-only tasks; allowed for app-code tasks. | Run only local dev/test targets and only when the scoped task needs browser validation. |
| Security / secret scan helper | Helps avoid committing env dumps, keys, local secret notes, or unsafe references. | Low if local; medium if external scanner. | Yes | No preferred | Must not read secret values intentionally | No | No | No | No | Allowed now for local rules; defer external scanners. | Use local path/name/pattern checks; do not print or upload secret values. |
| Dependency review helper without auto-install | Flags risky dependencies and package drift before approval. | Low if read-only; high if it can install. | Yes | No preferred | No | No | No | No | Must not modify | Allowed now for read-only; reject auto-install behavior. | Inspect `package.json` and lockfiles only; no `npm install`, package edits, or lockfile writes. |
| Markdown / docs consistency helper | Improves planning docs, checklists, and ledger readability. | Low | Yes | No | No | No | No | No | No | Allowed now | Limit to docs paths in scoped docs-only PRs. |
| NOVORA AI sketch boundary checker | Prevents unreviewed AI sketch exposure and status/field boundary regressions. | Low | Yes | No | No | No live data | No | No | No | Allowed now | Check code/docs/diffs for AI sketch boundary language, final statuses, and excluded fields only. |

## 5. Plugin Categories To Avoid For Now

| Plugin category | Recommendation | Reason |
| --- | --- | --- |
| SQL execution plugins | Rejected | Codex must not execute SQL for NOVORA. SQL packets, if needed, remain manual and separately approved. |
| Supabase live database plugins | Rejected | They can expose schema, rows, customer data, IDs, notes, or service-role access. |
| Vercel deploy plugins | Rejected for now | Deploy and environment changes require separate approval and must not be bundled into feature PRs. |
| Email sending plugins | Rejected for now | Real email sending and retry/resend behavior are must-stop actions. |
| OpenAI/image generation plugins | Rejected for now | AI generation is not implemented and must not bypass human review boundaries. |
| Analytics / tracking plugins | Deferred or rejected | Tracking needs privacy, consent, retention, and redaction planning first. |
| CRM / marketing plugins | Deferred or rejected | They can forward customer contact and Concept Brief context to third parties. |
| Chat / booking plugins | Deferred | They collect customer communications or scheduling data and need staffing/privacy review. |
| Payment plugins | Rejected | Payments are outside the current MVP boundary. |
| Customer account plugins | Rejected | Auth/accounts are outside the current MVP boundary. |
| Broad MCP servers | Rejected | Broad filesystem, network, env, secrets, database, or customer-data access is too risky for the current MVP. |

## 6. Manual Installation Checklist

If a future task approves a skill or plugin installation, use this checklist
before any install or enablement:

1. Create a separate approved Codex task and branch only for that installation.
2. State the exact skill/plugin name, source, version, requested permissions,
   and business purpose.
3. Confirm whether it needs repo, network, env/secrets, customer data, SQL,
   deployment, package modification, or third-party service access.
4. Reject the installation if it needs SQL, Supabase live data, customer data,
   secrets, deploy, email sending, OpenAI/image generation, payments, auth, or
   broad MCP access unless that exact capability has separate written approval.
5. Confirm it cannot override NOVORA PR lifecycle, must-stop actions, or AI
   sketch business boundaries.
6. Confirm it will not be bundled into an app-code feature PR.
7. Record the installation decision and rollback path in a docs-only PR before
   enabling the tool, unless the user explicitly approves combining the decision
   record and installation in the same dedicated installation task.
8. After installation, run only the approved local validation and document what
   settings changed.

## 7. Rollback / Disable Checklist

If a future installed skill/plugin must be disabled or rolled back:

1. Stop using the tool immediately for NOVORA work.
2. Record the tool name, version, enabled scope, and reason for rollback.
3. Disable or uninstall it through the approved Codex/plugin settings path.
4. Remove any MCP server configuration only through the approved settings path.
5. Confirm no app code, package files, env/secrets, SQL, Supabase, deployment,
   email, customer-data, or AI-generation state was changed by the rollback.
6. If any customer-data, secret, or service exposure is suspected, stop and
   escalate to an owner/security review before continuing.
7. Add a ledger note if the disabled capability affected NOVORA workflow rules
   or future task planning.

## 8. Recommended Next Stage

The recommended next stage after Agent 48A is Review Pass.

Review Pass should verify that the audit remains docs-only, that the decision
matrix matches NOVORA's hard boundaries, and that no recommendation permits a
plugin or skill to override the PR lifecycle, customer-data protections,
Supabase/SQL restrictions, deployment rules, or AI sketch review boundaries.
