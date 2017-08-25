"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var cliui = require("cliui");
var figlet = require("figlet");
var prefix = require("global-prefix");
var colurs_1 = require("colurs");
var chek_1 = require("chek");
var colurs;
var KEYVAL_EXP = /^((.+:.+)(\||\+)?)$/;
var CSV_EXP = /^(.+,.+){1,}$/;
var ARRAY_EXP = /^(.+(,|\||\s).+){1,}$/;
var JSON_EXP = /^"?{.+}"?$/;
var REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
var REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
var DOT_EXP = /^(.+\..+)$/;
var FLAG_EXP = /^--?/;
var FLAG_SHORT_EXP = /^-[a-zA-Z0-9]/;
var FLAG_NOT_EXP = /^(--no)?-{0,1}[0-9a-zA-Z]/;
var TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/;
var TOKEN_PREFIX_EXP = /^(--?|<|\[)/;
var SPLIT_CHARS = ['|', ',', ' '];
var DEFAULTS = {
    strict: true,
    colorize: true,
    dupes: true,
    auto: true,
    divider: '=',
    colors: {
        primary: ['magenta', 'bold'],
        accent: ['blue', 'bold'],
        alert: ['red', 'bold'],
        muted: 'gray'
    }
};
// UTILS //
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
/**
 * Normalize Debug
 * Normalizes the debug arg if exists by breaking
 * out the debug port if provided.
 *
 * @param argv the args passed to parse.
 */
function normalizeDebug(argv) {
    var execDebug = process.execArgv.filter(function (arg) {
        return /^--debug/.test(arg);
    })[0] || null;
    var argvDebug = argv.filter(function (arg) {
        return /^--debug/.test(arg);
    })[0] || null;
    var debugFlag = execDebug || argvDebug || null;
    if (!debugFlag)
        return [];
    return [debugFlag];
}
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
    return val.concat(args);
}
/**
 * Is Flag
 * Checks if value is a flag (ex: -s or --save).
 *
 * @param val the value to inspect.
 */
function isFlag(val) {
    return chek_1.isString(val) && FLAG_EXP.test(val);
}
/**
 * Is Flag Value
 * Inspects flag check if flag expecting value instead of simple boolean.
 *
 * @param val the value to inspect.
 */
function isFlagLong(val) {
    return isFlag(val) && /^--/.test(val);
}
/**
 * Strip Param
 * Strips -f, --flag <param> [param] resulting in
 * f, flag or param.
 *
 * @param val the value to be stripped.
 */
function stripToken(val) {
    return val.trim().replace(TOKEN_ANY_EXP, '');
}
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
/**
 * To Option String
 * Formats option string to support Pargv syntax.
 * @example
 * converts: '-n, --name <value>'
 * to: '-n.--name <value>'
 *
 * @param val the string to insepct.
 */
