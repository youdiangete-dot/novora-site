# NOVORA Rate-Limit Provider Approval Packet

## 1. Purpose And Scope

This packet asks for one human decision: whether NOVORA should configure real
public API rate limiting in Preview using a Redis/KV provider for
`/api/concept-briefs`.

This is approval planning only. It does not configure providers, create or
expose secrets, change Vercel environment variables, add app code, change tests,
execute SQL, change Supabase, change Resend or Cloudflare, send email, deploy,
merge, or provision any provider.

Current baseline:

- PR #73 added the server-only public API rate-limit helper foundation.
- `/api/concept-briefs` has fail-open rate-limit integration.
- Rate limiting is disabled unless a complete Redis/KV provider env family is
  configured.
- PR #74 fixed the Concept Brief submit timeout before admin notification.
- PR #75 updated the project ledger after PR #74 Production smoke verification.
- PR #76 added the provider env preflight checklist.
- Current `main` after PR #76 is `b57ff9b`.
- Real abuse-control provider enforcement is not active yet.

## 2. Approval Decision

The owner is being asked to approve a future, separate manual setup task that:

1. Provisions or selects a Redis/KV provider resource for Preview.
2. Creates Preview-scoped server-only provider values.
3. Adds those values to Vercel Preview environment variables.
4. Redeploys or creates a Preview deployment for verification.
5. Verifies rate-limit behavior with synthetic Concept Brief submissions only.

Recommended decision: approve a Preview-only first test using the current
server helper and a single Redis/KV REST env naming family. Keep Production
untouched until Preview behavior, logs, provider dashboard counters, and
rollback steps are reviewed.

The owner is authorizing limited Preview abuse-control enforcement testing, not
Production protection, not Turnstile, not a new app-code change, and not any
secret disclosure.

## 3. Scope Decisions

Preview should go first. The consequence is that provider mistakes affect a
non-Production deployment and synthetic test data before live customers. This
lowers severity while still proving the real serverless counter path.

Production should remain untouched. The consequence of changing Production too
early is that real customers could be blocked from submitting Concept Briefs, or
abusive traffic could still pass through if env values are incomplete. Because
Production is the live intake path, severity is high even if likelihood is
uncertain before Preview verification.

Turnstile should remain out of scope for now. Turnstile requires client UI,
server verification, provider setup, accessibility checks, and fail-policy
approval. Adding it to this task would mix bot challenge behavior with Redis/KV
counter setup, making failures harder to diagnose.

Use one Redis/KV naming family for the first Preview test. The recommended first
choice is Upstash REST naming:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Reason: these names are explicit, provider-neutral enough for Upstash REST, and
are read first by the current helper if both families are accidentally present.
Using Vercel KV REST names is also supported, but the first test should not set
both families.

## 4. Env Names Expected By Current Code

The current helper reads these server-only Redis/KV provider variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

The current helper also reads:

- `NOVORA_INTERNAL_SIGNING_SECRET`

`NOVORA_INTERNAL_SIGNING_SECRET` is needed for email-based rate-limit keys.
Without it, email-based limiting is disabled because the helper will not create
raw PII-derived email keys. IP-based limiting can still run with Redis/KV
provider env configured; with the signing secret present, IP keys use HMAC
instead of a plain SHA-256-derived key.

Planned Turnstile names are not active in the current rate-limit helper:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Do not add Turnstile env as part of this provider approval unless a separate
task explicitly approves Turnstile setup.

## 5. Manual Values The Owner Must Create

After separate explicit approval for provider/env setup, the owner or approved
operator must manually create these values without exposing raw secrets:

| Value | Recommended first Preview name | Where created | Where added | Secret handling |
| --- | --- | --- | --- | --- |
| Redis/KV REST URL | `UPSTASH_REDIS_REST_URL` | Approved Redis/KV provider dashboard | Vercel Preview env | Treat as server-only operational configuration. Do not paste into chat, docs, PRs, logs, or screenshots. |
| Redis/KV REST token | `UPSTASH_REDIS_REST_TOKEN` | Approved Redis/KV provider dashboard | Vercel Preview env | Server-only secret. Never use `NEXT_PUBLIC_*`. Do not expose or store in repo notes. |
| Internal signing secret | `NOVORA_INTERNAL_SIGNING_SECRET` | Approved password manager or secure secret generator | Vercel Preview env | High-entropy server-only secret for HMAC keys. Codex should not generate, display, store, or rotate it. |

If the owner chooses Vercel KV REST naming instead, use exactly:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `NOVORA_INTERNAL_SIGNING_SECRET`

Do not set both Upstash and Vercel KV families for the first Preview test unless
a future app-code task explicitly designs and verifies migration behavior.

## 6. What Can Go Wrong

Incomplete env values: if only a URL or only a token is present, the helper logs
a safe `provider_env_incomplete` operational signal and treats rate limiting as
disabled. Consequence: abusive traffic is not limited. Affected parties:
NOVORA operations, Supabase persistence, admin notification flow, and any manual
review capacity. Likelihood is medium during manual setup; severity is medium in
Preview and high if repeated in Production. Mitigation: verify exact variable
names and environment scope before redeploying.

Wrong env scope: values added to Production instead of Preview could activate
live rate limiting before approval. Consequence: real customers may receive
`429` responses during legitimate submissions. Affected parties: customers,
support, and the owner. Likelihood is low with checklist discipline; severity is
high. Mitigation: verify Vercel environment scope by name before saving values.

