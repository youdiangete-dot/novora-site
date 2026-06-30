# NOVORA Agent 55F Final SQL Packet Manual Verification Checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

## 1. Purpose

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55F defines the final docs-only SQL packet review and manual verification checklist required before any future Design Spec / Hand Sketch Instruction artifact schema execution decision.

This document is a checklist only. Agent 55F does not execute SQL, create a migration, access Supabase, change schema, implement app or API behavior, change admin UI, persist artifacts, generate artifacts, generate images, send email, expose a customer preview, create gallery approval, or authorize execution by this PR alone.

## 2. Background

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55D created the candidate artifact schema and SQL planning packet for future persisted Design Spec / Hand Sketch Instruction artifacts. Agent 55E created the SQL execution safety and migration staging plan.

Agent 55F converts those planning artifacts into a final review and manual verification checklist. It does not supersede Agent 55D or Agent 55E, and it does not execute SQL.

## 3. Core final-review principle

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

**Final checklist before execution, not execution**

**Frozen packet plus explicit human approval before any SQL**

**Verification evidence before write-path planning**

Additional governing rules:

- No SQL execution without frozen packet, human approval, and verification plan.
- Additive schema first, destructive changes blocked.
- Migration planning is not migration execution.
- Schema before write path, planning before SQL execution.
- Human-approved email delivery, never automatic AI customer delivery.

Merging Agent 55F does not authorize SQL execution. A checklist is not execution approval. Any future execution requires a separate explicit user decision and should be manual or separately scoped only. No future write path should start until schema verification is complete.

## 4. Current MVP boundary

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55F must not:

- Run SQL.
- Create a migration.
- Alter Supabase schema.
- Connect to Supabase.
- Implement API routes or server actions.
- Implement an admin write path.
- Persist artifacts.
- Generate artifacts or images.
- Send email.
- Expose artifacts to customers.
- Create a customer preview.
- Create gallery approval.
- Imply CAD, quote, order, or production approval.

CAD, quotation, gem procurement, and production remain offline and separate.

## 5. Relationship to Agent 55D

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55D planned the candidate schema and SQL packet. Agent 55F reviews the readiness of that packet conceptually through final checklist gates.

Agent 55F does not edit or execute the Agent 55D packet. If the Agent 55D packet is incomplete, Agent 55F requires a docs-only revision before any execution decision.

## 6. Relationship to Agent 55E

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55E planned execution safety and migration staging. Agent 55F converts that safety plan into checklist form.

Agent 55F does not reduce or bypass any Agent 55E gate and cannot approve SQL execution by itself.

## 7. Final packet identity checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future packet freeze identity must record:

- [ ] Packet source document.
- [ ] Packet version.
- [ ] Packet commit SHA.
- [ ] Date frozen.
- [ ] Reviewer identity or role.
- [ ] Target environment name.
- [ ] Target Supabase project name.
- [ ] Execution operator.
- [ ] Expected statement count.
- [ ] Expected created objects.
- [ ] Expected changed objects.
- [ ] Expected no data mutation.

No secrets, keys, passwords, connection strings, or raw environment values should be recorded.

## 8. Frozen SQL packet review checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Before any future execution decision, confirm:

- [ ] All SQL statements are labeled.
- [ ] Every statement has a purpose.
- [ ] Every statement has an expected effect.
- [ ] Every table, index, constraint, and policy has a verification step.
- [ ] Table names are final.
- [ ] Constraint and index names are final.
- [ ] No destructive statements exist.
- [ ] No data mutation statements exist unless separately approved.
- [ ] RLS decisions are explicit.
- [ ] Rollback and stop plan is attached.
- [ ] Packet is frozen and cannot be edited during execution without new review.

## 9. SQL label and authorization checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Every SQL-related section must carry this label:

`FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL`

Confirm:

- [ ] No section says to run SQL now.
- [ ] No section claims execution happened.
- [ ] No PR merge equals execution approval.
- [ ] No checklist item authorizes ChatGPT or Codex to run SQL.
- [ ] No Supabase project is accessed by Agent 55F.
- [ ] No secret is requested or recorded.

## 10. Explicit human approval wording

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

The following wording is a future-only template and is not active approval in Agent 55F. Future approval must explicitly provide:

