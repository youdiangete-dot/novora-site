import { createCustomerImageLibraryHandlers } from "./handler";
export const dynamic="force-dynamic";
const handler=createCustomerImageLibraryHandlers();
export const GET=handler.handle;
export const POST=handler.handle;
