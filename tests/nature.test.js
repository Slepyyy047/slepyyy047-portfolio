import test from 'node:test';
import assert from 'node:assert/strict';
import { easeNatureValue, getNatureTargets } from '../nature.js';

test('nature parallax targets stay within photo and mist movement limits', () => {
  for (const pointerX of [-2, -1, 0, 1, 2]) {
    for (const pointerY of [-2, -1, 0, 1, 2]) {
      for (const scroll of [-2, -1, 0, 1, 2]) {
        const target = getNatureTargets(pointerX, pointerY, scroll);
        assert.ok(Math.abs(target.x) <= 9);
        assert.ok(Math.abs(target.y) <= 10);
        assert.ok(Math.abs(target.mistX) <= 12);
      }
    }
  }
  assert.deepEqual(getNatureTargets(0, 0, 0), { x: 0, y: 0, mistX: 0 });
  assert.deepEqual(getNatureTargets(-1, 0, 0), { x: -9, y: 0, mistX: 12 });
});

test('easing approaches a target monotonically and settles exactly', () => {
  let value = 0;
  for (let i = 0; i < 200 && value !== 9; i += 1) {
    const next = easeNatureValue(value, 9);
    assert.ok(next >= value && next <= 9);
    value = next;
  }
  assert.equal(value, 9);
  assert.equal(easeNatureValue(4, 4), 4);
});
