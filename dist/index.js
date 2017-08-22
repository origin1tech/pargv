"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var cliui = require("cliui");
var figlet = require("figlet");
var prefix = require("global-prefix");
var colurs_1 = require("colurs");
var chek_1 = require("chek");
var pkg = chek_1.tryRequire(path.resolve(process.cwd(), 'package.json'), { version: '0.0.0' });
var colurs;
var KEYVAL_EXP = /^((.+:.+)(\||\+)?)$/;
var CSV_EXP = /^(.+,.+){1,}$/;
var ARRAY_EXP = /^(.+(,|\||\s).+){1,}$/;
var JSON_EXP = /^"?{.+}"?$/;
var REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
var REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
var FLAG_EXP = /^--?/;
var FLAG_SHORT_EXP = /^-[a-zA-Z0-9]/;
var TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/;
var TOKEN_PREFIX_EXP = /^(--?|<|\[)/;
var NESTED_EXP = /^[a-zA-Z0-9]+\./;
var GLOBAL_PREFIX_EXP = new RegExp('^' + prefix, 'i');
var SPLIT_CHARS = ['|', ',', ' '];
var DEFAULTS = {
    strict: false,
    auto: true,
    colors: true,
    catchAll: 'help' // defines action when no command is found by default shows help.
};
// UTILS //
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
        this._description = '';
        this._aliases = [];
        this._examples = [];
        this._depends = {};
        this.onAction = chek_1.noop;
        this.options = {};
        if (!command)
            log.error('cannot define command using name of undefined.');
        if (chek_1.isPlainObject(command)) {
            options = command;
            description = undefined;
        }
        if (chek_1.isPlainObject(description)) {
            options = description;
            description = undefined;
        }
        options = options || {};
        this.pargv = context;
        this.parseTokens(command || options.command, true);
        this._description = description || options.description || "Executes " + command + " command.";
        this._aliases = chek_1.isString(options.aliases) ? chek_1.split(options.aliases, SPLIT_CHARS) : [];
        // Add debug options
        this.option('--debug', 'Debug flag.');
        this.option('--debug-brk [debugPort]', 'Debug break flag.');
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
            if (this.pargv.commands[tmpCmd[0]])
                log.error("cannot add command", colurs.yellow("" + tmpCmd[0]), "the command already exists.");
            this.name = tmpCmd.shift();
            if (tmpCmd.length)
                this._aliases = tmpCmd;
            usage.push(this.name);
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
            var type = parsed.type || (_this.pargv.options.auto ? 'auto' : 'string');
            parsed.cast = _this.castToType.bind(_this, type, null);
            parsed.description = parsed.flag ? "flag option." : "sub command/argument.";
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
     * Cast To Type
     * Casts a value to the specified time or fallsback to default.
     *
     * @param type the type to cast to.
     * @param def an optional default value.
     * @param val the value to be cast.
     */
    PargvCommand.prototype.castToType = function (type, def, val) {
        var _this = this;
        var result = null;
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
        result = chek_1.toDefault(result, def);
        // Ensure valid type.
        if (!is[type](result))
            log.error("expected type " + colurs.cyan(type) + " but got " + colurs.cyan(chek_1.getType(type)) + ".");
        return result;
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
            var aliases = this.options[k].aliases;
            if (chek_1.isString(key) && (key === k || chek_1.contains(aliases, key))) {
                option = opt;
                break;
            }
            else if (key === opt.position) {
                option = opt;
            }
        }
        return option;
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
    PargvCommand.prototype.validate = function (argv) {
        var _this = this;
        console.log();
        console.log(this._usage);
        console.log('arguments: ' + argv.join(' '));
        console.log();
        var opts = this.options;
        var stats = {
            commandsMissing: {},
            commandsRequiredCount: 0,
            commandsOptionalCount: 0,
            commandsMissingCount: 0,
            flagsMissing: {},
            flagsRequiredCount: 0,
            flagsOptionalCount: 0,
            flagsMissingCount: 0
        };
        var ctr = 0;
        var filteredCmds = [];
        argv.forEach(function (el, i) {
            var opt = _this.findOption(el);
            if (opt) {
                if (opt.flag && opt.type !== 'boolean')
                    argv.splice(i + 1, 1);
            }
            if (!FLAG_EXP.test(el))
                filteredCmds.push(el);
        });
        console.log(filteredCmds);
        for (var p in opts) {
            var opt = opts[p];
            var names = [opt.name].concat(opt.aliases || []);
            // Don't process injected
            // debug options.
            if (/^--debug/.test(opt.name))
                continue;
            // Store required and optiona total counts.
            if (opt.required)
                opt.flag ? stats.flagsRequiredCount++ : stats.commandsRequiredCount++;
            else
                opt.flag ? stats.flagsOptionalCount++ : stats.commandsOptionalCount++;
            var hasOpt = void 0;
            if (opt.flag) {
                hasOpt = chek_1.containsAny(argv, names);
                if (opt.required) {
                    stats.flagsRequiredCount++;
                    if (!hasOpt) {
                        stats.flagsMissing[opt.name] = opt;
                        stats.flagsMissingCount++;
                    }
                }
            }
            else {
            }
            //console.log('match:', opt.name, names.join(', '), '-', hasOpt);
        }
        return stats;
    };
    /**
     * Command Count
     * Gets the total sub command count and total required.
     */
    PargvCommand.prototype.commandStats = function () {
        var stats = {
            cmds: {
                required: [],
                requiredAny: [],
                total: []
            },
            flags: {
                required: [],
                requiredAny: [],
                total: []
            }
        };
        var cmds = stats.cmds;
        var flags = stats.flags;
        var opts = this.options;
        for (var p in opts) {
            var opt = opts[p];
            if (!opt.flag) {
                cmds.total.push(opt.name);
                if (opt.required) {
                    cmds.required.push(opt.name);
                    cmds.requiredAny = cmds.requiredAny.concat([opt.name].concat(opt.aliases || []));
                }
            }
            else {
                flags.total.push(opt.name);
                if (opt.required) {
                    flags.required.push(opt.name);
                    flags.requiredAny = flags.requiredAny.concat([opt.name].concat(opt.aliases || []));
                }
            }
        }
        return stats;
    };
    /**
     * Option
     * Adds option to command.
     *
     * @param val the option val to parse or option configuration object.
     * @param description the description for the option.
     * @param def the default value.
     * @param type the expression, method or type for validating/casting.
     */
    PargvCommand.prototype.option = function (val, description, def, type) {
        if (chek_1.isPlainObject(val)) {
            var opt = val;
            if (!opt.name)
                log.error('cannot add option using name property of undefined.');
            chek_1.extend(this.options[opt.name], opt);
        }
        else {
            var parsed = this.parseTokens(val)[0];
            parsed.description = description || parsed.description;
            parsed.default = def;
            type = type || parsed.type || (this.pargv.options.auto ? 'auto' : 'string');
            if (chek_1.isString(type) || chek_1.isRegExp(type))
                type = this.castToType.bind(this, type, def);
            if (!chek_1.isString(type) && !chek_1.isFunction(type))
                log.error('invalid cast type only string, RegExp or Callback Function are supported.');
            parsed.cast = type;
        }
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
            var stripped = stripToken(d);
            var opt = _this.findOption(d);
            // set existing to required.
            if (opt) {
                opt.required = true;
            }
            else {
                var type = _this.pargv.options.auto ? 'auto' : 'string';
                _this.options[d] = { name: d, required: true, aliases: [], type: type, flag: true };
            }
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
     * Saves the description for the command.
     *
     * @param val the description.
     */
    PargvCommand.prototype.description = function (val) {
        this._description = val || this._description;
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
        this.onAction = fn;
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
    return PargvCommand;
}());
exports.PargvCommand = PargvCommand;
// PARGV CONTAINER //
var Pargv = (function () {
    function Pargv(options) {
        this._suppress = false;
        this.commands = {};
        this.options = chek_1.extend({}, DEFAULTS, options);
        colurs = new colurs_1.Colurs({ enabled: this.options.colors });
    }
    Object.defineProperty(Pargv.prototype, "ui", {
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
     * Usage
     * Simply a string denoting the general command and options layout.
     * If not defined the usage statement for the first command is used.
     *
     * @param val the usage string.
     */
    Pargv.prototype.usage = function (val) {
        this._usage = val;
        return this;
    };
    /**
     * Command
     * Creates new command configuration.
     *
     * @param command the command to be matched or options object.
     * @param description the description or options object.
     * @param options options object for the command.
     */
    Pargv.prototype.command = function (command, description, options) {
        var cmd = new PargvCommand(command, description, options, this);
        this.commands[cmd.name] = cmd;
        return cmd;
    };
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    Pargv.prototype.parse = function () {
        var argv = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argv[_i] = arguments[_i];
        }
        var cmdStr = '';
        var parsedExec, action;
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
        var autoType = this.options.auto ? 'auto' : 'string';
        var ctr = 0;
        if (!cmd)
            log.error("invalid command, the command " + cmdStr + " was not found.");
        // Validate the arguments.
        if (this.options.strict) {
        }
        var validation = cmd.validate(argv);
        // console.log(validation);
        // Iterate the args.
        argv.forEach(function (el, i) {
            var nextId = i + 1;
            var next = argv[nextId];
            var isFlag = FLAG_EXP.test(el);
            // const prev = argv[i - 1];
            // const isPrevFlag = FLAG_EXP.test(prev || '');
            // const isNextFlag = FLAG_EXP.test(next || '');
            // const isShortFlag = FLAG_SHORT_EXP.test(el);
            // const isPrevShortFlag = FLAG_SHORT_EXP.test(prev);
            var isKeyVal = KEYVAL_EXP.test(next || '');
            // Lookup the defined option if any.
            var opt = isFlag ? cmd.findOption(el) : cmd.findOption(ctr);
            // No anonymous flags/commands allowed throw error.
            if (!opt)
                log.error("unknown argument " + el + " is NOT allowed in strict mode.");
            // Is a flag.
            if (isFlag) {
                var key = el.replace(FLAG_EXP, '');
                var keyName = chek_1.camelcase(opt.as || key);
                var isBool = !opt.as;
                var fn = opt.cast;
                var val = isBool ? true : fn(next);
                // If required and no value throw error.
                if (opt.required && !chek_1.isValue(val))
                    log.error("command " + cmd.name + " requires missing option " + opt.name + ".");
                if (chek_1.isValue(val)) {
                    // If the result is an object use extend
                    // in case the object is built over multiple flags.
                    if (chek_1.isPlainObject(val))
                        result.flags[keyName] = chek_1.extend({}, result.flags[keyName], val);
                    else
                        result.flags[keyName] = val;
                }
                if (!isBool)
                    argv.splice(next, 1);
            }
            else {
                var fn = opt.cast;
                var val = fn(el);
                result.cmds.push(val);
                // Update position counter.
                ctr++;
            }
        });
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
        var parsed = this.parse.apply(this, argv);
        var cmd = this.commands[parsed.cmd];
        // We should never hit the following.
        if (!cmd)
            log.error("whoops successfully parsed args but command " + parsed.cmd + " could not be found.");
        // Make clone of the sub commands.
        var cmds = parsed.cmds.slice(0);
        var stats = cmd.commandStats();
        var offset = stats.cmds.total.length - cmds.length;
        while (offset > 0 && offset--)
            cmds.push(null);
        if (chek_1.isFunction(cmd.onAction))
            cmd.onAction.apply(cmd, cmds.concat([parsed, cmd]));
    };
    /**
     * Help
     * Displays the generated help or supplied help string.
     *
     * @param val optional value to use instead of generated help.
     */
    Pargv.prototype.help = function (val) {
        var layout = this.layout(95);
        // Supported Types
        var types = [
            ['String', '- native string.'],
            ['Boolean', '- native boolean.'],
            ['Float', '- number containing decimal.'],
            ['Integer', ' - number without decimal.'],
            ['Number', '- native number.'],
            ['Date', '- native date.'],
            ['RegExp', '- native regular expression.'],
            ['Array', '- native array.']
        ];
        var typesHelp = layout.join.apply(layout, ['\n'].concat(types.map(function (t) {
            colurs.yellow(t[0]);
            return t.join('\t');
        })));
        return this;
    };
    // EXTENDED METHODS
    /**
     * Logo
     * Displays an ASCII logo using Figlet.
     *
     * @param text the text to be displayed.
     * @param font the figlet font to be used.
     * @param color the optional color to be used.
     * @param horizontalLayout the horizontal layout mode.
     * @param verticalLayout the vertical layout mode.
     */
    Pargv.prototype.logo = function (text, font) {
        var _this = this;
        var result;
        var defaults = {
            text: 'Pargv',
            font: 'Doom',
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
        return {
            // Allows for modifiying the result like colorizing.
            before: function (fn) {
                result = fn(result);
                return _this;
            },
            // Outputs/shows the result in the console.
            show: function () {
                console.log(result);
                return _this;
            },
            // Simply returns the current result.
            result: function () {
                return result;
            }
        };
    };
    /**
     * Fonts
     * Returns list of figlet fonts.
     */
    Pargv.prototype.fonts = function () {
        return figlet.fontsSync();
    };
    /**
      * Layout
      * Creates a CLI layout much like creating divs in the terminal.
      * Supports strings with \t \s \n or IUIOptions object.
      * @see https://www.npmjs.com/package/cliui
      *
      * @param width the width of the layout.
      * @param wrap if the layout should wrap.
      */
    Pargv.prototype.layout = function (width, wrap) {
        // Base width of all divs.
        width = width || 95;
        // Init cli ui.
        var ui = cliui({ width: width, wrap: wrap });
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
            join: join,
            span: span,
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