- [ ] Target Supabase project name.
- [ ] Target environment.
- [ ] Frozen packet identifier or commit SHA.
- [ ] Confirmation that the user understands this is schema execution.
- [ ] Confirmation that no customer-facing delivery, generation, gallery, CAD, quote, order, or production approval is included.

Future-only approval wording template:

> I explicitly approve manual execution of the frozen NOVORA artifact schema SQL packet identified by [packet/version/commit] against Supabase project [project name] in environment [environment]. I understand this approval is only for the reviewed additive schema packet and does not approve customer delivery, image generation, gallery use, CAD, quotation, order confirmation, gemstone procurement, or production.

Agent 55F does not request this approval now.

## 11. Supabase project and environment confirmation checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Before any future execution decision, confirm:

- [ ] Project name is confirmed in trusted Supabase UI.
- [ ] Project ID is confirmed in trusted Supabase UI.
- [ ] Environment is confirmed as production, preview, or local.
- [ ] Operator confirms intended target.
- [ ] No secrets are pasted into docs or chat.
- [ ] Service role key is not exposed.
- [ ] Database URL is not copied into docs.
- [ ] Execution account permissions are understood.
- [ ] User confirms this is the intended project before execution.

## 12. Secrets and access handling checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm:

- [ ] No environment values in docs.
- [ ] No service role key in docs or chat.
- [ ] No database password in docs or chat.
- [ ] No provider key in docs or chat.
- [ ] No storage signed URLs in docs.
- [ ] No customer private data exported into docs.
- [ ] Screenshots, if any, avoid secrets.
- [ ] Execution evidence redacts sensitive values.

## 13. Read-only preflight verification checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future read-only verification only. Before any future execution decision, confirm:

- [ ] Current database is selected.
- [ ] Existing `concept_briefs` table exists.
- [ ] Existing required trigger or function dependencies are verified if reused.
- [ ] Artifact tables do not already conflict.
- [ ] Proposed table names are available.
- [ ] Proposed constraints do not conflict.
- [ ] Proposed indexes do not conflict.
- [ ] No existing customer data needs mutation.
- [ ] RLS posture is understood.
- [ ] Current app still works before execution.
- [ ] No locks, maintenance, or outage conditions exist.

## 14. No-destructive-change checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm the future packet contains no:

- [ ] `DROP TABLE`.
- [ ] `DROP COLUMN`.
- [ ] `TRUNCATE`.
- [ ] `DELETE`.
- [ ] `UPDATE` against production rows.
- [ ] Destructive `ALTER`.
- [ ] Existing customer submission mutation.
- [ ] Existing AI sketch review mutation.
- [ ] Existing admin note mutation.
- [ ] Existing notification event mutation.
- [ ] Storage bucket mutation.

Any destructive change is out of scope and requires a separate risk review.

## 15. Additive migration readiness checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm the future packet:

- [ ] Creates only new artifact-related objects.
- [ ] Adds only planned indexes, constraints, and comments.
- [ ] Does not backfill data.
- [ ] Does not expose a customer route.
- [ ] Does not implement an app write path.
- [ ] Does not change existing app behavior.
- [ ] Does not require immediate rollback to preserve customer submissions.
- [ ] Can be verified through schema and object checks.

## 16. Manual execution-day checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future execution day must:

- [ ] Confirm frozen packet identity.
- [ ] Confirm target project and environment.
- [ ] Confirm operator.
- [ ] Confirm human approval text was provided.
- [ ] Complete read-only preflight first.
- [ ] Use only frozen reviewed statements.
- [ ] Avoid editing statements mid-run.
- [ ] Stop on first unexpected failure.
- [ ] Record statement order and results.
- [ ] Complete post-execution verification.
- [ ] Avoid starting app or API work in the same execution pass.

This checklist intentionally provides no executable commands.

## 17. Stop conditions checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Stop if:

- [ ] Wrong project.
- [ ] Wrong environment.
- [ ] Missing explicit approval.
- [ ] Packet not frozen.
- [ ] SQL differs from reviewed packet.
- [ ] Unexpected existing table or object.
- [ ] Permission uncertainty.
- [ ] RLS uncertainty.
- [ ] Statement failure.
- [ ] Verification mismatch.
- [ ] Accidental data mutation risk.
- [ ] Secret exposure risk.
- [ ] Customer-facing exposure risk.
- [ ] Operator is unsure.

