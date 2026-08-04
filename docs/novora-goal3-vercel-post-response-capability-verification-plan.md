# Goal 3 Vercel Post-Response Capability Verification Plan

## 1. Purpose and decision being tested

Goal 3 must determine whether the deployed Vercel runtime reliably executes the
registered post-response callback after the route has already returned the
confirmed Concept Brief HTTP 201 response and customer-access cookie. The
capability is currently unverified. This document plans a future, separately
approved, human-controlled test; it does not perform that test or claim that the
capability works.

The decision is limited to whether the tested Vercel deployment can sustain the
approved synthetic full route-invocation budget, from authoritative function
entry through post-response callback completion, under the tested conditions.
The probe must create zero Provider/image-generation and external-integration
spend, but its long-running Vercel function may consume metered platform
compute. It is not a decision about real rate-limit or persistence latency, real
Provider success, real Supabase or Storage latency, automatic generation,
customer readiness, or Production rollout.

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

### Observed Step 01 automatic Preview side effect

Publishing the docs-only Goal 3 Step 01 branch caused the
repository-integrated Vercel service to create an automatic Preview deployment.
No manual deployment command or Vercel dashboard deployment action was
performed, and no Production deployment occurred. The Preview URL was not
opened, no request was sent to the Preview, and no callback capability probe
was executed.

The automatic Preview is not callback-capability evidence and does not satisfy
Gate G3-02 or Gate G3-03. It does not authorize Preview access, a Preview
request, probe execution, feature enablement, or any claim of Production
readiness.

## 3. Human approval sequence

Each gate requires an explicit human decision. Passing or completing one gate
does not authorize the next gate.

### Gate G3-01: read-only local and repository evidence review

Before any future source publication, confirm the exact integration commit,
relevant Goal 2 architecture, test scope, prohibited operations, branch diff,
and review ownership using local and GitHub evidence only. Inspect GitHub
checks, comments, and status metadata read-only to determine whether a branch
push or PR update automatically creates a Preview deployment, and reconcile any
already-existing automatic Preview. Do not open or request a Preview, connect
directly to Vercel, or assume that a docs-only or test-only branch is
non-deploying.

### Gate G3-02: Vercel identity confirmation

After separate approval, a human confirms the intended Vercel project,
deployment environment, runtime, and configuration-name posture read-only. Do
not reveal or change values. Stop on any ambiguous project, environment, source
commit, access boundary, or feature-gate posture. This gate does not
retroactively authorize an already-created automatic Preview and does not
authorize opening or requesting any Preview, a new push, deployment,
environment mutation, or probe execution.

### Gate G3-03: deployment strategy and rollback approval

Complete this gate before any push capable of publishing probe-bearing source.
When repository integration is active, treat every such push as a potential
deployment-triggering action. Before the push, approve the exact temporary
source diff, exact branch and expected commit identity, automatic Preview
deployment behavior, target Preview environment, access restrictions,
no-customer controls, zero Provider/image-generation and external-integration
spend controls, and an explicit Vercel compute-cost boundary. That compute
boundary must bind, without exposing account details, the applicable Vercel
billing or usage basis; maximum approved billable invocation duration; maximum
approved compute quantity in the applicable billing unit where available;
maximum approved monetary exposure or conservative cost cap; exactly one probe
execution; the owner responsible for checking the cap; the stop condition when
exposure cannot be estimated or bounded; and confirmation that no Provider or
external-integration spend is authorized. No probe-bearing publication is
authorized when Vercel compute exposure cannot be bounded. The probe route's
explicit duration remains
`export const maxDuration = 300`. G3-03 must also approve the exact persisted-
success production path; its complete pre-registration route inventory; the
derivation source for every pre-registration operation and every route and
callback bound;
`T_request_pre_registration`; `T_registration_to_callback_start`;
`T_callback_pre_provider`; `T_provider = 150 seconds`;
`T_callback_post_provider`; `T_marker_shutdown_margin`; the calculated
`T_total_invocation`; proof that
`T_total_invocation + T_marker_shutdown_margin < 300 seconds`; the synthetic
representation strategy for pre-response and callback phases; deployment and
runtime support for that contract; and exact stop, termination, rollback, and
evidence conditions. The approval must retain the rollback owner and previously
approved source identity. This gate does not authorize Production deployment,
opening or otherwise requesting the Preview, or sending the capability probe
request.

