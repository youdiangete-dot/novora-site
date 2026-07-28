import "server-only";

import { types as nodeUtilTypes } from "node:util";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES,
  verifyFirstPreviewCustomerAccessProof,
} from "./first-preview-customer-access-contract";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION,
  FIRST_PREVIEW_LINEAGE_IDENTITY,
  type FirstPreviewFailureCategory,
  type FirstPreviewJobStatus,
} from "./first-preview-persistence-contract";

const MAXIMUM_COOKIE_HEADER_BYTES = 8_192;
const MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS = 4_096;
const MAXIMUM_DATE_EPOCH_MILLISECONDS = 8_640_000_000_000_000;
const CANONICAL_UTC_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const RETRYABLE_FAILURES = new Set<FirstPreviewFailureCategory>([
  "rate_limited",
  "provider_unavailable",
  "network_failure",
]);

const REQUEST_KEYS = ["cookieHeader", "publicReference"] as const;
const DEPENDENCY_KEYS = ["clock", "signingSecret", "stateSourceFactory"] as const;
const SOURCE_METHOD = "readExactCustomerFirstPreviewState";
const SNAPSHOT_KEYS = [
  "conceptBriefId",
  "jobs",
  "outputs",
  "pendingExpiresAt",
  "publicReference",
] as const;
const JOB_KEYS = [
  "attemptNumber",
  "cancelledAt",
  "completedAt",
  "conceptBriefId",
  "createdAt",
  "deadlineAt",
  "designSpecSha256",
  "designSpecVersion",
  "failedAt",
  "failureCategory",
  "generationPurpose",
  "handSketchInstructionSha256",
  "handSketchInstructionVersion",
  "id",
  "lineageIdentity",
  "parentJobId",
  "retryEligible",
  "sourceOutputId",
  "startedAt",
  "status",
  "timedOutAt",
] as const;
const OUTPUT_KEYS = [
  "assetCreatedAt",
  "assetPersisted",
  "assetValidatedAt",
  "attemptNumber",
  "automaticGatePassedAt",
  "automaticGatePolicyVersion",
  "conceptBriefId",
  "createdAt",
  "gates",
  "id",
  "isCurrentCustomerPreview",
  "jobId",
  "readinessStatus",
  "readyAt",
  "revokedAt",
] as const;
const GATE_KEYS = [
  "accessControlPassed",
  "assetValid",
  "complexCase",
  "contentSafetyPassed",
  "lifecycleEligible",
  "lowConfidence",
  "outputValid",
  "ownershipConsistent",
  "privacyPassed",
] as const;

export type FirstPreviewCustomerStateBindingRequest = Readonly<{
  publicReference: string;
  cookieHeader: string | null;
}>;

export type FirstPreviewCustomerStateLookup = Readonly<{
  conceptBriefId: string;
  publicReference: string;
}>;

export interface FirstPreviewCustomerStateSource {
  readExactCustomerFirstPreviewState(
    lookup: FirstPreviewCustomerStateLookup,
  ): unknown | Promise<unknown>;
}

export type FirstPreviewCustomerStateBindingDependencies = Readonly<{
  clock: () => number;
  signingSecret: string;
  stateSourceFactory: () => FirstPreviewCustomerStateSource;
}>;

export type FirstPreviewCustomerSafeState =
  | Readonly<{ state: "pending" }>
  | Readonly<{
      state: "ready";
      publicReference: string;
      outputId: string;
    }>
  | Readonly<{ state: "unavailable" }>
  | Readonly<{ state: "denied" }>;

type VerifiedCustomer = Readonly<{
  conceptBriefId: string;
  publicReference: string;
  proofExpiresAtMs: number;
}>;

type ValidatedJob = Readonly<{
  raw: Record<string, unknown>;
  id: string;
  attemptNumber: 1 | 2;
  status: FirstPreviewJobStatus;
  createdAt: number;
  startedAt: number | null;
  deadlineAt: number | null;
  terminalAt: number | null;
  failedAt: number | null;
}>;

