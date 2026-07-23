import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES,
  deriveFirstPreviewGeneratedAssetId,
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewContentSha256,
  isValidFirstPreviewPublicReference,
  type FirstPreviewAssetAccessAuthorizer,
  type FirstPreviewAssetAuthorizationResult,
  type FirstPreviewGeneratedAssetAccessRequest,
  type FirstPreviewStoredAssetMetadata,
} from "./first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT,
  verifyFirstPreviewCustomerAccessProof,
} from "./first-preview-customer-access-contract";
import { FIRST_PREVIEW_ASSET_BUCKET } from "./first-preview-persistence-contract";

type DatabaseError = Readonly<{ kind: "unavailable" }>;
type CandidateResult = Promise<
  Readonly<{ data: readonly unknown[] | null; error: DatabaseError | null }>
>;

export interface FirstPreviewCustomerAccessDatabaseClient {
  findBriefCandidates(
    publicReference: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT,
  ): CandidateResult;
  findOutputCandidates(
    outputId: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT,
  ): CandidateResult;
  findJobCandidates(
    jobId: string,
    limit: typeof FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT,
  ): CandidateResult;
}

export type FirstPreviewCustomerAccessAuthorizer =
  FirstPreviewAssetAccessAuthorizer &
    Readonly<{ kind: "unavailable" | "supabase" }>;

type AuthorizerOptions = Readonly<{
  clock?: () => number;
}>;

type AuthorizerBindingOptions = AuthorizerOptions &
  Readonly<{
    databaseClient?: FirstPreviewCustomerAccessDatabaseClient | null;
    signingSecret?: string | null;
  }>;

const BRIEF_COLUMNS = "id, public_reference";
const OUTPUT_COLUMNS = [
  "id",
  "job_id",
  "concept_brief_id",
  "bucket_name",
  "object_path",
  "mime_type",
  "byte_size",
  "width_px",
  "height_px",
  "content_sha256",
  "asset_created_at",
  "asset_validation_status",
  "asset_validated_at",
  "readiness_status",
  "first_preview_ready_at",
  "readiness_revoked_at",
  "is_current_customer_preview",
  "created_at",
].join(", ");
const JOB_COLUMNS = [
  "id",
  "concept_brief_id",
  "generation_purpose",
  "status",
  "completed_at",
].join(", ");

function normalizedCandidates(
  data: unknown,
  error: unknown,
): Readonly<{ data: readonly unknown[] | null; error: DatabaseError | null }> {
  return !error && Array.isArray(data) && data.length <=
    FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT
    ? { data, error: null }
    : { data: null, error: { kind: "unavailable" } };
}

