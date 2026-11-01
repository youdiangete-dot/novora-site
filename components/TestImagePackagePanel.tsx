"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import InvitationAccess, { type BrowserInvitationState } from "./InvitationAccess";
import styles from "./test-image-packages.module.css";

type PackageView = { state: string; purchaseId: string | null; initialRemaining: number;
  revisionRemaining: number; expiresAt: string | null; hold: "none" | "pending" | "unknown"; paypalConfigured: boolean };

export default function TestImagePackagePanel() {
  const [invitation, setInvitation] = useState<BrowserInvitationState>({ state: "checking" });
  const [provider, setProvider] = useState("paypal_sandbox");
  const [view, setView] = useState<PackageView | null>(null);
  const [order, setOrder] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const sequence = useRef(0);
  const updateInvitation = useCallback((next: BrowserInvitationState) => {
    sequence.current++; setInvitation(next); setView(null); setOrder(null); setMessage("");
  }, []);
  const access = invitation.state === "verified" ? invitation.access : null;
  useEffect(() => {
    if (!access) return;
    const controller = new AbortController(), current = ++sequence.current;
    fetch(`/api/test-image-packages?provider=${provider}`, {
      headers: { Authorization: `Bearer ${access.credential}` }, cache: "no-store", signal: controller.signal,
    }).then(response => response.json()).then(result => {
      if (current !== sequence.current) return;
      if (result.ok) setView(result);
      else setMessage("Package tests are unavailable. No payment has been confirmed.");
    }).catch(() => { if (!controller.signal.aborted && current === sequence.current) setMessage("Package status is unavailable."); });
    return () => controller.abort();
  }, [access, provider]);
  async function action(selected: "create" | "capture" | "reconcile") {
    if (!access) return;
    const current = ++sequence.current;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/test-image-packages", {
        method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${access.credential}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: selected, provider }),
      });
      const result = await response.json();
      if (current !== sequence.current) return;
      if (result.snapshot?.ok) setView(result.snapshot);
      else if (result.ok && result.state === "awaiting_confirmation") setView(result);
      if (result.ok && result.state === "checkout" && /^[A-Z0-9]{1,64}$/.test(result.providerOrderId)) setOrder(result.providerOrderId);
      if (result.ok && result.state === "confirmed") {
        setOrder(null); setMessage(result.confirmation.duplicate ? "Already confirmed. No additional rights were granted." : "Test payment confirmed by the server. Package rights are available.");
      } else if (result.reason === "unknown") {
        setOrder(null); setMessage("UNKNOWN — your reservation is held. Check status; do not create a replacement payment.");
      } else if (result.reason === "paypal_unconfigured") setMessage("PayPal Sandbox is not configured. No payment request was sent.");
      else if (!result.ok) setMessage("Payment is unconfirmed or unavailable. Existing reservations remain held; check status.");
      else if (provider === "manual_test") setMessage("Awaiting Owner-only TEST confirmation. Share this purchase reference with the studio.");
      else setMessage("Sandbox checkout is unconfirmed. Approve in Sandbox, then verify on this page.");
    } catch {
      if (current === sequence.current) setMessage("UNKNOWN — status could not be confirmed. Existing reservations remain held; check status.");
    } finally { if (current === sequence.current) setBusy(false); }
  }
  return <section className={styles.panel} aria-label="TEST-01 package">
    <p className={styles.badge}>TEST ONLY · NO LIVE CHARGE</p>
    <h1>TEST-01 image package</h1>
    <p>Sandbox USD 1 · 5 initial concept images + 5 revisions · valid for 7 days after confirmed test payment.</p>
    <p>AI hand-drawn concept sketches are concept directions. CAD, jewelry quotation and production remain offline. Your free invitation quota is unchanged.</p>
    <InvitationAccess onChange={updateInvitation} disabled={busy} />
    <label className={styles.field}>Test payment method
      <select value={provider} disabled={busy} onChange={event => {
        sequence.current++; setProvider(event.target.value); setView(null); setOrder(null); setMessage("");
      }}><option value="paypal_sandbox">PayPal Sandbox</option><option value="manual_test">Owner manual TEST confirmation</option></select>
    </label>
    {view ? <div className={styles.balance} aria-label="Package balance">
      <p>Status: {view.state}</p>
      <p>Initial images remaining: <strong>{view.initialRemaining}</strong> · Revisions remaining: <strong>{view.revisionRemaining}</strong></p>
      {view.purchaseId ? <p>Purchase reference: <span className={styles.reference}>{view.purchaseId}</span></p> : null}
      {view.expiresAt ? <p>Valid until: {view.expiresAt}</p> : null}
      {view.hold === "unknown" ? <p role="status">UNKNOWN reservation held. No duplicate payment or generation is authorized.</p> : view.hold === "pending" ? <p>Pending reservations occupy their slots until reconciled.</p> : null}
      {provider === "paypal_sandbox" && !view.paypalConfigured ? <p>PayPal Sandbox is not configured. No live payment is available.</p> : null}
    </div> : null}
    <div className={styles.actions}>
      <button disabled={!access || busy || view?.state === "active" || view?.state === "expired" || view?.hold === "unknown" || (provider === "paypal_sandbox" && !view?.paypalConfigured)} onClick={() => action("create")} type="button">
        {provider === "paypal_sandbox" ? "Start Sandbox checkout" : "Request manual TEST confirmation"}
      </button>
      {order ? <a href={`https://www.sandbox.paypal.com/checkoutnow?token=${order}`} target="_blank" rel="noopener noreferrer">Open PayPal Sandbox approval</a> : null}
      {provider === "paypal_sandbox" ? <>
        <button disabled={!access || busy || !view?.paypalConfigured || view?.hold === "unknown"} onClick={() => action("capture")} type="button">Verify Sandbox payment</button>
        <button disabled={!access || busy || !view?.paypalConfigured} onClick={() => action("reconcile")} type="button">Check payment status</button>
      </> : <button disabled={!access || busy} type="button" onClick={() => {
        // Reauthenticate/read by remounting the scoped read, never by confirming.
        setInvitation(current => current.state === "verified" ? { ...current, access: { ...current.access } } : current);
      }}>Refresh package status</button>}
    </div>
    <p role="status" aria-live="polite">{busy ? "Checking test package…" : message}</p>
    <p>Failed or noncompliant deliveries restore the applicable image allowance after server reconciliation. UNKNOWN keeps the reservation; real Provider cost is recorded separately.</p>
  </section>;
}
