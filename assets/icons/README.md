# Audiskope icons

The six user-supplied PNG exports are preserved unchanged in `variants/`: Default, Dark, TintedDark, TintedLight, ClearDark and ClearLight.

`pnpm run icons` uses Default.png as the master for desktop ICNS/ICO/PNG, web, Android raster icons and the iOS default catalog. It preserves the provided artwork and transparency. Python 3 and Pillow are required only to regenerate the committed exports.

All six supplied appearances are available as separate image sets in `ios/Appearances.xcassets`. These are reusable assets, not automatic desktop theme switching. The desktop application uses Default. The supplied PNGs have their own rounded silhouette; they are preserved as supplied, not claimed to be validated App Store submission assets. Future native iOS releases should use the original Icon Composer project for platform-managed appearances and masks.

Android adaptive foreground uses the new Default artwork inside its safe area; its monochrome vector remains the equalizer symbol. The web manifest uses ordinary icons rather than applying a second adaptive mask. `logo.svg` remains the separate vector brand mark, not the raster app-icon master.
