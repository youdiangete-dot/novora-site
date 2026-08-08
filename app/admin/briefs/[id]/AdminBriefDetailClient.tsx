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
  currentAiSketchOutputId: string | null;
  reviewAiSketchOutputId: string | null;
  reviewBindingStatus:
    | 'no-current-output'
    | 'missing-review'
    | 'unbound-review'
    | 'exact'
    | 'conflict';
};

type AdminAiSketchReviewSaveResponse = {
  ok?: boolean;
  message?: string;
  state?: {
    hasPersistedReview?: boolean;
    reviewStatus?: unknown;
    aiSketchOutputId?: unknown;
  };
};

type ReviewStorageSource = 'supabase' | 'localStorage' | 'unavailable' | 'empty';

const adminReviewEmptyStateCopy =
  'No saved admin review state yet. Status and notes will be saved to Supabase admin_notes after the first valid admin save.';
const adminReviewUnavailableCopy =
  'Supabase admin review persistence is unavailable for this record, so state is local-only fallback data.';

const currentFirstPreviewReviewStatuses = AI_SKETCH_REVIEW_STATUSES.filter(
  (reviewStatus) => reviewStatus !== AI_SKETCH_REVIEW_INITIAL_STATUS,
);

function normalizeCurrentFirstPreviewReviewStatus(reviewStatus: AiSketchReviewStatus): AiSketchReviewStatus {
  return reviewStatus === AI_SKETCH_REVIEW_INITIAL_STATUS ? 'draft_generated_internal_only' : reviewStatus;
}

function getSourceLabel(brief: AdminBriefRecord) {
  if (brief.source === 'supabase') {
    return 'Supabase concept brief submission';
  }

  return brief.source === 'localStorage' ? 'Local browser submission' : 'Mock seed record';
}

function getReviewStatusLabel(reviewStorageSource: ReviewStorageSource) {
  if (reviewStorageSource === 'supabase') {
    return 'Supabase-backed review status';
  }

  if (reviewStorageSource === 'empty') {
    return 'Initial review status';
  }

  return 'Local review status';
}

function getReviewStateStorageCopy(reviewStorageSource: ReviewStorageSource) {
  if (reviewStorageSource === 'supabase') {
    return 'Status and notes are loaded from Supabase admin_notes.';
  }

  if (reviewStorageSource === 'empty') {
    return adminReviewEmptyStateCopy;
  }

  if (reviewStorageSource === 'localStorage') {
    return 'Status and notes are saved only in this browser localStorage fallback.';
  }

  return adminReviewUnavailableCopy;
}

function getInternalNotesPersistenceCopy(reviewStorageSource: ReviewStorageSource) {
  if (reviewStorageSource === 'supabase') {
    return 'Internal notes are saved to Supabase admin_notes for protected admin review.';
  }

  if (reviewStorageSource === 'empty') {
    return 'Internal notes will be saved to Supabase admin_notes after the first valid admin save.';
  }

  return 'Internal notes are saved only in this browser localStorage fallback.';
}

function getReviewControlsCopy(reviewStorageSource: ReviewStorageSource) {
  if (reviewStorageSource === 'supabase') {
    return 'Status and notes are saved to Supabase admin_notes after valid admin access.';
  }

  if (reviewStorageSource === 'empty') {
    return adminReviewEmptyStateCopy;
  }

  if (reviewStorageSource === 'localStorage') {
    return 'Status and notes are saved only in this browser localStorage fallback.';
  }

  return 'Status and notes are currently local-only fallback review state.';
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
      <li>The First Preview becomes customer-visible only after the required automatic gates pass.</li>
      <li>Human review checks the displayed concept sketch after First Preview readiness.</li>
      <li>AI generation success and first_preview_ready do not confirm the customer&apos;s design direction.</li>
      <li>Needs revision records a human review finding; it does not start revision or regeneration.</li>
      <li>Approved for customer remains separate from the initial First Preview and public gallery approval.</li>
      <li>This section displays and reviews the current output; it does not generate, regenerate, send, or publish it.</li>
    </ul>
  );
}

