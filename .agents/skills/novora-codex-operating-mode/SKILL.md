---
name: novora-codex-operating-mode
description: Durable NOVORA Codex operating rules for branch/thread boundaries, project ledger source-of-truth, worktree recovery, auto-review permissions, must-stop actions, staging, and task reports.
---

# NOVORA Codex Operating Mode

## When To Use

Use this skill when starting or continuing NOVORA work, creating branches,
recovering work from a detached worktree, interpreting auto-review permissions,
deciding whether to stop for approval, staging or reporting changes, or updating
repository-local operating rules.

## Source Of Truth

1. Read `docs/novora-current-project-state.md` before each new agent, stage, or
   implementation slice.
2. Treat `docs/novora-current-project-state.md` and current GitHub `main` as the
   source of truth.
3. When chat memory, older notes, detached worktree state, or assumptions
   conflict with the ledger and current `main`, follow the ledger and current
   `main`.
4. Read `docs/novora-codex-operating-mode.md` before changing workflow,
   branching, PR, deployment, permission, or agent-handoff rules.

## Task Boundary Checklist

Start a new Codex task or thread when the work needs a new branch, a new PR, a
separate approval boundary, Production-affecting setup, SQL, Supabase changes,
Vercel env changes, provider configuration, real email behavior, retry/resend
behavior, payment, auth, CAD, order, production, AI generation, or a materially
different scope.

Continue the current thread when the work is follow-up validation, review
response, documentation cleanup, or a small correction inside the same approved
scope and branch.

## Branch And Worktree Rules

1. Start implementation from latest `main` unless the user asks to continue a
   different branch.
2. Use one normal local branch per scoped task.
3. Use the `codex/` branch prefix unless the user asks otherwise.
4. Use worktrees only for isolated exploration or explicitly requested parallel
   work.
5. Do not commit from a detached-HEAD worktree.
6. If a detached worktree cannot create a branch because of git metadata
   permissions, do not commit there; re-apply reviewed changes on a normal local
   branch from latest `main`.

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

## Auto-Review Permission Rules

Allowed actions are only the actions explicitly listed by the user. For a
docs-only allowlist, that usually means reading/searching allowed docs and skill
files, editing only explicitly allowed files, and running `git status`,
`git diff`, and `git diff --check`.

Must-stop actions always require approval even if they seem related to the task:

- Editing app code.
- Executing SQL.
- Changing Supabase schema, RLS, grants, policies, storage, or customer data.
- Changing Vercel environment variables.
- Changing Resend or Cloudflare.
- Sending real email.
- Touching secrets, API keys, service-role keys, or admin keys.
- Changing retry/resend behavior.
- Adding payment, auth, CAD, order, production, or AI generation behavior.
- Running `git add .`.
- Force pushing, merging a PR, or deploying Production.

## Reporting Checklist

Report the current branch, changed files, `git diff --stat`, relevant diff
summary, validation run, skipped checks, `git status --short`, and confirmation
that no out-of-scope app code, SQL, Supabase, Vercel, email, staging, commit,
push, PR, merge, or deploy action was taken.
