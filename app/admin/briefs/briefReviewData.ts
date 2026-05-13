'use client';

export type BriefStatus = 'New' | 'Reviewing' | 'Need more info' | 'Ready for CAD discussion' | 'Closed';

export type AdminBriefRecord = {
  conceptBriefId: string;
  submittedAt: string;
  lastUpdatedAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerCountry?: string;
  customerPhone?: string;
  contactNote?: string;
  pieceType?: string;
  branch?: string;
  structure?: string;
  subStructure?: string;
  stoneLogic?: string;
  referenceImageCount?: number;
  referenceImageNames?: string[];
  referenceNotes?: string;
  aiSketchInstruction?: string;
  status: BriefStatus;
  source: 'localStorage' | 'mock';
};

type StoredSubmittedBrief = Omit<AdminBriefRecord, 'status' | 'source'>;

export const SUBMITTED_BRIEF_STORAGE_KEY = 'novora_submitted_concept_brief';
export const ADMIN_REVIEW_STORAGE_KEY = 'novora_admin_brief_review_state';

export const statusOptions: BriefStatus[] = [
  'New',
  'Reviewing',
  'Need more info',
  'Ready for CAD discussion',
  'Closed',
];

export const mockBriefs: AdminBriefRecord[] = [
  {
    conceptBriefId: 'NOVORA-CB-MOCK-0001',
    submittedAt: '2026-05-10T10:30:00.000Z',
    lastUpdatedAt: '2026-05-10T14:15:00.000Z',
    customerName: 'Mock client A',
    customerEmail: 'planning-a@example.invalid',
    customerCountry: 'United States',
    customerPhone: 'Mock phone not connected',
    contactNote: 'Prefers email follow-up in a future real workflow. Mock metadata only.',
    pieceType: 'pendant_necklace',
    branch: 'pendant_with_chain',
    structure: 'pendant_center_stone',
    subStructure: '',
    stoneLogic: 'center_stone',
    referenceImageCount: 2,
    referenceImageNames: ['oval-pendant-front.png', 'chain-scale-note.jpg'],
    referenceNotes: 'Warm minimal pendant direction with soft oval proportions. Reference files are mock filenames only.',
    aiSketchInstruction:
      'Prepare a hand-drawn concept sketch direction only. Keep the pendant delicate, balanced, and clearly non-final.',
    status: 'Reviewing',
    source: 'mock',
  },
  {
    conceptBriefId: 'NOVORA-CB-MOCK-0002',
    submittedAt: '2026-05-09T16:20:00.000Z',
    lastUpdatedAt: '2026-05-11T09:05:00.000Z',
    customerName: 'Mock client B',
    customerEmail: 'planning-b@example.invalid',
    customerCountry: 'Canada',
    customerPhone: '',
    contactNote: 'Needs clearer stone size preference before CAD discussion. Mock metadata only.',
    pieceType: 'ring',
    branch: '',
    structure: 'ring_multi_stone',
    subStructure: '',
    stoneLogic: 'multi_stone',
    referenceImageCount: 1,
    referenceImageNames: ['three-stone-ring-profile.jpg'],
    referenceNotes: 'Mock metadata only. Use for planning how a future admin review queue might display context.',
    aiSketchInstruction: 'Show broad three-stone proportion options. Do not imply CAD readiness or production approval.',
    status: 'Need more info',
    source: 'mock',
  },
  {
    conceptBriefId: 'NOVORA-CB-MOCK-0003',
    submittedAt: '2026-05-08T11:45:00.000Z',
    lastUpdatedAt: '2026-05-08T12:10:00.000Z',
    customerName: '',
    customerEmail: '',
    customerCountry: '',
    customerPhone: '',
    contactNote: 'No contact fields provided in this mock seed record.',
    pieceType: 'bracelet_bangle',
    branch: '',
    structure: 'bracelet_bangle',
    subStructure: 'bangle_metal_only',
    stoneLogic: 'none',
    referenceImageCount: 0,
    referenceImageNames: [],
    referenceNotes: 'No upload files are available in this mock admin page.',
    aiSketchInstruction: 'Explore a clean metal-only bangle silhouette for discussion only.',
    status: 'Ready for CAD discussion',
    source: 'mock',
  },
];

