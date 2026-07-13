# NOVORA First Preview Provider, Privacy, Cost, and Rate-Limit Decision v1

## 1. Status and scope

This document is the Agent 69C decision packet for NOVORA's future First
Preview provider adapter. It is governed by the First Preview Product Contract
v1 and the reuse-first data-model plan.

This is a docs-only decision. It does not add an SDK, make a provider request,
generate an image, configure a key or environment variable, execute SQL, access
Supabase or customer data, change Storage, deploy, or change Production.
Current Production remains mock-only.

## 2. Locked provider decision

The selected First Preview provider is **OpenAI**. The selected model is the
pinned **`gpt-image-2-2026-04-21`** snapshot in the GPT Image 2 family, called
through the Image API generation endpoint, `/v1/images/generations`.

The snapshot is selected for repeatable MVP behavior. Moving to a later
snapshot or alias requires an owner-reviewed compatibility, quality, safety,
privacy, and cost decision; it is not a transparent configuration change.

The Image API is selected because the MVP needs one image from one complete,
server-built instruction, not a conversational editing session. The official
guide recommends the Image API for this one-shot case.

Decision rationale:

- **Output suitability:** GPT Image 2 is OpenAI's current image-generation
  family and supports controlled size and quality. NOVORA still treats jewelry
  geometry and manufacturability as post-preview human-review concerns; the
  provider is not treated as CAD-authoritative.
- **Structured reliability:** one server-built request and a base64 image
  response fit the existing exactly-one-image provider-neutral interface.
- **Privacy:** an explicit structured-field allowlist and the initial
  no-reference-image decision minimize provider disclosure; the documented
  default retention limitations remain visible rather than being assumed away.
- **Safety:** provider generation filtering can contribute evidence while the
  Product Contract still requires a separate server-controlled output-safety
  decision before visibility.
- **Predictable cost:** fixed count, dimensions, and quality provide a dated
  per-output planning baseline, with owner-controlled aggregate caps.
- **Operational simplicity:** one provider and no automatic fallback avoid
  duplicate billing, cross-provider privacy differences, and ambiguous attempt
  lineage during the MVP.

The model identity, endpoint behavior, published data-control posture, and
published prices are verified provider facts dated in section 11. The selected
snapshot, request profile, timeout, retry limits, byte cap, privacy allowlist,
and cost/rate-limit policy are NOVORA product decisions.

The future request profile is:

- `model`: `gpt-image-2-2026-04-21`.
- Exactly one Image API HTTP request per attempt; the adapter performs no
  hidden retry or fallback call.
- `n`: `1`; one request may produce exactly one candidate output.
- `size`: `1024x1024`.
- `quality`: `medium`.
- `output_format`: `png`.
- `moderation`: `auto`.
- No streaming or partial images.
- No reference-image input in the initial adapter.
- A 150-second server-side attempt deadline, subject to a separate hosting
  duration preflight before route wiring.

`medium` is the selected MVP balance between a customer-meaningful concept
preview and the large cost increase at `high`. The official price table checked
on 2026-07-13 lists a 1024-by-1024 GPT Image 2 output at USD 0.053 for `medium`,
USD 0.006 for `low`, and USD 0.211 for `high`, excluding input-token charges.
These are planning observations, not a permanent price promise.

## 3. Provider request contract

The adapter must implement the existing provider-neutral runtime interface. It
must not accept a raw browser payload or the raw Concept Brief as a provider
prompt.

The server request builder may receive only:

- The validated, versioned Design Spec fields already allowlisted by the
  provider-neutral runtime: `spec_version`, `language`, `piece_type`,
  `customer_intent_summary`, `design_direction`, `jewelry_structure`,
  `materials`, `stones`, `motifs`, `dimensions`,
  `production_feasibility_notes`, and `sketch_requirements`.
- The validated, versioned Hand Sketch Instruction fields already allowlisted
  by that runtime: `instruction_version`, `design_spec_version`, `language`,
  `sheet_style`, `brand_placement`, `views`,
  `jewelry_rendering_instructions`, `stone_and_setting_instructions`,
  `motif_instructions`, `annotation_instructions`,
  `dimension_and_scale_notes`, `composition_instructions`,
  `disclaimer_instructions`, and `negative_constraints`.
