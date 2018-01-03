const fs = require('fs');
const path = require('path');
const translate = require('@google-cloud/translate');
const API_KEY = require('./apikey'); //
const TOKEN_EXP = /(%s|%d|\$\$|##)/g;

module.exports = (log) => {

  if (!API_KEY) // Api key not pushed to repo must provide own.
    throw new Error('Cannot run translate with Google Translate API Key of undefined.');

  const argv = process.argv.slice(3);
  let langs = 'es,fr,hi,it,ja,ru,zh_CN,zh_TW'

  let localePath = path.join(__dirname, '../locales/en.json');
  const parsedPath = path.parse(localePath);
  const baseDir = parsedPath.dir;
  const normalized = [];
  const indexes = {};
  let ctr = 0;

  if (!langs) throw new Error('Translate requires a language(s).');

  langs = langs.split(',');

  // Load base locales.
  if (!fs.existsSync(localePath))
    throw new Error('Base locales path not found...exiting.');

  let locales = JSON.parse(fs.readFileSync(localePath));

  // Connect to the API
  // @see https://googlecloudplatform.github.io/google-cloud-node/#/docs/translate/1.0.0/translate
  const trans = translate({
    key: API_KEY
  });

  function replaceTokens(str, revert) {
    return str.replace(TOKEN_EXP, (v) => {
      if (revert) {
        if (v === '$$')
          return '%s';
        return '%d'
      } else {
        if (v === '%s')
          return '$$';
        return '##'
      }
    });
  }

  for (k in locales) {
    const replaced = replaceTokens(locales[k])
    normalized.push(replaced);
    indexes[ctr] = k; // maps index in arr to key.
    ctr++;
  }

  langs.forEach((lang, i) => {

    const translated = {};

    trans.translate(normalized, lang, (err, res) => {
      if (err) throw err;
      if (!Array.isArray(res))
        res = [res];
      res.forEach((s, i) => {
        translated[indexes[i]] = replaceTokens(s, true);
      });
      fs.writeFileSync(path.join(baseDir, lang + '.json'), JSON.stringify(translated, null, 2));
      if ((langs.length - 1) === i) {
        log.info(`\nFinished translating languages ${langs.join(', ')}.\n`);
      }
    });

  });


};