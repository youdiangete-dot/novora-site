'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './brief.module.css';

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

type StoredConceptBrief = {
  pieceType?: string;
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

const labels: Record<string, Record<string, string>> = {
  pieceType: {
    ring: 'Ring',
    pendant_necklace: 'Pendant / Necklace',
    bracelet_bangle: 'Bracelet / Bangle',
    earrings: 'Earrings',
    other_custom: 'Other / custom piece',
  },
  branch: {
    pendant_only: 'Pendant only',
    pendant_with_chain: 'Pendant with matching chain',
    necklace_chain_only: 'Necklace / chain only',
    fully_custom_pendant_necklace: 'Fully custom pendant / necklace',
    not_sure: 'Not sure yet',
  },
  structure: {
    ring_center_stone: 'Center-stone ring',
    ring_multi_stone: 'Multi-stone ring',
    ring_eternity_band: 'Eternity / repeated-stone band',
    ring_pave_full: 'Pave / fully set ring',
    ring_simple_band: 'Simple band / wedding band',
    ring_signet_nameplate: 'Signet / nameplate ring',
    ring_custom: 'Custom ring direction',
    pendant_center_stone: 'Center-stone pendant',
    pendant_multi_stone: 'Multi-stone pendant',
    pendant_pave_full: 'Pave / fully set pendant',
    pendant_metal_only: 'Metal-only pendant',
    pendant_charm_tag: 'Charm / tag / nameplate pendant',
    pendant_locket_medallion: 'Locket / medallion pendant',
    pendant_custom: 'Custom pendant direction',
    necklace_machine_woven_chain: 'Machine-woven chain',
    necklace_station: 'Station necklace',
    necklace_tennis: 'Tennis necklace',
    necklace_stone_set: 'Stone-set necklace',
    necklace_full_pave: 'Full pave necklace',
    necklace_custom_chain_only: 'Custom chain-only direction',
    bracelet_chain: 'Chain bracelet',
    bracelet_tennis: 'Tennis bracelet',
    bracelet_bangle: 'Bangle',
    bracelet_cuff: 'Cuff bracelet',
    bracelet_charm: 'Charm bracelet',
    bracelet_id_nameplate: 'ID / nameplate bracelet',
    bracelet_custom: 'Custom bracelet direction',
    earrings_stud: 'Stud earrings',
    earrings_drop: 'Drop / dangle earrings',
    earrings_hoop: 'Hoop earrings',
    earrings_huggie: 'Huggie earrings',
    earrings_cuff_climber: 'Ear cuff / climber',
    earrings_custom: 'Custom earrings direction',
    custom_brooch_pin: 'Brooch / pin',
    custom_cufflinks: 'Cufflinks',
    custom_hair_jewelry: 'Hair jewelry',
    custom_pet_tag_keepsake: 'Pet tag / keepsake',
    custom_keychain_object: 'Keychain / object',
    custom_symbolic_piece: 'Custom symbolic piece',
    not_sure: 'Not sure yet',
  },
  subStructure: {
    bangle_metal_only: 'Metal-only bangle',
    bangle_local_stone: 'Single/local stone accent',
    bangle_multi_stone: 'Multi-stone bangle',
    bangle_pave_full: 'Pave / fully set bangle',
    bangle_custom: 'Custom bangle direction',
    cuff_metal_only: 'Metal-only cuff',
    cuff_local_stone: 'Single/local stone accent',
    cuff_multi_stone: 'Multi-stone cuff',
    cuff_pave_full: 'Pave / fully set cuff',
    bracelet_cuff_custom: 'Custom cuff direction',
    charm_metal_only: 'Metal-only charm bracelet',
    charm_local_stone: 'Charm with single/local stone',
    charm_multi_stone: 'Multiple stone charms',
    charm_pave_stone_set: 'Pave / stone-set charms',
    charm_custom: 'Custom charm bracelet direction',
    nameplate_metal_only: 'Metal-only nameplate',
    nameplate_small_stone_accents: 'Nameplate with small stone accents',
    nameplate_pave_stone_set: 'Pave / stone-set nameplate',
    nameplate_engraved_text: 'Engraved / text-focused',
    nameplate_custom: 'Custom nameplate bracelet direction',
    stud_center_stone: 'Center-stone stud',
    stud_cluster: 'Cluster stud',
    stud_pave: 'Pave stud',
    stud_metal_only: 'Metal-only stud',
    stud_pearl_bead: 'Pearl / bead stud',
    stud_custom: 'Custom stud direction',
    drop_single_stone: 'Single-stone drop',
    drop_multi_stone: 'Multi-stone drop',
    drop_chain: 'Chain drop',
    drop_pearl_bead: 'Pearl / bead drop',
    drop_metal_only: 'Metal-only drop',
    drop_custom: 'Custom drop direction',
    hoop_plain: 'Plain hoop',
    hoop_pave: 'Pave hoop',
    hoop_stone_charm: 'Stone charm hoop',
    hoop_full_stone: 'Full stone hoop',
    hoop_custom: 'Custom hoop direction',
    huggie_plain: 'Plain huggie',
    huggie_pave: 'Pave huggie',
    huggie_stone_charm: 'Stone charm huggie',
    huggie_custom: 'Custom huggie direction',
    cuff_plain: 'Plain ear cuff',
    cuff_pave: 'Pave ear cuff',
    climber_with_stones: 'Ear climber with stones',
    cuff_custom: 'Custom ear cuff direction',
    not_sure: 'Not sure yet',
  },
  earringPairDirection: {
    pair: 'Pair',
    single_earring: 'Single earring',
    not_sure: 'Not sure yet',
  },
  chainStyle: {
    o_chain: 'O chain / Cable chain',
    box_chain: 'Box chain / Cross chain',
    curb_chain: 'Curb chain',
    water_wave_chain: 'Water wave chain',
    not_sure: 'Not sure yet',
    special_request: 'Special request / manual confirmation',
  },
  chainThickness: {
    '0.25_mm_ultra_fine': '0.25 mm - ultra fine',
    '0.30_mm_fine': '0.30 mm - fine',
    '0.40_mm_standard_light': '0.40 mm - standard light',
    '0.45_mm_standard': '0.45 mm - standard',
    '0.55_mm_stronger': '0.55 mm - stronger',
    not_sure: 'Not sure yet',
    special_request: 'Special request / manual confirmation',
  },
  chainLength: {
    '16_inch': '16 inch',
    '18_inch': '18 inch',
    '20_inch': '20 inch',
    '22_inch': '22 inch',
    not_sure: 'Not sure yet',
    special_request: 'Special request / manual confirmation',
  },
  stationType: {
    small_stone_stations: 'Small stone stations',
    pearl_bead_stations: 'Pearl / bead stations',
    metal_motif_stations: 'Metal motif stations',
    mixed_stations: 'Mixed stations',
    not_sure: 'Not sure yet',
  },
  stationSpacing: {
    even_spacing: 'Even spacing',
    front_focused_stations: 'Front-focused stations',
    scattered_stations: 'Scattered stations',
    graduated_spacing: 'Graduated spacing',
    not_sure: 'Not sure yet',
  },
  stationDetailSize: {
    very_small_accents: 'Very small accents',
    small_visible_stations: 'Small visible stations',
    mixed_sizes: 'Mixed sizes',
    not_sure: 'Not sure yet',
  },
  stationSetting: {
    bezel_set: 'Bezel set',
    prong_set: 'Prong set',
    wire_connected: 'Wire connected',
    fixed_onto_chain: 'Fixed onto chain',
    not_sure: 'Not sure yet',
  },
  stoneLogic: {
    none: 'No required stones',
    center_stone: 'Center stone / focal stone',
    multi_stone: 'Multiple focal stones',
    repeated_stone: 'Repeated stones / full setting',
    optional_stone: 'Optional stone decoration',
    manual_review: 'Manual review',
  },
  focalStoneType: {
    lab_diamond: 'Lab diamond',
    natural_diamond: 'Natural diamond',
    lab_grown_colored_gemstone: 'Lab-grown colored gemstone',
    natural_colored_gemstone: 'Natural colored gemstone',
    moissanite: 'Moissanite',
    pearl: 'Pearl',
    not_sure: 'Not sure yet',
  },
  multiStoneTypeMix: {
    lab_diamond: 'Lab diamond',
    natural_diamond: 'Natural diamond',
    lab_grown_colored_gemstone: 'Lab-grown colored gemstone',
    natural_colored_gemstone: 'Natural colored gemstone',
    moissanite: 'Moissanite',
    pearl: 'Pearl',
    mixed_stones: 'Mixed stones',
    not_sure: 'Not sure yet',
  },
  focalStoneColor: {
    blue: 'Blue',
    green: 'Green',
    pink: 'Pink',
    red: 'Red',
    purple: 'Purple',
    yellow: 'Yellow',
    white_colorless: 'White / colorless',
    black: 'Black',
    not_sure: 'Not sure yet',
  },
  focalStoneShape: {
    round: 'Round',
    oval: 'Oval',
    pear: 'Pear',
    emerald: 'Emerald',
    cushion: 'Cushion',
    marquise: 'Marquise',
    heart: 'Heart',
    other_fancy_cut: 'Other fancy cut',
    custom: 'Custom',
    not_sure: 'Not sure yet',
  },
  multiStoneShapeMix: {
    same_shape: 'Same shape',
    mixed_shapes: 'Mixed shapes',
    round: 'Round',
    oval: 'Oval',
    pear: 'Pear',
    emerald: 'Emerald',
    cushion: 'Cushion',
    marquise: 'Marquise',
    heart: 'Heart',
    other_fancy_cut: 'Other fancy cut',
    custom: 'Custom',
    not_sure: 'Not sure yet',
  },
  multiStoneSizeRelationship: {
    same_size_stones: 'Same size stones',
    center_larger_side_stones: 'Center larger with smaller side stones',
    graduated_sizes: 'Graduated sizes',
    mixed_sizes: 'Mixed sizes',
    not_sure: 'Not sure yet',
  },
  repeatedStoneCoverage: {
    full_coverage: 'Full coverage / full eternity',
    half_coverage: 'Half coverage',
    front_facing: 'Front-facing only',
    scattered: 'Scattered',
    custom: 'Custom',
    not_sure: 'Not sure yet',
  },
  repeatedStoneFeeling: {
    minimal: 'Minimal',
    balanced: 'Balanced',
    dense: 'Dense',
    fully_paved: 'Fully paved',
    statement: 'Statement',
    not_sure: 'Not sure yet',
  },
  repeatedStoneSize: {
    melee: 'Very small melee stones',
    small: 'Small repeated stones',
    medium: 'Medium matched stones',
    graduated: 'Graduated sizes',
    not_sure: 'Not sure yet',
  },
  repeatedSettingStyle: {
    pave: 'Pave',
    micro_pave: 'Micro pave',
    prong: 'Prong set',
    shared_prong: 'Shared prong',
    channel: 'Channel set',
    bezel: 'Bezel set',
    not_sure: 'Not sure yet',
  },
  styleDirection: {
    minimal: 'Minimal',
    classic: 'Classic',
    romantic: 'Romantic',
    vintage: 'Vintage',
    modern: 'Modern',
    bold: 'Bold',
    cute_playful: 'Cute / playful',
    organic_floral: 'Organic / floral',
    gothic_dark: 'Gothic / dark',
    luxury: 'Luxury',
    not_sure: 'Not sure yet',
  },
  metalDirection: {
    '925_sterling_silver': '925 Sterling Silver',
    '14k_gold': '14K Gold',
    '18k_gold': '18K Gold',
    platinum: 'Platinum',
    not_sure: 'Not sure yet',
  },
  finishDirection: {
    high_polish: 'High polish',
    matte_satin: 'Matte / satin',
    brushed: 'Brushed',
    hammered_textured: 'Hammered / textured',
    two_tone: 'Two-tone',
    not_sure: 'Not sure yet',
  },
  bandWidthDirection: {
    slim: 'Slim',
    medium: 'Medium',
    bold: 'Bold',
    not_sure: 'Not sure yet',
  },
  bandProfileDirection: {
    rounded: 'Rounded',
    flat: 'Flat',
    comfort_fit: 'Comfort fit',
    not_sure: 'Not sure yet',
  },
  engravingDirection: {
    no_engraving: 'No engraving',
    inside_engraving: 'Inside engraving',
    outside_engraving: 'Outside engraving',
    not_sure: 'Not sure yet',
  },
};

function label(group: keyof typeof labels, value?: string) {
  if (!value || value === 'not_sure') {
    return '';
  }

  return labels[group][value] || value;
}

function labelRequired(group: keyof typeof labels, value?: string) {
  if (!value) {
    return '';
  }

  return labels[group][value] || value;
}

function addBriefItem(items: SummaryItem[], labelText: string, value?: string) {
  if (value && value.trim()) {
    items.push({ label: labelText, value });
  }
}

function addChainBriefItems(items: SummaryItem[], brief: StoredConceptBrief) {
  addBriefItem(items, 'Chain style', labelRequired('chainStyle', brief.chainStyle));
  addBriefItem(items, 'Chain thickness / wire profile', labelRequired('chainThickness', brief.chainThickness));
  addBriefItem(items, 'Chain length', labelRequired('chainLength', brief.chainLength));
  addBriefItem(items, 'Chain note', brief.chainNote?.trim() || 'Not sure yet');
}

function generateConceptBriefId() {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');

  return `NOVORA-CB-${date}-${suffix}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readApiString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function notifyAdminConceptBrief(apiSubmission: ConceptBriefApiSubmissionMetadata) {
  if (!apiSubmission.persisted || !apiSubmission.conceptBriefId || !apiSubmission.publicReference) {
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

async function postConceptBriefSkeleton(payload: Record<string, unknown>): Promise<ConceptBriefApiSubmissionMetadata> {
  const fallbackMetadata: ConceptBriefApiSubmissionMetadata = {
    ok: false,
    persisted: false,
    message: 'API skeleton unavailable; local submission flow continued.',
  };

  const controller = new AbortController();
  // The persisted response carries the ids required to trigger admin notification,
  // so keep this timeout generous and reserve fallback for real request failures.
  const timeoutId = window.setTimeout(() => controller.abort(), CONCEPT_BRIEF_SUBMISSION_TIMEOUT_MS);

  try {
    const response = await fetch('/api/concept-briefs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as ConceptBriefApiResponse | null;

    if (!response.ok || !data?.ok) {
      return fallbackMetadata;
    }

    return {
      ok: true,
      persisted: data.persisted === true,
      mode: readApiString(data.mode),
      message: readApiString(data.message) || 'Concept Brief API skeleton received the submission for review.',
      publicReference: readApiString(data.publicReference),
      conceptBriefId: readApiString(data.conceptBriefId),
    };
  } catch {
    return fallbackMetadata;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function DesignBriefPage() {
  const router = useRouter();
  const [brief, setBrief] = useState<StoredConceptBrief | null>(null);
  const [contactFields, setContactFields] = useState<ContactFields>(initialContactFields);
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [referenceUploadMessage, setReferenceUploadMessage] = useState('');
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
    addBriefItem(items, 'Piece type', label('pieceType', brief.pieceType));
    addBriefItem(items, 'Branch', label('branch', brief.branch));
    addBriefItem(items, 'Structure', label('structure', brief.structure));
    addBriefItem(items, 'Sub-structure', label('subStructure', brief.subStructure));
    if (brief.structure === 'bracelet_chain') {
      addBriefItem(items, 'Chain bracelet structure note', brief.braceletStructureNote?.trim() || 'Not sure yet');
    }
    if (brief.structure === 'necklace_station') {
      addBriefItem(items, 'Station type', labelRequired('stationType', brief.stationType));
      addBriefItem(items, 'Station spacing direction', labelRequired('stationSpacing', brief.stationSpacing));
      addBriefItem(items, 'Station stone / detail size', labelRequired('stationDetailSize', brief.stationDetailSize));
      addBriefItem(
        items,
        'Station setting / connection direction',
        labelRequired('stationSetting', brief.stationSetting),
      );
      addBriefItem(items, 'Station necklace note', brief.stationNote?.trim() || 'Not sure yet');
    }
    if (brief.chainIncluded) {
      addChainBriefItems(items, brief);
    }
    addBriefItem(items, 'Stone logic', label('stoneLogic', brief.stoneLogic));
    if (brief.stoneLogic === 'multi_stone') {
      addBriefItem(items, 'Stone type / stone mix', labelRequired('multiStoneTypeMix', brief.multiStoneTypeMix));
      addBriefItem(items, 'Color direction', labelRequired('focalStoneColor', brief.focalStoneColor));
      addBriefItem(items, 'Shape / cut mix', labelRequired('multiStoneShapeMix', brief.multiStoneShapeMix));
      addBriefItem(
        items,
        'Stone size relationship',
        labelRequired('multiStoneSizeRelationship', brief.multiStoneSizeRelationship),
      );
      addBriefItem(items, 'Multi-stone layout direction', brief.multiStoneLayout?.trim() || 'Not sure yet');
    }
    addBriefItem(items, 'Visual focus', brief.visualFocus);
    addBriefItem(items, 'Style direction', label('styleDirection', brief.styleDirection));
    if (brief.pieceType === 'ring' && brief.structure === 'ring_simple_band') {
      addBriefItem(items, 'Band width direction', labelRequired('bandWidthDirection', brief.bandWidthDirection));
      addBriefItem(items, 'Band profile direction', labelRequired('bandProfileDirection', brief.bandProfileDirection));
      addBriefItem(items, 'Engraving direction', labelRequired('engravingDirection', brief.engravingDirection));
    }
    addBriefItem(items, 'Metal direction', label('metalDirection', brief.metalDirection));
    addBriefItem(items, 'Finish direction', label('finishDirection', brief.finishDirection));
    addBriefItem(items, 'Wearability', brief.wearability);
    addBriefItem(items, 'Personalization', brief.personalization);
    addBriefItem(items, 'Reference details', brief.referenceDetails);
    addBriefItem(items, 'Reference images', `${brief.referenceImageCount || 0} file(s) selected`);
    if (brief.referenceImageNames?.length) {
      addBriefItem(items, 'Reference image names', brief.referenceImageNames.join(', '));
    }
    addBriefItem(items, 'Reference notes', brief.referenceNotes?.trim() || 'Not sure yet');
    addBriefItem(items, 'Must include', brief.mustInclude);
    addBriefItem(items, 'Must avoid', brief.mustAvoid);
    return items;
  }, [brief]);

  function validateContactFields() {
    const nextErrors: ContactErrors = {};
    const customerName = contactFields.customerName.trim();
    const customerEmail = contactFields.customerEmail.trim();

    if (!customerName) {
      nextErrors.customerName = 'Customer name is required.';
    }

    if (!customerEmail) {
      nextErrors.customerEmail = 'Email address is required.';
    } else if (!isValidEmail(customerEmail)) {
      nextErrors.customerEmail = 'Enter a valid email address.';
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
        ? `${nextFiles.length} reference image${nextFiles.length === 1 ? '' : 's'} ready to upload with this concept brief.`
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
        message: 'No final reference images were selected for upload.',
        uploadedCount: 0,
        fileNames: [],
      };
    }

    if (!apiSubmission.persisted || !apiSubmission.conceptBriefId || !apiSubmission.publicReference) {
      return {
        ok: false,
        uploaded: false,
        message: 'Reference images could not be uploaded because the concept brief was saved locally only.',
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
          message: readApiString(result?.message) || 'Reference image upload is temporarily unavailable.',
          uploadedCount: 0,
          fileNames: referenceFiles.map((file) => file.name),
        };
      }

      return {
        ok: true,
        uploaded: true,
        message: readApiString(result.message) || 'Reference images were attached for concept review.',
        uploadedCount: result.assets?.length || referenceFiles.length,
        fileNames: result.assets?.map((asset) => asset.originalFilename || '').filter(Boolean) || referenceFiles.map((file) => file.name),
      };
    } catch {
      return {
        ok: false,
        uploaded: false,
        message: 'Reference image upload is temporarily unavailable.',
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
      summaryItems: displayItems,
      pieceType: brief.pieceType || '',
      branch: brief.branch || '',
      structure: brief.structure || '',
      subStructure: brief.subStructure || '',
      aiSketchInstruction: brief.aiSketchInstruction || '',
    };
    const apiSubmission = await postConceptBriefSkeleton(apiPayload);
    const referenceUpload = await uploadReferenceImages(apiSubmission);
    await notifyAdminConceptBrief(apiSubmission);
    const localConceptBriefId = generateConceptBriefId();
    const persistedPublicReference =
      apiSubmission.persisted && apiSubmission.publicReference ? apiSubmission.publicReference : undefined;
    const finalReferenceImageNames = referenceFiles.length
      ? referenceUpload.fileNames
      : brief.referenceImageNames || [];
    const finalReferenceImageCount = referenceFiles.length
      ? finalReferenceImageNames.length
      : brief.referenceImageCount || 0;

    const submittedBrief = {
      conceptBriefId: persistedPublicReference || localConceptBriefId,
      localConceptBriefId,
      publicReference: persistedPublicReference,
      submittedAt: new Date().toISOString(),
      customerName,
      customerEmail,
      customerPhone,
      customerCountry,
      contactNote,
      apiSubmission,
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
    router.push('/design/submitted');
  }

  const aiBrief = useMemo(() => {
    if (!brief) {
      return [];
    }

    const items: SummaryItem[] = [];
    addBriefItem(items, 'Design objective', 'Prepare a clear AI hand-drawn jewelry concept sketch from the applicable customer direction only.');
    addBriefItem(items, 'Piece type', label('pieceType', brief.pieceType));
    addBriefItem(items, 'Branch', label('branch', brief.branch));
    addBriefItem(items, 'Structure', label('structure', brief.structure));
    addBriefItem(items, 'Sub-structure', label('subStructure', brief.subStructure));
    if (brief.structure === 'bracelet_chain') {
      addBriefItem(items, 'Chain bracelet structure note', brief.braceletStructureNote?.trim() || 'Not sure yet');
    }
    if (brief.structure === 'necklace_station') {
      addBriefItem(items, 'Station type', labelRequired('stationType', brief.stationType));
      addBriefItem(items, 'Station spacing direction', labelRequired('stationSpacing', brief.stationSpacing));
      addBriefItem(items, 'Station stone / detail size', labelRequired('stationDetailSize', brief.stationDetailSize));
      addBriefItem(
        items,
        'Station setting / connection direction',
        labelRequired('stationSetting', brief.stationSetting),
      );
      addBriefItem(items, 'Station necklace note', brief.stationNote?.trim() || 'Not sure yet');
    }
    addBriefItem(items, 'Stone logic', label('stoneLogic', brief.stoneLogic));

    if (brief.stoneLogic === 'center_stone') {
      addBriefItem(
        items,
        'Focal stone / pearl / bead direction',
        [
          labelRequired('focalStoneType', brief.focalStoneType),
          labelRequired('focalStoneColor', brief.focalStoneColor),
          labelRequired('focalStoneShape', brief.focalStoneShape),
          brief.focalStoneSize?.trim() || 'Approximate focal size: Not sure yet',
        ]
          .filter(Boolean)
          .join(', '),
      );
    }

    if (brief.stoneLogic === 'multi_stone') {
      addBriefItem(items, 'Stone type / stone mix', labelRequired('multiStoneTypeMix', brief.multiStoneTypeMix));
      addBriefItem(items, 'Color direction', labelRequired('focalStoneColor', brief.focalStoneColor));
      addBriefItem(items, 'Shape / cut mix', labelRequired('multiStoneShapeMix', brief.multiStoneShapeMix));
      addBriefItem(
        items,
        'Stone size relationship',
        labelRequired('multiStoneSizeRelationship', brief.multiStoneSizeRelationship),
      );
      addBriefItem(items, 'Multi-stone layout direction', brief.multiStoneLayout?.trim() || 'Not sure yet');
    }

    if (brief.stoneLogic === 'repeated_stone') {
      addBriefItem(
        items,
        'Repeated-stone direction',
        [
          labelRequired('repeatedStoneCoverage', brief.repeatedStoneCoverage),
          labelRequired('repeatedStoneFeeling', brief.repeatedStoneFeeling),
          labelRequired('repeatedStoneSize', brief.repeatedStoneSize),
          labelRequired('repeatedSettingStyle', brief.repeatedSettingStyle),
          brief.stoneDirection?.trim() || 'Repeated-stone direction note: Not sure yet',
        ]
          .filter(Boolean)
          .join(', '),
      );
    }

    if (brief.stoneLogic === 'optional_stone') {
      addBriefItem(items, 'Optional stone direction', brief.optionalStoneDirection);
    }

    if (brief.chainIncluded) {
      addChainBriefItems(items, brief);
    }

    if (brief.pieceType === 'ring' && brief.structure === 'ring_simple_band') {
      addBriefItem(
        items,
        'Simple band structure',
        [
          labelRequired('bandWidthDirection', brief.bandWidthDirection),
          labelRequired('bandProfileDirection', brief.bandProfileDirection),
          labelRequired('engravingDirection', brief.engravingDirection),
        ]
          .filter(Boolean)
          .join(', '),
      );
    }

    addBriefItem(items, 'Visual mood', [brief.visualFocus, label('styleDirection', brief.styleDirection), brief.silhouette].filter(Boolean).join(', '));
    addBriefItem(items, 'Metal and finish direction', [label('metalDirection', brief.metalDirection), label('finishDirection', brief.finishDirection)].filter(Boolean).join(', '));
    addBriefItem(items, 'Wearability', brief.wearability);
    addBriefItem(items, 'Personalization', brief.personalization);
    addBriefItem(items, 'Emotional story', brief.emotionalStory);
    addBriefItem(items, 'Reference details', brief.referenceDetails);
    addBriefItem(items, 'Reference images', `${brief.referenceImageCount || 0} file(s) selected`);
    if (brief.referenceImageNames?.length) {
      addBriefItem(items, 'Reference image names', brief.referenceImageNames.join(', '));
    }
    addBriefItem(items, 'Reference notes', brief.referenceNotes?.trim() || 'Not sure yet');
    addBriefItem(items, 'Must include', brief.mustInclude);
    addBriefItem(items, 'Must avoid', brief.mustAvoid);

    if (brief.manualConfirmation || brief.manualChainConfirmationRequired || brief.stoneLogic === 'manual_review') {
      addBriefItem(items, 'Manual confirmation', brief.manualConfirmation || 'This direction may require manual confirmation before CAD, sourcing, or production.');
    }

    addBriefItem(
      items,
      'AI sketch instruction',
      brief.aiSketchInstruction ||
        'This is a hand-drawn concept sketch brief only and should not be treated as CAD-ready production confirmation.',
    );

    return items;
  }, [brief]);

  if (!isLoaded) {
    return <main className={styles.pageBackground} />;
  }

  if (!brief) {
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
              <p className={styles.eyebrow}>What happens next</p>
              <h2>Sketch first, CAD later</h2>
            </div>
            <p>
              Your next step is the AI hand-drawn concept sketch. CAD is a separate paid step after NOVORA confirms the
              design direction, stone size, material, setting details, feasibility, and early quote direction. Pricing
              and production details are not finalized at this stage.
            </p>
            <section className={styles.contactSection} aria-label="Contact for concept review">
              <div className={styles.contactHeading}>
                <h3>Contact for concept review</h3>
                <p>
                  Your contact details are used only to follow up on this concept brief. If backend persistence is
                  temporarily unavailable, NOVORA keeps the local browser fallback so this review flow can still
                  continue safely.
                </p>
              </div>
              <label className={styles.fieldLabel}>
                Customer name
                <input
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
                Email address
                <input
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
                Phone or WhatsApp optional
                <input
                  className={styles.input}
                  onChange={(event) => updateContactField('customerPhone', event.target.value)}
                  type="text"
                  value={contactFields.customerPhone}
                />
              </label>
              <label className={styles.fieldLabel}>
                Country / region optional
                <input
                  className={styles.input}
                  onChange={(event) => updateContactField('customerCountry', event.target.value)}
                  type="text"
                  value={contactFields.customerCountry}
                />
              </label>
              <label className={styles.fieldLabel}>
                Additional contact note optional
                <textarea
                  className={styles.textarea}
                  onChange={(event) => updateContactField('contactNote', event.target.value)}
                  value={contactFields.contactNote}
                />
              </label>
              <section className={styles.referenceUploadPanel} aria-label="Final reference image upload">
                <div className={styles.contactHeading}>
                  <h3>Final reference upload optional</h3>
                  <p>
                    Attach the reference images you want saved for admin review here before submitting. Earlier
                    concept-page image selections are planning references only and are not saved as final uploaded
                    files.
                  </p>
                </div>
                <label className={styles.fieldLabel}>
                  Upload final JPG, PNG, or WebP images
                  <input
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
                        {file.name} / {file.type || 'image'} / {Math.max(1, Math.round(file.size / 1024))} KB
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className={styles.placeholderMessage}>
                  Only files selected in this final upload area are saved for admin review. Uploaded references support
                  manual concept review and AI hand-drawn sketch direction only; they do not confirm CAD, pricing,
                  sourcing, final design approval, or production.
                </p>
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
                {isSubmitting ? 'Submitting concept brief' : 'Submit concept brief'}
              </button>
              <Link className={styles.secondaryButton} href="/design/pro-cad">
                Continue to paid CAD process
              </Link>
              <Link className={styles.tertiaryButton} href="/design/concept">
                Edit my concept direction
              </Link>
            </div>
            <p className={styles.readyMessage}>
              This submits a concept brief for AI hand-drawn sketch review. Optional reference uploads are attached only
              after the brief is saved. This does not place an order or confirm CAD, pricing, payment, sourcing, or
              production.
            </p>
          </aside>
        </section>

        <section className={`${styles.panel} ${styles.aiPanel}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>AI Sketch Brief</p>
            <h2>NOVORA AI Sketch Brief</h2>
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
          <h2>Boundary note</h2>
          <p>
            Stone availability, exact color matching, chain availability, strength, size, and setting feasibility will be
            confirmed before any paid CAD or production step. This brief does not include final pricing. Final quotation
            depends on confirmed stone size, metal, CAD structure, labor, and production details. This AI sketch brief is
            not a production-ready CAD file.
          </p>
        </section>
      </div>
    </main>
  );
}
