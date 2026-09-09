const fs = require('node:fs');
function releaseVersion(pkg, lock) {
  const version = pkg.version;
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/.test(version)) {
    throw new Error('Use a release version such as 1.2.3 or 1.2.3-beta.1 (no build metadata).');
  }
  if (lock.version !== version || (lock.packages?.[''] && lock.packages[''].version !== version)) {
    throw new Error('package.json and package-lock.json versions differ. Use npm version <version> --no-git-tag-version.');
  }
  return {version, tag: `v${version}`, prerelease: version.includes('-')};
}
module.exports = {releaseVersion};
if (require.main === module) console.log(JSON.stringify(releaseVersion(JSON.parse(fs.readFileSync('package.json')), JSON.parse(fs.readFileSync('package-lock.json')))));
