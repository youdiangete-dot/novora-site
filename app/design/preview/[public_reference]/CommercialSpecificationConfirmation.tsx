"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import styles from "./preview.module.css";

type CommercialSpecificationInputField = Readonly<{
  key: string;
  label: string;
  value: string;
  maxLength: number;
  multiline: boolean;
  required: boolean;
}>;

export default function CommercialSpecificationConfirmation({
  confirmationBinding,
  items,
  publicReference,
}: {
  confirmationBinding: string;
  items: CommercialSpecificationInputField[];
  publicReference: string;
}) {
  const [specification, setSpecification] = useState<Record<string, string>>(
    () => Object.fromEntries(items.map((item) => [item.key, item.value])),
  );
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    try {
      const response = await fetch(
        `/api/commercial-specification-confirmation/${encodeURIComponent(publicReference)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            binding: confirmationBinding,
            specification,
          }),
        },
      );
      const result = (await response.json()) as { message?: unknown };
      if (!response.ok) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "The specifications could not be confirmed.",
        );
      }
      setState("success");
      setMessage(
        "Specifications confirmed. NOVORA may use this exact specification state to prepare a quotation.",
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The specifications could not be confirmed. Please try again.",
      );
    }
  }

  return (
    <section className={styles.specificationCard} aria-labelledby="commercial-specification-heading">
      <p className={styles.confirmationEyebrow}>Specifications for quotation</p>
      <h2 id="commercial-specification-heading">Review and confirm the specification basis</h2>
      <p>
        These values started from your Concept Brief. Review and correct every
        applicable field so this form reflects the specifications you intend to
        confirm for this exact First Preview design direction. You may keep an
        explicit &quot;not sure&quot; or &quot;to confirm&quot; value where needed.
      </p>
      <form className={styles.specificationForm} onSubmit={confirm}>
        <div className={styles.specificationList}>
          {items.map((item) => {
            const fieldId = `commercial-specification-${item.key}`;
            const sharedProps = {
              id: fieldId,
              maxLength: item.maxLength,
              name: item.key,
              onChange: (
                event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => setSpecification((current) => ({
                ...current,
                [item.key]: event.target.value,
              })),
              required: item.required,
              value: specification[item.key] ?? "",
            };
            return (
              <div key={item.key}>
                <label htmlFor={fieldId}>{item.label}</label>
                {item.multiline ? (
                  <textarea {...sharedProps} rows={3} />
                ) : (
                  <input {...sharedProps} type="text" />
                )}
              </div>
            );
          })}
        </div>
        <p className={styles.specificationBoundary}>
          This confirms only the specification basis NOVORA may use to prepare a
          quotation. It does not accept a quotation, make a payment, place an
          order, approve CAD, or approve production.
        </p>
        {state === "success" ? (
          <p className={styles.confirmationSuccess} role="status">{message}</p>
        ) : (
          <>
            <button
              className={styles.confirmationButton}
              disabled={state === "submitting"}
              type="submit"
            >
              {state === "submitting"
                ? "Confirming…"
                : "I confirm these specifications as the basis for NOVORA to prepare a quotation."}
            </button>
            {state === "error" ? (
              <p className={styles.confirmationError} role="alert">{message}</p>
            ) : null}
          </>
        )}
      </form>
    </section>
  );
}
