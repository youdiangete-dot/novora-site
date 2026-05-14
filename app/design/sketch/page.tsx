'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import styles from '../brief/brief.module.css';
import sketchStyles from './sketch.module.css';

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

function formatSubmittedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function pickValue(value: string | undefined, fallback: string) {
  return value?.trim() ? value : fallback;
}

function buildSketchDirection(brief: SubmittedConceptBrief) {
  const pieceType = pickValue(brief.pieceType, 'custom jewelry piece');
  const structure = [brief.structure, brief.subStructure].filter(Boolean).join(' / ');
  const materialDirection = pickValue(brief.branch, 'the selected material direction');
  const stoneDirection = pickValue(brief.stoneLogic, 'the requested stone and setting logic');
  const references =
    brief.referenceImageCount && brief.referenceImageCount > 0
      ? `${brief.referenceImageCount} submitted reference image${brief.referenceImageCount === 1 ? '' : 's'}`
      : 'the written concept notes';

  return {
    headline: `${pieceType} concept direction`,
    lines: [
      `A soft hand-drawn preview could explore a ${pieceType.toLowerCase()} with ${pickValue(
        structure,
        'a refined custom silhouette',
      ).toLowerCase()}.`,
      `The mock direction keeps ${materialDirection.toLowerCase()} and ${stoneDirection.toLowerCase()} as early conversation inputs.`,
      `NOVORA would use ${references} to guide proportion, motif, stone placement, and the first visual direction before any CAD path is confirmed.`,
    ],
  };
}

export default function DesignSketchPage() {
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
    () => (submittedBrief ? buildSketchDirection(submittedBrief) : null),
    [submittedBrief],
  );

  if (!isLoaded) {
    return <main className={styles.pageBackground} />;
  }

  if (!submittedBrief || !sketchDirection) {
    return (
      <main className={styles.pageBackground}>
        <section className={`${styles.shell} ${styles.emptyShell}`}>
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>AI Sketch Preview</p>
            <h1>No submitted concept brief found in this browser</h1>
            <p>
              This mock preview needs a submitted front-end-only concept brief saved in this browser before it can show
              the AI hand-drawn sketch direction experience.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} href="/design/concept">
                Start concept intake
              </Link>
              <Link className={styles.secondaryButton} href="/design/start">
                Back to design start
              </Link>
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
            <p className={styles.eyebrow}>AI Sketch Preview</p>
            <h1>Mock concept sketch direction</h1>
            <p>
              NOVORA may prepare an AI hand-drawn concept direction based on your submitted brief, giving you a
              low-friction first visual conversation before any production-level CAD work begins.
            </p>
          </div>

          <section className={sketchStyles.previewPanel} aria-labelledby="mock-preview-heading">
            <div className={sketchStyles.previewHeader}>
              <div>
                <p className={styles.eyebrow}>Mock preview</p>
                <h2 id="mock-preview-heading">Hand-drawn concept placeholder</h2>
              </div>
              <span>Front-end only</span>
            </div>

            <div className={sketchStyles.paperCard} aria-label="Mock hand-drawn jewelry sketch placeholder">
              <span className={sketchStyles.mockLabel}>Mock preview</span>
              <span className={sketchStyles.sketchOval} />
              <span className={sketchStyles.sketchBand} />
              <span className={sketchStyles.sketchStone} />
              <span className={sketchStyles.sketchAccentOne} />
              <span className={sketchStyles.sketchAccentTwo} />
              <span className={sketchStyles.sketchNoteOne}>stone position</span>
              <span className={sketchStyles.sketchNoteTwo}>profile study</span>
            </div>
          </section>

          <dl className={styles.submittedDetails} aria-label="Submitted concept brief metadata">
            <div>
              <dt>Concept Brief ID</dt>
              <dd>{submittedBrief.conceptBriefId}</dd>
            </div>
            <div>
              <dt>Submitted time</dt>
              <dd>{formatSubmittedTime(submittedBrief.submittedAt)}</dd>
            </div>
            <div>
              <dt>Customer name</dt>
              <dd>{submittedBrief.customerName || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Customer email</dt>
              <dd>{submittedBrief.customerEmail || 'Not provided'}</dd>
            </div>
          </dl>

          <section className={sketchStyles.directionCard}>
            <p className={styles.eyebrow}>Generated-looking mock summary</p>
            <h2>{sketchDirection.headline}</h2>
            {sketchDirection.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {submittedBrief.aiSketchInstruction ? (
              <p className={sketchStyles.instructionNote}>
                Sketch instruction note: {submittedBrief.aiSketchInstruction}
              </p>
            ) : null}
          </section>

          <section className={sketchStyles.boundaryCard}>
            <h2>Preview boundary</h2>
            <p>
              This page is a customer-facing mock flow only. It explains how a future AI hand-drawn concept sketch step
              could support the custom jewelry conversation.
            </p>
            <ul>
              <li>Not production CAD</li>
              <li>Not final jewelry design</li>
              <li>Not final pricing</li>
              <li>Not gemstone sourcing confirmation</li>
              <li>Not feasibility, QC, packaging, or logistics confirmation</li>
              <li>Not production approval</li>
            </ul>
            <p>
              Production-level CAD is a later, separate paid and professional process reviewed through NOVORA designers
              and factory workflow.
            </p>
          </section>

          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/design/submitted">
              Back to submission
            </Link>
            <Link className={styles.secondaryButton} href="/design/start">
              Back to design start
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
