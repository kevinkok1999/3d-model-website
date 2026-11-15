import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getViewDirection, cameraOffsetForView } from './camera-presets.js';

// Technical spike. Catalog keys identify source geometry, not proven clinical
// accuracy. Joint anchors are explicitly synthetic annotations, never meshes of
// joint anatomy. The input manifest and source model are managed by the host.
const INITIAL_SYSTEMS = ['skeleton', 'muscles', 'organs', 'vessels', 'nerves', 'joints'];
const JOINT_SYSTEM = 'joints';
const NORMAL_MARKER = 0xff9a3c;
const SELECTED_MARKER = 0x62dbf7;
const DEFAULT_VIEW = new THREE.Vector3().fromArray(getViewDirection('front'));
const TAP_TOLERANCE = 8; // CSS pixels, independent of DPR

function normalizeVariant(value) {
  if (value === 'm') return 'male';
  if (value === 'f') return 'female';
  if (value === 'male' || value === 'female') return value;
  throw new Error('Onbekende modelvariant. Gebruik male of female.');
}

function finiteAnchor(value) {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

function validBounds(box) {
  return !box.isEmpty() && [...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite);
}

function sourceUrl(input) {
  const url = new URL(input, document.baseURI);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== location.origin || url.username || url.password) {
    throw new Error('Alleen een lokale, door het project geleverde GLB-bron is toegestaan.');
  }
  return url;
}

function parseGlbHeader(bytes) {
  const data = new DataView(bytes);
  if (data.byteLength < 20 || data.getUint32(0, true) !== 0x46546c67 ||
      data.getUint32(4, true) !== 2 || data.getUint32(8, true) !== data.byteLength) {
    throw new Error('Ongeldig GLB 2.0-modelbestand.');
  }
  const size = data.getUint32(12, true);
  if (!size || size % 4 || data.getUint32(16, true) !== 0x4e4f534a || size > data.byteLength - 20) {
    throw new Error('Ongeldige JSON-sectie in GLB-model.');
  }
  const json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes, 20, size)));
  if (json.asset?.version !== '2.0') throw new Error('Alleen glTF 2.0 wordt ondersteund.');
  // The audited spike uses standalone GLB files. Reject network references
  // before allowing the engine to parse them; embedded bufferViews are fine.
  if ((json.buffers ?? []).some(buffer => buffer.uri !== undefined) ||
      (json.images ?? []).some(image => image.uri !== undefined)) {
    throw new Error('Dit GLB-model bevat externe of niet-ingesloten resources.');
  }
  const supportedMeshExtensions = new Set(['EXT_meshopt_compression', 'KHR_mesh_quantization',
    'KHR_materials_unlit', 'KHR_texture_transform', 'KHR_materials_emissive_strength',
    'KHR_materials_clearcoat', 'KHR_materials_ior', 'KHR_materials_sheen',
    'KHR_materials_specular', 'KHR_materials_transmission', 'KHR_materials_volume']);
  if ((json.extensionsRequired ?? []).some(extension => !supportedMeshExtensions.has(extension))) {
    throw new Error('Het model vereist een nog niet ondersteunde glTF-extensie.');
  }
  return json;
}

function eligibleEntries(catalog, variant) {
  if (!Array.isArray(catalog)) throw new Error('De anatomiecatalogus moet een array zijn.');
  const seen = new Set();
  const result = new Map();
  for (const item of catalog) {
    if (!item || typeof item.key !== 'string' || !/^[a-z][a-z0-9_]*$/.test(item.key) ||
        typeof item.label !== 'string' || typeof item.system !== 'string' || seen.has(item.key)) {
      throw new Error('Ongeldige of dubbele catalogus-ID.');
    }
    seen.add(item.key);
    if (item.sex !== undefined && item.sex !== 'male' && item.sex !== 'female') {
      throw new Error(`Ongeldige variant bij catalogus-ID ${item.key}.`);
    }
    if (!item.sex || item.sex === variant) result.set(item.key, item);
  }
  return result;
}

