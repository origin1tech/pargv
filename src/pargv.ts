// IMPORTS //

import { parse, resolve, basename, join } from 'path';
import { appendFileSync, writeFileSync, existsSync, mkdirSync, readFileSync, lstatSync, readlinkSync } from 'fs';
import { spawn, spawnSync, ChildProcess } from 'child_process';
import * as util from 'util';
import * as cliui from 'cliui';
import * as figlet from 'figlet';
import { Colurs, IColurs } from 'colurs';
import * as utils from './utils';
import { completions } from './completions';
import { localize } from './localize';
import { PargvCommand } from './command';
import { IMap, IPargvOptions, AnsiStyles, HelpHandler, CompletionHandler, IFigletOptions, IPargvLayout, IPargvLogo, IPargvParsedResult, ErrorHandler, IPargvMetadata, IPargvEnv, IPargvCompletions, LocalizeInit, IPargvStats, CoerceHandler, LogHandler, NodeCallback, IPargvSpawnConfig, IPargvCoerceConfig, IPargvWhenConfig, ActionHandler } from './interfaces';
import { TOKEN_PREFIX_EXP, FLAG_EXP, SPLIT_CHARS, COMMAND_VAL_EXP, FLAG_SHORT_EXP, DOT_EXP, FORMAT_TOKENS_EXP, EXE_EXP, PARGV_ROOT, ARGV, MOCHA_TESTING, EOL, DEFAULT_COMMAND } from './constants';
import { isString } from './utils';

// VARIABLES & CONSTANTS //

