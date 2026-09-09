import { SpectrogramData } from '../types';

// FFT Worker - runs in separate thread to prevent UI freezing
const WORKER_CODE = `
self.onmessage = function(e) {
  const { audioData, fftSize } = e.data;
  // Bound time resolution to fit GPU textures, while covering the whole file.
  const numFrames = Math.min(4096, Math.max(1, Math.ceil(audioData.length / (fftSize / 4))));
  const bufferLength = fftSize / 2;
  const frames = [];
  const window = new Float32Array(fftSize);
  let windowSum = 0;
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
    windowSum += window[i];
  }
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  for (let frame = 0; frame < numFrames; frame++) {
    const start = numFrames === 1 ? 0 : Math.round(frame * Math.max(0, audioData.length - fftSize) / (numFrames - 1));
    for (let n = 0; n < fftSize; n++) {
      real[n] = (audioData[start + n] || 0) * window[n];
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
    const spectrum = new Float32Array(bufferLength);
    for (let k = 0; k < bufferLength; k++) {
      const amplitude = Math.hypot(real[k], imag[k]) * (k === 0 ? 1 : 2) / windowSum;
      spectrum[k] = Math.max(0, Math.min(1, (20 * Math.log10(Math.max(1e-10, amplitude)) + 100) / 100));
    }
    frames.push(spectrum);
  }

  self.postMessage({ frames, numFrames, bufferLength });
};
`;

export class FFTProcessor {
  private worker: Worker | null = null;

  constructor() {
    const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));
  }

  process(audioData: Float32Array, fftSize: number): Promise<SpectrogramData> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('FFT processing timeout'));
      }, 60000);

      this.worker.onmessage = (e) => {
        clearTimeout(timeoutId);
        resolve(e.data);
      };

      this.worker.onerror = (e) => {
        clearTimeout(timeoutId);
        reject(e);
      };

      // Send audio data to worker
      this.worker.postMessage({ audioData, fftSize });
    });
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
