# NOVORA First Preview Phase A R02 Continuation Packet v1

Date: 2026-07-17

Status: **FROZEN FOR SEPARATE OWNER APPROVAL - NOT EXECUTED**

## 1. Decision and exact scope

The separately approved R01 transport retry produced complete PASS evidence.
That evidence permits preparation of this decision packet; it does not itself
authorize R02 or any later statement.

If separately approved with every immutable identity in this packet, the only
SQL this packet may release is one manual execution of the exact frozen
SELECT-only Resume Step 02, R02. A fresh visual context gate and fresh quiet
window are mandatory before R02. Whether R02 passes or fails, all SQL stops for
independent evidence reconciliation. R03 and every later Resume statement
remain prohibited.

Merging this packet does not authorize execution.

## 2. Verified evidence and immutable identities

- Retry approval point `origin/main`:
  `390ac596258bba8e8cbe8ab2d4e2ec816c682e72`
- Retry packet PR #211 reviewed head:
  `46338826a7f444503371240a8c157caff3bc9b1f`
- R01 Transport Retry Packet Git blob:
  `8cd978d6e58191dc34a3de6181e2a1fabd680c03`
- Retry approval-record PR #212 reviewed head:
  `469b9143648208ac32b86d7a002a295edd8d21ae`
- Retry approval-record merge commit and this packet's preparation base:
  `7fb4dfa543c530a37c3b91d76c6a732160e95674`
- Frozen Resume Packet Git blob:
  `98e6b4a70fba66e317b57fd6f6bfc1bb3274bc85`
- Frozen R01/R02 source Git blob:
  `e853e2992f4d556a1d41b089006bdd288aa2d7bc`
- Prior STOPPED Resume manifest SHA-256:
  `32bca453a5ee079b1d25e2bad4859bc4f2dcb7c35a4b3bc42b2bc257ee7961ee`
- Completed R01 retry supplement filename:
  `novora-fp-phase-a-resume-r01-retry-02-manifest-v1.json`
- Completed R01 retry supplement SHA-256:
  `ee8612c0ac60e96b190b994dcaab8df3a0c55bf44ecc9eeed308e4dd66555646`
- Fresh R01 retry Phase 0 artifact SHA-256:
  `4d6eca956ec2a838ee2f8eec3faa60afba2da81542a156d0fba200e74e9aef15`
- Fresh R01 PASS CSV SHA-256:
  `d00b5c59d1d297040c851d589e488d59e39cdc06089da3cd4e5df45595d6e442`
- R01 canonical SHA-256:
  `ebae5e128fdb57e3e6426ddd9a7dd6419d47a907c2d1a4c2229199e2d27db6f8`
- Completed recovery manifest SHA-256 used as the exact Job-column baseline:
  `43916fa5dad233c15aad2865c602ccbe75fbe28380440bfd51077ac29f1cba5d`
- Completed repair manifest SHA-256 used as the exact Output-column baseline:
  `cbffdbb90ada2f897fa7fe558add2e8a8f5a65bbf03e9ae780f7406832cf5575`

The R01 retry supplement records fresh Phase 0 PASS and R01 PASS while
preserving Phase A Resume and Phase A as STOPPED. It records steps 02-68 as
`not_run`. Its actual submitted-SQL hash and equality remain null because the
CSV cannot prove the submitted SQL bytes.

The R01 PASS CSV contains the exact approved database/schema/role context and
exactly the three approved public AI relations with OIDs jobs `17602`, outputs
`17619`, and reviews `17641`. The fresh CSV is byte-identical to the earlier
recovery R01 CSV. This is compatible with an unchanged sanitized result; byte
identity alone neither proves nor disproves fresh execution. Freshness is
supported by the new Phase 0 artifact, exact fresh filename, and Owner
attestation.

Before any later approval, the final copy-ready approval must additionally bind
the post-merge `origin/main` commit and the exact reviewed PR head containing
this frozen packet. Any head change after review requires a new review.

## 3. Exact target and fresh quiet window

If separately approved, the Owner may manually perform this packet only against:

- Supabase project: `novora-production`
- Branch/environment context: `main` / Production
- Database: Primary Database (`postgres`)
- Schema: `public`
- Current role and session role: `postgres`
- SQL Editor row limit: at least `1000`

Before the visual context gate, confirm a fresh quiet window with no First
Preview writer, migration, schema operation, application rollout, or other
actor targeting `ai_sketch_jobs`, `ai_sketch_outputs`, or
`ai_sketch_reviews`. The quiet window must remain active through R02 evidence
capture. STOP before the context gate if the quiet window cannot be confirmed.

### Context-proof boundary

