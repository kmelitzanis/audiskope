<p align="center"><img src="assets/icons/app-icon-1024.png" width="112" alt="Audiskope blue equalizer icon"></p>
<h1 align="center">Audiskope</h1>
<p align="center">A minimal desktop spectrogram analyzer for inspecting and comparing audio files.</p>
<p align="center"><a href="LICENSE">GPL-3.0-only</a> · macOS / Windows / Linux · Electron + TypeScript</p>

## What it does

- Inspect a file's spectrogram, with FFT sizes from 512 to 8192 and five palettes: Spectrum, 3Band, Ice, Fire and Mono.
- Switch between linear and logarithmic frequency scales. Zoom, pan and inspect time, frequency and level under the cursor.
- Compare two files in A/B slots with synchronized axes and an optional split view.
- Play audio and seek using the waveform; switch A/B at the same absolute time.
- Read source codec, bitrate, bit depth when applicable, sample rate and channel count using FFprobe.
- Export the visible spectrum as PNG. Remember FFT size, palette and frequency scale between sessions.
- Open files through the picker or drag and drop. Audio is decoded locally; source files are never modified.

## Audio support

WAV, AIFF, FLAC, ALAC (typically in M4A), MP3 and AAC are covered by generated-file regression checks. The picker also accepts OGG/Opus, WebM, CAF, WMA, APE, WavPack and MP4 audio. Actual support depends on the bundled FFmpeg build and the file's codec, not just its extension. DRM-protected files are unsupported.

Analysis currently uses **channel 1**; playback preserves all channels. Each file has a 256 MB decoded-PCM limit and a two-minute decode timeout. Up to 4096 time columns are computed: zoom enlarges the existing analysis. Cursor levels use the nearest FFT sample. A/B comparison does not align leading silence or normalize loudness. See [analysis details](FEATURES.md).

## Run from source

Use **Node.js 22 or later** and npm, matching your machine architecture (arm64 on Apple Silicon). Installation downloads Electron and platform-specific FFmpeg/FFprobe executables and requires internet access.

```sh
git clone https://github.com/kmelitzanis/audiskope.git
cd audiskope
npm ci
npm start
```

This is a desktop Electron application. iOS and Android icon assets are included for future use; mobile applications are not implemented.

## Controls

1. Open a file, or drop it into the app. Load B to compare another file; dropping two files fills both slots.
2. Choose an FFT size, palette and frequency scale.
3. Scroll over the spectrum to zoom time, Shift+scroll to zoom frequency, and drag to pan. Fit resets the view.
4. Select A or B to change the audible source. Split view displays both spectrograms.
5. Use the player controls to listen and the PNG export action to save the visible analysis.

## Binary release status

Source preparation is available, but the currently installed macOS FFmpeg binary reports nonfree components. Packaging is guarded against releasing it. A redistributable FFmpeg build and matching source materials are required before binary publication; see [release instructions](DEPLOYMENT.md).

## Development and packaging

```sh
npm run build          # Compile application code
npm run typecheck      # Check TypeScript
npm run test:native    # Generate and decode audio fixtures
npm run test:ui        # Electron UI regression checks (requires a display)
npm run build:app      # Package for the current platform; output in release/
```

Platform commands: `npm run build:mac`, `npm run build:win`, `npm run build:linux`. Build on each target OS with matching architecture dependencies. Packaged installers and signing need target-specific verification. See [release instructions](DEPLOYMENT.md), [contributing](CONTRIBUTING.md), and [icon assets](assets/icons/README.md).

## License and credits

Copyright (C) 2026 Audiskope contributors. Audiskope is free software licensed under **GNU GPL version 3 only**, without warranty. You may redistribute and modify it under those terms; see [LICENSE](LICENSE).

Electron, FFmpeg, FFprobe and other dependencies retain their own licenses. See [third-party notices](THIRD_PARTY_NOTICES.md). Binary releases must include the applicable notices and corresponding source materials described in the release instructions.

## Automatic GitHub releases

Push a new `package.json` version to `main` to trigger `.github/workflows/release.yml`. It builds Ubuntu x64 (AppImage and DEB), macOS arm64 and Intel x64 (separate DMGs), and Windows x64 (EXE installer). All four build jobs must pass before publication. Existing published versions are skipped; prerelease versions such as `1.2.0-beta.1` become GitHub prereleases.

```sh
npm version 1.1.0 --no-git-tag-version
# Update CHANGELOG.md with the changes, then commit your release changes.
git add package.json package-lock.json CHANGELOG.md
git commit -m "Release 1.1.0"
git push origin main
```

Actions → Release desktop apps → Run workflow can retry the current version on main. The workflow uses GitHub's automatic token; no personal access token secret is needed. Downloads include per-target notices, a project source archive and SHA-256 checksums. Release notes are generated by GitHub from repository changes.

The native-binary redistribution check currently blocks the affected FFmpeg build, so the workflow will not yet publish installers. Matching third-party source preparation is also required before resolving that blocker. Automated packages are unsigned/unnotarized unless signing is subsequently configured.
