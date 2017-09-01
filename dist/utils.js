"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var chek_1 = require("chek");
var prefix = require("global-prefix");
var constants_1 = require("./constants");
__export(require("chek"));
/**
 * Get Prefix
 * Returns the node prefix path.
 */
function getPrefix() {
    return prefix;
}
exports.getPrefix = getPrefix;
/**
 * Is Flag
 * Checks if value is a flag (ex: -s or --save).
 *
 * @param val the value to inspect.
 */
function isFlag(val) {
    return chek_1.isString(val) && constants_1.FLAG_EXP.test(val);
}
exports.isFlag = isFlag;
/**
 * Is Dot Notation
 * Tests if value is dot notated string.
 *
 * @param val the value to be inspected.
 */
function isDotNotation(val) {
    if (!chek_1.isString(val))
        return false;
    return /\..*\./.test(val) && !val.match(/\s/);
}
exports.isDotNotation = isDotNotation;
/**
 * Strip Param
 * Strips -f, --flag <param> [param] resulting in
 * f, flag or param.
 *
 * @param val the value to be stripped.
 */
function stripToken(val, exp) {
    exp = exp || constants_1.TOKEN_ANY_EXP;
    return val.trim().replace(exp, '');
}
exports.stripToken = stripToken;
/**
 * Merge Args
 * Merges arguments into single array of values.
 *
 * @param val the single value or array of values.
 * @param args rest param of args.
 */
function mergeArgs(val) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (!chek_1.isString(val))
        val = val.trim();
    if (!chek_1.isArray(val))
        val = [val];
    return chek_1.flatten(val.concat(args));
}
exports.mergeArgs = mergeArgs;
/**
 * Split To List
 * Takes a list 'small, medium, large' and
 * converts it to expression like
 * /^(small|medium|large)$/i
 *
 * @param val the value to convert.
 */
function splitToList(val) {
    return new RegExp('^(' + chek_1.split(val, ['|', ',', ' ']).join('|').replace(/\s/g, '') + ')$', 'i');
}
exports.splitToList = splitToList;
/**
 * To Option Tokens
 * Formats option string to support Pargv syntax.
 * @example
 * converts: '-n, --name <value>'
 * to: '-n.--name <value>'
 *
 * @param token the string to insepct.
 */
function toOptionToken(token) {
    var pre = token;
    var suffix = '';
    var reqIdx = token.indexOf('<');
    var optIdx = token.indexOf('[');
    var idx = !!~reqIdx ? reqIdx : !!~optIdx ? optIdx : null;
    if (idx) {
        pre = token.slice(0, idx);
        suffix = token.slice(idx);
    }
    pre = chek_1.split(pre.trim(), constants_1.SPLIT_CHARS).join('.').replace(/\s/g, '');
    return pre + ' ' + suffix;
}
exports.toOptionToken = toOptionToken;
/**
 * Remove Duplicates
 * Removes any duplicate elements in an array.
 *
 * @param args the array of elements to be inspected.
 */
function removeDuplicates() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    if (chek_1.isArray(args[0]))
        args = args[0];
    return args.filter(function (el, i) {
        return args.indexOf(el) === i;
    });
}
exports.removeDuplicates = removeDuplicates;
/**
 * Concat To
 * Helper method to ensure array in object property then concat values.
 *
 * @param obj the object collection containing keys.
 * @param key the key to concat values to.
 * @param val the array of values to concat.
 */
function concatTo(obj, key, val) {
    obj[key] = obj[key] || [];
    obj[key] = obj[key].concat(val);
    return obj[key];
}
exports.concatTo = concatTo;
// Simple Logger for Logging to Console
// export function logger(level, colurs): ILogger {
//   const levels = {
//     error: 'red',
//     warn: 'yellow',
//     info: 'green',
//     debug: 'magenta'
//   };
//   const levelKeys = keys(levels);
//   level = isValue(level) ? level : 'info';
//   level = levelKeys.indexOf(level);
//   function normalize(args) {
//     let msg = args.shift();
//     let meta;
//     const tokens = isString(msg) && msg.match(/(%s|%d|%i|%f|%j|%o|%O|%%)/g);
//     const isErrMsg = isError(msg);
//     if (isPlainObject(last(args)) && (args.length > tokens.length))
//       args[args.length - 1] = util.inspect(last(args), true, null, true);
//     if (isPlainObject(msg))
//       msg = util.inspect(msg, true, null, true);
//     return util.format(msg, ...args);
//   }
//   function enabled(type) {
//     type = levelKeys.indexOf(type);
//     return type <= level;
//   }
//   const log = {
//     error: (...args: any[]) => {
//       if (!enabled('error')) return;
//       const type = colurs.bold[levels.error]('error:');
//       console.log('');
//       console.log(type, normalize(args));
//       console.log('');
//       log.exit(1);
//     },
//     warn: (...args: any[]) => {
//       if (!enabled('warn')) return;
//       const type = colurs.bold[levels.warn]('warn:');
//       console.log(type, normalize(args));
//       return log;
//     },
//     info: (...args: any[]) => {
//       if (!enabled('info')) return;
//       const type = colurs.bold[levels.info]('info:');
//       console.log(type, normalize(args));
//       return log;
//     },
//     write: (...args: any[]) => {
//       console.log.apply(null, args);
//       return log;
//     },
//     exit: process.exit
//   };
//   return log;
// }
//# sourceMappingURL=utils.js.map