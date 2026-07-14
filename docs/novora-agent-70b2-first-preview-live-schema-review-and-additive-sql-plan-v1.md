# NOVORA Agent 70B-2 First Preview Live-Schema Review And Additive SQL Plan v1

## 1. Purpose and hard boundary

This document reviews the owner-supplied Agent 70B-1 live-schema metadata and
prepares an additive, reuse-first SQL candidate plan for NOVORA First Preview.
It is documentation-only and offline.

No SQL was executed. Codex did not connect to Supabase, use Supabase MCP, use a
database CLI or connection string, inspect Production rows or customer data,
read secrets or environment values, operate Storage, call an image provider,
generate an image, deploy, or change Production. No migration or `.sql` file
was created. Application, runtime, route, component, test, package, dependency,
Storage, environment, and deployment code are unchanged.

Every SQL statement below is either a candidate for a later separately approved
SQL Agent or an owner-run `SELECT`-only preflight. Nothing in this document is
authorization to execute SQL.

The first independent formal review of Draft PR #198 returned **FAIL —
CORRECTION REQUIRED**, and the first correction resolved ready/current
separation, enforceable lineage and cross-table consistency, and deterministic
idempotency. The second independent Re-Review also returned **FAIL — CORRECTION
REQUIRED** because two lifecycle areas remained incomplete: an all-NULL job
identity/Provider profile was not bound to one exact staged status, and asset
validation/gate-passed evidence was not bidirectionally bound to its status and
timestamps. This second correction closes those two areas. PR #198 must remain
Draft until a third independent Re-Review passes. All owner-run supplemental
preflights remain blocked until that Re-Review passes.

## 2. Product authority

The governing direction remains:

- Generation may begin only after durable Concept Brief persistence is
  confirmed with a valid internal UUID and valid `NOVORA-CB-...` reference.
- One AI hand-drawn First Preview may become customer-visible immediately after
  every trusted automatic safety, privacy, identity, lifecycle, asset,
  output-validity, access-control, and false-success gate passes.
- Per-image human pre-approval is not the initial First Preview display gate.
- Human review is a later structural, gemstone-orientation, composition,
  construction, manufacturability, correction, regeneration, feedback, and
  formal downstream decision workflow.
- Provider success, an output row, an object path, an asset identifier, or a URL
  alone never means `first_preview_ready`.
- `first_preview_ready` belongs to one exact output that passed every automatic
  gate. A ready output may remain historical and non-current.
- `is_current_customer_preview = true` is a later selection pointer and may
  identify only a ready output. The invariant is one-way: current implies ready;
  ready does not imply current. A later persistence Agent must switch the
  current pointer transactionally without erasing prior ready history.
- Generated assets remain private. Later customer delivery must be
  server-mediated or use narrowly scoped, short-lived signed access. Permanent
  public generated-asset URLs are prohibited.
- The First Preview is an early AI hand-drawn concept direction. It is not CAD,
  a quotation, payment approval, an order confirmation, gemstone approval,
  manufacturing approval, production approval, or a manufacturability
  guarantee. Paid CAD and formal production decisions remain later and
  human-controlled.

### 2.1 Versioned canonical idempotency identity

The idempotency key is not merely a "deterministic 64-character key." Its
normative algorithm is `novora:first-preview-idempotency:v1`:

1. Build a JSON object containing exactly these members: `version`,
   `concept_brief_id`, `generation_purpose`, `design_spec_version`,
   `design_spec_sha256`, `hand_sketch_instruction_version`,
   `hand_sketch_instruction_sha256`, `lineage_identity`, `parent_job_id`,
   `source_output_id`, and `attempt_number`.
2. Serialize it with RFC 8785 JSON Canonicalization Scheme rules: member names
   are sorted lexicographically, no insignificant whitespace is emitted, JSON
   string escaping is canonical, and `attempt_number` is a JSON integer.
   UUIDs are lowercase hyphenated strings. SHA-256 inputs are lowercase
   64-character hexadecimal strings. Version and purpose strings are exact,
   trimmed system identifiers and are not locale-normalized at hash time.
3. `version` is the exact string
   `novora:first-preview-idempotency:v1`. `parent_job_id` and
   `source_output_id` are JSON `null` only when the lineage rules say they do
   not apply; missing members, empty strings, and omitted members are invalid.
   `lineage_identity` is the system-owned stable identity
   `first-preview:v1` for this bounded lineage, not a newly randomized value.
4. Encode the canonical JSON as UTF-8 without a BOM, compute SHA-256 over those
   bytes, and store the 32-byte digest as exactly 64 lowercase hexadecimal
   characters in `idempotency_key`.

The internal Concept Brief UUID—not `publicReference`—is the brief identity.
The complete identity therefore changes when purpose, either structured
artifact version/hash, lineage, parent/source output, or attempt changes, while
the same complete identity reproduces the same key. If any required component
is missing or malformed, the system fails closed before job reservation,
idempotency reservation, Provider invocation, or output persistence. A Provider
call must never occur before this identity is complete.

The candidate database CHECK can enforce completeness and 64-character digest
shape, while the unique index can reserve one digest. It cannot itself prove
RFC 8785 derivation. The later authorized server reservation boundary must
canonicalize, hash, compare, and persist the identity atomically before any
Provider or output action.

## 3. Evidence manifest

The owner identified the evidence as sanitized metadata manually collected from
the `novora-production` project on 2026-07-13. Codex read only the supplied
evidence directory and did not query Supabase.

| Query | Primary evidence file | Expected rows | Validated rows | Evidence form | Result |
| --- | --- | ---: | ---: | --- | --- |
| Q01 | `NOVORA_70B1_Q01_relation_inventory_2026-07-13.csv` | 6 | 6 | Complete CSV metadata | Pass |
| Q02 | `NOVORA_70B1_Q02_columns_2026-07-13.csv` | 63 | 63 | Complete CSV metadata | Pass |
| Q03 | `NOVORA_70B1_Q03_constraints_2026-07-13.csv` | 9 | 9 | Complete CSV metadata | Pass |
| Q04 | `NOVORA_70B1_Q04_foreign_keys_2026-07-13.csv` | 7 | 7 | Complete CSV metadata | Pass |
| Q05 | `NOVORA_70B1_Q05_indexes_2026-07-13.csv` | 14 | 14 | Complete CSV metadata | Pass |
| Q06 | `NOVORA_70B1_Q06_triggers_2026-07-13.csv` | 2 | 2 | Complete CSV metadata | Pass |
| Q07 | `NOVORA_70B1_Q07_rls_policies_2026-07-13.docx` | 0 | 0 | Owner-attested screenshot | Pass with limitation |
| Q08 | `NOVORA_70B1_Q08_table_grants_2026-07-13.csv` | 103 | 103 | Complete visible direct-grant CSV | Pass with interpretation limit |
| Q09 | `NOVORA_70B1_Q09_review_safety_constraints_2026-07-13.csv` | 5 | 5 | Complete CSV metadata | Pass |
| Q10 | `NOVORA_70B1_Q10_capability_fields_2026-07-13.csv` | 10 | 10 | Column-name match CSV | Pass with false-positive review |
| Q11 | `NOVORA_70B1_Q11_feedback_relationships_2026-07-13.csv` | 9 | 9 | Direct-relationship CSV metadata | Pass with scope limit |

The supplemental owner summary TXT was present but was not used as a substitute
for any primary Q01-Q11 result. No raw evidence file was copied into the
repository.

## 4. Q01-Q11 filenames

The primary filenames are recorded verbatim in section 3. Durable repository
documentation intentionally does not preserve the machine-specific owner-local
absolute evidence path.

## 5. Q01-Q11 validated row counts

The complete validated sequence is `6, 63, 9, 7, 14, 2, 0, 103, 5, 10, 9` for
Q01 through Q11. Every CSV header matched the corresponding Agent 70B-1 query
projection. No required CSV appeared truncated or malformed, and the inspected
rows contained schema metadata rather than business/customer values.

## 6. Evidence-quality notes

- Q01-Q06 and Q08-Q11 are complete, sanitized metadata CSV results.
- Q01 is CSV metadata evidence, not a screenshot or owner summary.
- Q07 is not a raw zero-row CSV; its limitation is recorded separately below.
- Q08 inventories visible direct table grants from
  `information_schema.role_table_grants`. It is not an effective-privilege,
  role-membership, ownership, BYPASSRLS, PostgREST, or exploitability audit.
- Q10 is regex-based column-name discovery only. It does not prove capability
  semantics.
- Q11 covers directly connected foreign keys where at least one endpoint is an
  approved table. It is not an inventory of the entire database.
- Repository code, tests, mocks, types, historical SQL, and old plans were used
  only as compatibility evidence. Live metadata wins where they differ.
- No evidence included current business-row values. Every row-dependent change
  therefore remains blocked on the supplemental aggregate preflights below.

## 7. Q07 zero-row screenshot-evidence limitation

The DOCX contains one screenshot of the Q07 query result. The screenshot visibly
shows `Success. No rows returned`, `0 rows`, and the six approved table names in
the query filter. This supports the owner-attested conclusion that Q07 returned
a complete zero-row explicit-policy inventory.

It is still screenshot evidence, not a raw CSV. It cannot independently prove
effective privileges, role membership, table ownership, BYPASSRLS behavior,
PostgREST role switching, or external API exploitability.

## 8. Consolidated live-schema inventory

### 8.1 Relations and access flags

| Object | Exact live definition | Repository usage | Evidence | Reuse decision | Additive delta | Row preflight | Access evidence incomplete | Blocks later SQL | Unresolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `public.ai_sketch_jobs` | Ordinary table; RLS enabled; forced RLS false; no table comment | Planned job persistence; no current First Preview DB write path | Q01 | Reuse | Job lifecycle fields and constraints | Yes | Yes | Yes | Effective privileges and current statuses |
| `public.ai_sketch_outputs` | Ordinary table; RLS enabled; forced RLS false; no table comment | Planned output persistence; runtime currently returns only an internal result | Q01 | Reuse | Asset integrity, automatic gate, readiness, current marker | Yes | Yes | Yes | Current `preview_status` values and output cardinality |
| `public.ai_sketch_reviews` | Ordinary table; RLS enabled; forced RLS false; no table comment | Server-side admin read/write helper | Q01 | Reuse unchanged for human review | No First Preview readiness field | Yes for compatibility only | Yes | No automatic-readiness SQL | Required output ID versus current create helper |
| `public.concept_briefs` | Ordinary table; RLS enabled; forced RLS false; no table comment | Confirmed persistence parent and customer reference source | Q01 | Reuse | None in this plan | No | Yes | No | Effective access posture |
| `public.concept_brief_reference_assets` | Ordinary table; RLS enabled; forced RLS false; no table comment | Customer reference assets only | Q01 | Reuse only for customer references | None; do not mix with generated outputs | No | Yes | No | Storage access remains separate |
| `public.admin_notes` | Ordinary table; RLS enabled; forced RLS false; no table comment | Admin note persistence | Q01 | Reuse only for admin notes | None | No | Yes | No | Effective access posture |

### 8.2 `ai_sketch_jobs` fields

| Live field | Exact live definition | Repository usage | Compatibility | Decision / delta | Preflight / blocker |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid NOT NULL DEFAULT gen_random_uuid()` | Planned internal job identity | Reuse unchanged | Primary identity | None |
| `concept_brief_id` | `uuid NOT NULL`; FK to `concept_briefs(id)` `ON DELETE CASCADE` | Required persisted-brief binding | Reuse unchanged | Preserve | Cross-brief aggregate checks |
| `status` | `text NOT NULL DEFAULT 'draft'` with no Q03 CHECK | No current persistent First Preview state writer | Partially compatible | Reuse for job lifecycle; do not change default or legal values until B01/B13 pass | Current grouped values unknown |
| `prompt_version` | Nullable `text` | Adapter has a deterministic prompt contract/version | Partially compatible | Reuse for prompt/template contract version; do not overload as Design Spec or Hand Sketch Instruction version | Existing semantics unknown |
| `prompt_payload` | `jsonb NOT NULL DEFAULT '{}'::jsonb` | No current First Preview DB write | Partially compatible | Retain as internal legacy/bounded structured payload only; never use it instead of dedicated invariants; never store secrets, contact data, raw provider payloads, or raw prompts | Existing values were not inspected |
| `model_name` | Nullable `text` | Adapter pins `gpt-image-2-2026-04-21` | Reuse | Store pinned request model on the job; do not duplicate on output | Future write contract |
| `error_message` | Nullable `text` | Runtime/adapter normalize failure categories | Partially compatible | Reuse only for sanitized non-secret failure detail; add dedicated `failure_category` and `terminal_reason` | Existing values were not inspected |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Audit timestamp | Reuse unchanged | Preserve | None |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()`; maintained by live trigger | Audit timestamp | Reuse unchanged | Preserve trigger | None |

Required additive job capabilities are `generation_purpose`, deterministic
`idempotency_key`, `attempt_number`, stable `lineage_identity`, `parent_job_id`,
parent-purpose/attempt snapshots, `source_output_id`, Design Spec version/hash,
Hand Sketch Instruction version/hash, `provider_name`, Provider endpoint and
non-streaming/final-image request-mode facts, provider request identity, image
count, request size/quality/format/moderation, `started_at`, `deadline_at`,
`completed_at`, `cancelled_at`, `timed_out_at`, normalized failure category,
retry eligibility, terminal reason, cost micros, currency, and pricing
assumption version.

The root is `generation_purpose = 'first_preview'`, `attempt_number = 1`, with
no parent or source output. One eligible automatic retry may be a child
`first_preview` attempt 2. A feedback regeneration extends this same
`first-preview:v1` lineage rather than starting an unrelated lineage: it is the
single child purpose `feedback_regeneration`, its attempt is exactly its
parent's attempt plus one (2 or 3), and it must identify the exact prior output
from that parent job as `source_output_id`. No feedback-regeneration child may
itself have a child in this bounded model. Timeout is not automatically
retryable. The maximum remains three Provider attempts before human
intervention.