function getDeliveryReadinessSummary(reviewStatus: AiSketchReviewStatus) {
  if (reviewStatus === 'needs_revision') {
    return 'Human review has marked the concept sketch as needing follow-up. This page does not start a revision or regeneration.';
  }

  if (reviewStatus === 'approved_for_customer') {
    return 'approved_for_customer is a later human-review state. It remains separate from First Preview readiness, gallery, CAD, quote, order, and production approvals.';
  }

  if (reviewStatus === 'draft_generated_internal_only') {
    return 'The lifecycle-owned review is awaiting post-preview human assessment. First Preview readiness remains an automatic-gate decision.';
  }

  return 'No exact current First Preview is available for this review state.';
}

function getReviewBindingCopy(review: AdminAiSketchReviewReadModel) {
  if (review.reviewBindingStatus === 'exact') {
    return 'The persisted review row is bound to this exact current First Preview output.';
  }

  if (review.reviewBindingStatus === 'conflict') {
    return 'Review linkage conflicts with the current First Preview. Saving is blocked.';
  }

  if (review.reviewBindingStatus === 'unbound-review') {
    return 'The persisted review row is not bound to an output. Saving is blocked.';
  }

  if (review.reviewBindingStatus === 'missing-review') {
    return 'The lifecycle-owned review row is missing for the current First Preview. Saving is blocked.';
  }

  return 'No exact current First Preview is available. Review controls are unavailable.';
}

function CurrentFirstPreviewReview({
  conceptBriefId,
  onImageAvailabilityChange,
  review,
}: {
  conceptBriefId: string | undefined;
  onImageAvailabilityChange: (outputId: string, isAvailable: boolean) => void;
  review: AdminAiSketchReviewReadModel;
}) {
  const outputId = review.currentAiSketchOutputId;
  const [imageUnavailable, setImageUnavailable] = useState(false);

  useEffect(() => {
    setImageUnavailable(false);
  }, [conceptBriefId, outputId]);

  if (!conceptBriefId || !outputId) {
    return (
      <section className={styles.detailSection} aria-label="Protected First Preview review">
        <h2>Protected First Preview review</h2>
        <p className={styles.helperText}>
          No exact current First Preview is available for this Concept Brief. It may not have been generated, may not
          be ready, or may no longer be the current customer preview.
        </p>
        <p className={styles.helperText}>{getReviewBindingCopy(review)}</p>
      </section>
    );
  }

  return (
    <section className={styles.detailSection} aria-label="Protected First Preview review">
      <h2>Protected First Preview review</h2>
      <figure className={styles.firstPreviewFigure}>
        {imageUnavailable ? (
          <p className={styles.helperText}>
            The protected First Preview image is unavailable. Review saving remains blocked until the image can be
            displayed.
          </p>
        ) : (
          <img
            className={styles.firstPreviewImage}
            src={`/admin/briefs/first-preview-assets/${encodeURIComponent(conceptBriefId)}/${encodeURIComponent(outputId)}`}
            alt="Current NOVORA First Preview concept sketch for protected admin review"
            onLoad={() => onImageAvailabilityChange(outputId, true)}
            onError={() => {
              setImageUnavailable(true);
              onImageAvailabilityChange(outputId, false);
            }}
          />
        )}
        <figcaption className={styles.helperText}>
          Current output ID: {outputId}. The image is delivered through protected same-origin admin access.
        </figcaption>
      </figure>
      <p className={styles.helperText}>{getReviewBindingCopy(review)}</p>
      <p className={styles.helperText}>
        This is an AI hand-drawn concept sketch, not CAD, a quotation, an order approval, or production approval.
      </p>
    </section>
  );
}

function BoundaryBadges() {
  return (
    <ul className={styles.fileList}>
      <li>Admin only</li>
      <li>Read-only</li>
      <li>Human review required</li>
      <li>Not customer-facing</li>
    </ul>
  );
}

