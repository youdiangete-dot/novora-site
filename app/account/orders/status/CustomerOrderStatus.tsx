"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import InvitationAccess, { type BrowserInvitationState } from "../../../../components/InvitationAccess";
import type { CustomerOrderRecord } from "../../../../lib/server/customer-commercial-order-status";
import styles from "../../../design/my-images/page.module.css";

const timestamp = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v) && Number.isFinite(Date.parse(v));
function validRecord(v: CustomerOrderRecord) {
  return v && /^NOVORA-O-[A-F0-9]{24}$/.test(v.orderReference) && timestamp(v.recordedAt) &&
    (v.cadHandoffRecordedAt === null || timestamp(v.cadHandoffRecordedAt)) &&
    (v.productionHandoffRecordedAt === null || (v.cadHandoffRecordedAt !== null && timestamp(v.productionHandoffRecordedAt)));
}
export default function CustomerOrderStatus() {
  const [access, setAccess] = useState<BrowserInvitationState>({ state: "checking" });
  const [reference, setReference] = useState(""), [orders, setOrders] = useState<CustomerOrderRecord[]>([]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [hasMore, setHasMore] = useState(false);
  const epoch = useRef(0), controller = useRef<AbortController | null>(null);
  const clear = useCallback(() => { epoch.current++; controller.current?.abort(); setOrders([]); setHasMore(false); setBusy(false); setMessage(""); }, []);
  const onAccess = useCallback((next: BrowserInvitationState) => { clear(); setAccess(next); }, [clear]);
  useEffect(() => () => { epoch.current++; controller.current?.abort(); }, []);
  async function read(event: React.FormEvent) {
    event.preventDefault();
    if (busy || access.state !== "verified" || !/^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/.test(reference)) return;
    const version = epoch.current, c = new AbortController(), requested = reference;
    controller.current = c; setBusy(true); setMessage(""); setOrders([]); setHasMore(false);
    const timer = setTimeout(() => c.abort(), 20_000), current = () => version === epoch.current;
    try {
      const response = await fetch(`/api/customer-commercial-order-status?${new URLSearchParams({ publicReference: requested })}`, {
        headers: { Authorization: `Bearer ${access.access.credential}` }, cache: "no-store", credentials: "omit", redirect: "error", signal: c.signal,
      });
      const body = await response.json();
      if (!response.ok || body.state !== "ready" || body.publicReference !== requested || !Array.isArray(body.orders) || body.orders.length > 25 ||
          body.orders.some((v: CustomerOrderRecord) => !validRecord(v)) || new Set(body.orders.map((v: CustomerOrderRecord) => v.orderReference)).size !== body.orders.length || typeof body.hasMore !== "boolean") throw Error("Unavailable");
      if (current() && !c.signal.aborted) { setOrders(body.orders); setHasMore(body.hasMore); setMessage(body.orders.length ? "Your verified order records are shown below." : "No paid order record was found for this owned Brief."); }
    } catch { if (current()) setMessage("Order records are unavailable. This does not mean there is no order. Re-enter your invitation if needed; no request, payment or handoff was submitted."); }
    finally { clearTimeout(timer); if (current()) setBusy(false); }
  }
  const date = (value: string | null) => value ? <time dateTime={value}>{value}</time> : "No record available";
  return <main className={styles.page}>
    <h1>My commercial order records</h1>
    <p>Use your own invitation and Brief reference. This page reads existing records only.</p>
    <p>A CAD or production handoff record is not CAD completion, production approval, manufacturing progress, shipment or delivery confirmation. Contact the studio through your existing contact channel for actual progress.</p>
    <InvitationAccess onChange={onAccess} disabled={busy}/>
    <form onSubmit={read}>
      <label htmlFor="order-brief-reference">Brief reference</label>
      <input id="order-brief-reference" value={reference} required maxLength={32} pattern="NOVORA-CB-[0-9]{8}-[A-Z0-9]{4}" autoComplete="off"
        onChange={event => { clear(); setReference(event.target.value); }} style={{ maxWidth: "100%", boxSizing: "border-box" }}/>
      <button disabled={busy || access.state !== "verified"} type="submit">{busy ? "Reading..." : "Read my order records"}</button>
    </form>
    <p role="status">{message}</p>
    <ul className={styles.list}>{orders.map(order => <li key={order.orderReference}>
      <h2>{order.orderReference}</h2>
      <p>Paid order recorded: {date(order.recordedAt)}</p>
      <p>CAD handoff recorded: {date(order.cadHandoffRecordedAt)}</p>
      <p>Production handoff recorded: {date(order.productionHandoffRecordedAt)}</p>
    </li>)}</ul>
    {hasMore && <p>Only the latest 25 verified records are shown. Contact the studio for earlier records.</p>}
  </main>;
}