The future database guards use composite unique targets and composite foreign
keys so a parent and source output must belong to the same Concept Brief as the
child. Stored parent purpose/attempt values must match the referenced parent.
Strictly increasing attempt numbers, bounded at 3, make a direct or multi-row
cycle impossible. Future authorized server transactions must additionally
enforce retry eligibility, customer-feedback authorization, budget, limiter,
and atomic terminal transitions.

The only permitted pre-reservation staged state is the existing live
`status = 'draft'`. A staged row has every new purpose, attempt, canonical
identity, lineage, Provider-profile, Provider-request, timing, terminal,
failure/retry, and cost field NULL. It has not started or completed work. Every
non-staged future row uses one of `queued`, `processing`, `succeeded`, `failed`,
`timed_out`, or `cancelled` and must have complete purpose/attempt, canonical
identity, lineage, and pinned Provider profile before it is written. The
candidate CHECKs express this as a total `valid_staged_state OR
valid_non_staged_state`; legacy compatibility is supplied by `NOT VALID`, not
by allowing a terminal future row to masquerade as staged.

For the selected live profile, the future authorized server writer must record
`deadline_at` as the 150-second NOVORA attempt deadline derived from
`started_at`. The database timing check guards ordering; it does not initiate,
cancel, retry, or guarantee hosting duration.

### 8.3 `ai_sketch_outputs` fields

| Live field | Exact live definition | Repository usage | Compatibility | Decision / delta | Preflight / blocker |
| --- | --- | --- | --- | --- | --- |
| `id` | `uuid NOT NULL DEFAULT gen_random_uuid()` | Review FK target; future output identity | Reuse unchanged | Preserve | None |
| `job_id` | `uuid NOT NULL`; FK to `ai_sketch_jobs(id)` `ON DELETE CASCADE` | Agent 69B historical candidate incorrectly allowed another name; live name wins | Reuse unchanged | Preserve exact live name; add uniqueness only if one-output-per-attempt preflight passes | B04/B15 |
| `concept_brief_id` | `uuid NOT NULL`; FK to `concept_briefs(id)` `ON DELETE CASCADE` | Required output-to-brief binding | Reuse unchanged | Preserve | B06 cross-brief consistency |
| `bucket_name` | `text NOT NULL DEFAULT 'novora-ai-sketches'` | Planned private generated-asset bucket identity | Reuse | Keep internal; default is not proof that a bucket/object exists or is private | Storage evidence separate |
| `object_path` | Nullable `text` | Future internal generated-object locator | Reuse with readiness condition | Keep nullable globally; require non-null only for a ready output; never return it to customers | B03/B14 |
| `preview_status` | `text NOT NULL DEFAULT 'pending_review'`; no Q03 CHECK | Mock/docs use mixed historical terminology | Partially compatible | Preserve as a historical output-workflow field. Do not change its default, add a CHECK, or reinterpret `pending_review` as readiness without B02/B17 and repository review | Current values/semantics unknown |
| `metadata` | `jsonb NOT NULL DEFAULT '{}'::jsonb` | No current persistent First Preview writer | Partially compatible | Keep for optional non-authoritative technical metadata only; do not store readiness-critical invariants only in this JSONB | Existing values were not inspected |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | Output creation audit | Reuse | Preserve; add explicit asset/readiness timestamps instead of inferring them from creation | None |

Required additive output capabilities are MIME type, byte size, width, height,
SHA-256 content hash, asset-created time, explicit asset-validation status and
bounded evidence, asset-validated time, automatic-gate status, bounded
automatic-gate evidence, gate-policy version, gate-passed time, readiness
status, ready/revoked timestamps, and a current-customer-preview marker with a
partial unique index.

`asset_created_at` is the authoritative database proof that private generated
asset persistence completed successfully and, when populated, requires
nonblank `bucket_name` and `object_path`. `object_path` and `bucket_name` are
locators only and cannot prove persistence, privacy, existence, integrity, or
readiness. `asset_validation_status = 'passed'` is bidirectionally bound to a
nonempty bounded evidence object, complete MIME/size/dimension/checksum facts,
and `asset_validated_at >= asset_created_at`. `pending` has no evidence or pass
timestamp; `failed` retains bounded failure evidence but no validated-at
timestamp or accepted binary facts. `automatic_gate_status` is likewise a
total state group: `passed` requires prior passed asset validation, nonblank
policy version, nonempty evidence, and a pass timestamp; any pass timestamp
requires `passed`. `first_preview_ready_at` must follow automatic-gate passage.
A revoked output retains its prior ready timestamp/evidence, records a later
`readiness_revoked_at`, and cannot remain current.

Provider, pinned model, size, quality, format, moderation mode, and provider
request identity belong on the job because they describe the attempt request.
The output inherits them through required `job_id`; duplicating them on every
output would permit contradictory evidence. Binary facts belong on the output.

`asset_validation_evidence` and `automatic_gate_evidence` may be JSONB only for
a bounded collection of validator/gate code, boolean/result, trusted producer
ID, validator/policy version, validation time, and input/output binding hashes.
They must not contain prompts, customer contact data, notes, secrets, object
paths, provider payloads, URLs, or image content. Dedicated columns and
constraints remain authoritative for validation, readiness, current selection,
timestamps, identity, asset integrity, attempt identity, and uniqueness.

### 8.4 `ai_sketch_reviews` fields and structural tension

All 14 live fields are preserved: `id`, `ai_sketch_output_id`,
`concept_brief_id`, `review_status`, `reviewer_note`, `customer_safe_note`,
`reviewed_at`, `created_at`, `revision_instruction`,
`approved_for_customer_at`, `approved_by`, `approval_revoked_at`, `revoked_by`,
and `updated_at`.

The exact legal `review_status` values remain:

- `internal_draft_not_generated`
- `draft_generated_internal_only`
- `needs_revision`
- `approved_for_customer`

`pending` remains illegal. `approved_for_customer` remains a human decision for
later formal customer-safe material or communication; it is not the automatic
gate for the initial First Preview.

Live `ai_sketch_output_id` is `NOT NULL`, so a review row cannot exist before a
real output exists. Therefore `internal_draft_not_generated` cannot be assumed
to mean that a pre-output review row exists. Current repository compatibility
evidence also shows that `createAdminAiSketchReview()` inserts
`concept_brief_id` and `review_status` without `ai_sketch_output_id`. This is a
documented code/live-schema tension for a later separately approved app task;
this Agent does not change the helper, nullability, FK, uniqueness, or review
model.

### 8.5 Other materially relevant fields

- `concept_briefs.id` and `public_reference` are the persisted identity pair.
  `public_reference` is `text NOT NULL` and unique. It remains customer-visible,
  not authentication, authorization, a secret, or a bearer token.
- `concept_briefs.status`, `brief_payload`, `api_submission`, and structured
  design fields are repository persistence inputs, but no business values were
  inspected and none becomes automatic readiness by itself.
- `concept_brief_reference_assets.bucket_name`, `object_path`, `mime_type`, and
  `size_bytes` describe customer reference assets, not generated First Preview
  assets. They are not reused for generated output integrity.
- `admin_notes.note` and review-note fields are internal and prohibited from
  automatic-gate evidence or customer responses.

## 9. Confirmed reusable tables and relationships

- Reuse `public.ai_sketch_jobs`, `public.ai_sketch_outputs`, and
  `public.ai_sketch_reviews`; do not create duplicate job, output, review,
  asset-status, or readiness tables.
- Preserve `ai_sketch_jobs.concept_brief_id -> concept_briefs.id ON DELETE
  CASCADE`.
- Preserve `ai_sketch_outputs.job_id -> ai_sketch_jobs.id ON DELETE CASCADE` and
  `ai_sketch_outputs.concept_brief_id -> concept_briefs.id ON DELETE CASCADE`.
- Add a composite output `(job_id, concept_brief_id)` foreign key to a unique
  job `(id, concept_brief_id)` target so future writes cannot bind an output to
  a job from another Concept Brief.
- Add composite lineage/source foreign keys so parent jobs and source outputs
  are from the same Concept Brief and the source output belongs to the parent
  job. A plain `parent_job_id -> id` FK is insufficient.
- Preserve both review FKs and `UNIQUE (concept_brief_id)`.
- Preserve `concept_brief_reference_assets.concept_brief_id ->
  concept_briefs.id ON DELETE CASCADE` and `admin_notes.concept_brief_id ->
  concept_briefs.id ON DELETE CASCADE`.
- Keep output persistence separate from secure generated-asset delivery.
- Keep customer reference assets separate from generated output assets.

## 10. Confirmed reusable fields

Reuse job `id`, `concept_brief_id`, `status`, `prompt_version`, `prompt_payload`,
`model_name`, `error_message`, `created_at`, and `updated_at` within the bounded
responsibilities in section 8. Reuse output `id`, `job_id`, `concept_brief_id`,
`bucket_name`, `object_path`, `preview_status`, `metadata`, and `created_at`.
Reuse the complete review model unchanged.

## 11. Partially compatible fields

- Job `status` needs aggregate value evidence before a CHECK or lifecycle
  interpretation.
- `prompt_version` cannot replace the two structured artifact versions.
- `prompt_payload` and output `metadata` cannot replace critical structured
  invariants.
- `error_message` is reusable only as sanitized detail, not as a normalized
  failure category.
- Output `preview_status = 'pending_review'` is a historical live fact, not the
  automatic readiness gate.
- `bucket_name` and `object_path` identify a candidate location only; they do
  not establish existence, integrity, privacy, access, or readiness.

## 12. Confirmed missing capabilities

Q02 and Q10 confirm no dedicated live columns for idempotency, attempts,
lineage, structured input hashes, provider request identity, attempt timing,
normalized terminal state, retry eligibility, cost, output integrity,
automatic-gate evidence, readiness, ready/revoked time, or current-customer
preview selection. Q05 confirms no idempotency, one-output-per-job, active-job,
or current-preview unique index.

## 13. Existing constraints and indexes

Q03 confirms primary keys on all six tables, the exact review-status CHECK,
`ai_sketch_reviews_concept_brief_id_key UNIQUE (concept_brief_id)`, and
`concept_briefs_public_reference_key UNIQUE (public_reference)`.

Q05 confirms 14 valid/live B-tree indexes. No partial or expression index was
observed. Material First Preview findings:

- `ai_sketch_jobs_concept_brief_id_idx` exists.
- `ai_sketch_outputs_concept_brief_id_idx` exists.
- No separate `ai_sketch_outputs.job_id` index exists.
- No separate `ai_sketch_reviews.ai_sketch_output_id` index exists.
- No conditional unique current-preview or idempotency index exists.
- `concept_briefs.public_reference` has both the unique-constraint index and a
  separate non-unique index. This additive-only Agent does not recommend
  dropping either.

## 14. Trigger findings

Q06 confirms `set_ai_sketch_jobs_updated_at` and
`set_concept_briefs_updated_at`. Both are enabled, row-level `BEFORE UPDATE`
triggers calling `public.set_updated_at()`. The function is not
`SECURITY DEFINER`.

No equivalent non-internal trigger was observed for outputs, reviews,
reference assets, or admin notes. This plan does not add trigger SQL: the exact
function body and intended update semantics were not supplied, and output
readiness can use dedicated timestamps. Review trigger work remains separate
from this migration scope.

## 15. RLS findings

RLS is enabled and forced RLS is false on all six approved tables. Q07 shows
zero visible explicit policies. Zero policies does not by itself establish the
behavior of owners, inherited roles, BYPASSRLS roles, service-role requests, or
PostgREST role switching. Policy changes are not proposed here.

## 16. Grant findings and interpretation limits

Q08 shows these exact visible direct privilege sets:

- `anon` and `authenticated`: `REFERENCES`, `TRIGGER`, and `TRUNCATE` on each
  approved table; no visible direct `SELECT`, `INSERT`, `UPDATE`, or `DELETE`.
- `postgres`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `REFERENCES`, `TRIGGER`,
  and `TRUNCATE` on each approved table, grantable as recorded.
- `service_role`: `REFERENCES`, `TRIGGER`, and `TRUNCATE` on all six;
  `SELECT`/`INSERT` also on `admin_notes` and reference assets;
  `SELECT`/`INSERT`/`DELETE` also on `concept_briefs`; no visible direct DML on
  the three AI tables and no visible direct `UPDATE` on any approved table.

Visible anon/authenticated `TRUNCATE` is a security-review item. The asymmetric
service-role grants are unresolved. Q08 does not prove external exploitability,
effective `TRUNCATE`, lack of service-role access, API exposure, role
membership, ownership, inheritance, or BYPASSRLS behavior. No `GRANT`, `REVOKE`,
`CREATE POLICY`, or policy mutation is an approved candidate in this plan.

## 17. Q10 false-positive handling

Q10 matched `concept_briefs.design_objective` because its name contains
`object`. It is a design-intent field, not a Storage object field and not an
asset-integrity capability. It is not reused for object identity or readiness.

## 18. Q11 relationship-scope limitation

No directly connected FK relationship had a name matching `feedback`,
`remark`, `revision`, `request`, or `response`. This does not prove that the
whole database lacks a feedback model. Q11 also revealed direct Concept Brief
children `concept_brief_contacts` and `concept_brief_notification_events`; their
business rows were not read and their scope is not expanded here. No feedback
table is proposed by this Agent.

## 19. Human-review versus automatic-readiness separation

These states remain distinct:

1. Provider request succeeded.
2. Provider output passed binary/image validation.
3. The generated asset was persisted privately.
4. Trusted automatic safety/privacy/access/lifecycle gates passed.
5. The exact output became `first_preview_ready`.
6. The exact ready output became current for the customer.
7. Human review started.
8. Human review requested revision.
9. Human approval was granted.
10. Human approval was revoked.

Job `status` represents generation lifecycle, output `preview_status` remains a
historical output-workflow field pending evidence, new output automatic/readiness
fields represent the initial automatic decision, and review `review_status`
remains the human workflow. No one status collapses these responsibilities.

## 20. Existing-data compatibility risks

