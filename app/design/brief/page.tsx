'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from './brief.module.css';

type ShapeState = {
  shape: string;
  fancyCut: string;
  customNote: string;
};

type SummaryItem = {
  label: string;
  value: string;
};

type StoredConceptBrief = {
  mainStoneNeed: string;
  stoneType: string;
  stoneColor: string;
  customColor: string;
  stoneSizeUnit: string;
  stoneSizeValue: string;
  quantity: string;
  stoneOne: ShapeState;
  stoneTwo: ShapeState;
  additionalDirection: string;
  additionalCustomDirection: string;
  additionalLayoutNote: string;
  accentStoneNeed: string;
  accentStoneType: string;
  accentStoneColor: string;
  accentStoneShape: string;
  accentStoneQuantityFeeling: string;
  accentStoneLayout: string;
  accentStoneNote: string;
  metalType: string;
  metalColor: string;
  finishDirection: string;
  metalNote: string;
  summaryItems?: SummaryItem[];
};

const STORAGE_KEY = 'novora_concept_brief';

const labels: Record<string, Record<string, string>> = {
  mainStoneNeed: {
    yes: 'Yes',
    no: 'No',
    not_sure_yet: 'Not sure yet',
  },
  stoneType: {
    natural_diamond: 'Natural Diamond',
    natural_gemstone: 'Natural Gemstone',
    lab_grown_diamond: 'Lab-Grown Diamond',
    lab_grown_colored_gemstone: 'Lab-Grown Colored Gemstone',
    not_sure: 'Not Sure',
  },
  stoneColor: {
    white: 'White',
    champagne: 'Champagne',
    yellow: 'Yellow',
    pink: 'Pink',
    blue: 'Blue',
    green: 'Green',
    red: 'Red',
    purple: 'Purple',
    black: 'Black',
    not_sure: 'Not sure',
  },
  stoneSizeUnit: {
    mm: 'mm',
    carat: 'carat',
    not_sure: 'Not sure',
  },
  quantity: {
    '1': '1',
    '2': '2',
    '3_plus': '3+',
    not_sure: 'Not sure',
  },
  cut: {
    round: 'Round',
    oval: 'Oval',
    pear: 'Pear',
    emerald: 'Emerald',
    cushion: 'Cushion',
    marquise: 'Marquise',
    heart: 'Heart',
    other_fancy_cut: 'Other fancy cut',
    custom: 'Custom',
    not_sure: 'Not sure',
  },
  additionalDirection: {
    same_as_stone_1: 'Same as stone 1',
    same_as_stone_2: 'Same as stone 2',
    mixed_shapes: 'Mixed shapes',
    graduated_rounds: 'Graduated rounds',
    symmetrical_pair_layout: 'Symmetrical pair layout',
    organic_cluster_layout: 'Organic cluster layout',
    custom_direction: 'Custom direction',
    not_sure: 'Not sure',
  },
  accentStoneNeed: {
    yes: 'Yes',
    no: 'No',
    let_novora_suggest: 'Let NOVORA suggest',
  },
  accentStoneType: {
    natural_diamond: 'Natural diamond',
    lab_grown_diamond: 'Lab-grown diamond',
    natural_gemstone: 'Natural gemstone',
    lab_grown_colored_gemstone: 'Lab-grown colored gemstone',
    not_sure: 'Not sure',
  },
  accentStoneColor: {
    white: 'White',
    champagne: 'Champagne',
    yellow: 'Yellow',
    pink: 'Pink',
    blue: 'Blue',
    green: 'Green',
    red: 'Red',
    purple: 'Purple',
    black: 'Black',
    match_main_stone: 'Match main stone',
    let_novora_suggest: 'Let NOVORA suggest',
  },
  accentStoneShape: {
    round: 'Round',
    oval: 'Oval',
    pear: 'Pear',
    marquise: 'Marquise',
    baguette: 'Baguette',
    mixed_small_stones: 'Mixed small stones',
    let_novora_suggest: 'Let NOVORA suggest',
    not_sure: 'Not sure',
  },
  accentStoneQuantityFeeling: {
    minimal: 'Minimal',
    balanced: 'Balanced',
    rich: 'Rich',
    full_pave: 'Full pave',
    not_sure: 'Not sure',
  },
  accentStoneLayout: {
    halo: 'Halo',
    side_stones: 'Side stones',
    scattered: 'Scattered',
    pave_band: 'Pave band',
    cluster: 'Cluster',
    hidden_accent: 'Hidden accent',
    let_novora_suggest: 'Let NOVORA suggest',
  },
  metalType: {
    sterling_silver: 'Sterling Silver',
    '14k_gold': '14K Gold',
    '18k_gold': '18K Gold',
    platinum: 'Platinum',
    not_sure: 'Not sure',
  },
  metalColor: {
    yellow: 'Yellow',
    white: 'White',
    rose: 'Rose',
    two_tone: 'Two-tone',
    not_sure: 'Not sure',
  },
  finishDirection: {
    high_polish: 'High polish',
    matte: 'Matte',
    brushed: 'Brushed',
    vintage: 'Vintage',
    not_sure: 'Not sure',
  },
};

