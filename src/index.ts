// IMPORTS //

import * as path from 'path';
import * as cliui from 'cliui';
import * as figlet from 'figlet';
import * as prefix from 'global-prefix';
import { Colurs } from 'colurs';
import * as utils from './utils';
import { IMap, IPargvOptions, IPargvOption, ActionCallback, CoerceCallback, AnsiStyles, HelpCallback, IFigletOptions, ILayout, ILogo } from './interfaces';
import { TOKEN_PREFIX_EXP, ARRAY_EXP, KEYVAL_EXP, JSON_EXP, REGEX_EXP, FLAG_EXP, SPLIT_CHARS, COMMAND_VAL_EXP } from './constants';

// VARIABLES & CONSTANTS //

let colurs;
let log;

const DEFAULTS: IPargvOptions = {
  strict: false,       // when true error message shown and exits for missing arguments.
  colorize: true,     // wether or not to use colors in help & log messages.
  dupes: true,        // when true a flag can be used multiple times required for objects.
  auto: true,         // when true parsed values are auto cast to type if not defined.
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
function parseToken(token: string, next?: any, auto?: string): IPargvOption {

  let tokens = token.split(':');                // <age:number> to ['<age', 'number>'];
  let key = tokens[0];                          // first element is command/option key.

  if (!TOKEN_PREFIX_EXP.test(key))              // ensure valid token.
    log.error(`cannot parse token ${colurs.bgRed.white(key)}, token must begin with -, --, < or [.`);
  const isRequired = /^</.test(key);            // starts with <.
  const isOptional = /^\[/.test(key);           // starts with [.
  let type = utils.stripToken(tokens[1] || ''); // strip < or [ from type if any.
  type = type || auto;
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
function castToType(type: string | RegExp, def: any, val?: any) {

  let result = null;
  const origVal = val;
  type = (type as string).trim();
  const isAuto = type === 'auto';

  if (utils.isString(val))
    val = val.trim();

  // Check if is list type expression.
  const isListType = ARRAY_EXP.test(type) || utils.isRegExp(type);
  type = isListType ? 'list' : type;

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
      const match = val.match(utils.splitToList(<string>type));
      result = match && match[0];
    },

    object: (v) => {
      if (!KEYVAL_EXP.test(v))
        return null;
      const obj = {};
      const pairs = utils.split(v, ['|', '+']);
      if (!pairs.length) return null;
      pairs.forEach((p) => {
        const kv = p.split(':');
        if (kv.length > 1) {
          let castVal: any = kv[1];
          // Check if an array is denoted with [ & ]
          // If yes strip them from string.
          if (/^\[/.test(castVal) && /\]$/.test(castVal))
            castVal = castVal.replace(/(^\[|\]$)/g, '');
          // Check if auto casting is enabled.
          if (this.options.auto) {
            castVal = autoCast(castVal) || castVal;
            if (utils.isArray(castVal))
              castVal = (castVal as any[]).map((el) => {
                return autoCast(el) || el;
              });
          }
          utils.set(obj, kv[0], castVal);
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
      if (!ARRAY_EXP.test(v))
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

  // If no value return default.
  if (!val) return def;

  // If not a special type just cast to the type.
  if (type !== 'auto') {
    result = to[type](val);
  }

  // Try to iterate and auto cast type.
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
    log.error(`expected type ${colurs.cyan(type)} but got ${colurs.cyan(utils.getType(type))}.`);

  return result;

}


// CLASSES //

export class Pargv {

  private _helpDisabled: boolean = false;
  private _helpHandler: HelpCallback;
  private _command: PargvCommand;

  _name: string;
  _nameFont: string;
  _nameStyles: AnsiStyles[];
  _version: string;
  _describe: string;
  _epilog: string;

  commands: IMap<PargvCommand> = {};
  options: IPargvOptions;

  constructor(options?: IPargvOptions) {

    this.options = utils.extend<IPargvOptions>({}, DEFAULTS, options);

    colurs = new Colurs({ enabled: this.options.colorize });
    log = utils.logger(colurs);

    this.command('__default__');                    // Default Command.

    this._helpHandler = (command?: string) => {     // Default help handler.
      if (this._helpDisabled === true)
        return;
      return this.compileHelp(command).get();
    };

    this.command('help.h')                          // Default help command.
      .action(this.showHelp.bind(this));

  }

  // PRIVATE //

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
    const cmds = command ? {}[command] = this.commands[command] : this.commands;
    let helpCmd;

    if (!command) {
      helpCmd = cmds['help'];
    }

    // Define color vars.
    const primary = this.options.colors.primary;
    const alert = this.options.colors.alert;
    const accent = this.options.colors.accent;
    const muted = this.options.colors.muted;

    const div = this.options.divider;
    let ctr = 0;

    // Builds option row help.
    const buildOption = (opt) => {
      const names = [opt.name].concat(opt.aliases);
      const namesStr = names.join(', ');
      const arr: any = ['\t\t' + names, opt.description || ''];
      const lastCol = opt.required ? { text: colurs.applyAnsi('required', alert), align: 'right' } : '';
      arr.push(lastCol);
      layout.div(...arr);
    };

    // Builds commands and flags help.
    const buildOptions = (cmd: PargvCommand) => {

      // const optKeys = objectKeys(cmd.options);
      let flagCt = 0;
      let cmdCt = 0;

      layout.section(<string>colurs.applyAnsi('Commands:', accent));

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

      layout.section(<string>colurs.applyAnsi('Flags:', accent));

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
    const buildHeader = () => {

      // Add the name to the layout.
      if (this._name) {

        if (!this._nameFont)
          layout.repeat(<string>colurs.applyAnsi(div, muted));

        let tmpName = this._name;
        if (this._nameFont)
          tmpName = this.logo(tmpName, this._nameFont, this._nameStyles).get();
        else
          tmpName = <string>colurs.applyAnsi(tmpName, this._nameStyles);

        layout.div(tmpName);

        if (this._nameFont)
          layout.div();

        // Add description to layout.
        if (this._describe)
          layout.div(`${colurs.applyAnsi('Description:', accent)} ${utils.padLeft(this._describe, 3)}`);

        // Add version to layout.
        if (this._version)
          layout.div(`${colurs.applyAnsi('Version:', accent)} ${utils.padLeft(this._version, 7)}`);

        // Add break in layout.
        layout.repeat(<string>colurs.applyAnsi(div, muted));

      }

    };

    // Builds the body of the help iterating
    // over each command and its options.
    const buildBody = () => {

      // Iterate each command build option rows.
      for (const p in cmds) {

        if (ctr > 0)
          layout.repeat(<string>colurs.applyAnsi('-', muted), 15);

        const cmd = cmds[p];
        const opts = cmd.options;

        // Add usage to layout.
        const usage = colurs.applyAnsi('Usage: ', primary) + cmd._usage;
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

    const buildFooter = () => {

      // Add epilog if any.
      if (this._epilog) {
        layout.div('');
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
   * Find
   * Methods for finding commands and options.
   */
  get find() {

    return {

      /**
       * Command
       * Finds a command by name.
       *
       * @param key the name of the command to find.
       */
      command: (key: string): PargvCommand => {
        const cmds = this.commands;
        let cmd = cmds[key];
        if (cmd) return cmd;
        for (const p in cmds) {           // Try to lookup by alias.
          if (cmd) break;
          const tmp = cmds[p];
          if (tmp._aliases[key])
            cmd = tmp;
        }
        return cmd;
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

  get option() { return this._command.option; }
  get alias() { return this._command.alias; }
  get describe() { return this._command.describe; }
  get coerce() { return this._command.coerce; }
  get demand() { return this._command.demand; }
  get demandIf() { return this._command.demandIf; }
  get min() { return this._command.min; }
  get action() { return this._command.action; }

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
      this.commands[cmd._name] = cmd;
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

    if (utils.isArray(utils.first(argv)))           // if first is array set as value.
      argv = argv[0];

    const isExec = utils.last(argv) === '__exec__' ? argv.pop() : null;
    const isUserArgs = argv && argv.length;
    argv = isUserArgs ? argv : process.argv;        // process.argv or user args.
    const procArgv = process.argv.slice(0);         // get process.argv.
    const parsedExec = path.parse(procArgv[1]);     // parse the node execution path.

    let normalized = argv.slice(0);                 // normalized array of args.

    if (procArgv[1] === argv[1])                    // if match argv incl. node process.
      normalized = normalized.slice(2);

    normalized = utils.normalizeArgs(normalized);   // normalize the args.

    const name = utils.first(argv);                 // get first arg.
    let cmd = this.find.command(name);              // lookup the command.

    if (cmd)
      normalized.shift();                           // found cmd shift first.
    else
      cmd = this._command;                          // use the default command.

    const result: any = {
      command: '',
      commands: [],
      options: {},
      globalPath: prefix,
      nodePath: procArgv[0],
      execPath: procArgv[1],
      exec: parsedExec.name
    };

    let ctr = 0;



    normalized.forEach((el, i) => {

      const nextId = i + 1;
      let next = argv[nextId];
      const isFlag = FLAG_EXP.test(el);
      const isKeyVal = KEYVAL_EXP.test(next || '');
      const isFlagNext = FLAG_EXP.test(next || '');
      const isNot = /^--no/.test(el) ? true : false;



    });

    if (isExec) {                                     // called from exec method.

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
    //
  }

  // HELP //

  /**
    * Show Help
    * Displays all help or help for provided command name.
    *
    * @param command optional name for displaying help for a particular command.
    */
  showHelp(command?: string | PargvCommand) {
    const name = utils.isPlainObject(command) ? (command as PargvCommand)._name : command;
    const help = this._helpHandler(<string>name, this.commands);
    console.log(help);
    console.log();
  }

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
        return (fn as HelpCallback)(command, this.commands);
      };
    }
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
      log.error('whoops cannot get stats for arguments of undefined.');
    const execExp = new RegExp('^' + prefix, 'i');
    if (execExp.test(args[0]))                      // if contains node/exec path strip.
      args = args.slice(2);
    args = utils.normalizeArgs(args);               // normalize args to known syntax.
    const cmd = this.find.command(key);
    if (!cmd)
      log.error(`cannot get stats for unknown command ${key}`);
    return cmd.stats(args);
  }

  /**
   * Remove
   * Removes a command from the collection.
   *
   * @param key the command key to be removed.
   */
  remove(key: string) {
    delete this.commands[key];
    return this;
  }

  /**
   * Reset
   * Resets the default command.
   */
  reset() {
    this.command('__default__');
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
        log.error('invalid element(s) cannot mix string element with element options objects.');
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
    function render(...elements: any[]) {
      if (elements.length)
        add('div', ...elements);
      console.log(get());
    }

    // Alias for render.
    const show = render;

    const methods = {
      div,
      span,
      repeat,
      section,
      flow,
      join,
      get,
      render,
      show,
      ui
    };

    return methods;


  }

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
  _describes: IMap<string> = {};
  _coercions: IMap<CoerceCallback> = {};
  _demands: string[] = [];
  _min: number = 0;
  _action: ActionCallback;

  _pargv: Pargv;

  constructor(token: string, describe?: string, pargv?: Pargv) {
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
    if (!utils.isUndefined(option.index)) {                // Index to Command map.
      this.alias(option.key, option.index + '');
      this.alias(option.index + '', option.key);
    }
    if (option.required)                                // If required set as demanded.
      this.demand(option.key);
    this._usages[option.key] = option.usage;             // Add usage.

    if (!option.bool)
      this.coerce(option.key, option.type, option.default);              // Add default coerce method.
    else
      this.coerce(option.key, (val: any, command?: PargvCommand) => { return val; }, option.default);

  }

  /**
   * Parse Command
   * Parses a command token.
   *
   * @param token the command token string to parse.
   */
  private parseCommand(token?: string) {

    const autoType = this._pargv.options.auto ? 'auto' : 'string';
    const split = utils.split(token.trim(), SPLIT_CHARS);   // Break out usage command.
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
      const parsed = parseToken(el, next, autoType);        // parse the token.
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
   * Alias To Name
   * Maps an alias key to primary command/flag name.
   *
   * @param key the key to map to name.
   */
  private aliasToKey(key: string) {
    return this._aliases[key];
  }

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
  option(token: string, describe?: string, def?: any) {
    const autoType = this._pargv.options.auto ? 'auto' : 'string';
    token = utils.toOptionToken(token);
    const tokens = utils.split(token.trim(), SPLIT_CHARS);
    tokens.forEach((el, i) => {
      let next;
      if (tokens.length > 1) {
        next = tokens[i + 1];
        tokens.splice(i + 1, 1);
      }
      const parsed = parseToken(el, next, autoType);
      parsed.describe = describe || parsed.describe;
      parsed.default = def;
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
  alias(key: string, ...alias: string[]) {
    alias.forEach((el) => {
      this._aliases[el] = key;
    });
    return this;
  }

  /**
   * Describe
   * Adds description for an option.
   *
   * @param key the option key to add description to.
   * @param describe the associated description.
   */
  describe(key: string, describe: string) {
    key = this.aliasToKey(key) || key;
    this._describes[key] = describe;
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
  coerce(key: string, fn: string | RegExp | CoerceCallback, def?: any) {
    key = this.aliasToKey(key) || key;
    fn = fn || this._pargv.options.auto ? 'auto' : 'string';
    if (utils.isString(fn) || utils.isRegExp(fn))
      fn = castToType.bind(null, fn, def);
    this._coercions[key] = <CoerceCallback>fn;
    return this;
  }

  /**
   * Demand
   * The commands or flag/option keys to demand.
   *
   * @param key the key to demand.
   * @param keys additional keys to demand.
   */
  demand(key: string | string[], ...keys: string[]) {
    keys = utils.mergeArgs(key, keys);
    keys.forEach((k) => {
      const alias = this.aliasToKey(k);
      k = /^[0-9]+/.test(k) ? this.aliasToKey(k) : alias;   // ensure no number keys.
      if (!utils.contains(this._demands, k))
        this._demands.push(k);
    });
    return this;
  }

  /**
   * Demand If
   * Demands a key when parent key is present.
   *
   * @param key require this key.
   * @param when this key is present.
   */
  demandIf(key: string, when: string) {
    //
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
    if (!fn) log.error('cannot add action using method of undefined.');
    this._action = fn;
    return this;
  }

  // UTILS //

  /**
   * Has Command
   * Checks if a command exists by index or name.
   *
   * @param key the command string or index.
   */
  isCommand(key: string | number) {
    if (utils.isString(key))
      return utils.contains(this._commands, key);
    return utils.isValue(this._commands[key]);
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

  stats(args: any[]) {

    const lastIdx = this._commands.length - 1;
    const clone = args.slice(0);
    const commands = [];        // contains only commands.
    const options = [];         // contains only options.
    const anonymous = [];       // contains only anonymous options.
    const required = [];        // contains only required options/commands.
    const missing = [];
    const keys = [];
    let ctr = 0;

    clone.forEach((el, i) => {

      const next = clone[i + 1];
      const isFlag = utils.isFlag(el);
      const isFlagNext = utils.isFlag(next);
      let key = isFlag || ctr > lastIdx ? this.aliasToKey(el) : this.aliasToKey(ctr + '');


      if (!key) {                                 // is anonymous command or option.
        anonymous.push(el);
        if (!isFlagNext && next && !this.isCommand(ctr)) { // add only if not opt or cmd.
          anonymous.push(next);
          clone.splice(i + 1, 1);
        }
      }

      else {

        if (isFlag && key) {                      // is a known flag/option.
          options.push(el);
          if (this.isRequired(el))
            required.push(el);
          if (!this.isBool(el)) {
            options.push(next);
            clone.splice(i + 1, 1);
          }
        }

        else if (!isFlag && key) {                 // is a known command.
          commands.push(el);
          if (this.isRequired(ctr))
            required.push(el);
          ctr++;
        }

      }

    });



    let normalized = commands.concat(options).concat(anonymous);

    return {
      commands,
      options,
      anonymous,
      required,
      missing,
      normalized
    };

  }

}
