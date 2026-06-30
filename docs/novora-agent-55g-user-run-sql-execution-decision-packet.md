# NOVORA Agent 55G User-Run SQL Execution Decision Packet

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

## 1. Purpose

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55G defines the docs-only decision packet for whether NOVORA should proceed toward a future user-run SQL execution step for the Design Spec / Hand Sketch Instruction artifact schema.

This is a decision packet only. Agent 55G does not execute SQL, create migrations, access Supabase, use Supabase CLI, change schema, change rows, implement app or API behavior, change admin UI, persist artifacts, generate artifacts, generate images, send email, expose customer previews, create gallery approval, or authorize execution by this PR alone.

## 2. Background

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55D created the candidate artifact schema / SQL planning packet. Agent 55E created the SQL execution safety and migration staging plan. Agent 55F created the final SQL packet review and manual verification checklist.

Agent 55G creates the user-facing decision packet for whether to move toward a separately approved user-run SQL execution step. It does not supersede Agent 55D, Agent 55E, or Agent 55F, and it does not execute SQL.

## 3. Core decision principle

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

**Decision packet before execution, not execution**

**No SQL execution without separate explicit approval**

**User-run only unless a future execution-support scope is separately approved**

Also governing this packet:

- **Final checklist before execution, not execution**
- **Frozen packet plus explicit human approval before any SQL**
- **No SQL execution without frozen packet, human approval, and verification plan**
- **Additive schema first, destructive changes blocked**
- **Schema before write path, planning before SQL execution**

Merging Agent 55G does not authorize SQL execution. Choosing a future path is not execution. Any execution must be separately approved by the human after reviewing the target project, target environment, frozen packet identity, stop conditions, and post-execution verification plan.

ChatGPT/Codex must not run SQL under Agent 55G. No write path or read path may start until schema execution and verification are complete under a separate approved scope.

## 4. Current MVP boundary

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55G must not:

- Run SQL.
- Create migrations.
- Alter Supabase schema.
- Connect to Supabase.
- Use Supabase CLI.
- Implement API routes or server actions.
- Implement an admin write path.
- Persist artifacts.
- Generate artifacts.
- Generate images.
- Send email.
- Expose artifacts to customers.
- Create a customer preview.
- Create gallery approval.
- Imply CAD, quote, order, or production approval.

CAD, quotation, gem procurement, and production remain offline and separate.

## 5. Relationship to Agent 55D

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55D planned the candidate schema and SQL packet. Agent 55G does not edit or execute the Agent 55D packet.

Agent 55G may reference Agent 55D only as the source candidate SQL planning packet. If the Agent 55D packet identity, labels, expected objects, or execution boundaries are unclear, the correct decision is to revise docs before execution.

## 6. Relationship to Agent 55E

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55E planned execution safety and migration staging. Agent 55G uses those safety gates to shape the human decision framework.

Agent 55G cannot bypass any Agent 55E gate. Any future execution must satisfy Agent 55E's freeze, approval, staging, stop, and verification requirements.

## 7. Relationship to Agent 55F

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55F created the final SQL packet review and manual verification checklist. Agent 55G converts the checklist into decision options.

Agent 55G cannot approve execution by itself. The Agent 55F checklist must be considered complete before choosing any execution path.

## 8. What Agent 55G decides

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55G decides only the decision framework:

- Whether the project appears ready to ask the human for a separate execution decision.
- What options the human has.
- What must be true before execution.
- What evidence must be gathered.
- What future Agent sequence should follow each decision.

Agent 55G does not choose execution by itself.

## 9. What Agent 55G does not decide

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55G does not decide:

- Final SQL approval.
- Execution timing.
- Target Supabase project.
- Target environment.
- Operator identity.
- Schema execution.
- Write-path start.
- Customer delivery start.
- Gallery use.
- CAD, quote, order, or production approval.

## 10. Decision option A - do not execute now

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Option A is the conservative default.

Use Option A when:

- Uncertainty remains.
- Business priority does not require schema now.
- SQL packet identity is not frozen.
- Supabase target is not confirmed.
- Human approval is not explicit.
- Verification plan is incomplete.
- The user wants to pause before live schema work.

