'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from '../brief/brief.module.css';
import sketchStyles from './sketch.module.css';
import { useI18n } from '../../../lib/i18n/client';
import { formatDateTime, formatMessage } from '../../../lib/i18n/format';
import type { Dictionary } from '../../../lib/i18n/dictionaries';
import { localizePath } from '../../../lib/i18n/routing';

type LegacySketchCopy = Dictionary['legacySketch'];

type SubmittedConceptBrief = {
  conceptBriefId: string;
  submittedAt: string;
  customerName?: string;
  customerEmail?: string;
  pieceType?: string;
  branch?: string;
  structure?: string;
  subStructure?: string;
  stoneLogic?: string;
  referenceImageCount?: number;
  referenceNotes?: string;
  aiSketchInstruction?: string;
};

const SUBMITTED_BRIEF_STORAGE_KEY = 'novora_submitted_concept_brief';

function pickValue(value: string | undefined, fallback: string) {
  return value?.trim() ? value : fallback;
}

function buildSketchDirection(brief: SubmittedConceptBrief, copy: LegacySketchCopy) {
  const pieceType = pickValue(brief.pieceType, copy.fallbackPieceType);
  const structure = [brief.structure, brief.subStructure].filter(Boolean).join(' / ');
  const materialDirection = pickValue(brief.branch, copy.fallbackMaterialDirection);
  const stoneDirection = pickValue(brief.stoneLogic, copy.fallbackStoneDirection);
  const references =
    brief.referenceImageCount && brief.referenceImageCount > 0
      ? formatMessage(copy.referenceImages, {
          count: brief.referenceImageCount,
          plural: brief.referenceImageCount === 1 ? '' : 's',
        })
      : copy.writtenConceptNotes;

  return {
    headline: formatMessage(copy.directionHeadline, { pieceType }),
    lines: [
      formatMessage(copy.directionLineOne, {
        pieceType: pieceType.toLowerCase(),
        structure: pickValue(structure, copy.fallbackSilhouette).toLowerCase(),
      }),
      formatMessage(copy.directionLineTwo, {
        materialDirection: materialDirection.toLowerCase(),
        stoneDirection: stoneDirection.toLowerCase(),
      }),
      formatMessage(copy.directionLineThree, { references }),
    ],
  };
}

