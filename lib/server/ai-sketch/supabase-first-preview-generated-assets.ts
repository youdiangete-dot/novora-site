// Dependency-injected generated-asset core. The Production facade that creates
// a privileged Supabase client is mechanically server-only.

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FIRST_PREVIEW_ASSET_BUCKET,
} from "./first-preview-persistence-contract";
import {
  FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
  FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES,
  createUnavailableFirstPreviewGeneratedAssetStore,
  deriveFirstPreviewGeneratedAssetId,
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewContentSha256,
  isValidFirstPreviewPublicReference,
  sha256FirstPreviewAsset,
  type FirstPreviewAssetAccessAuthorizer,
  type FirstPreviewAuthorizedAssetDescriptor,
  type FirstPreviewGeneratedAssetFailureCode,
  type FirstPreviewGeneratedAssetResult,
  type FirstPreviewGeneratedAssetStore,
  type FirstPreviewStoredAssetMetadata,
  type PersistFirstPreviewGeneratedAssetInput,
  type PersistFirstPreviewGeneratedAssetResult,
  type ReadFirstPreviewGeneratedAssetResult,
} from "./first-preview-generated-assets-contract";

type StorageClientError = Readonly<{
  kind: "not_found" | "unavailable";
}>;

type StorageClientResult<T> = Promise<
  Readonly<{
    data: T | null;
    error: StorageClientError | null;
  }>
>;

export type FirstPreviewStorageObjectMetadata = Readonly<{
  createdAt: string;
  byteSize: number;
  mimeType: string;
}>;

export interface FirstPreviewStorageClient {
  inspectBucket(
    bucketName: string,
  ): StorageClientResult<Readonly<{ name: string; isPublic: boolean }>>;

  uploadObject(input: Readonly<{
    bucketName: string;
    objectPath: string;
    body: Uint8Array;
    contentType: "image/png";
    upsert: false;
  }>): StorageClientResult<Readonly<{ disposition: "created" | "existing" }>>;

  downloadObject(
    bucketName: string,
    objectPath: string,
  ): StorageClientResult<Uint8Array>;

  inspectObject(
    bucketName: string,
    objectPath: string,
  ): StorageClientResult<FirstPreviewStorageObjectMetadata>;
}

type FirstPreviewGeneratedAssetStoreOptions = Readonly<{
  clock?: () => string;
}>;

type FirstPreviewGeneratedAssetBindingOptions =
  FirstPreviewGeneratedAssetStoreOptions &
    Readonly<{
      storageClient?: FirstPreviewStorageClient | null;
      authorizer?: FirstPreviewAssetAccessAuthorizer | null;
      bucketName?: string | null;
    }>;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const UNSAFE_METADATA_CHUNKS = new Set(["tEXt", "zTXt", "iTXt", "eXIf"]);
const ANIMATION_CHUNKS = new Set(["acTL", "fcTL", "fdAT"]);

function failure<T>(
  code: FirstPreviewGeneratedAssetFailureCode,
): FirstPreviewGeneratedAssetResult<T> {
  return { ok: false, code };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStatusCode(error: unknown): string | null {
  if (!isRecord(error)) return null;
  const value = error.statusCode ?? error.status;
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function readSafeInteger(value: unknown): number | null {
  const normalized = typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : value;
  return Number.isSafeInteger(normalized) && Number(normalized) >= 0
    ? Number(normalized)
    : null;
}

function readMimeType(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  const value = metadata.mimetype ?? metadata["content-type"];
  return typeof value === "string" ? value : null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
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

function isValidatedFirstPreviewPng(bytes: Uint8Array): boolean {
  if (
    bytes.byteLength < 45 ||
    bytes.byteLength > FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES
  ) {
    return false;
  }

  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    return false;
  }

  let offset = PNG_SIGNATURE.length;
  let chunkIndex = 0;
  let sawIdat = false;
  let sawIend = false;

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) return false;
    const length = buffer.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > buffer.length) return false;

    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type)) return false;
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    if (crc32(buffer.subarray(offset + 4, dataEnd)) !== expectedCrc) {
      return false;
    }

    if (chunkIndex === 0) {
      if (type !== "IHDR" || length !== 13) return false;
      if (buffer.readUInt32BE(dataStart) !== 1024) return false;
      if (buffer.readUInt32BE(dataStart + 4) !== 1024) return false;
    } else if (type === "IHDR") {
      return false;
    }

    if (UNSAFE_METADATA_CHUNKS.has(type) || ANIMATION_CHUNKS.has(type)) {
      return false;
    }
    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") {
      if (length !== 0 || sawIend || chunkEnd !== buffer.length) return false;
      sawIend = true;
    }

    offset = chunkEnd;
    chunkIndex += 1;
  }

  return sawIdat && sawIend;
}

function splitObjectPath(objectPath: string): { folder: string; filename: string } | null {
  const separator = objectPath.lastIndexOf("/");
  if (separator <= 0 || separator === objectPath.length - 1) return null;
  return {
    folder: objectPath.slice(0, separator),
    filename: objectPath.slice(separator + 1),
  };
}

export function createFirstPreviewStorageClient(
  supabase: SupabaseClient,
): FirstPreviewStorageClient {
  return {
    async inspectBucket(bucketName) {
      const { data, error } = await supabase.storage.getBucket(bucketName);
      if (error || !data) {
        return { data: null, error: { kind: "unavailable" } };
      }
      return {
        data: { name: data.name, isPublic: data.public === true },
        error: null,
      };
    },

    async uploadObject(input) {
      const { error } = await supabase.storage
        .from(input.bucketName)
        .upload(input.objectPath, Buffer.from(input.body), {
          contentType: input.contentType,
          upsert: false,
        });
      if (!error) {
        return { data: { disposition: "created" }, error: null };
      }
      if (readStatusCode(error) === "409") {
        return { data: { disposition: "existing" }, error: null };
      }
      return { data: null, error: { kind: "unavailable" } };
    },

    async downloadObject(bucketName, objectPath) {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(objectPath);
      if (error || !data) {
        return {
          data: null,
          error: { kind: readStatusCode(error) === "404" ? "not_found" : "unavailable" },
        };
      }
      try {
        return {
          data: new Uint8Array(await data.arrayBuffer()),
          error: null,
        };
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },

    async inspectObject(bucketName, objectPath) {
      const split = splitObjectPath(objectPath);
      if (!split) return { data: null, error: { kind: "unavailable" } };
      const { data, error } = await supabase.storage.from(bucketName).list(split.folder, {
        limit: 100,
        search: split.filename,
      });
      if (error || !data) {
        return { data: null, error: { kind: "unavailable" } };
      }
      const exact = data.find((item) => item.name === split.filename);
      if (!exact) return { data: null, error: { kind: "not_found" } };
      const byteSize = readSafeInteger(exact.metadata?.size);
      const mimeType = readMimeType(exact.metadata);
      if (!isIsoTimestamp(exact.created_at) || byteSize === null || !mimeType) {
        return { data: null, error: { kind: "unavailable" } };
      }
      return {
        data: { createdAt: exact.created_at, byteSize, mimeType },
        error: null,
      };
    },
  };
}

function isValidPersistInput(input: PersistFirstPreviewGeneratedAssetInput): boolean {
  return (
    deriveFirstPreviewGeneratedAssetId(input) !== null &&
    input.mimeType === "image/png" &&
    input.imageBytes instanceof Uint8Array &&
    input.imageBytes.byteLength > 0 &&
    input.imageBytes.byteLength <= FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES
  );
}

function descriptorIsAuthorizedAndConsistent(
  request: { outputId: string },
  descriptor: FirstPreviewAuthorizedAssetDescriptor,
): boolean {
  const expectedAssetId = deriveFirstPreviewGeneratedAssetId(descriptor);
  return (
    descriptor.outputId === request.outputId &&
    descriptor.readinessStatus === "first_preview_ready" &&
    descriptor.isCurrentCustomerPreview === true &&
    expectedAssetId !== null &&
    descriptor.asset.assetId === expectedAssetId &&
    descriptor.asset.assetPersisted === true &&
    descriptor.asset.bucketName === FIRST_PREVIEW_ASSET_BUCKET &&
    descriptor.asset.mimeType === "image/png" &&
    Number.isSafeInteger(descriptor.asset.byteSize) &&
    descriptor.asset.byteSize > 0 &&
    descriptor.asset.byteSize <= FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES &&
    descriptor.asset.widthPx === 1024 &&
    descriptor.asset.heightPx === 1024 &&
    isValidFirstPreviewContentSha256(descriptor.asset.contentSha256) &&
    isIsoTimestamp(descriptor.asset.assetCreatedAt) &&
    isIsoTimestamp(descriptor.asset.assetValidatedAt)
  );
}

export class SupabaseFirstPreviewGeneratedAssetStore
  implements FirstPreviewGeneratedAssetStore
{
  readonly kind = "supabase" as const;
  private readonly clock: () => string;

  constructor(
    private readonly storage: FirstPreviewStorageClient,
    private readonly authorizer: FirstPreviewAssetAccessAuthorizer,
    options: FirstPreviewGeneratedAssetStoreOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  private async requirePrivateBucket(): Promise<
    FirstPreviewGeneratedAssetResult<true>
  > {
    const result = await this.storage.inspectBucket(FIRST_PREVIEW_ASSET_BUCKET);
    if (result.error || !result.data) return failure("storage_unavailable");
    if (
      result.data.name !== FIRST_PREVIEW_ASSET_BUCKET ||
      result.data.isPublic !== false
    ) {
      return failure("privacy_failure");
    }
    return { ok: true, value: true };
  }

  async persistValidatedPng(
    input: PersistFirstPreviewGeneratedAssetInput,
  ): Promise<PersistFirstPreviewGeneratedAssetResult> {
    if (!isValidPersistInput(input)) return failure("invalid_input");
    const objectPath = deriveFirstPreviewGeneratedAssetId(input)!;
    const privateBucket = await this.requirePrivateBucket();
    if (privateBucket.ok === false) return privateBucket;

    const expectedHash = sha256FirstPreviewAsset(input.imageBytes);
    const upload = await this.storage.uploadObject({
      bucketName: FIRST_PREVIEW_ASSET_BUCKET,
      objectPath,
      body: input.imageBytes,
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error || !upload.data) return failure("storage_unavailable");

    const persisted = await this.storage.downloadObject(
      FIRST_PREVIEW_ASSET_BUCKET,
      objectPath,
    );
    if (persisted.error || !persisted.data) {
      return persisted.error?.kind === "not_found"
        ? failure("asset_integrity_failure")
        : failure("storage_unavailable");
    }

    const persistedHash = sha256FirstPreviewAsset(persisted.data);
    if (persistedHash !== expectedHash) {
      return upload.data.disposition === "existing"
        ? failure("idempotency_conflict")
        : failure("asset_integrity_failure");
    }
    if (!isValidatedFirstPreviewPng(persisted.data)) {
      return failure("invalid_persisted_png");
    }

    const object = await this.storage.inspectObject(
      FIRST_PREVIEW_ASSET_BUCKET,
      objectPath,
    );
    if (object.error || !object.data) {
      return object.error?.kind === "not_found"
        ? failure("asset_integrity_failure")
        : failure("storage_unavailable");
    }
    if (
      object.data.byteSize !== persisted.data.byteLength ||
      object.data.mimeType !== "image/png" ||
      !isIsoTimestamp(object.data.createdAt)
    ) {
      return failure("asset_integrity_failure");
    }

    const validatedAt = this.clock();
    if (!isIsoTimestamp(validatedAt)) return failure("storage_unavailable");
    const asset: FirstPreviewStoredAssetMetadata = {
      assetId: objectPath,
      assetPersisted: true,
      bucketName: FIRST_PREVIEW_ASSET_BUCKET,
      mimeType: "image/png",
      byteSize: persisted.data.byteLength,
      widthPx: 1024,
      heightPx: 1024,
      contentSha256: persistedHash,
      assetCreatedAt: object.data.createdAt,
      assetValidatedAt: validatedAt < object.data.createdAt
        ? object.data.createdAt
        : validatedAt,
    };

    return {
      ok: true,
      value: { disposition: upload.data.disposition, asset },
    };
  }

  async readAuthorizedPng(
    request: { publicReference: string; outputId: string },
  ): Promise<ReadFirstPreviewGeneratedAssetResult> {
    if (
      !isValidFirstPreviewPublicReference(request.publicReference) ||
      !isValidFirstPreviewAssetUuid(request.outputId)
    ) {
      return failure("invalid_input");
    }

    let authorization;
    try {
      authorization = await this.authorizer.authorize(request);
    } catch {
      return failure("access_denied");
    }
    if (
      !authorization.authorized ||
      !descriptorIsAuthorizedAndConsistent(request, authorization.descriptor)
    ) {
      return failure("access_denied");
    }

    const privateBucket = await this.requirePrivateBucket();
    if (privateBucket.ok === false) return privateBucket;
    const asset = authorization.descriptor.asset;
    const download = await this.storage.downloadObject(
      FIRST_PREVIEW_ASSET_BUCKET,
      asset.assetId,
    );
    if (download.error || !download.data) {
      return download.error?.kind === "not_found"
        ? failure("asset_not_found")
        : failure("storage_unavailable");
    }
    if (
      download.data.byteLength !== asset.byteSize ||
      sha256FirstPreviewAsset(download.data) !== asset.contentSha256 ||
      !isValidatedFirstPreviewPng(download.data)
    ) {
      return failure("asset_integrity_failure");
    }

    return {
      ok: true,
      value: {
        body: new Uint8Array(download.data),
        mimeType: "image/png",
        contentLength: download.data.byteLength,
        contentSha256: asset.contentSha256,
        cacheControl: FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
      },
    };
  }
}

export function createSupabaseFirstPreviewGeneratedAssetStore(
  storageClient: FirstPreviewStorageClient,
  authorizer: FirstPreviewAssetAccessAuthorizer,
  options: FirstPreviewGeneratedAssetStoreOptions = {},
): FirstPreviewGeneratedAssetStore {
  return new SupabaseFirstPreviewGeneratedAssetStore(
    storageClient,
    authorizer,
    options,
  );
}

export function createFirstPreviewGeneratedAssetStoreBinding(
  options: FirstPreviewGeneratedAssetBindingOptions,
): FirstPreviewGeneratedAssetStore {
  if (
    !options.storageClient ||
    !options.authorizer ||
    options.bucketName !== FIRST_PREVIEW_ASSET_BUCKET
  ) {
    return createUnavailableFirstPreviewGeneratedAssetStore();
  }

  return createSupabaseFirstPreviewGeneratedAssetStore(
    options.storageClient,
    options.authorizer,
    { clock: options.clock },
  );
}
