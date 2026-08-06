# NOVORA One-Step Scope Brake v1.2

- Version: v1.2
- Status: active

## Purpose And Applicability

The One-Step Scope Brake keeps NOVORA MVP closeout work bounded, reviewable,
safe, and efficient. It applies to the NOVORA web Chat coordination center and
every Work/Codex task. The Owner supplies product and business intent; Chat owns
technical coordination; Work executes one exact gate.

## Core One-Question / One-Gate Rules

1. Every Work task answers exactly one acceptance question.
2. Every Work task crosses exactly one execution gate.
3. Only one NOVORA Work task may be active at a time: WIP=1.
4. Build, validation, commit, push, PR creation, PR review, Ready transition,
   merge, deployment, and cleanup remain separate gates. Read-only
   investigation, local implementation, Vercel verification, Preview request,
   runtime probe, rollback, and other materially distinct operations are also
   separate gates.
5. When the current instruction expressly defines one bounded
   implementation-and-validation gate, only its named local acceptance checks
   accompany the implementation; it still cannot continue into Build, commit,
   push, PR, review, Ready, merge, deployment, or cleanup.
6. A task must never say, "If PASS, automatically continue."
7. PASS, BLOCKED, or insufficient evidence ends Work and returns control to
   Chat.
8. No task may expand its acceptance question, file scope, product scope, or
   risk boundary while running.
9. Before execution, the task must be reducible to one PASS/BLOCKED question.
   If not, it is over-scoped and must be reduced or blocked.
10. Wording, formatting, optional refactoring, speculative risk, and
    non-material observations do not create more work.

## Technical Decision Ownership

1. NOVORA web Chat owns technical coordination decisions.
2. When evidence is sufficient, Chat determines the single technically
   appropriate next gate and provides one bounded Codex-ready instruction.
3. Chat does not ask the Owner to choose or interpret:
   - Base, Head, branch, or SHA;
   - commit and PR sequencing;
   - Draft versus Ready;
   - test command or validation method;
   - TypeScript or application implementation details;
   - whether a materially reviewed PR is technically ready to merge;
   - ordinary Git workflow order;
   - whether a mechanical command error should be retried within budget;
   - optional refactoring, naming, or formatting preferences.
4. When evidence is insufficient, Chat requests only one missing fact or one
   narrow verification step. It never asks the Owner to guess.
5. The Owner remains responsible for product and business intent, including
   material product-scope and policy choices, not software implementation
   judgment.

## Owner Approval Boundary

Separate plain-language Owner approval is required for:

- Production deployment or Production mutation;
- paid Provider or paid external-service usage;
- customer-data access or mutation;
- Secret or environment-variable changes;
- live Supabase, Storage, or SQL mutation;
- destructive or difficult-to-reverse operations;
- legal, commercial, customer-delivery, or human-review policy changes;
- material expansion or alteration of product/business scope.

For each approval, Chat provides one recommended decision, what the action
accomplishes in plain language, the material risk, the exact bounded
authorization, and a simple approve / do-not-approve response. The Owner is not
required to approve technical terminology they cannot reasonably evaluate.

A Codex-ready task may itself carry that separate approval only when the Owner
submits an exact, plain-language, identity-bound authorization covering the
high-risk action. Once submitted, Work does not ask for the same approval again,
but it stops if identity, scope, evidence, or safety differs.

## Bounded Task Authorization

1. When the Owner submits or manually starts a Codex-ready Work task, that
   action explicitly authorizes every low-risk, reversible operation expressly
   listed in that exact task.
2. Work must not request duplicate approval for an already authorized bounded
   application/server-code edit, test edit, local validation command,
   disposable validation-copy synchronization, local commit, normal push, PR
   creation, Draft/Ready transition, or integration merge when the operation is
   expressly named, identity-bound, scope-bound, and does not cross a high-risk
   Owner approval boundary.
3. Work still stops when identity, scope, authorization, or safety evidence
   differs.
4. Read-only wording from an earlier gate cannot override the explicit
   authorization in the current task.
5. The newest exact task authorization controls the current Work task.

## Failure Classification And Budgets

### Class 1 — Safety, Identity, Or Material Failure

Examples include repository/worktree/branch/Base/Head/SHA drift, an unexpected
file or commit, a real application assertion or compiler/build defect, a
security/privacy failure, a new material review finding, or a high-risk boundary.

Behavior:

- stop immediately;
- do not retry or silently correct;
- return BLOCKED with the exact material reason.

### Class 2 — Narrow Implementation Correction

Examples include a focused test exposing one defect within the current
acceptance question or a compiler diagnostic identifying one local
implementation defect.

Behavior:

- permitted only when the task explicitly includes a correction budget;
- remain inside the same acceptance question and approved file scope;
- default maximum: one primary implementation plus up to two narrow correction
  cycles;
- each correction addresses only the directly observed defect;
- no architecture or product-scope expansion;
- stop and replan when the correction budget is exhausted.

### Class 3 — Mechanical Execution Failure

Examples include slash/path-selector formatting, shell quoting, command-runner
syntax, stale disposable output, an occupied local test port, a Git
safe-directory or sandbox ownership guard, a validation copy without Git
metadata, or an equivalent non-code invocation issue.