function markerTexture() {
  // A drawn crosshair is a navigational annotation, not invented anatomy.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('De gewrichtsmarkeringen kunnen niet worden opgebouwd.');
  ctx.clearRect(0, 0, 128, 128);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#102331';
  ctx.lineWidth = 18;
  ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.arc(64, 64, 40, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(64, 15); ctx.lineTo(64, 30); ctx.moveTo(64, 98); ctx.lineTo(64, 113);
  ctx.moveTo(15, 64); ctx.lineTo(30, 64); ctx.moveTo(98, 64); ctx.lineTo(113, 64); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(64, 64, 7, 0, Math.PI * 2); ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = 'Synthetic joint crosshair';
  return texture;
}

function materialsOf(object) {
  if (!object.material) return [];
  return Array.isArray(object.material) ? object.material : [object.material];
}

function disposeTree(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), bitmapData = new Set();
  const skeletons = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    if (object.skeleton) skeletons.add(object.skeleton);
    for (const material of materialsOf(object)) {
      if (!material || materials.has(material)) continue;
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const texture of textures) {
    const data = texture.source?.data;
    for (const image of Array.isArray(data) ? data : [data]) {
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) bitmapData.add(image);
    }
    texture.dispose();
  }
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  for (const skeleton of skeletons) skeleton.dispose?.();
  for (const data of bitmapData) data.close();
}

function modelTriangleCount(mesh) {
  const geometry = mesh.geometry;
  if (!geometry) return 0;
  const vertices = geometry.index?.count ?? geometry.attributes.position?.count ?? 0;
  return Math.floor(vertices / 3) * (mesh.isInstancedMesh ? mesh.count : 1);
}

function extendMeshBounds(box, object) {
  // Avoid recursively including a nested but differently mapped child mesh.
  let local;
  if (object.isSkinnedMesh || object.isInstancedMesh) {
    object.computeBoundingBox();
    local = object.boundingBox;
  } else if (object.geometry) {
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    local = object.geometry.boundingBox;
  }
  if (local && validBounds(local)) box.union(local.clone().applyMatrix4(object.matrixWorld));
  return box;
}

