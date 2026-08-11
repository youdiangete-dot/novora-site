"use client";

import { useState } from "react";

import styles from "./preview.module.css";

export default function FirstPreviewDesignConfirmation({
  confirmationBinding,
  publicReference,
}: {
  confirmationBinding: string;
  publicReference: string;
}) {
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
          typeof result.message === "string"
            ? result.message
            : "The design direction could not be confirmed.",
        );
      }
      setState("success");
      setMessage(
        "Design direction confirmed. NOVORA will use this concept direction as the starting point for the next specification step.",
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The design direction could not be confirmed. Please try again.",
      );
    }
  }

  return (
    <section
      className={styles.confirmationCard}
      aria-labelledby="first-preview-design-confirmation-heading"
    >
      <p className={styles.confirmationEyebrow}>Selected concept direction</p>
      <h2 id="first-preview-design-confirmation-heading">
        Continue with this design direction
      </h2>
      <p>
        Confirm only if this exact First Preview is the concept direction you
        want NOVORA to use as the starting point. Refinement may still occur,
        and gemstone, material, size, and other specifications are handled
        later.
      </p>
      <p>
        This does not approve CAD, a quotation, payment, an order, or
        production.
      </p>
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
              ? "Confirming…"
              : "Confirm this design direction"}
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
