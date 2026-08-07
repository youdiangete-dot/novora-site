import "server-only";

import { createHash } from "node:crypto";

import {
  FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES,
} from "./first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
  type FirstPreviewTrustedOutputEvaluator,
} from "./first-preview-generation-lifecycle";
import { OPENAI_API_KEY_ENV_NAME } from "./openai-first-preview-provider";

const OPENAI_MODERATION_URL = "https://api.openai.com/v1/moderations" as const;
const OPENAI_MODERATION_MODEL = "omni-moderation-latest" as const;
const MAX_MODERATION_RESPONSE_BYTES = 64 * 1024;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const PRIVACY_BEARING_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf"]);

type OpenAiFirstPreviewTrustedOutputOptions = Readonly<{
  environment?: Readonly<Record<string, string | undefined>>;
  fetchImplementation?: typeof fetch;
}>;

type PngContainerInspection = Readonly<{
  outputValidityPassed: boolean;
  privacyPassed: boolean;
}>;

function failClosed(): never {
  throw new Error("First Preview trusted-output evaluation failed.");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readApiKey(
  environment: Readonly<Record<string, string | undefined>>,
): string | null {
  const value = environment[OPENAI_API_KEY_ENV_NAME];
  return typeof value === "string" &&
    value.length >= 20 &&
    value.length <= 512 &&
    value === value.trim() &&
    /^sk-[A-Za-z0-9_-]+$/.test(value)
    ? value
    : null;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function inspectPngContainer(imageBytes: Uint8Array): PngContainerInspection {
  if (
    imageBytes.byteLength < 45 ||
    imageBytes.byteLength > FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES
  ) {
    return { outputValidityPassed: false, privacyPassed: false };
  }

  const bytes = Buffer.from(
    imageBytes.buffer,
    imageBytes.byteOffset,
    imageBytes.byteLength,
  );
  if (!bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return { outputValidityPassed: false, privacyPassed: false };
  }

  let offset = PNG_SIGNATURE.length;
  let chunkIndex = 0;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;
  let privacyPassed = true;

  while (offset < bytes.length) {
    if (sawIend || offset + 12 > bytes.length) {
      return { outputValidityPassed: false, privacyPassed: false };
    }

    const length = bytes.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > bytes.length) {
      return { outputValidityPassed: false, privacyPassed: false };
    }

    const typeBytes = bytes.subarray(typeStart, dataStart);
    if (
      !typeBytes.every(
        (byte) =>
          (byte >= 0x41 && byte <= 0x5a) ||
          (byte >= 0x61 && byte <= 0x7a),
      ) ||
      (typeBytes[2] & 0x20) !== 0
    ) {
      return { outputValidityPassed: false, privacyPassed: false };
    }

    if (
      crc32(bytes.subarray(typeStart, dataEnd)) !==
      bytes.readUInt32BE(dataEnd)
    ) {
      return { outputValidityPassed: false, privacyPassed: false };
    }

    const type = typeBytes.toString("ascii");
    if (chunkIndex === 0) {
      if (type !== "IHDR" || length !== 13) {
        return { outputValidityPassed: false, privacyPassed: false };
      }

      const bitDepth = bytes[dataStart + 8];
      const colorType = bytes[dataStart + 9];
      const legalDepths = new Map<number, readonly number[]>([
        [0, [1, 2, 4, 8, 16]],
        [2, [8, 16]],
        [3, [1, 2, 4, 8]],
        [4, [8, 16]],
        [6, [8, 16]],
      ]).get(colorType);
      if (
        bytes.readUInt32BE(dataStart) !== 1024 ||
        bytes.readUInt32BE(dataStart + 4) !== 1024 ||
        !legalDepths?.includes(bitDepth) ||
        bytes[dataStart + 10] !== 0 ||
        bytes[dataStart + 11] !== 0 ||
        bytes[dataStart + 12] !== 0
      ) {
        return { outputValidityPassed: false, privacyPassed: false };
      }
      sawIhdr = true;
    } else if (type === "IHDR") {
      return { outputValidityPassed: false, privacyPassed: false };
    }

    if (PRIVACY_BEARING_CHUNKS.has(type)) {
      privacyPassed = false;
    }
    if (type === "IDAT") {
      sawIdat = true;
    }
    if (type === "IEND") {
      if (length !== 0 || !sawIdat || chunkEnd !== bytes.length) {
        return { outputValidityPassed: false, privacyPassed: false };
      }
      sawIend = true;
    }

    offset = chunkEnd;
    chunkIndex += 1;
  }

  return {
    outputValidityPassed: sawIhdr && sawIdat && sawIend,
    privacyPassed: sawIhdr && sawIdat && sawIend && privacyPassed,
  };
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) failClosed();
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength <= 0 ||
      parsedLength > MAX_MODERATION_RESPONSE_BYTES
    ) {
      failClosed();
    }
  }

  const reader = response.body?.getReader();
  if (!reader) failClosed();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      totalBytes += part.value.byteLength;
      if (totalBytes > MAX_MODERATION_RESPONSE_BYTES) {
        await reader.cancel();
        failClosed();
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) failClosed();
  const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    failClosed();
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    failClosed();
  }
}

function hasOneUnflaggedModerationResult(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !Array.isArray(value.results) ||
    value.results.length !== 1
  ) {
    return false;
  }
  const result = value.results[0];
  return isRecord(result) && result.flagged === false;
}

export function createOpenAiFirstPreviewTrustedOutputEvaluator(
  options: OpenAiFirstPreviewTrustedOutputOptions = {},
): FirstPreviewTrustedOutputEvaluator {
  const environment = options.environment ?? process.env;
  const fetchImplementation = options.fetchImplementation ?? fetch;

  return async (input, context) => {
    if (
      context.signal.aborted ||
      input.imageBytes.byteLength === 0 ||
      input.imageBytes.byteLength > FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES ||
      input.mimeType !== "image/png" ||
      input.widthPx !== 1024 ||
      input.heightPx !== 1024 ||
      createHash("sha256").update(input.imageBytes).digest("hex") !==
        input.subject.contentSha256
    ) {
      failClosed();
    }

    const png = inspectPngContainer(input.imageBytes);
    if (!png.outputValidityPassed || !png.privacyPassed) {
      failClosed();
    }

    const apiKey = readApiKey(environment);
    if (!apiKey || context.signal.aborted) failClosed();

    const body = {
      model: OPENAI_MODERATION_MODEL,
      input: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${Buffer.from(input.imageBytes).toString("base64")}`,
          },
        },
      ],
    } as const;

    const response = await fetchImplementation(OPENAI_MODERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: context.signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      failClosed();
    }

    const responseValue = await readBoundedJson(response);
    if (
      context.signal.aborted ||
      !hasOneUnflaggedModerationResult(responseValue)
    ) {
      failClosed();
    }

    return {
      evidenceVersion: FIRST_PREVIEW_TRUSTED_OUTPUT_EVIDENCE_VERSION,
      subject: {
        conceptBriefId: input.subject.conceptBriefId,
        jobId: input.subject.jobId,
        outputId: input.subject.outputId,
        contentSha256: input.subject.contentSha256,
      },
      results: {
        contentSafetyPassed: true,
        privacyPassed: true,
        outputValidityPassed: true,
      },
    };
  };
}
