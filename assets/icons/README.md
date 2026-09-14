# Audiskope icons

The existing blue equalizer mark on charcoal, without text for legibility at small sizes. Original project artwork; GPL-3.0-only.

- `logo.svg`: editable vector reference; `app-icon-1024.png`: opaque master.
- `desktop/`: macOS ICNS, Windows multi-size ICO, Linux PNG sizes; wired into electron-builder.
- `ios/AppIcon.appiconset/`: iPhone/iPad/marketing PNGs and Xcode Contents.json. Drag into an asset catalog.
- `android/res/`: legacy density icons, adaptive foreground/background and Android 13 monochrome layer. Copy into a future Android project's resources and set `android:icon="@mipmap/ic_launcher"`.
- `android/play-store-512.png`: store artwork.
- `web/`: favicon, touch/PWA sizes and a manifest fragment.

Mobile assets do not add mobile application support. iOS icons are opaque and unmasked; the OS supplies corner masks. Android adaptive artwork sits inside the central safe area.

Regenerate raster files with Python 3 and Pillow (`python3 -m pip install Pillow`, then `pnpm run icons`). Geometry is defined in `scripts/generate-icons.py`; keep the SVG and Android vector paths synchronized when changing the mark. Generated files are committed, so normal builds do not require Python.

References: [Apple asset catalogs](https://developer.apple.com/documentation/xcode/configuring-your-app-icon), [Android adaptive icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive).