const labels: Record<string, Record<string, string>> = {
  pieceType: {
    bracelet_bangle: 'Bracelet / Bangle',
    earrings: 'Earrings',
    other_custom: 'Other / custom piece',
    pendant_necklace: 'Pendant / Necklace',
    ring: 'Ring',
  },
  branch: {
    pendant_only: 'Pendant only',
    pendant_with_chain: 'Pendant with matching chain',
    necklace_chain_only: 'Necklace / chain only',
    fully_custom_pendant_necklace: 'Fully custom pendant / necklace',
    not_sure: 'Not sure yet',
  },
  structure: {
    bracelet_bangle: 'Bangle',
    bracelet_chain: 'Chain bracelet',
    bracelet_charm: 'Charm bracelet',
    bracelet_cuff: 'Cuff bracelet',
    bracelet_custom: 'Custom bracelet direction',
    bracelet_id_nameplate: 'ID / nameplate bracelet',
    bracelet_tennis: 'Tennis bracelet',
    custom_brooch_pin: 'Brooch / pin',
    custom_cufflinks: 'Cufflinks',
    custom_hair_jewelry: 'Hair jewelry',
    custom_keychain_object: 'Keychain / object',
    custom_pet_tag_keepsake: 'Pet tag / keepsake',
    custom_symbolic_piece: 'Custom symbolic piece',
    earrings_cuff_climber: 'Ear cuff / climber',
    earrings_custom: 'Custom earrings direction',
    earrings_drop: 'Drop / dangle earrings',
    earrings_hoop: 'Hoop earrings',
    earrings_huggie: 'Huggie earrings',
    earrings_stud: 'Stud earrings',
    necklace_custom_chain_only: 'Custom chain-only direction',
    necklace_full_pave: 'Full pave necklace',
    necklace_machine_woven_chain: 'Machine-woven chain',
    necklace_station: 'Station necklace',
    necklace_stone_set: 'Stone-set necklace',
    necklace_tennis: 'Tennis necklace',
    pendant_center_stone: 'Center-stone pendant',
    pendant_charm_tag: 'Charm / tag / nameplate pendant',
    pendant_custom: 'Custom pendant direction',
    pendant_locket_medallion: 'Locket / medallion pendant',
    pendant_metal_only: 'Metal-only pendant',
    pendant_multi_stone: 'Multi-stone pendant',
    pendant_pave_full: 'Pave / fully set pendant',
    ring_center_stone: 'Center-stone ring',
    ring_custom: 'Custom ring direction',
    ring_eternity_band: 'Eternity / repeated-stone band',
    ring_multi_stone: 'Multi-stone ring',
    ring_pave_full: 'Pave / fully set ring',
    ring_signet_nameplate: 'Signet / nameplate ring',
    ring_simple_band: 'Simple band / wedding band',
  },
  subStructure: {
    bangle_custom: 'Custom bangle direction',
    bangle_local_stone: 'Single/local stone accent',
    bangle_metal_only: 'Metal-only bangle',
    bangle_multi_stone: 'Multi-stone bangle',
    bangle_pave_full: 'Pave / fully set bangle',
    not_sure: 'Not sure yet',
  },
  stoneLogic: {
    center_stone: 'Center stone / focal stone',
    manual_review: 'Manual review',
    multi_stone: 'Multiple focal stones',
    none: 'No required stones',
    optional_stone: 'Optional stone decoration',
    repeated_stone: 'Repeated stones / full setting',
  },
};

export function displayValue(group: keyof typeof labels, value?: string) {
  if (!value) {
    return 'Not provided';
  }

  return labels[group][value] || value.replaceAll('_', ' ');
}

