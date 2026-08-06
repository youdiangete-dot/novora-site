import "server-only";

import { createHash } from "node:crypto";

import { send } from "@vercel/queue";

import {
  MOCK_NOVORA_DESIGN_SPEC,
  validateNovoraDesignSpec,
} from "./design-spec";
import {
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
} from "./first-preview-generated-assets-contract";
import {
  createProductionAutomaticFirstPreviewWorkerDependencies,
  reserveAutomaticFirstPreviewPreparedAttempt,
  runAutomaticFirstPreviewWorker,
  type AutomaticFirstPreviewWorkerDependencies,
  type FirstPreviewPreparedGenerationInput,
} from "./first-preview-generation-lifecycle";
import { createFirstPreviewRepository } from "./first-preview-persistence";
import type { FirstPreviewRepository } from "./first-preview-persistence-contract";
import {
  MOCK_NOVORA_HAND_SKETCH_INSTRUCTION,
  validateNovoraHandSketchInstruction,
} from "./hand-sketch-instruction";

export const FIRST_PREVIEW_QUEUE_TOPIC =
  "novora-first-preview-generation-v1" as const;
export const FIRST_PREVIEW_QUEUE_MESSAGE_SCHEMA_VERSION =
  "novora_first_preview_generation_queue_message_v1" as const;
export const FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED_ENV =
  "NOVORA_FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED" as const;
export const FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED_VALUE = "true" as const;

const MAXIMUM_QUEUE_MESSAGE_CHARACTERS = 240_000;
const MAXIMUM_QUEUE_VALUE_DEPTH = 32;
const MAXIMUM_QUEUE_VALUE_NODES = 10_000;
const MAXIMUM_QUEUE_ARRAY_LENGTH = 512;
const MAXIMUM_QUEUE_OBJECT_KEYS = 128;

export type FirstPreviewGenerationQueueMessage = Readonly<{
  schemaVersion: typeof FIRST_PREVIEW_QUEUE_MESSAGE_SCHEMA_VERSION;
  conceptBriefId: string;
  publicReference: string;
  generationInput: FirstPreviewPreparedGenerationInput;
}>;

export type ValidateFirstPreviewQueueMessageResult =
  | Readonly<{ ok: true; value: FirstPreviewGenerationQueueMessage }>
  | Readonly<{ ok: false }>;

export type FirstPreviewQueuePublishRequest = Readonly<{
  topic: typeof FIRST_PREVIEW_QUEUE_TOPIC;
  message: FirstPreviewGenerationQueueMessage;
  idempotencyKey: string;
}>;

export type FirstPreviewQueuePublisher = Readonly<{
  publish(request: FirstPreviewQueuePublishRequest): Promise<void>;
}>;

export type FirstPreviewQueuePublishResult = Readonly<{
  status: "enqueued" | "not_enqueued";
}>;

export type FirstPreviewQueueConsumerResult = Readonly<{
  status: "acknowledged";
  disposition:
    | "invalid_message"
    | "permanent_failure"
    | "completed"
    | "duplicate"
    | "terminal_failure";
}>;

export type FirstPreviewQueueConsumerDependencies = Readonly<{
  createRepository?: () => FirstPreviewRepository;
  createWorkerDependencies?: (
    repository: FirstPreviewRepository,
  ) => AutomaticFirstPreviewWorkerDependencies;
  reserveAttempt?: typeof reserveAutomaticFirstPreviewPreparedAttempt;
  runWorker?: typeof runAutomaticFirstPreviewWorker;
  jobIdSource?: () => string;
}>;

type CloneState = {
  seen: WeakSet<object>;
  nodes: number;
  stringCharacters: number;
};