function label(group: keyof typeof labels, value: string) {
  return labels[group][value] || 'Not selected';
}

function isOpenValue(value: string) {
  return !value || value === 'not_sure' || value === 'not_sure_yet' || value === 'let_novora_suggest';
}

function softLabel(group: keyof typeof labels, value: string, fallback = 'Open for NOVORA guidance') {
  return isOpenValue(value) ? fallback : label(group, value);
}

function joinDetails(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(', ');
}

function sentenceList(parts: string[]) {
  return parts.filter(Boolean).join(' ');
}

function shapeDirection(shape: ShapeState) {
  if (isOpenValue(shape.shape)) {
    return 'Open for NOVORA guidance';
  }

  const base = label('cut', shape.shape);

  if (shape.shape === 'other_fancy_cut') {
    return joinDetails([base, shape.fancyCut || 'fancy cut to be refined during sketch preparation']);
  }

  if (shape.shape === 'custom') {
    return joinDetails([base, shape.customNote.trim() || 'special shape to be described later']);
  }

  return base;
}

function stoneSize(brief: StoredConceptBrief) {
  if (isOpenValue(brief.stoneSizeUnit)) {
    return '';
  }

  return joinDetails([brief.stoneSizeValue.trim(), label('stoneSizeUnit', brief.stoneSizeUnit)]);
}

function mainStoneDirection(brief: StoredConceptBrief) {
  if (isOpenValue(brief.mainStoneNeed) && isOpenValue(brief.stoneType) && isOpenValue(brief.stoneColor)) {
    return "Your piece is currently open for NOVORA's guidance on the main stone direction. The first sketch will focus on finding a balanced main stone presence before CAD-level details are confirmed.";
  }

  if (brief.mainStoneNeed === 'no') {
    return "Your concept is leaning away from a dominant main stone, so NOVORA can focus the first sketch on silhouette, metal form, and any supporting detail instead.";
  }

  const stoneType = softLabel('stoneType', brief.stoneType, 'a stone type to be refined during sketch preparation');
  const color = joinDetails([
    softLabel('stoneColor', brief.stoneColor, 'color direction open for NOVORA guidance'),
    brief.customColor.trim(),
  ]);
  const size = stoneSize(brief);
  const quantity =
    brief.quantity === '1'
      ? 'one main stone'
      : isOpenValue(brief.quantity)
        ? 'a main stone count NOVORA can suggest'
        : `${label('quantity', brief.quantity)} main stones`;

  return sentenceList([
    `The concept is directed around ${quantity} in ${stoneType}.`,
    `Color is ${color}.`,
    size ? `Approximate size direction: ${size}.` : 'Exact size is not finalized yet.',
  ]);
}

function shapeSummary(brief: StoredConceptBrief) {
  const firstShape = shapeDirection(brief.stoneOne);
  const parts = [
    firstShape === 'Open for NOVORA guidance'
      ? 'The main stone shape is open for NOVORA guidance during sketch preparation.'
      : `The first main stone shape direction is ${firstShape}.`,
  ];

  if (brief.quantity === '2') {
    const secondShape = shapeDirection(brief.stoneTwo);
    parts.push(
      secondShape === 'Open for NOVORA guidance'
        ? 'The second main stone shape can be refined to balance the first.'
        : `The second main stone shape direction is ${secondShape}.`,
    );
  }

  if (brief.quantity === '3_plus') {
    const additionalDirection = softLabel(
      'additionalDirection',
      brief.additionalDirection,
      'additional stone layout to be refined during sketch preparation',
    );
    parts.push(
      `Additional main stones should follow ${joinDetails([
        additionalDirection,
        brief.additionalCustomDirection.trim(),
      ])}.`,
    );
  }

  if (brief.additionalLayoutNote.trim()) {
    parts.push(`Layout note: ${brief.additionalLayoutNote.trim()}.`);
  }

  return parts.join(' ');
}

function accentDirection(brief: StoredConceptBrief) {
  if (brief.accentStoneNeed === 'no') {
    return 'Accent stones are not part of the current direction, keeping the first sketch focused on the core form.';
  }

  if (brief.accentStoneNeed === 'let_novora_suggest') {
    return 'Accent stones are open for NOVORA guidance. The first sketch can explore whether subtle side stones, a halo, pave detail, or a cleaner setting best supports the main design.';
  }

  return sentenceList([
    `Accent stones are included with ${softLabel('accentStoneType', brief.accentStoneType, 'stone type to be refined')}.`,
    `Color direction: ${softLabel('accentStoneColor', brief.accentStoneColor, 'NOVORA can suggest this direction')}.`,
    `Shape direction: ${softLabel('accentStoneShape', brief.accentStoneShape, 'open for NOVORA guidance')}.`,
    `Sparkle feeling: ${softLabel('accentStoneQuantityFeeling', brief.accentStoneQuantityFeeling, 'not finalized yet')}.`,
    `Layout direction: ${softLabel('accentStoneLayout', brief.accentStoneLayout, 'NOVORA can suggest this direction')}.`,
    brief.accentStoneNote.trim() ? `Note: ${brief.accentStoneNote.trim()}.` : '',
  ]);
}

