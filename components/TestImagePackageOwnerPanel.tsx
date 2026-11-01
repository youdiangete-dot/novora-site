"use client";
import { useCallback, useState } from "react";
import InvitationAccess, { type BrowserInvitationState } from "./InvitationAccess";
import styles from "./test-image-packages.module.css";
export default function TestImagePackageOwnerPanel() {
  const [invitation, setInvitation] = useState<BrowserInvitationState>({ state: "checking" });
  const [purchaseId, setPurchaseId] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = useCallback((next: BrowserInvitationState) => { setInvitation(next); setMessage(""); }, []);
  return <section className={styles.panel}>
    <p className={styles.badge}>OWNER · SYNTHETIC TEST EVIDENCE ONLY</p>
    <h1>Manual TEST-01 confirmation</h1>
    <p>USD 1 · 5 initial images + 5 revisions · 7 days from confirmed test payment. This creates no jewelry order or live payment.</p>
    <p>The existing admin session and the explicitly authorized Owner invitation are both required.</p>
    <InvitationAccess onChange={update} disabled={busy} />
    <form onSubmit={async event => {
      event.preventDefault();
      if (invitation.state !== "verified") return;
      setBusy(true); setMessage("");
      try {
        const response = await fetch("/api/admin/test-image-packages", {
          method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
          headers: { Authorization: `Bearer ${invitation.access.credential}`, "Content-Type": "application/json" },
          body: JSON.stringify({ purchaseId, reference, amountMinor: 100, currency: "USD" }),
        });
        const result = await response.json();
        setMessage(result.ok && result.state === "confirmed"
          ? result.confirmation.duplicate ? "Already confirmed. No additional rights were granted; original expiry is unchanged."
            : `TEST confirmation recorded. Valid until ${result.confirmation.expiresAt}.`
          : "Not confirmed. Owner authorization, purchase binding or TEST evidence was not accepted.");
      } catch { setMessage("UNKNOWN confirmation outcome. Reconcile the same TEST reference; do not enter a replacement reference."); }
      finally { setBusy(false); }
    }}>
      <label className={styles.field}>Customer purchase reference<input value={purchaseId} disabled={busy} required maxLength={36} onChange={event => setPurchaseId(event.target.value)} /></label>
      <label className={styles.field}>Synthetic TEST reference<input value={reference} disabled={busy} required maxLength={128} pattern="TEST-[A-Za-z0-9_.:-]+" onChange={event => setReference(event.target.value)} /></label>
      <p>Amount: USD 1 (100 minor units). Do not enter bank details, real receipts or customer documents.</p>
      <button type="submit" disabled={busy || invitation.state !== "verified"}>Confirm synthetic TEST payment</button>
    </form>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
