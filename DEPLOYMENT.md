# Builds and releases

## Build the native audio tools

Use Node 22+ matching the machine architecture. The audio tools are built locally from unmodified official FFmpeg 8.0.1 source; no third-party binary installer is used.

- macOS: install Apple's Command Line Tools (`xcode-select --install`).
- Ubuntu: install `build-essential curl xz-utils` using apt.
- Windows x64: install MSYS2, then install `mingw-w64-x86_64-gcc make curl tar xz` in its MINGW64 environment. Run `bash scripts/build-audio.sh` in that shell. Run pnpm commands using Windows Node 22 x64.

```sh
pnpm install --frozen-lockfile
pnpm run build:audio
pnpm run build
pnpm run typecheck
pnpm run test:native
pnpm run test:ui
pnpm run release:check
pnpm run build:app
```

The first native build downloads a checksum-pinned source archive. Outputs are in `native/<platform>-<arch>`; intermediates are in `.native-build/`. Both are ignored by Git. Build again whenever the source pin or flags change. Build each target natively. `pnpm start` expects tools to have been built once.

The build disables autodetection, GPL, version3, nonfree and external codec libraries. Only local audio decoding plus a few built-in encoders for synthetic tests is enabled. No MP3 encoding is shipped; MP3 decoding uses a committed synthetic sample for regression checks. This configuration requires no purchased codec library and relies solely on official-source LGPL builds.

## Corresponding source and notices

Each build produces `compliance/` with the exact source archive, SHA-256, unmodified-source declaration, upstream LICENSE.md, COPYING.LGPLv2.1, compiler information, configuration logs/flags and the build script. `pnpm run licenses` copies these into the generated notices together with binary hashes and Electron's original notices. The source is unmodified (no patches); use the included script from an Audiskope source checkout to reproduce the configuration. System compilers and build tools are prerequisites. Rebuilt FFmpeg/FFprobe executables can replace the files under installed `resources/audio-tools`.

Every release includes `notices-<target>.tar.gz` containing these materials. The complete Audiskope source archive is uploaded too. Preserve these downloads with the installers. The runtime has no production npm package dependencies; development-tool notices in the inventory are informational. No licensing script can certify all legal or patent questions; review future dependencies and configuration changes.

## Automatic releases

Use `pnpm run version:set <version>`, update CHANGELOG.md, commit and push to main. The release workflow builds Ubuntu x64 (AppImage/DEB), macOS arm64 and x64 (DMG), and Windows x64 (EXE). All native builds, tests and release checks must succeed. Each target must supply a source/notices archive. SHA-256 checksums are generated before a draft is populated and published. Existing public versions are skipped; tags are never moved. Prerelease versions become GitHub prereleases. Manual dispatch on main retries failures.

The workflow uses the built-in GITHUB_TOKEN. No paid codec/library account or personal token secret is needed. GitHub Actions usage is subject to your account's plan and quotas. Installers are unsigned/unnotarized: signing and Apple notarization are not configured and can involve separate credentials/costs. Test actual installers on each OS before recommending a release to users.

References: https://ffmpeg.org/legal.html and https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html.