function cloneQueueValue(
  value: unknown,
  state: CloneState,
  depth: number,
): unknown {
  if (depth > MAXIMUM_QUEUE_VALUE_DEPTH) throw new Error("invalid depth");
  state.nodes += 1;
  if (state.nodes > MAXIMUM_QUEUE_VALUE_NODES) throw new Error("too many nodes");

  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    state.stringCharacters += value.length;
    if (state.stringCharacters > MAXIMUM_QUEUE_MESSAGE_CHARACTERS) {
      throw new Error("message too large");
    }
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-serializable number");
    return value;
  }
  if (typeof value !== "object") throw new Error("non-serializable value");

  if (state.seen.has(value)) throw new Error("cyclic value");
  state.seen.add(value);

  let prototype: object | null;
  let keys: Array<string | symbol>;
  let descriptors: PropertyDescriptorMap;
  try {
    prototype = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    throw new Error("reflection failure");
  }

  if (Array.isArray(value)) {
    if (prototype !== Array.prototype || value.length > MAXIMUM_QUEUE_ARRAY_LENGTH) {
      throw new Error("invalid array");
    }
    if (
      keys.some(
        (key) =>
          typeof key !== "string" ||
          (key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key)),
      )
    ) {
      throw new Error("invalid array properties");
    }
    const clone: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
        throw new Error("sparse or accessor array");
      }
      clone.push(cloneQueueValue(descriptor.value, state, depth + 1));
    }
    state.seen.delete(value);
    return clone;
  }

  if (
    (prototype !== Object.prototype && prototype !== null) ||
    keys.length > MAXIMUM_QUEUE_OBJECT_KEYS
  ) {
    throw new Error("non-plain object");
  }

  const clone: Record<string, unknown> = {};
  for (const key of keys) {
    if (typeof key !== "string" || key.length > 128) {
      throw new Error("invalid object key");
    }
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new Error("accessor or hidden property");
    }
    clone[key] = cloneQueueValue(descriptor.value, state, depth + 1);
  }
  state.seen.delete(value);
  return clone;
}

function createSafeQueueSnapshot(value: unknown): unknown {
  const clone = cloneQueueValue(
    value,
    { seen: new WeakSet<object>(), nodes: 0, stringCharacters: 0 },
    0,
  );
  const serialized = JSON.stringify(clone);
  if (
    typeof serialized !== "string" ||
    serialized.length > MAXIMUM_QUEUE_MESSAGE_CHARACTERS
  ) {
    throw new Error("message is not safely serializable");
  }
  return clone;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    sortedExpected.every((key, index) => actual[index] === key)
  );
}

function hasExactStructuralShape(value: unknown, template: unknown): boolean {
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return false;
    if (template.length === 0) {
      return value.every(
        (item) =>
          item === null ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean",
      );
    }
    return value.every((item) => hasExactStructuralShape(item, template[0]));
  }
  if (isRecord(template)) {
    if (!isRecord(value) || !hasExactKeys(value, Object.keys(template))) {
      return false;
    }
    return Object.keys(template).every((key) =>
      hasExactStructuralShape(value[key], template[key]),
    );
  }
  if (template === null) return value === null;
  return typeof value === typeof template;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function canonicalSha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function validatePreparedGenerationInput(
  value: unknown,
  publicReference: string,
): FirstPreviewPreparedGenerationInput | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "designSpec",
      "designSpecSha256",
      "handSketchInstruction",
      "handSketchInstructionSha256",
    ]) ||
    !hasExactStructuralShape(value.designSpec, MOCK_NOVORA_DESIGN_SPEC) ||
    !hasExactStructuralShape(
      value.handSketchInstruction,
      MOCK_NOVORA_HAND_SKETCH_INSTRUCTION,
    ) ||
    !validateNovoraDesignSpec(value.designSpec).ok ||
    !validateNovoraHandSketchInstruction(value.handSketchInstruction).ok ||
    !isSha256(value.designSpecSha256) ||
    !isSha256(value.handSketchInstructionSha256) ||
    canonicalSha256(value.designSpec) !== value.designSpecSha256 ||
    canonicalSha256(value.handSketchInstruction) !==
      value.handSketchInstructionSha256
  ) {
    return null;
  }

  const designSpec = value.designSpec as FirstPreviewPreparedGenerationInput["designSpec"];
  const instruction =
    value.handSketchInstruction as FirstPreviewPreparedGenerationInput["handSketchInstruction"];
  if (
    designSpec.public_reference !== publicReference ||
    instruction.public_reference !== publicReference ||
    designSpec.spec_version !== instruction.design_spec_version ||
    designSpec.language !== instruction.language ||
    designSpec.piece_type !== instruction.source_design_spec_summary.piece_type
  ) {
    return null;
  }

  return {
    designSpec,
    handSketchInstruction: instruction,
    designSpecSha256: value.designSpecSha256,
    handSketchInstructionSha256: value.handSketchInstructionSha256,
  };
}

export function isFirstPreviewQueueExecutionConfirmed(
  value: unknown = process.env[FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED_ENV],
): boolean {
  return value === FIRST_PREVIEW_QUEUE_EXECUTION_CONFIRMED_VALUE;
}

