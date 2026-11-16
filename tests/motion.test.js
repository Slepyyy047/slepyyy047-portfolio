import test from 'node:test';
import assert from 'node:assert/strict';
import { getRevealDelay } from '../motion.js';

test('text reveal delays stay short even for long descriptions', () => {
  for (const count of [1, 5, 50, 500]) {
    const delays = Array.from({ length: count }, (_, index) => getRevealDelay(index, count));
    assert.equal(delays[0], 0);
    assert.ok(delays.every((delay, index) => delay >= 0 && delay <= 160 && (!index || delay >= delays[index - 1])));
  }
});
