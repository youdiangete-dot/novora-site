import { deflateSync } from "node:zlib";

import type {
  OpenAiImageClient,
  OpenAiImageGenerateRequest,
} from "../../../lib/server/ai-sketch/openai-first-preview-provider";

export type FakeOpenAiImageClientScenario =
  | "valid_1024_png"
  | "zero_outputs"
  | "multiple_outputs"
  | "missing_base64"
  | "empty_base64"
  | "malformed_base64"
  | "non_png"
  | "truncated_png"
  | "wrong_width"
  | "wrong_height"
  | "oversized_output"
  | "partial_stream_event"
  | "moderation_block"
  | "invalid_request"
  | "authentication_failure"
  | "permission_failure"
  | "rate_limit"
  | "provider_500"
  | "provider_502"
  | "provider_503"
  | "network_failure"
  | "timeout"
  | "cancellation"
  | "unknown_exception"
  | "metadata_leak";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

function createSyntheticPng(width: number, height: number) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rowLength = 1 + width * 4;
  const rawPixels = Buffer.alloc(rowLength * height);
  const idat = deflateSync(rawPixels);

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk("IHDR", ihdr),
    createChunk("IDAT", idat),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

const VALID_PNG = createSyntheticPng(1024, 1024);

function base64(bytes: Buffer) {
  return bytes.toString("base64");
}

function createProviderError(status: number, code: string) {
  return Object.assign(
    new Error("synthetic raw provider body must never cross the adapter boundary"),
    {
      status,
      code,
      request_id: "req_synthetic_error_must_not_leak",
      error: {
        code,
        message: "synthetic raw provider details must not leak",
      },
    },
  );
}

export class FakeOpenAiImageClient implements OpenAiImageClient {
  callCount = 0;
  externalNetworkRequestCount = 0;
  lastRequest: OpenAiImageGenerateRequest | null = null;
  lastSignal: AbortSignal | null = null;
  signalWasAbortedAtCall: boolean | null = null;

  constructor(readonly scenario: FakeOpenAiImageClientScenario) {}

  readonly images = {
    generate: async (
      request: OpenAiImageGenerateRequest,
      options?: { signal?: AbortSignal },
    ): Promise<unknown> => {
      this.callCount += 1;
      this.lastRequest = { ...request };
      this.lastSignal = options?.signal ?? null;
      this.signalWasAbortedAtCall = options?.signal?.aborted ?? false;

      if (this.scenario === "moderation_block") {
        throw createProviderError(400, "moderation_blocked");
      }
      if (this.scenario === "invalid_request") {
        throw createProviderError(400, "invalid_request");
      }
      if (this.scenario === "authentication_failure") {
        throw createProviderError(401, "invalid_api_key");
      }
      if (this.scenario === "permission_failure") {
        throw createProviderError(403, "permission_denied");
      }
      if (this.scenario === "rate_limit") {
        throw createProviderError(429, "rate_limit_exceeded");
      }
      if (this.scenario === "provider_500") {
        throw createProviderError(500, "internal_server_error");
      }
      if (this.scenario === "provider_502") {
        throw createProviderError(502, "bad_gateway");
      }
      if (this.scenario === "provider_503") {
        throw createProviderError(503, "service_unavailable");
      }
      if (this.scenario === "network_failure") {
        throw new TypeError("synthetic network failure details must not leak");
      }
      if (this.scenario === "timeout") {
        throw Object.assign(new Error("synthetic timeout details must not leak"), {
          name: "TimeoutError",
          code: "ETIMEDOUT",
        });
      }
      if (this.scenario === "cancellation") {
        throw Object.assign(new Error("synthetic cancellation details must not leak"), {
          name: "AbortError",
          code: "ABORT_ERR",
        });
      }
      if (this.scenario === "unknown_exception") {
        throw new Error("synthetic unknown provider details must not leak");
      }

      if (this.scenario === "zero_outputs") {
        return { data: [] };
      }
      if (this.scenario === "multiple_outputs") {
        return {
          data: [
            { b64_json: base64(VALID_PNG) },
            { b64_json: base64(VALID_PNG) },
          ],
        };
      }
      if (this.scenario === "missing_base64") {
        return { data: [{}] };
      }
      if (this.scenario === "empty_base64") {
        return { data: [{ b64_json: "" }] };
      }
      if (this.scenario === "malformed_base64") {
        return { data: [{ b64_json: "%%%not-canonical-base64%%%" }] };
      }
      if (this.scenario === "non_png") {
        return { data: [{ b64_json: base64(Buffer.from("not a png")) }] };
      }
      if (this.scenario === "truncated_png") {
        return { data: [{ b64_json: base64(VALID_PNG.subarray(0, 24)) }] };
      }
      if (this.scenario === "wrong_width") {
        return { data: [{ b64_json: base64(createSyntheticPng(512, 1024)) }] };
      }
      if (this.scenario === "wrong_height") {
        return { data: [{ b64_json: base64(createSyntheticPng(1024, 512)) }] };
      }
      if (this.scenario === "oversized_output") {
        const oversizedBase64Length =
          Math.ceil((16 * 1024 * 1024 + 1) / 3) * 4;
        return {
          data: [
            {
              b64_json: "A".repeat(oversizedBase64Length),
            },
          ],
        };
      }
      if (this.scenario === "partial_stream_event") {
        return {
          type: "image_generation.partial_image",
          partial_image_index: 0,
          b64_json: base64(VALID_PNG),
        };
      }
      if (this.scenario === "metadata_leak") {
        return {
          _request_id: "req_synthetic_agent70a_001",
          data: [
            {
              b64_json: base64(VALID_PNG),
              revised_prompt: "synthetic revised prompt must not leak",
              url: "https://provider.invalid/private-image",
              provider_metadata: "synthetic metadata must not leak",
            },
          ],
          internal_prompt: "synthetic internal prompt must not leak",
          raw_provider_response: "synthetic raw response must not leak",
        };
      }

      return {
        _request_id: "req_synthetic_agent70a_001",
        data: [{ b64_json: base64(VALID_PNG) }],
      };
    },
  };
}