Current Production row values were not supplied. The following actions are
row-dependent and remain blocked: constraining job status, changing any live
default, hardening new nullable columns to `NOT NULL`, creating unique
idempotency/attempt/provider-request/output/current-preview indexes, validating
new CHECK/FK constraints, interpreting `pending_review`, and enforcing
timestamp, retry, asset, or readiness consistency. No backfill `UPDATE` is
included.

### 20.1 Durable nullable-CHECK review rule

Every candidate or future PostgreSQL `CHECK` involving a nullable column must
receive an explicit NULL truth-table review. PostgreSQL accepts a `CHECK` when
its expression is either TRUE or NULL, so a happy-path review is insufficient.
The reviewer must prove that each invalid combination evaluates to FALSE, not
UNKNOWN, and that its matching aggregate violation preflight counts the same
combination explicitly.

Lifecycle truth tables must prove both directions: `status -> required
evidence` and `evidence/timestamp -> compatible status`. A staged status must
not carry started, terminal, Provider, validation, or passed-gate evidence; a
non-staged or terminal status must not omit its required identity, profile, or
timestamp evidence. Status-only implication checks are incomplete.

At minimum, each lifecycle review must cover: all fields NULL; controlling
status NULL; controlling status populated with evidence NULL; evidence
populated with status NULL; ready/current; ready/non-current; current/not-ready;
revoked after ready; revoked without prior ready; and every out-of-order
timestamp pair. NULL-result acceptance is a blocking SQL-review defect. This
rule applies again if the candidate is regenerated after owner evidence.

## 21. Owner-run supplemental metadata-only queries

Every query in this section is metadata-only. Results must be sanitized and
reviewed before any access-control conclusion.

### M01 - Table ownership

Purpose: identify owners of the six approved tables. Expected interpretation:
owners may have behavior not represented by direct grants, especially because
forced RLS is false. Pass: exactly six rows, all expected tables, known owners.
Fail closed: missing/unexpected rows or an owner whose role posture is not
reviewed.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  n.nspname AS table_schema,
  c.relname AS table_name,
  pg_catalog.pg_get_userbyid(c.relowner) AS table_owner
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews',
    'concept_briefs', 'concept_brief_reference_assets', 'admin_notes'
  )
  AND c.relkind = 'r'
ORDER BY c.relname;
```

### M02 - Role attributes and BYPASSRLS

Purpose: verify existence, inheritance, login, superuser, and BYPASSRLS posture
for relevant roles. Pass: all expected roles are accounted for and reviewed.
Fail closed: any unexpected superuser/BYPASSRLS/inheritance fact or missing role.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  rolname,
  rolsuper,
  rolinherit,
  rolcanlogin,
  rolbypassrls
FROM pg_catalog.pg_roles
WHERE rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY rolname;
```

### M03 - Relevant role membership

Purpose: identify direct role-membership edges touching a relevant role. Pass:
every edge is understood and no unreviewed inheritance broadens access. Fail
closed: unexpected membership or incomplete output.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  granted.rolname AS granted_role,
  member.rolname AS member_role,
  grantor.rolname AS grantor_role,
  membership.admin_option
FROM pg_catalog.pg_auth_members membership
JOIN pg_catalog.pg_roles granted ON granted.oid = membership.roleid
JOIN pg_catalog.pg_roles member ON member.oid = membership.member
JOIN pg_catalog.pg_roles grantor ON grantor.oid = membership.grantor
WHERE granted.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
   OR member.rolname IN ('anon', 'authenticated', 'service_role', 'postgres')
ORDER BY granted.rolname, member.rolname;
```

### M04 - Effective DML privileges

Purpose: evaluate effective `SELECT`/`INSERT`/`UPDATE`/`DELETE` for
`service_role`, `anon`, and `authenticated` across approved tables. Pass: each
boolean is explicitly reviewed against the later server-access design. Fail
closed: missing rows, an unexpected privilege, or an unexplained service-role
denial.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH roles(role_name) AS (
  VALUES ('service_role'), ('anon'), ('authenticated')
), approved_tables(table_name) AS (
  VALUES
    ('ai_sketch_jobs'), ('ai_sketch_outputs'), ('ai_sketch_reviews'),
    ('concept_briefs'), ('concept_brief_reference_assets'), ('admin_notes')
)
SELECT
  roles.role_name,
  approved_tables.table_name,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'SELECT') AS can_select,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'INSERT') AS can_insert,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'UPDATE') AS can_update,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'DELETE') AS can_delete
FROM roles CROSS JOIN approved_tables
ORDER BY roles.role_name, approved_tables.table_name;
```

### M05 - Effective TRUNCATE privileges

Purpose: resolve effective `TRUNCATE` for relevant API roles without claiming
API exploitability. Pass: every boolean is reviewed with ownership, membership,
BYPASSRLS, and API posture. Fail closed: incomplete or unexplained results.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH roles(role_name) AS (
  VALUES ('service_role'), ('anon'), ('authenticated')
), approved_tables(table_name) AS (
  VALUES
    ('ai_sketch_jobs'), ('ai_sketch_outputs'), ('ai_sketch_reviews'),
    ('concept_briefs'), ('concept_brief_reference_assets'), ('admin_notes')
)
SELECT
  roles.role_name,
  approved_tables.table_name,
  has_table_privilege(roles.role_name, 'public.' || approved_tables.table_name, 'TRUNCATE') AS can_truncate
FROM roles CROSS JOIN approved_tables
ORDER BY roles.role_name, approved_tables.table_name;
```

### M06 - Schema usage and aggregate RLS context

Purpose: combine schema usage, ownership, RLS flags, explicit-policy counts,
and role BYPASSRLS facts needed to interpret zero-policy RLS. Pass: six tables
and three relevant roles are complete and consistent with Q01/Q07. Fail closed:
any mismatch. This still does not prove PostgREST or external API behavior.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH roles AS (
  SELECT rolname, rolbypassrls
  FROM pg_catalog.pg_roles
  WHERE rolname IN ('service_role', 'anon', 'authenticated')
), tables AS (
  SELECT
    c.oid,
    c.relname AS table_name,
    pg_catalog.pg_get_userbyid(c.relowner) AS table_owner,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced,
    (SELECT count(*) FROM pg_catalog.pg_policy p WHERE p.polrelid = c.oid) AS policy_count
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'ai_sketch_jobs', 'ai_sketch_outputs', 'ai_sketch_reviews',
      'concept_briefs', 'concept_brief_reference_assets', 'admin_notes'
    )
)
SELECT
  roles.rolname AS role_name,
  roles.rolbypassrls,
  has_schema_privilege(roles.rolname, 'public', 'USAGE') AS has_public_schema_usage,
  tables.table_name,
  tables.table_owner,
  tables.rls_enabled,
  tables.rls_forced,
  tables.policy_count
FROM roles CROSS JOIN tables
ORDER BY roles.rolname, tables.table_name;
```

Database metadata cannot prove which role PostgREST assumes for every request,
whether an exposed endpoint is reachable, or whether an external exploit path
exists. Those require a separate approved access-control review; no SQL mutation
is prepared here.

## 22. Owner-run aggregate-only compatibility queries

Every query below reads the minimum necessary approved tables and returns only
counts or bounded system-controlled status groups. No query returns IDs,
prompts, notes, paths, payloads, contacts, references, or image content.

### B01 - Current job status counts

Purpose: learn existing system status values before constraining `status` and
confirm that only existing `draft` may represent the staged legacy state. Pass:
every value maps explicitly to staged `draft` or one reviewed non-staged
lifecycle branch. Fail closed: any unknown/blank/null value, any evidence that a
different status must remain staged, or a value that cannot be preserved safely.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT status, count(*) AS row_count
FROM public.ai_sketch_jobs
GROUP BY status
ORDER BY status;
```

### B02 - Current output preview-status counts

Purpose: determine live `preview_status` values before interpreting
`pending_review`. Pass: every value and its repository meaning is reviewed.
Fail closed: unknown/blank/null values or ambiguous semantics.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT preview_status, count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status
ORDER BY preview_status;
```

### B03 - Object-path presence

Purpose: measure nullable object identity without returning paths. Pass: counts
are accepted and no readiness is inferred. Fail closed: any plan that assumes
non-null means valid/ready.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE object_path IS NULL) AS null_object_path_count,
  count(*) FILTER (WHERE object_path IS NOT NULL) AS nonnull_object_path_count,
  count(*) AS total_output_count
FROM public.ai_sketch_outputs;
```

### B04 - Output counts per job distribution

Purpose: determine output cardinality per job without returning job IDs. Pass:
no distribution row has `output_count > 1`. Fail closed: any multi-output job.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH per_job AS (
  SELECT job_id, count(*) AS output_count
  FROM public.ai_sketch_outputs
  GROUP BY job_id
)
SELECT output_count, count(*) AS job_count
FROM per_job
GROUP BY output_count
ORDER BY output_count;
```

### B05 - Job counts per Concept Brief distribution

Purpose: measure existing job lineage density without returning brief IDs.
Pass: distribution is understood; it does not by itself authorize a one-job
constraint. Fail closed: unexplained counts that conflict with attempt design.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH per_brief AS (
  SELECT concept_brief_id, count(*) AS job_count
  FROM public.ai_sketch_jobs
  GROUP BY concept_brief_id
)
SELECT job_count, count(*) AS concept_brief_count
FROM per_brief
GROUP BY job_count
ORDER BY job_count;
```

### B06 - Existing job/output/review/brief consistency

Purpose: count orphan and cross-brief relationships without returning IDs.
Pass: every count is zero. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  (SELECT count(*)
   FROM public.ai_sketch_outputs o
   LEFT JOIN public.ai_sketch_jobs j ON j.id = o.job_id
   WHERE j.id IS NULL) AS output_missing_job_count,
  (SELECT count(*)
   FROM public.ai_sketch_outputs o
   JOIN public.ai_sketch_jobs j ON j.id = o.job_id
   WHERE o.concept_brief_id IS DISTINCT FROM j.concept_brief_id) AS output_job_brief_mismatch_count,
  (SELECT count(*)
   FROM public.ai_sketch_reviews r
   LEFT JOIN public.ai_sketch_outputs o ON o.id = r.ai_sketch_output_id
   WHERE o.id IS NULL) AS review_missing_output_count,
  (SELECT count(*)
   FROM public.ai_sketch_reviews r
   JOIN public.ai_sketch_outputs o ON o.id = r.ai_sketch_output_id
   WHERE r.concept_brief_id IS DISTINCT FROM o.concept_brief_id) AS review_output_brief_mismatch_count;
```

### B07 - Existing review-status safety

Purpose: reconfirm that rows comply with the exact live review CHECK. Pass:
`invalid_review_status_count = 0`. Fail closed: any nonzero value. Known legal
labels are used only as system-controlled status values.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT count(*) AS invalid_review_status_count
FROM public.ai_sketch_reviews
WHERE review_status IS NULL
   OR review_status NOT IN (
     'internal_draft_not_generated',
     'draft_generated_internal_only',
     'needs_revision',
     'approved_for_customer'
   );
```

### B08 - New-column null hardening, after additive columns exist

Purpose: identify rows that would violate any later `NOT NULL` hardening. Pass:
every field selected for hardening has zero nulls. Fail closed: any nonzero null
count. This query is not runnable until the additive columns exist.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE generation_purpose IS NULL) AS null_generation_purpose_count,
  count(*) FILTER (WHERE idempotency_key IS NULL) AS null_idempotency_key_count,
  count(*) FILTER (WHERE attempt_number IS NULL) AS null_attempt_number_count,
  count(*) FILTER (WHERE design_spec_hash IS NULL) AS null_design_spec_hash_count,
  count(*) FILTER (WHERE hand_sketch_instruction_hash IS NULL) AS null_instruction_hash_count
FROM public.ai_sketch_jobs;
```

No immediate `NOT NULL` hardening is authorized by this plan.

### B09 - Idempotency duplicate candidates, after population

Purpose: gate the idempotency unique index. Pass:
`duplicate_idempotency_key_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH duplicates AS (
  SELECT idempotency_key
  FROM public.ai_sketch_jobs
  WHERE idempotency_key IS NOT NULL
  GROUP BY idempotency_key
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_idempotency_key_count
FROM duplicates;
```

### B10 - Attempt-identity duplicate candidates, after population

Purpose: gate unique `(concept_brief_id, attempt_number)`. Pass:
`duplicate_attempt_identity_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH duplicates AS (
  SELECT concept_brief_id, attempt_number
  FROM public.ai_sketch_jobs
  WHERE attempt_number IS NOT NULL
  GROUP BY concept_brief_id, attempt_number
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_attempt_identity_count
FROM duplicates;
```

### B11 - Current-preview duplicate candidates, after column creation

Purpose: gate the one-current-preview partial unique index. Pass:
`duplicate_current_preview_brief_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH duplicates AS (
  SELECT concept_brief_id
  FROM public.ai_sketch_outputs
  WHERE is_current_customer_preview IS TRUE
  GROUP BY concept_brief_id
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_current_preview_brief_count
FROM duplicates;
```

### B12 - Provider-request duplicate candidates, after population

