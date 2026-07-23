import { cookies } from "next/headers";

import {
  FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME,
  createFirstPreviewGeneratedAssetDeliveryService,
  createFirstPreviewGeneratedAssetRouteHandler,
} from "../../../../../lib/server/ai-sketch/first-preview-generated-asset-delivery";

export const dynamic = "force-dynamic";

const handler = createFirstPreviewGeneratedAssetRouteHandler({
  async readAccessProof() {
    const cookieStore = await cookies();
    return (
      cookieStore.get(FIRST_PREVIEW_CUSTOMER_ACCESS_COOKIE_NAME)?.value ?? null
    );
  },
  createService: createFirstPreviewGeneratedAssetDeliveryService,
});

export const GET = handler.get;
export const HEAD = handler.unsupported;
export const POST = handler.unsupported;
export const PUT = handler.unsupported;
export const PATCH = handler.unsupported;
export const DELETE = handler.unsupported;
export const OPTIONS = handler.unsupported;
