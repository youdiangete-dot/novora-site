import "server-only";

import { randomUUID } from "crypto";

import { createSupabaseAdminClientOrNull } from "./supabase";

export const REFERENCE_ASSET_FILE_FIELD = "referenceImages";
export const REFERENCE_ASSET_MAX_FILES = 3;
export const REFERENCE_ASSET_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const REFERENCE_ASSET_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const REFERENCE_BUCKET_ENV = "SUPABASE_STORAGE_BUCKET_REFERENCES";

type ConceptBriefLookupRow = {
  id: string;
  public_reference: string;
};

type ReferenceAssetInsertRow = {
  concept_brief_id: string;
  asset_type: "reference_image";
  original_filename: string;
  storage_bucket: string;
  storage_key: string;
  mime_type: string;
  file_size_bytes: number;
  upload_status: "uploaded";
  customer_visible: false;
  admin_visible: true;
};

type ReferenceAssetRow = {
  id: string;
  concept_brief_id: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  upload_status: string | null;
  admin_visible: boolean | null;
  created_at: string | null;
};

type ReferenceAssetStorageRow = ReferenceAssetRow & {
  storage_bucket: string | null;
  storage_key: string | null;
};

export type AdminReferenceAssetMetadata = {
  id: string;
  conceptBriefId: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadStatus: string;
  createdAt: string;
};

export type ReferenceAssetUploadResult =
  | {
      ok: true;
      assets: AdminReferenceAssetMetadata[];
    }
  | {
      ok: false;
      message: string;
    };

export type AdminReferenceAssetAccessResult =
  | {
      ok: true;
      signedUrl: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

function getReferenceBucketName(): string | null {
  const value = process.env[REFERENCE_BUCKET_ENV]?.trim();

  return value || null;
}

function sanitizeFilename(filename: string): string {
  const normalized = filename.trim().replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ");
  const safeFilename = normalized.replace(/[^\w .()\-]/g, "-").slice(0, 120);

  return safeFilename || "reference-image";
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  return "webp";
}

function mapReferenceAssetRow(row: ReferenceAssetRow): AdminReferenceAssetMetadata {
  return {
    id: row.id,
    conceptBriefId: row.concept_brief_id,
    originalFilename: row.original_filename?.trim() || "reference-image",
    mimeType: row.mime_type?.trim() || "Not provided",
    fileSizeBytes: Number(row.file_size_bytes || 0),
    uploadStatus: row.upload_status?.trim() || "uploaded",
    createdAt: row.created_at?.trim() || "",
  };
}

function readValidReferenceFiles(formData: FormData): File[] | ReferenceAssetUploadResult {
  const values = formData.getAll(REFERENCE_ASSET_FILE_FIELD);
  const files = values.filter((value): value is File => value instanceof File && value.size > 0);

  if (files.length === 0) {
    return {
      ok: false,
      message: "No reference image files were provided.",
    };
  }

  if (files.length > REFERENCE_ASSET_MAX_FILES) {
    return {
      ok: false,
      message: `Attach up to ${REFERENCE_ASSET_MAX_FILES} reference images for this concept review.`,
    };
  }

  for (const file of files) {
    if (!REFERENCE_ASSET_ALLOWED_MIME_TYPES.has(file.type)) {
      return {
        ok: false,
        message: "Reference uploads must be JPG, PNG, or WebP images.",
      };
    }

    if (file.size > REFERENCE_ASSET_MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        message: "Each reference image must be 5 MB or smaller.",
      };
    }
  }

  return files;
}