### Gate G3-04: safe synthetic capability probe approval

Approve one bounded probe against the exact temporary Preview deployment. The
approval must bind the synthetic request shape, correlation-identifier rules,
expected marker sequence, maximum invocation duration, zero Provider/image-
generation and external-integration spend controls, the previously approved
Vercel compute-cost boundary, and one execution window. Before the one request,
G3-04 must lock the applicable billing or usage basis, maximum approved billable
invocation duration, maximum approved compute quantity where available, maximum
approved monetary exposure or conservative cap, cap-check owner, cost stop
condition, and exactly one execution. No probe request is authorized when the
approved compute cap is absent. The one-request approval authorizes no retry;
any later retry requires a separate human approval. G3-04 must also lock every
documented derivation source and the exact numeric values for
`T_request_pre_registration`, `T_registration_to_callback_start`,
`T_callback_pre_provider`, `T_provider = 150 seconds`,
`T_callback_post_provider`, `T_marker_shutdown_margin`, and the calculated
`T_total_invocation`. It must also lock the exact synthetic pre-registration
duration, the exact synthetic registration-to-response duration where
applicable, every callback phase duration, the marker deadlines, and the one
execution window. No phase may be implicit, arbitrary, omitted, selected or
reduced after approval, selected after probe publication, or absorbed into an
unexplained callback margin. If the full route lifecycle is incomplete or not
proven to fit the strict 300-second inequality, no request is authorized. The
gate must explicitly prohibit customer data and live external integrations.

Before G3-04, the future owner must map the exact approved persisted-success
route path to a source-linked inventory. The current source path performs the
applicable IP rate-limit evaluation, request-body reading and JSON parsing,
validation, email normalization, email rate-limit evaluation, submission
persistence, persisted-identity creation, response construction, customer-
session cookie attachment, automatic-preview gate evaluation, trigger
preparation, callback registration, and direct helper work before registration.
The inventory must resolve optional branches for the exact approved request; it
does not claim every optional operation executes on every request. Every
operation that does execute on that exact path must be included in
`T_request_pre_registration`, measured from authoritative function/request
entry through successful callback registration and request-path registration-
marker emission.

`T_registration_to_callback_start` must separately bound the interval from
registration-marker emission through remaining work before route return,
response serialization and finalization, authoritative HTTP response
completion, and platform handoff or scheduling delay until callback start.
Callback registration does not reset the invocation duration clock. Source
logging alone cannot establish authoritative response completion. If the
registration-to-return, response-finalization, response-completion, or platform-
handoff portion is unsupported, ambiguous, or unbounded, G3-04 remains blocked.

The callback inventory remains source-linked. `T_callback_pre_provider` must
conservatively bound every applicable callback-owned phase from callback start
to the Provider-invocation boundary, including repository and worker
construction, structured-input preparation, reservation, budget and idempotency
checks, Provider-adapter construction, atomic dispatch claim, conservative cost
recording, and any other pre-Provider work that can occur on the approved path.
`T_callback_post_provider` must conservatively bound every applicable callback-
owned phase after Provider completion through terminal lifecycle completion or
bounded-failure evidence, including Provider-result validation, Storage
activity, Output persistence, actual-cost reconciliation, lifecycle success or
failure persistence, readiness evaluation or safe non-readiness, and any other
post-Provider work that can occur on the approved path. This inventory does not
claim every listed phase executes on every path; it requires every phase that
can execute on the exact approved path to be included.

Every route and callback component must derive from one or more approved
sources: an explicit timeout or deterministic upper bound, a source-level
bounded-operation contract, separately approved zero-customer and zero-live-
integration measurement evidence, or a conservative human-approved cap
supported by documented evidence. Record the derivation source for every
component. A missing, unbounded, unsupported, ambiguous, or wrong-path phase
keeps G3-04 blocked. The implementation owner may not invent, omit, or reduce a
component after approval.

