-- PR287-F5-P1-D1-I1 SOURCE CANDIDATE ONLY. UNEXECUTED.
-- INSTALLATION / ACTIVATION BLOCKED. This file is not migration authorization.
-- F2 supplied metadata: novora-production / pzjypjddmrngdnrjbhsw,
-- PostgreSQL 17.6, postgres-owned application tables, extensions.pgcrypto.
-- No live metadata was queried during this source-only gate.
-- Basis: accepted D1 design and D2 Brief/contact/job catalog evidence.
-- Install only through a separately authorized privileged migration actor:
-- runtime service_role has public USAGE, but NOT public CREATE.
-- Reuses existing ai_sketch_jobs_id_brief_uidx(id, concept_brief_id).
-- Existing job/lineage constraints are retained; targeted ACL reconciliation
-- below remains unexecuted and requires coordinated application migration.
-- BEFORE INSTALLATION: verify output-readiness columns (repository evidence only
-- in D2), reconcile legacy API writers/backfill separately, and validate this
-- candidate on a separately authorized synthetic PostgreSQL instance.
-- No historical intent creation, customer-row backfill or ledger initialization.
-- BEFORE RUNTIME INTEGRATION: verify actual Redis resource/shared database and
-- multi-key atomicity. Fresh public admission AND independent O1 must precede
-- generation publication; fresh combined atomic admission must precede Provider
-- dispatch. SQL cannot verify Redis or Provider billing. The F5-I1 candidate
-- below authenticates JavaScript preparation bytes only; it is NOT admission.
-- Private grant/recovery inputs below are trusted server-only protocol assertions,
-- NOT client permits or proof that those external gates have been implemented.
-- Unconfigured replay policy disables claims/transitions. No numeric defaults.
-- Existing O1 pool/charges/limits remain untouched. Unknown paid outcome retains
-- full reservation/concurrency protection; no automatic release or Provider retry.
-- Queue/scheduler/config/caller integration and PR288 remain separate gates.
-- F5-I1: UNEXECUTED SOURCE CANDIDATE, NOT F5 P1 closure. No key is created,
-- configured, accepted from a caller, returned, or logged. Key resolution below
-- is private; an empty key/binding registry denies all runtime preparation.
-- BLOCKING PREREQUISITES BEFORE ACTIVATION (separate authorization/evidence):
-- * isolated Vercel JavaScript signer reading authoritative Brief/claim data,
--   using prepareFirstPreviewHmacEnvelopeCandidate and no generic signing oracle;
-- * a protected >=32-byte shared HMAC key and key-id lifecycle. Intake/workers,
--   service_role, RPC callers, Queue and Redis must not read/configure the key;
-- * separately provision NOLOGIN novora_fp_owner, novora_fp_executor,
--   novora_fp_intake_executor and novora_fp_verifier, plus independently
--   authenticated dedicated LOGIN signer/worker roles. This file creates NONE.
--   All must be NOSUPERUSER/NOCREATEROLE/NOCREATEDB/NOREPLICATION/NOBYPASSRLS;
--   runtime roles must have no memberships in either direction, no owned
--   persistent objects, no DDL/trigger/replication authority, and no table writes;
-- * a private verification-only database boundary with a narrowly owned key
--   store. HMAC verification necessarily holds the same symmetric secret. Do NOT
--   give runtime roles SELECT on a key table or EXECUTE on a key-returning RPC;
-- * verify pgcrypto location/privileges (candidate uses extensions.hmac), RPC
--   EXECUTE, schema USAGE/CREATE, function ownership/replacement and role inheritance;
-- * replace/reconcile broad service_role table grants and guard EVERY alternate
--   Brief/source/job/outbox write path. The outbox preparation guard below is
--   necessary but cannot constrain privileged bypass/trigger disabling or prove
--   existing job/source writers safe. Freeze accepted source/job identity across
--   downstream publication/dispatch, with coordinated legitimate edit handling;
-- * actual Redis compatibility and independent O1 remain unverified/unmodified.
-- * REQUIRED signer-contract correction OUTSIDE this gate: replace continuous
--   withAuthorizedFrozenClaim isolation with immutable preparation snapshots,
--   internal preparation UUID/version, callback-at-most-once, exact-result
--   release AFTER committed authorize_preparation_release, and no lock promise
--   across callback/network requests. Correct signer.ts's across-await comment;
-- * replace concept-brief-persistence.ts split writes/compensating delete with
--   the transactional receipt RPC; reconcile supabase-first-preview-repository.ts
--   direct First Preview job writes and all result/failure/asset lifecycle paths.
--   This candidate deliberately denies unsupported direct job-state changes;
-- * independently verify dedicated-role authentication, pool reuse preserving
--   session_user, certificate-verified TLS, deployed ACLs and isolated packaging;
-- * separate approved F2 contact ACL correction: revoke TRUNCATE, REFERENCES,
--   TRIGGER and MAINTAIN from anon/authenticated/service_role as appropriate.
--   RLS does NOT protect TRUNCATE. The prerequisite below aborts if those grants
--   remain; no broad contact ACL remediation is silently bundled in this file.
-- Migration order: reconcile application paths and contact grants; provision
-- owners/authenticated roles; review/test this entire transaction; install
-- schema/functions/guards/ACLs atomically; privately configure keys and bindings
-- and grant exact runtime entrypoints in a separate controlled stage; verify
-- identity/TLS/ACLs before activation. NO seeded policy, key, role or enabled row.
-- New SECURITY DEFINER boundaries below use narrow NOLOGIN owners, qualified
-- objects and empty search paths. Owners/migration administrators are trusted.
-- Release success is provisional until COMMIT succeeds; each RPC has its own
-- transaction. Reclaim AFTER release can occur: consumption remains definitive.

BEGIN;
SET LOCAL search_path = '';

-- Source prerequisite, not CREATE ROLE/provisioning and not a live correction.
DO $$
DECLARE r record; required_name text;
BEGIN
  IF session_user::text <> 'postgres' OR current_user::text <> 'postgres' THEN
    RAISE EXCEPTION 'privileged_postgres_migration_actor_required';
  END IF;
  IF current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'PostgreSQL_17_required';
  END IF;
  FOREACH required_name IN ARRAY ARRAY['novora_fp_owner','novora_fp_executor',
      'novora_fp_intake_executor','novora_fp_verifier'] LOOP
    SELECT * INTO r FROM pg_catalog.pg_roles WHERE rolname = required_name;
    IF NOT FOUND OR r.rolcanlogin OR r.rolsuper OR r.rolcreaterole OR r.rolcreatedb
        OR r.rolreplication OR r.rolbypassrls OR r.rolinherit OR
        NOT pg_catalog.pg_has_role(current_user, r.oid, 'SET') OR
        NOT pg_catalog.pg_has_role(current_user, r.oid, 'USAGE') OR
        EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m
          WHERE m.member = r.oid OR (m.roleid = r.oid AND
            m.member <> (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'postgres'))) THEN
      RAISE EXCEPTION 'protected_owner_provisioning_required';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles a
    WHERE a.rolname IN ('anon','authenticated','service_role') AND
      (has_table_privilege(a.oid, 'public.concept_brief_contacts', 'TRUNCATE') OR
       has_table_privilege(a.oid, 'public.concept_brief_contacts', 'REFERENCES') OR
       has_table_privilege(a.oid, 'public.concept_brief_contacts', 'TRIGGER') OR
       has_table_privilege(a.oid, 'public.concept_brief_contacts', 'MAINTAIN'))) THEN
    RAISE EXCEPTION 'separately_approved_contact_ACL_correction_required';
  END IF;
END $$;

CREATE SCHEMA novora_fp_authority AUTHORIZATION novora_fp_owner;
REVOKE ALL ON SCHEMA novora_fp_authority FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.novora_fp_keys(v jsonb, keys text[])
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT CASE WHEN jsonb_typeof(v) = 'object' THEN
    v ?& keys AND (SELECT count(*) FROM jsonb_object_keys(v)) = cardinality(keys)
  ELSE false END
$$;

