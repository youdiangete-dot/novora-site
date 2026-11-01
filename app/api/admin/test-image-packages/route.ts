import { createTestPackageHandlers } from "../../../../lib/server/image-packages/routes";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const POST = createTestPackageHandlers().manualPOST;
