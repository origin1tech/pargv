"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var chek_1 = require("chek");
var constants_1 = require("./constants");
__export(require("chek"));
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
 * Normalize Args
 * Converts -abc to -a -b -c
 * Converts --name=bob to --name bob
 *
 * @param args the arguments to normalize.
 */
function normalizeArgs(args) {
    var arr = [], idx;
    args.forEach(function (el) {
        if (/^--/.test(el) && ~(idx = el.indexOf('='))) {
            arr.push(el.slice(0, idx), el.slice(idx + 1));
        }
        else if (constants_1.FLAG_SHORT_EXP.test(el)) {
            el.replace(constants_1.FLAG_EXP, '').split('').forEach(function (s) {
                arr.push('-' + s);
            });
        }
        else {
            arr.push(el);
        }
    });
    return arr;
}
exports.normalizeArgs = normalizeArgs;
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
exports.logTypes = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'magenta'
};
function logger(colurs) {
    var log = {
        error: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.unshift(colurs.bold[exports.logTypes['error']]('error:'));
            console.log('');
            console.log.apply(console, args);
            console.log('');
            log.exit(1);
        },
        info: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.unshift(colurs.bold[exports.logTypes['info']]('info:'));
            console.log.apply(console, args);
            return log;
        },
        warn: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            args.unshift(colurs.bold[exports.logTypes['warn']]('warn:'));
            console.log.apply(console, args);
            return log;
        },
        write: function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            console.log.apply(console, args);
        },
        exit: process.exit
    };
    return log;
}
exports.logger = logger;
//# sourceMappingURL=utils.js.map