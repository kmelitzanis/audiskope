'use strict';
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Re-sign macOS bundles ad-hoc after packaging.
 *
 * electron-builder renames the Electron executable and adds resources, which
 * invalidates the linker ad-hoc signature the downloaded Electron ships with.
 * macOS on Apple Silicon refuses to launch a bundle whose signature is invalid
 * and reports it as damaged, so the bundle must be sealed again.
 *
 * This is not a substitute for Developer ID signing and notarization. It only
 * produces a valid signature; a downloaded build still carries the quarantine
 * attribute and Gatekeeper still blocks it until the user allows it.
 */
exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const app = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );
  const sign = (target, extra = []) =>
    execFileSync(
      'codesign',
      ['--force', '--timestamp=none', '--sign', '-', ...extra, target],
      { stdio: 'inherit' }
    );

  // The bundled decoders are separate Mach-O executables; seal them before the
  // enclosing bundle so the outer signature covers valid nested code.
  const tools = path.join(app, 'Contents/Resources/audio-tools');
  if (fs.existsSync(tools))
    for (const entry of fs.readdirSync(tools)) sign(path.join(tools, entry));

  sign(app, ['--deep', '--identifier', context.packager.appInfo.id]);
  console.log(`  • ad-hoc signed ${path.basename(app)}`);
};
