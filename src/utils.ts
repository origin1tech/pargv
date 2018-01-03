import { format, inspect } from 'util';
import { join, relative, dirname, parse } from 'path';
import { existsSync, statSync } from 'fs';
import { IPargvCommandOption, IPargvEnv } from './interfaces';
import { isString, isArray, flatten, split, last, isFunction, isPlainObject, isError, isValue, keys, isUndefined, first, contains, noop, isWindows, tryRequire, tryRootRequire } from 'chek';
import { NODE_PATH, ARGV, EXEC_PATH, EXE_EXP } from './constants';
import { FLAG_EXP, TOKEN_ANY_EXP, FLAG_SHORT_EXP, SPLIT_CHARS, FORMAT_TOKENS_EXP, CWD } from './constants';

export * from 'chek';

let ctr = 5; // limit recursion.
export function findPackage(filename?) {
  if (!ctr) return;
  filename = filename || require.main.filename;
  const parsed = parse(filename);
  const curPath = join(parsed.dir, 'package.json');
  if (!existsSync(curPath)) {
    ctr--;
    return findPackage(parsed.dir);
  }
  else {
    return tryRequire(curPath, {});
  }
}

/**
 * Env Paths
 * : Gets paths for the environment including executed path.
 */
export function environment() {
  let exec = ARGV
    .slice(0, 2)
    .map((v, i) => {
      if (i === 0 && EXE_EXP.test(v))
        return;
      const rebased = relative(CWD, v);
      return v.match(/^(\/|([a-zA-Z]:)?\\)/) &&
        rebased.length < v.length ? rebased : v;
    }).join(' ').trim();
  if (NODE_PATH !== undefined && ARGV[1] === NODE_PATH)
    exec = NODE_PATH.replace(dirname(EXEC_PATH) + '/', '');
  return {
    CWD: process.cwd(),
    EXEC: exec,
    EXEC_PATH: EXEC_PATH || ARGV[1],
    NODE_PATH: NODE_PATH || ARGV[0],
    NODE_ENV: process.env.NODE_ENV,
    HOME_PATH: process.env.HOME,
    PLATFORM: process.platform,
    PKG: findPackage() // NOT bullet proof.
  };
}

/**
 * Clear Screen
 * : Clears the screen and resets cursor.
 * PLACEHOLDER future use.
 *
 * @param reset when not false cursor is reset.
 */
export function clearScreen(reset: boolean = true) {
  let out = '\x1B[2J';
  let newline = '\n';
  if (isWindows()) { // hack cause windows sucks!
    newline = '\r\n';
    out = '';
    const lines = process.stdout['getWindowSize']()[1] || [];
    lines.forEach((line) => {
      out += '\r\n';
    });
  }
  out += '\x1B[0f';
  process.stdout.write(out);
}

/**
 * Is Flag
 * : Checks if value is a flag (ex: -s or --save).
 *
 * @param val the value to inspect.
 */
export function isFlag(val: string) {
  return isString(val) && FLAG_EXP.test(val);
}

/**
 * Is Spread
 * : Tests if command token is spread type.
 *
 * @param val the value to test.
 */
export function isVariadic(val: string) {
  return /(\.){3}(\>|\])$/.test(val);
}

/**
 * Is Dot Notation
 * : Tests if value is dot notated string.
 *
 * @param val the value to be inspected.
 */
export function isDotNotation(val: any) {
  if (!isString(val)) return false;
  return /\..*\./.test(val) && !val.match(/\s/);
}

/**
 * Strip Param
 * : Strips -f, --flag <param> [param] resulting in
 * f, flag or param.
 *
 * @param val the value to be stripped.
 */
export function stripToken(val: string, exp?: RegExp) {
  exp = exp || TOKEN_ANY_EXP;
  return val.trim().replace(exp, '');
}

/**
 * Merge Args
 * : Merges arguments into single array of values.
 *
 * @param val the single value or array of values.
 * @param args rest param of args.
 */
export function mergeArgs(val: any | any[], ...args: any[]) {
  if (isString(val))
    val = val.trim();
  if (!isArray(val))
    val = [val];
  // flatten and remove dupes.
  return flatten<any>(val.concat(args))
    .sort()
    .filter((v, i, arr) => {
      return !i || v !== arr[i - 1];
    });
}

/**
 * Split To List
 * : Takes a list 'small, medium, large' and
 * converts it to expression like
 * /^(small|medium|large)$/i
 *
 * @param val the value to convert.
 */
export function splitToList(val: string) {
  return new RegExp('^(' + split(val, ['|', ',', ' ']).join('|').replace(/\s/g, '') + ')$', 'i');
}

