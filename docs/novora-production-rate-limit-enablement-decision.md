# NOVORA Production Rate-Limit Enablement Decision Packet

## 1. Purpose And Scope

This packet prepares the decision for enabling Production rate-limit
enforcement for the NOVORA Concept Brief submission flow.

This is a docs-only decision artifact. It does not change app code, tests,
package files, Vercel environment variables, Upstash/provider settings,
Supabase, SQL, Resend, Cloudflare, email behavior, deployment state, or merge
state. It does not expose or request secrets.

## 2. Current State After PR #78 And PR #79

PR #78 fixed Preview rate-limit enforcement and client-side handling for
intentional `429` responses. The rate-limit helper now parses deterministic
Redis output without treating a successful counter increment as a provider
failure, and the `/design/brief` client keeps customers on the form with a safe
retry message when the API returns `429`.

PR #79 recorded the Preview verification result in
`docs/novora-current-project-state.md`.

The code needed for rate-limit enforcement is now on `main`. Production
enforcement still depends on Production Vercel environment configuration. If
the required Production Upstash and signing-secret environment variables are
missing, the rate-limit path remains fail-open.

## 3. Preview Verification Summary

Manual Preview verification passed after PR #78 merged.

- The test used a Vercel Preview URL under
  `project-dd34e-git-codex-preview-rate-limit-...vercel.app`, not Production
  `novora.design`.
- Repeated same-email submissions used the synthetic address
  `preview-rate-limit-test@example.com`.
- The Upstash email key counter exceeded the configured limit.
- The over-limit submission stayed on `/design/brief`.
- The UI showed:
  - `Too many Concept Brief submission attempts.`
  - `Please wait a few minutes before trying again.`
- Upstash showed the email key value `8` while the TTL was still active.

This confirms Preview calls Upstash, the email counter can exceed the limit,
intentional `429` handling is safe for the customer flow, and the previous false
success navigation behavior is fixed in Preview.

## 4. Production Enablement Options

### Option A: Keep Production Fail-Open For Now

Leave Production without the required rate-limit environment configuration.
The deployed code continues to allow Concept Brief submissions when the
rate-limit provider is unavailable or unconfigured.

Advantages:

- No immediate Production configuration risk.
- No chance of rate-limit false positives blocking legitimate customers.
- No provider dependency is added to the live customer submission path yet.

Risks and tradeoffs:

- Production remains exposed to repeated public submission attempts.
- Supabase and admin review queues can still receive abusive or noisy
  submissions.
- Preview verification will not represent Production enforcement behavior.

### Option B: Enable Production Using The Existing Upstash Project

Add the required Production Vercel environment variables using the current
Upstash Redis project.

Advantages:

- Fastest path to Production enforcement.
- Uses already-tested provider behavior from Preview.
- Minimizes new provider setup and dashboard overhead.

Risks and tradeoffs:

- Preview and Production may share a keyspace unless prefixes, databases, or
  resources are clearly separated.
- Preview load or test mistakes could affect Production counters if key
  separation is imperfect.
- Operational visibility may be less clear when environments share one
  provider project.

### Option C: Create A Separate Production-Dedicated Upstash Redis Project

Provision a Production-dedicated Upstash Redis project and use it only for
Production rate-limit counters.

Advantages:

- Strongest environment isolation.
- Avoids shared Preview/Production keyspace risk.
- Makes Production observability, quota review, and rollback reasoning cleaner.

Risks and tradeoffs:

- Requires additional provider setup and billing/quota ownership decisions.
- Adds one more provider resource to document and monitor.
- Takes longer than reusing the existing project.

## 5. Recommendation

Prefer Option C: create a separate Production-dedicated Upstash Redis project if
that is practical for NOVORA operations.

Use Option B only if operational simplicity requires temporarily reusing the
current Upstash project. If Option B is chosen, confirm environment separation,
key prefixes, dashboard visibility, and rollback expectations before enabling
Production.

Option A is acceptable as a short hold if NOVORA wants to avoid any Production
behavior change until provider ownership and rollout approval are fully settled.

### MVP-Stage Deferral Decision

Agent 26E-5C records the current MVP-stage business decision:

- Do not add an Upstash payment method now.
- Do not upgrade Upstash now.
- Do not create a Production Redis resource now.
- Do not reuse `novora-preview-rate-limit` for Production.
- Keep Production rate-limit enforcement fail-open for now.
- Revisit and execute Option C before formal commercial launch, paid traffic,
  larger social traffic, or increased real customer submissions.

Option C remains the preferred commercial-standard structure for NOVORA:
Production should use a Production-dedicated Upstash Redis resource that is
separate from Preview and does not share a Preview/Production keyspace.

