# NOVORA Public API Rate Limit And Bot Protection Plan

## 1. Purpose And Scope

This document records the planned architecture for protecting NOVORA's public
Concept Brief APIs from automated abuse, repeated uploads, fake leads, noisy PII,
storage cost growth, and notification-trigger misuse.

This is a docs-only planning artifact. It does not implement code, execute SQL,
provision providers, change Vercel environment variables, change Supabase
policies, send email, or deploy.

The plan covers these public routes:

- `/api/concept-briefs`
- `/api/concept-brief-reference-assets`
- `/api/concept-brief-admin-notification`

## 2. Current Public API Risk Map

| Route | Current shape | Primary abuse risk | Business impact |
| --- | --- | --- | --- |
| `/api/concept-briefs` | Public `POST` JSON endpoint that validates a Concept Brief payload and attempts Supabase persistence. | Automated DB spam, fake leads, noisy contact data, large request volume, operational triage load. | Polluted admin review queue, customer-data noise, database growth, admin time waste, and degraded trust in intake quality. |
| `/api/concept-brief-reference-assets` | Public `POST` multipart endpoint that parses `FormData` and delegates reference asset storage. | Multipart parsing load, repeated uploads, storage cost, attempts against known `conceptBriefId` / `publicReference` pairs. | Supabase Storage growth, noisy reference records, higher bandwidth and CPU usage, and risk of attaching unwanted files to real briefs. |
| `/api/concept-brief-admin-notification` | Public `POST` JSON endpoint that accepts `conceptBriefId` and `publicReference`, builds an admin detail URL, and calls the admin notification sender. | Public notification trigger attempts, repeated calls against guessed or observed identifiers, email-delivery pressure. | Duplicate-delivery risk if idempotency is weakened later, noisy logs, provider quota pressure, and avoidable operational risk. |

## 3. Route-By-Route Recommended Protections

### `/api/concept-briefs`

Recommended MVP protections:

- Add route-level durable rate limiting before Supabase persistence.
- Limit by IP-derived key for broad request volume control.
- Limit by HMAC or hash of normalized customer email after payload validation,
  without storing raw email in the rate-limit store.
- Verify a Turnstile or CAPTCHA token server-side before Supabase writes.
- Keep existing validation behavior and customer-facing boundary copy: this
  remains a Concept Brief for manual NOVORA review, not CAD approval, final
  pricing, sourcing confirmation, or production confirmation.
- Fail closed for missing or invalid bot verification in Production.
- Prefer fail closed for obvious abuse once the durable rate-limit provider is
  configured. If the provider is temporarily unavailable, use the fail policy
  chosen in section 4.

### `/api/concept-brief-reference-assets`

Recommended MVP protections:

- Require a server-issued, short-lived upload token before multipart parsing is
  accepted as valid.
- Bind the token to `conceptBriefId`, `publicReference`, and an expiry time.
- Add durable rate limits by IP and by the `conceptBriefId` / `publicReference`
  pair.
- Cap upload attempts per brief pair, separate from per-IP caps.
- Preserve existing route intent: final customer reference upload belongs to the
  Concept Brief review flow and is not a general public storage endpoint.
- Add future file hardening checks for count, size, MIME, signature, dimensions,
  and storage metadata consistency.

### `/api/concept-brief-admin-notification`

Recommended MVP protections:

- Remove public browser-triggered notification behavior if possible, and invoke
  admin notification from a trusted server-side path after Concept Brief
  persistence succeeds.
- If a separate route remains necessary, require a signed, short-lived internal
  token before calling the notification sender.
- Bind the signed token to `conceptBriefId`, `publicReference`, expiry, and the
  intended action, such as `admin-notification`.
- Preserve the existing durable idempotency guard so repeated valid calls for the
  same Concept Brief do not send duplicate admin notifications.
- Rate limit invalid or unauthenticated notification attempts by IP.

## 4. MVP Rate-Limit Architecture

### Durable Redis-Style Store

Use a durable Redis-compatible store such as Vercel KV or Upstash Redis for rate
limit counters. The store must work across serverless instances and deployments;
in-memory counters are not sufficient for Production abuse controls.

Implementation should use atomic increment-and-expire semantics or a provider
helper that guarantees safe window updates under concurrency.

### Route-Level Helper

Add a server-only route-level helper in a future implementation PR. It should:

- Accept route name, request metadata, optional validated identifiers, and a
  policy object.
- Return an allow or deny result with retry metadata for response headers.
- Avoid logging raw customer email, phone numbers, free-text brief content,
  uploaded file names, or provider secret values.
