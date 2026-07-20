# NOVORA First Preview MVP-CORE-1 Phase-0 Context Retry/Continuation Packet v1

Status: **FROZEN FOR INDEPENDENT REVIEW - NOT APPROVED FOR EXECUTION**

This documentation-only packet is the minimum fail-closed continuation boundary
after the first `MVP-CORE-1` Phase 0 context gate stopped before SQL execution.
It authorizes nothing by itself. It contains no SQL and does not change,
reproduce, regenerate, substitute, broaden, or re-freeze any statement from the
merged `MVP-CORE-1` packet.

## 1. Verified STOPPED incident

The selected authoritative evidence set contains exactly one artifact:

- `novora-fp-mvp-core-1-00-context-error.png`
- byte size: `95950`
- SHA-256:
  `c8b9043605f71486bca81c9d6f7fae4942cf6d92463c94cc7d896cdddd87a952`

Independent visual inspection proves:

- visible project `novora-production`;
- visible `main` / Production environment;
- visible Primary Database selection;
- visible selected role `postgres`;
- a fresh blank SQL editor and unexecuted result pane;
- no visible stale SQL, prior result, warning, SQL error, customer content,
  secret, or environment-variable value; and
- visible row limit `100`, below the required minimum `1000`.

The row-limit mismatch is a mandatory Phase 0 ERROR. No SQL text or result is
visible, and the Owner attests that no SQL was executed. The exact recorded
state is:

- Phase 0: `ERROR`;
- `CORE1-01` through `CORE1-07`: `not_run`;
- SQL executions: `0`;
- Retry: `NOT_PERFORMED`;
- `MVP-CORE-1`: `STOPPED`.

The external sanitized incident manifest is:

- `novora-fp-mvp-core-1-08-manifest-v1.json`
- byte size: `7500`
- SHA-256:
  `52aef1416726db16e3dd0db02fbe74335e57c87ef5b1f867cfa85ea9bed24729`

The later corrected `1000 rows` recapture was made after the fail-closed STOP.
It is not authorized evidence. It was not selected, inspected, hashed, copied,
modified, or used in this reconciliation and must remain outside every
authoritative evidence set.

## 2. Immutable governing identities

- Merged main for the original packet:
  `63b548fd14d7fcc5b8bc1adbfb30c89c97c5a29d`.
- Original packet PR: `#227`.
- Original packet reviewed head:
  `4700558b1ebca9925265d2c230a8d6238124f140`.
- Original packet repository path:
  `docs/novora-first-preview-mvp-core-1-select-only-preflight-packet-v1.md`.
- Original packet Git blob:
  `eb3cac28bdf5b52b9a2ebcf5a0f6b2d440c66163`.
- Critical Path Cutline v3 Git blob:
  `a43313f1d936365fd97dc92ccd8803d18b711176`.
- Frozen schema source Git blob:
  `714a30d16760dc98602dcbd8dc92d8785895811c`.
