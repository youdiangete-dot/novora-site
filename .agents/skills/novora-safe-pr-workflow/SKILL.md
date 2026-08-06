---
name: novora-safe-pr-workflow
description: Repository-local workflow guardrails for NOVORA pull request work. Use when starting, scoping, validating, staging, committing, or reporting any NOVORA repository change, especially when working from main, handling dirty worktrees, avoiding secrets, and keeping PRs narrow.
---

# NOVORA Safe PR Workflow

## When To Use

Use this skill at the start of any NOVORA code, documentation, configuration, or test change. Also use it when the user asks to create a branch, prepare a PR, commit work, review local changes, or continue after a dirty worktree or interrupted task.

## Step-By-Step Checklist

1. Read `AGENTS.md` before broad code exploration or edits.
2. Read `docs/novora-current-project-state.md` before each new agent, stage, or
   implementation slice.
3. Read `docs/novora-codex-operating-mode.md` before workflow, branch, PR,
   deployment, permission, or agent-handoff changes.
4. Inspect the current branch and worktree with non-destructive git commands.
5. Identify unrelated local changes and leave them untouched unless the user explicitly asks to include them.
6. Start from latest `main` unless the user explicitly asks to continue another
   branch. If they request latest `main`, fetch `origin` and branch from
   `origin/main`.
7. Use one normal local branch per scoped task and the `codex/` branch prefix
   unless the user specifies another branch name.
8. Use worktrees only for isolated exploration or explicitly requested parallel
   work. Do not commit from a detached-HEAD worktree; if branch creation or
   commits fail due git metadata permissions, re-apply accepted changes on a
   normal local branch from latest `main`.
9. Keep the PR scope narrow and aligned with the user request.
10. Read the smallest relevant files first. Prefer `rg` for search, falling back to safe shell search if `rg` is unavailable.
11. Make edits with existing project patterns: App Router routes in `app/`, shared UI in `components/`, server-only code in `lib/server/`, route CSS modules beside route files, and tests under `tests/`.
12. A bounded implementation-and-validation gate runs only the focused checks
    expressly named in its current task. Do not broaden validation or absorb a
    separate Build gate.
13. Before staging or committing, review `git status --short` and `git diff` so only intended files are included.
14. Do not run `git add .` without explicit approval for that exact action.
15. Report changed files, validations run, skipped checks, `git status --short`,
   and any intentionally untouched unrelated local files.

## Forbidden Actions

- Do not delete, rewrite, stage, or commit unrelated local files.
- Do not stage, commit, push, create a PR, merge, or deploy unless the user asks
  for that action.
- Do not run `git add .` without explicit approval for that exact action.
- Do not use destructive git commands such as `git reset --hard` or `git checkout --` unless the user clearly requests them.
- Do not access, print, stage, or commit local secret notes, `.env.local`, `.env.1password`, provider dumps, password notes, or files named like `SUPABASE *.txt` or `NOVORA-Supabase-env-*.txt`.
- Do not broaden the task into unrelated refactors, new dependencies, auth, payments, production workflows, uploads, AI generation, or localization unless explicitly requested.
- Do not change customer-visible reference ID formats unless the task explicitly requires a migration.
- Stop and ask before app code, SQL, Supabase schema/RLS/grant/policy/storage or
  customer data changes, Vercel env, Resend, Cloudflare, real email, secrets,
  retry/resend behavior, payment, auth, CAD, order, AI generation, force push,
  PR merge, or Production deploy when those actions are not explicitly approved.

## Validation And Reporting Expectations

- A bounded implementation-and-validation gate runs only focused tests or
  browser verification expressly named in its current task.
- `npm run build` remains a separate Build gate. Only a separately authorized
  Build task runs it.
- An implementation report may state that Build remains required before
  delivery, but Build must not be absorbed into implementation, commit, push,
  PR, review, Ready, or merge.
- Documentation-only changes do not require Build.
- In the final report, state the branch, files changed, `git diff --stat`,
  validation performed, skipped checks, `git status --short`, and any unrelated
  local files left untouched.
