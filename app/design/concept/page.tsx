'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from './concept.module.css';

type Option = {
  label: string;
  value: string;
  assetSrc?: string;
  assetPlaceholder?: string;
  description?: string;
};

type ShapeState = {
  shape: string;
  fancyCut: string;
  customNote: string;
};

const mainStoneNeeds: Option[] = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
  { label: 'Not sure yet', value: 'not_sure_yet' },
];

const stoneTypes: Option[] = [
  { label: 'Natural Diamond', value: 'natural_diamond' },
  { label: 'Natural Gemstone', value: 'natural_gemstone' },
  { label: 'Lab-Grown Diamond', value: 'lab_grown_diamond' },
  { label: 'Lab-Grown Colored Gemstone', value: 'lab_grown_colored_gemstone' },
  { label: 'Not Sure', value: 'not_sure' },
];

const stoneColors: Option[] = [
  { label: 'White', value: 'white' },
  { label: 'Champagne', value: 'champagne' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Pink', value: 'pink' },
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Red', value: 'red' },
  { label: 'Purple', value: 'purple' },
  { label: 'Black', value: 'black' },
  { label: 'Not sure', value: 'not_sure' },
];

const stoneSizes: Option[] = [
  { label: 'mm', value: 'mm' },
  { label: 'carat', value: 'carat' },
  { label: 'Not sure', value: 'not_sure' },
];

const stoneQuantities: Option[] = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3+', value: '3_plus' },
  { label: 'Not sure', value: 'not_sure' },
];

const cutOptions: Option[] = [
  {
    label: 'Round',
    value: 'round',
    assetSrc: '/assets/design/concept/cuts/round.png',
    assetPlaceholder: 'round-shape',
  },
  {
    label: 'Oval',
    value: 'oval',
    assetSrc: '/assets/design/concept/cuts/oval.png',
    assetPlaceholder: 'oval-shape',
  },
  {
    label: 'Pear',
    value: 'pear',
    assetSrc: '/assets/design/concept/cuts/pear.png',
    assetPlaceholder: 'pear-shape',
  },
  {
    label: 'Emerald',
    value: 'emerald',
    assetSrc: '/assets/design/concept/cuts/emerald.png',
    assetPlaceholder: 'emerald-shape',
  },
  {
    label: 'Cushion',
    value: 'cushion',
    assetSrc: '/assets/design/concept/cuts/cushion.png',
    assetPlaceholder: 'cushion-shape',
  },
  {
    label: 'Marquise',
    value: 'marquise',
    assetSrc: '/assets/design/concept/cuts/marquise.png',
    assetPlaceholder: 'marquise-shape',
  },
  {
    label: 'Heart',
    value: 'heart',
    assetSrc: '/assets/design/concept/cuts/heart.png',
    assetPlaceholder: 'heart-shape',
  },
  {
    label: 'Other fancy cut',
    value: 'other_fancy_cut',
    assetSrc: '/assets/design/concept/cuts/other-fancy-cut.png',
    assetPlaceholder: 'fancy-cut-library',
    description: 'Choose from future expandable NOVORA supply-chain fancy cut options.',
  },
  {
    label: 'Custom',
    value: 'custom',
    assetSrc: '/assets/design/concept/cuts/custom.png',
    assetPlaceholder: 'custom-shape-brief',
    description: 'Upload or describe a special shape later.',
  },
  {
    label: 'Not sure',
    value: 'not_sure',
    assetSrc: '/assets/design/concept/cuts/not-sure.png',
    assetPlaceholder: 'not-sure-shape',
  },
];

const fancyCuts = [
  'Asscher',
  'Radiant',
  'Trillion',
  'Baguette',
  'Kite',
  'Shield',
  'Hexagon',
  'Rose Cut',
  'Portrait Cut',
];

