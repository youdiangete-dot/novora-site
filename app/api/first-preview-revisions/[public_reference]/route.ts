import { createRevisionHttpHandlers } from "../../../../lib/server/ai-sketch/first-preview-revision-http";
import { createProductionRevisionHttpService } from "../../../../lib/server/ai-sketch/first-preview-revision-runtime";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ public_reference: string }> };
const handlers = createRevisionHttpHandlers(createProductionRevisionHttpService);
export async function POST(request: Request, context: Context) { return handlers.POST(request, (await context.params).public_reference); }
export async function GET(request: Request, context: Context) { return handlers.GET(request, (await context.params).public_reference); }
