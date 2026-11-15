/**
 * Reference-model camera axes, expressed as camera offset from the target.
 * glTF is +Y up / +Z forward. The pinned catalog's left anchors are positive X,
 * right anchors negative X. 'Left' therefore means viewing the reference
 * model's left side, not moving the camera toward the viewer's screen-left.
 * These presets are technical orientation aids, not anatomical validation.
 */
export const CAMERA_PRESETS = Object.freeze(['front', 'back', 'left', 'right']);
const directions = new Map([
  ['front', [0, 0, 1]], ['back', [0, 0, -1]],
  ['left', [1, 0, 0]], ['right', [-1, 0, 0]],
]);

export function getViewDirection(view) {
  const direction = directions.get(view);
  return direction ? [...direction] : null;
}

const finiteVector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);

/** Returns a new offset in the selected direction with the same target distance. */
export function cameraOffsetForView(view, cameraPosition, target) {
  const direction = getViewDirection(view);
  if (!direction || !finiteVector(cameraPosition) || !finiteVector(target)) return null;
  const delta = cameraPosition.map((value, index) => value - target[index]);
  const distance = Math.hypot(...delta);
  if (!Number.isFinite(distance) || distance <= 1e-8) return null;
  return direction.map(component => component * distance);
}
