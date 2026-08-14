"use client";

import { useState } from "react";
import type { FormEvent } from "react";

import styles from "./preview.module.css";
import { useI18n } from '../../../../lib/i18n/client';

export default function FirstPreviewFeedbackForm({
  feedbackBinding,
  publicReference,
}: {
  feedbackBinding: string;
  publicReference: string;
}) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.feedback;
  const [feedback, setFeedback] = useState("");
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = feedback.trim();
    if (!normalized || normalized.length > 2_000) {
      setState("error");
      setMessage(copy.fb001);
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
      if (!response.ok) throw new Error(locale === 'zh-TW' ? copy.fb002 : typeof result.message === "string" ? result.message : copy.fb002);
      setState("success");
      setMessage(copy.fb003);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : copy.fb004);
    }
  }

  return (
    <section className={styles.feedbackCard} aria-labelledby="first-preview-feedback-heading">
      <p className={styles.feedbackEyebrow}>{copy.fb005}</p>
      <h2 id="first-preview-feedback-heading">{copy.fb006}</h2>
      <p>{copy.fb007}</p>
      {state === "success" ? (
        <p className={styles.feedbackSuccess} role="status">{message}</p>
      ) : (
        <form className={styles.feedbackForm} onSubmit={submit}>
          <label htmlFor="first-preview-feedback">{copy.fb008}</label>
          <textarea
            id="first-preview-feedback"
            maxLength={2_000}
            onChange={(event) => setFeedback(event.target.value)}
            required
            rows={6}
            value={feedback}
          />
          <div className={styles.feedbackActions}>
            <span>{feedback.length} {copy.fb009}</span>
            <button disabled={state === "submitting"} type="submit">
              {state === "submitting" ? copy.fb010 : copy.fb011}
            </button>
          </div>
          {state === "error" ? <p className={styles.feedbackError} role="alert">{message}</p> : null}
        </form>
      )}
    </section>
  );
}
