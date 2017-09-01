// IMPORTS //

import * as path from 'path';
import * as util from 'util';
import * as cliui from 'cliui';
import * as figlet from 'figlet';
import * as prefix from 'global-prefix';
import { Colurs, IColurs } from 'colurs';
import * as utils from './utils';
import { IMap, IPargvOptions, IPargvOption, ActionCallback, CoerceCallback, AnsiStyles, HelpCallback, IFigletOptions, ILayout, ILogo, ILogger, IPargvParsedResult, IPargvCoerceConfig, IPargvWhenConfig, ErrorHandler } from './interfaces';
import { TOKEN_PREFIX_EXP, LIST_EXP, KEYVAL_EXP, JSON_EXP, REGEX_EXP, FLAG_EXP, SPLIT_CHARS, COMMAND_VAL_EXP, FLAG_SHORT_EXP, SPLIT_KEYVAL_EXP, SPLIT_PAIRS_EXP, DOT_EXP } from './constants';

// VARIABLES & CONSTANTS //

let colurs: IColurs;
let log: ILogger;

const DEFAULTS: IPargvOptions = {
  auto: true,         // when true parsed values are auto cast to type if not defined.
  colorize: true,     // wether or not to use colors in help & log messages.
  divider: '=',       // divider string used in help messages.
  colors: {           // colors used in help.
    primary: 'blue',
    accent: 'cyan',
    alert: 'red',
    muted: 'gray'
  },
  extendCommands: true, // when true known commands extended to result object.
  allowAnonymous: true,  // when true anonymous commands options allowed.
  ignoreTypeErrors: false, // when true type check errors are ignored.
  displayStackTrace: false // when true stacktrace is displayed on errors.
};

// CLASSES //

export class Pargv {

  private _helpDisabled: boolean = false;
  private _helpHandler: HelpCallback;
  private _errorHandler: ErrorHandler;
  private _command: PargvCommand;

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

    this.options = utils.extend<IPargvOptions>({}, DEFAULTS, options);

    colurs = new Colurs({ enabled: this.options.colorize });
    // log = utils.logger(this.options.logLevel, colurs);

    this.command('__default__');                    // Default Command.

    this._helpHandler = (command?: string) => {     // Default help handler.
      if (this._helpDisabled === true)
        return;
      return this.compileHelp(command).get();
    };

    this._errorHandler = (err: Error) => {
      const msg = err.message;
      let stack;
      if (err.stack) {
        stack = err.stack.split('\n');
        stack.shift(); // remove first line.
        stack.map((el) => {
          return '   ' + el;
        });
      }
      if (this.options.displayStackTrace && stack)
        console.log(stack);
    };

