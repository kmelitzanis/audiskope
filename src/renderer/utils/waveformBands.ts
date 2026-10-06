/** Three frequency-band RMS envelopes, independent of the spectrogram palette. */
export interface WaveformBands {
  low: Float32Array;
  mid: Float32Array;
  high: Float32Array;
}

/** Splits `samples` into low, mid and high RMS envelopes of at most 4096 points. */
export function computeWaveformBands(samples: Float32Array, sampleRate: number): WaveformBands {
  const count = Math.min(4096, samples.length);
  const low = new Float32Array(count);
  const mid = new Float32Array(count);
  const high = new Float32Array(count);
  // Complementary one-pole crossovers: low <250 Hz, mid 250–2500 Hz,
  // high >2500 Hz, with gradual transitions rather than brick-wall bands.
  const lowCoefficient = 1 - Math.exp(-2 * Math.PI * 250 / sampleRate);
  const upperCoefficient = 1 - Math.exp(-2 * Math.PI * 2500 / sampleRate);
  const bins = new Uint32Array(count);
  let bass = 0, lower = 0;
  for (let i = 0; i < samples.length; i++) {
    bass += lowCoefficient * (samples[i] - bass);
    lower += upperCoefficient * (samples[i] - lower);
    const bin = Math.min(count - 1, Math.floor(i * count / samples.length));
    low[bin] += bass * bass;
    mid[bin] += (lower - bass) ** 2;
    high[bin] += (samples[i] - lower) ** 2;
    bins[bin]++;
  }
  for (let bin = 0; bin < count; bin++) {
    low[bin] = Math.sqrt(low[bin] / Math.max(1, bins[bin]));
    mid[bin] = Math.sqrt(mid[bin] / Math.max(1, bins[bin]));
    high[bin] = Math.sqrt(high[bin] / Math.max(1, bins[bin]));
  }
  return { low, mid, high };
}
