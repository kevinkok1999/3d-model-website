import { displayLabel } from './labels.js';

/**
 * Coarse navigation proposals for the pinned Open Anatomy 3D catalog.
 * These regions are based on source labels, not verified mesh geometry or
 * a scientific ontology. They are list filters, not anatomical claims.
 * An overlapping source concept appears in each relevant region and in the
 * multi-region filter; it remains a single record, never a duplicate mesh.
 * Source revision: c050aa7b1bc56ceed668199b01ea017341928d7b
 * https://github.com/MervinR07/open-anatomy-3d/blob/c050aa7b1bc56ceed668199b01ea017341928d7b/packages/open-anatomy-3d/catalog.json
 */
export const REGIONS = Object.freeze(['head-neck', 'trunk', 'upper-limb', 'lower-limb', 'multi-region']);

export const REGION_LABELS = Object.freeze({
  nl: Object.freeze({
    all: 'Alle regio’s',
    'head-neck': 'Hoofd en hals',
    trunk: 'Romp',
    'upper-limb': 'Bovenste ledematen',
    'lower-limb': 'Onderste ledematen',
    'multi-region': 'Meerdere regio’s',
  }),
  en: Object.freeze({
    all: 'All regions',
    'head-neck': 'Head and neck',
    trunk: 'Trunk',
    'upper-limb': 'Upper limbs',
    'lower-limb': 'Lower limbs',
    'multi-region': 'Multiple regions',
  }),
});

const HEAD = Object.freeze(['head-neck']);
const TRUNK = Object.freeze(['trunk']);
const UPPER = Object.freeze(['upper-limb']);
const LOWER = Object.freeze(['lower-limb']);
const HEAD_TRUNK = Object.freeze(['head-neck', 'trunk', 'multi-region']);
const TRUNK_UPPER = Object.freeze(['trunk', 'upper-limb', 'multi-region']);
const TRUNK_LOWER = Object.freeze(['trunk', 'lower-limb', 'multi-region']);
const HEAD_TRUNK_UPPER = Object.freeze(['head-neck', 'trunk', 'upper-limb', 'multi-region']);

/** Explicit proposals only: a new source key requires a mapping decision. */
export const REGION_BY_KEY = Object.freeze({
  ankle_l: LOWER,
  ankle_r: LOWER,
  elbow_l: UPPER,
  elbow_r: UPPER,
  hip_l: TRUNK_LOWER,
  hip_r: TRUNK_LOWER,
  knee_l: LOWER,
  knee_r: LOWER,
  shoulder_l: UPPER,
  shoulder_r: UPPER,
  wrist_l: UPPER,
  wrist_r: UPPER,

  abdominal_muscles: TRUNK,
  back_muscles_l: TRUNK,
  back_muscles_r: TRUNK,
  calf_l: LOWER,
  calf_r: LOWER,
  chest_muscles_l: TRUNK,
  chest_muscles_r: TRUNK,
  deltoid_l: UPPER,
  deltoid_r: UPPER,
  diaphragm: TRUNK,
  foot_muscles_l: LOWER,
  foot_muscles_r: LOWER,
  forearm_muscles_l: UPPER,
  forearm_muscles_r: UPPER,
  gluteal_l: TRUNK_LOWER,
  gluteal_r: TRUNK_LOWER,
  hamstrings_l: LOWER,
  hamstrings_r: LOWER,
  hand_muscles_l: UPPER,
  hand_muscles_r: UPPER,
  iliopsoas_l: TRUNK_LOWER,
  iliopsoas_r: TRUNK_LOWER,
  adductors_l: LOWER,
  adductors_r: LOWER,
  intercostals_l: TRUNK,
  intercostals_r: TRUNK,
  neck_muscles_l: HEAD,
  neck_muscles_r: HEAD,
  pelvic_floor: TRUNK,
  quadriceps_l: LOWER,
  quadriceps_r: LOWER,
  rotator_cuff_l: UPPER,
  rotator_cuff_r: UPPER,
  shin_muscles_l: LOWER,
  shin_muscles_r: LOWER,
  shoulder_muscles_l: TRUNK_UPPER,
  shoulder_muscles_r: TRUNK_UPPER,
  trapezius_l: HEAD_TRUNK_UPPER,
  trapezius_r: HEAD_TRUNK_UPPER,
  upper_arm_muscles_l: UPPER,
  upper_arm_muscles_r: UPPER,

  cranial_nerves: HEAD,
  spinal_cord: HEAD_TRUNK,

  adrenal_l: TRUNK,
  adrenal_r: TRUNK,
  appendix: TRUNK,
  brain: HEAD,
  brainstem: HEAD,
  breast_l: TRUNK,
  breast_r: TRUNK,
  bronchi: TRUNK,
  cerebellum: HEAD,
  esophagus: HEAD_TRUNK,
  eye_l: HEAD,
  eye_r: HEAD,
  fallopian_tubes: TRUNK,
  gallbladder: TRUNK,
  heart: TRUNK,
  kidney_l: TRUNK,
  kidney_r: TRUNK,
  colon: TRUNK,
  larynx: HEAD,
  liver: TRUNK,
  lung_l: TRUNK,
  lung_r: TRUNK,
  reproductive: TRUNK,
  ovary_l: TRUNK,
  ovary_r: TRUNK,
  pancreas: TRUNK,
  pharynx: HEAD,
  pituitary: HEAD,
  prostate: TRUNK,
  salivary_glands: HEAD,
  small_intestine: TRUNK,
  spleen: TRUNK,
  stomach: TRUNK,
  thymus: TRUNK,
  tongue: HEAD,
  trachea: HEAD_TRUNK,
  ureter_l: TRUNK,
  ureter_r: TRUNK,
  bladder: TRUNK,
  uterus: TRUNK,
  vagina: TRUNK,

  spine_cervical: HEAD,
  clavicle_l: TRUNK_UPPER,
  clavicle_r: TRUNK_UPPER,
  foot_l: LOWER,
  foot_r: LOWER,
  forearm_l: UPPER,
  forearm_r: UPPER,
  hand_l: UPPER,
  hand_r: UPPER,
  mandible: HEAD,
  patella_l: LOWER,
  patella_r: LOWER,
  spine_lumbar: TRUNK,
  pelvis: TRUNK_LOWER,
  ribs_l: TRUNK,
  ribs_r: TRUNK,
  lower_leg_l: LOWER,
  lower_leg_r: LOWER,
  scapula_l: TRUNK_UPPER,
  scapula_r: TRUNK_UPPER,
  skull: HEAD,
  sternum: TRUNK,
  teeth: HEAD,
  femur_l: LOWER,
  femur_r: LOWER,
  spine_thoracic: TRUNK,
  humerus_l: UPPER,
  humerus_r: UPPER,

  skin: REGIONS,

  aorta: TRUNK,
  arteries_abdomen: TRUNK,
  arteries_thorax: TRUNK,
  arteries_head: HEAD,
  arteries_arm_l: UPPER,
  arteries_leg_l: LOWER,
  arteries_pelvis: TRUNK,
  arteries_arm_r: UPPER,
  arteries_leg_r: LOWER,
  carotid_l: HEAD,
  carotid_r: HEAD,
  coronary_arteries: TRUNK,
  vena_cava_inferior: TRUNK,
  pulmonary_vessels: TRUNK,
  vena_cava_superior: TRUNK,
  veins_abdomen: TRUNK,
  veins_thorax: TRUNK,
  veins_arm_l: UPPER,
  veins_leg_l: LOWER,
  veins_pelvis: TRUNK,
  veins_arm_r: UPPER,
  veins_leg_r: LOWER,
});

