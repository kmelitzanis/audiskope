const fs = require('node:fs');
const path = require('node:path');

/** Returns the body of the `## <version>` section of a changelog. */
function releaseNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const heading = /^##\s+\[?v?([^\]\s]+)\]?/;
  const start = lines.findIndex(line => heading.exec(line)?.[1] === version);
  if (start < 0) throw new Error(`CHANGELOG.md has no "## ${version}" section. Add one before releasing.`);
  const next = lines.findIndex((line, i) => i > start && /^##\s/.test(line));
  const notes = lines.slice(start + 1, next < 0 ? lines.length : next).join('\n').trim();
  if (!notes) throw new Error(`The CHANGELOG.md section for ${version} is empty.`);
  return notes + '\n';
}

module.exports = {releaseNotes};

// Usage: node scripts/release-notes.cjs [version]; defaults to package.json's version.
if (require.main === module) {
  const root = path.join(__dirname, '..');
  const version = process.argv[2] || JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  process.stdout.write(releaseNotes(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), version));
}