Purpose: gate provider request uniqueness. Pass:
`duplicate_provider_request_count = 0`. Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH duplicates AS (
  SELECT provider_name, provider_request_id
  FROM public.ai_sketch_jobs
  WHERE provider_name IS NOT NULL AND provider_request_id IS NOT NULL
  GROUP BY provider_name, provider_request_id
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_provider_request_count
FROM duplicates;
```

### B13 - Proposed job CHECK and Provider-profile violations

Purpose: gate validation of the one exact staged `draft`, every non-staged
identity/profile requirement, bidirectional status/timestamp evidence,
purpose/attempt pairing, timing, retry, hash, cost, and the complete pinned
Provider profile. Pass: every count is zero. Fail closed: any nonzero count,
including a terminal row with all identity/profile fields NULL, a staged row
with started/terminal/Provider evidence, a partial Provider group, or any NULL
half of the purpose/attempt pair. This query is runnable only after the additive
columns exist.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE status IS NULL OR status NOT IN (
    'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
  )) AS invalid_job_status_count,
  count(*) FILTER (
    WHERE status IS NOT DISTINCT FROM 'draft'
      AND num_nonnulls(
        generation_purpose, attempt_number, idempotency_key, lineage_identity,
        parent_job_id, parent_generation_purpose, parent_attempt_number,
        source_output_id, design_spec_version, design_spec_hash,
        hand_sketch_instruction_version, hand_sketch_instruction_hash,
        provider_name, model_name, provider_endpoint, request_image_count,
        request_streaming, request_partial_images, request_size, request_quality,
        output_format, moderation_mode, provider_request_id, started_at,
        deadline_at, completed_at, cancelled_at, timed_out_at, failure_category,
        retry_eligible, terminal_reason, error_message, estimated_cost_micros,
        actual_cost_micros, cost_currency, pricing_assumption_version
      ) <> 0
  ) AS invalid_staged_state_count,
  count(*) FILTER (
    WHERE status IS DISTINCT FROM 'draft'
      AND (
        generation_purpose IS NULL
        OR attempt_number IS NULL
        OR idempotency_key IS NULL
        OR lineage_identity IS NULL
        OR design_spec_version IS NULL
        OR btrim(design_spec_version) = ''
        OR design_spec_hash IS NULL
        OR hand_sketch_instruction_version IS NULL
        OR btrim(hand_sketch_instruction_version) = ''
        OR hand_sketch_instruction_hash IS NULL
      )
  ) AS incomplete_nonstaged_identity_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'draft'
           AND (generation_purpose IS NOT NULL OR attempt_number IS NOT NULL))
       OR (status IS DISTINCT FROM 'draft' AND (
             generation_purpose IS NULL
             OR attempt_number IS NULL
             OR (generation_purpose IS DISTINCT FROM 'first_preview'
                 AND generation_purpose IS DISTINCT FROM 'feedback_regeneration')
             OR (generation_purpose IS NOT DISTINCT FROM 'first_preview'
                 AND attempt_number NOT BETWEEN 1 AND 2)
             OR (generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
                 AND attempt_number NOT BETWEEN 2 AND 3)
           ))
  ) AS invalid_attempt_policy_count,
  count(*) FILTER (
    WHERE (started_at IS NULL AND deadline_at IS NOT NULL)
       OR (started_at IS NOT NULL
           AND (deadline_at IS NULL OR deadline_at <= started_at))
       OR (completed_at IS NOT NULL
           AND started_at IS NOT NULL
           AND completed_at < started_at)
       OR (cancelled_at IS NOT NULL
           AND started_at IS NOT NULL
           AND cancelled_at < started_at)
       OR (timed_out_at IS NOT NULL
           AND started_at IS NOT NULL
           AND timed_out_at < started_at)
  ) AS invalid_attempt_timing_count,
  count(*) FILTER (WHERE num_nonnulls(completed_at, cancelled_at, timed_out_at) > 1) AS conflicting_terminal_timestamp_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'queued' AND (
             started_at IS NOT NULL OR deadline_at IS NOT NULL
             OR completed_at IS NOT NULL OR cancelled_at IS NOT NULL
             OR timed_out_at IS NOT NULL OR failure_category IS NOT NULL
             OR retry_eligible IS NOT NULL OR terminal_reason IS NOT NULL
             OR error_message IS NOT NULL
           ))
       OR (status IS NOT DISTINCT FROM 'processing' AND (
             started_at IS NULL OR deadline_at IS NULL
             OR deadline_at <= started_at
             OR completed_at IS NOT NULL OR cancelled_at IS NOT NULL
             OR timed_out_at IS NOT NULL OR failure_category IS NOT NULL
             OR retry_eligible IS NOT NULL OR terminal_reason IS NOT NULL
             OR error_message IS NOT NULL
           ))
       OR (status IS NOT DISTINCT FROM 'succeeded' AND (
             started_at IS NULL OR deadline_at IS NULL
             OR deadline_at <= started_at OR completed_at IS NULL
             OR completed_at < started_at OR cancelled_at IS NOT NULL
             OR timed_out_at IS NOT NULL OR failure_category IS NOT NULL
             OR retry_eligible IS NOT NULL OR terminal_reason IS NOT NULL
             OR error_message IS NOT NULL
           ))
       OR (status IS NOT DISTINCT FROM 'failed' AND (
             completed_at IS NULL OR cancelled_at IS NOT NULL
             OR timed_out_at IS NOT NULL OR failure_category IS NULL
             OR failure_category IS NOT DISTINCT FROM 'timeout'
             OR failure_category IS NOT DISTINCT FROM 'cancelled'
             OR retry_eligible IS NULL OR terminal_reason IS NULL
             OR btrim(terminal_reason) = ''
             OR (started_at IS NULL AND deadline_at IS NOT NULL)
             OR (started_at IS NOT NULL AND (
                   deadline_at IS NULL OR deadline_at <= started_at
                   OR completed_at < started_at
                 ))
           ))
       OR (status IS NOT DISTINCT FROM 'timed_out' AND (
             started_at IS NULL OR deadline_at IS NULL
             OR deadline_at <= started_at OR timed_out_at IS NULL
             OR timed_out_at < deadline_at OR completed_at IS NOT NULL
             OR cancelled_at IS NOT NULL
             OR failure_category IS DISTINCT FROM 'timeout'
             OR retry_eligible IS DISTINCT FROM false
             OR terminal_reason IS NULL OR btrim(terminal_reason) = ''
           ))
       OR (status IS NOT DISTINCT FROM 'cancelled' AND (
             completed_at IS NOT NULL OR timed_out_at IS NOT NULL
             OR cancelled_at IS NULL
             OR failure_category IS DISTINCT FROM 'cancelled'
             OR retry_eligible IS DISTINCT FROM false
             OR terminal_reason IS NULL OR btrim(terminal_reason) = ''
             OR (started_at IS NULL AND deadline_at IS NOT NULL)
             OR (started_at IS NOT NULL AND (
                   deadline_at IS NULL OR deadline_at <= started_at
                   OR cancelled_at < started_at
                 ))
           ))
  ) AS invalid_status_timestamp_evidence_count,
  count(*) FILTER (
    WHERE (design_spec_hash IS NOT NULL AND design_spec_hash !~ '^[0-9a-f]{64}$')
       OR (hand_sketch_instruction_hash IS NOT NULL
           AND hand_sketch_instruction_hash !~ '^[0-9a-f]{64}$')
       OR (idempotency_key IS NOT NULL AND idempotency_key !~ '^[0-9a-f]{64}$')
  ) AS invalid_hash_format_count,
  count(*) FILTER (
    WHERE failure_category IS NOT NULL
      AND failure_category NOT IN (
        'configuration_missing', 'invalid_structured_input', 'precondition_failed',
        'invalid_request', 'authentication_failed', 'permission_denied',
        'moderation_blocked', 'rate_limited', 'provider_unavailable',
        'network_failure', 'timeout', 'cancelled', 'invalid_provider_response',
        'invalid_base64', 'invalid_image_format', 'invalid_image_dimensions',
        'image_too_large', 'unsafe_output', 'privacy_failure', 'access_failure',
        'storage_failure', 'lifecycle_conflict', 'budget_blocked',
        'unexpected_provider_error'
      )
  ) AS invalid_failure_category_count,
  count(*) FILTER (
    WHERE retry_eligible IS TRUE
      AND failure_category IS DISTINCT FROM 'rate_limited'
      AND failure_category IS DISTINCT FROM 'provider_unavailable'
      AND failure_category IS DISTINCT FROM 'network_failure'
  ) AS invalid_retry_eligibility_count,
  count(*) FILTER (
    WHERE estimated_cost_micros < 0
       OR actual_cost_micros < 0
       OR (cost_currency IS NOT NULL AND cost_currency !~ '^[A-Z]{3}$')
       OR (status IS NOT DISTINCT FROM 'draft' AND num_nonnulls(
             estimated_cost_micros, actual_cost_micros, cost_currency,
             pricing_assumption_version
           ) <> 0)
       OR (status IS DISTINCT FROM 'draft' AND (
             (estimated_cost_micros IS NULL
              AND actual_cost_micros IS NULL
              AND (cost_currency IS NOT NULL
                   OR pricing_assumption_version IS NOT NULL))
             OR ((estimated_cost_micros IS NOT NULL
                  OR actual_cost_micros IS NOT NULL)
                 AND (cost_currency IS NULL
                      OR cost_currency !~ '^[A-Z]{3}$'
                      OR pricing_assumption_version IS NULL
                      OR btrim(pricing_assumption_version) = ''))
           ))
  ) AS invalid_cost_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'draft' AND num_nonnulls(
             provider_name, model_name, provider_endpoint, request_image_count,
             request_streaming, request_partial_images, request_size,
             request_quality, output_format, moderation_mode
           ) <> 0)
       OR (status IS DISTINCT FROM 'draft' AND num_nonnulls(
             provider_name, model_name, provider_endpoint, request_image_count,
             request_streaming, request_partial_images, request_size,
             request_quality, output_format, moderation_mode
           ) <> 10)
  ) AS incomplete_request_profile_count,
  count(*) FILTER (
    WHERE status IS DISTINCT FROM 'draft'
      AND (
        provider_name IS DISTINCT FROM 'openai'
        OR model_name IS DISTINCT FROM 'gpt-image-2-2026-04-21'
        OR provider_endpoint IS DISTINCT FROM '/v1/images/generations'
        OR request_image_count IS DISTINCT FROM 1
        OR request_streaming IS DISTINCT FROM false
        OR request_partial_images IS DISTINCT FROM 0
        OR request_size IS DISTINCT FROM '1024x1024'
        OR request_quality IS DISTINCT FROM 'medium'
        OR output_format IS DISTINCT FROM 'png'
        OR moderation_mode IS DISTINCT FROM 'auto'
      )
  ) AS mismatched_request_profile_count,
  count(*) FILTER (
    WHERE (status IS NOT DISTINCT FROM 'draft' AND provider_request_id IS NOT NULL)
       OR (status IS DISTINCT FROM 'draft'
           AND provider_request_id IS NOT NULL
           AND (provider_name IS DISTINCT FROM 'openai'
                OR btrim(provider_request_id) = ''))
  ) AS provider_request_without_profile_count
FROM public.ai_sketch_jobs;
```

### B14 - Proposed output readiness, integrity, and chronology violations

Purpose: gate validation of output CHECK constraints, including bidirectional
asset-validation and automatic-gate status/evidence/timestamp groups plus every
required NULL and timestamp-order case. Pass: every count is zero. Fail closed:
any nonzero count. `asset_created_at` is the authoritative persistence
timestamp; this aggregate does not independently prove Storage privacy or
access.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE readiness_status IS NOT NULL AND readiness_status NOT IN (
    'not_ready', 'first_preview_ready', 'revoked'
  )) AS invalid_readiness_status_count,
  count(*) FILTER (WHERE automatic_gate_status IS NOT NULL AND automatic_gate_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_gate_status_count,
  count(*) FILTER (WHERE asset_validation_status IS NOT NULL AND asset_validation_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_asset_validation_status_count,
  count(*) FILTER (
    WHERE num_nonnulls(
            mime_type, byte_size, width_px, height_px, content_sha256
          ) BETWEEN 1 AND 4
       OR (num_nonnulls(
             mime_type, byte_size, width_px, height_px, content_sha256
           ) = 5 AND (
             mime_type IS DISTINCT FROM 'image/png'
             OR byte_size NOT BETWEEN 1 AND 16777216
             OR width_px IS DISTINCT FROM 1024
             OR height_px IS DISTINCT FROM 1024
             OR content_sha256 !~ '^[0-9a-f]{64}$'
           ))
  ) AS invalid_integrity_shape_count,
  count(*) FILTER (
    WHERE asset_created_at IS NOT NULL
      AND (
        bucket_name IS NULL OR btrim(bucket_name) = ''
        OR object_path IS NULL OR btrim(object_path) = ''
      )
  ) AS invalid_asset_persistence_count,
  count(*) FILTER (
    WHERE (asset_validation_status IS NULL AND (
             asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'pending' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'failed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'passed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NULL
             OR asset_validated_at < asset_created_at
             OR mime_type IS DISTINCT FROM 'image/png'
             OR byte_size IS NULL OR byte_size NOT BETWEEN 1 AND 16777216
             OR width_px IS DISTINCT FROM 1024
             OR height_px IS DISTINCT FROM 1024
             OR content_sha256 IS NULL
             OR content_sha256 !~ '^[0-9a-f]{64}$'
           ))
  ) AS invalid_asset_validation_consistency_count,
  count(*) FILTER (
    WHERE (automatic_gate_status IS NULL AND (
             automatic_gate_policy_version IS NOT NULL
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'pending' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'failed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'passed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NULL
             OR automatic_gate_passed_at < asset_validated_at
           ))
  ) AS invalid_automatic_gate_consistency_count,
  count(*) FILTER (
    WHERE (readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
           OR readiness_status IS NOT DISTINCT FROM 'revoked')
      AND (
        asset_validation_status IS DISTINCT FROM 'passed'
        OR asset_validation_evidence IS NULL
        OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
        OR asset_validation_evidence = '{}'::jsonb
        OR automatic_gate_status IS DISTINCT FROM 'passed'
        OR automatic_gate_evidence IS NULL
        OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
        OR automatic_gate_evidence = '{}'::jsonb
        OR automatic_gate_policy_version IS NULL
        OR btrim(automatic_gate_policy_version) = ''
        OR asset_created_at IS NULL
        OR asset_validated_at IS NULL
        OR asset_validated_at < asset_created_at
        OR automatic_gate_passed_at IS NULL
        OR automatic_gate_passed_at < asset_validated_at
        OR first_preview_ready_at IS NULL
        OR first_preview_ready_at < automatic_gate_passed_at
        OR object_path IS NULL
        OR btrim(object_path) = ''
        OR bucket_name IS NULL
        OR btrim(bucket_name) = ''
        OR mime_type IS NULL
        OR mime_type IS DISTINCT FROM 'image/png'
        OR byte_size IS NULL
        OR byte_size NOT BETWEEN 1 AND 16777216
        OR width_px IS NULL
        OR width_px IS DISTINCT FROM 1024
        OR height_px IS NULL
        OR height_px IS DISTINCT FROM 1024
        OR content_sha256 IS NULL
        OR content_sha256 !~ '^[0-9a-f]{64}$'
      )
  ) AS invalid_ready_or_revoked_evidence_count,
  count(*) FILTER (
    WHERE is_current_customer_preview IS TRUE
      AND readiness_status IS DISTINCT FROM 'first_preview_ready'
  ) AS invalid_current_marker_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT DISTINCT FROM 'revoked'
      AND (
        first_preview_ready_at IS NULL
        OR readiness_revoked_at IS NULL
        OR readiness_revoked_at < first_preview_ready_at
        OR is_current_customer_preview IS TRUE
      )
  ) AS invalid_revocation_count,
  count(*) FILTER (
    WHERE (readiness_status IS DISTINCT FROM 'revoked' AND readiness_revoked_at IS NOT NULL)
       OR (readiness_status IS NOT DISTINCT FROM 'revoked' AND readiness_revoked_at IS NULL)
       OR (readiness_status IS DISTINCT FROM 'first_preview_ready'
           AND readiness_status IS DISTINCT FROM 'revoked'
           AND first_preview_ready_at IS NOT NULL)
  ) AS invalid_readiness_timestamp_state_count,
  count(*) FILTER (
    WHERE (asset_validated_at IS NOT NULL
           AND (asset_created_at IS NULL OR asset_validated_at < asset_created_at))
       OR (automatic_gate_passed_at IS NOT NULL
           AND (asset_validated_at IS NULL OR automatic_gate_passed_at < asset_validated_at))
       OR (first_preview_ready_at IS NOT NULL
           AND (automatic_gate_passed_at IS NULL OR first_preview_ready_at < automatic_gate_passed_at))
       OR (readiness_revoked_at IS NOT NULL
           AND (first_preview_ready_at IS NULL OR readiness_revoked_at < first_preview_ready_at))
  ) AS invalid_chronology_count
FROM public.ai_sketch_outputs;
```

### B15 - One-output-per-job duplicate candidates

Purpose: gate unique `job_id`. Pass: `multi_output_job_count = 0`. Fail closed:
any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH duplicates AS (
  SELECT job_id
  FROM public.ai_sketch_outputs
  GROUP BY job_id
  HAVING count(*) > 1
)
SELECT count(*) AS multi_output_job_count
FROM duplicates;
```

### B16 - Complete lineage and source-output compatibility

Purpose: gate all lineage/source CHECKs and composite FKs after the new columns
are populated. It counts missing parents, direct and multi-row cycles,
cross-brief parentage, stale parent snapshots, invalid purpose/attempt
transitions, and missing or cross-brief/cross-job source outputs. Pass: every
count is zero. Fail closed: any nonzero count or incomplete recursion. No
identity is returned.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH RECURSIVE lineage_walk AS (
  SELECT
    child.id AS start_id,
    child.id AS current_id,
    child.parent_job_id AS next_parent_id,
    ARRAY[child.id]::uuid[] AS visited,
    false AS cycle_found
  FROM public.ai_sketch_jobs child
  WHERE child.parent_job_id IS NOT NULL

  UNION ALL

  SELECT
    walk.start_id,
    parent.id AS current_id,
    parent.parent_job_id AS next_parent_id,
    walk.visited || parent.id,
    parent.id = ANY(walk.visited) AS cycle_found
  FROM lineage_walk walk
  JOIN public.ai_sketch_jobs parent ON parent.id = walk.next_parent_id
  WHERE walk.cycle_found IS FALSE
), row_counts AS (
  SELECT
    count(*) FILTER (
      WHERE child.parent_job_id IS NOT NULL AND parent.id IS NULL
    ) AS missing_parent_count,
    count(*) FILTER (
      WHERE child.parent_job_id IS NOT NULL AND child.parent_job_id = child.id
    ) AS direct_self_parent_count,
    count(*) FILTER (
      WHERE parent.id IS NOT NULL
        AND child.concept_brief_id IS DISTINCT FROM parent.concept_brief_id
    ) AS cross_brief_parent_count,
    count(*) FILTER (
      WHERE child.generation_purpose IS NOT NULL
        AND child.parent_job_id IS NULL
        AND (
          child.generation_purpose IS DISTINCT FROM 'first_preview'
          OR child.attempt_number IS DISTINCT FROM 1
          OR child.lineage_identity IS DISTINCT FROM 'first-preview:v1'
          OR child.parent_generation_purpose IS NOT NULL
          OR child.parent_attempt_number IS NOT NULL
          OR child.source_output_id IS NOT NULL
        )
    ) AS invalid_root_count,
    count(*) FILTER (
      WHERE (child.parent_job_id IS NULL AND (
               child.parent_generation_purpose IS NOT NULL
               OR child.parent_attempt_number IS NOT NULL
             ))
         OR (child.parent_job_id IS NOT NULL AND (
               child.parent_generation_purpose IS NULL
               OR child.parent_attempt_number IS NULL
             ))
    ) AS incomplete_parent_identity_count,
    count(*) FILTER (
      WHERE parent.id IS NOT NULL
        AND (
          child.lineage_identity IS DISTINCT FROM 'first-preview:v1'
          OR child.parent_generation_purpose IS DISTINCT FROM parent.generation_purpose
          OR child.parent_attempt_number IS DISTINCT FROM parent.attempt_number
          OR child.attempt_number IS DISTINCT FROM parent.attempt_number + 1
          OR (child.generation_purpose IS NOT DISTINCT FROM 'first_preview' AND (
                parent.generation_purpose IS DISTINCT FROM 'first_preview'
                OR parent.attempt_number IS DISTINCT FROM 1
                OR child.attempt_number IS DISTINCT FROM 2
                OR child.source_output_id IS NOT NULL
              ))
          OR (child.generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration' AND (
                parent.generation_purpose IS DISTINCT FROM 'first_preview'
                OR child.attempt_number NOT BETWEEN 2 AND 3
                OR child.source_output_id IS NULL
              ))
          OR (child.generation_purpose IS DISTINCT FROM 'first_preview'
              AND child.generation_purpose IS DISTINCT FROM 'feedback_regeneration')
        )
    ) AS invalid_parent_transition_count,
    count(*) FILTER (
      WHERE child.source_output_id IS NOT NULL AND source_output.id IS NULL
    ) AS missing_source_output_count,
    count(*) FILTER (
      WHERE source_output.id IS NOT NULL
        AND source_output.job_id IS DISTINCT FROM child.parent_job_id
    ) AS source_output_parent_job_mismatch_count,
    count(*) FILTER (
      WHERE source_output.id IS NOT NULL
        AND source_output.concept_brief_id IS DISTINCT FROM child.concept_brief_id
    ) AS source_output_brief_mismatch_count
  FROM public.ai_sketch_jobs child
  LEFT JOIN public.ai_sketch_jobs parent ON parent.id = child.parent_job_id
  LEFT JOIN public.ai_sketch_outputs source_output ON source_output.id = child.source_output_id
)
SELECT
  row_counts.*,
  (SELECT count(DISTINCT start_id)
   FROM lineage_walk
   WHERE cycle_found IS TRUE) AS multi_row_cycle_start_count