export function getRegions(entry) {
  if (!entry || typeof entry.key !== 'string' || !Object.hasOwn(REGION_BY_KEY, entry.key)) {
    throw new RangeError(`Unknown catalog region key: ${String(entry?.key)}`);
  }
  return REGION_BY_KEY[entry.key];
}

// These are search-navigation aliases, not additional published concepts.
const SYSTEM_SEARCH_LABELS = Object.freeze({
  skin: 'Huid Skin',
  skeleton: 'Skelet Botten Skeleton Bones',
  muscles: 'Spieren Muscles',
  organs: 'Organen Organs',
  vessels: 'Bloedvaten Blood vessels',
  nerves: 'Zenuwen Nerves',
  joints: 'Gewrichten Joints Hotspots',
});

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/\p{Mark}+/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim();
}

function sideAliases(entry) {
  if (entry.key.endsWith('_l')) return 'left links linker';
  if (entry.key.endsWith('_r')) return 'right rechts rechter';
  return '';
}

/**
 * A pure stable-order filter over the caller's active variant catalog.
 * No result is manufactured from regions or search strings. Multiword query
 * tokens are conjunctive against the same entry; both language labels can be
 * searched in either UI locale. A precise normalized source key takes priority.
 */
export function selectCatalog(catalog, { region = 'all', system = 'all', query = '', locale = 'nl' } = {}) {
  const candidates = catalog.filter(entry => {
    const regions = getRegions(entry);
    return (region === 'all' || regions.includes(region)) && (system === 'all' || entry.system === system);
  });
  const needle = normalize(query);
  if (!needle) return candidates;

  // Decide exact-key intent against the input catalog before filtering, so a
  // contradictory region/system cannot turn it into another structure result.
  const exactKey = catalog.find(entry => normalize(entry.key) === needle)?.key;
  if (exactKey !== undefined) return candidates.filter(entry => entry.key === exactKey);

  const tokens = needle.split(' ');
  return candidates.filter(entry => {
    const haystack = normalize([
      entry.key,
      entry.label,
      displayLabel(entry, locale),
      displayLabel(entry, 'nl'),
      displayLabel(entry, 'en'),
      entry.system,
      SYSTEM_SEARCH_LABELS[entry.system],
      sideAliases(entry),
    ].join(' '));
    const words = haystack.split(' ');
    return tokens.every(token => token.length === 1 ? words.includes(token) : haystack.includes(token));
  });
}
