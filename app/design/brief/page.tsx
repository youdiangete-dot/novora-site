'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './brief.module.css';
import { useI18n } from '../../../lib/i18n/client';
import { formatMessage } from '../../../lib/i18n/format';
import { localizePath } from '../../../lib/i18n/routing';

type StoneLogic = 'none' | 'center_stone' | 'multi_stone' | 'repeated_stone' | 'optional_stone' | 'manual_review' | '';

type SummaryItem = {
  label: string;
  value: string;
};

type ContactFields = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCountry: string;
  contactNote: string;
};

type ContactErrors = Partial<Record<keyof Pick<ContactFields, 'customerName' | 'customerEmail'>, string>>;

type ConceptBriefApiSubmissionMetadata = {
  ok: boolean;
  persisted: boolean;
  mode?: string;
  message: string;
  publicReference?: string;
  conceptBriefId?: string;
  rateLimited?: boolean;
};

type ConfirmedConceptBriefApiSubmissionMetadata = ConceptBriefApiSubmissionMetadata & {
  persisted: true;
  publicReference: string;
  conceptBriefId: string;
};

type ConceptBriefApiResponse = {
  ok?: unknown;
  persisted?: unknown;
  mode?: unknown;
  message?: unknown;
  publicReference?: unknown;
  conceptBriefId?: unknown;
};

type ReferenceAssetUploadMetadata = {
  ok: boolean;
  uploaded: boolean;
  message: string;
  uploadedCount: number;
  fileNames: string[];
};

type StartSelection = {
  pieceType?: string;
  pieceTypeLabel?: string;
  recipient?: string;
  recipientLabel?: string;
  style?: string;
  styleLabel?: string;
  budget?: string;
};

type StoredConceptBrief = {
  pieceType?: string;
  startSelection?: StartSelection;
  branch?: string;
  structure?: string;
  subStructure?: string;
  stoneLogic?: StoneLogic;
  earringPairDirection?: string;
  chainIncluded?: boolean;
  chainStyle?: string;
  chainThickness?: string;
  chainLength?: string;
  chainNote?: string;
  manualChainConfirmationRequired?: boolean;
  braceletStructureNote?: string;
  stationType?: string;
  stationSpacing?: string;
  stationDetailSize?: string;
  stationSetting?: string;
  stationNote?: string;
  focalStoneType?: string;
  focalStoneColor?: string;
  focalStoneSize?: string;
  focalStoneShape?: string;
  multiStoneTypeMix?: string;
  multiStoneShapeMix?: string;
  multiStoneSizeRelationship?: string;
  multiStoneLayout?: string;
  repeatedStoneCoverage?: string;
  repeatedStoneFeeling?: string;
  repeatedStoneSize?: string;
  repeatedSettingStyle?: string;
  optionalStoneDirection?: string;
  stoneDirection?: string;
  visualFocus?: string;
  styleDirection?: string;
  silhouette?: string;
  sizeDirection?: string;
  metalDirection?: string;
  finishDirection?: string;
  bandWidthDirection?: string;
  bandProfileDirection?: string;
  engravingDirection?: string;
  wearability?: string;
  personalization?: string;
  emotionalStory?: string;
  referenceDetails?: string;
  referenceImageCount?: number;
  referenceImageNames?: string[];
  referenceNotes?: string;
  mustInclude?: string;
  mustAvoid?: string;
  customUse?: string;
  customLook?: string;
  customScale?: string;
  customWearable?: string;
  customSymbol?: string;
  customTextPattern?: string;
  customMetalDirection?: string;
  customPieceNote?: string;
  productionConcernNote?: string;
  manualConfirmation?: string;
  aiSketchInstruction?: string;
  summaryItems?: SummaryItem[];
};

const STORAGE_KEY = 'novora_concept_brief';
const SUBMITTED_BRIEF_STORAGE_KEY = 'novora_submitted_concept_brief';
const CONCEPT_BRIEF_SUBMISSION_TIMEOUT_MS = 15000;
const initialContactFields: ContactFields = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerCountry: '',
  contactNote: '',
};

