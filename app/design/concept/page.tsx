'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, type CSSProperties, useEffect, useMemo, useState } from 'react';
import styles from './concept.module.css';

type StoneLogic = 'none' | 'center_stone' | 'multi_stone' | 'repeated_stone' | 'optional_stone' | 'manual_review' | '';

type Option = {
  label: string;
  value: string;
  description?: string;
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

type StoredConceptBrief = {
  pieceType: string;
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
const manualReviewText = 'This direction may require manual confirmation before CAD, sourcing, or production.';

const pieceTypes: Option[] = [
  { label: 'Ring', value: 'ring' },
  { label: 'Pendant / Necklace', value: 'pendant_necklace' },
  { label: 'Bracelet / Bangle', value: 'bracelet_bangle' },
  { label: 'Earrings', value: 'earrings' },
  { label: 'Other / custom piece', value: 'other_custom' },
];

const pendantBranches: Option[] = [
  { label: 'Pendant only', value: 'pendant_only' },
  { label: 'Pendant with matching chain', value: 'pendant_with_chain' },
  { label: 'Necklace / chain only', value: 'necklace_chain_only' },
  { label: 'Fully custom pendant / necklace', value: 'fully_custom_pendant_necklace' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const ringStructures: Option[] = [
  { label: 'Center-stone ring', value: 'ring_center_stone', stoneLogic: 'center_stone', description: 'A ring focused around one focal stone, pearl, or bead.' },
  { label: 'Multi-stone ring', value: 'ring_multi_stone', stoneLogic: 'multi_stone', description: 'A ring built around several focal stones.' },
  { label: 'Eternity / repeated-stone band', value: 'ring_eternity_band', stoneLogic: 'repeated_stone', description: 'A repeated stone or full eternity band direction.' },
  { label: 'Pave / fully set ring', value: 'ring_pave_full', stoneLogic: 'repeated_stone', description: 'Dense small-stone coverage or a fully set surface.' },
  { label: 'Simple band / wedding band', value: 'ring_simple_band', stoneLogic: 'none', description: 'A clean metal band with no required stone module.' },
  { label: 'Signet / nameplate ring', value: 'ring_signet_nameplate', stoneLogic: 'optional_stone', description: 'A metal-forward ring where stones are optional decoration.' },
  { label: 'Custom ring direction', value: 'ring_custom', stoneLogic: 'manual_review', description: 'A special ring idea NOVORA should review manually.' },
  { label: 'Not sure yet', value: 'not_sure', description: 'Let NOVORA suggest the ring structure.' },
];

const bandWidthDirections: Option[] = [
  { label: 'Slim', value: 'slim' },
  { label: 'Medium', value: 'medium' },
  { label: 'Bold', value: 'bold' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const bandProfileDirections: Option[] = [
  { label: 'Rounded', value: 'rounded' },
  { label: 'Flat', value: 'flat' },
  { label: 'Comfort fit', value: 'comfort_fit' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const engravingDirections: Option[] = [
  { label: 'No engraving', value: 'no_engraving' },
  { label: 'Inside engraving', value: 'inside_engraving' },
  { label: 'Outside engraving', value: 'outside_engraving' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const pendantStructures: Option[] = [
  { label: 'Center-stone pendant', value: 'pendant_center_stone', stoneLogic: 'center_stone', description: 'A pendant focused around one focal stone, pearl, or bead.' },
  { label: 'Multi-stone pendant', value: 'pendant_multi_stone', stoneLogic: 'multi_stone', description: 'A pendant built around several focal stones.' },
  { label: 'Pave / fully set pendant', value: 'pendant_pave_full', stoneLogic: 'repeated_stone', description: 'Dense stone coverage on the pendant surface.' },
  { label: 'Metal-only pendant', value: 'pendant_metal_only', stoneLogic: 'none', description: 'A metal-forward pendant without required stones.' },
  { label: 'Charm / tag / nameplate pendant', value: 'pendant_charm_tag', stoneLogic: 'optional_stone', description: 'A symbolic pendant where stones are optional.' },
  { label: 'Locket / medallion pendant', value: 'pendant_locket_medallion', stoneLogic: 'optional_stone', description: 'A locket or medallion direction with optional stone detail.' },
  { label: 'Custom pendant direction', value: 'pendant_custom', stoneLogic: 'manual_review', description: 'A special pendant idea NOVORA should review manually.' },
  { label: 'Not sure yet', value: 'not_sure', description: 'Let NOVORA suggest the pendant structure.' },
];

const necklaceStructures: Option[] = [
  { label: 'Machine-woven chain', value: 'necklace_machine_woven_chain', stoneLogic: 'none', description: 'A simple chain direction with no required stone module.' },
  { label: 'Station necklace', value: 'necklace_station', description: 'A chain with spaced stations, stones, pearls, beads, or motif details.' },
  { label: 'Tennis necklace', value: 'necklace_tennis', stoneLogic: 'repeated_stone', description: 'A continuous matched-stone necklace direction.' },
  { label: 'Stone-set necklace', value: 'necklace_stone_set', stoneLogic: 'repeated_stone', description: 'A necklace where repeated stones are part of the structure.' },
  { label: 'Full pave necklace', value: 'necklace_full_pave', stoneLogic: 'repeated_stone', description: 'Dense stone coverage across the necklace direction.' },
  { label: 'Custom chain-only direction', value: 'necklace_custom_chain_only', stoneLogic: 'manual_review', description: 'A special chain-only idea NOVORA should review manually.' },
  { label: 'Not sure yet', value: 'not_sure', description: 'Let NOVORA suggest the necklace structure.' },
];

const braceletStructures: Option[] = [
  { label: 'Chain bracelet', value: 'bracelet_chain', stoneLogic: 'none', description: 'A simple chain bracelet direction.' },
  { label: 'Tennis bracelet', value: 'bracelet_tennis', stoneLogic: 'repeated_stone', description: 'A continuous matched-stone bracelet.' },
  { label: 'Bangle', value: 'bracelet_bangle', description: 'A rigid bangle direction with its own stone or metal-only choice.' },
  { label: 'Cuff bracelet', value: 'bracelet_cuff', description: 'A cuff structure with its own stone or metal-only choice.' },
  { label: 'Charm bracelet', value: 'bracelet_charm', description: 'A charm bracelet direction with charm-specific stone choices.' },
  { label: 'ID / nameplate bracelet', value: 'bracelet_id_nameplate', description: 'A bracelet focused on text, plate, symbol, or stone detail.' },
  { label: 'Custom bracelet direction', value: 'bracelet_custom', stoneLogic: 'manual_review', description: 'A special bracelet idea NOVORA should review manually.' },
  { label: 'Not sure yet', value: 'not_sure', description: 'Let NOVORA suggest the bracelet structure.' },
];

const braceletSubStructures: Record<string, Option[]> = {
  bracelet_bangle: [
    { label: 'Metal-only bangle', value: 'bangle_metal_only', stoneLogic: 'none' },
    { label: 'Single/local stone accent', value: 'bangle_local_stone', stoneLogic: 'center_stone' },
    { label: 'Multi-stone bangle', value: 'bangle_multi_stone', stoneLogic: 'multi_stone' },
    { label: 'Pave / fully set bangle', value: 'bangle_pave_full', stoneLogic: 'repeated_stone' },
    { label: 'Custom bangle direction', value: 'bangle_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
  bracelet_cuff: [
    { label: 'Metal-only cuff', value: 'cuff_metal_only', stoneLogic: 'none' },
    { label: 'Single/local stone accent', value: 'cuff_local_stone', stoneLogic: 'center_stone' },
    { label: 'Multi-stone cuff', value: 'cuff_multi_stone', stoneLogic: 'multi_stone' },
    { label: 'Pave / fully set cuff', value: 'cuff_pave_full', stoneLogic: 'repeated_stone' },
    { label: 'Custom cuff direction', value: 'bracelet_cuff_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
  bracelet_charm: [
    { label: 'Metal-only charm bracelet', value: 'charm_metal_only', stoneLogic: 'none' },
    { label: 'Charm with single/local stone', value: 'charm_local_stone', stoneLogic: 'center_stone' },
    { label: 'Multiple stone charms', value: 'charm_multi_stone', stoneLogic: 'multi_stone' },
    { label: 'Pave / stone-set charms', value: 'charm_pave_stone_set', stoneLogic: 'repeated_stone' },
    { label: 'Custom charm bracelet direction', value: 'charm_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
  bracelet_id_nameplate: [
    { label: 'Metal-only nameplate', value: 'nameplate_metal_only', stoneLogic: 'none' },
    { label: 'Nameplate with small stone accents', value: 'nameplate_small_stone_accents', stoneLogic: 'optional_stone' },
    { label: 'Pave / stone-set nameplate', value: 'nameplate_pave_stone_set', stoneLogic: 'repeated_stone' },
    { label: 'Engraved / text-focused', value: 'nameplate_engraved_text', stoneLogic: 'none' },
    { label: 'Custom nameplate bracelet direction', value: 'nameplate_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
};

const earringStructures: Option[] = [
  { label: 'Stud earrings', value: 'earrings_stud', description: 'Compact stud earring direction.' },
  { label: 'Drop / dangle earrings', value: 'earrings_drop', description: 'A hanging or dangle earring direction.' },
  { label: 'Hoop earrings', value: 'earrings_hoop', description: 'Hoop earrings with plain or stone-set options.' },
  { label: 'Huggie earrings', value: 'earrings_huggie', description: 'Small close-fitting hoop earrings.' },
  { label: 'Ear cuff / climber', value: 'earrings_cuff_climber', description: 'Ear cuff or climber direction.' },
  { label: 'Custom earrings direction', value: 'earrings_custom', stoneLogic: 'manual_review', description: 'A special earring idea NOVORA should review manually.' },
  { label: 'Not sure yet', value: 'not_sure', description: 'Let NOVORA suggest the earring structure.' },
];

const earringPairDirections: Option[] = [
  { label: 'Pair', value: 'pair' },
  { label: 'Single earring', value: 'single_earring' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const earringSubStructures: Record<string, Option[]> = {
  earrings_stud: [
    { label: 'Center-stone stud', value: 'stud_center_stone', stoneLogic: 'center_stone' },
    { label: 'Cluster stud', value: 'stud_cluster', stoneLogic: 'multi_stone' },
    { label: 'Pave stud', value: 'stud_pave', stoneLogic: 'repeated_stone' },
    { label: 'Metal-only stud', value: 'stud_metal_only', stoneLogic: 'none' },
    { label: 'Pearl / bead stud', value: 'stud_pearl_bead', stoneLogic: 'center_stone' },
    { label: 'Custom stud direction', value: 'stud_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
  earrings_drop: [
    { label: 'Single-stone drop', value: 'drop_single_stone', stoneLogic: 'center_stone' },
    { label: 'Multi-stone drop', value: 'drop_multi_stone', stoneLogic: 'multi_stone' },
    { label: 'Chain drop', value: 'drop_chain', stoneLogic: 'none' },
    { label: 'Pearl / bead drop', value: 'drop_pearl_bead', stoneLogic: 'center_stone' },
    { label: 'Metal-only drop', value: 'drop_metal_only', stoneLogic: 'none' },
    { label: 'Custom drop direction', value: 'drop_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
  earrings_hoop: [
    { label: 'Plain hoop', value: 'hoop_plain', stoneLogic: 'none' },
    { label: 'Pave hoop', value: 'hoop_pave', stoneLogic: 'repeated_stone' },
    { label: 'Stone charm hoop', value: 'hoop_stone_charm', stoneLogic: 'optional_stone' },
    { label: 'Full stone hoop', value: 'hoop_full_stone', stoneLogic: 'repeated_stone' },
    { label: 'Custom hoop direction', value: 'hoop_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
  earrings_huggie: [
    { label: 'Plain huggie', value: 'huggie_plain', stoneLogic: 'none' },
    { label: 'Pave huggie', value: 'huggie_pave', stoneLogic: 'repeated_stone' },
    { label: 'Stone charm huggie', value: 'huggie_stone_charm', stoneLogic: 'optional_stone' },
    { label: 'Custom huggie direction', value: 'huggie_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
  earrings_cuff_climber: [
    { label: 'Plain ear cuff', value: 'cuff_plain', stoneLogic: 'none' },
    { label: 'Pave ear cuff', value: 'cuff_pave', stoneLogic: 'repeated_stone' },
    { label: 'Ear climber with stones', value: 'climber_with_stones', stoneLogic: 'repeated_stone' },
    { label: 'Custom ear cuff direction', value: 'cuff_custom', stoneLogic: 'manual_review' },
    { label: 'Not sure yet', value: 'not_sure' },
  ],
};

const customPieceStructures: Option[] = [
  { label: 'Brooch / pin', value: 'custom_brooch_pin' },
  { label: 'Cufflinks', value: 'custom_cufflinks' },
  { label: 'Hair jewelry', value: 'custom_hair_jewelry' },
  { label: 'Pet tag / keepsake', value: 'custom_pet_tag_keepsake' },
  { label: 'Keychain / object', value: 'custom_keychain_object' },
  { label: 'Custom symbolic piece', value: 'custom_symbolic_piece' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const chainStyles: Option[] = [
  { label: 'O chain / Cable chain', value: 'o_chain' },
  { label: 'Box chain / Cross chain', value: 'box_chain' },
  { label: 'Curb chain', value: 'curb_chain' },
  { label: 'Water wave chain', value: 'water_wave_chain' },
  { label: 'Not sure yet', value: 'not_sure' },
  { label: 'Special request / manual confirmation', value: 'special_request' },
];

const chainThicknesses: Option[] = [
  { label: '0.25 mm - ultra fine', value: '0.25_mm_ultra_fine' },
  { label: '0.30 mm - fine', value: '0.30_mm_fine' },
  { label: '0.40 mm - standard light', value: '0.40_mm_standard_light' },
  { label: '0.45 mm - standard', value: '0.45_mm_standard' },
  { label: '0.55 mm - stronger', value: '0.55_mm_stronger' },
  { label: 'Not sure yet', value: 'not_sure' },
  { label: 'Special request / manual confirmation', value: 'special_request' },
];

const chainLengths: Option[] = [
  { label: '16 inch', value: '16_inch' },
  { label: '18 inch', value: '18_inch' },
  { label: '20 inch', value: '20_inch' },
  { label: '22 inch', value: '22_inch' },
  { label: 'Not sure yet', value: 'not_sure' },
  { label: 'Special request / manual confirmation', value: 'special_request' },
];

const styleDirections: Option[] = [
  { label: 'Minimal', value: 'minimal' },
  { label: 'Classic', value: 'classic' },
  { label: 'Romantic', value: 'romantic' },
  { label: 'Vintage', value: 'vintage' },
  { label: 'Modern', value: 'modern' },
  { label: 'Bold', value: 'bold' },
  { label: 'Cute / playful', value: 'cute_playful' },
  { label: 'Organic / floral', value: 'organic_floral' },
  { label: 'Gothic / dark', value: 'gothic_dark' },
  { label: 'Luxury', value: 'luxury' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const metalOptions: Option[] = [
  { label: '925 Sterling Silver', value: '925_sterling_silver' },
  { label: '14K Gold', value: '14k_gold' },
  { label: '18K Gold', value: '18k_gold' },
  { label: 'Platinum', value: 'platinum' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const finishOptions: Option[] = [
  { label: 'High polish', value: 'high_polish' },
  { label: 'Matte / satin', value: 'matte_satin' },
  { label: 'Brushed', value: 'brushed' },
  { label: 'Hammered / textured', value: 'hammered_textured' },
  { label: 'Two-tone', value: 'two_tone' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const stoneTypes: Option[] = [
  { label: 'Lab diamond', value: 'lab_diamond' },
  { label: 'Natural diamond', value: 'natural_diamond' },
  { label: 'Lab-grown colored gemstone', value: 'lab_grown_colored_gemstone' },
  { label: 'Natural colored gemstone', value: 'natural_colored_gemstone' },
  { label: 'Moissanite', value: 'moissanite' },
  { label: 'Pearl', value: 'pearl' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const multiStoneTypeMixes: Option[] = [
  ...stoneTypes.slice(0, -1),
  { label: 'Mixed stones', value: 'mixed_stones' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const stoneColors: Option[] = [
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Pink', value: 'pink' },
  { label: 'Red', value: 'red' },
  { label: 'Purple', value: 'purple' },
  { label: 'Yellow', value: 'yellow' },
  { label: 'White / colorless', value: 'white_colorless' },
  { label: 'Black', value: 'black' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const cutOptions: Option[] = [
  { label: 'Round', value: 'round' },
  { label: 'Oval', value: 'oval' },
  { label: 'Pear', value: 'pear' },
  { label: 'Emerald', value: 'emerald' },
  { label: 'Cushion', value: 'cushion' },
  { label: 'Marquise', value: 'marquise' },
  { label: 'Heart', value: 'heart' },
  { label: 'Other fancy cut', value: 'other_fancy_cut' },
  { label: 'Custom', value: 'custom' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const multiStoneShapeMixes: Option[] = [
  { label: 'Same shape', value: 'same_shape' },
  { label: 'Mixed shapes', value: 'mixed_shapes' },
  ...cutOptions.slice(0, -1),
  { label: 'Not sure yet', value: 'not_sure' },
];

const multiStoneSizeRelationships: Option[] = [
  { label: 'Same size stones', value: 'same_size_stones' },
  { label: 'Center larger with smaller side stones', value: 'center_larger_side_stones' },
  { label: 'Graduated sizes', value: 'graduated_sizes' },
  { label: 'Mixed sizes', value: 'mixed_sizes' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const repeatedStoneCoverages: Option[] = [
  { label: 'Full coverage / full eternity', value: 'full_coverage' },
  { label: 'Half coverage', value: 'half_coverage' },
  { label: 'Front-facing only', value: 'front_facing' },
  { label: 'Scattered', value: 'scattered' },
  { label: 'Custom', value: 'custom' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const repeatedStoneFeelings: Option[] = [
  { label: 'Minimal', value: 'minimal' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Dense', value: 'dense' },
  { label: 'Fully paved', value: 'fully_paved' },
  { label: 'Statement', value: 'statement' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const repeatedStoneSizes: Option[] = [
  { label: 'Very small melee stones', value: 'melee' },
  { label: 'Small repeated stones', value: 'small' },
  { label: 'Medium matched stones', value: 'medium' },
  { label: 'Graduated sizes', value: 'graduated' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const repeatedSettingStyles: Option[] = [
  { label: 'Pave', value: 'pave' },
  { label: 'Micro pave', value: 'micro_pave' },
  { label: 'Prong set', value: 'prong' },
  { label: 'Shared prong', value: 'shared_prong' },
  { label: 'Channel set', value: 'channel' },
  { label: 'Bezel set', value: 'bezel' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const stationTypes: Option[] = [
  { label: 'Small stone stations', value: 'small_stone_stations' },
  { label: 'Pearl / bead stations', value: 'pearl_bead_stations' },
  { label: 'Metal motif stations', value: 'metal_motif_stations' },
  { label: 'Mixed stations', value: 'mixed_stations' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const stationSpacings: Option[] = [
  { label: 'Even spacing', value: 'even_spacing' },
  { label: 'Front-focused stations', value: 'front_focused_stations' },
  { label: 'Scattered stations', value: 'scattered_stations' },
  { label: 'Graduated spacing', value: 'graduated_spacing' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const stationDetailSizes: Option[] = [
  { label: 'Very small accents', value: 'very_small_accents' },
  { label: 'Small visible stations', value: 'small_visible_stations' },
  { label: 'Mixed sizes', value: 'mixed_sizes' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const stationSettings: Option[] = [
  { label: 'Bezel set', value: 'bezel_set' },
  { label: 'Prong set', value: 'prong_set' },
  { label: 'Wire connected', value: 'wire_connected' },
  { label: 'Fixed onto chain', value: 'fixed_onto_chain' },
  { label: 'Not sure yet', value: 'not_sure' },
];

const conceptSteps = [
  { label: 'Piece direction', backgroundSrc: '/assets/design/concept/backgrounds/gemstone-color-sketch-bg.png', visualClass: 'visualBasics' },
  { label: 'Stone logic', backgroundSrc: '/assets/design/concept/backgrounds/stone-cut-sketch-bg.png', visualClass: 'visualShape' },
  { label: 'AI sketch details', backgroundSrc: '/assets/design/concept/backgrounds/accent-stones-sketch-bg.png', visualClass: 'visualAccent' },
  { label: 'Metal & wearability', backgroundSrc: '/assets/design/concept/backgrounds/metal-finish-sketch-bg.png', visualClass: 'visualMetal' },
  { label: 'Review brief', backgroundSrc: '/assets/design/concept/backgrounds/concept-board-sketch-bg.png', visualClass: 'visualReview' },
];

const pieceTypeAliases: Record<string, string> = {
  other: 'other_custom',
  other_custom: 'other_custom',
  chain: 'pendant_necklace',
  not_sure: '',
};

function optionLabel(options: Option[], value: string) {
  return options.find((option) => option.value === value)?.label || '';
}

function findOption(value: string, groups: Option[][]) {
  return groups.flat().find((option) => option.value === value);
}

function isOpen(value: string) {
  return !value || value === 'not_sure';
}

function addItem(items: SummaryItem[], label: string, value: string | undefined) {
  if (value && value.trim() && value !== 'Not sure yet') {
    items.push({ label, value });
  }
}

function addRequiredItem(items: SummaryItem[], label: string, value: string | undefined) {
  if (value && value.trim()) {
    items.push({ label, value });
  }
}

export default function DesignConceptPage() {
  return (
    <Suspense fallback={<main className={styles.pageBackground} />}>
      <DesignConceptIntake />
    </Suspense>
  );
}

function DesignConceptIntake() {
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

    if (!rawPieceType) {
      return;
    }

    const mappedPieceType = pieceTypeAliases[rawPieceType] ?? rawPieceType;

    if (mappedPieceType && pieceTypes.some((option) => option.value === mappedPieceType)) {
      handlePieceTypeChange(mappedPieceType);

      if (rawPieceType === 'chain') {
        setBranch('necklace_chain_only');
        setStructure('necklace_machine_woven_chain');
      }
    }
  }, [searchParams]);

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
      return [{ label: 'Piece type', value: 'Choose a category to begin.' }];
    }

    addItem(items, 'Piece type', selectedPieceLabel);

    if (isPendantNecklace) {
      addItem(items, 'Branch', optionLabel(pendantBranches, branch));
    }

    addItem(items, 'Structure', optionLabel(currentStructureOptions, structure));

    if (pieceType === 'earrings') {
      addItem(items, 'Pair direction', optionLabel(earringPairDirections, earringPairDirection));
      addItem(items, 'Sub-structure', optionLabel(currentSubStructureOptions, subStructure));
    }

    if (isBraceletBangle && subStructure) {
      const braceletDirectionLabel =
        structure === 'bracelet_bangle'
          ? 'Bangle stone direction'
          : structure === 'bracelet_cuff'
            ? 'Cuff stone direction'
            : structure === 'bracelet_charm'
              ? 'Charm bracelet direction'
              : structure === 'bracelet_id_nameplate'
                ? 'Nameplate bracelet direction'
                : 'Bracelet direction';
      addRequiredItem(items, braceletDirectionLabel, optionLabel(currentSubStructureOptions, subStructure));
    }

    if (stoneLogic) {
      addItem(items, 'Stone logic', stoneLogic.replace('_', ' '));
    }

    if (needsFocalStone) {
      addRequiredItem(items, 'Focal stone / pearl / bead type', optionLabel(stoneTypes, focalStoneType));
      addRequiredItem(items, 'Color direction', optionLabel(stoneColors, focalStoneColor));
      addRequiredItem(items, 'Shape / cut direction', optionLabel(cutOptions, focalStoneShape));
      addRequiredItem(items, 'Approximate focal size', focalStoneSize.trim() || 'Not sure yet');
    }

    if (needsMultiStone) {
      addRequiredItem(items, 'Stone type / stone mix', optionLabel(multiStoneTypeMixes, multiStoneTypeMix));
      addRequiredItem(items, 'Color direction', optionLabel(stoneColors, focalStoneColor));
      addRequiredItem(items, 'Shape / cut mix', optionLabel(multiStoneShapeMixes, multiStoneShapeMix));
      addRequiredItem(
        items,
        'Stone size relationship',
        optionLabel(multiStoneSizeRelationships, multiStoneSizeRelationship),
      );
      addRequiredItem(items, 'Multi-stone layout direction', multiStoneLayout.trim() || 'Not sure yet');
    }

    if (needsRepeatedStone) {
      addRequiredItem(items, 'Stone coverage', optionLabel(repeatedStoneCoverages, repeatedStoneCoverage));
      addRequiredItem(items, 'Repetition feeling', optionLabel(repeatedStoneFeelings, repeatedStoneFeeling));
      addRequiredItem(items, 'Repeated stone size', optionLabel(repeatedStoneSizes, repeatedStoneSize));
      addRequiredItem(items, 'Setting style', optionLabel(repeatedSettingStyles, repeatedSettingStyle));
      addRequiredItem(items, 'Repeated-stone direction note', stoneDirection.trim() || 'Not sure yet');
    }

    if (isStationNecklace) {
      addRequiredItem(items, 'Station type', optionLabel(stationTypes, stationType));
      addRequiredItem(items, 'Station spacing direction', optionLabel(stationSpacings, stationSpacing));
      addRequiredItem(items, 'Station stone / detail size', optionLabel(stationDetailSizes, stationDetailSize));
      addRequiredItem(items, 'Station setting / connection direction', optionLabel(stationSettings, stationSetting));
      addRequiredItem(items, 'Station necklace note', stationNote.trim() || 'Not sure yet');
    }

    if (needsOptionalStone) {
      addItem(items, 'Optional stone direction', optionalStoneDirection);
    }

    if (isChainBracelet) {
      addRequiredItem(items, 'Chain bracelet structure note', braceletStructureNote.trim() || 'Not sure yet');
    }

    if (showChainFields) {
      addRequiredItem(items, 'Chain style', optionLabel(chainStyles, chainStyle));
      addRequiredItem(items, 'Chain thickness / wire profile', optionLabel(chainThicknesses, chainThickness));
      addRequiredItem(items, 'Chain length', optionLabel(chainLengths, chainLength));
      addRequiredItem(items, 'Chain note', chainNote.trim() || 'Not sure yet');

      if (manualChainConfirmationRequired) {
        addItem(items, 'Manual chain confirmation required', 'Yes');
      }
    }

    addItem(items, 'Visual focus', visualFocus);
    addItem(items, 'Style direction', optionLabel(styleDirections, styleDirection));
    addItem(items, 'Silhouette', silhouette);
    addItem(items, 'Size / scale direction', sizeDirection);
    if (isSimpleBand) {
      addRequiredItem(items, 'Band width direction', optionLabel(bandWidthDirections, bandWidthDirection));
      addRequiredItem(items, 'Band profile direction', optionLabel(bandProfileDirections, bandProfileDirection));
      addRequiredItem(items, 'Engraving direction', optionLabel(engravingDirections, engravingDirection));
    }
    addItem(items, 'Metal direction', optionLabel(metalOptions, metalDirection));
    addItem(items, 'Finish direction', optionLabel(finishOptions, finishDirection));
    addItem(items, 'Wearability', wearability);
    addItem(items, 'Personalization', personalization);
    addItem(items, 'Emotional story', emotionalStory);
    addItem(items, 'Reference details', referenceDetails);
    addRequiredItem(items, 'Reference images', `${referenceImages.length} file(s) selected`);
    if (referenceImageNames.length > 0) {
      addRequiredItem(items, 'Reference image names', referenceImageNames.join(', '));
    }
    addRequiredItem(items, 'Reference notes', referenceNotes.trim() || 'Not sure yet');
    addItem(items, 'Must include', mustInclude);
    addItem(items, 'Must avoid', mustAvoid);

    if (needsManualReview || isOtherCustom) {
      addItem(items, 'Manual confirmation', manualReviewText);
      addItem(items, 'What is this piece used for?', customUse);
      addItem(items, 'What should it look like?', customLook);
      addItem(items, 'Approximate size / scale', customScale);
      addItem(items, 'Wearable or keepsake?', customWearable);
      addItem(items, 'Main visual symbol', customSymbol);
      addItem(items, 'Text / logo / pattern', customTextPattern);
      addItem(items, 'Stone direction', stoneDirection);
      addItem(items, 'Metal direction note', customMetalDirection);
      addItem(items, 'Custom piece note', customPieceNote);
      addItem(items, 'Production concern note', productionConcernNote);
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
        'This is a hand-drawn concept sketch brief only and should not be treated as CAD-ready production confirmation.',
      summaryItems,
    };

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(conceptBrief));
    router.push('/design/brief');
  }

  return (
    <main className={styles.pageBackground} style={pageStyle}>
      <div className={styles.pageShell}>
        <header className={styles.intro}>
          <p className={styles.step}>Design concept intake</p>
          <h1>Build the AI sketch brief</h1>
          <p>
            This intake collects visual design direction for an AI hand-drawn concept sketch. It is not a CAD order,
            pricing form, or production confirmation.
          </p>
        </header>

        {pieceType ? (
          <nav className={styles.progressNav} aria-label="Concept intake progress">
            {conceptSteps.map((step, index) => (
              <button
                className={`${styles.progressStep} ${activeStep === index ? styles.activeProgressStep : ''}`}
                key={step.label}
                onClick={() => setActiveStep(index)}
                type="button"
              >
                <span>{index + 1}</span>
                {step.label}
              </button>
            ))}
          </nav>
        ) : null}

        <div className={`${styles.layout} ${activeStep === 4 ? styles.reviewLayout : ''}`}>
          <form className={styles.form}>
            {activeStep === 0 ? (
              <section className={`${styles.panel} ${styles.stepPanel}`}>
                <div className={styles.sectionHeading}>
                  <h2>{pieceType ? 'Piece direction' : 'Piece type'}</h2>
                  <p>Choose one logical layer at a time so NOVORA can prepare a clean concept sketch brief.</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[0].visualClass]}`}
                  aria-hidden="true"
                />

                {!pieceType ? (
                  <fieldset className={styles.fieldset}>
                    <legend>Piece type</legend>
                    <div className={styles.optionRow}>
                      {pieceTypes.map((option) => (
                        <button
                          className={`${styles.choiceChip} ${pieceType === option.value ? styles.selectedChip : ''}`}
                          key={option.value}
                          onClick={() => handlePieceTypeChange(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : (
                  <div className={styles.lockedPieceType}>
                    <div>
                      <span>Piece type</span>
                      <strong>{selectedPieceLabel}</strong>
                    </div>
                    <Link href="/design/start">Change piece type</Link>
                  </div>
                )}

                {!pieceType ? (
                  <p className={styles.helperNote}>
                    Select the jewelry category first. Chain-only directions live under Pendant / Necklace.
                  </p>
                ) : null}

                {isPendantNecklace ? (
                  <fieldset className={styles.fieldset}>
                    <legend>Pendant / necklace branch</legend>
                    <div className={styles.optionRow}>
                      {pendantBranches.map((option) => (
                        <button
                          className={`${styles.choiceChip} ${branch === option.value ? styles.selectedChip : ''}`}
                          key={option.value}
                          onClick={() => handleBranchChange(option.value)}
                          type="button"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {pieceType && currentStructureOptions.length > 0 && branch !== 'fully_custom_pendant_necklace' ? (
                  <fieldset className={styles.fieldset}>
                    <legend>{isOtherCustom ? 'Custom piece type' : 'Structure'}</legend>
                    <div className={styles.structureGrid}>
                      {currentStructureOptions.map((option) => (
                        <button
                          className={`${styles.structureCard} ${structure === option.value ? styles.selectedCard : ''}`}
                          key={`${pieceType}-${branch || 'base'}-${option.value}`}
                          onClick={() => handleStructureChange(option.value)}
                          type="button"
                        >
                          <span>{option.label}</span>
                          {option.description ? <small>{option.description}</small> : null}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {pieceType === 'earrings' && structure && structure !== 'not_sure' && structure !== 'earrings_custom' ? (
                  <>
                    <fieldset className={styles.fieldset}>
                      <legend>Pair direction</legend>
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
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {currentSubStructureOptions.length > 0 ? (
                      <fieldset className={styles.fieldset}>
                        <legend>Compatible sub-structure</legend>
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
                              <span>{option.label}</span>
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
                        ? 'Bangle stone direction'
                        : structure === 'bracelet_cuff'
                          ? 'Cuff stone direction'
                          : structure === 'bracelet_charm'
                            ? 'Charm bracelet direction'
                            : structure === 'bracelet_id_nameplate'
                              ? 'Nameplate bracelet direction'
                              : 'Bracelet direction'}
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
                          <span>{option.label}</span>
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
                  <h2>Stone logic</h2>
                  <p>
                    Current logic: {stoneLogic ? stoneLogic.replace('_', ' ') : 'guidance only'}. Irrelevant stone
                    modules stay hidden.
                  </p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[1].visualClass]}`}
                  aria-hidden="true"
                />

                {!showStoneStep ? (
                  <p className={styles.helperNote}>
                    No required stone module is needed for the selected direction. NOVORA can still use visual notes,
                    metal, finish, and wearability details for the sketch.
                  </p>
                ) : null}

                {isChainBracelet ? (
                  <label className={styles.field}>
                    <span>Chain bracelet structure note</span>
                    <textarea
                      onChange={(event) => setBraceletStructureNote(event.target.value)}
                      placeholder="Example: delicate chain bracelet, ID chain style, charm-ready chain, or no stones."
                      value={braceletStructureNote}
                    />
                  </label>
                ) : null}

                {needsFocalStone ? (
                  <div className={styles.compactGrid}>
                    <OptionField title="Focal stone / pearl / bead type" options={stoneTypes} value={focalStoneType} onChange={setFocalStoneType} />
                    <OptionField title="Color direction" options={stoneColors} value={focalStoneColor} onChange={setFocalStoneColor} />
                    <OptionField title="Shape / cut direction" options={cutOptions} value={focalStoneShape} onChange={setFocalStoneShape} />
                    <label className={styles.field}>
                      <span>Approximate focal size</span>
                      <input
                        onChange={(event) => setFocalStoneSize(event.target.value)}
                        placeholder="Example: 8 x 6 mm, 1.5 ct, or NOVORA can suggest"
                        value={focalStoneSize}
                      />
                    </label>
                  </div>
                ) : null}

                {needsMultiStone ? (
                  <>
                    <div className={styles.compactGrid}>
                      <OptionField title="Stone type / stone mix" options={multiStoneTypeMixes} value={multiStoneTypeMix} onChange={setMultiStoneTypeMix} />
                      <OptionField title="Color direction" options={stoneColors} value={focalStoneColor} onChange={setFocalStoneColor} />
                      <OptionField title="Shape / cut mix" options={multiStoneShapeMixes} value={multiStoneShapeMix} onChange={setMultiStoneShapeMix} />
                      <OptionField
                        title="Stone size relationship"
                        options={multiStoneSizeRelationships}
                        value={multiStoneSizeRelationship}
                        onChange={setMultiStoneSizeRelationship}
                      />
                    </div>
                    <label className={styles.field}>
                      <span>Multi-stone layout direction</span>
                      <textarea
                        onChange={(event) => setMultiStoneLayout(event.target.value)}
                        placeholder="Example: three-stone ring, toi et moi layout, five-stone band, asymmetrical cluster, or scattered stones."
                        value={multiStoneLayout}
                      />
                    </label>
                  </>
                ) : null}

                {needsRepeatedStone ? (
                  <div className={styles.compactGrid}>
                    <OptionField title="Stone coverage" options={repeatedStoneCoverages} value={repeatedStoneCoverage} onChange={setRepeatedStoneCoverage} />
                    <OptionField title="Repetition feeling" options={repeatedStoneFeelings} value={repeatedStoneFeeling} onChange={setRepeatedStoneFeeling} />
                    <OptionField title="Repeated stone size" options={repeatedStoneSizes} value={repeatedStoneSize} onChange={setRepeatedStoneSize} />
                    <OptionField title="Setting style" options={repeatedSettingStyles} value={repeatedSettingStyle} onChange={setRepeatedSettingStyle} />
                  </div>
                ) : null}

                {needsRepeatedStone ? (
                  <label className={styles.field}>
                    <span>Repeated-stone direction note</span>
                    <textarea
                      onChange={(event) => setStoneDirection(event.target.value)}
                      placeholder="Example: emerald-cut full eternity band, matched-stone tennis necklace, or dense small diamond surface."
                      value={stoneDirection}
                    />
                  </label>
                ) : null}

                {isStationNecklace ? (
                  <section className={styles.repeatedStonePanel}>
                    <div className={styles.sectionHeading}>
                      <h2>Station necklace direction</h2>
                      <p>Station necklaces use spaced details along a chain, so they need station-specific sketch guidance.</p>
                    </div>
                    <div className={styles.compactGrid}>
                      <OptionField title="Station type" options={stationTypes} value={stationType} onChange={setStationType} />
                      <OptionField title="Station spacing direction" options={stationSpacings} value={stationSpacing} onChange={setStationSpacing} />
                      <OptionField title="Station stone / detail size" options={stationDetailSizes} value={stationDetailSize} onChange={setStationDetailSize} />
                      <OptionField title="Station setting / connection direction" options={stationSettings} value={stationSetting} onChange={setStationSetting} />
                    </div>
                    <label className={styles.field}>
                      <span>Station necklace note</span>
                      <textarea
                        onChange={(event) => setStationNote(event.target.value)}
                        placeholder="Example: small diamond stations spaced along a fine chain, pearl stations near the front, or mixed gemstone stations."
                        value={stationNote}
                      />
                    </label>
                  </section>
                ) : null}

                {needsOptionalStone ? (
                  <label className={styles.field}>
                    <span>Optional stone direction</span>
                    <textarea
                      onChange={(event) => setOptionalStoneDirection(event.target.value)}
                      placeholder="Example: tiny birthstone accent, small flush-set diamond, or no stones if the metal shape is stronger."
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
                  <h2>AI sketch fields</h2>
                  <p>These fields guide the hand-drawn concept sketch, not CAD or production pricing.</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[2].visualClass]}`}
                  aria-hidden="true"
                />
                <OptionField title="Style direction" options={styleDirections} value={styleDirection} onChange={setStyleDirection} />
                <label className={styles.field}>
                  <span>Visual focus</span>
                  <textarea onChange={(event) => setVisualFocus(event.target.value)} value={visualFocus} />
                </label>
                <label className={styles.field}>
                  <span>Silhouette</span>
                  <textarea onChange={(event) => setSilhouette(event.target.value)} value={silhouette} />
                </label>
                <label className={styles.field}>
                  <span>Size direction</span>
                  <textarea onChange={(event) => setSizeDirection(event.target.value)} value={sizeDirection} />
                </label>
                <label className={styles.field}>
                  <span>Reference details</span>
                  <textarea onChange={(event) => setReferenceDetails(event.target.value)} value={referenceDetails} />
                </label>

                <section className={`${styles.repeatedStonePanel} ${styles.referencePanel}`}>
                  <div className={styles.sectionHeading}>
                    <h2>Reference images (planning only)</h2>
                    <p>
                      Add sketches, inspiration photos, product photos, or finished-piece references to organize the
                      concept preview. These planning files are not saved as final uploads; attach final reference
                      images again on the brief submission page.
                    </p>
                  </div>
                  <label className={styles.referenceUpload}>
                    <span>Choose planning image files</span>
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
                    <p className={styles.inlineHint}>No reference images selected yet.</p>
                  )}
                  <label className={styles.field}>
                    <span>Reference notes</span>
                    <textarea
                      onChange={(event) => setReferenceNotes(event.target.value)}
                      placeholder="Example: Use the shape from image 1, the stone layout from image 2, and avoid the thick band in image 3."
                      value={referenceNotes}
                    />
                  </label>
                  <p className={styles.helperNote}>
                    Planning references here help shape the AI hand-drawn concept sketch direction only. Only files
                    selected on the final brief page are saved for admin review.
                  </p>
                </section>
              </section>
            ) : null}

            {activeStep === 3 ? (
              <section className={styles.selectorGroup}>
                <div className={styles.sectionHeading}>
                  <h2>Metal, finish & wearability</h2>
                  <p>Metal choices guide sketch and early quote direction only. Final feasibility is confirmed later.</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[3].visualClass]}`}
                  aria-hidden="true"
                />
                <div className={styles.compactGrid}>
                  <OptionField title="Metal" options={metalOptions} value={metalDirection} onChange={setMetalDirection} />
                  <OptionField title="Finish" options={finishOptions} value={finishDirection} onChange={setFinishDirection} />
                </div>

                {isSimpleBand ? (
                  <section className={styles.repeatedStonePanel}>
                    <div className={styles.sectionHeading}>
                      <h2>Simple band structure</h2>
                      <p>Capture the band shape for the AI hand-drawn sketch without adding a stone module.</p>
                    </div>
                    <div className={styles.compactGrid}>
                      <OptionField
                        title="Band width direction"
                        options={bandWidthDirections}
                        value={bandWidthDirection}
                        onChange={setBandWidthDirection}
                      />
                      <OptionField
                        title="Band profile direction"
                        options={bandProfileDirections}
                        value={bandProfileDirection}
                        onChange={setBandProfileDirection}
                      />
                      <OptionField
                        title="Engraving direction"
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
                      <h2>Chain fields</h2>
                      <p>Simple machine-woven chain guidance only. Special requests require manual confirmation.</p>
                    </div>
                    <div className={styles.compactGrid}>
                      <OptionField title="Chain style" options={chainStyles} value={chainStyle} onChange={setChainStyle} />
                      <OptionField title="Chain thickness / wire profile" options={chainThicknesses} value={chainThickness} onChange={setChainThickness} />
                      <OptionField title="Chain length" options={chainLengths} value={chainLength} onChange={setChainLength} />
                    </div>
                    {manualChainConfirmationRequired ? (
                      <p className={styles.helperNote}>
                        Special chain requests require manual confirmation. NOVORA will review China-market
                        availability, chain strength, matching clasp, length, weight, and production feasibility before
                        confirming the next step.
                      </p>
                    ) : null}
                    <label className={styles.field}>
                      <span>Chain note</span>
                      <textarea
                        onChange={(event) => setChainNote(event.target.value)}
                        placeholder="Example: I want a 0.30 mm O chain for a small pendant, or I need NOVORA to confirm a special chain request."
                        value={chainNote}
                      />
                    </label>
                  </section>
                ) : null}

                <label className={styles.field}>
                  <span>Wearability</span>
                  <textarea onChange={(event) => setWearability(event.target.value)} value={wearability} />
                </label>
                <label className={styles.field}>
                  <span>Personalization</span>
                  <textarea onChange={(event) => setPersonalization(event.target.value)} value={personalization} />
                </label>
                <label className={styles.field}>
                  <span>Emotional story</span>
                  <textarea onChange={(event) => setEmotionalStory(event.target.value)} value={emotionalStory} />
                </label>
                <label className={styles.field}>
                  <span>Must include</span>
                  <textarea onChange={(event) => setMustInclude(event.target.value)} value={mustInclude} />
                </label>
                <label className={styles.field}>
                  <span>Must avoid</span>
                  <textarea onChange={(event) => setMustAvoid(event.target.value)} value={mustAvoid} />
                </label>
              </section>
            ) : null}

            {activeStep === 4 ? (
              <section className={`${styles.selectorGroup} ${styles.reviewIntro}`}>
                <div className={styles.sectionHeading}>
                  <h2>Review brief</h2>
                  <p>Confirm the applicable concept direction before continuing to the AI sketch brief.</p>
                </div>
                <div
                  className={`${styles.stepVisual} ${styles[conceptSteps[4].visualClass]}`}
                  aria-hidden="true"
                />
                <p className={styles.helperNote}>
                  This brief prepares your AI hand-drawn concept sketch direction. Professional CAD is a separate paid
                  step, and final production feasibility, material cost, stone availability, and setting details are
                  confirmed later.
                </p>
              </section>
            ) : (
              <div className={styles.stepActions}>
                {activeStep === 0 ? (
                  <Link className="btnSecondary" href="/design/start">
                    Back to /design/start
                  </Link>
                ) : (
                  <button className="btnSecondary" onClick={goToPreviousStep} type="button">
                    Back
                  </button>
                )}
                <button className="btn" disabled={!canMoveForward} onClick={goToNextStep} type="button">
                  Next
                </button>
              </div>
            )}
          </form>

          <aside
            className={`${styles.summaryPanel} ${activeStep === 4 ? styles.reviewSummary : styles.compactSummary}`}
            aria-label="Brief summary"
          >
            <div className={styles.summaryHeader}>
              <p className={styles.step}>Brief Summary</p>
              <h2>{activeStep === 4 ? 'Applicable concept direction' : conceptSteps[activeStep].label}</h2>
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
              This step prepares your AI hand-drawn concept sketch brief. Professional CAD is a separate paid step after
              the design direction is confirmed.
            </p>
            {activeStep === 4 ? (
              <div className={styles.actions}>
                <button className="btnSecondary" onClick={goToPreviousStep} type="button">
                  Back
                </button>
                <Link className="btnSecondary" href="/design/start">
                  Back to /design/start
                </Link>
                <button className="btn" onClick={continueToBrief} type="button">
                  Continue to next concept step
                </button>
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
          <h2>Custom visual review</h2>
          <p>{manualReviewText}</p>
        </div>
        <div className={styles.compactGrid}>
          <TextField label="What is this piece used for?" value={customUse} onChange={setCustomUse} />
          <TextField label="What should it look like?" value={customLook} onChange={setCustomLook} />
          <TextField label="Approximate size / scale" value={customScale} onChange={setCustomScale} />
          <TextField label="Wearable or keepsake?" value={customWearable} onChange={setCustomWearable} />
          <TextField label="Main visual symbol" value={customSymbol} onChange={setCustomSymbol} />
          <TextField label="Text / logo / pattern" value={customTextPattern} onChange={setCustomTextPattern} />
          <TextField label="Stone direction" value={stoneDirection} onChange={setStoneDirection} />
          <TextField label="Metal direction" value={customMetalDirection} onChange={setCustomMetalDirection} />
          <TextField label="Reference details" value={referenceDetails} onChange={setReferenceDetails} />
          <TextField label="Must include" value={mustInclude} onChange={setMustInclude} />
          <TextField label="Must avoid" value={mustAvoid} onChange={setMustAvoid} />
          <TextField label="Custom piece note" value={customPieceNote} onChange={setCustomPieceNote} />
          <TextField label="Production concern note" value={productionConcernNote} onChange={setProductionConcernNote} />
        </div>
        <section className={`${styles.repeatedStonePanel} ${styles.referencePanel}`}>
          <div className={styles.sectionHeading}>
            <h2>Reference images (planning only)</h2>
            <p>
              Add sketches, inspiration photos, product photos, finished-piece references, logos, symbols, or proportion
              references to organize this custom request. These planning files are not saved as final uploads; attach
              final reference images again on the brief submission page.
            </p>
          </div>
          <label className={styles.referenceUpload}>
            <span>Choose planning image files</span>
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
            <p className={styles.inlineHint}>No reference images selected yet.</p>
          )}
          <label className={styles.field}>
            <span>Reference notes</span>
            <textarea
              onChange={(event) => setReferenceNotes(event.target.value)}
              placeholder="Example: use the outline from image 1, the clasp idea from image 2, and the engraving style from image 3."
              value={referenceNotes}
            />
          </label>
          <p className={styles.helperNote}>
            Planning references guide the AI hand-drawn concept sketch direction only. Only files selected on the final
            brief page are saved for admin review; CAD and production feasibility are confirmed later.
          </p>
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
            {option.label}
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
