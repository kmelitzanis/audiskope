const {test} = require('node:test');
const assert = require('node:assert/strict');
const {releaseVersion} = require('../scripts/release-version.cjs');
test('stable and prerelease versions', () => {
  assert.deepEqual(releaseVersion({version:'1.2.3'}, {version:'1.2.3'}), {version:'1.2.3',tag:'v1.2.3',prerelease:false});
  assert.equal(releaseVersion({version:'2.0.0-beta.1'}, {version:'2.0.0-beta.1',packages:{'':{version:'2.0.0-beta.1'}}}).prerelease, true);
});
test('invalid versions cannot publish', () => {
  for (const version of ['v1.0.0','01.0.0','1.0','1.0.0-01','1.0.0; echo bad','1.0.0+build','']) assert.throws(() => releaseVersion({version},{version}));
});
