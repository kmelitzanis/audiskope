import type { WaveformBands } from './waveformBands';
import { runWorkerJob } from './workerJob';

export type { WaveformBands } from './waveformBands';

/** Computes the overview's band envelopes on a worker thread. */
export function processWaveform(samples: Float32Array, sampleRate: number): Promise<WaveformBands> {
  return runWorkerJob(new URL('../workers/waveformWorker.js', import.meta.url), { samples, sampleRate });
}