type ValidatedOutput = Readonly<{
  id: string;
  jobId: string;
  attemptNumber: 1 | 2;
  assetCreatedAt: number;
  assetValidatedAt: number;
  createdAt: number;
  automaticGatePassedAt: number;
  readyAt: number;
}>;

function denied(): FirstPreviewCustomerSafeState {
  return { state: "denied" };
}

function unavailable(): FirstPreviewCustomerSafeState {
  return { state: "unavailable" };
}

function isCallableNonProxy(
  value: unknown,
): value is (...args: never[]) => unknown {
  return typeof value === "function" && !nodeUtilTypes.isProxy(value);
}

function snapshotOwnDataRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Record<string, unknown> | null {
  if (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    nodeUtilTypes.isProxy(value)
  ) {
    return null;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;

  const ownKeys = Reflect.ownKeys(value);
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some(
      (key) => typeof key !== "string" || !expectedKeys.includes(key),
    )
  ) {
    return null;
  }

  const snapshot: Record<string, unknown> = Object.create(null);
  for (const key of ownKeys) {
    if (typeof key !== "string") return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      !descriptor ||
      descriptor.enumerable !== true ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      Object.prototype.hasOwnProperty.call(descriptor, "get") ||
      Object.prototype.hasOwnProperty.call(descriptor, "set")
    ) {
      return null;
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function snapshotArray(value: unknown, maximumLength: number): unknown[] | null {
  if (
    !Array.isArray(value) ||
    nodeUtilTypes.isProxy(value) ||
    value.length > maximumLength
  ) {
    return null;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Array.prototype) return null;
  return Array.from(value);
}

function isSafeObservationClock(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    !Object.is(value, -0) &&
    value <= Math.floor(MAXIMUM_DATE_EPOCH_MILLISECONDS / 1_000)
  );
}

function canonicalUtcEpochMs(value: unknown): number | null {
  if (
    typeof value !== "string" ||
    !CANONICAL_UTC_PATTERN.test(value)
  ) {
    return null;
  }
  const epochMs = Date.parse(value);
  return Number.isFinite(epochMs) &&
    epochMs >= -MAXIMUM_DATE_EPOCH_MILLISECONDS &&
    epochMs <= MAXIMUM_DATE_EPOCH_MILLISECONDS &&
    new Date(epochMs).toISOString() === value
    ? epochMs
    : null;
}

function nullableCanonicalUtcEpochMs(value: unknown): number | null | undefined {
  return value === null ? null : canonicalUtcEpochMs(value) ?? undefined;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && isValidFirstPreviewAssetUuid(value);
}

function isNonblankIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim() &&
    value.length <= 128
  );
}

function extractExactAccessProof(cookieHeader: unknown): string | null {
  if (
    typeof cookieHeader !== "string" ||
    cookieHeader.length === 0 ||
    Buffer.byteLength(cookieHeader, "utf8") > MAXIMUM_COOKIE_HEADER_BYTES ||
    /[\r\n\0]/.test(cookieHeader)
  ) {
    return null;
  }

  let proof: string | null = null;
  for (const rawPart of cookieHeader.split(";")) {
    const part = rawPart.trim();
    const separator = part.indexOf("=");
    if (separator <= 0) return null;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name !== FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME) continue;
    if (
      proof !== null ||
      value.length === 0 ||
      Buffer.byteLength(value, "utf8") >
        FIRST_PREVIEW_CUSTOMER_ACCESS_MAX_TOKEN_BYTES
    ) {
      return null;
    }
    proof = value;
  }
  return proof;
}

function verifyCookieBeforeSource(
  request: Record<string, unknown>,
  signingSecret: string,
  nowEpochSeconds: number,
): VerifiedCustomer | null {
  if (
    typeof request.publicReference !== "string" ||
    !isValidFirstPreviewPublicReference(request.publicReference)
  ) {
    return null;
  }
  const proof = extractExactAccessProof(request.cookieHeader);
  if (!proof) return null;

  const claims = verifyFirstPreviewCustomerAccessProof(
    proof,
    signingSecret,
    nowEpochSeconds,
  );
  if (
    !claims ||
    claims.publicReference !== request.publicReference ||
    claims.exp > Math.floor(MAXIMUM_DATE_EPOCH_MILLISECONDS / 1_000)
  ) {
    return null;
  }
  return {
    conceptBriefId: claims.briefId,
    publicReference: claims.publicReference,
    proofExpiresAtMs: claims.exp * 1_000,
  };
}

function captureSourceMethod(
  source: unknown,
): ((
  lookup: FirstPreviewCustomerStateLookup,
) => unknown | Promise<unknown>) | null {
  if (
    (typeof source === "object" || typeof source === "function") &&
    source !== null &&
    nodeUtilTypes.isProxy(source)
  ) {
    return null;
  }
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    return null;
  }
  const descriptor = Object.getOwnPropertyDescriptor(source, SOURCE_METHOD);
  if (
    !descriptor ||
    descriptor.enumerable !== true ||
    !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
    !isCallableNonProxy(descriptor.value)
  ) {
    return null;
  }
  return descriptor.value as (
    lookup: FirstPreviewCustomerStateLookup,
  ) => unknown | Promise<unknown>;
}

function validateJob(
  value: unknown,
  customer: VerifiedCustomer,
  observationMs: number,
): ValidatedJob | null {
  const job = snapshotOwnDataRecord(value, JOB_KEYS);
  if (
    !job ||
    !isUuid(job.id) ||
    job.conceptBriefId !== customer.conceptBriefId ||
    job.generationPurpose !== "first_preview" ||
    job.lineageIdentity !== FIRST_PREVIEW_LINEAGE_IDENTITY ||
    (job.attemptNumber !== 1 && job.attemptNumber !== 2) ||
    (job.attemptNumber === 1
      ? job.parentJobId !== null
      : !isUuid(job.parentJobId)) ||
    job.sourceOutputId !== null ||
    !isNonblankIdentifier(job.designSpecVersion) ||
    typeof job.designSpecSha256 !== "string" ||
    !SHA256_PATTERN.test(job.designSpecSha256) ||
    !isNonblankIdentifier(job.handSketchInstructionVersion) ||
    typeof job.handSketchInstructionSha256 !== "string" ||
    !SHA256_PATTERN.test(job.handSketchInstructionSha256)
  ) {
    return null;
  }

  const createdAt = canonicalUtcEpochMs(job.createdAt);
  const startedAt = nullableCanonicalUtcEpochMs(job.startedAt);
  const deadlineAt = nullableCanonicalUtcEpochMs(job.deadlineAt);
  const completedAt = nullableCanonicalUtcEpochMs(job.completedAt);
  const failedAt = nullableCanonicalUtcEpochMs(job.failedAt);
  const cancelledAt = nullableCanonicalUtcEpochMs(job.cancelledAt);
  const timedOutAt = nullableCanonicalUtcEpochMs(job.timedOutAt);
  if (
    createdAt === null ||
    startedAt === undefined ||
    deadlineAt === undefined ||
    completedAt === undefined ||
    failedAt === undefined ||
    cancelledAt === undefined ||
    timedOutAt === undefined ||
    [createdAt, startedAt, deadlineAt, completedAt, failedAt, cancelledAt, timedOutAt]
      .filter((timestamp): timestamp is number => timestamp !== null)
      .some((timestamp) => timestamp > observationMs)
  ) {
    return null;
  }

  if (
    typeof job.status !== "string" ||
    !["queued", "processing", "succeeded", "failed", "timed_out", "cancelled"].includes(
      job.status,
    )
  ) {
    return null;
  }
  const status = job.status as FirstPreviewJobStatus;
  const terminalValues = [completedAt, failedAt, cancelledAt, timedOutAt].filter(
    (value): value is number => value !== null,
  );
  const terminalAt = terminalValues.length === 1 ? terminalValues[0] : null;

  const activeShape =
    status === "queued"
      ? startedAt === null &&
        deadlineAt === null &&
        terminalValues.length === 0 &&
        job.retryEligible === null &&
        job.failureCategory === null
      : status === "processing"
        ? startedAt !== null &&
          deadlineAt !== null &&
          terminalValues.length === 0 &&
          job.retryEligible === null &&
          job.failureCategory === null
        : false;
  const succeededShape =
    status === "succeeded" &&
    startedAt !== null &&
    deadlineAt !== null &&
    completedAt !== null &&
    failedAt === null &&
    cancelledAt === null &&
    timedOutAt === null &&
    job.retryEligible === null &&
    job.failureCategory === null;
  const failedShape =
    status === "failed" &&
    startedAt !== null &&
    deadlineAt !== null &&
    failedAt !== null &&
    completedAt === null &&
    cancelledAt === null &&
    timedOutAt === null &&
    typeof job.retryEligible === "boolean" &&
    typeof job.failureCategory === "string" &&
    (job.retryEligible === false ||
      RETRYABLE_FAILURES.has(job.failureCategory as FirstPreviewFailureCategory));
  const timedOutShape =
    status === "timed_out" &&
    startedAt !== null &&
    deadlineAt !== null &&
    timedOutAt !== null &&
    completedAt === null &&
    failedAt === null &&
    cancelledAt === null &&
    job.retryEligible === false &&
    job.failureCategory === "timeout" &&
    timedOutAt === deadlineAt;
  const cancelledShape =
    status === "cancelled" &&
    startedAt !== null &&
    deadlineAt !== null &&
    cancelledAt !== null &&
    completedAt === null &&
    failedAt === null &&
    timedOutAt === null &&
    job.retryEligible === false &&
    job.failureCategory === "cancelled";

  if (
    !(activeShape || succeededShape || failedShape || timedOutShape || cancelledShape) ||
    (startedAt !== null && createdAt > startedAt) ||
    (terminalAt !== null &&
      (startedAt === null ||
        deadlineAt === null ||
        startedAt > terminalAt ||
        terminalAt > deadlineAt))
  ) {
    return null;
  }

  return {
    raw: job,
    id: job.id,
    attemptNumber: job.attemptNumber,
    status,
    createdAt,
    startedAt,
    deadlineAt,
    terminalAt,
    failedAt,
  };
}