- Server-owned template and policy versions.
- The selected model, size, quality, format, and moderation settings above.
- Server-owned attempt and correlation identifiers that are not inserted into
  the prompt and are never exposed to the customer.

The serializer must use an explicit field allowlist and deterministic ordering.
It must persist or make available for persistence the structured-input hashes,
template version, policy version, model snapshot, and a sanitized request
correlation value before the provider call. It must never log the assembled
prompt or provider request body.

The adapter must not send:

- Customer name, email, telephone or WhatsApp number, address, country or
  region, contact notes, or other contact details.
- `publicReference`, Concept Brief UUID, database IDs, Storage paths, signed
  URLs, session identifiers, IP addresses, or authentication material.
- Raw customer free text that has not been reduced to validated structured
  design fields.
- Admin/reviewer notes, internal risk comments, hidden prompt text, provider
  metadata, secrets, API keys, or environment values.
- Reference-image bytes, URLs, embeddings, filenames, or metadata in the
  initial adapter.

The request builder must reject missing or inconsistent Design Spec and Hand
Sketch Instruction identities before any provider call. Client-supplied
provider/model values or safety/readiness booleans are not authoritative.

## 4. Reference-image and privacy decision

Initial First Preview generation will **not forward customer reference images
to OpenAI**. Reference assets remain inside NOVORA's controlled private context
and may affect generation only through separately validated, non-identifying
structured design fields.

Future provider-side reference-image or editing support requires a separate
approved privacy, consent, legal, retention, Storage-access, and adapter task.
That task must prove customer authorization, private server-mediated retrieval,
minimum necessary disclosure, deletion/retention handling, and a compatible
provider data-control posture before any bytes leave NOVORA.

OpenAI states that API data is not used to train its models unless the customer
opts in. Under the default API posture, abuse-monitoring logs may retain content
for up to 30 days. The image-generation endpoint has no application-state
retention in the published endpoint table and is eligible for Zero Data
Retention, but ZDR or Modified Abuse Monitoring requires prior approval.
NOVORA must therefore assume the default up-to-30-day abuse-monitoring posture
until a later owner-approved account verification proves otherwise.

OpenAI also documents that image and file inputs are scanned for potential
CSAM, and flagged material may be retained for manual review even with ZDR or
Modified Abuse Monitoring. This reinforces the initial no-reference-image
decision and must be included in any future reference-image consent review.

NOVORA must not claim provider deletion, geographic residency, ZDR, or a custom
retention term without account-specific written evidence. Provider responses
and errors must be sanitized before persistence or logging.

## 5. Provider response and asset-normalization contract

Provider HTTP success is only transport evidence. It is not
`first_preview_ready`.

The adapter may accept a response only when all of these checks pass:

1. The response belongs to the expected active attempt.
2. The provider returned exactly one image result.
3. The result contains decodable base64 image data, not a provider URL.
4. Decoded bytes are a PNG by signature and decoder inspection.
5. Dimensions are exactly 1024 by 1024 pixels.
6. Decoded size is non-zero and no greater than the NOVORA product cap of
   16 MiB.
7. No provider payload, revised prompt, internal prompt, secret, private path,
   reviewer note, or unsupported metadata enters the customer-safe output.
8. The normalized result passes the server-controlled automatic evidence
   checks defined below.

The normalized provider result must contain only an opaque server-owned asset
identifier, safe technical metadata, sanitized provider/model identifiers,
attempt identity, and gate evidence. It must not contain a permanent public
URL, raw provider body, raw error body, or raw prompt.

The 16 MiB cap is a NOVORA safety decision, not a provider guarantee. A later
Storage task may lower it after verifying decoder, compression, and delivery
constraints. Zero images, multiple images, malformed base64, wrong format,
wrong dimensions, oversized output, or unknown attempt identity fail closed.

## 6. Safety-evidence contract

Every mandatory automatic gate needs a trusted producer, a server validation
point, persisted evidence, and fail-closed behavior. Provider assertions are
evidence inputs only; they cannot independently authorize visibility.