CREATE FUNCTION public.novora_fp_policy_valid(v jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE k text;
BEGIN
  IF NOT public.novora_fp_keys(v, ARRAY['lease_ms','backoff_ms','batch_size',
      'max_handoff_attempts','max_wait_ms']) THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['lease_ms','backoff_ms','batch_size','max_handoff_attempts','max_wait_ms'] LOOP
    IF jsonb_typeof(v->k) IS DISTINCT FROM 'number' OR
      (v->>k)::numeric <= 0 OR (v->>k)::numeric > 9007199254740991 OR
      trunc((v->>k)::numeric) <> (v->>k)::numeric THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END $$;

CREATE FUNCTION public.novora_fp_context_valid(v jsonb, brief uuid, reference text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce(public.novora_fp_keys(v, ARRAY['version','ip_key','email_key',
    'key_version','rate_policy_version','access_binding']) AND
    v->>'version' = 'novora_first_preview_initiation_v1' AND
    jsonb_typeof(v->'ip_key') = 'string' AND v->>'ip_key' ~ '^rl:v1:concept-briefs:ip:[a-f0-9]{48}$' AND
    jsonb_typeof(v->'email_key') = 'string' AND v->>'email_key' ~ '^rl:v1:concept-briefs:email:[a-f0-9]{48}$' AND
    jsonb_typeof(v->'key_version') = 'string' AND btrim(v->>'key_version') <> '' AND
    btrim(v->>'key_version') = v->>'key_version' AND
    jsonb_typeof(v->'rate_policy_version') = 'string' AND btrim(v->>'rate_policy_version') <> '' AND
    btrim(v->>'rate_policy_version') = v->>'rate_policy_version' AND
    public.novora_fp_keys(v->'access_binding', ARRAY['concept_brief_id','public_reference',
      'proof_version','binding_digest']) AND
    v->'access_binding'->>'concept_brief_id' = brief::text AND
    v->'access_binding'->>'public_reference' = reference AND
    jsonb_typeof(v->'access_binding'->'proof_version') = 'string' AND
    btrim(v->'access_binding'->>'proof_version') <> '' AND
    btrim(v->'access_binding'->>'proof_version') = v->'access_binding'->>'proof_version' AND
    jsonb_typeof(v->'access_binding'->'binding_digest') = 'string' AND
    v->'access_binding'->>'binding_digest' ~ '^[a-f0-9]{64}$', false)
$$;

-- frame(s) matches JavaScript: UTF8(decimal octet length || ':' || s).
-- It frames strings only; this is NOT an independent SQL JSON canonicalizer.
CREATE FUNCTION public.novora_fp_hmac_frame(v text)
RETURNS bytea LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path = '' AS $$
  SELECT convert_to(octet_length(convert_to(v, 'UTF8'))::text || ':' || v, 'UTF8')
$$;

-- Protected verification boundary is defined below after its private key table.
-- There is NO public or runtime-executable key-returning function.

CREATE FUNCTION public.novora_fp_preparation_valid(
  evidence jsonb, prep jsonb, brief uuid, owner_id uuid, ownership_fence bigint
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE k text; message_bytes bytea := ''::bytea;
  source_value jsonb; prepared_value jsonb; db_source jsonb;
BEGIN
  IF public.novora_fp_keys(evidence, ARRAY['version','key_id','initiation_version',
      'concept_brief_id','public_reference','job_id','identity_key','owner','fence',
      'source_snapshot_utf8_hex','prepared_utf8_hex','mac_sha256']) IS DISTINCT FROM true OR
      brief IS NULL OR owner_id IS NULL OR ownership_fence IS NULL OR ownership_fence <= 0 THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['version','key_id','initiation_version','concept_brief_id',
      'public_reference','job_id','identity_key','owner','fence','source_snapshot_utf8_hex','prepared_utf8_hex','mac_sha256'] LOOP
    IF jsonb_typeof(evidence->k) IS DISTINCT FROM 'string' THEN RETURN false; END IF;
  END LOOP;
  IF evidence->>'version' IS DISTINCT FROM 'novora_first_preview_preparation_hmac_v1' OR
      evidence->>'initiation_version' IS DISTINCT FROM 'novora_first_preview_initiation_v1' OR
      evidence->>'key_id' !~ '^[A-Za-z0-9_-]{1,64}$' OR
      evidence->>'concept_brief_id' IS DISTINCT FROM brief::text OR
      evidence->>'public_reference' !~ '^NOVORA-CB-[0-9]{8}-[A-Z0-9]{4}$' OR
      evidence->>'job_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' OR
      evidence->>'identity_key' !~ '^[a-f0-9]{64}$' OR
      evidence->>'owner' IS DISTINCT FROM owner_id::text OR
      evidence->>'fence' IS DISTINCT FROM ownership_fence::text OR
      evidence->>'mac_sha256' !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['source_snapshot_utf8_hex','prepared_utf8_hex'] LOOP
    -- Same 1 MiB per JSON text limit as JavaScript; only exact lowercase hex.
    IF length(evidence->>k) NOT BETWEEN 2 AND 2097152 OR length(evidence->>k) % 2 <> 0 OR
        evidence->>k !~ '^[a-f0-9]+$' THEN RETURN false; END IF;
  END LOOP;
  -- Exact field order from prepareFirstPreviewHmacEnvelopeCandidate. Constants
  -- bind this proof to prepare/claimed/initiation, never arm/recovery/dispatch.
  message_bytes := public.novora_fp_hmac_frame(evidence->>'version') ||
    public.novora_fp_hmac_frame(evidence->>'key_id') ||
    public.novora_fp_hmac_frame(evidence->>'initiation_version') ||
    public.novora_fp_hmac_frame('prepare') || public.novora_fp_hmac_frame('claimed') ||
    public.novora_fp_hmac_frame('initiation');
  FOREACH k IN ARRAY ARRAY['concept_brief_id','public_reference','job_id','identity_key',
      'owner','fence','source_snapshot_utf8_hex','prepared_utf8_hex'] LOOP
    message_bytes := message_bytes || public.novora_fp_hmac_frame(evidence->>k);
  END LOOP;
  IF novora_fp_authority.hmac_matches(evidence->>'key_id', message_bytes,
      evidence->>'mac_sha256') IS DISTINCT FROM true THEN RETURN false; END IF;
  -- Only authenticated exact text is decoded. SQL never rehashes JSONB text,
  -- accepts an independent identity hash, or substitutes a caller's source hash.
  source_value := convert_from(decode(evidence->>'source_snapshot_utf8_hex', 'hex'), 'UTF8')::jsonb;
  prepared_value := convert_from(decode(evidence->>'prepared_utf8_hex', 'hex'), 'UTF8')::jsonb;
  IF jsonb_typeof(source_value) IS DISTINCT FROM 'object' OR
      jsonb_typeof(prepared_value) IS DISTINCT FROM 'object' OR prepared_value IS DISTINCT FROM prep OR
      prepared_value->>'job_id' IS DISTINCT FROM evidence->>'job_id' OR
      prepared_value->>'identity_key' IS DISTINCT FROM evidence->>'identity_key' THEN RETURN false; END IF;
  -- Block source replacement through commit. Caller/trigger must recheck its
  -- locked outbox lease AFTER this potentially blocking Brief lock.
  -- Entry operations have already locked Brief -> selection -> key in that
  -- order. This read never takes a new earlier-order lock after key verification.
  db_source := novora_fp_authority.source_snapshot(brief);
  RETURN coalesce(db_source IS NOT NULL AND source_value = db_source AND
    db_source->>'public_reference' = evidence->>'public_reference', false);
EXCEPTION WHEN OTHERS THEN
  -- Missing key, denied key access, missing pgcrypto, invalid UTF8/JSON, and every
  -- unverifiable condition deny preparation. No exception details/secret output.
  RETURN false;
END $$;

CREATE TABLE public.first_preview_initiation_outbox (
  concept_brief_id uuid PRIMARY KEY REFERENCES public.concept_briefs(id) ON DELETE RESTRICT,
  version text NOT NULL DEFAULT 'novora_first_preview_initiation_v1'
    CHECK (version = 'novora_first_preview_initiation_v1'),
  generation_purpose text NOT NULL DEFAULT 'first_preview' CHECK (generation_purpose = 'first_preview'),
  attempt_number smallint NOT NULL DEFAULT 1 CHECK (attempt_number = 1),
  state text NOT NULL CHECK (state IN ('pending','waiting_admission','publishing','queued',
    'claimed','dispatch_armed','dispatched','completed','operator_hold','cancelled')),
  handoff_stage text NOT NULL DEFAULT 'initiation' CHECK (handoff_stage IN ('initiation','generation')),
  handoff_epoch bigint NOT NULL DEFAULT 0 CHECK (handoff_epoch >= 0),
  publication_fence bigint CHECK (publication_fence >= 0),
  handoff_attempts bigint NOT NULL DEFAULT 0 CHECK (handoff_attempts BETWEEN 0 AND 9007199254740991),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_owner uuid,
  lease_until timestamptz,
  fence bigint NOT NULL DEFAULT 0 CHECK (fence >= 0),
  admission_context jsonb,
  prepared jsonb,
  preparation_envelope jsonb,
  generation_input jsonb GENERATED ALWAYS AS (prepared->'generation_input') STORED,
  generation_identity_key text GENERATED ALWAYS AS (prepared->>'identity_key') STORED,
  job_id uuid GENERATED ALWAYS AS ((prepared->>'job_id')::uuid) STORED,
  dispatch_grant jsonb,
  -- Private, append-only normalized lifecycle receipts; no raw Provider response.
  provider_lifecycle jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(provider_lifecycle)='object' AND
      (provider_lifecycle-ARRAY['dispatch','registration','terminal'])='{}'::jsonb),
  last_reason text CHECK (last_reason IN ('invalid_input','invalid_state','identity_conflict',
    'lease_conflict','policy_unconfigured','repository_unavailable','admission_unavailable',
    'missing_context','recovery_blocked','paid_outcome_unknown','delivery_exhausted','completion_unverified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (job_id, concept_brief_id)
    REFERENCES public.ai_sketch_jobs(id, concept_brief_id) ON DELETE RESTRICT,
  CHECK ((lease_owner IS NULL) = (lease_until IS NULL)),
  CHECK ((prepared IS NULL) = (preparation_envelope IS NULL)),
  CHECK (state NOT IN ('claimed','publishing','dispatch_armed','dispatched') OR lease_owner IS NOT NULL),
  CHECK (state NOT IN ('claimed','publishing','queued') OR publication_fence IS NOT NULL),
  CHECK (handoff_stage <> 'generation' OR prepared IS NOT NULL),
  CHECK (state NOT IN ('dispatch_armed','dispatched','completed') OR
    (prepared IS NOT NULL AND admission_context IS NOT NULL AND dispatch_grant IS NOT NULL)),
  CHECK (generation_identity_key IS NULL OR generation_identity_key ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX first_preview_initiation_identity_uidx
  ON public.first_preview_initiation_outbox(generation_identity_key)
  WHERE generation_identity_key IS NOT NULL;
CREATE INDEX first_preview_initiation_due_idx
  ON public.first_preview_initiation_outbox(next_attempt_at, concept_brief_id)
  WHERE state IN ('pending','waiting_admission','publishing','queued','claimed');
-- Cross-Job Provider identity is globally unique, including races with other
-- generation purposes. Existing duplicate identities abort installation; no repair
-- or backfill is authorized here. This grants no write or read capability.
CREATE UNIQUE INDEX novora_fp_provider_request_identity_uidx
  ON public.ai_sketch_jobs(provider_name,provider_request_id)
  WHERE provider_request_id IS NOT NULL;
ALTER TABLE public.first_preview_initiation_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.first_preview_initiation_outbox FROM PUBLIC, anon, authenticated, service_role;
-- No direct runtime writes. Narrow executor grants are defined at transaction end.

CREATE FUNCTION public.novora_fp_wire(i public.first_preview_initiation_outbox)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT (to_jsonb(i) - 'job_id' - 'generation_input' - 'generation_identity_key' - 'preparation_envelope' - 'provider_lifecycle') ||
    jsonb_build_object('fence', i.fence::text, 'handoff_epoch', i.handoff_epoch::text,
      'publication_fence', CASE WHEN i.publication_fence IS NULL THEN NULL ELSE i.publication_fence::text END)
$$;

-- D1 authority objects. Empty registries intentionally deny signing/claiming.
-- Role OIDs AND names are pinned; dropping/recreating a role cannot reuse a binding.
CREATE TABLE novora_fp_authority.workload_bindings (
  worker_role_oid oid PRIMARY KEY,
  worker_role_name name NOT NULL UNIQUE,
  signer_role_oid oid NOT NULL UNIQUE,
  signer_role_name name NOT NULL UNIQUE,
  lease_owner uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  replay_policy jsonb NOT NULL CHECK (public.novora_fp_policy_valid(replay_policy)),
  preparation_policy jsonb NOT NULL,
  CHECK (worker_role_oid <> signer_role_oid AND worker_role_name <> signer_role_name)
);

CREATE TABLE novora_fp_authority.preparation_keys (
  key_id text PRIMARY KEY CHECK (key_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  key_bytes bytea NOT NULL CHECK (octet_length(key_bytes) >= 32),
  enabled boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  CHECK (NOT enabled OR revoked_at IS NULL)
);

CREATE TABLE novora_fp_authority.preparation_selections (
  preparation_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  selection_version text NOT NULL DEFAULT 'novora_fp_selection_v1'
    CHECK (selection_version = 'novora_fp_selection_v1'),
  concept_brief_id uuid NOT NULL REFERENCES public.first_preview_initiation_outbox(concept_brief_id),
  owner uuid NOT NULL,
  fence bigint NOT NULL CHECK (fence > 0),
  worker_role_oid oid NOT NULL REFERENCES novora_fp_authority.workload_bindings(worker_role_oid),
  worker_role_name name NOT NULL,
  signer_role_oid oid NOT NULL,
  signer_role_name name NOT NULL,
  initiation_version text NOT NULL CHECK (initiation_version = 'novora_first_preview_initiation_v1'),
  publication_fence bigint NOT NULL,
  handoff_epoch bigint NOT NULL,
  admission_context jsonb NOT NULL,
  source_snapshot jsonb NOT NULL CHECK (jsonb_typeof(source_snapshot) = 'object'),
  reserved_job_id uuid NOT NULL UNIQUE DEFAULT pg_catalog.gen_random_uuid(),
  preparation_policy jsonb NOT NULL,
  prepared jsonb CHECK (jsonb_typeof(prepared) = 'object'),
  release_envelope jsonb CHECK (jsonb_typeof(release_envelope) = 'object'),
  release_key_id text GENERATED ALWAYS AS (release_envelope->>'key_id') STORED
    REFERENCES novora_fp_authority.preparation_keys(key_id),
  release_mac text GENERATED ALWAYS AS (release_envelope->>'mac_sha256') STORED,
  selected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  released_at timestamptz,
  UNIQUE (concept_brief_id, fence),
  CHECK (release_envelope IS NULL OR prepared IS NOT NULL),
  CHECK ((release_envelope IS NULL) = (released_at IS NULL))
);
-- Identity reservation only: no ai_sketch_jobs insertion or paid admission.

CREATE FUNCTION novora_fp_authority.preparation_policy_valid(v jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE k text;
BEGIN
  IF public.novora_fp_keys(v, ARRAY['design_spec_version','hand_sketch_instruction_version',
      'estimated_cost_micros','cost_currency','pricing_assumption_version','provider_profile']) IS DISTINCT FROM true OR
      jsonb_typeof(v->'estimated_cost_micros') IS DISTINCT FROM 'number' OR
      (v->>'estimated_cost_micros')::numeric NOT BETWEEN 0 AND 9007199254740991 OR
      trunc((v->>'estimated_cost_micros')::numeric) <> (v->>'estimated_cost_micros')::numeric OR
      v->>'cost_currency' IS DISTINCT FROM 'USD' OR
      v->'provider_profile' IS DISTINCT FROM
        '{"provider_name":"openai","model_name":"gpt-image-2-2026-04-21",
          "provider_endpoint":"/v1/images/generations","request_image_count":1,
          "request_streaming":false,"request_partial_images":0,"request_size":"1024x1024",
          "request_quality":"medium","output_format":"png","moderation_mode":"auto"}'::jsonb THEN
    RETURN false;
  END IF;
  FOREACH k IN ARRAY ARRAY['design_spec_version','hand_sketch_instruction_version','pricing_assumption_version'] LOOP
    IF jsonb_typeof(v->k) IS DISTINCT FROM 'string' OR btrim(v->>k) = '' OR
        btrim(v->>k) IS DISTINCT FROM v->>k THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
ALTER TABLE novora_fp_authority.workload_bindings ADD CHECK
  (novora_fp_authority.preparation_policy_valid(preparation_policy));
ALTER TABLE novora_fp_authority.preparation_selections ADD CHECK
  (novora_fp_authority.preparation_policy_valid(preparation_policy));

-- Runtime auth checks are conservative: NOINHERIT alone does NOT prevent SET
-- ROLE on PostgreSQL 17. Reject all incoming/outgoing memberships, even those
-- with inherit_option/set_option=false. Never use request.role/GUC/JWT identity.
CREATE FUNCTION novora_fp_authority.workload_role_safe(p_oid oid, p_name name)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  SELECT coalesce((SELECT r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolcreaterole
      AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolbypassrls AND NOT r.rolinherit
      AND r.rolname NOT IN ('postgres','authenticator','service_role','anon','authenticated')
      AND (SELECT count(*) FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid OR m.roleid=r.oid) <= 1
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m
        WHERE (m.member=r.oid OR m.roleid=r.oid) AND (
          m.roleid=r.oid
          AND m.member=(SELECT a.oid FROM pg_catalog.pg_roles a WHERE a.rolname='postgres')
          AND m.grantor=(SELECT g.oid FROM pg_catalog.pg_roles g WHERE g.rolname='supabase_admin')
          AND m.admin_option IS TRUE AND m.set_option IS FALSE AND m.inherit_option IS FALSE
        ) IS NOT TRUE)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relowner=r.oid AND c.relpersistence <> 't')
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p WHERE p.proowner=r.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
        WHERE p.prosecdef AND n.nspname NOT IN ('pg_catalog','information_schema')
          AND has_function_privilege(r.oid,p.oid,'EXECUTE') AND NOT (
            (n.nspname='novora_fp_authority' AND p.proname IN ('select_preparation_claim',
              'bind_preparation','authorize_preparation_release','record_provider_lifecycle') AND
              pg_catalog.pg_get_userbyid(p.proowner)='novora_fp_executor') OR
            (n.nspname='public' AND p.proname IN ('novora_claim_first_preview_initiations',
              'novora_transition_first_preview_initiation') AND
              pg_catalog.pg_get_userbyid(p.proowner)='novora_fp_executor')))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspowner=r.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname NOT LIKE 'pg_temp_%'
        AND n.nspname NOT LIKE 'pg_toast_temp_%' AND has_schema_privilege(r.oid,n.oid,'CREATE'))
      AND NOT has_database_privilege(r.oid,current_database(),'CREATE')
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE (n.nspname='novora_fp_authority' OR (n.nspname='public' AND c.relname='first_preview_initiation_outbox'))
          AND c.relkind IN ('r','p') AND has_any_column_privilege(r.oid,c.oid,'SELECT'))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('public','novora_fp_authority') AND c.relkind IN ('r','p') AND
          (has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES,MAINTAIN') OR
           has_any_column_privilege(r.oid,c.oid,'INSERT,UPDATE')))
    FROM pg_catalog.pg_roles r WHERE r.oid=p_oid AND r.rolname=p_name), false)
$$;

CREATE FUNCTION novora_fp_authority.authenticated_binding(p_kind text)
RETURNS novora_fp_authority.workload_bindings
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE b novora_fp_authority.workload_bindings;
BEGIN
  SELECT * INTO b FROM novora_fp_authority.workload_bindings w
    WHERE (p_kind='worker' AND w.worker_role_name=session_user::name) OR
      (p_kind='signer' AND w.signer_role_name=session_user::name) FOR SHARE;
  IF NOT FOUND OR NOT b.enabled OR
      NOT novora_fp_authority.workload_role_safe(b.worker_role_oid,b.worker_role_name) OR
      NOT novora_fp_authority.workload_role_safe(b.signer_role_oid,b.signer_role_name) OR
      NOT public.novora_fp_policy_valid(b.replay_policy) OR
      NOT novora_fp_authority.preparation_policy_valid(b.preparation_policy) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='workload_authorization_denied';
  END IF;
  RETURN b;
END $$;

CREATE FUNCTION novora_fp_authority.source_snapshot(p_brief uuid)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('concept_brief_id', b.id::text, 'public_reference', b.public_reference,
    'source', b.source, 'piece_type', b.piece_type, 'branch', b.branch, 'structure', b.structure,
    'sub_structure', b.sub_structure, 'design_objective', b.design_objective,
    'ai_sketch_instruction', b.ai_sketch_instruction, 'brief_payload', b.brief_payload,
    'summary_items', b.summary_items, 'api_submission', b.api_submission)
  FROM public.concept_briefs b WHERE b.id=p_brief AND b.source='api'
$$;

CREATE FUNCTION novora_fp_authority.hmac_matches(p_key_id text, p_message bytea, p_mac text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE secret bytea; expected bytea; supplied bytea; diff integer := 0; n integer;
BEGIN
  IF p_mac IS NULL OR p_mac !~ '^[a-f0-9]{64}$' OR p_message IS NULL THEN RETURN false; END IF;
  SELECT k.key_bytes INTO secret FROM novora_fp_authority.preparation_keys k
    WHERE k.key_id=p_key_id AND k.enabled AND k.revoked_at IS NULL FOR SHARE;
  IF NOT FOUND OR octet_length(secret)<32 THEN RETURN false; END IF;
  expected := extensions.hmac(p_message,secret,'sha256');
  supplied := decode(p_mac,'hex');
  IF expected IS NULL OR octet_length(expected)<>32 THEN RETURN false; END IF;
  FOR n IN 0..31 LOOP diff := diff | (get_byte(expected,n) # get_byte(supplied,n)); END LOOP;
  -- Full-byte comparison; no remote/SQL constant-time guarantee is claimed.
  RETURN diff=0;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION novora_fp_authority.protect_selection()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND (
      (to_jsonb(NEW)-ARRAY['prepared','release_envelope','release_key_id','release_mac','released_at']) IS DISTINCT FROM
      (to_jsonb(OLD)-ARRAY['prepared','release_envelope','release_key_id','release_mac','released_at']) OR
      (OLD.prepared IS NOT NULL AND NEW.prepared IS DISTINCT FROM OLD.prepared) OR
      (OLD.release_envelope IS NOT NULL AND (NEW.release_envelope IS DISTINCT FROM OLD.release_envelope OR
        NEW.released_at IS DISTINCT FROM OLD.released_at)))) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='immutable_preparation_selection';
  END IF;
  -- Generated key/mac fields are not inspected in BEFORE triggers.
  RETURN NEW;
END $$;
CREATE TRIGGER novora_fp_selection_immutable BEFORE UPDATE OR DELETE
  ON novora_fp_authority.preparation_selections FOR EACH ROW
  EXECUTE FUNCTION novora_fp_authority.protect_selection();

CREATE FUNCTION novora_fp_authority.protect_key()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='DELETE' OR NEW.key_id IS DISTINCT FROM OLD.key_id OR NEW.key_bytes IS DISTINCT FROM OLD.key_bytes OR
      (OLD.revoked_at IS NOT NULL AND (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR NEW.enabled)) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='immutable_or_revoked_verification_key';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER novora_fp_key_immutable BEFORE UPDATE OR DELETE
  ON novora_fp_authority.preparation_keys FOR EACH ROW EXECUTE FUNCTION novora_fp_authority.protect_key();

CREATE FUNCTION novora_fp_authority.protect_binding_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='DELETE' OR ROW(NEW.worker_role_oid,NEW.worker_role_name,NEW.signer_role_oid,NEW.signer_role_name,NEW.lease_owner)
      IS DISTINCT FROM ROW(OLD.worker_role_oid,OLD.worker_role_name,OLD.signer_role_oid,OLD.signer_role_name,OLD.lease_owner) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='immutable_workload_identity';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER novora_fp_binding_identity_immutable BEFORE UPDATE OR DELETE
  ON novora_fp_authority.workload_bindings FOR EACH ROW EXECUTE FUNCTION novora_fp_authority.protect_binding_identity();

-- Caller holds binding -> outbox -> Brief -> selection locks. A snapshot never
-- renews a lease. Policy reassignment/revocation invalidates subsequent calls.
CREATE FUNCTION novora_fp_authority.require_current_claim(
  b novora_fp_authority.workload_bindings, i public.first_preview_initiation_outbox,
  source_value jsonb, s novora_fp_authority.preparation_selections
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT novora_fp_authority.workload_role_safe(b.worker_role_oid,b.worker_role_name) OR
      NOT novora_fp_authority.workload_role_safe(b.signer_role_oid,b.signer_role_name) OR
      i.concept_brief_id IS NULL OR i.state IS DISTINCT FROM 'claimed' OR
      i.handoff_stage IS DISTINCT FROM 'initiation' OR i.version IS DISTINCT FROM 'novora_first_preview_initiation_v1' OR
      i.generation_purpose IS DISTINCT FROM 'first_preview' OR i.attempt_number IS DISTINCT FROM 1 OR
      i.lease_owner IS DISTINCT FROM b.lease_owner OR i.fence IS NULL OR i.fence<=0 OR
      i.publication_fence IS NULL OR i.prepared IS NOT NULL OR i.dispatch_grant IS NOT NULL OR
      source_value IS NULL OR public.novora_fp_context_valid(i.admission_context,i.concept_brief_id,
        source_value->>'public_reference') IS DISTINCT FROM true OR
      i.lease_until IS NULL OR i.lease_until<=clock_timestamp() THEN
    RAISE EXCEPTION USING ERRCODE='NFP01', MESSAGE='claim_rejected';
  END IF;
  IF s.preparation_id IS NOT NULL AND (
      s.concept_brief_id IS DISTINCT FROM i.concept_brief_id OR s.owner IS DISTINCT FROM i.lease_owner OR
      s.fence IS DISTINCT FROM i.fence OR s.initiation_version IS DISTINCT FROM i.version OR
      s.publication_fence IS DISTINCT FROM i.publication_fence OR s.handoff_epoch IS DISTINCT FROM i.handoff_epoch OR
      s.worker_role_oid IS DISTINCT FROM b.worker_role_oid OR s.worker_role_name IS DISTINCT FROM b.worker_role_name OR
      s.signer_role_oid IS DISTINCT FROM b.signer_role_oid OR s.signer_role_name IS DISTINCT FROM b.signer_role_name OR
      s.source_snapshot IS DISTINCT FROM source_value OR s.admission_context IS DISTINCT FROM i.admission_context OR
      s.preparation_policy IS DISTINCT FROM b.preparation_policy) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='selection_mismatch';
  END IF;
END $$;

-- This internal helper returns data only to narrow executor code. Selector
-- lookup is initially unlocked; every authorization decision uses locked rows.
CREATE FUNCTION novora_fp_authority.lock_selected_claim(p_preparation uuid, p_kind text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE b novora_fp_authority.workload_bindings; i public.first_preview_initiation_outbox;
  s novora_fp_authority.preparation_selections; brief uuid; source_value jsonb;
BEGIN
  b := novora_fp_authority.authenticated_binding(p_kind);
  SELECT concept_brief_id INTO brief FROM novora_fp_authority.preparation_selections WHERE preparation_id=p_preparation;
  SELECT * INTO i FROM public.first_preview_initiation_outbox WHERE concept_brief_id=brief FOR UPDATE;
  PERFORM 1 FROM public.concept_briefs WHERE id=brief FOR SHARE;
  source_value := novora_fp_authority.source_snapshot(brief);
  SELECT * INTO s FROM novora_fp_authority.preparation_selections WHERE preparation_id=p_preparation FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='claim_rejected'; END IF;
  PERFORM novora_fp_authority.require_current_claim(b,i,source_value,s);
  RETURN jsonb_build_object('binding',to_jsonb(b),'intent',to_jsonb(i),'selection',to_jsonb(s),
    'source_snapshot',source_value);
END $$;

CREATE FUNCTION novora_fp_authority.selection_wire(s novora_fp_authority.preparation_selections,
  i public.first_preview_initiation_outbox)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  SELECT jsonb_build_object('preparation_id',s.preparation_id::text,'selection_version',s.selection_version,
    'intent',public.novora_fp_wire(i),'source_snapshot',s.source_snapshot,'admission_context',s.admission_context,
    'reserved_job_id',s.reserved_job_id::text,'preparation_policy',s.preparation_policy,'prepared',s.prepared,
    'database_now_ms',floor(extract(epoch FROM clock_timestamp())*1000)::bigint)
$$;

CREATE FUNCTION novora_fp_authority.prepared_matches_selection(
  prep jsonb, s novora_fp_authority.preparation_selections
) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE k text;
BEGIN
  IF public.novora_fp_keys(prep, ARRAY['job_id','identity_key','generation_input','design_spec_version',
      'design_spec_sha256','hand_sketch_instruction_version','hand_sketch_instruction_sha256',
      'estimated_cost_micros','cost_currency','pricing_assumption_version']) IS DISTINCT FROM true OR
      prep->>'job_id' IS DISTINCT FROM s.reserved_job_id::text OR
      jsonb_typeof(prep->'job_id') IS DISTINCT FROM 'string' OR
      jsonb_typeof(prep->'identity_key') IS DISTINCT FROM 'string' OR prep->>'identity_key' !~ '^[a-f0-9]{64}$' OR
      jsonb_typeof(prep->'generation_input') IS DISTINCT FROM 'object' OR
      public.novora_fp_keys(prep->'generation_input',ARRAY['designSpec','designSpecSha256',
        'handSketchInstruction','handSketchInstructionSha256']) IS DISTINCT FROM true OR
      jsonb_typeof(prep->'generation_input'->'designSpec') IS DISTINCT FROM 'object' OR
      jsonb_typeof(prep->'generation_input'->'handSketchInstruction') IS DISTINCT FROM 'object' OR
      prep->'generation_input'->'designSpec'->>'public_reference' IS DISTINCT FROM s.source_snapshot->>'public_reference' OR
      prep->'generation_input'->'handSketchInstruction'->>'public_reference' IS DISTINCT FROM s.source_snapshot->>'public_reference' OR
      prep->'generation_input'->>'designSpecSha256' IS DISTINCT FROM prep->>'design_spec_sha256' OR
      prep->'generation_input'->>'handSketchInstructionSha256' IS DISTINCT FROM prep->>'hand_sketch_instruction_sha256' THEN
    RETURN false;
  END IF;
  FOREACH k IN ARRAY ARRAY['design_spec_sha256','hand_sketch_instruction_sha256'] LOOP
    IF jsonb_typeof(prep->k) IS DISTINCT FROM 'string' OR prep->>k !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['design_spec_version','hand_sketch_instruction_version','estimated_cost_micros',
      'cost_currency','pricing_assumption_version'] LOOP
    IF prep->k IS DISTINCT FROM s.preparation_policy->k THEN RETURN false; END IF;
  END LOOP;
  -- Full structured-input validation/hash derivation remains the trusted pinned
  -- JavaScript builder's responsibility; SQL never substitutes canonical JSON.
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION novora_fp_authority.select_preparation_claim(p_brief uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE b novora_fp_authority.workload_bindings; i public.first_preview_initiation_outbox;
  s novora_fp_authority.preparation_selections; source_value jsonb;
BEGIN
  b := novora_fp_authority.authenticated_binding('signer');
  SELECT * INTO i FROM public.first_preview_initiation_outbox WHERE concept_brief_id=p_brief FOR UPDATE;
  PERFORM 1 FROM public.concept_briefs WHERE id=p_brief FOR SHARE;
  source_value := novora_fp_authority.source_snapshot(p_brief);
  SELECT * INTO s FROM novora_fp_authority.preparation_selections
    WHERE concept_brief_id=p_brief AND fence=i.fence FOR UPDATE;
  PERFORM novora_fp_authority.require_current_claim(b,i,source_value,s);
  IF s.preparation_id IS NULL THEN
    INSERT INTO novora_fp_authority.preparation_selections(concept_brief_id,owner,fence,
      worker_role_oid,worker_role_name,signer_role_oid,signer_role_name,initiation_version,
      publication_fence,handoff_epoch,admission_context,source_snapshot,preparation_policy)
    VALUES (p_brief,i.lease_owner,i.fence,b.worker_role_oid,b.worker_role_name,b.signer_role_oid,b.signer_role_name,
      i.version,i.publication_fence,i.handoff_epoch,i.admission_context,source_value,b.preparation_policy)
    RETURNING * INTO s;
  END IF;
  PERFORM novora_fp_authority.require_current_claim(b,i,source_value,s);
  RETURN jsonb_build_object('ok',true,'value',novora_fp_authority.selection_wire(s,i));
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'code','claim_rejected');
END $$;

CREATE FUNCTION novora_fp_authority.bind_preparation(p_preparation uuid, p_prepared jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE bundle jsonb; b novora_fp_authority.workload_bindings;
  i public.first_preview_initiation_outbox; s novora_fp_authority.preparation_selections;
BEGIN
  bundle := novora_fp_authority.lock_selected_claim(p_preparation,'signer');
  b := jsonb_populate_record(NULL::novora_fp_authority.workload_bindings,bundle->'binding');
  i := jsonb_populate_record(NULL::public.first_preview_initiation_outbox,bundle->'intent');
  s := jsonb_populate_record(NULL::novora_fp_authority.preparation_selections,bundle->'selection');
  IF novora_fp_authority.prepared_matches_selection(p_prepared,s) IS DISTINCT FROM true OR
      (s.prepared IS NOT NULL AND s.prepared IS DISTINCT FROM p_prepared) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='preparation_mismatch';
  END IF;
  PERFORM novora_fp_authority.require_current_claim(b,i,bundle->'source_snapshot',s);
  IF s.prepared IS NULL THEN
    UPDATE novora_fp_authority.preparation_selections SET prepared=p_prepared
      WHERE preparation_id=p_preparation RETURNING * INTO s;
  END IF;
  PERFORM novora_fp_authority.require_current_claim(b,i,bundle->'source_snapshot',s);
  RETURN jsonb_build_object('ok',true,'value',novora_fp_authority.selection_wire(s,i));
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'code','claim_rejected');
END $$;

CREATE FUNCTION novora_fp_authority.authorize_preparation_release(p_preparation uuid, p_envelope jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE bundle jsonb; b novora_fp_authority.workload_bindings;
  i public.first_preview_initiation_outbox; s novora_fp_authority.preparation_selections;
BEGIN
  bundle := novora_fp_authority.lock_selected_claim(p_preparation,'signer');
  b := jsonb_populate_record(NULL::novora_fp_authority.workload_bindings,bundle->'binding');
  i := jsonb_populate_record(NULL::public.first_preview_initiation_outbox,bundle->'intent');
  s := jsonb_populate_record(NULL::novora_fp_authority.preparation_selections,bundle->'selection');
  IF s.prepared IS NULL OR novora_fp_authority.prepared_matches_selection(s.prepared,s) IS DISTINCT FROM true OR
      public.novora_fp_preparation_valid(p_envelope,s.prepared,i.concept_brief_id,i.lease_owner,i.fence) IS DISTINCT FROM true OR
      (s.release_envelope IS NOT NULL AND s.release_envelope IS DISTINCT FROM p_envelope) THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='proof_rejected';
  END IF;
  -- hmac_matches held the enabled, unrevoked key FOR SHARE. Recheck fresh lease
  -- AFTER that potential wait, before recording any release authorization.
  PERFORM novora_fp_authority.require_current_claim(b,i,bundle->'source_snapshot',s);
  IF s.release_envelope IS NULL THEN
    UPDATE novora_fp_authority.preparation_selections SET release_envelope=p_envelope,released_at=clock_timestamp()
      WHERE preparation_id=p_preparation RETURNING * INTO s;
  END IF;
  PERFORM novora_fp_authority.require_current_claim(b,i,bundle->'source_snapshot',s);
  RETURN jsonb_build_object('ok',true,'authorized',true,'preparation_id',s.preparation_id::text,
    'selection_version',s.selection_version,'owner',s.owner::text,'fence',s.fence::text,
    'lease_until',i.lease_until,'database_now_ms',floor(extract(epoch FROM clock_timestamp())*1000)::bigint);
  -- Adapter MUST await successful transaction COMMIT before releasing its exact
  -- callback proof. Failed/unknown commit denies release; no automatic retry.
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'authorized',false,'code','claim_rejected');
END $$;

CREATE FUNCTION novora_fp_authority.require_released_preparation(
  p_envelope jsonb, p_prepared jsonb, p_brief uuid, p_owner uuid, p_fence bigint
) RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE b novora_fp_authority.workload_bindings; i public.first_preview_initiation_outbox;
  s novora_fp_authority.preparation_selections; source_value jsonb;
BEGIN
  b := novora_fp_authority.authenticated_binding('worker');
  SELECT * INTO i FROM public.first_preview_initiation_outbox WHERE concept_brief_id=p_brief FOR UPDATE;
  PERFORM 1 FROM public.concept_briefs WHERE id=p_brief FOR SHARE;
  source_value := novora_fp_authority.source_snapshot(p_brief);
  SELECT * INTO s FROM novora_fp_authority.preparation_selections WHERE concept_brief_id=p_brief AND fence=p_fence FOR UPDATE;
  IF NOT FOUND OR p_owner IS DISTINCT FROM b.lease_owner OR i.lease_owner IS DISTINCT FROM p_owner OR
      i.fence IS DISTINCT FROM p_fence OR s.prepared IS DISTINCT FROM p_prepared OR
      s.release_envelope IS NULL OR s.release_envelope IS DISTINCT FROM p_envelope OR
      p_prepared->>'job_id' IS DISTINCT FROM s.reserved_job_id::text OR
      novora_fp_authority.prepared_matches_selection(p_prepared,s) IS DISTINCT FROM true THEN RETURN false; END IF;
  -- Identical accepted retry keeps its ORIGINAL proof/fence; a reclaim cannot
  -- authorize an old envelope by merely substituting a new owner or fence.
  IF i.prepared IS NOT NULL THEN
    IF i.prepared IS DISTINCT FROM p_prepared OR i.preparation_envelope IS DISTINCT FROM p_envelope THEN RETURN false; END IF;
    i.prepared := NULL;
  END IF;
  PERFORM novora_fp_authority.require_current_claim(b,i,source_value,s);
  IF public.novora_fp_preparation_valid(p_envelope,p_prepared,p_brief,p_owner,p_fence) IS DISTINCT FROM true THEN RETURN false; END IF;
  PERFORM novora_fp_authority.require_current_claim(b,i,source_value,s);
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;

CREATE FUNCTION public.novora_fp_protect_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE reference text; receipt_key text;
BEGIN
  -- current_user here restricts privileged WRITE execution, never authenticates
  -- a workload. Workload authorization is independently based on session_user.
  IF (TG_OP='INSERT' AND current_user::text <> 'novora_fp_intake_executor') OR
      (TG_OP='UPDATE' AND current_user::text <> 'novora_fp_executor') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='protected_intent_write_required';
  END IF;
  SELECT b.public_reference INTO reference FROM public.concept_briefs b WHERE b.id = NEW.concept_brief_id;
  IF NEW.admission_context IS NOT NULL AND
      NOT public.novora_fp_context_valid(NEW.admission_context, NEW.concept_brief_id, reference) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'invalid_private_context';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.concept_brief_id <> OLD.concept_brief_id OR
    NEW.version <> OLD.version OR NEW.created_at <> OLD.created_at OR NEW.fence < OLD.fence OR
    NEW.handoff_epoch < OLD.handoff_epoch OR NEW.admission_context IS DISTINCT FROM OLD.admission_context OR
    (OLD.prepared IS NOT NULL AND (NEW.prepared IS DISTINCT FROM OLD.prepared OR
      NEW.preparation_envelope IS DISTINCT FROM OLD.preparation_envelope))) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'immutable_intent_identity';
  END IF;
  IF TG_OP='INSERT' AND NEW.provider_lifecycle<>'{}'::jsonb THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='unsigned_provider_lifecycle';
  ELSIF TG_OP='UPDATE' AND NEW.provider_lifecycle IS DISTINCT FROM OLD.provider_lifecycle THEN
    -- Only one new server receipt; never replace/delete an earlier observation,
    -- append after terminal evidence, or change ownership while installing it.
    IF OLD.provider_lifecycle ? 'terminal' OR NEW.state IS DISTINCT FROM OLD.state OR
        NEW.lease_owner IS DISTINCT FROM OLD.lease_owner OR NEW.fence IS DISTINCT FROM OLD.fence OR
        (SELECT count(*) FROM jsonb_object_keys(NEW.provider_lifecycle)) <>
          (SELECT count(*)+1 FROM jsonb_object_keys(OLD.provider_lifecycle)) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='immutable_provider_lifecycle'; END IF;
    FOR receipt_key IN SELECT jsonb_object_keys(OLD.provider_lifecycle) LOOP
      IF NEW.provider_lifecycle->receipt_key IS DISTINCT FROM OLD.provider_lifecycle->receipt_key THEN
        RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='immutable_provider_lifecycle'; END IF;
    END LOOP;
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.prepared IS NOT NULL OR NEW.preparation_envelope IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'unsigned_preparation'; END IF;
  ELSIF OLD.prepared IS NULL AND NEW.prepared IS NOT NULL THEN
    -- Direct outbox UPDATE cannot bypass proof verification or consume a proof
    -- under a different state, owner or fence. Privileged bypass remains a gate.
    IF OLD.state IS DISTINCT FROM 'claimed' OR OLD.handoff_stage IS DISTINCT FROM 'initiation' OR
        NEW.state IS DISTINCT FROM OLD.state OR NEW.handoff_stage IS DISTINCT FROM OLD.handoff_stage OR
        NEW.lease_owner IS DISTINCT FROM OLD.lease_owner OR NEW.fence IS DISTINCT FROM OLD.fence OR
        novora_fp_authority.require_released_preparation(NEW.preparation_envelope, NEW.prepared,
          OLD.concept_brief_id, OLD.lease_owner, OLD.fence) IS DISTINCT FROM true THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'unsigned_preparation'; END IF;
    IF OLD.lease_until IS NULL OR OLD.lease_until <= clock_timestamp() THEN
      RAISE EXCEPTION USING ERRCODE = 'NFP01', MESSAGE = 'lease_conflict'; END IF;
  END IF;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER novora_fp_protect_intent BEFORE INSERT OR UPDATE
  ON public.first_preview_initiation_outbox FOR EACH ROW EXECUTE FUNCTION public.novora_fp_protect_intent();

CREATE FUNCTION public.novora_fp_require_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE brief uuid;
BEGIN
  IF TG_TABLE_NAME = 'concept_briefs' THEN
    IF TG_OP = 'UPDATE' AND NEW.id = OLD.id AND NEW.source IS NOT DISTINCT FROM OLD.source THEN RETURN NULL; END IF;
    brief := NEW.id;
  ELSE brief := OLD.concept_brief_id; END IF;
  IF EXISTS (SELECT 1 FROM public.concept_briefs b WHERE b.id = brief AND b.source = 'api') AND
    NOT EXISTS (SELECT 1 FROM public.first_preview_initiation_outbox i WHERE i.concept_brief_id = brief) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'durable_intent_required';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER novora_api_brief_requires_intent AFTER INSERT OR UPDATE
  ON public.concept_briefs DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.novora_fp_require_intent();
CREATE CONSTRAINT TRIGGER novora_intent_delete_guard AFTER DELETE OR UPDATE
  ON public.first_preview_initiation_outbox DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.novora_fp_require_intent();
-- Legacy identity-preserving updates are not a historical backfill requirement.
-- New API inserts through old split-write callers WILL fail until separately coordinated rollout.

CREATE FUNCTION public.novora_persist_concept_brief_with_preview_intent(
  p_concept_brief_id uuid, p_public_reference text, p_brief jsonb, p_contact jsonb, p_admission_context jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE private_context jsonb; existing_brief jsonb; existing_contact jsonb; existing_context jsonb; k text;
  persisted_intent_state text; intent_created boolean := false;
BEGIN
  IF p_concept_brief_id IS NULL OR p_concept_brief_id::text !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' OR
    p_public_reference IS NULL OR p_public_reference !~ '^NOVORA-CB-[0-9]{8}-[A-Z0-9]{4}$' OR
    NOT public.novora_fp_keys(p_brief, ARRAY['piece_type','branch','structure','sub_structure',
      'design_objective','ai_sketch_instruction','brief_payload','summary_items','api_submission']) OR
    NOT public.novora_fp_keys(p_contact, ARRAY['customer_name','customer_email','phone_whatsapp','country_region','contact_note']) OR
    jsonb_typeof(p_brief->'brief_payload') IS DISTINCT FROM 'object' OR
    jsonb_typeof(p_brief->'api_submission') IS DISTINCT FROM 'object' OR
    jsonb_typeof(p_contact->'customer_name') IS DISTINCT FROM 'string' OR btrim(p_contact->>'customer_name') = '' OR
    jsonb_typeof(p_contact->'customer_email') IS DISTINCT FROM 'string' OR btrim(p_contact->>'customer_email') = '' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  END IF;
  FOREACH k IN ARRAY ARRAY['piece_type','branch','structure','sub_structure','design_objective','ai_sketch_instruction'] LOOP
    IF jsonb_typeof(p_brief->k) NOT IN ('string','null') THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['phone_whatsapp','country_region','contact_note'] LOOP
    IF jsonb_typeof(p_contact->k) NOT IN ('string','null') THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
  END LOOP;
  private_context := CASE WHEN public.novora_fp_context_valid(p_admission_context, p_concept_brief_id, p_public_reference)
    THEN p_admission_context ELSE NULL END;
  SELECT jsonb_build_object('piece_type', b.piece_type, 'branch', b.branch, 'structure', b.structure,
    'sub_structure', b.sub_structure, 'design_objective', b.design_objective,
    'ai_sketch_instruction', b.ai_sketch_instruction, 'brief_payload', b.brief_payload,
    'summary_items', b.summary_items, 'api_submission', b.api_submission)
    INTO existing_brief FROM public.concept_briefs b
    WHERE b.id = p_concept_brief_id AND b.public_reference = p_public_reference AND b.source = 'api';
  IF FOUND THEN
    SELECT jsonb_build_object('customer_name', c.customer_name, 'customer_email', c.customer_email,
      'phone_whatsapp', c.phone_whatsapp, 'country_region', c.country_region, 'contact_note', c.contact_note)
      INTO existing_contact FROM public.concept_brief_contacts c WHERE c.concept_brief_id = p_concept_brief_id;
    SELECT i.admission_context INTO existing_context FROM public.first_preview_initiation_outbox i
      WHERE i.concept_brief_id = p_concept_brief_id;
    IF NOT FOUND OR existing_brief IS DISTINCT FROM p_brief OR existing_contact IS DISTINCT FROM p_contact OR
      existing_context IS DISTINCT FROM private_context THEN
      RETURN jsonb_build_object('ok', false, 'code', 'identity_conflict'); END IF;
  ELSE
    INSERT INTO public.concept_briefs(id, public_reference, source, status, piece_type, branch, structure,
      sub_structure, design_objective, ai_sketch_instruction, brief_payload, summary_items, api_submission)
    VALUES (p_concept_brief_id, p_public_reference, 'api', 'new', p_brief->>'piece_type', p_brief->>'branch',
      p_brief->>'structure', p_brief->>'sub_structure', p_brief->>'design_objective', p_brief->>'ai_sketch_instruction',
      p_brief->'brief_payload', p_brief->'summary_items', p_brief->'api_submission');
    INSERT INTO public.concept_brief_contacts(concept_brief_id, customer_name, customer_email,
      phone_whatsapp, country_region, contact_note)
    VALUES (p_concept_brief_id, p_contact->>'customer_name', p_contact->>'customer_email',
      p_contact->>'phone_whatsapp', p_contact->>'country_region', p_contact->>'contact_note');
    INSERT INTO public.first_preview_initiation_outbox(concept_brief_id, state, admission_context, last_reason)
    VALUES (p_concept_brief_id, CASE WHEN private_context IS NULL THEN 'operator_hold' ELSE 'pending' END, private_context,
      CASE WHEN private_context IS NULL THEN 'missing_context' ELSE NULL END);
    intent_created := true;
  END IF;
  -- Observe the stored row, including idempotently reused/advanced Intents.
  -- Reused state is never changed here; creation is an execution fact only.
  SELECT i.state INTO persisted_intent_state FROM public.first_preview_initiation_outbox i
    WHERE i.concept_brief_id = p_concept_brief_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='intent_receipt_unavailable';
  END IF;
  RETURN jsonb_build_object('ok', true, 'value', jsonb_build_object('persisted', true,
    'concept_brief_id', p_concept_brief_id, 'public_reference', p_public_reference,
    'intent_version', 'novora_first_preview_initiation_v1',
    'intent_state', persisted_intent_state, 'intent_created', intent_created));
  -- PostgREST success is emitted after transaction/DEFERRED constraints commit.
  -- Callers must not substitute the old split-write fallback if this RPC fails.
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('ok', false, 'code', 'identity_conflict');
  WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'code', 'repository_unavailable');
END $$;

CREATE FUNCTION public.novora_claim_first_preview_initiations(
  p_owner uuid, p_policy jsonb, p_mode text, p_concept_brief_id uuid,
  p_publication_fence bigint, p_handoff_epoch bigint, p_handoff_stage text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE i public.first_preview_initiation_outbox; rows jsonb := '[]'; t timestamptz := clock_timestamp();
  binding novora_fp_authority.workload_bindings;
BEGIN
  binding := novora_fp_authority.authenticated_binding('worker');
  IF p_owner IS DISTINCT FROM binding.lease_owner OR p_policy IS DISTINCT FROM binding.replay_policy THEN
    RETURN jsonb_build_object('ok', false, 'code', 'lease_conflict'); END IF;
  IF NOT public.novora_fp_policy_valid(p_policy) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'policy_unconfigured'); END IF;
  IF p_owner IS NULL OR p_mode IS NULL OR p_mode NOT IN ('publish','execute') OR
    (p_mode = 'execute' AND (p_concept_brief_id IS NULL OR p_publication_fence IS NULL OR
      p_handoff_epoch IS NULL OR p_handoff_stage IS NULL)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
  FOR i IN SELECT o.* FROM public.first_preview_initiation_outbox o
    WHERE (p_concept_brief_id IS NULL OR o.concept_brief_id = p_concept_brief_id) AND
      ((p_mode = 'publish' AND o.state IN ('pending','waiting_admission','publishing','queued','claimed') AND
        o.next_attempt_at <= t AND (o.lease_until IS NULL OR o.lease_until <= t)) OR
       (p_mode = 'execute' AND o.state IN ('publishing','queued') AND
        o.publication_fence = p_publication_fence AND o.handoff_epoch = p_handoff_epoch AND
        o.handoff_stage = p_handoff_stage))
    ORDER BY o.next_attempt_at, o.concept_brief_id LIMIT (p_policy->>'batch_size')::bigint FOR UPDATE SKIP LOCKED
  LOOP
    -- Each row is now locked; do not age the batch or issue leases from scan time.
    t := clock_timestamp();
    IF p_mode = 'publish' AND (i.next_attempt_at > t OR
        (i.lease_until IS NOT NULL AND i.lease_until > t)) THEN CONTINUE; END IF;
    IF i.admission_context IS NULL OR
      (p_mode = 'publish' AND i.handoff_attempts >= (p_policy->>'max_handoff_attempts')::bigint) OR
      t - i.created_at >= (p_policy->>'max_wait_ms')::double precision * interval '1 millisecond' THEN
      UPDATE public.first_preview_initiation_outbox SET state = 'operator_hold',
        last_reason = CASE WHEN i.admission_context IS NULL THEN 'missing_context' ELSE 'delivery_exhausted' END,
        lease_owner = NULL, lease_until = NULL WHERE concept_brief_id = i.concept_brief_id;
      CONTINUE;
    END IF;
    UPDATE public.first_preview_initiation_outbox SET fence = fence + 1, lease_owner = p_owner,
      lease_until = t + (p_policy->>'lease_ms')::double precision * interval '1 millisecond',
      state = CASE WHEN p_mode = 'publish' THEN 'publishing' ELSE 'claimed' END,
      handoff_attempts = handoff_attempts + CASE WHEN p_mode = 'publish' THEN 1 ELSE 0 END,
      publication_fence = CASE WHEN p_mode = 'publish' THEN coalesce(publication_fence, fence + 1) ELSE publication_fence END,
      last_reason = NULL WHERE concept_brief_id = i.concept_brief_id RETURNING * INTO i;
    rows := rows || jsonb_build_array(public.novora_fp_wire(i));
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'value', rows);
  -- Stable publication fence/epoch survives uncertain handoff retries; ownership
  -- fence changes on every claim. A callback can atomically claim before publisher
  -- acknowledgement; that makes the publisher's later fenced transition stale.
  -- Armed/dispatched/held/terminal rows NEVER enter this ordinary reclaim path.
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'code', 'repository_unavailable');
END $$;

CREATE FUNCTION public.novora_transition_first_preview_initiation(
  p_concept_brief_id uuid, p_owner uuid, p_fence bigint, p_expected_state text,
  p_action text, p_policy jsonb, p_payload jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE i public.first_preview_initiation_outbox; locked_i public.first_preview_initiation_outbox; t timestamptz;
  prep jsonb; private_grant jsonb; recovery jsonb; job public.ai_sketch_jobs; valid boolean; k text;
  binding novora_fp_authority.workload_bindings;
BEGIN
  binding := novora_fp_authority.authenticated_binding('worker');
  IF p_owner IS DISTINCT FROM binding.lease_owner OR p_policy IS DISTINCT FROM binding.replay_policy THEN
    RETURN jsonb_build_object('ok', false, 'code', 'lease_conflict'); END IF;
  IF NOT public.novora_fp_policy_valid(p_policy) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'policy_unconfigured'); END IF;
  SELECT * INTO i FROM public.first_preview_initiation_outbox WHERE concept_brief_id = p_concept_brief_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'invalid_state'); END IF;
  -- FOR UPDATE can wait past expiry or a reclaim. Validate the locked row at current
  -- wall-clock time, never function-entry, statement-start or transaction-start time.
  t := clock_timestamp();
  IF i.state IS DISTINCT FROM p_expected_state OR i.fence IS DISTINCT FROM p_fence OR
      i.lease_owner IS DISTINCT FROM p_owner OR p_owner IS NULL OR
      (NOT (i.state IN ('dispatch_armed','dispatched') AND
        p_action IN ('recover_preclaim','mark_dispatched','complete','hold')) AND
        (i.lease_until IS NULL OR i.lease_until <= t)) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'lease_conflict'); END IF;
  locked_i := i;
  -- All transitions acquire earlier-order locks before any job lock. Source
  -- guards below freeze the signed projection for the whole intake lifetime.
  PERFORM 1 FROM public.concept_briefs WHERE id=i.concept_brief_id FOR SHARE;
  IF i.prepared IS NOT NULL THEN
    PERFORM 1 FROM novora_fp_authority.preparation_selections
      WHERE concept_brief_id=i.concept_brief_id AND reserved_job_id=i.job_id FOR SHARE;
  END IF;
  t := clock_timestamp();
  IF NOT (i.state IN ('dispatch_armed','dispatched') AND
      p_action IN ('recover_preclaim','mark_dispatched','complete','hold')) AND
      (i.lease_until IS NULL OR i.lease_until<=t) THEN
    RAISE EXCEPTION USING ERRCODE='NFP01', MESSAGE='lease_conflict'; END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR p_action IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
  IF p_action = 'prepare' AND i.state = 'claimed' AND i.handoff_stage = 'initiation' THEN
    prep := p_payload->'prepared';
    IF public.novora_fp_keys(p_payload, ARRAY['prepared','preparation_envelope']) IS DISTINCT FROM true OR
        novora_fp_authority.require_released_preparation(p_payload->'preparation_envelope', prep,
          i.concept_brief_id, p_owner, p_fence) IS DISTINCT FROM true THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
    -- Verification may wait for the protected key/Brief lock. Recheck before
    -- ANY job write, preserving P2B's post-job-lock and final rollback checks too.
    t := clock_timestamp();
    IF i.state IS DISTINCT FROM p_expected_state OR i.fence IS DISTINCT FROM p_fence OR
        i.lease_owner IS DISTINCT FROM p_owner OR p_owner IS NULL OR
        i.lease_until IS NULL OR i.lease_until <= t THEN
      RAISE EXCEPTION USING ERRCODE = 'NFP01', MESSAGE = 'lease_conflict'; END IF;
    IF NOT public.novora_fp_keys(prep, ARRAY['job_id','identity_key','generation_input','design_spec_version',
      'design_spec_sha256','hand_sketch_instruction_version','hand_sketch_instruction_sha256',
      'estimated_cost_micros','cost_currency','pricing_assumption_version']) OR
      jsonb_typeof(prep->'generation_input') IS DISTINCT FROM 'object' OR
      jsonb_typeof(prep->'job_id') IS DISTINCT FROM 'string' OR
      jsonb_typeof(prep->'identity_key') IS DISTINCT FROM 'string' OR prep->>'identity_key' !~ '^[a-f0-9]{64}$' OR
      jsonb_typeof(prep->'design_spec_sha256') IS DISTINCT FROM 'string' OR prep->>'design_spec_sha256' !~ '^[a-f0-9]{64}$' OR
      jsonb_typeof(prep->'hand_sketch_instruction_sha256') IS DISTINCT FROM 'string' OR
      prep->>'hand_sketch_instruction_sha256' !~ '^[a-f0-9]{64}$' OR
      prep->>'cost_currency' IS DISTINCT FROM 'USD' OR
      jsonb_typeof(prep->'estimated_cost_micros') IS DISTINCT FROM 'number' OR
      (prep->>'estimated_cost_micros')::numeric < 0 OR
      (prep->>'estimated_cost_micros')::numeric > 9007199254740991 OR
      trunc((prep->>'estimated_cost_micros')::numeric) <> (prep->>'estimated_cost_micros')::numeric THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
    FOREACH k IN ARRAY ARRAY['design_spec_version','hand_sketch_instruction_version','pricing_assumption_version'] LOOP
      IF jsonb_typeof(prep->k) IS DISTINCT FROM 'string' OR btrim(prep->>k) = '' OR
        btrim(prep->>k) <> prep->>k THEN
        RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
    END LOOP;
    IF prep->>'job_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
    IF i.prepared IS NOT NULL AND i.prepared IS DISTINCT FROM prep THEN
      RETURN jsonb_build_object('ok', false, 'code', 'identity_conflict'); END IF;
    -- Same-proof replay retains the existing unique job insert/lock/identity
    -- checks below, with no duplicate job/paid effect. Reclaim changes the fence,
    -- invalidating old proofs; a fresh proof cannot replace accepted preparation.
    IF i.prepared IS NOT NULL AND i.preparation_envelope IS DISTINCT FROM p_payload->'preparation_envelope' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'identity_conflict'); END IF;
    -- The authenticated signer uses the existing JavaScript structured-input
    -- builder/validator and canonical identity function; SQL has no alternative.
    INSERT INTO public.ai_sketch_jobs(id, concept_brief_id, status, prompt_payload, generation_purpose,
      idempotency_key, attempt_number, lineage_identity, parent_job_id, source_output_id,
      design_spec_version, design_spec_hash, hand_sketch_instruction_version, hand_sketch_instruction_hash,
      estimated_cost_micros, cost_currency, pricing_assumption_version,
      provider_name, model_name, provider_endpoint, request_image_count, request_streaming,
      request_partial_images, request_size, request_quality, output_format, moderation_mode)
    VALUES ((prep->>'job_id')::uuid, i.concept_brief_id, 'queued', '{}', 'first_preview',
      prep->>'identity_key', 1, 'first-preview:v1', NULL, NULL, prep->>'design_spec_version',
      prep->>'design_spec_sha256', prep->>'hand_sketch_instruction_version', prep->>'hand_sketch_instruction_sha256',
      (prep->>'estimated_cost_micros')::bigint, 'USD', prep->>'pricing_assumption_version',
      'openai', 'gpt-image-2-2026-04-21', '/v1/images/generations', 1, false,
      0, '1024x1024', 'medium', 'png', 'auto')
    ON CONFLICT DO NOTHING;
    -- Above profile is copied from the EXISTING FIRST_PREVIEW_PROVIDER_PROFILE;
    -- no new Provider policy or production environment value. Review before install.
    SELECT * INTO job FROM public.ai_sketch_jobs WHERE id = (prep->>'job_id')::uuid FOR UPDATE;
    -- Both the insert's conflict wait and the job lock can outlast the lease.
    -- Raise, rather than return, so any inserted job is rolled back on lease loss.
    t := clock_timestamp();
    IF i.state IS DISTINCT FROM p_expected_state OR i.fence IS DISTINCT FROM p_fence OR
        i.lease_owner IS DISTINCT FROM p_owner OR p_owner IS NULL OR
        i.lease_until IS NULL OR i.lease_until <= t THEN
      RAISE EXCEPTION USING ERRCODE = 'NFP01', MESSAGE = 'lease_conflict'; END IF;
    IF NOT FOUND OR job.concept_brief_id <> i.concept_brief_id OR job.generation_purpose IS DISTINCT FROM 'first_preview' OR
      job.attempt_number IS DISTINCT FROM 1 OR job.lineage_identity IS DISTINCT FROM 'first-preview:v1' OR
      job.parent_job_id IS NOT NULL OR job.source_output_id IS NOT NULL OR job.status <> 'queued' OR
      job.idempotency_key IS DISTINCT FROM prep->>'identity_key' OR
      job.design_spec_version IS DISTINCT FROM prep->>'design_spec_version' OR
      job.design_spec_hash IS DISTINCT FROM prep->>'design_spec_sha256' OR
      job.hand_sketch_instruction_version IS DISTINCT FROM prep->>'hand_sketch_instruction_version' OR
      job.hand_sketch_instruction_hash IS DISTINCT FROM prep->>'hand_sketch_instruction_sha256' OR
      job.estimated_cost_micros IS DISTINCT FROM (prep->>'estimated_cost_micros')::bigint OR
      job.cost_currency IS DISTINCT FROM 'USD' OR
      job.pricing_assumption_version IS DISTINCT FROM prep->>'pricing_assumption_version' OR
      job.provider_name IS DISTINCT FROM 'openai' OR job.model_name IS DISTINCT FROM 'gpt-image-2-2026-04-21' OR
      job.provider_endpoint IS DISTINCT FROM '/v1/images/generations' OR
      job.request_image_count IS DISTINCT FROM 1 OR job.request_streaming IS DISTINCT FROM false OR
      job.request_partial_images IS DISTINCT FROM 0 OR job.request_size IS DISTINCT FROM '1024x1024' OR
      job.request_quality IS DISTINCT FROM 'medium' OR job.output_format IS DISTINCT FROM 'png' OR
      job.moderation_mode IS DISTINCT FROM 'auto' THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'identity_conflict'; END IF;
    i.prepared := prep;
    i.preparation_envelope := p_payload->'preparation_envelope';
  ELSIF p_action = 'publish_generation' AND i.state = 'claimed' AND i.handoff_stage = 'initiation' AND i.prepared IS NOT NULL THEN
    -- Not a paid permit. Future caller must independently verify fresh admission
    -- AND O1 reservation before invoking this handoff transition.
    i.state := 'publishing'; i.handoff_stage := 'generation';
    i.handoff_epoch := i.handoff_epoch + 1; i.publication_fence := i.fence;
  ELSIF p_action = 'publication_confirmed' AND i.state = 'publishing' THEN
    i.state := 'queued'; i.lease_owner := NULL; i.lease_until := NULL;
  ELSIF p_action = 'publication_uncertain' AND i.state = 'publishing' THEN
    -- Publishing needs a fenced owner, so retain it until its lease expires.
    i.lease_owner := p_owner; i.lease_until := t;
  ELSIF p_action = 'wait_admission' AND i.state = 'claimed' THEN
    i.state := 'waiting_admission'; i.last_reason := 'admission_unavailable';
    i.lease_owner := NULL; i.lease_until := NULL;
  ELSIF p_action = 'arm' AND i.state = 'claimed' AND i.handoff_stage = 'generation' AND i.prepared IS NOT NULL THEN
    private_grant := p_payload->'grant';
    valid := public.novora_fp_keys(private_grant, ARRAY['version','concept_brief_id','job_id','identity_key','fence',
      'nonce','deadline_ms','admission_context_digest']) AND private_grant->>'version' = i.version AND
      private_grant->>'concept_brief_id' = i.concept_brief_id::text AND private_grant->>'job_id' = i.job_id::text AND
      private_grant->>'identity_key' = i.generation_identity_key AND private_grant->>'fence' = i.fence::text AND
      jsonb_typeof(private_grant->'nonce') = 'string' AND private_grant->>'nonce' ~
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' AND
      jsonb_typeof(private_grant->'admission_context_digest') = 'string' AND
      private_grant->>'admission_context_digest' ~ '^[a-f0-9]{64}$' AND
      jsonb_typeof(private_grant->'deadline_ms') = 'number' AND
      (private_grant->>'deadline_ms')::numeric BETWEEN 1 AND 9007199254740991 AND
      trunc((private_grant->>'deadline_ms')::numeric) = (private_grant->>'deadline_ms')::numeric;
    FOREACH k IN ARRAY ARRAY['version','concept_brief_id','job_id','identity_key','fence'] LOOP
      IF jsonb_typeof(private_grant->k) IS DISTINCT FROM 'string' THEN valid := false; END IF;
    END LOOP;
    IF valid IS DISTINCT FROM true THEN RETURN jsonb_build_object('ok', false, 'code', 'invalid_input'); END IF;
    -- Redis-time deadline validity/digest authenticity is independently verified by
    -- the future backend, not guessed from SQL time or accepted from customers.
    -- Acquire the blocking job lock before authorizing its processing transition.
    SELECT * INTO job FROM public.ai_sketch_jobs WHERE id = i.job_id FOR UPDATE;
    t := clock_timestamp();
    IF i.state IS DISTINCT FROM p_expected_state OR i.fence IS DISTINCT FROM p_fence OR
        i.lease_owner IS DISTINCT FROM p_owner OR p_owner IS NULL OR
        i.lease_until IS NULL OR i.lease_until <= t THEN
      RAISE EXCEPTION USING ERRCODE = 'NFP01', MESSAGE = 'lease_conflict'; END IF;
    UPDATE public.ai_sketch_jobs SET status = 'processing', started_at = t
      WHERE id = job.id AND id = i.job_id AND concept_brief_id = i.concept_brief_id AND status = 'queued'
        AND idempotency_key = i.generation_identity_key AND generation_purpose = 'first_preview'
        AND attempt_number = 1 AND lineage_identity = 'first-preview:v1'
        AND parent_job_id IS NULL AND source_output_id IS NULL
        AND design_spec_version = i.prepared->>'design_spec_version'
        AND design_spec_hash = i.prepared->>'design_spec_sha256'
        AND hand_sketch_instruction_version = i.prepared->>'hand_sketch_instruction_version'
        AND hand_sketch_instruction_hash = i.prepared->>'hand_sketch_instruction_sha256';
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'identity_conflict'); END IF;
    i.state := 'dispatch_armed'; i.dispatch_grant := private_grant;
  ELSIF p_action = 'mark_dispatched' AND i.state = 'dispatch_armed' AND p_payload->'grant' = i.dispatch_grant THEN
    i.state := 'dispatched';
    -- This records a separately verified one-shot Redis commit; it cannot perform one.
  ELSIF p_action = 'recover_preclaim' AND i.state = 'dispatch_armed' AND i.lease_until <= t THEN
    recovery := p_payload->'recovery';
    valid := public.novora_fp_keys(recovery, ARRAY['source','grant','reservation_status','redis_now_ms']) AND
      recovery->>'source' = 'authoritative_redis' AND recovery->'grant' = i.dispatch_grant AND
      recovery->>'reservation_status' = 'reserved' AND jsonb_typeof(recovery->'redis_now_ms') = 'number' AND
      (recovery->>'redis_now_ms')::numeric BETWEEN 0 AND 9007199254740991 AND
      trunc((recovery->>'redis_now_ms')::numeric) = (recovery->>'redis_now_ms')::numeric AND
      (recovery->>'redis_now_ms')::numeric >= (i.dispatch_grant->>'deadline_ms')::numeric;
    IF valid IS DISTINCT FROM true THEN i.state := 'operator_hold'; i.last_reason := 'paid_outcome_unknown';
    ELSE
      SELECT * INTO job FROM public.ai_sketch_jobs WHERE id = i.job_id FOR UPDATE;
      t := clock_timestamp();
      -- Recovery requires the same fenced owner and an expired lease after this
      -- wait; expiry never authorizes a different owner or ordinary dispatch.
      IF i.state IS DISTINCT FROM p_expected_state OR i.fence IS DISTINCT FROM p_fence OR
          i.lease_owner IS DISTINCT FROM p_owner OR p_owner IS NULL OR
          i.lease_until IS NULL OR i.lease_until > t THEN
        RAISE EXCEPTION USING ERRCODE = 'NFP01', MESSAGE = 'lease_conflict'; END IF;
      UPDATE public.ai_sketch_jobs SET status = 'queued', started_at = NULL
        WHERE id = job.id AND id = i.job_id AND concept_brief_id = i.concept_brief_id AND status = 'processing'
          AND idempotency_key = i.generation_identity_key AND generation_purpose = 'first_preview'
          AND attempt_number = 1
          AND provider_request_id IS NULL;
      IF NOT FOUND THEN i.state := 'operator_hold'; i.last_reason := 'recovery_blocked';
      ELSE i.state := 'waiting_admission'; i.dispatch_grant := NULL; i.fence := i.fence + 1; END IF;
    END IF;
    i.lease_owner := NULL; i.lease_until := NULL;
    -- Matching expired UNCLAIMED reservation only. Future Redis must reject late
    -- registration/claim with this expired nonce. No accounting reset/release here.
  ELSIF p_action = 'complete' AND i.state = 'dispatched' THEN
    IF NOT EXISTS (SELECT 1 FROM public.ai_sketch_jobs j JOIN public.ai_sketch_outputs o
        ON o.job_id = j.id AND o.concept_brief_id = j.concept_brief_id
      WHERE j.id = i.job_id AND j.concept_brief_id = i.concept_brief_id AND j.status = 'succeeded'
        AND j.idempotency_key = i.generation_identity_key AND j.generation_purpose = 'first_preview'
        AND j.attempt_number = 1
        AND o.id = (p_payload->>'output_id')::uuid AND o.asset_validation_status = 'passed'
        AND o.asset_validated_at IS NOT NULL
        AND o.readiness_status = 'first_preview_ready' AND o.first_preview_ready_at IS NOT NULL
        AND o.readiness_revoked_at IS NULL AND o.is_current_customer_preview = true) THEN
      RETURN jsonb_build_object('ok', false, 'code', 'completion_unverified'); END IF;
    i.state := 'completed'; i.lease_owner := NULL; i.lease_until := NULL;
  ELSIF p_action = 'hold' THEN
    i.state := 'operator_hold'; i.last_reason := CASE WHEN i.dispatch_grant IS NOT NULL
      THEN 'paid_outcome_unknown' ELSE 'recovery_blocked' END;
    i.lease_owner := NULL; i.lease_until := NULL;
  ELSIF p_action = 'cancel' AND i.state IN ('claimed','publishing','queued') AND i.dispatch_grant IS NULL THEN
    i.state := 'cancelled'; i.lease_owner := NULL; i.lease_until := NULL;
    -- Explicit service-only cancellation; never inferred from elapsed time.
  ELSE RETURN jsonb_build_object('ok', false, 'code', 'invalid_state'); END IF;
  -- The original outbox row remains locked, so its ownership/fence cannot be
  -- replaced by another transaction. Recheck that original row, not the locally
  -- changed state/lease, immediately before persisting the transition. Raising
  -- also rolls back any earlier job insert/update if its work consumed the lease.
  t := clock_timestamp();
  IF locked_i.state IS DISTINCT FROM p_expected_state OR locked_i.fence IS DISTINCT FROM p_fence OR
      locked_i.lease_owner IS DISTINCT FROM p_owner OR p_owner IS NULL OR
      (NOT (locked_i.state IN ('dispatch_armed','dispatched') AND
        p_action IN ('recover_preclaim','mark_dispatched','complete','hold')) AND
        (locked_i.lease_until IS NULL OR locked_i.lease_until <= t)) OR
      (p_action = 'recover_preclaim' AND
        (locked_i.lease_until IS NULL OR locked_i.lease_until > t)) THEN
    RAISE EXCEPTION USING ERRCODE = 'NFP01', MESSAGE = 'lease_conflict'; END IF;
  i.next_attempt_at := t + (p_policy->>'backoff_ms')::double precision * interval '1 millisecond';
  UPDATE public.first_preview_initiation_outbox SET state = i.state, prepared = i.prepared,
    preparation_envelope = i.preparation_envelope,
    handoff_stage = i.handoff_stage, handoff_epoch = i.handoff_epoch, publication_fence = i.publication_fence,
    next_attempt_at = i.next_attempt_at, lease_owner = i.lease_owner, lease_until = i.lease_until,
    fence = i.fence, dispatch_grant = i.dispatch_grant, last_reason = i.last_reason
    WHERE concept_brief_id = i.concept_brief_id RETURNING * INTO i;
  RETURN jsonb_build_object('ok', true, 'value', public.novora_fp_wire(i));