function sameRetryLineage(first: ValidatedJob, second: ValidatedJob): boolean {
  return (
    second.raw.parentJobId === first.id &&
    first.raw.designSpecVersion === second.raw.designSpecVersion &&
    first.raw.designSpecSha256 === second.raw.designSpecSha256 &&
    first.raw.handSketchInstructionVersion ===
      second.raw.handSketchInstructionVersion &&
    first.raw.handSketchInstructionSha256 ===
      second.raw.handSketchInstructionSha256
  );
}

function isLegalAttemptTwo(first: ValidatedJob, second: ValidatedJob): boolean {
  if (
    first.attemptNumber !== 1 ||
    second.attemptNumber !== 2 ||
    first.status !== "failed" ||
    first.raw.retryEligible !== true ||
    first.failedAt === null ||
    !sameRetryLineage(first, second)
  ) {
    return false;
  }

  const crossAttemptTimestamps = [
    second.createdAt,
    second.startedAt,
    second.deadlineAt,
    second.terminalAt,
  ].filter((value): value is number => value !== null);
  return crossAttemptTimestamps.every(
    (timestamp) => timestamp >= first.failedAt!,
  );
}

function validateGates(value: unknown): boolean {
  const gates = snapshotOwnDataRecord(value, GATE_KEYS);
  return (
    !!gates &&
    gates.accessControlPassed === true &&
    gates.assetValid === true &&
    gates.complexCase === false &&
    gates.contentSafetyPassed === true &&
    gates.lifecycleEligible === true &&
    gates.lowConfidence === false &&
    gates.outputValid === true &&
    gates.ownershipConsistent === true &&
    gates.privacyPassed === true
  );
}

