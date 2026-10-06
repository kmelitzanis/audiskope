// Capture the installed dependency tree and original license texts for this target.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'third-party');
fs.rmSync(out, {recursive:true, force:true}); fs.mkdirSync(out, {recursive:true});
const rows=[];
function scan(dir) {
 if (!fs.existsSync(dir)) return;
 for (const entry of fs.readdirSync(dir)) {
  if (entry.startsWith('.')) continue;
  const loc=path.join(dir,entry);
  if (entry.startsWith('@')) {scan(loc); continue;}
  const manifest=path.join(loc,'package.json');
  if (!fs.existsSync(manifest)) continue;
  const p=JSON.parse(fs.readFileSync(manifest,'utf8'));
  const id=p.name.replace(/[^a-zA-Z0-9._-]/g,'_')+'-'+p.version;
  const texts=fs.readdirSync(loc).filter(n=>/^(licen[cs]e|copying|notice)([.-]|$)/i.test(n) && fs.statSync(path.join(loc,n)).isFile());
  for(const n of texts) {fs.mkdirSync(path.join(out,id),{recursive:true});fs.copyFileSync(path.join(loc,n),path.join(out,id,n));}
  rows.push({name:p.name,version:p.version,license:p.license||'UNDECLARED',repository:p.repository||p.homepage||null,licenseFiles:texts.map(n=>id+'/'+n)});
  scan(path.join(loc,'node_modules'));
 }
}
scan(path.join(root,'node_modules'));
// Electron 44+ downloads its binary on first use; resolving it fills node_modules/electron/dist.
require('electron');
for (const file of ['LICENSE','LICENSES.chromium.html']) fs.copyFileSync(path.join(root,'node_modules/electron/dist',file),path.join(out,'Electron-'+file));
const binaries={};
for(const [name,binary] of [['ffmpeg',require('../dist/main/nativePaths').nativeTool('ffmpeg')],['ffprobe',require('../dist/main/nativePaths').nativeTool('ffprobe')]]) {
 const version=cp.execFileSync(binary,['-version'],{encoding:'utf8'});
 const license=cp.execFileSync(binary,['-L'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 const hash=crypto.createHash('sha256').update(fs.readFileSync(binary)).digest('hex');
 binaries[name]={sha256:hash,version,license};
 fs.writeFileSync(path.join(out,name+'-license.txt'),license);
}
fs.cpSync(path.join(root,'native',process.platform+'-'+process.arch,'compliance'),path.join(out,'ffmpeg-source'),{recursive:true});
fs.writeFileSync(path.join(out,'inventory.json'),JSON.stringify({platform:process.platform,arch:process.arch,packages:rows.sort((a,b)=>a.name.localeCompare(b.name)),binaries},null,2)+'\n');
fs.writeFileSync(path.join(out,'README.md'),'# Generated third-party inventory\n\nIncludes installed development tooling as well as runtime dependencies. Original license texts are copied without modification. Missing licenseFiles means the npm archive does not supply a top-level license file; consult its upstream repository before redistribution. Binary version/configuration and SHA-256 are recorded in inventory.json. This inventory is not a corresponding-source archive.\n');
console.log(`Captured ${rows.length} package records, Electron notices and native binary licenses.`);

if (process.argv.includes('--check-release')) {
 for (const b of Object.values(binaries)) if (!/Lesser General Public/.test(b.license)) throw new Error('Expected LGPL native tools');
 const blocked=Object.entries(binaries).filter(([,b])=>/--enable-(?:nonfree|gpl|version3)|not legally redistributable/i.test(b.license+' '+b.version));
 if (blocked.length) {console.error('Release blocked: non-redistributable native binary: '+blocked.map(([n])=>n).join(', ')+'. Replace it with a redistributable build and provide matching corresponding source. See DEPLOYMENT.md.');process.exitCode=1;}
}