FROM row_counts;
```

### B17 - `pending_review` semantics before any change

Purpose: quantify the historical status together with path presence only; it
does not infer readiness. Pass: results are reconciled with repository behavior
and an owner-approved mapping. Fail closed: any proposal to change the default
or CHECK without that mapping.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  preview_status,
  (object_path IS NOT NULL) AS has_object_path,
  count(*) AS row_count
FROM public.ai_sketch_outputs
GROUP BY preview_status, (object_path IS NOT NULL)
ORDER BY preview_status, has_object_path;
```

### B18 - One active job per brief and purpose

Purpose: gate the partial unique active-purpose index after B01 confirms the
exact active-status mapping. Pass: `duplicate_active_purpose_count = 0`. Fail
closed: any duplicate or any change to the approved active-status predicate.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
WITH duplicates AS (
  SELECT concept_brief_id, generation_purpose
  FROM public.ai_sketch_jobs
  WHERE generation_purpose IS NOT NULL
    AND status IN ('queued', 'processing')
  GROUP BY concept_brief_id, generation_purpose
  HAVING count(*) > 1
)
SELECT count(*) AS duplicate_active_purpose_count
FROM duplicates;
```

### B19 - Composite-key targets and future-FK compatibility

Purpose: gate the supporting unique indexes and later composite FK validation.
Pass: all duplicate-target and output/job mismatch counts are zero. Fail closed:
any nonzero count. Primary keys make some duplicates structurally unlikely, but
the exact proposed composite targets are still verified before creation.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id
    FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id
    HAVING count(*) > 1
  ) duplicates) AS duplicate_job_brief_target_count,
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id, generation_purpose, attempt_number
    FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id, generation_purpose, attempt_number
    HAVING count(*) > 1
  ) duplicates) AS duplicate_parent_lineage_target_count,
  (SELECT count(*) FROM (
    SELECT id, job_id, concept_brief_id
    FROM public.ai_sketch_outputs
    GROUP BY id, job_id, concept_brief_id
    HAVING count(*) > 1
  ) duplicates) AS duplicate_source_output_target_count,
  (SELECT count(*)
   FROM public.ai_sketch_outputs output
   LEFT JOIN public.ai_sketch_jobs job
     ON job.id = output.job_id
    AND job.concept_brief_id = output.concept_brief_id
   WHERE job.id IS NULL) AS output_composite_fk_violation_count;
```

## 23. Exact additive SQL candidate blocks

### 23.1 Nullable-first job columns

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD COLUMN generation_purpose text,
  ADD COLUMN idempotency_key text,
  ADD COLUMN attempt_number smallint,
  ADD COLUMN lineage_identity text,
  ADD COLUMN parent_job_id uuid,
  ADD COLUMN parent_generation_purpose text,
  ADD COLUMN parent_attempt_number smallint,
  ADD COLUMN source_output_id uuid,
  ADD COLUMN design_spec_version text,
  ADD COLUMN design_spec_hash text,
  ADD COLUMN hand_sketch_instruction_version text,
  ADD COLUMN hand_sketch_instruction_hash text,
  ADD COLUMN provider_name text,
  ADD COLUMN provider_request_id text,
  ADD COLUMN provider_endpoint text,
  ADD COLUMN request_image_count smallint,
  ADD COLUMN request_streaming boolean,
  ADD COLUMN request_partial_images smallint,
  ADD COLUMN request_size text,
  ADD COLUMN request_quality text,
  ADD COLUMN output_format text,
  ADD COLUMN moderation_mode text,
  ADD COLUMN started_at timestamptz,
  ADD COLUMN deadline_at timestamptz,
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN timed_out_at timestamptz,
  ADD COLUMN failure_category text,
  ADD COLUMN retry_eligible boolean,
  ADD COLUMN terminal_reason text,
  ADD COLUMN estimated_cost_micros bigint,
  ADD COLUMN actual_cost_micros bigint,
  ADD COLUMN cost_currency text,
  ADD COLUMN pricing_assumption_version text;
```

All fields are nullable to avoid fabricating legacy identity, lineage, hashes,
timing, terminal evidence, or costs. `model_name`, `prompt_version`, and
`error_message` are reused rather than duplicated.

### 23.2 Output integrity and readiness columns

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_outputs
  ADD COLUMN mime_type text,
  ADD COLUMN byte_size bigint,
  ADD COLUMN width_px integer,
  ADD COLUMN height_px integer,
  ADD COLUMN content_sha256 text,
  ADD COLUMN asset_created_at timestamptz,
  ADD COLUMN asset_validation_status text,
  ADD COLUMN asset_validation_evidence jsonb,
  ADD COLUMN asset_validated_at timestamptz,
  ADD COLUMN automatic_gate_status text,
  ADD COLUMN automatic_gate_evidence jsonb,
  ADD COLUMN automatic_gate_policy_version text,
  ADD COLUMN automatic_gate_passed_at timestamptz,
  ADD COLUMN readiness_status text,
  ADD COLUMN first_preview_ready_at timestamptz,
  ADD COLUMN readiness_revoked_at timestamptz,
  ADD COLUMN is_current_customer_preview boolean NOT NULL DEFAULT false;
```

The only immediate non-null default is fail-closed `false`; it cannot create a
ready or current legacy output. Null readiness must be interpreted as not ready.

### 23.3 Job checks, staged as NOT VALID