EXCEPTION WHEN SQLSTATE 'NFP01' THEN RETURN jsonb_build_object('ok', false, 'code', 'lease_conflict');
  WHEN check_violation OR unique_violation THEN RETURN jsonb_build_object('ok', false, 'code', 'identity_conflict');
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN jsonb_build_object('ok', false, 'code', 'invalid_input');
  WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'code', 'repository_unavailable');
END $$;


-- Fixed lifecycle operations only. This records trusted application observations;
-- it does not verify Redis, authorize Provider execution, settle O1 or make assets ready.
-- Dispatch bookkeeping precedes the Provider call; registration records the actual
-- returned Provider request identity. Terminal success requires an existing validated
-- private output. Receipt replay returns no dispatch permission and performs no write.
CREATE FUNCTION novora_fp_authority.record_provider_lifecycle(
  p_concept_brief_id uuid, p_job_id uuid, p_owner uuid, p_fence bigint,
  p_expected_state text, p_action text, p_payload jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE b novora_fp_authority.workload_bindings; i public.first_preview_initiation_outbox;
  s novora_fp_authority.preparation_selections; j public.ai_sketch_jobs; after_job public.ai_sketch_jobs;
  t timestamptz; terminal_at timestamptz; slot text; request_value jsonb; prior jsonb; patch jsonb;
  receipt jsonb; provider_id text; category text; phase text; cost bigint; terminal_status text;
BEGIN
  b := novora_fp_authority.authenticated_binding('worker');
  IF p_owner IS NULL OR p_owner IS DISTINCT FROM b.lease_owner OR p_fence IS NULL OR p_fence < 0 THEN
    RETURN jsonb_build_object('ok',false,'code','lease_conflict'); END IF;
  IF p_concept_brief_id IS NULL OR p_job_id IS NULL OR p_expected_state IS NULL OR
      p_action IS NULL OR p_action NOT IN ('record_dispatch','register_provider','provider_result','provider_failure') OR
      jsonb_typeof(p_payload) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('ok',false,'code','invalid_input'); END IF;
  slot := CASE p_action WHEN 'record_dispatch' THEN 'dispatch'
    WHEN 'register_provider' THEN 'registration' ELSE 'terminal' END;
  request_value := jsonb_build_object('job_id',p_job_id::text,'owner',p_owner::text,
    'fence',p_fence::text,'expected_state',p_expected_state,'action',p_action,'payload',p_payload);

  -- Preserve binding -> outbox -> Brief -> selection -> Job lock order.
  SELECT * INTO i FROM public.first_preview_initiation_outbox
    WHERE concept_brief_id=p_concept_brief_id FOR UPDATE;
  IF NOT FOUND OR i.fence IS DISTINCT FROM p_fence OR i.job_id IS DISTINCT FROM p_job_id OR
      i.handoff_stage IS DISTINCT FROM 'generation' OR i.prepared IS NULL THEN
    RETURN jsonb_build_object('ok',false,'code','identity_conflict'); END IF;
  PERFORM 1 FROM public.concept_briefs WHERE id=i.concept_brief_id FOR SHARE;
  SELECT * INTO s FROM novora_fp_authority.preparation_selections
    WHERE concept_brief_id=i.concept_brief_id AND reserved_job_id=p_job_id FOR SHARE;
  IF NOT FOUND OR s.prepared IS NULL OR s.release_envelope IS NULL OR
      s.prepared IS DISTINCT FROM i.prepared OR s.release_envelope IS DISTINCT FROM i.preparation_envelope OR
      s.source_snapshot IS DISTINCT FROM novora_fp_authority.source_snapshot(i.concept_brief_id) OR
      s.admission_context IS DISTINCT FROM i.admission_context OR
      s.worker_role_oid IS DISTINCT FROM b.worker_role_oid OR s.signer_role_oid IS DISTINCT FROM b.signer_role_oid THEN
    RETURN jsonb_build_object('ok',false,'code','identity_conflict'); END IF;
  SELECT * INTO j FROM public.ai_sketch_jobs WHERE id=p_job_id FOR UPDATE;
  t := clock_timestamp(); -- Every potentially blocking row lock has completed.
  IF NOT FOUND OR j.concept_brief_id IS DISTINCT FROM i.concept_brief_id OR
      j.generation_purpose IS DISTINCT FROM 'first_preview' OR j.attempt_number IS DISTINCT FROM 1 OR
      j.idempotency_key IS DISTINCT FROM i.generation_identity_key OR
      j.provider_name IS DISTINCT FROM 'openai' OR j.lineage_identity IS DISTINCT FROM 'first-preview:v1' OR
      j.parent_job_id IS NOT NULL OR j.source_output_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok',false,'code','identity_conflict'); END IF;

  prior := i.provider_lifecycle->slot;
  IF prior IS NOT NULL THEN
    IF prior->'request' IS DISTINCT FROM request_value OR
        (slot='registration' AND j.provider_request_id IS DISTINCT FROM p_payload->>'provider_request_id') OR
        (slot='terminal' AND to_jsonb(j) IS DISTINCT FROM
          to_jsonb(jsonb_populate_record(j,prior->'patch'))) THEN
      RETURN jsonb_build_object('ok',false,'code','identity_conflict'); END IF;
    -- Identical durable evidence only, including after completion/lease expiry.
    -- This is acknowledgement, never permission to resend or spend again.
    RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('recorded',true,'replayed',true));
  END IF;
  IF i.provider_lifecycle ? 'terminal' THEN
    RETURN jsonb_build_object('ok',false,'code','identity_conflict'); END IF;
  phase := p_payload->>'phase';
  IF i.state IS DISTINCT FROM p_expected_state OR i.lease_owner IS DISTINCT FROM p_owner OR
      i.lease_until IS NULL OR
      (i.lease_until<=t AND NOT (p_action='provider_failure' AND phase='paid_outcome_unknown' AND
        i.state IN ('dispatch_armed','dispatched'))) THEN
    RETURN jsonb_build_object('ok',false,'code','lease_conflict'); END IF;
  IF p_action<>'provider_failure' OR phase<>'pre_dispatch' THEN
    IF i.dispatch_grant IS NULL OR i.dispatch_grant->>'concept_brief_id' IS DISTINCT FROM i.concept_brief_id::text OR
        i.dispatch_grant->>'job_id' IS DISTINCT FROM p_job_id::text OR
        i.dispatch_grant->>'identity_key' IS DISTINCT FROM i.generation_identity_key OR
        i.dispatch_grant->>'fence' IS DISTINCT FROM p_fence::text THEN
      RETURN jsonb_build_object('ok',false,'code','invalid_state'); END IF;
  END IF;

  IF p_action='record_dispatch' THEN
    IF p_payload<>'{}'::jsonb OR i.state<>'dispatched' OR j.status<>'processing' OR
        j.actual_cost_micros IS NOT NULL OR j.provider_request_id IS NOT NULL THEN
      RETURN jsonb_build_object('ok',false,'code','invalid_state'); END IF;
    -- Existing protected estimate is a one-shot accounting marker, not billing proof.
    patch := jsonb_build_object('actual_cost_micros',j.estimated_cost_micros,'updated_at',t);
  ELSIF p_action='register_provider' THEN
    provider_id := p_payload->>'provider_request_id';
    IF public.novora_fp_keys(p_payload,ARRAY['provider_request_id']) IS DISTINCT FROM true OR
        jsonb_typeof(p_payload->'provider_request_id') IS DISTINCT FROM 'string' OR
        provider_id='' OR btrim(provider_id)<>provider_id OR length(provider_id)>255 THEN
      RETURN jsonb_build_object('ok',false,'code','invalid_input'); END IF;
    IF i.state<>'dispatched' OR NOT (i.provider_lifecycle ? 'dispatch') OR
        j.status<>'processing' OR j.provider_request_id IS NOT NULL OR
        EXISTS (SELECT 1 FROM public.ai_sketch_jobs other
          WHERE other.provider_name=j.provider_name AND other.provider_request_id=provider_id AND other.id<>j.id) THEN
      RETURN jsonb_build_object('ok',false,'code','identity_conflict'); END IF;
    patch := jsonb_build_object('provider_request_id',provider_id,'updated_at',t);
  ELSIF p_action='provider_result' THEN
    IF public.novora_fp_keys(p_payload,ARRAY['provider_request_id','output_id','content_sha256','actual_cost_micros'])
        IS DISTINCT FROM true OR jsonb_typeof(p_payload->'provider_request_id') IS DISTINCT FROM 'string' OR
        jsonb_typeof(p_payload->'output_id') IS DISTINCT FROM 'string' OR
        jsonb_typeof(p_payload->'content_sha256') IS DISTINCT FROM 'string' OR
        p_payload->>'content_sha256' !~ '^[a-f0-9]{64}$' OR
        jsonb_typeof(p_payload->'actual_cost_micros') IS DISTINCT FROM 'number' OR
        (p_payload->>'actual_cost_micros')::numeric NOT BETWEEN 0 AND 9007199254740991 OR
        trunc((p_payload->>'actual_cost_micros')::numeric)<>(p_payload->>'actual_cost_micros')::numeric THEN
      RETURN jsonb_build_object('ok',false,'code','invalid_input'); END IF;
    IF i.state<>'dispatched' OR j.status<>'processing' OR
        NOT (i.provider_lifecycle ? 'registration') OR j.provider_request_id IS NULL OR
        j.provider_request_id IS DISTINCT FROM p_payload->>'provider_request_id' OR
        NOT EXISTS (SELECT 1 FROM public.ai_sketch_outputs o
          WHERE o.id=(p_payload->>'output_id')::uuid AND o.job_id=j.id AND o.concept_brief_id=i.concept_brief_id AND
            o.content_sha256=p_payload->>'content_sha256' AND o.asset_validation_status='passed' AND
            o.asset_validated_at IS NOT NULL AND o.bucket_name='novora-ai-sketches' AND o.mime_type='image/png') THEN
      RETURN jsonb_build_object('ok',false,'code','completion_unverified'); END IF;
    cost := (p_payload->>'actual_cost_micros')::bigint; -- Record trusted reported usage; O1 never refunds here.
    patch := jsonb_build_object('status','succeeded','completed_at',t,'actual_cost_micros',cost,
      'failure_category',NULL,'retry_eligible',NULL,'terminal_reason',NULL,'error_message',NULL,'updated_at',t);
    -- No output, gate, review or readiness write. Existing complete still requires
    -- the independently validated, current, non-revoked customer-ready output.
  ELSE
    IF public.novora_fp_keys(p_payload,ARRAY['phase','provider_request_id','category','actual_cost_micros'])
        IS DISTINCT FROM true OR jsonb_typeof(p_payload->'phase') IS DISTINCT FROM 'string' OR
        phase NOT IN ('pre_dispatch','provider_failed','paid_outcome_unknown') OR
        jsonb_typeof(p_payload->'category') IS DISTINCT FROM 'string' THEN
      RETURN jsonb_build_object('ok',false,'code','invalid_input'); END IF;
    category := p_payload->>'category';
    IF category NOT IN ('configuration_missing','invalid_structured_input','precondition_failed','invalid_request',
        'authentication_failed','permission_denied','moderation_blocked','rate_limited','provider_unavailable',
        'network_failure','timeout','cancelled','invalid_provider_response','invalid_base64','invalid_image_format',
        'invalid_image_dimensions','image_too_large','unsafe_output','privacy_failure','access_failure',
        'storage_failure','lifecycle_conflict','budget_blocked','unexpected_provider_error') OR
        (p_payload->'provider_request_id'<>'null'::jsonb AND
          jsonb_typeof(p_payload->'provider_request_id') IS DISTINCT FROM 'string') OR
        j.provider_request_id IS DISTINCT FROM p_payload->>'provider_request_id' THEN
      RETURN jsonb_build_object('ok',false,'code','identity_conflict'); END IF;
    IF phase='pre_dispatch' THEN
      IF i.state<>'claimed' OR i.dispatch_grant IS NOT NULL OR j.status<>'queued' OR
          j.provider_request_id IS NOT NULL OR j.actual_cost_micros IS NOT NULL OR
          p_payload->'actual_cost_micros'<>'null'::jsonb OR category='timeout' THEN
        RETURN jsonb_build_object('ok',false,'code','invalid_state'); END IF;
      cost := NULL;
    ELSIF phase='paid_outcome_unknown' THEN
      IF i.state NOT IN ('dispatch_armed','dispatched') OR j.status<>'processing' OR
          p_payload->'actual_cost_micros'<>'null'::jsonb THEN
        RETURN jsonb_build_object('ok',false,'code','invalid_state'); END IF;
      cost := j.actual_cost_micros; -- Unknown stays unknown; never infer zero or refund.
    ELSE
      IF i.state<>'dispatched' OR j.status<>'processing' OR
          NOT (i.provider_lifecycle ? 'registration') OR j.provider_request_id IS NULL OR
          jsonb_typeof(p_payload->'actual_cost_micros') IS DISTINCT FROM 'number' OR
          (p_payload->>'actual_cost_micros')::numeric NOT BETWEEN 0 AND 9007199254740991 OR
          trunc((p_payload->>'actual_cost_micros')::numeric)<>(p_payload->>'actual_cost_micros')::numeric THEN
        RETURN jsonb_build_object('ok',false,'code','invalid_input'); END IF;
      cost := (p_payload->>'actual_cost_micros')::bigint; -- Record trusted reported usage; O1 never refunds here.
    END IF;
    terminal_status := CASE category WHEN 'timeout' THEN 'timed_out' WHEN 'cancelled' THEN 'cancelled' ELSE 'failed' END;
    terminal_at := CASE WHEN category='timeout' THEN greatest(t,j.deadline_at) ELSE t END;
    patch := jsonb_build_object('status',terminal_status,'failure_category',category,'retry_eligible',false,
      'terminal_reason',category,'actual_cost_micros',cost,'failed_at',CASE WHEN terminal_status='failed' THEN terminal_at END,
      'cancelled_at',CASE WHEN terminal_status='cancelled' THEN terminal_at END,
      'timed_out_at',CASE WHEN terminal_status='timed_out' THEN terminal_at END,
      'completed_at',NULL,'error_message',NULL,'updated_at',t);
  END IF;

  -- The append-only server-built patch is also the Job trigger's exact write
  -- authorization. It is never caller-supplied, returned, or a spending permit.
  receipt := jsonb_build_object('request',request_value,'patch',patch);
  UPDATE public.first_preview_initiation_outbox
    SET provider_lifecycle=provider_lifecycle || jsonb_build_object(slot,receipt)
    WHERE concept_brief_id=i.concept_brief_id;
  after_job := jsonb_populate_record(j,patch);
  UPDATE public.ai_sketch_jobs SET status=after_job.status,provider_request_id=after_job.provider_request_id,
    actual_cost_micros=after_job.actual_cost_micros,completed_at=after_job.completed_at,
    failure_category=after_job.failure_category,retry_eligible=after_job.retry_eligible,
    terminal_reason=after_job.terminal_reason,error_message=after_job.error_message,
    failed_at=after_job.failed_at,cancelled_at=after_job.cancelled_at,timed_out_at=after_job.timed_out_at,
    updated_at=after_job.updated_at WHERE id=j.id AND concept_brief_id=i.concept_brief_id;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='provider_lifecycle_conflict'; END IF;
  -- No RETURN-failure after writes: an exception rolls back the receipt AND Job.
  t := clock_timestamp();
  IF i.lease_owner IS DISTINCT FROM p_owner OR i.fence IS DISTINCT FROM p_fence OR
      i.lease_until IS NULL OR (i.lease_until<=t AND NOT
        (p_action='provider_failure' AND phase='paid_outcome_unknown' AND i.state IN ('dispatch_armed','dispatched'))) THEN
    RAISE EXCEPTION USING ERRCODE='NFP01',MESSAGE='lease_conflict'; END IF;
  IF p_action='provider_failure' THEN
    UPDATE public.first_preview_initiation_outbox SET state='operator_hold',lease_owner=NULL,lease_until=NULL,
      last_reason=CASE WHEN phase='pre_dispatch' THEN 'recovery_blocked' ELSE 'paid_outcome_unknown' END
      WHERE concept_brief_id=i.concept_brief_id;
    -- No retry, O1 release, refund or Redis mutation, including after lease expiry.
  END IF;
  RETURN jsonb_build_object('ok',true,'value',jsonb_build_object('recorded',true,'replayed',false));
