# NOVORA First Preview Schema Phase A STOPPED Incident Reconciliation v1

Date: 2026-07-16

Status: **PHASE A STOPPED - CAUSE NOT DETERMINED**

## 1. Executive result

Phase A stopped correctly at step 25 (`B11`). Step 24 (`B10`) is the exact last
successful step. Steps 26-53 were not run. Block 23.7, rollback, cleanup,
retry, repair, replacement SQL, backfill, and manual column addition were not
executed.

The external evidence set contained exactly 26 raw artifacts before manifest
creation: Phase 0 and one selected artifact for every attempted SQL step 1-25.
The sanitized external manifest is
`novora-fp-phase-a-54-manifest-v1.json`, SHA-256
`3551b06cc2ccfa75802177c05603cf9b8a1028637ab816977ab3e7d4bdbffe97`.
It is reconciliation revision 2 and records that it supersedes preliminary
manifest SHA-256
`977c1d68b6bc15340db5f429edc673ec5d124a8fd296fda972edd157c5674371`.
No raw evidence is copied into Git.

The contradiction is verified but its cause is not determined:

- Step 21 visibly shows the exact frozen `23.2-S01` statement, including
  `is_current_customer_preview`, and the SQL Editor reports success.
- Step 25 visibly shows the exact frozen `B11` statement and SQLSTATE `42703`,
  stating that `is_current_customer_preview` does not exist.
- The visible project, database, role, and row-limit controls match across the
  Phase 0, step 20, step 21, and step 25 screenshots.
- Steps 22-24 query job-side fields added by `23.1-S01`; they do not establish
  whether any `23.2-S01` output column persisted.

No repair or retry is justified by the available evidence.

## 2. Frozen identities

- Approved Phase A `origin/main`: `24c37f54173cf6e9cd82de7bf30b058d166adea4`
- PR #203 reviewed head: `afc27974bed4f814da0a7888705315dfe228efab`
- Owner Execution Packet v1 Git blob:
  `d347663d740cc766eb07c9c93b9130d16fc9f51f`
- Owner Execution Packet v1 raw SHA-256:
  `4d36aaba11391eb1aa37a259027d8f50cc63723807755f3c0e1d3d2e832e3b04`
- Frozen Agent 70B-2 source Git blob:
  `714a30d16760dc98602dcbd8dc92d8785895811c`
- Frozen Agent 70B-2 source raw SHA-256:
  `4763a425a9e22098a3dd43d3773c8352d83fd201b72d48dd116d7f9619cceecc`
- Owner runbook Git blob: `1d7ee46755254e6c01ac125793ecbd9bf3451204`
- Owner runbook raw SHA-256:
  `935ec7f70f922431fc3bccafc8214df47c63d290d18c9117de5c93a888545764`

All repository identities were reverified against latest `main` before this
reconciliation.

## 3. Evidence verification method and limitation

Every supplied file was read without rename, normalization, deletion, or raw
copy into the repository. SHA-256 was computed from the original file bytes.
CSV row counts and exact duplicate-row counts were computed after RFC 4180-style
parsing. Catalog and aggregate values were checked against the frozen expected
results. Each screenshot was reviewed at original resolution.

PNG artifacts for B01, B02, B04, B05, B17, `23.1-S01`, `23.2-S01`, and B11
show the complete SQL text. Their actual canonical hashes can therefore be
recomputed from the visible statement and match the frozen expected hashes.

CSV exports do not embed the executed SQL bytes. For those artifacts, filename,
sequence, headers, result shape, values, and expected outcome all match the
frozen step, but the exact actual canonical SQL hash is not independently
derivable. The manifest records `null` rather than guessing an actual hash.
This limitation is material and is not treated as a hash match.

The corrected manifest embeds every exact sanitized CSV result value. DDL row
and duplicate counts are `null`/n/a. Each zero-result SELECT screenshot records
row count `0`, duplicate-row count `0`, and an empty exact-result array. Step 21
keeps the observed editor outcome `PASS` only within scope
`sql_editor_report_only`; its step acceptance is `UNRESOLVED` and its catalog
persistence status is `UNRESOLVED_AND_CONTRADICTED_BY_B11`.

## 4. Complete attempted-artifact inventory

`Rows` is the exported result-row count. `Dupes` is the exact duplicate exported
row count where applicable. The hash pair is `expected SQL / actual SQL`; CSV
means the latter is not independently derivable.

