const path = require('path');
const copy = require('fs-extra').copySync;
const src = path.join(__dirname, '../src/locales');
const dest = path.join(__dirname, '../dist/locales');

copy(src, dest);




