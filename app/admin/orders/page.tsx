import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_ACCESS_COOKIE_NAME, isValidAdminAccessCookie } from "../../../lib/server/admin-access";
import { readAdminCommercialOrders } from "../../../lib/server/admin-commercial-orders";
import styles from "../briefs/admin-briefs.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminOrdersPage() {
  const session = (await cookies()).get(ADMIN_ACCESS_COOKIE_NAME)?.value;
  if (!isValidAdminAccessCookie(session)) redirect("/admin/briefs");
  const result = await readAdminCommercialOrders();
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.hero}>
      <p className={styles.eyebrow}>Protected commercial records</p>
      <h1>Commercial orders</h1>
      <p>Read-only records created after durable paid confirmation. An order record does not approve CAD, production or shipment.</p>
      <Link href="/admin/briefs">Back to Brief review</Link>
    </header>
    {result.ok === false ? <section className={styles.notice} role="alert"><h2>Order records unavailable</h2><p>Records could not be verified. This does not mean there are no orders. No demo or browser-stored orders are shown.</p></section>
      : result.orders.length === 0 ? <section className={styles.notice}><h2>No recorded commercial orders</h2><p>The database returned no order records.</p></section>
      : <><p>Showing the latest {result.orders.length} verified records{result.hasMore ? "; additional records exist" : ""}.</p>
        <ol style={{ paddingInlineStart: "1.25rem", display: "grid", gap: "1rem" }}>{result.orders.map(order => <li key={order.orderReference} className={styles.notice} style={{ overflowWrap: "anywhere" }}>
          <h2>{order.orderReference}</h2>
          <p>Paid order recorded — {order.currency} {order.amount}</p>
          <p>Quotation: {order.quoteReference}</p>
          <p>Recorded: <time dateTime={order.recordedAt}>{order.recordedAt}</time></p>
          <Link href={`/admin/briefs/${encodeURIComponent(order.publicReference)}`}>{order.publicReference}</Link>
        </li>)}</ol></>}
  </div></main>;
}