## 18. Post-execution verification checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future verification should confirm:

- [ ] Expected tables exist.
- [ ] Expected columns exist.
- [ ] Expected constraints exist.
- [ ] Expected indexes exist.
- [ ] Foreign key exists.
- [ ] Idempotency and unique constraints exist.
- [ ] RLS and access state matches plan.
- [ ] No rows were inserted unintentionally.
- [ ] No existing rows were changed.
- [ ] App still builds or renders as before, if separately checked.
- [ ] 55B still shows safe empty state until a read-path Agent.
- [ ] Verification evidence is captured.

## 19. Evidence capture checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future evidence should capture:

- [ ] Packet identity.
- [ ] Target project and environment.
- [ ] Operator role.
- [ ] Execution timestamp.
- [ ] Statement result summary.
- [ ] Verification result summary.
- [ ] Failed statement, if any.
- [ ] Stop or rollback decision, if any.
- [ ] Screenshot redaction confirmed.
- [ ] No secrets included.
- [ ] No customer private data included.

## 20. Rollback and escalation checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

If future execution encounters trouble:

- [ ] Stop before rollback unless rollback is clearly safe.
- [ ] Do not improvise new SQL.
- [ ] Do not rerun failed statements blindly.
- [ ] Record exact failure.
- [ ] Consult reviewed rollback plan.
- [ ] Roll back only under explicit human approval if needed.
- [ ] Prefer follow-up docs-only remediation for unclear failures.
- [ ] Escalate if schema state cannot be verified.

## 21. Duplicate protection and idempotency checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm future packet and verification cover:

- [ ] Uniqueness for `concept_brief_id` plus `artifact_kind` plus `version`.
- [ ] Active reviewed uniqueness if planned.
- [ ] Active draft uniqueness if planned.
- [ ] `idempotency_key` uniqueness if planned.
- [ ] Duplicate insert fails safely.
- [ ] No blind upsert.
- [ ] No duplicate active source-of-truth artifact.
- [ ] Verification query exists for each protection.

## 22. RLS and access-boundary checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm future access boundaries:

- [ ] Artifact tables are admin-only.
- [ ] No anonymous public select.
- [ ] No current-MVP customer select.
- [ ] No customer insert, update, or delete.
- [ ] Server/admin write only in a future controlled API.
- [ ] Protected admin read remains read-only until write path exists.
- [ ] RLS decision documented.
- [ ] RLS verification exists.
- [ ] No customer route exposure.

## 23. Private data exclusion checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm artifact schema contains no:

- [ ] Customer email.
- [ ] Phone.
- [ ] WhatsApp.
- [ ] Raw contact note.
- [ ] Internal admin note.
- [ ] Reviewer raw note.
- [ ] Raw storage path.
- [ ] Provider URL.
- [ ] Secret, environment, or provider metadata.
- [ ] Service role key.
- [ ] Database URL.

Contact data remains in the existing protected contact model, not artifacts.

## 24. 55B read-only display compatibility checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm:

- [ ] 55B currently shows safe empty states.
- [ ] Schema execution alone does not change 55B.
- [ ] No display read path starts automatically.
- [ ] No render-time artifact generation.
- [ ] No transform of live brief payload on render.
- [ ] No fake fixture production source.
- [ ] Future read-path Agent required before display consumes persisted artifacts.

## 25. Future admin write-path readiness checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Before any future admin write path:

- [ ] Schema execution is verified.
- [ ] RLS and access are verified.
- [ ] Private data exclusion is verified.
- [ ] Validation plan exists.
- [ ] Idempotency plan exists.
- [ ] Draft, save, review, and supersede states are planned.
- [ ] Audit and event expectations are planned.
- [ ] Safe errors are planned.
- [ ] Admin-only boundary is confirmed.

No write path is implemented by Agent 55F.

## 26. Future generation linkage checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Before future generation:

