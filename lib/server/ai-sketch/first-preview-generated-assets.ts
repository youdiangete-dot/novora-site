import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClientOrNull } from "../supabase";
import { FIRST_PREVIEW_ASSET_BUCKET } from "./first-preview-persistence-contract";
import {
  createUnavailableFirstPreviewGeneratedAssetStore,
  type FirstPreviewAssetAccessAuthorizer,
  type FirstPreviewGeneratedAssetStore,
} from "./first-preview-generated-assets-contract";
import {
  createFirstPreviewGeneratedAssetStoreBinding,
  createFirstPreviewStorageClient,
} from "./supabase-first-preview-generated-assets";

export * from "./first-preview-generated-assets-contract";
export {
  createFirstPreviewGeneratedAssetStoreBinding,
  createFirstPreviewStorageClient,
  createSupabaseFirstPreviewGeneratedAssetStore,
  SupabaseFirstPreviewGeneratedAssetStore,
  type FirstPreviewStorageClient,
} from "./supabase-first-preview-generated-assets";

const AI_SKETCH_BUCKET_ENV = "SUPABASE_STORAGE_BUCKET_AI_SKETCHES";

type FirstPreviewGeneratedAssetFactoryOptions = Readonly<{
  authorizer?: FirstPreviewAssetAccessAuthorizer | null;
  supabaseClient?: SupabaseClient | null;
}>;

export function createFirstPreviewGeneratedAssetStore(
  options: FirstPreviewGeneratedAssetFactoryOptions = {},
): FirstPreviewGeneratedAssetStore {
  const bucketName = process.env[AI_SKETCH_BUCKET_ENV]?.trim() || null;
  if (
    !options.authorizer ||
    bucketName !== FIRST_PREVIEW_ASSET_BUCKET
  ) {
    return createUnavailableFirstPreviewGeneratedAssetStore();
  }

  const supabase = Object.prototype.hasOwnProperty.call(options, "supabaseClient")
    ? options.supabaseClient ?? null
    : createSupabaseAdminClientOrNull();
  if (!supabase) return createUnavailableFirstPreviewGeneratedAssetStore();

  return createFirstPreviewGeneratedAssetStoreBinding({
    storageClient: createFirstPreviewStorageClient(supabase),
    authorizer: options.authorizer,
    bucketName,
  });
}
