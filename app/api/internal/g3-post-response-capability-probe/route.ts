import { after } from "next/server";

export const maxDuration = 300;

const G3_POST_RESPONSE_PROBE_PLAN = Object.freeze({
  version: "g3-post-response-capability-probe-v1",
  phaseDurationsMs: Object.freeze({
    preRegistrationSyntheticWait: 10_000,
    postRegistrationResponsePathWait: 5_000,
    callbackPreProviderEquivalentWait: 25_000,
    providerEquivalentSyntheticWait: 150_000,
    callbackPostProviderEquivalentWait: 25_000,
  }),
  phaseCapsMs: Object.freeze({
    requestEntryToRegistrationMarker: 15_000,
    registrationMarkerToCallbackStart: 15_000,
    callbackPreProviderEquivalent: 30_000,
    providerEquivalent: 150_000,
    callbackPostProviderEquivalent: 30_000,
    totalInvocationPassBoundary: 240_000,
    shutdownSafetyBoundary: 270_000,
  }),
  maxDurationMs: 300_000,
});

type ProbeEvent =
  | "function_entry"
  | "callback_registered"
  | "response_returning"
  | "callback_started"
  | "pre_provider_complete"
  | "provider_equivalent_complete"
  | "callback_completed"
  | "bounded_failure";

type ProbeFailure =
  | "runtime_not_preview"
  | "pre_registration_deadline_exceeded"
  | "callback_registration_failed"
  | "response_path_deadline_exceeded"
  | "callback_started_before_registration_marker"
  | "callback_start_deadline_exceeded"
  | "duplicate_callback_execution"
  | "callback_pre_provider_deadline_exceeded"
  | "provider_equivalent_deadline_exceeded"
  | "callback_post_provider_deadline_exceeded";

type ProbeOutcome = "in_progress" | "pass" | ProbeFailure;

export type G3PostResponseProbeMarker = Readonly<{
  planVersion: typeof G3_POST_RESPONSE_PROBE_PLAN.version;
  correlationId: string;
  event: ProbeEvent;
  elapsedMs: number;
  approvedTimingMs: typeof G3_POST_RESPONSE_PROBE_PLAN;
  booleanState: Readonly<{
    callbackRegistered: boolean;
    callbackClaimed: boolean;
    preProviderComplete: boolean;
    providerEquivalentComplete: boolean;
    postProviderComplete: boolean;
  }>;
  boundedOutcome: ProbeOutcome;
}>;

type ProbeScheduler = (task: () => void | Promise<void>) => void;

type ProbeDependencies = Readonly<{
  runtimeEnvironment?: string;
  clock?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
  schedule?: ProbeScheduler;
  correlationIdSource?: () => string;
  emitMarker?: (marker: G3PostResponseProbeMarker) => void;
}>;

type CallbackState = "idle" | "running" | "passed" | "failed";

const defaultClock = () => performance.now();
const defaultSleep = (durationMs: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, durationMs));
const defaultCorrelationIdSource = () => `g3_${globalThis.crypto.randomUUID()}`;
const defaultEmitMarker = (marker: G3PostResponseProbeMarker) => {
  console.info("NOVORA_G3_POST_RESPONSE_PROBE", JSON.stringify(marker));
};

function canCompleteWithinDeadlines(
  now: number,
  phaseStartedAt: number,
  phaseDurationMs: number,
  phaseCapMs: number,
  functionStartedAt: number,
) {
  const caps = G3_POST_RESPONSE_PROBE_PLAN.phaseCapsMs;
  return (
    phaseDurationMs <= phaseCapMs &&
    now + phaseDurationMs <= phaseStartedAt + phaseCapMs &&
    now + phaseDurationMs <=
      functionStartedAt + caps.totalInvocationPassBoundary &&
    now + phaseDurationMs <=
      functionStartedAt + caps.shutdownSafetyBoundary
  );
}

