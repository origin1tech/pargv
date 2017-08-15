"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var cliui = require("cliui");
var figlet = require("figlet");
var prefix = require("global-prefix");
var colurs_1 = require("colurs");
var chek_1 = require("chek");
var pkg = chek_1.tryRequire(path.resolve(process.cwd(), 'package.json'), { version: '0.0.0' });
var colurs = colurs_1.get();
var KEYVAL_EXP = /^([a-zA-Z0-9]+:[a-zA-Z0-9]+,?)+$/g;
var CSV_EXP = /^(.+,.+){1,}$/g;
var REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
var REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
var FLAG_EXP = /^--?/;
var TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/g;
var TOKEN_PREFIX_EXP = /^(--?|<|\[)/;
var NESTED_EXP = /^[a-zA-Z0-9]+\./;
var GLOBAL_PREFIX_EXP = new RegExp('^' + prefix, 'i');
var SPLIT_CHARS = ['|', ',', ' '];
var DEFAULTS = {
    strict: false,
    auto: true,
    injectDebug: false // when true injects debug flag into args.
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
    if (!argvDebug && execDebug)
        return [execDebug];
    if (argvDebug) {
        if (!/^--debug-brk=/.test(argvDebug))
            return [argvDebug];
        // Otherwise break out the port into separate arg.
        return argvDebug.split('=');
    }
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
    var type = stripToken(split[1] || 'auto');
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
        throw new Error("Alias " + name + " cannot be the same as option name property.");
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
function cast(key, val) {
    //
}
/**
 * Cast To Type
 * Just a wrapper to chek's castType.
 *
 * @param type the type to cast to.
 * @param val the value to be cast.
 */
function castTypeWrapper(type, def, val) {
    type = type.trim();
    var isListExp = /(,|\s|\|)/.test(type) || chek_1.isRegExp(type);
    if (!isListExp)
        return chek_1.castType(val, type, def);
    // Handle list like strings
    // ex: small, medium, large
    // becomes: /^(small|medium|large)$/
    var match = val.match(splitToList(type));
    return chek_1.toDefault(match && match[0], def);
}
// PARGV COMMAND CLASS //
var PargvCommand = (function () {
    function PargvCommand(command, description, options, context) {
        this._description = '';
        this._aliases = [];
        this._examples = [];
        this._action = chek_1.noop;
        this._depends = {};
        this.options = {};
        if (!command)
            throw new Error('Cannot defined command using name of undefined.');
        if (chek_1.isPlainObject(command)) {
            options = command;
            description = undefined;
        }
        if (chek_1.isPlainObject(description)) {
            options = description;
            description = undefined;
        }
        options = options || {};
        this._context = context;
        this.parseTokens(command || options.command, true);
        this._description = description || options.description || "Executes " + command + " command.";
        this._aliases = chek_1.isString(options.aliases) ? chek_1.split(options.aliases, SPLIT_CHARS) : [];
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
        // If command shift out the command.
        if (isCommand) {
            var tmpCmd = arr.shift().trim();
            // split out aliases
            tmpCmd = tmpCmd.split('.');
            if (this._context.commands[tmpCmd[0]])
                throw new Error("Cannot add command " + tmpCmd[0] + ", the command already exists.");
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
            if (!parsed.flag)
                parsed.position = i;
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
            _this.options[parsed.name] = chek_1.extend({}, _this.options[parsed.name], parsed);
            // Add to collection of parsed options.
            parsedOpts.push(_this.options[parsed.name]);
        });
        if (isCommand)
            this._usage = usage.join(' ');
        return parsedOpts;
    };
    /**
     * Find Option
     * Looks up an option by name or alias.
     *
     * @param key the key or alias name to find option by.
     */
    PargvCommand.prototype.findOption = function (key) {
        var option;
        for (var k in this.options) {
            var aliases = this.options[k].aliases;
            if (key === k || chek_1.contains(aliases, key)) {
                option = this.options[k];
                break;
            }
        }
        return option;
    };
    /**
     * Option
     * Adds option to command.
     *
     * @param val the option val to parse or option configuration object.
     * @param description the description for the option.
     * @param def the default value.
     * @param cast the expression, method or type for validating/casting.
     */
    PargvCommand.prototype.option = function (val, description, def, cast) {
        if (chek_1.isPlainObject(val)) {
            var opt = val;
            if (!opt.name)
                throw new Error('Pargv command option requires "name" property when passing object.');
            chek_1.extend(this.options[opt.name], opt);
        }
        else {
            var parsed = this.parseTokens(val)[0];
            parsed.description = description;
            parsed.default = def;
            if (chek_1.isString(cast) || chek_1.isRegExp(cast))
                cast = castTypeWrapper.bind(this, cast, def);
            parsed.cast = cast;
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
                _this.options[d] = { name: d, required: true, aliases: [], type: 'auto', flag: true, as: stripped };
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
            throw new Error('Cannot add action with action method of undefined.');
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
     * Command
     * Creates new command configuration.
     *
     * @param command the command to be matched or options object.
     * @param description the description or options object.
     * @param options options object for the command.
     */
    PargvCommand.prototype.command = function (command, description, options) {
        return this._context.command;
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
        return (_a = this._context).parse.apply(_a, argv);
        var _a;
    };
    return PargvCommand;
}());
exports.PargvCommand = PargvCommand;
// PARGV CONTAINER //
var Pargv = (function () {
    function Pargv(options) {
        this.commands = {};
        this.options = chek_1.extend({}, DEFAULTS, options);
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
        var cmd = '';
        var cmds = [];
        var flags = [];
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
        var obj = {
            globalPath: prefix,
            nodePath: source[0],
            execPath: source[1],
            exec: parsedExec.name
        };
        // Check for debug flags if found inject into args.
        if (chek_1.isDebug())
            argv = normalizeDebug(argv);
        // Remove node and exec path from args.
        argv = argv.slice(2);
        // Don't shift if is a flag arg.
        if (!isFlag(argv[0]))
            cmd = argv.shift();
        // Lookup the command.
        var cmdObj = this.commands[cmd];
        // Iterate the args.
        argv.forEach(function (el, i) {
            // lookup the option.
            // const opt = cmdObj.findOption(el);
            // console.log(opt);
        });
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
            ['Array', '- native array.'],
            ['List', '- csv, pipe or space separated converted to RegExp.']
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
                throw new Error('Invalid element(s) cannot mix string element with element options objects.');
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
// const key = el.replace(/^--?/, '');
// const nextId = i + 1;
// const next = argv[i + 1];
// const isKeyVal = next && KEYVAL_EXP.test(next);
// const isNested = NESTED_EXP.test(key);
// const isFlagValue = false;
// Inspect flags.
// if (isFlag(el)) {
// Check if nested object.
// if (isNested) {
//   const objKey = key.split('.')[0];
//   flags[objKey] = flags[objKey] || {};
//   flags[objKey] = set(flags[objKey], key, cast(key, next));
// }
// Check if next value is key:value pair.
// else if (isKeyVal) {
//   flags[key] = flags[key] || {};
//   flags[key] = extend({}, cast(key, next));
// }
// Otherwise is non object or simple boolean.
// else {
//   const val = !isFlagValue ? true : next ? cast(key, next) : null;
//   flags[key] = val;
// }
// Exclude next el in array when non bool.
// if (isFlagValue)
//   exclude.push(nextId);
//}
// Is a sub command.
// else {
//   cmds.push(el);
// }
// Get action.
// action = this._commands[cmd] || this._commands['*'];
// If actions enabled execute matching action.
// if (this._options.actions)
//   action(); 
//# sourceMappingURL=index.js.map