- Frozen Recovery source Git blob:
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`.
- Completed Batch 02 manifest:
  `novora-fp-phase-a-resume-batch-02-b01-b17-20-manifest-v2.json`, `21342`
  bytes, SHA-256
  `08cce41ec14d7c91730ce2d3ad2a513c7a50079786327d525ee5cf750a69c7dc`.
- Accepted R02 catalog:
  `novora-fp-phase-a-resume-02-r02.csv`, `6020` bytes, SHA-256
  `01619c87bec0666a8965ffb6769e0683955178b039ada3611b5b3fe811ee15b6`.
- Accepted R04 baseline catalog:
  `novora-fp-phase-a-resume-03-r04.csv`, `3181` bytes, SHA-256
  `92142e7e71f210bed22cb31b852354f1d93d80d7ea36e36602f47941ee0b6c3f`.

The retry-packet PR number, exact reviewed head, packet Git blob, and post-merge
`origin/main` identity must be supplied only after exact-head independent
review and merge. A separate Owner approval must bind every final identity
before any new Phase 0 capture.

## 3. Only permitted future execution scope

After a separate exact approval, the Owner may:

1. Establish one new uninterrupted quiet window.
2. Open a new fresh blank SQL Editor context.
3. Capture exactly one new Phase 0 visual context artifact.
4. If and only if that new artifact passes every section 4 gate, continue in
   the same quiet window into the exact unchanged `CORE1-01` through
   `CORE1-07` sequence from the original packet.

The future target remains exactly:

- Supabase project `novora-production`;
- branch/environment `main` / Production;
- Primary Database (`postgres`);
- target schema `public`;
- selected current role `postgres`;
- required current role and session role `postgres`;
- required `server_is_in_recovery = false`;
- SQL Editor row limit at least `1000`.

The quiet window must have no First Preview writer, migration, schema
operation, application rollout, or other actor targeting `ai_sketch_jobs`,
`ai_sketch_outputs`, or `ai_sketch_reviews` from the fresh Phase 0 capture
through `CORE1-07` PASS or an earlier STOP.

## 4. Fresh Phase 0 retry gate

The fresh artifact filename must be exactly one of:

- PASS: `novora-fp-mvp-core-1-phase0-retry-00-context.png`
- ERROR: `novora-fp-mvp-core-1-phase0-retry-00-context-error.png`

PASS requires the screenshot to visibly prove:

- project `novora-production`;
- `main` / Production;
- Primary Database;
- selected role `postgres`;
- row limit at least `1000`;
- a fresh blank editor and unexecuted result pane;
- no stale SQL or result;
- no warning or error; and
- no customer content, secret, or environment-variable value.

The screenshot proves only those visible controls. It does not freshly prove
`current_schema = public`, `session_role = postgres`,
`server_is_in_recovery = false`, backend-session continuity, or quiet-window
truth. `CORE1-01` must prove the database/session/catalog facts; the quiet
window and no-visible-target-control-change statements remain bounded Owner
attestations.

Any mismatch is Phase 0 ERROR and an immediate STOP. Do not change the control,
capture a replacement, click Retry, or execute SQL under the stopped attempt.
A later corrected screenshot is not evidence for that attempt.

## 5. Unchanged frozen continuation identities

This packet incorporates the seven SQL statements only by exact reference to
the original packet Git blob
`eb3cac28bdf5b52b9a2ebcf5a0f6b2d440c66163`. The Owner must extract each exact
`sql` fence directly from that blob, verify the original canonical identity,
paste it into a blank editor, and execute it once with ordinary manual `Run`.
No SQL is reproduced in this packet.

| Order | Statement | Canonical bytes | Canonical SHA-256 | PASS filename | ERROR filename |
| ---: | --- | ---: | --- | --- | --- |
| 1 | `CORE1-01` | `1483` | `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8` | `novora-fp-mvp-core-1-01-context-relations.csv` | `novora-fp-mvp-core-1-01-context-relations-error.png` |
| 2 | `CORE1-02` | `6229` | `d0db253855127c0293448f8f94389f55ed50be5b090b071f688011617f44790e` | `novora-fp-mvp-core-1-02-core-columns.csv` | `novora-fp-mvp-core-1-02-core-columns-error.png` |
| 3 | `CORE1-03` | `4069` | `85bb4f80f4f001db8b124202a2fe4f501fab7108b37db1586109e66ff10b5909` | `novora-fp-mvp-core-1-03-job-core-preflight.csv` | `novora-fp-mvp-core-1-03-job-core-preflight-error.png` |
| 4 | `CORE1-04` | `2732` | `b68c2e3c3359ecc9697a70f27f1a3412fc66994616eaf3e9f016852387225a72` | `novora-fp-mvp-core-1-04-output-core-preflight.csv` | `novora-fp-mvp-core-1-04-output-core-preflight-error.png` |
| 5 | `CORE1-05` | `4096` | `af43abfd46d197741a3239abe53c4fd0cfbf514250f2c7a7d161cdcc0911d548` | `novora-fp-mvp-core-1-05-linkage-core-preflight.csv` | `novora-fp-mvp-core-1-05-linkage-core-preflight-error.png` |
| 6 | `CORE1-06` | `1800` | `2526d2aea62509ceb89ffc95dfd9b383aa302b4c91f9b58d5a0bf95454403d09` | `novora-fp-mvp-core-1-06-baseline-catalog.csv` | `novora-fp-mvp-core-1-06-baseline-catalog-error.png` |
| 7 | `CORE1-07` | `2886` | `1ea03ce488b655a709885fb9fbaf50f48ad6e700f3fad7aa0b290ab106b224ec` | `novora-fp-mvp-core-1-07-core-object-absence.csv` | `novora-fp-mvp-core-1-07-core-object-absence-error.png` |

Every exact expected result, header, row count, ordering, duplicate rule,
relation/object identity, PASS requirement, canonicalization rule, and privacy
boundary remains exactly as frozen in the original packet. No previous Phase 0
artifact is reused. No statement has previous execution evidence because all
seven remain `not_run`.

## 6. Ordered execution and evidence rules

- Execute no SQL before the fresh Phase 0 artifact passes.
- Continue only while every immediately preceding context, identity, result,
  evidence, completeness, ordering, duplicate, metadata, aggregate, and
  privacy gate passes exactly.
- Use a blank editor for each statement.
- Do not add comments, combine statements, add a transaction wrapper, change
  identifiers, substitute SQL, click Retry, or automatically retry.
- Select exactly one PASS or ERROR artifact for every attempted item.
- On Phase 0 ERROR, `CORE1-01` through `CORE1-07` remain `not_run`.
- On a statement ERROR, every later statement remains `not_run`.
- After `CORE1-07` PASS or any earlier STOP, run no more SQL.

A later read-only reconciliation must preserve the original STOP manifest and
create only the external sanitized retry supplement:

`novora-fp-mvp-core-1-phase0-retry-continuation-09-manifest-v1.json`

The supplement must record the fresh selected artifacts, byte sizes and
SHA-256 values, exact PASS/ERROR and `not_run` outcomes, counts and sanitized
metadata, bounded proof/attestation basis, last PASS and failed item, zero or
actual manual execution count, and every exclusion as not executed. It must
contain no customer data, row IDs, Brief references, prompts, notes, object
paths, URLs, images, secrets, tokens, keys, environment values, or Provider
data. A CSV does not prove submitted SQL bytes; actual SQL hash and equality
must remain null unless separate evidence proves the complete submitted bytes.

## 7. Universal immediate STOP conditions

STOP the whole sequence and execute no later statement on any:

- project, environment, database, schema, selected/current/session-role,
  recovery-state, row-limit, quiet-window, or visible-target-control mismatch;
- merged-main, PR-head, packet/source blob, heading, sequence, canonical-byte,
  canonical-hash, or filename mismatch;
- relation, OID, owner, persistence, column, ordinal, type, nullability,
  default, identity/generated marker, linkage, baseline object, proposed-object
  absence, validation, readiness, liveness, or expected-result mismatch;
- row-count, header, ordering, duplicate, aggregate, completeness, truncation,
  or privacy mismatch;
- warning, SQL error, client/API/transport/fetch error, export error, or
  incomplete evidence; or
- returned customer/business row or identity, customer content, secret, or
  environment value.

Do not Retry, rerun, repair, compensate, backfill, roll back, clean up,
substitute a query, or capture replacement evidence after STOP. A new attempt
would require another independently reviewed immutable packet and separate
exact approval.

## 8. Explicit exclusions

Neither this packet nor its preparation, review, or merge authorizes:

- a Supabase connection or SQL execution by Codex, MCP, CLI, script, or other
  automation;
- a new Phase 0 capture or Owner SQL execution before separate exact approval;
- reuse of the stopped Phase 0 ERROR artifact or the later unauthorized
  corrected recapture as fresh evidence;
- any change to the seven statements, hashes, expected results, evidence
  filenames, STOP rules, or exclusions;
- DDL, DML, data edit, DELETE, backfill, repair, compensation, constraint
  validation, rollback, or cleanup;
- `L01-CORE`, `MVP-CORE-2`, `MVP-CORE-3`, former Batch 03 material or approval,
  old L01, candidate SQL, or block 23.7;
- ACL, default-privilege, RLS, policy, trigger, function, routine, or Storage
  change;
- customer/business-row inspection beyond the exact frozen aggregates;
- Provider, generated asset, credential, environment, deployment, application,
  email, payment, or customer-visible action; or
- branch, worktree, evidence, artifact, or other deletion.

## 9. Gate result and next boundary

Packet preparation status is `FROZEN`; execution status remains
`MVP-CORE-1 = STOPPED`. Phase A Resume and historical Phase A remain `STOPPED`.

After exact-head independent review and docs-only merge, stop at:

`HUMAN GATE - MVP-CORE-1 PHASE-0 RETRY/CONTINUATION APPROVAL REQUIRED`

Only a separate approval bound to the final merged-main, PR head, packet blob,
original packet blob, STOP manifest, selected ERROR artifact, fresh context
filenames, unchanged seven-statement identities, universal STOP rules, and
exclusions may release one new Phase 0 capture and conditional continuation.
