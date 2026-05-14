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
      `A future AI sketch could explore a ${pieceType.toLowerCase()} with ${pickValue(
        structure,
        'a refined custom silhouette',
      ).toLowerCase()}.`,
      `The submitted brief would guide ${materialDirection.toLowerCase()} and ${stoneDirection.toLowerCase()} as early visual conversation inputs.`,
      `NOVORA would use ${references} to inform proportion, motif, stone placement, and review direction before any CAD path is confirmed.`,
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
            <div className={sketchStyles.introHeader}>
              <h1>Preview mode for future AI sketch review</h1>
              <span className={sketchStyles.modeBadge}>Demo placeholder</span>
            </div>
            <p>
              This page shows the intended review experience for a future AI hand-drawn concept sketch. Real AI sketch
              generation is not active yet, and the visual below is not your actual generated design.
            </p>
            <div className={sketchStyles.notice} role="note">
              <strong>Mock-only boundary</strong>
              <span>
                The current board is a CSS demo placeholder. It does not call GPT, OpenAI, or any external image
                generation API.
              </span>
            </div>
          </div>

          <section className={sketchStyles.metadataCard} aria-labelledby="submitted-brief-heading">
            <div className={sketchStyles.sectionHeader}>
              <p className={styles.eyebrow}>Submitted brief metadata</p>
              <h2 id="submitted-brief-heading">Brief saved in this browser</h2>
            </div>
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
          </section>

          <section className={sketchStyles.previewPanel} aria-labelledby="mock-preview-heading">
            <div className={sketchStyles.previewHeader}>
              <div>
                <p className={styles.eyebrow}>Mock sketch board</p>
                <h2 id="mock-preview-heading">Demo placeholder, not your generated sketch</h2>
              </div>
              <div className={sketchStyles.previewTags} aria-label="Preview limitations">
                <span>Preview mode</span>
                <span>Front-end only</span>
                <span>No AI image generated</span>
              </div>
            </div>

            <div className={sketchStyles.paperCard} aria-label="Mock hand-drawn jewelry sketch placeholder">
              <span className={sketchStyles.mockLabel}>Demo placeholder</span>
              <span className={sketchStyles.cardTitle}>Not an actual generated sketch</span>
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
              <span className={sketchStyles.noteOne}>proportion guide</span>
              <span className={sketchStyles.noteTwo}>setting study</span>
              <span className={sketchStyles.noteThree}>placeholder only</span>
              <span className={sketchStyles.swatchOne} />
              <span className={sketchStyles.swatchTwo} />
              <span className={sketchStyles.swatchThree} />
            </div>
            <p className={sketchStyles.previewNote}>
              This CSS board is only a premium visual stand-in for the future review page. A real customer-specific
              hand-drawn sketch has not been generated from this brief.
            </p>
          </section>

          <section className={sketchStyles.directionCard}>
            <p className={styles.eyebrow}>Future AI sketch explanation</p>
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

          <section className={sketchStyles.workflowCard} aria-labelledby="future-workflow-heading">
            <div className={sketchStyles.sectionHeader}>
              <p className={styles.eyebrow}>Future intended workflow</p>
              <h2 id="future-workflow-heading">From brief to visual direction</h2>
            </div>
            <ol>
              <li>
                <strong>NOVORA reads the submitted concept brief.</strong>
                <span>Piece type, structure, stone logic, references, and notes become the creative input.</span>
              </li>
              <li>
                <strong>An AI hand-drawn concept sketch may be generated.</strong>
                <span>The sketch would help explore proportion and visual direction before production decisions.</span>
              </li>
              <li>
                <strong>NOVORA reviews the direction before CAD.</strong>
                <span>A human review step keeps the sketch aligned with feasibility, taste, and customer intent.</span>
              </li>
              <li>
                <strong>Professional CAD and production confirmation happen later.</strong>
                <span>Pricing, sourcing, CAD, QC, and production approval remain separate professional steps.</span>
              </li>
            </ol>
          </section>

          <section className={sketchStyles.boundaryCard}>
            <p className={styles.eyebrow}>Production boundary</p>
            <h2>Not CAD, not pricing, not production approval</h2>
            <p>
              This customer-facing mock flow explains how a future AI sketch step could support the custom jewelry
              conversation. It does not replace NOVORA's later professional CAD, pricing, sourcing, or production review.
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

          <div className={`${styles.actions} ${sketchStyles.nextActions}`} aria-label="Next steps">
            <Link className={styles.primaryButton} href="/design/submitted">
              Back to submission
            </Link>
            <Link className={styles.secondaryButton} href="/design/start">
              Start a new concept brief
            </Link>
            <span className={sketchStyles.disabledAction} aria-disabled="true">
              Professional CAD review later
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
