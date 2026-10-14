import test from 'node:test';
import assert from 'node:assert/strict';
import { getSliceOffset } from '../wordmark.js';

test('slice influence stays local to the pointer neighborhood', () => {
  const leftPointer = { x: 20, y: 24 };
  const left = getSliceOffset(24, 30, leftPointer.x, leftPointer.y);
  const middle = getSliceOffset(120, 30, leftPointer.x, leftPointer.y);
  const right = getSliceOffset(220, 30, leftPointer.x, leftPointer.y);
  assert.notEqual(left, 0);
  assert.equal(middle, 0);
  assert.equal(right, 0);

  assert.notEqual(getSliceOffset(120, 30, 120, 24), 0);
  assert.equal(getSliceOffset(24, 30, 220, 24), 0);
});

test('slice displacement is smoothly bounded and returns to zero at the radius', () => {
  for (let y = 0; y < 140; y += 3) {
    for (let x = 0; x < 140; x += 3) {
      const offset = getSliceOffset(x, y, 70, 70);
      assert.ok(Math.abs(offset) <= 8);
    }
  }
  assert.equal(getSliceOffset(70 + 70, 70, 70, 70), 0);
  assert.equal(getSliceOffset(80, 90, 80, 90), 0);
});
