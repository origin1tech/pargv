"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("util");
var colurs_1 = require("colurs");
var Debugr = (function () {
    function Debugr(active, colors, stream) {
        this._formatters = /(%s|%d|%i|%f|%j|%o|%O|%%)/g;
        this._active = ['*'];
        this._groups = ['logdefault'];
        if (colors && !this.isBoolean(colors)) {
            stream = colors;
            colors = undefined;
        }
        colors = this.isUndefined(colors) ? true : colors;
        this.enable(active);
        this._output = stream || process.stdout;
        this._colurs = new colurs_1.Colurs({ enabled: colors });
    }
    Debugr.prototype.exists = function (arr, key) {
        return arr.indexOf(key) > -1;
    };
    Debugr.prototype.index = function (arr, key) {
        return arr.indexOf(key);
    };
    Debugr.prototype.isBoolean = function (val) {
        return typeof val === 'boolean';
    };
    Debugr.prototype.isPlainObject = function (val) {
        return val && val.constructor && val.constructor === {}.constructor;
    };
    Debugr.prototype.isFunction = function (val) {
        return typeof val === 'function';
    };
    Debugr.prototype.isUndefined = function (val) {
        return typeof val === 'undefined' || typeof val === undefined;
    };
    Debugr.prototype.isString = function (val) {
        return typeof val === 'string';
    };
    Debugr.prototype.padLeft = function (val, len) {
        if (this.isUndefined(val) || val === null || !this.isString(val))
            return null;
        len = len || 0;
        var char = ' ';
        var pad = '';
        if (len <= 0)
            return val;
        while (len--) {
            pad += char;
        }
        return pad + val;
    };
    Debugr.prototype.maxLength = function () {
        var len = 0;
        this._groups.forEach(function (g) {
            if (g.length > len)
                len = g.length;
        });
        return len;
    };
    Debugr.prototype.contains = function (args, val) {
        return this.exists(args, val);
    };
    Debugr.prototype.log = function (group, styles) {
        var _this = this;
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        if ((!this._active || !args.length) || (this._active !== '*' && this._active !== group))
            return;
        if (Array.isArray(args[0]))
            args = args[0];
        var debugStr = this._colurs.applyAnsi('debug:', 'gray');
        var clone = args.slice(0);
        var first = args[0];
        var prefix = group + ':';
        var last = args[args.length - 1], msg, fn, meta;
        var noPrefix = /^--$/.test(first) ? args.shift() : false;
        if (noPrefix && !args.length)
            args.push('');
        if (styles && styles.length)
            prefix = this._colurs.applyAnsi(prefix, styles);
        if (this.isFunction(last))
            fn = args.pop();
        if (this.isPlainObject(last))
            meta = util_1.inspect(args.pop(), null, null, true);
        msg = args.shift();
        if (this.isUndefined(msg) && !meta)
            throw new Error('Debugr: whoops there\'s nothing to output, is callback first the argument?');
        if (this.isUndefined(msg) && meta)
            msg = meta;
        var tokens = msg.match(this._formatters);
        msg = util_1.format.apply(void 0, [msg].concat(args));
        var raw = msg;
        msg = noPrefix ? msg : "" + debugStr + prefix + " " + msg;
        msg = meta ? msg + " " + meta : msg;
        this._output.write(msg + '\n', function () {
            if (fn)
                fn({
                    group: group,
                    styles: styles || [],
                    msg: raw,
                    meta: meta || null,
                    args: clone
                }, _this);
        });
        return this.log.bind(this, group, styles);
    };
    /**
     * Group
     * Creates new Debugr group.
     *
     * @param group the name of the Debugr group.
     * @param styles any ansi styles to use for colorizing the group.
     */
    Debugr.prototype.add = function (group) {
        var styles = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            styles[_i - 1] = arguments[_i];
        }
        if (!group)
            throw new Error('Cannot create Debugr group using group of undefined.');
        if (!this.exists(this._groups, group))
            this._groups.push(group);
        if (Array.isArray(styles[0])) {
            var tmp = styles[0];
            styles = tmp;
        }
        return this._debuggers[group] = this.log.bind(this, group, styles);
    };
    /**
     * Enable
     * Enables debug messages.
     *
     * @param active the active group otherwise '*' is used.
     */
    Debugr.prototype.enable = function () {
        var active = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            active[_i] = arguments[_i];
        }
        if (!active.length)
            active = ['*'];
        this._active = active;
        return this;
    };
    /**
     * Disable
     * Disables debug messages.
     */
    Debugr.prototype.disable = function () {
        this._active = false;
        return this;
    };
    Debugr.prototype.remove = function (group) {
        if (!group)
            return;
        var idx = this.index(this._groups, group);
        if (idx > -1)
            this._groups.splice(idx, 1);
    };
    return Debugr;
}());
exports.Debugr = Debugr;
var instance;
exports.create = function (active, colors, stream) {
    return new Debugr(active, stream);
};
//# sourceMappingURL=debug.js.map