export function formatSubmittedTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || 'Not provided';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function getContactSummary(brief: AdminBriefRecord) {
  const contactParts = [
    brief.customerName || '',
    brief.customerEmail || '',
    brief.customerCountry || '',
    brief.customerPhone || '',
  ].filter(Boolean);

  return contactParts.length ? contactParts.join(' / ') : 'No contact fields provided';
}

export function hasReferenceMetadata(brief: AdminBriefRecord) {
  return Boolean(
    (brief.referenceImageCount && brief.referenceImageCount > 0) ||
      brief.referenceImageNames?.length ||
      brief.referenceNotes?.trim(),
  );
}

export function getCadReadiness(brief: AdminBriefRecord) {
  if (brief.status === 'Ready for CAD discussion') {
    return 'Ready for CAD discussion only';
  }

  if (brief.status === 'Need more info') {
    return 'Needs clarification before CAD discussion';
  }

  if (brief.status === 'Closed') {
    return 'Closed mock review';
  }

  return 'Not CAD-ready';
}

export function loadLocalSubmittedBrief(): AdminBriefRecord | null {
  try {
    const rawBrief = window.localStorage.getItem(SUBMITTED_BRIEF_STORAGE_KEY);

    if (!rawBrief) {
      return null;
    }

    const parsed = JSON.parse(rawBrief) as StoredSubmittedBrief;

    if (!parsed.conceptBriefId) {
      return null;
    }

    return {
      ...parsed,
      lastUpdatedAt: parsed.lastUpdatedAt || parsed.submittedAt,
    referenceImageCount: parsed.referenceImageCount || 0,
    referenceImageNames: parsed.referenceImageNames || [],
    referenceNotes: parsed.referenceNotes || '',
    customerName: parsed.customerName || '',
    customerEmail: parsed.customerEmail || '',
    customerCountry: parsed.customerCountry || '',
    customerPhone: parsed.customerPhone || '',
    contactNote: parsed.contactNote || '',
    status: 'New',
    source: 'localStorage',
  };
  } catch {
    return null;
  }
}

export type AdminReviewState = {
  status?: BriefStatus;
  internalNotes?: string;
  lastUpdatedAt?: string;
};

export type AdminReviewStateMap = Record<string, AdminReviewState>;

function isBriefStatus(value: unknown): value is BriefStatus {
  return typeof value === 'string' && statusOptions.includes(value as BriefStatus);
}

export function loadAdminReviewStateMap(): AdminReviewStateMap {
  try {
    const rawState = window.localStorage.getItem(ADMIN_REVIEW_STORAGE_KEY);

    if (!rawState) {
      return {};
    }

    return JSON.parse(rawState) as AdminReviewStateMap;
  } catch {
    return {};
  }
}

export function loadAdminReviewState(conceptBriefId: string): AdminReviewState {
  return loadAdminReviewStateMap()[conceptBriefId] || {};
}

export function saveAdminReviewState(conceptBriefId: string, state: AdminReviewState) {
  const currentState = loadAdminReviewStateMap();

  window.localStorage.setItem(
    ADMIN_REVIEW_STORAGE_KEY,
    JSON.stringify({
      ...currentState,
      [conceptBriefId]: state,
    }),
  );
}

function applyReviewState(brief: AdminBriefRecord, reviewState: AdminReviewState): AdminBriefRecord {
  return {
    ...brief,
    lastUpdatedAt: reviewState.lastUpdatedAt || brief.lastUpdatedAt || brief.submittedAt,
    status: isBriefStatus(reviewState.status) ? reviewState.status : brief.status,
  };
}

export function loadAdminBriefRecords() {
  const localBrief = loadLocalSubmittedBrief();
  const reviewState = loadAdminReviewStateMap();
  const records = localBrief ? [localBrief, ...mockBriefs] : mockBriefs;

  return records.map((brief) => applyReviewState(brief, reviewState[brief.conceptBriefId] || {}));
}