Wrong provider URL or token: provider calls may fail. Consequence: current code
allows requests fail-open, so legitimate submissions continue, but rate limiting
does not protect the route. Affected parties: NOVORA operations and downstream
systems that receive excess traffic. Likelihood is medium during first setup;
severity is low to medium in Preview. Mitigation: confirm provider dashboard
status and test below/above-limit behavior after redeploy.

Setting both env families: current code chooses Upstash first when both complete
families exist. Consequence: operators may think Vercel KV is being tested while
the helper uses Upstash. Affected parties: the owner and future maintainers.
Likelihood is low if the setup is constrained; severity is medium because it can
invalidate verification. Mitigation: configure exactly one complete family.

Missing signing secret: email-based limiting stays disabled. Consequence:
per-email abuse patterns may not be limited even when IP limiting works.
Affected parties: NOVORA operations and admin review throughput. Likelihood is
medium if the setup focuses only on Redis/KV values; severity is medium.
Mitigation: include `NOVORA_INTERNAL_SIGNING_SECRET` in Preview setup and verify
email-limit behavior with synthetic data.

Overly aggressive limits or unexpected shared IP behavior: normal testers, office
networks, VPNs, or carrier NAT users can hit IP limits. Consequence: legitimate
customers could be blocked in Production if settings are later promoted without
review. Affected parties: customers and support. Likelihood is uncertain until
telemetry exists; severity is high in Production. Mitigation: keep Production
unchanged, use synthetic Preview testing, and review current MVP limits before
any Production approval.

## 7. Customer And Business Impact

If rate limiting misfires closed, a legitimate customer may be unable to submit a
Concept Brief. The customer impact is lost trust and friction at the highest
intent step. The business impact is lost lead capture, support burden, and
reduced confidence in the custom jewelry intake flow.

If rate limiting fails open, abusive traffic may continue to reach the public
submission route. The customer impact is usually indirect, through slower service
or operational distraction. The business impact is higher Supabase, provider,
email, and manual review load.

If logs expose raw PII or secrets during verification, the impact is security and
privacy risk rather than user-facing form failure. The affected parties are
customers, NOVORA operations, and any provider account owners. Mitigation is to
verify by behavior, reason codes, status, and redacted dashboard checks only.

## 8. Existing Fail-Open Mitigation

Current `/api/concept-briefs` integration fails open for missing provider env,
incomplete provider env, missing email signing secret for email keys, and
provider runtime errors.

This means provider setup mistakes are less likely to block legitimate Concept
Brief submissions. The tradeoff is that provider mistakes can silently leave
abuse controls disabled or partially disabled. The owner is therefore approving
Preview verification of both accepted requests and blocked requests, not merely
approving env creation.

## 9. Verification Before Provider Env

Before adding Preview provider env, verify:

1. The target deployment is Preview, not Production.
2. Redis/KV provider env is not already configured in Preview.
3. A synthetic Concept Brief submission is accepted without rate-limit blocking.
4. Missing provider env produces only safe operational behavior:
   `allowed: true`, mode `disabled`, reason `provider_env_missing`.
5. Logs do not print raw email, raw IP, names, phone numbers, payload notes,
   provider URLs, tokens, signing secrets, or API keys.
6. If a partial provider family is found, stop and resolve the incomplete env
   state before testing enforcement.

## 10. Verification After Preview Provider Env

After explicit approval and manual Preview env setup:

1. Confirm exactly one complete Redis/KV naming family is present in Preview.
2. Confirm `NOVORA_INTERNAL_SIGNING_SECRET` is present in Preview.
3. Redeploy or create a fresh Preview deployment so runtime code reads the new
   variables.
4. Submit synthetic requests below the current IP limit and confirm acceptance.
5. Submit synthetic requests above the current IP limit and confirm a `429` with
   safe rate-limit headers.
6. Submit synthetic requests below and above the current email limit and confirm
   expected acceptance/blocking when a normalized email is present.
7. Confirm provider counters advance without raw email or raw IP keys.
8. Confirm response copy remains customer-safe and does not mention provider
   internals.
9. Confirm logs contain no raw PII or secrets.

Current code limits:

- IP: `30` attempts per `10` minutes.
- Email: `5` attempts per `60` minutes, only when a normalized customer email
  and `NOVORA_INTERNAL_SIGNING_SECRET` are available.

Changing these limits requires separate app-code approval.

## 11. Rollback

If Preview submissions are unexpectedly blocked:

1. Stop Preview abuse-control testing.
2. Capture only non-sensitive symptoms: deployment, route, status, safe reason
   code, and whether rate-limit headers were present.
3. Do not paste payloads, customer emails, IPs, tokens, provider URLs, or
   signing secrets into chat, docs, tickets, PR comments, screenshots, or logs.
4. Request explicit approval before changing Vercel env.
5. Remove or disable the Preview Redis/KV provider env values after approval.
6. Redeploy Preview after env rollback.
7. Re-test synthetic submission and confirm fail-open behavior is restored.

Do not change Production env, deploy Production, edit app code, change SQL,
change Supabase, provision a different provider, or add Turnstile as part of
rollback unless a separate explicit approval authorizes that exact action.

## 12. Must-Stop Actions

Stop and get explicit approval before:

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

## 13. Explicit Non-Goals

This packet does not include:

- App code changes.
- Test changes.
- Package changes.
- SQL.
- Supabase changes.
- Vercel environment changes.
- Provider provisioning.
- Secret generation, storage, or rotation.
- Turnstile setup.
- Resend or Cloudflare changes.
- Email sending.
- Deploy.
- Merge.
