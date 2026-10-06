import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSpectrogram } from '../../dist/renderer/utils/spectrogram.js';

const RATE = 48000;
const sine = (hz, amplitude, length = RATE) =>
  Float32Array.from({ length }, (_, i) => amplitude * Math.sin(2 * Math.PI * hz * i / RATE));
const peakBin = frame => frame.indexOf(Math.max(...frame));

test('places a bin-centred sine in its bin at its level', () => {
  const fftSize = 1024, bin = 64, hz = bin * RATE / fftSize;
  const full = computeSpectrogram(sine(hz, 1), fftSize);
  const middle = full.frames[full.numFrames >> 1];
  assert.equal(peakBin(middle), bin);
  assert.ok(middle[bin] > 0.99, `0 dBFS maps to 1, got ${middle[bin]}`);
  assert.ok(middle[bin + 40] < 0.3, 'energy stays near the tone');
  const quiet = computeSpectrogram(sine(hz, 0.1), fftSize).frames[full.numFrames >> 1];
  assert.ok(Math.abs(quiet[bin] - 0.8) < 0.01, `-20 dBFS maps to 0.8, got ${quiet[bin]}`);
});

test('shapes frames to cover the signal and share one transferable buffer', () => {
  const result = computeSpectrogram(new Float32Array(RATE), 1024);
  assert.equal(result.bufferLength, 512);
  assert.equal(result.numFrames, Math.ceil(RATE / 256));
  assert.equal(result.frames.length, result.numFrames);
  assert.ok(result.frames.every(frame => frame.length === 512 && frame.buffer === result.frames[0].buffer));
  assert.ok(result.frames.every(frame => frame.every(value => value === 0)), 'silence sits at the -100 dBFS floor');
});

test('caps time columns and handles input shorter than the window', () => {
  assert.equal(computeSpectrogram(new Float32Array(RATE * 60), 512).numFrames, 4096);
  const short = computeSpectrogram(sine(1000, 0.5, 100), 2048);
  assert.equal(short.numFrames, 1);
  assert.ok(short.frames[0].every(Number.isFinite));
});

test('rejects FFT sizes that are not powers of two', () => {
  for (const size of [0, 1, 1000, 2048.5, NaN]) assert.throws(() => computeSpectrogram(new Float32Array(4096), size), RangeError);
});
