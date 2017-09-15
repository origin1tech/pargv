"use strict";
// IMPORTS //
Object.defineProperty(exports, "__esModule", { value: true });
var util = require("util");
var cliui = require("cliui");
var figlet = require("figlet");
var colurs_1 = require("colurs");
var utils = require("./utils");
var completions_1 = require("./completions");
var localize_1 = require("./localize");
var constants_1 = require("./constants");
// VARIABLES & CONSTANTS //
var DEFAULTS = {
    cast: true,
    colorize: true,
    headingDivider: '><><',
    itemDivider: '.',
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
        this._colurs = new colurs_1.Colurs({ enabled: this.options.colorize });
        this._localize = localize_1.localize(this);
        this._env = utils.environment(); // get env paths.
        this._completions = completions_1.completions(this); // helper for generating completions.sh.
        this.command('__default__'); // Default Command.
        this.command('help.h [command]') // Default help command.
            .action(this.show.help.bind(this));
        this._helpHandler = this.helpHandler; // default help handler.
        this._errorHandler = this.errorHandler; // default error handler.
        this._completionsHandler = this._completions.handler; // default completion handler.
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
        // Define color vars.
        var primary = this.options.colors.primary;
        var alert = this.options.colors.alert;
        var accent = this.options.colors.accent;
        var muted = this.options.colors.muted;
        var div = this.options.headingDivider;
        var itmDiv = this.options.itemDivider;
        var itmDivMulti = Math.round(((layoutWidth / itmDiv.length) / 3) * 2);
        var ctr = 0;
        // Builds commands and flags help.
        var buildOptions = function (cmd) {
            var cmdsStr, optsStr, noneStr, exStr, reqStr;
            cmdsStr = _this._localize('Commands').done();
            optsStr = _this._localize('Options').done();
            exStr = _this._localize('Examples').done();
            noneStr = _this._localize('none').done();
            reqStr = _this._localize('required').done();
            if (!cmd._commands.length && !cmd._options.length)
                return;
            layout.section(_this._colurs.applyAnsi(cmdsStr + ":", accent), [1, 0, 0, 1]);
            cmd._commands.forEach(function (el) {
                var isRequired = utils.contains(cmd._demands, el);
                var arr = [{ text: el, padding: [0, 0, 0, 2] }, { text: _this._colurs.applyAnsi(cmd._describes[el] || '', muted) }];
                var lastCol = isRequired ? { text: _this._colurs.applyAnsi("" + reqStr, alert), align: 'right' } : '';
                arr.push(lastCol);
                layout.div.apply(layout, arr);
            });
            if (!cmd._commands.length)
                layout.div({ text: _this._colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, 2] });
            layout.section(_this._colurs.applyAnsi(optsStr + ":", accent), [1, 0, 0, 1]);
            cmd._options.sort().forEach(function (el) {
                var isRequired = utils.contains(cmd._demands, el);
                var aliases = cmd.aliases(el).sort();
                var names = [el].concat(aliases).join(', ');
                var arr = [{ text: names, padding: [0, 0, 0, 2] }, { text: _this._colurs.applyAnsi(cmd._describes[el] || '', muted) }];
                var lastCol = isRequired ? { text: _this._colurs.applyAnsi("" + reqStr, alert), align: 'right' } : '';
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
            var cmdKeys, usageStr, aliasStr;
            usageStr = _this._localize('Usage').done();
            aliasStr = _this._localize('Alias').done();
            if (command) {
                cmdKeys = [command];
                console.log(); // only displaying one command add spacing.
            }
            else {
                cmdKeys = utils.keys(_this._commands).sort()
                    .filter(function (v) { return v !== 'help'; }).concat(['help']);
            }
            cmdKeys.forEach(function (el, i) {
                if (el._name)
                    el = el._name;
                var cmd = _this.get.command(el);
                if (i > 0)
                    layout.repeat(_this._colurs.applyAnsi(itmDiv, muted), itmDivMulti);
                var aliases = cmd.aliases(cmd._name).join(', '); // get aliases.
                layout.div(_this._colurs.applyAnsi(usageStr + ": ", primary) + cmd._usage, _this._colurs.applyAnsi(aliasStr + ": ", primary) + aliases);
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
        var cmd = new PargvCommand(command, describe, this);
        if (command !== '__default__')
            this._commands[cmd._name] = cmd;
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
        if (utils.containsAny(normalized, ['--help', '-h']) && cmd._showHelp) {
            this.show.help(cmd);
            return;
        } // show help for command.
        if (name === 'help') {
            this.show.help();
            return;
        }
        result = {
            $exec: env.EXEC,
            $command: name,
            $commands: [],
            $source: source
        };
        if (this.options.extendStats)
            result.$stats = stats;
        if (!this.options.allowAnonymous && stats.anonymous.length) {
            this.error(// no anon in strict mode.
            this._localize('anonymous arguments %s prohibited in strict mode.')
                .args(stats.anonymous)
                .styles(colors.accent).done());
        }
        if (stats.missing.length) {
            this.error(// no anon in strict mode.
            this._localize('missing required arguments %s or have no default value.')
                .args(stats.missing)
                .styles(colors.accent).done());
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
            result.$stats = stats;
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
        if (utils.isArray(argv[0]))
            argv = argv[0];
        var parsed = this.parse.apply(this, argv.concat(['__exec__']));
        if (!parsed)
            return;
        var normLen = parsed.$stats && parsed.$stats.normalized.length;
        if (!parsed.$command && !normLen && this.options.autoHelp) {
            this.show.help();
            return;
        }
        if (parsed.$stats && !this.options.extendStats)
            delete parsed.$stats;
        var cmd = this.get.command(parsed.$command);
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
        if (!cmd && this.options.autoHelp)
            this.show.help();
        return parsed;
        var _a;
    };
    // ERRORS & RESET //
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
     * Reset
     * Deletes all commands and resets the default command.
     * Reset does to reset or clear custom help or error handlers
     * nor your name, description license or version. If you wish
     * to reset everyting pass true as second arg.
     */
    Pargv.prototype.reset = function (options, all) {
        this._commands = {};
        if (all) {
            this._helpEnabled = undefined;
            this._name = undefined;
            this._nameFont = undefined;
            this._nameStyles = undefined;
            this._version = undefined;
            this._license = undefined;
            this._describe = undefined;
            this._epilog = undefined;
            this._colurs = undefined;
            this._localize = undefined;
            this._errorHandler = this.errorHandler;
            this._helpHandler = this.helpHandler;
            this._completionsHandler = this._completions.handler;
        }
        return this.init(options);
    };
    // UTIL METHODS //
    /**
     * Error
     * Handles error messages.
     *
     * @param args args to be formatted and logged.
     */
    Pargv.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var formatted = this.formatLogMessage.apply(this, args);
        var err = new utils.PargvError(formatted);
        if (err.stack) {
            var stack = err.stack.split(constants_1.EOL);
            stack = stack.slice(2, stack.length).join(constants_1.EOL); // remove message & error call.
            err.stack = stack;
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
        var colors = ['bold'].concat(utils.toArray(this.options.colors.primary));
        var prefix = this._colurs.applyAnsi('Pargv:', colors);
        console.log(prefix, this.formatLogMessage.apply(this, args));
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
            this.error(this._pargv._localize('the token %s is missing, invalid or has unwanted space.')
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
        var ctr = 0; // Counter for command keys.
        var aliases = split.shift().trim().split('.'); // Break out command aliases.
        var name = aliases.shift(); // First is key name.
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
        // Placeholde for tab completion.
        // const compNames = name + (aliases.length ? '|' + aliases.join('|') : '');
        // let compUsage = usage.slice(0);
        // compUsage[0] = compNames;
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
        if (this._name === 'help') {
            this._showHelp = true;
            return;
        }
        if (!utils.isValue(enabled))
            enabled = true;
        this._showHelp = enabled;
        if (enabled) {
            var str = this._pargv._localize('displays help for %s.').args(this._name).done();
            this.option('--help, -h', str);
        }
        else {
            this._options = this._options.map(function (el) {
                if (!/^(--help|-h)$/.test(el))
                    return el;
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
    Object.defineProperty(PargvCommand.prototype, "error", {
        // GETTERS //
        get: function () {
            return this._pargv.error.bind(this._pargv);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PargvCommand.prototype, "command", {
        /**
         * Command
         * : Access to Pargv command.
         */
        get: function () {
            return this._pargv.command.bind(this._pargv);
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
         * : Access Pargv parse method.
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
         * : Access Pargv exec.
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
         * : Alias to Pargv exec.
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
                this_1.error(this_1._pargv._localize('cannot set %s for %s using value of undefined.')
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
                this.error(this._pargv._localize('cannot set %s for %s using value of undefined.')
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
                this.error(this._pargv._localize('cannot set %s for %s using value of undefined.')
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
                this.error(this._pargv._localize('cannot set %s for %s using value of undefined.')
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
                this.error(this._pargv._localize('cannot set %s for %s using value of undefined.')
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
            this.error(this._pargv._localize('cannot set completion for using key of undefined.')
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
            this.error(this._pargv._localize('cannot set %s for %s using value of undefined.')
                .setArg('action')
                .setArg(this._name)
                .styles(colors.accent, colors.accent)
                .done());
        this._action = fn;
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
                    this.error(this._pargv._localize('expected type %s but got %s instead.')
                        .args(type, utils.getType(result))
                        .styles(colors.accent, colors.accent)
                        .done());
                }
                else {
                    this.error(this._pargv._localize('expected list or expression %s to contain %s.')
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
     * Fail
     * Add custom on error handler.
     *
     * @param fn the error handler function.
     */
    PargvCommand.prototype.fail = function (fn) {
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
//# sourceMappingURL=index.js.map