| Step | ID | Selected artifact | File SHA-256 | Rows | Dupes | Expected / actual canonical SQL SHA-256 | Outcome |
|---:|---|---|---|---:|---:|---|---|
| 00 | Phase 0 | `novora-fp-phase-a-00-context.png` | `30a0a0d5102d7961e31bf0740c23f957e1197c6892f4cd756aca019a4ddde44c` | n/a | n/a | n/a | PASS |
| 01 | C01 | `novora-fp-phase-a-01-c01.csv` | `4a51933fa6859107a9c65b13953981a5e9ca50e411b6329e4b572ab70826817d` | 17 | 0 | `942029fb8aee8d593150e03b98333a62aaccb8511d1d6c8d44defbb8b812d9bf` / CSV | PASS |
| 02 | C02 | `novora-fp-phase-a-02-c02.csv` | `0cf5b8160b98588bc2be1f67a0270a3c10c61dc3a07c02e335cbe33fe2c40cb5` | 6 | 0 | `62ab1fa06db9ff9e9a727d110de9b3b78e30b158aadd1987f6e20dcc2e2f3ad2` / CSV | PASS |
| 03 | C03 | `novora-fp-phase-a-03-c03.csv` | `a5cb4bde4e073bad6f2bf6d55d9ebb560ed506a8ed1eb86dba40ac3e02b9186d` | 3 | 0 | `b962dd936744916de446cbf28a1583769c863d309c2fed35098021f5f639ca9b` / CSV | PASS |
| 04 | M01 | `novora-fp-phase-a-04-m01.csv` | `7fa29da59e354086f823335a2bdca24dff654700638867f5f3e19c8ba7f311eb` | 6 | 0 | `03ad56a7e1c7f965f7972f84595df18da8fb0a58fa5988906a2f842894d814d5` / CSV | PASS |
| 05 | M02 | `novora-fp-phase-a-05-m02.csv` | `2bb7414ac2388bbf56c16ad329a3bdc094400b608d61609d937f8efb2dca2b40` | 4 | 0 | `70eebd62612586e6e76338a1e9c75268d01021f6e8e2ba20e37a44d15aa9a010` / CSV | PASS |
| 06 | M03 | `novora-fp-phase-a-06-m03.csv` | `9c128badda0467a599866f0c6f0d1e4ecacf2933b4b7233d0a4729dc8579e72a` | 12 | 0 | `fdc2eecd481f69deb262eb35390495ed90a383a7d208131909b2c9566b8dd74c` / CSV | PASS |
| 07 | M04 | `novora-fp-phase-a-07-m04.csv` | `68bbca02efc314e3c76a7e94bb45201e5c03ab9cdf250a93dce1fd0dd0fec4ff` | 18 | 0 | `88079b80be9b150a3313d152aaf4da5dc328c0448bfc3d2322757aeac7348191` / CSV | PASS |
| 08 | M05 | `novora-fp-phase-a-08-m05.csv` | `9f25d826a1e318a6e4a43e0472291c7036f8ed03600a5cdbc275631d4ee2b99d` | 18 | 0 | `6716fd72b1392be20d03404839c9becf656dc438a60822e4dbcb5bd0e4761109` / CSV | PASS |
| 09 | M06 | `novora-fp-phase-a-09-m06.csv` | `22950f5f1f71c833594d66142a88d58481035d312681f551cda2c55ee6bb6b5d` | 18 | 0 | `a7282515ace0354f60a24ae403603c6333312e48f929a8695caab7c255ba73c7` / CSV | PASS |
| 10 | B01 | `novora-fp-phase-a-10-b01-zero.png` | `73f323fe262e71f20aede91f741ef1c132f1a7ba1a9e4abd8b502261656811f1` | 0 | 0 | `9cf2f8365954544726d01f562d06115ec373768fa30d598d384954f2465eed4f` / same | PASS |
| 11 | B02 | `novora-fp-phase-a-11-b02-zero.png` | `1734bef1a46d03cf229aabac4ffb0183fd54535a25104c04d4f5cc5ab40543ac` | 0 | 0 | `4ac61e3c8d2c1b6a75fbbaf1ddfe5241778f654134705dcc1c332be66dfd75d6` / same | PASS |
| 12 | B03 | `novora-fp-phase-a-12-b03.csv` | `8f6842912f6af481e0279c35b0e3f72fb7ec9daed092bd6c7130512b50f4991d` | 1 | 0 | `33218418b894c3479d3d3e20f0a7caa610a3863cecfb2b02770d4ad6bb1446f5` / CSV | PASS |
| 13 | B04 | `novora-fp-phase-a-13-b04-zero.png` | `c55b0c66dcb04771fbe80d990115dedb7cbaf64a2297c0e4a21cd7ccdbef3a38` | 0 | 0 | `a1a8a358f6d2779947a5e13ce15c85181b88e0840825dce356698d9bb7b73e1c` / same | PASS |
| 14 | B05 | `novora-fp-phase-a-14-b05-zero.png` | `63931d099b42e39b1edfe5440ac50587326ce92539ff27cdf833848325e7fac9` | 0 | 0 | `2a456c2671be654cc4aee18bd03d8e0102e1d94ec0d5c8bd9348fd40f6a1feb3` / same | PASS |
| 15 | B06 | `novora-fp-phase-a-15-b06.csv` | `cd30551086f7b2568b077d292fea061e9c487e34a8f2d5988a100b7cde8b9204` | 1 | 0 | `56277764a42962df29d8dc151cf34da723d9454c6833490ef271cb8625841c88` / CSV | PASS |
| 16 | B07 | `novora-fp-phase-a-16-b07.csv` | `07cc4236bb6989f62773fa94fb6b80e04652c650ef2803c238365761c89e3a57` | 1 | 0 | `0359f22286e7a294d6ac01d47bf140bf1da3297765c44c943fc37274f9f66ea7` / CSV | PASS |
| 17 | B15 | `novora-fp-phase-a-17-b15.csv` | `17b9703126a3033c7036fa0ed6c8abdfce04de5e7bfa34eb9cda3ddaf63e0b79` | 1 | 0 | `9c3e4473238a83b0ca10bceb699029eb89a52d7ef43df34ea6838343d3e44701` / CSV | PASS |
| 18 | B17 | `novora-fp-phase-a-18-b17-zero.png` | `403d5a0f8a56de1b986f5597c069564af79b0fb95b019075dd733ddd29e48b79` | 0 | 0 | `60227942aa9689ff9b8e5c90a6dcfc896d755419846eefbd31b47be92b7c3ce6` / same | PASS |
| 19 | C04 | `novora-fp-phase-a-19-c04.csv` | `7d68271a91d9a29b732837285ab4a1853c79f6e6f9f8383f85bf7a5ac24a9284` | 3 | 0 | `70b50a50beb0cd3a3fc1c17b4facc1658a1e3d7f211accdca12d722fa5eae3ce` / CSV | PASS |
| 20 | 23.1-S01 | `novora-fp-phase-a-20-23.1-s01.png` | `ac37f21799ddfd720a79169d023106fd53cbf43d3cdbdb5a425b9b58ac9729ff` | n/a | n/a | `082b6880f1249f5091e3db60ab3ae2e144afda14487ed18f7f9d9775917dff32` / same | PASS (editor report only) |
| 21 | 23.2-S01 | `novora-fp-phase-a-21-23.2-s01.png` | `da14cf8db08e9270d7f3467041718407515ce43a738c0c452a9030167bf6bb21` | n/a | n/a | `4db11692e2e0147e23772f6649d6250786bf23fcaa2542d48d1d001f3e6561b4` / same | PASS (editor report only); acceptance UNRESOLVED |
| 22 | B08 | `novora-fp-phase-a-22-b08.csv` | `4e0e7e23c43c6fc452d7e494c5b28590e1dfb6d9f79ecb4fc67fcf8f65b0e18b` | 1 | 0 | `2e067968c77a8f83133b2c0937f7fcef2e4cf7bc6926e6320fe2a07e5e691fc9` / CSV | PASS |
| 23 | B09 | `novora-fp-phase-a-23-b09.csv` | `3831fa220a4917f1019374ca169fc6487859709b2cf55c02d344418bb6419a27` | 1 | 0 | `43298fdb1c47ef119ecc4477cf32745e3cd1743782c31ad854ae9be422780f88` / CSV | PASS |
| 24 | B10 | `novora-fp-phase-a-24-b10.csv` | `0666ca31cd99e422b31ba825d8c28e0707b948c7f90ef2e4adf5b4fff0c6479d` | 1 | 0 | `0e85c8b6d1344417ebea34a03b63dc5b7f3e0fa5fd594c6ada0f662a11468d4c` / CSV | PASS |
| 25 | B11 | `novora-fp-phase-a-25-b11-error.png` | `2297dda0ab318d07015282ebf56af4773acc7b5bbbad0f917d836333ff7996a3` | n/a | n/a | `a5373006e603f366bb630456421f5dd8b79e163430f92a2a2d7f03a0833cad56` / same | ERROR |

