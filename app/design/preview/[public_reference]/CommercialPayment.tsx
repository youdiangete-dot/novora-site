"use client";

import { useState } from "react";

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
          typeof result.message === "string"
            ? result.message
            : "Secure payment is temporarily unavailable.",
        );
        return;
      }
      setPayment(result.payment);
      const checkoutUrl = safeCheckoutUrl(result.payment.checkoutUrl);
      if (result.payment.status === "pending" && checkoutUrl) {
        window.location.assign(checkoutUrl);
      } else if (result.payment.status !== "paid") {
        setMessage("Secure payment is temporarily unavailable.");
      }
    } catch {
      setMessage("Secure payment is temporarily unavailable.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="commercialPaymentCard" aria-labelledby="commercial-payment-heading">
      <p className="commercialPaymentEyebrow">Secure payment</p>
      <h2 id="commercial-payment-heading">
        {payment?.status === "paid" ? "Payment received" : "Payment for this quotation"}
      </h2>
      {payment?.status === "paid" ? (
        <p className="commercialPaymentSuccess" role="status">
          Payment received for the exact current quotation.
        </p>
      ) : payment?.status === "failed" ? (
        <p role="status">
          The previous payment attempt was not completed. No payment success or order has been recorded.
        </p>
      ) : (
        <p>
          Continue only when you are ready to use the configured secure payment channel.
        </p>
      )}
      {payment?.status !== "paid" &&
      (providerConfigured || safeCheckoutUrl(payment?.checkoutUrl)) ? (
        <button
          type="button"
          onClick={continueToPayment}
          disabled={submitting}
        >
          {submitting ? "Preparing secure payment…" : "Continue to secure payment"}
        </button>
      ) : null}
      {message ? <p className="commercialPaymentError" role="alert">{message}</p> : null}
      <div className="commercialPaymentBoundary">
        <p>
          Payment confirmation does not itself create a commercial order.
        </p>
        <p>
          NOVORA creates the durable order in a separate later stage before CAD and production handling.
        </p>
      </div>
    </section>
  );
}
