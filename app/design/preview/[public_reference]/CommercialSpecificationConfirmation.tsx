"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import styles from "./preview.module.css";
import { useI18n } from '../../../../lib/i18n/client';
import type { Dictionary } from '../../../../lib/i18n/dictionaries';

type CommercialSpecificationInputField = Readonly<{
  key: keyof Dictionary['commercialSpecification']['fieldLabels'];
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
  const { dictionary, locale } = useI18n();
  const copy = dictionary.commercialSpecification;
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
          locale !== 'zh-TW' && typeof result.message === "string"
            ? result.message
            : copy.cs001,
        );
      }
      setState("success");
      setMessage(
        copy.cs002,
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : copy.cs003,
      );
    }
  }

  return (
    <section className={styles.specificationCard} aria-labelledby="commercial-specification-heading">
      <p className={styles.confirmationEyebrow}>{copy.cs004}</p>
      <h2 id="commercial-specification-heading">{copy.cs005}</h2>
      <p>
        {copy.cs006}</p>
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
                <label htmlFor={fieldId}>{copy.fieldLabels[item.key]}</label>
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
          {copy.cs007}</p>
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
                ? copy.cs008
                : copy.cs009}
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