export function validateFirstPreviewQueueMessage(
  value: unknown,
): ValidateFirstPreviewQueueMessageResult {
  try {
    const snapshot = createSafeQueueSnapshot(value);
    if (
      !isRecord(snapshot) ||
      !hasExactKeys(snapshot, [
        "conceptBriefId",
        "generationInput",
        "publicReference",
        "schemaVersion",
      ]) ||
      snapshot.schemaVersion !== FIRST_PREVIEW_QUEUE_MESSAGE_SCHEMA_VERSION ||
      typeof snapshot.conceptBriefId !== "string" ||
      typeof snapshot.publicReference !== "string" ||
      !isValidFirstPreviewAssetUuid(snapshot.conceptBriefId) ||
      !isValidFirstPreviewPublicReference(snapshot.publicReference)
    ) {
      return { ok: false };
    }

    const generationInput = validatePreparedGenerationInput(
      snapshot.generationInput,
      snapshot.publicReference,
    );
    if (!generationInput) return { ok: false };

    return {
      ok: true,
      value: {
        schemaVersion: FIRST_PREVIEW_QUEUE_MESSAGE_SCHEMA_VERSION,
        conceptBriefId: snapshot.conceptBriefId,
        publicReference: snapshot.publicReference,
        generationInput,
      },
    };
  } catch {
    return { ok: false };
  }
}

export function createFirstPreviewQueueMessage(input: {
  conceptBriefId: string;
  publicReference: string;
  generationInput: FirstPreviewPreparedGenerationInput;
}): ValidateFirstPreviewQueueMessageResult {
  return validateFirstPreviewQueueMessage({
    schemaVersion: FIRST_PREVIEW_QUEUE_MESSAGE_SCHEMA_VERSION,
    conceptBriefId: input.conceptBriefId,
    publicReference: input.publicReference,
    generationInput: input.generationInput,
  });
}

export function createFirstPreviewQueueIdempotencyKey(
  message: FirstPreviewGenerationQueueMessage,
): string {
  const identity = [
    FIRST_PREVIEW_QUEUE_TOPIC,
    message.schemaVersion,
    message.conceptBriefId,
    message.publicReference,
    message.generationInput.designSpecSha256,
    message.generationInput.handSketchInstructionSha256,
  ].join("\n");
  return `${FIRST_PREVIEW_QUEUE_TOPIC}:${createHash("sha256")
    .update(identity, "utf8")
    .digest("base64url")}`;
}

export const productionFirstPreviewQueuePublisher: FirstPreviewQueuePublisher = {
  async publish(request) {
    await send(request.topic, request.message, {
      idempotencyKey: request.idempotencyKey,
    });
  },
};

export async function publishFirstPreviewQueueMessage(
  message: FirstPreviewGenerationQueueMessage,
  publisher: FirstPreviewQueuePublisher = productionFirstPreviewQueuePublisher,
): Promise<FirstPreviewQueuePublishResult> {
  const validated = validateFirstPreviewQueueMessage(message);
  if (!validated.ok) return { status: "not_enqueued" };
  try {
    await publisher.publish({
      topic: FIRST_PREVIEW_QUEUE_TOPIC,
      message: validated.value,
      idempotencyKey: createFirstPreviewQueueIdempotencyKey(validated.value),
    });
    return { status: "enqueued" };
  } catch {
    return { status: "not_enqueued" };
  }
}

export async function consumeFirstPreviewQueueMessage(
  value: unknown,
  dependencies: FirstPreviewQueueConsumerDependencies = {},
): Promise<FirstPreviewQueueConsumerResult> {
  const validated = validateFirstPreviewQueueMessage(value);
  if (!validated.ok) {
    return { status: "acknowledged", disposition: "invalid_message" };
  }

  const repository = (dependencies.createRepository ?? createFirstPreviewRepository)();
  const reserveAttempt =
    dependencies.reserveAttempt ?? reserveAutomaticFirstPreviewPreparedAttempt;
  const reservation = await reserveAttempt({
    persistenceConfirmed: true,
    customerAccessEligible: true,
    conceptBriefId: validated.value.conceptBriefId,
    publicReference: validated.value.publicReference,
    attemptNumber: 1,
    parentJobId: null,
    structured: validated.value.generationInput,
    repository,
    jobIdSource: dependencies.jobIdSource,
  });
  if (!reservation.ok) {
    return { status: "acknowledged", disposition: "permanent_failure" };
  }

  const workerDependencies = (
    dependencies.createWorkerDependencies ??
    createProductionAutomaticFirstPreviewWorkerDependencies
  )(repository);
  const workerResult = await (
    dependencies.runWorker ?? runAutomaticFirstPreviewWorker
  )(reservation.work, workerDependencies);

  if (workerResult.status === "ready") {
    return { status: "acknowledged", disposition: "completed" };
  }
  if (workerResult.status === "duplicate") {
    return { status: "acknowledged", disposition: "duplicate" };
  }
  return { status: "acknowledged", disposition: "terminal_failure" };
}
