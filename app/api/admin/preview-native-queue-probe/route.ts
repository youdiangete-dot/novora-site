import "server-only";

import { send } from "@vercel/queue";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_ACCESS_COOKIE_NAME,
  isValidAdminAccessCookie,
} from "../../../../lib/server/admin-access";
import { FIRST_PREVIEW_QUEUE_TOPIC } from "../../../../lib/server/ai-sketch/first-preview-queue";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PREVIEW_NATIVE_QUEUE_PROBE_ACTION =
  "verify_preview_native_queue" as const;
export const PREVIEW_NATIVE_QUEUE_PROBE_SCHEMA_VERSION =
  "novora_preview_native_queue_probe_invalid_v1" as const;
export const PREVIEW_NATIVE_QUEUE_PROBE_MARKER =
  "NOVORA_PREVIEW_NATIVE_QUEUE_VERIFICATION" as const;
export const PREVIEW_NATIVE_QUEUE_PROBE_RETENTION_SECONDS = 600 as const;

const PREVIEW_ENVIRONMENT = "preview";
const PREVIEW_NATIVE_QUEUE_PROBE_IDEMPOTENCY_NAMESPACE =
  "novora-preview-native-queue-probe";
const GIT_COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/;
const MAXIMUM_SAFE_MESSAGE_ID_CHARACTERS = 512;

export type PreviewNativeQueueProbePayload = Readonly<{
  schemaVersion: typeof PREVIEW_NATIVE_QUEUE_PROBE_SCHEMA_VERSION;
  probe: typeof PREVIEW_NATIVE_QUEUE_PROBE_MARKER;
}>;

export type PreviewNativeQueueProbePublishOptions = Readonly<{
  idempotencyKey: string;
  retentionSeconds: typeof PREVIEW_NATIVE_QUEUE_PROBE_RETENTION_SECONDS;
}>;

export type PreviewNativeQueueProbeDependencies = Readonly<{
  readVercelEnvironment?: () => unknown;
  readSourceCommitSha?: () => unknown;
  readAdminAccessCookie?: () => Promise<string | undefined>;
  validateAdminAccessCookie?: (cookieValue?: string) => boolean;
  publishQueueMessage?: (
    topic: typeof FIRST_PREVIEW_QUEUE_TOPIC,
    payload: PreviewNativeQueueProbePayload,
    options: PreviewNativeQueueProbePublishOptions,
  ) => Promise<{ messageId: string | null }>;
}>;

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isExactProbeRequest(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  return (
    keys.length === 1 &&
    keys[0] === "action" &&
    (value as Record<string, unknown>).action ===
      PREVIEW_NATIVE_QUEUE_PROBE_ACTION
  );
}

function normalizeSourceCommitSha(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return GIT_COMMIT_SHA_PATTERN.test(normalized) ? normalized : null;
}

function safeMessageId(value: string | null): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAXIMUM_SAFE_MESSAGE_ID_CHARACTERS ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  return value;
}

async function readAdminAccessCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_ACCESS_COOKIE_NAME)?.value;
}

export function createPreviewNativeQueueProbePostHandler(
  dependencies: PreviewNativeQueueProbeDependencies = {},
) {
  const readVercelEnvironment =
    dependencies.readVercelEnvironment ?? (() => process.env.VERCEL_ENV);
  const readSourceCommitSha =
    dependencies.readSourceCommitSha ??
    (() => process.env.VERCEL_GIT_COMMIT_SHA);
  const readCookie =
    dependencies.readAdminAccessCookie ?? readAdminAccessCookie;
  const validateCookie =
    dependencies.validateAdminAccessCookie ?? isValidAdminAccessCookie;
  const publishQueueMessage = dependencies.publishQueueMessage ?? send;

  return async function postPreviewNativeQueueProbe(request: Request) {
    if (readVercelEnvironment() !== PREVIEW_ENVIRONMENT) {
      return jsonResponse(
        { ok: false, message: "Preview verification is unavailable." },
        404,
      );
    }

    let adminAccessCookie: string | undefined;
    try {
      adminAccessCookie = await readCookie();
    } catch {
      return jsonResponse(
        { ok: false, message: "Admin access is required." },
        401,
      );
    }

    if (!validateCookie(adminAccessCookie)) {
      return jsonResponse(
        { ok: false, message: "Admin access is required." },
        401,
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { ok: false, message: "Preview verification was not accepted." },
        400,
      );
    }

    if (!isExactProbeRequest(body)) {
      return jsonResponse(
        { ok: false, message: "Preview verification was not accepted." },
        400,
      );
    }

    const sourceCommitSha = normalizeSourceCommitSha(readSourceCommitSha());
    if (!sourceCommitSha) {
      return jsonResponse(
        { ok: false, message: "Preview verification is unavailable." },
        503,
      );
    }

    const payload: PreviewNativeQueueProbePayload = {
      schemaVersion: PREVIEW_NATIVE_QUEUE_PROBE_SCHEMA_VERSION,
      probe: PREVIEW_NATIVE_QUEUE_PROBE_MARKER,
    };
    const idempotencyKey =
      `${PREVIEW_NATIVE_QUEUE_PROBE_IDEMPOTENCY_NAMESPACE}:${sourceCommitSha}`;

    try {
      const result = await publishQueueMessage(
        FIRST_PREVIEW_QUEUE_TOPIC,
        payload,
        {
          idempotencyKey,
          retentionSeconds: PREVIEW_NATIVE_QUEUE_PROBE_RETENTION_SECONDS,
        },
      );

      return jsonResponse(
        {
          ok: true,
          messageId: safeMessageId(result.messageId),
          topic: FIRST_PREVIEW_QUEUE_TOPIC,
          sourceCommitSha,
          previewOnly: true,
        },
        200,
      );
    } catch {
      return jsonResponse(
        { ok: false, message: "Preview verification could not be published." },
        503,
      );
    }
  };
}

export const POST = createPreviewNativeQueueProbePostHandler();