function addBriefItem(items: SummaryItem[], labelText: string, value?: string) {
  if (value && value.trim()) {
    items.push({ label: labelText, value });
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readApiString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function hasConfirmedServerReceipt(
  apiSubmission: ConceptBriefApiSubmissionMetadata,
): apiSubmission is ConfirmedConceptBriefApiSubmissionMetadata {
  return (
    apiSubmission.persisted &&
    /^NOVORA-CB-\d{8}-[A-Z0-9]{4}$/.test(apiSubmission.publicReference || '') &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apiSubmission.conceptBriefId || '')
  );
}

async function notifyAdminConceptBrief(apiSubmission: ConceptBriefApiSubmissionMetadata) {
  if (!hasConfirmedServerReceipt(apiSubmission)) {
    return;
  }

  try {
    await fetch('/api/concept-brief-admin-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conceptBriefId: apiSubmission.conceptBriefId,
        publicReference: apiSubmission.publicReference,
      }),
    });
  } catch {
    // Admin notification is best-effort and must not block customer submission.
  }
}

export default function DesignBriefPage() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.designBrief;
  const validationCopy = dictionary.validation;
  const errorCopy = dictionary.errors;
  const labels = copy.labels as unknown as Readonly<Record<string, Readonly<Record<string, string>>>>;
  const label = (group: string, value?: string) => {
    if (!value || value === 'not_sure') return '';
    return labels[group]?.[value] || value;
  };
  const labelRequired = (group: string, value?: string) => {
    if (!value) return '';
    return labels[group]?.[value] || value;
  };
  const addChainBriefItems = (items: SummaryItem[], value: StoredConceptBrief) => {
    addBriefItem(items, copy.chainStyleLabel, labelRequired('chainStyle', value.chainStyle));
    addBriefItem(items, copy.chainThicknessLabel, labelRequired('chainThickness', value.chainThickness));
    addBriefItem(items, copy.chainLengthLabel, labelRequired('chainLength', value.chainLength));
    addBriefItem(items, copy.chainNoteLabel, value.chainNote?.trim() || copy.notSureYet);
  };
  const postConceptBriefSkeleton = async (payload: Record<string, unknown>): Promise<ConceptBriefApiSubmissionMetadata> => {
    const fallbackMetadata: ConceptBriefApiSubmissionMetadata = {
      ok: false,
      persisted: false,
      message: errorCopy.serverReceiptWarning,
    };
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CONCEPT_BRIEF_SUBMISSION_TIMEOUT_MS);

    try {
      const response = await fetch('/api/concept-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = (await response.json().catch(() => null)) as ConceptBriefApiResponse | null;
      if (response.status === 429) {
        return {
          ok: false,
          persisted: false,
          message: locale === 'zh-TW' ? copy.rateLimitFallback : readApiString(data?.message) || copy.rateLimitFallback,
          rateLimited: true,
        };
      }
      if (!response.ok || !data?.ok) return fallbackMetadata;
      return {
        ok: true,
        persisted: data.persisted === true,
        mode: readApiString(data.mode),
        message: locale === 'zh-TW' ? copy.skeletonReceivedFallback : readApiString(data.message) || copy.skeletonReceivedFallback,
        publicReference: readApiString(data.publicReference),
        conceptBriefId: readApiString(data.conceptBriefId),
      };
    } catch {
      return fallbackMetadata;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };
  const router = useRouter();
  const [brief, setBrief] = useState<StoredConceptBrief | null>(null);
  const [contactFields, setContactFields] = useState<ContactFields>(initialContactFields);
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referenceUploadMessage, setReferenceUploadMessage] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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

  const displayItems = useMemo(() => {
    if (!brief) {
      return [];
    }

    if (brief.summaryItems?.length) {
      return brief.summaryItems;
    }

    const items: SummaryItem[] = [];
    addBriefItem(items, copy.db001, brief.startSelection?.recipientLabel);
    addBriefItem(items, copy.db002, brief.startSelection?.styleLabel);
    addBriefItem(items, copy.db003, brief.startSelection?.budget);
    addBriefItem(items, copy.db004, label('pieceType', brief.pieceType));
    addBriefItem(items, copy.db005, label('branch', brief.branch));
    addBriefItem(items, copy.db006, label('structure', brief.structure));
    addBriefItem(items, copy.db007, label('subStructure', brief.subStructure));
    if (brief.structure === 'bracelet_chain') {
      addBriefItem(items, copy.db008, brief.braceletStructureNote?.trim() || copy.db009);
    }
    if (brief.structure === 'necklace_station') {
      addBriefItem(items, copy.db010, labelRequired('stationType', brief.stationType));
      addBriefItem(items, copy.db011, labelRequired('stationSpacing', brief.stationSpacing));
      addBriefItem(items, copy.db012, labelRequired('stationDetailSize', brief.stationDetailSize));
      addBriefItem(
        items,
        copy.db013,
        labelRequired('stationSetting', brief.stationSetting),
      );
      addBriefItem(items, copy.db014, brief.stationNote?.trim() || copy.db009);
    }
    if (brief.chainIncluded) {
      addChainBriefItems(items, brief);
    }
    addBriefItem(items, copy.db015, label('stoneLogic', brief.stoneLogic));
    if (brief.stoneLogic === 'multi_stone') {
      addBriefItem(items, copy.db016, labelRequired('multiStoneTypeMix', brief.multiStoneTypeMix));
      addBriefItem(items, copy.db017, labelRequired('focalStoneColor', brief.focalStoneColor));
      addBriefItem(items, copy.db018, labelRequired('multiStoneShapeMix', brief.multiStoneShapeMix));
      addBriefItem(
        items,
        copy.db019,
        labelRequired('multiStoneSizeRelationship', brief.multiStoneSizeRelationship),
      );
      addBriefItem(items, copy.db020, brief.multiStoneLayout?.trim() || copy.db009);
    }
    addBriefItem(items, copy.db021, brief.visualFocus);
    addBriefItem(items, copy.db022, label('styleDirection', brief.styleDirection));
    if (brief.pieceType === 'ring' && brief.structure === 'ring_simple_band') {
      addBriefItem(items, copy.db023, labelRequired('bandWidthDirection', brief.bandWidthDirection));
      addBriefItem(items, copy.db024, labelRequired('bandProfileDirection', brief.bandProfileDirection));
      addBriefItem(items, copy.db025, labelRequired('engravingDirection', brief.engravingDirection));
    }
    addBriefItem(items, copy.db026, label('metalDirection', brief.metalDirection));
    addBriefItem(items, copy.db027, label('finishDirection', brief.finishDirection));
    addBriefItem(items, copy.db028, brief.wearability);
    addBriefItem(items, copy.db029, brief.personalization);
    addBriefItem(items, copy.db030, brief.referenceDetails);
    addBriefItem(items, copy.db031, formatMessage(copy.db032, { value0: brief.referenceImageCount || 0 }));
    if (brief.referenceImageNames?.length) {
      addBriefItem(items, copy.db033, brief.referenceImageNames.join(', '));
    }
    addBriefItem(items, copy.db034, brief.referenceNotes?.trim() || copy.db009);
    addBriefItem(items, copy.db035, brief.mustInclude);
    addBriefItem(items, copy.db036, brief.mustAvoid);
    return items;
  }, [brief, copy]);

  function validateContactFields() {
    const nextErrors: ContactErrors = {};
    const customerName = contactFields.customerName.trim();
    const customerEmail = contactFields.customerEmail.trim();

    if (!customerName) {
      nextErrors.customerName = validationCopy.customerNameRequired;
    }

    if (!customerEmail) {
      nextErrors.customerEmail = validationCopy.emailRequired;
    } else if (!isValidEmail(customerEmail)) {
      nextErrors.customerEmail = validationCopy.emailInvalid;
    }

    setContactErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function updateContactField(field: keyof ContactFields, value: string) {
    setContactFields((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === 'customerName' || field === 'customerEmail') {
      setContactErrors((current) => ({
        ...current,
        [field]: undefined,
      }));
    }
  }

  function updateReferenceFiles(files: FileList | null) {
    const nextFiles = Array.from(files || []);

    setReferenceFiles(nextFiles);
    setReferenceUploadMessage(
      nextFiles.length
        ? formatMessage(copy.db040, { value0: nextFiles.length, value1: nextFiles.length === 1 ? '' : 's' })
        : '',
    );
  }

  async function uploadReferenceImages(
    apiSubmission: ConceptBriefApiSubmissionMetadata,
  ): Promise<ReferenceAssetUploadMetadata> {
    if (!referenceFiles.length) {
      return {
        ok: true,
        uploaded: false,
        message: copy.db041,
        uploadedCount: 0,
        fileNames: [],
      };
    }

    if (!hasConfirmedServerReceipt(apiSubmission)) {
      return {
        ok: false,
        uploaded: false,
        message: copy.db042,
        uploadedCount: 0,
        fileNames: referenceFiles.map((file) => file.name),
      };
    }

    const formData = new FormData();

    formData.append('conceptBriefId', apiSubmission.conceptBriefId);
    formData.append('publicReference', apiSubmission.publicReference);
    for (const file of referenceFiles) {
      formData.append('referenceImages', file);
    }

    try {
      const response = await fetch('/api/concept-brief-reference-assets', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        assets?: Array<{
          originalFilename?: string;
        }>;
      } | null;

      if (!response.ok || !result?.ok) {
        return {
          ok: false,
          uploaded: false,
          message: locale === 'zh-TW' ? copy.db043 : readApiString(result?.message) || copy.db043,
          uploadedCount: 0,
          fileNames: referenceFiles.map((file) => file.name),
        };
      }

      return {
        ok: true,
        uploaded: true,
        message: locale === 'zh-TW' ? copy.db044 : readApiString(result.message) || copy.db044,
        uploadedCount: result.assets?.length || referenceFiles.length,
        fileNames: result.assets?.map((asset) => asset.originalFilename || '').filter(Boolean) || referenceFiles.map((file) => file.name),
      };
    } catch {
      return {
        ok: false,
        uploaded: false,
        message: copy.db043,
        uploadedCount: 0,
        fileNames: referenceFiles.map((file) => file.name),
      };
    }
  }

  async function submitConceptBrief() {
    if (!brief) {
      return;
    }

    if (isSubmitting) {
      return;
    }

    if (!validateContactFields()) {
      return;
    }

    setIsSubmitting(true);
    setSubmissionError('');

    const customerName = contactFields.customerName.trim();
    const customerEmail = contactFields.customerEmail.trim();
    const customerPhone = contactFields.customerPhone.trim();
    const customerCountry = contactFields.customerCountry.trim();
    const contactNote = contactFields.contactNote.trim();
    const apiPayload = {
      customerName,
      customerEmail,
      customerPhone,
      customerCountry,
      contactNote,
      phoneOrWhatsApp: customerPhone,
      countryOrRegion: customerCountry,
      contact: {
        customerName,
        customerEmail,
        customerPhone,
        customerCountry,
        contactNote,
      },
      brief,
      conceptBrief: brief,
      startSelection: brief.startSelection,
      summaryItems: displayItems,
      recipient: brief.startSelection?.recipient || '',
      stylePreference: brief.startSelection?.style || '',
      budgetPlanningRange: brief.startSelection?.budget || '',
      pieceType: brief.pieceType || '',
      branch: brief.branch || '',
      structure: brief.structure || '',
      subStructure: brief.subStructure || '',
      aiSketchInstruction: brief.aiSketchInstruction || '',
    };
    const apiSubmission = await postConceptBriefSkeleton(apiPayload);

    if (apiSubmission.rateLimited) {
      setSubmissionError(apiSubmission.message);
      setIsSubmitting(false);
      return;
    }

    if (!hasConfirmedServerReceipt(apiSubmission)) {
      setSubmissionError(errorCopy.serverReceiptWarning);
      setIsSubmitting(false);
      return;
    }

    const referenceUpload = await uploadReferenceImages(apiSubmission);
    await notifyAdminConceptBrief(apiSubmission);
    const finalReferenceImageNames = referenceFiles.length
      ? referenceUpload.fileNames
      : brief.referenceImageNames || [];
    const finalReferenceImageCount = referenceFiles.length
      ? finalReferenceImageNames.length
      : brief.referenceImageCount || 0;

    const submittedBrief = {
      conceptBriefId: apiSubmission.publicReference,
      publicReference: apiSubmission.publicReference,
      submittedAt: new Date().toISOString(),
      customerName,
      customerEmail,
      customerPhone,
      customerCountry,
      contactNote,
      apiSubmission,
      startSelection: brief.startSelection,
      summaryItems: displayItems,
      pieceType: brief.pieceType || '',
      branch: brief.branch || '',
      structure: brief.structure || '',
      subStructure: brief.subStructure || '',
      stoneLogic: brief.stoneLogic || '',
      referenceImageCount: finalReferenceImageCount,
      referenceImageNames: finalReferenceImageNames,
      referenceNotes: brief.referenceNotes || '',
      referenceUpload,
      ...(brief.aiSketchInstruction ? { aiSketchInstruction: brief.aiSketchInstruction } : {}),
    };

    window.localStorage.setItem(SUBMITTED_BRIEF_STORAGE_KEY, JSON.stringify(submittedBrief));
    router.push(localizePath('/design/submitted', locale));
  }

  const aiBrief = useMemo(() => {
    if (!brief) {
      return [];
    }

    const items: SummaryItem[] = [];
    addBriefItem(items, copy.db045, copy.db046);
    addBriefItem(items, copy.db001, brief.startSelection?.recipientLabel);
    addBriefItem(items, copy.db002, brief.startSelection?.styleLabel);
    addBriefItem(items, copy.db003, brief.startSelection?.budget);
    addBriefItem(items, copy.db004, label('pieceType', brief.pieceType));
    addBriefItem(items, copy.db005, label('branch', brief.branch));
    addBriefItem(items, copy.db006, label('structure', brief.structure));
    addBriefItem(items, copy.db007, label('subStructure', brief.subStructure));
    if (brief.structure === 'bracelet_chain') {
      addBriefItem(items, copy.db008, brief.braceletStructureNote?.trim() || copy.db009);
    }
    if (brief.structure === 'necklace_station') {
      addBriefItem(items, copy.db010, labelRequired('stationType', brief.stationType));
      addBriefItem(items, copy.db011, labelRequired('stationSpacing', brief.stationSpacing));
      addBriefItem(items, copy.db012, labelRequired('stationDetailSize', brief.stationDetailSize));
      addBriefItem(
        items,
        copy.db013,
        labelRequired('stationSetting', brief.stationSetting),
      );
      addBriefItem(items, copy.db014, brief.stationNote?.trim() || copy.db009);
    }
    addBriefItem(items, copy.db015, label('stoneLogic', brief.stoneLogic));

    if (brief.stoneLogic === 'center_stone') {
      addBriefItem(
        items,
        copy.db047,
        [
          labelRequired('focalStoneType', brief.focalStoneType),
          labelRequired('focalStoneColor', brief.focalStoneColor),
          labelRequired('focalStoneShape', brief.focalStoneShape),
          brief.focalStoneSize?.trim() || copy.db048,
        ]
          .filter(Boolean)
          .join(', '),
      );
    }

    if (brief.stoneLogic === 'multi_stone') {
      addBriefItem(items, copy.db016, labelRequired('multiStoneTypeMix', brief.multiStoneTypeMix));
      addBriefItem(items, copy.db017, labelRequired('focalStoneColor', brief.focalStoneColor));
      addBriefItem(items, copy.db018, labelRequired('multiStoneShapeMix', brief.multiStoneShapeMix));
      addBriefItem(
        items,
        copy.db019,
        labelRequired('multiStoneSizeRelationship', brief.multiStoneSizeRelationship),
      );
      addBriefItem(items, copy.db020, brief.multiStoneLayout?.trim() || copy.db009);
    }

    if (brief.stoneLogic === 'repeated_stone') {
      addBriefItem(
        items,
        copy.db049,
        [
          labelRequired('repeatedStoneCoverage', brief.repeatedStoneCoverage),
          labelRequired('repeatedStoneFeeling', brief.repeatedStoneFeeling),
          labelRequired('repeatedStoneSize', brief.repeatedStoneSize),
          labelRequired('repeatedSettingStyle', brief.repeatedSettingStyle),
          brief.stoneDirection?.trim() || copy.db050,
        ]
          .filter(Boolean)
          .join(', '),
      );
    }

    if (brief.stoneLogic === 'optional_stone') {
      addBriefItem(items, copy.db051, brief.optionalStoneDirection);
    }

    if (brief.chainIncluded) {
      addChainBriefItems(items, brief);
    }

    if (brief.pieceType === 'ring' && brief.structure === 'ring_simple_band') {
      addBriefItem(
        items,
        copy.db052,
        [
          labelRequired('bandWidthDirection', brief.bandWidthDirection),
          labelRequired('bandProfileDirection', brief.bandProfileDirection),
          labelRequired('engravingDirection', brief.engravingDirection),
        ]
          .filter(Boolean)
          .join(', '),
      );
    }

    addBriefItem(items, copy.db053, [brief.visualFocus, label('styleDirection', brief.styleDirection), brief.silhouette].filter(Boolean).join(', '));
    addBriefItem(items, copy.db054, [label('metalDirection', brief.metalDirection), label('finishDirection', brief.finishDirection)].filter(Boolean).join(', '));
    addBriefItem(items, copy.db028, brief.wearability);
    addBriefItem(items, copy.db029, brief.personalization);
    addBriefItem(items, copy.db055, brief.emotionalStory);
    addBriefItem(items, copy.db030, brief.referenceDetails);
    addBriefItem(items, copy.db031, formatMessage(copy.db032, { value0: brief.referenceImageCount || 0 }));
    if (brief.referenceImageNames?.length) {
      addBriefItem(items, copy.db033, brief.referenceImageNames.join(', '));
    }
    addBriefItem(items, copy.db034, brief.referenceNotes?.trim() || copy.db009);
    addBriefItem(items, copy.db035, brief.mustInclude);
    addBriefItem(items, copy.db036, brief.mustAvoid);

    if (brief.manualConfirmation || brief.manualChainConfirmationRequired || brief.stoneLogic === 'manual_review') {
      addBriefItem(items, copy.db056, brief.manualConfirmation || copy.db057);
    }

    addBriefItem(
      items,
      copy.db058,
      brief.aiSketchInstruction ||
        copy.db059,
    );

    return items;
  }, [brief, copy]);

  if (!isLoaded) {
    return <main className={styles.pageBackground} />;
  }

  if (!brief) {
    return (
      <main className={styles.pageBackground}>
        <section className={`${styles.shell} ${styles.emptyShell}`}>
          <div className={styles.emptyPanel}>
            <p className={styles.eyebrow}>{copy.db060}</p>
            <h1>{copy.db061}</h1>
            <p>
              {copy.db062}</p>
            <Link className={styles.primaryButton} href={localizePath('/design/concept', locale)}>
              {copy.db063}</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageBackground}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>{copy.db064}</p>
          <h1>{copy.db065}</h1>
          <p>{copy.db066}</p>
          <p className={styles.completionNote}>
            {copy.db067}</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.panel}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>{copy.db068}</p>
              <h2>{copy.db069}</h2>
            </div>
            <div className={styles.directionList}>
              {displayItems.map((item) => (
                <section key={item.label}>
                  <h3>{item.label}</h3>
                  <p>{item.value}</p>
                </section>
              ))}
            </div>
          </article>

          <aside className={`${styles.panel} ${styles.nextPanel}`}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>{copy.db070}</p>
              <h2>{copy.db071}</h2>
            </div>
            <p>
              {copy.db072}</p>
            <section className={styles.contactSection} aria-label={copy.db073}>
              <div className={styles.contactHeading}>
                <h3>{copy.db073}</h3>
                <p>
                  {copy.db074}</p>
              </div>
              <label className={styles.fieldLabel}>
                {copy.db075}<input
                  aria-invalid={Boolean(contactErrors.customerName)}
                  aria-describedby={contactErrors.customerName ? 'customer-name-error' : undefined}
                  className={styles.input}
                  onChange={(event) => updateContactField('customerName', event.target.value)}
                  type="text"
                  value={contactFields.customerName}
                />
                {contactErrors.customerName ? (
                  <span className={styles.errorText} id="customer-name-error">
                    {contactErrors.customerName}
                  </span>
                ) : null}
              </label>
              <label className={styles.fieldLabel}>
                {copy.db076}<input
                  aria-invalid={Boolean(contactErrors.customerEmail)}
                  aria-describedby={contactErrors.customerEmail ? 'customer-email-error' : undefined}
                  className={styles.input}
                  onChange={(event) => updateContactField('customerEmail', event.target.value)}
                  type="email"
                  value={contactFields.customerEmail}
                />
                {contactErrors.customerEmail ? (
                  <span className={styles.errorText} id="customer-email-error">
                    {contactErrors.customerEmail}
                  </span>
                ) : null}
              </label>
              <label className={styles.fieldLabel}>
                {copy.db077}<input
                  className={styles.input}
                  onChange={(event) => updateContactField('customerPhone', event.target.value)}
                  type="text"
                  value={contactFields.customerPhone}
                />
              </label>
              <label className={styles.fieldLabel}>
                {copy.db078}<input
                  className={styles.input}
                  onChange={(event) => updateContactField('customerCountry', event.target.value)}
                  type="text"
                  value={contactFields.customerCountry}
                />
              </label>
              <label className={styles.fieldLabel}>
                {copy.db079}<textarea
                  className={styles.textarea}
                  onChange={(event) => updateContactField('contactNote', event.target.value)}
                  value={contactFields.contactNote}
                />
              </label>
              <section className={styles.referenceUploadPanel} aria-label={copy.db080}>
                <div className={styles.contactHeading}>
                  <h3>{copy.db081}</h3>
                  <p>
                    {copy.db082}</p>
                </div>
                <label className={styles.fieldLabel}>
                  {copy.db083}<input
                    accept="image/jpeg,image/png,image/webp"
                    className={styles.input}
                    multiple
                    onChange={(event) => updateReferenceFiles(event.target.files)}
                    type="file"
                  />
                </label>
                {referenceFiles.length ? (
                  <ul className={styles.uploadFileList}>
                    {referenceFiles.map((file) => (
                      <li key={`${file.name}-${file.size}`}>
                        {file.name} {copy.db084}{file.type || 'image'} {copy.db084}{Math.max(1, Math.round(file.size / 1024))} {copy.db085}</li>
                    ))}
                  </ul>
                ) : null}
                <p className={styles.placeholderMessage}>
                  {copy.db086}</p>
                {referenceUploadMessage ? <p className={styles.readyMessage}>{referenceUploadMessage}</p> : null}
              </section>
            </section>
            <div className={styles.actions}>
              <button
                className={styles.primaryButton}
                disabled={isSubmitting}
                onClick={submitConceptBrief}
                type="button"
              >
                {isSubmitting ? copy.db087 : copy.db088}
              </button>
              {submissionError ? (
                <p className={styles.errorText} role="alert">
                  {submissionError}
                </p>
              ) : null}
              <Link className={styles.tertiaryButton} href={localizePath('/design/concept', locale)}>
                {copy.db089}</Link>
            </div>
            <p className={styles.readyMessage}>
              {copy.db090}</p>
          </aside>
        </section>

        <section className={`${styles.panel} ${styles.aiPanel}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>{copy.db091}</p>
            <h2>{copy.db092}</h2>
          </div>
          <dl className={styles.briefList}>
            {aiBrief.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.boundaryNote}>
          <h2>{copy.db093}</h2>
          <p>
            {copy.db094}</p>
        </section>
      </div>
    </main>
  );
}