EXCEPTION WHEN SQLSTATE 'NFP01' THEN RETURN jsonb_build_object('ok',false,'code','lease_conflict');
  WHEN check_violation OR unique_violation THEN RETURN jsonb_build_object('ok',false,'code','identity_conflict');
  WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN jsonb_build_object('ok',false,'code','invalid_input');
  WHEN OTHERS THEN RETURN jsonb_build_object('ok',false,'code','repository_unavailable');
END $$;

-- Existing F2 service_role INSERT/UPDATE on ai_sketch_jobs must not bypass a
-- future RPC. This row guard deliberately retains other-purpose compatibility;
-- changing FROM or TO first_preview also invokes it. TRUNCATE is separately
-- denied by ACLs, and runtime roles must have neither ownership nor TRIGGER.
CREATE FUNCTION novora_fp_authority.protect_first_preview_job()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE i public.first_preview_initiation_outbox; s RECORD;
  binding RECORD; receipt jsonb; request_value jsonb; slot text; allowed boolean;
BEGIN
  IF (TG_OP='INSERT' AND NEW.generation_purpose IS DISTINCT FROM 'first_preview') OR
      (TG_OP='DELETE' AND OLD.generation_purpose IS DISTINCT FROM 'first_preview') OR
      (TG_OP='UPDATE' AND OLD.generation_purpose IS DISTINCT FROM 'first_preview' AND
        NEW.generation_purpose IS DISTINCT FROM 'first_preview') THEN
    IF TG_OP='DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF current_user::text <> 'novora_fp_executor' OR TG_OP='DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='protected_first_preview_operation_required';
  END IF;
  binding := novora_fp_authority.authenticated_binding('worker');
  -- Every executor entrypoint already holds binding -> outbox -> Brief ->
  -- selection before job. The trigger performs no new earlier-order row lock.
  SELECT * INTO i FROM public.first_preview_initiation_outbox WHERE concept_brief_id=NEW.concept_brief_id;
  SELECT * INTO s FROM novora_fp_authority.preparation_selections
    WHERE concept_brief_id=NEW.concept_brief_id AND reserved_job_id=NEW.id;
  IF NOT FOUND OR i.lease_owner IS DISTINCT FROM binding.lease_owner OR
      s.prepared IS NULL OR
      s.release_envelope IS NULL OR s.source_snapshot IS DISTINCT FROM novora_fp_authority.source_snapshot(NEW.concept_brief_id) OR
      s.admission_context IS DISTINCT FROM i.admission_context OR
      NEW.generation_purpose IS DISTINCT FROM 'first_preview' OR NEW.attempt_number IS DISTINCT FROM 1 OR
      NEW.lineage_identity IS DISTINCT FROM 'first-preview:v1' OR NEW.parent_job_id IS NOT NULL OR NEW.source_output_id IS NOT NULL OR
      NEW.idempotency_key IS DISTINCT FROM s.prepared->>'identity_key' OR
      NEW.design_spec_version IS DISTINCT FROM s.prepared->>'design_spec_version' OR
      NEW.design_spec_hash IS DISTINCT FROM s.prepared->>'design_spec_sha256' OR
      NEW.hand_sketch_instruction_version IS DISTINCT FROM s.prepared->>'hand_sketch_instruction_version' OR
      NEW.hand_sketch_instruction_hash IS DISTINCT FROM s.prepared->>'hand_sketch_instruction_sha256' OR
      NEW.estimated_cost_micros IS DISTINCT FROM (s.prepared->>'estimated_cost_micros')::bigint OR
      NEW.cost_currency IS DISTINCT FROM 'USD' OR NEW.pricing_assumption_version IS DISTINCT FROM s.prepared->>'pricing_assumption_version' OR
      NEW.provider_name IS DISTINCT FROM 'openai' OR NEW.model_name IS DISTINCT FROM 'gpt-image-2-2026-04-21' OR
      NEW.provider_endpoint IS DISTINCT FROM '/v1/images/generations' OR NEW.request_image_count IS DISTINCT FROM 1 OR
      NEW.request_streaming IS DISTINCT FROM false OR NEW.request_partial_images IS DISTINCT FROM 0 OR
      NEW.request_size IS DISTINCT FROM '1024x1024' OR NEW.request_quality IS DISTINCT FROM 'medium' OR
      NEW.output_format IS DISTINCT FROM 'png' OR NEW.moderation_mode IS DISTINCT FROM 'auto' THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='protected_job_identity_mismatch';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'queued' OR
        novora_fp_authority.require_released_preparation(s.release_envelope,s.prepared,
          i.concept_brief_id,i.lease_owner,i.fence) IS DISTINCT FROM true THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='released_preparation_required';
    END IF;
  ELSE
    -- Preserve the original arm/recovery write shapes exactly.
    IF (to_jsonb(NEW)-ARRAY['status','started_at','updated_at']) IS NOT DISTINCT FROM
        (to_jsonb(OLD)-ARRAY['status','started_at','updated_at']) AND
        i.prepared IS NOT DISTINCT FROM s.prepared AND i.preparation_envelope IS NOT DISTINCT FROM s.release_envelope AND
        ((OLD.status='queued' AND NEW.status='processing' AND i.state='claimed' AND
            i.handoff_stage='generation' AND i.lease_until>clock_timestamp()) OR
         (OLD.status='processing' AND NEW.status='queued' AND i.state='dispatch_armed' AND
            i.lease_until<=clock_timestamp() AND OLD.provider_request_id IS NULL)) THEN
      RETURN NEW;
    END IF;
    -- Additional writes require the exact append-only server-built lifecycle
    -- receipt. No generic patch endpoint, mutable GUC or caller boolean is trusted.
    IF i.prepared IS DISTINCT FROM s.prepared OR i.preparation_envelope IS DISTINCT FROM s.release_envelope OR
        (to_jsonb(NEW)-ARRAY['status','provider_request_id','actual_cost_micros','completed_at',
          'failure_category','retry_eligible','terminal_reason','error_message','failed_at','cancelled_at','timed_out_at','updated_at'])
        IS DISTINCT FROM
        (to_jsonb(OLD)-ARRAY['status','provider_request_id','actual_cost_micros','completed_at',
          'failure_category','retry_eligible','terminal_reason','error_message','failed_at','cancelled_at','timed_out_at','updated_at']) THEN
      RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='protected_job_transition_required';
    END IF;
    FOREACH slot IN ARRAY ARRAY['dispatch','registration','terminal'] LOOP
      receipt := i.provider_lifecycle->slot;
      request_value := receipt->'request';
      IF request_value->>'job_id'=OLD.id::text AND request_value->>'owner'=i.lease_owner::text AND
          request_value->>'fence'=i.fence::text AND request_value->>'expected_state'=i.state AND
          to_jsonb(NEW)=to_jsonb(jsonb_populate_record(OLD,receipt->'patch')) AND
          i.lease_until IS NOT NULL AND (i.lease_until>clock_timestamp() OR
            (request_value->>'action'='provider_failure' AND
             request_value->'payload'->>'phase'='paid_outcome_unknown' AND i.state IN ('dispatch_armed','dispatched'))) THEN
        allowed := CASE request_value->>'action'
          WHEN 'record_dispatch' THEN slot='dispatch' AND i.state='dispatched' AND i.dispatch_grant IS NOT NULL AND
            OLD.status='processing' AND NEW.status='processing' AND OLD.actual_cost_micros IS NULL AND
            NEW.actual_cost_micros=OLD.estimated_cost_micros AND OLD.provider_request_id IS NULL AND NEW.provider_request_id IS NULL
          WHEN 'register_provider' THEN slot='registration' AND i.state='dispatched' AND i.dispatch_grant IS NOT NULL AND
            i.provider_lifecycle ? 'dispatch' AND OLD.status='processing' AND NEW.status='processing' AND
            OLD.provider_request_id IS NULL AND NEW.provider_request_id=request_value->'payload'->>'provider_request_id' AND
            NEW.actual_cost_micros IS NOT DISTINCT FROM OLD.actual_cost_micros
          WHEN 'provider_result' THEN slot='terminal' AND i.state='dispatched' AND i.dispatch_grant IS NOT NULL AND
            i.provider_lifecycle ? 'registration' AND OLD.status='processing' AND NEW.status='succeeded' AND
            OLD.provider_request_id IS NOT NULL AND NEW.provider_request_id=OLD.provider_request_id AND
            OLD.provider_request_id=request_value->'payload'->>'provider_request_id'
          WHEN 'provider_failure' THEN slot='terminal' AND NEW.retry_eligible=false AND
            NEW.status IN ('failed','timed_out','cancelled') AND
            NEW.provider_request_id IS NOT DISTINCT FROM OLD.provider_request_id AND
            ((request_value->'payload'->>'phase'='pre_dispatch' AND i.state='claimed' AND
                i.dispatch_grant IS NULL AND OLD.status='queued' AND OLD.provider_request_id IS NULL AND
                OLD.actual_cost_micros IS NULL AND NEW.actual_cost_micros IS NULL) OR
             (request_value->'payload'->>'phase' IN ('provider_failed','paid_outcome_unknown') AND
                i.state IN ('dispatch_armed','dispatched') AND i.dispatch_grant IS NOT NULL AND OLD.status='processing'))
          ELSE false END;
        IF allowed IS TRUE THEN RETURN NEW; END IF;
      END IF;
    END LOOP;
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='protected_job_transition_required';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER novora_fp_job_write_guard BEFORE INSERT OR UPDATE OR DELETE
  ON public.ai_sketch_jobs FOR EACH ROW EXECUTE FUNCTION novora_fp_authority.protect_first_preview_job();