/** Build exact source-node based mapping; never guess anatomical name aliases. */
function buildModel(gltf, json, entries, variant) {
  const group = new THREE.Group();
  group.name = `anatomy-${variant}`;
  group.add(gltf.scene);
  const sourceNodes = Array.isArray(json.nodes) ? json.nodes : [];
  const bySourceKey = new Map();
  for (const node of sourceNodes) {
    if (node?.mesh === undefined || typeof node.name !== 'string') continue;
    bySourceKey.set(node.name, (bySourceKey.get(node.name) ?? 0) + 1);
  }
  const map = new Map(), meshKeys = new Map(), unknownMeshNames = new Set(), meshObjects = [];
  let markerMap = null;
  const eligibleMeshKey = key => typeof key === 'string' && entries.get(key)?.system !== JOINT_SYSTEM &&
    entries.has(key) && bySourceKey.get(key) === 1;

  // GLTFLoader assigns names to primitive children. Prefer the named authored
  // node, or its exact loader source-index association if a generated child
  // name was changed; these are provenance checks, not fuzzy string matching.
  const sourceKeyFor = object => {
    let current = object;
    while (current && current !== gltf.scene.parent) {
      const association = gltf.parser?.associations?.get(current);
      const node = Number.isInteger(association?.nodes) ? sourceNodes[association.nodes] : null;
      if (node?.mesh !== undefined) return eligibleMeshKey(node.name) ? node.name : null;
      if (eligibleMeshKey(current.name)) return current.name;
      current = current.parent;
    }
    return null;
  };

  try {
    gltf.scene.traverse(object => {
      if (!object.isMesh) return;
      const key = sourceKeyFor(object);
      if (!key) {
        object.visible = false;
        unknownMeshNames.add(object.name || '(naamloze mesh)');
        return;
      }
      const entry = entries.get(key);
      let record = map.get(key);
      if (!record) {
        record = { entry, kind: 'mesh', objects: [] };
        map.set(key, record);
      }
      record.objects.push(object);
      meshKeys.set(object, key);
      meshObjects.push(object);
    });
    if (meshObjects.length === 0) throw new Error('Geen betrouwbaar gemapte anatomische mesh gevonden.');

    group.updateMatrixWorld(true);
    const bounds = new THREE.Box3();
    for (const mesh of meshObjects) extendMeshBounds(bounds, mesh);
    if (!validBounds(bounds)) throw new Error('Ongeldige modelafmetingen.');
    const modelSize = bounds.getSize(new THREE.Vector3());
    const modelHeight = Math.max(modelSize.y, modelSize.x, modelSize.z);
    if (!Number.isFinite(modelHeight) || modelHeight <= 1e-8) throw new Error('Lege modelafmetingen.');

    const hotspotGroup = new THREE.Group();
    hotspotGroup.name = 'Synthetic joint annotation hotspots';
    group.add(hotspotGroup);
    const jointEntries = [...entries.values()].filter(entry => entry.system === JOINT_SYSTEM);
    const hotspotObjects = [];
    if (jointEntries.some(entry => finiteAnchor(variant === 'female' ? entry.anchorFemale : entry.anchor))) {
      markerMap = markerTexture();
      for (const entry of jointEntries) {
        const anchor = variant === 'female' ? entry.anchorFemale : entry.anchor;
        if (!finiteAnchor(anchor)) continue; // Never substitute the other variant's anchor.
        const material = new THREE.SpriteMaterial({ map: markerMap, color: NORMAL_MARKER,
          transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
        const marker = new THREE.Sprite(material);
        marker.name = `synthetic-hotspot:${entry.key}`;
        marker.position.fromArray(anchor);
        marker.scale.setScalar(modelHeight * 0.035);
        marker.renderOrder = 1000;
        marker.userData.syntheticHotspot = true;
        hotspotGroup.add(marker);
        hotspotObjects.push(marker);
        map.set(entry.key, { entry, kind: 'hotspot', objects: [marker] });
        meshKeys.set(marker, entry.key);
      }
    }
    const missingKeys = [...entries.keys()].filter(key => !map.has(key));
    for (const [key, count] of bySourceKey) if (count !== 1) unknownMeshNames.add(`dubbele bron-ID: ${key}`);
    group.updateMatrixWorld(true);
    return {
      group, map, meshKeys, meshObjects, hotspotObjects, bounds, modelHeight,
      hotspotKeys: [...map].filter(([, record]) => record.kind === 'hotspot').map(([key]) => key).sort(),
      mappedKeys: [...map].filter(([, record]) => record.kind === 'mesh').map(([key]) => key).sort(),
      missingKeys: missingKeys.sort(), unknownMeshNames: [...unknownMeshNames].sort(),
      modelTriangles: meshObjects.reduce((sum, mesh) => sum + modelTriangleCount(mesh), 0),
    };
  } catch (error) {
    disposeTree(group);
    // If the texture was created before a sprite received it, it wasn't in the tree.
    if (markerMap && !group.children.some(child => child.name === 'Synthetic joint annotation hotspots' && child.children.length)) markerMap.dispose();
    throw error;
  }
}

/**
 * Initialises a standalone, demand-rendered Three.js viewer. The host owns
 * layout and educational content; viewer selection is expressed by source key.
 *
 * onStatus({phase:'idle'|'loading'|'ready'|'error'|'context-lost', message,
 *           variant?, metrics?}); onSelect(key|null); onError(Error).
 * setView('front'|'back'|'left'|'right') changes only the camera; a currently
 * fitted body/structure is reframed in the new orientation. A free camera
 * keeps its exact target distance. fit() frames the full reference body in
 * the current direction without clearing selection, isolation or layer state.
 * reset() remains the explicit clear-selection/clear-isolation/front-body fit.
 */
export function createViewer(host, { onSelect = () => {}, onStatus = () => {}, onError = () => {} } = {}) {
  if (!host?.appendChild) throw new TypeError('Een geldig viewer-hostelement is vereist.');
  const notify = (callback, value) => {
    try { callback(value); } catch (error) { console.error('Viewer host callback:', error); }
  };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
  } catch (error) {
    const failure = new Error('3D-weergave is niet beschikbaar op dit apparaat.', { cause: error });
    notify(onStatus, { phase: 'error', message: failure.message });
    notify(onError, failure);
    throw failure;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const canvas = renderer.domElement;
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%', touchAction: 'none' });
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactief 3D-lichaamsmodel. Gebruik de structuurlijst als alternatief.');
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf2f8ff, 0x607080, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff3e3, 2.1);
  keyLight.position.set(3, 5, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xd1e9ff, 1.1);
  fillLight.position.set(-3, 2, -4);
  scene.add(fillLight);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 100);
  camera.position.set(0, 1, 4);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.9, 0);
  controls.enableDamping = false;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.autoRotate = false;
  controls.minPolarAngle = 0.01;
  controls.maxPolarAngle = Math.PI - 0.01;
  controls.update();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const cameraSpace = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const activePointers = new Set();
  const originalMaterials = new Map();
  let gesture = null;
  let phase = 'idle', revision = 0, pendingController = null, raf = 0;
  let model = null, variant = null, selectedKey = null, isolateKey = null;
  let visibleSystems = new Set(INITIAL_SYSTEMS), visibleKeys = [];
  let disposed = false, contextLost = false, atBodyFit = false;
  let viewDirection = 'front', framedKey = null, applyingCamera = false;
  let width = 1, height = 1, framesRendered = 0, lastRenderMs = 0, loadMs = 0;

  function getMetrics() {
    return {
      variant, ready: !!model && phase === 'ready' && !contextLost && !disposed, phase,
      mappedKeys: [...(model?.mappedKeys ?? [])], hotspotKeys: [...(model?.hotspotKeys ?? [])],
      availableKeys: [...(model?.map.keys() ?? [])].sort(), missingKeys: [...(model?.missingKeys ?? [])],
      unknownMeshNames: [...(model?.unknownMeshNames ?? [])], meshCount: model?.meshObjects.length ?? 0,
      hotspotCount: model?.hotspotObjects.length ?? 0, modelTriangles: model?.modelTriangles ?? 0,
      triangles: renderer.info.render.triangles, calls: renderer.info.render.calls,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      loadMs, visibleKeys: [...visibleKeys], selectedKey, isolateKey, visibleSystems: [...visibleSystems],
      framesRendered, lastRenderMs, pixelRatio: renderer.getPixelRatio(), viewport: { width, height },
      viewDirection,
      camera: { position: camera.position.toArray(), target: controls.target.toArray(),
        distance: camera.position.distanceTo(controls.target), near: camera.near, far: camera.far,
        atBodyFit, framedKey },
    };
  }

  function status(nextPhase, message, extra = {}) {
    phase = nextPhase;
    if (extra.metrics === true) extra = { ...extra, metrics: getMetrics() };
    notify(onStatus, { phase, message, variant, ...extra });
  }

  function updateMarkerSizes() {
    if (!model) return;
    camera.updateMatrixWorld(true);
    const targetPx = matchMedia('(pointer: coarse)').matches ? 28 : 23;
    const viewScale = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / Math.max(height, 1);
    for (const marker of model.hotspotObjects) {
      marker.getWorldPosition(worldPosition);
      cameraSpace.copy(worldPosition).applyMatrix4(camera.matrixWorldInverse);
      const depth = Math.max(-cameraSpace.z, camera.near);
      marker.scale.setScalar(THREE.MathUtils.clamp(depth * viewScale * targetPx,
        model.modelHeight * 0.001, model.modelHeight * 0.15));
    }
  }

  function updateCameraClip() {
    if (!model) return;
    // A tight, conservative view-depth interval reduces depth-buffer artefacts
    // when inspecting closely spaced anatomy. Inside bounds retain a small
    // near plane rather than clipping arbitrary structures from the view.
    const sphere = model.bounds.getBoundingSphere(new THREE.Sphere());
    const distance = sphere.center.clone().sub(camera.position).dot(camera.getWorldDirection(new THREE.Vector3()));
    const floor = Math.max(model.modelHeight * 0.0005, 0.000001);
    const near = Math.max(floor, distance - sphere.radius * 1.35);
    const far = Math.max(near * 2, distance + sphere.radius * 2.5, floor * 100);
    if (Math.abs(camera.near - near) > floor * 0.01 || Math.abs(camera.far - far) > floor * 0.01) {
      camera.near = near;
      camera.far = far;
      camera.updateProjectionMatrix();
    }
  }

  function renderNow() {
    if (disposed || contextLost) return;
    const started = performance.now();
    updateCameraClip();
    updateMarkerSizes();
    renderer.render(scene, camera);
    lastRenderMs = performance.now() - started; // CPU wall time, not guaranteed GPU completion time
    framesRendered += 1;
  }

  function invalidate() {
    if (raf || disposed || contextLost) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      try { renderNow(); }
      catch (error) {
        status('error', 'De 3D-weergave kon niet worden gerenderd. Gebruik de structuurlijst.');
        notify(onError, error);
      }
    });
  }

  function placeCamera(box, { direction: requestedDirection = null, bodyFit = false,
    structureKey = null, preset = viewDirection } = {}) {
    if (!validBounds(box)) return false;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const minRadius = (model?.modelHeight ?? 1) * 0.001;
    const radius = Math.max(sphere.radius, minRadius);
    const vHalf = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hHalf = Math.atan(Math.tan(vHalf) * Math.max(camera.aspect, 0.05));
    const direction = requestedDirection ? new THREE.Vector3().fromArray(requestedDirection)
      : camera.position.clone().sub(controls.target);
    if (direction.lengthSq() < 1e-12) direction.copy(DEFAULT_VIEW);
    direction.normalize();
    // Fit the eight world-bounds corners instead of a broad sphere. This
    // prevents a tall model becoming needlessly small in a portrait viewport.
    const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    const tanH = Math.max(Math.tan(hHalf), 0.0125);
    const tanV = Math.max(Math.tan(vHalf), 0.0125);
    let distance = radius * 0.05;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const offset = new THREE.Vector3(x, y, z).sub(sphere.center).multiplyScalar(1.12);
      distance = Math.max(distance, offset.dot(direction) + Math.abs(offset.dot(right)) / tanH,
        offset.dot(direction) + Math.abs(offset.dot(up)) / tanV);
    }
    distance += radius * 0.025;
    applyingCamera = true;
    try {
      controls.target.copy(sphere.center);
      camera.position.copy(sphere.center).addScaledVector(direction, distance);
      const modelScale = model?.modelHeight ?? Math.max(radius * 2, 1e-3);
      controls.minDistance = modelScale * 0.004;
      controls.maxDistance = Math.max(modelScale * 12, distance * 1.5);
      controls.cursor?.copy(model?.bounds.getCenter(new THREE.Vector3()) ?? sphere.center);
      if ('maxTargetRadius' in controls) controls.maxTargetRadius = modelScale * 2;
      camera.lookAt(sphere.center);
      controls.update();
      updateCameraClip();
      atBodyFit = bodyFit;
      framedKey = structureKey;
      viewDirection = preset;
    } finally { applyingCamera = false; }
    invalidate();
    return true;
  }

  function boundsFor(key) {
    const record = model?.map.get(key);
    if (!record) return null;
    model.group.updateMatrixWorld(true);
    if (record.kind === 'hotspot') {
      const center = record.objects[0].getWorldPosition(new THREE.Vector3());
      const radius = model.modelHeight * 0.035; // framing convenience, not a joint measurement
      return new THREE.Box3(center.clone().addScalar(-radius), center.clone().addScalar(radius));
    }
    const box = new THREE.Box3();
    for (const object of record.objects) extendMeshBounds(box, object);
    return box;
  }

  function updateVisibility() {
    if (!model) { visibleKeys = []; return; }
    visibleKeys = [];
    for (const [key, record] of model.map) {
      const visible = isolateKey !== null ? key === isolateKey : visibleSystems.has(record.entry.system);
      for (const object of record.objects) object.visible = visible;
      if (visible) visibleKeys.push(key);
    }
    visibleKeys.sort();
    invalidate();
  }

  function clearHighlight() {
    if (model) for (const marker of model.hotspotObjects) marker.material.color.setHex(NORMAL_MARKER);
    for (const [mesh, original] of originalMaterials) {
      for (const material of materialsOf(mesh)) material.dispose(); // cloned selection materials only; textures remain shared
      mesh.material = original;
    }
    originalMaterials.clear();
  }

  function highlight(key) {
    const record = model?.map.get(key);
    if (!record) return;
    if (record.kind === 'hotspot') {
      record.objects[0].material.color.setHex(SELECTED_MARKER);
      return;
    }
    for (const mesh of record.objects) {
      const original = mesh.material;
      const clones = materialsOf(mesh).map(material => {
        const clone = material.clone();
        if (clone.emissive?.isColor) {
          clone.emissive.setHex(SELECTED_MARKER);
          clone.emissiveIntensity = 0.35;
        }
        if (clone.color?.isColor) clone.color.lerp(new THREE.Color(SELECTED_MARKER), 0.34);
        return clone;
      });
      if (!clones.length) continue;
      originalMaterials.set(mesh, original);
      mesh.material = Array.isArray(original) ? clones : clones[0];
    }
  }

  function focus(key) {
    if (disposed || !model || !visibleKeys.includes(key)) return false;
    const box = boundsFor(key);
    return box ? placeCamera(box, { structureKey: key }) : false;
  }

  function fit() {
    if (disposed || !model?.group.visible) return false;
    return placeCamera(model.bounds, { bodyFit: true });
  }

  function setView(direction) {
    const presetDirection = getViewDirection(direction);
    if (disposed || !model?.group.visible || !presetDirection) return false;
    if (atBodyFit) return placeCamera(model.bounds, { direction: presetDirection, bodyFit: true, preset: direction });
    if (framedKey) {
      const box = boundsFor(framedKey);
      if (box && validBounds(box)) return placeCamera(box, { direction: presetDirection, structureKey: framedKey, preset: direction });
    }
    // A manually orbited/panned/zoomed view retains the exact current target
    // and desired camera distance. Only its anatomical direction changes.
    const offset = cameraOffsetForView(direction, camera.position.toArray(), controls.target.toArray());
    if (!offset) return false;
    applyingCamera = true;
    try {
      camera.position.copy(controls.target).add(new THREE.Vector3().fromArray(offset));
      camera.lookAt(controls.target);
      controls.update();
      updateCameraClip();
      atBodyFit = false;
      framedKey = null;
      viewDirection = direction;
    } finally { applyingCamera = false; }
    invalidate();
    return true;
  }

  function select(key, options = {}) {
    if (disposed || (key !== null && !model?.map.has(key))) return false;
    if (key !== selectedKey) {
      clearHighlight();
      selectedKey = key;
      if (selectedKey) highlight(selectedKey);
      notify(onSelect, selectedKey);
      invalidate();
    }
    if (options.focus && key) focus(key);
    return true;
  }

  function setVisibleSystems(systems) {
    if (disposed) return;
    if (!systems || typeof systems[Symbol.iterator] !== 'function' || typeof systems === 'string') {
      throw new TypeError('setVisibleSystems verwacht een Set of array met systeem-ID’s.');
    }
    visibleSystems = new Set([...systems].filter(system => typeof system === 'string'));
    updateVisibility();
  }

  function isolate(key) {
    if (disposed || (key !== null && !model?.map.has(key))) return false;
    isolateKey = key;
    updateVisibility();
    return true;
  }

  function reset() {
    if (disposed || !model) return false;
    isolateKey = null;
    select(null);
    updateVisibility();
    return placeCamera(model.bounds, { direction: getViewDirection('front'), bodyFit: true, preset: 'front' });
  }

  function clearModel() {
    clearHighlight();
    if (!model) return;
    scene.remove(model.group);
    disposeTree(model.group);
    model = null;
    visibleKeys = [];
  }

  const manager = new THREE.LoadingManager();
  manager.setURLModifier(input => {
    // GLTFLoader creates object URLs for embedded image bufferViews; same-origin
    // blob/data resources are in-memory, not third-party HTTP requests.
    if (input.startsWith('blob:') || input.startsWith('data:')) return input;
    return sourceUrl(input).href;
  });
  const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);

  async function load({ url, variant: inputVariant, catalog }) {
    if (disposed) throw new Error('Viewer is gesloten.');
    const currentRevision = ++revision;
    pendingController?.abort();
    const controller = new AbortController();
    pendingController = controller;
    const started = performance.now();
    const previousVariant = variant;
    let candidate = null;
    let gltf = null;
    try {
      const nextVariant = normalizeVariant(inputVariant);
      const entries = eligibleEntries(catalog, nextVariant);
      const localUrl = sourceUrl(url);
      // Never show a previous reference model alongside a new variant's
      // catalog during a load or failed download. Retain it only internally
      // until the replacement is committed so resources can be disposed once.
      if (model) model.group.visible = false;
      status('loading', '3D-model laden…', { variant: nextVariant });
      invalidate();
      const response = await fetch(localUrl.href, { signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error(`3D-model niet beschikbaar (HTTP ${response.status}).`);
      if (response.url) sourceUrl(response.url);
      const bytes = await response.arrayBuffer();
      if (disposed || currentRevision !== revision) throw new DOMException('Lading geannuleerd.', 'AbortError');
      const json = parseGlbHeader(bytes);
      status('loading', 'Model verwerken…', { variant: nextVariant });
      gltf = await loader.parseAsync(bytes, new URL('./', localUrl).href);
      if (disposed || currentRevision !== revision) throw new DOMException('Lading geannuleerd.', 'AbortError');
      // buildModel owns the parsed model tree from here, including its cleanup on failure.
      const parsed = gltf;
      gltf = null;
      candidate = buildModel(parsed, json, entries, nextVariant);
      clearModel();
      model = candidate;
      candidate = null;
      variant = nextVariant;
      isolateKey = null;
      if (selectedKey !== null && !model.map.has(selectedKey)) {
        selectedKey = null;
        notify(onSelect, null);
      }
      if (selectedKey !== null) highlight(selectedKey);
      scene.add(model.group);
      updateVisibility();
      placeCamera(model.bounds, { direction: getViewDirection('front'), bodyFit: true, preset: 'front' });
      loadMs = performance.now() - started;
      if (contextLost) {
        status('context-lost', 'De grafische context is niet beschikbaar.');
      } else {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        renderNow();
        status('ready', '3D-model geladen.', { metrics: true });
      }
      return getMetrics();
    } catch (error) {
      if (gltf) disposeTree(gltf.scene);
      if (candidate) disposeTree(candidate.group);
      if (disposed || currentRevision !== revision || error?.name === 'AbortError') throw error;
      // A previously committed model may remain allocated, but is not rendered.
      // Its reported variant/selection must not be attributed to the new request.
      if (model) model.group.visible = false;
      invalidate();
      if (!model) variant = previousVariant;
      status('error', error?.message || 'Het 3D-model kon niet worden geladen.', { metrics: true });
      notify(onError, error);
      throw error;
    } finally {
      if (pendingController === controller) pendingController = null;
    }
  }

  function effectiveVisibility(object) {
    let current = object;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  function pick(clientX, clientY) {
    if (!model || disposed || contextLost || phase !== 'ready') return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    pointer.set((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2);
    updateCameraClip();
    updateMarkerSizes();
    model.group.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    // Overlay markers have depthTest=false to remain annotations even when an
    // anchor is behind an opaque mesh, so a visible marker gets click priority.
    const pickables = model.hotspotObjects.filter(effectiveVisibility);
    const insideCameraDepth = hit => {
      const depth = -cameraSpace.copy(hit.point).applyMatrix4(camera.matrixWorldInverse).z;
      return depth >= camera.near && depth <= camera.far;
    };
    const markerHit = raycaster.intersectObjects(pickables, false).find(insideCameraDepth);
    const hit = markerHit ?? raycaster.intersectObjects(model.meshObjects.filter(effectiveVisibility), false).find(insideCameraDepth);
    const key = hit ? model.meshKeys.get(hit.object) : null;
    if (key && visibleKeys.includes(key)) select(key);
    // Empty space intentionally preserves the previous selection.
  }

  function pointerDown(event) {
    activePointers.add(event.pointerId);
    if (activePointers.size > 1) {
      if (gesture) gesture.cancelled = true;
      return;
    }
    gesture = event.button === 0 || event.pointerType === 'touch' ? {
      id: event.pointerId, x: event.clientX, y: event.clientY, cancelled: false,
    } : null;
  }
  function pointerMove(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > TAP_TOLERANCE) gesture.cancelled = true;
  }
  function pointerUp(event) {
    activePointers.delete(event.pointerId);
    if (gesture?.id === event.pointerId && !gesture.cancelled && !activePointers.size &&
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= TAP_TOLERANCE) {
      pick(event.clientX, event.clientY);
    }
    if (gesture?.id === event.pointerId || !activePointers.size) gesture = null;
  }
  function pointerCancel(event) {
    activePointers.delete(event.pointerId);
    if (gesture) gesture.cancelled = true;
    if (!activePointers.size) gesture = null;
  }

  function resize() {
    if (disposed || contextLost) return;
    const nextWidth = Math.max(1, host.clientWidth);
    const nextHeight = Math.max(1, host.clientHeight);
    const coarse = matchMedia('(pointer: coarse)').matches || nextWidth < 600;
    const dpr = THREE.MathUtils.clamp(window.devicePixelRatio || 1, 1, coarse ? 1.5 : 1.8);
    if (width !== nextWidth || height !== nextHeight || renderer.getPixelRatio() !== dpr) {
      width = nextWidth; height = nextHeight;
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (model?.group.visible && atBodyFit) placeCamera(model.bounds, { bodyFit: true });
      else if (model?.group.visible && framedKey) {
        const box = boundsFor(framedKey);
        if (box) placeCamera(box, { structureKey: framedKey });
      }
      invalidate();
    }
  }

  function contextLostHandler(event) {
    event.preventDefault();
    contextLost = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    status('context-lost', 'Grafische context verloren. Gebruik zo nodig de structuurlijst.');
    notify(onError, new Error('WebGL-context verloren.'));
  }
  function contextRestoredHandler() {
    if (disposed) return;
    contextLost = false;
    resize();
    invalidate();
    const restoredPhase = pendingController ? 'loading' : model?.group.visible ? 'ready' : 'error';
    status(restoredPhase, 'Grafische context hersteld.', { metrics: true });
  }
  // A tap can start OrbitControls without changing the camera. Transition to
  // free view only on actual, non-programmatic camera changes.
  const changedOrbit = () => {
    if (!applyingCamera) { atBodyFit = false; framedKey = null; viewDirection = 'free'; }
    invalidate();
  };
  controls.addEventListener('change', changedOrbit);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('lostpointercapture', pointerCancel);
  canvas.addEventListener('webglcontextlost', contextLostHandler);
  canvas.addEventListener('webglcontextrestored', contextRestoredHandler);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  observer?.observe(host);
  window.addEventListener('resize', resize);

  function dispose() {
    if (disposed) return;
    disposed = true;
    revision += 1;
    pendingController?.abort();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    observer?.disconnect();
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel);
    canvas.removeEventListener('lostpointercapture', pointerCancel);
    canvas.removeEventListener('webglcontextlost', contextLostHandler);
    canvas.removeEventListener('webglcontextrestored', contextRestoredHandler);
    controls.removeEventListener('change', changedOrbit);
    controls.dispose();
    clearModel();
    renderer.dispose();
    canvas.remove();
  }

  resize();
  invalidate();
  status('idle', '3D-viewer gereed om een model te laden.');
  return { load, setVisibleSystems, select, isolate, focus, fit, setView, reset, dispose, getMetrics };
}