## 5. Result reconciliation through STOP

- C01: 17 baseline column rows, nine jobs and eight outputs; no candidate
  column was present before candidate execution.
- C02: six baseline indexes; every index was valid, ready, and live; no
  candidate index name was present.
- C03: all three affected tables had exact row count zero and nonzero relation
  size.
- M01 and M04-M06: ownership, effective privileges, structural privilege
  absence, schema usage, RLS, FORCE RLS, bypass, and policy counts match the
  frozen expected results.
- M02/M03: exact returned role-attribute and membership values are preserved in
  the sanitized manifest. The currently supplied set does not contain the prior
  exact baseline values required to reproduce a full independent no-drift
  comparison, so that narrower conclusion remains qualified.
- B01/B02/B04/B05/B17: complete screenshots show the frozen queries and zero
  rows.
- B03/B06/B07/B15: every returned aggregate is zero.
- C04: all three target tables show zero total and zero waiting locks.
- `23.1-S01`: full frozen statement visible; editor-reported success.
- `23.2-S01`: full frozen statement visible; editor-reported success, but later
  catalog durability is not established.
- B08/B09/B10: one aggregate row each; every count is zero. These are job-side
  results only.
- B11: full frozen statement visible; SQLSTATE `42703`; missing
  `is_current_customer_preview`; mandatory STOP applied.

