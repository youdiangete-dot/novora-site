"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import styles from "./preview.module.css";

export default function FirstPreviewFeedbackForm({
  feedbackBinding,
  publicReference,
}: {
  feedbackBinding: string;
  publicReference: string;
}) {
  const [feedback, setFeedback] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = feedback.trim();
    if (!normalized || normalized.length > 2_000) {
      setState("error");
      setMessage("Please provide feedback between 1 and 2000 characters.");
      return;
    }
    setState("submitting");
    setMessage("");
    try {
      const response = await fetch(`/api/first-preview-feedback/${encodeURIComponent(publicReference)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ feedback: normalized, binding: feedbackBinding }),
      });
      const result = (await response.json()) as { message?: unknown };
      if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Feedback could not be saved.");
      setState("success");
      setMessage("Thank you. Your design-direction feedback has been received for this First Preview.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Feedback could not be saved. Please try again.");
    }
  }

  return (
    <section className={styles.feedbackCard} aria-labelledby="first-preview-feedback-heading">
      <p className={styles.feedbackEyebrow}>Design-direction feedback</p>
      <h2 id="first-preview-feedback-heading">Tell us what you would like to refine</h2>
      <p>This request guides later human review. It does not approve CAD, create an order, approve a quote, or approve production.</p>
      {state === "success" ? (
        <p className={styles.feedbackSuccess} role="status">{message}</p>
      ) : (
        <form className={styles.feedbackForm} onSubmit={submit}>
          <label htmlFor="first-preview-feedback">Your feedback</label>
          <textarea
            id="first-preview-feedback"
            maxLength={2_000}
            onChange={(event) => setFeedback(event.target.value)}
            required
            rows={6}
            value={feedback}
          />
          <div className={styles.feedbackActions}>
            <span>{feedback.length} / 2000</span>
            <button disabled={state === "submitting"} type="submit">
              {state === "submitting" ? "Submitting…" : "Submit feedback"}
            </button>
          </div>
          {state === "error" ? <p className={styles.feedbackError} role="alert">{message}</p> : null}
        </form>
      )}
    </section>
  );
}
