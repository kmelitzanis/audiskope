import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeWaveformBands } from '../../dist/renderer/utils/waveformBands.js';

const RATE = 48000;
const sine = (hz, length = RATE) => Float32Array.from({ length }, (_, i) => 0.5 * Math.sin(2 * Math.PI * hz * i / RATE));
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

test('routes energy to the band containing the tone', () => {
  const bass = computeWaveformBands(sine(60), RATE);
  assert.ok(mean(bass.low) > 5 * mean(bass.high), 'a 60 Hz tone is mostly low band');
  const treble = computeWaveformBands(sine(9000), RATE);
  assert.ok(mean(treble.high) > 5 * mean(treble.low), 'a 9 kHz tone is mostly high band');
});

test('returns at most 4096 points per band', () => {
  assert.equal(computeWaveformBands(sine(440), RATE).low.length, 4096);
  const short = computeWaveformBands(sine(440, 1000), RATE);
  assert.deepEqual([short.low.length, short.mid.length, short.high.length], [1000, 1000, 1000]);
  assert.equal(computeWaveformBands(new Float32Array(0), RATE).low.length, 0);
});
