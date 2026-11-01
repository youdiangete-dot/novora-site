# Nonpayment isolated setup request and deferred TEST-01 plan

This draft records the combined local candidate and one proposed TEST-only setup
request, split after Owner deferred collection/payment on 2026-11-01 until the
Taipei partner can cooperate Monday 2026-11-02. The date does not automatically
resume payment work. It grants no execution permission, creates no credentials/invitations,
and is not a Production or complete G2 acceptance claim. The coordinator binds
the final commit SHA and designated existing Owner identity before presenting it.

## Exact target and candidate SQL

Read-only connector metadata checked on 2026-11-01:

- Supabase `novora-m2-beta-isolated`, ref `dibpksbbzjczpjusujwk`, healthy,
  database `17.11.0.003`. No customer rows, keys or environment values were read.
- Vercel `project-dd34e`, ID `prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg`, Next.js,
  Node 24.x. This establishes project identity, not Preview environment values.
- The three package tables are absent. Existing concept/AI tables have RLS and
  the old source-output FK references `(id, job_id, concept_brief_id)`. Existing
  receipt migrations are present. CHECK definitions, RPC/index name conflicts,
  effective grants and live Preview-to-isolated-DB binding need the exact
  metadata preflight in the eventual approved setup; they were not assumed.

| Candidate file | Exact SHA-256 |
| --- | --- |
| `docs/novora-test01-image-packages-candidate.sql` | `660aec6edac9584506f480ac99c937d1a6e8539770001676407f7ee0f2f00376` |
| `docs/novora-g2-revision-current-output-candidate.sql` | `c0f34cea54176f1e1f6070407c6ce54976c8398c15a7249d71e296b612c31a44` |

B's actual isolated local PostgreSQL 17.11 PASS for both files, role/default-ACL
checks and two-session races is in `tests/tools/test01-image-packages-db-results.md`
and `tests/tools/test01-revision-db-results.md`. This is not online Supabase proof.
The older revision candidate hash is superseded and must not be substituted.

The package candidate creates only purchases, uses and Sandbox operation tables,
the balance index and eleven bounded RPCs under `novora_test_image_package_*`.
It enables RLS and restricts runtime grants/updates/EXECUTE to service_role.
The revision candidate replaces exactly
`ai_sketch_jobs_source_output_lineage_fkey` and
`ai_sketch_jobs_mvp_core_identity_check`, and adds
`novora_promote_revision_output(uuid,uuid,uuid,uuid,text,text,jsonb,timestamptz)`.
Before execution, compare exact existing constraints, referenced unique keys,
roles/ACLs and all candidate object names. Conflicts or drift stop this request;
do not repair, rewrite, replace objects or migrate Production under this draft.

## Minimal future nonpayment request

Bind the final reviewed source SHA to the named isolated Preview and approve
only invitation/receipt/private-image/feedback/current-direction configuration
and the exact revision candidate above, after the metadata preflight. Do not
include the package SQL, payment account, credentials, Owner manual-payment
configuration or actual Sandbox acceptance in this request. Keep
`NOVORA_TEST_IMAGE_PACKAGES_ENABLED=false` and
`NOVORA_PAYPAL_SANDBOX_ENABLED=false`; no new payment-specific implementation.

The revision SQL is independent DDL: it changes AI job ancestry constraints and
adds atomic current-output promotion. It does not create or grant entitlements.
Initial invitation submission/first preview, feedback and direction confirmation
do not require the TEST-01 purchase tables. Existing invitation/free quota stays
unchanged. This preparation does not authorize another paid Provider call.

Nonpayment configuration names/value categories only, scoped to this Preview:

- `NEXT_PUBLIC_SUPABASE_URL`: the named isolated project's public API URL;
  `SUPABASE_SERVICE_ROLE_KEY`: its server Secret, never printed or copied from
  Production. Preserve existing private `SUPABASE_STORAGE_BUCKET_AI_SKETCHES`
  binding and reviewed Storage policy; this request introduces no upload flow.
- `NOVORA_BETA_ADMISSION_ENABLED`, `NOVORA_BETA_INVITATIONS_JSON`: explicit gate
  and the designated existing opaque identity/credential-hash roster. The
  coordinator must bind that actual identity; no new bearer is generated here.
- `NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED=true` and
  `NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE`: the proposed nonsecret namespace
  and exact stable scope below; approval is still required.
- `NOVORA_FIRST_PREVIEW_ACCESS_SIGNING_SECRET`: existing server-only proof/
  feedback signing Secret. Admin review, if used, retains the existing protected
  `NOVORA_ADMIN_ACCESS_KEY` mechanism, without payment Owner configuration.
- `NOVORA_INSTANT_PREVIEW_AGENT_ENABLED`,
  `NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED`, `OPENAI_API_KEY`: existing
  independent generation/Queue/Provider prerequisites; keep execution disabled
  until exact spending authority and any separate paid-call window are approved.
  Do not create or expose Provider credentials under this draft.
- `NOVORA_BETA_SPENDING_AUTHORITY_ID` and one complete existing Redis pair:
  the separately funded, actual source/deployment-bound authority described
  below. Stable invitation identity supplies no money or dispatch permission.

**Actual revision dispatch remains blocked without an entitlement backend.**
`createProductionRevisionHttpService` in
`lib/server/ai-sketch/first-preview-revision-runtime.ts` requires a persisted
owner/scope/provider-bound purchase derived by the existing subject mapper.
The service then requires reserve/claim/settle plus exact terminal-failure reads;
those use B's purchases/uses tables and eight entitlement RPCs, independently
of Redis funding. The reviewed package SQL bundles these with the Sandbox
operation table/three RPCs. Its full hash cannot honestly be called a minimal
nonpayment migration. Do not apply an unreviewed subset, enable payment routes,
fabricate a paid grant or bypass entitlement/spending admission to unblock it.

Supported **local synthetic** continuation is the existing `revisionFixture`
in `tests/e2e/automatic-first-preview-generation.spec.ts`: an in-memory preview
repository with injected entitlement reserve/claim/settle and explicit funded
cost callbacks, plus injected Provider/private-output fixtures. The selected
HTTP/Queue/UNKNOWN cases exercise that fixture; the browser revision test mocks
the HTTP API. These do not write payment records or prove a deployed grant.
SQL promotion fixtures in `tests/tools/g2-revision-promotion-*.sql` separately
exercise promotion against local synthetic AI rows; do not run bootstrap
fixtures against Supabase. There is currently no approved deployed synthetic
entitlement-grant path. If actual revision execution is required before payment
resumes, the coordinator must separately scope a reviewed TEST-only entitlement
fixture/migration path; preserve both immutable entitlement and funded cost gates.

No application source was changed to weaken this dependency. Nonpayment setup
can advance invitation/private reads/feedback/confirmation preparation while
revision execution remains explicitly unproven in the deployed environment.

## Preserved deferred payment setup (not requested now)

After explicit resumption only, consider the two exact SQL files above against the named isolated project,
plus named branch-scoped Preview configuration and synthetic TEST acceptance
records. Apply the reviewed files only after their target metadata matches;
do not execute fixture/bootstrap SQL against Supabase. Preserve existing rows,
private assets, unrelated grants, free invitation quotas and consumed costs.

Use `integration/instant-first-preview-agent` Preview for the existing funded
Preview binder: current code requires this genuine Git ref, actual source SHA,
actual Deployment ID, Node runtime and project identity. Do not forge Vercel
system variables to make another branch appear compatible. The coordinator
must first bind the accepted source to that Preview; this draft authorizes no
push, PR, merge, deployment or environment write by itself.

The application variables below are only for that approved Preview. Do not alter
Production, main's configuration, or copy Production Secret values into Preview.

| Variable names | Value category / binding |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public API URL of exactly `dibpksbbzjczpjusujwk` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Secret belonging to that isolated project; never printed |
| `NOVORA_BETA_ADMISSION_ENABLED` | Explicit boolean invitation gate |
| `NOVORA_BETA_INVITATIONS_JSON` | Existing designated opaque identity plus high-entropy bearer SHA-256 roster; no email/body authority or actual bearer in Git |
| `NOVORA_INVITATION_TRIAL_RECEIPTS_ENABLED` | Explicit true for stable trial scope; invalid flag fails closed |
| `NOVORA_INVITATION_TRIAL_RECEIPT_NAMESPACE` | Proposed nonsecret namespace `novora_test01_g4_20261101_v1`, subject to approval |
| `NOVORA_TEST_IMAGE_PACKAGES_ENABLED` | Must remain false during deferral |
| `NOVORA_ADMIN_ACCESS_KEY` | Existing protected admin Secret only if existing nonpayment admin review requires it; no new payment access setup |
| `NOVORA_TEST_IMAGE_PACKAGES_OWNER_IDENTITY` | Deferred: designated existing roster identity, never invented here |
| `NOVORA_TEST_IMAGE_PACKAGES_OWNER_SCOPE` | Deferred: exact stable scope derived below |
| `NOVORA_TEST_IMAGE_PACKAGES_OWNER_VERIFIER_ID` | Deferred: designated stable server verifier ID |
| `NOVORA_FIRST_PREVIEW_ACCESS_SIGNING_SECRET` | Existing server-only customer proof/feedback signing Secret |
| `NOVORA_PAYPAL_SANDBOX_ENABLED` | Remains false/absent until exact account/credential approval |
| `NOVORA_PAYPAL_SANDBOX_CLIENT_ID`, `NOVORA_PAYPAL_SANDBOX_CLIENT_SECRET`, `NOVORA_PAYPAL_SANDBOX_MERCHANT_ID` | Deferred; no provisioning or credential/config changes now. Future matching Sandbox REST app and 13-character seller merchant ID |

With the trial flag true, the verifier now explicitly prioritizes stable trial
scope over M2 deployment scope. For the proposed namespace and Preview target:

```text
scope = sha256(joinWithLF(
  "novora_invitation_trial_receipt_v1",
  "prj_H9Di3TIvXiZJHO06WwoaW8RqFfVg", "preview",
  "novora_test01_g4_20261101_v1"
))
expected scope = cd39213e4a7cf167bb036632532d22802eded7aa04fb44f835dcf516f86147af
```

That is a proposed nonsecret partition, not a configured invitation. Deployment
SHA/ID and spending-authority changes no longer change it. Owner manual
confirmation requires BOTH this exact allowlisted invitation pair AND the valid
existing admin cookie. Generic admin access alone cannot grant. Subject and
purchase UUIDs follow `lib/server/image-packages/identity.ts`; they never
authenticate a request and are not selected by a client UUID/paid assertion.
Old M2 receipts/packages are not migrated. Namespace changes must not reset an
UNKNOWN payment, generation reservation or cost.

## Independent Queue and cost authority

Stable invitation identity is not dispatch or spending permission. Existing
`NOVORA_INSTANT_PREVIEW_AGENT_ENABLED` and
`NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED` gates, private Storage and
Provider configuration remain independently controlled. Keep paid generation off
until the already-approved acceptance window, remaining budget and call count
are bound; no Provider call is authorized by this setup draft.

The current funded Preview binder also requires:

- Genuine Preview metadata for this project and
  `integration/instant-first-preview-agent`, valid source SHA/Deployment ID and
  Node runtime; the effective funded Preview roster currently contains exactly
  one identity. Do not add an extra Owner identity to bypass this check; an
  existing designated test identity may hold the Owner role only with admin auth.
- `NOVORA_BETA_SPENDING_AUTHORITY_ID` as the reviewed authority input and exactly
  one complete existing Redis pair: `UPSTASH_REDIS_REST_URL` /
  `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
- The existing durable funded ledger at
  `novora:beta-admission:m2-e2e:v1:<runtimeBinding>`, with matching derived
  `m2e2e_<runtimeBinding first 56 hex>` authority ID. `runtimeBinding` remains
  derived from actual deployment/source/authority/roster metadata. Its ID is not
  replaced by the stable customer scope or a client value.
- Existing reviewed pricing profile, Owner cost authority, durability, expiry,
  remaining budget and call/attempt caps. A TEST-01 grant of 5+5 is not ten calls.
  The single-attempt risk profile remains single-attempt; do not silently extend
  it, reuse expired authority, reset r12 expenditure or invent a verified ceiling.

Revision dispatch requires BOTH B's immutable entitlement claim and the atomic
funded ledger dispatch claim before Provider invocation. Missing/invalid/unfunded
authority fails closed even with a valid stable trial identity. UNKNOWN permits
read reconciliation only and cannot authorize another operation.

## Sandbox eligibility and missing approvals

This entire payment subsection is retained for later coordination, not part of
the current nonpayment request. No account, credential or actual payment action
may resume merely because Monday arrives.

Before enabling Sandbox, the account holder must confirm an eligible Sandbox
seller/REST app, personal Sandbox buyer, matching seller merchant ID and secure
server credential provision. PayPal's official current guide requires Business
eligibility for testing outside the US. A Taiwan personal account is not proof
of that eligibility. This draft does not authorize account conversion/onboarding,
company registration, real charges or a live endpoint fallback.

Still required from the coordinator's final exact request: accepted final source
SHA and Preview identity; the exact existing invitation/Owner/verifier identities;
isolated online schema and branch-scoped settings approval; appropriate remaining
cost authority/window; and Sandbox account/credential eligibility if Sandbox is
to be enabled. No Secret values need to appear in chat, Git, URLs, browser bundles
or logs. Manual synthetic TEST confirmation can remain separate from an
unconfigured Sandbox; neither is evidence of live commercial payment acceptance.

Official references: [PayPal setup](https://developer.paypal.com/api/get-started/),
[Sandbox account roles](https://developer.paypal.com/sandbox-testing/accounts).
