// IMPORTS //

import { parse, resolve, basename, join } from 'path';
import { appendFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import * as util from 'util';
import * as cliui from 'cliui';
import * as figlet from 'figlet';
import { Colurs, IColurs } from 'colurs';
import * as utils from './utils';
import { readFileSync } from 'fs';
import { completions } from './completions';
import { localize } from './localize';
import { PargvCommand } from './command';
import { IMap, IPargvOptions, AnsiStyles, HelpHandler, CompletionHandler, IFigletOptions, IPargvLayout, IPargvLogo, IPargvParsedResult, ErrorHandler, IPargvMetadata, IPargvEnv, IPargvCompletions, LocalizeInit, IPargvStats, CoerceHandler } from './interfaces';
import { TOKEN_PREFIX_EXP, FLAG_EXP, SPLIT_CHARS, COMMAND_VAL_EXP, FLAG_SHORT_EXP, DOT_EXP, FORMAT_TOKENS_EXP, EXE_EXP, PARGV_ROOT, ARGV, MOCHA_TESTING, EOL } from './constants';

export { PargvCommand };
export * from './interfaces';

// VARIABLES & CONSTANTS //

const DEFAULTS: IPargvOptions = {
  cast: true,               // when true parsed values auto cast to type if not defined.
  colorize: true,           // wether or not to use colors in help & log messages.
  headingDivider: '><><',   // divider char(s) used in help header/footer.
  commandDivider: '.',      // divider char(s) used in help command sections.
  locale: 'en',             // localization code.
  localeDir: './locales',
  autoHelp: true,           // on no command && no args show help automatially from exec.
  defaultHelp: true,        // when true new commands are auto added to help.
  layoutWidth: 80,          // layout width for help.
  castBeforeCoerce: false,  // when true parsed values are auto cast before coerce funn.
  extendCommands: false,    // when true known commands extended to result object.
  extendAliases: false,     // when true aliases for options extended to result object.
  extendStats: false,       // when true stats are extended to result object.
  spreadCommands: true,     // when true action callbacks spread commands.
  allowAnonymous: true,     // when true anonymous commands options allowed.
  ignoreTypeErrors: false,  // when true type check errors are ignored.
  displayStackTrace: false, // when true stacktrace is displayed on errors.
  colors: {                 // colors used in help.
    primary: 'blue',
    accent: 'cyan',
    alert: 'red',
    muted: 'gray'
  },
};

// CLASSES //

export class Pargv {

  private _helpEnabled: boolean;
  private _helpHandler: HelpHandler;
  private _errorHandler: ErrorHandler;

  private _completionsHandler: CompletionHandler;
  private _completions: IPargvCompletions;
  private _completionsCommand: string = 'completions';
  private _completionsReply: string = '--reply';

  private _command: PargvCommand;

  _colurs: IColurs;
  _localize: LocalizeInit;

  _env: IPargvEnv;
  _name: string;
  _nameFont: string;
  _nameStyles: AnsiStyles[];
  _version: string;
  _license: string;
  _describe: string;
  _epilog: string;
  _commands: IMap<PargvCommand> = {};

  options: IPargvOptions;

  constructor(options?: IPargvOptions) {
    this.init(options);
  }

  // PRIVATE //

  /**
   * Init
   * Common method to initialize Pargv also used in .reset().
   *
   * @param options the Pargv options object.
   */
  private init(options?: IPargvOptions) {

    this.options = utils.extend<IPargvOptions>({}, DEFAULTS, options);
    this.options.commandDivider = this.options.itemDivider || this.options.commandDivider;

    this._colurs = new Colurs({ enabled: this.options.colorize });
    this._localize = localize(this);
    this._env = utils.environment();  // get env paths.
    this._completions = completions(this); // helper for generating completions.sh.

    const helpStr = this._localize('help').done();
    const cmdStr = this._localize('command').done();
    const helpAlias = helpStr.charAt(0);
    const helpCmd = `${helpStr}.${helpAlias} [${cmdStr}]`;

    this.command('__default__');                 // Default Command.
    this.command(helpCmd)              // Default help command.
      .action(this.show.help.bind(this));

    this._helpHandler = this.helpHandler; // default help handler.
    this._errorHandler = this.errorHandler; // default error handler.
    this._completionsHandler = this._completions.handler; // default completion handler.

    return this;

  }

  /**
   * Logger
   * Formats messages for logging.
   *
   * @param args log arguments.
   */
  private formatLogMessage(...args: any[]) {
    let msg = args.shift();
    let meta;
    if (utils.isPlainObject(utils.last(args)))
      meta = args.pop();
    if (utils.isPlainObject(msg) || meta) {
      const obj = meta ? meta : msg;
      meta = util.inspect(obj, null, null, this.options.colorize);
    }
    let tokens = (msg || '').match(FORMAT_TOKENS_EXP);
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
  }

  // HANDLERS & HELP //

  /**
    * Compile Help
    * Compiles help for all commands or single defined commnand.
    *
    * @param command the optional command to build help for.
    */
  private compileHelp(command?: string) {

    const layoutWidth = this.options.layoutWidth;
    const layout = this.layout(layoutWidth);
    const obj: any = {};

    // Define color vars.
    const primary = this.options.colors.primary;
    const alert = this.options.colors.alert;
    const accent = this.options.colors.accent;
    const muted = this.options.colors.muted;

    const div = this.options.headingDivider;
    const itmDiv = this.options.commandDivider;
    let itmDivMulti = Math.round(((layoutWidth / itmDiv.length) / 3) * 2);
    let ctr = 0;

    // Builds commands and flags help.
    const buildOptions = (cmd: PargvCommand) => {

      let cmdsStr, optsStr, noneStr, exStr, reqStr;
      cmdsStr = this._localize('Commands').done();
      optsStr = this._localize('Options').done();
      exStr = this._localize('Examples').done();
      noneStr = this._localize('none').done();
      reqStr = this._localize('required').done();

      if (!cmd._commands.length && !cmd._options.length)
        return;

      layout.section(<string>this._colurs.applyAnsi(`${cmdsStr}:`, accent), [1, 0, 0, 1]);

      cmd._commands.forEach((el) => { // build commands.
        const isRequired = utils.contains(cmd._demands, el);
        const arr: any = [{ text: el, padding: [0, 0, 0, 2] }, { text: this._colurs.applyAnsi(cmd._describes[el] || '', muted) }];
        const lastCol = isRequired ? { text: this._colurs.applyAnsi(`${reqStr}`, alert), align: 'right' } : '';
        arr.push(lastCol);
        layout.div(...arr);
      });

      if (!cmd._commands.length) // no commands set "none".
        layout.div({ text: this._colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, 2] });

      layout.section(<string>this._colurs.applyAnsi(`${optsStr}:`, accent), [1, 0, 0, 1]);

      cmd._options.sort().forEach((el) => { // build options.
        const isRequired = utils.contains(cmd._demands, el);
        const aliases = cmd.aliases(el).sort();
        const names = [el].concat(aliases).join(', ');
        const arr: any = [{ text: names, padding: [0, 0, 0, 2] }, { text: this._colurs.applyAnsi(cmd._describes[el] || '', muted) }];
        const lastCol = isRequired ? { text: this._colurs.applyAnsi(`${reqStr}`, alert), align: 'right' } : '';
        arr.push(lastCol);
        layout.div(...arr);
      });

      if (!cmd._options.length) // no options set "none".
        layout.div({ text: this._colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, 2] });

      if (cmd._examples.length) {
        layout.section(<string>this._colurs.applyAnsi(`${exStr}:`, accent), [1, 0, 0, 1]);

        cmd._examples.forEach((tuple) => {
          let ex = tuple[0];
          let desc = tuple[1] || null;
          if (desc)
            desc = this._colurs.applyAnsi(desc, muted) as string;
          if (!/^.*\$\s/.test(ex))
            ex = '$ ' + ex;
          ex = this._colurs.applyAnsi(ex, muted) as string;
          layout.div({ text: ex, padding: [0, 0, 0, 2] }, desc || '');

        });

      }

    };

    // Builds the app name, version descript header.
    const buildHeader = () => {

      let descStr, verStr, licStr;
      descStr = this._localize('Description').done();
      verStr = this._localize('Version').done();
      licStr = this._localize('License').done();

      // Add the name to the layout.
      if (this._name) {

        if (!this._nameFont)
          layout.repeat(<string>this._colurs.applyAnsi(div, muted));

        let tmpName = this._name;
        const nameStyles = this._nameStyles && this._nameStyles.length ? this._nameStyles : primary;

        if (this._nameFont)
          tmpName = this.logo(tmpName, this._nameFont, nameStyles).get();
        else
          tmpName = <string>this._colurs.applyAnsi(tmpName, nameStyles);

        layout.div(tmpName);

        if (this._nameFont)
          layout.div();

        // Add description to layout.
        if (this._describe)
          layout.div(`${this._colurs.applyAnsi(`${descStr}:`, accent)} ${utils.padLeft(this._colurs.applyAnsi(this._describe, muted) as string, 3)}`);

        // Add version to layout.
        if (this._version)
          layout.div(`${this._colurs.applyAnsi(`${verStr}:`, accent)} ${utils.padLeft(this._colurs.applyAnsi(this._version, muted) as string, 7)}`);

        if (this._license)
          layout.div(`${this._colurs.applyAnsi(`${licStr}:`, accent)} ${utils.padLeft(this._colurs.applyAnsi(this._license, muted) as string, 7)}`);


        // Add break in layout.
        if (div)
          layout.repeat(<string>this._colurs.applyAnsi(div, muted));
        else
          layout.div();

      }

    };

    // Builds the body of the help iterating
    // over each command and its options.
    const buildBody = () => {

      let cmdKeys, usageStr, aliasStr;
      usageStr = this._localize('Usage').done();
      aliasStr = this._localize('Alias').done();

      if (command) {
        cmdKeys = [command];
        console.log(); // only displaying one command add spacing.
      }
      else {
        cmdKeys = utils.keys(this._commands).sort()
          .filter(v => v !== 'help').concat(['help']);
      }

      cmdKeys.forEach((el, i) => {

        if (el._name)
          el = el._name;

        const cmd: PargvCommand = this.get.command(el);

        if (i > 0)
          layout.repeat(<string>this._colurs.applyAnsi(itmDiv, muted), itmDivMulti);

        const aliases = cmd.aliases(cmd._name).join(', '); // get aliases.

        layout.div(this._colurs.applyAnsi(`${usageStr}: `, primary) + cmd._usage, this._colurs.applyAnsi(`${aliasStr}: `, primary) as string + aliases);

        if (cmd._describe) {
          layout.div({ text: this._colurs.applyAnsi(cmd._describe, muted), padding: [1, 0, 0, 0] });
        }

        buildOptions(cmd);

      });

    };

    const buildFooter = () => {

      // Add epilog if any.
      if (this._epilog) {
        if (div)
          layout.repeat(<string>this._colurs.applyAnsi(div, muted));
        else
          layout.div();
        layout.div(this._colurs.applyAnsi(this._epilog, muted));
      }

    };

    // Build help for single command.
    if (command) {
      buildBody();
    }

    // Build help for all commands.
    else {
      buildHeader();
      buildBody();
      buildFooter();
    }

    // return the resulting layout.
    return layout;

  }

  /**
   * Help Handler
   * The default help handler.
   *
   * @param command optional command to get help for.
   */
  private helpHandler(command?: string) {
    if (this._helpEnabled === false)
      return;
    return this.compileHelp(command).get();
  }

  /**
   * Error Handler
   * The default error handler.
   *
   * @param message the error message to display.
   * @param err the PargvError instance.
   */
  private errorHandler(message: string, err: utils.PargvError) {

    if (MOCHA_TESTING) // if we're testing just throw the error.
      throw err;

    let name = err.name;
    let msg = err.message;
    let stack = err.stack;
    msg = this._colurs.bold.red(name) + ': ' + msg;

    console.log();
    console.log(msg);
    if (this.options.displayStackTrace && stack) {
      console.log();
      console.log(stack);
    }
    console.log();

    process.exit(1);

  }

  /**
   * Completions Reply
   * Method called form bash profile for compreply.
   *
   * @param argv the current argv from tab completions.
   * @param done the callback on done compiling completions.
   */
  private completionsReply(parsed: IPargvParsedResult) {

    let argv = parsed.$source;
    const current = argv && argv.length ? utils.last(argv) : ''; // get current arg.
    let handler = this._completionsHandler;

    const finish = (comps) => { // outputs completions.
      comps.forEach(el => console.log(el));
      process.exit(0);
    };

    utils.setBlocking(true); // set blocking on stream handle.

    if (handler.length > 2) { // handler has callback.
      handler(current, argv, finish);
    }
    else {
      finish(handler(current, argv)); // handler is synchronous.
    }

  }

  /**
   * Build Help
   * Common method to get help before show or return.
   *
   * @param command optional command to get help for.
   */
  private buildHelp(command?: string | PargvCommand) {
    let name = utils.isPlainObject(command) ? (command as PargvCommand)._name : command;
    return this._helpHandler.call(this, <string>name, this._commands);
  }

  // GETTERS //

  /**
   * Default Command
   * Exposes default command for parsing anonymous arguments.
   *
   * @example pargv.$.option('-t').parse(['one', '-t', 'test'])
   */
  get $(): PargvCommand {
    return this._command;
  }

  /**
   * Gets help, completion script, completions, options...
   */
  get get() {

    return {

      /**
       * Help
       * : Gets help text.
       *
       * @param command optional command to show help for.
       */
      help: (command?: string | PargvCommand) => {
        return this.buildHelp(command);
      },

      /**
        * Get Completion
        * : Gets the completion script.
        *
        * @param path the path/name of executable.
        * @param template the template string.
        */
      completion: (path?: string, template?: string) => {
        return this._completions.generate(path, template).script;
      },

      /**
       * Completions
       * : Gets completions for the supplied args.
       *
       * @param args arguments to parse for completions.
       * @param fn a callback function containing results.
       */
      completions: (args: any[], fn: Function) => {
        // return this._completionHandler.call(this, args, fn);
      },

      /**
       * Command
       * : Finds a command by name.
       *
       * @param key the name of the command to find.
       */
      command: (key: string): PargvCommand => {
        const cmds = this._commands;
        let cmd = cmds[key];
        if (cmd) return cmd;
        for (const p in cmds) {           // Try to lookup by alias.
          if (cmd) break;
          const tmp = cmds[p];
          if (tmp._aliases[key])
            cmd = tmp;
        }
        return cmd;
      },

      /**
       * Env
       * : Gets environment variables.
       */
      env: () => {
        return this._env;
      },

      /**
       * Option
       * : Gets an option value by the specified key.
       *
       * @param key the option key to get.
       */
      option: (key: string) => {
        return this.options[key] || null;
      }

    };

  }

  /**
   * Methods for setting values.
   */
  get set() {

    return {

      /**
       * Option
       * : Sets an option or group of options.
       *
       * @param key the key or PargvOptions object to be set.
       * @param val the value for the provided key.
       */
      option: (key: string | IPargvOptions, val?: any) => {
        let obj: any = key;
        if (!utils.isPlainObject(key)) {
          obj = {};
          obj[<string>key] = val;
        }
        const valKeys = utils.keys(this.options);
        for (const k in obj) {
          if (~valKeys.indexOf(k))
            this.options[k] = obj[k];
        }
        return this;
      }

    };

  }

  /**
   * Shows help completion script env.
   */
  get show() {

    return {

      /**
       * Help
       * Shows help in terminal.
       *
       * @param command optional command to show help for.
       */
      help: (command?: string | PargvCommand) => {
        console.log();
        console.log(this.buildHelp(command));
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
      completion: (path?: string, template?: string) => {
        console.log();
        console.log(this._completions.generate(path, template).script);
        console.log();
      },

      /**
       * Env
       * Shows environment variables in terminal.
       */
      env: () => {
        this.log(this._env);
        return this;
      }

    };

  }

  /**
   * Removes elements and objects.
   */
  get remove() {

    return {

      /**
       * Remove
       * Removes a command from the collection.
       *
       * @param key the command key/name to be removed.
       */
      command: (key: string) => {
        const cmd = this.get.command(key);
        if (!cmd)
          return this;
        delete this._commands[cmd._name];
        return this;
      }

    };

  }

  /**
   * Listen
   * : Alias for exec.
   */
  get listen() {
    return this.exec;
  }

  /**
   * Argv
   * Alias to exec.
   */
  get argv() {
    return this.exec;
  }

  /**
   * Epilogue
   * Alias to epilog.
   */
  get epilogue() {
    return this.epilog;
  }

  // META //

  /**
   * Meta
   * Accepts object containing metadata information for program.
   * Simply a way to enter name, description, version etc by object
   * rather than chaining each value.
   *
   * @param data the metadata object.
   */
  meta(data: IPargvMetadata) {
    for (const k in data) {
      if (this[k]) {
        if (utils.isArray(data[k]))
          this[k](...data[k]);
        else
          this[k](data[k]);
      }
    }
  }

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
  name(val: string, styles?: AnsiStyles | AnsiStyles[], font?: string) {
    this._name = val || utils.capitalize(this._env.PKG.name || '');
    this._nameStyles = utils.toArray<AnsiStyles>(styles, ['cyan']);
    this._nameFont = font || 'ogre';
    return this;
  }

  /**
   * Version
   * Just adds a string to use as the version for your program, used in help.
   * If no value is provided package.json version is used.
   *
   * @param val the value to use as version name.
   */
  version(val?: string) {
    this._version = val || this._env.PKG.version;
    return this;
  }

  /**
   * Description
   * The program's description or purpose.
   *
   * @param val the description string.
   */
  description(val: string) {
    this._describe = val;
    return this;
  }

  /**
   * License
   * Stores license type for showing in help.
   *
   * @param val the license type.
   */
  license(val: string) {
    this._license = val;
    return this;
  }

  /**
   * Epilog
   * Displays trailing message.
   *
   * @param val the trailing epilogue to be displayed.
   */
  epilog(val: string) {
    this._epilog = val;
    return this;
  }

  // COMMANDS & PARSING //

  /**
   * Command
   * A string containing Parv tokens to be parsed.
   *
   * @param command the command token string to parse.
   * @param describe a description describing the command.
   */
  command(command: string, describe?: string) {
    const cmd = new PargvCommand(command, describe, this);
    if (command !== '__default__')
      this._commands[cmd._name] = cmd;
    else
      this._command = cmd;
    return cmd;
  }

  /**
   * Parse
   * Parses the provided arguments inspecting for commands and options.
   *
   * @param argv the process.argv or custom args array.
   */
  parse(...argv: any[]) {

    if (utils.isArray(argv[0]))           // if first is array set as value.
      argv = argv[0];

    let result: IPargvParsedResult;
    const env = this._env;
    const colors = this.options.colors;
    const autoType = this.options.cast ? 'auto' : 'string'; // is auto casting enabled.
    const isExec = utils.last(argv) === '__exec__' ? argv.pop() : null;
    argv = argv && argv.length ? argv : ARGV;   // process.argv or user args.
    const procArgv = ARGV.slice(0);         // get process.argv.

    let normalized = this.toNormalized(argv.slice(0));   // normalize the args.
    const source = normalized.slice(0);               // store source args.
    let name = utils.first(normalized);                 // get first arg.
    if (FLAG_EXP.test(name))                    // name cmd can't be flag.
      name = undefined;
    let cmd = this.get.command(name);              // lookup the command.

    if (isExec || cmd)
      normalized.shift(); // shift first arg.

    if (cmd)
      name = cmd._name;
    else
      cmd = this._command;                          // use the default command.

    if (name === this._completionsCommand && ~source.indexOf(this._completionsReply)) { // hijack parse this is a call for tab completion.
      result = {
        $exec: env.EXEC,
        $command: name,
        $commands: []
      };
      result.$source = source.filter((el) => {
        return el !== this._completionsCommand && el !== this._completionsReply;
      });
      result[this._completionsReply.replace(FLAG_EXP, '')] = true;
      return result;
    }

    let ctr = 0;
    let val;
    const stats = cmd.stats(normalized);
    normalized = stats.normalized;      // set to normalized & ordered args.

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
      this.err( // no anon in strict mode.
        this._localize('anonymous arguments %s prohibited in strict mode.')
          .args(stats.anonymous)
          .styles(colors.accent).done()
      );
    }

    if (stats.missing.length) {
      this.err( // no anon in strict mode.
        this._localize('missing required arguments %s or have no default value.')
          .args(stats.missing.join(', '))
          .styles(colors.accent)
          .done()
      );
    }

    if (stats.whens.length) { // just display first.
      const when = stats.whens.shift();
      this.err( // no anon in strict mode.
        this._localize('%s requires %s but is missing.')
          .args(when[0], when[1])
          .styles(colors.accent, colors.accent).done()
      );
    }

    const cmdStr = this._localize('commands').done();
    const optStr = this._localize('options').done();

    const cmdsLen = stats.commands.length;
    const optsLen = stats.options.filter(o => FLAG_EXP.test(o)).length;

    if (cmd._minCommands > 0 && stats.commands.length < cmd._minCommands) {
      this.err( // min commands required.
        this._localize('at least %s %s are required but got %s.')
          .args(cmd._minCommands, cmdStr, cmdsLen + '')
          .styles(colors.accent, colors.primary, colors.accent).done()
      );
    }

    if (cmd._minOptions > 0 && optsLen < cmd._minOptions) {
      this.err( // min options required.
        this._localize('at least %s %s are required but got %s.')
          .args(cmd._minOptions, optStr, optsLen + '')
          .styles(colors.accent, colors.primary, colors.accent).done()
      );
    }

    if (cmd._maxCommands > 0 && stats.commands.length > cmd._maxCommands) {
      this.err( // max commands allowed.
        this._localize('got %s %s but no more than %s are allowed.')
          .args(cmdsLen, cmdStr, cmd._maxCommands)
          .styles(colors.accent, colors.primary, colors.accent)
          .done()
      );
    }

    if (cmd._maxOptions > 0 && optsLen > cmd._maxOptions) {
      this.err( // max commands allowed.
        this._localize('got %s %s but no more than %s are allowed.')
          .args(optsLen, optStr, cmd._maxOptions)
          .styles(colors.accent, colors.primary, colors.accent)
          .done()
      );
    }

    // Normalize value and call user coerce method if exists.
    const coerceWrapper = (key, type, isBool) => {
      const coerce: CoerceHandler = utils.isFunction(type) ? type : null;
      type = coerce ? null : type;
      type = type || (isBool ? 'boolean' : autoType);
      return (val, def) => {
        if (!coerce || (coerce && this.options.castBeforeCoerce))
          val = cmd.castToType(key, type, val, def);
        if (coerce)
          val = coerce(val, cmd);
        return val;
      };
    };

    normalized.forEach((el, i) => {

      let key = stats.map[i];              // get cmd/opt by position in map.
      if ('$value' === key) return;        // if $value expects flag value no process.
      const isNot = /^--no/.test(el) ? true : false;  // flag prefixed with --no.
      el = el.replace(/^--no/, '');

      let next = normalized[i + 1];                   // next arg.
      const isFlag = FLAG_EXP.test(el);               // is a flag/option key.
      const isFlagNext = FLAG_EXP.test(next || '');   // next is a flag/option key.
      const def = cmd._defaults[key];                 // check if has default value.

      const isBool =
        (isFlag && (!next || cmd.isBool(key) || isFlagNext)); // is boolean key.
      let coercion: CoerceHandler = cmd._coercions[key];  // lookup user coerce function.

      if (isNot && !isBool) {
        this.err(
          this._localize('cannot set option %s to boolean, a value is expected.')
            .args(key).styles(colors.accent).done()
        );
      } // Prevent --no option when not bool flag.

      let wrapper = coerceWrapper(key, coercion, isBool);  // get coerce wrapper.

      val = isFlag ? !isBool ? next : true : el;
      val = isFlag && isBool && isNot ? false : val;

      if (utils.isBoolean(def) && def === true && val === false)
        val = true;

      val = wrapper(val, def);

      const formattedKey = utils.camelcase(key.replace(FLAG_EXP, ''));

      if (!isFlag) {
        result.$commands.push(val);
        if (this.options.extendCommands && key) {

          result[formattedKey] = val;
        }
      }
      else {
        if (DOT_EXP.test(key)) { // is dot notation key.
          utils.set(result, key.replace(FLAG_EXP, ''), val);
        }
        else {
          result[formattedKey] = val;
          if (this.options.extendAliases) { // extend each alias to object.
            (cmd.aliases(key) || []).forEach((el) => {
              const frmKey = utils.camelcase(el.replace(FLAG_EXP, ''));
              result[frmKey] = val;
            });
          }
        }
      }

    });

    if (isExec) { // ensures correct number of cmd args.
      if (this.options.spreadCommands) {
        let offset =
          (cmd._commands.length + stats.anonymous.length) - result.$commands.length;
        while (offset > 0 && offset--)
          result.$commands.push(null);
      }
      result.$stats = stats;
    }
    return result;

  }

  /**
   * Exec
   * Parses arguments then executes command action if any.
   *
   * @param argv optional arguments otherwise defaults to process.argv.
   */
  exec(...argv: any[]) {
    if (utils.isArray(argv[0]))
      argv = argv[0];
    const parsed: IPargvParsedResult = this.parse(...argv, '__exec__');
    if (!parsed)
      return;
    const normLen = parsed.$stats && parsed.$stats.normalized.length;
    if (!parsed.$command && !normLen && this.options.autoHelp) {
      this.show.help();
      return;
    }
    if (parsed.$stats && !this.options.extendStats)
      delete parsed.$stats;

    const cmd = this.get.command(parsed.$command);
    if (cmd && utils.isFunction(cmd._action)) {
      if (this._completionsCommand === cmd._name) {
        cmd._action.call(this, parsed.$commands.shift() || null, parsed, cmd);
      }
      else {
        if (this.options.spreadCommands)
          cmd._action.call(this, ...parsed.$commands, parsed, cmd);
        else
          cmd._action.call(this, parsed, cmd);
      }
    }
    if (!cmd && this.options.autoHelp)
      this.show.help();
    return parsed;
  }

  // ERRORS & RESET //

  /**
    * Reset
    * Deletes all commands and resets the default command.
    * Reset does to reset or clear custom help or error handlers
    * nor your name, description license or version. If you wish
    * to reset everyting pass true as second arg.
    */
  reset(options?: IPargvOptions, all?: boolean) {
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
  }

  /**
   * On Help
   * Method for adding custom help handler.
   *
   * @param fn the custom help handler.
   */
  onHelp(fn: HelpHandler) {
    this._helpHandler = (command) => {
      return (fn as HelpHandler)(command, this._commands);
    };
    return this;
  }

  /**
   * On Error
   * Add custom on error handler.
   *
   * @param fn the error handler function.
   */
  onError(fn: ErrorHandler) {
    if (fn)
      this._errorHandler = fn;
    return this;
  }


  // UTIL METHODS //

  /**
   * Error
   * Handles error messages.
   *
   * @param args args to be formatted and logged.
   */
  err(...args: any[]) {
    const formatted = this.formatLogMessage(...args);
    const err = new utils.PargvError(formatted);
    if (err.stack) {
      let stack: any = err.stack.split(EOL);
      stack = stack.slice(2, stack.length).join(EOL); // remove message & error call.
      err.stack = stack;
    }
    this._errorHandler.call(this, formatted, err, this);
    return this;
  }

  /**
   * Log
   * Displays log messages after formatting, supports metadata.
   *
   * @param args the arguments to log.
   */
  log(...args: any[]) {
    if (MOCHA_TESTING) // when testing don't log anything.
      return this;
    const colors = ['bold'].concat(utils.toArray<string>(this.options.colors.primary));
    const prefix = this._colurs.applyAnsi('Pargv:', colors);
    console.log(prefix, this.formatLogMessage(...args));
    return this;
  }

  /**
   * Stats
   * Iterates array of arguments comparing to defined configuration.
   * To get stats from default command use '__default__' as key name.
   *
   * @param command the command key to get stats for.
   * @param args args to gets stats for.
   */
  stats(command: string, ...args: any[]): IPargvStats {
    if (utils.isArray(args[0]))
      args = args[0];
    if (!args.length) {
      this.err(
        this._localize('method %s failed using invalid or undefined arguments.')
          .args('stats').styles(this.options.colors.accent).done()
      );
    }
    args = this.toNormalized(args);               // normalize args to known syntax.
    const cmd = this.get.command(command);
    if (!cmd) {
      this.err(
        this._localize('method %s failed using invalid or undefined arguments.')
          .args('stats').styles(this.options.colors.accent).done()
      );
    }
    return cmd.stats(args);
  }

  /**
   * Normalize Args
   * Converts -abc to -a -b -c
   * Converts --name=bob to --name bob
   *
   * @param args the arguments to normalize.
   */
  toNormalized(...args: any[]) {
    if (utils.isArray(args[0]))
      args = args[0];
    let arr = [],
      idx;
    if (EXE_EXP.test(args[0]) || args[0] === this._env.NODE_PATH) // if contains node/exec path strip.
      args = args.slice(2);
    args.forEach((el) => {
      if (FLAG_EXP.test(el) && ~(idx = el.indexOf('='))) {
        arr.push(el.slice(0, idx), el.slice(idx + 1));
      }
      else if (FLAG_SHORT_EXP.test(el)) {
        el.replace(FLAG_EXP, '').split('').forEach((s) => {
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
   * Completion
   * Adds the completion command for use within your app for generating completion script.
   *
   * @param command the name of the commpletion install command.
   * @param describe the description of the command or complete handler.
   * @param template optional template for generating completions or complete handler.
   * @param fn the optional completion handler.
   */
  completion(command?: string, fn?: CompletionHandler): Pargv;
  completion(command?: string, describe?: string, fn?: CompletionHandler): Pargv;
  completion(command?: string, describe?: string, template?: string, fn?: CompletionHandler): Pargv;
  completion(command?: string, describe?: string | CompletionHandler, template?: string | CompletionHandler, fn?: CompletionHandler): Pargv {

    if (utils.isFunction(describe)) {
      fn = <CompletionHandler>describe;
      template = undefined;
      describe = undefined;
    }

    if (utils.isFunction(template)) {
      fn = <CompletionHandler>template;
      template = undefined;
    }

    command = command || this._localize(this._completionsCommand).done();
    this._completionsCommand = command; // save the name of the command.
    const getFlag = this._completionsReply;
    const replyCmd = `${command} ${getFlag}`; // the reply command for completions.sh.
    command = `${command} [path]`; // our PargvCommand for completions.
    describe = describe || this._localize('tab completions command.').done();

    const cmd = this.command(command, <string>describe);

    cmd.option('--install, -i', this._localize('when true installs completions.').done());

    cmd.option('--reply', this._localize('when true returns tab completions.').done());

    cmd.option('--force, -f', this._localize('when true allows overwrite or reinstallation.').done());

    cmd.action((path, parsed) => {

      if (parsed.reply) {
        return this.completionsReply(parsed); // reply with completions.
      }

      else if (parsed.install) {  // install completions.
        const success = this._completions.install(path || this._env.EXEC, replyCmd, <string>template, parsed.force);
        if (success) {
          console.log();
          this.log(
            this._localize('successfully installed tab completions, quit and reopen terminal.').done()
          );
          console.log();
        }
      }

      else {
        this.show.completion(path || this._env.EXEC);
      }

    });
    if (fn)
      this._completionsHandler = fn;
    return this;
  }

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
  logo(text?: string | IFigletOptions, font?: string, styles?: AnsiStyles | AnsiStyles[]): IPargvLogo {

    let result: string;
    let methods: IPargvLogo;

    let defaults: IFigletOptions = {
      text: 'App',
      font: 'Ogre',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    };

    let options = utils.isPlainObject(text) ? <IFigletOptions>text : {
      text: text,
      font: font
    };

    // Merge the options.
    options = utils.extend({}, defaults, options);

    // Process the text.
    result = figlet.textSync(options.text, options);

    // Apply ansi styles if any.
    if (styles)
      result = this._colurs.applyAnsi(result, styles) as string;

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

      fonts,
      show,
      get

    };

    return methods;

  }

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
  layout(width?: number, wrap?: boolean): IPargvLayout {

    const self = this;

    // Base width of all divs.
    width = width || 80;

    // Init cli ui.
    const ui = cliui({ width: width, wrap: wrap });

    function add(type: string, ...elements: any[]) {
      ui[type](...elements);
    }

    /**
     * Div
     * Adds Div to the UI.
     *
     * @param elements array of string or IUIOptions
     */
    function div(...elements: any[]) {
      add('div', ...elements);
      return methods;
    }

    /**
     * Span
     * Adds Span to the UI.
     *
     * @param elements array of string or IUIOptions
     */
    function span(...elements: any[]) {
      add('span', ...elements);
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
    function repeat(char: string, multiplier?: number, padding?: number | number[]) {
      const origLen = multiplier;
      multiplier = multiplier || width;
      const _char = char;
      const stripChar = self._colurs.strip(_char); // strip any color formatting.
      const canAppend = () => {
        const curLen = self._colurs.strip(char).length;
        const offset = stripChar.length;
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
    function section(title: string, padding?: number | number[]) {
      if (!utils.isValue(padding))
        padding = 1;
      if (utils.isNumber(padding))
        padding = <number[]>[padding, 0, <number>padding, 0];
      add('div', { text: title, padding: padding });
      return methods;
    }

    /**
     * Join
     * Simply joins element args separated by space.
     *
     * @param elements the elements to be created.
     */
    function join(by: string, ...elements: any[]) {
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
    function show(...elements: any[]) {
      if (elements.length)
        add('div', ...elements);
      console.log(get());
    }

    const methods: IPargvLayout = {
      div,
      span,
      repeat,
      section,
      join,
      get,
      show,
      ui
    };

    return methods;
  }

}

// export class PargvCommand {

//   _name: string;
//   _usage: string;
//   _describe: string;
//   _commands: string[] = [];
//   _options: string[] = [];
//   _bools: string[] = [];
//   _aliases: IMap<string> = {};
//   _usages: IMap<string[]> = {};
//   _defaults: IMap<any> = {};
//   _describes: IMap<string> = {};
//   _coercions: IMap<CoerceHandler> = {};
//   _demands: string[] = [];
//   _whens: IMap<string> = {};
//   _examples: [string, string][] = [];
//   _action: ActionHandler;
//   _maxCommands: number = 0;
//   _maxOptions: number = 0;
//   _minCommands: number = 0;
//   _minOptions: number = 0;
//   _showHelp: boolean;
//   _completions: IMap<any[]> = {};

//   _pargv: Pargv;

//   constructor(token: string, describe?: string, pargv?: Pargv) {
//     this._describe = describe;
//     this._pargv = pargv;
//     this.parseCommand(token);
//     this.toggleHelp(pargv.options.defaultHelp);
//   }

//   // PRIVATE //

//   /**
//    * Parse Token
//    * Parses a usage token.
//    *
//    * @param token the token string to be parsed.
//    * @param next the next element in usage command.
//    */
//   private parseToken(token: string, next?: any): IPargvCommandOption {

//     token = token.replace(/\s/g, '');
//     token = token.replace(/(\>|])$/, '');
//     let tokens = token.split(':');                // <age:number> to ['<age', 'number>'];
//     let key = tokens[0];                          // first element is command/option key.
//     let type = tokens[1];                         // optional type.
//     let def = tokens[2];                          // optional default value.

//     if (!TOKEN_PREFIX_EXP.test(key)) {
//       this.err(
//         this._pargv._localize('the token %s is missing, invalid or has unwanted space.')
//           .args(key)
//           .styles(['bgRed', 'white'])
//           .done()
//       );
//     }          // ensure valid token.
//     const isRequired = /^</.test(key);            // starts with <.

//     let isFlag = utils.isFlag(key);              // starts with - or -- or anonymous.
//     const isBool = isFlag && !next;              // if flag but no next val is bool flag.
//     let aliases = key.split('.');                // split generate.g to ['generate', 'g']
//     key = aliases[0];                            // reset name to first element.

//     if (isFlag) {
//       aliases = aliases                            // normalize aliases/key then sort.
//         .map((el) => {
//           el = el.replace(FLAG_EXP, '');
//           el = el.length > 1 ? '--' + el : '-' + el;
//           return el;
//         })
//         .sort((a, b) => { return b.length - a.length; });
//       aliases = utils.removeDuplicates(aliases);    // remove any duplicate aliases.
//     }

//     token = key = aliases.shift();                  // now sorted set final key.

//     if (!isFlag) {
//       key = utils.stripToken(key);
//       aliases = [];                                  // only flags support aliases.
//       next = null;
//     }

//     if (isFlag) {
//       token = utils.stripToken(token, /(<|>|\[|\])/g);
//     }
//     else {
//       token = isRequired ?                            // ensure closing char for token.
//         token.replace(/>$/, '') + '>' :
//         token.replace(/\]$/, '') + ']';
//     }

//     if (def) // try to parse default val.
//       def = this.castToType(key, 'auto', def);

//     let usage: string[] = [[token].concat(aliases).join(', ')];

//     if (!next)
//       return {
//         key: key,
//         usage: usage,
//         aliases: aliases,
//         flag: isFlag,
//         bool: isBool,
//         type: type,
//         default: def,
//         required: isRequired
//       };

//     next = this.parseToken(next, null);

//     return {
//       key: key,
//       usage: usage.concat(next.usage),
//       aliases: aliases,
//       flag: isFlag,
//       bool: false,
//       type: next.type,
//       as: next.key,
//       required: next.required,
//       default: next.default
//     };

//   }

//   /**
//    * Parse Command
//    * Parses a command token.
//    *
//    * @param token the command token string to parse.
//    */
//   private parseCommand(token?: string) {

//     let split = utils.split(token.trim(), SPLIT_CHARS);   // Break out usage command.
//     let ctr = 0;                                            // Counter for command keys.
//     let aliases = split.shift().trim().split('.');          // Break out command aliases.
//     let name = aliases.shift();                             // First is key name.
//     const usage = [];                                       // Usage command values.
//     usage.push(name);                                       // Add command key.

//     // Iterate the tokens.
//     split.forEach((el, i) => {

//       if (el === '--tries') {
//         const x = true;
//       }

//       let next = split[i + 1];                              // next value.
//       const isFlag = utils.isFlag(el);                       // if is -o or --opt.
//       next = utils.isFlag(next) ||                           // normalize next value.
//         !COMMAND_VAL_EXP.test(next || '') ? null : next;
//       const parsed = this.parseToken(el, next);        // parse the token.
//       let describe;

//       if (parsed.flag) {
//         if (!parsed.bool)                                    // remove next if not bool.
//           split.splice(i + 1, 1);
//       }

//       else {
//         parsed.index = ctr;                                 // the index of the command.
//         usage.push(parsed.usage[0]);                        // push token to usage.
//         ctr++;
//       }

//       this.expandOption(parsed);                             // Break out the object.

//     });

//     const cmdStr =
//       this._pargv._localize('command').done();

//     this._name = name;                                 // Save the commmand name.
//     this._describe = this._describe ||                 // Ensure command description.
//       `${name} ${cmdStr}.`;
//     this._usage = usage.join(' ');                     // create usage string.
//     this.alias(name, ...aliases);                      // Map aliases to command name.
//     this.alias(name, name);

//     // Placeholde for tab completion.
//     // const compNames = name + (aliases.length ? '|' + aliases.join('|') : '');
//     // let compUsage = usage.slice(0);
//     // compUsage[0] = compNames;

//   }

//   /**
//    * Expand Option
//    * This breaks out the parsed option in to several
//    * arrays/objects. This prevents some recursion rather
//    * than storing the object itself in turn requiring more loops.
//    *
//    * @param option the parsed PargvOption object.
//    */
//   private expandOption(option: IPargvCommandOption) {

//     let describe;

//     const reqCmd =
//       this._pargv._localize('Required command.').done();

//     const optCmd =
//       this._pargv._localize('Optional command.').done();

//     const reqFlag =
//       this._pargv._localize('Required flag.').done();

//     const optFlag =
//       this._pargv._localize('Optional flag.').done();

//     if (option.flag) {
//       this._options.push(option.key);
//       if (option.bool)
//         this._bools.push(option.key);
//       describe = option.required ? reqFlag : optFlag;
//     }

//     else {
//       this._commands.push(option.key);
//       describe = option.required ? reqCmd : optCmd;
//     }

//     this.describe(option.key, option.describe || describe); // Add default descriptions
//     this.alias(option.key, option.key);                     // Add key to self.
//     this.alias(option.key, ...option.aliases);              // Add aliases to map.
//     if (!utils.isUndefined(option.index))                   // Index to Command map.
//       this.alias(option.key, option.index + '');
//     if (option.required)                                   // set as required.
//       this.demand(option.key);
//     if (option.default)
//       this._defaults[option.key] = option.default;
//     this._usages[option.key] = option.usage;               // Add usage.
//     this.coerce(option.key, option.type, option.default);  // Add default coerce method.

//   }

//   /**
//    * Toggle Help
//    * Enables or disables help while toggling the help option.
//    * @param enabled whether or not help is enabled.
//    */
//   private toggleHelp(enabled?: boolean) {
//     if (this._name === 'help') {
//       this._showHelp = true;
//       return;
//     }
//     if (!utils.isValue(enabled))
//       enabled = true;
//     this._showHelp = enabled;
//     if (enabled) {
//       const str = this._pargv._localize('displays help for %s.').args(this._name).done();
//       this.option('--help, -h', str);
//     }
//     else {
//       this._options = this._options.map((el) => {
//         if (!/^(--help|-h)$/.test(el))
//           return el;
//       });
//     }
//   }

//   /**
//    * Clean
//    * : Filters arrays deletes keys from objects.
//    *
//    * @param key the key name to be cleaned.
//    */
//   private clean(key: string) {

//     const isFlag = FLAG_EXP.test(key);

//     key = this.aliasToKey(key);
//     const aliases = [key].concat(this.aliases(key));

//     delete this._usages[key];
//     delete this._defaults[key];
//     delete this._describes[key];
//     delete this._coercions[key];
//     delete this._whens[key];
//     this._demands = this._demands.filter(k => k !== key);
//     aliases.forEach(k => delete this._aliases[k]);

//     if (!isFlag) {
//       this._commands = this._commands.filter(k => k !== key);
//     }
//     else {
//       this._bools = this._bools.filter(k => k !== key);
//       this._options = this._options.filter(k => k !== key);
//     }

//   }

//   // GETTERS //

//   private get err() {
//     return this._pargv.err.bind(this._pargv);
//   }

//   /**
//    * Command
//    * : Access to Pargv command.
//    */
//   get command() {
//     return this._pargv.command.bind(this._pargv);
//   }

//   /**
//    * Min
//    * : Gets methods for adding min commands or options.
//    */
//   get min() {

//     return {

//       /**
//        * Min Commands
//        * Sets minimum command count.
//        *
//        * @param count the minimum number of commands.
//        */
//       commands: (count: number) => {
//         this._minCommands = count;
//         return this;
//       },

//       /**
//        * Min Options
//        * Sets minimum option count.
//        *
//        * @param count the minimum number of options.
//        */
//       options: (count: number) => {
//         this._minOptions = count;
//         return this;
//       }

//     };

//   }

//   /**
//     * Max
//     * : Gets methods for adding max commands or options.
//     */
//   get max() {

//     return {

//       /**
//        * Max Commands
//        * Sets maximum command count.
//        *
//        * @param count the maximum number of commands.
//        */
//       commands: (count: number) => {
//         this._maxCommands = count;
//         return this;
//       },

//       /**
//        * Max Options
//        * Sets maximum option count.
//        *
//        * @param count the maximum number of options.
//        */
//       options: (count: number) => {
//         this._maxOptions = count;
//         return this;
//       }

//     };

//   }

//   /**
//    * Parse
//    * Parses the provided arguments inspecting for commands and options.
//    *
//    * @param argv the process.argv or custom args array.
//    */
//   get parse() {
//     return this._pargv.parse.bind(this._pargv);
//   }

//   /**
//    * Exec
//    * Parses arguments then executes command action if any.
//    *
//    * @param argv optional arguments otherwise defaults to process.argv.
//    */
//   get exec() {
//     return this._pargv.exec.bind(this._pargv);
//   }

//   /**
//    * Listen
//    * Parses arguments then executes command action if any.
//    *
//    * @param argv optional arguments otherwise defaults to process.argv.
//    */
//   get listen() {
//     return this._pargv.exec.bind(this._pargv);
//   }

//   /**
//    * If
//    * : Alias for when.
//    */
//   get if() {
//     return this.when;
//   }

//   // METHODS //

//   /**
//     * Option
//     * Adds option to command.
//     * Supported to type strings: string, date, array,
//     * number, integer, float, json, regexp, boolean
//     * @example
//     *
//     * @param token the option token to parse as option.
//     * @param describe the description for the option.
//     * @param def an optional default value.
//     * @param type a string type, RegExp to match or Coerce method.
//     */
//   option(token: string, describe?: string, def?: any, type?: string | RegExp | CoerceHandler): PargvCommand {
//     token = utils.toOptionToken(token);
//     const tokens = utils.split(token.trim(), SPLIT_CHARS);
//     tokens.forEach((el, i) => {
//       let next;
//       if (tokens.length > 1) {
//         next = tokens[i + 1];
//         tokens.splice(i + 1, 1);
//       }
//       const parsed = this.parseToken(el, next);
//       parsed.describe = describe || parsed.describe;
//       parsed.default = def;
//       parsed.type = type || parsed.type;
//       this.clean(parsed.key); // clean so we don't end up with dupes.
//       this.expandOption(parsed);
//     });
//     return this;
//   }

//   /**
//    * Alias
//    * Maps alias keys to primary flag/command key.
//    *
//    * @param key the key to map alias keys to.
//    * @param alias keys to map as aliases.
//    */
//   alias(config: IMap<string[]>): PargvCommand;
//   alias(key: string, ...alias: string[]): PargvCommand;
//   alias(key: string | IMap<string[]>, ...alias: string[]): PargvCommand {
//     let obj: any = key;
//     const colors = this._pargv.options.colors;
//     if (utils.isString(key)) {
//       key = this.stripToAlias(<string>key);
//       obj = {};
//       obj[<string>key] = alias;
//     }
//     for (let k in obj) {
//       k = this.stripToAlias(<string>k);
//       const v = obj[k];
//       if (!utils.isValue(v) || !utils.isArray(v)) {
//         const aliasStr = this._pargv._localize('alias').done();
//         this.err(
//           this._pargv._localize('cannot set %s for %s using value of undefined.')
//             .setArg('alias')
//             .setArg(k)
//             .styles(colors.accent, colors.accent)
//             .done()
//         );
//       }
//       v.forEach((el) => {
//         el = utils.stripToken(el, /(<|>|\[|\])/g);
//         this._aliases[el] = k;
//       });
//     }
//     return this;
//   }

//   /**
//    * Describe
//    * Adds description for an option.
//    *
//    * @param key the option key to add description to.
//    * @param describe the associated description.
//    */
//   describe(config: IMap<string>): PargvCommand;
//   describe(key: string, describe?: string): PargvCommand;
//   describe(key: string | IMap<string>, describe?: string): PargvCommand {
//     let obj: any = key;
//     const colors = this._pargv.options.colors;
//     if (utils.isString(key)) {
//       key = this.stripToAlias(<string>key);
//       obj = {};
//       obj[<string>key] = describe;
//     }
//     for (let k in obj) {
//       k = this.stripToAlias(<string>k);
//       const v = obj[k];
//       if (!utils.isValue(v))
//         this.err(
//           this._pargv._localize('cannot set %s for %s using value of undefined.')
//             .setArg('describe')
//             .setArg(k)
//             .styles(colors.accent, colors.accent)
//             .done()
//         );
//       this._describes[k] = v;
//     }
//     return this;
//   }

//   /**
//    * Coerce
//    * Coerce or transform the defined option when matched.
//    *
//    * @param key the option key to be coerced.
//    * @param fn the string type, RegExp or coerce callback.
//    * @param def an optional value when coercion fails.
//    */
//   coerce(key: string | IMap<IPargvCoerceConfig>): PargvCommand;
//   coerce(key: string, type?: string | RegExp | CoerceHandler, def?: any): PargvCommand;
//   coerce(key: string | IMap<IPargvCoerceConfig>, fn?: string | RegExp | CoerceHandler, def?: any): PargvCommand {

//     let obj: any = key;
//     const colors = this._pargv.options.colors;
//     if (utils.isString(key)) {
//       key = this.stripToAlias(<string>key);
//       obj = {};
//       obj[<string>key] = {
//         fn: fn,
//         def: def
//       };
//     }
//     for (let k in obj) {
//       k = this.stripToAlias(<string>k);
//       const v = obj[k];
//       if (!utils.isValue(v))
//         this.err(
//           this._pargv._localize('cannot set %s for %s using value of undefined.')
//             .setArg('coerce')
//             .setArg(k)
//             .styles(colors.accent, colors.accent)
//             .done()
//         );
//       if (v.def) this.default(k, v.def);
//       this._coercions[k] = v.fn;
//     }
//     return this;
//   }

//   /**
//    * Demand
//    * The commands or flag/option keys to demand.
//    *
//    * @param key the key to demand.
//    * @param keys additional keys to demand.
//    */
//   demand(...keys: string[]) {
//     keys.forEach((k) => {
//       if (!utils.contains(this._demands, this.aliasToKey(k)))
//         this._demands.push(k);
//     });
//     return this;
//   }

//   /**
//    * When
//    * When a specified key demand dependent key.
//    *
//    * @param key require this key.
//    * @param demand this key is present.
//    * @param converse when true the coverse when is also created.
//    */
//   when(config: IMap<IPargvWhenConfig>): PargvCommand;
//   when(key: string, demand?: string, converse?: boolean): PargvCommand;
//   when(key: string | IMap<IPargvWhenConfig>, demand?: string | boolean, converse?: boolean): PargvCommand {
//     let obj: any = key;
//     const colors = this._pargv.options.colors;
//     if (utils.isString(key)) {
//       key = this.stripToAlias(<string>key);
//       demand = this.stripToAlias(<string>demand);
//       obj = {};
//       obj[<string>key] = {
//         demand: demand,
//         converse: converse
//       };
//     }
//     for (let k in obj) {
//       k = this.stripToAlias(<string>k);
//       let v = obj[k];
//       v.demand = this.stripToAlias(v.demand);
//       if (!utils.isValue(v.demand))
//         this.err(
//           this._pargv._localize('cannot set %s for %s using value of undefined.')
//             .setArg('when')
//             .setArg(k)
//             .styles(colors.accent, colors.accent)
//             .done()
//         );
//       this._whens[k] = v.demand;
//       if (v.converse)
//         this._whens[v.demand] = k;
//     }
//     return this;
//   }

//   /**
//    * Default
//    * Sets a default value for a command or option.
//    *
//    * @param key the key to set the default for or an object of key/val.
//    * @param val the value to set for the provided key.
//    */
//   default(key: string | IMap<any>, val: any) {
//     let obj: any = key;
//     const colors = this._pargv.options.colors;
//     if (utils.isString(key)) {
//       key = this.stripToAlias(<string>key);
//       obj = {};
//       obj[<string>key] = val;
//     }
//     for (let k in obj) {
//       k = this.stripToAlias(<string>k);
//       const v = obj[k];
//       if (!utils.isValue(v))
//         this.err(
//           this._pargv._localize('cannot set %s for %s using value of undefined.')
//             .setArg('default')
//             .setArg(k)
//             .styles(colors.accent, colors.accent)
//             .done()
//         );
//       this._defaults[k] = v;
//     }
//     return this;
//   }

//   /**
//    * Completion At
//    * : Injects custom completion value for specified key.
//    * Key can be a know command, option or * for anonymous.
//    *
//    * @param key the key to inject completion values for.
//    * @param vals the completion values for the provided key.
//    */
//   completionFor(key: string, ...vals: any[]) {
//     key = key === '*' ? key : this.aliasToKey(key);
//     if (utils.isArray(vals[0]))
//       vals = vals[0];
//     const colors = this._pargv.options.colors;
//     if (!key)
//       this.err(
//         this._pargv._localize('cannot set completion for using key of undefined.')
//           .done()
//       );
//     this._completions[key] = vals;
//     return this;
//   }

//   /**
//    * Action
//    * Adds an action event to be called when parsing matches command.
//    *
//    * @param fn the callback function when parsed command matches.
//    */
//   action(fn: ActionHandler) {
//     const colors = this._pargv.options.colors;
//     if (!fn)
//       this.err(
//         this._pargv._localize('cannot set %s for %s using value of undefined.')
//           .setArg('action')
//           .setArg(this._name)
//           .styles(colors.accent, colors.accent)
//           .done()
//       );
//     this._action = fn;
//     return this;
//   }

//   /**
//    * Help
//    * Enables or disables help for this command.
//    *
//    * @param enabled true or false to toggle help.
//    */
//   help(enabled?: boolean): PargvCommand {
//     this.toggleHelp(enabled);
//     return this;
//   }

//   /**
//    * Example
//    * Stores and example for the command displayed in help.
//    * You can also provide an object where the key is the
//    * example text and the value is the describe text.
//    *
//    * @param val string or array of strings.
//    */
//   example(example: string | [string, string][], describe?: string) {
//     let arr: any = example;
//     if (utils.isString(example))
//       arr = [example, describe || null];
//     this._examples = this._examples.concat(arr);
//     return this;
//   }

//   // UTILS //

//   /**
//    * Cast To Type
//    * Casts a value to the specified time or fallsback to default.
//    *
//    * @param type the type to cast to.
//    * @param val the value to be cast.
//    */
//   castToType(key: string, type: string | RegExp, val?: any, def?: any) {

//     let result = null;
//     const opts = this._pargv.options;
//     const colors = opts.colors;
//     const origVal = val;
//     type = utils.isString(type) ? (type as string).trim() : type;
//     const isAuto = type === 'auto';

//     if (utils.isString(val))
//       val = val.trim();

//     // Check if is list type expression.
//     let isListType =
//       (utils.isString(type) && LIST_EXP.test(<string>type)) ||
//       utils.isRegExp(type);

//     let listexp;
//     if (isListType) {
//       listexp = type;
//       type = 'list';
//     }

//     function castObject(obj) {
//       if (utils.isPlainObject(obj)) {
//         for (const k in obj) {
//           const val = obj[k];
//           if (utils.isPlainObject(val))
//             obj[k] = utils.toDefault(castObject(val), val);
//           else if (utils.isArray(val))
//             obj[k] = utils.toDefault(castObject(val), val);
//           else
//             obj[k] = utils.toDefault(autoCast(val), val);
//         }
//         return obj;
//       }
//       else if (utils.isArray(obj)) {
//         return obj.map((el) => {
//           return autoCast(el);
//         });
//       }
//       else {
//         return obj;
//       }
//     }

//     const is: any = {
//       object: utils.isPlainObject,
//       number: utils.isNumber,
//       integer: utils.isInteger,
//       float: utils.isFloat,
//       date: utils.isDate,
//       array: utils.isArray,
//       json: utils.isPlainObject,
//       regexp: utils.isRegExp,
//       boolean: utils.isBoolean,
//       list: (v: any) => { return utils.isValue(v); }
//     };

//     const to: any = {

//       object: (v) => {
//         if (!KEYVAL_EXP.test(v))
//           return null;
//         const obj = {};
//         // split key:val+key:val to [key:val, key:val].
//         const pairs = v.match(SPLIT_PAIRS_EXP);
//         if (!pairs.length) return null;
//         let parentPath;
//         if (DOT_EXP.test(pairs[0])) { // split user.profile.name to [user, profile, name]
//           const matches = pairs.shift().match(SPLIT_KEYVAL_EXP);
//           const segments = matches[0].split('.');
//           const key = segments.pop();
//           if (segments.length)
//             parentPath = segments.join('.');
//           pairs.unshift(`${key}:${matches[1]}`); // set back to key:val without parent path.
//         }
//         pairs.forEach((p) => {
//           const kv = p.replace(/('|")/g, '').split(':');
//           if (kv.length > 1) {
//             let castVal: any = kv[1];
//             if (DOT_EXP.test(castVal)) {
//               castVal = to.object(castVal);
//             }
//             else {
//               if (/^\[\s*?("|').+("|')\s*?\]$/.test(castVal))
//                 castVal = castVal.replace(/(^\[|\]$)/g, '');
//               if (opts.cast) { // check if auto casting is enabled.
//                 castVal = utils.toDefault(autoCast(castVal), castVal);
//                 if (utils.isArray(castVal))
//                   castVal = (castVal as any[]).map((el) => {
//                     return utils.toDefault(autoCast(el), el);
//                   });
//               }
//             }
//             let setPath = parentPath ? `${parentPath}.${kv[0]}` : kv[0];
//             utils.set(obj, setPath, castVal);
//           }
//         });
//         return obj;

//       },

//       json: (v) => {
//         if (!JSON_EXP.test(v))
//           return null;
//         v = v.replace(/^"/, '').replace(/"$/, '');
//         let obj = utils.tryWrap(JSON.parse, v)();
//         if (utils.isPlainObject(obj) && opts.cast) { // auto casting is permitted.
//           obj = castObject(obj);
//         }
//         return obj;
//       },

//       regexp: (v) => {
//         if (!REGEX_EXP.test(v))
//           return null;
//         return utils.castType(val, 'regexp');
//       },

//       array: (v) => {
//         if (!LIST_EXP.test(v))
//           return null;
//         return utils.toArray(v);
//       },

//       number: (v) => {
//         if (!/[0-9]/g.test(v))
//           return null;
//         return utils.castType(v, 'number');
//       },

//       date: (v) => {
//         if (!isAuto)
//           return utils.fromEpoch(to.number(v));
//         return utils.castType(v, 'date');
//       },

//       boolean: (v) => {
//         if (!/^(true|false)$/.test(v))
//           return null;
//         return utils.castType(v, 'boolean');
//       },

//       string: (v) => {
//         return v;
//       },

//       // Following NOT called in auto cast.

//       list: (v) => {
//         const exp = utils.isRegExp(listexp) ? listexp : utils.splitToList(<string>listexp);
//         const match = (v.match && v.match(exp)) || null;
//         result = match && match[0];
//         return result;
//       },

//     };

//     to.float = to.number;
//     to.integer = to.number;

//     function autoCast(v) {

//       // Ensure type is set to auto.
//       const origType = type;
//       type = 'auto';

//       let _result;

//       let castMethods = [
//         to.object.bind(null, v),
//         to.json.bind(null, v),
//         to.regexp.bind(null, v), // should be before array.
//         to.array.bind(null, v),
//         to.date.bind(null, v),
//         to.number.bind(null, v),
//         to.boolean.bind(null, v)
//       ];

//       // While no result iterate try to
//       // cast to known types. Return the
//       // result or the default value.
//       while (castMethods.length && !_result) {
//         const method = castMethods.shift();
//         _result = method();
//       }

//       type = origType;

//       return _result;

//     }

//     // If not a special type just cast to the type.
//     if (type !== 'auto') {
//       if (!to[<string>type])
//         result = null;
//       else
//         result = to[<string>type](val);
//     }

//     // Try to auto cast type.
//     else {
//       result = utils.toDefault(autoCast(val), val);
//     }

//     // If Auto no type checking.
//     if (isAuto) return result;

//     if (!isListType)  // if not matching list/regexp check default.
//       result = utils.toDefault(result, def);

//     // Ensure valid type.
//     if (!utils.isValue(result) || !is[<string>type](result)) {
//       if (!opts.ignoreTypeErrors) {
//         if (!isListType) {
//           this.err(
//             this._pargv._localize('expected type %s but got %s instead.')
//               .args(<string>type, utils.getType(result))
//               .styles(colors.accent, colors.accent)
//               .done()
//           );
//         }
//         else {
//           this.err(
//             this._pargv._localize('expected list or expression %s to contain %s.')
//               .args(listexp, origVal)
//               .styles(colors.accent, colors.accent)
//               .done()
//           );
//         }
//       }
//       else {
//         result = origVal;
//       }
//     }

//     return result;


//   }

//   /**
//    * Alias To Name
//    * Maps an alias key to primary command/flag name.
//    *
//    * @param key the key to map to name.
//    * @param def default value if alias is not found.
//    */
//   aliasToKey(key: string | number, def?: any): string {
//     const result = this._aliases[key];
//     if (!utils.isValue(result) && def)
//       return def;
//     return result;
//   }

//   /**
//    * Strip To Alias
//    * Strips tokens then returns alias or original key.
//    *
//    * @param key the key to retrieve alias for.
//    */
//   stripToAlias(key: string | number) {
//     if (utils.isString(key))
//       key = utils.stripToken(<string>key, /(<|>|\[|\])/g);    // strip <, >, [ or ]
//     return this.aliasToKey(key, key);
//   }

//   /**
//    * Aliases
//    * Looks up aliases for a given key.
//    *
//    * @param key the primary key to find aliases for.
//    */
//   aliases(key: string) {
//     key = this.aliasToKey(key); // get primary name.
//     const found = [];
//     for (const p in this._aliases) {
//       if (this._aliases[p] === key && p !== key)
//         found.push(p);
//     }
//     return found;
//   }

//   /**
//    * Stats
//    * Iterates arguments mapping to known options and commands
//    * finding required, anonymous and missing args.
//    *
//    * @param args the args to get stats for.
//    * @param skip when true deamnds and whens are not built.
//    */
//   stats(args: any[], skip?: boolean): IPargvStats {

//     const lastIdx = this._commands.length - 1;
//     const clone = args.slice(0);

//     const commands = [];        // contains only commands.
//     const options = [];         // contains only options.
//     const anonymous = [];       // contains only anonymous options.
//     const mapCmds = [];         // contains command keys.
//     const mapOpts = [];         // contains option keys.
//     const mapAnon = [];         // contains anon keys.
//     let ctr = 0;

//     // Ensure defaults for missing keys.
//     for (const k in this._defaults) {
//       const isFlag = FLAG_EXP.test(k);
//       const def = this._defaults[k];
//       const isBool = this.isBool(k);
//       if (isFlag) { // check if is missing default value.
//         if (!utils.contains(clone, k)) {
//           clone.push(k);
//           if (!isBool)
//             clone.push(def);
//         }
//       }
//       else {
//         const idx = this._commands.indexOf(k);
//         const cur = clone[idx];
//         if (!utils.isValue(cur) || FLAG_EXP.test(clone[idx]))
//           clone.splice(idx, 0, def);
//       }
//     }

//     clone.forEach((el, i) => {

//       const next = clone[i + 1];
//       const isFlag = utils.isFlag(el);
//       const isFlagNext = utils.isFlag(next);
//       const isNot = /^--no/.test(el) ? true : false;  // flag prefixed with --no.
//       const origEl = el;
//       el = el.replace(/^--no/, '');                   // strip --no;
//       let key = isFlag || ctr > lastIdx ? this.aliasToKey(el) : this.aliasToKey(ctr);

//       if (!key) {                                 // is anonymous command or option.
//         anonymous.push(origEl);
//         mapAnon.push(el);
//         if (!isFlagNext && next) {                // add only if not opt or cmd.
//           anonymous.push(next);
//           mapAnon.push('$value');            // keeps ordering denotes expects val.
//           clone.splice(i + 1, 1);
//         }
//       }

//       else if (isFlag && key) { // is a known flag/option.
//         options.push(isNot ? '--no' + key : key);  // converted from alias to key.
//         mapOpts.push(key);
//         if (!this.isBool(el) && utils.isValue(next)) {
//           options.push(next);
//           mapOpts.push('$value');                // keeps ordering denotes expects val.
//           clone.splice(i + 1, 1);
//         }
//       }

//       else if (!isFlag && key) {                 // is a known command.
//         commands.push(el);
//         mapCmds.push(key);
//         ctr++;
//       }

//     });

//     let map = mapCmds.concat(mapOpts).concat(mapAnon);    // map by key to normalized.
//     let normalized = commands.concat(options).concat(anonymous);  // normalized args.

//     const missing = [];

//     this._demands.forEach((el) => {
//       if (!utils.contains(map, el)) {
//         const isFlag = FLAG_EXP.test(el);
//         let def = this._defaults[el] || null;
//         if (!isFlag) {
//           const idx = this._commands.indexOf(el);
//           if (!utils.isValue(def))
//             missing.push(el);
//           map.splice(idx, 0, el);
//           normalized.splice(idx, 0, def);
//         }
//         else {
//           if (!utils.isValue(def))
//             missing.push(el);
//           map.push(el);
//           if (!this.isBool(el)) {
//             normalized.push(el);
//             map.push('$value');
//             normalized.push(def);
//           }
//           else {
//             normalized.push(def);
//           }
//         }
//       }
//     });

//     let whens: any = [];

//     if (!skip) // skipped when getting completions, not needed
//       for (const k in this._whens) {                // iterate whens ensure demand exists.
//         const demand = this._whens[k];
//         if (!utils.contains(map, demand))
//           whens.push([k, demand]);
//       }

//     return {
//       commands,
//       options,
//       anonymous,
//       missing,
//       map,
//       normalized,
//       whens
//     };

//   }

//   /**
//    * Has Command
//    * Checks if a command exists by index or name.
//    *
//    * @param key the command string or index.
//    */
//   isCommand(key: string | number) {
//     key = this.aliasToKey(key);
//     return utils.isValue(key);
//   }

//   /**
//    * Has Option
//    * Inspects if key is known option.
//    */
//   isOption(key: string) {
//     key = this.aliasToKey(key);
//     return utils.isValue(key);
//   }

//   /**
//    * Is Required
//    * Checks if command or option is required.
//    *
//    * @param key the command, index or option key.
//    */
//   isRequired(key: string | number) {
//     const origKey = key;
//     key = this.aliasToKey(<string>key);
//     if (utils.isNumber(key))                // happens when command string is passed.
//       key = origKey;                        // convert back to orig value passed.
//     return utils.contains(this._demands, key);
//   }

//   /**
//    * Is Bool
//    * Looks up flag option check if is of type boolean.
//    *
//    * @param key the option key to check.
//    */
//   isBool(key: string) {
//     key = this.aliasToKey(key);
//     return utils.contains(this._bools, key);
//   }

//   // PARGV WRAPPERS //

//   /**
//    * Fail
//    * Add custom on error handler.
//    *
//    * @param fn the error handler function.
//    */
//   onError(fn: ErrorHandler) {
//     this._pargv.onError(fn);
//     return this;
//   }

//   /**
//    * Epilog
//    * Displays trailing message.
//    *
//    * @param val the trailing epilogue to be displayed.
//    */
//   epilog(val: string) {
//     this._pargv.epilog(val);
//     return this;
//   }

// }
