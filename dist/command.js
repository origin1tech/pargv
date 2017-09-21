"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var constants_1 = require("./constants");
var path_1 = require("path");
var utils = require("./utils");
var PargvCommand = /** @class */ (function () {
    function PargvCommand(token, describe, pargv) {
        this._commands = [];
        this._options = [];
        this._bools = [];
        this._aliases = {};
        this._usages = {};
        this._defaults = {};
        this._describes = {};
        this._coercions = {};
        this._demands = [];
        this._whens = {};
        this._examples = [];
        this._maxCommands = 0;
        this._maxOptions = 0;
        this._minCommands = 0;
        this._minOptions = 0;
        this._completions = {};
        this._external = null;
        this._cwd = false;
        this._extension = null;
        this._describe = describe;
        this._pargv = pargv;
        this.parseCommand(token);
        this.toggleHelp(pargv.options.defaultHelp);
    }
    // PRIVATE //
    /**
     * Parse Token
     * Parses a usage token.
     *
     * @param token the token string to be parsed.
     * @param next the next element in usage command.
     */
    PargvCommand.prototype.parseToken = function (token, next) {
        token = token.replace(/\s/g, '');
        token = token.replace(/(\>|])$/, '');
        var tokens = token.split(':'); // <age:number> to ['<age', 'number>'];
        var key = tokens[0]; // first element is command/option key.
        var type = tokens[1]; // optional type.
        var def = tokens[2]; // optional default value.
        if (!constants_1.TOKEN_PREFIX_EXP.test(key)) {
            this.err(this._pargv._localize('the token %s is missing, invalid or has unwanted space.')
                .args(key)
                .styles(['bgRed', 'white'])
                .done());
        } // ensure valid token.
        var isRequired = /^</.test(key); // starts with <.
        var isFlag = utils.isFlag(key); // starts with - or -- or anonymous.
        var isBool = isFlag && !next; // if flag but no next val is bool flag.
        var aliases = key.split('.'); // split generate.g to ['generate', 'g']
        key = aliases[0]; // reset name to first element.
        if (isFlag) {
            aliases = aliases // normalize aliases/key then sort.
                .map(function (el) {
                el = el.replace(constants_1.FLAG_EXP, '');
                el = el.length > 1 ? '--' + el : '-' + el;
                return el;
            })
                .sort(function (a, b) { return b.length - a.length; });
            aliases = utils.removeDuplicates(aliases); // remove any duplicate aliases.
        }
        token = key = aliases.shift(); // now sorted set final key.
        if (!isFlag) {
            key = utils.stripToken(key);
            aliases = []; // only flags support aliases.
            next = null;
        }
        if (isFlag) {
            token = utils.stripToken(token, /(<|>|\[|\])/g);
        }
        else {
            token = isRequired ?
                token.replace(/>$/, '') + '>' :
                token.replace(/\]$/, '') + ']';
        }
        if (def)
            def = this.castToType(key, 'auto', def);
        var usage = [[token].concat(aliases).join(', ')];
        if (!next)
            return {
                key: key,
                usage: usage,
                aliases: aliases,
                flag: isFlag,
                bool: isBool,
                type: type,
                default: def,
                required: isRequired
            };
        next = this.parseToken(next, null);
        return {
            key: key,
            usage: usage.concat(next.usage),
            aliases: aliases,
            flag: isFlag,
            bool: false,
            type: next.type,
            as: next.key,
            required: next.required,
            default: next.default
        };
    };
    /**
     * Parse Command
     * Parses a command token.
     *
     * @param token the command token string to parse.
     */
    PargvCommand.prototype.parseCommand = function (token) {
        var _this = this;
        var split = utils.split(token.trim(), constants_1.SPLIT_CHARS); // Break out usage command.
        var origExt;
        if (/^@/.test(split[0])) {
            var tmpExt = origExt = split.shift().trim().replace(/^@/, '');
            var splitExt = tmpExt.split(path_1.sep);
            tmpExt = splitExt.pop().replace(/^@/, '');
            this._extension = path_1.extname(tmpExt);
            this._external = path_1.basename(tmpExt, this._extension);
            this._cwd = splitExt.join(path_1.sep) || '';
        }
        var ctr = 0; // Counter for command keys.
        var aliases = (split.shift() || '').trim().split('.'); // Break out command aliases.
        var name = aliases.shift(); // First is key name.
        if (/(<|\[)/.test(name)) {
            split.unshift(name);
            name = undefined;
        }
        if (this._external && !name) {
            name = this._external;
            aliases.push(origExt); // full path alias.
            aliases.push(this._external + this._extension || ''); // name & ext alias.
            aliases.push(path_1.join(this._cwd, this._external)); // full path w/o ext.
        }
        var usage = []; // Usage command values.
        usage.push(name); // Add command key.
        // Iterate the tokens.
        split.forEach(function (el, i) {
            if (el === '--tries') {
                var x = true;
            }
            var next = split[i + 1]; // next value.
            var isFlag = utils.isFlag(el); // if is -o or --opt.
            next = utils.isFlag(next) || // normalize next value.
                !constants_1.COMMAND_VAL_EXP.test(next || '') ? null : next;
            var parsed = _this.parseToken(el, next); // parse the token.
            var describe;
            if (parsed.flag) {
                if (!parsed.bool)
                    split.splice(i + 1, 1);
            }
            else {
                parsed.index = ctr; // the index of the command.
                usage.push(parsed.usage[0]); // push token to usage.
                ctr++;
            }
            _this.expandOption(parsed); // Break out the object.
        });
        var cmdStr = this._pargv._localize('command').done();
        this._name = name; // Save the commmand name.
        this._describe = this._describe || // Ensure command description.
            name + " " + cmdStr + ".";
        this._usage = usage.join(' '); // create usage string.
        this.alias.apply(// create usage string.
        this, [name].concat(aliases)); // Map aliases to command name.
        this.alias(name, name);
    };
    /**
     * Expand Option
     * This breaks out the parsed option in to several
     * arrays/objects. This prevents some recursion rather
     * than storing the object itself in turn requiring more loops.
     *
     * @param option the parsed PargvOption object.
     */
    PargvCommand.prototype.expandOption = function (option) {
        var describe;
        var reqCmd = this._pargv._localize('Required command.').done();
        var optCmd = this._pargv._localize('Optional command.').done();
        var reqFlag = this._pargv._localize('Required flag.').done();
        var optFlag = this._pargv._localize('Optional flag.').done();
        if (option.flag) {
            this._options.push(option.key);
            if (option.bool)
                this._bools.push(option.key);
            describe = option.required ? reqFlag : optFlag;
        }
        else {
            this._commands.push(option.key);
            describe = option.required ? reqCmd : optCmd;
        }
        this.describe(option.key, option.describe || describe); // Add default descriptions
        this.alias(option.key, option.key); // Add key to self.
        this.alias.apply(// Add key to self.
        this, [option.key].concat(option.aliases)); // Add aliases to map.
        if (!utils.isUndefined(option.index))
            this.alias(option.key, option.index + '');
        if (option.required)
            this.demand(option.key);
        if (option.default)
            this._defaults[option.key] = option.default;
        this._usages[option.key] = option.usage; // Add usage.
        this.coerce(option.key, option.type, option.default); // Add default coerce method.
    };
    /**
     * Toggle Help
     * Enables or disables help while toggling the help option.
     * @param enabled whether or not help is enabled.
     */
    PargvCommand.prototype.toggleHelp = function (enabled) {
        if (!utils.isValue(enabled))
            enabled = true;
        var helpCmd = '--' + this._pargv._helpCommand;
        this._showHelp = enabled;
        if (enabled) {
            var str = this._pargv._localize('displays help for %s.')
                .args(this._name)
                .done();
            this.option(helpCmd, str);
        }
        else {
            this._options = this._options.filter(function (el) {
                return el !== helpCmd;
            });
        }
    };
    /**
     * Clean
     * : Filters arrays deletes keys from objects.
     *
     * @param key the key name to be cleaned.
     */
    PargvCommand.prototype.clean = function (key) {
        var _this = this;
        var isFlag = constants_1.FLAG_EXP.test(key);
        key = this.aliasToKey(key);
        var aliases = [key].concat(this.aliases(key));
        delete this._usages[key];
        delete this._defaults[key];
        delete this._describes[key];
        delete this._coercions[key];
        delete this._whens[key];
        this._demands = this._demands.filter(function (k) { return k !== key; });
        aliases.forEach(function (k) { return delete _this._aliases[k]; });
        if (!isFlag) {
            this._commands = this._commands.filter(function (k) { return k !== key; });
        }
        else {
            this._bools = this._bools.filter(function (k) { return k !== key; });
            this._options = this._options.filter(function (k) { return k !== key; });
        }
    };
    Object.defineProperty(PargvCommand.prototype, "err", {
        // GETTERS //
        get: function () {
            return this._pargv.err.bind(this._pargv);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PargvCommand.prototype, "min", {
        /**
         * Min
         * : Gets methods for adding min commands or options.
         */
        get: function () {
            var _this = this;
            return {
                /**
                 * Min Commands
                 * Sets minimum command count.
                 *
                 * @param count the minimum number of commands.
                 */
                commands: function (count) {
                    _this._minCommands = count;
                    return _this;
                },
                /**
                 * Min Options
                 * Sets minimum option count.
                 *
                 * @param count the minimum number of options.
                 */
                options: function (count) {
                    _this._minOptions = count;
                    return _this;
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PargvCommand.prototype, "max", {
        /**
          * Max
          * : Gets methods for adding max commands or options.
          */
        get: function () {
            var _this = this;
            return {
                /**
                 * Max Commands
                 * Sets maximum command count.
                 *
                 * @param count the maximum number of commands.
                 */
                commands: function (count) {
                    _this._maxCommands = count;
                    return _this;
                },
                /**
                 * Max Options
                 * Sets maximum option count.
                 *
                 * @param count the maximum number of options.
                 */
                options: function (count) {
                    _this._maxOptions = count;
                    return _this;
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PargvCommand.prototype, "parse", {
        /**
         * Parse
         * Parses the provided arguments inspecting for commands and options.
         *
         * @param argv the process.argv or custom args array.
         */
        get: function () {
            return this._pargv.parse.bind(this._pargv);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PargvCommand.prototype, "exec", {
        /**
         * Exec
         * Parses arguments then executes command action if any.
         *
         * @param argv optional arguments otherwise defaults to process.argv.
         */
        get: function () {
            return this._pargv.exec.bind(this._pargv);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PargvCommand.prototype, "listen", {
        /**
         * Listen
         * Parses arguments then executes command action if any.
         *
         * @param argv optional arguments otherwise defaults to process.argv.
         */
        get: function () {
            return this._pargv.exec.bind(this._pargv);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PargvCommand.prototype, "if", {
        /**
         * If
         * : Alias for when.
         */
        get: function () {
            return this.when;
        },
        enumerable: true,
        configurable: true
    });
    // METHODS //
    /**
      * Option
      * Adds option to command.
      * Supported to type strings: string, date, array,
      * number, integer, float, json, regexp, boolean
      * @example
      *
      * @param token the option token to parse as option.
      * @param describe the description for the option.
      * @param def an optional default value.
      * @param type a string type, RegExp to match or Coerce method.
      */
    PargvCommand.prototype.option = function (token, describe, def, type) {
        var _this = this;
        token = utils.toOptionToken(token);
        var tokens = utils.split(token.trim(), constants_1.SPLIT_CHARS);
        tokens.forEach(function (el, i) {
            var next;
            if (tokens.length > 1) {
                next = tokens[i + 1];
                tokens.splice(i + 1, 1);
            }
            var parsed = _this.parseToken(el, next);
            parsed.describe = describe || parsed.describe;
            parsed.default = def;
            parsed.type = type || parsed.type;
            _this.clean(parsed.key); // clean so we don't end up with dupes.
            _this.expandOption(parsed);
        });
        return this;
    };
    PargvCommand.prototype.alias = function (key) {
        var _this = this;
        var alias = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            alias[_i - 1] = arguments[_i];
        }
        var obj = key;
        var colors = this._pargv.options.colors;
        if (utils.isString(key)) {
            key = this.stripToAlias(key);
            obj = {};
            obj[key] = alias;
        }
        var _loop_1 = function (k) {
            k = this_1.stripToAlias(k);
            var v = obj[k];
            if (!utils.isValue(v) || !utils.isArray(v)) {
                var aliasStr = this_1._pargv._localize('alias').done();
                this_1.err(this_1._pargv._localize('cannot set %s for %s using value of undefined.')
                    .setArg('alias')
                    .setArg(k)
                    .styles(colors.accent, colors.accent)
                    .done());
            }
            v.forEach(function (el) {
                el = utils.stripToken(el, /(<|>|\[|\])/g);
                _this._aliases[el] = k;
            });
        };
        var this_1 = this;
        for (var k in obj) {
            _loop_1(k);
        }
        return this;
    };
    PargvCommand.prototype.describe = function (key, describe) {
        var obj = key;
        var colors = this._pargv.options.colors;
        if (utils.isString(key)) {
            key = this.stripToAlias(key);
            obj = {};
            obj[key] = describe;
        }
        for (var k in obj) {
            k = this.stripToAlias(k);
            var v = obj[k];
            if (!utils.isValue(v))
                this.err(this._pargv._localize('cannot set %s for %s using value of undefined.')
                    .setArg('describe')
                    .setArg(k)
                    .styles(colors.accent, colors.accent)
                    .done());
            this._describes[k] = v;
        }
        return this;
    };
    PargvCommand.prototype.coerce = function (key, fn, def) {
        var obj = key;
        var colors = this._pargv.options.colors;
        if (utils.isString(key)) {
            key = this.stripToAlias(key);
            obj = {};
            obj[key] = {
                fn: fn,
                def: def
            };
        }
        for (var k in obj) {
            k = this.stripToAlias(k);
            var v = obj[k];
            if (!utils.isValue(v))
                this.err(this._pargv._localize('cannot set %s for %s using value of undefined.')
                    .setArg('coerce')
                    .setArg(k)
                    .styles(colors.accent, colors.accent)
                    .done());
            if (v.def)
                this.default(k, v.def);
            this._coercions[k] = v.fn;
        }
        return this;
    };
    /**
     * Demand
     * The commands or flag/option keys to demand.
     *
     * @param key the key to demand.
     * @param keys additional keys to demand.
     */
    PargvCommand.prototype.demand = function () {
        var _this = this;
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            keys[_i] = arguments[_i];
        }
        keys.forEach(function (k) {
            if (!utils.contains(_this._demands, _this.aliasToKey(k)))
                _this._demands.push(k);
        });
        return this;
    };
    PargvCommand.prototype.when = function (key, demand, converse) {
        var obj = key;
        var colors = this._pargv.options.colors;
        if (utils.isString(key)) {
            key = this.stripToAlias(key);
            demand = this.stripToAlias(demand);
            obj = {};
            obj[key] = {
                demand: demand,
                converse: converse
            };
        }
        for (var k in obj) {
            k = this.stripToAlias(k);
            var v = obj[k];
            v.demand = this.stripToAlias(v.demand);
            if (!utils.isValue(v.demand))
                this.err(this._pargv._localize('cannot set %s for %s using value of undefined.')
                    .setArg('when')
                    .setArg(k)
                    .styles(colors.accent, colors.accent)
                    .done());
            this._whens[k] = v.demand;
            if (v.converse)
                this._whens[v.demand] = k;
        }
        return this;
    };
    /**
     * Default
     * Sets a default value for a command or option.
     *
     * @param key the key to set the default for or an object of key/val.
     * @param val the value to set for the provided key.
     */
    PargvCommand.prototype.default = function (key, val) {
        var obj = key;
        var colors = this._pargv.options.colors;
        if (utils.isString(key)) {
            key = this.stripToAlias(key);
            obj = {};
            obj[key] = val;
        }
        for (var k in obj) {
            k = this.stripToAlias(k);
            var v = obj[k];
            if (!utils.isValue(v))
                this.err(this._pargv._localize('cannot set %s for %s using value of undefined.')
                    .setArg('default')
                    .setArg(k)
                    .styles(colors.accent, colors.accent)
                    .done());
            this._defaults[k] = v;
        }
        return this;
    };
    /**
     * Completion At
     * : Injects custom completion value for specified key.
     * Key can be a know command, option or * for anonymous.
     *
     * @param key the key to inject completion values for.
     * @param vals the completion values for the provided key.
     */
    PargvCommand.prototype.completionFor = function (key) {
        var vals = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            vals[_i - 1] = arguments[_i];
        }
        key = key === '*' ? key : this.aliasToKey(key);
        if (utils.isArray(vals[0]))
            vals = vals[0];
        var colors = this._pargv.options.colors;
        if (!key)
            this.err(this._pargv._localize('cannot set completion for using key of undefined.')
                .done());
        this._completions[key] = vals;
        return this;
    };
    /**
     * Action
     * Adds an action event to be called when parsing matches command.
     *
     * @param fn the callback function when parsed command matches.
     */
    PargvCommand.prototype.action = function (fn) {
        var colors = this._pargv.options.colors;
        if (!fn)
            this.err(this._pargv._localize('cannot set %s for %s using value of undefined.')
                .setArg('action')
                .setArg(this._name)
                .styles(colors.accent, colors.accent)
                .done());
        this._action = fn;
        return this;
    };
    /**
     * CWD
     * : The directory prepended to external commands/programs. Ignored when action is present.
     *
     * @param path the base path when command is external program.
     */
    PargvCommand.prototype.cwd = function (path) {
        if (this._action || !this._external)
            return;
        this._cwd = path;
        if (this._external !== this._name || utils.isBoolean(path))
            return;
        var fullPath = path_1.join(path, this._external);
        this._aliases[fullPath] = this._name;
        if (this._extension)
            this._aliases[fullPath + this._extension] = this._name;
        return this;
    };
    /**
     * Help
     * Enables or disables help for this command.
     *
     * @param enabled true or false to toggle help.
     */
    PargvCommand.prototype.help = function (enabled) {
        this.toggleHelp(enabled);
        return this;
    };
    /**
     * Example
     * Stores and example for the command displayed in help.
     * You can also provide an object where the key is the
     * example text and the value is the describe text.
     *
     * @param val string or array of strings.
     */
    PargvCommand.prototype.example = function (example, describe) {
        var arr = example;
        if (utils.isString(example))
            arr = [example, describe || null];
        this._examples = this._examples.concat(arr);
        return this;
    };
    // UTILS //
    /**
     * Cast To Type
     * Casts a value to the specified time or fallsback to default.
     *
     * @param type the type to cast to.
     * @param val the value to be cast.
     */
    PargvCommand.prototype.castToType = function (key, type, val, def) {
        var result = null;
        var opts = this._pargv.options;
        var colors = opts.colors;
        var origVal = val;
        type = utils.isString(type) ? type.trim() : type;
        var isAuto = type === 'auto';
        if (utils.isString(val))
            val = val.trim();
        // Check if is list type expression.
        var isListType = (utils.isString(type) && constants_1.LIST_EXP.test(type)) ||
            utils.isRegExp(type);
        var listexp;
        if (isListType) {
            listexp = type;
            type = 'list';
        }
        function castObject(obj) {
            if (utils.isPlainObject(obj)) {
                for (var k in obj) {
                    var val_1 = obj[k];
                    if (utils.isPlainObject(val_1))
                        obj[k] = utils.toDefault(castObject(val_1), val_1);
                    else if (utils.isArray(val_1))
                        obj[k] = utils.toDefault(castObject(val_1), val_1);
                    else
                        obj[k] = utils.toDefault(autoCast(val_1), val_1);
                }
                return obj;
            }
            else if (utils.isArray(obj)) {
                return obj.map(function (el) {
                    return autoCast(el);
                });
            }
            else {
                return obj;
            }
        }
        var is = {
            object: utils.isPlainObject,
            number: utils.isNumber,
            integer: utils.isInteger,
            float: utils.isFloat,
            date: utils.isDate,
            array: utils.isArray,
            json: utils.isPlainObject,
            regexp: utils.isRegExp,
            boolean: utils.isBoolean,
            list: function (v) { return utils.isValue(v); }
        };
        var to = {
            object: function (v) {
                if (!constants_1.KEYVAL_EXP.test(v))
                    return null;
                var obj = {};
                // split key:val+key:val to [key:val, key:val].
                var pairs = v.match(constants_1.SPLIT_PAIRS_EXP);
                if (!pairs.length)
                    return null;
                var parentPath;
                if (constants_1.DOT_EXP.test(pairs[0])) {
                    var matches = pairs.shift().match(constants_1.SPLIT_KEYVAL_EXP);
                    var segments = matches[0].split('.');
                    var key_1 = segments.pop();
                    if (segments.length)
                        parentPath = segments.join('.');
                    pairs.unshift(key_1 + ":" + matches[1]); // set back to key:val without parent path.
                }
                pairs.forEach(function (p) {
                    var kv = p.replace(/('|")/g, '').split(':');
                    if (kv.length > 1) {
                        var castVal = kv[1];
                        if (constants_1.DOT_EXP.test(castVal)) {
                            castVal = to.object(castVal);
                        }
                        else {
                            if (/^\[\s*?("|').+("|')\s*?\]$/.test(castVal))
                                castVal = castVal.replace(/(^\[|\]$)/g, '');
                            if (opts.cast) {
                                castVal = utils.toDefault(autoCast(castVal), castVal);
                                if (utils.isArray(castVal))
                                    castVal = castVal.map(function (el) {
                                        return utils.toDefault(autoCast(el), el);
                                    });
                            }
                        }
                        var setPath = parentPath ? parentPath + "." + kv[0] : kv[0];
                        utils.set(obj, setPath, castVal);
                    }
                });
                return obj;
            },
            json: function (v) {
                if (!constants_1.JSON_EXP.test(v))
                    return null;
                v = v.replace(/^"/, '').replace(/"$/, '');
                var obj = utils.tryWrap(JSON.parse, v)();
                if (utils.isPlainObject(obj) && opts.cast) {
                    obj = castObject(obj);
                }
                return obj;
            },
            regexp: function (v) {
                if (!constants_1.REGEX_EXP.test(v))
                    return null;
                return utils.castType(val, 'regexp');
            },
            array: function (v) {
                if (!constants_1.LIST_EXP.test(v))
                    return null;
                return utils.toArray(v);
            },
            number: function (v) {
                if (!/[0-9]/g.test(v))
                    return null;
                return utils.castType(v, 'number');
            },
            date: function (v) {
                if (!isAuto)
                    return utils.fromEpoch(to.number(v));
                return utils.castType(v, 'date');
            },
            boolean: function (v) {
                if (!/^(true|false)$/.test(v))
                    return null;
                return utils.castType(v, 'boolean');
            },
            string: function (v) {
                return v;
            },
            // Following NOT called in auto cast.
            list: function (v) {
                var exp = utils.isRegExp(listexp) ? listexp : utils.splitToList(listexp);
                var match = (v.match && v.match(exp)) || null;
                result = match && match[0];
                return result;
            },
        };
        to.float = to.number;
        to.integer = to.number;
        function autoCast(v) {
            // Ensure type is set to auto.
            var origType = type;
            type = 'auto';
            var _result;
            var castMethods = [
                to.object.bind(null, v),
                to.json.bind(null, v),
                to.regexp.bind(null, v),
                to.array.bind(null, v),
                to.date.bind(null, v),
                to.number.bind(null, v),
                to.boolean.bind(null, v)
            ];
            // While no result iterate try to
            // cast to known types. Return the
            // result or the default value.
            while (castMethods.length && !_result) {
                var method = castMethods.shift();
                _result = method();
            }
            type = origType;
            return _result;
        }
        // If not a special type just cast to the type.
        if (type !== 'auto') {
            if (!to[type])
                result = null;
            else
                result = to[type](val);
        }
        else {
            result = utils.toDefault(autoCast(val), val);
        }
        // If Auto no type checking.
        if (isAuto)
            return result;
        if (!isListType)
            result = utils.toDefault(result, def);
        // Ensure valid type.
        if (!utils.isValue(result) || !is[type](result)) {
            if (!opts.ignoreTypeErrors) {
                if (!isListType) {
                    this.err(this._pargv._localize('expected type %s but got %s instead.')
                        .args(type, utils.getType(result))
                        .styles(colors.accent, colors.accent)
                        .done());
                }
                else {
                    this.err(this._pargv._localize('expected list or expression %s to contain %s.')
                        .args(listexp, origVal)
                        .styles(colors.accent, colors.accent)
                        .done());
                }
            }
            else {
                result = origVal;
            }
        }
        return result;
    };
    /**
     * Alias To Name
     * Maps an alias key to primary command/flag name.
     *
     * @param key the key to map to name.
     * @param def default value if alias is not found.
     */
    PargvCommand.prototype.aliasToKey = function (key, def) {
        var result = this._aliases[key];
        if (!utils.isValue(result) && def)
            return def;
        return result;
    };
    /**
     * Strip To Alias
     * Strips tokens then returns alias or original key.
     *
     * @param key the key to retrieve alias for.
     */
    PargvCommand.prototype.stripToAlias = function (key) {
        if (utils.isString(key))
            key = utils.stripToken(key, /(<|>|\[|\])/g); // strip <, >, [ or ]
        return this.aliasToKey(key, key);
    };
    /**
     * Aliases
     * Looks up aliases for a given key.
     *
     * @param key the primary key to find aliases for.
     */
    PargvCommand.prototype.aliases = function (key) {
        key = this.aliasToKey(key); // get primary name.
        var found = [];
        for (var p in this._aliases) {
            if (this._aliases[p] === key && p !== key)
                found.push(p);
        }
        return found;
    };
    /**
     * Stats
     * Iterates arguments mapping to known options and commands
     * finding required, anonymous and missing args.
     *
     * @param args the args to get stats for.
     * @param skip when true deamnds and whens are not built.
     */
    PargvCommand.prototype.stats = function (args, skip) {
        var _this = this;
        var lastIdx = this._commands.length - 1;
        var clone = args.slice(0);
        var commands = []; // contains only commands.
        var options = []; // contains only options.
        var anonymous = []; // contains only anonymous options.
        var mapCmds = []; // contains command keys.
        var mapOpts = []; // contains option keys.
        var mapAnon = []; // contains anon keys.
        var ctr = 0;
        // Ensure defaults for missing keys.
        for (var k in this._defaults) {
            var isFlag = constants_1.FLAG_EXP.test(k);
            var def = this._defaults[k];
            var isBool = this.isBool(k);
            if (isFlag) {
                if (!utils.contains(clone, k)) {
                    clone.push(k);
                    if (!isBool)
                        clone.push(def);
                }
            }
            else {
                var idx = this._commands.indexOf(k);
                var cur = clone[idx];
                if (!utils.isValue(cur) || constants_1.FLAG_EXP.test(clone[idx]))
                    clone.splice(idx, 0, def);
            }
        }
        clone.forEach(function (el, i) {
            var next = clone[i + 1];
            var isFlag = utils.isFlag(el);
            var isFlagNext = utils.isFlag(next);
            var isNot = /^--no/.test(el) ? true : false; // flag prefixed with --no.
            var origEl = el;
            el = el.replace(/^--no/, ''); // strip --no;
            var key = isFlag || ctr > lastIdx ? _this.aliasToKey(el) : _this.aliasToKey(ctr);
            if (!key) {
                anonymous.push(origEl);
                mapAnon.push(el);
                if (!isFlagNext && next) {
                    anonymous.push(next);
                    mapAnon.push('$value'); // keeps ordering denotes expects val.
                    clone.splice(i + 1, 1);
                }
            }
            else if (isFlag && key) {
                options.push(isNot ? '--no' + key : key); // converted from alias to key.
                mapOpts.push(key);
                if (!_this.isBool(el) && utils.isValue(next)) {
                    options.push(next);
                    mapOpts.push('$value'); // keeps ordering denotes expects val.
                    clone.splice(i + 1, 1);
                }
            }
            else if (!isFlag && key) {
                commands.push(el);
                mapCmds.push(key);
                ctr++;
            }
        });
        var map = mapCmds.concat(mapOpts).concat(mapAnon); // map by key to normalized.
        var normalized = commands.concat(options).concat(anonymous); // normalized args.
        var missing = [];
        this._demands.forEach(function (el) {
            if (!utils.contains(map, el)) {
                var isFlag = constants_1.FLAG_EXP.test(el);
                var def = _this._defaults[el] || null;
                if (!isFlag) {
                    var idx = _this._commands.indexOf(el);
                    if (!utils.isValue(def))
                        missing.push(el);
                    map.splice(idx, 0, el);
                    normalized.splice(idx, 0, def);
                }
                else {
                    if (!utils.isValue(def))
                        missing.push(el);
                    map.push(el);
                    if (!_this.isBool(el)) {
                        normalized.push(el);
                        map.push('$value');
                        normalized.push(def);
                    }
                    else {
                        normalized.push(def);
                    }
                }
            }
        });
        var whens = [];
        if (!skip)
            for (var k in this._whens) {
                var demand = this._whens[k];
                if (!utils.contains(map, demand))
                    whens.push([k, demand]);
            }
        return {
            commands: commands,
            options: options,
            anonymous: anonymous,
            missing: missing,
            map: map,
            normalized: normalized,
            whens: whens
        };
    };
    /**
     * Has Command
     * Checks if a command exists by index or name.
     *
     * @param key the command string or index.
     */
    PargvCommand.prototype.isCommand = function (key) {
        key = this.aliasToKey(key);
        return utils.isValue(key);
    };
    /**
     * Has Option
     * Inspects if key is known option.
     */
    PargvCommand.prototype.isOption = function (key) {
        key = this.aliasToKey(key);
        return utils.isValue(key);
    };
    /**
     * Is Required
     * Checks if command or option is required.
     *
     * @param key the command, index or option key.
     */
    PargvCommand.prototype.isRequired = function (key) {
        var origKey = key;
        key = this.aliasToKey(key);
        if (utils.isNumber(key))
            key = origKey; // convert back to orig value passed.
        return utils.contains(this._demands, key);
    };
    /**
     * Is Bool
     * Looks up flag option check if is of type boolean.
     *
     * @param key the option key to check.
     */
    PargvCommand.prototype.isBool = function (key) {
        key = this.aliasToKey(key);
        return utils.contains(this._bools, key);
    };
    // PARGV WRAPPERS //
    /**
     * Command
     * A string containing Parv tokens to be parsed.
     *
     * @param command the command token string to parse.
     * @param describe a description describing the command.
     */
    PargvCommand.prototype.command = function (command, describe) {
        var cmd = new PargvCommand(command, describe, this._pargv);
        this._pargv._commands[cmd._name] = cmd;
        return cmd;
    };
    /**
     * Fail
     * Add custom on error handler.
     *
     * @param fn the error handler function.
     */
    PargvCommand.prototype.onError = function (fn) {
        this._pargv.onError(fn);
        return this;
    };
    /**
     * Epilog
     * Displays trailing message.
     *
     * @param val the trailing epilogue to be displayed.
     */
    PargvCommand.prototype.epilog = function (val) {
        this._pargv.epilog(val);
        return this;
    };
    return PargvCommand;
}());
exports.PargvCommand = PargvCommand;
//# sourceMappingURL=command.js.map