CREATE FUNCTION novora_fp_authority.protect_brief_source()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.source='api' AND current_user::text<>'novora_fp_intake_executor' THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='transactional_intake_required'; END IF;
    RETURN NEW;
  END IF;
  IF OLD.source='api' OR (TG_OP='UPDATE' AND NEW.source='api') THEN
    IF TG_OP='DELETE' OR
        ROW(NEW.id,NEW.public_reference,NEW.source,NEW.piece_type,NEW.branch,NEW.structure,NEW.sub_structure,
          NEW.design_objective,NEW.ai_sketch_instruction,NEW.brief_payload,NEW.summary_items,NEW.api_submission)
        IS DISTINCT FROM
        ROW(OLD.id,OLD.public_reference,OLD.source,OLD.piece_type,OLD.branch,OLD.structure,OLD.sub_structure,
          OLD.design_objective,OLD.ai_sketch_instruction,OLD.brief_payload,OLD.summary_items,OLD.api_submission) THEN
      RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='immutable_brief_source'; END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER novora_fp_brief_source_guard BEFORE INSERT OR UPDATE OR DELETE
  ON public.concept_briefs FOR EACH ROW EXECUTE FUNCTION novora_fp_authority.protect_brief_source();

-- CANDIDATE ACL/ownership phase. Execute only in the separately approved atomic
-- migration AFTER compatibility reconciliation. No live ACLs changed by this gate.
-- No blanket revocation of existing application functions or contact privileges.
-- The preflight requires the independent contact-table correction first.
-- PostgreSQL ownership transfer requires CREATE on the containing schema.
-- Temporary owner-only grants are removed before COMMIT; never runtime grants.
GRANT CREATE ON SCHEMA public TO novora_fp_executor,novora_fp_intake_executor;
GRANT CREATE ON SCHEMA novora_fp_authority TO novora_fp_executor,novora_fp_verifier;
ALTER TABLE public.first_preview_initiation_outbox OWNER TO novora_fp_executor;
ALTER TABLE novora_fp_authority.workload_bindings OWNER TO novora_fp_owner;
ALTER TABLE novora_fp_authority.preparation_selections OWNER TO novora_fp_owner;
ALTER TABLE novora_fp_authority.preparation_keys OWNER TO novora_fp_owner;
ALTER TABLE novora_fp_authority.workload_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE novora_fp_authority.preparation_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE novora_fp_authority.preparation_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA novora_fp_authority FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA novora_fp_authority TO novora_fp_executor,novora_fp_intake_executor,novora_fp_verifier;
GRANT USAGE ON SCHEMA public TO novora_fp_executor,novora_fp_intake_executor;
GRANT USAGE ON SCHEMA extensions TO novora_fp_verifier;
GRANT EXECUTE ON FUNCTION extensions.hmac(bytea,bytea,text) TO novora_fp_verifier;
GRANT SELECT ON novora_fp_authority.workload_bindings TO novora_fp_executor;
-- FOR SHARE/UPDATE requires UPDATE on at least one column. Grant ONLY an
-- immutable identity column to the NONLOGIN executor; triggers reject changes.
-- https://www.postgresql.org/docs/17/sql-select.html
GRANT UPDATE(worker_role_oid) ON novora_fp_authority.workload_bindings TO novora_fp_executor;
GRANT SELECT,INSERT,UPDATE ON novora_fp_authority.preparation_selections TO novora_fp_executor;
GRANT SELECT ON novora_fp_authority.preparation_keys TO novora_fp_verifier;
GRANT UPDATE(key_id) ON novora_fp_authority.preparation_keys TO novora_fp_verifier;
CREATE POLICY novora_fp_binding_executor_read ON novora_fp_authority.workload_bindings
  FOR SELECT TO novora_fp_executor USING (true);
