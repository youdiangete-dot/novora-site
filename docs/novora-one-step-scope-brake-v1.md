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
   merge, deployment, Production E2E, rollback, and cleanup remain separate
   gates. Read-only investigation, local implementation, Vercel verification,
   Preview request, runtime probe, and other materially distinct operations are
   also separate gates except for the expressly authorized operations within a
   vertical acceptance package defined below.
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
11. Consolidate ordinary read-only checks that support the same acceptance
    question into that gate; do not create a task for each setting or query.
    This does not combine mandatory independent execution or high-risk gates.

## Delivery-Linked Task Admission

Before proposing a task, Chat must identify the existing acceptance requirement
or verified P0/P1 blocker, why action is necessary now, and the concrete delivery
result the task unlocks. Bind it to the existing milestone and acceptance mapping;
do not invent a new acceptance requirement to justify the task.

Unrelated P2 features, architecture redesign, and full infrastructure rebuilds
require separate approval. A narrow blocker does not authorize those expansions.

These execution rules do not modify AGENTS.md's sole commercial completion
contract (S1/M1-M6), the existing A01-A18 acceptance mapping, NOVORA MVP Delivery
Lock v1, NOVORA MVP Release Baseline v1, S2 automatic safety gates, Owner
change-control authority, or COMPLETE / NO-GO / OWNER_HOLD mechanisms. Preserve
their existing meaning and requirements; do not copy or redefine them here.

## Technical Decision Ownership

1. NOVORA web Chat owns technical coordination decisions.
2. When evidence is sufficient, Chat determines the single technically
   necessary next action and provides one bounded Codex-ready instruction only
   when execution passes Delivery-Linked Task Admission. A Work/Codex suggested
   next action is advice, not automatic authorization; Chat must independently
   assess its necessity and contain its scope before selecting it.
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
5. The Owner controls commercial goals, risk, cost, and required approvals,
   including material product-scope and policy choices. Chat owns technical
   necessity assessment, scope containment, and next-action selection.

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

Preserve existing working keys and services. Do not request unnecessary key
regeneration, replacement, or repeated manual entry. Never expose secret values;
any necessary credential handling stays within a separately authorized secure
channel and gate. Configured keys or working services alone do not establish
verified environment isolation or authorize a live operation.

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
6. Before issuing the task, Chat compares it with current authority, accepted
   PASS evidence, known state, and unexecuted prior instructions. Explicitly
   identify and supersede conflicting proposals within the applicable authority;
   do not silently override higher authority or an Owner hold. Keep only one
   active instruction; supersession does not authorize execution by itself.

## Vertical Acceptance Package Clarification

A gate is one meaningful deliverable or bounded runtime acceptance outcome,
not one query, assertion, function, file, or test. Define its exact project and
runtime identities, acceptance target, risk boundaries, permitted operations,
correction budget, and stop condition before execution. These principles are
portable by explicitly changing those bindings; they do not authorize global
Codex rule changes or changes to another repository.

- Within an expressly approved local engineering package, inspect, minimally
  correct, run targeted validation, and use bounded corrections continuously
  without per-file, per-test, or repeated approval. This permits no scope
  expansion and does not absorb a separate Build or publication gate.
- For a specifically Owner-approved isolated runtime acceptance package,
  necessary setup, execution, verification, and mandatory safe restoration
  belong to the same gate. Before activation, verify target identity,
  authorization, safety prerequisites, and an independently available emergency
  disable/revocation path. Missing material safety evidence prevents activation.
  Restore and verify the safe state on success and failure; after an activated
  failure, prioritize disable/revocation over diagnosis or retry. A fragile
  application `finally` block alone is insufficient recovery evidence.
- One exact authorization covers the expressly approved, scoped, reversible
  operations necessary to complete that gate. It does not authorize otherwise
  separate Production, paid Provider, Git publication, merge, or deployment
  gates. Live SQL, secrets, customer data, paid services, irreversible actions,
  and material product changes still require exact Owner authorization; infer
  no permission from adjacency or from approval of another operation.
- Preserve all valid prior PASS evidence. Apply Evidence Reuse below: revalidate
  only when material inputs, implementation, environment, or relevant
  assumptions change or prior execution was not established. Report working
  customer/business outcomes, eliminated P0/P1 blockers, and completed
  integration boundaries rather than counts of micro-checks.
- WIP=1, the existing correction budgets, recovery-chain cap, and STOP remain
  mandatory. Renaming a blocker does not reset a budget. Do not add agent
  frameworks, governance projects, milestones, or optional refactoring as
  prerequisites.