/**
 * To Option Tokens
 * : Formats option string to support Pargv syntax.
 *
 * @example
 *
 * coverts: 'command'
 * to: '[command]'
 *
 * converts: '-n, --name <value>'
 * to: '-n.--name <value>'
 *
 * @param token the string to insepct.
 */
export function toOptionToken(token: string) {
  if (!/^-/.test(token)) {
    token = token.split(' ')[0];
    if (!/^(\[|<)/.test(token))
      token = `[${token}]`;
  }
  let pre = token;
  let suffix = '';
  let reqIdx = token.indexOf('<');
  let optIdx = token.indexOf('[');
  let idx = !!~reqIdx ? reqIdx : !!~optIdx ? optIdx : null;
  if (idx) {
    pre = token.slice(0, idx);
    suffix = token.slice(idx);
  }
  pre = split(pre.trim(), SPLIT_CHARS).join('.').replace(/\s/g, '');
  return pre + ' ' + suffix;
}

/**
 * Remove Duplicates
 * : Removes any duplicate elements in an array.
 *
 * @param args the array of elements to be inspected.
 */
export function removeDuplicates(...args: any[]) {
  if (isArray(args[0]))
    args = args[0];
  return args.filter((el, i) => {
    return args.indexOf(el) === i;
  });
}

/**
 * Concat To
 * : Helper method to ensure array in object property then concat values.
 *
 * @param obj the object collection containing keys.
 * @param key the key to concat values to.
 * @param val the array of values to concat.
 */
export function concatTo(obj: any, key: string, val: any[]) {
  obj[key] = obj[key] || [];
  obj[key] = obj[key].concat(val);
  return obj[key];
}

/**
 * Levenshtein
 * : Computes the edit distance between two strings.
 *
 * Based on gist by Andrei Mackenzie
 * @see https://gist.github.com/andrei-m/982927
 *
 * @param source the source string.
 * @param compare the string to be compared.
 */
export function levenshtein(source, compare) {
  let tmp;
  if (source.length === 0) { return compare.length; }
  if (compare.length === 0) { return source.length; }
  if (source.length > compare.length) { tmp = source; source = compare; compare = tmp; }

  let i, j, res, alen = source.length, blen = compare.length, row = Array(alen);
  for (i = 0; i <= alen; i++) { row[i] = i; }

  for (i = 1; i <= blen; i++) {
    res = i;
    for (j = 1; j <= alen; j++) {
      tmp = row[j - 1];
      row[j - 1] = res;
      res = compare[i - 1] === source[j - 1] ? tmp : Math.min(tmp + 1, Math.min(res + 1, row[j] + 1));
    }
  }
  return res;
}

/**
 * Set Blocking
 * : Sets handle blocking for stdout, stderr.
 *
 * TypeScript version of:
 * @see https://github.com/yargs/set-blocking/blob/master/index.js
 *
 * @param blocking toggles blocking.
 */
export function setBlocking(blocking?: boolean) {
  const out = process.stdout, err = process.stderr;
  [out, err].forEach((stream: any) => {
    if (stream._handle && stream.isTTY && isFunction(stream._handle.setBlocking))
      stream._handle.setBlocking(blocking);
  });
}

/**
 * Is Executable
 * : Tests if path is executable.
 *
 * @param path the path to the executable.
 */
export function isExecutable(path: string) {

  if (!existsSync(path))
    return false;

  try {

    const stats = statSync(path);

    if (isWindows()) { // just return if is file, not ideal.
      return stats && stats.isFile();
    }

    else {

      const hasGroup = stats.gid
        ? process.getgid && stats.gid === process.getgid()
        : true;
      const hasUser = stats.uid
        ? process.getuid && stats.uid === process.getuid()
        : true;

      // just didn't want additional depend.
      // see https://github.com/kevva/executable/blob/master/index.js#L13

      return Boolean(
        (stats.mode & parseInt('0001', 8)) ||
        ((stats.mode & parseInt('0010', 8)) && hasGroup) ||
        ((stats.mode & parseInt('0100', 8)) && hasUser)
      );

    }

  }
  catch (ex) {
    return false;
  }

}

/**
 * Set Enumerable
 * : Simple helper for defining enumerable prop states.
 *
 * @param ctx the context to define properties on.
 * @param props the properties to set enumerable for.
 * @param state the state true or false.
 */
export function setEnumerable(ctx: object, props: string | string[], state = false) {
  props = split(props);
  const obj: any = {};
  props.forEach((p) => {
    obj[p] = {
      writable: true,
      enumerable: false
    };
  });
  Object.defineProperties(ctx, obj);
}
