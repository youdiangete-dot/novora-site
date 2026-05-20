---
name: novora-safe-pr-workflow
description: Repository-local workflow guardrails for NOVORA pull request work. Use when starting, scoping, validating, staging, committing, or reporting any NOVORA repository change, especially when working from main, handling dirty worktrees, avoiding secrets, and keeping PRs narrow.
---

# NOVORA Safe PR Workflow

## When To Use

Use this skill at the start of any NOVORA code, documentation, configuration, or test change. Also use it when the user asks to create a branch, prepare a PR, commit work, review local changes, or continue after a dirty worktree or interrupted task.

## Step-By-Step Checklist

1. Read `AGENTS.md` before broad code exploration or edits.
2. Inspect the current branch and worktree with non-destructive git commands.
3. Identify unrelated local changes and leave them untouched unless the user explicitly asks to include them.
4. Start from the branch or commit the user requested. If they request latest `main`, fetch `origin` and branch from `origin/main`.
5. Use the `codex/` branch prefix unless the user specifies another branch name.
6. Keep the PR scope narrow and aligned with the user request.
7. Read the smallest relevant files first. Prefer `rg` for search, falling back to safe shell search if `rg` is unavailable.
8. Make edits with existing project patterns: App Router routes in `app/`, shared UI in `components/`, server-only code in `lib/server/`, route CSS modules beside route files, and tests under `tests/`.
9. Run the narrowest useful validation for the change. Broaden only when shared flows, persistence, or customer journeys are affected.
10. Before staging or committing, review `git status --short` and `git diff` so only intended files are included.
11. Report changed files, validations run, and any intentionally skipped checks.

## Forbidden Actions

- Do not delete, rewrite, stage, or commit unrelated local files.
- Do not use destructive git commands such as `git reset --hard` or `git checkout --` unless the user clearly requests them.
- Do not access, print, stage, or commit local secret notes, `.env.local`, `.env.1password`, provider dumps, password notes, or files named like `SUPABASE *.txt` or `NOVORA-Supabase-env-*.txt`.
- Do not broaden the task into unrelated refactors, new dependencies, auth, payments, production workflows, uploads, AI generation, or localization unless explicitly requested.
- Do not change customer-visible reference ID formats unless the task explicitly requires a migration.

## Validation And Reporting Expectations

- For documentation/workflow-only changes, no build is required unless the user asks for one.
- For frontend behavior changes, run focused tests or browser verification for the affected route when feasible.
- For server validation, persistence, or environment handling changes, run `npm run build` at minimum unless blocked.
- In the final report, state the branch, files changed, validation performed, skipped checks, and any unrelated local files left untouched.
