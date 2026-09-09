# Release preparation

## Current binary blocker

The macOS arm64 FFmpeg executable installed during preparation reports: “This version of ffmpeg has nonfree parts compiled in. Therefore it is not legally redistributable.” Do not distribute the current local package. Replace that executable through a reproducible dependency/build change with a redistributable build, then regenerate notices and supply matching sources. `npm run release:check` rejects binaries reporting nonfree components; all normal packaging commands run it first. Passing this check is not proof of full license compliance.

## Local verification

Use Node 22+ with the target architecture. Run `npm ci`, `npm run build`, `npm run typecheck`, `npm run test:native`, and `npm run test:ui` on a machine with a display. Test drag/drop, playback, A/B, PNG export and settings persistence manually in the packaged app too.

`npm run build:app` builds the current target and generates third-party notices. Explicit commands are `build:mac`, `build:win`, and `build:linux`; artifacts go into `release/`. Desktop icon assets are configured already. No command automatically publishes a release. Build natively for each OS/architecture; do not reuse another platform's node_modules.

## Before publishing binaries

- Set the intended version in package.json and package-lock.json; update CHANGELOG.md.
- Review `third-party/inventory.json` from every target. Record the bundled FFmpeg/FFprobe hashes and configuration; inspect dependencies whose license text is absent from the npm archive.
- Obtain and archive exact corresponding source for shipped FFmpeg/FFprobe binaries, their enabled libraries, patches and build scripts. Installer projects identify their binary suppliers; verify the source matches each recorded binary. Supply required Electron/component sources as applicable. Publish source materials beside the matching binary downloads, as required by their licenses. This repository does not yet contain those binary-source archives.
- Include Audiskope source for the release tag and retain LICENSE and third-party notices in the package.
- Review dependencies for known vulnerabilities before release, and test any updates. This preparation does not claim a security audit.
- Sign/notarize macOS releases and sign Windows installers using your own credentials. Unsigned local packages are for testing; signing credentials are never committed.
- Smoke-test the actual installer on every advertised OS/architecture. Check native decoder execution and licenses under the installed resources directory.
- Create a GitHub release with the tested artifacts, matching sources, SHA-256 checksums, change notes and supported platforms. Publishing is a separate maintainer action.

The CI workflow checks source builds and native decoding across desktop platforms. It does not publish binaries or claim that signing, installer testing or corresponding-source preparation has been completed.

Licensing references: [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.html), [FFmpeg](https://ffmpeg.org/legal.html).
