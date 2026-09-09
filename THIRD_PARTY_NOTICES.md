# Third-party software

Audiskope's own code and artwork are GPL-3.0-only. Dependencies remain under their respective licenses; they are not relicensed by this project.

| Component | Role | Declared license | Upstream |
| --- | --- | --- | --- |
| Electron | Desktop runtime; Chromium and Node.js | MIT; bundled components have additional notices | https://github.com/electron/electron |
| ffmpeg-static 5.2.0 | FFmpeg binary installer | GPL-3.0-or-later | https://github.com/eugeneware/ffmpeg-static |
| @ffprobe-installer/ffprobe 2.1.2 | FFprobe binary installer | LGPL-2.1 (package declaration) | https://github.com/SavageCore/node-ffprobe-installer |
| FFmpeg / FFprobe | Native decoding and source metadata | Depends on the exact binary configuration; inspect generated license/version records | https://ffmpeg.org |
| TypeScript | Development compiler | Apache-2.0 | https://github.com/microsoft/TypeScript |
| electron-builder | Development packaging tool | MIT | https://github.com/electron-userland/electron-builder |
| @types/node | Development type declarations | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| Pillow | Optional icon generation; not shipped with the app | HPND | https://github.com/python-pillow/Pillow |

Run `npm run licenses` after a clean install on each target OS/architecture. This produces `third-party/inventory.json` with exact installed versions, declared licenses, native binary configurations and hashes, plus copies of available license texts. It includes transitive packages and development tools. The generated directory is included in packaged applications under `resources/licenses/third-party`, together with this notice and Audiskope's GPL text. Electron's own LICENSE and Chromium notices are preserved too.

The npm installer license does not establish the license of its downloaded executable. FFmpeg builds can incorporate GPL libraries. Before distributing binaries, provide the exact corresponding source, dependency sources and build scripts/configuration required for those binaries alongside the download. A generic upstream homepage or npm lockfile is not a replacement for that source bundle. See [FFmpeg's licensing guidance](https://ffmpeg.org/legal.html) and [release preparation](DEPLOYMENT.md).

Design references: Spek, Serato DJ and rekordbox inspired aspects of the interface. No affiliation or endorsement is claimed. Their logos and reference screenshots are not included in the icon assets.
