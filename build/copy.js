const fs = require('fs');

function copy(src, dest) {
  if (!fs.existsSync(src))
    return;
  fs.writeFileSync(dest, fs.readFileSync(src, 'utf-8'));
}

const copies = [
  '../src/completions.sh.tpl,../dist/completions.sh.tpl'
];

copies.forEach((p) => {
  const split = p.split(',');
  copy(split[0], split[1]);
});