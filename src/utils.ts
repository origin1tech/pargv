import { IPargvOption } from './interfaces';
import { isString, isArray, flatten, split } from 'chek';
import { FLAG_EXP, TOKEN_ANY_EXP, FLAG_SHORT_EXP, SPLIT_CHARS } from './constants';

export * from 'chek';

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
 * Normalize Args
 * Converts -abc to -a -b -c
 * Converts --name=bob to --name bob
 *
 * @param args the arguments to normalize.
 */
export function normalizeArgs(args: any[]) {
  let arr = [],
    idx;
  args.forEach((el) => {
    if (/^--/.test(el) && ~(idx = el.indexOf('='))) {
      arr.push(el.slice(0, idx), el.slice(idx + 1));
    }
    else if (FLAG_SHORT_EXP.test(el)) {
      el.replace(FLAG_EXP, '').split('').forEach((s) => {
        arr.push('-' + s);
      });
    }
    else {
      arr.push(el);
    }
  });
  return arr;
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

// Simple Logger for Logging to Console

export const logTypes = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'magenta'
};

export function logger(colurs) {

  const log = {
    error: (...args: any[]) => {
      args.unshift(colurs.bold[logTypes['error']]('error:'));
      console.log('');
      console.log.apply(console, args);
      console.log('');
      log.exit(1);
    },
    info: (...args: any[]) => {
      args.unshift(colurs.bold[logTypes['info']]('info:'));
      console.log.apply(console, args);
      return log;
    },
    warn: (...args: any[]) => {
      args.unshift(colurs.bold[logTypes['warn']]('warn:'));
      console.log.apply(console, args);
      return log;
    },
    write: (...args: any[]) => {
      console.log.apply(console, args);
    },
    exit: process.exit
  };

  return log;

}