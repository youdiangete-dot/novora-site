# Isolated PR287 Signer runtime

Local source artifact only. No credentials, key provisioning, verifier changes,
deployment, Queue wiring, or paid execution is performed by this package.

From this directory, install the pinned dependencies with
`npm ci --ignore-scripts --no-audit --no-fund`, then run `npm run build`.
The build bundles the existing Signer and its transitive structured-input
contracts into `out/pr287-signer-runtime/` at the repository root. Its isolated
server bundle resolves the Next.js `server-only` marker at build time; website
resolution and source are unchanged. No business logic is copied into a second
implementation. The generated source manifest records the bundled inputs.

Only that generated directory is the future deployment root. It contains its
own package/lockfile, Node 24 API, local executable server and Vercel routing.
It requires no files outside that directory; `npm ci --omit=dev --ignore-scripts
--no-audit --no-fund` installs only its runtime dependencies. Vercel routing
exposes only `/api/prepare`; bundle, manifest and package files are not routes.
Do not point a Vercel root at this source directory and assume outside imports
will work. A deployment to a separate project requires another authorized gate.

`npm test` executes the built offline test bundle. It uses fake database clients,
public test-only keys and network tripwires. `npm start` runs the generated local
server on loopback port 8080; do not start it with live credentials in an offline
gate. A future Vercel deployment uses the generated `api/prepare.mjs` Web handler.

## Explicit configuration contract

No defaults load `.env`, website Supabase credentials, PG environment settings,
or browser keys. Missing or invalid configuration returns `signer_unavailable`
without creating a database connection. Only these service-specific inputs are
read, together with trusted Vercel deployment identity:

| Name | Required meaning |
| --- | --- |
| `NOVORA_SIGNER_ENABLED` | Literal `true`; absent is disabled. Activation is a separate gate. |
| `NOVORA_SIGNER_SERVICE_ID` | Dedicated Signer Vercel project ID; must match `VERCEL_PROJECT_ID` and must not be the website project. |
| `NOVORA_SIGNER_PROJECT_REF` | Exactly `kiwoujhhhsnromxfwdxh`. |
| `NOVORA_SIGNER_DATABASE_URL` | Dedicated `novora_pr287_signer_isolated` login. Direct project host on 5432, or the exact shared-pooler host from Supabase on 5432/6543 with username `novora_pr287_signer_isolated.kiwoujhhhsnromxfwdxh`. No query options. |
| `NOVORA_SIGNER_DATABASE_CA_PEM` | Optional verified database CA; system trust is used otherwise. TLS certificate validation is never disabled. |
| `NOVORA_SIGNER_PREPARATION_KEY_BASE64` | Preparation-only, canonical base64 encoding of 32–256 bytes, independently scoped to this service. |
| `NOVORA_SIGNER_PREPARATION_KEY_ID` | Explicit preparation key ID. |
| `NOVORA_SIGNER_VERIFIER_KEY_ID` | Must equal the provisioned key ID; this configuration assertion does not prove actual verifier synchronization. |
| `NOVORA_SIGNER_KEY_STATE` | Literal `active`; missing/revoked state denies. |
| `NOVORA_SIGNER_WORKLOAD_AUTH_BASE64` | Distinct canonical base64 service-authentication key, 32–256 bytes. Must not equal the preparation key. |

Only trusted `VERCEL_ENV=preview`, `NODE_ENV=production`, and absent or matching
`VERCEL_TARGET_ENV` are accepted. Production and contradictory identities deny.
No real configuration is provided by this repository. Future provisioning must
independently establish Signer-only secret access and verifier coordination.
Existing Production and customer Preview settings must not be reused or changed.

## Workload request contract

The sole action is `POST /api/prepare` with `Content-Type: application/json` and
an at-most-2048-byte object containing exactly `concept_brief_id`, `owner`, and
`fence`. These are a selector and expected authoritative claim binding, not a
customer assertion of permission. No other payload or arbitrary bytes are signed.

Headers are `x-novora-workload: novora_pr287_worker_isolated`,
`x-novora-issued-at` (Unix seconds), `x-novora-nonce` (24–64 ASCII letters,
digits, `_` or `-`), and `Authorization: NOVORA-SIGNER-V1 <hex SHA-256 HMAC>`.
The MAC uses only the distinct workload-authentication key over UTF-8 JSON of:

```text
["novora-signer-workload-v1", serviceProjectId,
 "novora_pr287_worker_isolated", "POST", "/api/prepare",
 issuedAtString, nonce, conceptBriefId, owner, fence]
```

Requests older than 60 seconds or over 5 seconds in the future deny. Nonces are
rejected on reuse within a warm instance; this is not distributed exactly-once
authentication. Across instances, protected SQL must still verify the current
Signer/Worker binding, source, lease, owner, fence, selection, key and release.
The credential authenticates the single approved isolated Worker principal;
mere possession of a public Brief UUID cannot authorize the operation.

## Database and release semantics

One lazy `pg` pool per warm instance, maximum one connection, explicit TLS and
certificate validation. Direct-host project identity or shared-pooler project
suffix is pinned; authenticated `session_user`, `current_user`, and database
are rechecked inside every transaction. No role switching is permitted. Shared
transaction pooling uses unnamed parameterized queries, not named prepared
statements. No public generic-query method is exposed.

Only the existing protected select, bind and release functions are callable.
Each uses the same checked-out client through BEGIN, identity check, parameterized
operation and acknowledged COMMIT. Failed/uncertain COMMIT, a ROLLBACK response,
identity mismatch or TLS failure denies and discards the connection. There are
no retries. A connection-configuration change on a warm instance also denies.

The existing candidate validates authoritative preparation and releases its
exact envelope only after committed `authorize_preparation_release`. That RPC
is the definitive check of the current enabled, unrevoked verifier key and
claim, including changes between local key loading and release. Key-ID settings
alone do not establish authorization. No verifier key table is read or initialized
by this runtime. Fresh owned key buffers are erased by the existing Signer;
temporary adapter and transport buffers are erased too. Immutable environment
strings and crypto-internal copies cannot be guaranteed zeroized by JavaScript.

Successful envelopes contain private source material and go only to the
authenticated workload with `Cache-Control: no-store`; they must never be
forwarded to customer endpoints, browser code, Queue bodies or telemetry.
Errors contain fixed codes only. The runtime never logs claims, envelopes,
connection strings or keys. Preparation is not paid admission or dispatch.

This local package does not prove live authentication, secret isolation,
verifier synchronization, deployed runtime readiness or Outbox publication.
