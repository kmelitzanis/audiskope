# Architecture

- `src/main/main.ts`: Electron lifecycle, native dialogs and IPC.
- `src/main/audioFile.ts`: FFprobe metadata and bounded FFmpeg PCM decoding at the original sample rate.
- `src/main/preload.ts`: isolated renderer bridge, including native drop paths.
- `src/renderer/renderer.ts`: controls, playback, A/B state and persisted preferences.
- `src/renderer/utils/fftProcessor.ts`: FFT spectrogram analysis.
- `src/renderer/utils/webglRenderer.ts`: spectrum textures and palettes.
- `src/renderer/utils/spectrumView.ts`: view coordinates and zoom.
- `src/renderer/utils/waveformProcessor.ts`: player waveform data.

TypeScript main-process output and browser modules compile into dist. HTML and CSS are packaged from src/renderer. Source-built FFmpeg and FFprobe live under resources/audio-tools outside app.asar. src/main/nativePaths.ts resolves development and packaged paths. Packaging includes generated dependency notices and the application GPL text under resources/licenses.

See [FEATURES](FEATURES.md) for analysis limits and [DEPLOYMENT](DEPLOYMENT.md) for release verification.
