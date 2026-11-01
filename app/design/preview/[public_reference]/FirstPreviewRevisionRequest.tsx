"use client";
import { useCallback, useState } from "react";
import InvitationAccess, { type BrowserInvitationState } from "../../../../components/InvitationAccess";
import { REVISION_DIRECTIVES, readRevisionDirectives, type RevisionDirective } from "../../../../lib/first-preview-revision-directives";
import { requestBrowserRevision } from "../../../../lib/client/first-preview-revision";
import styles from "./preview.module.css";

export default function FirstPreviewRevisionRequest({ publicReference, feedbackBinding }: { publicReference: string; feedbackBinding: string }) {
  const [invitation, setInvitation] = useState<BrowserInvitationState>({ state: "checking" });
  const onAccess = useCallback((next: BrowserInvitationState) => setInvitation(next), []);
  const [directives, setDirectives] = useState<RevisionDirective[]>([]);
  const [provider, setProvider] = useState<"manual_test" | "paypal_sandbox">("manual_test");
  const [busy, setBusy] = useState(false), [ready, setReady] = useState(false), [message, setMessage] = useState("");
  if (invitation.state === "disabled") return null;
  return <section className={styles.feedbackCard} aria-labelledby="revision-request-heading">
    <h3 id="revision-request-heading">Request a design revision</h3>
    <p>Use an active TEST-01 package. Your current safe image stays available if a revision fails. Feedback notes are not sent as generation instructions.</p>
    <InvitationAccess onChange={onAccess} disabled={busy} />
    {invitation.state === "verified" ? <>
      <label htmlFor="revision-package-provider">Confirmed test package</label>
      <select id="revision-package-provider" value={provider} disabled={busy} onChange={event => setProvider(event.target.value as typeof provider)}>
        <option value="manual_test">Manual TEST confirmation</option><option value="paypal_sandbox">PayPal Sandbox</option>
      </select>
      <fieldset disabled={busy}><legend>Requested changes</legend>
        {(Object.keys(REVISION_DIRECTIVES) as RevisionDirective[]).map(code => <label key={code} style={{ display: "block", marginBlock: "0.5rem" }}>
          <input type="checkbox" checked={directives.includes(code)} onChange={event => setDirectives(previous => event.target.checked ? [...previous, code] : previous.filter(item => item !== code))} /> {code.replaceAll("_", " ")}
        </label>)}
      </fieldset>
      <button type="button" disabled={busy || directives.length === 0} onClick={async () => {
        if (!readRevisionDirectives(directives)) { setMessage("Choose compatible changes; opposite settings cannot be requested together."); return; }
        setBusy(true); setReady(false);
        try {
          // This decoding supplies a correlation ID only. The server verifies
          // the signature, current source and owner independently.
          const encoded = feedbackBinding.split(".")[0].replaceAll("-", "+").replaceAll("_", "/");
          const source = JSON.parse(atob(encoded)).outputId;
          const result = await requestBrowserRevision({ publicReference, sourceOutputId: source, directives, provider, binding: feedbackBinding }, invitation.access);
          setReady(result.status === "ready");
          setMessage(result.status === "storage_unavailable" ? "Browser recovery storage is unavailable. No new revision was submitted." : result.status === "denied" ? "Revision access or the selected changes were rejected." : result.status === "ready" ? "Your safe revision is ready. Refresh to view and confirm the new direction." : result.status === "failed"
            ? "This revision definitely failed. Your current image is unchanged. A new request requires another explicit click."
            : result.status === "pending" ? "Revision received. Check again to read its existing status."
            : "The result is unconfirmed. Check again reads the existing request; it does not submit another revision.");
        } catch { setMessage("Revision access is unavailable. No confirmed result is shown."); }
        finally { setBusy(false); }
      }}>{busy ? "Checking revision..." : message ? "Request revision / check existing status" : "Request revision"}</button>
      {ready ? <button type="button" onClick={() => window.location.reload()}>View revised image and confirmation</button> : null}
    </> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
