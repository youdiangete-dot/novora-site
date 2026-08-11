import type { SafeCommercialQuotation } from "../../../../lib/server/commercial-quotation";

import styles from "./preview.module.css";

function formatIssuedDate(value: string) {
  return value.slice(0, 10);
}

export default function CommercialQuotation({
  quotation,
}: {
  quotation: SafeCommercialQuotation;
}) {
  return (
    <section className={styles.quotationCard} aria-labelledby="commercial-quotation-heading">
      <p className={styles.quotationEyebrow}>Confirmed-specification quotation</p>
      <div className={styles.quotationHeading}>
        <div>
          <h2 id="commercial-quotation-heading">NOVORA quotation</h2>
          <p>{quotation.quoteReference}</p>
        </div>
        <span>Issued {formatIssuedDate(quotation.issuedAt)}</span>
      </div>

      <div className={styles.quotationTable} role="table" aria-label="Quotation line items">
        <div className={styles.quotationTableHeader} role="row">
          <span role="columnheader">Item</span>
          <span role="columnheader">Amount ({quotation.quotation.currency})</span>
        </div>
        {quotation.quotation.lineItems.map((item, index) => (
          <div className={styles.quotationTableRow} role="row" key={`${item.description}-${index}`}>
            <span role="cell">{item.description}</span>
            <span role="cell">{item.amount}</span>
          </div>
        ))}
        <div className={styles.quotationTotal} role="row">
          <strong role="cell">Total</strong>
          <strong role="cell">
            {quotation.quotation.currency} {quotation.quotation.totalAmount}
          </strong>
        </div>
      </div>

      {quotation.quotation.validUntil ? (
        <p className={styles.quotationMeta}>
          Valid until: <strong>{quotation.quotation.validUntil}</strong>
        </p>
      ) : null}
      {quotation.quotation.note ? (
        <p className={styles.quotationNote}>{quotation.quotation.note}</p>
      ) : null}

      <div className={styles.quotationBoundary}>
        <p>This quotation is based on your latest confirmed specification.</p>
        <p>
          Viewing it does not make a payment, place an order, approve CAD, or approve production.
        </p>
      </div>
    </section>
  );
}
