# Goal 3 Vercel Post-Response Capability Verification Plan

## 1. Purpose and decision being tested

Goal 3 must determine whether the deployed Vercel runtime reliably executes the
registered post-response callback after the route has already returned the
confirmed Concept Brief HTTP 201 response and customer-access cookie. The
capability is currently unverified. This document plans a future, separately
approved, human-controlled test; it does not perform that test or claim that the
capability works.

The decision is limited to whether the tested Vercel deployment can execute the
registered callback after the response boundary under the tested conditions.
It is not a decision about automatic generation, customer readiness, or
Production rollout.

## 2. Locked Goal 2 architecture

Goal 2 established the following integration-only behavior, which this task
does not alter:

- The confirmed customer response is prepared before generation work.
- Exactly one post-response callback is synchronously registered.
- The request path does not await repository construction, reservation,
  Provider work, Storage, Output persistence, lifecycle completion, or
  readiness.
- The route `maxDuration` is 300 seconds.
- The Provider deadline is 150 seconds.
- Production scheduling fails closed behind both exact server-only comparisons:

  > `NOVORA_INSTANT_PREVIEW_AGENT_ENABLED === "true"`
  >
  > `NOVORA_FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED === "true"`

- Atomic compare-and-set protects against duplicate Provider dispatch.
- The dispatch winner records the conservative 100000 micro-USD cost before
  Provider invocation.
- The lifecycle permits at most two attempts.
- Readiness is impossible until successful Output persistence and lifecycle
  completion.

Neither feature gate is changed, inspected in a real environment, or enabled by
this plan.

## 3. Human approval sequence

Each gate requires an explicit human decision. Passing or completing one gate
does not authorize the next gate.

### Gate G3-01: read-only local and repository evidence review

Confirm the exact integration commit, relevant Goal 2 architecture, test scope,
prohibited operations, branch diff, and review ownership using local and GitHub
evidence only. Do not connect to Vercel or any live service.

### Gate G3-02: Vercel identity confirmation

After separate approval, a human confirms the intended Vercel project,
deployment environment, runtime, and configuration-name posture read-only. Do
not reveal or change values. Stop on any ambiguous project, environment, source
commit, access boundary, or feature-gate posture.

### Gate G3-03: deployment strategy and rollback approval

Approve the exact temporary source diff, isolated Preview deployment strategy,
access controls, evidence retention, rollback owner, previously approved source
identity, and stop conditions. This gate must not authorize Production
deployment or any request.

### Gate G3-04: safe synthetic capability probe approval

Approve one bounded probe against the exact temporary Preview deployment. The
approval must bind the synthetic request shape, correlation-identifier rules,
expected marker sequence, maximum callback duration, zero-spend controls, and
one execution window. It must explicitly prohibit customer data and live
external integrations.

### Gate G3-05: evidence review and capability decision

Reconcile the complete evidence set against the PASS, FAIL, and INCONCLUSIVE
criteria in this plan. Preserve evidence and record the exact deployment and
commit attribution. No result at this gate authorizes feature enablement.

### Gate G3-06: separate live-enablement decision

Only after an independently accepted capability PASS may a separate proposal
ask whether live automatic generation may ever be enabled. That future decision
must reassess security, privacy, access control, cost, Provider, Storage,
Supabase, readiness, rollback, and Production risk. It is not authorized by
this plan or by a capability PASS.

## 4. Safe synthetic probe design

The smallest acceptable future instrumentation is a temporary, Preview-only
probe endpoint using the same Vercel runtime and post-response registration
primitive as the locked route. It must synchronously register exactly one
callback and return a synthetic HTTP 201 response with an inert, non-customer
receipt cookie. Its callback may emit only three bounded structured markers to
authoritative runtime logs: registration, callback start, and callback bounded
completion or bounded failure.

The marker schema must contain only an approved random correlation identifier,
event name, deployment/commit attribution, and timestamp. It must not contain
request headers, cookie contents, request bodies, Concept Brief fields, customer
references, credentials, environment values, or mutable Production identifiers.
The callback should include a short, intentionally bounded, no-op interval so
the evidence can show that the HTTP response did not wait for callback
completion. The endpoint must be absent from the previously approved source
after rollback.

The temporary probe must be mechanically isolated from production business
modules: it must not import, construct, or invoke the Concept Brief repository,
generation repository, Provider adapter, OpenAI client, Supabase client,
Storage adapter, Output persistence, readiness transition, notification, email,
payment, quotation, CAD, order, or Production workflow. The probe must create no
customer-visible image, public object, ready Output, or durable customer-system
record.

The future implementation must be reviewed separately. This task implements no
probe, endpoint, marker, instrumentation, deployment, or request.

## 5. Required evidence

A future human-approved test must collect and preserve all of the following:

1. Exact deployment identity and Git commit SHA.
2. Vercel project and environment identity, recorded without secrets, account
   identifiers, private URLs, tokens, or environment contents.
3. One random request correlation identifier containing no customer data.
4. An authoritative timestamp for route-response completion.
5. An authoritative timestamp for callback start.
6. An authoritative timestamp for callback completion or intentionally bounded
   failure.
7. External request timing and marker ordering proving the customer-response
   path, exercised only with synthetic data, did not wait for callback work.
8. Source inspection and the single registration marker proving exactly one
   callback was registered for the probe.
9. Dependency-boundary and runtime evidence proving no Provider construction or
   call occurred.
