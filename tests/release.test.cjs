const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {releaseVersion} = require('../scripts/release-version.cjs');
const {releaseNotes} = require('../scripts/release-notes.cjs');
test('stable and prerelease versions', () => {
  assert.deepEqual(releaseVersion({version:'1.2.3'}), {version:'1.2.3',tag:'v1.2.3',prerelease:false});
  assert.equal(releaseVersion({version:'2.0.0-beta.1'}).prerelease, true);
});
test('invalid versions cannot publish', () => {
  for (const version of ['v1.0.0','01.0.0','1.0','1.0.0-01','1.0.0; echo bad','1.0.0+build','']) assert.throws(() => releaseVersion({version}));
});
test('release notes are the changelog section for that version', () => {
  const changelog = '# Changelog\n\n## 1.2.0\n\n- New.\n\n### Fixes\n\n- Fixed.\n\n## [1.1.0] - 2026-01-01\n\nFirst.\n';
  assert.equal(releaseNotes(changelog, '1.2.0'), '- New.\n\n### Fixes\n\n- Fixed.\n');
  assert.equal(releaseNotes(changelog, '1.1.0'), 'First.\n');
  assert.equal(releaseNotes(changelog.replace(/\n/g, '\r\n'), '1.1.0'), 'First.\n');
  assert.throws(() => releaseNotes(changelog, '1.2'), /no "## 1.2" section/);
  assert.throws(() => releaseNotes('## 1.0.0\n\n## 0.9.0\n- Old.\n', '1.0.0'), /empty/);
});
test('the current package version has release notes', () => {
  const root = path.join(__dirname, '..');
  const {version} = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(releaseNotes(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), version).length > 0);
});