- Support test and development bypasses that cannot activate in Production.

Potential helper inputs:

- `routeName`
- `request`
- `email`
- `conceptBriefId`
- `publicReference`
- `policy`

Potential helper output:

- `allowed`
- `status`
- `retryAfterSeconds`
- `reason`
- `headers`

### IP Key

Use a request IP key for broad volumetric control. On Vercel, this should be
derived from trusted platform headers or a framework-supported request IP source,
then normalized and hashed before storage.

Example key shape, with no raw secret values:

- `rl:v1:concept-briefs:ip:{ipHash}`
- `rl:v1:reference-assets:ip:{ipHash}`
- `rl:v1:admin-notification:ip:{ipHash}`

### Hashed Or HMAC Email Key

For `/api/concept-briefs`, apply a second limit to the normalized email address
after payload validation. Do not store raw email in Redis. Use a server-side
HMAC secret if possible so the key is not reversible through simple dictionary
matching.

Example key shape:

- `rl:v1:concept-briefs:email:{emailHmac}`

Email normalization should be conservative:

- Trim whitespace.
- Lowercase the domain and local part unless the validation layer has a stricter
  existing normalization rule.
- Do not implement provider-specific mailbox rewriting unless that behavior is
  explicitly designed and tested.

### `conceptBriefId` / `publicReference` Pair Key

For upload and admin-notification protection, use the customer-visible reference
pair only after validation and token verification decisions are clear. The pair
key should bind both identifiers so a known public reference alone is not enough
to share a bucket with unrelated attempts.

Example key shape:

- `rl:v1:reference-assets:brief-pair:{pairHash}`
- `rl:v1:admin-notification:brief-pair:{pairHash}`

The pair hash should be derived from a canonical string such as:

- `{conceptBriefId}:{publicReference}`

### Fail-Open Vs Fail-Closed Policy

Recommended policy:

- Bot verification for final Concept Brief submission: fail closed in
  Production when the token is missing, invalid, expired, or the verification
  provider rejects it.
- Upload token verification: fail closed in Production.
- Admin notification signed-token verification: fail closed in Production.
- Rate-limit provider unavailable on `/api/concept-briefs`: prefer fail open
  for the first MVP only if the provider outage would otherwise block legitimate
  customers, but log a safe operational signal without customer PII or secrets.
- Rate-limit provider unavailable on uploads: prefer fail closed once upload
  token enforcement exists, because storage abuse is direct cost exposure.
- Rate-limit provider unavailable on admin notification: prefer fail closed if
  the route remains externally callable.

The exact fail-open choice must be explicitly approved in the implementation PR
because it changes Production availability and abuse behavior.

## 5. Bot Protection Architecture

### Turnstile Or CAPTCHA On Final Customer Submission

Add a bot challenge to the final customer submission path that posts to
`/api/concept-briefs`. Cloudflare Turnstile is the preferred MVP option because
it provides a low-friction challenge and server-side token verification.

The browser should send only the challenge token with the Concept Brief payload.
The server must verify the token before Supabase persistence.

### Server-Side Verification Before Supabase Write

The `/api/concept-briefs` handler should verify the Turnstile or CAPTCHA token
after basic request parsing and before calling Concept Brief persistence. Failed
verification should return a controlled error response and should not write to
Supabase.

Verification should check:

- Token presence.
- Provider verification success.
- Expected hostname or deployment environment where supported.
- Token freshness or one-time-use semantics where supported by the provider.

### Test And Development Bypass Strategy

Automated tests and local development need a bypass that cannot weaken
Production.

Recommended approach:

- Use a server-only test bypass flag that is never enabled in Production.
- Require `NODE_ENV === "test"` or an explicit non-Production environment guard.
- Use provider test keys where supported.
- Add CI assertions that Production-like env does not accept bypass tokens.
- Never expose private bypass secrets to the browser except through provider
  test-site keys intended for client use.

## 6. Upload Hardening Architecture

### Server-Issued Short-Lived Upload Token

After a Concept Brief is accepted, the server should issue a short-lived upload
token for attaching final reference assets. The token should be generated
server-side and returned only to the current submission flow.

The upload endpoint should reject requests without a valid token before doing
expensive or storage-affecting work.

### Token Binding

The upload token should be bound to:

- `conceptBriefId`
- `publicReference`
- Expiry timestamp
- Token purpose, such as `reference-upload`

The signature should use a server-only signing secret. Do not store or expose
raw signing secrets in docs, logs, responses, or client bundles.

