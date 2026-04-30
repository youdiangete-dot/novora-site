'use client';

import Link from 'next/link';
import { CSSProperties, useState } from 'react';
import styles from './start.module.css';

type Option = {
  value: string;
  label: string;
  detail: string;
  asset: string;
  position: string;
};

const recipients: Option[] = [
  { value: 'myself', label: 'Myself', detail: 'A piece for your own story', asset: '/assets/novora_recipient_icons_set.png', position: '12% 26%' },
  { value: 'partner', label: 'Partner', detail: 'Love, anniversary, or milestone', asset: '/assets/novora_recipient_icons_set.png', position: '38% 26%' },
  { value: 'family-friend', label: 'Family/Friend', detail: 'A thoughtful personal gift', asset: '/assets/novora_recipient_icons_set.png', position: '64% 26%' },
  { value: 'commemorative', label: 'Commemorative', detail: 'Memory, symbol, or tribute', asset: '/assets/novora_recipient_icons_set.png', position: '88% 26%' },
];

const jewelryTypes: Option[] = [
  { value: 'ring', label: 'Ring', detail: 'Center stone, band, or statement', asset: '/assets/novora_jewelry_type_icons_set.png', position: '12% 22%' },
  { value: 'pendant', label: 'Pendant', detail: 'Symbolic, wearable, personal', asset: '/assets/novora_jewelry_type_icons_set.png', position: '38% 22%' },
  { value: 'earrings', label: 'Earrings', detail: 'Pair, drop, or daily accent', asset: '/assets/novora_jewelry_type_icons_set.png', position: '64% 22%' },
  { value: 'bracelet', label: 'Bracelet', detail: 'Clean, sculptural, or sentimental', asset: '/assets/novora_jewelry_type_icons_set.png', position: '88% 22%' },
];

const styleOptions: Option[] = [
  { value: 'minimal', label: 'Minimal', detail: 'Clean lines and quiet detail', asset: '/assets/novora_style_icons_set.png', position: '12% 24%' },
  { value: 'organic', label: 'Organic', detail: 'Nature-inspired movement', asset: '/assets/novora_style_icons_set.png', position: '38% 24%' },
  { value: 'vintage', label: 'Vintage-inspired', detail: 'Heirloom mood, modern finish', asset: '/assets/novora_style_icons_set.png', position: '64% 24%' },
  { value: 'bold-modern', label: 'Bold modern', detail: 'Strong silhouette and presence', asset: '/assets/novora_style_icons_set.png', position: '88% 24%' },
];

const budgets = ['Under USD 500', 'USD 500-1200', 'USD 1200-2500', 'USD 2500+'];
const checklist = ['AI concept sketch first', 'Paid CAD after approval', 'Order center for production updates'];

export default function DesignStartPage() {
  const [selectedRecipient, setSelectedRecipient] = useState(recipients[0].value);
  const [selectedJewelryType, setSelectedJewelryType] = useState(jewelryTypes[0].value);
  const [selectedStyle, setSelectedStyle] = useState(styleOptions[0].value);
  const [selectedBudget, setSelectedBudget] = useState(budgets[1]);

  const recipientLabel = recipients.find((item) => item.value === selectedRecipient)?.label;
  const jewelryLabel = jewelryTypes.find((item) => item.value === selectedJewelryType)?.label;
  const styleLabel = styleOptions.find((item) => item.value === selectedStyle)?.label;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.step}>Step 1 - Design Intake</p>
          <h1>Build your custom jewelry brief</h1>
        </div>
        <p className={styles.headerNote}>A compact studio flow for first-time custom jewelry buyers.</p>
      </header>

      <section className={styles.layout}>
        <div className={styles.leftCol}>
          <SelectionSection
            title="Recipient"
            subtitle="Who is it for?"
            options={recipients}
            selected={selectedRecipient}
            onSelect={setSelectedRecipient}
          />

          <SelectionSection
            title="Jewelry type"
            subtitle="Choose a starting form"
            options={jewelryTypes}
            selected={selectedJewelryType}
            onSelect={setSelectedJewelryType}
          />

          <SelectionSection
            title="Style preference"
            subtitle="Set the visual tone"
            options={styleOptions}
            selected={selectedStyle}
            onSelect={setSelectedStyle}
          />

          <article className={styles.cardCompact}>
            <div className={styles.cardHead}>
              <h2>Budget</h2>
              <span>Choose a planning range</span>
            </div>
            <div className={styles.budgetGrid}>
              {budgets.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={selectedBudget === item}
                  className={`${styles.budgetButton} ${selectedBudget === item ? styles.budgetSelected : ''}`}
                  onClick={() => setSelectedBudget(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </article>

          <article className={styles.cardCompact}>
            <div className={styles.cardHead}>
              <h2>Upload references</h2>
              <span>Optional for the first concept sketch</span>
            </div>
            <div className={styles.uploadArea}>
              <img src="/assets/novora_upload_reference_placeholder.png" alt="Reference upload placeholder" />
              <p>Drop inspiration photos, sketches, or meaningful symbols.</p>
            </div>
          </article>
        </div>

        <aside className={styles.rightCol}>
          <div className={styles.stickyBox}>
            <article className={styles.panelCardHero}>
              <div>
                <h3>Preview lane</h3>
                <p>We start with an AI concept sketch based on your selected direction.</p>
              </div>
              <img src="/assets/novora_ai_sketch_pendant.png" alt="AI pendant sketch preview" />
            </article>

            <article className={styles.panelCard}>
              <h3>Brief summary</h3>
              <dl className={styles.summaryList}>
                <div><dt>Recipient</dt><dd>{recipientLabel}</dd></div>
                <div><dt>Piece</dt><dd>{jewelryLabel}</dd></div>
                <div><dt>Style</dt><dd>{styleLabel}</dd></div>
                <div><dt>Budget</dt><dd>{selectedBudget}</dd></div>
              </dl>
              <h3 className={styles.nextTitle}>What happens next</h3>
              <ul>
                {checklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className={styles.note}>
                You will receive an AI concept sketch first. Professional CAD is a separate paid step.
              </p>
              <Link href="/design/concept" className={styles.cta}>Continue to Concept</Link>
            </article>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SelectionSection({
  title,
  subtitle,
  options,
  selected,
  onSelect,
}: {
  title: string;
  subtitle: string;
  options: Option[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className={styles.optionGrid}>
        {options.map((item) => {
          const isSelected = selected === item.value;
          const iconStyle = {
            '--icon-image': `url(${item.asset})`,
            '--icon-position': item.position,
          } as CSSProperties;

          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isSelected}
              className={`${styles.optionCard} ${isSelected ? styles.optionSelected : ''}`}
              onClick={() => onSelect(item.value)}
            >
              <span className={styles.iconTile} style={iconStyle} aria-hidden="true" />
              <span className={styles.optionText}>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <span className={styles.checkMark} aria-hidden="true">Selected</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