The status CHECK is exact candidate SQL but blocked on B01/B13 because current
values are unknown. The remaining checks can be added as `NOT VALID` only after
the later SQL Agent reconfirms names and lock/operational posture; validation is
separate.

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_status_check
    CHECK (status IS NOT NULL AND status IN (
      'draft', 'queued', 'processing', 'succeeded', 'failed', 'timed_out', 'cancelled'
    )) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_attempt_policy_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND attempt_number IS NULL)
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT NULL
        AND attempt_number IS NOT NULL
        AND (
          (generation_purpose IS NOT DISTINCT FROM 'first_preview'
           AND attempt_number BETWEEN 1 AND 2)
          OR (generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
              AND attempt_number BETWEEN 2 AND 3)
        )
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_reserved_identity_completeness_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND idempotency_key IS NULL
       AND lineage_identity IS NULL
       AND design_spec_version IS NULL
       AND design_spec_hash IS NULL
       AND hand_sketch_instruction_version IS NULL
       AND hand_sketch_instruction_hash IS NULL)
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT NULL
        AND idempotency_key IS NOT NULL
        AND lineage_identity IS NOT NULL
        AND design_spec_version IS NOT NULL
        AND btrim(design_spec_version) <> ''
        AND design_spec_hash IS NOT NULL
        AND hand_sketch_instruction_version IS NOT NULL
        AND btrim(hand_sketch_instruction_version) <> ''
        AND hand_sketch_instruction_hash IS NOT NULL
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_lineage_shape_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND generation_purpose IS NULL
       AND lineage_identity IS NULL
       AND parent_job_id IS NULL
       AND parent_generation_purpose IS NULL
       AND parent_attempt_number IS NULL
       AND source_output_id IS NULL)
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND attempt_number IS NOT DISTINCT FROM 1
        AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
        AND parent_job_id IS NULL
        AND parent_generation_purpose IS NULL
        AND parent_attempt_number IS NULL
        AND source_output_id IS NULL
      )
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND attempt_number IS NOT DISTINCT FROM 2
        AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
        AND parent_job_id IS NOT NULL
        AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND parent_attempt_number IS NOT DISTINCT FROM 1
        AND source_output_id IS NULL
      )
      OR (
        status IS DISTINCT FROM 'draft'
        AND generation_purpose IS NOT DISTINCT FROM 'feedback_regeneration'
        AND attempt_number IS NOT NULL
        AND attempt_number BETWEEN 2 AND 3
        AND lineage_identity IS NOT DISTINCT FROM 'first-preview:v1'
        AND parent_job_id IS NOT NULL
        AND parent_generation_purpose IS NOT DISTINCT FROM 'first_preview'
        AND parent_attempt_number IS NOT NULL
        AND attempt_number = parent_attempt_number + 1
        AND source_output_id IS NOT NULL
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_hash_format_check
    CHECK (
      (design_spec_hash IS NULL OR design_spec_hash ~ '^[0-9a-f]{64}$')
      AND (hand_sketch_instruction_hash IS NULL OR hand_sketch_instruction_hash ~ '^[0-9a-f]{64}$')
      AND (idempotency_key IS NULL OR idempotency_key ~ '^[0-9a-f]{64}$')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_attempt_timing_check
    CHECK (
      ((started_at IS NULL AND deadline_at IS NULL)
       OR (started_at IS NOT NULL
           AND deadline_at IS NOT NULL
           AND deadline_at > started_at))
      AND (completed_at IS NULL
           OR started_at IS NULL
           OR completed_at >= started_at)
      AND (cancelled_at IS NULL
           OR started_at IS NULL
           OR cancelled_at >= started_at)
      AND (timed_out_at IS NULL
           OR started_at IS NULL
           OR timed_out_at >= started_at)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_terminal_timestamp_check
    CHECK (num_nonnulls(completed_at, cancelled_at, timed_out_at) <= 1) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_status_terminal_consistency_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         started_at, deadline_at, completed_at, cancelled_at, timed_out_at,
         failure_category, retry_eligible, terminal_reason, error_message
       ) = 0)
      OR (status IS NOT DISTINCT FROM 'queued'
          AND num_nonnulls(
            started_at, deadline_at, completed_at, cancelled_at, timed_out_at,
            failure_category, retry_eligible, terminal_reason, error_message
          ) = 0)
      OR (status IS NOT DISTINCT FROM 'processing'
          AND started_at IS NOT NULL
          AND deadline_at IS NOT NULL
          AND deadline_at > started_at
          AND num_nonnulls(
            completed_at, cancelled_at, timed_out_at, failure_category,
            retry_eligible, terminal_reason, error_message
          ) = 0)
      OR (status IS NOT DISTINCT FROM 'succeeded'
          AND started_at IS NOT NULL
          AND deadline_at IS NOT NULL
          AND deadline_at > started_at
          AND completed_at IS NOT NULL
          AND completed_at >= started_at
          AND num_nonnulls(
            cancelled_at, timed_out_at, failure_category, retry_eligible,
            terminal_reason, error_message
          ) = 0)
      OR (status IS NOT DISTINCT FROM 'failed'
          AND completed_at IS NOT NULL
          AND cancelled_at IS NULL
          AND timed_out_at IS NULL
          AND failure_category IS NOT NULL
          AND failure_category IS DISTINCT FROM 'timeout'
          AND failure_category IS DISTINCT FROM 'cancelled'
          AND retry_eligible IS NOT NULL
          AND terminal_reason IS NOT NULL
          AND btrim(terminal_reason) <> ''
          AND (
            (started_at IS NULL AND deadline_at IS NULL)
            OR (started_at IS NOT NULL
                AND deadline_at IS NOT NULL
                AND deadline_at > started_at
                AND completed_at >= started_at)
          ))
      OR (status IS NOT DISTINCT FROM 'timed_out'
          AND started_at IS NOT NULL
          AND deadline_at IS NOT NULL
          AND deadline_at > started_at
          AND timed_out_at IS NOT NULL
          AND timed_out_at >= deadline_at
          AND completed_at IS NULL
          AND cancelled_at IS NULL
          AND failure_category IS NOT DISTINCT FROM 'timeout'
          AND retry_eligible IS NOT DISTINCT FROM false
          AND terminal_reason IS NOT NULL
          AND btrim(terminal_reason) <> '')
      OR (status IS NOT DISTINCT FROM 'cancelled'
          AND completed_at IS NULL
          AND timed_out_at IS NULL
          AND cancelled_at IS NOT NULL
          AND failure_category IS NOT DISTINCT FROM 'cancelled'
          AND retry_eligible IS NOT DISTINCT FROM false
          AND terminal_reason IS NOT NULL
          AND btrim(terminal_reason) <> ''
          AND (
            (started_at IS NULL AND deadline_at IS NULL)
            OR (started_at IS NOT NULL
                AND deadline_at IS NOT NULL
                AND deadline_at > started_at
                AND cancelled_at >= started_at)
          ))
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_failure_category_check
    CHECK (failure_category IS NULL OR failure_category IN (
      'configuration_missing', 'invalid_structured_input', 'precondition_failed',
      'invalid_request', 'authentication_failed', 'permission_denied',
      'moderation_blocked', 'rate_limited', 'provider_unavailable',
      'network_failure', 'timeout', 'cancelled', 'invalid_provider_response',
      'invalid_base64', 'invalid_image_format', 'invalid_image_dimensions',
      'image_too_large', 'unsafe_output', 'privacy_failure', 'access_failure',
      'storage_failure', 'lifecycle_conflict', 'budget_blocked',
      'unexpected_provider_error'
    )) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_retry_eligibility_check
    CHECK (
      retry_eligible IS NOT TRUE
      OR failure_category IS NOT DISTINCT FROM 'rate_limited'
      OR failure_category IS NOT DISTINCT FROM 'provider_unavailable'
      OR failure_category IS NOT DISTINCT FROM 'network_failure'
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_cost_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         estimated_cost_micros, actual_cost_micros, cost_currency,
         pricing_assumption_version
       ) = 0)
      OR (status IS DISTINCT FROM 'draft'
          AND (estimated_cost_micros IS NULL OR estimated_cost_micros >= 0)
          AND (actual_cost_micros IS NULL OR actual_cost_micros >= 0)
          AND (
            (estimated_cost_micros IS NULL
             AND actual_cost_micros IS NULL
             AND cost_currency IS NULL
             AND pricing_assumption_version IS NULL)
            OR ((estimated_cost_micros IS NOT NULL
                 OR actual_cost_micros IS NOT NULL)
                AND cost_currency IS NOT NULL
                AND cost_currency ~ '^[A-Z]{3}$'
                AND pricing_assumption_version IS NOT NULL
                AND btrim(pricing_assumption_version) <> '')
          ))
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_first_preview_request_profile_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft'
       AND num_nonnulls(
         provider_name, model_name, provider_endpoint, request_image_count,
         request_streaming, request_partial_images, request_size,
         request_quality, output_format, moderation_mode
       ) = 0)
      OR (
        status IS DISTINCT FROM 'draft'
        AND provider_name IS NOT DISTINCT FROM 'openai'
        AND model_name IS NOT DISTINCT FROM 'gpt-image-2-2026-04-21'
        AND provider_endpoint IS NOT DISTINCT FROM '/v1/images/generations'
        AND request_image_count IS NOT DISTINCT FROM 1
        AND request_streaming IS NOT DISTINCT FROM false
        AND request_partial_images IS NOT DISTINCT FROM 0
        AND request_size IS NOT DISTINCT FROM '1024x1024'
        AND request_quality IS NOT DISTINCT FROM 'medium'
        AND output_format IS NOT DISTINCT FROM 'png'
        AND moderation_mode IS NOT DISTINCT FROM 'auto'
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_provider_request_identity_check
    CHECK (
      (status IS NOT DISTINCT FROM 'draft' AND provider_request_id IS NULL)
      OR (status IS DISTINCT FROM 'draft' AND (
            provider_request_id IS NULL
            OR (provider_name IS NOT DISTINCT FROM 'openai'
                AND btrim(provider_request_id) <> '')
          ))
    ) NOT VALID;
```

The complete Provider group represents the already approved OpenAI Image API
profile: `/v1/images/generations`, exactly one final image, non-streaming, zero
partial images, pinned `gpt-image-2-2026-04-21`, 1024x1024, medium, PNG, and
`moderation=auto`. It does not invent a second Provider mode. A wholly NULL
group is permitted only on the exact staged `status = 'draft'` row; every
non-staged row requires the complete exact group, and any partial or mismatched
group is rejected.

The feedback-regeneration label does not create a feedback flow. That future
lineage remains disabled until a separately approved feedback persistence and
authorization design exists.

### 23.4 Output checks, staged as NOT VALID

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_integrity_shape_check
    CHECK (
      num_nonnulls(
        mime_type, byte_size, width_px, height_px, content_sha256
      ) = 0
      OR (
        mime_type IS NOT DISTINCT FROM 'image/png'
        AND byte_size IS NOT NULL
        AND byte_size BETWEEN 1 AND 16777216
        AND width_px IS NOT DISTINCT FROM 1024
        AND height_px IS NOT DISTINCT FROM 1024
        AND content_sha256 IS NOT NULL
        AND content_sha256 ~ '^[0-9a-f]{64}$'
      )
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_asset_persistence_check
    CHECK (
      asset_created_at IS NULL
      OR (bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> '')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_asset_validation_status_check
    CHECK (
      asset_validation_status IS NULL
      OR asset_validation_status IN ('pending', 'passed', 'failed')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_asset_validation_consistency_check
    CHECK (
      (asset_validation_status IS NULL
       AND asset_validation_evidence IS NULL
       AND asset_validated_at IS NULL
       AND num_nonnulls(
         mime_type, byte_size, width_px, height_px, content_sha256
       ) = 0)
      OR (asset_validation_status IS NOT DISTINCT FROM 'pending'
          AND asset_created_at IS NOT NULL
          AND bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> ''
          AND asset_validation_evidence IS NULL
          AND asset_validated_at IS NULL
          AND num_nonnulls(
            mime_type, byte_size, width_px, height_px, content_sha256
          ) = 0)
      OR (asset_validation_status IS NOT DISTINCT FROM 'failed'
          AND asset_created_at IS NOT NULL
          AND bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> ''
          AND asset_validation_evidence IS NOT NULL
          AND jsonb_typeof(asset_validation_evidence) IS NOT DISTINCT FROM 'object'
          AND asset_validation_evidence <> '{}'::jsonb
          AND asset_validated_at IS NULL
          AND num_nonnulls(
            mime_type, byte_size, width_px, height_px, content_sha256
          ) = 0)
      OR (asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_created_at IS NOT NULL
          AND bucket_name IS NOT NULL
          AND btrim(bucket_name) <> ''
          AND object_path IS NOT NULL
          AND btrim(object_path) <> ''
          AND asset_validation_evidence IS NOT NULL
          AND jsonb_typeof(asset_validation_evidence) IS NOT DISTINCT FROM 'object'
          AND asset_validation_evidence <> '{}'::jsonb
          AND asset_validated_at IS NOT NULL
          AND asset_validated_at >= asset_created_at
          AND mime_type IS NOT DISTINCT FROM 'image/png'
          AND byte_size IS NOT NULL
          AND byte_size BETWEEN 1 AND 16777216
          AND width_px IS NOT DISTINCT FROM 1024
          AND height_px IS NOT DISTINCT FROM 1024
          AND content_sha256 IS NOT NULL
          AND content_sha256 ~ '^[0-9a-f]{64}$')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_automatic_gate_status_check
    CHECK (
      automatic_gate_status IS NULL
      OR automatic_gate_status IN ('pending', 'passed', 'failed')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_automatic_gate_consistency_check
    CHECK (
      (automatic_gate_status IS NULL
       AND automatic_gate_evidence IS NULL
       AND automatic_gate_policy_version IS NULL
       AND automatic_gate_passed_at IS NULL)
      OR (automatic_gate_status IS NOT DISTINCT FROM 'pending'
          AND asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_validated_at IS NOT NULL
          AND automatic_gate_policy_version IS NOT NULL
          AND btrim(automatic_gate_policy_version) <> ''
          AND automatic_gate_evidence IS NULL
          AND automatic_gate_passed_at IS NULL)
      OR (automatic_gate_status IS NOT DISTINCT FROM 'failed'
          AND asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_validated_at IS NOT NULL
          AND automatic_gate_policy_version IS NOT NULL
          AND btrim(automatic_gate_policy_version) <> ''
          AND automatic_gate_evidence IS NOT NULL
          AND jsonb_typeof(automatic_gate_evidence) IS NOT DISTINCT FROM 'object'
          AND automatic_gate_evidence <> '{}'::jsonb
          AND automatic_gate_passed_at IS NULL)
      OR (automatic_gate_status IS NOT DISTINCT FROM 'passed'
          AND asset_validation_status IS NOT DISTINCT FROM 'passed'
          AND asset_validated_at IS NOT NULL
          AND automatic_gate_policy_version IS NOT NULL
          AND btrim(automatic_gate_policy_version) <> ''
          AND automatic_gate_evidence IS NOT NULL
          AND jsonb_typeof(automatic_gate_evidence) IS NOT DISTINCT FROM 'object'
          AND automatic_gate_evidence <> '{}'::jsonb
          AND automatic_gate_passed_at IS NOT NULL
          AND automatic_gate_passed_at >= asset_validated_at)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_readiness_status_check
    CHECK (
      readiness_status IS NULL
      OR readiness_status IN ('not_ready', 'first_preview_ready', 'revoked')
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_current_preview_consistency_check
    CHECK (
      is_current_customer_preview IS NOT TRUE
      OR readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_readiness_timestamp_state_check
    CHECK (
      (readiness_status IS NULL
       AND first_preview_ready_at IS NULL
       AND readiness_revoked_at IS NULL)
      OR (readiness_status IS NOT DISTINCT FROM 'not_ready'
          AND first_preview_ready_at IS NULL
          AND readiness_revoked_at IS NULL)
      OR (readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
          AND first_preview_ready_at IS NOT NULL
          AND readiness_revoked_at IS NULL)
      OR (readiness_status IS NOT DISTINCT FROM 'revoked'
          AND first_preview_ready_at IS NOT NULL
          AND readiness_revoked_at IS NOT NULL
          AND readiness_revoked_at >= first_preview_ready_at
          AND is_current_customer_preview IS NOT TRUE)
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_readiness_chronology_check
    CHECK (
      (asset_validated_at IS NULL
       OR (asset_created_at IS NOT NULL AND asset_validated_at >= asset_created_at))
      AND (automatic_gate_passed_at IS NULL
           OR (asset_validated_at IS NOT NULL
               AND automatic_gate_passed_at >= asset_validated_at))
      AND (first_preview_ready_at IS NULL
           OR (automatic_gate_passed_at IS NOT NULL
               AND first_preview_ready_at >= automatic_gate_passed_at))
      AND (readiness_revoked_at IS NULL
           OR (first_preview_ready_at IS NOT NULL
               AND readiness_revoked_at >= first_preview_ready_at))
    ) NOT VALID,
  ADD CONSTRAINT ai_sketch_outputs_ready_evidence_check
    CHECK (
      (readiness_status IS DISTINCT FROM 'first_preview_ready'
       AND readiness_status IS DISTINCT FROM 'revoked')
      OR (
        asset_validation_status IS NOT DISTINCT FROM 'passed'
        AND asset_validation_evidence IS NOT NULL
        AND jsonb_typeof(asset_validation_evidence) IS NOT DISTINCT FROM 'object'
        AND asset_validation_evidence <> '{}'::jsonb
        AND automatic_gate_status IS NOT DISTINCT FROM 'passed'
        AND automatic_gate_evidence IS NOT NULL
        AND jsonb_typeof(automatic_gate_evidence) IS NOT DISTINCT FROM 'object'
        AND automatic_gate_evidence <> '{}'::jsonb
        AND automatic_gate_policy_version IS NOT NULL
        AND btrim(automatic_gate_policy_version) <> ''
        AND asset_created_at IS NOT NULL
        AND asset_validated_at IS NOT NULL
        AND asset_validated_at >= asset_created_at
        AND automatic_gate_passed_at IS NOT NULL
        AND automatic_gate_passed_at >= asset_validated_at
        AND first_preview_ready_at IS NOT NULL
        AND first_preview_ready_at >= automatic_gate_passed_at
        AND object_path IS NOT NULL
        AND btrim(object_path) <> ''
        AND bucket_name IS NOT NULL
        AND btrim(bucket_name) <> ''
        AND mime_type IS NOT DISTINCT FROM 'image/png'
        AND byte_size IS NOT NULL
        AND byte_size BETWEEN 1 AND 16777216
        AND width_px IS NOT DISTINCT FROM 1024
        AND height_px IS NOT DISTINCT FROM 1024
        AND content_sha256 IS NOT NULL
        AND content_sha256 ~ '^[0-9a-f]{64}$'
      )
    ) NOT VALID;
```

These checks are defense in depth. They cannot prove private Storage posture,
trusted evidence producers, current access eligibility, or safe serialization;
future server code must verify those independently. The readiness transaction
sets `asset_created_at` only after successful private persistence, records
asset validation and gate evaluation as atomic total status/evidence groups,
and never writes a pass timestamp independently from its `passed` status. A
revocation transaction transitions an already-ready row while preserving its
ready timestamp and evidence. A later application/persistence Agent must switch
the current pointer transactionally: clear the old current pointer and select
one already-ready replacement without changing either output's readiness.

### 23.5 Composite consistency targets and foreign keys

Blocked until B06, B16, and B19 all pass. The supporting unique indexes make
the same-brief identities referenceable. The composite output FK durably
requires output/job Concept Brief agreement. The parent FK requires the same
brief plus exact parent purpose/attempt, and the source FK requires the source
output to belong to that same parent job and brief. The strictly increasing
attempt CHECK prevents cycles; these are enforceable future-write guards, not
one-time aggregate assumptions.

CANDIDATE ONLY — DO NOT EXECUTE

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_id_brief_uidx
  ON public.ai_sketch_jobs (id, concept_brief_id);

CREATE UNIQUE INDEX ai_sketch_jobs_parent_lineage_target_uidx
  ON public.ai_sketch_jobs (
    id, concept_brief_id, generation_purpose, attempt_number
  );

CREATE UNIQUE INDEX ai_sketch_outputs_source_target_uidx
  ON public.ai_sketch_outputs (id, job_id, concept_brief_id);

ALTER TABLE public.ai_sketch_outputs
  ADD CONSTRAINT ai_sketch_outputs_job_brief_fkey
  FOREIGN KEY (job_id, concept_brief_id)
  REFERENCES public.ai_sketch_jobs (id, concept_brief_id)
  NOT VALID;

ALTER TABLE public.ai_sketch_jobs
  ADD CONSTRAINT ai_sketch_jobs_parent_lineage_fkey
  FOREIGN KEY (
    parent_job_id, concept_brief_id,
    parent_generation_purpose, parent_attempt_number
  )
  REFERENCES public.ai_sketch_jobs (
    id, concept_brief_id, generation_purpose, attempt_number
  )
  NOT VALID,
  ADD CONSTRAINT ai_sketch_jobs_source_output_lineage_fkey
  FOREIGN KEY (source_output_id, parent_job_id, concept_brief_id)
  REFERENCES public.ai_sketch_outputs (id, job_id, concept_brief_id)
  NOT VALID;
```

### 23.6 Unique and support indexes

Every unique index is blocked until its named duplicate preflight returns zero.
No `CREATE UNIQUE INDEX` should be run in the same unreviewed step as column
creation.

CANDIDATE ONLY — DO NOT EXECUTE

```sql
CREATE UNIQUE INDEX ai_sketch_jobs_idempotency_key_uidx
  ON public.ai_sketch_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX ai_sketch_jobs_attempt_identity_uidx
  ON public.ai_sketch_jobs (concept_brief_id, attempt_number)
  WHERE attempt_number IS NOT NULL;

CREATE UNIQUE INDEX ai_sketch_jobs_provider_request_uidx
  ON public.ai_sketch_jobs (provider_name, provider_request_id)
  WHERE provider_name IS NOT NULL AND provider_request_id IS NOT NULL;

CREATE UNIQUE INDEX ai_sketch_jobs_one_active_purpose_uidx
  ON public.ai_sketch_jobs (concept_brief_id, generation_purpose)
  WHERE status IN ('queued', 'processing');

CREATE UNIQUE INDEX ai_sketch_outputs_one_per_job_uidx
  ON public.ai_sketch_outputs (job_id);

CREATE UNIQUE INDEX ai_sketch_outputs_one_current_customer_preview_uidx
  ON public.ai_sketch_outputs (concept_brief_id)
  WHERE is_current_customer_preview IS TRUE;

CREATE INDEX ai_sketch_jobs_parent_job_id_idx
  ON public.ai_sketch_jobs (parent_job_id)
  WHERE parent_job_id IS NOT NULL;

CREATE INDEX ai_sketch_outputs_readiness_lookup_idx
  ON public.ai_sketch_outputs (concept_brief_id, readiness_status);

CREATE INDEX ai_sketch_reviews_ai_sketch_output_id_idx
  ON public.ai_sketch_reviews (ai_sketch_output_id);
```

The one-active-purpose index is additionally blocked on B01 and an owner-approved
mapping of active statuses. The one-output-per-job index also supplies the
currently missing `job_id` lookup index.

### 23.7 Constraint validation is a separate gate

CANDIDATE ONLY — DO NOT EXECUTE

```sql
ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_status_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_attempt_policy_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_reserved_identity_completeness_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_lineage_shape_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_hash_format_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_attempt_timing_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_terminal_timestamp_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_status_terminal_consistency_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_failure_category_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_retry_eligibility_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_cost_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_first_preview_request_profile_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_provider_request_identity_check;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_parent_lineage_fkey;

ALTER TABLE public.ai_sketch_jobs
  VALIDATE CONSTRAINT ai_sketch_jobs_source_output_lineage_fkey;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_job_brief_fkey;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_integrity_shape_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_asset_persistence_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_asset_validation_status_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_asset_validation_consistency_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_automatic_gate_status_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_automatic_gate_consistency_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_readiness_status_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_current_preview_consistency_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_readiness_timestamp_state_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_readiness_chronology_check;

ALTER TABLE public.ai_sketch_outputs
  VALIDATE CONSTRAINT ai_sketch_outputs_ready_evidence_check;
```

### 23.8 NULL truth-table review result

The corrected candidate CHECKs were manually reviewed under PostgreSQL's rule
that TRUE and NULL both satisfy a CHECK. Every invalid case below is forced to
FALSE by an explicit branch or total predicate; corresponding B13/B14/B16
counts use explicit NULL-aware violation conditions.

| Case | Expected result |
| --- | --- |
| All new job fields NULL with `status = 'draft'` | Permitted as the one exact fail-closed legacy/pre-reservation state |
| `draft` with started or deadline evidence | Rejected |
| `draft` with completed, failed, timed-out, cancelled, retry, terminal-reason, or Provider evidence | Rejected |
| Any non-`draft` status with all identity fields NULL | Rejected |
| Terminal timestamp or terminal evidence on `queued`/`processing` | Rejected |
| `succeeded` without complete identity/profile, start/deadline, or completion evidence | Rejected |
| Purpose NULL, attempt populated | Rejected |
| Purpose populated, attempt NULL | Rejected |
| Provider group all NULL | Permitted only for exact staged `draft` |
| Provider group all NULL or partially populated on non-staged status | Rejected |
| Asset validation timestamp without passed status, bounded evidence, persistence, and complete integrity facts | Rejected |
| Gate status `passed` without passed asset validation, policy, evidence, or pass timestamp | Rejected |
| Gate pass timestamp with NULL, pending, or failed gate status | Rejected |
| Readiness status NULL, readiness evidence NULL | Permitted as not ready; current must be false |
| Readiness status populated as ready, any critical evidence NULL | Rejected |
| Validated asset or failed/passed gate evidence with readiness NULL or `not_ready` | Permitted when its own status/evidence group is complete; it does not establish ready/current |
| Ready and current | Permitted when all evidence and chronology pass |
| Ready and non-current | Permitted and required for history/replacement |
| Current and not ready, NULL, or revoked | Rejected |
| Revoked after a retained ready timestamp/evidence, later revocation time, non-current | Permitted |
| Revoked without prior ready timestamp/evidence | Rejected |
| Validation before asset creation, gate before validation, ready before gate, or revoke before ready | Rejected |

This document contains **30 owner-run SELECT-only preflight blocks** (M01-M06,
B01-B19, and V01-V05) and **7 candidate-only SQL blocks** (23.1-23.7). Those
counts produce **37 total SQL blocks** and are normative for this corrected
revision. They must match parser-based validation before commit.

## 24. Statement-by-statement prerequisites

| Candidate | Required evidence | Exact pass condition | Fail-closed condition |
| --- | --- | --- | --- |
| Job additive columns | Q02 confirms names absent; later lock/size review | No name/type conflict | Any conflict or unsafe operational window |
| Output additive columns | Q02 confirms names absent; later lock/size review | No name/type conflict; `false` is accepted fail-closed legacy value | Any conflict or different approved readiness model |
| Job status CHECK | B01 and B13 | Every current status is in the exact set and semantics are approved | Any unknown or incompatible value |
| Other job CHECKs | B13 | Every violation count is zero | Any nonzero count |
| Output CHECKs | B14 | Every violation count is zero | Any nonzero count |
| Composite output/job FK | B06 and B19 | Mismatch, missing-target, and duplicate-target counts are zero | Any nonzero count |
| Composite lineage/source FKs | B16 and B19 | Every lineage/source and duplicate-target count is zero | Any missing/cross-brief target, invalid transition, cycle, or duplicate |
| Idempotency unique index | B09 | Zero duplicate keys | Any duplicate |
| Attempt unique index | B10 | Zero duplicate attempt identities | Any duplicate |
| Provider-request unique index | B12 | Zero duplicate provider identities | Any duplicate |
| Active-purpose unique index | B01 and B18 | Zero active duplicates and exact predicate approved | Ambiguous status or duplicate |
| One-output-per-job unique index | B04 and B15 | No job has more than one output | Any multi-output job |
| Current-preview unique index | B11 | Zero duplicate current briefs | Any duplicate |
| Review output support index | Q05 | Index remains absent; operational lock plan accepted | Existing equivalent index or unsafe window |
| Constraint validation | Matching B06/B13/B14/B16/B19 | All relevant counts zero after new writer population | Any violation or incomplete rollout |

## 25. Blocked candidate statements

All candidate SQL is unexecuted and requires a separate approval. Specifically
blocked on row evidence are the job status CHECK, all constraint validations,
all unique indexes, all composite FK validations, any future `NOT NULL` hardening,
any default change, and any reinterpretation of `pending_review`. No backfill,
destructive statement, review-status change, access-control mutation, or
Storage mutation is included.

## 26. Post-execution metadata verification queries

These are for a future owner-run verification only after separately authorized
SQL execution.

### V01 - Added columns

Purpose: verify exact types/nullability/defaults. Pass: the reviewed candidate
set appears exactly once with no unexpected default. Fail closed: any mismatch.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('ai_sketch_jobs', 'ai_sketch_outputs')
  AND column_name IN (
    'generation_purpose', 'idempotency_key', 'attempt_number',
    'lineage_identity', 'parent_job_id', 'parent_generation_purpose',
    'parent_attempt_number', 'source_output_id',
    'design_spec_version', 'design_spec_hash',
    'hand_sketch_instruction_version', 'hand_sketch_instruction_hash',
    'provider_name', 'provider_request_id', 'provider_endpoint',
    'request_image_count', 'request_streaming', 'request_partial_images',
    'request_size', 'request_quality',
    'output_format', 'moderation_mode', 'started_at', 'deadline_at',
    'completed_at', 'cancelled_at', 'timed_out_at', 'failure_category',
    'retry_eligible', 'terminal_reason', 'estimated_cost_micros',
    'actual_cost_micros', 'cost_currency', 'pricing_assumption_version',
    'mime_type', 'byte_size', 'width_px', 'height_px', 'content_sha256',
    'asset_created_at', 'asset_validation_status',
    'asset_validation_evidence', 'asset_validated_at',
    'automatic_gate_status', 'automatic_gate_evidence',
    'automatic_gate_policy_version',
    'automatic_gate_passed_at', 'readiness_status',
    'first_preview_ready_at', 'readiness_revoked_at',
    'is_current_customer_preview'
  )
ORDER BY table_name, ordinal_position;
```

### V02 - Added constraints and validation state

Purpose: verify exact definitions and validation state. Pass: every approved
constraint matches the reviewed SQL and expected phase. Fail closed: missing,
unexpected, invalid, or prematurely validated constraints.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  rel.relname AS table_name,
  con.conname AS constraint_name,
  con.convalidated AS is_validated,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS exact_definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
JOIN pg_catalog.pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'public'
  AND rel.relname IN ('ai_sketch_jobs', 'ai_sketch_outputs')
  AND (con.conname LIKE 'ai_sketch_jobs_%' OR con.conname LIKE 'ai_sketch_outputs_%')
ORDER BY rel.relname, con.conname;
```

### V03 - Added indexes

Purpose: verify exact definitions and valid/ready/live state. Pass: only the
approved indexes exist and all are valid, ready, and live. Fail closed: any
mismatch or invalid state.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  table_rel.relname AS table_name,
  index_rel.relname AS index_name,
  idx.indisunique AS is_unique,
  idx.indisvalid AS is_valid,
  idx.indisready AS is_ready,
  idx.indislive AS is_live,
  pg_catalog.pg_get_indexdef(index_rel.oid) AS exact_definition
FROM pg_catalog.pg_index idx
JOIN pg_catalog.pg_class table_rel ON table_rel.oid = idx.indrelid
JOIN pg_catalog.pg_namespace ns ON ns.oid = table_rel.relnamespace
JOIN pg_catalog.pg_class index_rel ON index_rel.oid = idx.indexrelid
WHERE ns.nspname = 'public'
  AND index_rel.relname IN (
    'ai_sketch_jobs_idempotency_key_uidx',
    'ai_sketch_jobs_attempt_identity_uidx',
    'ai_sketch_jobs_provider_request_uidx',
    'ai_sketch_jobs_one_active_purpose_uidx',
    'ai_sketch_outputs_one_per_job_uidx',
    'ai_sketch_outputs_one_current_customer_preview_uidx',
    'ai_sketch_jobs_id_brief_uidx',
    'ai_sketch_jobs_parent_lineage_target_uidx',
    'ai_sketch_outputs_source_target_uidx',
    'ai_sketch_jobs_parent_job_id_idx',
    'ai_sketch_outputs_readiness_lookup_idx',
    'ai_sketch_reviews_ai_sketch_output_id_idx'
  )
ORDER BY table_name, index_name;
```

## 27. Post-execution aggregate verification queries

### V04 - Readiness integrity and chronology

Purpose: prove no row violates bidirectional asset validation or gate evidence,
output-bound ready, one-way current, revocation, retained-evidence, or
timestamp-order rules. Pass: all counts zero. Fail closed: any nonzero count and
no customer rollout.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  count(*) FILTER (WHERE asset_validation_status IS NOT NULL AND asset_validation_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_asset_validation_status_count,
  count(*) FILTER (
    WHERE asset_created_at IS NOT NULL
      AND (
        bucket_name IS NULL OR btrim(bucket_name) = ''
        OR object_path IS NULL OR btrim(object_path) = ''
      )
  ) AS invalid_asset_persistence_count,
  count(*) FILTER (
    WHERE (asset_validation_status IS NULL AND (
             asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'pending' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NOT NULL
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'failed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NOT NULL
             OR num_nonnulls(
                  mime_type, byte_size, width_px, height_px, content_sha256
                ) <> 0
           ))
       OR (asset_validation_status IS NOT DISTINCT FROM 'passed' AND (
             asset_created_at IS NULL
             OR bucket_name IS NULL OR btrim(bucket_name) = ''
             OR object_path IS NULL OR btrim(object_path) = ''
             OR asset_validation_evidence IS NULL
             OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
             OR asset_validation_evidence = '{}'::jsonb
             OR asset_validated_at IS NULL
             OR asset_validated_at < asset_created_at
             OR mime_type IS DISTINCT FROM 'image/png'
             OR byte_size IS NULL OR byte_size NOT BETWEEN 1 AND 16777216
             OR width_px IS DISTINCT FROM 1024
             OR height_px IS DISTINCT FROM 1024
             OR content_sha256 IS NULL
             OR content_sha256 !~ '^[0-9a-f]{64}$'
           ))
  ) AS invalid_asset_validation_consistency_count,
  count(*) FILTER (WHERE automatic_gate_status IS NOT NULL AND automatic_gate_status NOT IN (
    'pending', 'passed', 'failed'
  )) AS invalid_gate_status_count,
  count(*) FILTER (
    WHERE (automatic_gate_status IS NULL AND (
             automatic_gate_policy_version IS NOT NULL
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'pending' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NOT NULL
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'failed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NOT NULL
           ))
       OR (automatic_gate_status IS NOT DISTINCT FROM 'passed' AND (
             asset_validation_status IS DISTINCT FROM 'passed'
             OR asset_validated_at IS NULL
             OR automatic_gate_policy_version IS NULL
             OR btrim(automatic_gate_policy_version) = ''
             OR automatic_gate_evidence IS NULL
             OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
             OR automatic_gate_evidence = '{}'::jsonb
             OR automatic_gate_passed_at IS NULL
             OR automatic_gate_passed_at < asset_validated_at
           ))
  ) AS invalid_automatic_gate_consistency_count,
  count(*) FILTER (
    WHERE (readiness_status IS NOT DISTINCT FROM 'first_preview_ready'
           OR readiness_status IS NOT DISTINCT FROM 'revoked')
      AND (
        asset_validation_status IS DISTINCT FROM 'passed'
        OR asset_validation_evidence IS NULL
        OR jsonb_typeof(asset_validation_evidence) IS DISTINCT FROM 'object'
        OR asset_validation_evidence = '{}'::jsonb
        OR automatic_gate_status IS DISTINCT FROM 'passed'
        OR automatic_gate_evidence IS NULL
        OR jsonb_typeof(automatic_gate_evidence) IS DISTINCT FROM 'object'
        OR automatic_gate_evidence = '{}'::jsonb
        OR automatic_gate_policy_version IS NULL
        OR btrim(automatic_gate_policy_version) = ''
        OR asset_created_at IS NULL
        OR asset_validated_at IS NULL
        OR asset_validated_at < asset_created_at
        OR automatic_gate_passed_at IS NULL
        OR automatic_gate_passed_at < asset_validated_at
        OR first_preview_ready_at IS NULL
        OR object_path IS NULL
        OR btrim(object_path) = ''
        OR bucket_name IS NULL
        OR btrim(bucket_name) = ''
        OR mime_type IS DISTINCT FROM 'image/png'
        OR byte_size IS NULL
        OR byte_size NOT BETWEEN 1 AND 16777216
        OR width_px IS DISTINCT FROM 1024
        OR height_px IS DISTINCT FROM 1024
        OR content_sha256 IS NULL
        OR content_sha256 !~ '^[0-9a-f]{64}$'
      )
  ) AS invalid_ready_or_revoked_evidence_count,
  count(*) FILTER (
    WHERE is_current_customer_preview IS TRUE
      AND readiness_status IS DISTINCT FROM 'first_preview_ready'
  ) AS invalid_current_count,
  count(*) FILTER (
    WHERE readiness_status IS NOT DISTINCT FROM 'revoked'
      AND (
        first_preview_ready_at IS NULL
        OR readiness_revoked_at IS NULL
        OR readiness_revoked_at < first_preview_ready_at
        OR is_current_customer_preview IS TRUE
      )
  ) AS invalid_revocation_count,
  count(*) FILTER (
    WHERE (readiness_status IS DISTINCT FROM 'revoked' AND readiness_revoked_at IS NOT NULL)
       OR (readiness_status IS NOT DISTINCT FROM 'revoked' AND readiness_revoked_at IS NULL)
       OR (readiness_status IS DISTINCT FROM 'first_preview_ready'
           AND readiness_status IS DISTINCT FROM 'revoked'
           AND first_preview_ready_at IS NOT NULL)
  ) AS invalid_readiness_timestamp_state_count,
  count(*) FILTER (
    WHERE (asset_validated_at IS NOT NULL
           AND (asset_created_at IS NULL OR asset_validated_at < asset_created_at))
       OR (automatic_gate_passed_at IS NOT NULL
           AND (asset_validated_at IS NULL OR automatic_gate_passed_at < asset_validated_at))
       OR (first_preview_ready_at IS NOT NULL
           AND (automatic_gate_passed_at IS NULL OR first_preview_ready_at < automatic_gate_passed_at))
       OR (readiness_revoked_at IS NOT NULL
           AND (first_preview_ready_at IS NULL OR readiness_revoked_at < first_preview_ready_at))
  ) AS invalid_chronology_count
FROM public.ai_sketch_outputs;
```

### V05 - Duplicate invariants

Purpose: reconfirm idempotency, attempts, provider requests, output cardinality,
and current selection without returning identities. Pass: every count zero.
Fail closed: any nonzero count.

OWNER-RUN SELECT-ONLY PREFLIGHT — DO NOT EXECUTE IN THIS AGENT

```sql
SELECT
  (SELECT count(*) FROM (
    SELECT idempotency_key FROM public.ai_sketch_jobs
    WHERE idempotency_key IS NOT NULL GROUP BY idempotency_key HAVING count(*) > 1
  ) d) AS duplicate_idempotency_count,
  (SELECT count(*) FROM (
    SELECT concept_brief_id, attempt_number FROM public.ai_sketch_jobs
    WHERE attempt_number IS NOT NULL GROUP BY concept_brief_id, attempt_number HAVING count(*) > 1
  ) d) AS duplicate_attempt_count,
  (SELECT count(*) FROM (
    SELECT provider_name, provider_request_id FROM public.ai_sketch_jobs
    WHERE provider_name IS NOT NULL AND provider_request_id IS NOT NULL
    GROUP BY provider_name, provider_request_id HAVING count(*) > 1
  ) d) AS duplicate_provider_request_count,
  (SELECT count(*) FROM (
    SELECT concept_brief_id, generation_purpose FROM public.ai_sketch_jobs
    WHERE generation_purpose IS NOT NULL AND status IN ('queued', 'processing')
    GROUP BY concept_brief_id, generation_purpose HAVING count(*) > 1
  ) d) AS duplicate_active_purpose_count,
  (SELECT count(*) FROM (
    SELECT job_id FROM public.ai_sketch_outputs GROUP BY job_id HAVING count(*) > 1
  ) d) AS multi_output_job_count,
  (SELECT count(*) FROM (
    SELECT concept_brief_id FROM public.ai_sketch_outputs
    WHERE is_current_customer_preview IS TRUE
    GROUP BY concept_brief_id HAVING count(*) > 1
  ) d) AS duplicate_current_preview_count,
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id HAVING count(*) > 1
  ) d) AS duplicate_job_brief_target_count,
  (SELECT count(*) FROM (
    SELECT id, concept_brief_id, generation_purpose, attempt_number
    FROM public.ai_sketch_jobs
    GROUP BY id, concept_brief_id, generation_purpose, attempt_number
    HAVING count(*) > 1
  ) d) AS duplicate_parent_lineage_target_count,
  (SELECT count(*) FROM (
    SELECT id, job_id, concept_brief_id FROM public.ai_sketch_outputs
    GROUP BY id, job_id, concept_brief_id HAVING count(*) > 1
  ) d) AS duplicate_source_output_target_count;
