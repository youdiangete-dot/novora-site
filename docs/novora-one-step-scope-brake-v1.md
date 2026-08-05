# NOVORA One-Step Scope Brake v1

- Version: v1
- Status: active

## Purpose And Applicability

The One-Step Scope Brake keeps NOVORA MVP closeout work bounded, reviewable,
and under human coordination. It applies to both the NOVORA web Chat
coordination center and every Work/Codex task.

## Mandatory Rules

1. Every Work/Codex task answers exactly one acceptance question.
2. Every task crosses only one execution gate.
3. These gates must remain separate:
   - read-only investigation;
   - local implementation and validation;
   - build verification;
   - local commit;
   - Vercel verification;
   - push/publication;
   - PR creation;
   - PR review;
   - Preview request;
   - runtime probe;
   - merge;
   - rollback;
   - cleanup.
4. A task must never say, "If this passes, continue to the next step."
5. PASS, BLOCKED, or insufficient evidence always ends the task and returns
   control to the NOVORA web Chat coordination center.
6. Only one Work task may run at a time.
7. No automatic retry is allowed unless a new instruction explicitly
   authorizes one narrowly defined retry.
8. Chat may return only:
   - result classification;
   - one immediate next action;
   - one Codex-ready instruction for that action only.
9. Wording, formatting, optional improvements, speculative risks, and
   non-material observations must not create additional work.
10. A blocker must be material to the current acceptance question, such as an
    identity/Base mismatch, scope violation, security or privacy risk, source
    regression, runtime failure, or unresolved required approval.
11. Before execution, the task must be reducible to one PASS/BLOCKED question.
    If not, it is over-scoped and must not begin.
12. NOVORA must prioritize efficient MVP closeout and must not indefinitely
    expand Agents, documents, tests, reviews, or task scope.

## Instruction-Authoring Checklist

Before issuing a task, confirm that it:

- states one acceptance question that can end in PASS or BLOCKED;
- names exactly one execution gate and excludes every later gate;
- defines the exact scope, evidence, validation, and material blockers;
- contains no conditional continuation or automatic retry;
- returns control to Chat immediately after classification.

If any check fails, reduce the instruction to one gate or classify it BLOCKED
before execution.

## Required Stop Behavior

Work stops immediately after PASS, BLOCKED, or insufficient evidence. It reports
only evidence relevant to the acceptance question and does not start, prepare,
or authorize a later gate. Chat selects at most one immediate next action and
issues at most one task for that action.

## Examples

Invalid compound tasks:

- Investigate a defect and implement the fix when the cause is found.
- Implement a change, run the build, commit it, and push the branch.
- Create a PR, review its checks, request Preview, probe runtime, and merge.

Correctly separated tasks:

- Determine whether the defect's material cause is identified; stop and report.
- Implement and locally validate one approved fix; stop and report.
- Verify the build for the exact candidate; stop and report.
- Create one local commit from the reviewed diff; stop and report.
- Push the exact approved commit; stop and report.
- Create the PR for the exact published branch; stop and report.

