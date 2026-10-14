import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWaveState } from '../wave.js';

test('wave starts with every character crisp and fully visible', () => {
  for (let index = 0; index < 40; index += 1) {
    assert.deepEqual(computeWaveState(0, index, 40), {
      progress: 0, y: 0, rotation: 0, blur: 0, opacity: 1,
    });
  }
});

test('wave staggers across characters and stays within visual bounds', () => {
  const count = 30;
  const progress = 0.45;
  const states = Array.from({ length: count }, (_, index) => computeWaveState(progress, index, count));
  assert.ok(states[0].progress > states.at(-1).progress);
  for (const state of states) {
    assert.ok(Math.abs(state.y) <= 32);
    assert.ok(Math.abs(state.rotation) <= 6);
    assert.ok(state.blur >= 0 && state.blur <= 12);
    assert.ok(state.opacity >= 0 && state.opacity <= 1);
  }
});

test('reverse progress restores each character exactly', () => {
  const dissolved = computeWaveState(1, 12, 40);
  const restored = computeWaveState(0, 12, 40);
  assert.ok(dissolved.blur > 0);
  assert.equal(restored.progress, 0);
  assert.equal(restored.y, 0);
  assert.equal(restored.rotation, 0);
  assert.equal(restored.blur, 0);
  assert.equal(restored.opacity, 1);
});
