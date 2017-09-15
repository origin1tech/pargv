const fs = require('fs-extra');

fs.copySync('./tmpdocs', './docs');
fs.removeSync('./tmpdocs');
