# NOVORA First Preview Phase A Recovery Evidence Reconciliation v1

Date: 2026-07-16

Status: **RECOVERY COMPLETE; PHASE A STOPPED; HISTORICAL CAUSE NOT PROVEN**

## 1. Scope and boundary

This document reconciles the Owner-run, separately approved Phase A STOPPED
read-only recovery sequence. It records only sanitized catalog evidence. The
five raw artifacts remain external and were read and hashed in place; none was
renamed, normalized, modified, deleted, or copied into Git.

No SQL was executed by Codex. No B11 or `23.2-S01` retry, B12+, block 23.7,
repair, DDL, DML, rollback, cleanup, Storage, Provider, deployment,
application, customer-data, or customer-visible action occurred.

## 2. Immutable identities

- Approved recovery `origin/main`:
  `a7c466d40e6ba553f9686c814e43ec04aa76a1a7`
- Recovery packet PR #205 reviewed head:
  `a65e8cc0a9b64eadf4dd0e36eb7de48c02de29ba`
- Recovery packet Git blob:
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`
- Recovery packet raw SHA-256:
  `aab386a5f9636e08dc1f9437e0fdd345445f6c8a11416a45c7d62384008cbfa6`
- Recovery approval record PR #206 reviewed head:
  `fb620bc3ad51c03e91045ff5571052150392e425`
- Recovery approval record merge commit:
  `2673314e337328d2451a03bbe4be9c79b3e512b0`
- STOPPED incident Git blob:
  `f3695b2660f093e467e0b3d8f7811dbad9b22df1`
- STOPPED incident raw SHA-256:
  `7695f38d8c1a03ce0017d80662763c9026e0ecb6a9ec7d494faa39a5f4ef1e69`
- Original STOPPED manifest SHA-256:
  `3551b06cc2ccfa75802177c05603cf9b8a1028637ab816977ab3e7d4bdbffe97`
- Frozen Agent 70B-2 source Git blob:
  `714a30d16760dc98602dcbd8dc92d8785895811c`
- Frozen Agent 70B-2 source raw SHA-256:
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`
- Frozen `23.1-S01` canonical SHA-256:
  `082b6880f1249f5091e3db60ab3ae2e144afda14487ed18f7f9d9775917dff32`
- Frozen `23.2-S01` canonical SHA-256:
  `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4`

## 3. Selected artifacts and recomputed hashes

| Step | Selected external artifact | Bytes | SHA-256 | Rows | Duplicates | Outcome |
| --- | --- | ---: | --- | ---: | ---: | --- |
| Phase 0 | `novora-fp-phase-a-recovery-00-context.png` | 86,275 | `be76b9d9e33797ad0629110eb0133a370e33c72c9129d64867a8c4bc3f824851` | n/a | n/a | PASS |
| R01 | `novora-fp-phase-a-recovery-01-r01.csv` | 529 | `d00b5c59d1d297040c851d589e488d59e39cdc06089da3cd4e5df45595d6e442` | 3 | 0 | PASS |
| R02 | `novora-fp-phase-a-recovery-02-r02.csv` | 4,474 | `b2d5f18263df8847e1f983fc31874260bcb63fd4f9b820d64b53b6209f116534` | 52 | 0 | FINDING |
| R03 | `novora-fp-phase-a-recovery-03-r03.csv` | 1,610 | `86d169ddad4d2e97102b68cb32a4002f329dd69f88dd56f1d2d63668096ca750` | 17 | 0 | FINDING |
| R04 | `novora-fp-phase-a-recovery-04-r04.csv` | 3,181 | `92142e7e71f210bed22cb31b852354f1d93d80d7ea36e36602f47941ee0b6c3f` | 16 | 0 | PASS |

The external sanitized recovery manifest is
`novora-fp-phase-a-recovery-05-manifest-v1.json`, SHA-256
`43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`.
It contains exactly one selected artifact for Phase 0 and each attempted query,
the exact sanitized CSV values, actual artifact hashes and byte counts,
row/duplicate counts, result outcomes, immutable source identities, and all
required execution boundaries. Recovery status is `COMPLETE`; Phase A status
remains `STOPPED`.

The CSV exports do not contain the submitted SQL bytes. Their
`actual_canonical_sql_sha256` and hash-equality fields are therefore `null`,
not inferred. Their expected canonical hashes remain the frozen R01-R04 hashes
from the approved packet.

## 4. Exact evidence verification

### Phase 0

The screenshot visibly shows project `novora-production`, the Production/main
project context, Primary Database, role `postgres`, a `1,000`-row limit, a blank
editor, and no executed result. R01 independently establishes the SQL-level
database and schema values.

### R01 - PASS

The exact header is complete. All three rows report database `postgres`, schema
`public`, current and session role `postgres`, and
`server_is_in_recovery = false`. Exactly these public regular persistent
relations exist, with no same-name non-system-schema relation:

| Table | Relation OID | Owner |
| --- | ---: | --- |
| `ai_sketch_jobs` | 17602 | `postgres` |
| `ai_sketch_outputs` | 17619 | `postgres` |
| `ai_sketch_reviews` | 17641 | `postgres` |

