"use client";

import { useState } from "react";
import { useI18n } from '../../../../lib/i18n/client';

type CustomerPaymentState = Readonly<{
  paymentReference: string;
  status: "pending" | "paid" | "failed";
  checkoutUrl: string | null;
  checkoutExpiresAt: string | null;
  paidAt: string | null;
}>;

type Props = Readonly<{
  binding: string;
  publicReference: string;
  providerConfigured: boolean;
  initialPayment: CustomerPaymentState | null;
}>;

function safeCheckoutUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function CommercialPayment({
  binding,
  publicReference,
  providerConfigured,
  initialPayment,
}: Props) {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.paymentShell;
  const [payment, setPayment] = useState(initialPayment);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function continueToPayment() {
    const existingCheckout = safeCheckoutUrl(payment?.checkoutUrl);
    if (existingCheckout) {
      window.location.assign(existingCheckout);
      return;
    }
    if (!providerConfigured || submitting) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/commercial-payment/${encodeURIComponent(publicReference)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ binding }),
        },
      );
      const result = await response.json() as {
        ok?: unknown;
        payment?: CustomerPaymentState;
        message?: unknown;
      };
      if (!response.ok || result.ok !== true || !result.payment) {
        setMessage(
          locale !== 'zh-TW' && typeof result.message === "string"
            ? result.message
            : copy.pay001,
        );
        return;
      }
      setPayment(result.payment);
      const checkoutUrl = safeCheckoutUrl(result.payment.checkoutUrl);
      if (result.payment.status === "pending" && checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else if (result.payment.status !== "paid") {
        setMessage(copy.pay001);
      }
    } catch {
      setMessage(copy.pay001);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="commercialPaymentCard" aria-labelledby="commercial-payment-heading">
      <p className="commercialPaymentEyebrow">{copy.pay002}</p>
      <h2 id="commercial-payment-heading">
        {payment?.status === "paid" ? copy.pay003 : copy.pay004}
      </h2>
      {payment?.status === "paid" ? (
        <p className="commercialPaymentSuccess" role="status">
          {copy.pay005}</p>
      ) : payment?.status === "failed" ? (
        <p role="status">
          {copy.pay006}</p>
      ) : (
        <p>
          {copy.pay007}</p>
      )}
      {payment?.status !== "paid" &&
      (providerConfigured || safeCheckoutUrl(payment?.checkoutUrl)) ? (
        <button
          type="button"
          onClick={continueToPayment}
          disabled={submitting}
        >
          {submitting ? copy.pay008 : copy.pay009}
        </button>
      ) : null}
      {message ? <p className="commercialPaymentError" role="alert">{message}</p> : null}
      <div className="commercialPaymentBoundary">
        <p>
          {copy.pay010}</p>
        <p>
          {copy.pay011}</p>
      </div>
    </section>
  );
}
