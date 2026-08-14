# NOVORA Japan AI Gateway

This directory is a standalone, handoff-ready service boundary for:

`NOVORA server -> authenticated Gateway Contract v1 -> Japan Gateway -> provider adapter -> normalized NOVORA response`

It is intentionally independent from the NOVORA website, Supabase schema, Vercel project, customer browser, and customer-facing routes. Mock mode is the default. This source foundation does not activate or call OpenAI by itself.

## Architecture

The HTTP server owns authentication, request-size limits, strict validation, timeout handling, and normalized responses. Provider adapters receive only the validated structured request. The mock adapter returns a deterministic 1-by-1 PNG marker for development and must never be treated as customer content. The OpenAI adapter is server-only and uses the official Image API generation endpoint when, in a later separately approved operation, `AI_PROVIDER=openai` and the Japan-controlled server secrets are configured.

The Gateway does not interpret the original customer brief. The required upstream workflow remains:

`customer brief -> NOVORA Design Spec -> NOVORA Hand Sketch Instruction -> Japan Gateway -> provider`

Unknown request fields are rejected. Provider model selection and credentials are not accepted in request bodies.

## Runtime packaging

The package keeps validation, runtime compilation, and production startup separate:

- `npm run typecheck` validates strict TypeScript without emitting files.
- `npm run build` compiles the ESM service into `dist/` and rewrites relative `.ts` imports to `.js`.
- `npm start` runs the compiled `dist/server.js` entrypoint.

The included multi-stage `Dockerfile` builds with Node.js 24 LTS and copies only the compiled runtime into the final image. The service reads Cloud Run's injected `PORT`, binds to `0.0.0.0`, and relies on the platform for TLS termination. Container build, runtime verification, secret configuration, and deployment remain separate controlled operations.

### Recommended production deployment

The recommended Japan production handoff is Google Cloud Run source deployment from this directory. `gcloud run deploy --source .` uploads the source, Google Cloud Build performs the remote container build, and the existing `Dockerfile` defines that build. Local Docker and Docker Desktop are optional developer-validation tools; neither is required for the NOVORA Owner or Japan operator.

The prepared handoff fixes the Cloud Run region to `asia-northeast1` (Tokyo) and the service name to `novora-japan-ai-gateway`. See `deploy/README-JAPAN-OPERATOR.md` for the operator checklist and prepared Windows helpers. Runtime secrets remain in Japan-controlled Google Cloud Secret Manager, `AI_PROVIDER=openai` and `OPENAI_IMAGE_MODEL` are runtime configuration, and Cloud Run supplies `PORT` automatically.

## Gateway Contract v1

### `GET /healthz`

Returns only basic service health. It does not report provider mode, account information, billing, credentials, environment values, or internal diagnostics.

### `POST /v1/first-preview`

Requires `Authorization: Bearer <NOVORA_GATEWAY_TOKEN>` and `Content-Type: application/json`.

The exact typed contract is in `src/contracts.ts`. The top-level request fields are:

- `contract_version`
- `request_id`
- `design_spec`
- `hand_sketch_instruction`
- `reference_assets`
- `generation_options`

`design_spec` and `hand_sketch_instruction` are fixed structured objects. Raw customer brief text, arbitrary prompts, model names, provider URLs, executable configuration, credentials, and unknown fields are not allowed.

Reference assets are provider-neutral HTTPS fetch descriptors with an opaque NOVORA asset ID, media type, byte length, and SHA-256. They contain no Supabase table or bucket requirement. The current OpenAI adapter fails explicitly when reference assets are present; a future separately reviewed adapter must add byte/hash verification and an outbound-host allowlist before fetching them.

Responses always normalize these fields:

- `contract_version`
- `request_id`
- `status`: `success`, `provider_error`, `timeout`, `invalid_request`, or `unauthorized`
- `provider`
- `provider_request_id`
- `model`
- `outputs`
- `usage`
- `error`

Raw provider responses, provider error bodies, stack traces, prompts, credentials, and private environment values are never returned.

## Environment variables

Use `.env.example` only as a name template. Do not commit populated environment files.

- `AI_PROVIDER`: `mock` or `openai`; defaults to `mock`.
- `NOVORA_GATEWAY_TOKEN`: separate shared server-to-server secret; at least 32 characters.
- `OPENAI_API_KEY`: Japan-controlled server secret, required only in OpenAI mode.
- `OPENAI_IMAGE_MODEL`: Japan Gateway provider configuration, required only in OpenAI mode.
- `PORT`: Cloud Run-provided listening port; takes precedence when present.
- `GATEWAY_PORT`: optional local listening-port override; defaults to `8787` when neither port variable is present.
- `GATEWAY_REQUEST_TIMEOUT_MS`: bounded provider deadline from `1000` through `300000`; defaults to `150000`.

`OPENAI_API_KEY` is read only from the Japan Gateway server environment. It is never accepted from client input, included in repository files, logged, returned to NOVORA, or exposed to browser code.

## Mock mode

Mock is the default development path. Configure a non-secret local `NOVORA_GATEWAY_TOKEN` of at least 32 characters and keep `AI_PROVIDER=mock`. Mock responses identify both the provider and model as mock and contain a deterministic marker image. They are for contract integration only and are not valid First Preview output for customers.

## Future OpenAI mode

The OpenAI adapter uses a fixed official API host and `POST /v1/images/generations`. It sends one PNG request, builds the provider prompt only from validated Design Spec and Hand Sketch Instruction fields, normalizes token usage when present, validates canonical base64 plus expected PNG dimensions, and uses the response `x-request-id` header only when it matches a safe identifier pattern.

Activation is a separate controlled operation. Before enabling OpenAI mode, the Japan operator must configure the server secret and model, confirm account permissions and billing controls, deploy the service, and run the prepared verification procedure. This repository task does none of those operations.

## Security boundary

- This is server-to-server only; no browser CORS permission is emitted.
- Gateway authentication is independent from the OpenAI credential.
- Authorization is checked before reading the request body.
- Request bodies are capped at 512 KiB and strictly validated.
- The service does not log request headers, bodies, URLs, prompts, credentials, provider errors, or stack traces.
- Health responses reveal no account, billing, provider, or environment data.
- Timeouts abort the provider request and return a normalized error.
- OpenAI error bodies and sensitive provider internals are discarded.
- Mock must remain the development default and must not be accepted as real customer output.

## Prepared verification procedure

Verification is a later, separately authorized runtime gate:

1. In mock mode, verify `/healthz` returns only the documented health object.
2. Verify a missing or incorrect Gateway token returns normalized `unauthorized` without parsing or echoing the body.
3. Verify an unknown field or malformed structured object returns normalized `invalid_request`.
4. Verify one valid mock request returns `success`, `provider: mock`, one normalized output, and no raw provider schema.
5. After separate OpenAI activation approval, repeat the contract checks with the Japan-controlled server secret and confirm exactly one bounded provider request, normalized output, timeout behavior, and no secret or prompt leakage.

No runtime verification is performed by this source-implementation gate.

## Japan operator responsibilities

The Japan operator is not expected to develop the Gateway. NOVORA prepares the service. The operator will eventually only need to:

- own the OpenAI account and project;
- configure billing and spending controls;
- create and control the API credential;
- place that credential into the Japan-controlled server secret;
- deploy the prepared Gateway; and
- run the prepared verification procedure.

Provider activation, deployment, secret placement, billing changes, and live verification remain separate Owner-approved gates.