function toOptionString(val) {
    var pre = val;
    var suffix = '';
    var reqIdx = val.indexOf('<');
    var optIdx = val.indexOf('[');
    var idx = !!~reqIdx ? reqIdx : !!~optIdx ? optIdx : null;
    if (idx) {
        pre = val.slice(0, idx);
        suffix = val.slice(idx);
    }
    pre = chek_1.split(pre.trim(), SPLIT_CHARS).join('.').replace(/\s/g, '');
    return pre + ' ' + suffix;
}
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
        else if (FLAG_SHORT_EXP.test(el)) {
            el.replace(FLAG_EXP, '').split('').forEach(function (s) {
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
 * Parse Token
 * Parses command or option token to object.
 *
 * @param token the token to be parsed.
 * @param next optional next value for flags.
 */
function parseToken(token, next) {
    // splits <age:number> to ['<age', 'number>'];
    var split = token.split(':');
    // Set the first element to the token name.
    var name = split[0];
    // Check if is a flag, long flag and/or required.
    var flag = FLAG_EXP.test(name);
    var required = /^</.test(name);
    // anonymous type.
    var anon = !TOKEN_PREFIX_EXP.test(name);
    // Split name into segments.
    var aliases = name.split('.');
    // Don't shift here we want name
    // in array for sorting.
    name = aliases[0];
    // Assume anonymous tokens are flags.
    // this allows n.number [number]
    // to convert to option -n, --number.
    if (anon) {
        flag = true;
        name = name.length > 1 ? "--" + name : "-" + name;
    }
    // Remove < or ] from the type.
    var type = stripToken(split[1] || '');
    // Split the name inspect for aliases then sort by length.
    aliases = aliases
        .map(function (a) {
        a = a.replace(/(<|\[|>|\])/g, '');
        if (flag && !FLAG_EXP.test(a))
            a = a.length > 1 ? "--" + a.replace(FLAG_EXP, '') : "-" + a.replace(FLAG_EXP, '');
        return a;
    })
        .sort(function (a, b) { return b.length - a.length; });
    // Now that we've sorted we don't
    // need the first segment or name.
    name = aliases.shift();
    // Ensure alias is not same as name.
    if (chek_1.contains(aliases, name))
        log.error("alias " + name + " cannot be the same as option name property.");
    // This is a sub command value.
    if (!flag)
        return { name: name, aliases: aliases, type: type, required: required };
    // When a flag but no next its a boolean flag.
    if (!next)
        return { name: name, aliases: aliases, type: 'boolean', required: false, flag: true };
    // We need to parse the next token to
    // get info for the value flag.
    var parsed = parseToken(next);
    // Return flag name/aliases then details from parsed value.
    return { name: name, aliases: aliases, as: parsed.name, type: parsed.type, required: parsed.required, flag: true };
}
/**
 * Cast To Type
 * Casts a value to the specified time or fallsback to default.
 *
 * @param type the type to cast to.
 * @param def an optional default value.
 * @param val the value to be cast.
 */
function castToType(type, def, val) {
    var _this = this;
    var result = null;
    var origVal = val;
    type = type.trim();
    var isAuto = type === 'auto';
    if (chek_1.isString(val))
        val = val.trim();
    // Check if is list type expression.
    var isListType = ARRAY_EXP.test(type) || chek_1.isRegExp(type);
    type = isListType ? 'list' : type;
    var is = {
        object: chek_1.isPlainObject,
        number: chek_1.isNumber,
        integer: chek_1.isInteger,
        float: chek_1.isFloat,
        date: chek_1.isDate,
        array: chek_1.isArray,
        json: chek_1.isPlainObject,
        regexp: chek_1.isRegExp,
        boolean: chek_1.isBoolean,
        list: function (v) { return chek_1.isValue(v); }
    };
    var to = {
        // Never called in autoCast method.
        list: function (v) {
            var match = val.match(splitToList(type));
            result = match && match[0];
        },
        object: function (v) {
            if (!KEYVAL_EXP.test(v))
                return null;
            var obj = {};
            var pairs = chek_1.split(v, ['|', '+']);
            if (!pairs.length)
                return null;
            pairs.forEach(function (p) {
                var kv = p.split(':');
                if (kv.length > 1) {
                    var castVal = kv[1];
                    // Check if an array is denoted with [ & ]
                    // If yes strip them from string.
                    if (/^\[/.test(castVal) && /\]$/.test(castVal))
                        castVal = castVal.replace(/(^\[|\]$)/g, '');
                    // Check if auto casting is enabled.
                    if (_this.pargv.options.auto) {
                        castVal = autoCast(castVal) || castVal;
                        if (chek_1.isArray(castVal))
                            castVal = castVal.map(function (el) {
                                return autoCast(el) || el;
                            });
                    }
                    chek_1.set(obj, kv[0], castVal);
                }
            });
            return obj;
        },
        json: function (v) {
            if (!JSON_EXP.test(v))
                return null;
            v = v.replace(/^"/, '').replace(/"$/, '');
            return chek_1.tryWrap(JSON.parse, v)();
        },
        array: function (v) {
            if (!ARRAY_EXP.test(v))
                return null;
            return chek_1.toArray(v);
        },
        number: function (v) {
            if (!/[0-9]/g.test(v))
                return null;
            return chek_1.castType(v, 'number');
        },
        date: function (v) {
            return chek_1.castType(v, 'date');
        },
        regexp: function (v) {
            if (!REGEX_EXP.test(v))
                return null;
            return chek_1.castType(val, 'regexp');
        },
        boolean: function (v) {
            if (!/^(true|false)$/.test(v))
                return null;
            return chek_1.castType(v, 'boolean');
        }
    };
    to.integer = to.number;
    to.float = to.number;
    function autoCast(v) {
        // Ensure type is set to auto.
        var origType = type;
        type = 'auto';
        var _result;
        var castMethods = [
            to.object.bind(null, v),
            to.json.bind(null, v),
            to.array.bind(null, v),
            to.regexp.bind(null, v),
            to.date.bind(null, v, 'date'),
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
    // If no value return default.
    if (!val)
        return def;
    // If not a special type just cast to the type.
    if (type !== 'auto') {
        result = to[type](val);
    }
    else {
        result = autoCast(val);
    }
    // If Auto no type checking.
    if (isAuto)
        return chek_1.toDefault(result, def || val);
    // Check if there is a default value if nothing is defined.
    result = chek_1.toDefault(result, def || val);
    // Ensure valid type.
    if (!is[type](result))
        log.error("expected type " + colurs.cyan(type) + " but got " + colurs.cyan(chek_1.getType(type)) + ".");
    return result;
}
// Crude logger just need to show some messages.
var logTypes = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'magenta'
};
var log = {
    error: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        args.unshift(colurs.bold[logTypes['error']]('error:'));
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
        args.unshift(colurs.bold[logTypes['info']]('info:'));
        console.log.apply(console, args);
        return log;
    },
    warn: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        args.unshift(colurs.bold[logTypes['warn']]('warn:'));
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
// PARGV COMMAND CLASS //
var PargvCommand = (function () {
    function PargvCommand(command, description, options, context) {
        this._depends = {};
        this._description = '';
        this._aliases = [];
        this._coercions = {};
        this._demands = [];
        this._examples = [];
        this._action = chek_1.noop;
        this.options = {};
        if (!command)
            log.error('cannot define command using name of undefined.');
        if (chek_1.isPlainObject(command)) {
            options = command;
            command = undefined;
        }
        if (chek_1.isPlainObject(description)) {
            options = description;
            description = undefined;
        }
        // Normalize options.
        options = options || {};
        this.pargv = context;
        this._description = description || options.description;
        this._aliases = chek_1.isString(options.aliases) ? chek_1.split(options.aliases, SPLIT_CHARS) : [];
        // Add in debug options.
        this.option('--debug, --debug-brk [port]');
        // Parse the Command.
        this.parseTokens(command || options.command, true);
        return this;
    }
    /**
     * Parse Command
     * Parses command tokens to command object.
     *
     * @param val the command value to parse.
     */
    PargvCommand.prototype.parseTokens = function (val, isCommand) {
        var _this = this;
        // If not command convert option string to Pargv syntax.
        if (!isCommand)
            val = toOptionString(val);
        var arr = chek_1.split(val.trim(), SPLIT_CHARS);
        var usage = [];
        var parsedOpts = [];
        var ctr = 0;
        // If command shift out the command.
        if (isCommand) {
            var tmpCmd = arr.shift().trim();
            // split out aliases
            tmpCmd = tmpCmd.split('.');
            var name = tmpCmd.shift();
            // Exclude help from this check allow overwriting.
            if (name !== 'help' && this.pargv.commands[name])
                log.error("cannot add command", colurs.yellow("" + name), "the command already exists.");
            if (name === 'help')
                this.pargv.remove(name);
            this._name = name;
            if (tmpCmd.length)
                this._aliases = tmpCmd;
            usage.push(this._name);
        }
        arr.forEach(function (el, i) {
            var prev = arr[i - 1];
            var skip = (prev && !TOKEN_PREFIX_EXP.test(prev)) || FLAG_EXP.test(prev);
            if (skip)
                return;
            el = el.trim();
            var parsed = parseToken(el, arr[i + 1]);
            // Build up the parsed values for usage string.
            if (parsed.flag) {
                usage.push(parsed.name);
                if (!isCommand)
                    usage = usage.concat(parsed.aliases);
                if (parsed.required)
                    usage.push("<" + parsed.as + ">");
                else
                    usage.push("[" + parsed.as + "]");
            }
            else {
                if (parsed.required)
                    usage.push("<" + parsed.name + ">");
                else
                    usage.push("[" + parsed.name + "]");
            }
            // Set postion and update counter.
            if (!parsed.flag) {
                parsed.position = ctr;
                ctr++;
            }
            // The following may be overwritten from .option.
            var type = parsed.type = parsed.type || (_this.pargv.options.auto ? 'auto' : 'string');
            // Add default coercion may be overridden.
            _this._coercions[el] = _this.normalizeCoercion(type, null);
            // Store the options for the command.
            _this.options[parsed.name] = chek_1.extend({}, _this.options[parsed.name], parsed);
            // Add to collection of parsed options.
            parsedOpts.push(_this.options[parsed.name]);
        });
        if (isCommand)
            this._usage = usage.join(' ');
        return parsedOpts;
    };
    /**
     * Coerce
     * Coerce or transform the defined option when matched.
     *
     * @param key the option key to be coerced.
     * @param fn the string type, RegExp or coerce callback.
     * @param def an optional value when coercion fails.
     */
    PargvCommand.prototype.normalizeCoercion = function (fn, def) {
        fn = fn || (this.pargv.options.auto ? 'auto' : 'string');
        if (chek_1.isString(fn) || chek_1.isRegExp(fn))
            fn = castToType.bind(null, fn, def);
        if (!chek_1.isFunction(fn))
            log.error('invalid cast type only string, RegExp or Callback Function are supported.');
        return fn;
    };
    PargvCommand.prototype.command = function (command, description, config) {
        var cmd = new PargvCommand(command, description, config, this.pargv);
        this.pargv.commands[cmd._name] = cmd;
        return cmd;
    };
    /**
     * Find Option
     * Looks up an option by name, alias or position.
     *
     * @param key the key or alias name to find option by.
     */
    PargvCommand.prototype.findOption = function (key) {
        var option;
        for (var k in this.options) {
            var opt = this.options[k];
            var aliases = opt.aliases;
            if (opt.as)
                aliases.push(opt.as);
            if ((key === k || chek_1.contains(aliases, key)) || key === opt.position) {
                option = opt;
                break;
            }
        }
        return option;
    };
    PargvCommand.prototype.findInCollection = function (key, coll, def) {
        if (coll[key])
            return coll[key];
        var opt = this.findOption(key);
        var aliases = opt.aliases;
        if (opt.as)
            aliases.push(opt.as);
        var fn;
        // Iterate aliases if match check if coercion exists.
        while (aliases.length && !fn) {
            var k = aliases.shift();
            fn = coll[k];
        }
        return chek_1.toDefault(fn, def);
    };
    /**
     * Alias To Name
     * Converts an alias to the primary option name.
     *
     * @param alias the alias name to be converted.
     */
    PargvCommand.prototype.aliasToName = function (alias) {
        var opt = this.findOption(alias);
        return (opt && opt.name) || null;
    };
    /**
     * Stats
     * Validates the arguments to be parsed return stats.
     *
     * @param argv the array of arguments to validate.
     */
    PargvCommand.prototype.stats = function (argv) {
        var _this = this;
        var clone = argv.slice(0);
        argv = argv.slice(0);
        var opts = this.options;
        var stats = {
            commandsMissing: [],
            commandsRequiredCount: 0,
            commandsOptionalCount: 0,
            commandsMissingCount: 0,
            flagsMissing: [],
            flagsRequiredCount: 0,
            flagsOptionalCount: 0,
            flagsMissingCount: 0,
            flagsDuplicates: []
        };
        var ctr = 0;
        var filteredCmds = [];
        var filteredFlags = [];
        // Filter out only commands no flags.
        argv.forEach(function (el, i) {
            var opt = _this.findOption(el);
            if (opt) {
                if (opt.flag) {
                    if (opt.type !== 'boolean')
                        argv.splice(i + 1, 1);
                    filteredFlags.push(el);
                }
            }
            if (!FLAG_EXP.test(el))
                filteredCmds.push(el);
        });
        filteredFlags.sort().forEach(function (f, i) {
            var prev = filteredFlags[i - 1];
            var next = filteredFlags[i + 1];
            if (stats.flagsDuplicates.indexOf(f) < 0 && (prev === f || next === f))
                stats.flagsDuplicates.push(f);
        });
        var _loop_1 = function (p) {
            var opt = opts[p];
            var names = [opt.name].concat(opt.aliases || []);
            // Don't process injected
            // debug options.
            if (/^--debug/.test(opt.name))
                return "continue";
            var hasOpt;
            if (opt.flag) {
                hasOpt = chek_1.containsAny(argv, names);
                if (opt.required) {
                    stats.flagsRequiredCount++;
                    if (!hasOpt) {
                        stats.flagsMissing.push(opt);
                        stats.flagsMissingCount++;
                    }
                }
                else {
                    stats.flagsOptionalCount++;
                }
                clone = clone.filter(function (el, i) {
                    var tmpOpt = _this.findOption(el);
                    if (tmpOpt.flag && tmpOpt.type !== 'boolean')
                        clone.splice(i + 1, 1);
                    return !chek_1.contains(names, el);
                });
            }
            else {
                hasOpt = filteredCmds[opt.position];
                if (opt.required) {
                    stats.commandsRequiredCount++;
                    if (!hasOpt) {
                        stats.commandsMissing.push(opt);
                        stats.commandsMissingCount++;
                    }
                }
                else {
                    stats.commandsOptionalCount++;
                }
                clone = clone.filter(function (el) {
                    return el !== hasOpt;
                });
            }
        };
        for (var p in opts) {
            _loop_1(p);
        }
        // Save any uknown args.
        stats.unknown = clone;
        return stats;
    };
    /**
     * Option
     * Adds option to command.
     *
     * @param val the option val to parse or option configuration object.
     * @param description the description for the option.
     * @param def the default value.
     * @param coerce the expression, method or type for validating/casting.
     */
    PargvCommand.prototype.option = function (val, description, coerce, def) {
        var opt;
        if (chek_1.isPlainObject(val)) {
            opt = val;
            if (!opt.name)
                log.error('cannot add option using name property of undefined.');
            coerce = opt.coerce;
        }
        var parsed = opt || this.parseTokens(val)[0];
        parsed.description = description;
        this._coercions[parsed.name] = this.normalizeCoercion(coerce, def);
        chek_1.extend(this.options[parsed.name], parsed);
        return this;
    };
    /**
     * Coerce
     * Coerce or transform the defined option when matched.
     *
     * @param key the option key to be coerced.
     * @param fn the string type, RegExp or coerce callback.
     * @param def an optional value when coercion fails.
     */
    PargvCommand.prototype.coerce = function (key, fn, def) {
        this._coercions[key] = this.normalizeCoercion(fn, def);
        return this;
    };
    /**
     * Demand
     * Demands that the option be present when parsed.
     *
     * @param val the value or list of flags to require.
     * @param args allows for demands as separate method signature params.
     */
    PargvCommand.prototype.demand = function (val) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        args = mergeArgs(val, args);
        // Iterate and ensure option is required.
        args.forEach(function (d) {
            d = d.trim();
            d = FLAG_EXP.test(d) ? d : d.length > 1 ? "--" + d : "-" + d;
            _this._demands.push(d);
        });
    };
    /**
     * Depends
     * When this option demand dependents.
     *
     * @param when when this option demand the following.
     * @param demand the option to demand.
     * @param args allows for separate additional vals denoting demand param.
     */
    PargvCommand.prototype.depends = function (when, demand) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        args = mergeArgs(demand, args);
        this._depends[when] = args;
    };
    /**
     * Description
     * Saves the description for a command or option.
     *
     * @param key the option key to set description for, none for setting command desc.
     * @param val the description.
     */
    PargvCommand.prototype.description = function (key, val) {
        if (arguments.length === 1) {
            val = key;
            key = undefined;
        }
        if (!key) {
            this._description = val || this._description;
        }
        else {
            var opt = this.findOption(key);
        }
        return this;
    };
    /**
     * Alias
     * Adds aliases for the command.
     *
     * @param val the value containing command aliases.
     * @param args allows for aliases as separate method signature params.
     */
    PargvCommand.prototype.alias = function (val) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this._aliases = this._aliases.concat(mergeArgs(val, args));
        return this;
    };
    /**
     * Action
     * Adds an action event to be called when parsing matches command.
     *
     * @param fn the callback function when parsed command matches.
     */
    PargvCommand.prototype.action = function (fn) {
        if (!fn)
            log.error('cannot add action with action method of undefined.');
        this._action = fn;
        return this;
    };
    /**
     * Example
     * Simply stores provided string as an example for displaying in help.
     *
     * @param val the example value to be stored.
     * @param args allows for examples as separate method signature params.
     */
    PargvCommand.prototype.example = function (val) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        this._examples = this._examples.concat(mergeArgs(val, args));
        return this;
    };
    /**
     * Epilog
     * Adds trailing message like copying to help.
     */
    PargvCommand.prototype.epilog = function (val) {
        this.pargv.epilog(val);
        return this.pargv;
    };
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    PargvCommand.prototype.parse = function () {
        var argv = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argv[_i] = arguments[_i];
        }
        return this.pargv.parse;
    };
    /**
     * Exec
     * Parses arguments then executes command action if any.
     *
     * @param argv optional arguments otherwise defaults to process.argv.
     */
    PargvCommand.prototype.exec = function () {
        var argv = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argv[_i] = arguments[_i];
        }
        return this.pargv.exec;
    };
    return PargvCommand;
}());
exports.PargvCommand = PargvCommand;
// PARGV CONTAINER //
var Pargv = (function () {
    function Pargv(options) {
        var _this = this;
        this._helpDisabled = false;
        this.commands = {};
        this.options = chek_1.extend({}, DEFAULTS, options);
        colurs = new colurs_1.Colurs({ enabled: this.options.colorize });
        // Set default help handler.
        this._helpHandler = function (command) {
            if (_this._helpDisabled === true)
                return;
            return _this.compileHelp(command).get();
        };
        // Enable help command.
        this.command('help.h')
            .action(this.showHelp.bind(this));
        // Add catch all command.
        this.command('*', null);
    }
    // PRIVATE
    /**
     * Compile Help
     * Compiles help for all commands or single defined commnand.
     *
     * @param command the optional command to build help for.
     */
    Pargv.prototype.compileHelp = function (command) {
        var _this = this;
        var layout = this.layout();
        var obj = {};
        // Get single cmd in object or
        // get all commands.
        var cmds = command ? {}[command] = this.commands[command] : this.commands;
        var helpCmd;
        if (!command) {
            helpCmd = cmds['help'];
        }
        // Define color vars.
        var primary = this.options.colors.primary;
        var alert = this.options.colors.alert;
        var accent = this.options.colors.accent;
        var muted = this.options.colors.muted;
        var div = this.options.divider;
        var ctr = 0;
        // Builds option row help.
        var buildOption = function (opt) {
            var names = [opt.name].concat(opt.aliases);
            var namesStr = names.join(', ');
            var arr = ['\t\t' + names, opt.description || ''];
            var lastCol = opt.required ? { text: colurs.applyAnsi('required', alert), align: 'right' } : '';
            arr.push(lastCol);
            layout.div.apply(layout, arr);
        };
        // Builds commands and flags help.
        var buildOptions = function (cmd) {
            var optKeys = chek_1.keys(cmd.options);
            var flagCt = 0;
            var cmdCt = 0;
            layout.section(colurs.applyAnsi('Commands:', accent));
            // Build sub commands.
            optKeys.forEach(function (k) {
                var opt = cmd.options[k];
                if (!opt.flag) {
                    buildOption(opt);
                    cmdCt++;
                }
            });
            if (!cmdCt)
                layout.div(colurs.applyAnsi('  none', muted));
            layout.section(colurs.applyAnsi('Flags:', accent));
            // Build flags.
            optKeys.forEach(function (k) {
                var opt = cmd.options[k];
                if (opt.flag) {
                    buildOption(opt);
                    flagCt++;
                }
            });
            if (!flagCt)
                layout.div(colurs.applyAnsi('  none', muted));
        };
        // Builds the app name, version descript header.
        var buildHeader = function () {
            // Add the name to the layout.
            if (_this._name) {
                if (!_this._nameFont)
                    layout.repeat(colurs.applyAnsi(div, muted));
                var tmpName = _this._name;
                if (_this._nameFont)
                    tmpName = _this.logo(tmpName, _this._nameFont, _this._nameStyles).get();
                else
                    tmpName = colurs.applyAnsi(tmpName, _this._nameStyles);
                layout.div(tmpName);
                if (_this._nameFont)
                    layout.div();
                // Add description to layout.
                if (_this._description)
                    layout.div(colurs.applyAnsi('Description:', accent) + " " + chek_1.padLeft(_this._description, 3));
                // Add version to layout.
                if (_this._version)
                    layout.div(colurs.applyAnsi('Version:', accent) + " " + chek_1.padLeft(_this._version, 7));
                // Add break in layout.
                layout.repeat(colurs.applyAnsi(div, muted));
            }
        };
        // Builds the body of the help iterating
        // over each command and its options.
        var buildBody = function () {
            // Iterate each command build option rows.
            for (var p in cmds) {
                if (ctr > 0)
                    layout.repeat(colurs.applyAnsi('-', muted), 15);
                var cmd = cmds[p];
                var opts = cmd.options;
                // Add usage to layout.
                var usage = colurs.applyAnsi('Usage: ', primary) + cmd._usage;
                layout.div(usage);
                if (cmd._description) {
                    layout.div();
                    layout.div(colurs.applyAnsi(cmd._description, muted));
                }
                // Build option rows.
                buildOptions(cmd);
                ctr++;
            }
        };
        var buildFooter = function () {
            // Add epilog if any.
            if (_this._epilog) {
                layout.div('');
                layout.div(colurs.applyAnsi(_this._epilog, muted));
            }
        };
        // Build help for single command.
        if (command) {
            buildBody();
        }
        else {
            buildHeader();
            buildBody();
            buildFooter();
        }
        // return the resulting layout.
        return layout;
    };
    Object.defineProperty(Pargv.prototype, "ui", {
        // GETTERS
        /**
         * UI
         * Alias to layout for backward compatibility.
         */
        get: function () {
            return this.layout;
        },
        enumerable: true,
        configurable: true
    });
    // USAGE & COMMANDS //
    /**
     * App
     * Just adds a string to use as title of app, used in help.
     *
     * @see http://flamingtext.com/tools/figlet/fontlist.html
     * Simple Font examples
     * standard, doom, ogre, slant, rounded, big, banner
     *
     * @param val the value to use as app name.
     * @param font a Figlet font.
     * @param styles an ansi color/style or array of styles.
     */
    Pargv.prototype.name = function (val, styles, font) {
        this._name = val;
        this._nameStyles = chek_1.toArray(styles, []);
        this._nameFont = font;
        return this;
    };
    /**
     * Version
     * Just adds a string to use as the version for your program, used in help.
     *
     * @param val the value to use as version name.
     */
    Pargv.prototype.version = function (val) {
        this._version = val;
        return this;
    };
    /**
     * Description
     * The program's description or purpose.
     *
     * @param val the description string.
     */
    Pargv.prototype.description = function (val) {
        this._description = val;
        return this;
    };
    Pargv.prototype.command = function (command, description, config) {
        var cmd = new PargvCommand(command, description, config, this);
        this.commands[cmd._name] = cmd;
        return cmd;
    };
    /**
   * Epilog
   * Displays trailing message.
   *
   * @param val the trailing epilogue to be displayed.
   */
    Pargv.prototype.epilog = function (val) {
        this._epilog = val;
        return this;
    };
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    Pargv.prototype.parse = function () {
        var _this = this;
        var argv = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argv[_i] = arguments[_i];
        }
        var cmdStr = '';
        var parsedExec, action;
        var isExec = chek_1.last(argv) === '__exec__' ? argv.pop() : null;
        // if first arg is array then set as argv.
        if (chek_1.isArray(argv[0]))
            argv = argv[0];
        // use provided args or get process.argv.
        argv = (argv.length && argv) || process.argv;
        // Clone the original args.
        var source = argv.slice(0);
        // Parse the executed filename.
        parsedExec = path.parse(source[1]);
        // Seed result object with paths.
        var result = {
            cmd: '',
            cmds: [],
            flags: {},
            globalPath: prefix,
            nodePath: source[0],
            execPath: source[1],
            exec: parsedExec.name
        };
        // Check for debug flags if found inject into args.
        if (chek_1.isDebug())
            argv = argv.concat(normalizeDebug(argv));
        // Remove node and exec path from args.
        argv = argv.slice(2);
        // Normalize the args/flags.
        argv = normalizeArgs(argv);
        // Don't shift if is a flag arg.
        if (!FLAG_EXP.test(argv[0]))
            cmdStr = result.cmd = argv.shift();
        // Lookup the command.
        var cmd = this.commands[cmdStr];
        var ctr = 0;
        if (!cmd)
            log.error("invalid command, the command " + cmdStr + " was not found.");
        var stats = cmd.stats(argv);
        // Check if strict parsing is enabled.
        if (this.options.strict && (stats.flagsMissingCount || stats.commandsMissingCount)) {
            if (stats.commandsMissingCount) {
                var missing = stats.commandsMissing[0];
                log.error("missing required command or subcommand - " + missing.name + ".");
            }
            if (stats.flagsMissingCount) {
                var missing = stats.flagsMissing[0];
                log.error("missing required flag or option - " + missing.name + ".");
            }
        }
        // Check if duplicate flags are allowed.
        if (!this.options.dupes && stats.flagsDuplicates.length) {
            log.error("whoops duplicate flags are prohibited, found duplicates - " + stats.flagsDuplicates.join(', ') + ".");
        }
        // Iterate the args.
        argv.forEach(function (el, i) {
            var nextId = i + 1;
            var next = argv[nextId];
            var isFlag = FLAG_EXP.test(el);
            var isKeyVal = KEYVAL_EXP.test(next || '');
            var isFlagNext = FLAG_EXP.test(next || '');
            // Lookup the defined option if any.
            var opt = isFlag ? cmd.findOption(el) : cmd.findOption(ctr);
            // No anonymous flags/commands allowed throw error.
            if (!opt && _this.options.strict)
                log.error("unknown argument " + el + " is NOT allowed in strict mode.");
            var isNot = FLAG_NOT_EXP.test(el) ? true : false;
            el = isNot ? el.replace(/^--no/, '') : el;
            var key = el.replace(FLAG_EXP, '');
            var keyName = chek_1.camelcase((opt && opt.as) || key);
            var isBool = (opt && !opt.as) || (!opt && (isFlagNext || !next));
            var type = _this.options.auto ? 'auto' : 'string';
            var fn = !opt ? castToType.bind(null, type, next) : opt.coerce;
            // Is a flag.
            if (isFlag) {
                var val = isBool ? true : fn(next, opt, cmd);
                // If required and no value throw error.
                if (opt.required && !chek_1.isValue(val))
                    log.error("command " + cmd._name + " requires missing option " + opt.name + ".");
                if (chek_1.isValue(val)) {
                    // If the result is an object use extend
                    // in case the object is built over multiple flags.
                    if (chek_1.isPlainObject(val) || isDotNotation(key)) {
                        if (isDotNotation(key))
                            chek_1.set(result.flags, key, val);
                        else
                            result.flags[keyName] = chek_1.extend({}, result.flags[keyName], val);
                    }
                    else {
                        result.flags[keyName] = val;
                    }
                }
                if (!isBool)
                    argv.splice(next, 1);
            }
            else {
                var val = fn(el, opt, cmd);
                if (chek_1.isValue(val))
                    result.cmds.push(val);
                // Update position counter.
                ctr++;
            }
        });
        // If called from exec pad
        // cmds array for use with spread.
        if (isExec) {
            var totalArgs = stats.commandsOptionalCount + stats.commandsRequiredCount;
            var offset = totalArgs - result.cmds.length;
            while (offset > 0 && offset--)
                result.cmds.push(null);
        }
        return result;
    };
    /**
     * Exec
     * Parses arguments then executes command action if any.
     *
     * @param argv optional arguments otherwise defaults to process.argv.
     */
    Pargv.prototype.exec = function () {
        var argv = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argv[_i] = arguments[_i];
        }
        var parsed = this.parse.apply(this, argv.concat(['__exec__']));
        var cmd = this.commands[parsed.cmd];
        if (chek_1.isFunction(cmd._action))
            cmd._action.apply(cmd, parsed.cmds.concat([parsed, cmd]));
    };
    Pargv.prototype.help = function (fn) {
        var _this = this;
        if (chek_1.isBoolean(fn)) {
            this._helpDisabled = fn;
        }
        else if (chek_1.isFunction(fn)) {
            this._helpDisabled = undefined;
            this._helpHandler = function (command) {
                return fn(command, _this.commands);
            };
        }
        return this;
    };
    /**
     * Show Help
     * Displays all help or help for provided command name.
     *
     * @param command optional name for displaying help for a particular command.
     */
    Pargv.prototype.showHelp = function (command) {
        var name = chek_1.isPlainObject(command) ? command._name : command;
        var help = this._helpHandler(name, this.commands);
        console.log(help);
        console.log();
    };
    /**
     * Remove
     * Removes an existing command from the collection.
     *
     * @param cmd the command name to be removed.
     */
    Pargv.prototype.remove = function (cmd) {
        delete this.commands[cmd];
    };
    // EXTENDED METHODS
    /**
     * Logo
     * Builds or Displays an ASCII logo using Figlet.
     *
     * @param text the text to be displayed.
     * @param font the figlet font to be used.
     * @param color the optional color to be used.
     * @param horizontalLayout the horizontal layout mode.
     * @param verticalLayout the vertical layout mode.
     */
    Pargv.prototype.logo = function (text, font, styles) {
        var result;
        var methods;
        var defaults = {
            text: 'App',
            font: 'Ogre',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        };
        var options = chek_1.isPlainObject(text) ? text : {
            text: text,
            font: font
        };
        // Merge the options.
        options = chek_1.extend({}, defaults, options);
        // Process the text.
        result = figlet.textSync(options.text, options);
        // Apply ansi styles if any.
        if (styles)
            result = colurs.applyAnsi(result, styles);
        /**
         * Render
         * Renders out the Figlet font logo.
         */
        function render() {
            console.log(result);
            return this;
        }
        /**
         * Fonts
         * Lists Figlet Fonts.
         */
        function fonts() {
            return figlet.fontsSync();
        }
        /**
         * Get
         * Returns the Figlet font without rendering.
         */
        function get() {
            return result;
        }
        var show = render;
        methods = {
            fonts: fonts,
            show: show,
            render: render,
            get: get
        };
        return methods;
    };
    /**
      * Layout
      * Creates a CLI layout much like creating divs in the terminal.
      * Supports strings with \t \s \n or IUIOptions object.
      * @see https://www.npmjs.com/package/cliui
      *
      *
      *
      * @param width the width of the layout.
      * @param wrap if the layout should wrap.
      */
    Pargv.prototype.layout = function (width, wrap) {
        // Base width of all divs.
        width = width || 100;
        // Init cli ui.
        var ui = cliui({ width: width, wrap: wrap });
        // Alignment.
        var flowMap = {
            '-1': null,
            0: 'center',
            1: 'right'
        };
        function invalidExit(element, elements) {
            if (chek_1.isString(element) && elements.length && chek_1.isPlainObject(elements[0]))
                log.error('invalid element(s) cannot mix string element with element options objects.');
        }
        function add(type) {
            var elements = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                elements[_i - 1] = arguments[_i];
            }
            ui[type].apply(ui, elements);
        }
        /**
         * Div
         * Adds Div to the UI.
         *
         * @param elements array of string or IUIOptions
         */
        function div() {
            var elements = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                elements[_i] = arguments[_i];
            }
            add.apply(void 0, ['div'].concat(elements));
            return methods;
        }
        /**
         * Flow
         * Shortcut method to specify columns and their flow
         * direction or alignment. Last arg must be number or
         * and array matching the number or preceding elements.
         *
         * Supports flowing right or center.
         * 1 = right
         * 0 = center
         *
         * @example
         * Flow the first and last elements to the right with the middle centered.
         * flow('one', 'two', 'three', [1, 0, 1])
         *
         * @example
         * Flow the last element to the right
         * flow('one', 'two', 1)
         *
         * @param align the alignment direction or array of alignments.
         * @param elements the column elements with last element as number or array.
         */
        function flow(align) {
            var elements = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                elements[_i - 1] = arguments[_i];
            }
            align = chek_1.toArray(align);
            var isLast = align.length === 1;
            var lastIdx = elements.length - 1;
            elements = elements.map(function (el, i) {
                if (isLast && i < lastIdx)
                    return el;
                var dir = !isLast ? align[i] : align[0];
                if (!dir || dir === null || dir === -1)
                    return el;
                dir = flowMap[dir];
                if (chek_1.isPlainObject(el))
                    el.align = dir;
                else
                    el = { text: el, align: dir };
                return el;
            });
            add.apply(void 0, ['div'].concat(elements));
            return this;
        }
        /**
         * Span
         * Adds Span to the UI.
         *
         * @param elements array of string or IUIOptions
         */
        function span() {
            var elements = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                elements[_i] = arguments[_i];
            }
            add.apply(void 0, ['span'].concat(elements));
            return methods;
        }
        /**
         * Repeat
         * Simply repeats a character by layout width
         * or specified length. Good for creating sections
         * or dividers. If single integer is used for padding
         * will use value for top padding then double for bottom.
         *
         * @param char the character to be repeated
         * @param len optional lenth to repeat or width offset by 25 is used.
         * @param padding number or array of numbers if single digit used for top/bottom.
         */
        function repeat(char, len, padding) {
            len = len || (width - 1);
            var _char = char;
            while (len--)
                char += _char;
            this.section(char, padding);
            return methods;
        }
        /**
         * Section
         * Helper to create a section header.
         *
         * When single integer is used for padding it will
         * be applied to the top and bottom padding only where
         * the bottom will be double the top.
         *
         * @param title the name of the section.
         * @param padding the optional padding used for the section.
         */
        function section(title, padding) {
            padding = padding >= 0 ? padding : 1;
            if (chek_1.isNumber(padding))
                padding = [padding, 0, padding, 0];
            add('div', { text: title, padding: padding });
            return methods;
        }
        /**
         * Join
         * Simply joins element args separated by space.
         *
         * @param elements the elements to be created.
         */
        function join(by) {
            var elements = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                elements[_i - 1] = arguments[_i];
            }
            add('div', elements.join(by));
            return methods;
        }
        /**
         * Get
         * Gets the defined UI as string.
         */
        function get() {
            return ui.toString() || '';
        }
        /**
         * Render
         * Renders out the defined UI.
         * When passing elements in render they default to "div" layout.
         *
         * @param elements optional elements to be defined at render.
         */
        function render() {
            var elements = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                elements[_i] = arguments[_i];
            }
            if (elements.length)
                add.apply(void 0, ['div'].concat(elements));
            console.log(get());
        }
        // Alias for render.
        var show = render;
        var methods = {
            div: div,
            span: span,
            repeat: repeat,
            section: section,
            flow: flow,
            join: join,
            get: get,
            render: render,
            show: show,
            ui: ui
        };
        return methods;
    };
    return Pargv;
}());
exports.Pargv = Pargv;
var instance;
function createInstance(options) {
    if (!instance)
        instance = new Pargv(options);
    return instance;
}
exports.get = createInstance;
//# sourceMappingURL=index.js.map