- This clarification preserves the M1-M6 commercial completion contract,
  current automatic First Preview visibility policy, Delivery Lock acceptance
  IDs, P0/P1 requirements, and Production release criteria. It adds no new
  governance version or authority.

## Failure Classification And Budgets

### Class 1 — Safety, Identity, Or Material Failure

Class 1 applies when any condition below is true:

- repository, worktree, branch, Base, Head, SHA, identity, or scope differs;
- the failure exposes safety, privacy, security, authorization, or high-risk
  risk;
- the defect affects behavior outside the acceptance question or approved
  scope;
- correction requires architecture, dependency, product-scope, or approval
  expansion;
- the remaining Class 2 budget cannot contain the correction;
- evidence is insufficient to prove the defect is narrowly bounded.

When classification remains genuinely ambiguous after inspection, fail closed
as Class 1 and return to Chat for root-cause replanning.

Behavior:

- stop immediately;
- do not retry or silently correct;
- return BLOCKED with the exact material reason.

### Class 2 — Narrow Implementation Correction

A real test assertion, compiler diagnostic, or Build diagnostic is not
automatically Class 1. Class 2 applies only when every condition below is
satisfied:

- the defect is directly attributable to one narrow local implementation
  issue;
- it remains within the current acceptance question;
- it remains within the authorized file and product scope;
- it does not cross safety, privacy, security, identity, authorization,
  high-risk, or material product boundaries;
- the task contains an unused explicit Class 2 correction budget;
- the correction requires no architecture expansion, unrelated refactoring,
  new dependency, product-scope expansion, or new approval boundary.

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
7. Do not repeat equivalent investigations without identifying a credible new
   evidence source capable of resolving the remaining question. After two
   consecutive tasks on one blocker produce neither material delivery progress
   nor new evidence that changes the next necessary action, stop that sequence.
   Chat reassesses the delivery route using existing evidence; this reassessment
   is not a new Codex gate. Do not rename the blocker to restart the sequence.
   Stricter failure, recovery, NO-GO, and OWNER_HOLD rules still apply; this
   two-task limit grants no extra attempt or automatic continuation.

## Evidence Reuse

1. Accepted validation evidence remains valid when exact file hashes are
   unchanged, the relevant commit or diff is unchanged, and the relevant
   environment requirement has not materially changed.
2. Do not repeat accepted tests, builds, reviews, or checks merely because
   another gate follows. Fresh identity checks establish the gate's current
   inputs; they do not reopen accepted validation without material cause.
3. Before repeating accepted evidence, identify the specific material
   invalidation and the affected proof: relevant source or test content changed,
   the exact Head includes unvalidated content, prior execution was not
   established, the relevant environment materially changed, or a material
   review finding requires new proof. Run only the necessary affected checks;
   a docs-only or unrelated Head change does not invalidate all prior evidence.
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
8. After every Work result, Chat supplies the acceptance judgment, actual
   delivery increment, and one necessary next action, or the applicable STOP /
   COMPLETE / NO-GO / OWNER_HOLD outcome when no execution is justified. Supply
   a Codex-ready instruction only when independently justified by task admission,
   available evidence, and authorization boundaries; never automatically resume
   Work or treat a suggested action as approval.
9. Report local code, validation, remote source delivery, runtime readiness,
   E2E acceptance, and milestone COMPLETE as distinct states. A PASS report alone
   is not functional delivery. Claim only the increment actually demonstrated;
   milestone completion still requires its existing acceptance contract.

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
- names the existing acceptance requirement or verified P0/P1 blocker, current
  necessity, and concrete delivery result unlocked;
- names exact identity, scope, evidence, budgets, material blockers, and
  excluded later gates;
- carries all low-risk authorization required for its named operations;
- identifies any separate high-risk approval boundary in plain language;
- contains no conditional continuation, uncontrolled retry, or hidden recovery
  chain;
- states what accepted evidence may be reused;
- cites specific material invalidation before repeating accepted evidence;
- reconciles authority, accepted PASS, known state, and unexecuted instructions,
  explicitly superseding conflicting proposals without overriding higher authority;
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

- Investigate a defect and implement any fix found without a defined acceptance
  target, authorized file scope, or bounded correction budget.
- Implement a change, run Build, commit it, and push the branch.
- Create a PR, review it, mark it Ready, merge it, and deploy it.

Correctly separated Work determines one cause, implements one bounded change,
validates one exact candidate, verifies one Build, creates one local commit,
pushes one exact commit, creates one PR, reviews one exact Head, changes one PR
state, merges one exact PR, or performs one separately approved deployment.