| Gate | Trusted producer and evidence | Server validation point | Fail-closed behavior |
| --- | --- | --- | --- |
| Persisted Concept Brief identity | NOVORA persistence layer; internal brief UUID, valid `publicReference`, persisted state | Before job creation and again before readiness | No job or visibility |
| Structured-input validity | Versioned NOVORA validators; spec/instruction identities and hashes | Before any provider call | Reject attempt without charge |
| Provider request acceptance | OpenAI transport response; request correlation and sanitized HTTP/error category | In the adapter | No completion or readiness |
| Provider completion | Adapter; exactly-one normalized result bound to the active attempt | During response normalization and atomic attempt transition | Mark sanitized failure; no asset visibility |
| Content safety | OpenAI generation filtering plus a separately approved server-controlled output safety evaluator and policy version | After decode and before asset acceptance/readiness | Quarantine or discard output; no visibility; no automatic retry |
| Privacy | NOVORA allowlist serializer, leakage scanner, prompt/template policy hashes, and no-reference-image assertion | Before send and after normalization | Abort or reject; no visibility |
| Output validity | NOVORA decoder/validator; signature, dimensions, byte size, count, and normalized metadata | Before controlled asset persistence | Reject output; no visibility |
| Asset validity | Future NOVORA private-asset layer; committed private object identity, checksum, size/type metadata, and successful read verification | After private persistence and before readiness | No durable asset and no visibility |
| Provider metadata non-exposure | NOVORA response normalizer and customer-response allowlist | At normalization and every customer serialization | Reject or redact output; no visibility until evidence passes |
| Prompt/note non-exposure | NOVORA leakage scanner covering internal prompts and reviewer/admin notes | Before persistence and every customer serialization | Reject or redact output; no visibility until evidence passes |
| Lifecycle integrity | NOVORA persistence layer; current active attempt, terminal-state compare-and-set, job/output lineage | Before accepting a result and before readiness | Late/stale result cannot resurrect a terminal state |
| Access eligibility | Future NOVORA server access layer; authorized customer context, unexpired server-mediated or signed access | On every asset read, independently of database readiness | Deny access without changing readiness evidence |
| Safe failure | NOVORA orchestration; timeout/error category, retry count, budget decision, terminal state | On every exception, timeout, provider error, or invalid output | Terminal safe state; no false success |
| False-success prevention | NOVORA readiness evaluator; complete trusted evidence set, not provider/client booleans | After all automatic gates and again at customer serialization | Any absent, stale, or contradictory evidence means not ready |

OpenAI's `moderation=auto` generation filter is required but is not, by itself,
the full NOVORA content-safety gate. The official `omni-moderation-latest`
model supports image input and is a candidate for the separate server-side
output evaluator. Selecting, implementing, and testing that evaluator is a
later safety task; Agent 70A must not manufacture a passed result when it is
absent.

Provider success, an asset ID, a URL, provider moderation behavior, or any
client-supplied boolean can never independently establish
`first_preview_ready`. Initial customer visibility remains blocked until all
Product Contract gates, including future persistence, asset, access, lifecycle,
and automatic safety evidence, pass. Per-image human pre-approval is not one of
those initial gates.

## 7. Timeout, cancellation, error, and late-result behavior

Each provider attempt has a 150-second wall-clock deadline. The official image
guide notes that complex prompts may take up to two minutes, so the existing
provider-neutral runtime's 30-second default is not suitable for the selected
live profile. Agent 70A must make the timeout explicit and dependency-injected;
it must not change Production configuration or route behavior.

Before later route wiring, the hosting task must prove that its execution limit
comfortably exceeds the adapter deadline. If it does not, the architecture must
use a durable asynchronous worker rather than silently lowering safety or
leaving ambiguous jobs.

Abort/cancellation stops NOVORA from waiting and moves the attempt through an
atomic terminal transition. Official provider documentation reviewed here does
not establish that client abort prevents provider-side completion or billing.
Therefore cancellation is not a cost guarantee.

A response arriving after timeout, cancellation, replacement, budget block, or
another terminal state must fail an atomic compare-and-set check. It may not
become current, restore processing, create readiness, or replace a newer output.
Its sanitized charge metadata may be recorded if available; its image must be
discarded or quarantined under the later approved retention design.

Persist only stable, sanitized error categories such as `rate_limited`,
`provider_5xx`, `network_error`, `timed_out`, `moderation_blocked`,
`invalid_request`, `invalid_output`, and `budget_blocked`. Raw error messages,
request bodies, provider payloads, prompts, and secrets are prohibited.