Outcome:

- No SQL execution.
- No schema change.
- Continue with docs/planning or pause.
- No app/API work starts.

## 11. Decision option B - revise packet before execution

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Use Option B when:

- SQL packet labels are unclear.
- Candidate SQL needs adjustment.
- Expected objects are unclear.
- RLS decisions are incomplete.
- Stop or rollback plan is incomplete.
- Private data exclusion is uncertain.
- Checklist evidence is incomplete.

Outcome:

- Create a docs-only revision Agent.
- No SQL execution.
- No schema change.

## 12. Decision option C - prepare future user-run execution

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Use Option C when:

- Frozen packet identity is clear.
- Target project/environment is known but not yet approved for execution.
- The human wants to prepare for manual execution.
- Preflight queries/checklist must be assembled for a user-run workflow.

Outcome:

- Future docs-only execution preparation step.
- No SQL execution yet.
- No Supabase connection by ChatGPT/Codex.
- User may prepare trusted Supabase UI separately.

## 13. Decision option D - separately approved execution-support step

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Use Option D only if the human later gives explicit approval.

This option is not authorized by Agent 55G. It requires a separate execution-support scope and may still be user-run rather than Codex-run. That future scope must define whether ChatGPT only guides, whether the user runs manually, and what evidence is captured.

Execution support cannot proceed without target project, environment, frozen packet identity, explicit approval, and stop conditions.

Outcome:

- Separate future Agent or user action.
- No automatic app/write-path continuation.

## 14. Recommended default decision

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

**Default: Option A - do not execute SQL now**

This is recommended because:

- The current MVP can continue without artifact persistence execution.
- Schema execution is a live database boundary.
- The app write path is not ready to consume persisted artifacts yet.
- Agent 55B currently uses safe empty states.
- No customer-facing need requires immediate schema execution.
- Cautious sequencing protects production data.

The human may later choose Option C or Option D with explicit approval.

## 15. Required frozen packet identity

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Before execution, the future frozen packet identity must include:

- Source document.
- Packet version.
- Packet commit SHA.
- Exact SQL statement count.
- Expected created tables.
- Expected indexes.
- Expected constraints.
- Expected policies / RLS state.
- Expected no row mutations.
- Expected no existing table mutation.
- Expected no storage changes.

No secrets should be recorded.

## 16. Required human approval wording

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future-only preparation approval wording:

`I explicitly approve moving to the next user-run SQL execution preparation step for the frozen NOVORA artifact schema SQL packet identified by [packet/version/commit]. I understand this does not execute SQL yet and does not approve customer delivery, image generation, gallery use, CAD, quotation, order confirmation, gemstone procurement, or production.`

Future-only actual execution approval wording:

`I explicitly approve manual execution of the frozen NOVORA artifact schema SQL packet identified by [packet/version/commit] against Supabase project [project name] in environment [environment]. I understand this approval is only for the reviewed additive schema packet and does not approve customer delivery, image generation, gallery use, CAD, quotation, order confirmation, gemstone procurement, or production.`

Agent 55G does not request, grant, or activate either approval now.

## 17. Supabase project and environment confirmation

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Before any future execution decision, require:

- Project name confirmed in trusted Supabase UI.
- Project ID confirmed in trusted Supabase UI.
- Environment confirmed: production / preview / local.
- User confirms intended target.
- No secrets pasted into docs or chat.
- No service role key exposure.
- No database URL copied into docs.
- Execution account permissions understood.

## 18. Secrets and access boundary

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Before any future execution decision, require:

- No env values in docs.
- No service role key in docs/chat.
- No database password in docs/chat.
- No provider key in docs/chat.
- No storage signed URLs in docs.
- No customer private data exported into docs.
- Screenshots avoid secrets.
- Evidence redacts sensitive values.

## 19. User-run execution boundary

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

The default execution model should be user-run in trusted Supabase UI.

