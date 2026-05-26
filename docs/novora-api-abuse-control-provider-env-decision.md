# NOVORA API Abuse-Control Provider And Environment Decision Packet

## 1. Purpose And Scope

This packet prepares provider and environment decisions before implementation of
NOVORA public API abuse controls.

It is a docs-only planning artifact. It does not configure providers, create or
expose secrets, add app code, change packages, execute SQL, change Vercel
environment variables, change Supabase, change Resend or Cloudflare, send email,
deploy, or merge.

The packet covers setup decisions for:

- Public API rate limiting.
- Bot protection on final customer Concept Brief submission.
- Short-lived upload tokens for final reference image attachment.
- Signed-token hardening for admin notification routing.

## 2. Current Baseline

- NOVORA is hosted on Vercel, with `main` deploying to Production.
- Supabase is already used for database persistence and reference image storage.
- Resend and Cloudflare are already used for the admin email domain flow.
- Public API abuse controls are planned in
  `docs/novora-public-api-rate-limit-bot-protection-plan.md`, but they are not
  implemented yet.
- Current relevant public routes are:
  - `/api/concept-briefs`
  - `/api/concept-brief-reference-assets`
  - `/api/concept-brief-admin-notification`

## 3. Provider Decision Options

| Option | Fit | Advantages | Risks And Tradeoffs | MVP Decision |
| --- | --- | --- | --- | --- |
| Vercel KV / Upstash Redis-style durable rate limiting | Strong fit for public API counters that must work across serverless instances. | Atomic counter patterns, expiry windows, low-latency serverless access, deploy-independent state. | Adds provider setup, env vars, outage behavior decisions, and cost/quota monitoring. | Recommended first-line rate-limit provider direction. |
| Supabase table-based rate limiting | Possible for durable counters, but not ideal as the first abuse-control layer. | Uses an existing provider and can support audits if carefully designed. | Sends abusive public traffic to the primary database, adds SQL/RLS/schema work, and can increase load on the system being protected. | Not recommended as the first line of defense for public abuse controls. |
| In-memory rate limiting | Useful only for local development or narrow tests. | Simple, no provider setup, easy to reason about in one process. | Does not work reliably across serverless instances, regions, cold starts, or deployments. | Do not use for Production. |
| Middleware-only limiting | Useful for coarse request filtering before route handlers. | Can reject some traffic earlier and centralize simple route policies. | Cannot replace durable counters by itself, may lack validated payload identifiers, and can be awkward for multipart/body-dependent decisions. | Optional later supplement, not the primary MVP control. |
| Cloudflare Turnstile for bot protection | Strong fit for final customer submission bot checks. | Low-friction challenge, client-safe site key plus server-side secret verification, good fit for form submission abuse. | Requires client/server implementation, provider setup, accessibility testing, and fail-policy decisions. | Recommended for final Concept Brief submission. |

## 4. Recommended MVP Provider Direction

Use durable Redis-style rate limiting through Vercel KV or Upstash Redis for
public API counters. This keeps request-volume controls outside Supabase and
allows counters to work across Vercel serverless instances.

Use Cloudflare Turnstile on the final customer Concept Brief submission that
posts to `/api/concept-briefs`. The server should verify the Turnstile token
before Supabase persistence in a future implementation.

Use a server-only internal signing secret for short-lived upload tokens and
admin-notification tokens. The signing secret must never be exposed to the
browser, logs, PR descriptions, docs, screenshots, or chat.

Do not use Supabase as the first line of rate-limit defense for public abuse
controls. Supabase remains the system of record for Concept Brief data and
storage metadata, not the preferred first stop for abusive request volume.

Do not use in-memory counters for Production.

## 5. Environment Variable Plan

Use placeholder names only. Do not record real values in this document.

Client-safe placeholder:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

Server-only placeholders:

- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL` or `KV_REST_API_URL`
- `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_TOKEN`
- `NOVORA_INTERNAL_SIGNING_SECRET`

### Client-Safe Versus Server-Only

Only values intentionally designed for browser exposure may use the
`NEXT_PUBLIC_*` prefix. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is client-safe because
Turnstile site keys are meant to be rendered in the browser.

All provider secrets, Redis/KV tokens, and internal signing secrets must remain
server-only and must not use the `NEXT_PUBLIC_*` prefix.

### Production Versus Preview

Production and Preview should use intentionally scoped values. Production values
protect the live customer flow. Preview values should support testing without
using real customer data and without weakening Production.

Preview may use separate provider resources, separate Turnstile site settings,
or provider-supported test keys if explicitly approved during setup. Production
must not rely on test or bypass credentials.

### Naming Choice

Choose one Redis/KV naming family before implementation:

- Upstash naming: `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN`
- Vercel KV naming: `KV_REST_API_URL` and `KV_REST_API_TOKEN`

Do not mix both families in app code unless implementation explicitly supports
a controlled migration path.

## 6. Manual Setup Checklist

Provider dashboards and Vercel environment changes require explicit human
approval before any action.

1. Choose the rate-limit provider.
   - Decide between Vercel KV and Upstash Redis.
   - Confirm expected Production and Preview resource separation.
   - Confirm quotas, billing owner, dashboard access, and operational alerts.

2. Provision the approved rate-limit provider.
   - Create the Redis/KV resource through the approved provider workflow.
   - Record only non-secret provider metadata needed for operations.
   - Do not paste tokens into chat, docs, issues, logs, screenshots, or PR
     descriptions.

3. Create Turnstile site configuration.
   - Create a Production Turnstile site for the live NOVORA domain.
   - Create Preview/test handling separately if approved.
   - Keep the site key client-safe and the secret key server-only.

4. Generate the internal signing secret.
   - Generate a high-entropy server-only secret through an approved secure
     method.
   - Use it for future upload and admin-notification token signatures.
   - Do not store the raw value in the repository or task notes.

5. Add environment variables in Vercel.
   - Add Preview values to the Preview environment.
   - Add Production values to the Production environment.
   - Confirm no server-only value uses the `NEXT_PUBLIC_*` prefix.
   - Confirm no client-safe value contains a private credential.

6. Redeploy after environment changes.
   - Vercel environment changes require a new deployment or redeploy before
     runtime code can read the updated values.
   - Production redeploy requires explicit approval.

7. Verify readiness without exposing values.
   - Confirm each expected variable is present by name and environment scope.
   - Confirm server-only values are not visible in client bundles.
   - Use redacted readiness checks and provider dashboard status, not raw value
     printing.

## 7. Security Rules

- Never paste real keys into chat, PR descriptions, docs, logs, screenshots,
  tickets, or issues.
- Do not commit `.env` files, provider exports, password notes, secret notes, or
  API key dumps.
- Do not expose server-only values with `NEXT_PUBLIC_*`.
- Rotate any exposed or suspected-exposed secret immediately.
- Provider dashboards and Vercel environment changes require explicit human
  approval.
- Do not print environment values during verification. Verify presence and
  behavior only.
- Do not use real customer data in Preview testing, screenshots, examples, or
  PR notes.

## 8. Fail-Open And Fail-Closed Recommendation

Recommended Production defaults:

- Turnstile verification: fail closed.
- Upload token verification: fail closed.
- Admin notification signed-token verification: fail closed.

Rate-limit provider outage on Concept Brief submission needs an explicit
implementation decision before code is written. The options are:

- Fail open for `/api/concept-briefs` to preserve legitimate customer
  submissions during a provider outage, while logging only a safe operational
  signal with no customer PII or secrets.
- Fail closed for `/api/concept-briefs` to reduce abuse risk during a provider
  outage, accepting that legitimate customers may be blocked.

The exact fail-open or fail-closed policy changes Production availability and
abuse behavior, so it requires explicit approval in the future implementation
task.

## 9. Implementation Sequencing

Split future work into separate reviewed agents:

- Agent 26E-3: rate-limit helper implementation.
- Agent 26E-4: Turnstile final submission implementation.
- Agent 26E-5: upload short-lived token implementation.
- Agent 26E-6: admin notification signed-token hardening.
- Agent 26E-7: tests, CI, and Production verification plan.

Each future agent should state whether it changes app code, package files,
provider configuration, environment variables, SQL, Supabase, email behavior, or
Production availability.

## 10. Validation And Verification Plan

### Env Readiness

- Verify variable presence by name and environment scope only.
- Confirm server-only variables are available only to server runtime code.
- Confirm `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is the only planned browser-visible
  variable in this packet.
- Confirm no raw values are printed in logs, build output, screenshots, or PR
  comments.

### Preview Testing

- Use Preview-scoped provider values or provider-supported test keys approved
  for non-Production.
- Test with synthetic Concept Brief data only.
- Do not use real customer names, emails, phone numbers, addresses, reference
  images, or public references.
- Do not send real admin email unless a separate task explicitly approves the
  recipient and purpose.

### Production Verification

- Verify Production only after explicit approval.
- Confirm deployment ID, domain, provider resource, and environment scope before
  testing.
- Use controlled test data and redact customer-sensitive values in any report.
- Confirm failure behavior for missing/invalid Turnstile and token checks only
  after implementation tasks define the exact expected responses.

## 11. Explicit Non-Goals

This decision packet does not include:

- App code changes.
- Package changes.
- Provider provisioning.
- Vercel environment changes.
- Supabase schema, RLS, grant, policy, storage, or customer data changes.
- SQL.
- Real secrets.
- Real emails.
- Deploy.
- Merge.
