// IMPORTS //
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var cliui = require("cliui");
var figlet = require("figlet");
var prefix = require("global-prefix");
var colurs_1 = require("colurs");
var utils = require("./utils");
var constants_1 = require("./constants");
// VARIABLES & CONSTANTS //
var colurs;
var log;
var DEFAULTS = {
    strict: false,
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
 * Parse Token
 * Parses a usage token.
 *
 * @param token the token string to be parsed.
 * @param next the next element in usage command.
 */
function parseToken(token, next, auto) {
    var tokens = token.split(':'); // <age:number> to ['<age', 'number>'];
    var key = tokens[0]; // first element is command/option key.
    if (!constants_1.TOKEN_PREFIX_EXP.test(key))
        log.error("cannot parse token " + colurs.bgRed.white(key) + ", token must begin with -, --, < or [.");
    var isRequired = /^</.test(key); // starts with <.
    var isOptional = /^\[/.test(key); // starts with [.
    var type = utils.stripToken(tokens[1] || ''); // strip < or [ from type if any.
    type = type || auto;
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
    var usage = [[token].concat(aliases).join(', ')];
    if (!next)
        return {
            key: key,
            usage: usage,
            aliases: aliases,
            flag: isFlag,
            bool: isBool,
            type: type,
            required: isRequired
        };
    next = parseToken(next, null, auto);
    return {
        key: key,
        usage: usage.concat(next.usage),
        aliases: aliases,
        flag: isFlag,
        bool: false,
        type: next.type,
        as: next.key,
        required: next.required
    };
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
    if (utils.isString(val))
        val = val.trim();
    // Check if is list type expression.
    var isListType = constants_1.ARRAY_EXP.test(type) || utils.isRegExp(type);
    type = isListType ? 'list' : type;
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
        // Never called in autoCast method.
        list: function (v) {
            var match = val.match(utils.splitToList(type));
            result = match && match[0];
        },
        object: function (v) {
            if (!constants_1.KEYVAL_EXP.test(v))
                return null;
            var obj = {};
            var pairs = utils.split(v, ['|', '+']);
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
                    if (_this.options.auto) {
                        castVal = autoCast(castVal) || castVal;
                        if (utils.isArray(castVal))
                            castVal = castVal.map(function (el) {
                                return autoCast(el) || el;
                            });
                    }
                    utils.set(obj, kv[0], castVal);
                }
            });
            return obj;
        },
        json: function (v) {
            if (!constants_1.JSON_EXP.test(v))
                return null;
            v = v.replace(/^"/, '').replace(/"$/, '');
            return utils.tryWrap(JSON.parse, v)();
        },
        array: function (v) {
            if (!constants_1.ARRAY_EXP.test(v))
                return null;
            return utils.toArray(v);
        },
        number: function (v) {
            if (!/[0-9]/g.test(v))
                return null;
            return utils.castType(v, 'number');
        },
        date: function (v) {
            return utils.castType(v, 'date');
        },
        regexp: function (v) {
            if (!constants_1.REGEX_EXP.test(v))
                return null;
            return utils.castType(val, 'regexp');
        },
        boolean: function (v) {
            if (!/^(true|false)$/.test(v))
                return null;
            return utils.castType(v, 'boolean');
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
        return utils.toDefault(result, def || val);
    // Check if there is a default value if nothing is defined.
    result = utils.toDefault(result, def || val);
    // Ensure valid type.
    if (!is[type](result))
        log.error("expected type " + colurs.cyan(type) + " but got " + colurs.cyan(utils.getType(type)) + ".");
    return result;
}
// CLASSES //
var Pargv = (function () {
    function Pargv(options) {
        var _this = this;
        this._helpDisabled = false;
        this.commands = {};
        this.options = utils.extend({}, DEFAULTS, options);
        colurs = new colurs_1.Colurs({ enabled: this.options.colorize });
        log = utils.logger(colurs);
        this.command('__default__'); // Default Command.
        this._helpHandler = function (command) {
            if (_this._helpDisabled === true)
                return;
            return _this.compileHelp(command).get();
        };
        this.command('help.h') // Default help command.
            .action(this.showHelp.bind(this));
    }
    // PRIVATE //
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
            // const optKeys = objectKeys(cmd.options);
            var flagCt = 0;
            var cmdCt = 0;
            layout.section(colurs.applyAnsi('Commands:', accent));
            // Build sub commands.
            // optKeys.forEach((k) => {
            // const opt = cmd.options[k];
            // if (!opt.flag) {
            //   buildOption(opt);
            //   cmdCt++;
            // }
            // });
            if (!cmdCt)
                layout.div(colurs.applyAnsi('  none', muted));
            layout.section(colurs.applyAnsi('Flags:', accent));
            // Build flags.
            // optKeys.forEach((k) => {
            // const opt = cmd.options[k];
            // if (opt.flag) {
            //   buildOption(opt);
            //   flagCt++;
            // }
            //  });
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
                if (_this._describe)
                    layout.div(colurs.applyAnsi('Description:', accent) + " " + utils.padLeft(_this._describe, 3));
                // Add version to layout.
                if (_this._version)
                    layout.div(colurs.applyAnsi('Version:', accent) + " " + utils.padLeft(_this._version, 7));
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
    Object.defineProperty(Pargv.prototype, "find", {
        // GETTERS //
        /**
         * Find
         * Methods for finding commands and options.
         */
        get: function () {
            var _this = this;
            return {
                /**
                 * Command
                 * Finds a command by name.
                 *
                 * @param key the name of the command to find.
                 */
                command: function (key) {
                    var cmds = _this.commands;
                    var cmd = cmds[key];
                    if (cmd)
                        return cmd;
                    for (var p in cmds) {
                        if (cmd)
                            break;
                        var tmp = cmds[p];
                        if (tmp._aliases[key])
                            cmd = tmp;
                    }
                    return cmd;
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "ui", {
        /**
         * UI
         * Alias to layout.
         */
        get: function () {
            return this.layout;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "epilogue", {
        /**
         * Epilogue
         * Alias to epilog.
         */
        get: function () {
            return this.epilog;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "option", {
        // DEFAULT COMMAND //
        // exposes parsing features without need for a command.
        get: function () { return this._command.option; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "alias", {
        get: function () { return this._command.alias; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "describe", {
        get: function () { return this._command.describe; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "coerce", {
        get: function () { return this._command.coerce; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "demand", {
        get: function () { return this._command.demand; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "demandIf", {
        get: function () { return this._command.demandIf; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "min", {
        get: function () { return this._command.min; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "action", {
        get: function () { return this._command.action; },
        enumerable: true,
        configurable: true
    });
    // META //
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
        this._nameStyles = utils.toArray(styles, []);
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
     * @param describe the description string.
     */
    Pargv.prototype.description = function (describe) {
        this._describe = describe;
        return this;
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
    // COMMANDS & PARSING //
    /**
     * Command
     * A string containing Parv tokens to be parsed.
     *
     * @param token the command token string to parse.
     * @param describe a description describing the command.
     */
    Pargv.prototype.command = function (token, describe) {
        var cmd = new PargvCommand(token, describe, this);
        if (token !== '__default__')
            this.commands[cmd._name] = cmd;
        else
            this._command = cmd;
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
        if (utils.isArray(utils.first(argv)))
            argv = argv[0];
        var isExec = utils.last(argv) === '__exec__' ? argv.pop() : null;
        var isUserArgs = argv && argv.length;
        argv = isUserArgs ? argv : process.argv; // process.argv or user args.
        var procArgv = process.argv.slice(0); // get process.argv.
        var parsedExec = path.parse(procArgv[1]); // parse the node execution path.
        var normalized = argv.slice(0); // normalized array of args.
        if (procArgv[1] === argv[1])
            normalized = normalized.slice(2);
        normalized = utils.normalizeArgs(normalized); // normalize the args.
        var name = utils.first(argv); // get first arg.
        var cmd = this.find.command(name); // lookup the command.
        if (cmd)
            normalized.shift(); // found cmd shift first.
        else
            cmd = this._command; // use the default command.
        var result = {
            command: '',
            commands: [],
            options: {},
            globalPath: prefix,
            nodePath: procArgv[0],
            execPath: procArgv[1],
            exec: parsedExec.name
        };
        var ctr = 0;
        normalized.forEach(function (el, i) {
            var nextId = i + 1;
            var next = argv[nextId];
            var isFlag = constants_1.FLAG_EXP.test(el);
            var isKeyVal = constants_1.KEYVAL_EXP.test(next || '');
            var isFlagNext = constants_1.FLAG_EXP.test(next || '');
            var isNot = /^--no/.test(el) ? true : false;
        });
        if (isExec) {
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
        //
    };
    // HELP //
    /**
      * Show Help
      * Displays all help or help for provided command name.
      *
      * @param command optional name for displaying help for a particular command.
      */
    Pargv.prototype.showHelp = function (command) {
        var name = utils.isPlainObject(command) ? command._name : command;
        var help = this._helpHandler(name, this.commands);
        console.log(help);
        console.log();
    };
    Pargv.prototype.help = function (fn) {
        var _this = this;
        if (utils.isBoolean(fn)) {
            this._helpDisabled = fn;
        }
        else if (utils.isFunction(fn)) {
            this._helpDisabled = undefined;
            this._helpHandler = function (command) {
                return fn(command, _this.commands);
            };
        }
        return this;
    };
    // UTIL METHODS //
    /**
     * Stats
     * Iterates array of arguments comparing to defined configuration.
     * To get stats from default command use '__default__' as key name.
     *
     * @param key the command key to get stats for.
     * @param args args to gets stats for.
     */
    Pargv.prototype.stats = function (key) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (utils.isArray(args[0]))
            args = args[0];
        if (!args.length)
            log.error('whoops cannot get stats for arguments of undefined.');
        var execExp = new RegExp('^' + prefix, 'i');
        if (execExp.test(args[0]))
            args = args.slice(2);
        args = utils.normalizeArgs(args); // normalize args to known syntax.
        var cmd = this.find.command(key);
        if (!cmd)
            log.error("cannot get stats for unknown command " + key);
        return cmd.stats(args);
    };
    /**
     * Remove
     * Removes a command from the collection.
     *
     * @param key the command key to be removed.
     */
    Pargv.prototype.remove = function (key) {
        delete this.commands[key];
        return this;
    };
    /**
     * Reset
     * Resets the default command.
     */
    Pargv.prototype.reset = function () {
        this.command('__default__');
        return this;
    };
    // EXTENDED METHODS //
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
        var options = utils.isPlainObject(text) ? text : {
            text: text,
            font: font
        };
        // Merge the options.
        options = utils.extend({}, defaults, options);
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
            if (utils.isString(element) && elements.length && utils.isPlainObject(elements[0]))
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
            align = utils.toArray(align);
            var isLast = align.length === 1;
            var lastIdx = elements.length - 1;
            elements = elements.map(function (el, i) {
                if (isLast && i < lastIdx)
                    return el;
                var dir = !isLast ? align[i] : align[0];
                if (!dir || dir === null || dir === -1)
                    return el;
                dir = flowMap[dir];
                if (utils.isPlainObject(el))
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
            if (utils.isNumber(padding))
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
var PargvCommand = (function () {
    function PargvCommand(token, describe, pargv) {
        this._commands = [];
        this._options = [];
        this._bools = [];
        this._aliases = {};
        this._usages = {};
        this._describes = {};
        this._coercions = {};
        this._demands = [];
        this._min = 0;
        this._describe = describe;
        this._pargv = pargv;
        this.parseCommand(token);
    }
    // PRIVATE //
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
        if (option.flag) {
            this._options.push(option.key);
            if (option.bool)
                this._bools.push(option.key);
            describe = option.required ? 'Required flag.' : 'Optional flag';
        }
        else {
            this._commands.push(option.key);
            describe = option.required ? 'Required command.' : 'Optional command.';
        }
        this.describe(option.key, option.describe || describe); // Add default descriptions
        this.alias(option.key, option.key); // Add key to self.
        this.alias.apply(// Add key to self.
        this, [option.key].concat(option.aliases)); // Add aliases to map.
        if (!utils.isUndefined(option.index)) {
            this.alias(option.key, option.index + '');
            this.alias(option.index + '', option.key);
        }
        if (option.required)
            this.demand(option.key);
        this._usages[option.key] = option.usage; // Add usage.
        if (!option.bool)
            this.coerce(option.key, option.type, option.default); // Add default coerce method.
        else
            this.coerce(option.key, function (val, command) { return val; }, option.default);
    };
    /**
     * Parse Command
     * Parses a command token.
     *
     * @param token the command token string to parse.
     */
    PargvCommand.prototype.parseCommand = function (token) {
        var _this = this;
        var autoType = this._pargv.options.auto ? 'auto' : 'string';
        var split = utils.split(token.trim(), constants_1.SPLIT_CHARS); // Break out usage command.
        var ctr = 0; // Counter for command keys.
        var aliases = split.shift().trim().split('.'); // Break out command aliases.
        var name = aliases.shift(); // First is key name.
        var usage = []; // Usage command values.
        usage.push(name); // Add command key.
        // Iterate the tokens.
        split.forEach(function (el, i) {
            var next = split[i + 1]; // next value.
            var isFlag = utils.isFlag(el); // if is -o or --opt.
            next = utils.isFlag(next) ||
                !constants_1.COMMAND_VAL_EXP.test(next || '') ? null : next;
            var parsed = parseToken(el, next, autoType); // parse the token.
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
        this._name = name; // Save the commmand name.
        this._describe = this._describe ||
            "The " + name + " command.";
        this._usage = usage.join(' '); // create usage string.
        this.alias.apply(// create usage string.
        this, [name].concat(aliases)); // Map aliases to command name.
        this.alias(name, name);
    };
    /**
     * Alias To Name
     * Maps an alias key to primary command/flag name.
     *
     * @param key the key to map to name.
     */
    PargvCommand.prototype.aliasToKey = function (key) {
        return this._aliases[key];
    };
    // GETTERS //
    // METHODS //
    /**
      * Option
      * Adds option to command.
      *
      * @param token the option token to parse as option.
      * @param describe the description for the option.
      * @param def an optional default value.
      */
    PargvCommand.prototype.option = function (token, describe, def) {
        var _this = this;
        var autoType = this._pargv.options.auto ? 'auto' : 'string';
        token = utils.toOptionToken(token);
        var tokens = utils.split(token.trim(), constants_1.SPLIT_CHARS);
        tokens.forEach(function (el, i) {
            var next;
            if (tokens.length > 1) {
                next = tokens[i + 1];
                tokens.splice(i + 1, 1);
            }
            var parsed = parseToken(el, next, autoType);
            parsed.describe = describe || parsed.describe;
            parsed.default = def;
            _this.expandOption(parsed);
        });
        return this;
    };
    /**
     * Alias
     * Maps alias keys to primary flag/command key.
     *
     * @param key the key to map alias keys to.
     * @param alias keys to map as aliases.
     */
    PargvCommand.prototype.alias = function (key) {
        var _this = this;
        var alias = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            alias[_i - 1] = arguments[_i];
        }
        alias.forEach(function (el) {
            _this._aliases[el] = key;
        });
        return this;
    };
    /**
     * Describe
     * Adds description for an option.
     *
     * @param key the option key to add description to.
     * @param describe the associated description.
     */
    PargvCommand.prototype.describe = function (key, describe) {
        key = this.aliasToKey(key) || key;
        this._describes[key] = describe;
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
        key = this.aliasToKey(key) || key;
        fn = fn || this._pargv.options.auto ? 'auto' : 'string';
        if (utils.isString(fn) || utils.isRegExp(fn))
            fn = castToType.bind(null, fn, def);
        this._coercions[key] = fn;
        return this;
    };
    /**
     * Demand
     * The commands or flag/option keys to demand.
     *
     * @param key the key to demand.
     * @param keys additional keys to demand.
     */
    PargvCommand.prototype.demand = function (key) {
        var _this = this;
        var keys = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            keys[_i - 1] = arguments[_i];
        }
        keys = utils.mergeArgs(key, keys);
        keys.forEach(function (k) {
            var alias = _this.aliasToKey(k);
            k = /^[0-9]+/.test(k) ? _this.aliasToKey(k) : alias; // ensure no number keys.
            if (!utils.contains(_this._demands, k))
                _this._demands.push(k);
        });
        return this;
    };
    /**
     * Demand If
     * Demands a key when parent key is present.
     *
     * @param key require this key.
     * @param when this key is present.
     */
    PargvCommand.prototype.demandIf = function (key, when) {
        //
    };
    /**
     * Min
     * A value indicating the minimum number of commands.
     *
     * @param count the minimum command count.
     */
    PargvCommand.prototype.min = function (count) {
        this._min = count;
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
            log.error('cannot add action using method of undefined.');
        this._action = fn;
        return this;
    };
    // UTILS //
    /**
     * Has Command
     * Checks if a command exists by index or name.
     *
     * @param key the command string or index.
     */
    PargvCommand.prototype.isCommand = function (key) {
        if (utils.isString(key))
            return utils.contains(this._commands, key);
        return utils.isValue(this._commands[key]);
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
    PargvCommand.prototype.stats = function (args) {
        var _this = this;
        var lastIdx = this._commands.length - 1;
        var clone = args.slice(0);
        var commands = []; // contains only commands.
        var options = []; // contains only options.
        var anonymous = []; // contains only anonymous options.
        var required = []; // contains only required options/commands.
        var missing = [];
        var keys = [];
        var ctr = 0;
        clone.forEach(function (el, i) {
            var next = clone[i + 1];
            var isFlag = utils.isFlag(el);
            var isFlagNext = utils.isFlag(next);
            var key = isFlag || ctr > lastIdx ? _this.aliasToKey(el) : _this.aliasToKey(ctr + '');
            if (!key) {
                anonymous.push(el);
                if (!isFlagNext && next && !_this.isCommand(ctr)) {
                    anonymous.push(next);
                    clone.splice(i + 1, 1);
                }
            }
            else {
                if (isFlag && key) {
                    options.push(el);
                    if (_this.isRequired(el))
                        required.push(el);
                    if (!_this.isBool(el)) {
                        options.push(next);
                        clone.splice(i + 1, 1);
                    }
                }
                else if (!isFlag && key) {
                    commands.push(el);
                    if (_this.isRequired(ctr))
                        required.push(el);
                    ctr++;
                }
            }
        });
        var normalized = commands.concat(options).concat(anonymous);
        return {
            commands: commands,
            options: options,
            anonymous: anonymous,
            required: required,
            missing: missing,
            normalized: normalized
        };
    };
    return PargvCommand;
}());
exports.PargvCommand = PargvCommand;
//# sourceMappingURL=index.js.map