'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type CSSProperties, useEffect, useMemo, useState } from 'react';
import styles from './concept.module.css';
import { useI18n } from '../../../lib/i18n/client';
import { formatMessage } from '../../../lib/i18n/format';
import type { Dictionary } from '../../../lib/i18n/dictionaries';
import { localizePath } from '../../../lib/i18n/routing';

type ConceptCopy = Dictionary['designConcept'];
type ConceptCopyKey = keyof ConceptCopy;

type StoneLogic = 'none' | 'center_stone' | 'multi_stone' | 'repeated_stone' | 'optional_stone' | 'manual_review' | '';

type Option = {
  labelKey: ConceptCopyKey;
  value: string;
  descriptionKey?: ConceptCopyKey;
  stoneLogic?: StoneLogic;
};

type SummaryItem = {
  label: string;
  value: string;
};

type ReferenceImage = {
  name: string;
  previewUrl: string;
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
  pieceType: string;
  startSelection?: StartSelection;
  branch: string;
  structure: string;
  subStructure: string;
  stoneLogic: StoneLogic;
  earringPairDirection: string;
  chainIncluded: boolean;
  chainStyle: string;
  chainThickness: string;
  chainLength: string;
  chainNote: string;
  manualChainConfirmationRequired: boolean;
  braceletStructureNote: string;
  stationType: string;
  stationSpacing: string;
  stationDetailSize: string;
  stationSetting: string;
  stationNote: string;
  focalStoneType: string;
  focalStoneColor: string;
  focalStoneSize: string;
  focalStoneShape: string;
  multiStoneTypeMix: string;
  multiStoneShapeMix: string;
  multiStoneSizeRelationship: string;
  multiStoneLayout: string;
  repeatedStoneCoverage: string;
  repeatedStoneFeeling: string;
  repeatedStoneSize: string;
  repeatedSettingStyle: string;
  optionalStoneDirection: string;
  stoneDirection: string;
  visualFocus: string;
  styleDirection: string;
  silhouette: string;
  sizeDirection: string;
  metalDirection: string;
  finishDirection: string;
  bandWidthDirection: string;
  bandProfileDirection: string;
  engravingDirection: string;
  wearability: string;
  personalization: string;
  emotionalStory: string;
  referenceDetails: string;
  referenceImageCount: number;
  referenceImageNames: string[];
  referenceNotes: string;
  mustInclude: string;
  mustAvoid: string;
  customUse: string;
  customLook: string;
  customScale: string;
  customWearable: string;
  customSymbol: string;
  customTextPattern: string;
  customMetalDirection: string;
  customPieceNote: string;
  productionConcernNote: string;
  manualConfirmation: string;
  aiSketchInstruction: string;
  summaryItems: SummaryItem[];
};

const STORAGE_KEY = 'novora_concept_brief';
const manualReviewTextKey: ConceptCopyKey = 'manualReviewText';

const pieceTypes: Option[] = [
  { labelKey: 'dc001', value: 'ring' },
  { labelKey: 'dc002', value: 'pendant_necklace' },
  { labelKey: 'dc003', value: 'bracelet_bangle' },
  { labelKey: 'dc004', value: 'earrings' },
  { labelKey: 'dc005', value: 'other_custom' },
];

