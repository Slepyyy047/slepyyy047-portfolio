import test from 'node:test';
import assert from 'node:assert/strict';
import { getWaveTarget, computeWaveState, advanceWaveProgress, WAVE_DURATION_MS } from '../wave.js';
import { getRevealDelay } from '../motion.js';

test('one small scroll targets the complete hero wave without accumulating more scroll', () => {
  assert.equal(getWaveTarget(0), 0);
  assert.equal(getWaveTarget(6), 0);
  for (const offset of [7, 20, 40, 100, 600]) {
    const progress = getWaveTarget(offset);
    for (let index = 0; index < 40; index++) assert.equal(computeWaveState(progress, index, 40).opacity, 0);
  }
  assert.equal(getWaveTarget(-25), 0);
  assert.equal(getWaveTarget(NaN), 0);
});

test('wave keeps its full duration independently of frame rate or scroll distance', () => {
  for (const fps of [30, 60, 120]) {
    const frameTime = 1000 / fps;
    const target = getWaveTarget(40);
    let progress = 0;
    let elapsed = 0;
    while (elapsed + frameTime <= WAVE_DURATION_MS / 2) {
      progress = advanceWaveProgress(progress, target, frameTime);
      elapsed += frameTime;
    }
    assert.ok(progress > 0.45 && progress <= 0.5 + 1e-10, `midpoint at ${fps} fps`);
    assert.ok(computeWaveState(progress, 39, 40).opacity > 0, 'last letters remain visible halfway through');
    progress = advanceWaveProgress(progress, target, WAVE_DURATION_MS - elapsed + 1);
    assert.equal(progress, 1);
    for (let index = 0; index < 40; index++) assert.equal(computeWaveState(progress, index, 40).opacity, 0);
  }
});

test('wave can reverse mid-flight and clamps at both endpoints', () => {
  const partial = advanceWaveProgress(0, 1, WAVE_DURATION_MS * 0.6);
  assert.equal(partial, 0.6);
  assert.ok(Math.abs(advanceWaveProgress(partial, 0, WAVE_DURATION_MS * 0.2) - 0.4) < 1e-12);
  assert.equal(advanceWaveProgress(partial, 0, WAVE_DURATION_MS), 0);
  assert.equal(advanceWaveProgress(0, 1, WAVE_DURATION_MS * 2), 1);
  for (const invalid of [-10, NaN, Infinity]) assert.equal(advanceWaveProgress(partial, 1, invalid), partial);
});

test('text reveal delays stay short even for long descriptions', () => {
  for (const count of [1, 5, 50, 500]) {
    const delays = Array.from({length:count},(_,index)=>getRevealDelay(index,count));
    assert.equal(delays[0], 0);
    assert.ok(delays.every((delay,index)=>delay >= 0 && delay <= 160 && (!index || delay >= delays[index-1])));
  }
});
