
const path = require('path');
const fs = require('fs-extra');
const pkg = fs.readJSONSync(path.join(__dirname, '../package.json'));
let ver = (pkg.version && pkg.version.split('.')) || [0, 0, 0];

ver = ver.map((v) => { return parseInt(v); });

if (ver[2] < 99)
  ver[2]++;
else
  throw new Error('Cannot bump major or minor versions automatically.');

pkg.version = ver.join('.');
fs.writeJsonSync(path.join(__dirname, '../package.json'), pkg, { spaces: 2 });

console.log(`Bumped ${pkg.name} to version ${pkg.version}.`);