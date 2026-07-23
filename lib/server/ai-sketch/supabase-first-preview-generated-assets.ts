// Dependency-injected generated-asset core. The Production facade that creates
// a privileged Supabase client is mechanically server-only.

import { inflateSync } from "node:zlib";

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
const KNOWN_CRITICAL_CHUNKS = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);

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
  let sawPlte = false;
  let sawChunkAfterIdat = false;
  let pngColorType: number | null = null;
  let pngBitDepth: number | null = null;
  let expectedScanlineLength: number | null = null;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) return false;
    const length = buffer.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    if (chunkEnd > buffer.length) return false;

    const typeBytes = buffer.subarray(offset + 4, offset + 8);
    if (
      !typeBytes.every(
        (byte) =>
          (byte >= 0x41 && byte <= 0x5a) ||
          (byte >= 0x61 && byte <= 0x7a),
      )
    ) {
      return false;
    }
    const isCritical = (typeBytes[0] & 0x20) === 0;
    const reservedBitSet = (typeBytes[2] & 0x20) !== 0;
    const type = typeBytes.toString("ascii");
    if (reservedBitSet) return false;
    if (isCritical && !KNOWN_CRITICAL_CHUNKS.has(type)) {
      return false;
    }
    const expectedCrc = buffer.readUInt32BE(dataEnd);
    if (crc32(buffer.subarray(offset + 4, dataEnd)) !== expectedCrc) {
      return false;
    }

    if (chunkIndex === 0) {
      if (type !== "IHDR" || length !== 13) return false;
      if (buffer.readUInt32BE(dataStart) !== 1024) return false;
      if (buffer.readUInt32BE(dataStart + 4) !== 1024) return false;
      const bitDepth = buffer[dataStart + 8];
      pngBitDepth = bitDepth;
      const colorType = buffer[dataStart + 9];
      pngColorType = colorType;
      const compressionMethod = buffer[dataStart + 10];
      const filterMethod = buffer[dataStart + 11];
      const interlaceMethod = buffer[dataStart + 12];
      const channels = new Map([
        [0, 1],
        [2, 3],
        [3, 1],
        [4, 2],
        [6, 4],
      ]).get(colorType);
      const legalDepths = new Map<number, readonly number[]>([
        [0, [1, 2, 4, 8, 16]],
        [2, [8, 16]],
        [3, [1, 2, 4, 8]],
        [4, [8, 16]],
        [6, [8, 16]],
      ]).get(colorType);
      if (
        !channels ||
        !legalDepths?.includes(bitDepth) ||
        compressionMethod !== 0 ||
        filterMethod !== 0 ||
        interlaceMethod !== 0
      ) {
        return false;
      }
      expectedScanlineLength = 1 + Math.ceil((1024 * channels * bitDepth) / 8);
    } else if (type === "IHDR") {
      return false;
    }

    if (UNSAFE_METADATA_CHUNKS.has(type) || ANIMATION_CHUNKS.has(type)) {
      return false;
    }
    if (type === "PLTE") {
      if (
        sawPlte ||
        sawIdat ||
        pngColorType === 0 ||
        pngColorType === 4 ||
        length === 0 ||
        length > 768 ||
        length % 3 !== 0 ||
        (pngColorType === 3 &&
          pngBitDepth !== null &&
          length / 3 > 2 ** pngBitDepth)
      ) {
        return false;
      }
      sawPlte = true;
    }
    if (type === "IDAT") {
      if (sawChunkAfterIdat) return false;
      if (pngColorType === 3 && !sawPlte) return false;
      sawIdat = true;
      idatChunks.push(buffer.subarray(dataStart, dataEnd));
    } else if (sawIdat && type !== "IEND") {
      sawChunkAfterIdat = true;
    }
    if (type === "IEND") {
      if (length !== 0 || sawIend || chunkEnd !== buffer.length) return false;
      sawIend = true;
    }

    offset = chunkEnd;
    chunkIndex += 1;
  }

  if (!sawIdat || !sawIend || expectedScanlineLength === null) return false;
  const compressed = Buffer.concat(idatChunks);
  if (compressed.length === 0) return false;
  const expectedInflatedLength = expectedScanlineLength * 1024;

  try {
    const inflatedResult = inflateSync(compressed, {
      maxOutputLength: expectedInflatedLength + 1,
      info: true,
    }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
    if (inflatedResult.engine.bytesWritten !== compressed.length) return false;
    const inflated = inflatedResult.buffer;
    if (inflated.length !== expectedInflatedLength) return false;
    for (let row = 0; row < 1024; row += 1) {
      if (inflated[row * expectedScanlineLength] > 4) return false;
    }
    return true;
  } catch {
    return false;
  }
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
      try {
        const { data, error } = await supabase.storage.getBucket(bucketName);
        if (error || !data) {
          return { data: null, error: { kind: "unavailable" } };
        }
        return {
          data: { name: data.name, isPublic: data.public !== false },
          error: null,
        };
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },

    async uploadObject(input) {
      try {
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
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },

    async downloadObject(bucketName, objectPath) {
      try {
        const { data, error } = await supabase.storage
          .from(bucketName)
          .download(objectPath);
        if (error || !data) {
          return {
            data: null,
            error: { kind: readStatusCode(error) === "404" ? "not_found" : "unavailable" },
          };
        }
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
      try {
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
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
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
  request: { publicReference: string; outputId: string },
  descriptor: FirstPreviewAuthorizedAssetDescriptor,
): boolean {
  const expectedAssetId = deriveFirstPreviewGeneratedAssetId(descriptor);
  return (
    descriptor.publicReference === request.publicReference &&
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

function descriptorsMatch(
  first: FirstPreviewAuthorizedAssetDescriptor,
  second: FirstPreviewAuthorizedAssetDescriptor,
): boolean {
  return (
    first.publicReference === second.publicReference &&
    first.conceptBriefId === second.conceptBriefId &&
    first.jobId === second.jobId &&
    first.outputId === second.outputId &&
    first.readinessStatus === second.readinessStatus &&
    first.isCurrentCustomerPreview === second.isCurrentCustomerPreview &&
    first.asset.assetId === second.asset.assetId &&
    first.asset.assetPersisted === second.asset.assetPersisted &&
    first.asset.bucketName === second.asset.bucketName &&
    first.asset.mimeType === second.asset.mimeType &&
    first.asset.byteSize === second.asset.byteSize &&
    first.asset.widthPx === second.asset.widthPx &&
    first.asset.heightPx === second.asset.heightPx &&
    first.asset.contentSha256 === second.asset.contentSha256 &&
    first.asset.assetCreatedAt === second.asset.assetCreatedAt &&
    first.asset.assetValidatedAt === second.asset.assetValidatedAt
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
    let result;
    try {
      result = await this.storage.inspectBucket(FIRST_PREVIEW_ASSET_BUCKET);
    } catch {
      return failure("storage_unavailable");
    }
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
    let upload;
    try {
      upload = await this.storage.uploadObject({
        bucketName: FIRST_PREVIEW_ASSET_BUCKET,
        objectPath,
        body: input.imageBytes,
        contentType: "image/png",
        upsert: false,
      });
    } catch {
      return failure("storage_unavailable");
    }
    if (upload.error || !upload.data) return failure("storage_unavailable");

    let persisted;
    try {
      persisted = await this.storage.downloadObject(
        FIRST_PREVIEW_ASSET_BUCKET,
        objectPath,
      );
    } catch {
      return failure("storage_unavailable");
    }
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

    let object;
    try {
      object = await this.storage.inspectObject(
        FIRST_PREVIEW_ASSET_BUCKET,
        objectPath,
      );
    } catch {
      return failure("storage_unavailable");
    }
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
    request: {
      publicReference: string;
      outputId: string;
      accessProof: string;
    },
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
    let download;
    try {
      download = await this.storage.downloadObject(
        FIRST_PREVIEW_ASSET_BUCKET,
        asset.assetId,
      );
    } catch {
      return failure("storage_unavailable");
    }
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

    let object;
    try {
      object = await this.storage.inspectObject(
        FIRST_PREVIEW_ASSET_BUCKET,
        asset.assetId,
      );
    } catch {
      return failure("storage_unavailable");
    }
    if (object.error || !object.data) {
      return object.error?.kind === "not_found"
        ? failure("asset_not_found")
        : failure("storage_unavailable");
    }
    if (
      object.data.byteSize !== download.data.byteLength ||
      object.data.mimeType !== "image/png" ||
      object.data.createdAt !== asset.assetCreatedAt ||
      !isIsoTimestamp(object.data.createdAt)
    ) {
      return failure("asset_integrity_failure");
    }

    let finalAuthorization;
    try {
      finalAuthorization = await this.authorizer.authorize(request);
    } catch {
      return failure("access_denied");
    }
    if (
      !finalAuthorization.authorized ||
      !descriptorIsAuthorizedAndConsistent(
        request,
        finalAuthorization.descriptor,
      ) ||
      !descriptorsMatch(
        authorization.descriptor,
        finalAuthorization.descriptor,
      )
    ) {
      return failure("access_denied");
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