```

## 28. Roll-forward and recovery principles

- Prefer additive nullable columns and staged constraints.
- Treat null readiness as not ready; never fabricate legacy readiness.
- Preserve ready/non-current history. Current selection is a one-way pointer to
  an already-ready output and must be changed atomically in a later writer.
- Roll forward by correcting future writers or adding a reviewed constraint;
  do not delete rows or rewrite evidence history.
- Disable future writes/customer visibility before any incident response.
- Preserve jobs, outputs, review history, automatic evidence, and audit times.
- Do not include destructive rollback SQL. Dropping columns, constraints, or
  indexes requires a separate dependency review and approval.
- Access-control remediation remains a separate scope after effective privilege
  evidence is complete.

## 29. Explicit no-execution statement

No SQL was executed. No Supabase connection was made. No business/customer row
was inspected. No schema, RLS, policy, grant, Storage, provider, environment,
route, UI, deployment, or Production action occurred. All SQL is unexecuted
documentation for later owner review.

## 30. Recommended later Agent sequence

1. Third independent read-only formal Re-Review of corrected Draft PR #198.
2. Only after that review passes, the owner manually executes separately approved supplemental `SELECT`-only
   metadata and aggregate preflights.
3. A later documentation Agent reconciles the returned supplemental evidence
   and regenerates any blocked predicate or statement if required.
4. A separately approved SQL execution Agent executes only explicitly
   authorized additive SQL.
5. Owner runs post-execution metadata and aggregate verification.
6. A separate Agent implements private generated-asset Storage and secure
   server-mediated or short-lived signed access.
7. A separate provider/environment Agent constructs the real provider client,
   handles credentials, and enforces budget, limiter, and call authorization.
8. A separate Agent wires generation only after confirmed persistence.
9. A separate Agent implements trusted automatic readiness gates.
10. A separate Agent implements the customer First Preview route/UI.
11. A separate Agent integrates post-preview human review and correction.

No later stage is approved or implemented by Agent 70B-2.
