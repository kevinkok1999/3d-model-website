// Verify one captured point against independently supplied, source-native
// GLTF triangle data. This does not read GLB bytes, certify the independence
// or provenance of the witness provider, infer an anatomical landmark, or
// authorize registration. Node/mesh/primitive/triangle indices are original
// GLTF indices, not display-object order, and POSITION values are in the
// native primitive accessor's coordinate space (no node/world transforms).
import { createHash } from 'node:crypto';

export const LANDMARK_COORDINATE_SPACE = 'GLTF_PRIMITIVE_POSITION';
const witnessKeys = ['asset','coordinateSpace','nodeIndex','meshIndex','primitiveIndex','triangleIndex','vertexIndices','vertices'];
const evidenceKeys = ['schemaVersion', ...witnessKeys, 'barycentric','point'];
const identityKeys = ['coordinateSpace','nodeIndex','meshIndex','primitiveIndex','triangleIndex'];
const indexKeys = ['nodeIndex','meshIndex','primitiveIndex','triangleIndex'];
const MAX_WITNESSES = 4096;
const MAX_ABS_NATIVE = 1e100;
const BARYCENTRIC_SUM_TOLERANCE = 1e-9;
const MIN_TRIANGLE_CONDITION = 1e-10;
const POINT_RELATIVE_TOLERANCE = 1e-8;
const need = (condition, message) => { if (!condition) throw new Error(message); };
const finite = n => typeof n === 'number' && Number.isFinite(n);
const index = n => Number.isSafeInteger(n) && n >= 0;
const identifier = id => typeof id === 'string' && id.length > 0 && id.length <= 200 && id.trim() === id && !/[\x00-\x1f\x7f]/.test(id);
const plainRecord = value => value !== null && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const keysExactly = (value, keys) => plainRecord(value) && Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value,key));
const denseArray = (value, length) => Array.isArray(value) && value.length === length && Reflect.ownKeys(value).length === length + 1 && Array.from({length},(_,i) => Object.hasOwn(value,i)).every(Boolean);
const triple = (value, check) => denseArray(value,3) && value.every(check);
const nativeNumber = n => finite(n) && Math.abs(n) <= MAX_ABS_NATIVE;
const nativePoint = value => triple(value,nativeNumber);
const subtract = (a,b) => a.map((n,i) => n-b[i]);
const norm = v => Math.hypot(...v);
const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const equalTriple = (a,b) => a.every((n,i) => n === b[i]);

function validateTriangle(value, keys, label) {
  need(keysExactly(value,keys),`${label} has missing or unexpected fields`);
  need(keysExactly(value.asset,['id','sha256']) && identifier(value.asset.id) && typeof value.asset.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.asset.sha256),`${label} requires an asset ID and lowercase source SHA-256`);
  need(value.coordinateSpace === LANDMARK_COORDINATE_SPACE,`${label} must use original GLTF primitive POSITION coordinates`);
  need(indexKeys.every(key => index(value[key])),`${label} contains invalid original GLTF indices`);
  need(triple(value.vertexIndices,index) && new Set(value.vertexIndices).size === 3,`${label} requires three distinct ordered original vertex indices`);
  need(triple(value.vertices,nativePoint),`${label} requires three ordered finite, bounded native 3D vertices`);
  const [a,b,c] = value.vertices;
  const ab = subtract(b,a), ac = subtract(c,a), bc = subtract(c,b);
  const edgeScale = Math.max(norm(ab),norm(ac),norm(bc));
  const coordinateMagnitude = Math.max(...value.vertices.flat().map(Math.abs));
  need(finite(edgeScale) && edgeScale > 0 && edgeScale > 128*Number.EPSILON*coordinateMagnitude,`${label} triangle has insufficient distinguishable spatial extent`);
  // Relative area test avoids assumptions about the unknown physical unit.
  const condition = norm(cross(ab.map(n => n/edgeScale),ac.map(n => n/edgeScale)));
  need(finite(condition) && condition >= MIN_TRIANGLE_CONDITION,`${label} triangle is degenerate or ill-conditioned`);
  return {edgeScale,coordinateMagnitude};
}