- [ ] Reviewed Hand Sketch Instruction exists.
- [ ] Artifact ID and version are available.
- [ ] No raw brief direct generation.
- [ ] No private contact fields.
- [ ] Internal generation only.
- [ ] Generation output remains draft.
- [ ] Generation success is not approval.
- [ ] Human review after generation is required.

## 27. Customer email delivery checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm:

- [ ] Raw Design Spec is not emailed.
- [ ] Raw Hand Sketch Instruction is not emailed.
- [ ] Internal prompt is not emailed.
- [ ] Admin or reviewer notes are not emailed.
- [ ] Customer-safe summary requires human review.
- [ ] Send remains human-controlled.
- [ ] Delivery log remains a separate future source of truth.
- [ ] `approved_for_customer` is not equivalent to sent.

## 28. Gallery approval separation checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm:

- [ ] Artifact schema does not authorize gallery use.
- [ ] Customer approval does not equal gallery approval.
- [ ] `approved_for_customer` is not `approved_for_gallery`.
- [ ] Gallery requires separate consent, curation, and privacy review.
- [ ] No artifact auto-promotes to gallery.
- [ ] Future gallery source of truth is separate.

## 29. CAD / quote / order / production separation checklist

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Confirm:

- [ ] Artifact persistence does not equal CAD approval.
- [ ] Artifact persistence does not equal quote approval.
- [ ] Artifact persistence does not equal order confirmation.
- [ ] Artifact persistence does not equal production approval.
- [ ] Schema execution does not authorize gemstone procurement.
- [ ] CAD, quotation, gem procurement, and production remain offline and separate.

## 30. Future implementation sequence

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Recommended cautious next Agents:

1. Agent 55G: user-run SQL packet execution decision or schema-only execution planning, only after explicit approval.
2. Agent 55H: post-execution verification docs, only if schema is executed.
3. Agent 55I: admin artifact write-path planning, docs-only.
4. Agent 55J: admin artifact create/save draft implementation, if approved.
5. Agent 55K: extend 55B read-only display to read persisted artifacts, if approved.
6. Later: reviewed Hand Sketch Instruction to internal generation.
7. Later: customer-safe email preview.
8. Later: human-controlled send.
9. Website quick preview remains a separate future product path.

Agent 55F merge does not start Agent 55G.

## 31. Hard stops

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Stop if:

- [ ] SQL execution is attempted.
- [ ] Migration file is created.
- [ ] Supabase live access is attempted.
- [ ] Supabase CLI is used.
- [ ] Schema mutation is attempted.
- [ ] Row mutation is attempted.
- [ ] App, API, or server action implementation is attempted.
- [ ] Admin UI implementation is attempted.
- [ ] Customer UI is touched.
- [ ] Artifact persistence is implemented.
- [ ] Provider integration is attempted.
- [ ] Image generation is attempted.
- [ ] Email implementation is attempted.
- [ ] Email is sent.
- [ ] Status mutation is implemented.
- [ ] Approval mutation is implemented.
- [ ] Fake fixtures are used as production source of truth.
- [ ] Helper output is treated as persisted production artifact.
- [ ] Raw customer brief is used directly for image generation.
- [ ] Private contact data enters Design Spec or Hand Sketch Instruction artifacts.
- [ ] Generation success is treated as approval.
- [ ] `approved_for_customer` is reused as `approved_for_gallery`.
- [ ] CAD, quote, order, or production approval is implied.
- [ ] Website quick preview implementation is attempted.
- [ ] Computer Use, plugin, MCP, or third-party integration is required.
- [ ] Production data mutation is proposed.
- [ ] Agent 55G is started.
- [ ] Any implementation agent is started.

## 32. Decision recommendation

FINAL REVIEW CHECKLIST ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

NOVORA should only consider artifact schema execution after the final checklist is complete, the SQL packet is frozen, the target project and environment are confirmed, read-only preflight is reviewed, and the user provides explicit human approval for a separately scoped execution step.

Recommended path:

Agent 55D candidate schema planning -> Agent 55E execution safety and migration staging planning -> Agent 55F final review and manual verification checklist -> separate user decision on whether to proceed to Agent 55G -> no schema execution without explicit approval.

**Final checklist before execution, not execution**

**Frozen packet plus explicit human approval before any SQL**

**Verification evidence before write-path planning**
