import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ACCESS_COOKIE_NAME, isValidAdminAccessCookie } from "../../../../../lib/server/admin-access";
import { readDeliveryHandoff, recordDeliveryHandoff } from "../../../../../lib/server/admin-delivery-handoff";
import styles from "../../../briefs/admin-briefs.module.css";
export const dynamic = "force-dynamic";
export const revalidate = 0;
async function requireAdmin() {
  if (!isValidAdminAccessCookie((await cookies()).get(ADMIN_ACCESS_COOKIE_NAME)?.value)) redirect("/admin/briefs");
}
async function saveDeliveryHandoff(formData: FormData) {
  "use server";
  await requireAdmin();
  const orderReference = formData.get("orderReference");
  if (typeof orderReference !== "string" || !/^NOVORA-O-[A-F0-9]{24}$/.test(orderReference)) redirect("/admin/orders");
  const result = await recordDeliveryHandoff(orderReference, { deliveryReference: formData.get("deliveryReference"), manualConfirmation: formData.get("manualConfirmation") === "confirmed" });
  redirect(`/admin/orders/${encodeURIComponent(orderReference)}/delivery${result === "recorded" || result === "already_recorded" ? "" : "?check=required"}`);
}
export default async function DeliveryHandoffPage({ params, searchParams }: {
  params: Promise<{ orderReference: string }>; searchParams?: Promise<{ check?: string }>;
}) {
  await requireAdmin();
  const { orderReference } = await params, result = await readDeliveryHandoff(orderReference);
  const check = (await searchParams)?.check === "required";
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.hero}><h1>Manual delivery handoff record</h1><Link href="/admin/orders">Back to commercial orders</Link>
      <p>Record a separately verified offline handover. A production handoff record alone does not establish that goods were produced, released, shipped or received.</p></header>
    {result.ok === false ? <section className={styles.notice} role="alert"><h2>Delivery handoff unavailable</h2><p>The paid order or prior handoff chain could not be verified. No delivery success is assumed.</p></section> :
      <section className={styles.notice} style={{ overflowWrap: "anywhere" }}>
        <h2>{result.order.orderReference}</h2><p>Confirmed quotation: {result.order.quoteReference}</p>
        <p>Production handoff reference: {result.productionHandoff.handoffReference}</p>
        <Link href={`/admin/orders/${encodeURIComponent(result.order.orderReference)}/production`}>View production handoff record</Link>
        {check && <p role="alert">The write was not confirmed or conflicts with the persisted record. Check the record below. No automatic retry was made.</p>}
        {result.handoff ? <><h3>Offline delivery handoff recorded</h3><p>{result.handoff.deliveryReference}</p><time dateTime={result.handoff.recordedAt}>{result.handoff.recordedAt}</time>
          <p>This is the recorded offline reference, not carrier verification, shipment confirmation or proof of customer receipt.</p></> : <>
          <p>No delivery handoff is recorded. Check the actual offline release and handover against this exact paid order before recording its reference.</p>
          {!check && <form action={saveDeliveryHandoff}>
            <input type="hidden" name="orderReference" value={result.order.orderReference}/>
            <label htmlFor="deliveryReference">Offline delivery handoff reference</label>
            <input id="deliveryReference" name="deliveryReference" required maxLength={120} pattern={"[A-Za-z0-9][A-Za-z0-9 ._\\/\\-]{0,119}"} style={{ maxWidth: "100%", boxSizing: "border-box" }}/>
            <p><label><input type="checkbox" name="manualConfirmation" value="confirmed" required/> I have checked the actual offline release and delivery handover for this order.</label></p>
            <p>This records the reference only. It dispatches no goods, sends no message and cannot overwrite an existing record.</p>
            <button type="submit">Record offline delivery handoff</button>
          </form>}
          {check && <p>Outcome remains unconfirmed. Preserve the reference and reconcile the database before submitting again.</p>}
        </>}
      </section>}
  </div></main>;
}