function validateOutput(
  value: unknown,
  customer: VerifiedCustomer,
  job: ValidatedJob,
  observationMs: number,
): ValidatedOutput | null {
  const output = snapshotOwnDataRecord(value, OUTPUT_KEYS);
  if (
    !output ||
    !isUuid(output.id) ||
    output.jobId !== job.id ||
    output.conceptBriefId !== customer.conceptBriefId ||
    output.attemptNumber !== job.attemptNumber ||
    output.automaticGatePolicyVersion !==
      FIRST_PREVIEW_AUTOMATIC_GATE_POLICY_VERSION ||
    output.assetPersisted !== true ||
    output.readinessStatus !== "first_preview_ready" ||
    output.isCurrentCustomerPreview !== true ||
    output.revokedAt !== null ||
    !validateGates(output.gates) ||
    job.status !== "succeeded" ||
    job.startedAt === null ||
    job.deadlineAt === null ||
    job.terminalAt === null
  ) {
    return null;
  }

  const assetCreatedAt = canonicalUtcEpochMs(output.assetCreatedAt);
  const assetValidatedAt = canonicalUtcEpochMs(output.assetValidatedAt);
  const createdAt = canonicalUtcEpochMs(output.createdAt);
  const automaticGatePassedAt = canonicalUtcEpochMs(
    output.automaticGatePassedAt,
  );
  const readyAt = canonicalUtcEpochMs(output.readyAt);
  if (
    assetCreatedAt === null ||
    assetValidatedAt === null ||
    createdAt === null ||
    automaticGatePassedAt === null ||
    readyAt === null ||
    [
      assetCreatedAt,
      assetValidatedAt,
      createdAt,
      automaticGatePassedAt,
      readyAt,
    ].some((timestamp) => timestamp > observationMs) ||
    job.startedAt > assetCreatedAt ||
    assetCreatedAt > assetValidatedAt ||
    assetValidatedAt > createdAt ||
    createdAt > job.terminalAt ||
    job.terminalAt > job.deadlineAt ||
    createdAt > automaticGatePassedAt ||
    assetValidatedAt > automaticGatePassedAt ||
    automaticGatePassedAt > readyAt
  ) {
    return null;
  }

  return {
    id: output.id,
    jobId: output.jobId,
    attemptNumber: job.attemptNumber,
    assetCreatedAt,
    assetValidatedAt,
    createdAt,
    automaticGatePassedAt,
    readyAt,
  };
}

function pendingOrUnavailable(
  pendingExpiresAt: unknown,
  customer: VerifiedCustomer,
  observationMs: number,
): FirstPreviewCustomerSafeState {
  const expiryMs = canonicalUtcEpochMs(pendingExpiresAt);
  return expiryMs !== null &&
    expiryMs < customer.proofExpiresAtMs &&
    observationMs < expiryMs
    ? { state: "pending" }
    : unavailable();
}

