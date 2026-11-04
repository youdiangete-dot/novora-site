import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ACCESS_COOKIE_NAME, isValidAdminAccessCookie } from "../../../../../lib/server/admin-access";
import { readProductionHandoff, recordProductionHandoff } from "../../../../../lib/server/admin-production-handoff";
import styles from "../../../briefs/admin-briefs.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
async function requireAdmin() {
  if (!isValidAdminAccessCookie((await cookies()).get(ADMIN_ACCESS_COOKIE_NAME)?.value)) redirect("/admin/briefs");
}
async function saveProductionHandoff(formData: FormData) {
  "use server";
  await requireAdmin();
  const orderReference = formData.get("orderReference");
  if (typeof orderReference !== "string" || !/^NOVORA-O-[A-F0-9]{24}$/.test(orderReference)) redirect("/admin/orders");
  const result = await recordProductionHandoff(orderReference, {
    decisionReference: formData.get("decisionReference"), handoffReference: formData.get("handoffReference"),
    manualConfirmation: formData.get("manualConfirmation") === "confirmed",
  });
  redirect(`/admin/orders/${encodeURIComponent(orderReference)}/production${result === "recorded" || result === "already_recorded" ? "" : "?check=required"}`);
}
export default async function ProductionHandoffPage({ params, searchParams }: {
  params: Promise<{ orderReference: string }>; searchParams?: Promise<{ check?: string }>;
}) {
  await requireAdmin();
  const { orderReference } = await params;
  const result = await readProductionHandoff(orderReference);
  const check = (await searchParams)?.check === "required";
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.hero}><h1>Manual production handoff</h1><Link href="/admin/orders">Back to commercial orders</Link>
      <p>Record an actual offline handoff with its separate manual decision reference. A CAD handoff record alone does not establish CAD completion or authorize production.</p></header>
    {result.ok === false ? <section className={styles.notice} role="alert"><h2>Production handoff unavailable</h2><p>The paid order, CAD handoff or production record could not be verified. No production handoff success is assumed.</p></section> :
      <section className={styles.notice} style={{ overflowWrap: "anywhere" }}>
        <h2>{result.order.orderReference}</h2><p>Confirmed quotation: {result.order.quoteReference}</p>
        <p>Recorded CAD handoff: {result.cadHandoff.handoffReference}</p>
        <Link href={`/admin/orders/${encodeURIComponent(result.order.orderReference)}/cad`}>View CAD handoff record</Link>
        {check && <p role="alert">The requested write was not confirmed or conflicts with the persisted handoff. Check the record below. No automatic retry was made.</p>}
        {result.handoff ? <><h3>Production handoff recorded</h3><p>Offline manual decision reference: {result.handoff.decisionReference}</p>
          <p>Offline production handoff reference: {result.handoff.handoffReference}</p><time dateTime={result.handoff.recordedAt}>{result.handoff.recordedAt}</time>
          <p>This is a handoff record, not CAD completion, production approval, manufacturing progress or shipment confirmation.</p></> : <>
          <p>No production handoff is recorded. Confirm the required CAD and production decisions offline first, using the specifications and quotation bound to this paid order.</p>
          {!check && <form action={saveProductionHandoff}>
            <input type="hidden" name="orderReference" value={result.order.orderReference}/>
            <label htmlFor="decisionReference">Offline manual decision reference</label>
            <input id="decisionReference" name="decisionReference" required maxLength={120} pattern={"[A-Za-z0-9][A-Za-z0-9 ._\\/\\-]{0,119}"} style={{ maxWidth: "100%", boxSizing: "border-box" }}/>
            <label htmlFor="handoffReference">Offline production handoff reference</label>
            <input id="handoffReference" name="handoffReference" required maxLength={120} pattern={"[A-Za-z0-9][A-Za-z0-9 ._\\/\\-]{0,119}"} style={{ maxWidth: "100%", boxSizing: "border-box" }}/>
            <p><label><input type="checkbox" name="manualConfirmation" value="confirmed" required/> I have checked the separate offline manual decision and completed this actual production handoff.</label></p>
            <p>This records the supplied references only; it sends no files, grants no approval and cannot overwrite an existing handoff.</p>
            <button type="submit">Record manual production handoff</button>
          </form>}
          {check && <p>Outcome remains unconfirmed. Preserve both references and reconcile the database before submitting again.</p>}
        </>}
      </section>}
  </div></main>;
}
