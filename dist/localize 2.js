"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lokales_1 = require("lokales");
var constants_1 = require("./constants");
var path_1 = require("path");
var utils = require("./utils");
function localize(pargv) {
    var opts = {
        directory: path_1.resolve(constants_1.PARGV_ROOT, pargv.options.localeDir),
        locale: pargv.options.locale
    };
    var lokales = new lokales_1.Lokales(opts);
    /**
     * Common
     * : Common method for localization.
     *
     * @param singular the localization singular key to lookup.
     * @param plural the localization plural key to lookup.
     * @param count optional count for pluralization or args.
     * @param args arguments used in formatting message.
     * @param sytles ansi styles for matching index arguments
     */
    function common(singular, plural, count, args, styles) {
        args = args || [];
        styles = styles || [];
        args.forEach(function (el, i) {
            if (styles[i]) {
                var _styles = utils.toArray(styles[i]);
                args[i] = pargv._colurs.applyAnsi(el, _styles);
            }
        });
        if (plural)
            return lokales.__n.apply(lokales, [singular, plural, count].concat(args));
        return lokales.__.apply(lokales, [singular].concat(args));
    }
    function init(singular, plural) {
        var methods;
        var _count, _args, _styles;
        methods = {
            count: function (count) {
                _count = count;
                return methods;
            },
            args: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                if (utils.isArray(utils.first(args))) {
                    args = args[0];
                }
                _args = args;
                return methods;
            },
            setArg: function (singular, plural, count, index) {
                if (utils.isValue(plural)) {
                    if (utils.isNumber(plural)) {
                        index = plural;
                        plural = undefined;
                    }
                }
                _args = _args || [];
                if (utils.isNumber(plural)) {
                    index = plural;
                    plural = undefined;
                }
                var result = init(singular, plural).done();
                if (index)
                    _args[index] = result;
                else
                    _args.push(result);
                return methods;
            },
            styles: function () {
                var styles = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    styles[_i] = arguments[_i];
                }
                _styles = styles;
                return methods;
            },
            done: function () {
                return common(singular, plural, _count, _args, _styles);
            }
        };
        return methods;
    }
    return init;
}
exports.localize = localize;
//# sourceMappingURL=localize.js.map