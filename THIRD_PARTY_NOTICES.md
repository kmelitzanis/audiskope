# Third-party software

Audiskope's own code and artwork are GPL-3.0-only. Dependencies keep their own licenses.

| Component | Role | License / source |
| --- | --- | --- |
| FFmpeg / FFprobe 8.0.1 | Separate audio decoding/metadata executables | LGPL-2.1-or-later; https://ffmpeg.org/releases/ffmpeg-8.0.1.tar.xz |
| Electron | Desktop runtime including Chromium and Node.js | MIT plus bundled component licenses; https://github.com/electron/electron |
| TypeScript | Build compiler, not shipped | Apache-2.0; https://github.com/microsoft/TypeScript |
| electron-builder | Packaging, not shipped | MIT; https://github.com/electron-userland/electron-builder |
| @types/node | Development types, not shipped | MIT; https://github.com/DefinitelyTyped/DefinitelyTyped |
| Pillow | Optional icon generation, not shipped | HPND; https://github.com/python-pillow/Pillow |

FFmpeg and FFprobe are built from the pinned, unmodified official archive by `scripts/build-audio.sh`. Autodetection, external libraries, GPL, version3 and nonfree components are disabled. Only the selected built-in audio formats, local file/pipe protocols and test encoders are enabled. The application invokes the tools as separate processes. No FFmpeg static-binary npm installer is used.

Every target's generated notice archive includes the exact FFmpeg source tarball, source SHA-256, LGPL text, upstream licensing summary, configure flags/log, compiler version, build script, and binary hashes/version/license output. These are also included under the installed application's `resources/licenses/third-party/ffmpeg-source`. See DEPLOYMENT.md for source rebuild instructions. FFmpeg can be rebuilt and replaced in `resources/audio-tools`; no application-level hash lock is imposed on replacement tools.

Electron's LICENSE and LICENSES.chromium.html are preserved. The generated npm inventory also lists development tooling; such entries do not imply those packages are shipped as runtime code. Audiskope has no production npm dependencies. Generated notices are not a substitute for reviewing dependency changes.

The licensing configuration requires no purchased software license. This is not a legal warranty or a determination of patent rights in every jurisdiction. See https://ffmpeg.org/legal.html.

Spek, Serato DJ and rekordbox were visual references. Their logos, screenshots and source code are not included as application assets; no affiliation or endorsement is claimed.

Secret scanning uses Gitleaks 8.30.1 (MIT), https://github.com/gitleaks/gitleaks, as CI tooling only; it is not bundled with the application.
