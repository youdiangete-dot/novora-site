import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ACCESS_COOKIE_NAME, isValidAdminAccessCookie } from "../../../../../lib/server/admin-access";
import { readCadHandoff, recordCadHandoff } from "../../../../../lib/server/admin-cad-handoff";
import styles from "../../../briefs/admin-briefs.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
async function requireAdmin() {
  if (!isValidAdminAccessCookie((await cookies()).get(ADMIN_ACCESS_COOKIE_NAME)?.value)) redirect("/admin/briefs");
}
async function saveCadHandoff(formData: FormData) {
  "use server";
  await requireAdmin();
  const orderReference = formData.get("orderReference");
  if (typeof orderReference !== "string" || !/^NOVORA-O-[A-F0-9]{24}$/.test(orderReference)) redirect("/admin/orders");
  const result = await recordCadHandoff(orderReference, formData.get("handoffReference"));
  // A URL parameter can only show a warning. Success always comes from a fresh persisted read.
  redirect(`/admin/orders/${encodeURIComponent(orderReference)}/cad${result === "recorded" || result === "already_recorded" ? "" : "?check=required"}`);
}
export default async function CadHandoffPage({ params, searchParams }: {
  params: Promise<{ orderReference: string }>; searchParams?: Promise<{ check?: string }>;
}) {
  await requireAdmin();
  const { orderReference } = await params;
  const result = await readCadHandoff(orderReference);
  const check = (await searchParams)?.check === "required";
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.hero}><h1>Manual CAD handoff</h1><Link href="/admin/orders">Back to commercial orders</Link>
      <p>Record an actual offline handoff of the confirmed order. This does not send files, complete CAD or approve production.</p></header>
    {result.ok === false ? <section className={styles.notice} role="alert"><h2>CAD handoff unavailable</h2><p>The paid order or handoff record could not be verified. No handoff success is assumed.</p></section> :
      <section className={styles.notice} style={{ overflowWrap: "anywhere" }}>
        <h2>{result.order.orderReference}</h2><p>Confirmed quotation: {result.order.quoteReference}</p>
        <Link href={`/admin/briefs/${encodeURIComponent(result.order.publicReference)}`}>{result.order.publicReference}</Link>
        {check && <p role="alert">The requested write was not confirmed or conflicts with the persisted handoff. Check the record shown below before any further action. No automatic retry was made.</p>}
        {result.handoff ? <><h3>CAD handoff recorded</h3><p>{result.handoff.handoffReference}</p><time dateTime={result.handoff.recordedAt}>{result.handoff.recordedAt}</time>
          <p>This is the recorded handoff reference, not CAD completion or production approval.</p>
          <Link href={`/admin/orders/${encodeURIComponent(result.order.orderReference)}/production`}>Manual production handoff record</Link></> : <>
          <p>No CAD handoff is recorded. Use the exact quotation and confirmed specifications associated with this order, rather than a newer concept image.</p>
          {!check && <form action={saveCadHandoff}>
            <input type="hidden" name="orderReference" value={result.order.orderReference}/>
            <label htmlFor="handoffReference">Offline CAD handoff reference</label>
            <input id="handoffReference" name="handoffReference" required maxLength={120} pattern={"[A-Za-z0-9][A-Za-z0-9 ._\\/\\-]{0,119}"} style={{ maxWidth: "100%", boxSizing: "border-box" }}/>
            <p>Enter the traceable reference from the actual manual handoff. The recorded reference cannot be overwritten here.</p>
            <button type="submit">Record completed manual handoff</button>
          </form>}
          {check && <p>Outcome remains unconfirmed. Preserve the reference and reconcile the database before submitting again.</p>}
        </>}
      </section>}
  </div></main>;
}