export function createFirstPreviewCustomerAccessDatabaseClient(
  supabase: SupabaseClient,
): FirstPreviewCustomerAccessDatabaseClient {
  return {
    async findBriefCandidates(publicReference, limit) {
      try {
        const { data, error } = await supabase
          .from("concept_briefs")
          .select(BRIEF_COLUMNS)
          .eq("public_reference", publicReference)
          .limit(limit);
        return normalizedCandidates(data, error);
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },
    async findOutputCandidates(outputId, limit) {
      try {
        const { data, error } = await supabase
          .from("ai_sketch_outputs")
          .select(OUTPUT_COLUMNS)
          .eq("id", outputId)
          .limit(limit);
        return normalizedCandidates(data, error);
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },
    async findJobCandidates(jobId, limit) {
      try {
        const { data, error } = await supabase
          .from("ai_sketch_jobs")
          .select(JOB_COLUMNS)
          .eq("id", jobId)
          .limit(limit);
        return normalizedCandidates(data, error);
      } catch {
        return { data: null, error: { kind: "unavailable" } };
      }
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readSafePositiveInteger(value: unknown): number | null {
  const normalized =
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  return Number.isSafeInteger(normalized) && Number(normalized) > 0
    ? Number(normalized)
    : null;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function exactlyOne(
  result: Readonly<{
    data: readonly unknown[] | null;
    error: DatabaseError | null;
  }>,
): unknown | null {
  return !result.error && result.data?.length === 1 ? result.data[0] : null;
}

function unavailableAuthorization(): FirstPreviewAssetAuthorizationResult {
  return { authorized: false };
}

class UnavailableFirstPreviewCustomerAccessAuthorizer
  implements FirstPreviewCustomerAccessAuthorizer
{
  readonly kind = "unavailable" as const;

  authorize(): Promise<FirstPreviewAssetAuthorizationResult> {
    return Promise.resolve(unavailableAuthorization());
  }
}

export function createUnavailableFirstPreviewCustomerAccessAuthorizer(): FirstPreviewCustomerAccessAuthorizer {
  return new UnavailableFirstPreviewCustomerAccessAuthorizer();
}

export class SupabaseFirstPreviewCustomerAccessAuthorizer
  implements FirstPreviewCustomerAccessAuthorizer
{
  readonly kind = "supabase" as const;
  private readonly clock: () => number;

  constructor(
    private readonly database: FirstPreviewCustomerAccessDatabaseClient,
    private readonly signingSecret: string,
    options: AuthorizerOptions = {},
  ) {
    this.clock = options.clock ?? (() => Math.floor(Date.now() / 1000));
  }

  async authorize(
    request: FirstPreviewGeneratedAssetAccessRequest,
  ): Promise<FirstPreviewAssetAuthorizationResult> {
    try {
      if (
        !isValidFirstPreviewPublicReference(request.publicReference) ||
        !isValidFirstPreviewAssetUuid(request.outputId)
      ) {
        return unavailableAuthorization();
      }

      const claims = verifyFirstPreviewCustomerAccessProof(
        request.accessProof,
        this.signingSecret,
        this.clock(),
      );
      if (
        !claims ||
        claims.publicReference !== request.publicReference
      ) {
        return unavailableAuthorization();
      }

      const briefResult = await this.database.findBriefCandidates(
        request.publicReference,
        FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT,
      );
      const brief = exactlyOne(briefResult);
      if (
        !isRecord(brief) ||
        brief.public_reference !== request.publicReference ||
        typeof brief.id !== "string" ||
        brief.id !== claims.briefId ||
        !isValidFirstPreviewAssetUuid(brief.id)
      ) {
        return unavailableAuthorization();
      }

      const outputResult = await this.database.findOutputCandidates(
        request.outputId,
        FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT,
      );
      const output = exactlyOne(outputResult);
      if (!isRecord(output)) return unavailableAuthorization();
      const asset = this.mapValidatedAsset(output, brief.id, request.outputId);
      if (!asset) return unavailableAuthorization();

      const jobId = output.job_id;
      if (typeof jobId !== "string" || !isValidFirstPreviewAssetUuid(jobId)) {
        return unavailableAuthorization();
      }
      const jobResult = await this.database.findJobCandidates(
        jobId,
        FIRST_PREVIEW_CUSTOMER_ACCESS_CANDIDATE_LIMIT,
      );
      const job = exactlyOne(jobResult);
      if (
        !isRecord(job) ||
        job.id !== jobId ||
        job.concept_brief_id !== brief.id ||
        job.generation_purpose !== "first_preview" ||
        job.status !== "succeeded" ||
        !isIsoTimestamp(job.completed_at)
      ) {
        return unavailableAuthorization();
      }

      return {
        authorized: true,
        descriptor: {
          publicReference: request.publicReference,
          conceptBriefId: brief.id,
          jobId,
          outputId: request.outputId,
          asset,
          readinessStatus: "first_preview_ready",
          isCurrentCustomerPreview: true,
        },
      };
    } catch {
      return unavailableAuthorization();
    }
  }

  private mapValidatedAsset(
    output: Record<string, unknown>,
    briefId: string,
    outputId: string,
  ): FirstPreviewStoredAssetMetadata | null {
    const jobId = output.job_id;
    const byteSize = readSafePositiveInteger(output.byte_size);
    if (
      output.id !== outputId ||
      output.concept_brief_id !== briefId ||
      typeof jobId !== "string" ||
      !isValidFirstPreviewAssetUuid(jobId) ||
      output.readiness_status !== "first_preview_ready" ||
      output.is_current_customer_preview !== true ||
      output.readiness_revoked_at !== null ||
      output.bucket_name !== FIRST_PREVIEW_ASSET_BUCKET ||
      output.mime_type !== "image/png" ||
      output.asset_validation_status !== "passed" ||
      byteSize === null ||
      byteSize > FIRST_PREVIEW_GENERATED_ASSET_MAX_BYTES ||
      output.width_px !== 1024 ||
      output.height_px !== 1024 ||
      typeof output.content_sha256 !== "string" ||
      !isValidFirstPreviewContentSha256(output.content_sha256) ||
      !isIsoTimestamp(output.asset_created_at) ||
      !isIsoTimestamp(output.asset_validated_at) ||
      !isIsoTimestamp(output.first_preview_ready_at) ||
      !isIsoTimestamp(output.created_at) ||
      Date.parse(output.asset_validated_at) <
        Date.parse(output.asset_created_at) ||
      output.object_path !==
        deriveFirstPreviewGeneratedAssetId({
          conceptBriefId: briefId,
          jobId,
          outputId,
        })
    ) {
      return null;
    }

    return {
      assetId: output.object_path,
      assetPersisted: true,
      bucketName: FIRST_PREVIEW_ASSET_BUCKET,
      mimeType: "image/png",
      byteSize,
      widthPx: 1024,
      heightPx: 1024,
      contentSha256: output.content_sha256,
      assetCreatedAt: output.asset_created_at,
      assetValidatedAt: output.asset_validated_at,
    };
  }
}

export function createSupabaseFirstPreviewCustomerAccessAuthorizer(
  database: FirstPreviewCustomerAccessDatabaseClient,
  signingSecret: string,
  options: AuthorizerOptions = {},
): FirstPreviewCustomerAccessAuthorizer {
  return new SupabaseFirstPreviewCustomerAccessAuthorizer(
    database,
    signingSecret,
    options,
  );
}

export function createFirstPreviewCustomerAccessAuthorizerBinding(
  options: AuthorizerBindingOptions,
): FirstPreviewCustomerAccessAuthorizer {
  if (!options.databaseClient || !options.signingSecret) {
    return createUnavailableFirstPreviewCustomerAccessAuthorizer();
  }

  return createSupabaseFirstPreviewCustomerAccessAuthorizer(
    options.databaseClient,
    options.signingSecret,
    { clock: options.clock },
  );
}