The fresh visual gate independently re-proves only the visible project,
`main` / Production environment, Primary Database selection, selected current
role `postgres`, row limit, and blank editor. The quiet-window status is
Owner-attested and is not independently proved by the visual artifact or by a
database query. The exact R02 predicate and result constrain the catalog target
to schema `public`.

The successful fresh R01 CSV and corrected retry supplement are the last SQL
evidence for `current_schema = public`, `session_role = postgres`, and
`server_is_in_recovery = false`. Neither the new visual gate nor R02
independently re-proves those three live values. The Owner must attest that no
visible project, environment, database, role, or target control changed after
the accepted R01 evidence and before R02. This attestation does not prove reuse
of one database backend session; the SQL Editor may use another backend.

Any future exact approval must explicitly accept this bounded reliance for the
single SELECT-only catalog query. If the Owner does not accept it, or requires
fresh SQL proof of session role or recovery state, STOP: this R02-only packet
cannot provide that proof, and a separately reviewed and approved context
preflight packet is required. Do not add an ad hoc context query.

## 4. Canonical SQL and frozen-source rule

R02 is incorporated only from Git blob
`e853e2992f4d556a1d41b089006bdd288aa2d7bc`, repository path
`docs/novora-first-preview-phase-a-read-only-recovery-packet-v1.md`, section
`8`, exact full Markdown heading
`## 8. R02 - complete public target attribute catalog, including dropped slots`.
The only executable SQL is the complete fenced `sql` block under that exact
section and heading.

Canonicalize the complete statement by normalizing CRLF/CR to LF; trimming
leading and trailing statement whitespace; requiring and removing exactly one
terminal semicolon; trimming the remaining body; then appending exactly one
semicolon and one LF. Hash those UTF-8 bytes without a BOM.

Required R02 canonical SHA-256:

`9d71ada08b5eb39137545921f3b7034c3ebe3bc37475e53809ab73c3983a158f`

The independently recomputed canonical byte length is `1399`.

Do not add comments, combine statements, add a transaction wrapper, edit
identifiers, substitute SQL, or execute if the complete source blob, heading,
SQL block, byte length, or canonical hash does not match.

For Owner convenience, the exact incorporated R02 SQL is reproduced below. The
Git blob and heading above remain authoritative.

```sql
WITH target_relations AS (
  SELECT
    relation.oid AS relation_oid,
    namespace.nspname AS schema_name,
    relation.relname AS table_name
  FROM pg_catalog.pg_class relation
  JOIN pg_catalog.pg_namespace namespace
    ON namespace.oid = relation.relnamespace
  WHERE namespace.nspname = 'public'
    AND relation.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs')
    AND relation.relkind IN ('r', 'p')
)
SELECT
  targets.schema_name,
  targets.table_name,
  targets.relation_oid::text AS relation_oid,
  attribute.attnum AS ordinal_position,
  attribute.attname AS column_name,
  attribute.attisdropped AS is_dropped,
  pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
    AS formatted_type,
  attribute.attnotnull AS is_not_null,
  attribute.atthasdef AS has_default,
  attribute.attidentity AS identity_kind,
  attribute.attgenerated AS generated_kind,
  CASE
    WHEN attribute_default.oid IS NULL THEN NULL
    ELSE pg_catalog.pg_get_expr(
      attribute_default.adbin,
      attribute_default.adrelid
    )
  END AS column_default
FROM target_relations targets
JOIN pg_catalog.pg_attribute attribute
  ON attribute.attrelid = targets.relation_oid
LEFT JOIN pg_catalog.pg_attrdef attribute_default
  ON attribute_default.adrelid = attribute.attrelid
 AND attribute_default.adnum = attribute.attnum
WHERE attribute.attnum > 0
ORDER BY targets.table_name, attribute.attnum;
```

## 5. Exact manual sequence and evidence

### Step 00 - fresh visual context gate

Open a fresh blank SQL Editor and visibly verify the exact project,
branch/environment, Primary Database, role `postgres`, and row limit of at least
`1000`. The editor must not display unrelated SQL/history, customer content,
secrets, or environment-variable values.

Before capture, the Owner must attest that the fresh quiet window is active and
that no visible project, environment, database, role, or target control changed
after the accepted R01 evidence. The quiet-window statement is Owner-attested,
not independently verified by the screenshot or a database query. The Owner
must also confirm acceptance of the context-proof boundary's explicitly limited
proof basis. STOP if any statement cannot be made exactly.

On PASS, capture exactly:

`novora-fp-phase-a-resume-r02-continuation-00-context.png`

On any mismatch, missing control, stale content, warning, or incomplete visual
evidence, capture exactly:

`novora-fp-phase-a-resume-r02-continuation-00-context-error.png`

Then record R02 as `not_run` and STOP. Select exactly one mutually exclusive
Phase 0 artifact.

### Step 01 - exact frozen Resume Step 02 R02

Only after Step 00 passes, paste the complete authoritative statement into the
fresh blank editor, verify its canonical hash, and execute it exactly once with
the ordinary manual `Run` action.

PASS requires one complete, untruncated 69-row positive-attribute catalog:

- exactly 44 `public.ai_sketch_jobs` rows with relation OID `17602`;
- exactly 25 `public.ai_sketch_outputs` rows with relation OID `17619`;
- unique `(table_name, ordinal_position)` identities;
- zero dropped slots;
- exact Job names, types, nullability, defaults, identity, and generated-field
  metadata matching the completed recovery manifest;
- exact Output names, types, nullability, defaults, identity, and
  generated-field metadata matching repair A01 in the completed repair
  manifest; and
- no missing, partial, duplicate, additional, or unexpected positive attribute.

On PASS, export complete results with headers exactly as:

`novora-fp-phase-a-resume-02-r02.csv`

On any warning, SQL error, unexpected zero-row result, missing/truncated result,
context/relation/OID/count/ordinal/dropped-slot/definition mismatch, transport
or fetch failure, or export failure, capture exactly:

`novora-fp-phase-a-resume-02-r02-error.png`

Select exactly one mutually exclusive R02 artifact. Whether R02 passes or
fails, STOP. Do not retry and do not execute R03.

## 6. Post-attempt reconciliation contract

The next read-only reconciliation must create the sanitized external supplement:

`novora-fp-phase-a-resume-r02-continuation-03-manifest-v1.json`

It must bind the exact approval, packet, source, R01 retry supplement, R02
canonical-hash, and selected-artifact identities; record the fresh quiet-window
confirmation as Owner-attested and not independently database-verified; record
the context-proof boundary, Owner attestation, approval acceptance, and the
fields not freshly re-proven; list exactly one selected
Phase 0 artifact and, only if R02 was attempted, exactly one selected R02
artifact; record actual file bytes and
SHA-256 values, headers, row/duplicate/table counts, exact sanitized metadata,
expected canonical hash, nullable actual canonical hash and equality with exact
proof basis, and PASS/ERROR/`not_run`; preserve Phase A Resume and Phase A as
STOPPED; mark R03-68 `not_run`; and record every exclusion.

CSV result evidence does not prove submitted SQL bytes. For a PASS CSV,
`actual_canonical_sql_sha256` and `canonical_hash_equality` must remain null and
the proof basis must say so explicitly.

The supplement must contain no customer data, customer row IDs, brief
references, prompts, notes, Storage object-path values, URLs, images, secrets,
tokens, keys, environment-variable values, or Provider data.

## 7. Universal STOP conditions

STOP immediately on any visible project, environment, database, selected
current-role, row-limit, quiet-window, context-attestation, bounded-reliance
acceptance, target-schema, packet/source blob, heading, canonical-hash,
canonical-byte-length, relation identity/OID,
row/column/duplicate count, ordinal, dropped slot, type, nullability, default,
identity/generated-field, completeness, truncation, filename, warning, SQL
error, transport/fetch error, export error, or expected-result mismatch.

After a STOP, do not click a generic `Retry` control, rerun R02, change SQL,
repair, compensate, roll back, clean up, or continue.

## 8. Explicit exclusions

This packet does not authorize:

- Codex, MCP, CLI, script, or other automated Supabase connection or SQL
  execution;
- execution without a separate exact Owner approval tied to the post-merge
  `origin/main`, exact reviewed PR head, this packet's Git blob, the completed
  R01 retry supplement SHA-256, Resume Packet blob, R02 source blob, and R02
  canonical SHA-256, and explicitly accepting the context-proof boundary;
- representing `current_schema`, `session_role`, or recovery state as freshly
  re-proven by the visual gate or R02;
- more than one manual R02 attempt or any retry;
- R01, R03, or any other Resume statement;
- `23.1-S01` or `23.2-S01` retry;
- candidate DDL, block 23.7, constraint validation, replacement or ad hoc SQL;
- DML, repair, compensation, backfill, data edits, DELETE, rollback, or cleanup;
- ACL, default-privilege, RLS, policy, trigger, function, or Storage changes;
- customer or business-row inspection;
- Provider/generated-asset actions, environment changes, deployment,
  application rollout, email, payment, or customer-visible behavior; or
- branch, worktree, or evidence deletion.

Phase A Resume and Phase A remain **STOPPED** after R02 pending independent
evidence reconciliation and a separately reviewed continuation decision.
