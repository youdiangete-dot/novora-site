import { deflateSync } from "node:zlib";

import type {
  FirstPreviewAssetAccessAuthorizer,
  FirstPreviewAssetAuthorizationResult,
  FirstPreviewGeneratedAssetAccessRequest,
} from "../../../lib/server/ai-sketch/first-preview-generated-assets-contract";
import type {
  FirstPreviewStorageClient,
  FirstPreviewStorageObjectMetadata,
} from "../../../lib/server/ai-sketch/supabase-first-preview-generated-assets";

type StorageOperation =
  | "inspectBucket"
  | "uploadObject"
  | "downloadObject"
  | "inspectObject";

type StoredObject = {
  body: Uint8Array;
  metadata: FirstPreviewStorageObjectMetadata;
};

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBytes.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 8 + data.length);
  return chunk;
}

export function createSyntheticFirstPreviewPng(
  width = 1024,
  height = 1024,
  extraChunks: ReadonlyArray<Readonly<{ type: string; data: string }>> = [],
  options: Readonly<{
    bitDepth?: number;
    colorType?: number;
    compressionMethod?: number;
    filterMethod?: number;
    interlaceMethod?: number;
    rawIdat?: Uint8Array;
    firstScanlineFilter?: number;
    truncateScanlines?: boolean;
  }> = {},
): Uint8Array {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = options.bitDepth ?? 8;
  ihdr[9] = options.colorType ?? 6;
  ihdr[10] = options.compressionMethod ?? 0;
  ihdr[11] = options.filterMethod ?? 0;
  ihdr[12] = options.interlaceMethod ?? 0;
  const rowLength = 1 + width * 4;
  let pixels = Buffer.alloc(rowLength * height);
  pixels[0] = options.firstScanlineFilter ?? 0;
  if (options.truncateScanlines) pixels = pixels.subarray(0, pixels.length - 1);
  const idat = Object.prototype.hasOwnProperty.call(options, "rawIdat")
    ? Buffer.from(options.rawIdat ?? new Uint8Array())
    : deflateSync(pixels);

  return new Uint8Array(Buffer.concat([
    PNG_SIGNATURE,
    createChunk("IHDR", ihdr),
    ...extraChunks.map((chunk) => createChunk(chunk.type, Buffer.from(chunk.data, "utf8"))),
    createChunk("IDAT", idat),
    createChunk("IEND", Buffer.alloc(0)),
  ]));
}

export class FakeFirstPreviewStorageClient implements FirstPreviewStorageClient {
  readonly objects = new Map<string, StoredObject>();
  readonly operations: StorageOperation[] = [];
  readonly uploads: Array<{
    bucketName: string;
    objectPath: string;
    body: Uint8Array;
    contentType: string;
    upsert: boolean;
  }> = [];
  bucketName = "novora-ai-sketches";
  bucketIsPublic = false;
  createdAt = "2026-07-22T12:00:00.000Z";
  private readonly failures = new Set<StorageOperation>();
  private readonly throws = new Set<StorageOperation>();

  failNext(operation: StorageOperation): void {
    this.failures.add(operation);
  }

  throwNext(operation: StorageOperation): void {
    this.throws.add(operation);
  }

  seedObject(
    objectPath: string,
    body: Uint8Array,
    metadata: Partial<FirstPreviewStorageObjectMetadata> = {},
  ): void {
    this.objects.set(this.key(this.bucketName, objectPath), {
      body: new Uint8Array(body),
      metadata: {
        createdAt: this.createdAt,
        byteSize: body.byteLength,
        mimeType: "image/png",
        ...metadata,
      },
    });
  }

  tamperObject(objectPath: string, body: Uint8Array): void {
    const key = this.key(this.bucketName, objectPath);
    const object = this.objects.get(key);
    if (!object) return;
    this.objects.set(key, {
      body: new Uint8Array(body),
      metadata: { ...object.metadata, byteSize: body.byteLength },
    });
  }

  async inspectBucket(bucketName: string) {
    this.operations.push("inspectBucket");
    this.throwIfRequested("inspectBucket");
    if (this.failed("inspectBucket")) {
      return { data: null, error: { kind: "unavailable" as const } };
    }
    return {
      data: { name: this.bucketName, isPublic: this.bucketIsPublic },
      error: null,
    };
  }

  async uploadObject(input: {
    bucketName: string;
    objectPath: string;
    body: Uint8Array;
    contentType: "image/png";
    upsert: false;
  }) {
    this.operations.push("uploadObject");
    this.throwIfRequested("uploadObject");
    this.uploads.push({ ...input, body: new Uint8Array(input.body) });
    if (this.failed("uploadObject")) {
      return { data: null, error: { kind: "unavailable" as const } };
    }
    const key = this.key(input.bucketName, input.objectPath);
    if (this.objects.has(key)) {
      return {
        data: { disposition: "existing" as const },
        error: null,
      };
    }
    this.objects.set(key, {
      body: new Uint8Array(input.body),
      metadata: {
        createdAt: this.createdAt,
        byteSize: input.body.byteLength,
        mimeType: input.contentType,
      },
    });
    return { data: { disposition: "created" as const }, error: null };
  }

  async downloadObject(bucketName: string, objectPath: string) {
    this.operations.push("downloadObject");
    this.throwIfRequested("downloadObject");
    if (this.failed("downloadObject")) {
      return { data: null, error: { kind: "unavailable" as const } };
    }
    const object = this.objects.get(this.key(bucketName, objectPath));
    return object
      ? { data: new Uint8Array(object.body), error: null }
      : { data: null, error: { kind: "not_found" as const } };
  }

  async inspectObject(bucketName: string, objectPath: string) {
    this.operations.push("inspectObject");
    this.throwIfRequested("inspectObject");
    if (this.failed("inspectObject")) {
      return { data: null, error: { kind: "unavailable" as const } };
    }
    const object = this.objects.get(this.key(bucketName, objectPath));
    return object
      ? { data: { ...object.metadata }, error: null }
      : { data: null, error: { kind: "not_found" as const } };
  }

  private failed(operation: StorageOperation): boolean {
    if (!this.failures.has(operation)) return false;
    this.failures.delete(operation);
    return true;
  }

  private throwIfRequested(operation: StorageOperation): void {
    if (!this.throws.has(operation)) return;
    this.throws.delete(operation);
    throw new Error("synthetic Storage exception must not escape");
  }

  private key(bucketName: string, objectPath: string): string {
    return `${bucketName}\n${objectPath}`;
  }
}

export class FakeFirstPreviewAssetAuthorizer
  implements FirstPreviewAssetAccessAuthorizer
{
  readonly requests: FirstPreviewGeneratedAssetAccessRequest[] = [];
  result: FirstPreviewAssetAuthorizationResult = { authorized: false };
  shouldThrow = false;

  async authorize(
    request: FirstPreviewGeneratedAssetAccessRequest,
  ): Promise<FirstPreviewAssetAuthorizationResult> {
    this.requests.push({ ...request });
    if (this.shouldThrow) throw new Error("synthetic authorization failure");
    return this.result;
  }
}
