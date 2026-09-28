import type { SupabaseClient } from "@supabase/supabase-js";

import {
  FIRST_PREVIEW_GENERATED_ASSET_CACHE_CONTROL,
  isValidFirstPreviewAssetUuid,
  isValidFirstPreviewPublicReference,
  reportFirstPreviewAssetDeliveryDiagnosticSafely,
  type FirstPreviewAssetDeliveryDiagnostic,
  type FirstPreviewAssetDeliveryDiagnosticReporter,
  type FirstPreviewAssetDeliveryFailureCode,
  type FirstPreviewGeneratedAssetFailureCode,
  type FirstPreviewGeneratedAssetStore,
} from "./first-preview-generated-assets-contract";
import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  FIRST_PREVIEW_CUSTOMER_ACCESS_SIGNING_SECRET_ENV,
} from "./first-preview-customer-access-contract";
import type {
  FirstPreviewCustomerAccessAuthorizer,
} from "./supabase-first-preview-customer-access";
import type {
  FirstPreviewCustomerView,
} from "./first-preview-customer-view";
import { FIRST_PREVIEW_ASSET_BUCKET } from "./first-preview-persistence-contract";

export type FirstPreviewGeneratedAssetDeliveryResult =
  | Readonly<{
      ok: true;
      body: Uint8Array;
      contentLength: number;
    }>
  | Readonly<{
      ok: false;
      diagnostic?: FirstPreviewAssetDeliveryDiagnostic;
    }>;

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
  reportDiagnostic?: FirstPreviewAssetDeliveryDiagnosticReporter;
}>;

type RouteContext = Readonly<{
  params:
    | Readonly<{ publicReference?: string; outputId?: string }>
    | Promise<Readonly<{ publicReference?: string; outputId?: string }>>;
}>;

type CurrentRouteContext = Readonly<{
  params:
    | Readonly<{ publicReference?: string }>
    | Promise<Readonly<{ publicReference?: string }>>;
}>;

type CurrentRouteHandlerDependencies = Readonly<{
  readCustomerView: (publicReference: string) => Promise<FirstPreviewCustomerView>;
  readAccessProof: () => Promise<string | null>;
  createService: () =>
    | FirstPreviewGeneratedAssetDeliveryService
    | Promise<FirstPreviewGeneratedAssetDeliveryService>;
  reportDiagnostic?: FirstPreviewAssetDeliveryDiagnosticReporter;
}>;

function diagnostic(
  assetDeliveryStage: FirstPreviewAssetDeliveryDiagnostic["assetDeliveryStage"],
  assetDeliveryFailureCode: FirstPreviewAssetDeliveryFailureCode,
): FirstPreviewAssetDeliveryDiagnostic {
  return { assetDeliveryStage, assetDeliveryFailureCode };
}

function normalizeReadFailureCode(
  code: FirstPreviewGeneratedAssetFailureCode,
): FirstPreviewAssetDeliveryFailureCode {
  switch (code) {
    case "access_denied":
    case "privacy_failure":
    case "asset_not_found":
    case "storage_unavailable":
    case "asset_integrity_failure":
    case "invalid_input":
      return code;
    case "invalid_persisted_png":
    case "idempotency_conflict":
      return "asset_integrity_failure";
  }
}

export function reportFirstPreviewAssetDeliveryDiagnostic(
  value: FirstPreviewAssetDeliveryDiagnostic,
): void {
  console.info("NOVORA First Preview asset delivery diagnostic.", value);
}

