"use strict";
// IMPORTS //
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var fs_1 = require("fs");
var child_process_1 = require("child_process");
var util = require("util");
var cliui = require("cliui");
var figlet = require("figlet");
var colurs_1 = require("colurs");
var utils = require("./utils");
var completions_1 = require("./completions");
var localize_1 = require("./localize");
var command_1 = require("./command");
var constants_1 = require("./constants");
// VARIABLES & CONSTANTS //
var DEFAULTS = {
    cast: true,
    colorize: true,
    headingDivider: '><><',
    commandDivider: '.',
    locale: 'en',
    localeDir: './locales',
    autoHelp: true,
    defaultHelp: true,
    layoutWidth: 80,
    castBeforeCoerce: false,
    extendCommands: false,
    extendAliases: false,
    extendStats: false,
    spreadCommands: true,
    allowAnonymous: true,
    ignoreTypeErrors: false,
    displayStackTrace: false,
    colors: {
        primary: 'blue',
        accent: 'cyan',
        alert: 'red',
        muted: 'gray'
    },
};
// CLASSES //
var Pargv = /** @class */ (function () {
    function Pargv(options) {
        this._completionsCommand = 'completions';
        this._completionsReply = '--reply';
        this._base = false;
        this._commands = {};
        this.init(options);
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
        this.options.commandDivider = this.options.itemDivider || this.options.commandDivider;
        this._colurs = new colurs_1.Colurs({ enabled: this.options.colorize });
        this._localize = localize_1.localize(this);
        this._env = utils.environment(); // get env paths.
        this._completions = completions_1.completions(this); // helper for generating completions.sh.
        this._helpCommand = this._localize('help').done(); // localized name for help.
        this.command('__default__'); // Default Command.
        // DEPRECATED: just use --help by default.
        // user can create help command if desired.
        // const cmdStr = this._localize('command').done();
        // const helpAlias = helpStr.charAt(0);
        // const helpCmd = `${helpStr}.${helpAlias} [${cmdStr}]`;
        // this.command(helpCmd)                       // Default help command.
        //   .action(this.show.help.bind(this));
        this._helpHandler = this.helpHandler; // default help handler.
        this._errorHandler = this.errorHandler; // default error handler.
        this._completionsHandler = this._completions.handler; // default completion handler.
        this._logHandler = this.logHandler; // default log handler.
        return this;
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
            msg = util.format(msg || '', tokens);
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
        var col1w = Math.floor(layoutWidth * .30);
        var col2w = Math.floor(layoutWidth * .55);
        var col3w = layoutWidth - (col1w + col2w);
        // Define color vars.
        var primary = this.options.colors.primary;
        var alert = this.options.colors.alert;
        var accent = this.options.colors.accent;
        var muted = this.options.colors.muted;
        var div = this.options.headingDivider;
        var itmDiv = this.options.commandDivider;
        var itmDivMulti = Math.round(((layoutWidth / itmDiv.length) / 3) * 2);
        var ctr = 0;
        var noneStr = this._localize('none').done();
        // Builds commands and flags help.
        var buildOptions = function (cmd) {
            var cmdsStr, optsStr, exStr, reqStr;
            cmdsStr = _this._localize('Commands').done();
            optsStr = _this._localize('Options').done();
            exStr = _this._localize('Examples').done();
            reqStr = _this._localize('required').done();
            if (!cmd._commands.length && !cmd._options.length)
                return;
            layout.section(_this._colurs.applyAnsi(cmdsStr + ":", accent), [1, 0, 0, 1]);
            cmd._commands.forEach(function (el) {
                var isRequired = utils.contains(cmd._demands, el);
                var arr = [
                    { text: el, padding: [0, 1, 0, 2], width: col1w },
                    { text: _this._colurs.applyAnsi(cmd._describes[el] || '', muted), width: col2w }
                ];
                var lastCol = isRequired ? { text: _this._colurs.applyAnsi("" + reqStr, alert), align: 'right', width: col3w } : { text: '', width: col3w };
                arr.push(lastCol);
                layout.div.apply(layout, arr);
            });
            if (!cmd._commands.length)
                layout.div({ text: _this._colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, 2] });
            layout.section(_this._colurs.applyAnsi(optsStr + ":", accent), [1, 0, 0, 1]);
            cmd._options.sort().forEach(function (el) {
                var isRequired = utils.contains(cmd._demands, el);
                var aliases = cmd.aliases(el).sort();
                // const names = [el].concat(aliases).join(', ');
                var usages = cmd._usages[el]; // get without first key.
                var usageVal;
                if (/^(\[|<)/.test(utils.last(usages)))
                    usageVal = usages.pop();
                var describe = _this._colurs.applyAnsi(cmd._describes[el] || '', muted);
                if (usageVal)
                    describe = usageVal + ': ' + describe;
                var arr = [
                    { text: usages.join(', '), padding: [0, 1, 0, 2], width: col1w },
                    { text: describe, width: col2w }
                ];
                var lastCol = isRequired ? { text: _this._colurs.applyAnsi("" + reqStr, alert), align: 'right', width: col3w } : { text: '', width: col3w };
                arr.push(lastCol);
                layout.div.apply(layout, arr);
            });
            if (!cmd._options.length)
                layout.div({ text: _this._colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, 2] });
            if (cmd._examples.length) {
                layout.section(_this._colurs.applyAnsi(exStr + ":", accent), [1, 0, 0, 1]);
                cmd._examples.forEach(function (tuple) {
                    var ex = tuple[0];
                    var desc = tuple[1] || null;
                    if (desc)
                        desc = _this._colurs.applyAnsi(desc, muted);
                    if (!/^.*\$\s/.test(ex))
                        ex = '$ ' + ex;
                    ex = _this._colurs.applyAnsi(ex, muted);
                    layout.div({ text: ex, padding: [0, 0, 0, 2] }, desc || '');
                });
            }
        };
        // Builds the app name, version descript header.
        var buildHeader = function () {
            var descStr, verStr, licStr;
            descStr = _this._localize('Description').done();
            verStr = _this._localize('Version').done();
            licStr = _this._localize('License').done();
            // Add the name to the layout.
            if (_this._name) {
                if (!_this._nameFont)
                    layout.repeat(_this._colurs.applyAnsi(div, muted));
                var tmpName = _this._name;
                var nameStyles = _this._nameStyles && _this._nameStyles.length ? _this._nameStyles : primary;
                if (_this._nameFont)
                    tmpName = _this.logo(tmpName, _this._nameFont, nameStyles).get();
                else
                    tmpName = _this._colurs.applyAnsi(tmpName, nameStyles);
                layout.div(tmpName);
                if (_this._nameFont)
                    layout.div();
                // Add description to layout.
                if (_this._describe)
                    layout.div(_this._colurs.applyAnsi(descStr + ":", accent) + " " + utils.padLeft(_this._colurs.applyAnsi(_this._describe, muted), 3));
                // Add version to layout.
                if (_this._version)
                    layout.div(_this._colurs.applyAnsi(verStr + ":", accent) + " " + utils.padLeft(_this._colurs.applyAnsi(_this._version, muted), 7));
                if (_this._license)
                    layout.div(_this._colurs.applyAnsi(licStr + ":", accent) + " " + utils.padLeft(_this._colurs.applyAnsi(_this._license, muted), 7));
                // Add break in layout.
                if (div)
                    layout.repeat(_this._colurs.applyAnsi(div, muted));
                else
                    layout.div();
            }
        };
        // Builds the body of the help iterating
        // over each command and its options.
        var buildBody = function () {
            var cmdKeys, usageStr, aliasStr, extStr, falseStr, trueStr;
            usageStr = _this._localize('Usage').done();
            aliasStr = _this._localize('Alias').done();
            extStr = _this._localize('external').done();
            falseStr = _this._localize('false').done();
            if (command) {
                cmdKeys = [command];
                console.log(); // only displaying one command add spacing.
            }
            else {
                cmdKeys = utils.keys(_this._commands).sort();
            }
            cmdKeys.forEach(function (el, i) {
                if (el._name)
                    el = el._name;
                var cmd = _this.get.command(el);
                if (i > 0)
                    layout.repeat(_this._colurs.applyAnsi(itmDiv, muted), itmDivMulti);
                var aliases = cmd.aliases(cmd._name).join(', '); // get aliases.
                if (!aliases || !aliases.length)
                    aliases = noneStr;
                var divs = [
                    _this._colurs.applyAnsi(usageStr + ": ", primary) + cmd._usage, _this._colurs.applyAnsi(aliasStr + ": ", primary) + aliases,
                ];
                if (cmd._external)
                    divs.push(_this._colurs.applyAnsi("(" + extStr + ")", accent));
                layout.div.apply(layout, divs);
                if (cmd._describe) {
                    layout.div({ text: _this._colurs.applyAnsi(cmd._describe, muted), padding: [1, 0, 0, 0] });
                }
                buildOptions(cmd);
            });
        };
        var buildFooter = function () {
            // Add epilog if any.
            if (_this._epilog) {
                if (div)
                    layout.repeat(_this._colurs.applyAnsi(div, muted));
                else
                    layout.div();
                layout.div(_this._colurs.applyAnsi(_this._epilog, muted));
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
    /**
     * Help Handler
     * The default help handler.
     *
     * @param command optional command to get help for.
     */
    Pargv.prototype.helpHandler = function (command) {
        if (this._helpEnabled === false)
            return;
        return this.compileHelp(command).get();
    };
    /**
     * Error Handler
     * The default error handler.
     *
     * @param message the error message to display.
     * @param err the PargvError instance.
     */
    Pargv.prototype.errorHandler = function (message, err) {
        if (constants_1.MOCHA_TESTING)
            throw err;
        var name = err.name;
        var msg = err.message;
        var stack = err.stack;
        msg = this._colurs.bold.red(name) + ': ' + msg;
        console.log();
        console.log(msg);
        if (this.options.displayStackTrace && stack) {
            console.log();
            console.log(stack);
        }
        console.log();
        process.exit(1);
    };
    /**
     * Log Handler
     * : Handles internal log messages.
     *
     * @param message the message to be logged.
     */
    Pargv.prototype.logHandler = function (message) {
        var colors = ['bold'].concat(utils.toArray(this.options.colors.primary));
        var prefix = this._name ? utils.capitalize(this._name.toLowerCase()) : 'Pargv';
        prefix = this._colurs.applyAnsi(prefix, colors);
        console.log();
        console.log(prefix + ': ' + message);
        console.log();
    };
    /**
     * Completions Reply
     * Method called form bash profile for compreply.
     *
     * @param argv the current argv from tab completions.
     * @param done the callback on done compiling completions.
     */
    Pargv.prototype.completionsReply = function (parsed) {
        var argv = parsed.$source;
        var current = argv && argv.length ? utils.last(argv) : ''; // get current arg.
        var handler = this._completionsHandler;
        var finish = function (comps) {
            comps.forEach(function (el) { return console.log(el); });
            process.exit(0);
        };
        utils.setBlocking(true); // set blocking on stream handle.
        if (handler.length > 2) {
            handler(current, argv, finish);
        }
        else {
            finish(handler(current, argv)); // handler is synchronous.
        }
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
    Object.defineProperty(Pargv.prototype, "$", {
        // GETTERS //
        /**
         * Default Command
         * Exposes default command for parsing anonymous arguments.
         *
         * @example pargv.$.option('-t').parse(['one', '-t', 'test'])
         */
        get: function () {
            return this._command;
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
                 * Help
                 * : Gets help text.
                 *
                 * @param command optional command to show help for.
                 */
                help: function (command) {
                    return _this.buildHelp(command);
                },
                /**
                  * Get Completion
                  * : Gets the completion script.
                  *
                  * @param path the path/name of executable.
                  * @param template the template string.
                  */
                completion: function (path, template) {
                    return _this._completions.generate(path, template).script;
                },
                /**
                 * Completions
                 * : Gets completions for the supplied args.
                 *
                 * @param args arguments to parse for completions.
                 * @param fn a callback function containing results.
                 */
                completions: function (args, fn) {
                    // return this._completionHandler.call(this, args, fn);
                },
                /**
                 * Command
                 * : Finds a command by name.
                 *
                 * @param key the name of the command to find.
                 */
                command: function (key) {
                    var cmds = _this._commands;
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
                },
                /**
                 * Env
                 * : Gets environment variables.
                 */
                env: function () {
                    return _this._env;
                },
                /**
                 * Option
                 * : Gets an option value by the specified key.
                 *
                 * @param key the option key to get.
                 */
                option: function (key) {
                    return _this.options[key] || null;
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
                 * Option
                 * : Sets an option or group of options.
                 *
                 * @param key the key or PargvOptions object to be set.
                 * @param val the value for the provided key.
                 */
                option: function (key, val) {
                    var obj = key;
                    if (!utils.isPlainObject(key)) {
                        obj = {};
                        obj[key] = val;
                    }
                    var valKeys = utils.keys(_this.options);
                    for (var k in obj) {
                        if (~valKeys.indexOf(k))
                            _this.options[k] = obj[k];
                    }
                    return _this;
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "show", {
        /**
         * Shows help completion script env.
         */
        get: function () {
            var _this = this;
            return {
                /**
                 * Help
                 * Shows help in terminal.
                 *
                 * @param command optional command to show help for.
                 */
                help: function (command) {
                    console.log();
                    console.log(_this.buildHelp(command));
                    console.log();
                    process.exit(0);
                },
                /**
                 * Completion
                 * Shows the completion script in terminal.
                 *
                 * @param path the path/name of executable.
                 * @param template the template string.
                 */
                completion: function (path, template) {
                    console.log();
                    console.log(_this._completions.generate(path, template).script);
                    console.log();
                },
                /**
                 * Env
                 * Shows environment variables in terminal.
                 */
                env: function () {
                    _this.log(_this._env);
                    return _this;
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
                 * Remove
                 * Removes a command from the collection.
                 *
                 * @param key the command key/name to be removed.
                 */
                command: function (key) {
                    var cmd = _this.get.command(key);
                    if (!cmd)
                        return _this;
                    delete _this._commands[cmd._name];
                    return _this;
                }
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Pargv.prototype, "listen", {
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
    // META //
    /**
     * Meta
     * Accepts object containing metadata information for program.
     * Simply a way to enter name, description, version etc by object
     * rather than chaining each value.
     *
     * @param data the metadata object.
     */
    Pargv.prototype.meta = function (data) {
        for (var k in data) {
            if (this[k]) {
                if (utils.isArray(data[k]))
                    this[k].apply(this, data[k]);
                else
                    this[k](data[k]);
            }
        }
    };
    /**
     * App
     * Just adds a string to use as title of app, used in help.
     * If invoked without value package.json name is used.
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
        this._name = val || utils.capitalize(this._env.PKG.name || '');
        this._nameStyles = utils.toArray(styles, ['cyan']);
        this._nameFont = font || 'ogre';
        return this;
    };
    /**
     * Version
     * Just adds a string to use as the version for your program, used in help.
     * If no value is provided package.json version is used.
     *
     * @param val the value to use as version name.
     */
    Pargv.prototype.version = function (val) {
        this._version = val || this._env.PKG.version;
        return this;
    };
    /**
     * Description
     * The program's description or purpose.
     *
     * @param val the description string.
     */
    Pargv.prototype.description = function (val) {
        this._describe = val;
        return this;
    };
    /**
     * License
     * Stores license type for showing in help.
     *
     * @param val the license type.
     */
    Pargv.prototype.license = function (val) {
        this._license = val;
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
     * @param command the command token string to parse.
     * @param describe a description describing the command.
     */
    Pargv.prototype.command = function (command, describe) {
        var cmd = new command_1.PargvCommand(command, describe, this);
        if (command !== '__default__')
            this._commands[cmd._name] = cmd;
        else
            this._command = cmd;
        return cmd;
    };
    /**
      * Spawn
      * : Spawns and executes and external command.
      *
      * @param parsed the parsed command result.
      * @param cmd a PargvCommand instance.
      * @param stdio optional stdio for child process.
      */
    Pargv.prototype.spawn = function (parsed, cmd, stdio, exit) {
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
                this.error(self._localize('%s could not be executed, check permissions or run as root.')
                    .args(prog)
                    .styles(colors.accent)
                    .done());
                return;
            }
        }
        proc = child_process_1.spawn(prog, args, { stdio: stdio || 'inherit' });
        // Thanks to TJ!
        // see > https://github.com/tj/commander.js/blob/master/index.js#L560
        var signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];
        signals.forEach(function (signal) {
            process.on(signal, function () {
                if ((proc.killed === false) && (proc['exitCode'] === null))
                    proc.kill(signal);
            });
        });
        proc.on('close', function () {
            if (exit !== false)
                process.exit();
        });
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
            process.exit(1);
        });
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
        if (utils.isArray(argv[0]))
            argv = argv[0];
        var result;
        var env = this._env;
        var colors = this.options.colors;
        var autoType = this.options.cast ? 'auto' : 'string'; // is auto casting enabled.
        var isExec = utils.last(argv) === '__exec__' ? argv.pop() : null;
        argv = argv && argv.length ? argv : constants_1.ARGV; // process.argv or user args.
        var procArgv = constants_1.ARGV.slice(0); // get process.argv.
        var normalized = this.toNormalized(argv.slice(0)); // normalize the args.
        var source = normalized.slice(0); // store source args.
        var name = utils.first(normalized); // get first arg.
        if (constants_1.FLAG_EXP.test(name))
            name = undefined;
        var cmd = this.get.command(name); // lookup the command.
        if (isExec || cmd)
            normalized.shift(); // shift first arg.
        if (cmd)
            name = cmd._name;
        else
            cmd = this._command; // use the default command.
        if (name === this._completionsCommand && ~source.indexOf(this._completionsReply)) {
            result = {
                $exec: env.EXEC,
                $command: name,
                $commands: []
            };
            result.$source = source.filter(function (el) {
                return el !== _this._completionsCommand && el !== _this._completionsReply;
            });
            result[this._completionsReply.replace(constants_1.FLAG_EXP, '')] = true;
            return result;
        }
        var ctr = 0;
        var val;
        var stats = cmd.stats(normalized);
        normalized = stats.normalized; // set to normalized & ordered args.
        var helpArr = ['--' + this._helpCommand];
        if (!~helpArr.indexOf('--help'))
            helpArr.push('--help');
        if (utils.containsAny(normalized, helpArr) && cmd._showHelp) {
            this.show.help(cmd);
            return;
        } // show help for command.
        result = {
            $exec: env.EXEC,
            $command: name,
            $external: cmd._external,
            $commands: [],
            $source: source
        };
        if (this.options.extendStats || cmd._external || isExec)
            result.$stats = stats;
        if (!this.options.allowAnonymous && stats.anonymous.length) {
            this.error(// no anon in strict mode.
            fs_1.lstatSync);
        }
        if (stats.missing.length) {
            this.error(// no anon in strict mode.
            this._localize('missing required arguments %s or have no default value.')
                .args(stats.missing.join(', '))
                .styles(colors.accent)
                .done());
        }
        if (stats.whens.length) {
            var when = stats.whens.shift();
            this.error(// no anon in strict mode.
            this._localize('%s requires %s but is missing.')
                .args(when[0], when[1])
                .styles(colors.accent, colors.accent).done());
        }
        var cmdStr = this._localize('commands').done();
        var optStr = this._localize('options').done();
        var cmdsLen = stats.commands.length;
        var optsLen = stats.options.filter(function (o) { return constants_1.FLAG_EXP.test(o); }).length;
        if (cmd._minCommands > 0 && stats.commands.length < cmd._minCommands) {
            this.error(// min commands required.
            this._localize('at least %s %s are required but got %s.')
                .args(cmd._minCommands, cmdStr, cmdsLen + '')
                .styles(colors.accent, colors.primary, colors.accent).done());
        }
        if (cmd._minOptions > 0 && optsLen < cmd._minOptions) {
            this.error(// min options required.
            this._localize('at least %s %s are required but got %s.')
                .args(cmd._minOptions, optStr, optsLen + '')
                .styles(colors.accent, colors.primary, colors.accent).done());
        }
        if (cmd._maxCommands > 0 && stats.commands.length > cmd._maxCommands) {
            this.error(// max commands allowed.
            this._localize('got %s %s but no more than %s are allowed.')
                .args(cmdsLen, cmdStr, cmd._maxCommands)
                .styles(colors.accent, colors.primary, colors.accent)
                .done());
        }
        if (cmd._maxOptions > 0 && optsLen > cmd._maxOptions) {
            this.error(// max commands allowed.
            this._localize('got %s %s but no more than %s are allowed.')
                .args(optsLen, optStr, cmd._maxOptions)
                .styles(colors.accent, colors.primary, colors.accent)
                .done());
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
            var key = stats.map[i]; // get cmd/opt by position in map.
            if ('$value' === key)
                return; // if $value expects flag value no process.
            var isNot = /^--no/.test(el) ? true : false; // flag prefixed with --no.
            el = el.replace(/^--no/, '');
            var next = normalized[i + 1]; // next arg.
            var isFlag = constants_1.FLAG_EXP.test(el); // is a flag/option key.
            var isFlagNext = constants_1.FLAG_EXP.test(next || ''); // next is a flag/option key.
            var def = cmd._defaults[key]; // check if has default value.
            var isBool = (isFlag && (!next || cmd.isBool(key) || isFlagNext)); // is boolean key.
            var coercion = cmd._coercions[key]; // lookup user coerce function.
            if (isNot && !isBool) {
                _this.error(_this._localize('cannot set option %s to boolean, a value is expected.')
                    .args(key).styles(colors.accent).done());
            } // Prevent --no option when not bool flag.
            var wrapper = coerceWrapper(key, coercion, isBool); // get coerce wrapper.
            val = isFlag ? !isBool ? next : true : el;
            val = isFlag && isBool && isNot ? false : val;
            if (utils.isBoolean(def) && def === true && val === false)
                val = true;
            val = wrapper(val, def);
            var formattedKey = utils.camelcase(key.replace(constants_1.FLAG_EXP, ''));
            if (!isFlag) {
                result.$commands.push(val);
                if (_this.options.extendCommands && key) {
                    result[formattedKey] = val;
                }
            }
            else {
                if (constants_1.DOT_EXP.test(key)) {
                    utils.set(result, key.replace(constants_1.FLAG_EXP, ''), val);
                }
                else {
                    result[formattedKey] = val;
                    if (_this.options.extendAliases) {
                        (cmd.aliases(key) || []).forEach(function (el) {
                            var frmKey = utils.camelcase(el.replace(constants_1.FLAG_EXP, ''));
                            result[frmKey] = val;
                        });
                    }
                }
            }
        });
        if (isExec) {
            if (this.options.spreadCommands) {
                var offset = (cmd._commands.length + stats.anonymous.length) - result.$commands.length;
                while (offset > 0 && offset--)
                    result.$commands.push(null);
            }
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
        if (!parsed)
            return;
        var cmd = parsed.$command ? this.get.command(parsed.$command) : null;
        var normLen = parsed.$stats && parsed.$stats.normalized.length;
        if (cmd && cmd._external) {
            this.spawn(parsed, cmd);
            return parsed;
        }
        if (!parsed.$command && !normLen && this.options.autoHelp) {
            this.show.help();
            return;
        }
        if (parsed.$stats && !this.options.extendStats && !(cmd && cmd._external))
            delete parsed.$stats;
        if (cmd && utils.isFunction(cmd._action)) {
            if (this._completionsCommand === cmd._name) {
                cmd._action.call(this, parsed.$commands.shift() || null, parsed, cmd);
            }
            else {
                if (this.options.spreadCommands)
                    (_a = cmd._action).call.apply(_a, [this].concat(parsed.$commands, [parsed, cmd]));
                else
                    cmd._action.call(this, parsed, cmd);
            }
        }
        if (this.options.autoHelp && !constants_1.MOCHA_TESTING && !cmd)
            this.show.help();
        return parsed;
        var _a;
    };
    /**
     * Base
     * : A base path for all external scripts that contain extentions.
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
        describe = describe || this._localize('tab completions command.').done();
        var cmd = this.command(command, describe);
        cmd.option('--install, -i', this._localize('when true installs completions.').done());
        cmd.option('--reply', this._localize('when true returns tab completions.').done());
        cmd.option('--force, -f', this._localize('when true allows overwrite or reinstallation.').done());
        cmd.action(function (path, parsed) {
            if (parsed.reply) {
                return _this.completionsReply(parsed); // reply with completions.
            }
            else if (parsed.install) {
                var success = _this._completions.install(path || _this._env.EXEC, replyCmd, template, parsed.force);
                if (success) {
                    console.log();
                    _this.log(_this._localize('successfully installed tab completions, quit and reopen terminal.').done());
                    console.log();
                }
            }
            else {
                _this.show.completion(path || _this._env.EXEC);
            }
        });
        if (fn)
            this._completionsHandler = fn;
        return this;
    };
    // ERRORS & RESET //
    /**
      * Reset
      * : Deletes all commands and resets the default command and handlers.
      * If you wish to reset all meta data like name, describe, license etc
      * set "all" to true.
      *
      * @param options Pargv options to reset with.
      */
    Pargv.prototype.reset = function (options, all) {
        this._commands = {};
        if (!all)
            return this.init(options);
        this._helpEnabled = undefined;
        this._name = undefined;
        this._nameFont = undefined;
        this._nameStyles = undefined;
        this._version = undefined;
        this._license = undefined;
        this._describe = undefined;
        this._epilog = undefined;
        this._base = false;
        return this.init(options);
    };
    /**
     * On Help
     * Method for adding custom help handler.
     *
     * @param fn the custom help handler.
     */
    Pargv.prototype.onHelp = function (fn) {
        var _this = this;
        this._helpHandler = function (command) {
            return fn(command, _this._commands);
        };
        return this;
    };
    /**
     * On Error
     * Add custom on error handler.
     *
     * @param fn the error handler function.
     */
    Pargv.prototype.onError = function (fn) {
        if (fn)
            this._errorHandler = fn;
        return this;
    };
    /**
     * On Log
     * Add custom on log handler.
     *
     * @param fn the log handler function.
     */
    Pargv.prototype.onLog = function (fn) {
        if (fn)
            this._logHandler = fn;
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
        if (this._name)
            err.name = utils.capitalize(this._name) + 'Error';
        if (err.stack) {
            var stack = err.stack.split(constants_1.EOL);
            var stackMsg = stack.shift();
            stack = stack.slice(prune); // remove message & error call.
            stack.unshift(stackMsg);
            err.stack = stack.join(constants_1.EOL);
        }
        this._errorHandler.call(this, formatted, err, this);
        return this;
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
        if (constants_1.MOCHA_TESTING)
            return this;
        this._logHandler.call(this, this.formatLogMessage.apply(this, args), this);
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
        var cmd = this.get.command(command);
        if (!cmd) {
            this.error(this._localize('method %s failed using invalid or undefined arguments.')
                .args('stats').styles(this.options.colors.accent).done());
        }
        return cmd.stats(args);
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
            result = this._colurs.applyAnsi(result, styles);
        /**
         * Render
         * Renders out the Figlet font logo.
         */
        function show() {
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
        methods = {
            fonts: fonts,
            show: show,
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
            var stripChar = self._colurs.strip(_char); // strip any color formatting.
            var canAppend = function () {
                var curLen = self._colurs.strip(char).length;
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
            console.log(get());
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
    return Pargv;
}());
exports.Pargv = Pargv;
//# sourceMappingURL=pargv.js.map