function sameTriangleIdentity(a,b) {
  return a.asset.id === b.asset.id && a.asset.sha256 === b.asset.sha256 && identityKeys.every(key => a[key] === b[key]);
}

/**
 * Evidence schema v1:
 *   {schemaVersion:1, asset:{id,sha256}, coordinateSpace:
 *    'GLTF_PRIMITIVE_POSITION', nodeIndex, meshIndex, primitiveIndex,
 *    triangleIndex, vertexIndices:[i0,i1,i2], vertices:[[x,y,z],...],
 *    barycentric:[a,b,c], point:[x,y,z]}
 *
 * Witness is the same identity and ordered triangle data WITHOUT schemaVersion,
 * barycentric or point. The caller must independently obtain witness data from
 * the actual asset, and verify the asset bytes against an authoritative pin.
 * Passing a cloned evidence triangle as a witness does not establish that.
 * No selection by proximity, node name, or anatomical label is permitted.
 * Throws on invalid data, mismatches, ambiguity, or ill-conditioned geometry.
 */
export function verifyLandmarkEvidence(evidence, witnesses) {
  const geometry = validateTriangle(evidence,evidenceKeys,'Evidence');
  need(evidence.schemaVersion === 1,'Unsupported landmark evidence schema version');
  need(triple(evidence.barycentric,n => finite(n) && n >= 0 && n <= 1),'Barycentric weights must be finite and within [0,1]');
  need(Math.abs(evidence.barycentric.reduce((sum,n) => sum+n,0)-1) <= BARYCENTRIC_SUM_TOLERANCE,'Barycentric weights must sum to one');
  need(nativePoint(evidence.point),'Evidence point must be a finite, bounded native 3D coordinate');
  need(Array.isArray(witnesses) && witnesses.length > 0 && witnesses.length <= MAX_WITNESSES && denseArray(witnesses,witnesses.length),'A nonempty independent witness array is required');
  for (const witness of witnesses) validateTriangle(witness,witnessKeys,'Witness');
  const candidates = witnesses.filter(witness => sameTriangleIdentity(evidence,witness));
  need(candidates.length === 1,'Missing or ambiguous original GLTF triangle witness');
  const witness = candidates[0];
  need(equalTriple(evidence.vertexIndices,witness.vertexIndices),'Original ordered vertex indices differ from witness');
  need(evidence.vertices.every((vertex,i) => equalTriple(vertex,witness.vertices[i])),'Original ordered vertex positions differ from witness');
  // Use the independently supplied vertices, not a copy of captured data, to
  // reconstruct the point. Normalize only the tiny permitted barycentric
  // summation roundoff so translated coordinates do not distort the check.
  const sum = evidence.barycentric.reduce((a,b) => a+b,0);
  const weights = evidence.barycentric.map(n => n/sum);
  const [a,b,c] = witness.vertices;
  const expected = a.map((n,i) => n+weights[1]*(b[i]-n)+weights[2]*(c[i]-n));
  const tolerance = POINT_RELATIVE_TOLERANCE*geometry.edgeScale+16*Number.EPSILON*geometry.coordinateMagnitude;
  need(nativePoint(expected) && norm(subtract(evidence.point,expected)) <= tolerance,'Native point does not match barycentric interpolation of witnessed triangle');
  // Canonical property order makes the digest reproducible independently of
  // JSON field order. It identifies this capture, not an attestation/signature.
  const canonical = Object.fromEntries(evidenceKeys.map(key => [key,key === 'asset' ? {id:evidence.asset.id,sha256:evidence.asset.sha256} : evidence[key]]));
  return {
    status:'NATIVE_LANDMARK_EVIDENCE_PASS',
    sourceBytesVerified:false,physicalUnitVerified:false,anatomicallyValidated:false,registrationAuthorized:false,mergeAuthorized:false,
    evidenceSha256:createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    scope:'One supplied native GLTF triangle witness and captured point are numerically consistent. Witness provenance, source bytes, physical units, anatomical identity or correspondence, registration, and merge safety are not certified.',
  };
}