### Upload Attempt Caps

Use durable caps for:

- Attempts per IP.
- Attempts per `conceptBriefId` / `publicReference` pair.
- Successful uploads per brief.
- Failed uploads per brief pair.

Attempt caps should be low enough to limit storage abuse but high enough to
allow normal customer retry behavior after transient upload failures.

### Future File Checks

Future implementation should consider:

- Maximum file count per brief.
- Maximum per-file size.
- Maximum total upload size per brief.
- Allowed MIME types.
- File signature validation independent of the browser-provided MIME type.
- Image dimensions and pixel count limits.
- Filename normalization and safe metadata handling.
- Optional malware scanning if the storage and review workflow expand.

## 7. Admin Notification Route Hardening

The preferred architecture is to remove public browser-triggered behavior and
send admin notification from a trusted server-side path after Concept Brief
persistence succeeds.

If the route must remain:

- Require a signed, short-lived internal token.
- Bind the token to `conceptBriefId`, `publicReference`, expiry, and action.
- Reject missing, expired, malformed, or mismatched tokens before the
  notification sender is called.
- Keep the current durable idempotency guard, including duplicate detection for
  the same Concept Brief and recipient.
- Add rate limits for invalid attempts by IP.
- Return non-sensitive responses that do not reveal whether a guessed
  `publicReference` exists.

Do not change retry, resend, or real email behavior as part of the planning PR.

## 8. Provider And Environment Decisions

This plan names placeholder environment variables only. It does not add, change,
or reveal real values.

Potential Vercel KV or Upstash placeholders:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Potential Turnstile placeholders:

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Potential signing secret placeholder:

- `NOVORA_INTERNAL_SIGNING_SECRET`

Final provider choice, environment variable names, scope, and Production values
must be approved in a separate provider/env setup task.

## 9. Future Implementation Split

Recommended PR sequence:

1. Provider/env setup PR or manual setup packet:
   choose Vercel KV or Upstash, define approved environment variable names, and
   document Preview/Production handling without exposing real values.
2. Rate-limit helper PR:
   add the server-only helper, policies, safe headers, and focused tests without
   changing bot challenge UX.
3. Turnstile final submission PR:
   add customer submission challenge UI, server-side verification, and tests for
   valid, invalid, missing, and bypass-disabled Production behavior.
4. Upload token PR:
   add short-lived signed upload tokens, brief-pair attempt caps, and focused
   upload route tests.
5. Admin notification signed-token PR:
   remove public browser-triggered behavior if possible, or require signed
   short-lived internal tokens while preserving idempotency.
6. Tests/CI PR:
   broaden Playwright and API coverage around abuse-control responses, safe
   customer errors, and Production bypass prevention.

Each PR should be independently reviewable and should state whether it changes
Production availability, provider configuration, customer flow, or email
behavior.

## 10. Risks And Tradeoffs

- Aggressive limits can block legitimate customers using shared networks,
  privacy relays, or mobile carrier NAT.
- Email-based limits help fake-lead control but must not store raw PII.
- CAPTCHA or Turnstile adds friction at the highest-intent step and may affect
  conversion if implemented poorly.
- Fail-open behavior improves availability but leaves an abuse window during
  provider outages.
- Fail-closed behavior reduces abuse but can block real customers during
  provider outages or misconfiguration.
- Upload token enforcement adds complexity but directly reduces storage cost and
  pair-replay abuse.
- Removing the public notification route is cleaner, but may require reshaping
  the current client/server submission sequence.
- Any retry or resend changes for admin notification can reintroduce duplicate
  email risk and need separate review.

## 11. Manual Approval Gates

Stop and get explicit approval before:

- Installing packages or changing `package.json` / `package-lock.json`.
- Implementing rate-limit code.
- Implementing Turnstile or CAPTCHA.
- Implementing upload token code.
- Implementing admin notification token code.
- Executing SQL.
- Changing Supabase schema, RLS, grants, policies, storage, or customer data.
- Changing Vercel environment variables or project settings.
- Provisioning Vercel KV, Upstash, Turnstile, or any other provider.
- Changing Resend or Cloudflare configuration.
- Sending real email.
- Changing retry or resend behavior.
- Deploying, merging, or force pushing.

## 12. Explicit Non-Goals

This planning PR does not include:

- SQL.
- Supabase policy changes.
- Vercel environment changes.
- Provider provisioning.
- App code changes.
- Email sending.
- Retry or resend behavior changes.
- Auth, payments, CAD, order, production, or AI generation behavior.
- Deployment.
