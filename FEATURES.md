Comparison controls appear only after clicking Compare 2 files next to Save image. Two loaded files always use split view. Exit comparison returns to one file; dropping multiple files in single-file mode loads only the first.

# Audio analysis and A/B comparison

- Open a file into the selected A or B slot. Load B adds a comparison file; Open file replaces the selected slot. Drop onto an A/B button to target that slot, or drop two files together to fill both.
- A/B switches audible sources at the same absolute playback time. Split view shows the selected source above the other source. Both plots share time, frequency, palette and FFT controls; shorter files and frequencies above their Nyquist limit are shown as no data. There is no automatic alignment of leading silence, loudness normalization or time stretching.
- Source metadata comes from FFprobe: codec, bitrate, bit depth when meaningful, original sample rate and channel count. A container-average bitrate is explicitly marked. Lossy formats show bit depth N/A.
- Bundled FFmpeg decodes audio to float PCM at its original sample rate. WAV, AIFF, ALAC, FLAC, MP3 and AAC have synthetic-file regression checks. The picker also accepts OGG/Opus, WebM, CAF, WMA, APE and WavPack; support depends on codec/stream validity. Encrypted/DRM audio is not supported. Files are never modified.
- The decoder has a 256 MB decoded-PCM limit per file and a two-minute timeout. Both tracks stay in memory. Spectra currently analyze channel 1; playback preserves all channels.
- Three palettes are available: Tri-band, Ice and Fire. Tri-band maps intensity smoothly from blue to amber to white, rather than dividing frequency into solid zones. The player's waveform, the level ramp and the PNG legend all sample the same palette function as the spectrogram shader, so the waveform's three nested layers are colored by the selected palette. Spectrum intensity uses a 16-bit texture with interpolation; cursor readings use the nearest original FFT sample. Up to 4096 time columns are computed; zoom does not add new FFT resolution.
- Scroll zooms time, Shift+scroll zooms frequency, drag pans, Fit resets. Frequency is always displayed on a linear scale. PNG export includes the current single/split view and its visible axes.
- FFT size and palette are saved locally. Files are not reopened automatically.

## Development and packaging

Install with Node 22+ matching the target architecture. Run `pnpm install --frozen-lockfile` and `pnpm run build:audio` with the platform prerequisites in DEPLOYMENT.md. FFmpeg/FFprobe are built from official source using only built-in LGPL audio components. The resulting native executables are packaged under resources/audio-tools; source and license materials accompany each release.

Run `pnpm run build`, `pnpm exec tsc --noEmit -p tsconfig.json`, `node tests/native.cjs`, and `pnpm exec electron tests/ui.cjs`. Native tests generate short synthetic audio fixtures locally. UI tests exercise metadata, A/B switching, shared FFT/zoom, PNG export, ALAC drop, invalid replacement, and narrow-window layout. Generated fixtures, profiles and screenshots are ignored by Git.
