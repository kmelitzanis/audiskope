import type { SpectrogramData } from '../types';
import { runWorkerJob } from './workerJob';

/** Computes the spectrogram on a worker thread to keep the UI responsive. */
export function analyzeSpectrum(samples: Float32Array, fftSize: number): Promise<SpectrogramData> {
  return runWorkerJob(new URL('../workers/spectrogramWorker.js', import.meta.url), { samples, fftSize });
}
