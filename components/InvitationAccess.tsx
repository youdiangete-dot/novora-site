"use client";
import { useEffect, useState } from "react";
import type { InvitationAccess as VerifiedInvitationAccess } from "../lib/client/invitation-submission";

export type BrowserInvitationState =
  | { state: "checking" | "required" | "unavailable" }
  | { state: "disabled" }
  | { state: "verified"; access: VerifiedInvitationAccess };

export default function InvitationAccess({ onChange, disabled = false }: {
  onChange: (value: BrowserInvitationState) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<BrowserInvitationState["state"]>("checking");
  const [credential, setCredential] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/invitation-access", { cache: "no-store" }).then(response => response.json()).then(result => {
      if (!active) return;
      const next = result.state === "disabled" ? "disabled" : result.state === "required" ? "required" : "unavailable";
      setState(next); onChange({ state: next });
    }).catch(() => { if (active) { setState("unavailable"); onChange({ state: "unavailable" }); } });
    return () => { active = false; };
  }, [onChange]);
  if (state === "disabled") return null;
  return <section aria-labelledby="invitation-access-heading">
    <h3 id="invitation-access-heading">Invitation access</h3>
    <p>Your invitation code stays in this page's memory. After a refresh, enter it again to recover your submission safely.</p>
    <label htmlFor="invitation-credential">Invitation code</label>
    <input id="invitation-credential" type="password" autoComplete="off" maxLength={128}
      disabled={disabled || busy || state === "checking"} value={credential}
      onChange={event => { setCredential(event.target.value); setState("required"); onChange({ state: "required" }); }} />
    <button type="button" disabled={disabled || busy || state === "checking" || !credential}
      onClick={async () => {
        setBusy(true);
        try {
          const response = await fetch("/api/invitation-access", { headers: { Authorization: `Bearer ${credential}` }, cache: "no-store" });
          const result = await response.json();
          if (!response.ok || result.state !== "verified" || typeof result.partition !== "string" || !/^[a-f0-9]{64}$/.test(result.partition)) throw new Error("denied");
          setState("verified"); onChange({ state: "verified", access: { credential, partition: result.partition } });
          setCredential("");
        } catch { setState("required"); onChange({ state: "required" }); }
        finally { setBusy(false); }
      }}>{busy ? "Checking invitation..." : "Use invitation"}</button>
    <p role="status">{state === "verified" ? "Invitation verified." : state === "unavailable" ? "Invitation access is unavailable. No request has been sent." : state === "checking" ? "Checking invitation access..." : "An invitation is required for this test."}</p>
  </section>;
}
