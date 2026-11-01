import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ACCESS_COOKIE_NAME, isValidAdminAccessCookie } from "../../../lib/server/admin-access";
import TestImagePackageOwnerPanel from "../../../components/TestImagePackageOwnerPanel";
export const dynamic = "force-dynamic";
export default async function TestPackageOwnerPage() {
  const jar = await cookies();
  if (!isValidAdminAccessCookie(jar.get(ADMIN_ACCESS_COOKIE_NAME)?.value)) redirect("/admin/briefs");
  return <main><TestImagePackageOwnerPanel /></main>;
}
