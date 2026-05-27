# NOVORA Rate-Limit Provider Env Preflight

## 1. Purpose And Scope

This checklist prepares NOVORA for real public API rate-limit enforcement in
Preview before any Production rollout.

It is a docs-only planning artifact. It does not configure providers, create or
store secrets, change Vercel environment variables, add app code, change tests,
execute SQL, change Supabase, change Resend or Cloudflare, send email, deploy,
merge, or provision any provider.

Current baseline:

- PR #73 added the server-only public API rate-limit helper foundation.
- `/api/concept-briefs` has minimal fail-open rate-limit integration.
- Rate limiting is disabled unless Redis/KV provider environment variables are
  configured.
- PR #74 fixed the Concept Brief submit timeout before admin notification.
- PR #75 updated the project ledger after PR #74 Production smoke verification.
- Full public API abuse-control provider enforcement is not active yet.

## 2. Recommended Preview-First Provider Path

Recommended path for the first real enforcement test:

1. Use a Redis-style durable provider in Preview first.
2. Prefer the naming family already supported by the helper:
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or
   `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Choose one naming family for the Preview test. Do not set both families
   unless a future app-code task explicitly designs and verifies migration
   behavior.
4. Use Preview-scoped provider values first. Production values should remain
   unset until Preview behavior is reviewed and a separate Production approval
   exists.
5. Keep Supabase out of the first-line rate-limit provider path. Supabase
   remains the Concept Brief system of record, not the preferred public abuse
   counter store.

Preview-first testing should use synthetic Concept Brief submissions only. Do
not use real customer names, emails, phone numbers, addresses, reference images,
or customer public references in Preview abuse-control tests.

## 3. Environment Variable Names Expected By Code

The current helper reads these server-only Redis/KV provider variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

The current helper also reads:

- `NOVORA_INTERNAL_SIGNING_SECRET`

`NOVORA_INTERNAL_SIGNING_SECRET` is required for email-based rate-limit keys.
Without it, email-based limiting stays disabled for requests that would
otherwise use the normalized customer email key. IP-based limiting can still use
a SHA-256-derived key when a Redis/KV provider is configured, but the preferred
Preview readiness state includes the signing secret so no PII-derived keys are
stored without HMAC protection.

Planned but not active in the current helper:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Turnstile setup is a separate future approval gate and should not be included in
this Preview rate-limit provider preflight unless that task explicitly expands
scope.

## 4. Manual Values To Create And Where

After explicit user approval in a separate provider/env setup task, create these
values manually:

| Value | Where | Scope | Notes |
| --- | --- | --- | --- |
| Redis/KV REST URL | Approved provider dashboard and Vercel env | Preview first | Choose either Upstash or Vercel KV naming. Do not paste raw values into chat, docs, PRs, logs, or screenshots. |
| Redis/KV REST token | Approved provider dashboard and Vercel env | Preview first | Server-only. Never use a `NEXT_PUBLIC_*` prefix. |
| `NOVORA_INTERNAL_SIGNING_SECRET` | Secure local secret generator and Vercel env | Preview first | Server-only high-entropy secret. Do not store in the repository or task notes. |

Production environment values should not be created during Preview preflight
unless a separate Production-specific approval explicitly authorizes that exact
action.

## 5. Safe Signing Secret Generation

`NOVORA_INTERNAL_SIGNING_SECRET` must be generated and stored without exposing
the raw value in chat, docs, terminal transcripts, screenshots, PR descriptions,
issues, or logs.

Safe process:

1. Use an approved secure secret generator or password manager on the operator's
   machine.
2. Generate a high-entropy random value suitable for server-side HMAC signing.
3. Copy the value directly from the generator or password manager into the
   approved Vercel Preview environment variable field.
4. Store the value only in the approved secret manager if operational recovery
   requires it.
5. Verify presence by variable name and behavior only. Do not print the value.

Do not ask Codex to create, display, paste, or store the real signing secret.
Secret generation and storage are must-stop actions requiring explicit approval.

## 6. PII-Safe Logging Rules

Preview verification must not log or paste raw customer PII.

Do not log:

- Raw IP addresses.
- Raw email addresses.
- Phone numbers.
- Customer names.
- Free-text design notes.
- Uploaded file names or image metadata tied to a customer.
- Provider URLs, tokens, signing secrets, or API keys.

Safe operational signals may include:

- Route name, such as `/api/concept-briefs`.
- Provider family, such as `upstash` or `vercel_kv`.
- Non-sensitive reason codes, such as `provider_env_missing`,
  `provider_env_incomplete`, `provider_error`, `within_limit`, or
  `rate_limit_exceeded`.
- HTTP status and safe rate-limit headers when enforcement blocks a request.

## 7. Verify Disabled Or Fail-Open Behavior Before Provider Env

Before configuring provider env in Preview, verify the current fail-open
baseline:

1. Confirm the Preview deployment does not have Redis/KV provider env set.
2. Submit a synthetic Concept Brief through the Preview customer flow.
3. Confirm the submission is not blocked by rate limiting.
4. Confirm no raw email, raw IP, provider token, signing secret, or payload PII
   is printed in logs.
5. If only one variable from a provider family is present, confirm logs show a
   safe incomplete-provider operational signal without raw values.

Expected helper behavior before provider env exists:

- Missing Redis/KV provider env returns `allowed: true`.
- The mode is `disabled`.
- The reason is `provider_env_missing`.
- Customer submissions continue through the existing Concept Brief path.

If a configured provider fails at runtime, the current `/api/concept-briefs`
rate-limit helper allows the request fail-open and logs only a safe
provider-error operational signal.

## 8. Verify Enabled Enforcement After Provider Env

After explicit approval and manual Preview env setup:

1. Confirm the Preview deployment has exactly one complete Redis/KV naming
   family configured:
   - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or
   - `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
2. Confirm `NOVORA_INTERNAL_SIGNING_SECRET` is present in Preview if testing
   email-based limiting.
3. Redeploy the Preview environment so runtime code can read the new variables.
4. Submit synthetic requests below the configured limits and confirm they are
   accepted.
5. Submit synthetic requests above the configured limits and confirm a `429`
   response with safe rate-limit headers.
6. Confirm the response copy stays customer-safe and does not reveal provider
   details.
7. Confirm provider counters advance in the provider dashboard without storing
   raw email or raw IP keys.
8. Confirm logs do not include raw request PII, provider tokens, or signing
   secret values.

Current `/api/concept-briefs` code uses:

- IP limit: `30` attempts per `10` minutes.
- Email limit: `5` attempts per `60` minutes, only when
  `NOVORA_INTERNAL_SIGNING_SECRET` is present and a normalized customer email is
  available after payload validation.

## 9. Suggested Safe Preview Test Limits

For Preview-only smoke testing, keep limits low enough to verify enforcement
quickly but not so low that normal manual testing becomes confusing.

Suggested Preview-only test policy for a future app-code task:

- IP: `5` attempts per `10` minutes.
- Email: `2` attempts per `30` minutes.

Those limits are not implemented by this document. The current code defaults
remain `30` per `10` minutes by IP and `5` per `60` minutes by email. Changing
limits requires a separate app-code approval and PR.

## 10. Rollback Plan If Submissions Are Blocked

If Preview submissions are unexpectedly blocked:

1. Stop Preview testing.
2. Capture only non-sensitive symptoms: route, deployment, response status,
   safe reason code, and whether rate-limit headers were present.
3. Do not paste raw payloads, customer emails, IPs, tokens, or secrets into
   chat or tickets.
4. Remove or disable the Preview Redis/KV provider env values only after
   explicit Vercel env-change approval.
5. Redeploy Preview after the env rollback.
6. Re-test with synthetic data and confirm fail-open behavior is restored.

Do not change Production env, deploy Production, edit app code, change SQL, or
provision a different provider as part of rollback unless a separate explicit
approval authorizes that exact action.

## 11. Must-Stop Actions

Stop and get explicit user approval before:

- Changing Vercel environment variables.
- Provisioning Vercel KV, Upstash Redis, Turnstile, or any provider.
- Generating, storing, rotating, or exposing secrets.
- Creating or changing Production environment variables.
- Setting up Turnstile.
- Executing SQL or changing Supabase schema, RLS, grants, policies, storage, or
  customer data.
- Editing app code.
- Editing tests.
- Changing package files.
- Changing Resend or Cloudflare configuration.
- Sending real email.
- Deploying.
- Merging.

## 12. Explicit Non-Goals

This preflight checklist does not include:

- App code changes.
- Test changes.
- Package changes.
- SQL.
- Supabase changes.
- Vercel environment changes.
- Provider provisioning.
- Secret generation or storage.
- Turnstile setup.
- Resend or Cloudflare changes.
- Email sending.
- Deploy.
- Merge.