function metalDirection(brief: StoredConceptBrief) {
  const type = softLabel('metalType', brief.metalType, 'metal type to be refined during sketch preparation');
  const color = softLabel('metalColor', brief.metalColor, 'metal color open for NOVORA guidance');
  const finish = softLabel('finishDirection', brief.finishDirection, 'finish direction not finalized yet');

  return sentenceList([
    `Metal direction: ${type}.`,
    `Color: ${color}.`,
    `Finish: ${finish}.`,
    brief.metalNote.trim() ? `Note: ${brief.metalNote.trim()}.` : '',
  ]);
}

export default function DesignBriefPage() {
  const [brief, setBrief] = useState<StoredConceptBrief | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  useEffect(() => {
    try {
      const rawBrief = window.sessionStorage.getItem(STORAGE_KEY);

      if (rawBrief) {
        setBrief(JSON.parse(rawBrief) as StoredConceptBrief);
      }
    } catch {
      setBrief(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const designDirection = useMemo(() => {
    if (!brief) {
      return null;
    }

    return [
      ['Main stone direction', mainStoneDirection(brief)],
      ['Shape direction', shapeSummary(brief)],
      ['Accent stone direction', accentDirection(brief)],
      ['Metal & finish direction', metalDirection(brief)],
    ];
  }, [brief]);

  if (!isLoaded) {
    return <main className={styles.pageBackground} />;
  }

  if (!brief || !designDirection) {
    return (
      <main className={styles.pageBackground}>
        <section className={`${styles.shell} ${styles.emptyShell}`}>
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>Concept brief</p>
            <h1>No concept direction found</h1>
            <p>
              Start the concept intake first so NOVORA can organize your choices into an AI hand-drawn sketch brief.
            </p>
            <Link className={styles.primaryButton} href="/design/concept">
              Start concept intake
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const aiBrief = [
    [
      'Design objective',
      'Prepare a refined AI hand-drawn concept sketch that translates the customer direction into an early jewelry design vision.',
    ],
    ['Main stone direction', mainStoneDirection(brief)],
    ['Supporting stone direction', accentDirection(brief)],
    ['Metal and finish direction', metalDirection(brief)],
    ['Visual mood', 'Warm, refined, personal, and suitable for an early custom jewelry concept direction.'],
    [
      'Notes for NOVORA designer',
      joinDetails([
        shapeSummary(brief),
        brief.accentStoneNote.trim(),
        brief.metalNote.trim(),
        'Confirm stone availability, setting direction, material details, and feasibility before paid CAD or production.',
      ]),
    ],
  ];

  return (
    <main className={styles.pageBackground}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>NOVORA Concept Brief</p>
          <h1>Your concept direction is ready</h1>
          <p>NOVORA has organized your design choices into an AI hand-drawn sketch brief.</p>
          <p className={styles.completionNote}>
            This is not a final order or CAD file yet. It is the design direction NOVORA will use to prepare your first
            AI hand-drawn concept sketch.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Your Design Direction</p>
              <h2>Organized concept summary</h2>
            </div>
            <div className={styles.directionList}>
              {designDirection.map(([title, value]) => (
                <section key={title}>
                  <h3>{title}</h3>
                  <p>{value}</p>
                </section>
              ))}
            </div>
          </article>

          <aside className={`${styles.panel} ${styles.nextPanel}`}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>What happens next</p>
              <h2>Sketch first, CAD later</h2>
            </div>
            <p>
              Your next step is the AI hand-drawn concept sketch. CAD is a separate paid step after NOVORA confirms the
              design direction, stone size, material, setting details, feasibility, and early quote direction. Pricing
              and production details are not finalized at this stage.
            </p>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                onClick={() =>
                  setConfirmationMessage(
                    'Your concept brief is prepared. Submission and order intake will be connected in the next step.',
                  )
                }
                type="button"
              >
                Prepare my AI concept sketch
              </button>
              <Link className={styles.secondaryButton} href="/design/pro-cad">
                Continue to paid CAD process
              </Link>
              <Link className={styles.tertiaryButton} href="/design/concept">
                Edit my concept direction
              </Link>
            </div>
            <p className={styles.readyMessage}>
              Your brief is ready for NOVORA to prepare the first AI hand-drawn concept sketch.
            </p>
            {confirmationMessage ? <p className={styles.placeholderMessage}>{confirmationMessage}</p> : null}
          </aside>
        </section>

        <section className={`${styles.panel} ${styles.aiPanel}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>AI Sketch Brief</p>
            <h2>NOVORA AI Sketch Brief</h2>
          </div>
          <dl className={styles.briefList}>
            {aiBrief.map(([title, value]) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.boundaryNote}>
          <h2>Boundary note</h2>
          <p>
            Stone availability, exact color matching, size, and setting feasibility will be confirmed before any paid CAD
            or production step. This brief does not include final pricing. Final quotation depends on confirmed stone
            size, metal, CAD structure, labor, and production details. This AI sketch brief is not a production-ready CAD
            file.
          </p>
        </section>
      </div>
    </main>
  );
}
