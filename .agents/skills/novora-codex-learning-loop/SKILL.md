---
name: novora-codex-learning-loop
description: NOVORA reusable project-learning workflow. Use after bug fixes, verification work, review corrections, Codex failures, ambiguous behavior, or repeated safety boundaries so useful lessons become durable repo-local guidance.
---

# NOVORA Codex Learning Loop

## When To Use

Use this skill at the end of each NOVORA task and whenever a bug fix,
Production or Preview verification, repeated safety boundary, Codex failure,
ambiguous behavior, or review correction reveals a lesson future work should
reuse.

## Learning Loop

1. After each bug fix, ask whether the bug should become regression test
   coverage.
2. After each Production or Preview verification, ask whether the verified
   result should be recorded in `docs/novora-current-project-state.md`.
3. After each repeated safety boundary, ask whether the concise rule belongs in
   `AGENTS.md` or the detailed procedure belongs in a repo-local skill.
4. After each Codex failure, ambiguous behavior, or review correction, ask
   whether a prompt template, checklist, or skill should be improved.
5. For every future Codex task, report whether the task revealed a reusable
   project rule.
6. Do not treat chat memory alone as durable project state. Durable rules belong
   in repository docs, `AGENTS.md`, repo-local skills, or tests.

## Placement Rules

- Put short, repository-wide guardrails in `AGENTS.md`.
- Put procedural guidance and scoped checklists in `.agents/skills/*`.
- Put verified durable project state and Production or Preview baselines in
  `docs/novora-current-project-state.md`.
- Put behavior regressions in tests when the existing harness can express them.
- Keep speculative future work out of the ledger unless it is clearly labeled
  as a recommendation or non-goal.

## Task Report Addition

Every NOVORA task report should answer:

```text
Reusable project rule revealed: yes/no.
If yes, where was it recorded or what follow-up is recommended?
```

## Boundaries

- Do not bloat `AGENTS.md`; use a repo-local skill for detailed procedures.
- Do not claim Production or Preview verification unless it actually happened.
- Do not turn a docs-only learning task into app code, tests, SQL, provider,
  environment, email, secrets, or deployment work without explicit approval.