async function verifyConceptBriefReference(
  conceptBriefId: string,
  publicReference: string,
): Promise<ConceptBriefLookupRow | null> {
  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("concept_briefs")
    .select("id, public_reference")
    .eq("id", conceptBriefId)
    .eq("public_reference", publicReference)
    .maybeSingle<ConceptBriefLookupRow>();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function uploadConceptBriefReferenceAssets(formData: FormData): Promise<ReferenceAssetUploadResult> {
  const supabase = createSupabaseAdminClientOrNull();
  const storageBucket = getReferenceBucketName();

  if (!supabase || !storageBucket) {
    return {
      ok: false,
      message: "Reference image upload is temporarily unavailable. Your concept brief was still submitted.",
    };
  }

  const conceptBriefId = String(formData.get("conceptBriefId") || "").trim();
  const publicReference = String(formData.get("publicReference") || "").trim();

  if (!conceptBriefId || !publicReference) {
    return {
      ok: false,
      message: "Reference image upload could not be matched to the submitted concept brief.",
    };
  }

  const conceptBrief = await verifyConceptBriefReference(conceptBriefId, publicReference);

  if (!conceptBrief) {
    return {
      ok: false,
      message: "Reference image upload could not be matched to the submitted concept brief.",
    };
  }

  const filesOrError = readValidReferenceFiles(formData);

  if (!Array.isArray(filesOrError)) {
    return filesOrError;
  }

  const insertedAssets: AdminReferenceAssetMetadata[] = [];

  for (const file of filesOrError) {
    const originalFilename = sanitizeFilename(file.name);
    const storageKey = [
      "concept-briefs",
      conceptBrief.public_reference,
      `${randomUUID()}.${extensionForMimeType(file.type)}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage.from(storageBucket).upload(storageKey, file, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      console.error("Reference asset storage upload failed.", {
        message: uploadError.message,
      });

      return {
        ok: false,
        message: "Reference image upload is temporarily unavailable. Your concept brief was still submitted.",
      };
    }

    const insertRow: ReferenceAssetInsertRow = {
      concept_brief_id: conceptBrief.id,
      asset_type: "reference_image",
      original_filename: originalFilename,
      storage_bucket: storageBucket,
      storage_key: storageKey,
      mime_type: file.type,
      file_size_bytes: file.size,
      upload_status: "uploaded",
      customer_visible: false,
      admin_visible: true,
    };

    const { data: insertedAsset, error: insertError } = await supabase
      .from("concept_brief_reference_assets")
      .insert(insertRow)
      .select("id, concept_brief_id, original_filename, mime_type, file_size_bytes, upload_status, admin_visible, created_at")
      .single<ReferenceAssetRow>();

    if (insertError || !insertedAsset) {
      console.error("Reference asset metadata insert failed.", {
        code: insertError?.code,
        message: insertError?.message,
      });

      return {
        ok: false,
        message: "Reference image metadata could not be saved. Your concept brief was still submitted.",
      };
    }

    insertedAssets.push(mapReferenceAssetRow(insertedAsset));
  }

  return {
    ok: true,
    assets: insertedAssets,
  };
}

export async function loadReferenceAssetsByConceptBriefIds(
  conceptBriefIds: string[],
): Promise<Map<string, AdminReferenceAssetMetadata[]>> {
  const assetsByConceptBriefId = new Map<string, AdminReferenceAssetMetadata[]>();
  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase || conceptBriefIds.length === 0) {
    return assetsByConceptBriefId;
  }

  const { data, error } = await supabase
    .from("concept_brief_reference_assets")
    .select("id, concept_brief_id, original_filename, mime_type, file_size_bytes, upload_status, admin_visible, created_at")
    .in("concept_brief_id", conceptBriefIds)
    .eq("admin_visible", true)
    .order("created_at", { ascending: true })
    .returns<ReferenceAssetRow[]>();

  if (error || !data) {
    console.error("Reference asset metadata load failed.", {
      code: error?.code,
      message: error?.message,
    });

    return assetsByConceptBriefId;
  }

  for (const row of data) {
    const asset = mapReferenceAssetRow(row);
    const assets = assetsByConceptBriefId.get(asset.conceptBriefId) || [];

    assets.push(asset);
    assetsByConceptBriefId.set(asset.conceptBriefId, assets);
  }

  return assetsByConceptBriefId;
}

export async function createAdminReferenceAssetSignedUrl(
  assetId: string,
): Promise<AdminReferenceAssetAccessResult> {
  const supabase = createSupabaseAdminClientOrNull();

  if (!supabase) {
    return {
      ok: false,
      status: 503,
      message: "Reference asset access is temporarily unavailable.",
    };
  }

  const { data: asset, error } = await supabase
    .from("concept_brief_reference_assets")
    .select("id, concept_brief_id, original_filename, mime_type, file_size_bytes, upload_status, admin_visible, created_at, storage_bucket, storage_key")
    .eq("id", assetId)
    .eq("admin_visible", true)
    .maybeSingle<ReferenceAssetStorageRow>();

  if (error || !asset?.storage_bucket || !asset.storage_key) {
    return {
      ok: false,
      status: 404,
      message: "Reference asset was not found.",
    };
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(asset.storage_bucket)
    .createSignedUrl(asset.storage_key, 60);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return {
      ok: false,
      status: 503,
      message: "Reference asset access is temporarily unavailable.",
    };
  }

  return {
    ok: true,
    signedUrl: signedUrlData.signedUrl,
  };
}
