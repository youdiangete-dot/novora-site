'use client';

import { useMemo, useState } from 'react';

type RecipientType = 'partner' | 'family' | 'myself';
type DeliveryMode = 'digital' | 'printed';

const recipientOptions: Array<{
  id: RecipientType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    id: 'partner',
    label: 'Partner',
    description: 'Romantic notes, anniversaries, and thoughtful surprises.',
    icon: '/assets/icon_partner_heart.png',
  },
  {
    id: 'family',
    label: 'Family / Friend',
    description: 'Warm appreciation letters and life milestone messages.',
    icon: '/assets/icon_family_friend.png',
  },
  {
    id: 'myself',
    label: 'Myself',
    description: 'Future-self reflections and personal encouragement.',
    icon: '/assets/icon_myself.png',
  },
];

const deliveryOptions: Array<{
  id: DeliveryMode;
  label: string;
  helper: string;
}> = [
  { id: 'digital', label: 'Digital delivery', helper: 'Sent instantly via secure link.' },
  { id: 'printed', label: 'Printed card', helper: 'Premium paper with optional mail delivery.' },
];

const maxCharacters = 320;

export default function Page() {
  const [recipient, setRecipient] = useState<RecipientType | null>(null);
  const [delivery, setDelivery] = useState<DeliveryMode>('digital');
  const [recipientName, setRecipientName] = useState('');
  const [message, setMessage] = useState('');

  const trimmedName = recipientName.trim();
  const trimmedMessage = message.trim();

  const validation = useMemo(() => {
    const errors: string[] = [];

    if (!recipient) {
      errors.push('Choose who this letter is for.');
    }

    if (!trimmedName) {
      errors.push('Add a recipient name.');
    }

    if (trimmedMessage.length < 24) {
      errors.push('Write at least 24 characters so the note feels meaningful.');
    }

    if (trimmedMessage.length > maxCharacters) {
      errors.push(`Keep the note under ${maxCharacters} characters.`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [recipient, trimmedName, trimmedMessage]);

  const selectedRecipient = recipientOptions.find((item) => item.id === recipient) ?? null;
  const remainingCharacters = maxCharacters - message.length;

  const canSubmit = validation.isValid;

  return (
    <main className="page">
      <div className="backdrop" />
      <section className="shell">
        <div className="hero">
          <p className="eyebrow">Novora • First Review</p>
          <h1>Craft a beautiful letter in under two minutes</h1>
          <p>
            This draft focuses on a calm, editorial style with clear steps and real-time validation. It is
            intentionally light, modern, and avoids the previous dark luxury direction.
          </p>
        </div>

        <div className="grid">
          <article className="panel">
            <h2>1) Choose recipient</h2>
            <div className="recipientGrid">
              {recipientOptions.map((option) => {
                const active = option.id === recipient;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`recipientCard${active ? ' active' : ''}`}
                    onClick={() => setRecipient(option.id)}
                    aria-pressed={active}
                  >
                    <img src={option.icon} alt="" />
                    <div>
                      <h3>{option.label}</h3>
                      <p>{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <h2>2) Delivery mode</h2>
            <div className="deliveryRow">
              {deliveryOptions.map((option) => {
                const active = option.id === delivery;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`deliveryPill${active ? ' active' : ''}`}
                    onClick={() => setDelivery(option.id)}
                    aria-pressed={active}
                  >
                    <span>{option.label}</span>
                    <small>{option.helper}</small>
                  </button>
                );
              })}
            </div>

            <h2>3) Write note</h2>
            <label className="field">
              Recipient name
              <input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="e.g., Jordan"
              />
            </label>
            <label className="field">
              Message
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write a sincere message..."
                maxLength={maxCharacters + 20}
              />
            </label>
            <p className={`counter${remainingCharacters < 0 ? ' over' : ''}`}>{remainingCharacters} characters left</p>

            {!validation.isValid && (
              <ul className="errors">
                {validation.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            )}

            <button type="button" className="primary" disabled={!canSubmit}>
              Continue to review
            </button>
          </article>

          <aside className="preview">
            <p className="eyebrow">Live preview</p>
            <div className="letterCard">
              <img src="/assets/paper_blank_texture.png" alt="" className="paperTexture" />
              <div className="letterContent">
                <p className="salutation">Dear {trimmedName || '—'},</p>
                <p className="bodyCopy">{trimmedMessage || 'Your message preview appears here as you type.'}</p>
                <p className="signature">With care, {selectedRecipient ? 'from Novora' : '—'}</p>
              </div>
            </div>
            <dl className="meta">
              <div>
                <dt>Recipient type</dt>
                <dd>{selectedRecipient?.label ?? 'Not selected'}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{delivery === 'digital' ? 'Digital link' : 'Printed card'}</dd>
              </div>
              <div>
                <dt>Ready for checkout</dt>
                <dd>{canSubmit ? 'Yes' : 'Not yet'}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <style jsx>{`
        .page {
          min-height: 100dvh;
          position: relative;
          padding: 2rem;
          background: radial-gradient(circle at top, #f8fafc, #eef2ff 42%, #e2e8f0 100%);
          color: #0f172a;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .backdrop {
          position: absolute;
          inset: 0;
          background-image: url('/assets/marble_bg.jpg');
          background-size: cover;
          background-position: center;
          opacity: 0.08;
          pointer-events: none;
        }

        .shell {
          position: relative;
          max-width: 1080px;
          margin: 0 auto;
          background: rgba(255, 255, 255, 0.84);
          border: 1px solid rgba(148, 163, 184, 0.25);
          backdrop-filter: blur(6px);
          border-radius: 24px;
          padding: 2rem;
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.15);
        }

        .hero h1 {
          margin: 0.25rem 0 0.75rem;
          font-size: clamp(1.6rem, 2.4vw, 2.4rem);
          letter-spacing: -0.02em;
        }

        .hero p {
          margin: 0;
          color: #475569;
          max-width: 70ch;
          line-height: 1.5;
        }

        .eyebrow {
          margin: 0;
          text-transform: uppercase;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #6366f1;
        }

        .grid {
          margin-top: 1.75rem;
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: 1.25rem;
        }

        .panel,
        .preview {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 1.25rem;
        }

        h2 {
          margin: 1.4rem 0 0.85rem;
          font-size: 1rem;
        }

        h2:first-child {
          margin-top: 0;
        }

        .recipientGrid {
          display: grid;
          gap: 0.65rem;
        }

        .recipientCard {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          text-align: left;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.7rem;
          background: linear-gradient(180deg, #fff, #f8fafc);
          transition: 0.18s ease;
        }

        .recipientCard:hover {
          border-color: #a5b4fc;
          transform: translateY(-1px);
        }

        .recipientCard.active {
          border-color: #6366f1;
          background: linear-gradient(180deg, #eef2ff, #ffffff);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.16);
        }

        .recipientCard img {
          width: 36px;
          height: 36px;
        }

        .recipientCard h3 {
          margin: 0;
          font-size: 0.92rem;
        }

        .recipientCard p {
          margin: 0.2rem 0 0;
          font-size: 0.8rem;
          color: #64748b;
        }

        .deliveryRow {
          display: grid;
          gap: 0.65rem;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .deliveryPill {
          padding: 0.65rem;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          text-align: left;
          background: #f8fafc;
        }

        .deliveryPill.active {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .deliveryPill span {
          font-weight: 600;
          display: block;
        }

        .deliveryPill small {
          color: #64748b;
          font-size: 0.74rem;
        }

        .field {
          display: grid;
          gap: 0.45rem;
          margin-top: 0.8rem;
          font-size: 0.86rem;
          font-weight: 600;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 0.65rem 0.75rem;
          font: inherit;
          font-size: 0.95rem;
          background: #fff;
        }

        textarea {
          min-height: 120px;
          resize: vertical;
        }

        .counter {
          margin: 0.45rem 0 0;
          text-align: right;
          font-size: 0.75rem;
          color: #64748b;
        }

        .counter.over {
          color: #dc2626;
          font-weight: 700;
        }

        .errors {
          margin: 0.8rem 0;
          padding-left: 1rem;
          color: #b91c1c;
          font-size: 0.82rem;
        }

        .primary {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 0.8rem 1rem;
          font: inherit;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 10px 24px rgba(79, 70, 229, 0.28);
        }

        .primary:disabled {
          cursor: not-allowed;
          opacity: 0.5;
          box-shadow: none;
        }

        .letterCard {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          min-height: 300px;
          border: 1px solid #dbeafe;
          background: #f8fafc;
        }

        .paperTexture {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.22;
        }

        .letterContent {
          position: relative;
          padding: 1.1rem;
          line-height: 1.65;
          font-family: 'Georgia', 'Times New Roman', serif;
          color: #1e293b;
        }

        .salutation,
        .signature {
          font-style: italic;
          color: #334155;
        }

        .bodyCopy {
          min-height: 160px;
          white-space: pre-wrap;
        }

        .meta {
          margin: 0.9rem 0 0;
          display: grid;
          gap: 0.7rem;
        }

        .meta div {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.86rem;
          border-bottom: 1px dashed #cbd5e1;
          padding-bottom: 0.4rem;
        }

        .meta dt {
          color: #64748b;
        }

        .meta dd {
          margin: 0;
          font-weight: 600;
        }

        @media (max-width: 900px) {
          .page {
            padding: 1rem;
          }

          .shell {
            padding: 1.2rem;
            border-radius: 16px;
          }

          .grid {
            grid-template-columns: 1fr;
          }

          .deliveryRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