10. Repository/runtime evidence proving no customer-ready Output, customer-visible
    asset, public Storage object, or readiness transition was created.
11. A redacted-log review proving no secret, environment value, header, cookie,
    customer payload, or customer identifier was logged.
12. Vercel function/runtime logs, or equivalent authoritative platform evidence,
    tying the registration, response, callback start, and callback end markers
    to the exact deployment and correlation identifier.
13. Final `git status --short`, unstaged diff, staged diff, and complete branch
    diff evidence.

Evidence must not contain real values, secret-bearing URLs, tokens, account IDs,
customer references, environment contents, Output UUIDs, or private deployment
coordinates.

## 6. Pass criteria

Capability PASS requires one complete, unambiguous evidence set proving every
condition below:

- The synthetic HTTP 201 response and inert cookie completed successfully, and
  the authoritative route-response completion timestamp precedes callback
  start.
- External timing proves the response did not wait for the callback's bounded
  work to complete.
- The callback started after its single synchronous registration in the exact
  deployed environment.
- The callback completed or reached the intentionally bounded synthetic end.
- The callback did not execute more than once for the same correlation
  identifier.
- No paid Provider construction, request, image generation, or other live
  external generation occurred.
- No customer-visible asset, ready Output, or other false-ready customer state
  was produced.
- No secret, environment value, request metadata, or customer data was emitted.
- The entire result is attributable to the exact deployment and Git commit.

All conditions are mandatory. Partial evidence is not PASS.

## 7. Fail and inconclusive criteria

### FAIL

The result is FAIL if evidence proves any prohibited or unsafe behavior,
including:

- The response blocks on callback work.
- The callback executes more than once for one probe.
- The probe reaches Provider construction or invocation.
- Any customer-visible readiness, asset, or Output is created.
- A secret, environment value, customer datum, request header, cookie, or raw
  payload is emitted.
- The probe reaches Supabase, Storage, email, payment, quotation, CAD, order, or
  Production workflow code.

### INCONCLUSIVE

The result is INCONCLUSIVE when capability cannot be proven safely and
completely, including when:

- The callback never starts.
- The callback starts but is terminated before the required evidence point.
- Duplicate execution is possible or ambiguous.
- Logs cannot be tied to the exact deployment and commit.
- Runtime logs or timing evidence are incomplete.
- Deployment, project, or environment identity cannot be proven.
- Clock or correlation ambiguity prevents reliable response/callback ordering.
- Any required absence proof cannot be established.

An unsafe event may independently require FAIL even when other evidence is
missing. Neither FAIL nor INCONCLUSIVE may be converted into PASS by assumption,
retry, partial logs, or expected platform behavior.

## 8. Fail-closed response

Any FAIL or INCONCLUSIVE result preserves both
`NOVORA_INSTANT_PREVIEW_AGENT_ENABLED` and
`NOVORA_FIRST_PREVIEW_POST_RESPONSE_EXECUTION_CONFIRMED` as disabled or absent.
No synchronous-generation fallback is allowed. Idempotency, atomic dispatch,
conservative cost accounting, readiness gates, customer isolation, privacy, and
access control must not be weakened to obtain a result.

## 9. Rollback plan

Rollback requires separate approval and must be bound to the temporary
deployment and source identities. The rollback owner must:

1. Remove or disable all probe-only behavior.
2. Restore the prior reviewed environment state without documenting values.
3. Redeploy the previously approved source if required.
4. Confirm both feature gates are disabled or absent without exposing their
   values.
5. Preserve all audit evidence until human review is complete.
6. Verify the final repository commit, deployment identity, branch diff, and
   environment identity.

No rollback is executed in this task because no live change is authorized or
performed.

## 10. Security and privacy checklist

The future probe and evidence review must confirm:

- [ ] No secrets in Git.
- [ ] No customer PII.
- [ ] No raw customer brief.
- [ ] No request headers or cookies copied into documentation or logs.
- [ ] No environment values.
- [ ] No service-role key.
- [ ] No OpenAI key.
- [ ] No signed Storage URL.
- [ ] No Output UUID exposed to a customer or public response.
- [ ] No mutable Production identifiers in fixtures.
- [ ] No persistent test artifact in customer-visible systems.

Any failed or unprovable checklist item prevents PASS.

## 11. Cost boundary

Goal 3 capability proof must incur zero Provider or image-generation spend. The
existing conservative cost-accounting contract remains unchanged and is not
exercised by the capability probe. No Provider budget, reservation, cost write,
or dispatch path may be reached.

## 12. Production decision boundary

A capability PASS proves only that the platform can execute the post-response
callback under the tested conditions. It does not authorize:

- Enabling automatic generation.
- Changing either feature gate.
- Using real customers or customer submissions.
- Calling OpenAI or another Provider.
- Connecting live Supabase or Storage.
- Deploying Goal 3 implementation changes.
- Merging into `main`.
- Claiming Production readiness.

An AI hand-drawn concept sketch remains a concept direction, not CAD, a
quotation, payment confirmation, order approval, production approval, or a
manufacturability guarantee. Paid CAD and formal Production decisions remain
later human-controlled steps.

## 13. Proposed next approval sentence

**Proposed, not yet granted:** “I approve only a read-only precheck of the
intended NOVORA Vercel project identity, environment identity, deployment/source
identity, runtime, and configuration-name presence for Goal 3, without revealing
values; this approval does not authorize environment changes, deployment, live
requests, Provider calls, Supabase or Storage operations, customer-data access,
credential access, or probe execution.”