function InternalDesignPlanningArtifacts({
  conceptBriefStatus,
  reviewStatus,
}: {
  conceptBriefStatus: BriefStatus;
  reviewStatus: AiSketchReviewStatus;
}) {
  return (
    <DetailSection
      title="Internal design planning artifacts"
      rows={[
        {
          label: 'Boundary labels',
          value: <BoundaryBadges />,
        },
        {
          label: 'Design Spec draft',
          value: (
            <ul className={styles.fileList}>
              <li>Design Spec draft is not available yet.</li>
              <li>No persisted Design Spec artifact is attached to this Concept Brief record.</li>
              <li>Customer contact fields are not copied into this generation-facing planning panel.</li>
              <li>This does not imply CAD, quote, order confirmation, production approval, or customer approval.</li>
            </ul>
          ),
        },
        {
          label: 'Hand Sketch Instruction draft',
          value: (
            <ul className={styles.fileList}>
              <li>Hand Sketch Instruction draft is not available yet.</li>
              <li>This internal planning area cannot generate, approve, send, publish, or preview customer assets.</li>
              <li>Any future instruction remains internal only, concept-only, not CAD, not a quote, not an order confirmation, and not production approval.</li>
              <li>First Preview visibility uses protected website access after automatic gates; any later email communication remains human-controlled.</li>
            </ul>
          ),
        },
        {
          label: 'Validation summary',
          value: (
            <ul className={styles.fileList}>
              <li>Validation has not been run.</li>
              <li>No real Design Spec artifact is available to validate on this page.</li>
              <li>Validation display is read-only and must not auto-fix or auto-approve anything.</li>
            </ul>
          ),
        },
        {
          label: 'Risk flags',
          value: (
            <ul className={styles.fileList}>
              <li>Risk flags are not available yet.</li>
              <li>No false risk certainty is shown while no real internal artifact exists.</li>
              <li>Future risk review may cover unsupported material, exact-copy reference risk, private data leakage risk, CAD implication risk, quote implication risk, order or production implication risk, gallery approval implication risk, and generation success treated as approval risk.</li>
            </ul>
          ),
        },
        {
          label: 'Human review and delivery readiness',
          value: (
            <ul className={styles.fileList}>
              <li>Current Concept Brief review status: {conceptBriefStatus}.</li>
              <li>Current AI sketch review status: {AI_SKETCH_REVIEW_STATUS_LABELS[reviewStatus]}.</li>
              <li>{getDeliveryReadinessSummary(reviewStatus)}</li>
              <li>AI generation success is not approval.</li>
              <li>approved_for_customer is not approved_for_gallery.</li>
              <li>approved_for_customer is not CAD, not a quote, not an order confirmation, and not production approval.</li>
              <li>needs_revision blocks customer delivery.</li>
              <li>Human-controlled send is still required for any future email delivery.</li>
              <li>Gallery approval is separate and is not created by this page.</li>
            </ul>
          ),
        },
        {
          label: 'Privacy and leakage warning',
          value: (
            <ul className={styles.fileList}>
              <li>Do not move customer email, phone, WhatsApp, contact notes, internal notes, raw storage paths, provider output URLs, or secret metadata into Design Spec or Hand Sketch Instruction panels.</li>
              <li>This protected admin page may show existing contact details elsewhere, but this planning artifact section keeps generation-facing panels contact-free.</li>
            </ul>
          ),
        },
      ]}
    />
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
  const [reviewStorageSource, setReviewStorageSource] = useState<ReviewStorageSource>(
    serverBrief?.reviewStateSource || (serverBrief?.source === 'supabase' ? 'empty' : 'unavailable'),
  );
  const [reviewSaveMessage, setReviewSaveMessage] = useState('');
  const [aiSketchReviewState, setAiSketchReviewState] = useState<AdminAiSketchReviewReadModel>(aiSketchReview);
  const [selectedAiSketchReviewStatus, setSelectedAiSketchReviewStatus] = useState<AiSketchReviewStatus>(() =>
    aiSketchReview.currentAiSketchOutputId && aiSketchReview.reviewBindingStatus === 'exact'
      ? normalizeCurrentFirstPreviewReviewStatus(aiSketchReview.reviewStatus)
      : aiSketchReview.reviewStatus,
  );
  const [isAiSketchReviewSaving, setIsAiSketchReviewSaving] = useState(false);
  const [aiSketchReviewSaveMessage, setAiSketchReviewSaveMessage] = useState('');
  const [loadedFirstPreviewOutputId, setLoadedFirstPreviewOutputId] = useState<string | null>(null);

  useEffect(() => {
    const records = serverBrief ? loadAdminBriefRecords([serverBrief]) : loadAdminBriefRecords();
    const currentBrief = records.find((record) => record.conceptBriefId === decodedId);
    const reviewState = loadAdminReviewState(decodedId);
    const canUsePersistedReview = currentBrief?.reviewStateSource === 'supabase';
    const hasLocalReviewState = currentBrief?.reviewStateSource === 'localStorage' || Boolean(reviewState.status || reviewState.internalNotes);
    const hasReviewReadFailure = Boolean(serverDataMessage) && currentBrief?.source === 'supabase';
    const nextReviewStorageSource: ReviewStorageSource = canUsePersistedReview
      ? 'supabase'
      : hasLocalReviewState
        ? 'localStorage'
        : currentBrief?.source === 'supabase' && !hasReviewReadFailure
          ? 'empty'
          : 'unavailable';

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
    setReviewStorageSource(nextReviewStorageSource);
    setReviewSaveMessage('');
    setIsReviewLoaded(true);
  }, [decodedId, serverBrief, serverDataMessage]);

  useEffect(() => {
    setAiSketchReviewState(aiSketchReview);
    setSelectedAiSketchReviewStatus(
      aiSketchReview.currentAiSketchOutputId && aiSketchReview.reviewBindingStatus === 'exact'
        ? normalizeCurrentFirstPreviewReviewStatus(aiSketchReview.reviewStatus)
        : aiSketchReview.reviewStatus,
    );
    setIsAiSketchReviewSaving(false);
    setAiSketchReviewSaveMessage('');
  }, [aiSketchReview]);

  useEffect(() => {
    setLoadedFirstPreviewOutputId(null);
  }, [aiSketchReview.currentAiSketchOutputId]);

  const brief = briefs.find((record) => record.conceptBriefId === decodedId);
  const isServerBacked = brief?.source === 'supabase';
  const canSaveAiSketchReview = Boolean(
    brief?.databaseId &&
      aiSketchReviewState.currentAiSketchOutputId &&
      aiSketchReviewState.reviewBindingStatus === 'exact' &&
      loadedFirstPreviewOutputId === aiSketchReviewState.currentAiSketchOutputId,
  );

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
          { label: getReviewStatusLabel(reviewStorageSource), value: status },
          { label: 'Last review update', value: formatSubmittedTime(lastUpdatedAt || brief.lastUpdatedAt || brief.submittedAt) },
          {
            label: 'Review state storage',
            value: getReviewStateStorageCopy(reviewStorageSource),
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
              ? 'Saved lifecycle-owned review state'
              : 'No persisted lifecycle-owned review state',
          },
          {
            label: 'Current First Preview output ID',
            value: aiSketchReviewState.currentAiSketchOutputId || 'No exact current First Preview',
          },
          {
            label: 'Persisted review output ID',
            value: aiSketchReviewState.reviewAiSketchOutputId || 'No bound output ID',
          },
          { label: 'Output binding', value: getReviewBindingCopy(aiSketchReviewState) },
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
          {
            label: 'First Preview availability',
            value: aiSketchReviewState.currentAiSketchOutputId
              ? 'Exact current First Preview is available for protected admin review.'
              : 'No exact current First Preview is available.',
          },
          {
            label: 'Customer visibility boundary',
            value:
              'The initial First Preview is customer-visible only after trusted automatic readiness gates pass. Human review remains a separate post-preview step.',
          },
          {
            label: 'Status separation',
            value:
              'Concept Brief admin review, First Preview readiness, AI sketch human review, and customer design confirmation remain separate states.',
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
        title:
          reviewStorageSource === 'supabase' || reviewStorageSource === 'empty'
            ? 'Internal notes / admin review state'
            : 'Internal notes / local review state',
        rows: [
          { label: 'Current notes', value: internalNotes || 'No internal notes saved yet.' },
          {
            label: 'Persistence',
            value: getInternalNotesPersistenceCopy(reviewStorageSource),
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
    const currentOutputId = aiSketchReviewState.currentAiSketchOutputId;

    if (!brief?.databaseId || !currentOutputId || aiSketchReviewState.reviewBindingStatus !== 'exact') {
      setAiSketchReviewSaveMessage('Review saving is blocked until the exact current First Preview and review row are bound.');
      return;
    }

    if (selectedAiSketchReviewStatus === AI_SKETCH_REVIEW_INITIAL_STATUS) {
      setAiSketchReviewSaveMessage('This generated First Preview requires a post-generation review status.');
      return;
    }

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
          conceptBriefId: brief.databaseId,
          aiSketchOutputId: currentOutputId,
          reviewStatus: selectedAiSketchReviewStatus,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as AdminAiSketchReviewSaveResponse;

      const savedReviewStatus = String(result.state?.reviewStatus || '');
      const savedOutputId = String(result.state?.aiSketchOutputId || '');

      if (
        !response.ok ||
        !result.ok ||
        !isAiSketchReviewStatus(savedReviewStatus) ||
        savedReviewStatus === AI_SKETCH_REVIEW_INITIAL_STATUS ||
        savedOutputId !== currentOutputId
      ) {
        throw new Error(result.message || 'AI sketch review state could not be saved.');
      }

      setAiSketchReviewState((currentState) => ({
        ...currentState,
        hasPersistedReview: true,
        reviewStatus: savedReviewStatus,
        reviewAiSketchOutputId: savedOutputId,
        reviewBindingStatus: 'exact',
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
            <CurrentFirstPreviewReview
              conceptBriefId={brief.databaseId}
              onImageAvailabilityChange={(outputId, isAvailable) => {
                setLoadedFirstPreviewOutputId(isAvailable ? outputId : null);
              }}
              review={aiSketchReviewState}
            />
            {detailSections.map((section) => (
              <DetailSection key={section.title} title={section.title} rows={section.rows} />
            ))}
            <InternalDesignPlanningArtifacts
              conceptBriefStatus={status}
              reviewStatus={aiSketchReviewState.reviewStatus}
            />
          </section>

          <aside className={styles.notesPanel}>
            <div>
              <h2>AI sketch review controls</h2>
              <p className={styles.helperText}>
                Save human review status for the exact current First Preview shown on this page.
              </p>
              <p className={styles.helperText}>
                {getReviewBindingCopy(aiSketchReviewState)}
              </p>
              {!canSaveAiSketchReview ? (
                <p className={styles.helperText}>
                  AI sketch review saving is available only when the protected current image is displayed and its Supabase-backed output and lifecycle review row match exactly.
                </p>
              ) : null}
              {aiSketchReviewSaveMessage ? <p className={styles.helperText}>{aiSketchReviewSaveMessage}</p> : null}
            </div>

            {canSaveAiSketchReview ? (
              <>
                <label className={styles.fieldLabel}>
                  AI sketch review status
                  <select
                    className={styles.select}
                    disabled={isAiSketchReviewSaving}
                    value={selectedAiSketchReviewStatus}
                    onChange={(event) => setSelectedAiSketchReviewStatus(event.target.value as AiSketchReviewStatus)}
                  >
                    {currentFirstPreviewReviewStatuses.map((option) => (
                      <option key={option} value={option}>
                        {AI_SKETCH_REVIEW_STATUS_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className={styles.button}
                  disabled={isAiSketchReviewSaving}
                  type="button"
                  onClick={handleAiSketchReviewSave}
                >
                  {isAiSketchReviewSaving ? 'Saving AI sketch status...' : 'Save AI sketch status'}
                </button>
              </>
            ) : null}

            <div>
              <h2>{isServerBacked ? 'Supabase-backed review controls' : 'Local fallback review controls'}</h2>
              <p className={styles.helperText}>{getReviewControlsCopy(reviewStorageSource)}</p>
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