## 8. Retry, idempotency, regeneration, and cost boundary

The first-preview automatic lineage permits at most **two provider attempts**:
one initial attempt and one automatic retry. The retry is permitted only for a
transient 429, provider 5xx, or network failure, and only when the same validated
input identity is still current and the budget/rate-limit checks pass.

Retry timing must respect a valid provider retry hint when present; otherwise it
uses bounded exponential backoff with jitter. The retry scheduler and exact
delay values require implementation review. A timeout is not automatically
retried because provider completion and charge state may be unknown.

No automatic retry is allowed for moderation blocks, privacy failures, invalid
or missing structured inputs, 4xx request errors other than 429, invalid image
count/data/format/dimensions, lifecycle conflicts, access failures, or exhausted
or unavailable budget evidence.

One separately authorized customer-feedback regeneration lineage may make one
additional provider attempt. Therefore the product maximum before human
intervention is **three provider attempts per Concept Brief**: at most two in
the initial lineage plus one feedback regeneration attempt. Further generation
requires a recorded human/admin recovery decision and a new bounded lineage;
it is never triggered by refresh or repeated feedback submission.

Duplicate confirmed-persistence events, browser refreshes, callbacks, retries,
and concurrent workers must reuse the same attempt or terminal result through
the data-model plan's null-safe idempotency identity and active-attempt
uniqueness. Only one active attempt and one current customer preview are allowed
per Concept Brief and generation purpose.

The future cost ledger must record, when available:

- Provider, pinned model, size, quality, format, and pricing-version date.
- Attempt number, lineage, outcome, retry reason, and whether a late result was
  observed.
- Estimated and provider-reported input/output usage, normalized USD estimate,
  and whether the final charge is known or unknown.
- Daily and monthly budget decision identifiers without exposing secret billing
  information.

Before a provider call, the server must atomically reserve an estimated cost
against per-brief, daily, and monthly limits. After completion it reconciles the
reservation where reliable usage evidence exists. Unknown reconciliation fails
closed for further automatic attempts. Monetary thresholds remain owner-owned,
server-only operational configuration and must be approved before live calls;
missing or unavailable generation-budget state blocks generation.

The USD 0.053 medium-output observation is a planning baseline only. Input-token
costs, provider pricing changes, taxes, currency conversion, failed/late request
charges, and moderation calls can change actual cost. Implementation must never
hard-code the documentation price as an eternal billing truth.

## 9. Rate-limit decision by boundary

Rate limiting is separate from readiness and separate from authentication.
`publicReference` is not authentication, authorization, or a secret.

### A. Public Concept Brief submission

Keep the existing documented boundary: 30 submissions per IP fingerprint per
10 minutes and 5 per HMAC email fingerprint per hour. The existing submission
limiter's provider-unavailable posture remains fail-open for availability; this
Agent does not change it. A deliberate submission 429 creates no generation
job. Any broader-public-launch change requires its own approved rate-limit and
environment task.

### B. Internal post-persistence generation initiation

Only a trusted server event after confirmed persistence may initiate generation.
The key must include internal Concept Brief UUID, generation purpose, current
spec/instruction identities, and lineage. Permit one active attempt per brief
and enforce a configurable global concurrency cap. Missing limiter, budget, or
idempotency evidence fails closed because this boundary can spend money.

### C. Customer feedback and regeneration

Feedback requires a secure customer access context bound to the Concept Brief
and visible output; `publicReference` alone is insufficient. The product limit
is three accepted feedback submissions per authorized context per hour and one
provider-backed regeneration lineage before human intervention. Duplicate
feedback identities reuse the prior result. Missing limiter, budget, or access
evidence blocks regeneration. If the feedback rate-limit provider is
unavailable, the future write endpoint fails closed with a safe retry response;
it must not claim feedback was persisted. Preserving a draft locally or on the
server requires a separately approved design and must not trigger generation.

### D. Admin recovery

Recovery requires an authenticated and authorized admin identity, explicit
brief/lineage/action identity, reason, audit record, budget reservation, and an
atomic one-active-attempt check. Client-supplied admin flags, IDs, or booleans
are not authority. Cost-bearing recovery fails closed when access, audit,
limiter, idempotency, or budget evidence is unavailable. Read-only admin review
must remain separate from the generation action. An unavailable rate-limit
provider therefore blocks recovery and cannot be bypassed by a client flag.