const DEFAULTS: IPargvOptions = {
  cast: true,               // when true parsed values auto cast to type if not defined.
  splitArgs: null,          // splits args on parse/exec by char if only one arg supplied.
  colorize: true,           // wether or not to use colors in help & log messages.
  displayHeader: true,      // when true displays the help header.
  displayFooter: true,      // when true displays help footer.
  headingDivider: '><><',   // divider char(s) used in help header/footer.
  commandDivider: '.',      // divider char(s) used in help command sections.
  locale: 'en',             // localization code.
  localeDir: './locales',
  fallbackHelp: true,       // true to fallback to help, a command name or false to disable.
  defaultHelp: true,        // when true new commands are auto added to help.
  // exitHelp: true,           // exit process after showing up.
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

// CLASS //

export class Pargv {

  private _helpEnabled: boolean;
  private _helpHandler: HelpHandler;
  private _errorHandler: ErrorHandler;
  private _logHandler: LogHandler;

  private _completionsHandler: CompletionHandler;
  private _completions: IPargvCompletions;
  private _completionsCommand: string = 'completions';
  private _completionsReply: string = '--reply';

  private _name: string = 'Pargv';
  private _command: PargvCommand;
  private _nameFont: string;
  private _nameStyles: AnsiStyles[];
  private _version: string;
  private _license: string;
  private _describe: string;
  private _base: string | boolean = false;
  private _epilog: string;

  _env: IPargvEnv;
  _colurs: IColurs;
  _localize: LocalizeInit;
  _commands: IMap<PargvCommand> = {};
  _helpCommand: string;

  options: IPargvOptions;

  constructor(options?: IPargvOptions) {
    utils.setEnumerable(this, '_name, _nameFont, _nameStyles, _helpCommand, _helpHandler, _errorHandler, _logHandler, _completionsHandler, _completions, _completionsCommand, _completionsReply, _colorize, _localize', false);

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
    this.compatibility();

    this._colurs = new Colurs({ enabled: this.options.colorize });
    this._localize = localize(this);
    this._env = utils.environment();  // get env paths.
    this._completions = completions(this); // helper for generating completions.sh.
    this._helpCommand = this._localize('help').done(); // localized name for help.

    this._command = new PargvCommand(DEFAULT_COMMAND, 'Default internal command.', this);
    this._commands[DEFAULT_COMMAND] = this._command;

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

  }

  /**
   * Compatibility
   * : Maps methods/props for legacy compatiblity.
   */
  private compatibility() {
    const opts = this.options;
    this.options.commandDivider = opts.itemDivider || opts.commandDivider;
    this.options.fallbackHelp = utils.isValue(opts.autoHelp) ? opts.autoHelp : this.options.fallbackHelp;
    const optKeys = utils.keys(opts);

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
      msg = util.format(msg || '', ...tokens);
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

    const col1w = Math.floor(layoutWidth * .35);
    const col2w = Math.floor(layoutWidth * .50);
    const col3w = layoutWidth - (col1w + col2w);

    // Define color vars.
    const primary = this.options.colors.primary;
    const alert = this.options.colors.alert;
    const accent = this.options.colors.accent;
    const muted = this.options.colors.muted;

    // Default command.
    const defCmd = this.get.command(DEFAULT_COMMAND);
    const defCmdNoArgOrOptions =
      utils.keys(this._commands).length <= 1 &&
      (defCmd._commands.length + defCmd._options.length) === 0;

    const div = this.options.headingDivider;
    const itmDiv = this.options.commandDivider;
    let itmDivMulti = Math.round(((layoutWidth / itmDiv.length) / 3) * 2);

    let noneStr = this._localize('none').done();

    // Builds the app name, version descript header.
    const buildHeader = () => {

      let descStr, verStr, licStr;
      descStr = this._localize('Description').done();
      verStr = this._localize('Version').done();
      licStr = this._localize('License').done();

      let nameFont = this._nameFont;
      let nameStyles: any = this._nameStyles;

      if (this._name === 'Pargv') { // Is default name.
        nameFont = 'standard';
        nameStyles = primary;
      }

      // Add the name to the layout.
      if (this._name) {

        if (!nameFont)
          layout.repeat(<string>this._colurs.applyAnsi(div, muted));

        let tmpName = this._name;

        // nameStyles = this._nameStyles && this._nameStyles.length ? this._nameStyles : null;

        if (nameFont)
          tmpName = this.logo(tmpName, nameFont, nameStyles);

        if (!nameFont && nameStyles)
          tmpName = <string>this._colurs.applyAnsi(tmpName, nameStyles);

        layout.div(tmpName);

        if (nameFont)

          // Add version to layout.
          if (this._version)
            layout.div(`${this._colurs.applyAnsi(`${verStr}:`, accent)} ${utils.padLeft(this._colurs.applyAnsi(this._version, muted) as string, 7)}`);

        if (this._license)
          layout.div(`${this._colurs.applyAnsi(`${licStr}:`, accent)} ${utils.padLeft(this._colurs.applyAnsi(this._license, muted) as string, 7)}`);

        // Add description to layout.
        if (this._describe) {
          layout.div();
          layout.div(this._colurs.applyAnsi(this._describe, muted));
          // layout.div(`${this._colurs.applyAnsi(`${descStr}:`, accent)} ${utils.padLeft(this._colurs.applyAnsi(this._describe, muted) as string, 3)}`);
        }

        // Add break in layout.
        if (div)
          layout.repeat(<string>this._colurs.applyAnsi(div, muted));
        else
          layout.div();

      }

    };

    // Builds commands and flags help.
    const buildOptions = (cmd: PargvCommand, altLayout?: IPargvLayout) => {

      let cmdsStr, optsStr, exStr, reqStr;

      if (!cmd._commands.length && !cmd._options.length)
        return;

      cmdsStr = this._localize('Commands').done();
      optsStr = this._localize('Options').done();
      exStr = this._localize('Examples').done();
      reqStr = this._localize('required').done();

      layout.section(<string>this._colurs.applyAnsi(`${cmdsStr}:`, accent), [1, 0, 0, 1]);

      cmd._commands.forEach((el) => { // build commands.
        const isRequired = utils.contains(cmd._demands, el);
        const arr: any = [
          { text: el, padding: [0, 1, 0, 2], width: col1w },
          { text: this._colurs.applyAnsi(cmd._describes[el] || '', muted), width: col2w }
        ];
        const lastCol = isRequired ? { text: this._colurs.applyAnsi(`${reqStr}`, alert), align: 'right', width: col3w } : { text: '', width: col3w };
        arr.push(lastCol);
        layout.div(...arr);
      });

      if (!cmd._commands.length) // no commands set "none".
        layout.div({ text: this._colurs.applyAnsi(noneStr, muted), padding: [0, 0, 0, 2] });


      layout.section(<string>this._colurs.applyAnsi(`${optsStr}:`, accent), [1, 0, 0, 1]);

      cmd._options.sort().forEach((el) => { // build options.
        const isRequired = utils.contains(cmd._demands, el);
        const aliases = cmd.aliases(el).sort();
        // const names = [el].concat(aliases).join(', ');
        let usages: any = cmd._usages[el]; // get without first key.
        let usageVal = '';
        if (/^(\[|<)/.test(utils.last(usages)))
          usageVal = ' ' + usages.pop();
        let describe = this._colurs.applyAnsi(cmd._describes[el] || '', muted);
        // if (usageVal)
        //   describe = usageVal + ': ' + describe;
        const arr: any = [
          { text: usages.join(', ') + usageVal, padding: [0, 1, 0, 2], width: col1w },
          { text: describe, width: col2w }
        ];
        const lastCol = isRequired ? { text: this._colurs.applyAnsi(`${reqStr}`, alert), align: 'right', width: col3w } : { text: '', width: col3w };
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
          // ex = this._colurs.applyAnsi(ex, muted) as string;
          layout.div(
            { text: ex, padding: [0, 0, 0, 2] },
            { text: (desc || ''), padding: [0, 0, 0, 1] }
          );

        });

      }

    };

    // Builds the body of the help iterating
    // over each command and its options.
    const buildBody = () => {

      let cmdKeys, usageStr, aliasStr, extStr, falseStr, trueStr;
      usageStr = this._localize('Usage').done();
      aliasStr = this._localize('Alias').done();
      extStr = this._localize('external').done();
      falseStr = this._localize('false').done();

      if (command) {
        cmdKeys = [command];
        // console.log(); // only displaying one command add spacing.
      }
      else {
        cmdKeys = utils.keys(this._commands)
          .filter(k => k !== DEFAULT_COMMAND)
          .sort();
      }

      if (!cmdKeys.length && defCmdNoArgOrOptions) {
        //  layout.div(this._colurs.applyAnsi('~ No commands configured ~', accent));
        const noCmd = '~ ' + this._localize(`No commands configured`).done() + ' ~';
        layout.div(this._colurs.applyAnsi(noCmd, accent));
        return;
      }

      let ctr = 0;

      // Build the default layout options.
      // let defLayout = this.layout(layoutWidth);
      // buildOptions(defCmd, defLayout);

      cmdKeys.forEach((el, i) => {

        if (el._name)
          el = el._name;

        const cmd: PargvCommand = this.get.command(el);

        if (!cmd._showHelp)
          return;

        if (ctr > 0)
          layout.repeat(<string>this._colurs.applyAnsi(itmDiv, muted), itmDivMulti);

        ctr++;

        let aliases = cmd.aliases(cmd._name).join(', '); // get aliases.

        if (!aliases || !aliases.length)
          aliases = noneStr;

        const divs = [
          this._colurs.applyAnsi(`${usageStr}: `, primary) + cmd._usage, this._colurs.applyAnsi(`${aliasStr}: `, primary) + aliases,
        ];

        if (cmd._external)
          divs.push(this._colurs.applyAnsi(`(${extStr})`, accent) as string);

        layout.div(...divs);

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
      if (this.options.displayHeader)
        buildHeader();
      buildBody();
      if (this.options.displayFooter)
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
   * @param err the PargvError instance.
   */
  private errorHandler(err: Error) {

    // if (MOCHA_TESTING) // if we're testing just throw the error.
    //   throw err;

    // let name = err.name;
    // let msg = err.message;
    // let stack = err.stack;
    // msg = this._colurs.bold.red(name) + ': ' + msg;

    // Wrap errors with \n to make them stand out a bit better.
    // process.stderr.write(`\n${msg}`);
    // if (this.options.displayStackTrace && stack)
    //   process.stderr.write(`${stack}`);
    // process.stderr.write('\n\n');
    // process.exit(1);

    err.stack = err.stack.split('\n').map((s, i) => {
      if (i === 0)
        return this._colurs.bold.red(s);
      return this._colurs.gray(s);
    }).join('\n') + '\n';

    throw err;

  }

  /**
   * Log Handler
   * : Handles internal log messages.
   *
   * @param message the message to be logged.
   */
  private logHandler(message: string) {
    // const colors = ['bold'].concat(utils.toArray<string>(this.options.colors.primary));
    // let prefix: any = this._name ? utils.capitalize(this._name.toLowerCase()) : 'Pargv';
    // prefix = this._colurs.applyAnsi(prefix, colors);
    // DEPRECATED - don't prefix with name user can insert in message if needed.
    // console.log();
    // console.log(prefix + ': ' + message);
    // console.log();
    process.stderr.write(message + '\n');
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

  /**
   * Normalize Args
   * Converts -abc to -a -b -c
   * Converts --name=bob to --name bob
   *
   * @param args the arguments to normalize.
   */
  private toNormalized(...args: any[]) {
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

  // GETTERS //

  /**
   * @deprecated use pargv.command()
   *
   * Default Command
   * Exposes default command for parsing anonymous arguments.
   *
   * @example pargv.$.option('-t').parse(['one', '-t', 'test'])
   */
  get $(): PargvCommand {
    this.log(`${this._colurs.applyAnsi('DEPRECATED:', 'magenta')} pargv.$ is deprecated, call pargv.command() with no args to return the default command.`);
    return this.get.command(DEFAULT_COMMAND);
  }

  /**
   * Env
   * Returns environment variables.
   */
  get env() {
    return this._env;
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
   * Shows help, completion script or env.
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
        // console.log();
        // console.log(this.buildHelp(command));
        // console.log();
        process.stdout.write('\n' + this.buildHelp(command) + '\n\n');
      },

      /**
       * Completion
       * Shows the completion script in terminal.
       *
       * @param path the path/name of executable.
       * @param template the template string.
       */
      completion: (path?: string, template?: string) => {
        // console.log();
        // console.log(this._completions.generate(path, template).script);
        // console.log();
        process.stdout.write('\n' + this._completions.generate(path, template).script + '\n\n');
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
    this._nameStyles = utils.toArray<AnsiStyles>(styles, null);
    this._nameFont = font;
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
  command(command?: string, describe?: string): PargvCommand {

    if (!command) { // if no command name return the default.
      if (describe)
        this._command.describe(describe);
      return this._command;
    }

    if (command === DEFAULT_COMMAND)
      this.error(`Cannot overwrite the default command ${command}.`);

    const cmd = new PargvCommand(command, describe, this);
    this._commands[cmd._name] = cmd;

    // if (command !== DEFAULT_COMMAND)
    //   this._commands[cmd._name] = cmd;
    // else
    //   this._command = cmd;

    return cmd;

  }

  /**
    * Spawn
    * : Spawns and executes and external command.
    *
    * @param parsed the parsed command result.
    * @param cmd a PargvCommand instance.
    * @param stdio optional stdio for child process.
    * @param exit indicates if should exit after process.
    */
  spawn(parsed: IPargvParsedResult, cmd: PargvCommand, stdio?: any, exit?: boolean) {

    const self = this;
    const colors = this.options.colors;
    let prog = parsed.$external; // the program to spawn/execute.
    let basedir = cmd._cwd ? <string>cmd._cwd : this._base ? <string>this._base : '';
    let args = parsed.$stats.normalized; // get normalized args.
    let proc: ChildProcess;

    if (parsed.$command !== parsed.$external)
      args.unshift(parsed.$command);

    prog = join(basedir, prog); // ensure base dir if any.
    prog = prog + cmd._extension || ''; // ensure extension if any.

    const isPath = /\.[a-z0-9]{2,}$/.test(prog); // is path with extension.

    if (isPath) {

      // check if is symlink, if true get path.
      prog = lstatSync(prog).isSymbolicLink() ? readlinkSync(prog) : prog;

      if (/\.js$/.test(prog) && !utils.isExecutable(prog) || utils.isWindows()) {
        // if is .js and not executable add prog to args run with Node.
        // for windows always set program as node.
        args.unshift(prog);
        prog = process.execPath;
      }
      else if (!utils.isExecutable(prog)) {
        this.error(
          self._localize('%s could not be executed, check permissions or run as root.')
            .args(prog)
            .styles(colors.accent)
            .done()
        );
        return;
      }

    }

    let shouldExit = cmd._spawnOptions ? false : exit;
    const opts = utils.extend({ stdio: stdio || 'inherit' }, cmd._spawnOptions);

    const exitProcess = (code) => {
      if (shouldExit === false)
        return;
      process.exit(code || 0);
    };

    const bindEvents = (proc: ChildProcess) => {

      if (!proc || !proc.on) return;

      // Thanks to TJ!
      // see > https://github.com/tj/commander.js/blob/master/index.js#L560

      const signals = ['SIGUSR1', 'SIGUSR2', 'SIGTERM', 'SIGINT', 'SIGHUP'];

      // Listen for signals to kill process.
      signals.forEach(function (signal: any) {
        process.on(signal, function () {
          if ((proc.killed === false) && (proc['exitCode'] === null))
            proc.kill(signal);
        });
      });

      proc.on('close', exitProcess);

      proc.on('error', (err) => {

        if (err['code'] === 'ENOENT')
          this.error(
            self._localize('%s does not exist, try --%s.')
              .args(prog)
              .setArg('help')
              .styles(colors.accent, colors.accent)
              .done()
          );

        else if (err['code'] === 'EACCES')
          this.error(
            self._localize('%s could not be executed, check permissions or run as root.')
              .args(prog)
              .styles(colors.accent)
              .done()
          );

        else
          this.error(err);

        exitProcess(1);

      });

    };

    if (cmd && cmd._spawnAction) { // call user spawn action
      const spawnWrapper = (command, args?, options?): ChildProcess => {
        if (utils.isPlainObject(command))
          return spawn(command.command, command.args || [], command.options);
        return spawn(command, args, options);
      };
      proc = cmd._spawnAction(spawnWrapper, { command: prog, args: args, options: opts }, parsed, cmd) as ChildProcess;
      bindEvents(proc);
    }
    else {
      proc = spawn(prog, args, opts);
      bindEvents(proc);
    }

    return proc;

  }

  /**
   * Parse
   * Parses the provided arguments inspecting for commands and options.
   *
   * @param argv the process.argv or custom args array.
   */
  parse(...argv: any[]) {

    argv = utils.flatten(argv);
    const isExec = utils.last(argv) === '__exec__' ? argv.pop() : null;

    // splits args from string by specified char.
    if (argv.length === 1 && this.options.splitArgs && utils.isString(argv[0]))
      argv = utils.split(argv[0], this.options.splitArgs);

    let result: IPargvParsedResult;

    const env = this._env;
    const colors = this.options.colors;
    const autoType = this.options.cast ? 'auto' : 'string'; // is auto casting enabled.
    argv = argv && argv.length ? argv : ARGV;   // process.argv or user args.
    const procArgv = ARGV.slice(0);         // get process.argv.

    let normalized = this.toNormalized(argv.slice(0));   // normalize the args.
    const source = normalized.slice(0);               // store source args.
    let name = utils.first<string>(normalized);                 // get first arg.

    if (FLAG_EXP.test(name))                    // name cmd can't be flag.
      name = undefined;

    // lookup the command.
    let cmd = this.get.command(name);

    // if (isExec || cmd)
    if ((isExec || cmd) && name !== undefined)
      normalized.shift(); // shift first arg.

    if (!cmd) // if no command here fallback to the default.
      cmd = this.get.command(DEFAULT_COMMAND);

    // if (cmd)
    //   name = cmd._name;
    // else
    //   cmd = this._command;                          // use the default command.

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

    result = {
      $exec: env.EXEC,
      $command: name,
      $external: cmd._external,
      $commands: [],
      $variadics: [],
      $source: source
    };

    const helpArr = ['--' + this._helpCommand];
    if (!~helpArr.indexOf('--help')) // always ensure en locale --help.
      helpArr.push('--help');

    if (utils.containsAny(normalized, helpArr) && cmd._showHelp) {
      this.show.help(cmd);
      return;
    } // show help for command.

    if (this.options.extendStats || cmd._external || isExec)
      result.$stats = stats;

    if (!this.options.allowAnonymous && stats.anonymous.length && !cmd._variadic) {
      this.error(
        this._localize('anonymous arguments %s prohibited in strict mode.')
          .args(stats.anonymous.join(', '))
          .styles(colors.accent)
          .done()
      );
    }

    if (stats.missing.length) {
      this.error( // no anon in strict mode.
        this._localize('missing required arguments %s or have no default value.')
          .args(stats.missing.join(', '))
          .styles(colors.accent)
          .done()
      );
    }

    if (stats.whens.length) { // just display first.
      const when = stats.whens.shift();
      this.error( // no anon in strict mode.
        this._localize('%s requires %s but is missing.')
          .args(when[0], when[1])
          .styles(colors.accent, colors.accent).done()
      );
    }

    const cmdStr = this._localize('commands').done();
    const optStr = this._localize('options').done();

    if (utils.isValue(cmd._minCommands) && stats.commandsCount < cmd._minCommands) {
      this.error( // min commands required.
        this._localize('at least %s %s are required but got %s.')
          .args(cmd._minCommands, cmdStr, stats.commandsCount + '')
          .styles(colors.accent, colors.primary, colors.accent).done()
      );
    }

    if (utils.isValue(cmd._minOptions) && stats.optionsCount < cmd._minOptions) {
      this.error( // min options required.
        this._localize('at least %s %s are required but got %s.')
          .args(cmd._minOptions, optStr, stats.optionsCount + '')
          .styles(colors.accent, colors.primary, colors.accent).done()
      );
    }

    if (utils.isValue(cmd._maxCommands) && stats.commandsCount > cmd._maxCommands) {
      this.error( // max commands allowed.
        this._localize('got %s %s but no more than %s are allowed.')
          .args(stats.commandsCount, cmdStr, cmd._maxCommands)
          .styles(colors.accent, colors.primary, colors.accent)
          .done()
      );
    }

    if (utils.isValue(cmd._maxOptions) && stats.optionsCount > cmd._maxOptions) {
      this.error( // max commands allowed.
        this._localize('got %s %s but no more than %s are allowed.')
          .args(stats.optionsCount, optStr, cmd._maxOptions)
          .styles(colors.accent, colors.primary, colors.accent)
          .done()
      );
    }

    if (cmd._external) // if ext program just
      return result;

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
      let def = cmd._defaults[key];                 // check if has default value.
      const isVariadic = cmd._variadic === key;     // is a variadic key.

      const isBool =
        (isFlag && (!next || cmd.isBool(key) || isFlagNext)); // is boolean key.
      let coercion: CoerceHandler = cmd._coercions[key];  // lookup user coerce function.

      if (isNot && !isBool) {
        this.error(
          this._localize('cannot set option %s to boolean, a value is expected.')
            .args(key).styles(colors.accent).done()
        );
      } // Prevent --no option when not bool flag.

      let wrapper = coerceWrapper(key, coercion, isBool);  // get coerce wrapper.

      val = isFlag ? !isBool ? next : true : el;
      val = isFlag && isBool && isNot ? false : val;

      if (utils.isBoolean(def) && def === true && val === false)
        val = true;

      // Don't coerce with default value
      // will set after all values are pushed to array.
      if (isVariadic)
        def = undefined;

      val = wrapper(val, def);

      const formattedKey = utils.camelcase(key.replace(FLAG_EXP, ''));

      if (!isFlag) {
        if (isVariadic)
          result.$variadics.push(val);
        else
          result.$commands.push(val);
        if (cmd._extendCommands && key) {
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
        if (DOT_EXP.test(key)) { // is dot notation key.
          utils.set(result, key.replace(FLAG_EXP, ''), val);
        }
        else {
          if (result[formattedKey]) { // if existing convert to array push new value.
            result[formattedKey] = [result[formattedKey]];
            result[formattedKey].push(val);
          }
          else {
            result[formattedKey] = val;
          }
          if (cmd._extendAliases) { // extend each alias to object.
            (cmd.aliases(key) || []).forEach((el) => {
              const frmKey = utils.camelcase(el.replace(FLAG_EXP, ''));
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
      result.$commands.push(result.$variadics);

    if (isExec) { // ensures correct number of cmd args.

      if (cmd._spreadCommands) {

        let offset =
          (cmd._commands.length + stats.anonymous.length) - result.$commands.length;

        if (cmd._variadic)
          offset = cmd._commands.length - result.$commands.length;

        while (offset > 0 && offset--)
          result.$commands.push(null);
      }

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

    const parsed: IPargvParsedResult = this.parse(...argv, '__exec__');

    if (!parsed)
      return {};

    const helpFallbackName =
      utils.isString(this.options.fallbackHelp) ?
        this.options.fallbackHelp : null;

    const normLen = parsed.$stats && parsed.$stats.normalized.length;
    const optsLen = parsed.$stats && parsed.$stats.optionsCount;

    let cmdName = parsed.$command;
    if (!cmdName && (normLen || optsLen))
      cmdName = DEFAULT_COMMAND;

    let cmd = this.get.command(cmdName) || null;

    // Ensure the command is not the fallback help command.
    if (cmd && (cmd._name === helpFallbackName))
      cmd = null;

    if (cmd && cmd._external) { // is external command.
      this.spawn(parsed, cmd);
      return parsed;
    }

    // if (!parsed.$command && !normLen && !optsLen && this.options.fallbackHelp === true) {
    if (!cmd && this.options.fallbackHelp === true) {
      this.show.help();
      return parsed;
    }

    if (parsed.$stats && !this.options.extendStats && !(cmd && cmd._external))
      delete parsed.$stats;

    if (cmd && utils.isFunction(cmd._action)) { // is defined action.

      if (this._completionsCommand === cmd._name) { // is tab completions command.
        cmd._action.call(this, parsed.$commands.shift() || null, parsed, cmd);
      }

      else { // internal callback command.
        if (this.options.spreadCommands)
          cmd._action.call(this, ...parsed.$commands, parsed, cmd);
        else
          cmd._action.call(this, parsed, cmd);
      }

    }

    if (!cmd && helpFallbackName) {
      const fallbackCmd = this.get.command(<string>helpFallbackName);
      if (fallbackCmd && fallbackCmd._action) {
        if (this.options.spreadCommands)
          fallbackCmd._action.call(this, ...parsed.$commands, parsed, null);
        else
          fallbackCmd._action.call(this, parsed, null);
      }
      else {
        this.show.help(); // fallback is defined but something went wrong just show help.
      }
    }

    if (this.options.fallbackHelp === true && !MOCHA_TESTING && !cmd)
      this.show.help();

    return parsed;

  }

  /**
   * Base
   * : Sets a base path for all external scripts that contain extentions.
   *
   * @param path a base path for ALL external command scripts.
   */
  base(path: string | boolean) {
    this._base = path;
  }

  /**
    * Completion
    * : Adds the completion command for use within your app for generating completion script.
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
    describe = describe || this._localize('Installs and/or outputs script for tab completions.').done();

    const cmd = this.command(command, <string>describe);

    cmd.option('--install, -i [path]', this._localize('when true installs completions.').done());

    cmd.option('--reply', this._localize('when true returns tab completions.').done());

    cmd.option('--force, -f', this._localize('when true allows overwrite or reinstallation.').done());

    cmd.action((path, parsed) => {

      if (parsed.reply) {
        return this.completionResult(parsed, this._completionsHandler); // reply with completions.
      }

      else if (parsed.install) {  // install completions.
        if (isString(parsed.install)) // Allow path to be provided w/ --install flag.
          path = parsed.install;
        const success = this._completions.install(path || this._env.EXEC, replyCmd, <string>template, parsed.force);
        if (success) {
          // console.log();
          // this.log(
          //   this._localize('successfully installed tab completions, quit and reopen terminal.').done()
          // );
          // console.log();
          this.log(
            '\n' + this._localize('successfully installed tab completions, quit and reopen terminal.\n\n').done()
          );
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

  /**
    * Completion Result
    * Method called maually or by script stored in your bash profile.
    *
    * @param line the Pargv parsed result, array of values or string (current line).
    * @param fn the callback on done compiling completions.
    */
  completionResult(line: string | string[] | IPargvParsedResult, fn?: CompletionHandler): string[] {

    let argv = utils.isArray(line) ? line as string[] : utils.isString(line) ? (line as string).split(' ') : (<IPargvParsedResult>line).$source;

    let current = argv && argv.length ? utils.last<string>(<string[]>argv) : ''; // get current arg.

    let handler = <CompletionHandler>fn;

    const finish = (comps) => { // outputs completions.
      if (comps)
        comps.forEach(el => console.log(el));
      process.exit(0);
    };

    if (!fn) {
      // likely being called manually from ext source just build and completions
      // and return. For example if you wanted to use completionResult() as a
      // handler for Node's readline completer.
      return this._completions.handler(current, <string[]>argv);
    }

    utils.setBlocking(true); // set blocking on stream handle.

    if (handler.length > 2) { // handler has callback.
      handler(current, <string[]>argv, finish);
    }
    else {
      finish(handler(current, <string[]>argv)); // handler is synchronous.
    }

  }

  // ERRORS & RESET //

  /**
    * Reset
    * : Deletes all commands and resets the default command and handlers.
    * If you wish to reset all meta data like name, describe, license etc
    * set "all" to true.
    *
    * @param options Pargv options to reset with.
    */
  reset(options?: IPargvOptions, all?: boolean) {
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
  }

  /**
   * On Help
   * Method for adding custom help handler, disabling or mapping to a command.
   *
   * @param fn boolean to enable/disable, a function or command name for custom handling.
   */
  onHelp(fn: string | boolean | HelpHandler) {
    if (utils.isString(fn)) {

    }
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

  /**
   * On Log
   * Add custom on log handler.
   *
   * @param fn the log handler function.
   */
  onLog(fn: LogHandler) {
    if (fn)
      this._logHandler = fn;
    return this;
  }

  // UTIL METHODS //

  /**
   * Error
   * : Handles error messages.
   *
   * @param args args to be formatted and logged.
   */
  error(...args: any[]) {
    let formatted, err;
    let prune = 1;
    if (!(args[0] instanceof Error)) {
      formatted = this.formatLogMessage(...args);
      err = new Error(formatted);
    }
    else {
      err = args[0];
      formatted = err.message;
      prune = 0;
    }
    // if (this._name)
    //   err.name = utils.capitalize(this._name) + 'Error';
    if (err.stack) {
      let stack: any = err.stack.split(EOL);
      let stackMsg = stack.shift();
      stack = stack.slice(prune); // remove message & error call.
      stack.unshift(stackMsg);
      err.stack = stack.join(EOL);
    }
    // If we haven't init and wired everything up
    // make sure we just throw the error.
    if (!this._errorHandler)
      throw err;
    this._errorHandler.call(this, err);
    return this;
  }

  /**
   * Log
   * Displays log messages after formatting, supports metadata.
   *
   * @param args the arguments to log.
   */
  log(...args: any[]) {
    // NOTE: Need to change this to just intercept the stream/hide.
    if (MOCHA_TESTING) // when testing don't log anything.
      return this;
    this._logHandler.call(this, this.formatLogMessage(...args));
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
      this.error(
        this._localize('method %s failed using invalid or undefined arguments.')
          .args('stats').styles(this.options.colors.accent).done()
      );
    }
    args = this.toNormalized(args);               // normalize args to known syntax.
    const cmd = this.get.command(command);
    if (!cmd) {
      this.error(
        this._localize('method %s failed using invalid or undefined arguments.')
          .args('stats').styles(this.options.colors.accent).done()
      );
    }
    return cmd.stats(args);
  }

  // EXTENDED METHODS //

  /**
   * Logo
   * Builds or Displays an ASCII logo using Figlet.
   *
   * @param text the text to be displayed.
   * @param font the figlet font to be used.
   * @param styles the optional styles to be used.
   */
  logo(text?: string | IFigletOptions, font?: string, styles?: AnsiStyles | AnsiStyles[]) {

    let result: string;
    // let methods: IPargvLogo;

    let defaults: IFigletOptions = {
      text: 'Pargv',
      font: 'standard',
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

    return result;

    // DEPRECATE: methods no real need.

    /**
     * Render
     * Renders out the Figlet font logo.
     */
    // function show() {
    //   console.log(result);
    //   return this;
    // }

    /**
     * Fonts
     * Lists Figlet Fonts.
     */
    // function fonts() {
    //   return figlet.fontsSync();
    // }

    /**
     * Get
     * Returns the Figlet font without rendering.
     */
    // function get() {
    //   return result;
    // }

    // methods = {

    //   fonts,
    //   show,
    //   get

    // };

    // return methods;

  }

  /**
    * Layout
    * Creates a CLI layout much like creating divs in the terminal.
    * @see https://www.npmjs.com/package/cliui
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
      // console.log(get());
      process.stdout.write(get() + '\n');
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

  // DEFAULT COMMAND METHODS //

  // This is not the best solution need to refactor in next
  // minor version so a partial base class extends this
  // class for Default Command.

  /**
    * Sub Command
    * Adds sub command to default command. If argument is not wrapped with [arg] or <arg> it will be wrapped with [arg].
    *
    * Supported to type strings: string, date, array,
    * number, integer, float, json, regexp, boolean
    *
    * @param token the option token to parse as option.
    * @param describe the description for the option.
    * @param def an optional default value.
    * @param type a string type, RegExp to match or Coerce method.
    */
  subcommand(token: string, describe?: string, def?: any, type?: string | RegExp | CoerceHandler): Pargv {
    this._command.option(token, describe, def, type);
    return this;
  }

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
  option(token: string, describe?: string, def?: any, type?: string | RegExp | CoerceHandler): Pargv {
    this._command.option(token, describe, def, type);
    return this;
  }

  /**
   * Alias
   * Maps alias option keys to default command.
   *
   * @param config object map containing aliases.
   */
  alias(config: IMap<string[]>): Pargv;

  /**
   * Alias
   * Maps alias option key to default command.
   *
   * @param key the key to map alias keys to.
   * @param alias keys to map as aliases.
   */
  alias(key: string, ...alias: string[]): Pargv;
  alias(key: string | IMap<string[]>, ...alias: string[]): Pargv {
    this._command.alias(key, ...alias);
    return this;
  }

  /**
   * Describe
   * Adds description for default command, subcommand or option.
   *
   * @param config object containing describes by property.
   */
  describe(config: IMap<string>): Pargv;

  /**
   * Describe
   * Adds description for default command, command or option.
   *
   * @param key the option key to add description to.
   * @param describe the associated description.
   */
  describe(key: string, describe?: string): Pargv;
  describe(key: string | IMap<string>, describe?: string): Pargv {
    this._command.describe(key, describe);
    return this;
  }

  /**
   * Coerce
   * Coerce or transform each subcommand or option in config object for default command.
   *
   * @param config object containing coerce configurations.
   */
  coerce(config: IMap<IPargvCoerceConfig>): Pargv;

  /**
   * Coerce
   * Coerce or transform subcommand or options for default command.
   *
   * @param key the option key to be coerced.
   * @param type the string type, RegExp or coerce callback function.
   * @param def an optional value when coercion fails.
   */
  coerce(key: string | IMap<IPargvCoerceConfig>, type?: string | RegExp | CoerceHandler, def?: any): Pargv {
    this._command.coerce(key, type, def);
    return this;
  }

  /**
   * Demand
   * The subcommand or option keys to be demanded for default command.
   *
   * @param key the key to demand.
   */
  demand(...keys: string[]): Pargv {
    this._command.demand(...keys);
    return this;
  }

  /**
   * When
   * When a specified key in config object demand dependent key for default command.
   *
   * @param config an object containing when configurations.
   */
  when(config: IMap<IPargvWhenConfig>): Pargv;

  /**
   * When
   * When a specified key demand dependent key for default command.
   *
   * @param key require this key.
   * @param converse when true the coverse when is also created.
   */
  when(key: string, converse?: string): Pargv;

  /**
   * When
   * When a specified key demand dependent key for default command.
   *
   * @param key require this key.
   * @param demand this key is present.
   * @param converse when true the coverse when is also created.
   */
  when(key: string, demand?: string, converse?: boolean): Pargv;
  when(key: string | IMap<IPargvWhenConfig>, demand?: string | boolean, converse?: boolean): Pargv {
    this._command.when(key, demand, converse);
    return this;
  }

  /**
   * Default
   * Sets a default value for specified subcommand or option in default command.
   *
   * @param config an object containing configs for property defaults.
   */
  default(config: IMap<any>): Pargv;

  /**
   * Default
   * Sets a default value for specified subcommand or option in default command.
   *
   * @param key the key to set default value for.
   * @param val the value to set for the provided key.
   */
  default(key: string, val: any): Pargv;
  default(key: string | IMap<any>, val?: any): Pargv {
    this._command.default(key, val);
    return this;
  }

  /**
   * Completion At
   * : Injects custom completion value for specified key.
   * Key can be a known arg, option or * for anonymous in default command.
   *
   * @param key the key to inject completion values for.
   * @param vals the completion values for the provided key.
   */
  completionFor(key: string, ...vals: any[]): Pargv {
    this._command.completionFor(key, ...vals);
    return this;
  }

  /**
   * Action
   * Adds an action event to be called when parsing matches command.
   *
   * @param fn the callback function when parsed command matches.
   */
  action(fn: ActionHandler): Pargv {
    this._command.action(fn);
    return this;
  }

  /**
   * Spread Commands
   * When true found commands are spread in .action(cmd1, cmd2, ...).
   *
   * @param spread when true spreads command args in callback action.
   */
  spreadCommands(spread?: boolean): Pargv {
    this._command.spreadCommands(spread);
    return this;
  }

  /**
   * Extend Commands
   * When true known commands are extended to result object { some_command: value }.
   *
   * @param extend when true commands are exteneded on Pargv result object.
   */
  extendCommands(extend?: boolean): Pargv {
    this._command.extendCommands(extend);
    return this;
  }

  /**
   * Extend Aliases
   * When true option aliases are extended on result object --option, -o results in { option: value, o: value }.
   *
   * @param extend when true aliases are exteneded on Pargv result object.
   */
  extendAliases(extend?: boolean): Pargv {
    this._command.extendAliases(extend);
    return this;
  }

  /**
   * Example
   * : Saves an example string/tuple of example string & description for default command.
   *
   * @param example string or an array of tuples [example, description].
   * @param describe the description for the example.
   */
  example(example: string | [string, string][], describe?: string): Pargv {
    this._command.example(example, describe);
    return this;
  }

  /**
   * Help
   * Enables or disables help for default command.
   *
   * @param enabled true or false to toggle help.
   */
  help(enabled?: boolean): Pargv {
    this._command.help(enabled);
    return this;
  }

  get min() {

    return {

      /**
       * Min Commands
       * Sets minimum command count.
       *
       * @param count the minimum number of commands.
       */
      commands: (count: number) => {
        this._command._minCommands = count;
        return this;
      },

      /**
       * Min Options
       * Sets minimum option count.
       *
       * @param count the minimum number of options.
       */
      options: (count: number) => {
        this._command._minOptions = count;
        return this;
      }

    }

  }

  get max() {

    return {

      /**
       * Max Commands
       * Sets maximum command count.
       *
       * @param count the maximum number of commands.
       */
      commands: (count: number) => {
        this._command._maxCommands = count;
        return this;
      },

      /**
       * Max Options
       * Sets maximum options count.
       *
       * @param count the maximum number of options.
       */
      options: (count: number) => {
        this._command._maxOptions = count;
        return this;
      }

    }

  }

  get if() {
    return this.when;
  }

}