export default function DesignSketchPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.legacySketch;
  const [submittedBrief, setSubmittedBrief] = useState<SubmittedConceptBrief | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawBrief = window.localStorage.getItem(SUBMITTED_BRIEF_STORAGE_KEY);

      if (rawBrief) {
        setSubmittedBrief(JSON.parse(rawBrief) as SubmittedConceptBrief);
      }
    } catch {
      setSubmittedBrief(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const sketchDirection = useMemo(
    () => (submittedBrief ? buildSketchDirection(submittedBrief, copy) : null),
    [copy, submittedBrief],
  );

  if (!isLoaded) {
    return <main className={styles.pageBackground} />;
  }

  if (!submittedBrief || !sketchDirection) {
    return (
      <main className={styles.pageBackground}>
        <section className={`${styles.shell} ${styles.emptyShell}`}>
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>{copy.sk001}</p>
            <h1>{copy.sk002}</h1>
            <p>
              {copy.sk003}</p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} href={localizePath('/design/concept', locale)}>
                {copy.sk004}</Link>
              <Link className={styles.secondaryButton} href={localizePath('/design/start', locale)}>
                {copy.sk005}</Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageBackground}>
      <section className={`${styles.shell} ${sketchStyles.sketchShell}`}>
        <div className={sketchStyles.layout}>
          <div className={sketchStyles.intro}>
            <p className={styles.eyebrow}>{copy.sk001}</p>
            <div className={sketchStyles.introHeader}>
              <h1>{copy.sk006}</h1>
              <span className={sketchStyles.modeBadge}>{copy.sk007}</span>
            </div>
            <p>
              {copy.sk008}</p>
            <div className={sketchStyles.notice} role="note">
              <strong>{copy.sk009}</strong>
              <span>
                {copy.sk010}</span>
            </div>
          </div>

          <section className={sketchStyles.metadataCard} aria-labelledby="submitted-brief-heading">
            <div className={sketchStyles.sectionHeader}>
              <p className={styles.eyebrow}>{copy.sk011}</p>
              <h2 id="submitted-brief-heading">{copy.sk012}</h2>
            </div>
            <dl className={styles.submittedDetails} aria-label={copy.sk013}>
              <div>
                <dt>{copy.sk014}</dt>
                <dd>{submittedBrief.conceptBriefId}</dd>
              </div>
              <div>
                <dt>{copy.sk015}</dt>
                <dd>{formatDateTime(submittedBrief.submittedAt, locale)}</dd>
              </div>
              <div>
                <dt>{copy.sk016}</dt>
                <dd>{submittedBrief.customerName || copy.sk017}</dd>
              </div>
              <div>
                <dt>{copy.sk018}</dt>
                <dd>{submittedBrief.customerEmail || copy.sk017}</dd>
              </div>
            </dl>
          </section>

          <section className={sketchStyles.previewPanel} aria-labelledby="mock-preview-heading">
            <div className={sketchStyles.previewHeader}>
              <div>
                <p className={styles.eyebrow}>{copy.sk019}</p>
                <h2 id="mock-preview-heading">{copy.sk020}</h2>
              </div>
              <div className={sketchStyles.previewTags} aria-label={copy.sk021}>
                <span>{copy.sk022}</span>
                <span>{copy.sk023}</span>
                <span>{copy.sk024}</span>
              </div>
            </div>

            <div className={sketchStyles.paperCard} aria-label={copy.sk025}>
              <span className={sketchStyles.mockLabel}>{copy.sk007}</span>
              <span className={sketchStyles.cardTitle}>{copy.sk026}</span>
              <span className={sketchStyles.guideVertical} />
              <span className={sketchStyles.guideHorizontal} />
              <span className={sketchStyles.ringOuter} />
              <span className={sketchStyles.ringInner} />
              <span className={sketchStyles.ringShoulderLeft} />
              <span className={sketchStyles.ringShoulderRight} />
              <span className={sketchStyles.centerStone} />
              <span className={sketchStyles.stoneFacetOne} />
              <span className={sketchStyles.stoneFacetTwo} />
              <span className={sketchStyles.sideProfile} />
              <span className={sketchStyles.sideStone} />
              <span className={sketchStyles.noteLineOne} />
              <span className={sketchStyles.noteLineTwo} />
              <span className={sketchStyles.noteLineThree} />
              <span className={sketchStyles.noteOne}>{copy.sk027}</span>
              <span className={sketchStyles.noteTwo}>{copy.sk028}</span>
              <span className={sketchStyles.noteThree}>{copy.sk029}</span>
              <span className={sketchStyles.swatchOne} />
              <span className={sketchStyles.swatchTwo} />
              <span className={sketchStyles.swatchThree} />
            </div>
            <p className={sketchStyles.previewNote}>
              {copy.sk030}</p>
          </section>

          <section className={sketchStyles.directionCard}>
            <p className={styles.eyebrow}>{copy.sk031}</p>
            <h2>{sketchDirection.headline}</h2>
            {sketchDirection.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {submittedBrief.aiSketchInstruction ? (
              <p className={sketchStyles.instructionNote}>
                {copy.sk032}{submittedBrief.aiSketchInstruction}
              </p>
            ) : null}
          </section>

          <section className={sketchStyles.workflowCard} aria-labelledby="future-workflow-heading">
            <div className={sketchStyles.sectionHeader}>
              <p className={styles.eyebrow}>{copy.sk033}</p>
              <h2 id="future-workflow-heading">{copy.sk034}</h2>
            </div>
            <ol>
              <li>
                <strong>{copy.sk035}</strong>
                <span>{copy.sk036}</span>
              </li>
              <li>
                <strong>{copy.sk037}</strong>
                <span>{copy.sk038}</span>
              </li>
              <li>
                <strong>{copy.sk039}</strong>
                <span>{copy.sk040}</span>
              </li>
              <li>
                <strong>{copy.sk041}</strong>
                <span>{copy.sk042}</span>
              </li>
            </ol>
          </section>

          <section className={sketchStyles.boundaryCard}>
            <p className={styles.eyebrow}>{copy.sk043}</p>
            <h2>{copy.sk044}</h2>
            <p>
              {copy.sk045}</p>
            <ul>
              <li>{copy.sk046}</li>
              <li>{copy.sk047}</li>
              <li>{copy.sk048}</li>
              <li>{copy.sk049}</li>
              <li>{copy.sk050}</li>
              <li>{copy.sk051}</li>
            </ul>
            <p>
              {copy.sk052}</p>
          </section>

          <div className={`${styles.actions} ${sketchStyles.nextActions}`} aria-label={copy.sk053}>
            <Link className={styles.primaryButton} href={localizePath('/design/submitted', locale)}>
              {copy.sk054}</Link>
            <Link className={styles.secondaryButton} href={localizePath('/design/start', locale)}>
              {copy.sk055}</Link>
            <span className={sketchStyles.disabledAction} aria-disabled="true">
              {copy.sk056}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
