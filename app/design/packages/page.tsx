import Link from "next/link";
import TestImagePackagePanel from "../../../components/TestImagePackagePanel";
export default function TestPackagesPage() {
  return <main><TestImagePackagePanel /><p style={{ textAlign: "center" }}><Link href="/design/brief">Return to your concept brief</Link></p></main>;
}