Revisit this decision when any of these trigger points appears:

- TikTok/Instagram formal traffic push.
- Paid ads.
- Real customer submission volume increases.
- Spam, fake, or repeated submissions appear.
- Admin notification noise appears.
- Before payment, order, or account Production workflows.

This decision did not perform any payment method, environment, provider,
deploy, or Production test action.

## 6. Required Vercel Production Environment Variables

Names only. Do not record values in docs, chat, logs, screenshots, PR
descriptions, or tickets.

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NOVORA_INTERNAL_SIGNING_SECRET`

### Production Provider Env Preflight

Before Production rollout, manually check the Production Vercel environment for
both the intended Upstash variables and the alternate KV variable family that
the current helper can also read:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Do not expose or print any values. Confirm that the intended Production
provider and environment variable family are the ones the runtime should use
before enabling enforcement or redeploying Production.

## 7. Risk Analysis

False positives:

- Legitimate customers may be blocked if they retry quickly, share a network, or
  use an email address involved in repeated failed attempts.
- Limits should be verified with synthetic data before Production is considered
  ready.

Customer friction:

- A blocked customer stays on `/design/brief` and sees a retry message instead
  of a false success page.
- The message should remain calm and non-accusatory.

Provider outage behavior:

- The current implementation is designed to fail open when the rate-limit
  provider is missing or unavailable.
- Fail-open behavior preserves availability but allows abuse during provider
  outage or misconfiguration windows.

Fail-open versus fail-closed:

- Fail open is safer for legitimate customer availability during provider
  trouble.
- Fail closed is stronger against abuse but can block real customers if the
  provider, credentials, or network path fail.
- Any future move to fail closed should be a separate approved Production
  behavior decision.

Shared Preview/Production keyspace risk:

- Reusing one Upstash project can blur Preview and Production counters if
  environment keys or prefixes are misconfigured.
- A Production-dedicated Redis project reduces the chance that Preview testing
  influences live customer submissions.

Observability limits:

- Upstash counters confirm provider calls and TTL behavior, but they are not a
  full abuse analytics system.
- Manual verification should avoid raw customer PII and should not rely on
  secret value inspection.

## 8. Safe Rollout Plan

Do not begin this rollout until there is explicit approval for Production
environment/provider/deploy work.

Production verification can create live side effects. If attempts 1 through 5
are tested through the live browser flow, accepted submissions may create real
Supabase Concept Brief rows and may trigger real admin notification emails. Use
synthetic customer data only, confirm explicit approval before accepted live
Production submissions, and decide whether an alternative approved verification
design is needed before starting.

1. Confirm the selected option: fail-open hold, existing Upstash reuse, or
   Production-dedicated Upstash.
2. Configure Production environment variables only after approval.
3. Redeploy Production only after approval.
4. Use a synthetic email address only; do not use real customer data.
5. Confirm attempts 1 through 5 are accepted.
6. Confirm the 6th same-email attempt is blocked with `429`.
7. Confirm the blocked attempt stays on `/design/brief`.
8. Confirm there is no false navigation to `/design/submitted`.
9. Confirm Supabase does not persist the over-limit attempt.
10. Confirm the admin notification email is not sent for the blocked attempt.
11. Record results without secrets, raw env values, or real customer data.

## 9. Rollback Plan

If Production enforcement causes unexpected customer friction or operational
risk:

1. Remove or disable the Production rate-limit environment/provider
   configuration after approval.
2. Redeploy Production after approval.
3. Verify submissions return to fail-open behavior if that is the intended
   rollback state.
4. Confirm customer submission success and admin notification behavior remain
   consistent for normal synthetic submissions.
5. Record the rollback result without secrets or raw provider values.

## 10. Explicit Non-Goals

This packet does not include:

- App code changes.
- Test changes.
- Package changes.
- Vercel environment changes.
- Upstash setting changes.
- Upstash payment method changes.
- Upstash paid upgrade.
- Provider provisioning.
- Supabase SQL.
- Supabase schema, RLS, grants, policies, storage, or customer data changes.
- Resend changes.
- Cloudflare changes.
- Real customer email or real customer test data.
- Real email sending.
- Deployment.
- Production testing.
- Merge.

## 11. Final Approval Checkpoint

Stop before any Production environment, provider, Upstash, Vercel, deploy, SQL,
Supabase, Resend, Cloudflare, real email, merge, or customer-data action.

Production rate-limit enforcement should move forward only in a separate
approved task that explicitly authorizes the selected enablement option and the
required Production operations.
