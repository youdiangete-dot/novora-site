'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const jewelryTypes = ['Ring', 'Necklace', 'Bracelet', 'Earrings', 'Other'];
const materials = ['14K Gold', '18K Gold', 'Platinum', 'Sterling Silver', 'Unsure'];
const stones = ['Diamond', 'Moissanite', 'Sapphire', 'Emerald', 'No center stone', 'Unsure'];

export default function DesignStartPage() {
  const [recipient, setRecipient] = useState('');
  const [jewelryType, setJewelryType] = useState('');
  const [inspirationName, setInspirationName] = useState('');
  const [story, setStory] = useState('');
  const [material, setMaterial] = useState('');
  const [stone, setStone] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');

  const validation = useMemo(() => {
    const errors: string[] = [];
    if (!recipient.trim()) errors.push('Recipient is required.');
    if (!jewelryType) errors.push('Jewelry type is required.');
    if (!story.trim() || story.trim().length < 24) errors.push('Story/meaning must be at least 24 characters.');
    if (!material) errors.push('Material preference is required.');
    if (!stone) errors.push('Stone preference is required.');
    if (!budget.trim()) errors.push('Budget is required.');
    if (!timeline.trim()) errors.push('Timeline is required.');

    return { errors, isValid: errors.length === 0 };
  }, [recipient, jewelryType, story, material, stone, budget, timeline]);

  return (
    <main className="page-shell">
      <p className="kicker">Design Intake</p>
      <h1>Start your custom jewelry design</h1>
      <p style={{ color: 'var(--muted)', maxWidth: 700 }}>
        A focused intake that helps our team and AI quickly produce the right concept direction.
      </p>

      <section className="grid two" style={{ marginTop: '1rem', alignItems: 'start' }}>
        <form className="card" style={{ display: 'grid', gap: '0.95rem' }}>
          <LabeledField label="Recipient">
            <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g., spouse, self, parent" />
          </LabeledField>

          <LabeledField label="Jewelry type">
            <select value={jewelryType} onChange={(e) => setJewelryType(e.target.value)}>
              <option value="">Select a type</option>
              {jewelryTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </LabeledField>

          <LabeledField label="Inspiration upload">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setInspirationName(e.target.files?.[0]?.name ?? '')}
            />
            {inspirationName && <small style={{ color: 'var(--muted)' }}>Selected: {inspirationName}</small>}
          </LabeledField>

          <LabeledField label="Story / meaning">
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Share emotional meaning, symbols, and style direction."
              rows={4}
            />
          </LabeledField>

          <LabeledField label="Material preference">
            <select value={material} onChange={(e) => setMaterial(e.target.value)}>
              <option value="">Select material</option>
              {materials.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </LabeledField>

          <LabeledField label="Stone preference">
            <select value={stone} onChange={(e) => setStone(e.target.value)}>
              <option value="">Select stone</option>
              {stones.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </LabeledField>

          <LabeledField label="Budget">
            <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="e.g., $2,000–$3,500" />
          </LabeledField>

          <LabeledField label="Timeline">
            <input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="e.g., need before June 20" />
          </LabeledField>

          {!validation.isValid && (
            <ul style={{ margin: 0, color: '#8f3f30', paddingLeft: '1.1rem', fontSize: '0.92rem' }}>
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}

          <Link
            href="/design/concept"
            className="btn primary"
            aria-disabled={!validation.isValid}
            onClick={(event) => {
              if (!validation.isValid) event.preventDefault();
            }}
            style={!validation.isValid ? { pointerEvents: "auto", opacity: 0.55 } : undefined}
          >
            Continue to concept preview
          </Link>
        </form>

        <aside className="card">
          <p className="kicker">Intake Summary</p>
          <dl style={{ margin: 0, display: 'grid', gap: '0.7rem' }}>
            <Summary label="Recipient" value={recipient || 'Not provided'} />
            <Summary label="Jewelry type" value={jewelryType || 'Not selected'} />
            <Summary label="Inspiration" value={inspirationName || 'No file selected'} />
            <Summary label="Story / meaning" value={story.trim() || 'Not provided'} />
            <Summary label="Material" value={material || 'Not selected'} />
            <Summary label="Stone" value={stone || 'Not selected'} />
            <Summary label="Budget" value={budget || 'Not provided'} />
            <Summary label="Timeline" value={timeline || 'Not provided'} />
          </dl>
        </aside>
      </section>

      <style jsx>{`
        input,
        textarea,
        select {
          width: 100%;
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 0.72rem 0.8rem;
          background: #fff;
          font: inherit;
        }
      `}</style>
    </main>
  );
}

function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '0.45rem', fontSize: '0.95rem', fontWeight: 600 }}>
      {label}
      {children}
    </label>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '0.15rem' }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 500 }}>{value}</dd>
    </div>
  );
}
