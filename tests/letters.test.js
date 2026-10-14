import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLetterMotion } from '../letters.js';

test('letter influence is local and fades smoothly to zero at its radius', () => {
  const near = computeLetterMotion(20, 20, 20, 20);
  assert.equal(near.influence, 1);
  assert.equal(near.y, -8);
  assert.equal(near.turn, 0);

  const far = computeLetterMotion(120, 20, 20, 20);
  assert.deepEqual(far, { y: 0, turn: 0, influence: 0 });
  assert.equal(computeLetterMotion(30, 25, 30, 25, 0).influence, 0);
});

test('letter lift and turn stay within the requested bounds', () => {
  for (let y = -150; y <= 150; y += 5) {
    for (let x = -150; x <= 150; x += 5) {
      const motion = computeLetterMotion(x, y, 0, 0);
      assert.ok(motion.y >= -8 && motion.y <= 0);
      assert.ok(Math.abs(motion.turn) <= 4);
      assert.ok(motion.influence >= 0 && motion.influence <= 1);
    }
  }
});

test('turn direction follows horizontal distance from the pointer', () => {
  assert.ok(computeLetterMotion(30, 20, 20, 20).turn > 0);
  assert.ok(computeLetterMotion(10, 20, 20, 20).turn < 0);
  assert.equal(computeLetterMotion(20, 60, 20, 20).turn, 0);
});