The full invocation model is:

> `T_total_invocation = T_request_pre_registration + T_registration_to_callback_start + T_callback_pre_provider + T_provider + T_callback_post_provider`
>
> `T_provider = exactly 150 seconds`
>
> `T_total_invocation + T_marker_shutdown_margin < 300 seconds`

The 300-second budget begins at authoritative route/function invocation, not at
callback start. If the inequality cannot be supported conservatively, do not
approve or send the probe, omit request-path work, shrink route or callback
phases, or reduce the shutdown margin merely to obtain PASS. Do not claim the
current runtime contract is sufficient. Preserve both feature gates as disabled
or absent and require a separately reviewed architecture or duration-contract
decision. This is pre-probe BLOCKED or INCONCLUSIVE, never PASS.

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
primitive as the locked route. The probe route must explicitly export the same
duration contract as the locked worker route:

> `export const maxDuration = 300`

A probe deployed with the platform default or any shorter route duration cannot
produce capability PASS. At function entry the probe must capture an approved
non-sensitive request-start timestamp. Before callback registration, its request
path must execute the approved synthetic pre-registration interval, isolated
from Provider and external integrations, representing
`T_request_pre_registration`; a trivial request path cannot PASS.
It must then synchronously register exactly one callback. Immediately after
successful callback registration, and still on the request path before
returning the synthetic HTTP 201 response with an inert, non-customer receipt
cookie, it must emit the registration marker. Where required by the approved
model, it must execute an approved synthetic response-path interval, isolated
from Provider and external integrations, after that marker and before response
return to represent the registration-to-response portion of
`T_registration_to_callback_start`. The authoritative
response-completion-to-callback-start interval must be measured and included in
that component. These pre-response synthetic intervals are probe-only and must
not be added to the customer Concept Brief route.

The registration marker must not be emitted inside the callback. The response
path must not await any callback phase. Inside the registered post-response
callback only, execution must emit the callback-start marker, run in order the
approved `T_callback_pre_provider`-equivalent phase, the exact 150-second
`T_provider`-equivalent phase, and the approved
`T_callback_post_provider`-equivalent phase, then emit the callback-completion or
bounded-failure marker within `T_marker_shutdown_margin`. The callback exposes
no intermediate progress markers: it retains only callback-start and callback-
completion or bounded-failure markers.

Every marker must contain only approved non-sensitive fields. The registration
marker or its approved registration ledger must include the request-start
timestamp, registration timestamp, measured request-to-registration elapsed
duration, approved route-lifecycle plan identifier or hash, deployment and
commit attribution, and synthetic correlation identifier. The registration
marker and both callback markers must be attributable to the same synthetic
correlation identifier, deployment identity, and commit identity. To preserve
the two-callback-marker rule, only the final completion or bounded-failure
marker additionally carries the approved non-sensitive callback phase ledger:
configured callback pre-Provider, Provider, and callback post-Provider
durations; approved shutdown margin; measured callback and total invocation
elapsed durations; phase-completion booleans or an equivalent bounded status;
and the completion or bounded-failure outcome. It must not add externally
visible phase-progress markers.

The required ordering is: authoritative function/request start, successful
callback registration, registration marker, authoritative HTTP response
completion, callback start, and callback completion or bounded failure. Source
logging alone cannot prove HTTP response completion.

The marker schema must not contain request headers, cookie contents, request
bodies, Concept Brief fields, customer references, credentials, environment
values, Provider payloads, Storage coordinates, Output identifiers, or mutable
Production identifiers. The synthetic phases represent duration only; they must
not perform the inventoried worker operations, call or construct any live
integration, or create Provider/image-generation or external-integration spend.
The long-running function may consume metered Vercel compute only within the
separately approved boundary. The endpoint must be absent from the previously
approved source after rollback.