class UnavailableFirstPreviewGeneratedAssetDeliveryService
  implements FirstPreviewGeneratedAssetDeliveryService
{
  readonly kind = "unavailable" as const;

  read(): Promise<FirstPreviewGeneratedAssetDeliveryResult> {
    return Promise.resolve({
      ok: false,
      diagnostic: diagnostic("service_binding", "unavailable_binding"),
    });
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
      let storeDiagnostic: FirstPreviewAssetDeliveryDiagnostic | undefined;
      const result = await this.store.readAuthorizedPng(input, (value) => {
        storeDiagnostic = value;
      });
      if (result.ok === false) {
        return {
          ok: false,
          diagnostic: storeDiagnostic ?? diagnostic(
            "outer_exception",
            normalizeReadFailureCode(result.code),
          ),
        };
      }
      if (result.value.contentLength !== result.value.body.byteLength) {
        return {
          ok: false,
          diagnostic: diagnostic(
            "image_integrity",
            "asset_integrity_failure",
          ),
        };
      }
      return {
        ok: true,
        body: new Uint8Array(result.value.body),
        contentLength: result.value.contentLength,
      };
    } catch {
      return {
        ok: false,
        diagnostic: diagnostic("outer_exception", "storage_unavailable"),
      };
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
  const reportDiagnostic = (
    value: FirstPreviewAssetDeliveryDiagnostic,
  ): void => reportFirstPreviewAssetDeliveryDiagnosticSafely(
    dependencies.reportDiagnostic ?? reportFirstPreviewAssetDeliveryDiagnostic,
    value,
  );

  return {
    async get(request, context) {
      let url: URL;
      try {
        url = new URL(request.url);
      } catch {
        reportDiagnostic(diagnostic("outer_exception", "invalid_input"));
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
        reportDiagnostic(diagnostic("access_proof", "invalid_input"));
        return opaqueEmptyResponse(404);
      }

      let accessProof: string | null;
      try {
        accessProof = await dependencies.readAccessProof();
      } catch {
        reportDiagnostic(diagnostic("access_proof", "access_denied"));
        return opaqueEmptyResponse(404);
      }
      if (!accessProof) {
        reportDiagnostic(diagnostic("access_proof", "access_denied"));
        return opaqueEmptyResponse(404);
      }

      let service: FirstPreviewGeneratedAssetDeliveryService;
      try {
        service = await dependencies.createService();
      } catch {
        reportDiagnostic(diagnostic("service_binding", "unavailable_binding"));
        return opaqueEmptyResponse(404);
      }
      if (service.kind !== "supabase") {
        reportDiagnostic(diagnostic("service_binding", "unavailable_binding"));
        return opaqueEmptyResponse(404);
      }

      let result: FirstPreviewGeneratedAssetDeliveryResult;
      try {
        result = await service.read({
          publicReference,
          outputId,
          accessProof,
        });
      } catch {
        reportDiagnostic(diagnostic("outer_exception", "storage_unavailable"));
        return opaqueEmptyResponse(404);
      }
      if (result.ok === false) {
        reportDiagnostic(
          result.diagnostic ??
            diagnostic("outer_exception", "storage_unavailable"),
        );
        return opaqueEmptyResponse(404);
      }

      reportDiagnostic(diagnostic("delivered", "none"));

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

export function createFirstPreviewCurrentAssetRouteHandler(
  dependencies: CurrentRouteHandlerDependencies,
): Readonly<{
  get: (request: Request, context: CurrentRouteContext) => Promise<Response>;
  unsupported: () => Response;
}> {
  const reportDiagnostic = (
    value: FirstPreviewAssetDeliveryDiagnostic,
  ): void => reportFirstPreviewAssetDeliveryDiagnosticSafely(
    dependencies.reportDiagnostic ?? reportFirstPreviewAssetDeliveryDiagnostic,
    value,
  );
  const protectedAssetHandler = createFirstPreviewGeneratedAssetRouteHandler({
    readAccessProof: dependencies.readAccessProof,
    createService: dependencies.createService,
    reportDiagnostic,
  });

  return {
    async get(request, context) {
      try {
        const url = new URL(request.url);
        const params = await context.params;
        const publicReference = params.publicReference ?? "";
        if (
          url.search !== "" ||
          !isValidFirstPreviewPublicReference(publicReference)
        ) {
          reportDiagnostic(diagnostic("access_proof", "invalid_input"));
          return opaqueEmptyResponse(404);
        }

        const customerView = await dependencies.readCustomerView(publicReference);
        if (
          customerView.state !== "ready" ||
          customerView.assetRequest.publicReference !== publicReference ||
          !isValidFirstPreviewAssetUuid(customerView.assetRequest.outputId)
        ) {
          reportDiagnostic(
            diagnostic("initial_authorization", "access_denied"),
          );
          return opaqueEmptyResponse(404);
        }

        return protectedAssetHandler.get(request, {
          params: {
            publicReference,
            outputId: customerView.assetRequest.outputId,
          },
        });
      } catch {
        reportDiagnostic(
          diagnostic("outer_exception", "storage_unavailable"),
        );
        return opaqueEmptyResponse(404);
      }
    },
    unsupported: protectedAssetHandler.unsupported,
  };
}

export { FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME };
