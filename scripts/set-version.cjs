const fs=require('node:fs');
const {releaseVersion}=require('./release-version.cjs');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.version=process.argv[2];
releaseVersion(pkg);
fs.writeFileSync('package.json',JSON.stringify(pkg,null,2)+'\n');
console.log('Version set to '+pkg.version);
