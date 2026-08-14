"use client";

import { useState } from "react";

import styles from "./preview.module.css";
import { useI18n } from '../../../../lib/i18n/client';

export default function FirstPreviewDesignConfirmation({
  confirmationBinding,
  publicReference,
}: {
  confirmationBinding: string;
  publicReference: string;
}) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.firstPreview;
  const [state, setState] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function confirm() {
    setState("submitting");
    setMessage("");
    try {
      const response = await fetch(
        `/api/first-preview-design-confirmation/${encodeURIComponent(publicReference)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ binding: confirmationBinding }),
        },
      );
      const result = (await response.json()) as { message?: unknown };
      if (!response.ok) {
        throw new Error(
          locale !== 'zh-TW' && typeof result.message === "string"
            ? result.message
            : copy.fp023,
        );
      }
      setState("success");
      setMessage(
        copy.fp024,
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : copy.fp025,
      );
    }
  }

  return (
    <section
      className={styles.confirmationCard}
      aria-labelledby="first-preview-design-confirmation-heading"
    >
      <p className={styles.confirmationEyebrow}>{copy.fp026}</p>
      <h2 id="first-preview-design-confirmation-heading">
        {copy.fp027}</h2>
      <p>
        {copy.fp028}</p>
      <p>
        {copy.fp029}</p>
      {state === "success" ? (
        <p className={styles.confirmationSuccess} role="status">
          {message}
        </p>
      ) : (
        <>
          <button
            className={styles.confirmationButton}
            disabled={state === "submitting"}
            onClick={confirm}
            type="button"
          >
            {state === "submitting"
              ? copy.fp030
              : copy.fp031}
          </button>
          {state === "error" ? (
            <p className={styles.confirmationError} role="alert">
              {message}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
