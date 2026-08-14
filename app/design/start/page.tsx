'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './start.module.css';
import { useI18n } from '../../../lib/i18n/client';
import type { Dictionary } from '../../../lib/i18n/dictionaries';
import { localizePath } from '../../../lib/i18n/routing';

type StartCopyKey = keyof Dictionary['designStart'];

type Option = {
  value: string;
  labelKey: StartCopyKey;
  detailKey: StartCopyKey;
  asset: string;
};

const recipients: Option[] = [
  { value: 'myself', labelKey: 'ds001', detailKey: 'ds002', asset: '/assets/icon_recipient_myself.png' },
  { value: 'partner', labelKey: 'ds003', detailKey: 'ds004', asset: '/assets/icon_recipient_partner.png' },
  { value: 'family-friend', labelKey: 'ds005', detailKey: 'ds006', asset: '/assets/icon_recipient_family_friend.png' },
  { value: 'commemorative', labelKey: 'ds007', detailKey: 'ds008', asset: '/assets/icon_recipient_commemorative.png' },
];

const jewelryTypes: Option[] = [
  { value: 'ring', labelKey: 'ds009', detailKey: 'ds010', asset: '/assets/icon_jewelry_ring.png' },
  { value: 'pendant_necklace', labelKey: 'ds011', detailKey: 'ds012', asset: '/assets/icon_jewelry_pendant.png' },
  { value: 'bracelet_bangle', labelKey: 'ds013', detailKey: 'ds014', asset: '/assets/icon_jewelry_bracelet.png' },
  { value: 'earrings', labelKey: 'ds015', detailKey: 'ds016', asset: '/assets/icon_jewelry_earrings.png' },
  { value: 'other_custom', labelKey: 'ds017', detailKey: 'ds018', asset: '/assets/icon_jewelry_other.png' },
];

const styleOptions: Option[] = [
  { value: 'minimal', labelKey: 'ds019', detailKey: 'ds020', asset: '/assets/icon_style_minimal.png' },
  { value: 'organic', labelKey: 'ds021', detailKey: 'ds022', asset: '/assets/icon_style_organic.png' },
  { value: 'vintage', labelKey: 'ds023', detailKey: 'ds024', asset: '/assets/icon_style_vintage.png' },
  { value: 'bold-modern', labelKey: 'ds025', detailKey: 'ds026', asset: '/assets/icon_style_bold_modern.png' },
  { value: 'your-style', labelKey: 'ds027', detailKey: 'ds028', asset: '/assets/icon_style_your_style.png' },
];

const budgets = ['Under USD 500', 'USD 500-1200', 'USD 1200-2500', 'USD 2500+'];
const budgetCopyKeys: Record<(typeof budgets)[number], StartCopyKey> = {
  'Under USD 500': 'budgetUnder500',
  'USD 500-1200': 'budget500To1200',
  'USD 1200-2500': 'budget1200To2500',
  'USD 2500+': 'budget2500Plus',
};
const checklist: StartCopyKey[] = ['checklistBrief', 'checklistReview', 'checklistCad'];

