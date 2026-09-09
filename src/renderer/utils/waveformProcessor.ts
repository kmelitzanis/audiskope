/** Three frequency-band RMS envelopes, independent of the spectrogram palette. */
export interface WaveformBands {
  low: Float32Array;
  mid: Float32Array;
  high: Float32Array;
}

const WAVEFORM_WORKER = `
self.onmessage = ({ data: { samples, sampleRate } }) => {
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
  self.postMessage({ low, mid, high }, [low.buffer, mid.buffer, high.buffer]);
};
`;

export function processWaveform(samples: Float32Array, sampleRate: number): Promise<WaveformBands> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([WAVEFORM_WORKER], { type: 'application/javascript' }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    const cleanup = () => { clearTimeout(timeout); worker.terminate(); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Waveform processing timed out')); }, 60000);
    worker.onmessage = ({ data }) => { cleanup(); resolve(data); };
    worker.onerror = (error) => { cleanup(); reject(error); };
    worker.postMessage({ samples, sampleRate });
  });
}