ChatGPT/Codex does not log in to Supabase under Agent 55G. ChatGPT/Codex does not run SQL under Agent 55G. ChatGPT/Codex may only provide docs/checklists unless a future scope is separately approved.

The user remains the execution decision maker.

## 20. Read-only preflight requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future-only read-only preflight before any execution must:

- Confirm current database selected.
- Confirm `concept_briefs` exists.
- Confirm no artifact table conflict.
- Confirm proposed names available.
- Confirm RLS posture understood.
- Confirm no production data mutation needed.
- Confirm no locks, maintenance, or outage conditions.
- Confirm execution packet matches frozen packet.

These read-only checks are future-only and are not executed by Agent 55G.

## 21. Execution-day stop conditions

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Stop on execution day if any of these occur:

- Wrong project.
- Wrong environment.
- Missing explicit approval.
- Packet not frozen.
- SQL differs from reviewed packet.
- Unexpected existing object.
- Permission uncertainty.
- RLS uncertainty.
- Statement failure.
- Verification mismatch.
- Accidental data mutation risk.
- Secret exposure risk.
- Customer-facing exposure risk.
- Operator unsure.

## 22. Post-execution verification requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future verification must confirm:

- Expected tables exist.
- Expected columns exist.
- Expected constraints exist.
- Expected indexes exist.
- FK exists.
- Uniqueness/idempotency constraints exist.
- RLS/access state matches plan.
- No rows inserted unintentionally.
- No existing rows changed.
- Agent 55B still shows safe empty state until a read-path Agent.
- Evidence captured.

## 23. Evidence capture requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future evidence must capture:

- Packet identity.
- Target project/environment.
- Operator role.
- Execution timestamp.
- Statement result summary.
- Verification result summary.
- Failed statement if any.
- Stop/rollback decision if any.
- No secrets included.
- No customer private data included.

## 24. Rollback and escalation requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

If a future execution fails or produces uncertainty:

- Stop before rollback unless rollback is clearly safe.
- Do not improvise SQL.
- Do not blindly rerun failed statements.
- Record the exact failure.
- Use rollback only under explicit human approval if needed.
- Route unclear failures to docs-only remediation.

## 25. No-destructive-change requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future packet must contain no:

- `DROP TABLE`.
- `DROP COLUMN`.
- `TRUNCATE`.
- `DELETE`.
- `UPDATE` production rows.
- Destructive `ALTER`.
- Existing customer submission mutation.
- Existing AI sketch review mutation.
- Existing admin note mutation.
- Existing notification event mutation.
- Storage bucket mutation.

Any destructive change requires separate risk review and is out of scope.

## 26. Duplicate protection and idempotency requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future packet and verification should require:

- `concept_brief_id` + `artifact_kind` + `version` uniqueness if planned.
- Active reviewed uniqueness if planned.
- Active draft uniqueness if planned.
- `idempotency_key` uniqueness if planned.
- Duplicate insert fails safely.
- No blind upsert.
- No duplicate active source-of-truth artifact.
- Verification query for each protection.

## 27. RLS and access-boundary requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future access boundaries must require:

- Artifact tables admin-only.
- No anonymous public select.
- No current-MVP customer select.
- No customer insert/update/delete.
- Server/admin write only in future controlled API.
- Protected admin read remains read-only until write path exists.
- No customer route exposure.

## 28. Private data exclusion requirement

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

No artifact schema should include:

- Customer email.
- Phone.
- WhatsApp.
- Raw contact note.
- Internal admin note.
- Reviewer raw note.
- Raw storage path.
- Provider URL.
- Secret/env/provider metadata.
- Service role key.
- Database URL.

Contact data remains in the existing protected contact model, not artifacts.

## 29. 55B read-only display compatibility

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Agent 55B currently shows safe empty states. Schema execution alone does not change Agent 55B.

No display read path starts automatically. There must be no render-time artifact generation, no transform of live brief payload on render, and no fake fixture production source. A future read-path Agent is required before display consumes persisted artifacts.

## 30. Customer email / gallery / CAD / quote / order / production separation

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Future artifact schema work must preserve these separations:

- Raw Design Spec is not emailed.
- Raw Hand Sketch Instruction is not emailed.
- Internal prompt is not emailed.
- Admin/reviewer notes are not emailed.
- Customer-safe summary requires human review.
- Send remains human-controlled.
- Artifact schema does not authorize gallery use.
- `approved_for_customer` is not `approved_for_gallery`.
- Gallery requires separate consent, curation, and privacy review.
- Artifact persistence does not equal CAD approval.
- Artifact persistence does not equal quote approval.
- Artifact persistence does not equal order confirmation.
- Artifact persistence does not equal production approval.
- Schema execution does not authorize gemstone procurement.

CAD, quotation, gem procurement, and production remain offline and separate.

## 31. Future Agent sequencing after decision

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Recommended sequence by option:

- Option A: pause or continue non-SQL planning.
- Option B: create docs-only revision Agent for SQL packet/checklist.
- Option C: create docs-only user-run execution preparation Agent.
- Option D: create separately approved execution-support Agent, only after explicit approval.

Possible future sequence:

1. Agent 55H: Docs-only user-run SQL execution preparation packet.
2. Separate explicit human approval.
3. User-run SQL in trusted Supabase UI, if approved.
4. Agent 55I: Post-execution verification docs, only if SQL is executed.
5. Agent 55J: Admin artifact write-path planning, docs-only.
6. Agent 55K: Admin artifact create/save draft implementation, if approved.
7. Agent 55L: Extend Agent 55B read-only display to read persisted artifacts, if approved.

Agent 55G merge does not start Agent 55H or execution.

## 32. Decision summary table

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

| Option | When to choose | What happens | SQL executed? | Supabase accessed? | Next step |
| --- | --- | --- | --- | --- | --- |
| A: Do not execute now | Uncertainty remains, no immediate business need, or human wants to pause | No schema change; continue docs/planning or pause | No | No | Pause or continue non-SQL planning |
| B: Revise packet | Packet labels, expected objects, RLS, rollback, private data exclusion, or evidence are incomplete | Docs-only revision Agent | No | No | Revise packet/checklist |
| C: Prepare user-run execution | Frozen identity is clear and human wants preparation without execution approval | Future docs-only preparation packet | No | No | Create user-run execution preparation Agent |
| D: Separate execution-support step | Human later gives explicit approval for a separately scoped execution-support path | Separate future Agent or user action | No | No | Define and approve execution-support scope |

## 33. Hard stops

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

Stop if:

- SQL execution is attempted.
- A migration file is created.
- Supabase live access is attempted.
- Supabase CLI is used.
- Schema mutation is attempted.
- Row mutation is attempted.
- App/API/server action implementation is attempted.
- Admin UI implementation is attempted.
- Customer UI is touched.
- Artifact persistence is implemented.
- Provider integration is attempted.
- Image generation is attempted.
- Email implementation is attempted.
- Email is sent.
- Status mutation is implemented.
- Approval mutation is implemented.
- Fake fixtures are used as production source of truth.
- Helper output is treated as persisted production artifact.
- Raw customer brief is used directly for image generation.
- Private contact data enters Design Spec or Hand Sketch Instruction artifacts.
- Generation success is treated as approval.
- `approved_for_customer` is reused as `approved_for_gallery`.
- CAD, quote, order, or production approval is implied.
- Website quick preview implementation is attempted.
- Computer Use, plugin, MCP, or third-party integration is required.
- Production data mutation is proposed.
- Live execution support is started.
- Any implementation agent is started.

## 34. Decision recommendation

DECISION PACKET ONLY - DO NOT RUN - NOT EXECUTED - REQUIRES SEPARATE EXPLICIT HUMAN APPROVAL

NOVORA should not execute artifact schema SQL as part of Agent 55G.

Recommended decision:

**Option A now, or Option C later only after the human explicitly chooses to prepare user-run execution.**

Reaffirmed boundaries:

**Decision packet before execution, not execution**

**No SQL execution without separate explicit approval**

**User-run only unless a future execution-support scope is separately approved**

**55G merge does not authorize SQL execution**
