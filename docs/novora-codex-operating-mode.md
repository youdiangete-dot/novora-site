# NOVORA Codex Operating Mode

This document defines the durable operating rules for Codex work on NOVORA.

`docs/novora-current-project-state.md` and the current GitHub `main` branch are
the source of truth for project state. They override chat memory, older local
notes, detached worktree state, and assumptions from previous conversations.

## When To Start A New Codex Task

Start a new Codex task or thread when the work needs:

- A new branch or pull request.
- A separate approval boundary.
- SQL, Supabase schema/RLS/grant/policy/storage work, or customer data mutation.
- Vercel environment changes.
- Resend, Cloudflare, email-delivery, or retry/resend behavior changes.
- Payment, authentication, CAD, order, production, or AI generation behavior.
- A materially different scope from the current branch or PR.

Continue the current thread when the work is:

- Follow-up validation for the same scoped task.
- Review-response work on the same branch.
- Documentation cleanup for the same PR.
- A small correction inside the same approved scope.

## Branch And Worktree Rules

- Start implementation tasks from latest `main` unless the user explicitly asks
  to continue another branch.
- Use one normal local branch per scoped task.
- Use the `codex/` branch prefix unless the user asks for a different name.
- Worktrees are allowed for isolated exploration or explicitly requested
  parallel work, but do not commit from a detached-HEAD worktree.
- If a detached worktree cannot create a branch because of git metadata
  permissions, do not commit there; re-apply reviewed changes on a normal local
  branch from latest `main`.
- Do not delete, stage, rewrite, or commit unrelated local files.

## Long-Running Task And Quota Exhaustion Protocol

Every long-running, interrupted, or quota-exhausted task must end with a handoff
report that includes:

- Current branch.
- Git status.
- Changed files.
- What was done.
- What was not done.
- Validation result.
- Safe next step.
- Whether to continue the same Codex task or open a new one.
- Whether Local or Worktree should be used next.

## Auto-Review Permission Model

When the user gives an auto-review allowlist, Codex may do only the listed safe
actions without stopping. A must-stop item always wins over an allowlist.

Safe docs-only actions commonly include:

- Reading and searching allowed docs and skill files.
- Editing only explicitly allowed docs and skill files.
- Running `git status`, `git diff`, and `git diff --check`.

Stop and ask before:

- Editing app code.
- Executing SQL or changing Supabase schema, RLS, grants, policies, storage, or
  customer data.
- Changing Vercel environment variables.
- Changing Resend or Cloudflare configuration.
- Sending real email.
- Touching secrets, API keys, service-role keys, or admin keys.
- Changing retry/resend behavior.
- Adding or changing payment, authentication, CAD, order, production, or AI
  generation behavior.
- Running `git add .`.
- Force pushing, merging a PR, or deploying Production.

## Staging, Commit, Push, And PR Rules

- Do not stage, commit, push, create a PR, merge, or deploy unless the user asks
  for that action.
- Do not run `git add .` without explicit approval for that exact command.
- Prefer path-specific staging after reviewing `git status --short` and
  `git diff`.
- Keep PR scope narrow and aligned with the approved task.

## Reporting Template

For NOVORA task reports, include:

- Current branch.
- Changed files.
- `git diff --stat`.
- Relevant diff summary.
- Validation run and skipped checks.
- `git status --short`.
- Confirmation that no out-of-scope app code, SQL, Supabase, Vercel, email,
  staging, commit, push, PR, merge, or deploy action was taken.
