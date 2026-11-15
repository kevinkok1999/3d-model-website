import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMERA_PRESETS, getViewDirection, cameraOffsetForView } from '../src/camera-presets.js';

test('anatomical view presets preserve reference model axis orientation', () => {
  // Camera locations relative to a target. Both the source GLB convention and
  // the catalog anchor signs identify anatomical left as positive X.
  assert.deepEqual(CAMERA_PRESETS, ['front', 'back', 'left', 'right']);
  assert.deepEqual(getViewDirection('front'), [0, 0, 1]);
  assert.deepEqual(getViewDirection('back'), [0, 0, -1]);
  assert.deepEqual(getViewDirection('left'), [1, 0, 0]);
  assert.deepEqual(getViewDirection('right'), [-1, 0, 0]);
  for (const preset of CAMERA_PRESETS) {
    const direction = getViewDirection(preset);
    assert.ok(direction.every(Number.isFinite));
    assert.equal(Math.hypot(...direction), 1);
    assert.equal(direction[1], 0);
  }
});

test('directions are independent and reject unsupported views', () => {
  const first = getViewDirection('front');
  first[2] = 99;
  assert.deepEqual(getViewDirection('front'), [0, 0, 1]);
  for (const invalid of ['top', 'FRONT', '', null, undefined, {}, '__proto__', 'constructor']) {
    assert.equal(getViewDirection(invalid), null);
  }
});

test('camera preset changes orientation without moving the target or changing zoom distance', () => {
  const position = [3.25, 0.91, -1.5];
  const target = [0.2, 1.25, 0.1];
  const distance = Math.hypot(...position.map((value, i) => value - target[i]));
  const snapshotTarget = [...target];
  for (const preset of CAMERA_PRESETS) {
    const offset = cameraOffsetForView(preset, position, target);
    assert.ok(offset);
    assert.ok(Math.abs(Math.hypot(...offset) - distance) < 1e-12);
    assert.deepEqual(offset.map(x => Math.abs(x) < 1e-12 ? 0 : Math.sign(x)), getViewDirection(preset));
    assert.deepEqual(target, snapshotTarget);
    assert.deepEqual(position, [3.25, 0.91, -1.5]);
  }
});

test('malformed camera inputs and zero distance cannot produce invalid transforms', () => {
  const target = [0, 0, 0];
  for (const invalid of [null, undefined, [], [0, 0], [0, 0, 0], [NaN, 1, 1], [Infinity, 0, 0], ['1', 0, 0]]) {
    assert.equal(cameraOffsetForView('front', invalid, target), null);
  }
  assert.equal(cameraOffsetForView('front', [1, 0, 0], [0, Infinity, 0]), null);
  assert.equal(cameraOffsetForView('unknown', [1, 0, 0], target), null);
});