## 6. Contradiction analysis

| Candidate explanation | Current disposition | Evidence and limit |
|---|---|---|
| `23.2-S01` did not persist | Possible, not verified | B11 is consistent with absence, but the success screenshot does not prove durability and no immediate post-DDL catalog evidence exists. |
| Different database, schema, or session context | Reduced but not excluded | The screenshots visibly agree on project, Primary Database, role, and row limit, and both statements fully qualify `public`; SQL-level database/session identity and same-name relation inventory were not captured. |
| Incomplete or misleading success evidence | Possible, not verified | The screenshot shows the entire frozen statement and editor success, but a UI result alone is not an independent live-catalog assertion. |
| Live schema drift after step 21 | Possible, not verified | No approved catalog snapshot was taken immediately after 23.2 or at STOP. PostgreSQL dropped-attribute metadata may provide a clue but cannot always identify a historical column by name. |
| Packet order or statement identity inconsistency | No inconsistency found in available evidence | Artifact numbering and timestamps are sequential; full PNG statement texts match frozen hashes. CSV actual query bytes remain unprovable because CSV exports omit SQL text. |
| Another cause | Not excluded | The supplied artifacts are insufficient to establish a complete historical cause. |

The verified conclusion is therefore **cause not determined**. The evidence
supports neither repair nor retry.

Both `23.2-S01` and B11 schema-qualify `public.ai_sketch_outputs`, so search-path
differences cannot explain the contradiction. PostgreSQL treats the multi-action
`23.2-S01` `ALTER TABLE` as one atomic statement. A current partial 17-column
candidate set would therefore indicate later/intervening drift or an evidence/
context mismatch, not normal partial success of that statement.

## 7. Minimum recovery evidence

The separately frozen
`docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md` contains
four exact SELECT-only metadata statements:

1. R01 establishes SQL-level database/schema/role/session context and inventories
   same-name target relations across non-system schemas.
2. R02 inventories the complete `pg_attribute` state of the two approved
   public tables, including dropped attribute slots.
3. R03 maps all 17 frozen 23.2 candidate columns across non-system schemas and
   compares exact public definitions.
4. R04 captures the unfiltered current constraint/index catalog for all three
   AI tables so missing, additional, changed, invalid, unready, or non-live
   objects are not hidden by expected-name filtering.

These statements can establish current state but cannot alone prove historical
cause. They have not been executed and require separate exact approval.

## 8. Durable learning

For future manually executed schema packets, an editor-reported DDL success is
not durable schema evidence. Every candidate DDL statement must be followed
immediately by a separately approved metadata assertion that proves the exact
target identity and every expected catalog change before any dependent query
runs. This incident records that rule in the project ledger.

## 9. Current gate

Phase A remains STOPPED. Do not reuse the prior Phase A approval. Do not execute
B11, `23.2-S01`, B12+, block 23.7, repair, retry, rollback, cleanup, backfill,
manual `ADD COLUMN`, or any other SQL. The next possible SQL is only the exact
SELECT-only recovery packet after independent review and a new exact human
approval.
