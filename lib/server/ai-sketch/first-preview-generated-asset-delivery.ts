import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
  type FirstPreviewGeneratedAssetStore,
} from "./first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
} from "./first-preview-customer-access-contract";
import type {
  FirstPreviewCustomerAccessAuthorizer,
} from "./supabase-first-preview-customer-access";
import { FIRST_PREVIEW_ASSET_BUCKET } from "./first-preview-persistence-contract";

export type FirstPreviewGeneratedAssetDeliveryResult =
  | Readonly<{
      ok: true;
      body: Uint8Array;
      contentLength: number;
    }>
  | Readonly<{ ok: false }>;

export interface FirstPreviewGeneratedAssetDeliveryService {
  readonly kind: "unavailable" | "supabase";
  read(input: Readonly<{
    publicReference: string;
    outputId: string;
    accessProof: string;
  }>): Promise<FirstPreviewGeneratedAssetDeliveryResult>;
}

type DeliveryBindingOptions = Readonly<{
  signingSecret?: string | null;
  adminClient?: SupabaseClient | null;
  bucketName?: string | null;
  authorizer?: FirstPreviewCustomerAccessAuthorizer | null;
  generatedAssetStore?: FirstPreviewGeneratedAssetStore | null;
}>;

type RouteHandlerDependencies = Readonly<{
  readAccessProof: () => Promise<string | null>;
  createService: () =>
    | FirstPreviewGeneratedAssetDeliveryService
    | Promise<FirstPreviewGeneratedAssetDeliveryService>;
}>;

type RouteContext = Readonly<{
  params:
    | Readonly<{ publicReference?: string; outputId?: string }>
    | Promise<Readonly<{ publicReference?: string; outputId?: string }>>;
}>;

class UnavailableFirstPreviewGeneratedAssetDeliveryService
  implements FirstPreviewGeneratedAssetDeliveryService
{
  readonly kind = "unavailable" as const;

  read(): Promise<FirstPreviewGeneratedAssetDeliveryResult> {
    return Promise.resolve({ ok: false });
  }
}

class SupabaseFirstPreviewGeneratedAssetDeliveryService
  implements FirstPreviewGeneratedAssetDeliveryService
{
  readonly kind = "supabase" as const;

  constructor(private readonly store: FirstPreviewGeneratedAssetStore) {}

  async read(input: {
    publicReference: string;
    outputId: string;
    accessProof: string;
  }): Promise<FirstPreviewGeneratedAssetDeliveryResult> {
    try {
      const result = await this.store.readAuthorizedPng(input);
      return result.ok &&
        result.value.contentLength === result.value.body.byteLength
        ? {
            ok: true,
            body: new Uint8Array(result.value.body),
            contentLength: result.value.contentLength,
          }
        : { ok: false };
    } catch {
      return { ok: false };
    }
  }
}

export function createUnavailableFirstPreviewGeneratedAssetDeliveryService(): FirstPreviewGeneratedAssetDeliveryService {
  return new UnavailableFirstPreviewGeneratedAssetDeliveryService();
}

export function createFirstPreviewGeneratedAssetDeliveryServiceBinding(
  options: DeliveryBindingOptions,
): FirstPreviewGeneratedAssetDeliveryService {
  if (
    !options.signingSecret ||
    !options.adminClient ||
    options.bucketName !== FIRST_PREVIEW_ASSET_BUCKET ||
    !options.authorizer ||
    options.authorizer.kind !== "supabase" ||
    !options.generatedAssetStore ||
    options.generatedAssetStore.kind !== "supabase"
  ) {
    return createUnavailableFirstPreviewGeneratedAssetDeliveryService();
  }

  return new SupabaseFirstPreviewGeneratedAssetDeliveryService(
    options.generatedAssetStore,
  );
}

export async function createFirstPreviewGeneratedAssetDeliveryService(): Promise<FirstPreviewGeneratedAssetDeliveryService> {
  const signingSecret =
    process.env[FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV]?.trim() ||
    null;
  const bucketName =
    process.env.SUPABASE_STORAGE_BUCKET_AI_SKETCHES?.trim() || null;
  if (!signingSecret || bucketName !== FIRST_PREVIEW_ASSET_BUCKET) {
    return createUnavailableFirstPreviewGeneratedAssetDeliveryService();
  }

  const [
    { createSupabaseAdminClientOrNull },
    { createFirstPreviewCustomerAccessAuthorizer },
    { createFirstPreviewGeneratedAssetStore },
  ] = await Promise.all([
    import("../supabase"),
    import("./first-preview-customer-access"),
    import("./first-preview-generated-assets"),
  ]);
  const adminClient = createSupabaseAdminClientOrNull();
  if (!adminClient) {
    return createUnavailableFirstPreviewGeneratedAssetDeliveryService();
  }
  const authorizer = createFirstPreviewCustomerAccessAuthorizer({
    signingSecret,
    supabaseClient: adminClient,
  });
  const generatedAssetStore = createFirstPreviewGeneratedAssetStore({
    authorizer,
    supabaseClient: adminClient,
  });

  return createFirstPreviewGeneratedAssetDeliveryServiceBinding({
    signingSecret,
    adminClient,
    bucketName,
    authorizer,
    generatedAssetStore,
  });
}

function opaqueEmptyResponse(status: 404 | 405): Response {
  return new Response(null, {
    status,
    headers: {
      "Content-Length": "0",
      "Cache-Control": FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function createFirstPreviewGeneratedAssetRouteHandler(
  dependencies: RouteHandlerDependencies,
): Readonly<{
  get: (request: Request, context: RouteContext) => Promise<Response>;
  unsupported: () => Response;
}> {
  return {
    async get(request, context) {
      let url: URL;
      try {
        url = new URL(request.url);
      } catch {
        return opaqueEmptyResponse(404);
      }
      const params = await context.params;
      const publicReference = params.publicReference ?? "";
      const outputId = params.outputId ?? "";
      if (
        url.search !== "" ||
        !isValidFirstPreviewPublicReference(publicReference) ||
        !isValidFirstPreviewAssetUuid(outputId)
      ) {
        return opaqueEmptyResponse(404);
      }

      let accessProof: string | null;
      try {
        accessProof = await dependencies.readAccessProof();
      } catch {
        return opaqueEmptyResponse(404);
      }
      if (!accessProof) return opaqueEmptyResponse(404);

      let service: FirstPreviewGeneratedAssetDeliveryService;
      try {
        service = await dependencies.createService();
      } catch {
        return opaqueEmptyResponse(404);
      }
      if (service.kind !== "supabase") return opaqueEmptyResponse(404);

      let result: FirstPreviewGeneratedAssetDeliveryResult;
      try {
        result = await service.read({
          publicReference,
          outputId,
          accessProof,
        });
      } catch {
        return opaqueEmptyResponse(404);
      }
      if (!result.ok) return opaqueEmptyResponse(404);

      return new Response(Buffer.from(result.body), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(result.contentLength),
          "Content-Disposition":
            'inline; filename="novora-first-preview.png"',
          "Cache-Control": FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
          "X-Content-Type-Options": "nosniff",
          "Cross-Origin-Resource-Policy": "same-origin",
          "Referrer-Policy": "no-referrer",
          Vary: "Cookie",
        },
      });
    },
    unsupported() {
      return opaqueEmptyResponse(405);
    },
  };
}

export { FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME };
