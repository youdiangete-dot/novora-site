import type { SafeCommercialQuotation } from "../../../../lib/server/commercial-quotation";

import styles from "./preview.module.css";
import { formatDateOnly } from '../../../../lib/i18n/format';
import { getRequestI18n } from '../../../../lib/i18n/request';

export default async function CommercialQuotation({
  quotation,
}: {
  quotation: SafeCommercialQuotation;
}) {
  const { dictionary, locale } = await getRequestI18n();
  const copy = dictionary.quotation;
  return (
    <section className={styles.quotationCard} aria-labelledby="commercial-quotation-heading">
      <p className={styles.quotationEyebrow}>{copy.qt001}</p>
      <div className={styles.quotationHeading}>
        <div>
          <h2 id="commercial-quotation-heading">{copy.qt002}</h2>
          <p>{quotation.quoteReference}</p>
        </div>
        <span>{copy.qt003}{formatDateOnly(quotation.issuedAt, locale)}</span>
      </div>

      <div className={styles.quotationTable} role="table" aria-label={copy.qt004}>
        <div className={styles.quotationTableHeader} role="row">
          <span role="columnheader">{copy.qt005}</span>
          <span role="columnheader">{copy.qt006}{quotation.quotation.currency}{copy.qt007}</span>
        </div>
        {quotation.quotation.lineItems.map((item, index) => (
          <div className={styles.quotationTableRow} role="row" key={`${item.description}-${index}`}>
            <span role="cell">{item.description}</span>
            <span role="cell">{item.amount}</span>
          </div>
        ))}
        <div className={styles.quotationTotal} role="row">
          <strong role="cell">{copy.qt008}</strong>
          <strong role="cell">
            {quotation.quotation.currency} {quotation.quotation.totalAmount}
          </strong>
        </div>
      </div>

      {quotation.quotation.validUntil ? (
        <p className={styles.quotationMeta}>
          {copy.qt009}<strong>{formatDateOnly(quotation.quotation.validUntil, locale)}</strong>
        </p>
      ) : null}
      {quotation.quotation.note ? (
        <p className={styles.quotationNote}>{quotation.quotation.note}</p>
      ) : null}

      <div className={styles.quotationBoundary}>
        <p>{copy.qt010}</p>
        <p>
          {copy.qt011}</p>
      </div>
    </section>
  );
}