const pendantBranches: Option[] = [
  { labelKey: 'dc006', value: 'pendant_only' },
  { labelKey: 'dc007', value: 'pendant_with_chain' },
  { labelKey: 'dc008', value: 'necklace_chain_only' },
  { labelKey: 'dc009', value: 'fully_custom_pendant_necklace' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const ringStructures: Option[] = [
  { labelKey: 'dc011', value: 'ring_center_stone', stoneLogic: 'center_stone', descriptionKey: 'dc012' },
  { labelKey: 'dc013', value: 'ring_multi_stone', stoneLogic: 'multi_stone', descriptionKey: 'dc014' },
  { labelKey: 'dc015', value: 'ring_eternity_band', stoneLogic: 'repeated_stone', descriptionKey: 'dc016' },
  { labelKey: 'dc017', value: 'ring_pave_full', stoneLogic: 'repeated_stone', descriptionKey: 'dc018' },
  { labelKey: 'dc019', value: 'ring_simple_band', stoneLogic: 'none', descriptionKey: 'dc020' },
  { labelKey: 'dc021', value: 'ring_signet_nameplate', stoneLogic: 'optional_stone', descriptionKey: 'dc022' },
  { labelKey: 'dc023', value: 'ring_custom', stoneLogic: 'manual_review', descriptionKey: 'dc024' },
  { labelKey: 'dc010', value: 'not_sure', descriptionKey: 'dc025' },
];

const bandWidthDirections: Option[] = [
  { labelKey: 'dc026', value: 'slim' },
  { labelKey: 'dc027', value: 'medium' },
  { labelKey: 'dc028', value: 'bold' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const bandProfileDirections: Option[] = [
  { labelKey: 'dc029', value: 'rounded' },
  { labelKey: 'dc030', value: 'flat' },
  { labelKey: 'dc031', value: 'comfort_fit' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const engravingDirections: Option[] = [
  { labelKey: 'dc032', value: 'no_engraving' },
  { labelKey: 'dc033', value: 'inside_engraving' },
  { labelKey: 'dc034', value: 'outside_engraving' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const pendantStructures: Option[] = [
  { labelKey: 'dc035', value: 'pendant_center_stone', stoneLogic: 'center_stone', descriptionKey: 'dc036' },
  { labelKey: 'dc037', value: 'pendant_multi_stone', stoneLogic: 'multi_stone', descriptionKey: 'dc038' },
  { labelKey: 'dc039', value: 'pendant_pave_full', stoneLogic: 'repeated_stone', descriptionKey: 'dc040' },
  { labelKey: 'dc041', value: 'pendant_metal_only', stoneLogic: 'none', descriptionKey: 'dc042' },
  { labelKey: 'dc043', value: 'pendant_charm_tag', stoneLogic: 'optional_stone', descriptionKey: 'dc044' },
  { labelKey: 'dc045', value: 'pendant_locket_medallion', stoneLogic: 'optional_stone', descriptionKey: 'dc046' },
  { labelKey: 'dc047', value: 'pendant_custom', stoneLogic: 'manual_review', descriptionKey: 'dc048' },
  { labelKey: 'dc010', value: 'not_sure', descriptionKey: 'dc049' },
];

const necklaceStructures: Option[] = [
  { labelKey: 'dc050', value: 'necklace_machine_woven_chain', stoneLogic: 'none', descriptionKey: 'dc051' },
  { labelKey: 'dc052', value: 'necklace_station', descriptionKey: 'dc053' },
  { labelKey: 'dc054', value: 'necklace_tennis', stoneLogic: 'repeated_stone', descriptionKey: 'dc055' },
  { labelKey: 'dc056', value: 'necklace_stone_set', stoneLogic: 'repeated_stone', descriptionKey: 'dc057' },
  { labelKey: 'dc058', value: 'necklace_full_pave', stoneLogic: 'repeated_stone', descriptionKey: 'dc059' },
  { labelKey: 'dc060', value: 'necklace_custom_chain_only', stoneLogic: 'manual_review', descriptionKey: 'dc061' },
  { labelKey: 'dc010', value: 'not_sure', descriptionKey: 'dc062' },
];

const braceletStructures: Option[] = [
  { labelKey: 'dc063', value: 'bracelet_chain', stoneLogic: 'none', descriptionKey: 'dc064' },
  { labelKey: 'dc065', value: 'bracelet_tennis', stoneLogic: 'repeated_stone', descriptionKey: 'dc066' },
  { labelKey: 'dc067', value: 'bracelet_bangle', descriptionKey: 'dc068' },
  { labelKey: 'dc069', value: 'bracelet_cuff', descriptionKey: 'dc070' },
  { labelKey: 'dc071', value: 'bracelet_charm', descriptionKey: 'dc072' },
  { labelKey: 'dc073', value: 'bracelet_id_nameplate', descriptionKey: 'dc074' },
  { labelKey: 'dc075', value: 'bracelet_custom', stoneLogic: 'manual_review', descriptionKey: 'dc076' },
  { labelKey: 'dc010', value: 'not_sure', descriptionKey: 'dc077' },
];

const braceletSubStructures: Record<string, Option[]> = {
  bracelet_bangle: [
    { labelKey: 'dc078', value: 'bangle_metal_only', stoneLogic: 'none' },
    { labelKey: 'dc079', value: 'bangle_local_stone', stoneLogic: 'center_stone' },
    { labelKey: 'dc080', value: 'bangle_multi_stone', stoneLogic: 'multi_stone' },
    { labelKey: 'dc081', value: 'bangle_pave_full', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc082', value: 'bangle_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
  bracelet_cuff: [
    { labelKey: 'dc083', value: 'cuff_metal_only', stoneLogic: 'none' },
    { labelKey: 'dc079', value: 'cuff_local_stone', stoneLogic: 'center_stone' },
    { labelKey: 'dc084', value: 'cuff_multi_stone', stoneLogic: 'multi_stone' },
    { labelKey: 'dc085', value: 'cuff_pave_full', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc086', value: 'bracelet_cuff_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
  bracelet_charm: [
    { labelKey: 'dc087', value: 'charm_metal_only', stoneLogic: 'none' },
    { labelKey: 'dc088', value: 'charm_local_stone', stoneLogic: 'center_stone' },
    { labelKey: 'dc089', value: 'charm_multi_stone', stoneLogic: 'multi_stone' },
    { labelKey: 'dc090', value: 'charm_pave_stone_set', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc091', value: 'charm_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
  bracelet_id_nameplate: [
    { labelKey: 'dc092', value: 'nameplate_metal_only', stoneLogic: 'none' },
    { labelKey: 'dc093', value: 'nameplate_small_stone_accents', stoneLogic: 'optional_stone' },
    { labelKey: 'dc094', value: 'nameplate_pave_stone_set', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc095', value: 'nameplate_engraved_text', stoneLogic: 'none' },
    { labelKey: 'dc096', value: 'nameplate_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
};

const earringStructures: Option[] = [
  { labelKey: 'dc097', value: 'earrings_stud', descriptionKey: 'dc098' },
  { labelKey: 'dc099', value: 'earrings_drop', descriptionKey: 'dc100' },
  { labelKey: 'dc101', value: 'earrings_hoop', descriptionKey: 'dc102' },
  { labelKey: 'dc103', value: 'earrings_huggie', descriptionKey: 'dc104' },
  { labelKey: 'dc105', value: 'earrings_cuff_climber', descriptionKey: 'dc106' },
  { labelKey: 'dc107', value: 'earrings_custom', stoneLogic: 'manual_review', descriptionKey: 'dc108' },
  { labelKey: 'dc010', value: 'not_sure', descriptionKey: 'dc109' },
];

const earringPairDirections: Option[] = [
  { labelKey: 'dc110', value: 'pair' },
  { labelKey: 'dc111', value: 'single_earring' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const earringSubStructures: Record<string, Option[]> = {
  earrings_stud: [
    { labelKey: 'dc112', value: 'stud_center_stone', stoneLogic: 'center_stone' },
    { labelKey: 'dc113', value: 'stud_cluster', stoneLogic: 'multi_stone' },
    { labelKey: 'dc114', value: 'stud_pave', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc115', value: 'stud_metal_only', stoneLogic: 'none' },
    { labelKey: 'dc116', value: 'stud_pearl_bead', stoneLogic: 'center_stone' },
    { labelKey: 'dc117', value: 'stud_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
  earrings_drop: [
    { labelKey: 'dc118', value: 'drop_single_stone', stoneLogic: 'center_stone' },
    { labelKey: 'dc119', value: 'drop_multi_stone', stoneLogic: 'multi_stone' },
    { labelKey: 'dc120', value: 'drop_chain', stoneLogic: 'none' },
    { labelKey: 'dc121', value: 'drop_pearl_bead', stoneLogic: 'center_stone' },
    { labelKey: 'dc122', value: 'drop_metal_only', stoneLogic: 'none' },
    { labelKey: 'dc123', value: 'drop_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
  earrings_hoop: [
    { labelKey: 'dc124', value: 'hoop_plain', stoneLogic: 'none' },
    { labelKey: 'dc125', value: 'hoop_pave', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc126', value: 'hoop_stone_charm', stoneLogic: 'optional_stone' },
    { labelKey: 'dc127', value: 'hoop_full_stone', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc128', value: 'hoop_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
  earrings_huggie: [
    { labelKey: 'dc129', value: 'huggie_plain', stoneLogic: 'none' },
    { labelKey: 'dc130', value: 'huggie_pave', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc131', value: 'huggie_stone_charm', stoneLogic: 'optional_stone' },
    { labelKey: 'dc132', value: 'huggie_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
  earrings_cuff_climber: [
    { labelKey: 'dc133', value: 'cuff_plain', stoneLogic: 'none' },
    { labelKey: 'dc134', value: 'cuff_pave', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc135', value: 'climber_with_stones', stoneLogic: 'repeated_stone' },
    { labelKey: 'dc136', value: 'cuff_custom', stoneLogic: 'manual_review' },
    { labelKey: 'dc010', value: 'not_sure' },
  ],
};

const customPieceStructures: Option[] = [
  { labelKey: 'dc137', value: 'custom_brooch_pin' },
  { labelKey: 'dc138', value: 'custom_cufflinks' },
  { labelKey: 'dc139', value: 'custom_hair_jewelry' },
  { labelKey: 'dc140', value: 'custom_pet_tag_keepsake' },
  { labelKey: 'dc141', value: 'custom_keychain_object' },
  { labelKey: 'dc142', value: 'custom_symbolic_piece' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const chainStyles: Option[] = [
  { labelKey: 'dc143', value: 'o_chain' },
  { labelKey: 'dc144', value: 'box_chain' },
  { labelKey: 'dc145', value: 'curb_chain' },
  { labelKey: 'dc146', value: 'water_wave_chain' },
  { labelKey: 'dc010', value: 'not_sure' },
  { labelKey: 'dc147', value: 'special_request' },
];

const chainThicknesses: Option[] = [
  { labelKey: 'dc148', value: '0.25_mm_ultra_fine' },
  { labelKey: 'dc149', value: '0.30_mm_fine' },
  { labelKey: 'dc150', value: '0.40_mm_standard_light' },
  { labelKey: 'dc151', value: '0.45_mm_standard' },
  { labelKey: 'dc152', value: '0.55_mm_stronger' },
  { labelKey: 'dc010', value: 'not_sure' },
  { labelKey: 'dc147', value: 'special_request' },
];

const chainLengths: Option[] = [
  { labelKey: 'dc153', value: '16_inch' },
  { labelKey: 'dc154', value: '18_inch' },
  { labelKey: 'dc155', value: '20_inch' },
  { labelKey: 'dc156', value: '22_inch' },
  { labelKey: 'dc010', value: 'not_sure' },
  { labelKey: 'dc147', value: 'special_request' },
];

const styleDirections: Option[] = [
  { labelKey: 'dc157', value: 'minimal' },
  { labelKey: 'dc158', value: 'classic' },
  { labelKey: 'dc159', value: 'romantic' },
  { labelKey: 'dc160', value: 'vintage' },
  { labelKey: 'dc161', value: 'modern' },
  { labelKey: 'dc028', value: 'bold' },
  { labelKey: 'dc162', value: 'cute_playful' },
  { labelKey: 'dc163', value: 'organic_floral' },
  { labelKey: 'dc164', value: 'gothic_dark' },
  { labelKey: 'dc165', value: 'luxury' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const metalOptions: Option[] = [
  { labelKey: 'dc166', value: '925_sterling_silver' },
  { labelKey: 'dc167', value: '14k_gold' },
  { labelKey: 'dc168', value: '18k_gold' },
  { labelKey: 'dc169', value: 'platinum' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const finishOptions: Option[] = [
  { labelKey: 'dc170', value: 'high_polish' },
  { labelKey: 'dc171', value: 'matte_satin' },
  { labelKey: 'dc172', value: 'brushed' },
  { labelKey: 'dc173', value: 'hammered_textured' },
  { labelKey: 'dc174', value: 'two_tone' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const stoneTypes: Option[] = [
  { labelKey: 'dc175', value: 'lab_diamond' },
  { labelKey: 'dc176', value: 'natural_diamond' },
  { labelKey: 'dc177', value: 'lab_grown_colored_gemstone' },
  { labelKey: 'dc178', value: 'natural_colored_gemstone' },
  { labelKey: 'dc179', value: 'moissanite' },
  { labelKey: 'dc180', value: 'pearl' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const multiStoneTypeMixes: Option[] = [
  ...stoneTypes.slice(0, -1),
  { labelKey: 'dc181', value: 'mixed_stones' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const stoneColors: Option[] = [
  { labelKey: 'dc182', value: 'blue' },
  { labelKey: 'dc183', value: 'green' },
  { labelKey: 'dc184', value: 'pink' },
  { labelKey: 'dc185', value: 'red' },
  { labelKey: 'dc186', value: 'purple' },
  { labelKey: 'dc187', value: 'yellow' },
  { labelKey: 'dc188', value: 'white_colorless' },
  { labelKey: 'dc189', value: 'black' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const cutOptions: Option[] = [
  { labelKey: 'dc190', value: 'round' },
  { labelKey: 'dc191', value: 'oval' },
  { labelKey: 'dc192', value: 'pear' },
  { labelKey: 'dc193', value: 'emerald' },
  { labelKey: 'dc194', value: 'cushion' },
  { labelKey: 'dc195', value: 'marquise' },
  { labelKey: 'dc196', value: 'heart' },
  { labelKey: 'dc197', value: 'other_fancy_cut' },
  { labelKey: 'dc198', value: 'custom' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const multiStoneShapeMixes: Option[] = [
  { labelKey: 'dc199', value: 'same_shape' },
  { labelKey: 'dc200', value: 'mixed_shapes' },
  ...cutOptions.slice(0, -1),
  { labelKey: 'dc010', value: 'not_sure' },
];

const multiStoneSizeRelationships: Option[] = [
  { labelKey: 'dc201', value: 'same_size_stones' },
  { labelKey: 'dc202', value: 'center_larger_side_stones' },
  { labelKey: 'dc203', value: 'graduated_sizes' },
  { labelKey: 'dc204', value: 'mixed_sizes' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const repeatedStoneCoverages: Option[] = [
  { labelKey: 'dc205', value: 'full_coverage' },
  { labelKey: 'dc206', value: 'half_coverage' },
  { labelKey: 'dc207', value: 'front_facing' },
  { labelKey: 'dc208', value: 'scattered' },
  { labelKey: 'dc198', value: 'custom' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const repeatedStoneFeelings: Option[] = [
  { labelKey: 'dc157', value: 'minimal' },
  { labelKey: 'dc209', value: 'balanced' },
  { labelKey: 'dc210', value: 'dense' },
  { labelKey: 'dc211', value: 'fully_paved' },
  { labelKey: 'dc212', value: 'statement' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const repeatedStoneSizes: Option[] = [
  { labelKey: 'dc213', value: 'melee' },
  { labelKey: 'dc214', value: 'small' },
  { labelKey: 'dc215', value: 'medium' },
  { labelKey: 'dc203', value: 'graduated' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const repeatedSettingStyles: Option[] = [
  { labelKey: 'dc216', value: 'pave' },
  { labelKey: 'dc217', value: 'micro_pave' },
  { labelKey: 'dc218', value: 'prong' },
  { labelKey: 'dc219', value: 'shared_prong' },
  { labelKey: 'dc220', value: 'channel' },
  { labelKey: 'dc221', value: 'bezel' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const stationTypes: Option[] = [
  { labelKey: 'dc222', value: 'small_stone_stations' },
  { labelKey: 'dc223', value: 'pearl_bead_stations' },
  { labelKey: 'dc224', value: 'metal_motif_stations' },
  { labelKey: 'dc225', value: 'mixed_stations' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const stationSpacings: Option[] = [
  { labelKey: 'dc226', value: 'even_spacing' },
  { labelKey: 'dc227', value: 'front_focused_stations' },
  { labelKey: 'dc228', value: 'scattered_stations' },
  { labelKey: 'dc229', value: 'graduated_spacing' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const stationDetailSizes: Option[] = [
  { labelKey: 'dc230', value: 'very_small_accents' },
  { labelKey: 'dc231', value: 'small_visible_stations' },
  { labelKey: 'dc204', value: 'mixed_sizes' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const stationSettings: Option[] = [
  { labelKey: 'dc221', value: 'bezel_set' },
  { labelKey: 'dc218', value: 'prong_set' },
  { labelKey: 'dc232', value: 'wire_connected' },
  { labelKey: 'dc233', value: 'fixed_onto_chain' },
  { labelKey: 'dc010', value: 'not_sure' },
];

const conceptSteps: Array<{
  labelKey: ConceptCopyKey;
  backgroundSrc: string;
  visualClass: string;
}> = [
  { labelKey: 'dc234', backgroundSrc: '/assets/design/concept/backgrounds/gemstone-color-sketch-bg.png', visualClass: 'visualBasics' },
  { labelKey: 'dc235', backgroundSrc: '/assets/design/concept/backgrounds/stone-cut-sketch-bg.png', visualClass: 'visualShape' },
  { labelKey: 'dc236', backgroundSrc: '/assets/design/concept/backgrounds/accent-stones-sketch-bg.png', visualClass: 'visualAccent' },
  { labelKey: 'dc237', backgroundSrc: '/assets/design/concept/backgrounds/metal-finish-sketch-bg.png', visualClass: 'visualMetal' },
  { labelKey: 'dc238', backgroundSrc: '/assets/design/concept/backgrounds/concept-board-sketch-bg.png', visualClass: 'visualReview' },
];

const pieceTypeAliases: Record<string, string> = {
  other: 'other_custom',
  other_custom: 'other_custom',
  chain: 'pendant_necklace',
  not_sure: '',
};

const startRecipientLabelKeys: Record<string, ConceptCopyKey> = {
  myself: 'startRecipientMyself',
  partner: 'startRecipientPartner',
  'family-friend': 'startRecipientFamilyFriend',
  commemorative: 'startRecipientCommemorative',
};

const startStyleLabelKeys: Record<string, ConceptCopyKey> = {
  minimal: 'startStyleMinimal',
  organic: 'startStyleOrganic',
  vintage: 'startStyleVintage',
  'bold-modern': 'startStyleBoldModern',
  'your-style': 'startStyleYourStyle',
};

const startStyleDirectionAliases: Record<string, string> = {
  minimal: 'minimal',
  organic: 'organic_floral',
  vintage: 'vintage',
  'bold-modern': 'bold',
};

function optionLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.labelKey || '';
}

function findOption(value: string, groups: Option[][]) {
  return groups.flat().find((option) => option.value === value);
}

function isOpen(value: string) {
  return !value || value === 'not_sure';
}

export default function DesignConceptPage() {
  return (
    <Suspense fallback={<main className={styles.pageBackground} />}>
      <DesignConceptIntake />
    </Suspense>
  );
}

function DesignConceptIntake() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.designConcept;
  const manualReviewText = copy[manualReviewTextKey];
  const optionLabel = (options: Option[], value: string) => {
    const key = options.find((option) => option.value === value)?.labelKey;
    return key ? copy[key] : '';
  };
  const addItem = (items: SummaryItem[], label: string, value: string | undefined) => {
    if (value && value.trim() && value !== copy.dc010) items.push({ label, value });
  };
  const addRequiredItem = (items: SummaryItem[], label: string, value: string | undefined) => {
    if (value && value.trim()) items.push({ label, value });
  };
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeStep, setActiveStep] = useState(0);
  const [pieceType, setPieceType] = useState('');
  const [branch, setBranch] = useState('');
  const [structure, setStructure] = useState('');
  const [subStructure, setSubStructure] = useState('');
  const [earringPairDirection, setEarringPairDirection] = useState('');

  const [chainStyle, setChainStyle] = useState('not_sure');
  const [chainThickness, setChainThickness] = useState('not_sure');
  const [chainLength, setChainLength] = useState('not_sure');
  const [chainNote, setChainNote] = useState('');
  const [braceletStructureNote, setBraceletStructureNote] = useState('');
  const [stationType, setStationType] = useState('not_sure');
  const [stationSpacing, setStationSpacing] = useState('not_sure');
  const [stationDetailSize, setStationDetailSize] = useState('not_sure');
  const [stationSetting, setStationSetting] = useState('not_sure');
  const [stationNote, setStationNote] = useState('');

  const [focalStoneType, setFocalStoneType] = useState('not_sure');
  const [focalStoneColor, setFocalStoneColor] = useState('not_sure');
  const [focalStoneSize, setFocalStoneSize] = useState('');
  const [focalStoneShape, setFocalStoneShape] = useState('not_sure');
  const [multiStoneTypeMix, setMultiStoneTypeMix] = useState('not_sure');
  const [multiStoneShapeMix, setMultiStoneShapeMix] = useState('not_sure');
  const [multiStoneSizeRelationship, setMultiStoneSizeRelationship] = useState('not_sure');
  const [multiStoneLayout, setMultiStoneLayout] = useState('');
  const [repeatedStoneCoverage, setRepeatedStoneCoverage] = useState('not_sure');
  const [repeatedStoneFeeling, setRepeatedStoneFeeling] = useState('not_sure');
  const [repeatedStoneSize, setRepeatedStoneSize] = useState('not_sure');
  const [repeatedSettingStyle, setRepeatedSettingStyle] = useState('not_sure');
  const [optionalStoneDirection, setOptionalStoneDirection] = useState('');
  const [stoneDirection, setStoneDirection] = useState('');

  const [visualFocus, setVisualFocus] = useState('');
  const [styleDirection, setStyleDirection] = useState('not_sure');
  const [silhouette, setSilhouette] = useState('');
  const [sizeDirection, setSizeDirection] = useState('');
  const [metalDirection, setMetalDirection] = useState('not_sure');
  const [finishDirection, setFinishDirection] = useState('not_sure');
  const [bandWidthDirection, setBandWidthDirection] = useState('not_sure');
  const [bandProfileDirection, setBandProfileDirection] = useState('not_sure');
  const [engravingDirection, setEngravingDirection] = useState('not_sure');
  const [wearability, setWearability] = useState('');
  const [personalization, setPersonalization] = useState('');
  const [emotionalStory, setEmotionalStory] = useState('');
  const [referenceDetails, setReferenceDetails] = useState('');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceNotes, setReferenceNotes] = useState('');
  const [mustInclude, setMustInclude] = useState('');
  const [mustAvoid, setMustAvoid] = useState('');
  const [startSelection, setStartSelection] = useState<StartSelection>({});

  const [customUse, setCustomUse] = useState('');
  const [customLook, setCustomLook] = useState('');
  const [customScale, setCustomScale] = useState('');
  const [customWearable, setCustomWearable] = useState('');
  const [customSymbol, setCustomSymbol] = useState('');
  const [customTextPattern, setCustomTextPattern] = useState('');
  const [customMetalDirection, setCustomMetalDirection] = useState('');
  const [customPieceNote, setCustomPieceNote] = useState('');
  const [productionConcernNote, setProductionConcernNote] = useState('');

  const activeStepData = conceptSteps[activeStep];
  const pageStyle = {
    '--step-bg': `url(${activeStepData.backgroundSrc})`,
  } as CSSProperties;

  const selectedPieceLabel = optionLabel(pieceTypes, pieceType);
  const isPendantNecklace = pieceType === 'pendant_necklace';
  const isOtherCustom = pieceType === 'other_custom';
  const isSimpleBand = pieceType === 'ring' && structure === 'ring_simple_band';
  const isBraceletBangle = pieceType === 'bracelet_bangle';
  const isStationNecklace = pieceType === 'pendant_necklace' && structure === 'necklace_station';
  const isChainBracelet = pieceType === 'bracelet_bangle' && structure === 'bracelet_chain';
  const manualChainConfirmationRequired =
    chainStyle === 'special_request' || chainThickness === 'special_request' || chainLength === 'special_request';
  const referenceImageNames = referenceImages.map((image) => image.name);

  const chainIncluded =
    isPendantNecklace &&
    (branch === 'pendant_with_chain' ||
      branch === 'necklace_chain_only' ||
      structure === 'necklace_machine_woven_chain');

  const currentStructureOptions = useMemo(() => {
    if (pieceType === 'ring') {
      return ringStructures;
    }

    if (pieceType === 'bracelet_bangle') {
      return braceletStructures;
    }

    if (pieceType === 'earrings') {
      return earringStructures;
    }

    if (pieceType === 'other_custom') {
      return customPieceStructures;
    }

    if (pieceType === 'pendant_necklace') {
      if (branch === 'pendant_only' || branch === 'pendant_with_chain') {
        return pendantStructures;
      }

      if (branch === 'necklace_chain_only') {
        return necklaceStructures;
      }
    }

    return [];
  }, [branch, pieceType]);

  const currentSubStructureOptions =
    pieceType === 'earrings'
      ? earringSubStructures[structure] || []
      : pieceType === 'bracelet_bangle'
        ? braceletSubStructures[structure] || []
        : [];
  const selectedStructure = findOption(structure, [
    ringStructures,
    pendantStructures,
    necklaceStructures,
    braceletStructures,
    earringStructures,
    customPieceStructures,
  ]);
  const selectedSubStructure = findOption(subStructure, [
    ...Object.values(earringSubStructures),
    ...Object.values(braceletSubStructures),
  ]);

  const stoneLogic: StoneLogic = useMemo(() => {
    if (!pieceType || structure === 'not_sure' || branch === 'not_sure') {
      return '';
    }

    if (pieceType === 'other_custom' || branch === 'fully_custom_pendant_necklace') {
      return 'manual_review';
    }

    if (pieceType === 'earrings') {
      if (selectedStructure?.stoneLogic === 'manual_review') {
        return 'manual_review';
      }

      return selectedSubStructure?.stoneLogic || '';
    }

    if (pieceType === 'bracelet_bangle') {
      if (selectedStructure?.stoneLogic === 'manual_review') {
        return 'manual_review';
      }

      return selectedSubStructure?.stoneLogic || selectedStructure?.stoneLogic || '';
    }

    return selectedStructure?.stoneLogic || '';
  }, [branch, pieceType, selectedStructure?.stoneLogic, selectedSubStructure?.stoneLogic, structure]);

  const needsFocalStone = stoneLogic === 'center_stone';
  const needsMultiStone = stoneLogic === 'multi_stone';
  const needsRepeatedStone = stoneLogic === 'repeated_stone';
  const needsOptionalStone = stoneLogic === 'optional_stone';
  const needsManualReview = stoneLogic === 'manual_review';
  const showStoneStep = needsFocalStone || needsMultiStone || needsRepeatedStone || needsOptionalStone || needsManualReview;
  const showChainFields = chainIncluded;

  useEffect(() => {
    return () => {
      referenceImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [referenceImages]);

  useEffect(() => {
    const rawPieceType = searchParams.get('pieceType');
    const rawRecipient = searchParams.get('recipient') || '';
    const rawStyle = searchParams.get('style') || '';
    const rawBudget = searchParams.get('budget') || '';

    if (!rawPieceType && !rawRecipient && !rawStyle && !rawBudget) {
      return;
    }

    const mappedPieceType = rawPieceType ? pieceTypeAliases[rawPieceType] ?? rawPieceType : '';

    setStartSelection({
      pieceType: mappedPieceType,
      pieceTypeLabel: optionLabel(pieceTypes, mappedPieceType),
      recipient: rawRecipient,
      recipientLabel: startRecipientLabelKeys[rawRecipient] ? copy[startRecipientLabelKeys[rawRecipient]] : '',
      style: rawStyle,
      styleLabel: startStyleLabelKeys[rawStyle] ? copy[startStyleLabelKeys[rawStyle]] : '',
      budget: rawBudget,
    });

    if (mappedPieceType && pieceTypes.some((option) => option.value === mappedPieceType)) {
      handlePieceTypeChange(mappedPieceType);

      if (rawPieceType === 'chain') {
        setBranch('necklace_chain_only');
        setStructure('necklace_machine_woven_chain');
      }
    }

    const mappedStyleDirection = startStyleDirectionAliases[rawStyle];

    if (mappedStyleDirection) {
      setStyleDirection(mappedStyleDirection);
    }
  }, [copy, searchParams]);

  function resetStoneFields() {
    setFocalStoneType('not_sure');
    setFocalStoneColor('not_sure');
    setFocalStoneSize('');
    setFocalStoneShape('not_sure');
    setMultiStoneTypeMix('not_sure');
    setMultiStoneShapeMix('not_sure');
    setMultiStoneSizeRelationship('not_sure');
    setMultiStoneLayout('');
    setRepeatedStoneCoverage('not_sure');
    setRepeatedStoneFeeling('not_sure');
    setRepeatedStoneSize('not_sure');
    setRepeatedSettingStyle('not_sure');
    setOptionalStoneDirection('');
    setStoneDirection('');
  }

  function resetChainFields() {
    setChainStyle('not_sure');
    setChainThickness('not_sure');
    setChainLength('not_sure');
    setChainNote('');
  }

  function resetBraceletFields() {
    setBraceletStructureNote('');
  }

  function resetStationFields() {
    setStationType('not_sure');
    setStationSpacing('not_sure');
    setStationDetailSize('not_sure');
    setStationSetting('not_sure');
    setStationNote('');
  }

  function resetCustomFields() {
    setCustomUse('');
    setCustomLook('');
    setCustomScale('');
    setCustomWearable('');
    setCustomSymbol('');
    setCustomTextPattern('');
    setCustomMetalDirection('');
    setCustomPieceNote('');
    setProductionConcernNote('');
  }

  function resetSketchFields() {
    setVisualFocus('');
    setStyleDirection('not_sure');
    setSilhouette('');
    setSizeDirection('');
    setMetalDirection('not_sure');
    setFinishDirection('not_sure');
    setBandWidthDirection('not_sure');
    setBandProfileDirection('not_sure');
    setEngravingDirection('not_sure');
    setWearability('');
    setPersonalization('');
    setEmotionalStory('');
    setReferenceDetails('');
    setReferenceImages([]);
    setReferenceNotes('');
    setMustInclude('');
    setMustAvoid('');
  }

  function handlePieceTypeChange(nextPieceType: string) {
    setPieceType(nextPieceType);
    setBranch('');
    setStructure('');
    setSubStructure('');
    setEarringPairDirection('');
    resetChainFields();
    resetBraceletFields();
    resetStationFields();
    resetStoneFields();
    resetCustomFields();
    resetSketchFields();
    setActiveStep(0);
  }

  function handleBranchChange(nextBranch: string) {
    setBranch(nextBranch);
    setStructure('');
    setSubStructure('');
    resetStoneFields();
    resetStationFields();

    if (nextBranch === 'pendant_only') {
      resetChainFields();
    }

    if (nextBranch === 'necklace_chain_only') {
      setCustomPieceNote('');
    }

    if (nextBranch === 'fully_custom_pendant_necklace') {
      resetChainFields();
    }
  }

  function handleStructureChange(nextStructure: string) {
    setStructure(nextStructure);
    setSubStructure('');
    resetStoneFields();
    resetStationFields();
    if (nextStructure !== 'bracelet_chain') {
      resetBraceletFields();
    }

    if (nextStructure !== 'ring_simple_band') {
      setBandWidthDirection('not_sure');
      setBandProfileDirection('not_sure');
      setEngravingDirection('not_sure');
    }

    if (
      nextStructure === 'ring_simple_band' ||
      nextStructure === 'necklace_machine_woven_chain' ||
      nextStructure === 'bracelet_chain'
    ) {
      resetStoneFields();
    }

    if (findOption(nextStructure, [ringStructures, pendantStructures, necklaceStructures, braceletStructures])?.stoneLogic === 'manual_review') {
      resetStoneFields();
    }
  }

  function handleSubStructureChange(nextSubStructure: string) {
    setSubStructure(nextSubStructure);
    resetStoneFields();

    if (findOption(nextSubStructure, [...Object.values(earringSubStructures), ...Object.values(braceletSubStructures)])?.stoneLogic === 'manual_review') {
      resetStoneFields();
    }
  }

  function handleReferenceImageChange(files: FileList | null) {
    if (!files) {
      setReferenceImages([]);
      return;
    }

    const images = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        name: file.name,
        previewUrl: URL.createObjectURL(file),
      }));

    setReferenceImages(images);
  }

  const summaryItems = useMemo(() => {
    const items: SummaryItem[] = [];

    if (!pieceType) {
      return [{ label: copy.dc239, value: copy.dc240 }];
    }

    addItem(items, copy.dc239, selectedPieceLabel);
    addItem(items, copy.dc241, startSelection.recipientLabel);
    addItem(items, copy.dc242, startSelection.styleLabel);
    addItem(items, copy.dc243, startSelection.budget);

    if (isPendantNecklace) {
      addItem(items, copy.dc244, optionLabel(pendantBranches, branch));
    }

    addItem(items, copy.dc245, optionLabel(currentStructureOptions, structure));

    if (pieceType === 'earrings') {
      addItem(items, copy.dc246, optionLabel(earringPairDirections, earringPairDirection));
      addItem(items, copy.dc247, optionLabel(currentSubStructureOptions, subStructure));
    }

    if (isBraceletBangle && subStructure) {
      const braceletDirectionLabel =
        structure === 'bracelet_bangle'
          ? copy.dc248
          : structure === 'bracelet_cuff'
            ? copy.dc249
            : structure === 'bracelet_charm'
              ? copy.dc250
              : structure === 'bracelet_id_nameplate'
                ? copy.dc251
                : copy.dc252;
      addRequiredItem(items, braceletDirectionLabel, optionLabel(currentSubStructureOptions, subStructure));
    }

    if (stoneLogic) {
      addItem(items, copy.dc235, stoneLogic.replace('_', ' '));
    }

    if (needsFocalStone) {
      addRequiredItem(items, copy.dc253, optionLabel(stoneTypes, focalStoneType));
      addRequiredItem(items, copy.dc254, optionLabel(stoneColors, focalStoneColor));
      addRequiredItem(items, copy.dc255, optionLabel(cutOptions, focalStoneShape));
      addRequiredItem(items, copy.dc256, focalStoneSize.trim() || copy.dc010);
    }

    if (needsMultiStone) {
      addRequiredItem(items, copy.dc257, optionLabel(multiStoneTypeMixes, multiStoneTypeMix));
      addRequiredItem(items, copy.dc254, optionLabel(stoneColors, focalStoneColor));
      addRequiredItem(items, copy.dc258, optionLabel(multiStoneShapeMixes, multiStoneShapeMix));
      addRequiredItem(
        items,
        copy.dc259,
        optionLabel(multiStoneSizeRelationships, multiStoneSizeRelationship),
      );
      addRequiredItem(items, copy.dc260, multiStoneLayout.trim() || copy.dc010);
    }

    if (needsRepeatedStone) {
      addRequiredItem(items, copy.dc261, optionLabel(repeatedStoneCoverages, repeatedStoneCoverage));
      addRequiredItem(items, copy.dc262, optionLabel(repeatedStoneFeelings, repeatedStoneFeeling));
      addRequiredItem(items, copy.dc263, optionLabel(repeatedStoneSizes, repeatedStoneSize));
      addRequiredItem(items, copy.dc264, optionLabel(repeatedSettingStyles, repeatedSettingStyle));
      addRequiredItem(items, copy.dc265, stoneDirection.trim() || copy.dc010);
    }

    if (isStationNecklace) {
      addRequiredItem(items, copy.dc266, optionLabel(stationTypes, stationType));
      addRequiredItem(items, copy.dc267, optionLabel(stationSpacings, stationSpacing));
      addRequiredItem(items, copy.dc268, optionLabel(stationDetailSizes, stationDetailSize));
      addRequiredItem(items, copy.dc269, optionLabel(stationSettings, stationSetting));
      addRequiredItem(items, copy.dc270, stationNote.trim() || copy.dc010);
    }

    if (needsOptionalStone) {
      addItem(items, copy.dc271, optionalStoneDirection);
    }

    if (isChainBracelet) {
      addRequiredItem(items, copy.dc272, braceletStructureNote.trim() || copy.dc010);
    }

    if (showChainFields) {
      addRequiredItem(items, copy.dc273, optionLabel(chainStyles, chainStyle));
      addRequiredItem(items, copy.dc274, optionLabel(chainThicknesses, chainThickness));
      addRequiredItem(items, copy.dc275, optionLabel(chainLengths, chainLength));
      addRequiredItem(items, copy.dc276, chainNote.trim() || copy.dc010);

      if (manualChainConfirmationRequired) {
        addItem(items, copy.dc277, copy.dc278);
      }
    }

    addItem(items, copy.dc279, visualFocus);
    addItem(items, copy.dc280, optionLabel(styleDirections, styleDirection));
    addItem(items, copy.dc281, silhouette);
    addItem(items, copy.dc282, sizeDirection);
    if (isSimpleBand) {
      addRequiredItem(items, copy.dc283, optionLabel(bandWidthDirections, bandWidthDirection));
      addRequiredItem(items, copy.dc284, optionLabel(bandProfileDirections, bandProfileDirection));
      addRequiredItem(items, copy.dc285, optionLabel(engravingDirections, engravingDirection));
    }
    addItem(items, copy.dc286, optionLabel(metalOptions, metalDirection));
    addItem(items, copy.dc287, optionLabel(finishOptions, finishDirection));
    addItem(items, copy.dc288, wearability);
    addItem(items, copy.dc289, personalization);
    addItem(items, copy.dc290, emotionalStory);
    addItem(items, copy.dc291, referenceDetails);
    addRequiredItem(items, copy.dc292, formatMessage(copy.dc293, { value0: referenceImages.length }));
    if (referenceImageNames.length > 0) {
      addRequiredItem(items, copy.dc294, referenceImageNames.join(', '));
    }
    addRequiredItem(items, copy.dc295, referenceNotes.trim() || copy.dc010);
    addItem(items, copy.dc296, mustInclude);
    addItem(items, copy.dc297, mustAvoid);

    if (needsManualReview || isOtherCustom) {
      addItem(items, copy.dc298, manualReviewText);
      addItem(items, copy.dc299, customUse);
      addItem(items, copy.dc300, customLook);
      addItem(items, copy.dc301, customScale);
      addItem(items, copy.dc302, customWearable);
      addItem(items, copy.dc303, customSymbol);
      addItem(items, copy.dc304, customTextPattern);
      addItem(items, copy.dc305, stoneDirection);
      addItem(items, copy.dc306, customMetalDirection);
      addItem(items, copy.dc307, customPieceNote);
      addItem(items, copy.dc308, productionConcernNote);
    }

    return items;
  }, [
    branch,
    bandProfileDirection,
    bandWidthDirection,
    braceletStructureNote,
    chainLength,
    chainNote,
    chainStyle,
    chainThickness,
    copy,
    currentStructureOptions,
    currentSubStructureOptions,
    customLook,
    customMetalDirection,
    customPieceNote,
    customScale,
    customSymbol,
    customTextPattern,
    customUse,
    customWearable,
    earringPairDirection,
    engravingDirection,
    emotionalStory,
    finishDirection,
    focalStoneColor,
    focalStoneShape,
    focalStoneSize,
    focalStoneType,
    isBraceletBangle,
    isChainBracelet,
    multiStoneShapeMix,
    multiStoneSizeRelationship,
    multiStoneTypeMix,
    isOtherCustom,
    isPendantNecklace,
    isSimpleBand,
    isStationNecklace,
    manualChainConfirmationRequired,
    metalDirection,
    multiStoneShapeMix,
    multiStoneSizeRelationship,
    multiStoneTypeMix,
    multiStoneLayout,
    mustAvoid,
    mustInclude,
    needsFocalStone,
    needsManualReview,
    needsMultiStone,
    needsOptionalStone,
    needsRepeatedStone,
    optionalStoneDirection,
    personalization,
    pieceType,
    productionConcernNote,
    referenceDetails,
    referenceImageNames,
    referenceImages.length,
    referenceNotes,
    repeatedSettingStyle,
    repeatedStoneCoverage,
    repeatedStoneFeeling,
    repeatedStoneSize,
    selectedPieceLabel,
    showChainFields,
    silhouette,
    sizeDirection,
    stationDetailSize,
    stationNote,
    stationSetting,
    stationSpacing,
    stationType,
    stoneDirection,
    stoneLogic,
    structure,
    styleDirection,
    startSelection.budget,
    startSelection.recipientLabel,
    startSelection.styleLabel,
    subStructure,
    visualFocus,
    wearability,
  ]);

  const visibleSummaryItems = activeStep === 4 ? summaryItems : summaryItems.slice(0, 9);
  const canMoveForward = Boolean(pieceType);

  function goToNextStep() {
    if (!canMoveForward) {
      return;
    }

    setActiveStep((step) => Math.min(step + 1, conceptSteps.length - 1));
  }

  function goToPreviousStep() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function continueToBrief() {
    const conceptBrief: StoredConceptBrief = {
      pieceType,
      startSelection,
      branch,
      structure,
      subStructure,
      stoneLogic,
      earringPairDirection,
      chainIncluded,
      chainStyle,
      chainThickness,
      chainLength,
      chainNote,
      manualChainConfirmationRequired,
      braceletStructureNote,
      stationType,
      stationSpacing,
      stationDetailSize,
      stationSetting,
      stationNote,
      focalStoneType,
      focalStoneColor,
      focalStoneSize,
      focalStoneShape,
      multiStoneTypeMix,
      multiStoneShapeMix,
      multiStoneSizeRelationship,
      multiStoneLayout,
      repeatedStoneCoverage,
      repeatedStoneFeeling,
      repeatedStoneSize,
      repeatedSettingStyle,
      optionalStoneDirection,
      stoneDirection,
      visualFocus,
      styleDirection,
      silhouette,
      sizeDirection,
      metalDirection,
      finishDirection,
      bandWidthDirection,
      bandProfileDirection,
      engravingDirection,
      wearability,
      personalization,
      emotionalStory,
      referenceDetails,
      referenceImageCount: referenceImages.length,
      referenceImageNames,
      referenceNotes,
      mustInclude,
      mustAvoid,
      customUse,
      customLook,
      customScale,
      customWearable,
      customSymbol,
      customTextPattern,
      customMetalDirection,
      customPieceNote,
      productionConcernNote,
      manualConfirmation: needsManualReview || isOtherCustom || manualChainConfirmationRequired ? manualReviewText : '',
      aiSketchInstruction:
        copy.dc309,
      summaryItems,
    };

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conceptBrief));
    router.push(localizePath('/design/brief', locale));
  }

  return (
    <main className={styles.pageBackground} style={pageStyle}>
      <div className={styles.pageShell}>
        <header className={styles.intro}>
          <p className={styles.step}>{copy.dc310}</p>
          <h1>{copy.dc311}</h1>
          <p>
            {copy.dc312}</p>
        </header>

        {pieceType ? (
          <nav className={styles.progressNav} aria-label={copy.dc313}>
            {conceptSteps.map((step, index) => (
              <button
                className={`${styles.progressStep} ${activeStep === index ? styles.activeProgressStep : ''}`}
                key={step.visualClass}
                onClick={() => setActiveStep(index)}
                type="button"
              >
                <span>{index + 1}</span>
                {copy[step.labelKey]}
              </button>
            ))}
          </nav>
        ) : null}

        <div className={`${styles.layout} ${activeStep === 4 ? styles.reviewLayout : ''}`}>
          <form className={styles.form}>
            {activeStep === 0 ? (
              <section className={`${styles.panel} ${styles.stepPanel}`}>
                <div className={styles.sectionHeading}>
                  <h2>{pieceType ? copy.dc234 : copy.dc239}</h2>
                  <p>{copy.dc314}</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[0].visualClass]}`}
                  aria-hidden="true"
                />

                {!pieceType ? (
                  <fieldset className={styles.fieldset}>
                    <legend>{copy.dc239}</legend>
                    <div className={styles.optionRow}>
                      {pieceTypes.map((option) => (
                        <button
                          className={`${styles.choiceChip} ${pieceType === option.value ? styles.selectedChip : ''}`}
                          key={option.value}
                          onClick={() => handlePieceTypeChange(option.value)}
                          type="button"
                        >
                          {copy[option.labelKey]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <div className={styles.lockedPieceType}>
                    <div>
                      <span>{copy.dc239}</span>
                      <strong>{selectedPieceLabel}</strong>
                    </div>
                    <Link href={localizePath('/design/start', locale)}>{copy.dc315}</Link>
                  </div>
                )}

                {!pieceType ? (
                  <p className={styles.helperNote}>
                    {copy.dc316}</p>
                ) : null}

                {isPendantNecklace ? (
                  <fieldset className={styles.fieldset}>
                    <legend>{copy.dc317}</legend>
                    <div className={styles.optionRow}>
                      {pendantBranches.map((option) => (
                        <button
                          className={`${styles.choiceChip} ${branch === option.value ? styles.selectedChip : ''}`}
                          key={option.value}
                          onClick={() => handleBranchChange(option.value)}
                          type="button"
                        >
                          {copy[option.labelKey]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {pieceType && currentStructureOptions.length > 0 && branch !== 'fully_custom_pendant_necklace' ? (
                  <fieldset className={styles.fieldset}>
                    <legend>{isOtherCustom ? copy.dc318 : copy.dc245}</legend>
                    <div className={styles.structureGrid}>
                      {currentStructureOptions.map((option) => (
                        <button
                          className={`${styles.structureCard} ${structure === option.value ? styles.selectedCard : ''}`}
                          key={`${pieceType}-${branch || 'base'}-${option.value}`}
                          onClick={() => handleStructureChange(option.value)}
                          type="button"
                        >
                          <span>{copy[option.labelKey]}</span>
                          {option.descriptionKey ? <small>{copy[option.descriptionKey]}</small> : null}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {pieceType === 'earrings' && structure && structure !== 'not_sure' && structure !== 'earrings_custom' ? (
                  <>
                    <fieldset className={styles.fieldset}>
                      <legend>{copy.dc246}</legend>
                      <div className={styles.optionRow}>
                        {earringPairDirections.map((option) => (
                          <button
                            className={`${styles.choiceChip} ${
                              earringPairDirection === option.value ? styles.selectedChip : ''
                            }`}
                            key={option.value}
                            onClick={() => setEarringPairDirection(option.value)}
                            type="button"
                          >
                            {copy[option.labelKey]}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {currentSubStructureOptions.length > 0 ? (
                      <fieldset className={styles.fieldset}>
                        <legend>{copy.dc319}</legend>
                        <div className={styles.structureGrid}>
                          {currentSubStructureOptions.map((option) => (
                            <button
                              className={`${styles.structureCard} ${
                                subStructure === option.value ? styles.selectedCard : ''
                              }`}
                              key={`${structure}-${option.value}`}
                              onClick={() => handleSubStructureChange(option.value)}
                              type="button"
                            >
                              <span>{copy[option.labelKey]}</span>
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    ) : null}
                  </>
                ) : null}

                {pieceType === 'bracelet_bangle' && currentSubStructureOptions.length > 0 ? (
                  <fieldset className={styles.fieldset}>
                    <legend>
                      {structure === 'bracelet_bangle'
                        ? copy.dc248
                        : structure === 'bracelet_cuff'
                          ? copy.dc249
                          : structure === 'bracelet_charm'
                            ? copy.dc250
                            : structure === 'bracelet_id_nameplate'
                              ? copy.dc251
                              : copy.dc252}
                    </legend>
                    <div className={styles.structureGrid}>
                      {currentSubStructureOptions.map((option) => (
                        <button
                          className={`${styles.structureCard} ${
                            subStructure === option.value ? styles.selectedCard : ''
                          }`}
                          key={`${structure}-${option.value}`}
                          onClick={() => handleSubStructureChange(option.value)}
                          type="button"
                        >
                          <span>{copy[option.labelKey]}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {branch === 'fully_custom_pendant_necklace' || needsManualReview || isOtherCustom ? (
                  <p className={styles.helperNote}>{manualReviewText}</p>
                ) : null}
              </section>
            ) : null}

            {activeStep === 1 ? (
              <section className={styles.selectorGroup}>
                <div className={styles.sectionHeading}>
                  <h2>{copy.dc235}</h2>
                  <p>
                    {copy.dc320}{stoneLogic ? stoneLogic.replace('_', ' ') : copy.dc321}{copy.dc322}</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[1].visualClass]}`}
                  aria-hidden="true"
                />

                {!showStoneStep ? (
                  <p className={styles.helperNote}>
                    {copy.dc323}</p>
                ) : null}

                {isChainBracelet ? (
                  <label className={styles.field}>
                    <span>{copy.dc272}</span>
                    <textarea
                      onChange={(event) => setBraceletStructureNote(event.target.value)}
                      placeholder={copy.dc324}
                      value={braceletStructureNote}
                    />
                  </label>
                ) : null}

                {needsFocalStone ? (
                  <div className={styles.compactGrid}>
                    <OptionField title={copy.dc253} options={stoneTypes} value={focalStoneType} onChange={setFocalStoneType} />
                    <OptionField title={copy.dc254} options={stoneColors} value={focalStoneColor} onChange={setFocalStoneColor} />
                    <OptionField title={copy.dc255} options={cutOptions} value={focalStoneShape} onChange={setFocalStoneShape} />
                    <label className={styles.field}>
                      <span>{copy.dc256}</span>
                      <input
                        onChange={(event) => setFocalStoneSize(event.target.value)}
                        placeholder={copy.dc325}
                        value={focalStoneSize}
                      />
                    </label>
                  </div>
                ) : null}

                {needsMultiStone ? (
                  <>
                    <div className={styles.compactGrid}>
                      <OptionField title={copy.dc257} options={multiStoneTypeMixes} value={multiStoneTypeMix} onChange={setMultiStoneTypeMix} />
                      <OptionField title={copy.dc254} options={stoneColors} value={focalStoneColor} onChange={setFocalStoneColor} />
                      <OptionField title={copy.dc258} options={multiStoneShapeMixes} value={multiStoneShapeMix} onChange={setMultiStoneShapeMix} />
                      <OptionField
                        title={copy.dc259}
                        options={multiStoneSizeRelationships}
                        value={multiStoneSizeRelationship}
                        onChange={setMultiStoneSizeRelationship}
                      />
                    </div>
                    <label className={styles.field}>
                      <span>{copy.dc260}</span>
                      <textarea
                        onChange={(event) => setMultiStoneLayout(event.target.value)}
                        placeholder={copy.dc326}
                        value={multiStoneLayout}
                      />
                    </label>
                  </>
                ) : null}

                {needsRepeatedStone ? (
                  <div className={styles.compactGrid}>
                    <OptionField title={copy.dc261} options={repeatedStoneCoverages} value={repeatedStoneCoverage} onChange={setRepeatedStoneCoverage} />
                    <OptionField title={copy.dc262} options={repeatedStoneFeelings} value={repeatedStoneFeeling} onChange={setRepeatedStoneFeeling} />
                    <OptionField title={copy.dc263} options={repeatedStoneSizes} value={repeatedStoneSize} onChange={setRepeatedStoneSize} />
                    <OptionField title={copy.dc264} options={repeatedSettingStyles} value={repeatedSettingStyle} onChange={setRepeatedSettingStyle} />
                  </div>
                ) : null}

                {needsRepeatedStone ? (
                  <label className={styles.field}>
                    <span>{copy.dc265}</span>
                    <textarea
                      onChange={(event) => setStoneDirection(event.target.value)}
                      placeholder={copy.dc327}
                      value={stoneDirection}
                    />
                  </label>
                ) : null}

                {isStationNecklace ? (
                  <section className={styles.repeatedStonePanel}>
                    <div className={styles.sectionHeading}>
                      <h2>{copy.dc328}</h2>
                      <p>{copy.dc329}</p>
                    </div>
                    <div className={styles.compactGrid}>
                      <OptionField title={copy.dc266} options={stationTypes} value={stationType} onChange={setStationType} />
                      <OptionField title={copy.dc267} options={stationSpacings} value={stationSpacing} onChange={setStationSpacing} />
                      <OptionField title={copy.dc268} options={stationDetailSizes} value={stationDetailSize} onChange={setStationDetailSize} />
                      <OptionField title={copy.dc269} options={stationSettings} value={stationSetting} onChange={setStationSetting} />
                    </div>
                    <label className={styles.field}>
                      <span>{copy.dc270}</span>
                      <textarea
                        onChange={(event) => setStationNote(event.target.value)}
                        placeholder={copy.dc330}
                        value={stationNote}
                      />
                    </label>
                  </section>
                ) : null}

                {needsOptionalStone ? (
                  <label className={styles.field}>
                    <span>{copy.dc271}</span>
                    <textarea
                      onChange={(event) => setOptionalStoneDirection(event.target.value)}
                      placeholder={copy.dc331}
                      value={optionalStoneDirection}
                    />
                  </label>
                ) : null}

                {needsManualReview || isOtherCustom ? renderManualReviewFields() : null}
              </section>
            ) : null}

            {activeStep === 2 ? (
              <section className={styles.selectorGroup}>
                <div className={styles.sectionHeading}>
                  <h2>{copy.dc332}</h2>
                  <p>{copy.dc333}</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[2].visualClass]}`}
                  aria-hidden="true"
                />
                <OptionField title={copy.dc280} options={styleDirections} value={styleDirection} onChange={setStyleDirection} />
                <label className={styles.field}>
                  <span>{copy.dc279}</span>
                  <textarea onChange={(event) => setVisualFocus(event.target.value)} value={visualFocus} />
                </label>
                <label className={styles.field}>
                  <span>{copy.dc281}</span>
                  <textarea onChange={(event) => setSilhouette(event.target.value)} value={silhouette} />
                </label>
                <label className={styles.field}>
                  <span>{copy.dc334}</span>
                  <textarea onChange={(event) => setSizeDirection(event.target.value)} value={sizeDirection} />
                </label>
                <label className={styles.field}>
                  <span>{copy.dc291}</span>
                  <textarea onChange={(event) => setReferenceDetails(event.target.value)} value={referenceDetails} />
                </label>

                <section className={`${styles.repeatedStonePanel} ${styles.referencePanel}`}>
                  <div className={styles.sectionHeading}>
                    <h2>{copy.dc335}</h2>
                    <p>
                      {copy.dc336}</p>
                  </div>
                  <label className={styles.referenceUpload}>
                    <span>{copy.dc337}</span>
                    <input
                      accept="image/*"
                      multiple
                      onChange={(event) => handleReferenceImageChange(event.target.files)}
                      type="file"
                    />
                  </label>
                  {referenceImages.length > 0 ? (
                    <div className={styles.referencePreviewGrid}>
                      {referenceImages.map((image) => (
                        <figure className={styles.referencePreview} key={`${image.name}-${image.previewUrl}`}>
                          <img alt="" src={image.previewUrl} />
                          <figcaption>{image.name}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.inlineHint}>{copy.dc338}</p>
                  )}
                  <label className={styles.field}>
                    <span>{copy.dc295}</span>
                    <textarea
                      onChange={(event) => setReferenceNotes(event.target.value)}
                      placeholder={copy.dc339}
                      value={referenceNotes}
                    />
                  </label>
                  <p className={styles.helperNote}>
                    {copy.dc340}</p>
                </section>
              </section>
            ) : null}

            {activeStep === 3 ? (
              <section className={styles.selectorGroup}>
                <div className={styles.sectionHeading}>
                  <h2>{copy.dc341}</h2>
                  <p>{copy.dc342}</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[3].visualClass]}`}
                  aria-hidden="true"
                />
                <div className={styles.compactGrid}>
                  <OptionField title={copy.dc343} options={metalOptions} value={metalDirection} onChange={setMetalDirection} />
                  <OptionField title={copy.dc344} options={finishOptions} value={finishDirection} onChange={setFinishDirection} />
                </div>

                {isSimpleBand ? (
                  <section className={styles.repeatedStonePanel}>
                    <div className={styles.sectionHeading}>
                      <h2>{copy.dc345}</h2>
                      <p>{copy.dc346}</p>
                    </div>
                    <div className={styles.compactGrid}>
                      <OptionField
                        title={copy.dc283}
                        options={bandWidthDirections}
                        value={bandWidthDirection}
                        onChange={setBandWidthDirection}
                      />
                      <OptionField
                        title={copy.dc284}
                        options={bandProfileDirections}
                        value={bandProfileDirection}
                        onChange={setBandProfileDirection}
                      />
                      <OptionField
                        title={copy.dc285}
                        options={engravingDirections}
                        value={engravingDirection}
                        onChange={setEngravingDirection}
                      />
                    </div>
                  </section>
                ) : null}

                {showChainFields ? (
                  <section className={styles.repeatedStonePanel}>
                    <div className={styles.sectionHeading}>
                      <h2>{copy.dc347}</h2>
                      <p>{copy.dc348}</p>
                    </div>
                    <div className={styles.compactGrid}>
                      <OptionField title={copy.dc273} options={chainStyles} value={chainStyle} onChange={setChainStyle} />
                      <OptionField title={copy.dc274} options={chainThicknesses} value={chainThickness} onChange={setChainThickness} />
                      <OptionField title={copy.dc275} options={chainLengths} value={chainLength} onChange={setChainLength} />
                    </div>
                    {manualChainConfirmationRequired ? (
                      <p className={styles.helperNote}>
                        {copy.dc349}</p>
                    ) : null}
                    <label className={styles.field}>
                      <span>{copy.dc276}</span>
                      <textarea
                        onChange={(event) => setChainNote(event.target.value)}
                        placeholder={copy.dc350}
                        value={chainNote}
                      />
                    </label>
                  </section>
                ) : null}

                <label className={styles.field}>
                  <span>{copy.dc288}</span>
                  <textarea onChange={(event) => setWearability(event.target.value)} value={wearability} />
                </label>
                <label className={styles.field}>
                  <span>{copy.dc289}</span>
                  <textarea onChange={(event) => setPersonalization(event.target.value)} value={personalization} />
                </label>
                <label className={styles.field}>
                  <span>{copy.dc290}</span>
                  <textarea onChange={(event) => setEmotionalStory(event.target.value)} value={emotionalStory} />
                </label>
                <label className={styles.field}>
                  <span>{copy.dc296}</span>
                  <textarea onChange={(event) => setMustInclude(event.target.value)} value={mustInclude} />
                </label>
                <label className={styles.field}>
                  <span>{copy.dc297}</span>
                  <textarea onChange={(event) => setMustAvoid(event.target.value)} value={mustAvoid} />
                </label>
              </section>
            ) : null}

            {activeStep === 4 ? (
              <section className={`${styles.selectorGroup} ${styles.reviewIntro}`}>
                <div className={styles.sectionHeading}>
                  <h2>{copy.dc238}</h2>
                  <p>{copy.dc351}</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[4].visualClass]}`}
                  aria-hidden="true"
                />
                <p className={styles.helperNote}>
                  {copy.dc352}</p>
              </section>
            ) : (
              <div className={styles.stepActions}>
                {activeStep === 0 ? (
                  <Link className="btnSecondary" href={localizePath('/design/start', locale)}>
                    {copy.dc353}</Link>
                ) : (
                  <button className="btnSecondary" onClick={goToPreviousStep} type="button">
                    {copy.dc354}</button>
                )}
                <button className="btn" disabled={!canMoveForward} onClick={goToNextStep} type="button">
                  {copy.dc355}</button>
              </div>
            )}
          </form>

          <aside
            className={`${styles.summaryPanel} ${activeStep === 4 ? styles.reviewSummary : styles.compactSummary}`}
            aria-label={copy.dc356}
          >
            <div className={styles.summaryHeader}>
              <p className={styles.step}>{copy.dc357}</p>
              <h2>{activeStep === 4 ? copy.dc358 : copy[conceptSteps[activeStep].labelKey]}</h2>
            </div>
            <dl className={styles.summaryList}>
              {visibleSummaryItems.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className={styles.requiredNote}>
              {copy.dc359}</p>
            {activeStep === 4 ? (
              <div className={styles.actions}>
                <button className="btnSecondary" onClick={goToPreviousStep} type="button">
                  {copy.dc354}</button>
                <Link className="btnSecondary" href={localizePath('/design/start', locale)}>
                  {copy.dc353}</Link>
                <button className="btn" onClick={continueToBrief} type="button">
                  {copy.dc360}</button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );

  function renderManualReviewFields() {
    return (
      <section className={styles.repeatedStonePanel}>
        <div className={styles.sectionHeading}>
          <h2>{copy.dc361}</h2>
          <p>{manualReviewText}</p>
        </div>
        <div className={styles.compactGrid}>
          <TextField label={copy.dc299} value={customUse} onChange={setCustomUse} />
          <TextField label={copy.dc300} value={customLook} onChange={setCustomLook} />
          <TextField label={copy.dc301} value={customScale} onChange={setCustomScale} />
          <TextField label={copy.dc302} value={customWearable} onChange={setCustomWearable} />
          <TextField label={copy.dc303} value={customSymbol} onChange={setCustomSymbol} />
          <TextField label={copy.dc304} value={customTextPattern} onChange={setCustomTextPattern} />
          <TextField label={copy.dc305} value={stoneDirection} onChange={setStoneDirection} />
          <TextField label={copy.dc286} value={customMetalDirection} onChange={setCustomMetalDirection} />
          <TextField label={copy.dc291} value={referenceDetails} onChange={setReferenceDetails} />
          <TextField label={copy.dc296} value={mustInclude} onChange={setMustInclude} />
          <TextField label={copy.dc297} value={mustAvoid} onChange={setMustAvoid} />
          <TextField label={copy.dc307} value={customPieceNote} onChange={setCustomPieceNote} />
          <TextField label={copy.dc308} value={productionConcernNote} onChange={setProductionConcernNote} />
        </div>
        <section className={`${styles.repeatedStonePanel} ${styles.referencePanel}`}>
          <div className={styles.sectionHeading}>
            <h2>{copy.dc335}</h2>
            <p>
              {copy.dc362}</p>
          </div>
          <label className={styles.referenceUpload}>
            <span>{copy.dc337}</span>
            <input
              accept="image/*"
              multiple
              onChange={(event) => handleReferenceImageChange(event.target.files)}
              type="file"
            />
          </label>
          {referenceImages.length > 0 ? (
            <div className={styles.referencePreviewGrid}>
              {referenceImages.map((image) => (
                <figure className={styles.referencePreview} key={`manual-${image.name}-${image.previewUrl}`}>
                  <img alt="" src={image.previewUrl} />
                  <figcaption>{image.name}</figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <p className={styles.inlineHint}>{copy.dc338}</p>
          )}
          <label className={styles.field}>
            <span>{copy.dc295}</span>
            <textarea
              onChange={(event) => setReferenceNotes(event.target.value)}
              placeholder={copy.dc363}
              value={referenceNotes}
            />
          </label>
          <p className={styles.helperNote}>
            {copy.dc364}</p>
        </section>
      </section>
    );
  }
}

function OptionField({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { dictionary } = useI18n();
  const copy = dictionary.designConcept;
  return (
    <fieldset className={styles.fieldset}>
      <legend>{title}</legend>
      <div className={styles.optionRow}>
        {options.map((option) => (
          <button
            className={`${styles.choiceChip} ${value === option.value ? styles.selectedChip : ''}`}
            key={`${title}-${option.value}`}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {copy[option.labelKey]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <textarea onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}
