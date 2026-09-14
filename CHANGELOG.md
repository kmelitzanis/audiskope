# Changelog

## 1.1.0

First public release.

### Analysis

- Renders a GPU-accelerated spectrogram via WebGL, with FFT sizes from 512 to 8192 and a Hann window.
- Computes up to 4096 time columns per file; zoom enlarges the existing analysis.
- Stores spectrum intensity in a 16-bit texture with interpolation, while cursor readings use the nearest original FFT sample.
- Displays frequency on a linear scale.
- Analyzes channel 1; playback preserves all channels.

### Palettes and waveform

- Offers three palettes: Tri-band, Ice and Fire.
- Maps Tri-band intensity smoothly from blue through amber to white, rather than dividing frequency into solid zones.
- Colors the player waveform from the same palette function as the spectrogram shader, so its three nested layers follow the selected palette.
- Draws the level ramp and the PNG legend from that same palette function, keeping every surface consistent with the rendered spectrum.

### Navigation

- Scroll zooms time, Shift+scroll zooms frequency, drag pans and Fit resets the view.
- Reads time, frequency and level under the cursor.

### A/B comparison

- Compares two files in A and B slots behind a Compare 2 files control.
- Switches audible sources at the same absolute playback time.
- Shows both spectrograms in split view, sharing time, frequency, palette and FFT controls.
- Marks shorter files and frequencies above their Nyquist limit as no data.

### Playback

- Plays audio and seeks from the waveform overview.
- Provides transport controls with a timeline and precise time readout.

### Files and metadata

- Decodes audio locally with a bundled FFmpeg build at the file's original sample rate, leaving source files untouched.
- Covers WAV, AIFF, FLAC, ALAC, MP3 and AAC with generated-file regression checks, and accepts OGG/Opus, WebM, CAF, WMA, APE, WavPack and MP4 audio subject to codec validity.
- Reports codec, bitrate, bit depth where meaningful, original sample rate and channel count from FFprobe, marking container-average bitrates explicitly.
- Applies a 256 MB decoded-PCM limit and a two-minute decode timeout per file.
- Opens files through the picker or native drag and drop, including dropping onto an A/B slot or dropping two files to fill both.

### Output and preferences

- Exports the visible analysis as a PNG, including the current single or split view, its axes and a palette legend.
- Saves FFT size and palette locally between sessions.

### Interface

- Presents a minimal dark interface with centered blue Audiskope branding.
- Adapts to narrow windows.
- Ships desktop, mobile and web icon assets.

### Packaging and licensing

- Builds pinned FFmpeg and FFprobe from official source using only built-in LGPL audio components, and ships that source, configuration and license texts with each release.
- Publishes GPL-3.0-only project metadata with generated third-party notices.
- Packages Linux AppImage and DEB, macOS arm64 and Intel x64 DMGs, and a Windows x64 EXE installer through desktop CI, with per-target notices, a project source archive and SHA-256 checksums.
