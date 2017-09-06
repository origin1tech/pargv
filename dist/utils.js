"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var chek_1 = require("chek");
var constants_1 = require("./constants");
var prefix = require("global-prefix");
var constants_2 = require("./constants");
__export(require("chek"));
/**
 * Env Paths
 * Gets paths for the environment including executed path.
 */
function environment() {
    var exec = constants_1.ARGV
        .slice(0, 2)
        .map(function (v, i) {
        if (i === 0 && constants_1.EXE_EXP.test(v))
            return;
        var rebased = path_1.relative(constants_1.CWD, v);
        return v.match(/^(\/|([a-zA-Z]:)?\\)/) &&
            rebased.length < v.length ? rebased : v;
    }).join(' ').trim();
    if (constants_1.NODE_PATH !== undefined && constants_1.ARGV[1] === constants_1.NODE_PATH)
        exec = constants_1.NODE_PATH.replace(path_1.dirname(constants_1.EXEC_PATH) + '/', '');
    return {
        EXEC: exec,
        EXEC_PATH: constants_1.EXEC_PATH || constants_1.ARGV[1],
        NODE_PATH: constants_1.NODE_PATH || constants_1.ARGV[0],
        GLOBAL_PATH: prefix,
        NODE_ENV: process.env.NODE_ENV,
        HOME_PATH: process.env.HOME
    };
}
exports.environment = environment;
/**
 * Clear Screen
 * Clears the screen and resets cursor.
 * PLACEHOLDER future use.
 *
 * @param reset when not false cursor is reset.
 */
function clearScreen(reset) {
    if (reset === void 0) { reset = true; }
    var out = '\x1B[2J';
    var newline = '\n';
    if (chek_1.isWindows()) {
        newline = '\r\n';
        out = '';
        var lines = process.stdout['getWindowSize']()[1] || [];
        lines.forEach(function (line) {
            out += '\r\n';
        });
    }
    out += '\x1B[0f';
    process.stdout.write(out);
}
exports.clearScreen = clearScreen;
/**
 * Is Flag
 * Checks if value is a flag (ex: -s or --save).
 *
 * @param val the value to inspect.
 */
function isFlag(val) {
    return chek_1.isString(val) && constants_2.FLAG_EXP.test(val);
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
    exp = exp || constants_2.TOKEN_ANY_EXP;
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
    pre = chek_1.split(pre.trim(), constants_2.SPLIT_CHARS).join('.').replace(/\s/g, '');
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
function levenshtein(source, compare) {
    var tmp;
    if (source.length === 0) {
        return compare.length;
    }
    if (compare.length === 0) {
        return source.length;
    }
    if (source.length > compare.length) {
        tmp = source;
        source = compare;
        compare = tmp;
    }
    var i, j, res, alen = source.length, blen = compare.length, row = Array(alen);
    for (i = 0; i <= alen; i++) {
        row[i] = i;
    }
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
exports.levenshtein = levenshtein;
/**
 * Pargv Error
 */
var PargvError = (function (_super) {
    __extends(PargvError, _super);
    function PargvError(message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var _this = _super.call(this, message) || this;
        _this.name = "PargvError"; // TODO: add detailed types.
        PargvError.captureStackTrace(_this, PargvError);
        return _this;
    }
    return PargvError;
}(Error));
exports.PargvError = PargvError;
//# sourceMappingURL=utils.js.map