function createG3PostResponseCapabilityProbeHandler(
  dependencies: ProbeDependencies = {},
) {
  const clock = dependencies.clock ?? defaultClock;
  const sleep = dependencies.sleep ?? defaultSleep;
  const schedule = dependencies.schedule ?? after;
  const correlationIdSource =
    dependencies.correlationIdSource ?? defaultCorrelationIdSource;
  const emitMarker = dependencies.emitMarker ?? defaultEmitMarker;

  return async function postProbe() {
    const functionStartedAt = clock();
    const correlationId = correlationIdSource();
    const durations = G3_POST_RESPONSE_PROBE_PLAN.phaseDurationsMs;
    const caps = G3_POST_RESPONSE_PROBE_PLAN.phaseCapsMs;
    let registrationMarkerAt: number | null = null;
    let callbackRegistered = false;
    let callbackClaimed = false;
    let preProviderComplete = false;
    let providerEquivalentComplete = false;
    let postProviderComplete = false;
    let callbackState: CallbackState = "idle";
    let terminalMarkerEmitted = false;

    const marker = (event: ProbeEvent, boundedOutcome: ProbeOutcome) => {
      emitMarker({
        planVersion: G3_POST_RESPONSE_PROBE_PLAN.version,
        correlationId,
        event,
        elapsedMs: Math.max(0, Math.floor(clock() - functionStartedAt)),
        approvedTimingMs: G3_POST_RESPONSE_PROBE_PLAN,
        booleanState: {
          callbackRegistered,
          callbackClaimed,
          preProviderComplete,
          providerEquivalentComplete,
          postProviderComplete,
        },
        boundedOutcome,
      });
    };

    const boundedFailure = (outcome: ProbeFailure) => {
      callbackState = "failed";
      if (!terminalMarkerEmitted) {
        terminalMarkerEmitted = true;
        marker("bounded_failure", outcome);
      }
      return false;
    };

    const runCallbackPhase = async (
      durationMs: number,
      capMs: number,
      failure: ProbeFailure,
      complete: () => void,
    ) => {
      const phaseStartedAt = clock();
      if (
        callbackState !== "running" ||
        !canCompleteWithinDeadlines(
          phaseStartedAt,
          phaseStartedAt,
          durationMs,
          capMs,
          functionStartedAt,
        )
      ) {
        return boundedFailure(failure);
      }

      await sleep(durationMs);
      const phaseCompletedAt = clock();
      if (
        callbackState !== "running" ||
        phaseCompletedAt > phaseStartedAt + capMs ||
        phaseCompletedAt >
          functionStartedAt + caps.totalInvocationPassBoundary ||
        phaseCompletedAt > functionStartedAt + caps.shutdownSafetyBoundary
      ) {
        return boundedFailure(failure);
      }

      complete();
      return true;
    };

    marker("function_entry", "in_progress");

    const runtimeEnvironment =
      dependencies.runtimeEnvironment ?? process.env.VERCEL_ENV;
    if (runtimeEnvironment !== "preview") {
      boundedFailure("runtime_not_preview");
      return new Response(null, { status: 404 });
    }

    const preRegistrationStartedAt = clock();
    if (
      !canCompleteWithinDeadlines(
        preRegistrationStartedAt,
        functionStartedAt,
        durations.preRegistrationSyntheticWait,
        caps.requestEntryToRegistrationMarker,
        functionStartedAt,
      )
    ) {
      boundedFailure("pre_registration_deadline_exceeded");
      return new Response(null, { status: 503 });
    }

    await sleep(durations.preRegistrationSyntheticWait);
    if (clock() > functionStartedAt + caps.requestEntryToRegistrationMarker) {
      boundedFailure("pre_registration_deadline_exceeded");
      return new Response(null, { status: 503 });
    }

    const callback = async () => {
      await Promise.resolve();

      if (!callbackRegistered || registrationMarkerAt === null) {
        boundedFailure("callback_started_before_registration_marker");
        return;
      }
      if (callbackState !== "idle") {
        boundedFailure("duplicate_callback_execution");
        return;
      }

      callbackState = "running";
      callbackClaimed = true;
      const callbackStartedAt = clock();
      if (
        callbackStartedAt >
        registrationMarkerAt + caps.registrationMarkerToCallbackStart
      ) {
        boundedFailure("callback_start_deadline_exceeded");
        return;
      }
      marker("callback_started", "in_progress");

      if (
        !(await runCallbackPhase(
          durations.callbackPreProviderEquivalentWait,
          caps.callbackPreProviderEquivalent,
          "callback_pre_provider_deadline_exceeded",
          () => {
            preProviderComplete = true;
          },
        ))
      ) {
        return;
      }
      marker("pre_provider_complete", "in_progress");

      if (
        !(await runCallbackPhase(
          durations.providerEquivalentSyntheticWait,
          caps.providerEquivalent,
          "provider_equivalent_deadline_exceeded",
          () => {
            providerEquivalentComplete = true;
          },
        ))
      ) {
        return;
      }
      marker("provider_equivalent_complete", "in_progress");

      if (
        !(await runCallbackPhase(
          durations.callbackPostProviderEquivalentWait,
          caps.callbackPostProviderEquivalent,
          "callback_post_provider_deadline_exceeded",
          () => {
            postProviderComplete = true;
          },
        ))
      ) {
        return;
      }

      callbackState = "passed";
      terminalMarkerEmitted = true;
      marker("callback_completed", "pass");
    };

    try {
      schedule(callback);
      callbackRegistered = true;
      registrationMarkerAt = clock();
      marker("callback_registered", "in_progress");
    } catch {
      boundedFailure("callback_registration_failed");
      return new Response(null, { status: 503 });
    }

    const responsePathStartedAt = clock();
    if (
      !canCompleteWithinDeadlines(
        responsePathStartedAt,
        registrationMarkerAt,
        durations.postRegistrationResponsePathWait,
        caps.registrationMarkerToCallbackStart,
        functionStartedAt,
      )
    ) {
      boundedFailure("response_path_deadline_exceeded");
      return new Response(null, { status: 503 });
    }

    await sleep(durations.postRegistrationResponsePathWait);
    if (
      clock() >
      registrationMarkerAt + caps.registrationMarkerToCallbackStart
    ) {
      boundedFailure("response_path_deadline_exceeded");
      return new Response(null, { status: 503 });
    }

    marker("response_returning", "in_progress");
    return Response.json(
      {
        accepted: true,
        planVersion: G3_POST_RESPONSE_PROBE_PLAN.version,
        correlationId,
      },
      { status: 201 },
    );
  };
}

export const POST = Object.assign(
  createG3PostResponseCapabilityProbeHandler(),
  {
    createTestHandler: createG3PostResponseCapabilityProbeHandler,
    probePlan: G3_POST_RESPONSE_PROBE_PLAN,
  },
);