    this.command('help.h')                     // Default help command.
      .action(this.showHelp.bind(this));

  }

  // PRIVATE //

  /**
   * Logger
   * Formats messages for logging.
   *
   * @param args log arguments.
   */
  private logger(...args: any[]) {
    let msg = args.shift();
    let meta;
    if (utils.isPlainObject(utils.last(args)))
      meta = args.pop();
    if (utils.isPlainObject(msg)) {
      meta = util.inspect(meta, null, null, this.options.colorize);
      msg = '';
    }
    const tokens = utils.isString(msg) && msg.match(/(%s|%d|%i|%f|%j|%o|%O|%%)/g);
    if (tokens && tokens.length && args.length)
      msg = util.format(msg, args);
    return meta ? msg + ' ' + meta : msg;
  }

  /**
   * Error
   * Handles error messages.
   *
   * @param args args to be formatted and logged.
   */
  error(...args: any[]) {
    const formatted = this.logger(...args);
    const err = new Error(formatted);
    console.log(err);
  }

  /**
   * Log
   * Displays log messages after formatting, supports metadata.
   *
   * @param args the arguments to log.
   */
  private log(...args: any[]) {
    console.log(this.logger(...args));
  }

  /**
    * Compile Help
    * Compiles help for all commands or single defined commnand.
    *
    * @param command the optional command to build help for.
    */
  private compileHelp(command?: string) {

    const layout = this.layout();
    const obj: any = {};

    // Get single cmd in object or
    // get all commands.
    const cmds = command ? {}[command] = this._commands[command] : this._commands;

    // Define color vars.
    const primary = this.options.colors.primary;
    const alert = this.options.colors.alert;
    const accent = this.options.colors.accent;
    const muted = this.options.colors.muted;

    const div = this.options.divider;
    const pad = '   ';
    let ctr = 0;

    // Builds commands and flags help.
    const buildOptions = (cmd: PargvCommand) => {

      if (!cmd._commands.length && !cmd._options.length)
        return;

      layout.section(<string>colurs.applyAnsi('Commands:', accent));

      cmd._commands.forEach((el) => { // build commands.
        const isRequired = utils.contains(cmd._demands, el);
        const arr: any = [pad + el, colurs.applyAnsi(cmd._describes[el] || '', muted), '', ''];
        const lastCol = isRequired ? { text: colurs.applyAnsi('required', alert), align: 'right' } : '';
        arr.push(lastCol);
        layout.div(...arr);
      });

      if (!cmd._commands.length) // no commands set "none".
        layout.div(colurs.applyAnsi(pad + 'none', muted));

      layout.section(<string>colurs.applyAnsi('Flags:', accent));

      cmd._options.sort().forEach((el) => { // build options.
        const isRequired = utils.contains(cmd._demands, el);
        const aliases = cmd.findAliases(el).sort();
        const names = [el].concat(aliases).join(', ');
        const arr: any = [pad + names, colurs.applyAnsi(cmd._describes[el] || '', muted)];
        const lastCol = isRequired ? { text: colurs.applyAnsi('required', alert), align: 'right' } : '';
        arr.push(lastCol);
        layout.div(...arr);
      });

      if (!cmd._options.length) // no options set "none".
        layout.div(colurs.applyAnsi(pad + 'none', muted));

      if (cmd._examples.length) {
        layout.section(<string>colurs.applyAnsi('Examples:', accent));

        cmd._examples.forEach((el, i) => {
          // const ex1 = colurs.applyAnsi(pad + `example ${i + 1}:`, muted);
          if (!/^.*\$\s/.test(el))
            el = '$ ' + el;
          const ex2 = colurs.applyAnsi(el, muted);
          layout.div(pad + ex2, '');
        });
      }

    };

    // Builds the app name, version descript header.
    const buildHeader = () => {

      // Add the name to the layout.
      if (this._name) {

        if (!this._nameFont)
          layout.repeat(<string>colurs.applyAnsi(div, muted));

        let tmpName = this._name;
        const nameStyles = this._nameStyles && this._nameStyles.length ? this._nameStyles : primary;

        if (this._nameFont)
          tmpName = this.logo(tmpName, this._nameFont, nameStyles).get();
        else
          tmpName = <string>colurs.applyAnsi(tmpName, nameStyles);

        layout.div(tmpName);

        if (this._nameFont)
          layout.div();

        // Add description to layout.
        if (this._describe)
          layout.div(`${colurs.applyAnsi('Description:', accent)} ${utils.padLeft(colurs.applyAnsi(this._describe, muted) as string, 3)}`);

        // Add version to layout.
        if (this._version)
          layout.div(`${colurs.applyAnsi('Version:', accent)} ${utils.padLeft(colurs.applyAnsi(this._version, muted) as string, 7)}`);

        if (this._license)
          layout.div(`${colurs.applyAnsi('License:', accent)} ${utils.padLeft(colurs.applyAnsi(this._license, muted) as string, 7)}`);


        // Add break in layout.
        layout.repeat(<string>colurs.applyAnsi(div, muted));

      }

    };

    // Builds the body of the help iterating
    // over each command and its options.
    const buildBody = () => {

      let cmdKeys;

      if (command) {
        cmdKeys = [command];
        console.log(); // only displaying one command add spacing.
      }
      else {
        cmdKeys = utils.keys(this._commands).sort()
          .filter(v => v !== 'help').concat(['help']);
      }

      cmdKeys.forEach((el, i) => {

        const cmd: PargvCommand = this.commands.find(el);
        if (i > 0)
          layout.repeat(<string>colurs.applyAnsi('-', muted), 15);

        const aliases = cmd.findAliases(cmd._name); // get aliases.

        layout.div(colurs.applyAnsi('Usage: ', primary) + cmd._usage, colurs.applyAnsi('Alias: ', primary) as string + aliases);

        if (cmd._describe) {
          layout.div();
          layout.div(colurs.applyAnsi(cmd._describe, muted));
        }

        buildOptions(cmd);

      });

    };

    const buildFooter = () => {

      // Add epilog if any.
      if (this._epilog) {
        layout.repeat(<string>colurs.applyAnsi(div, muted));
        layout.div(colurs.applyAnsi(this._epilog, muted));
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

  // GETTERS //

  /**
   * Commands
   * Helper methods for commands.
   */
  get commands() {

    return {

      /**
       * Command
       * Finds a command by name.
       *
       * @param key the name of the command to find.
       */
      find: (key: string): PargvCommand => {
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
       * Remove
       * Removes a command from the collection.
       *
       * @param key the command key/name to be removed.
       */
      remove: (key: string) => {
        const cmd = this.commands.find(key);
        if (!cmd)
          return this;
        delete this._commands[cmd._name];
        return this;
      }

    };

  }

  /**
   * UI
   * Alias to layout.
   */
  get ui() {
    return this.layout;
  }

  /**
   * Epilogue
   * Alias to epilog.
   */
  get epilogue() {
    return this.epilog;
  }

  // DEFAULT COMMAND //
  // exposes parsing features without need for a command.

  /**
   * Default Command
   * Exposes default command for parsing anonymous arguments.
   *
   * @example pargv.$.option('-t').parse(['one', '-t', 'test'])
   */
  get $(): PargvCommand {
    return this._command;
  }

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
  name(val: string, styles?: AnsiStyles | AnsiStyles[], font?: string) {
    this._name = val;
    this._nameStyles = utils.toArray<AnsiStyles>(styles, []);
    this._nameFont = font;
    return this;
  }

  /**
   * Version
   * Just adds a string to use as the version for your program, used in help.
   *
   * @param val the value to use as version name.
   */
  version(val: string) {
    this._version = val;
    return this;
  }

  /**
   * Description
   * The program's description or purpose.
   *
   * @param describe the description string.
   */
  description(describe: string) {
    this._describe = describe;
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
   * @param token the command token string to parse.
   * @param describe a description describing the command.
   */
  command(token: string, describe?: string) {
    const cmd = new PargvCommand(token, describe, this);
    if (token !== '__default__')
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

    const colors = this.options.colors;
    const autoType = this.options.auto ? 'auto' : 'string'; // is auto casting enabled.
    const isExec = utils.last(argv) === '__exec__' ? argv.pop() : null;
    argv = argv && argv.length ? argv : process.argv;   // process.argv or user args.
    const procArgv = process.argv.slice(0);         // get process.argv.
    const parsedExec = path.parse(procArgv[1]);     // parse the node execution path.

    let normalized = this.toNormalized(argv.slice(0));   // normalize the args.
    const source = normalized.slice(0);               // store source args.
    const name = utils.first(normalized);                 // get first arg.
    let cmd = this.commands.find(name);              // lookup the command.

    if (cmd)
      normalized.shift();                           // found cmd shift first.
    else
      cmd = this._command;                          // use the default command.

    let ctr = 0;
    let val;
    const stats = cmd.stats(normalized);
    normalized = stats.normalized;      // set to normalized & ordered args.

    const result: IPargvParsedResult = {
      $exec: parsedExec.name,
      $command: name,
      $commands: [],
      $metadata: {
        source: source,
        execPath: procArgv[1],
        nodePath: procArgv[0],
        globalPrefix: prefix,
      }
    };

    if (!this.options.allowAnonymous && stats.anonymous.length) // no anon in strict mode.
      this.error(`cannot parse in ${colurs.applyAnsi('strict mode', colors.accent)} using anonymous arg(s)`, colurs.applyAnsi(stats.anonymous.join(', ') + '.', colors.accent));

    if (stats.missing.length)       // throw error when missing args.
      this.error(`failed to parse required arg(s)`, colurs.applyAnsi(stats.missing.join(', '), colors.accent), 'are missing and/or have no default value.');

    if (stats.whens.length) {
      const when = stats.whens.shift();
      this.error(`parsing failed ${colurs.applyAnsi(when[0], colors.accent)} requires ${colurs.applyAnsi(when[1], colors.accent)} but is missing.`);
    }

    if (cmd._min > 0 && stats.commands.length < cmd._min)
      this.error(`parsing failed at least ${cmd._min} commands are requried by got ${stats.commands.length}.`);

    // Normalize value and call user coerce method if exists.
    const coerceWrapper = (key, type, isBool) => {
      const coerce: CoerceCallback = utils.isFunction(type) ? type : null;
      type = coerce ? null : type;
      type = type || (isBool ? 'boolean' : autoType);
      return (val, def) => {
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
      let coercion: CoerceCallback = cmd._coercions[key];  // lookup user coerce function.

      if (isNot && !isBool)  // Prevent --no option when not bool flag.
        this.error(`cannot set option ${colurs.applyAnsi(key, colors.accent)} to false a value is expected.`);

      let wrapper = coerceWrapper(key, coercion, isBool);  // get coerce wrapper.

      val = isFlag && !isBool ? next : isFlag ? isNot ? true : false : el;
      val = wrapper(val, def);

      const formattedKey = isFlag ?       // normalize key to camelcase if when flag.
        utils.camelcase(key.replace(FLAG_EXP, '')) :
        key;

      if (!isFlag) {
        result.$commands.push(val);
        if (this.options.extendCommands && key)
          result[formattedKey] = val;
      }
      else {
        if (DOT_EXP.test(key)) // is dot notation key.
          utils.set(result, key.replace(FLAG_EXP, ''), val);
        else
          result[formattedKey] = val;
      }

    });

    if (isExec) {                            // ensures correct number of cmd args.
      let offset =
        cmd._commands.length - result.$commands.length;
      while (offset > 0 && offset--)
        result.$commands.push(null);
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
    const cmd = this._commands[parsed.$command];
    if (utils.isFunction(cmd._action))
      cmd._action(...parsed.$commands, parsed, cmd);
  }

  // HELP & ERRORS //

  /**
   * Help
   * Helper method for defining custom help text.
   *
   * @param val callback for custom help or boolean to toggle enable/disable.
   */
  help(disabled: boolean): Pargv;
  help(fn: boolean | HelpCallback) {
    if (utils.isBoolean(fn)) {
      this._helpDisabled = <boolean>fn;
    }
    else if (utils.isFunction(fn)) {
      this._helpDisabled = undefined;
      this._helpHandler = (command) => {
        return (fn as HelpCallback)(command, this._commands);
      };
    }
    return this;
  }

  /**
    * Show Help
    * Displays all help or help for provided command name.
    *
    * @param command optional name for displaying help for a particular command.
    */
  showHelp(command?: string | PargvCommand) {
    const name = utils.isPlainObject(command) ? (command as PargvCommand)._name : command;
    const help = this._helpHandler(<string>name, this._commands);
    console.log(help);
    console.log();
  }

  /**
   * Fail
   * Add custom on error handler.
   *
   * @param fn the error handler function.
   */
  fail(fn: ErrorHandler) {
    if (fn)
      this._errorHandler = fn;
    return this;
  }

  // UTIL METHODS //

  /**
   * Stats
   * Iterates array of arguments comparing to defined configuration.
   * To get stats from default command use '__default__' as key name.
   *
   * @param key the command key to get stats for.
   * @param args args to gets stats for.
   */
  stats(key: string, ...args: any[]) {
    if (utils.isArray(args[0]))
      args = args[0];
    if (!args.length)
      this.error('whoops cannot get stats for arguments of undefined.');
    args = this.toNormalized(args);               // normalize args to known syntax.
    const cmd = this.commands.find(key);
    if (!cmd)
      this.error(`cannot get stats for unknown command ${key}`);
    return cmd.stats(args);
  }

  /**
   * Reset
   * Resets the default command and settings.
   */
  reset() {
    this.command('__default__');
    return this;
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
    const execExp = new RegExp('^' + prefix, 'i');
    if (execExp.test(args[0]))                      // if contains node/exec path strip.
      args = args.slice(2);
    args.forEach((el) => {
      if (/^--/.test(el) && ~(idx = el.indexOf('='))) {
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
  logo(text?: string | IFigletOptions, font?: string, styles?: AnsiStyles | AnsiStyles[]): ILogo {

    let result: string;
    let methods: ILogo;

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
      result = colurs.applyAnsi(result, styles) as string;

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

    const show = render;

    methods = {

      fonts,
      show,
      render,
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
  layout(width?: number, wrap?: boolean): ILayout {

    const self = this;

    // Base width of all divs.
    width = width || 100;

    // Init cli ui.
    const ui = cliui({ width: width, wrap: wrap });

    // Alignment.
    const flowMap = {
      '-1': null,
      0: 'center',
      1: 'right'
    };

    function invalidExit(element, elements) {
      if (utils.isString(element) && elements.length && utils.isPlainObject(elements[0]))
        this.error('invalid element(s) cannot mix string element with element options objects.');
    }

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
    function flow(align: number | number[], ...elements: any[]) {
      align = utils.toArray<number>(align);
      const isLast = align.length === 1;
      const lastIdx = elements.length - 1;
      elements = elements.map((el, i) => {
        if (isLast && i < lastIdx)
          return el;
        let dir = !isLast ? align[i] : align[0];
        if (!dir || dir === null || dir === -1)
          return el;
        dir = flowMap[dir];
        if (utils.isPlainObject(el))
          el.align = dir;
        else
          el = { text: el, align: dir };
        return el;
      });
      add('div', ...elements);
      return this;
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
     * Simply repeats a character by layout width
     * or specified length. Good for creating sections
     * or dividers. If single integer is used for padding
     * will use value for top padding then double for bottom.
     *
     * @param char the character to be repeated
     * @param len optional lenth to repeat or width offset by 25 is used.
     * @param padding number or array of numbers if single digit used for top/bottom.
     */
    function repeat(char: string, len?: number, padding?: number | number[]) {
      len = len || (width - 1);
      const _char = char;
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
    function section(title: string, padding?: number | number[]) {
      padding = padding >= 0 ? padding : 1;
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

    const methods = {
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

  // option(token: string, describe?: string, def?: any): PargvCommand {
  //   return this._command.option.bind(this._command);
  // }

}

export class PargvCommand {

  _name: string;
  _usage: string;
  _describe: string;
  _commands: string[] = [];
  _options: string[] = [];
  _bools: string[] = [];
  _aliases: IMap<string> = {};
  _usages: IMap<string[]> = {};
  _defaults: IMap<any> = {};
  _describes: IMap<string> = {};
  _coercions: IMap<CoerceCallback> = {};
  _demands: string[] = [];
  _whens: IMap<string> = {};
  _min: number = 0;
  _examples: string[] = [];
  _action: ActionCallback;

  _pargv: Pargv;

  constructor(token: string, describe?: string, pargv?: Pargv) {
    this._describe = describe;
    this._pargv = pargv;
    this.parseCommand(token);
  }

  // PRIVATE //

  /**
   * Parse Token
   * Parses a usage token.
   *
   * @param token the token string to be parsed.
   * @param next the next element in usage command.
   */
  private parseToken(token: string, next?: any): IPargvOption {

    token = token.replace(/\s/g, '');
    let tokens = token.split(':');                // <age:number> to ['<age', 'number>'];
    let key = tokens[0];                          // first element is command/option key.

    if (!TOKEN_PREFIX_EXP.test(key))              // ensure valid token.
      this.error(`parsing token ${colurs.bgRed.white(key)} failed, missing/invalid token or unwated space.`);
    const isRequired = /^</.test(key);            // starts with <.
    let type;
    if (utils.isString(tokens[1]))                // strip < or [ from type if any.
      type = utils.stripToken(tokens[1]).trim();
    let isFlag = utils.isFlag(key);              // starts with - or -- or anonymous.
    const isBool = isFlag && !next;              // if flag but no next val is bool flag.
    let aliases = key.split('.');                // split generate.g to ['generate', 'g']
    key = aliases[0];                            // reset name to first element.

    if (isFlag) {
      aliases = aliases                            // normalize aliases/key then sort.
        .map((el) => {
          el = el.replace(FLAG_EXP, '');
          el = el.length > 1 ? '--' + el : '-' + el;
          return el;
        })
        .sort((a, b) => { return b.length - a.length; });
      aliases = utils.removeDuplicates(aliases);    // remove any duplicate aliases.
    }

    token = key = aliases.shift();                  // now sorted set final key.

    if (!isFlag) {
      key = utils.stripToken(key);
      aliases = [];                                  // only flags support aliases.
      next = null;
    }

    if (isFlag) {
      token = utils.stripToken(token, /(<|>|\[|\])/g);
    }
    else {
      token = isRequired ?                            // ensure closing char for token.
        token.replace(/>$/, '') + '>' :
        token.replace(/\]$/, '') + ']';
    }

    let usage: string[] = [[token].concat(aliases).join(', ')];

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

    next = this.parseToken(next, null);

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
   * Parse Command
   * Parses a command token.
   *
   * @param token the command token string to parse.
   */
  private parseCommand(token?: string) {

    let split = utils.split(token.trim(), SPLIT_CHARS);   // Break out usage command.
    let ctr = 0;                                            // Counter for command keys.
    let aliases = split.shift().trim().split('.');          // Break out command aliases.
    let name = aliases.shift();                             // First is key name.
    const usage = [];                                       // Usage command values.
    usage.push(name);                                       // Add command key.

    // Iterate the tokens.
    split.forEach((el, i) => {

      let next = split[i + 1];                              // next value.
      const isFlag = utils.isFlag(el);                       // if is -o or --opt.
      next = utils.isFlag(next) ||                           // normalize next value.
        !COMMAND_VAL_EXP.test(next || '') ? null : next;
      const parsed = this.parseToken(el, next);        // parse the token.
      let describe;

      if (parsed.flag) {
        if (!parsed.bool)                                    // remove next if not bool.
          split.splice(i + 1, 1);
      }

      else {
        parsed.index = ctr;                                 // the index of the command.
        usage.push(parsed.usage[0]);                        // push token to usage.
        ctr++;
      }

      this.expandOption(parsed);                             // Break out the object.

    });

    this._name = name;                                 // Save the commmand name.
    this._describe = this._describe ||                 // Ensure command description.
      `The ${name} command.`;
    this._usage = usage.join(' ');                     // create usage string.
    this.alias(name, ...aliases);                      // Map aliases to command name.
    this.alias(name, name);

  }

  /**
   * Expand Option
   * This breaks out the parsed option in to several
   * arrays/objects. This prevents some recursion rather
   * than storing the object itself in turn requiring more loops.
   *
   * @param option the parsed PargvOption object.
   */
  private expandOption(option: IPargvOption) {

    let describe;

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
    this.alias(option.key, option.key);                     // Add key to self.
    this.alias(option.key, ...option.aliases);              // Add aliases to map.
    if (!utils.isUndefined(option.index))                   // Index to Command map.
      this.alias(option.key, option.index + '');
    if (option.required)                                   // set as required.
      this.demand(option.key);
    this._usages[option.key] = option.usage;               // Add usage.
    this.coerce(option.key, option.type, option.default);  // Add default coerce method.

  }

  // GETTERS //

  get error() {
    return this._pargv.error;
  }

  get colors() {
    return this._pargv.options.colors;
  }

  get parse() {
    return this._pargv.parse.bind(this._pargv);
  }

  get exec() {
    return this._pargv.exec.bind(this._pargv);
  }

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
  option(token: string, describe?: string, def?: any, type?: string | RegExp | CoerceCallback): PargvCommand {
    token = utils.toOptionToken(token);
    const tokens = utils.split(token.trim(), SPLIT_CHARS);
    tokens.forEach((el, i) => {
      let next;
      if (tokens.length > 1) {
        next = tokens[i + 1];
        tokens.splice(i + 1, 1);
      }
      const parsed = this.parseToken(el, next);
      parsed.describe = describe || parsed.describe;
      parsed.default = def;
      parsed.type = type || parsed.type;
      this.expandOption(parsed);
    });
    return this;
  }

  /**
   * Alias
   * Maps alias keys to primary flag/command key.
   *
   * @param key the key to map alias keys to.
   * @param alias keys to map as aliases.
   */
  alias(config: IMap<string[]>): PargvCommand;
  alias(key: string, ...alias: string[]): PargvCommand;
  alias(key: string | IMap<string[]>, ...alias: string[]): PargvCommand {
    let obj: any = key;
    const clrs = this.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = alias;
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v) || !utils.isArray(v))
        this.error(`failed to set alias for ${colurs.applyAnsi(k, clrs.accent)} value must be an array.`);
      v.forEach((el) => {
        el = utils.stripToken(el, /(<|>|\[|\])/g);
        this._aliases[el] = k;
      });
    }
    return this;
  }

  /**
   * Describe
   * Adds description for an option.
   *
   * @param key the option key to add description to.
   * @param describe the associated description.
   */
  describe(config: IMap<string>): PargvCommand;
  describe(key: string, describe?: string): PargvCommand;
  describe(key: string | IMap<string>, describe?: string): PargvCommand {
    let obj: any = key;
    const clrs = this.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = describe;
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v))
        this.error(`failed to set describe for ${colurs.applyAnsi(k, clrs.accent)} with value of undefined.`);
      this._describes[k] = v;
    }
    return this;
  }

  /**
   * Coerce
   * Coerce or transform the defined option when matched.
   *
   * @param key the option key to be coerced.
   * @param fn the string type, RegExp or coerce callback.
   * @param def an optional value when coercion fails.
   */
  coerce(key: string | IMap<IPargvCoerceConfig>): PargvCommand;
  coerce(key: string, type?: string | RegExp | CoerceCallback, def?: any): PargvCommand;
  coerce(key: string | IMap<IPargvCoerceConfig>, fn?: string | RegExp | CoerceCallback, def?: any): PargvCommand {

    let obj: any = key;
    const clrs = this.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = {
        fn: fn,
        def: def
      };
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v))
        this.error(`cannot set coerce for ${colurs.applyAnsi(k, clrs.accent)} with value of undefined.`);
      // if (!utils.isFunction(v.fn))
      //   v.fn = this.castToType.bind(this, k, v.fn);
      if (v.def) this.default(k, v.def);
      this._coercions[k] = v.fn;
    }
    return this;
  }

  /**
   * Demand
   * The commands or flag/option keys to demand.
   *
   * @param key the key to demand.
   * @param keys additional keys to demand.
   */
  demand(...keys: string[]) {
    keys.forEach((k) => {
      if (!utils.contains(this._demands, this.aliasToKey(k)))
        this._demands.push(k);
    });
    return this;
  }

  /**
   * When
   * When a specified key demand dependent key.
   *
   * @param key require this key.
   * @param demand this key is present.
   * @param converse when true the coverse when is also created.
   */
  when(config: IMap<IPargvWhenConfig>): PargvCommand;
  when(key: string, converse?: boolean): PargvCommand;
  when(key: string, demand?: string, converse?: boolean): PargvCommand;
  when(key: string | IMap<IPargvWhenConfig>, demand?: string | boolean, converse?: boolean): PargvCommand {
    let obj: any = key;
    const clrs = this.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      demand = this.stripToAlias(<string>demand);
      obj = {};
      obj[<string>key] = {
        demand: demand,
        converse: converse
      };
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      let v = obj[k];
      v.demand = this.stripToAlias(v.demand);
      if (!utils.isValue(v.demand))
        this.error(`failed to set describe for ${colurs.applyAnsi(k, clrs.accent)} with demand value of undefined.`);
      this._whens[k] = v.demand;
      if (v.converse)
        this._whens[v.demand] = k;
    }
    return this;
  }

  /**
   * Default
   * Sets a default value for a command or option.
   *
   * @param key the key to set the default for or an object of key/val.
   * @param val the value to set for the provided key.
   */
  default(key: string | IMap<any>, val: any) {
    let obj: any = key;
    const clrs = this.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = val;
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v))
        this.error(`no can do...failed to set default for ${colurs.applyAnsi(k, clrs.accent)} with value of undefined.`);
      this._defaults[k] = v;
    }
    return this;
  }

  /**
   * Min
   * A value indicating the minimum number of commands.
   *
   * @param count the minimum command count.
   */
  min(count: number) {
    this._min = count;
    return this;
  }

  /**
   * Action
   * Adds an action event to be called when parsing matches command.
   *
   * @param fn the callback function when parsed command matches.
   */
  action(fn: ActionCallback) {
    if (!fn) this.error('cannot add action using method of undefined.');
    this._action = fn;
    return this;
  }

  /**
   * Example
   * Stores and example for the command displayed in help.
   *
   * @param val string value representing an example.
   */
  example(example: string, describe?: string) {
    this._examples = this._examples.concat(example);
  }

  // UTILS //

  /**
   * Cast To Type
   * Casts a value to the specified time or fallsback to default.
   *
   * @param type the type to cast to.
   * @param val the value to be cast.
   */
  castToType(key: string, type: string | RegExp, val?: any, def?: any) {

    let result = null;
    const opts = this._pargv.options;
    const colors = opts.colors;
    const origVal = val;
    type = utils.isString(type) ? (type as string).trim() : type;
    const isAuto = type === 'auto';

    if (utils.isString(val))
      val = val.trim();

    // Check if is list type expression.
    let isListType =
      (utils.isString(type) && LIST_EXP.test(<string>type)) ||
      utils.isRegExp(type);

    let listexp;
    if (isListType) {
      listexp = type;
      type = 'list';
    }

    const is: any = {
      object: utils.isPlainObject,
      number: utils.isNumber,
      integer: utils.isInteger,
      float: utils.isFloat,
      date: utils.isDate,
      array: utils.isArray,
      json: utils.isPlainObject,
      regexp: utils.isRegExp,
      boolean: utils.isBoolean,
      list: (v: any) => { return utils.isValue(v); }
    };

    const to: any = {

      // Never called in autoCast method.
      list: (v) => {
        const exp = utils.isRegExp(listexp) ? listexp : utils.splitToList(<string>listexp);
        console.log(exp.toString());
        const match = v.match(exp);
        result = match && match[0];
      },

      object: (v) => {
        if (!KEYVAL_EXP.test(v))
          return null;
        const obj = {};
        // split key:val+key:val to [key:val, key:val].
        const pairs = v.match(SPLIT_PAIRS_EXP);
        if (!pairs.length) return null;
        let parentPath;
        if (DOT_EXP.test(pairs[0])) { // split user.profile.name to [user, profile, name]
          const matches = pairs.shift().match(SPLIT_KEYVAL_EXP);
          const segments = matches[0].split('.');
          const key = segments.pop();
          if (segments.length)
            parentPath = segments.join('.');
          pairs.unshift(`${key}:${matches[1]}`); // set back to key:val without parent path.
        }
        pairs.forEach((p) => {
          const kv = p.split(':');
          if (kv.length > 1) {
            let castVal: any = kv[1];
            if (DOT_EXP.test(castVal)) {
              castVal = to.object(castVal);
            }
            else {
              if (/^\[\s*?("|').+("|')\s*?\]$/.test(castVal))
                castVal = castVal.replace(/(^\[|\]$)/g, '');
              if (opts.auto) { // check if auto casting is enabled.
                castVal = autoCast(castVal) || castVal;
                if (utils.isArray(castVal))
                  castVal = (castVal as any[]).map((el) => {
                    return autoCast(el) || el;
                  });
              }
            }
            let setPath = parentPath ? `${parentPath}.${kv[0]}` : kv[0];
            utils.set(obj, setPath, castVal);
          }
        });
        return obj;

      },

      json: (v) => {
        if (!JSON_EXP.test(v))
          return null;
        v = v.replace(/^"/, '').replace(/"$/, '');
        return utils.tryWrap(JSON.parse, v)();
      },

      array: (v) => {
        if (!LIST_EXP.test(v))
          return null;
        return utils.toArray(v);
      },

      number: (v) => {
        if (!/[0-9]/g.test(v))
          return null;
        return utils.castType(v, 'number');
      },

      date: (v) => {
        return utils.castType(v, 'date');
      },

      regexp: (v) => {
        if (!REGEX_EXP.test(v))
          return null;
        return utils.castType(val, 'regexp');
      },

      boolean: (v) => {
        if (!/^(true|false)$/.test(v))
          return null;
        return utils.castType(v, 'boolean');
      },

      string: (v) => {
        return v;
      }

    };

    to.integer = to.number;
    to.float = to.number;

    function autoCast(v) {

      // Ensure type is set to auto.
      const origType = type;
      type = 'auto';

      let _result;

      let castMethods = [
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
        const method = castMethods.shift();
        _result = method();
      }

      type = origType;

      return _result;

    }

    // If not a special type just cast to the type.
    if (type !== 'auto') {
      result = to[<string>type](val);
    }

    // Try to auto cast type.
    else {
      result = utils.toDefault(autoCast(val), val);
    }

    // If Auto no type checking.
    if (isAuto) return result;

    if (!isListType)  // if not matching list/regexp check default.
      result = utils.toDefault(result, def);

    // Ensure valid type.
    if (!utils.isValue(result) || !is[<string>type](result)) {
      if (!opts.ignoreTypeErrors) {
        if (!isListType) {
          this.error(`expected type ${colurs.applyAnsi(<string>type, colors.accent)} but got ${colurs.applyAnsi(utils.getType(type), colors.accent)}.`);
        }
        else {
          this.error(`expected list or expression ${colurs.applyAnsi(listexp, colors.accent)} to contain result but got ${colurs.applyAnsi(origVal, colors.accent)}.`);
        }
      }
      else {
        result = origVal;
      }
    }

    return result;

  }

  /**
   * Alias To Name
   * Maps an alias key to primary command/flag name.
   *
   * @param key the key to map to name.
   * @param def default value if alias is not found.
   */
  aliasToKey(key: string | number, def?: any): string {
    const result = this._aliases[key];
    if (!utils.isValue(result) && def)
      return def;
    return result;
  }

  /**
   * Strip To Alias
   * Strips tokens then returns alias or original key.
   *
   * @param key the key to retrieve alias for.
   */
  stripToAlias(key: string | number) {
    if (utils.isString(key))
      key = utils.stripToken(<string>key, /(<|>|\[|\])/g);    // strip <, >, [ or ]
    return this.aliasToKey(key, key);
  }

  /**
   * Find Aliases
   * Looks up aliases for a given key.
   *
   * @param key the primary key to find aliases for.
   */
  findAliases(key: string) {
    key = this.aliasToKey(key); // get primary name.
    const found = [];
    for (const p in this._aliases) {
      if (this._aliases[p] === key && p !== key)
        found.push(p);
    }
    return found;
  }

  /**
   * Stats
   * Iterates arguments mapping to known options and commands
   * finding required, anonymous and missing args.
   *
   * @param args the args to get stats for.
   */
  stats(args: any[]) {

    const lastIdx = this._commands.length - 1;
    const clone = args.slice(0);

    const commands = [];        // contains only commands.
    const options = [];         // contains only options.
    const anonymous = [];       // contains only anonymous options.
    const mapCmds = [];         // contains command keys.
    const mapOpts = [];         // contains option keys.
    const mapAnon = [];         // contains anon keys.
    let ctr = 0;

    let map2 = this._commands.slice(0).concat(this._options.slice(0));

    clone.forEach((el, i) => {

      const next = clone[i + 1];
      const isFlag = utils.isFlag(el);
      const isFlagNext = utils.isFlag(next);
      const isNot = /^--no/.test(el) ? true : false;  // flag prefixed with --no.
      const origEl = el;
      el = el.replace(/^--no/, '');                   // strip --no;
      let key = isFlag || ctr > lastIdx ? this.aliasToKey(el) : this.aliasToKey(ctr);

      if (!key) {                                 // is anonymous command or option.
        anonymous.push(origEl);
        mapAnon.push(el);
        if (!isFlagNext && next) {                // add only if not opt or cmd.
          anonymous.push(next);
          mapAnon.push('$value');            // keeps ordering denotes expects val.
          clone.splice(i + 1, 1);
        }
      }

      else if (isFlag && key) { // is a known flag/option.
        options.push(isNot ? '--no' + key : key);  // converted from alias to key.
        mapOpts.push(key);
        if (!this.isBool(el) && utils.isValue(next)) {
          options.push(next);
          mapOpts.push('$value');                // keeps ordering denotes expects val.
          clone.splice(i + 1, 1);
        }
      }

      else if (!isFlag && key) {                 // is a known command.
        commands.push(el);
        mapCmds.push(key);
        ctr++;
      }

    });

    let normalized = commands.concat(options).concat(anonymous);  // normalized args.
    let map = mapCmds.concat(mapOpts).concat(mapAnon);    // map by key to normalized.

    const missing = [];

    this._demands.forEach((el) => {
      if (!utils.contains(map, el)) {
        const isFlag = FLAG_EXP.test(el);
        let def = this._defaults[el] || null;
        if (!isFlag) {
          const idx = this._commands.indexOf(el);
          if (!utils.isValue(def))
            missing.push(el);
          map.splice(idx, 0, el);
          normalized.splice(idx, 0, def);
        }
        else {
          if (!utils.isValue(def))
            missing.push(el);
          map.push(el);
          if (!this.isBool(el)) {
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

    let whens: any = [];

    for (const p in this._whens) {                // iterate whens ensure demand exists.
      const demand = this._whens[p];
      if (!utils.contains(map, demand))
        whens.push([p, demand]);
    }

    return {
      commands,
      options,
      anonymous,
      missing,
      map,
      normalized,
      whens
    };

  }

  /**
   * Has Command
   * Checks if a command exists by index or name.
   *
   * @param key the command string or index.
   */
  isCommand(key: string | number) {
    key = this.aliasToKey(key);
    return utils.isValue(key);
  }

  /**
   * Has Option
   * Inspects if key is known option.
   */
  isOption(key: string) {
    key = this.aliasToKey(key);
    return utils.isValue(key);
  }

  /**
   * Is Required
   * Checks if command or option is required.
   *
   * @param key the command, index or option key.
   */
  isRequired(key: string | number) {
    const origKey = key;
    key = this.aliasToKey(<string>key);
    if (utils.isNumber(key))                // happens when command string is passed.
      key = origKey;                        // convert back to orig value passed.
    return utils.contains(this._demands, key);
  }

  /**
   * Is Bool
   * Looks up flag option check if is of type boolean.
   *
   * @param key the option key to check.
   */
  isBool(key: string) {
    key = this.aliasToKey(key);
    return utils.contains(this._bools, key);
  }

}