export default function DesignStartPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.designStart;
  const [selectedRecipient, setSelectedRecipient] = useState(recipients[0].value);
  const [selectedJewelryType, setSelectedJewelryType] = useState(jewelryTypes[0].value);
  const [selectedStyle, setSelectedStyle] = useState(styleOptions[0].value);
  const [selectedBudget, setSelectedBudget] = useState(budgets[1]);

  const recipientLabelKey = recipients.find((item) => item.value === selectedRecipient)?.labelKey;
  const jewelryLabelKey = jewelryTypes.find((item) => item.value === selectedJewelryType)?.labelKey;
  const styleLabelKey = styleOptions.find((item) => item.value === selectedStyle)?.labelKey;
  const recipientLabel = recipientLabelKey ? copy[recipientLabelKey] : '';
  const jewelryLabel = jewelryLabelKey ? copy[jewelryLabelKey] : '';
  const styleLabel = styleLabelKey ? copy[styleLabelKey] : '';
  const conceptParams = new URLSearchParams({
    pieceType: selectedJewelryType,
    recipient: selectedRecipient,
    style: selectedStyle,
    budget: selectedBudget,
  });
  const conceptHref = localizePath(`/design/concept?${conceptParams.toString()}`, locale);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.step}>{copy.ds029}</p>
          <h1>{copy.ds030}</h1>
        </div>
        <p className={styles.headerNote}>{copy.ds031}</p>
      </header>

      <section className={styles.layout}>
        <div className={styles.leftCol}>
          <SelectionSection
            title={copy.ds032}
            subtitle={copy.ds033}
            options={recipients}
            selected={selectedRecipient}
            onSelect={setSelectedRecipient}
          />

          <SelectionSection
            title={copy.ds034}
            subtitle={copy.ds035}
            options={jewelryTypes}
            selected={selectedJewelryType}
            onSelect={setSelectedJewelryType}
          />

          <SelectionSection
            title={copy.ds036}
            subtitle={copy.ds037}
            options={styleOptions}
            selected={selectedStyle}
            onSelect={setSelectedStyle}
          />

          <article className={styles.cardCompact}>
            <div className={styles.cardHead}>
              <h2>{copy.ds038}</h2>
              <span>{copy.ds039}</span>
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
                  {copy[budgetCopyKeys[item]]}
                </button>
              ))}
            </div>
          </article>

          <article className={styles.cardCompact}>
            <div className={styles.cardHead}>
              <h2>{copy.ds040}</h2>
              <span>{copy.ds041}</span>
            </div>
            <div className={styles.referenceArea}>
              <span className={styles.referenceIcon} aria-hidden="true">{copy.ds042}</span>
              <strong>{copy.ds043}</strong>
              <p>
                {copy.ds044}</p>
            </div>
          </article>
        </div>

        <aside className={styles.rightCol}>
          <div className={styles.stickyBox}>
            <article className={styles.panelCardHero}>
              <div>
                <h3>{copy.ds045}</h3>
                <p>{copy.ds046}</p>
              </div>
              <img src="/assets/novora_ai_sketch_pendant.png" alt={copy.ds047} />
            </article>

            <article className={styles.panelCard}>
              <h3>{copy.ds048}</h3>
              <dl className={styles.summaryList}>
                <div><dt>{copy.ds032}</dt><dd>{recipientLabel}</dd></div>
                <div><dt>{copy.ds049}</dt><dd>{jewelryLabel}</dd></div>
                <div><dt>{copy.ds050}</dt><dd>{styleLabel}</dd></div>
                <div><dt>{copy.ds038}</dt><dd>{copy[budgetCopyKeys[selectedBudget]]}</dd></div>
              </dl>
              <h3 className={styles.nextTitle}>{copy.ds051}</h3>
              <ul>
                {checklist.map((item) => <li key={item}>{copy[item]}</li>)}
              </ul>
              <p className={styles.note}>
                {copy.ds052}</p>
              <Link href={conceptHref} className={styles.cta}>{copy.ds053}</Link>
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
  const { dictionary } = useI18n();
  const copy = dictionary.designStart;
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className={styles.optionGrid}>
        {options.map((item) => {
          const isSelected = selected === item.value;

          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isSelected}
              className={`${styles.optionCard} ${isSelected ? styles.optionSelected : ''}`}
              onClick={() => onSelect(item.value)}
            >
              <span className={styles.iconTile} aria-hidden="true">
                <img src={item.asset} alt="" />
              </span>
              <span className={styles.optionText}>
                <strong>{copy[item.labelKey]}</strong>
                <small>{copy[item.detailKey]}</small>
              </span>
              <span className={styles.checkMark} aria-hidden="true">{copy.ds054}</span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