These are product limits for future server enforcement, not current Production
configuration. Agent 69C provisions no limiter and changes no environment.

## 10. Agent 70A adapter acceptance criteria

The next recommended implementation slice is Agent 70A: a server-only OpenAI
GPT Image 2 adapter behind the existing provider-neutral interface.

Agent 70A may:

- Add the adapter, a dependency-injected transport boundary, request builder,
  response normalizer, sanitized error mapping, and deterministic tests.
- Add server-only environment-name presence/shape validation without reading,
  logging, documenting, or exposing any secret value and without changing an
  environment.
- Pin `gpt-image-2-2026-04-21` and enforce the selected one-image request profile.
- Enforce the structured allowlist, no-reference-image rule, no-prompt logging,
  150-second explicit timeout, and exact response validation.
- Use fake transport responses only in tests and prove no real network call.
- Prove that provider success/asset identity never independently creates
  `first_preview_ready`.

Agent 70A must not:

- Add or request an API key, call OpenAI, generate an image, inspect billing, or
  configure an environment.
- Change routes, UI, customer visibility, schema, SQL, Supabase, Storage, RLS,
  access control, deployment, Production, or customer data.
- Forward reference images or raw customer/contact/identity data.
- Implement a fake passed moderation, privacy, access, persistence, asset, or
  lifecycle gate when trusted evidence is unavailable.
- Implement feedback regeneration or admin recovery.

Required deterministic tests include:

- Exact request field allowlist and fixed model/count/size/quality/format/
  moderation values.
- Rejection before transport for missing/inconsistent structured identities,
  forbidden PII/internal fields, and any reference-image input.
- Exactly-one valid PNG normalization.
- Zero/multiple images, invalid base64, wrong signature, dimensions, oversize,
  provider URL-only, leaked prompt/metadata, and malformed response rejection.
- Sanitized mappings for 429, 5xx, network failure, timeout, moderation block,
  and other 4xx responses without raw-payload leakage.
- AbortSignal propagation and a late-result simulation proving no readiness or
  terminal-state resurrection.
- No automatic SDK retry and no second transport call inside the adapter.
- No network use in the test suite.

The broader retry scheduler, budget reservation, rate-limit provisioning,
persistence, private Storage, access layer, and customer route wiring remain
separate later approval slices.

## 11. Official sources and unresolved account facts

All provider facts used for this decision were checked on 2026-07-13 against
official OpenAI sources only:

- [GPT Image 2 model](https://developers.openai.com/api/docs/models/gpt-image-2)
  (`developers.openai.com`):
  model/snapshot identity, endpoint, capabilities, and tier-dependent rate
  limits. NOVORA's account tier and actual limits were not accessed.
- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
  (`developers.openai.com`):
  Image API selection, parameters, base64 output, moderation choices, image
  constraints, latency note, error guidance, and the current per-image pricing
  table. Pricing can change and was not verified against a NOVORA bill.
- [Data controls](https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint)
  (`developers.openai.com`):
  default training posture, abuse-monitoring retention, endpoint application
  state, ZDR eligibility/approval, and image-input safety-retention caveats.
  NOVORA account-specific ZDR, residency, and retention were not accessed.
- [omni-moderation-latest model](https://developers.openai.com/api/docs/models/omni-moderation-latest)
  (`developers.openai.com`):
  image-input moderation capability and pricing posture. It remains a future
  evaluator candidate, not an implemented or approved gate.

Unresolved facts that must fail closed before live generation include NOVORA's
provider account approval, actual usage tier, billing owner, monetary caps,
regional/data-control settings, ZDR status, hosting execution limit, SDK and
API-version compatibility, and the separately approved output-safety evaluator.

## 12. Safety conclusion

This decision preserves the locked sequence:

confirmed persistence -> validated structured inputs -> generation -> trusted
automatic gates -> first customer-visible preview -> feedback -> human
correction or regeneration -> formal downstream human-controlled decisions.

Human review is not a mandatory gate for the initial First Preview.
`approved_for_customer` and `approved_for_gallery` are not prerequisites for
`first_preview_ready`. They remain separate later formal-material and gallery
decisions. The preview remains an AI concept direction, not CAD, quotation,
payment, order, production approval, or a manufacturability guarantee.
