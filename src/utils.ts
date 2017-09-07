import { format, inspect } from 'util';
import { relative, dirname } from 'path';
import { IPargvCommandOption, IPargvEnv } from './interfaces';
import { isString, isArray, flatten, split, last, isFunction, isPlainObject, isError, isValue, keys, isUndefined, first, contains, noop, isWindows } from 'chek';
import { CWD, NODE_PATH, ARGV, EXEC_PATH, EXE_EXP } from './constants';
import * as prefix from 'global-prefix';
import { FLAG_EXP, TOKEN_ANY_EXP, FLAG_SHORT_EXP, SPLIT_CHARS, FORMAT_TOKENS_EXP } from './constants';

export * from 'chek';


/**
 * Env Paths
 * Gets paths for the environment including executed path.
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
    EXEC: exec,
    EXEC_PATH: EXEC_PATH || ARGV[1],
    NODE_PATH: NODE_PATH || ARGV[0],
    GLOBAL_PATH: prefix,
    NODE_ENV: process.env.NODE_ENV,
    HOME_PATH: process.env.HOME,
    PLATFORM: process.platform
  };
}

/**
 * Clear Screen
 * Clears the screen and resets cursor.
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
 * Checks if value is a flag (ex: -s or --save).
 *
 * @param val the value to inspect.
 */
export function isFlag(val: string) {
  return isString(val) && FLAG_EXP.test(val);
}

/**
 * Is Dot Notation
 * Tests if value is dot notated string.
 *
 * @param val the value to be inspected.
 */
export function isDotNotation(val: any) {
  if (!isString(val)) return false;
  return /\..*\./.test(val) && !val.match(/\s/);
}

/**
 * Strip Param
 * Strips -f, --flag <param> [param] resulting in
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
 * Merges arguments into single array of values.
 *
 * @param val the single value or array of values.
 * @param args rest param of args.
 */
export function mergeArgs(val: any | any[], ...args: any[]) {
  if (!isString(val))
    val = val.trim();
  if (!isArray(val))
    val = [val];
  return flatten(val.concat(args));
}

/**
 * Split To List
 * Takes a list 'small, medium, large' and
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
 * Formats option string to support Pargv syntax.
 * @example
 * converts: '-n, --name <value>'
 * to: '-n.--name <value>'
 *
 * @param token the string to insepct.
 */
export function toOptionToken(token: string) {
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
 * Removes any duplicate elements in an array.
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
 * Helper method to ensure array in object property then concat values.
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
 * Computes the edit distance between two strings.
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
 * Pargv Error
 */
export class PargvError extends Error {
  constructor(message: string, ...args: any[]) {
    super(message);
    this.name = `PargvError`; // TODO: add detailed types.
    PargvError.captureStackTrace(this, PargvError);
  }
}

