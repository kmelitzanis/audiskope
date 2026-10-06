import { computeSpectrogram } from '../utils/spectrogram';

// Typed locally: the renderer program uses the DOM lib, not the WebWorker lib.
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<{ samples: Float32Array; fftSize: number }>) => void) | null;
  postMessage(message: unknown, transfer: Transferable[]): void;
};

scope.onmessage = ({ data }) => {
  const result = computeSpectrogram(data.samples, data.fftSize);
  // Every frame views the same buffer; transfer it instead of copying.
  scope.postMessage(result, [result.frames[0].buffer as ArrayBuffer]);
};
