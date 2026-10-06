import type { SpectrogramData } from '../types';

/** Bounds time resolution so the result fits in a GPU texture. */
const MAX_FRAMES = 4096;

/**
 * Hann-windowed magnitude spectrogram covering all of `samples`. Each bin maps
 * −100…0 dBFS to 0…1. Every frame is a view into one buffer, so the whole
 * result can be transferred between threads without copying.
 */
export function computeSpectrogram(samples: Float32Array, fftSize: number): SpectrogramData {
  if (!Number.isInteger(fftSize) || fftSize < 2 || (fftSize & (fftSize - 1)) !== 0)
    throw new RangeError('FFT size must be a power of two.');
  const numFrames = Math.min(MAX_FRAMES, Math.max(1, Math.ceil(samples.length / (fftSize / 4))));
  const bufferLength = fftSize / 2;
  const values = new Float32Array(numFrames * bufferLength);
  const frames: Float32Array[] = [];
  const window = new Float32Array(fftSize);
  let windowSum = 0;
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    windowSum += window[i];
  }
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  for (let frame = 0; frame < numFrames; frame++) {
    const start = numFrames === 1 ? 0 : Math.round(frame * Math.max(0, samples.length - fftSize) / (numFrames - 1));
    for (let n = 0; n < fftSize; n++) {
      real[n] = (samples[start + n] || 0) * window[n];
      imag[n] = 0;
    }
    // In-place radix-2 FFT.
    for (let i = 1, j = 0; i < fftSize; i++) {
      let bit = fftSize >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { const t = real[i]; real[i] = real[j]; real[j] = t; }
    }
    for (let size = 2; size <= fftSize; size *= 2) {
      const angle = -2 * Math.PI / size;
      const wr = Math.cos(angle), wi = Math.sin(angle);
      for (let base = 0; base < fftSize; base += size) {
        let ur = 1, ui = 0;
        for (let j = 0; j < size / 2; j++) {
          const even = base + j, odd = even + size / 2;
          const tr = ur * real[odd] - ui * imag[odd];
          const ti = ur * imag[odd] + ui * real[odd];
          real[odd] = real[even] - tr; imag[odd] = imag[even] - ti;
          real[even] += tr; imag[even] += ti;
          const next = ur * wr - ui * wi; ui = ur * wi + ui * wr; ur = next;
        }
      }
    }
    const spectrum = values.subarray(frame * bufferLength, (frame + 1) * bufferLength);
    for (let k = 0; k < bufferLength; k++) {
      const amplitude = Math.hypot(real[k], imag[k]) * (k === 0 ? 1 : 2) / windowSum;
      spectrum[k] = Math.max(0, Math.min(1, (20 * Math.log10(Math.max(1e-10, amplitude)) + 100) / 100));
    }
    frames.push(spectrum);
  }
  return { frames, numFrames, bufferLength };
}
