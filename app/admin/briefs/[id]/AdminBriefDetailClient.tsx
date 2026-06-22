'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  AI_SKETCH_REVIEW_INITIAL_STATUS,
  AI_SKETCH_REVIEW_STATUSES,
  AI_SKETCH_REVIEW_STATUS_HELP_TEXT,
  AI_SKETCH_REVIEW_STATUS_LABELS,
  isAiSketchReviewStatus,
  type AiSketchReviewStatus,
} from '../../../../lib/ai-sketch-review-status';
import {
  type BriefStatus,
  type AdminBriefRecord,
  type AdminNotificationEventRecord,
  displayValue,
  formatSubmittedTime,
  getCadReadiness,
  getContactSummary,
  hasReferenceMetadata,
  loadAdminReviewState,
  loadAdminBriefRecords,
  mockBriefs,
  saveAdminReviewState,
  statusToReviewStatusSlug,
  statusOptions,
} from '../briefReviewData';
import styles from '../admin-briefs.module.css';

type DetailRow = {
  label: string;
  value: ReactNode;
};

type DetailSectionData = {
  title: string;
  rows: DetailRow[];
};

type AdminBriefDetailClientProps = {
  aiSketchReview: AdminAiSketchReviewReadModel;
  decodedId: string;
  notificationEvent: AdminNotificationEventRecord | null;
  notificationEventMessage?: string;
  serverBrief: AdminBriefRecord | null;
  serverDataMessage?: string;
};

type AdminAiSketchReviewReadModel = {
  reviewStatus: AiSketchReviewStatus;
  revisionInstruction: string | null;
  approvedForCustomerAt: string | null;
  approvedBy: string | null;
  approvalRevokedAt: string | null;
  revokedBy: string | null;
  updatedAt: string | null;
  hasPersistedReview: boolean;
};

type AdminAiSketchReviewSaveResponse = {
  ok?: boolean;
  message?: string;
  state?: {
    hasPersistedReview?: boolean;
    reviewStatus?: unknown;
  };
};

function getSourceLabel(brief: AdminBriefRecord) {
  if (brief.source === 'supabase') {
    return 'Supabase concept brief submission';
  }

  return brief.source === 'localStorage' ? 'Local browser submission' : 'Mock seed record';
}

function formatJsonValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }

  return (
    <pre className={styles.jsonBlock}>
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function getReferenceNames(brief: AdminBriefRecord) {
  if (!brief.referenceImageNames?.length) {
    return <span>No real upload files are available here.</span>;
  }

  return (
    <ul className={styles.fileList}>
      {brief.referenceImageNames.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return 'Not provided';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getReferenceAssetList(brief: AdminBriefRecord) {
  if (brief.referenceAssets?.length) {
    return (
      <ul className={styles.fileList}>
        {brief.referenceAssets.map((asset) => (
          <li key={asset.id}>
            <div className={styles.primaryCell}>
              <span>{asset.originalFilename}</span>
              <span>
                {asset.mimeType} / {formatFileSize(asset.fileSizeBytes)} / {asset.uploadStatus}
              </span>
              <a
                className={styles.secondaryButton}
                href={`/admin/briefs/reference-assets/${encodeURIComponent(asset.id)}`}
                rel="noreferrer"
                target="_blank"
              >
                Open reference
              </a>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return getReferenceNames(brief);
}

function AiSketchReviewStatusList() {
  return (
    <ul className={styles.fileList}>
      {AI_SKETCH_REVIEW_STATUSES.map((status) => (
        <li key={status}>
          <div className={styles.primaryCell}>
            <span>{AI_SKETCH_REVIEW_STATUS_LABELS[status]}</span>
            <span>{AI_SKETCH_REVIEW_STATUS_HELP_TEXT[status]}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AiSketchReviewGuidance() {
  return (
    <ul className={styles.fileList}>
      <li>AI/GPT sketch drafts are internal review material.</li>
      <li>Unreviewed AI drafts must never be shown directly to customers.</li>
      <li>Human review must check structure, style, and brief fit.</li>
      <li>Drafts needing revision should not be shown to customers.</li>
      <li>AI generation success alone does not approve a sketch.</li>
      <li>Approved for customer is separate from public gallery approval.</li>
      <li>Customer-facing sketch delivery remains email-only after human review, optimization, and approval.</li>
      <li>This does not generate, store, or deliver sketches yet.</li>
    </ul>
  );
}

function DetailSection({ title, rows }: { title: string; rows: DetailRow[] }) {
  return (
    <section className={styles.detailSection} aria-label={title}>
      <h2>{title}</h2>
      <dl className={styles.detailList}>
        {rows.map((row) => (
          <div className={styles.detailRow} key={row.label}>
            <dt className={styles.detailLabel}>{row.label}</dt>
            <dd className={styles.detailValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function AdminBriefDetailClient({
  aiSketchReview,
  decodedId,
  notificationEvent,
  notificationEventMessage,
  serverBrief,
  serverDataMessage,
}: AdminBriefDetailClientProps) {
  const [briefs, setBriefs] = useState<AdminBriefRecord[]>(serverBrief ? [serverBrief] : mockBriefs);
  const [status, setStatus] = useState<BriefStatus>(serverBrief?.status || statusOptions[0]);
  const [internalNotes, setInternalNotes] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(serverBrief?.lastUpdatedAt || '');
  const [isReviewLoaded, setIsReviewLoaded] = useState(false);
  const [reviewStorageSource, setReviewStorageSource] = useState<'supabase' | 'localStorage' | 'unavailable'>(
    serverBrief?.reviewStateSource || 'unavailable',
  );
  const [reviewSaveMessage, setReviewSaveMessage] = useState('');
  const [aiSketchReviewState, setAiSketchReviewState] = useState<AdminAiSketchReviewReadModel>(aiSketchReview);
  const [selectedAiSketchReviewStatus, setSelectedAiSketchReviewStatus] = useState<AiSketchReviewStatus>(
    aiSketchReview.reviewStatus,
  );
  const [isAiSketchReviewSaving, setIsAiSketchReviewSaving] = useState(false);
  const [aiSketchReviewSaveMessage, setAiSketchReviewSaveMessage] = useState('');

  useEffect(() => {
    const records = serverBrief ? loadAdminBriefRecords([serverBrief]) : loadAdminBriefRecords();
    const currentBrief = records.find((record) => record.conceptBriefId === decodedId);
    const reviewState = loadAdminReviewState(decodedId);
    const canUsePersistedReview = currentBrief?.reviewStateSource === 'supabase';

    setBriefs(records);
    setStatus(currentBrief?.status || (!canUsePersistedReview ? reviewState.status : undefined) || statusOptions[0]);
    setInternalNotes(currentBrief?.internalNotes || (!canUsePersistedReview ? reviewState.internalNotes : '') || '');
    setLastUpdatedAt(
      currentBrief?.reviewUpdatedAt ||
        (!canUsePersistedReview ? reviewState.lastUpdatedAt : '') ||
        currentBrief?.lastUpdatedAt ||
        currentBrief?.submittedAt ||
        '',
    );
    setReviewStorageSource(canUsePersistedReview ? 'supabase' : reviewState.status || reviewState.internalNotes ? 'localStorage' : 'unavailable');
    setReviewSaveMessage('');
    setIsReviewLoaded(true);
  }, [decodedId, serverBrief]);

  useEffect(() => {
    setAiSketchReviewState(aiSketchReview);
    setSelectedAiSketchReviewStatus(aiSketchReview.reviewStatus);
    setIsAiSketchReviewSaving(false);
    setAiSketchReviewSaveMessage('');
  }, [aiSketchReview]);

  const brief = briefs.find((record) => record.conceptBriefId === decodedId);
  const isServerBacked = brief?.source === 'supabase';
  const canSaveAiSketchReview = Boolean(brief?.databaseId);

  const detailSections = useMemo(() => {
    if (!brief) {
      return [];
    }

    const sections: DetailSectionData[] = [
      {
        title: 'Concept Brief summary',
        rows: [
          { label: 'Concept Brief ID / public reference', value: brief.publicReference || brief.conceptBriefId },
          { label: 'Database row ID', value: brief.databaseId || 'Not provided' },
          { label: 'Status', value: brief.databaseStatus || brief.status },
          { label: 'Source', value: brief.submissionSource || getSourceLabel(brief) },
          { label: 'Piece type', value: displayValue('pieceType', brief.pieceType) },
          { label: 'Branch', value: displayValue('branch', brief.branch) },
          { label: 'Structure', value: displayValue('structure', brief.structure) },
          { label: 'SubStructure', value: displayValue('subStructure', brief.subStructure) },
          { label: 'Submitted time / created_at', value: formatSubmittedTime(brief.createdAt || brief.submittedAt) },
          { label: 'Last updated / updated_at', value: formatSubmittedTime(brief.updatedAt || lastUpdatedAt || brief.lastUpdatedAt || brief.submittedAt) },
        ],
      },
      {
        title: 'Contact summary',
        rows: [
          { label: 'Review summary', value: getContactSummary(brief) },
          { label: 'Customer name', value: brief.customerName || 'Not provided' },
          { label: 'Customer email', value: brief.customerEmail || 'Not provided' },
          { label: 'Phone / WhatsApp', value: brief.customerPhone || 'Not provided' },
          { label: 'Country / region', value: brief.customerCountry || 'Not provided' },
          { label: 'Contact note', value: brief.contactNote || 'Not provided' },
        ],
      },
      {
        title: 'AI sketch instruction / concept direction',
        rows: [
          { label: 'Design objective', value: brief.designObjective || 'Not provided' },
          { label: 'AI sketch instruction', value: brief.aiSketchInstruction || 'Not provided' },
          { label: 'Boundary', value: 'Concept direction only. This does not approve CAD, sourcing, pricing, or production.' },
        ],
      },
      {
        title: 'Admin review status',
        rows: [
          { label: reviewStorageSource === 'supabase' ? 'Supabase-backed review status' : 'Local review status', value: status },
          { label: 'Last review update', value: formatSubmittedTime(lastUpdatedAt || brief.lastUpdatedAt || brief.submittedAt) },
          {
            label: 'Review state storage',
            value:
              reviewStorageSource === 'supabase'
                ? 'Status and notes are loaded from Supabase admin_notes.'
                : 'Supabase admin review persistence is unavailable for this record, so state is local-only fallback data.',
          },
        ],
      },
      {
        title: 'AI Sketch Review Workflow',
        rows: [
          {
            label: 'Current review state',
            value: AI_SKETCH_REVIEW_STATUS_LABELS[aiSketchReviewState.reviewStatus],
          },
          {
            label: 'Review state source',
            value: aiSketchReviewState.hasPersistedReview
              ? 'Saved internal review state'
              : 'No persisted AI sketch review yet',
          },
          {
            label: 'Default workflow status',
            value: AI_SKETCH_REVIEW_STATUS_LABELS[AI_SKETCH_REVIEW_INITIAL_STATUS],
          },
          { label: 'Revision instruction', value: aiSketchReviewState.revisionInstruction || 'Not provided' },
          { label: 'Approved for customer at', value: formatSubmittedTime(aiSketchReviewState.approvedForCustomerAt || '') },
          { label: 'Approved by', value: aiSketchReviewState.approvedBy || 'Not provided' },
          { label: 'Approval revoked at', value: formatSubmittedTime(aiSketchReviewState.approvalRevokedAt || '') },
          { label: 'Revoked by', value: aiSketchReviewState.revokedBy || 'Not provided' },
          { label: 'Last saved update', value: formatSubmittedTime(aiSketchReviewState.updatedAt || '') },
          { label: 'Empty state', value: 'No internal sketch drafts yet.' },
          {
            label: 'Customer visibility boundary',
            value:
              'AI sketches are internal drafts until reviewed and approved. Customers must only see sketches approved by the NOVORA design team.',
          },
          {
            label: 'Status separation',
            value:
              'Concept Brief admin review status stays separate from future AI sketch review persistence.',
          },
          { label: 'Workflow statuses', value: <AiSketchReviewStatusList /> },
          { label: 'Manual review guidance', value: <AiSketchReviewGuidance /> },
        ],
      },
      {
        title: 'Admin notification status',
        rows: notificationEvent
          ? [
              { label: 'notification_type', value: notificationEvent.notificationType || 'Not provided' },
              { label: 'status', value: notificationEvent.status || 'Not provided' },
              { label: 'recipient_email', value: notificationEvent.recipientEmail || 'Not provided' },
              { label: 'reserved_at', value: formatSubmittedTime(notificationEvent.reservedAt) },
              { label: 'sent_at', value: formatSubmittedTime(notificationEvent.sentAt) },
              { label: 'failed_at', value: formatSubmittedTime(notificationEvent.failedAt) },
              ...(notificationEvent.resendMessageId
                ? [{ label: 'resend_message_id', value: notificationEvent.resendMessageId }]
                : []),
              ...(notificationEvent.errorMessage
                ? [{ label: 'error_message', value: notificationEvent.errorMessage }]
                : []),
              { label: 'created_at', value: formatSubmittedTime(notificationEvent.createdAt) },
              { label: 'updated_at', value: formatSubmittedTime(notificationEvent.updatedAt) },
              {
                label: 'Boundary',
                value: 'Read-only admin notification status. This page does not retry, resend, or update notifications.',
              },
            ]
          : [
              {
                label: 'Notification event',
                value:
                  notificationEventMessage ||
                  'No admin notification event has been recorded for this Concept Brief.',
              },
            ],
      },
      {
        title: 'CAD readiness',
        rows: [
          { label: 'Current signal', value: getCadReadiness({ ...brief, status }) },
          { label: 'CAD request boundary', value: 'No CAD request is created by this page.' },
          { label: 'Production boundary', value: 'This is not a quote, order, payment, production job, or final CAD handoff.' },
        ],
      },
      {
        title: 'Stored submission data',
        rows: [
          { label: 'summary_items', value: formatJsonValue(brief.summaryItems) },
          { label: 'brief_payload', value: formatJsonValue(brief.briefPayload) },
          { label: 'api_submission', value: formatJsonValue(brief.apiSubmission) },
        ],
      },
      {
        title: 'Internal notes / local review state',
        rows: [
          { label: 'Current notes', value: internalNotes || 'No internal notes saved yet.' },
          {
            label: 'Persistence',
            value:
              reviewStorageSource === 'supabase'
                ? 'Internal notes are saved to Supabase admin_notes for protected admin review.'
                : 'Internal notes are saved only in this browser localStorage fallback.',
          },
        ],
      },
      {
        title: 'Boundary notes',
        rows: [
          { label: 'Admin scope', value: 'Protected admin concept brief detail for manual review.' },
          { label: 'Sketch scope', value: 'AI sketch direction is for concept exploration only.' },
          { label: 'Downstream actions', value: 'It does not create CAD requests, quotes, final pricing, production orders, emails, payments, or file storage.' },
        ],
      },
    ];

    if (!isServerBacked || brief.referenceAssets?.length) {
      sections.splice(2, 0, {
        title: 'Reference images metadata',
        rows: [
          {
            label: 'Metadata exists',
            value: brief.referenceAssets?.length
              ? 'Yes, Supabase reference asset metadata is present'
              : hasReferenceMetadata(brief)
                ? 'Yes, local/mock reference metadata is present'
                : 'No',
          },
          { label: 'Reference image count', value: brief.referenceImageCount || 0 },
          { label: 'Reference image files', value: getReferenceAssetList(brief) },
          { label: 'Reference notes', value: brief.referenceNotes || 'Not provided' },
          {
            label: 'Review boundary',
            value: 'Uploaded references support concept review only. They are not CAD approval, final pricing, or production confirmation.',
          },
        ],
      });
    }

    return sections;
  }, [
    brief,
    aiSketchReviewState,
    internalNotes,
    isServerBacked,
    lastUpdatedAt,
    notificationEvent,
    notificationEventMessage,
    reviewStorageSource,
    status,
  ]);

  async function persistReviewState(nextStatus: BriefStatus, nextInternalNotes: string) {
    const nextLastUpdatedAt = new Date().toISOString();

    setLastUpdatedAt(nextLastUpdatedAt);
    const localFallbackState = {
      status: nextStatus,
      internalNotes: nextInternalNotes,
      lastUpdatedAt: nextLastUpdatedAt,
    };

    if (!isServerBacked || !brief?.databaseId) {
      saveAdminReviewState(decodedId, localFallbackState);
      setReviewStorageSource('localStorage');
      setReviewSaveMessage('Saved as local-only fallback review state.');
      return;
    }

    try {
      const response = await fetch('/admin/briefs/review-state', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conceptBriefId: brief.databaseId,
          reviewStatus: statusToReviewStatusSlug(nextStatus),
          internalNotes: nextInternalNotes,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        state?: {
          createdAt?: string;
        };
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Admin review state could not be saved.');
      }

      const persistedUpdatedAt = result.state?.createdAt || nextLastUpdatedAt;

      setLastUpdatedAt(persistedUpdatedAt);
      setReviewStorageSource('supabase');
      setReviewSaveMessage('Saved to Supabase admin_notes.');
    } catch {
      saveAdminReviewState(decodedId, localFallbackState);
      setReviewStorageSource('localStorage');
      setReviewSaveMessage('Supabase review persistence is unavailable. Saved as local-only fallback review state.');
    }
  }

  function handleStatusChange(nextStatus: BriefStatus) {
    setStatus(nextStatus);

    if (isReviewLoaded) {
      persistReviewState(nextStatus, internalNotes);
    }
  }

  function handleInternalNotesChange(nextInternalNotes: string) {
    setInternalNotes(nextInternalNotes);

    if (isReviewLoaded) {
      persistReviewState(status, nextInternalNotes);
    }
  }

  async function handleAiSketchReviewSave() {
    if (!brief?.databaseId) {
      setAiSketchReviewSaveMessage('AI sketch review status can only be saved for a Supabase-backed Concept Brief.');
      return;
    }

    const mode = aiSketchReviewState.hasPersistedReview ? 'update' : 'create';

    setIsAiSketchReviewSaving(true);
    setAiSketchReviewSaveMessage('');

    try {
      const response = await fetch('/admin/briefs/ai-sketch-review', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          conceptBriefId: brief.databaseId,
          reviewStatus: selectedAiSketchReviewStatus,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as AdminAiSketchReviewSaveResponse;

      const savedReviewStatus = String(result.state?.reviewStatus || '');

      if (!response.ok || !result.ok || !isAiSketchReviewStatus(savedReviewStatus)) {
        throw new Error(result.message || 'AI sketch review state could not be saved.');
      }

      setAiSketchReviewState((currentState) => ({
        ...currentState,
        hasPersistedReview: true,
        reviewStatus: savedReviewStatus,
        updatedAt: new Date().toISOString(),
      }));
      setSelectedAiSketchReviewStatus(savedReviewStatus);
      setAiSketchReviewSaveMessage('AI sketch review status saved.');
    } catch (error) {
      setAiSketchReviewSaveMessage(
        error instanceof Error && error.message ? error.message : 'AI sketch review state could not be saved.',
      );
    } finally {
      setIsAiSketchReviewSaving(false);
    }
  }

  if (!brief) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.notice} aria-label="Brief not found">
            <h1>Brief not found</h1>
            {serverDataMessage ? <p>{serverDataMessage}</p> : null}
            <p>
              No protected Supabase concept brief or local fallback record matched this public reference in the current
              review context.
            </p>
            <p>No CAD request, quote, production order, email, payment, or file storage is created here.</p>
            <Link className={styles.secondaryButton} href="/admin/briefs">
              Back to /admin/briefs
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Protected internal MVP</p>
          <h1>{brief.publicReference || brief.conceptBriefId}</h1>
          <p>
            Protected concept brief detail for manual review of customer contact context, concept direction, and AI
            hand-drawn sketch guidance. This is not CAD approval, final pricing, or production confirmation.
          </p>
          {serverDataMessage ? <p className={styles.helperText}>{serverDataMessage}</p> : null}
        </section>

        <section className={styles.notice} aria-label="Protected admin warning">
          <h2>{isServerBacked ? 'Supabase-backed review detail' : 'Local fallback review detail'}</h2>
          <ul>
            <li>This page is shown only after the server validates the admin access cookie.</li>
            <li>
              {isServerBacked
                ? 'Real concept brief detail is loaded on the server with the existing Supabase admin client.'
                : 'Server detail data is unavailable, so this view is using local browser/mock fallback data.'}
            </li>
            <li>The service role key and admin access key are never sent to browser code.</li>
            <li>No CAD requests, quotes, final pricing, production orders, emails, payments, or file storage are created here.</li>
          </ul>
        </section>

        <div className={styles.detailGrid}>
          <section className={styles.detailPanel} aria-label="Brief detail">
            {detailSections.map((section) => (
              <DetailSection key={section.title} title={section.title} rows={section.rows} />
            ))}
          </section>

          <aside className={styles.notesPanel}>
            <div>
              <h2>AI sketch review controls</h2>
              <p className={styles.helperText}>
                Save internal AI sketch review status separately from Concept Brief review notes.
              </p>
              <p className={styles.helperText}>
                {aiSketchReviewState.hasPersistedReview
                  ? 'Next save will update the existing AI sketch review row.'
                  : 'Next save will create the first AI sketch review row for this Concept Brief.'}
              </p>
              {!canSaveAiSketchReview ? (
                <p className={styles.helperText}>
                  AI sketch review status can only be saved for a Supabase-backed Concept Brief.
                </p>
              ) : null}
              {aiSketchReviewSaveMessage ? <p className={styles.helperText}>{aiSketchReviewSaveMessage}</p> : null}
            </div>

            <label className={styles.fieldLabel}>
              AI sketch review status
              <select
                className={styles.select}
                disabled={isAiSketchReviewSaving || !canSaveAiSketchReview}
                value={selectedAiSketchReviewStatus}
                onChange={(event) => setSelectedAiSketchReviewStatus(event.target.value as AiSketchReviewStatus)}
              >
                {AI_SKETCH_REVIEW_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {AI_SKETCH_REVIEW_STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>

            <button
              className={styles.button}
              disabled={isAiSketchReviewSaving || !canSaveAiSketchReview}
              type="button"
              onClick={handleAiSketchReviewSave}
            >
              {isAiSketchReviewSaving ? 'Saving AI sketch status...' : 'Save AI sketch status'}
            </button>

            <div>
              <h2>{isServerBacked ? 'Supabase-backed review controls' : 'Local fallback review controls'}</h2>
              <p className={styles.helperText}>
                {reviewStorageSource === 'supabase'
                  ? 'Status and notes are saved to Supabase admin_notes after valid admin access.'
                  : 'Status and notes are currently local-only fallback review state.'}
              </p>
              {reviewSaveMessage ? <p className={styles.helperText}>{reviewSaveMessage}</p> : null}
            </div>
            <label className={styles.fieldLabel}>
              Status
              <select className={styles.select} value={status} onChange={(event) => handleStatusChange(event.target.value as BriefStatus)}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldLabel}>
              Internal notes
              <textarea
                className={styles.textarea}
                placeholder={
                  isServerBacked
                    ? 'Internal notes for protected manual review. This does not create CAD, pricing, or production approval.'
                    : 'Local notes for manual review planning. These notes are not saved to Supabase.'
                }
                value={internalNotes}
                onChange={(event) => handleInternalNotesChange(event.target.value)}
              />
            </label>

            <Link className={styles.secondaryButton} href="/admin/briefs">
              Back to /admin/briefs
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