The temporary probe must be mechanically isolated from production business
modules: it must not import, construct, or invoke the Concept Brief repository,
generation repository, Provider adapter, OpenAI client, Supabase client,
Storage adapter, Output persistence, readiness transition, notification, email,
payment, quotation, CAD, order, or Production workflow. The probe must create no
customer-visible image, public object, ready Output, or durable customer-system
record.

The future implementation must be reviewed separately. This task implements no
probe endpoint, marker, or instrumentation and performed no manual deployment
command or Vercel dashboard deployment action. Publishing the docs-only branch
did cause a repository-triggered automatic Preview deployment; it was not
opened, requested, or probed and provides no callback evidence.

## 5. Required evidence

A future human-approved test must collect and preserve all of the following:

1. Exact deployment identity and Git commit SHA.
2. Vercel project and environment identity, recorded without secrets, account
   identifiers, private URLs, tokens, or environment contents.
3. One random request correlation identifier containing no customer data.
4. Source and exact-deployment evidence proving the probe route explicitly
   exports `export const maxDuration = 300`, rather than relying on the platform
   default or a shorter route duration.
5. The exact approved persisted-success route path, complete route and callback
   phase inventory, and recorded derivation source for every component bound.
6. The exact approved numeric values for `T_request_pre_registration`,
   `T_registration_to_callback_start`, `T_callback_pre_provider`,
   `T_provider = 150 seconds`, `T_callback_post_provider`,
   `T_marker_shutdown_margin`, `T_total_invocation`, the maximum permitted
   invocation duration, and every marker deadline.
7. Approved calculation evidence proving
   `T_total_invocation + T_marker_shutdown_margin < 300 seconds` without
   omitting or shrinking any route or callback phase.
8. An authoritative function/request-start timestamp.
9. The request-path registration marker or approved registration ledger,
   including the registration timestamp, request-to-registration elapsed
   duration, approved plan identifier or hash, and exact deployment, commit, and
   correlation attribution.
10. An external authoritative timestamp for route-response completion.
11. An authoritative timestamp for callback start and the measured
    registration-to-callback-start elapsed duration, including the measured
    response-completion-to-callback-start portion.
12. An authoritative timestamp for callback completion or intentionally bounded
   failure.
13. The final non-sensitive callback phase ledger proving the configured phase
    durations, approved margin, phase-completion status, outcome, measured
    callback elapsed duration, and measured total invocation elapsed duration
    without exposing prohibited data.
14. Authoritative evidence proving the approved synthetic pre-registration and
    registration-to-response work was represented, every callback phase
    completed in order, the measured total satisfied `T_total_invocation`, and
    the final marker occurred within its deadline while preserving
    `T_marker_shutdown_margin`.
15. Combined evidence proving the strict order: authoritative function/request
    start, successful callback registration, request-path registration marker,
    HTTP response completion, callback start, then callback completion or
    bounded failure. Approved external/platform evidence, not a source log
    alone, must establish response completion and prove the response path did
    not await callback work. The evidence must also prove the callback was not
    terminated before the required completion point.
16. Source inspection and the request-path registration marker proving exactly
   one callback was synchronously registered, with the marker emitted
   immediately after successful registration and before response return. The
   marker must share the callback markers' synthetic correlation identifier,
   deployment identity, and commit identity.
17. Dependency-boundary and runtime evidence proving no duplicate execution and
    no live Provider or other integration construction or call occurred.
18. Repository/runtime evidence proving no customer-ready Output, customer-visible
    asset, public Storage object, or readiness transition was created.
19. A redacted-log review proving no secret, environment value, header, cookie,
    customer payload, or customer identifier was logged.
20. Vercel function/runtime logs, or equivalent authoritative platform evidence,
    tying the registration, callback start, and callback end markers to the exact
    deployment, commit, and correlation identifier, plus approved
    external/platform evidence establishing response completion and the required
    ordering.
21. The approved Vercel compute-cost boundary: applicable billing or usage
    basis, maximum billable invocation duration, maximum compute quantity in the
    applicable unit where available, maximum monetary exposure or conservative
    cap, exactly one execution, cap-check owner, and cost stop condition, all
    recorded without account details.
22. Authoritative usage or billing evidence sufficient to prove the one probe
    remained within the approved Vercel compute cap. If the applicable evidence
    cannot be attributed or the cap cannot be proven, the result is not PASS.
23. Dependency and usage evidence proving zero Provider/image-generation,
    Supabase, Storage, email, payment, quotation, CAD, order, or other external-
    integration spend and proving that no retry occurred.
24. Final `git status --short`, unstaged diff, staged diff, and complete branch
    diff evidence.

Evidence must not contain real values, secret-bearing URLs, tokens, account IDs,
customer references, environment contents, Output UUIDs, or private deployment
coordinates.

## 6. Pass criteria

Capability PASS requires one complete, unambiguous evidence set proving every
condition below:

- The exact deployed probe route exports `export const maxDuration = 300`; a
  platform-default or shorter duration cannot PASS.
- The exact persisted-success route inventory and every route/callback bound are
  complete, defensible, source-linked, and approved.
- The approved synthetic request path consumed the approved
  `T_request_pre_registration` budget; a trivial request path cannot PASS.
- The request-path registration marker was emitted immediately after successful
  synchronous registration and before the synthetic HTTP 201 response and inert
  cookie completed successfully. The authoritative route-response completion
  timestamp precedes callback start.
- The registration-to-response synthetic work was represented where required,
  the complete response/handoff interval was authoritatively measured, and the
  response path did not await any callback phase.
- The callback started after its single synchronous registration in the exact
  deployed environment.
- The approved `T_callback_pre_provider`-equivalent phase completed, the exact
  150-second `T_provider`-equivalent phase completed, and the approved
  `T_callback_post_provider`-equivalent phase completed in order.
- The authoritative elapsed duration proves the complete approved
  `T_total_invocation` executed from function entry, its sum with
  `T_marker_shutdown_margin` remained strictly below 300 seconds, the approved
  margin remained available, and the completion marker was recorded by its
  deadline.
- The registration ledger and final callback phase ledger confirm no route or
  callback phase was omitted. Callback-only timing cannot PASS.
- Every required registration, callback-start, and callback-completion or
  bounded-failure marker and approved ledger was recorded.
- The explicit Vercel compute-cost boundary was approved before publication and
  execution, exactly one probe ran with no retry, and authoritative evidence
  proves its metered compute remained within the approved duration, quantity
  where available, and monetary or conservative cost cap.
- The callback did not execute more than once for the same correlation
  identifier.
- Zero Provider/image-generation and external-integration spend was incurred;
  no paid Provider construction, request, image generation, Supabase, Storage,
  email, payment, quotation, CAD, order, or other external activity occurred.
- No customer-visible asset, ready Output, or other false-ready customer state
  was produced.
- No secret, environment value, request metadata, or customer data was emitted.
- The entire result is attributable to the exact deployment and Git commit.

All conditions are mandatory. Partial evidence is not PASS.

## 7. Fail and inconclusive criteria

### FAIL

The result is FAIL if evidence proves any prohibited or unsafe behavior,
including:

- The response path awaits or otherwise blocks on any synthetic phase or other
  callback work.
- The runtime executes a duration configuration different from the approved
  300-second route contract.
- The callback executes more than once for one probe.
- The probe reaches Provider construction or invocation.
- Any customer-visible readiness, asset, or Output is created.
- A secret, environment value, customer datum, request header, cookie, or raw
  payload is emitted.
- The probe reaches Supabase, Storage, email, payment, quotation, CAD, order, or
  Production workflow code.
- The one-request approval is exceeded by a retry or multiple probe executions.
- Authoritative evidence proves Vercel compute exceeded the approved billable-
  duration, compute-quantity, monetary-exposure, or conservative cost cap.

### INCONCLUSIVE or pre-probe BLOCKED

The result is INCONCLUSIVE, or the pre-probe approval remains BLOCKED, when
capability cannot be proven safely and completely, including when:

- The callback never starts.
- The source-linked phase inventory is missing or not attributable to the exact
  approved persisted-success route and callback path.
- The request-path inventory, invocation-start timestamp, or
  `T_request_pre_registration` bound is missing or unsupported.