CREATE POLICY novora_fp_binding_executor_lock ON novora_fp_authority.workload_bindings
  FOR UPDATE TO novora_fp_executor USING (true) WITH CHECK (false);
CREATE POLICY novora_fp_selection_executor ON novora_fp_authority.preparation_selections
  TO novora_fp_executor USING (true) WITH CHECK (true);
CREATE POLICY novora_fp_key_verifier_read ON novora_fp_authority.preparation_keys
  FOR SELECT TO novora_fp_verifier USING (true);
CREATE POLICY novora_fp_key_verifier_lock ON novora_fp_authority.preparation_keys
  FOR UPDATE TO novora_fp_verifier USING (true) WITH CHECK (false);

-- F2: base tables retain postgres ownership and existing application RLS.
-- Each narrow non-BYPASSRLS executor needs these explicit policies/privileges.
GRANT SELECT ON public.concept_briefs,public.ai_sketch_outputs TO novora_fp_executor;
GRANT UPDATE(id) ON public.concept_briefs TO novora_fp_executor;
GRANT SELECT,INSERT,UPDATE ON public.ai_sketch_jobs TO novora_fp_executor;
GRANT SELECT,INSERT ON public.concept_briefs,public.concept_brief_contacts,
  public.first_preview_initiation_outbox TO novora_fp_intake_executor;
CREATE POLICY novora_fp_source_executor_read ON public.concept_briefs FOR SELECT TO novora_fp_executor USING (true);
CREATE POLICY novora_fp_source_executor_lock ON public.concept_briefs FOR UPDATE TO novora_fp_executor USING (true) WITH CHECK (false);
CREATE POLICY novora_fp_output_executor_read ON public.ai_sketch_outputs FOR SELECT TO novora_fp_executor USING (true);
CREATE POLICY novora_fp_job_executor ON public.ai_sketch_jobs TO novora_fp_executor USING (true) WITH CHECK (true);
CREATE POLICY novora_fp_intake_brief_read ON public.concept_briefs FOR SELECT TO novora_fp_intake_executor USING (true);
CREATE POLICY novora_fp_intake_brief_insert ON public.concept_briefs FOR INSERT TO novora_fp_intake_executor WITH CHECK (source='api');
CREATE POLICY novora_fp_intake_contact_read ON public.concept_brief_contacts FOR SELECT TO novora_fp_intake_executor USING (true);
CREATE POLICY novora_fp_intake_contact_insert ON public.concept_brief_contacts FOR INSERT TO novora_fp_intake_executor WITH CHECK (true);
CREATE POLICY novora_fp_intake_intent_read ON public.first_preview_initiation_outbox FOR SELECT TO novora_fp_intake_executor USING (true);
CREATE POLICY novora_fp_intake_intent_insert ON public.first_preview_initiation_outbox FOR INSERT TO novora_fp_intake_executor WITH CHECK (true);
-- Explicit application compatibility break: old split-write/cleanup paths must
-- be replaced BEFORE installation. These are targeted, not broad live revokes.
REVOKE INSERT,DELETE ON public.concept_briefs FROM service_role;
REVOKE INSERT ON public.concept_brief_contacts FROM service_role;
REVOKE TRUNCATE,TRIGGER ON public.concept_briefs,public.ai_sketch_jobs FROM PUBLIC,anon,authenticated,service_role;
-- Keep F2 service_role job INSERT/UPDATE for other generation purposes; the
-- first-preview row guard denies every protected job write from that role.