### R02 - FINDING

The exact header and all 52 attribute rows are complete. There are no duplicate
table/relation/ordinal identities.

- `public.ai_sketch_jobs` has 44 live, non-dropped attributes on relation OID
  17602. Its original 9 attributes and all 35 frozen `23.1-S01` additions are
  present in exact statement order.
- `public.ai_sketch_outputs` has only its original 8 live, non-dropped
  attributes on relation OID 17619.
- None of the 17 frozen `23.2-S01` attributes is present.
- Neither table has a dropped positive-attribute slot.

This is a current-state diagnostic finding. It is not repair authorization.

### R03 - FINDING

All 17 frozen `23.2-S01` expected ordinals are present exactly once and have
the frozen names, types, nullability, and default expectation. Every observed
schema, table, relation OID, type, nullability, and default field is null.
No candidate column was found on any non-system-schema
`ai_sketch_outputs` relation.

The final expression is `false` for `is_current_customer_preview` because the
expected default is `false` while no observed column/default exists; the other
missing rows produce SQL null. This is consistent with the frozen R03 query and
does not represent a partial match.

### R04 - PASS

All 16 unfiltered constraint/index rows are complete. Relation OIDs match R01,
and no duplicate table/type/object-OID/object-name identity exists.

| Table | Validated constraints | Valid/ready/live indexes |
| --- | ---: | ---: |
| `ai_sketch_jobs` | 2 | 2 |
| `ai_sketch_outputs` | 3 | 2 |
| `ai_sketch_reviews` | 5 | 2 |

Every constraint is validated. Every index is valid, ready, and live. The six
index names and definitions match the frozen pre-candidate index inventory.
The exact constraint and index definitions are retained only in the sanitized
external manifest and evidence; raw evidence is not in Git.

## 5. Reconciliation with the STOPPED incident

Verified facts:

1. Step 20 showed the exact frozen `23.1-S01` statement and editor-reported
   success. Recovery evidence now proves all 35 additions are in the current
   live catalog.
2. Step 21 showed the exact frozen `23.2-S01` statement and editor-reported
   success.
3. Step 25 B11 returned SQLSTATE `42703` because
   `is_current_customer_preview` did not exist.
4. Recovery evidence now proves all 17 `23.2-S01` attributes are absent from
   every non-system-schema same-name output relation.
5. No dropped attribute slots are present on the current jobs or outputs
   relations.
6. The current SQL context and public relation identities are coherent, and
   current constraints/indexes are healthy.

The current catalog therefore contains the complete `23.1-S01` additions and
none of the `23.2-S01` additions.

## 6. Facts versus hypotheses

| Candidate explanation | Disposition after recovery | Evidence limit |
| --- | --- | --- |
| `23.2-S01` did not persist | Consistent with current state; historical claim not proven | All 17 columns are absent, but no immediate post-step-21 catalog assertion exists. |
| Different historical database/schema/session context | Reduced, not eliminated | Current R01 is exact and the earlier UI contexts matched, but current metadata cannot prove every historical execution-context property. Both frozen statements schema-qualify `public`. |
| Incomplete or misleading editor success evidence | Still possible, not proven | The screenshot reports success and visibly matches the frozen statement, but editor success is not durable catalog evidence. |
| Live schema drift after step 21 | Still possible, not proven | No dropped slots support a simple drop-on-the-current-relation narrative, but historical relation identity, recreation, and intervening DDL are not established. |
| Packet ordering or statement-identity inconsistency | No inconsistency found | Artifact order, visible statement text, and frozen hashes agree. CSV exports cannot prove submitted query bytes. |
| Another cause | Not excluded | No database audit/history evidence was approved or supplied. |

Historical cause remains **NOT PROVEN**. Do not state that step 21 definitely
failed, ran elsewhere, was rolled back, was later dropped, or was falsely
reported successful.

## 7. Repair-or-resume decision

Direct Phase A resumption at B11 is unsafe because every B11-dependent output
column is absent. Reapplying `23.1-S01` is also unsafe and unnecessary because
all 35 job additions already exist.

The minimum verified repair prerequisite is exactly one schema mutation: the
frozen, atomic `23.2-S01` `ALTER TABLE public.ai_sketch_outputs` statement that
adds its 17 columns. No constraint, index, ACL, default privilege, RLS, policy,
Storage, or data repair is currently supported by the evidence.

That statement must not be executed from this reconciliation. It requires a
new exact approval covering a fresh fail-closed context/catalog/empty-table/
lock preflight, the single frozen mutation, and immediate post-mutation catalog
assertions. The immutable decision packet is
`docs/novora-first-preview-phase-a-repair-decision-packet-v1.md`.

Successful repair evidence would not itself authorize B11, B12+, blocks
23.3-23.6, V01-V05, block 23.7, application work, or any other resume action.
A separately reviewed resume packet and separate approval would still be
required.

## 8. Current gate

Recovery is COMPLETE. Phase A remains STOPPED. Historical cause is not proven.
No repair or resume SQL is authorized until the immutable repair decision
packet is independently reviewed, merged, and separately approved by its exact
merged identities and statement hashes.
