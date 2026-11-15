// Upstream package is pinned to 0.1.0 in package.json / lockfile. Its package
// exports explicitly expose catalog.json and models/*. These Vite asset URL
// imports produce local, hashed build assets instead of external CDN traffic.
import rawCatalog from 'open-anatomy-3d/catalog.json';
import { ATTRIBUTION } from 'open-anatomy-3d';
import maleUrl from 'open-anatomy-3d/models/anatomy-male.glb?url';
import femaleUrl from 'open-anatomy-3d/models/anatomy-female.glb?url';

export const MODEL_VERSION = '0.1.0';
export const VARIANTS = Object.freeze(['male', 'female']);
export const SYSTEMS = Object.freeze([
  'skin', 'skeleton', 'muscles', 'organs', 'vessels', 'nerves', 'joints',
]);

export const SYSTEM_LABELS = Object.freeze({
  nl: Object.freeze({
    skin: 'Huid',
    skeleton: 'Skelet',
    muscles: 'Spieren',
    organs: 'Organen',
    vessels: 'Bloedvaten',
    nerves: 'Zenuwen',
    joints: 'Gewrichten (hotspots)',
  }),
  en: Object.freeze({
    skin: 'Skin',
    skeleton: 'Skeleton',
    muscles: 'Muscles',
    organs: 'Organs',
    vessels: 'Blood vessels',
    nerves: 'Nerves',
    joints: 'Joints (hotspots)',
  }),
});

export const SOURCE_CREDIT = ATTRIBUTION;
export const SOURCE_LINK = 'https://github.com/MervinR07/open-anatomy-3d';
export const SOURCE_LICENSE_LINK = 'https://creativecommons.org/licenses/by/4.0/';

function assertVariant(variant) {
  if (!VARIANTS.includes(variant)) {
    throw new RangeError(`Unknown anatomical model variant: ${String(variant)}`);
  }
}

// Preserve upstream keys/labels/metadata without inventing anatomy, translated
// names or a one-to-one mesh mapping for entries that are only hotspots.
const seenKeys = new Set();
const catalog = Object.freeze(rawCatalog.map((entry) => {
  if (typeof entry.key !== 'string' || !entry.key || seenKeys.has(entry.key)) {
    throw new Error('Invalid or duplicate key in upstream anatomy catalog');
  }
  if (!SYSTEMS.includes(entry.system) || (entry.sex != null && !VARIANTS.includes(entry.sex))) {
    throw new Error(`Unsupported anatomy catalog metadata: ${entry.key}`);
  }
  seenKeys.add(entry.key);
  return Object.freeze({
    ...entry,
    ...(entry.anchor ? { anchor: Object.freeze([...entry.anchor]) } : {}),
    ...(entry.anchorFemale ? { anchorFemale: Object.freeze([...entry.anchorFemale]) } : {}),
  });
}));

const byKey = new Map(catalog.map((entry) => [entry.key, entry]));
const byVariant = Object.freeze(Object.fromEntries(VARIANTS.map((variant) => [
  variant,
  Object.freeze(catalog.filter((entry) => !entry.sex || entry.sex === variant)),
])));
const byModel = Object.freeze({
  male: Object.freeze({ url: maleUrl, variant: 'male', catalog: byVariant.male }),
  female: Object.freeze({ url: femaleUrl, variant: 'female', catalog: byVariant.female }),
});

/** Combined source catalog: includes both variants and non-mesh joints. */
export function getAllCatalog() {
  return catalog;
}

/** Records that are declared for the selected reference model. */
export function getCatalog(variant) {
  assertVariant(variant);
  return byVariant[variant];
}

/** Bundler-resolved local GLB URL, explicit variant and matching catalog. */
export function getModel(variant) {
  assertVariant(variant);
  return byModel[variant];
}

/** Strict key lookup; optional variant also rejects sex-exclusive mismatches. */
export function getStructure(key, variant) {
  if (variant !== undefined) assertVariant(variant);
  const entry = byKey.get(key);
  if (!entry || (variant !== undefined && entry.sex && entry.sex !== variant)) {
    throw new RangeError(`Unknown or unavailable anatomical key: ${String(key)}`);
  }
  return entry;
}

/** The source catalog labels joint locations as anchors, never mesh geometry. */
export function getJointAnchor(key, variant) {
  assertVariant(variant);
  const entry = getStructure(key, variant);
  if (entry.system !== 'joints') return undefined;
  return variant === 'female' ? entry.anchorFemale : entry.anchor;
}