-- Assign every new function's owner and remove default ACLs atomically before
-- COMMIT. Nothing in the private schema is a Supabase exposed-schema endpoint.
DO $$
DECLARE f record; owner_name text;
BEGIN
  FOR f IN SELECT p.oid,p.proname,p.oid::regprocedure AS signature
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='novora_fp_authority' LOOP
    owner_name := CASE WHEN f.proname='hmac_matches' THEN 'novora_fp_verifier' ELSE 'novora_fp_executor' END;
    EXECUTE format('ALTER FUNCTION %s OWNER TO %I',f.signature,owner_name);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.signature);
  END LOOP;
END $$;
ALTER FUNCTION public.novora_persist_concept_brief_with_preview_intent(uuid,text,jsonb,jsonb,jsonb) OWNER TO novora_fp_intake_executor;
ALTER FUNCTION public.novora_claim_first_preview_initiations(uuid,jsonb,text,uuid,bigint,bigint,text) OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_transition_first_preview_initiation(uuid,uuid,bigint,text,text,jsonb,jsonb) OWNER TO novora_fp_executor;
-- Pure helpers never acquire definer authority or return keys.
ALTER FUNCTION public.novora_fp_keys(jsonb,text[]) OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_fp_policy_valid(jsonb) OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_fp_hmac_frame(text) OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_fp_preparation_valid(jsonb,jsonb,uuid,uuid,bigint) OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_fp_context_valid(jsonb,uuid,text) OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_fp_protect_intent() OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_fp_require_intent() OWNER TO novora_fp_executor;
ALTER FUNCTION public.novora_fp_wire(public.first_preview_initiation_outbox) OWNER TO novora_fp_executor;
REVOKE CREATE ON SCHEMA public FROM novora_fp_executor,novora_fp_intake_executor;
REVOKE CREATE ON SCHEMA novora_fp_authority FROM novora_fp_executor,novora_fp_verifier;

-- Exact grants. PUBLIC/anon/authenticated cannot invoke any candidate function.
REVOKE ALL ON FUNCTION public.novora_fp_keys(jsonb,text[]), public.novora_fp_policy_valid(jsonb),
  public.novora_fp_hmac_frame(text), public.novora_fp_preparation_valid(jsonb,jsonb,uuid,uuid,bigint),
  public.novora_fp_context_valid(jsonb,uuid,text), public.novora_fp_protect_intent(),
  public.novora_fp_require_intent(), public.novora_fp_wire(public.first_preview_initiation_outbox),
  public.novora_persist_concept_brief_with_preview_intent(uuid,text,jsonb,jsonb,jsonb),
  public.novora_claim_first_preview_initiations(uuid,jsonb,text,uuid,bigint,bigint,text),
  public.novora_transition_first_preview_initiation(uuid,uuid,bigint,text,text,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.novora_fp_keys(jsonb,text[]), public.novora_fp_policy_valid(jsonb),
  public.novora_fp_context_valid(jsonb,uuid,text), public.novora_fp_protect_intent(),
  public.novora_fp_require_intent() TO novora_fp_intake_executor;
GRANT EXECUTE ON FUNCTION novora_fp_authority.hmac_matches(text,bytea,text) TO novora_fp_executor;
GRANT EXECUTE ON FUNCTION public.novora_persist_concept_brief_with_preview_intent(uuid,text,jsonb,jsonb,jsonb) TO service_role;
-- Runtime grants intentionally absent until actual independent LOGIN roles and
-- protected bindings are provisioned under a separate gate. That stage grants
-- USAGE public + novora_fp_authority to each verified workload, and ONLY:
-- assigned signer: select_preparation_claim(uuid), bind_preparation(uuid,jsonb),
--                  authorize_preparation_release(uuid,jsonb);
-- assigned worker: public.novora_claim_first_preview_initiations(...),
--                  public.novora_transition_first_preview_initiation(...),
--                  novora_fp_authority.record_provider_lifecycle(uuid,uuid,uuid,bigint,text,text,jsonb).
-- NO helper, key-verifier, table, DDL, owner membership or grant-option access.
-- Audit role-specific/column/inherited/default ACLs and all alternate definer
-- routines at provisioning; authenticated_binding repeats conservative checks.
-- Privileged revocation/rotation must first disable the protected binding under
-- its row lock, then change credentials/role ACLs; runtime roles cannot do either.
-- Revoke unintended existing PUBLIC execution of alternate privileged routines
-- under their own reviewed correction gate; this candidate will deny a workload
-- if it can execute any unapproved user-schema SECURITY DEFINER routine.

COMMIT;
