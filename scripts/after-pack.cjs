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
  await flipSecurityFuses(context);
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

/**
 * Turn off Electron features the app never uses, so the packaged binary cannot
 * be repurposed as a Node runtime (ELECTRON_RUN_AS_NODE, NODE_OPTIONS,
 * --inspect) and only loads the app from app.asar. File protocol privileges
 * stay on: the renderer loads its modules and workers over file://. This runs
 * before macOS signing, so the signature covers the modified binary.
 */
async function flipSecurityFuses(context) {
  const { flipFuses, FuseVersion, FuseV1Options } = await import('@electron/fuses');
  const { productFilename } = context.packager.appInfo;
  const binary = {
    darwin: `${productFilename}.app`,
    win32: `${productFilename}.exe`,
    linux: context.packager.executableName
  }[context.electronPlatformName];
  await flipFuses(path.join(context.appOutDir, binary), {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: true
  });
  console.log(`  • flipped Electron security fuses in ${binary}`);
}