const additionalDirections: Option[] = [
  { label: 'Same as stone 1', value: 'same_as_stone_1', assetPlaceholder: 'same-stone-1' },
  { label: 'Same as stone 2', value: 'same_as_stone_2', assetPlaceholder: 'same-stone-2' },
  { label: 'Mixed shapes', value: 'mixed_shapes', assetPlaceholder: 'mixed-shapes' },
  { label: 'Graduated rounds', value: 'graduated_rounds', assetPlaceholder: 'graduated-rounds' },
  { label: 'Symmetrical pair layout', value: 'symmetrical_pair_layout', assetPlaceholder: 'symmetrical-pair' },
  { label: 'Organic cluster layout', value: 'organic_cluster_layout', assetPlaceholder: 'organic-cluster' },
  { label: 'Custom direction', value: 'custom_direction', assetPlaceholder: 'custom-direction' },
  { label: 'Not sure', value: 'not_sure', assetPlaceholder: 'not-sure-layout' },
];

const emptyShape: ShapeState = {
  shape: '',
  fancyCut: '',
  customNote: '',
};

const enableCutImageAssets = false;

function optionLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label || '';
}

function ShapePreview({ option }: { option: Option }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = enableCutImageAssets && option.assetSrc && !imageFailed;

  return (
    <span className={styles.shapePreview} aria-hidden="true">
      {showImage ? (
        <img
          alt=""
          className={styles.shapeImage}
          onError={() => setImageFailed(true)}
          src={option.assetSrc}
        />
      ) : (
        <span className={`${styles.shapeIcon} ${styles[option.value]}`} />
      )}
    </span>
  );
}

