import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClientOrNull } from "./supabase";
import {
  FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
  FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES,
  deriveFirstPreviewGeneratedAssetId,
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewContentSha256,
  sha256FirstPreviewAsset,
} from "./ai-sketch/first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_ASSET_BUCKET,
  type FirstPreviewOutputRecord,
  type FirstPreviewRepository,
} from "./ai-sketch/first-preview-persistence-contract";
import {
  createFirstPreviewDatabaseClient,
  createSupabaseFirstPreviewRepository,
} from "./ai-sketch/supabase-first-preview-repository";
import {
  createFirstPreviewStorageClient,
  type FirstPreviewStorageClient,
} from "./ai-sketch/supabase-first-preview-generated-assets";

export type AdminFirstPreviewAssetResult =
  | Readonly<{
      ok: true;
      body: Uint8Array;
      contentLength: number;
      cacheControl: typeof FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL;
    }>
  | Readonly<{
      ok: false;
      reason: "invalid-input" | "unavailable" | "not-found" | "asset-invalid";
    }>;

type ResolveAdminCurrentFirstPreviewOptions = Readonly<{
  repository?: FirstPreviewRepository;
}>;

type ReadAdminFirstPreviewAssetOptions = Readonly<{
  supabaseClient?: SupabaseClient | null;
  repository?: FirstPreviewRepository;
  storageClient?: FirstPreviewStorageClient;
}>;

function createRepository(supabase: SupabaseClient): FirstPreviewRepository {
  return createSupabaseFirstPreviewRepository(
    createFirstPreviewDatabaseClient(supabase),
  );
}

export function isExactAdminCurrentFirstPreview(
  output: FirstPreviewOutputRecord | null,
  conceptBriefId: string,
): output is FirstPreviewOutputRecord {
  if (!output || !isValidFirstPreviewAssetUuid(conceptBriefId)) {
    return false;
  }

  const expectedAssetId = deriveFirstPreviewGeneratedAssetId({
    conceptBriefId,
    jobId: output.jobId,
    outputId: output.id,
  });

  return (
    output.conceptBriefId === conceptBriefId &&
    isValidFirstPreviewAssetUuid(output.id) &&
    output.readinessStatus === "first_preview_ready" &&
    output.isCurrentCustomerPreview === true &&
    output.assetPersisted === true &&
    output.bucketName === FIRST_PREVIEW_ASSET_BUCKET &&
    output.assetId === expectedAssetId &&
    output.mimeType === "image/png" &&
    Number.isSafeInteger(output.byteSize) &&
    output.byteSize > 0 &&
    output.byteSize <= FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES &&
    isValidFirstPreviewContentSha256(output.contentSha256) &&
    Number.isFinite(Date.parse(output.assetCreatedAt)) &&
    Number.isFinite(Date.parse(output.assetValidatedAt)) &&
    Date.parse(output.assetValidatedAt) >= Date.parse(output.assetCreatedAt) &&
    Number.isFinite(Date.parse(output.createdAt)) &&
    Boolean(output.readyAt) &&
    Number.isFinite(Date.parse(output.readyAt ?? "")) &&
    output.revokedAt === null &&
    output.widthPx === 1024 &&
    output.heightPx === 1024
  );
}

export async function resolveAdminCurrentFirstPreview(
  conceptBriefId: string,
  options: ResolveAdminCurrentFirstPreviewOptions = {},
): Promise<FirstPreviewOutputRecord | null> {
  const normalizedConceptBriefId = conceptBriefId.trim();

  if (!isValidFirstPreviewAssetUuid(normalizedConceptBriefId)) {
    return null;
  }

  const repository = options.repository;

  if (!repository) {
    const supabase = createSupabaseAdminClientOrNull();

    if (!supabase) {
      return null;
    }

    return resolveAdminCurrentFirstPreview(normalizedConceptBriefId, {
      repository: createRepository(supabase),
    });
  }

  try {
    const output = await repository.findCustomerReadyOutput(
      normalizedConceptBriefId,
    );

    return isExactAdminCurrentFirstPreview(output, normalizedConceptBriefId)
      ? output
      : null;
  } catch {
    return null;
  }
}

export async function readAdminFirstPreviewAsset(
  conceptBriefId: string,
  aiSketchOutputId: string,
  options: ReadAdminFirstPreviewAssetOptions = {},
): Promise<AdminFirstPreviewAssetResult> {
  const normalizedConceptBriefId = conceptBriefId.trim();
  const normalizedOutputId = aiSketchOutputId.trim();

  if (
    !isValidFirstPreviewAssetUuid(normalizedConceptBriefId) ||
    !isValidFirstPreviewAssetUuid(normalizedOutputId)
  ) {
    return { ok: false, reason: "invalid-input" };
  }

  const suppliedClient = Object.prototype.hasOwnProperty.call(
    options,
    "supabaseClient",
  );
  const supabase = suppliedClient
    ? options.supabaseClient ?? null
    : createSupabaseAdminClientOrNull();
  const repository = options.repository ?? (supabase ? createRepository(supabase) : null);
  const storage =
    options.storageClient ?? (supabase ? createFirstPreviewStorageClient(supabase) : null);

  if (!repository || !storage) {
    return { ok: false, reason: "unavailable" };
  }

  const output = await resolveAdminCurrentFirstPreview(normalizedConceptBriefId, {
    repository,
  });

  if (!output || output.id !== normalizedOutputId) {
    return { ok: false, reason: "not-found" };
  }

  try {
    const bucket = await storage.inspectBucket(FIRST_PREVIEW_ASSET_BUCKET);

    if (
      bucket.error ||
      !bucket.data ||
      bucket.data.name !== FIRST_PREVIEW_ASSET_BUCKET ||
      bucket.data.isPublic !== false
    ) {
      return { ok: false, reason: "asset-invalid" };
    }

    const [download, object] = await Promise.all([
      storage.downloadObject(FIRST_PREVIEW_ASSET_BUCKET, output.assetId),
      storage.inspectObject(FIRST_PREVIEW_ASSET_BUCKET, output.assetId),
    ]);

    if (download.error || object.error || !download.data || !object.data) {
      return { ok: false, reason: "not-found" };
    }

    if (
      download.data.byteLength !== output.byteSize ||
      sha256FirstPreviewAsset(download.data) !== output.contentSha256 ||
      object.data.byteSize !== output.byteSize ||
      object.data.mimeType !== "image/png" ||
      object.data.createdAt !== output.assetCreatedAt
    ) {
      return { ok: false, reason: "asset-invalid" };
    }

    const finalOutput = await resolveAdminCurrentFirstPreview(
      normalizedConceptBriefId,
      { repository },
    );

    if (
      !finalOutput ||
      finalOutput.id !== output.id ||
      finalOutput.assetId !== output.assetId ||
      finalOutput.contentSha256 !== output.contentSha256
    ) {
      return { ok: false, reason: "not-found" };
    }

    return {
      ok: true,
      body: new Uint8Array(download.data),
      contentLength: download.data.byteLength,
      cacheControl: FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
