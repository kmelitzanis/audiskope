import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frequencyAt, panRange, preciseTime, zoomRange } from '../../dist/renderer/utils/spectrumView.js';
import { rampStops, sampleScheme } from '../../dist/renderer/utils/palette.js';
import { formatTime } from '../../dist/renderer/utils/helpers.js';

test('zoom keeps the anchor fixed and stays within bounds', () => {
  assert.deepEqual(zoomRange(0, 1, 0.5, 2), [0.25, 0.75]);
  assert.deepEqual(zoomRange(0, 1, 0, 2), [0, 0.5]);
  assert.deepEqual(zoomRange(0.25, 0.75, 0.5, 0.1), [0, 1], 'zooming out stops at the full view');
  const [lo, hi] = zoomRange(0, 1, 0.5, 1e6);
  assert.ok(Math.abs(hi - lo - 1 / 64) < 1e-12, 'zooming in stops at 64x');
});

test('pan clamps to the data', () => {
  assert.deepEqual(panRange(0.25, 0.75, 0.5), [0.5, 1]);
  assert.deepEqual(panRange(0.25, 0.75, -1), [0, 0.5]);
});

test('maps plot coordinates and formats times', () => {
  assert.equal(frequencyAt(0, 24000), 24000);
  assert.equal(frequencyAt(1, 24000), 0);
  assert.equal(preciseTime(0), '0:00.000');
  assert.equal(preciseTime(61.2345), '1:01.235');
  assert.equal(formatTime(75.9), '1:15');
});

test('palettes clamp intensity and cover the ramp', () => {
  assert.equal(sampleScheme('fire', 0), 'rgb(0,0,0)');
  assert.equal(sampleScheme('fire', 2), sampleScheme('fire', 1));
  assert.equal(sampleScheme('3band', -1), sampleScheme('3band', 0));
  const stops = rampStops('ice', 8);
  assert.equal(stops.length, 9);
  assert.deepEqual([stops[0].offset, stops[8].offset], [0, 1]);
});
