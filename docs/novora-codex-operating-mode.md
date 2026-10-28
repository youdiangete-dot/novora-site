# NOVORA Codex Operating Mode

This document defines the durable operating rules for Codex work on NOVORA.

`docs/novora-current-project-state.md` and the current GitHub `main` branch are
the source of truth for project state. They override chat memory, older local
notes, detached worktree state, and assumptions from previous conversations.

## M2 Stage-Integrated Parallel Exception

Owner authorization NOVORA_PARALLEL_INTEGRATED_DELIVERY_V1 applies only to M2.
Its detailed limits are in docs/novora-one-step-scope-brake-v1.md. It becomes
effective only after normal review, integration merge and exact merge-SHA
verification; a local candidate is not activation authority. Until then, keep
one engineering worker.

Once effective, one Dot coordinator may automatically dispatch and retrieve
at most two genuinely concurrent independent native workers, each with a unique
ID, separate branch/worktree and explicit disjoint file ownership. Record real
overlap. An expressly authorized stage may include implementation, targeted
validation, Build, normal commit/push/PR, bounded review, protected integration
and safe cleanup, without manual Owner relay or duplicate routine approvals.
Keep evidence checkpoints and reuse unchanged PASS. All online writes, Git
integration and deployment remain serialized under one authority; stop parallel
source writes before integrated conflict resolution and acceptance.

This exception overrides the default single-gate, WIP=1, manual-start and
stop-after-each-gate workflow only inside the authorized M2 stage. It does not
reset correction budgets, consumed attempts/costs/windows or deployment limits,
authorize new high-risk activity, or alter M1-M6/A01-A18, privacy, payment, Beta
or commercial completion. Respect platform approvals and actual denials; no
ACL/security/ownership changes, administrative elevation, destructive recovery
or unbounded retries. Outside M2, the existing atomic defaults below apply.

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

## Current-Task Authorization And Owner Approval

- App/server/test edits and normal local Git/PR operations require exact,
  bounded current-task authorization.
- Outside the effective M2 exception, manually starting the newest exact task
  authorizes its named low-risk operations. Within it, the coordinator may
  dispatch the expressly authorized stage steps automatically. Work must not
  request the same bounded authorization again.
- Normal path-specific staging, commit, push, PR creation, Draft/Ready
  transition, review-response work, and integration merge may occur only when
  expressly named in the current task.
- Absence of exact current-task authorization requires stopping.
- Safe docs-only authorization may include reading/searching named docs and
  skills, editing only allowed docs and skills, and running `git status`,
  `git diff`, and `git diff --check` when those operations are expressly named.

Separate plain-language Owner approval remains mandatory before:

- Production deployment or Production mutation;
- paid Provider or paid external-service use;
- customer-data access or mutation;
- Secret or environment-variable changes;
- live Supabase, Storage, or SQL mutation;
- destructive or difficult-to-reverse actions;
- legal, commercial, customer-delivery, or human-review policy changes;
- material product/business scope changes.

## Staging, Commit, Push, And PR Rules

- Do not stage, commit, push, create a PR, change Draft/Ready state, perform
  review-response work, merge, or deploy unless the exact current task or
  effective M2 stage expressly names that action.
- Do not run `git add .` without explicit approval for that exact command.
- Prefer path-specific staging after reviewing `git status --short` and
  `git diff`.
- Do not force push unless it is separately and exactly authorized.
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
