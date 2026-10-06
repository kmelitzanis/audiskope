# Contributing

Open an issue describing the problem or proposed change before substantial work. For fixes, include reproduction steps, operating system, app version and a small audio sample you have permission to share. Do not attach private or copyrighted recordings without permission.

Use Node 22+, `pnpm install --frozen-lockfile`, `pnpm run build:audio` (see DEPLOYMENT.md for prerequisites), and `pnpm start`. Before opening a pull request run `pnpm run build`, `pnpm run typecheck`, `pnpm run test:unit`, `pnpm run test:native` and `pnpm run test:ui` (requires a display). Explain observable behavior and validation. Every release needs a `## <version>` section in CHANGELOG.md: it becomes the GitHub release notes, and the release stops early without it. Keep unrelated changes separate.

Original contributions are submitted under GPL-3.0-only. Preserve third-party notices and document new dependencies. Do not commit generated installers, node_modules, credentials or audio fixtures. Icon sources and exported application icons are committed; see assets/icons/README.md.