Behavior:

- correct within the same task;
- do not create a new Work task merely for the mechanical issue;
- do not count it as a code-correction cycle;
- default maximum: two mechanical corrections per task;
- record the original failure and the correction;
- never change source behavior under the label of a mechanical correction.

## Recovery-Chain Cap

1. Chat must not generate an indefinite sequence such as
   `R1 -> R2 -> R3 -> R4 -> V1 -> V2` for one acceptance goal.
2. The original task includes foreseeable implementation-correction and
   mechanical-recovery budgets.
3. After the original task exhausts its budget, Chat may create at most one
   recovery task for the same acceptance goal.
4. If that recovery task fails for a material reason, Chat stops and provides a
   root-cause replan. It does not automatically create another recovery task.
5. A mechanical failure in the recovery task uses that task's mechanical
   correction budget, not another recovery task.
6. Renaming or rewording the same acceptance goal does not reset the recovery
   limit.

## Evidence Reuse

1. Accepted validation evidence remains valid when exact file hashes are
   unchanged, the relevant commit or diff is unchanged, and the relevant
   environment requirement has not materially changed.
2. Do not rerun tests merely because another Git or PR gate follows.
3. Rerun validation only when source or test content changed, the exact Head
   changed with unvalidated content, previous validation did not execute, the
   relevant environment materially changed, or a material review finding
   requires new proof.
4. Commit, push, PR-state, and merge gates verify identity and reuse accepted
   evidence instead of repeating TypeScript, Playwright, or Build.

## Chat-Side Read-Only Verification

1. When Chat can independently verify GitHub PR state, Head SHA, commit count,
   changed files, merged status, or merge commit through a connected read-only
   source, it does so directly.
2. Chat does not create a separate Work task solely to reproduce a read-only
   fact already verifiable by Chat.
3. Work remains appropriate for local repository state, local hashes, local
   tests, or local filesystem evidence.
4. Chat distinguishes independently verified evidence from a Work report.

## Completion And Continuation

1. After a Work result, Chat first asks whether the Owner's currently stated
   broader goal is complete.
2. When the broader goal is complete:
   `STOP / HOLD FOR OWNER DECISION`.
3. When the broader goal is incomplete and the next gate is low-risk,
   technically determined, within the already stated goal, and supported by
   sufficient evidence, Chat may select and provide the next single bounded
   Work instruction without asking the Owner to make a technical choice.
4. The Owner manually starting that next Work task constitutes its bounded
   authorization.
5. Chat still stops before a high-risk approval boundary.
6. Chat does not continue merely because another technical action is possible.
7. Completion is evaluated against the Owner's stated goal, not against the
   existence of an entire possible Git, PR, or deployment lifecycle. Chat does
   not silently redefine local implementation, local commit, or remote delivery
   as the same goal.

## Throughput And MVP Priority

1. NOVORA currently prioritizes completing MVP closeout.
2. Safety rules reduce material risk without allowing procedural overhead to
   exceed the development work itself.
3. Chat optimizes for one clear outcome, minimum necessary evidence, reuse of
   accepted evidence, bounded corrections, elimination of duplicate approval,
   and no unnecessary Agent, document, test, review, or task expansion.
4. More process is not evidence of greater safety.
5. A task is incorrectly designed when it tests whether the first command was
   typed perfectly instead of whether the bounded product change is correct.

## Instruction-Authoring Checklist

Before issuing a task, confirm that it:

- states one acceptance question and one execution gate;
- names exact identity, scope, evidence, budgets, material blockers, and
  excluded later gates;
- carries all low-risk authorization required for its named operations;
- identifies any separate high-risk approval boundary in plain language;
- contains no conditional continuation, uncontrolled retry, or hidden recovery
  chain;
- states what accepted evidence may be reused;
- returns control to Chat after classification.

If any check fails, reduce the instruction to one gate or classify it BLOCKED
before execution.

## Examples

### Wrong Playwright Slash Or Selector

A focused Playwright command discovers zero tests because a Windows backslash
was used in the selector. This is Class 3: record the failed invocation, correct
the selector within the same task if a mechanical correction remains, and do
not count it as a code-correction cycle.

### Focused Test Exposes A Real Timeout-Classification Defect

The intended focused test executes and proves that a timeout is classified as
cancelled. This is Class 2, not a mechanical error. Correct only the observed
defect within the approved file scope and the task's explicit correction budget;
then run only the authorized validation. Stop and replan if the budget is spent.

### Production Deployment

A Production deployment is a separate high-risk gate. Chat recommends one
bounded deployment in plain language, explains the outcome and material risk,
and asks the Owner to approve or not approve that exact deployment. No local
implementation, validation, commit, push, PR, or merge task silently authorizes
Production.

### Invalid Compound Work

- Investigate a defect and implement the fix when the cause is found.
- Implement a change, run Build, commit it, and push the branch.
- Create a PR, review it, mark it Ready, merge it, and deploy it.

Correctly separated Work determines one cause, implements one bounded change,
validates one exact candidate, verifies one Build, creates one local commit,
pushes one exact commit, creates one PR, reviews one exact Head, changes one PR
state, merges one exact PR, or performs one separately approved deployment.

