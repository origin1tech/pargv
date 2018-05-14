"use strict";
// IMPORTS //
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
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
var child_process_1 = require("child_process");
var util = require("util");
var cliui = require("cliui");
var colurs_1 = require("colurs");
var utils = require("./utils");
var completions_1 = require("./completions");
var localize_1 = require("./localize");
var command_1 = require("./command");
var constants_1 = require("./constants");
var utils_1 = require("./utils");
var events_1 = require("events");
var colurs;
// VARIABLES & CONSTANTS //
var DEFAULTS = {
    cast: true,
    splitArgs: null,
    colorize: true,
    displayHeader: true,
    displayFooter: true,
    displayNone: false,
    displayTitles: true,
    headingDivider: '==',
    commandDivider: '-',
    locale: 'en',
    localeDir: './locales',
    defaultHelp: true,
    layoutWidth: 80,
    castBeforeCoerce: false,
    extendArguments: false,
    extendAliases: false,
    extendStats: false,
    spreadArguments: true,
    allowAnonymous: true,
    ignoreTypeErrors: false,
    colors: {
        primary: 'blue',
        accent: 'cyan',
        alert: 'red',
        muted: 'gray'
    }
};
// CLASS //
var Pargv = /** @class */ (function (_super) {
    __extends(Pargv, _super);
    function Pargv(options) {
        var _this = _super.call(this) || this;
        _this._completionsCommand = 'completions';
        _this._completionsReply = '--reply';
        _this._base = false;
        _this._meta = {};
        _this._commands = {};
        utils.setEnumerable(_this, '_name, _nameFont, _nameStyles, _helpCommand, _helpHandler, _errorHandler, _logHandler, _completionsHandler, _completions, _completionsCommand, _completionsReply, _colorize, _localize', false);
        _this.init(options);
        return _this;
    }
    // PRIVATE //
    /**
     * Init
     * Common method to initialize Pargv also used in .reset().
     *
     * @param options the Pargv options object.
     */
    Pargv.prototype.init = function (options) {
        this.options = utils.extend({}, DEFAULTS, options);
        colurs = new colurs_1.Colurs({ enabled: this.options.colorize });
        this._localize = localize_1.localize(this, colurs);
        this._env = utils.environment(); // get env paths.
        this._completions = completions_1.completions(this, colurs); // helper for generating completions.sh.
        this._helpCommand = this._localize('help').done(); // localized name for help.
        this._logHandler = this.logHandler;
        this._errorHandler = this.errorHandler;
        this._helpHandler = this.helpHandler;
        this._completionsHandler = this._completions.handler; // default completion handler.
        this.compatibility(options, true);
        this._command = new command_1.PargvCommand(constants_1.DEFAULT_COMMAND, this._localize('General Options:').done(), this);
        this._commands[constants_1.DEFAULT_COMMAND] = this._command;
        return this;
    };
    /**
     * Compatibility
     * Ensures compatibility with deprecated properties.
     *
     * @param key the key or object to map.
     * @param warn when true deprecation message is logged.
     */
    Pargv.prototype.compatibility = function (key, warn) {
        var obj = {
            itemDivider: 'commandDivider',
            spreadCommands: 'spreadArguments',
            extendCommands: 'extendArguments',
            autoHelp: [this.onHelp, 'onHelp'],
            fallbackHelp: [this.onHelp, 'onHelp'],
            exitHelp: [this.onHelp, 'onHelp'],
            displayStackTrace: 'n/a'
        };
        if (utils.isString(key)) {
            var mapped = obj[key];
            if (!mapped)
                return key;
            if (warn)
                process.stderr.write(colurs.yellow('DEPRECATED') + ": \"" + key + "\" has been deprecated, use \"" + mapped + "\" instead.\n");
            return mapped;
        }
        for (var k in key) {
            var mappedKey = obj[k];
            if (mappedKey && mappedKey !== 'n/a') {
                var useKey = mappedKey;
                if (utils.isArray(mappedKey)) {
                    mappedKey[0].call(this, key[k]);
                    useKey = "pargv." + mappedKey[1] + "()";
                }
                else {
                    this.options[mappedKey] = key[mappedKey] = key[k];
                }
                if (warn) {
                    process.stderr.write(colurs.yellow('DEPRECATED') + ": \"" + k + "\" has been deprecated, use \"" + useKey + "\" instead.\n");
                }
            }
        }
        return key;
    };
    /**
     * Logger
     * Formats messages for logging.
     *
     * @param args log arguments.
     */
    Pargv.prototype.formatLogMessage = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var msg = args.shift();
        var meta;
        if (utils.isPlainObject(utils.last(args)))
            meta = args.pop();
        if (utils.isPlainObject(msg) || meta) {
            var obj = meta ? meta : msg;
            meta = util.inspect(obj, null, null, this.options.colorize);
        }
        var tokens = (msg || '').match(constants_1.FORMAT_TOKENS_EXP);
        if (tokens && tokens.length) {
            tokens = args.slice(0, tokens.length);
            args = args.slice(tokens.length);
            msg = util.format.apply(util, [msg || ''].concat(tokens));
            args.unshift(msg);
        }
        else if (msg) {
            args.unshift(msg);
        }
        if (meta)
            args.push(meta);
        return args.join(' ');
    };
    // HANDLERS & HELP //
    /**
      * Compile Help
      * Compiles help for all commands or single defined commnand.
      *
      * @param command the optional command to build help for.
      */
    Pargv.prototype.compileHelp = function (command) {
        var _this = this;
        var layoutWidth = this.options.layoutWidth;
        var layout = this.layout(layoutWidth);
        var obj = {};
        var col1w = Math.floor(layoutWidth * .35);
        var col2w = Math.floor(layoutWidth * .50);
        var col3w = layoutWidth - (col1w + col2w);
        // Define color vars.
        var primary = this.options.colors.primary;
        var alert = this.options.colors.alert;
        var accent = this.options.colors.accent;
        var muted = this.options.colors.muted;
        var metaKeys = utils.keys(this._meta);
        // Default command.
        var defCmd = this.getCommand(constants_1.DEFAULT_COMMAND);
        var hdrDiv = this.options.headingDivider;
        var itmDiv = this.options.commandDivider;
        var itmDivMulti = Math.round(((layoutWidth / itmDiv.length) / 2.85) * 2);
        var padLeftIfNested = this.options.displayTitles ? 2 : 0;
        var cmdKeys;
        var noneStr = this._localize('none').done();
        // Builds the app name, version descript header.
        var buildHeader = function () {
            if (!metaKeys.length)
                return;
            if (_this._meta.name) {
                var curVal = _this._meta.name;
                if (!colurs.hasAnsi(curVal))
                    curVal = colurs.applyAnsi(curVal, primary);
                layout.div({ text: curVal, padding: [0, 0, 1, 0] });
            }
            if (_this._meta.description) {
                layout.div({ text: _this._meta.description, padding: [0, 0, 1, 0] });
            }
            // Get longest of meta keys.
            var metaPadLongest = utils.keys(_this._meta)
                .filter(function (k) { return k !== 'name' && k !== 'description'; })
                .map(function (v) { return _this._localize(v).done(); })
                .reduce(function (a, b) { return a.length > b.length ? a : b; }, '').length;
            for (var k in _this._meta) {
                var localeKey = _this._localize(k).done();
                var curVal = _this._meta[k];
                if (!utils.contains(['name', 'description'], k)) {
                    var metaPadLen = (metaPadLongest - localeKey.length) + 2;
                    layout.div(colurs.applyAnsi(localeKey + ':', accent) + utils.padLeft(curVal, metaPadLen));
                }
            }
            // Add break in layout.
            if (hdrDiv)
                layout.repeat(colurs.applyAnsi(hdrDiv, muted));
            else
                layout.div();
        };
        // Builds commands and flags help.
        var buildOptions = function (cmd) {
            var argStr, optsStr, exStr, reqStr;
            //  cmdsStr = this._localize('Commands').done();
            argStr = _this._localize('Arguments').done();
            optsStr = _this._localize('Options').done();
            exStr = _this._localize('Examples').done();
            reqStr = _this._localize('required').done();
            var isDef = cmd._name === constants_1.DEFAULT_COMMAND;
            if ((cmd._arguments.length && _this.options.displayTitles) || (!cmd._arguments.length && _this.options.displayNone))
                layout.section(colurs.applyAnsi(argStr + ":", accent), [1, 0, 0, 1]);
            cmd._arguments.forEach(function (el) {
                var isRequired = utils.contains(cmd._demands, el);
                var arr = [
                    { text: el, padding: [0, 1, 0, padLeftIfNested], width: col1w },
                    { text: colurs.applyAnsi(cmd._describes[el] || '', muted), width: col2w }
                ];
                var lastCol = isRequired ? { text: colurs.applyAnsi("" + reqStr, alert), align: 'right', width: col3w } : { text: '', width: col3w };
                arr.push(lastCol);
                layout.div.apply(layout, arr);
            });
            if (!cmd._arguments.length && _this.options.displayNone)
                layout.div({ text: colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, padLeftIfNested] });
            if (!isDef) {
                if (cmd._arguments.length && cmd._options.length && !_this.options.displayTitles)
                    layout.div(); // when no titles and have commands and opts add some space.
                if ((cmd._options.length && _this.options.displayTitles) || (!cmd._options.length && _this.options.displayNone))
                    layout.section(colurs.applyAnsi(optsStr + ":", accent), [1, 0, 0, 1]);
            }
            var cmdOpts = cmd._options.sort();
            cmdOpts.forEach(function (el) {
                var isRequired = utils.contains(cmd._demands, el);
                var aliases = cmd.aliases(el).sort();
                var usages = cmd._usages[el]; // get without first key.
                var usageVal = '';
                if (/^(\[|<)/.test(utils.last(usages)))
                    usageVal = ' ' + usages.pop();
                var describe = colurs.applyAnsi(cmd._describes[el] || '', muted);
                var arr = [
                    { text: usages.join(', ') + usageVal, padding: [0, 1, 0, padLeftIfNested], width: col1w },
                    { text: describe, width: col2w }
                ];
                var lastCol = isRequired ? { text: colurs.applyAnsi("" + reqStr, alert), align: 'right', width: col3w } : { text: '', width: col3w };
                arr.push(lastCol);
                layout.div.apply(layout, arr);
            });
            if (!cmd._options.length && _this.options.displayNone)
                layout.div({ text: colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, padLeftIfNested] });
            if (cmd._examples.length) {
                layout.section(colurs.applyAnsi(exStr + ":", accent), [1, 0, 0, 1]);
                cmd._examples.forEach(function (tuple) {
                    var ex = tuple[0];
                    var desc = tuple[1] || null;
                    if (desc)
                        desc = colurs.applyAnsi(desc, muted);
                    if (!/^.*\$\s/.test(ex))
                        ex = '$ ' + ex;
                    layout.div({ text: ex, padding: [0, 0, 0, padLeftIfNested] }, { text: (desc || ''), padding: [0, 0, 0, 1] });
                });
            }
        };
        // Builds the body of the help iterating
        // over each command and its options.
        var buildBody = function () {
            var usageStr, aliasStr, extStr, falseStr, trueStr;
            usageStr = _this._localize('Usage').done();
            aliasStr = _this._localize('Alias').done();
            extStr = _this._localize('external').done();
            falseStr = _this._localize('false').done();
            if (command) {
                cmdKeys = [command];
            }
            else {
                cmdKeys = utils.keys(_this._commands)
                    .sort();
            }
            cmdKeys = cmdKeys.filter(function (k) { return k !== constants_1.DEFAULT_COMMAND; });
            if (defCmd._options.length > 1)
                cmdKeys.unshift(constants_1.DEFAULT_COMMAND); // Make default command first.
            var ctr = 0;
            cmdKeys.forEach(function (el, i) {
                if (el._name)
                    el = el._name;
                var cmd = _this.getCommand(el);
                var isDef = cmd._name === constants_1.DEFAULT_COMMAND;
                if (!cmd._showHelp)
                    return;
                if (ctr > 0)
                    layout.repeat(colurs.applyAnsi(itmDiv, muted), itmDivMulti);
                ctr++;
                var aliases = cmd.aliases(cmd._name).join(', '); // get aliases.
                var aliasesLen = aliases.length;
                if (!aliases || !aliases.length)
                    aliases = noneStr;
                if (!isDef) {
                    var divs = [
                        colurs.applyAnsi(usageStr + ": ", primary) + cmd._usage
                    ];
                    if (aliasesLen || _this.options.displayNone)
                        divs.push(colurs.applyAnsi(aliasStr + ": ", primary) + aliases);
                    if (cmd._external)
                        divs.push(colurs.applyAnsi("(" + extStr + ")", accent));
                    layout.div.apply(layout, divs);
                    if (cmd._describe && cmdKeys.length > 1) {
                        var descPadding = _this.options.displayTitles ? [1, 0, 0, 0] : [1, 0, 1, 0];
                        layout.div({ text: colurs.applyAnsi(cmd._describe, muted), padding: descPadding });
                    }
                }
                else {
                    layout.div({ text: colurs.applyAnsi(cmd._describe, primary), padding: [0, 0, 1, 0] });
                }
                if (!cmd._options.length && !cmd._arguments.length) {
                    var noArgOrOpts = '~ ' + _this._localize("No arguments or options").done() + ' ~';
                    layout.div({ text: colurs.applyAnsi(noArgOrOpts, accent), padding: [1, 0, 0, 0] });
                    return;
                }
                buildOptions(cmd);
            });
        };
        var buildFooter = function () {
            // Add epilog if any.
            if (_this._meta.epilog) {
                if (hdrDiv)
                    layout.repeat(colurs.applyAnsi(hdrDiv, muted));
                else
                    layout.div();
                layout.div(colurs.applyAnsi(_this._meta.epilog, muted));
            }
        };
        // Build help for single command.
        if (command) {
            buildBody();
        }
        else {
            if (this.options.displayHeader)
                buildHeader();
            buildBody();
            if (this.options.displayFooter)
                buildFooter();
        }
        // return the resulting layout.
        return layout;
    };
    /**
     * Help Handler
     * The default help handler.
     *
     * @param command optional command to get help for.
     */
    Pargv.prototype.helpHandler = function (command) {
        return this.compileHelp(command).get();
    };
    /**
     * Error Handler
     * The default error handler.
     *
     * @param err the PargvError instance.
     */
    Pargv.prototype.errorHandler = function (err) {
        var _this = this;
        err.stack = err.stack.split('\n').map(function (s, i) {
            if (i === 0)
                return colurs.applyAnsi(colurs.strip(s), _this.options.colors.alert);
            return colurs.applyAnsi(s, _this.options.colors.muted);
        }).join('\n') + '\n';
        throw err;
    };
    /**
     * Log Handler
     * : Handles internal log messages.
     *
     * @param message the message to be logged.
     */
    Pargv.prototype.logHandler = function (message) {
        this.emit('log', message);
        process.stderr.write(message + '\n');
    };
    /**
     * Build Help
     * Common method to get help before show or return.
     *
     * @param command optional command to get help for.
     */
    Pargv.prototype.buildHelp = function (command) {
        var name = utils.isPlainObject(command) ? command._name : command;
        return this._helpHandler.call(this, name, this._commands);
    };
    /**
     * Normalize Args
     * Converts -abc to -a -b -c
     * Converts --name=bob to --name bob
     *
     * @param args the arguments to normalize.
     */
    Pargv.prototype.toNormalized = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (utils.isArray(args[0]))
            args = args[0];
        var arr = [], idx;
        if (constants_1.EXE_EXP.test(args[0]) || args[0] === this._env.NODE_PATH)
            args = args.slice(2);
        args.forEach(function (el) {
            if (constants_1.FLAG_EXP.test(el) && ~(idx = el.indexOf('='))) {
                arr.push(el.slice(0, idx), el.slice(idx + 1));
            }
            else if (constants_1.FLAG_SHORT_EXP.test(el) && el.charAt(0) !== '"' && el.charAt(0) !== "'") {
                el.replace(constants_1.FLAG_EXP, '').split('').forEach(function (s) {
                    arr.push('-' + s);
                });
            }
            else {
                arr.push(el);
            }
        });
        return arr;
    };
    Object.defineProperty(Pargv.prototype, "listen", {
        // GETTERS //
        /**
         * Listen
         * : Alias for exec.
         */
        get: function () {
            return this.exec;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "argv", {
        /**
         * Argv
         * Alias to exec.
         */
        get: function () {
            return this.exec;
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
    // GET, SET, REMOVE & SHOW //
    /**
      * Option
      * : Gets an option value by the specified key.
      *
      * @param key the option key to get.
      */
    Pargv.prototype.getOption = function (key) {
        return this.options[key] || null;
    };
    /**
     * Option
     * : Sets an option or group of options.
     *
     * @param key the key or PargvOptions object to be set.
     * @param val the value for the provided key.
     */
    Pargv.prototype.setOption = function (key, val) {
        var obj = key;
        if (!utils.isPlainObject(key)) {
            obj = {};
            obj[key] = val;
        }
        var valKeys = utils.keys(this.options);
        obj = this.compatibility(obj, true);
        for (var k in obj) {
            if (~valKeys.indexOf(k)) {
                this.options[k] = obj[k];
            }
        }
        return this;
    };
    /**
     * Help
     * : Gets help text.
     *
     * @param command optional command to show help for.
     */
    Pargv.prototype.getHelp = function (command) {
        return this.buildHelp(command);
    };
    /**
     * Help
     * Shows help in terminal.
     *
     * @param command optional command to show help for.
     */
    Pargv.prototype.showHelp = function (command) {
        var helpStr = this.buildHelp(command);
        if (helpStr) {
            this.emit('help', helpStr);
            process.stderr.write('\n' + helpStr + '\n\n');
        }
        return this;
    };
    /**
      * Get Completion
      * : Gets the completion script.
      *
      * @param path the path/name of executable.
      * @param template the template string.
      */
    Pargv.prototype.getCompletion = function (path, template) {
        return this._completions.generate(path, template).script;
    };
    /**
     * Completion
     * Shows the completion script in terminal.
     *
     * @param path the path/name of executable.
     * @param template the template string.
     */
    Pargv.prototype.showCompletion = function (path, template) {
        process.stderr.write('\n' + this._completions.generate(path, template).script + '\n\n');
        return this;
    };
    /**
     * Command
     * : Finds a command by name.
     *
     * @param key the name of the command to find.
     */
    Pargv.prototype.getCommand = function (key) {
        var cmds = this._commands;
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
    };
    /**
     * Remove
     * Removes a command from the collection.
     *
     * @param key the command key/name to be removed.
     */
    Pargv.prototype.removeCommand = function (key) {
        var cmd = this.getCommand(key);
        if (!cmd)
            return this;
        delete this._commands[cmd._name];
        return this;
    };
    Pargv.prototype.meta = function (key, val) {
        var obj = key;
        if (utils.isString(key)) {
            obj = {};
            obj[key] = val;
        }
        for (var k in obj) {
            var curVal = obj[k];
            if (!utils.isValue(curVal))
                curVal = this._env.PKG[k];
            if (!utils.isString(curVal))
                this.error(".meta() does not support typeof \"%s\", try passing .meta(key, string).", typeof curVal);
            this._meta[k] = curVal;
        }
        return this;
    };
    /**
     * Name
     * Adds name of CLI to help header.
     *
     * @param val the value to use as app name.
     * @param font a Figlet font. (DEPRECATED)
     * @param styles an ansi color/style or array of styles. (DEPRECATED)
     */
    Pargv.prototype.name = function (val, styles, font) {
        if (font || styles)
            this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " Figlet fonts deprecated in favor of user passing figlet styled string.");
        return this.meta('name', val);
    };
    /**
     * Version
     * Adds version to help header.
     *
     * @param val the value to use as version name.
     */
    Pargv.prototype.version = function (val) {
        return this.meta('version', val);
    };
    /**
     * License
     * Adds license to help header.
     *
     * @param val the license type.
     */
    Pargv.prototype.license = function (val) {
        return this.meta('license', val);
    };
    /**
     * Description
     * Adds description to help header.
     *
     * @param val the description string.
     */
    Pargv.prototype.description = function (val) {
        return this.meta('description', val);
    };
    /**
     * Epilog
     * Displays trailing message.
     *
     * @param val the trailing epilogue to be displayed.
     */
    Pargv.prototype.epilog = function (val) {
        this._meta.epilog = val;
        return this;
    };
    // COMMANDS & PARSING //
    /**
     * Command
     * A string containing Parv tokens to be parsed.
     *
     * @param command the command token string to parse.
     * @param describe a description describing the command.
     */
    Pargv.prototype.command = function (command, describe) {
        var cmd = new command_1.PargvCommand(command, describe, this);
        this._commands[cmd._name] = cmd;
        return cmd;
    };
    Pargv.prototype.spawn = function (prog, args, options, exit) {
        var _this = this;
        var self = this;
        var colors = this.options.colors;
        var proc;
        if (utils.isBoolean(options)) {
            exit = options;
            options = undefined;
        }
        var isPath = /\.[a-z0-9]{2,}$/.test(prog); // is path with extension.
        if (isPath) {
            // check if is symlink, if true get path.
            prog = fs_1.lstatSync(prog).isSymbolicLink() ? fs_1.readlinkSync(prog) : prog;
            if (/\.js$/.test(prog) && !utils.isExecutable(prog) || utils.isWindows()) {
                // if is .js and not executable add prog to args run with Node.
                // for windows always set program as node.
                args.unshift(prog);
                prog = process.execPath;
            }
            else if (!utils.isExecutable(prog)) {
                this.error(self._localize('"%s" could not be executed, you could try "chmod +x %s" without quotes.')
                    .args(prog, prog)
                    .done());
                return;
            }
        }
        options = utils.extend({ stdio: 'inherit' }, options);
        var exitProcess = function (code) {
            if (exit === true)
                process.exit(code || 0);
        };
        var bindEvents = function (proc) {
            if (!proc || !proc.on)
                return;
            // Thanks to TJ!
            // see > https://github.com/tj/commander.js/blob/master/index.js#L560
            var signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
            // Listen for signals to kill process.
            signals.forEach(function (signal) {
                process.on(signal, function () {
                    if ((proc.killed === false) && (proc['exitCode'] === null))
                        proc.kill(signal);
                });
            });
            proc.on('close', exitProcess);
            proc.on('error', function (err) {
                if (err['code'] === 'ENOENT')
                    _this.error(self._localize('%s does not exist, try --%s.')
                        .args(prog)
                        .setArg('help')
                        .styles(colors.accent, colors.accent)
                        .done());
                else if (err['code'] === 'EACCES')
                    _this.error(self._localize('%s could not be executed, check permissions or run as root.')
                        .args(prog)
                        .styles(colors.accent)
                        .done());
                else
                    _this.error(err);
                exitProcess(1);
            });
        };
        proc = child_process_1.spawn(prog, args, options);
        bindEvents(proc);
        return proc;
    };
    /**
      * Spawn
      * : Spawns and executes and external command.
      *
      * @param parsed the parsed command result.
      * @param cmd a PargvCommand instance.
      * @param stdio optional stdio for child process.
      * @param exit indicates if should exit after process.
      */
    Pargv.prototype.spawnHandler = function (parsed, cmd, stdio, exit) {
        var _this = this;
        var self = this;
        var colors = this.options.colors;
        var prog = parsed.$external; // the program to spawn/execute.
        var basedir = cmd._cwd ? cmd._cwd : this._base ? this._base : '';
        var args = parsed.$stats.normalized; // get normalized args.
        var proc;
        if (parsed.$command !== parsed.$external)
            args.unshift(parsed.$command);
        prog = path_1.join(basedir, prog); // ensure base dir if any.
        prog = prog + cmd._extension || ''; // ensure extension if any.
        // const isPath = /\.[a-z0-9]{2,}$/.test(prog); // is path with extension.
        // if (isPath) {
        //   // check if is symlink, if true get path.
        //   prog = lstatSync(prog).isSymbolicLink() ? readlinkSync(prog) : prog;
        //   if (/\.js$/.test(prog) && !utils.isExecutable(prog) || utils.isWindows()) {
        //     // if is .js and not executable add prog to args run with Node.
        //     // for windows always set program as node.
        //     args.unshift(prog);
        //     prog = process.execPath;
        //   }
        //   else if (!utils.isExecutable(prog)) {
        //     this.error(
        //       self._localize('"%s" could not be executed, you could try "chmod +x %s" without quotes.')
        //         .args(prog, prog)
        //         .done()
        //     );
        //     return;
        //   }
        // }
        var shouldExit = cmd._spawnOptions ? false : exit;
        var opts = utils.extend({ stdio: stdio || 'inherit' }, cmd._spawnOptions);
        // const exitProcess = (code) => {
        //   this.emit('spawn:close', code, cmd, parsed);
        //   if (shouldExit === false)
        //     return;
        //   process.exit(code || 0);
        // };
        // const bindEvents = (proc: ChildProcess) => {
        //   if (!proc || !proc.on) return;
        //   // Thanks to TJ!
        //   // see > https://github.com/tj/commander.js/blob/master/index.js#L560
        //   const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
        //   // Listen for signals to kill process.
        //   signals.forEach(function (signal: any) {
        //     process.on(signal, function () {
        //       if ((proc.killed === false) && (proc['exitCode'] === null))
        //         proc.kill(signal);
        //     });
        //   });
        //   proc.on('close', exitProcess);
        //   proc.on('error', (err) => {
        //     this.emit('spawn:error', err, cmd, parsed);
        //     if (err['code'] === 'ENOENT')
        //       this.error(
        //         self._localize('%s does not exist, try --%s.')
        //           .args(prog)
        //           .setArg('help')
        //           .styles(colors.accent, colors.accent)
        //           .done()
        //       );
        //     else if (err['code'] === 'EACCES')
        //       this.error(
        //         self._localize('%s could not be executed, check permissions or run as root.')
        //           .args(prog)
        //           .styles(colors.accent)
        //           .done()
        //       );
        //     else
        //       this.error(err);
        //     exitProcess(1);
        //   });
        // };
        if (cmd && cmd._spawnAction) {
            var spawnWrapper = function (command, args, options) {
                if (utils.isPlainObject(command))
                    return _this.spawn(command.command, command.args || [], command.options, shouldExit);
                return _this.spawn(command, args, options, shouldExit);
            };
            proc = cmd._spawnAction(spawnWrapper, { command: prog, args: args, options: opts }, parsed, cmd);
            // bindEvents(proc);
        }
        else {
            proc = this.spawn(prog, args, opts, shouldExit);
            // bindEvents(proc);
        }
        return proc;
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
        argv = utils.flatten(argv);
        var isExec = utils.last(argv) === '__exec__' ? argv.pop() : null;
        // splits args from string by specified char.
        if (argv.length === 1 && this.options.splitArgs && utils.isString(argv[0]))
            argv = utils.split(argv[0], this.options.splitArgs);
        var result;
        var env = this._env;
        var colors = this.options.colors;
        var autoType = this.options.cast ? 'auto' : 'string'; // is auto casting enabled.
        argv = argv && argv.length ? argv : constants_1.ARGV; // process.argv or user args.
        var procArgv = constants_1.ARGV.slice(0); // get process.argv.
        var normalized = this.toNormalized(argv.slice(0)); // normalize the args.
        var source = normalized.slice(0); // store source args.
        var name = utils.first(normalized); // get first arg.
        if (constants_1.FLAG_EXP.test(name))
            name = undefined;
        // lookup the command.
        var cmd = this.getCommand(name);
        // if (isExec || cmd)
        if ((isExec || cmd) && name !== undefined)
            // if (name !== undefined && name !== DEFAULT_COMMAND)
            normalized.shift(); // shift first arg.
        if (!cmd)
            cmd = this.getCommand(constants_1.DEFAULT_COMMAND);
        if (name === this._completionsCommand && ~source.indexOf(this._completionsReply)) {
            result = {
                $exec: env.EXEC,
                $command: cmd._name,
                $arguments: []
            };
            result.$source = source.filter(function (el) {
                return el !== _this._completionsCommand && el !== _this._completionsReply;
            });
            result[this._completionsReply.replace(constants_1.FLAG_EXP, '')] = true;
            return result;
        }
        var ctr = 0;
        var stats = cmd.stats(normalized);
        normalized = stats.normalized; // set to normalized & ordered args.
        result = {
            $exec: env.EXEC,
            $command: name,
            $external: cmd._external,
            $arguments: [],
            $variadics: [],
            $source: source,
            $commands: []
        };
        var helpArr = ['--' + this._helpCommand];
        helpArr = utils.mergeArgs(helpArr, ['--help', '-h']); // ensure en locale help flag.
        // if help abort parse show help
        if (utils.containsAny(normalized, helpArr) && (cmd._showHelp || cmd._name === constants_1.DEFAULT_COMMAND)) {
            if (cmd._name === constants_1.DEFAULT_COMMAND)
                cmd = null;
            this.showHelp(cmd);
            return {};
        }
        if (this.options.extendStats || cmd._external || isExec)
            result.$stats = stats;
        if (!this.options.allowAnonymous && stats.anonymous.length && !cmd._variadic) {
            this.error(this._localize('anonymous arguments %s prohibited in strict mode.')
                .args(stats.anonymous.join(', ')).done()
            // .styles(colors.accent)
            );
        }
        if (stats.missing.length) {
            this.error(// no anon in strict mode.
            this._localize('missing required arguments %s or have no default value.')
                .args(stats.missing.join(', ')).done()
            // .styles(colors.accent)
            );
        }
        if (stats.whens.length) {
            var when = stats.whens.shift();
            this.error(// no anon in strict mode.
            this._localize('%s requires %s but is missing.')
                .args(when[0], when[1]).done()
            // .styles(colors.accent, colors.accent).done()
            );
        }
        var argStr = this._localize('arguments').done();
        var optStr = this._localize('options').done();
        if (utils.isValue(cmd._minArguments) && stats.argumentsCount < cmd._minArguments) {
            this.error(// min commands required.
            this._localize('at least %s %s are required but got %s.')
                .args(cmd._minArguments, argStr, stats.argumentsCount + '').done()
            // .styles(colors.accent, colors.primary, colors.accent).done()
            );
        }
        if (utils.isValue(cmd._minOptions) && stats.optionsCount < cmd._minOptions) {
            this.error(// min options required.
            this._localize('at least %s %s are required but got %s.')
                .args(cmd._minOptions, optStr, stats.optionsCount + '').done()
            // .styles(colors.accent, colors.primary, colors.accent).done()
            );
        }
        if (utils.isValue(cmd._maxArguments) && stats.argumentsCount > cmd._maxArguments) {
            this.error(// max commands allowed.
            this._localize('got %s %s but no more than %s are allowed.')
                .args(stats.argumentsCount, argStr, cmd._maxArguments).done()
            // .styles(colors.accent, colors.primary, colors.accent)
            );
        }
        if (utils.isValue(cmd._maxOptions) && stats.optionsCount > cmd._maxOptions) {
            this.error(// max commands allowed.
            this._localize('got %s %s but no more than %s are allowed.')
                .args(stats.optionsCount, optStr, cmd._maxOptions).done()
            // .styles(colors.accent, colors.primary, colors.accent)
            );
        }
        if (cmd._external)
            return result;
        // Normalize value and call user coerce method if exists.
        var coerceWrapper = function (key, type, isBool) {
            var coerce = utils.isFunction(type) ? type : null;
            type = coerce ? null : type;
            type = type || (isBool ? 'boolean' : autoType);
            return function (val, def) {
                if (!coerce || (coerce && _this.options.castBeforeCoerce))
                    val = cmd.castToType(key, type, val, def);
                if (coerce)
                    val = coerce(val, cmd);
                return val;
            };
        };
        normalized.forEach(function (el, i) {
            var val;
            var key = stats.map[i]; // get cmd/opt by position in map.
            if ('$value' === key)
                return; // if $value expects flag value no process.
            var isNot = /^--no/.test(el) ? true : false; // flag prefixed with --no.
            el = el.replace(/^--no/, '');
            var next = normalized[i + 1]; // next arg.
            var isFlag = constants_1.FLAG_EXP.test(el); // is a flag/option key.
            var isFlagNext = cmd.isBool(key) && constants_1.FLAG_EXP.test(next || ''); // next is a flag/option key.
            if (!cmd.isBool(key) && isFlag && constants_1.FLAG_EXP.test(next || ''))
                isFlagNext = true;
            var def = cmd._defaults[key]; // check if has default value.
            var isVariadic = cmd._variadic === key; // is a variadic key.
            var isBool = (isFlag && (cmd.isBool(key) || isFlagNext) || (!next && isFlag)); // is boolean key.
            //  (isFlag && (!next || cmd.isBool(key) || isFlagNext));
            var coercion = cmd._coercions[key]; // lookup user coerce function.
            // if (key === '--flag1') {
            //   console.log('\nnext:', next, '  flag:', isFlag, '  flag next:', isFlagNext, '  default:', def + '\n');
            // }
            if (isNot && !isBool) {
                _this.error(_this._localize('cannot set option %s to boolean, a value is expected.')
                    .args(key).styles(colors.accent).done());
            } // Prevent --no option when not bool flag.
            var wrapper = coerceWrapper(key, coercion, isBool); // get coerce wrapper.
            val = isFlag ? !isBool ? next : true : el;
            val = isFlag && isBool && isNot ? false : val;
            if (utils.isBoolean(def) && def === true && val === false)
                val = true;
            // Don't coerce with default value
            // will set after all values are pushed to array.
            if (isVariadic)
                def = undefined;
            val = wrapper(val, def);
            var formattedKey = utils.camelcase(key.replace(constants_1.FLAG_EXP, ''));
            if (!isFlag) {
                if (isVariadic)
                    result.$variadics.push(val);
                else
                    result.$arguments.push(val);
                if (cmd._extendArguments && key) {
                    if (isVariadic) {
                        result[formattedKey] = result[formattedKey] || [];
                        result[formattedKey].push(val);
                    }
                    else {
                        result[formattedKey] = val;
                    }
                }
            }
            else {
                if (constants_1.DOT_EXP.test(key)) {
                    utils.set(result, key.replace(constants_1.FLAG_EXP, ''), val);
                }
                else {
                    if (result[formattedKey]) {
                        result[formattedKey] = [result[formattedKey]];
                        result[formattedKey].push(val);
                    }
                    else {
                        result[formattedKey] = val;
                    }
                    if (cmd._extendAliases) {
                        (cmd.aliases(key) || []).forEach(function (el) {
                            var frmKey = utils.camelcase(el.replace(constants_1.FLAG_EXP, ''));
                            if (result[frmKey]) {
                                result[frmKey] = [result[frmKey]];
                                result[frmKey].push(val);
                            }
                            else {
                                result[frmKey] = val;
                            }
                        });
                    }
                }
            }
        });
        // Ensure variadic default if exists.
        if (cmd._variadic && !result.$variadics.length && cmd._defaults[cmd._variadic])
            result.$variadics = utils.toArray(cmd._defaults[cmd._variadic], []);
        // Push variadics array to commands.
        if (result.$variadics.length)
            result.$arguments.push(result.$variadics);
        if (isExec) {
            var filteredAnon = stats.anonymous.filter(function (v) { return !constants_1.FLAG_EXP.test(v); });
            if (cmd._spreadArguments) {
                var offset = (cmd._arguments.length + filteredAnon.length) - result.$arguments.length;
                if (cmd._variadic)
                    offset = cmd._arguments.length - result.$arguments.length;
                while (offset > 0 && offset--)
                    result.$arguments.push(null);
            }
        }
        result.$commands = result.$arguments;
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
        if (!parsed || utils.isEmpty(parsed))
            return {};
        var normLen = parsed.$stats && parsed.$stats.normalized.length;
        var optsLen = parsed.$stats && parsed.$stats.optionsCount;
        var cmdName = parsed.$command;
        if (!cmdName && (normLen || optsLen))
            cmdName = constants_1.DEFAULT_COMMAND;
        var cmd = this.getCommand(cmdName) || null;
        if (cmd && cmd._external) {
            this.spawnHandler(parsed, cmd);
            return parsed;
        }
        if (!cmd) {
            this.showHelp();
            return parsed;
        }
        if (parsed.$stats && !this.options.extendStats && !(cmd && cmd._external))
            delete parsed.$stats;
        if (cmd && utils.isFunction(cmd._action)) {
            var shouldSpread = utils_1.isBoolean(cmd._spreadArguments) ? cmd._spreadArguments : this.options.spreadArguments;
            if (this._completionsCommand === cmd._name) {
                cmd._action.call(this, parsed.$arguments.shift() || null, parsed, cmd);
            }
            else {
                if (shouldSpread) {
                    (_a = cmd._action).call.apply(_a, [this].concat(parsed.$arguments, [parsed, cmd]));
                }
                else {
                    cmd._action.call(this, parsed, cmd);
                }
            }
        }
        return parsed;
        var _a;
    };
    /**
     * Base
     * : Sets a base path for all external scripts that contain extentions.
     *
     * @param path a base path for ALL external command scripts.
     */
    Pargv.prototype.base = function (path) {
        this._base = path;
    };
    Pargv.prototype.completion = function (command, describe, template, fn) {
        var _this = this;
        if (utils.isFunction(describe)) {
            fn = describe;
            template = undefined;
            describe = undefined;
        }
        if (utils.isFunction(template)) {
            fn = template;
            template = undefined;
        }
        command = command || this._localize(this._completionsCommand).done();
        this._completionsCommand = command; // save the name of the command.
        var getFlag = this._completionsReply;
        var replyCmd = command + " " + getFlag; // the reply command for completions.sh.
        command = command + " [path]"; // our PargvCommand for completions.
        describe = describe || this._localize('Installs and or outputs script for tab completions.').done();
        var cmd = this.command(command, describe);
        cmd.option('--install, -i [path]', this._localize('when true installs completions.').done());
        cmd.option('--reply', this._localize('when true returns tab completions.').done());
        cmd.option('--force, -f', this._localize('when true allows overwrite or reinstallation.').done());
        cmd.action(function (path, parsed) {
            if (parsed.reply) {
                return _this.completionResult(parsed, _this._completionsHandler); // reply with completions.
            }
            else if (parsed.install) {
                if (utils_1.isString(parsed.install))
                    path = parsed.install;
                var success = _this._completions.install(path || _this._env.EXEC, replyCmd, template, parsed.force);
                if (success) {
                    _this.log('\n' + _this._localize('successfully installed tab completions, quit and reopen terminal.\n\n').done());
                }
            }
            else {
                _this.showCompletion(path || _this._env.EXEC);
            }
        });
        if (fn)
            this._completionsHandler = fn;
        return this;
    };
    /**
      * Completion Result
      * Method called maually or by script stored in your bash profile.
      *
      * @param line the Pargv parsed result, array of values or string (current line).
      * @param fn the callback on done compiling completions.
      */
    Pargv.prototype.completionResult = function (line, fn) {
        var _this = this;
        var argv = utils.isArray(line) ? line : utils.isString(line) ? line.split(' ') : line.$source;
        var current = argv && argv.length ? utils.last(argv) : ''; // get current arg.
        var handler = fn;
        var finish = function (comps) {
            if (comps)
                comps.forEach(function (el) { return console.log(el); });
            _this.emit('completion', comps);
            process.exit(0);
        };
        if (!fn) {
            // likely being called manually from ext source just build and completions
            // and return. For example if you wanted to use completionResult() as a
            // handler for Node's readline completer.
            return this._completions.handler(current, argv);
        }
        utils.setBlocking(true); // set blocking on stream handle.
        if (handler.length > 2) {
            handler(current, argv, finish);
        }
        else {
            finish(handler(current, argv)); // handler is synchronous.
        }
    };
    Pargv.prototype.reset = function (options, all) {
        if (utils.isBoolean(options)) {
            all = options;
            options = undefined;
        }
        this._commands = {};
        if (!all)
            return this.init(options);
        this._base = false;
        this._meta = {};
        this._helpHandler = undefined;
        this._logHandler = undefined;
        this._errorHandler = undefined;
        return this.init(options);
    };
    /**
     * On Help
     * Method for adding custom help handler, disabling.
     * If custom handler return compiled help to be displayed or false to handle manually.
     *
     * @param fn boolean to enable/disable, or function for custom help.
     */
    Pargv.prototype.onHelp = function (fn) {
        if (!utils.isValue(fn))
            fn = true;
        if (fn === false)
            this._helpHandler = utils.noop;
        else if (fn === true)
            this._helpHandler = this.helpHandler;
        else
            this._helpHandler = fn;
        return this;
    };
    /**
     * On Error
     * Add custom on error handler.
     *
     * @param fn the error handler function.
     */
    Pargv.prototype.onError = function (fn) {
        this._errorHandler = fn || this.errorHandler;
        return this;
    };
    /**
     * On Log
     * Add custom on log handler.
     *
     * @param fn the log handler function.
     */
    Pargv.prototype.onLog = function (fn) {
        this._logHandler = fn || this.logHandler;
        return this;
    };
    // UTIL METHODS //
    /**
     * Error
     * : Handles error messages.
     *
     * @param args args to be formatted and logged.
     */
    Pargv.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var formatted, err;
        var prune = 1;
        if (!(args[0] instanceof Error)) {
            formatted = this.formatLogMessage.apply(this, args);
            err = new Error(formatted);
        }
        else {
            err = args[0];
            formatted = err.message;
            prune = 0;
        }
        if (err.stack) {
            var stack = err.stack.split(constants_1.EOL);
            var stackMsg = stack.shift();
            stack = stack.slice(prune); // remove message & error call.
            stack.unshift(stackMsg);
            err.stack = stack.join(constants_1.EOL);
        }
        if (!this._errorHandler)
            throw err;
        this._errorHandler(err);
    };
    /**
     * Log
     * Displays log messages after formatting, supports metadata.
     *
     * @param args the arguments to log.
     */
    Pargv.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        // // NOTE: Need to change this to just intercept the stream/hide.
        // if (MOCHA_TESTING) // when testing don't log anything.
        //   return this;
        this._logHandler(this.formatLogMessage.apply(this, args));
        return this;
    };
    /**
     * Stats
     * Iterates array of arguments comparing to defined configuration.
     * To get stats from default command use '__default__' as key name.
     *
     * @param command the command key to get stats for.
     * @param args args to gets stats for.
     */
    Pargv.prototype.stats = function (command) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (utils.isArray(args[0]))
            args = args[0];
        if (!args.length) {
            this.error(this._localize('method %s failed using invalid or undefined arguments.')
                .args('stats').styles(this.options.colors.accent).done());
        }
        args = this.toNormalized(args); // normalize args to known syntax.
        var cmd = this.getCommand(command);
        if (!cmd) {
            this.error(this._localize('method %s failed using invalid or undefined arguments.')
                .args('stats').styles(this.options.colors.accent).done());
        }
        return cmd.stats(args);
    };
    /**
      * Layout
      * Creates a CLI layout much like creating divs in the terminal.
      * @see https://www.npmjs.com/package/cliui
      *
      * @param width the width of the layout.
      * @param wrap if the layout should wrap.
      */
    Pargv.prototype.layout = function (width, wrap) {
        var self = this;
        // Base width of all divs.
        width = width || 80;
        // Init cli ui.
        var ui = cliui({ width: width, wrap: wrap });
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
         * Repeat
         * Simply repeats a character(s) by layout width multiplier
         * or specified multiplier. Good for creating sections
         * or dividers. If single integer is used for padding
         * will use value for top padding then double for bottom.
         *
         * @param char the character to be repeated
         * @param multiplier optional lenth to repeat.
         * @param padding number or array of numbers if single digit used for top/bottom.
         */
        function repeat(char, multiplier, padding) {
            var origLen = multiplier;
            multiplier = multiplier || width;
            var _char = char;
            var stripChar = colurs.strip(_char); // strip any color formatting.
            var canAppend = function () {
                var curLen = colurs.strip(char).length;
                var offset = stripChar.length;
                return curLen < (width - offset);
            };
            if (!utils.isValue(origLen))
                multiplier = Math.round(Math.floor(width / stripChar.length));
            while (multiplier-- && canAppend()) {
                char += _char;
            }
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
            if (!utils.isValue(padding))
                padding = 1;
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
        function show() {
            var elements = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                elements[_i] = arguments[_i];
            }
            if (elements.length)
                add.apply(void 0, ['div'].concat(elements));
            process.stderr.write(get() + '\n');
        }
        var methods = {
            div: div,
            span: span,
            repeat: repeat,
            section: section,
            join: join,
            get: get,
            show: show,
            ui: ui
        };
        return methods;
    };
    // DEFAULT COMMAND METHODS //
    /**
     * Usage
     * Usage is generated automatically, this method allows override of the internal generated usage for default command.
     *
     * @param val the value to display for command usage.
     */
    Pargv.prototype.usage = function (val) {
        this._command.usage(val);
        return this;
    };
    /**
      * Option
      * Adds option to default command.
      *
      * Supported types: string, date, array,
      * number, integer, float, json, regexp, boolean
      *
      * @param token the option token to parse as option.
      * @param describe the description for the option.
      * @param def an optional default value.
      * @param type a string type, RegExp to match or Coerce method.
      */
    Pargv.prototype.option = function (token, describe, def, type) {
        this._command.option(token, describe, def, type);
        return this;
    };
    Pargv.prototype.alias = function (key) {
        var alias = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            alias[_i - 1] = arguments[_i];
        }
        (_a = this._command).alias.apply(_a, [key].concat(alias));
        return this;
        var _a;
    };
    Pargv.prototype.describe = function (key, describe) {
        this._command.describe(key, describe);
        return this;
    };
    /**
     * Coerce
     * Coerce or transform sub command  arguemnt or option for default command.
     *
     * @param key the option key to be coerced.
     * @param type the string type, RegExp or coerce callback function.
     * @param def an optional value when coercion fails.
     */
    Pargv.prototype.coerce = function (key, type, def) {
        this._command.coerce(key, type, def);
        return this;
    };
    /**
     * Demand
     * The sub command argument or option keys to be demanded for default command.
     *
     * @param key the key to demand.
     */
    Pargv.prototype.demand = function () {
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            keys[_i] = arguments[_i];
        }
        (_a = this._command).demand.apply(_a, keys);
        return this;
        var _a;
    };
    Pargv.prototype.when = function (key, demand, converse) {
        this._command.when(key, demand, converse);
        return this;
    };
    Pargv.prototype.default = function (key, val) {
        this._command.default(key, val);
        return this;
    };
    /**
     * Max Options
     * Specifies the maxium options allowed for default command.
     *
     * @param count the number of options allowed.
     */
    Pargv.prototype.maxOptions = function (count) {
        this._command._maxOptions = count;
        return this;
    };
    /**
     * Min Options
     * Specifies the minimum options required for default command.
     *
     * @param count the number of options required.
     */
    Pargv.prototype.minOptions = function (count) {
        this._command._minOptions = count;
        return this;
    };
    /**
     * Completion At
     * : Injects custom completion value for specified key.
     * Key can be a known sub command argument option or * for anonymous.
     *
     * @param key the key to inject completion values for.
     * @param vals the completion values for the provided key.
     */
    Pargv.prototype.completionFor = function (key) {
        var vals = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            vals[_i - 1] = arguments[_i];
        }
        (_a = this._command).completionFor.apply(_a, [key].concat(vals));
        return this;
        var _a;
    };
    /**
     * Action
     * Adds an action event to be called when parsing matches command.
     *
     * @param fn the callback function when parsed command matches.
     */
    Pargv.prototype.action = function (fn) {
        this._command.action(fn);
        return this;
    };
    /**
     * Extend Aliases
     * When true option aliases are extended on result object --option, -o results in { option: value, o: value }.
     *
     * @param extend when true aliases are exteneded on Pargv result object.
     */
    Pargv.prototype.extendAliases = function (extend) {
        this._command.extendAliases(extend);
        return this;
    };
    /**
     * Example
     * : Saves an example string/tuple of example string & description for default command.
     *
     * @param example string or an array of tuples [example, description].
     * @param describe the description for the example.
     */
    Pargv.prototype.example = function (example, describe) {
        this._command.example(example, describe);
        return this;
    };
    /**
     * Help
     * Enables or disables help for default command.
     *
     * @param enabled true or false to toggle help.
     */
    Pargv.prototype.help = function (enabled) {
        this._command.help(enabled);
        return this;
    };
    Object.defineProperty(Pargv.prototype, "if", {
        get: function () {
            return this.when;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "$", {
        // DEPRECATED //
        /**
         * @deprecated use pargv.command()
         *
         * Default Command
         * Exposes default command for parsing anonymous arguments.
         *
         * @example pargv.$.option('-t').parse(['one', '-t', 'test'])
         */
        get: function () {
            this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.$ is deprecated, use methods on pargv instance. ex: pargv.option(), pargv.default()...");
            return this.getCommand(constants_1.DEFAULT_COMMAND);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "get", {
        /**
         * Gets help, completion script, completions, options...
         */
        get: function () {
            var _this = this;
            return {
                /**
                 * @deprecated use .getHelp();
                 *
                 * Help
                 * : Gets help text.
                 *
                 * @param command optional command to show help for.
                 */
                help: function (command) {
                    _this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.get.help() is deprecated, call pargv.getHelp() instead.");
                    return _this.getHelp(command);
                },
                /**
                  * @deprecated use .getCompletion();
                  *
                  * Get Completion
                  * : Gets the completion script.
                  *
                  * @param path the path/name of executable.
                  * @param template the template string.
                  */
                completion: function (path, template) {
                    _this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.get.completion() is deprecated, call pargv.getCompletion() instead.");
                    return _this.getCompletion(path, template);
                },
                /**
                 * @deprecated use .getCommand();
                 *
                 * Command
                 * : Finds a command by name.
                 *
                 * @param key the name of the command to find.
                 */
                command: function (key) {
                    _this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.getCommand() is deprecated, call pargv.getCommand() instead.");
                    return _this.getCommand(key);
                },
                /**
                 * @deprecated use .getOption();
                 *
                 * Option
                 * : Gets an option value by the specified key.
                 *
                 * @param key the option key to get.
                 */
                option: function (key) {
                    return _this.getOption(key);
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "set", {
        /**
         * Methods for setting values.
         */
        get: function () {
            var _this = this;
            return {
                /**
                 * @deprecated use .setOption() instead.
                 * Option
                 * : Sets an option or group of options.
                 *
                 * @param key the key or PargvOptions object to be set.
                 * @param val the value for the provided key.
                 */
                option: function (key, val) {
                    _this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.set.option() is deprecated, call pargv.setOption() instead.");
                    return _this.setOption(key, val);
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "show", {
        /**
         * Shows help, completion script or env.
         */
        get: function () {
            var _this = this;
            return {
                /**
                 * @deprecated use .showHelp() instead.
                 *
                 * Help
                 * Shows help in terminal.
                 *
                 * @param command optional command to show help for.
                 */
                help: function (command) {
                    _this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.show.help() is deprecated, call pargv.showHelp() instead.");
                    return _this.showHelp(command);
                },
                /**
                 * @deprecated use .showCompletion() instead.
                 *
                 * Completion
                 * Shows the completion script in terminal.
                 *
                 * @param path the path/name of executable.
                 * @param template the template string.
                 */
                completion: function (path, template) {
                    _this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.show.completion() is deprecated, call pargv.showCompletion() instead.");
                    return _this.showCompletion(path, template);
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "remove", {
        /**
         * Removes elements and objects.
         */
        get: function () {
            var _this = this;
            return {
                /**
                 * @deprecated use .removeCommand() instead.
                 *
                 * Remove
                 * Removes a command from the collection.
                 *
                 * @param key the command key/name to be removed.
                 */
                command: function (key) {
                    _this.log(colurs.applyAnsi('DEPRECATED:', 'yellow') + " pargv.remove.command() is deprecated, call pargv.removeCommand() instead.");
                    return _this.removeCommand(key);
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    return Pargv;
}(events_1.EventEmitter));
exports.Pargv = Pargv;
//# sourceMappingURL=pargv.js.map