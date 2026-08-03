import "server-only";

import {
  createOpenAiFirstPreviewProviderAdapter,
  OPENAI_API_KEY_ENV_NAME,
  type OpenAiFirstPreviewProviderAdapter,
  type OpenAiImageClient,
  type OpenAiImageGenerateRequest,
  validateOpenAiApiKeyConfiguration,
} from "./openai-first-preview-provider";
import type { FirstPreviewValidatedUsage } from "./first-preview-cost-contract";

const OPENAI_IMAGE_GENERATION_URL =
  "https://api.openai.com/v1/images/generations" as const;
const MAX_SUCCESS_RESPONSE_CHARACTERS = 24 * 1024 * 1024;
const MAX_ERROR_RESPONSE_CHARACTERS = 32 * 1024;
const SAFE_PROVIDER_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const SAFE_PROVIDER_ERROR_CODE_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export type OpenAiFirstPreviewProviderBinding = Readonly<{
  adapter: OpenAiFirstPreviewProviderAdapter;
  readValidatedUsage(): FirstPreviewValidatedUsage | null;
  readProviderRequestId(): string | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonnegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
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

export function readValidatedOpenAiFirstPreviewUsage(
  response: unknown,
): FirstPreviewValidatedUsage | null {
  if (!isRecord(response) || !isRecord(response.usage)) return null;
  const usage = response.usage;
  if (
    !isNonnegativeSafeInteger(usage.input_tokens) ||
    !isNonnegativeSafeInteger(usage.output_tokens) ||
    !isNonnegativeSafeInteger(usage.total_tokens) ||
    !isRecord(usage.input_tokens_details)
  ) {
    return null;
  }

  const details = usage.input_tokens_details;
  if (
    !isNonnegativeSafeInteger(details.text_tokens) ||
    details.image_tokens !== 0 ||
    usage.input_tokens !== details.text_tokens ||
    usage.total_tokens !== usage.input_tokens + usage.output_tokens
  ) {
    return null;
  }

  return {
    textInputTokens: details.text_tokens,
    imageOutputTokens: usage.output_tokens,
  };
}

function readSafeProviderErrorCode(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  const code = value.error.code;
  return typeof code === "string" && SAFE_PROVIDER_ERROR_CODE_PATTERN.test(code)
    ? code
    : null;
}

function readSafeProviderRequestId(response: Response): string | null {
  const candidate = response.headers.get("x-request-id");
  return candidate && SAFE_PROVIDER_REQUEST_ID_PATTERN.test(candidate)
    ? candidate
    : null;
}

async function readBoundedJson(
  response: Response,
  maximumCharacters: number,
): Promise<unknown> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumCharacters
  ) {
    throw new Error("OpenAI response exceeded the safe size boundary.");
  }
  const text = await response.text();
  if (text.length === 0 || text.length > maximumCharacters) {
    throw new Error("OpenAI response was unavailable.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("OpenAI response was invalid.");
  }
}

function createSafeProviderError(status: number, code: string | null): Error {
  const error = new Error("OpenAI image generation request failed.") as Error & {
    status?: number;
    code?: string;
  };
  error.status = status;
  if (code) error.code = code;
  return error;
}

export function createOpenAiFirstPreviewProviderBinding(options: {
  environment?: Readonly<Record<string, string | undefined>>;
  fetchImplementation?: typeof fetch;
} = {}): OpenAiFirstPreviewProviderBinding | null {
  const environment = options.environment ?? process.env;
  const apiKey = readApiKey(environment);
  if (!apiKey) return null;

  const fetchImplementation = options.fetchImplementation ?? fetch;
  let usage: FirstPreviewValidatedUsage | null = null;
  let providerRequestId: string | null = null;

  const client: OpenAiImageClient = {
    images: {
      async generate(
        request: OpenAiImageGenerateRequest,
        requestOptions?: { signal?: AbortSignal },
      ): Promise<unknown> {
        const response = await fetchImplementation(OPENAI_IMAGE_GENERATION_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
          signal: requestOptions?.signal,
        });

        providerRequestId = readSafeProviderRequestId(response);
        const value = await readBoundedJson(
          response,
          response.ok
            ? MAX_SUCCESS_RESPONSE_CHARACTERS
            : MAX_ERROR_RESPONSE_CHARACTERS,
        );
        usage = readValidatedOpenAiFirstPreviewUsage(value);

        if (!response.ok) {
          throw createSafeProviderError(
            response.status,
            readSafeProviderErrorCode(value),
          );
        }

        return value;
      },
    },
  };

  return {
    adapter: createOpenAiFirstPreviewProviderAdapter({
      client,
      configuration: validateOpenAiApiKeyConfiguration({
        [OPENAI_API_KEY_ENV_NAME]: apiKey,
      }),
    }),
    readValidatedUsage: () => usage,
    readProviderRequestId: () => providerRequestId,
  };
}
