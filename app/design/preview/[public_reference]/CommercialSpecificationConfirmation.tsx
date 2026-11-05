"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

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
  confirmed = false,
  items,
  publicReference,
  quotation = null,
  refreshOnConfirmed = false,
}: {
  confirmationBinding: string;
  confirmed?: boolean;
  items: CommercialSpecificationInputField[];
  publicReference: string;
  quotation?: ReactNode;
  refreshOnConfirmed?: boolean;
}) {
  const router = useRouter();
  const { dictionary, locale } = useI18n();
  const copy = dictionary.commercialSpecification;
  const [specification, setSpecification] = useState<Record<string, string>>(
    () => Object.fromEntries(items.map((item) => [item.key, item.value])),
  );
  const [fields, setFields] = useState(items);
  const [showQuotation, setShowQuotation] = useState(confirmed);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">(confirmed ? "success" : "idle");
  const [message, setMessage] = useState(confirmed ? copy.cs002 : "");
  const [interactiveReady, setInteractiveReady] = useState(false);
  const requestVersion = useRef(0);
  useEffect(() => { setInteractiveReady(true); }, []);
  useEffect(() => {
    requestVersion.current += 1;
    setFields(items);
    setShowQuotation(confirmed);
    setSpecification(Object.fromEntries(items.map(item => [item.key, item.value])));
    setState(confirmed ? "success" : "idle");
    setMessage(confirmed ? copy.cs002 : "");
    return () => { requestVersion.current += 1; };
  }, [confirmationBinding, confirmed, items, copy.cs002]);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!interactiveReady) return;
    const version = ++requestVersion.current;
    setShowQuotation(false);
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
      const result = (await response.json()) as { ok?: unknown; message?: unknown; reason?: unknown; currentItems?: unknown };
      if (version !== requestVersion.current) return;
      if (response.status === 409 && result.reason === "conflict") {
        const current = result.currentItems;
        if (Array.isArray(current) && current.length > 0 && current.length <= Object.keys(copy.fieldLabels).length &&
            current.every(item => item && typeof item.key === "string" && Object.hasOwn(copy.fieldLabels, item.key) &&
              typeof item.value === "string" && [160, 500].includes(item.maxLength) && item.value.length <= item.maxLength &&
              typeof item.multiline === "boolean" && typeof item.required === "boolean") &&
            new Set(current.map(item => item.key)).size === current.length &&
            ["pieceType", "structure"].every(key => current.some(item => item.key === key && item.value.trim()))) {
          setFields(current);
          setSpecification(Object.fromEntries(current.map(item => [item.key, item.value])));
          setMessage(copy.cs010);
        } else {
          setMessage(copy.cs001);
        }
        setState("error");
        return;
      }
      if (!response.ok || result.ok !== true) {
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
      if (refreshOnConfirmed) router.refresh();
    } catch (error) {
      if (version !== requestVersion.current) return;
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : copy.cs003,
      );
    }
  }

  return (
    <><section className={styles.specificationCard} aria-labelledby="commercial-specification-heading">
      <p className={styles.confirmationEyebrow}>{copy.cs004}</p>
      <h2 id="commercial-specification-heading">{copy.cs005}</h2>
      <p>
        {copy.cs006}</p>
      <form className={styles.specificationForm} onSubmit={confirm} aria-busy={!interactiveReady || state === "submitting"}>
        <div className={styles.specificationList}>
          {fields.map((item) => {
            const fieldId = `commercial-specification-${item.key}`;
            const sharedProps = {
              id: fieldId,
              maxLength: item.maxLength,
              name: item.key,
              disabled: !interactiveReady || state === "submitting",
              onChange: (
                event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => {
                requestVersion.current += 1;
                setSpecification((current) => ({ ...current, [item.key]: event.target.value }));
                setState("idle");
                setMessage("");
                setShowQuotation(false);
              },
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
              disabled={!interactiveReady || state === "submitting"}
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
    </section>{state === "success" && showQuotation ? quotation : null}</>
  );
}
