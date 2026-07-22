import { createHash } from "node:crypto";

import { FIRST_PREVIEW_ASSET_BUCKET } from "./first-preview-persistence-contract";

export const FIRST_PREVIEW_GENERATED_ASSET_CONTRACT_VERSION =
  "novora_first_preview_generated_asset_v1" as const;
export const FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES = 16 * 1024 * 1024;
export const FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL =
  "private, no-store" as const;

export type FirstPreviewStoredAssetMetadata = Readonly<{
  assetId: string;
  assetPersisted: true;
  bucketName: typeof FIRST_PREVIEW_ASSET_BUCKET;
  mimeType: "image/png";
  byteSize: number;
  widthPx: 1024;
  heightPx: 1024;
  contentSha256: string;
  assetCreatedAt: string;
  assetValidatedAt: string;
}>;

export type PersistFirstPreviewGeneratedAssetInput = Readonly<{
  conceptBriefId: string;
  jobId: string;
  outputId: string;
  mimeType: "image/png";
  imageBytes: Uint8Array;
}>;

export type FirstPreviewGeneratedAssetAccessRequest = Readonly<{
  publicReference: string;
  outputId: string;
}>;

export type FirstPreviewAuthorizedAssetDescriptor = Readonly<{
  conceptBriefId: string;
  jobId: string;
  outputId: string;
  asset: FirstPreviewStoredAssetMetadata;
  readinessStatus: "first_preview_ready";
  isCurrentCustomerPreview: true;
}>;

export type FirstPreviewAssetAuthorizationResult =
  | Readonly<{
      authorized: true;
      descriptor: FirstPreviewAuthorizedAssetDescriptor;
    }>
  | Readonly<{ authorized: false }>;

export interface FirstPreviewAssetAccessAuthorizer {
  authorize(
    request: FirstPreviewGeneratedAssetAccessRequest,
  ): Promise<FirstPreviewAssetAuthorizationResult>;
}

export type FirstPreviewGeneratedAssetFailureCode =
  | "storage_unavailable"
  | "invalid_input"
  | "invalid_persisted_png"
  | "privacy_failure"
  | "idempotency_conflict"
  | "asset_integrity_failure"
  | "access_denied"
  | "asset_not_found";

export type FirstPreviewGeneratedAssetResult<T> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; code: FirstPreviewGeneratedAssetFailureCode }>;

export type PersistFirstPreviewGeneratedAssetResult =
  FirstPreviewGeneratedAssetResult<
    Readonly<{
      disposition: "created" | "existing";
      asset: FirstPreviewStoredAssetMetadata;
    }>
  >;

export type ReadFirstPreviewGeneratedAssetResult =
  FirstPreviewGeneratedAssetResult<
    Readonly<{
      body: Uint8Array;
      mimeType: "image/png";
      contentLength: number;
      contentSha256: string;
      cacheControl: typeof FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL;
    }>
  >;

export interface FirstPreviewGeneratedAssetStore {
  readonly kind: "unavailable" | "supabase";

  persistValidatedPng(
    input: PersistFirstPreviewGeneratedAssetInput,
  ): Promise<PersistFirstPreviewGeneratedAssetResult>;

  readAuthorizedPng(
    request: FirstPreviewGeneratedAssetAccessRequest,
  ): Promise<ReadFirstPreviewGeneratedAssetResult>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PUBLIC_REFERENCE_PATTERN = /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function isValidFirstPreviewAssetUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function deriveFirstPreviewGeneratedAssetId(input: {
  conceptBriefId: string;
  jobId: string;
  outputId: string;
}): string | null {
  if (
    !isValidFirstPreviewAssetUuid(input.conceptBriefId) ||
    !isValidFirstPreviewAssetUuid(input.jobId) ||
    !isValidFirstPreviewAssetUuid(input.outputId)
  ) {
    return null;
  }

  return [
    "first-preview",
    input.conceptBriefId,
    input.jobId,
    `${input.outputId}.png`,
  ].join("/");
}

export function isValidFirstPreviewPublicReference(value: string): boolean {
  return PUBLIC_REFERENCE_PATTERN.test(value);
}

export function isValidFirstPreviewContentSha256(value: string): boolean {
  return SHA256_PATTERN.test(value);
}

export function sha256FirstPreviewAsset(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function unavailable<T>(): Promise<FirstPreviewGeneratedAssetResult<T>> {
  return Promise.resolve({ ok: false, code: "storage_unavailable" });
}

class UnavailableFirstPreviewGeneratedAssetStore
  implements FirstPreviewGeneratedAssetStore
{
  readonly kind = "unavailable" as const;

  persistValidatedPng(): Promise<PersistFirstPreviewGeneratedAssetResult> {
    return unavailable();
  }

  readAuthorizedPng(): Promise<ReadFirstPreviewGeneratedAssetResult> {
    return unavailable();
  }
}

export function createUnavailableFirstPreviewGeneratedAssetStore(): FirstPreviewGeneratedAssetStore {
  return new UnavailableFirstPreviewGeneratedAssetStore();
}
