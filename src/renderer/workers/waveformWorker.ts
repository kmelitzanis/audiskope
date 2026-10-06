import { computeWaveformBands } from '../utils/waveformBands';

// Typed locally: the renderer program uses the DOM lib, not the WebWorker lib.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = ({ data }) => {
  const { low, mid, high } = computeWaveformBands(data.samples, data.sampleRate);
  scope.postMessage({ low, mid, high }, [low.buffer as ArrayBuffer, mid.buffer as ArrayBuffer, high.buffer as ArrayBuffer]);
};