function ShapeSelector({
  title,
  value,
  onChange,
}: {
  title: string;
  value: ShapeState;
  onChange: (nextValue: ShapeState) => void;
}) {
  const selectedShape = optionLabel(cutOptions, value.shape);

  return (
    <section className={styles.selectorGroup} aria-labelledby={`${title.replace(/\s+/g, '-')}-title`}>
      <div className={styles.sectionHeading}>
        <h2 id={`${title.replace(/\s+/g, '-')}-title`}>{title}</h2>
        <p>Choose the closest shape direction for this individual main stone.</p>
      </div>

      <div className={styles.shapeGrid}>
        {cutOptions.map((option) => (
          <button
            className={`${styles.shapeCard} ${value.shape === option.value ? styles.selectedCard : ''}`}
            key={option.value}
            onClick={() =>
              onChange({
                ...value,
                shape: option.value,
                fancyCut: option.value === 'other_fancy_cut' ? value.fancyCut : '',
                customNote: option.value === 'custom' ? value.customNote : '',
              })
            }
            type="button"
          >
            <ShapePreview option={option} />
            <span className={styles.shapeLabel}>{option.label}</span>
            {option.description ? <span className={styles.shapeDescription}>{option.description}</span> : null}
          </button>
        ))}
      </div>

      {value.shape === 'other_fancy_cut' ? (
        <div className={styles.inlinePanel}>
          <p>Expandable NOVORA fancy cut options</p>
          <div className={styles.chipGrid}>
            {fancyCuts.map((cut) => (
              <button
                className={`${styles.choiceChip} ${value.fancyCut === cut ? styles.selectedChip : ''}`}
                key={cut}
                onClick={() => onChange({ ...value, fancyCut: cut })}
                type="button"
              >
                {cut}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {value.shape === 'custom' ? (
        <label className={styles.field}>
          <span>{selectedShape} note</span>
          <textarea
            onChange={(event) => onChange({ ...value, customNote: event.target.value })}
            placeholder="Describe the special shape you will upload or explain later."
            value={value.customNote}
          />
        </label>
      ) : null}
    </section>
  );
}

export default function DesignConceptPage() {
  const [mainStoneNeed, setMainStoneNeed] = useState('not_sure_yet');
  const [stoneType, setStoneType] = useState('not_sure');
  const [stoneColor, setStoneColor] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [stoneSizeUnit, setStoneSizeUnit] = useState('not_sure');
  const [stoneSizeValue, setStoneSizeValue] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [stoneOne, setStoneOne] = useState<ShapeState>(emptyShape);
  const [stoneTwo, setStoneTwo] = useState<ShapeState>(emptyShape);
  const [additionalDirection, setAdditionalDirection] = useState('');
  const [additionalCustomDirection, setAdditionalCustomDirection] = useState('');
  const [additionalLayoutNote, setAdditionalLayoutNote] = useState('');
  const [placeholderMessage, setPlaceholderMessage] = useState('');

  const activeShapeCount = quantity === '2' || quantity === '3_plus' ? 2 : 1;

  const summaryItems = useMemo(() => {
    const colorParts = [optionLabel(stoneColors, stoneColor), customColor.trim()].filter(Boolean);
    const stoneSize =
      stoneSizeUnit === 'not_sure'
        ? 'Not sure'
        : [stoneSizeValue.trim(), optionLabel(stoneSizes, stoneSizeUnit)].filter(Boolean).join(' ');

    const items = [
      ['Main stone needed', optionLabel(mainStoneNeeds, mainStoneNeed)],
      ['Stone type', optionLabel(stoneTypes, stoneType)],
      ['Stone color', colorParts.join(', ') || 'Not selected'],
      ['Stone size', stoneSize || 'Not selected'],
      ['Quantity', optionLabel(stoneQuantities, quantity)],
      ['Main stone 1 shape', optionLabel(cutOptions, stoneOne.shape) || 'Not selected'],
    ];

    if (stoneOne.shape === 'other_fancy_cut') {
      items.push(['Main stone 1 fancy cut', stoneOne.fancyCut || 'Not selected']);
    }

    if (stoneOne.customNote.trim()) {
      items.push(['Main stone 1 custom note', stoneOne.customNote.trim()]);
    }

    if (activeShapeCount === 2) {
      items.push(['Main stone 2 shape', optionLabel(cutOptions, stoneTwo.shape) || 'Not selected']);

      if (stoneTwo.shape === 'other_fancy_cut') {
        items.push(['Main stone 2 fancy cut', stoneTwo.fancyCut || 'Not selected']);
      }

      if (stoneTwo.customNote.trim()) {
        items.push(['Main stone 2 custom note', stoneTwo.customNote.trim()]);
      }
    }

    if (quantity === '3_plus') {
      items.push([
        'Additional main stones shape direction',
        optionLabel(additionalDirections, additionalDirection) || 'Not selected',
      ]);

      if (additionalDirection === 'custom_direction' && additionalCustomDirection.trim()) {
        items.push(['Additional custom direction', additionalCustomDirection.trim()]);
      }

      if (additionalLayoutNote.trim()) {
        items.push(['Additional layout note', additionalLayoutNote.trim()]);
      }
    }

    return items;
  }, [
    activeShapeCount,
    additionalCustomDirection,
    additionalDirection,
    additionalLayoutNote,
    customColor,
    mainStoneNeed,
    quantity,
    stoneColor,
    stoneOne,
    stoneSizeUnit,
    stoneSizeValue,
    stoneType,
    stoneTwo,
  ]);

  return (
    <main className={styles.pageShell}>
      <section className={styles.intro}>
        <p className={styles.step}>AI Concept Sketch Brief</p>
        <h1>Main stone intake</h1>
        <p>
          This step prepares your AI hand-drawn concept sketch brief. Professional CAD is a separate paid step after
          the design direction is confirmed.
        </p>
      </section>

      <div className={styles.layout}>
        <form className={styles.form}>
          <section className={styles.panel}>
            <div className={styles.sectionHeading}>
              <h2>Main stone basics</h2>
              <p>Capture the stone direction before the sketch brief is created.</p>
            </div>

            <fieldset className={styles.fieldset}>
              <legend>Does this piece need a main stone?</legend>
              <div className={styles.optionRow}>
                {mainStoneNeeds.map((option) => (
                  <button
                    className={`${styles.choiceChip} ${mainStoneNeed === option.value ? styles.selectedChip : ''}`}
                    key={option.value}
                    onClick={() => setMainStoneNeed(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Stone type</legend>
              <div className={styles.optionRow}>
                {stoneTypes.map((option) => (
                  <button
                    className={`${styles.choiceChip} ${stoneType === option.value ? styles.selectedChip : ''}`}
                    key={option.value}
                    onClick={() => setStoneType(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Stone color</legend>
              <div className={styles.colorGrid}>
                {stoneColors.map((option) => (
                  <button
                    className={`${styles.colorChip} ${stoneColor === option.value ? styles.selectedChip : ''}`}
                    key={option.value}
                    onClick={() => setStoneColor(option.value)}
                    type="button"
                  >
                    <span className={`${styles.swatch} ${styles[option.value]}`} aria-hidden="true" />
                    {option.label}
                  </button>
                ))}
              </div>
              <label className={styles.field}>
                <span>Custom color note</span>
                <input
                  onChange={(event) => setCustomColor(event.target.value)}
                  placeholder="Example: cornflower blue, warm peach, moss green"
                  type="text"
                  value={customColor}
                />
              </label>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Stone size</legend>
              <div className={styles.sizeRow}>
                <div className={styles.optionRow}>
                  {stoneSizes.map((option) => (
                    <button
                      className={`${styles.choiceChip} ${stoneSizeUnit === option.value ? styles.selectedChip : ''}`}
                      key={option.value}
                      onClick={() => {
                        setStoneSizeUnit(option.value);
                        if (option.value === 'not_sure') {
                          setStoneSizeValue('');
                        }
                      }}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {stoneSizeUnit !== 'not_sure' ? (
                  <label className={styles.compactField}>
                    <span>Size</span>
                    <input
                      inputMode="decimal"
                      onChange={(event) => setStoneSizeValue(event.target.value)}
                      placeholder={stoneSizeUnit === 'mm' ? 'Example: 8 x 6' : 'Example: 1.5'}
                      type="text"
                      value={stoneSizeValue}
                    />
                  </label>
                ) : null}
              </div>
            </fieldset>

            <fieldset className={styles.fieldset}>
              <legend>Main stone quantity</legend>
              <div className={styles.optionRow}>
                {stoneQuantities.map((option) => (
                  <button
                    className={`${styles.choiceChip} ${quantity === option.value ? styles.selectedChip : ''}`}
                    key={option.value}
                    onClick={() => setQuantity(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <ShapeSelector title="Main stone 1 shape" value={stoneOne} onChange={setStoneOne} />

          {activeShapeCount === 2 ? <ShapeSelector title="Main stone 2 shape" value={stoneTwo} onChange={setStoneTwo} /> : null}

          {quantity === '3_plus' ? (
            <section className={styles.selectorGroup}>
              <div className={styles.sectionHeading}>
                <h2>Additional main stones shape direction</h2>
                <p>Choose a visual direction for the remaining main stones.</p>
              </div>

              <div className={styles.shapeGrid}>
                {additionalDirections.map((option) => (
                  <button
                    className={`${styles.shapeCard} ${
                      additionalDirection === option.value ? styles.selectedCard : ''
                    }`}
                    key={option.value}
                    onClick={() => setAdditionalDirection(option.value)}
                    type="button"
                  >
                    <span className={styles.shapePreview} aria-hidden="true">
                      <span className={`${styles.layoutIcon} ${styles[option.value]}`} />
                    </span>
                    <span className={styles.shapeLabel}>{option.label}</span>
                  </button>
                ))}
              </div>

              {additionalDirection === 'custom_direction' ? (
                <label className={styles.field}>
                  <span>Describe the shape mix, spacing, or layout direction for the additional stones.</span>
                  <textarea
                    onChange={(event) => setAdditionalCustomDirection(event.target.value)}
                    value={additionalCustomDirection}
                  />
                </label>
              ) : null}

              <label className={styles.field}>
                <span>Additional layout note</span>
                <textarea
                  onChange={(event) => setAdditionalLayoutNote(event.target.value)}
                  placeholder="Optional note for balance, spacing, hierarchy, or layout mood."
                  value={additionalLayoutNote}
                />
              </label>
            </section>
          ) : null}
        </form>

        <aside className={styles.summaryPanel} aria-label="Brief summary">
          <div className={styles.summaryHeader}>
            <p className={styles.step}>Brief Summary</p>
            <h2>Main stone direction</h2>
          </div>

          <dl className={styles.summaryList}>
            {summaryItems.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <p className={styles.requiredNote}>
            This step prepares your AI hand-drawn concept sketch brief. Professional CAD is a separate paid step after
            the design direction is confirmed.
          </p>

          <div className={styles.actions}>
            <Link className="btnSecondary" href="/design/start">
              Back to /design/start
            </Link>
            <button
              className="btn"
              onClick={() => setPlaceholderMessage('Next concept step placeholder. No information has been saved yet.')}
              type="button"
            >
              Continue to next concept step
            </button>
          </div>
          {placeholderMessage ? <p className={styles.placeholderMessage}>{placeholderMessage}</p> : null}
        </aside>
      </div>
    </main>
  );
}