- The response/handoff bound is unsupported, ambiguous, or unbounded.
- A trivial synthetic request path or callback-only duration result was used.
- A required route or callback phase bound or derivation source is missing,
  unsupported, unbounded, arbitrary, or ambiguous.
- The total invocation plus shutdown margin cannot fit strictly below 300
  seconds without omitting or shrinking a route or callback phase or reducing
  the margin.
- A route or callback phase was reduced merely to fit the route duration.
- The callback is terminated before the approved complete interval ends.
- The total invocation duration, request-to-registration duration, or
  registration-to-callback-start duration cannot be proven.
- Full invocation evidence is incomplete or ambiguous.
- The deployed `maxDuration = 300` cannot be attributed to the exact deployment
  and commit.
- Only callback timing is available without request-path and response/handoff
  proof.
- The registration ledger, final callback phase ledger, or completion marker is
  absent.
- The applicable Vercel billing or usage basis, compute cap, cap-check owner, or
  cost stop condition is missing before publication or execution.
- Vercel compute exposure cannot be estimated or bounded, or authoritative
  evidence cannot prove the one invocation stayed within the approved cap.
- Exactly one probe execution with no retry cannot be proven.
- Duplicate execution is possible or ambiguous.
- Logs cannot be tied to the exact deployment and commit.
- Runtime logs or timing evidence are incomplete.
- Deployment, project, or environment identity cannot be proven.
- Clock or correlation ambiguity prevents reliable response/callback ordering.
- Any required absence proof cannot be established.

An unsafe event may independently require FAIL even when other evidence is
missing. FAIL, INCONCLUSIVE, and pre-probe BLOCKED may not be converted into
PASS by assumption, retry, partial logs, or expected platform behavior.

## 8. Fail-closed response

Any FAIL, INCONCLUSIVE, or pre-probe BLOCKED result preserves both
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
7. Reconcile the single probe's Vercel compute exposure against its approved cap
   without exposing account details.

No rollback is executed in this task. No manual live-service action,
environment inspection or mutation, Production deployment, Preview request, or
capability probe was performed. The repository-integrated automatic Preview
deployment caused by branch publication is an observed side effect, not a
completed Goal 3 gate or capability result.
Rollback does not authorize a probe retry. Any later retry requires a separate
human approval and a newly confirmed Vercel compute-cost boundary.

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

Goal 3 capability proof must incur zero Provider or image-generation spend and
zero Supabase, Storage, email, payment, quotation, CAD, order, or other external-
integration spend. The existing conservative Provider cost-accounting contract
remains unchanged and is not exercised by the capability probe. No Provider
budget, reservation, cost write, or dispatch path may be reached.

The long-running Vercel function may consume metered platform compute. G3-03 and
G3-04 must separately approve its explicit compute-cost boundary before probe-
bearing publication or execution. Without exposing account details, that future
approval must bind the applicable billing or usage basis, maximum approved
billable invocation duration, maximum approved compute quantity in the
applicable billing unit where available, maximum approved monetary exposure or
conservative cost cap, exactly one probe execution, the owner responsible for
checking the cap, the stop condition when exposure cannot be estimated or
bounded, and confirmation that no Provider or external-integration spend is
authorized. This planning PR invents no monetary cap; the exact future value
must be human-approved for the intended project and account posture.

Do not publish probe-bearing source when compute exposure cannot be bounded, and
do not send the probe when the approved compute cap is absent. Exceeding the cap
or being unable to prove compliance cannot produce PASS. The one-request
approval authorizes no retry; any later retry requires a separate approval.

## 12. Production decision boundary

A capability PASS proves only that the exact tested Vercel deployment sustained
the approved synthetic full route-invocation budget under the tested
conditions and that the single invocation's metered compute stayed within its
approved Vercel cost boundary. It does not prove zero platform-compute cost,
future invocation cost, real rate-limit latency, real persistence latency, real
Provider success, real Supabase or Storage latency, that every customer
submission or real worker execution will finish, Production readiness, or live
feature enablement. It also does not authorize:

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