function mapSnapshot(
  rawSnapshot: unknown,
  customer: VerifiedCustomer,
  observationMs: number,
): FirstPreviewCustomerSafeState {
  const snapshot = snapshotOwnDataRecord(rawSnapshot, SNAPSHOT_KEYS);
  if (!snapshot) return unavailable();
  if (
    snapshot.conceptBriefId !== customer.conceptBriefId ||
    snapshot.publicReference !== customer.publicReference
  ) {
    return denied();
  }

  const rawJobs = snapshotArray(snapshot.jobs, 2);
  const rawOutputs = snapshotArray(snapshot.outputs, 2);
  if (!rawJobs || !rawOutputs || rawOutputs.length > 1) return unavailable();

  const jobs = rawJobs.map((job) =>
    validateJob(job, customer, observationMs),
  );
  if (jobs.some((job) => job === null)) return unavailable();
  const validatedJobs = jobs as ValidatedJob[];
  const attemptOne = validatedJobs.find((job) => job.attemptNumber === 1);
  const attemptTwo = validatedJobs.find((job) => job.attemptNumber === 2);
  if (
    validatedJobs.filter((job) => job.attemptNumber === 1).length > 1 ||
    validatedJobs.filter((job) => job.attemptNumber === 2).length > 1 ||
    (!attemptOne && attemptTwo) ||
    (attemptOne && attemptTwo && !isLegalAttemptTwo(attemptOne, attemptTwo))
  ) {
    return unavailable();
  }

  if (rawOutputs.length === 1) {
    if (snapshot.pendingExpiresAt !== null) return unavailable();
    const outputJob = validatedJobs.find(
      (job) =>
        snapshotOwnDataRecord(rawOutputs[0], OUTPUT_KEYS)?.jobId === job.id,
    );
    if (!outputJob) return unavailable();
    const output = validateOutput(
      rawOutputs[0],
      customer,
      outputJob,
      observationMs,
    );
    if (
      !output ||
      (attemptTwo && output.attemptNumber !== 2) ||
      (!attemptTwo && output.attemptNumber !== 1)
    ) {
      return unavailable();
    }
    return {
      state: "ready",
      publicReference: customer.publicReference,
      outputId: output.id,
    };
  }

  if (
    snapshot.pendingExpiresAt === null ||
    validatedJobs.some((job) =>
      ["timed_out", "cancelled"].includes(job.status),
    )
  ) {
    return unavailable();
  }
  const currentJob = attemptTwo ?? attemptOne;
  if (
    currentJob?.status === "failed" &&
    (currentJob.attemptNumber === 2 ||
      currentJob.raw.retryEligible !== true)
  ) {
    return unavailable();
  }
  if (
    currentJob?.status === "processing" &&
    currentJob.deadlineAt !== null &&
    observationMs >= currentJob.deadlineAt
  ) {
    return unavailable();
  }
  return pendingOrUnavailable(
    snapshot.pendingExpiresAt,
    customer,
    observationMs,
  );
}

export async function readFirstPreviewCustomerState(
  request: FirstPreviewCustomerStateBindingRequest,
  dependencies: FirstPreviewCustomerStateBindingDependencies,
): Promise<FirstPreviewCustomerSafeState> {
  try {
    const requestSnapshot = snapshotOwnDataRecord(request, REQUEST_KEYS);
    const dependencySnapshot = snapshotOwnDataRecord(
      dependencies,
      DEPENDENCY_KEYS,
    );
    if (
      !requestSnapshot ||
      !dependencySnapshot ||
      !isCallableNonProxy(dependencySnapshot.clock) ||
      typeof dependencySnapshot.signingSecret !== "string" ||
      dependencySnapshot.signingSecret.length >
        MAXIMUM_SIGNING_SECRET_RAW_CHARACTERS ||
      !isCallableNonProxy(dependencySnapshot.stateSourceFactory)
    ) {
      return denied();
    }

    const nowEpochSeconds = (
      dependencySnapshot.clock as () => unknown
    )();
    if (!isSafeObservationClock(nowEpochSeconds)) return denied();

    const customer = verifyCookieBeforeSource(
      requestSnapshot,
      dependencySnapshot.signingSecret,
      nowEpochSeconds,
    );
    if (!customer) return denied();

    // No source is constructed, inspected, or invoked before proof succeeds.
    const source = (
      dependencySnapshot.stateSourceFactory as () => unknown
    )();
    const readState = captureSourceMethod(source);
    if (!readState) return unavailable();
    const rawSnapshot = await Reflect.apply(readState, source, [
      {
        conceptBriefId: customer.conceptBriefId,
        publicReference: customer.publicReference,
      },
    ]);
    return mapSnapshot(rawSnapshot, customer, nowEpochSeconds * 1_000);
  } catch {
    return unavailable();
  }
}
