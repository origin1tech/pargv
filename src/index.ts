
import * as path from 'path';
import * as cliui from 'cliui';
import * as figlet from 'figlet';
import * as prefix from 'global-prefix';
import { Colurs, get as getColurs } from 'colurs';
import { IPargvOptions, IMetadata, IFigletOptions, BeforeFigletRender, ILayoutOptions, IPargvCommandConfig, IMap, IPargvCommandOption, ActionCallback, ILayout, CastCallback, IPargvCommands } from './interfaces';
import { extend, isString, isPlainObject, get, set, isUndefined, isArray, isDebug, contains, camelcase, keys, isBoolean, noop, isFunction, toArray, tryRequire, split, castType, getType, isRegExp, toDefault } from 'chek';

const pkg = tryRequire(path.resolve(process.cwd(), 'package.json'), { version: '0.0.0' });
const colurs = getColurs();

const KEYVAL_EXP = /^([a-zA-Z0-9]+:[a-zA-Z0-9]+,?)+$/g;
const CSV_EXP = /^(.+,.+){1,}$/g;
const REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
const REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
const FLAG_EXP = /^--?/;
const TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/g;
const TOKEN_PREFIX_EXP = /^(--?|<|\[)/;
const NESTED_EXP = /^[a-zA-Z0-9]+\./;
const GLOBAL_PREFIX_EXP = new RegExp('^' + prefix, 'i');
const SPLIT_CHARS = ['|', ',', ' '];
declare var v8debug;

const DEFAULTS: IPargvOptions = {
  strict: false,          // when true only defined commands/options are allowed.
  auto: true,             // when true parsed values are auto cast to type if not defined.
  injectDebug: false      // when true injects debug flag into args.
};

// UTILS //

/**
 * Normalize Debug
 * Normalizes the debug arg if exists by breaking
 * out the debug port if provided.
 *
 * @param argv the args passed to parse.
 */
function normalizeDebug(argv: string[]): string[] {

  const execDebug = process.execArgv.filter((arg) => {
    return /^--debug/.test(arg);
  })[0] || null;

  const argvDebug = argv.filter((arg) => {
    return /^--debug/.test(arg);
  })[0] || null;

  const debugFlag = execDebug || argvDebug || null;

  if (!debugFlag)
    return [];

  if (!/^--debug-brk=/.test(debugFlag))
    return [debugFlag];
  // Otherwise break out the port into separate arg.
  return debugFlag.split('=');

}

/**
 * Merge Args
 * Merges arguments into single array of values.
 *
 * @param val the single value or array of values.
 * @param args rest param of args.
 */
function mergeArgs(val: any | any[], ...args: any[]) {
  if (!isString(val))
    val = val.trim();
  if (!isArray(val))
    val = [val];
  return val.concat(args);
}

/**
 * Is Flag
 * Checks if value is a flag (ex: -s or --save).
 *
 * @param val the value to inspect.
 */
function isFlag(val: string) {
  return isString(val) && FLAG_EXP.test(val);
}

/**
 * Is Flag Value
 * Inspects flag check if flag expecting value instead of simple boolean.
 *
 * @param val the value to inspect.
 */
function isFlagLong(val: string) {
  return isFlag(val) && /^--/.test(val);
}

/**
 * Strip Param
 * Strips -f, --flag <param> [param] resulting in
 * f, flag or param.
 *
 * @param val the value to be stripped.
 */
function stripToken(val: string) {
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
function splitToList(val: string) {
  return new RegExp('^(' + split(val, ['|', ',', ' ']).join('|').replace(/\s/g, '') + ')$', 'i');
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
function toOptionString(val: string) {
  let pre = val;
  let suffix = '';
  let reqIdx = val.indexOf('<');
  let optIdx = val.indexOf('[');
  let idx = !!~reqIdx ? reqIdx : !!~optIdx ? optIdx : null;
  if (idx) {
    pre = val.slice(0, idx);
    suffix = val.slice(idx);
  }
  pre = split(pre.trim(), SPLIT_CHARS).join('.').replace(/\s/g, '');
  return pre + ' ' + suffix;
}

/**
 * Parse Token
 * Parses command or option token to object.
 *
 * @param token the token to be parsed.
 * @param next optional next value for flags.
 */
function parseToken(token: string, next?: string) {

  // splits <age:number> to ['<age', 'number>'];
  const split = token.split(':');

  // Set the first element to the token name.
  let name = split[0];

  // Check if is a flag, long flag and/or required.
  let flag = FLAG_EXP.test(name);
  const required = /^</.test(name);

  // anonymous type.
  const anon = !TOKEN_PREFIX_EXP.test(name);

  // Split name into segments.
  let aliases = name.split('.');

  // Don't shift here we want name
  // in array for sorting.
  name = aliases[0];

  // Assume anonymous tokens are flags.
  // this allows n.number [number]
  // to convert to option -n, --number.
  if (anon) {
    flag = true;
    name = name.length > 1 ? `--${name}` : `-${name}`;
  }

  // Remove < or ] from the type.
  const type = stripToken(split[1] || 'auto');

  // Split the name inspect for aliases then sort by length.
  aliases = aliases
    .map((a) => {
      a = a.replace(/(<|\[|>|\])/g, '');
      if (flag && !FLAG_EXP.test(a))
        a = a.length > 1 ? `--${a.replace(FLAG_EXP, '')}` : `-${a.replace(FLAG_EXP, '')}`;
      return a;
    })
    .sort((a, b) => { return b.length - a.length; });

  // Now that we've sorted we don't
  // need the first segment or name.
  name = aliases.shift();

  // Ensure alias is not same as name.
  if (contains(aliases, name))
    throw new Error(`Alias ${name} cannot be the same as option name property.`);

  // This is a sub command value.
  if (!flag)
    return { name: name, aliases: aliases, type: type, required: required };

  // When a flag but no next its a boolean flag.
  if (!next)
    return { name: name, aliases: aliases, type: 'boolean', required: false, flag: true };

  // We need to parse the next token to
  // get info for the value flag.
  const parsed = parseToken(next);

  // Return flag name/aliases then details from parsed value.
  return { name: name, aliases: aliases, as: parsed.name, type: parsed.type, required: parsed.required, flag: true };

}

function cast(key: any, val: any) {
  //
}

/**
 * Cast To Type
 * Just a wrapper to chek's castType.
 *
 * @param type the type to cast to.
 * @param val the value to be cast.
 */
function castTypeWrapper(type: string | RegExp, def: any, val: any) {

  type = (type as string).trim();
  const isListExp = /(,|\s|\|)/.test(type) || isRegExp(type);

  if (!isListExp)
    return castType(val, type, def);

  // Handle list like strings
  // ex: small, medium, large
  // becomes: /^(small|medium|large)$/
  const match = val.match(splitToList(type));

  return toDefault(match && match[0], def);

}

// PARGV COMMAND CLASS //

export class PargvCommand {

  private _context: Pargv;

  private _usage: string;
  private _description: string = '';
  private _aliases: string[] = [];
  private _examples: string[] = [];
  private _action: ActionCallback = noop;
  private _depends: { name?: string[] } = {};

  name: string;
  options: IMap<IPargvCommandOption> = {};

  constructor(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig, context?: Pargv) {

    if (!command)
      throw new Error('Cannot defined command using name of undefined.');

    if (isPlainObject(command)) {
      options = <IPargvCommandConfig>command;
      description = undefined;
    }

    if (isPlainObject(description)) {
      options = <IPargvCommandConfig>description;
      description = undefined;
    }

    options = options || {};

    this._context = context;
    this.parseTokens(<string>command || options.command, true);
    this._description = <string>description || options.description || `Executes ${command} command.`;
    this._aliases = isString(options.aliases) ? split(options.aliases, SPLIT_CHARS) : [];

  }

  /**
   * Parse Command
   * Parses command tokens to command object.
   *
   * @param val the command value to parse.
   */
  private parseTokens(val: string, isCommand?: boolean): IPargvCommandOption[] {

    // If not command convert option string to Pargv syntax.
    if (!isCommand)
      val = toOptionString(val);

    const arr = split(val.trim(), SPLIT_CHARS);
    let usage: any = [];
    let parsedOpts: IPargvCommandOption[] = [];

    // If command shift out the command.
    if (isCommand) {
      let tmpCmd: any = arr.shift().trim();
      // split out aliases
      tmpCmd = tmpCmd.split('.');
      if (this._context.commands[tmpCmd[0]])
        throw new Error(`Cannot add command ${tmpCmd[0]}, the command already exists.`);
      this.name = tmpCmd.shift();
      if (tmpCmd.length)
        this._aliases = tmpCmd;
      usage.push(this.name);
    }

    arr.forEach((el, i) => {

      const prev = arr[i - 1];
      const skip = (prev && !TOKEN_PREFIX_EXP.test(prev)) || FLAG_EXP.test(prev);

      if (skip) return;

      el = el.trim();
      const parsed: IPargvCommandOption = parseToken(el, arr[i + 1]);

      if (!parsed.flag)
        parsed.position = i;

      // Build up the parsed values for usage string.
      if (parsed.flag) {
        usage.push(parsed.name);
        if (!isCommand)
          usage = usage.concat(parsed.aliases);
        if (parsed.required)
          usage.push(`<${parsed.as}>`);
        else
          usage.push(`[${parsed.as}]`);
      }
      else {
        if (parsed.required)
          usage.push(`<${parsed.name}>`);
        else
          usage.push(`[${parsed.name}]`);
      }

      this.options[parsed.name] = extend<IPargvCommandOption>({}, this.options[parsed.name], parsed);

      // Add to collection of parsed options.
      parsedOpts.push(this.options[parsed.name]);

    });

    if (isCommand)
      this._usage = usage.join(' ');

    return parsedOpts;

  }

  /**
   * Find Option
   * Looks up an option by name or alias.
   *
   * @param key the key or alias name to find option by.
   */
  findOption(key: string): IPargvCommandOption {
    let option;
    for (const k in this.options) {
      const aliases = this.options[k].aliases;
      if (key === k || contains(<string[]>aliases, key)) {
        option = this.options[k];
        break;
      }
    }
    return option;
  }

  /**
   * Option
   * Adds option to command.
   *
   * @param val the option val to parse or option configuration object.
   * @param description the description for the option.
   * @param def the default value.
   * @param cast the expression, method or type for validating/casting.
   */
  option(val: string | IPargvCommandOption, description?: string, def?: any, cast?: string | RegExp | CastCallback) {
    if (isPlainObject(val)) {
      const opt = <IPargvCommandOption>val;
      if (!opt.name)
        throw new Error('Pargv command option requires "name" property when passing object.');
      extend(this.options[opt.name], opt);
    }
    else {
      const parsed: IPargvCommandOption = this.parseTokens(val as string)[0];
      parsed.description = description;
      parsed.default = def;
      if (isString(cast) || isRegExp(cast))
        cast = castTypeWrapper.bind(this, cast, def);
      parsed.cast = <CastCallback>cast;
    }
    return this;
  }

  /**
   * Demand
   * Demands that the option be present when parsed.
   *
   * @param val the value or list of flags to require.
   * @param args allows for demands as separate method signature params.
   */
  demand(val: string | string[], ...args: string[]) {

    args = mergeArgs(val, args);

    // Iterate and ensure option is required.
    args.forEach((d) => {
      d = d.trim();
      d = FLAG_EXP.test(d) ? d : d.length > 1 ? `--${d}` : `-${d}`;
      const stripped = stripToken(d);
      const opt = this.findOption(d);
      // set existing to required.
      if (opt) {
        opt.required = true;
      }
      // create options object.
      else {
        this.options[d] = { name: d, required: true, aliases: [], type: 'auto', flag: true, as: stripped };
      }
    });

  }

  /**
   * Depends
   * When this option demand dependents.
   *
   * @param when when this option demand the following.
   * @param demand the option to demand.
   * @param args allows for separate additional vals denoting demand param.
   */
  depends(when: string, demand: string | string[], ...args: string[]) {
    args = mergeArgs(demand, args);
    this._depends[when] = args;
  }

  /**
   * Description
   * Saves the description for the command.
   *
   * @param val the description.
   */
  description(val: string) {
    this._description = val || this._description;
    return this;
  }

  /**
   * Alias
   * Adds aliases for the command.
   *
   * @param val the value containing command aliases.
   * @param args allows for aliases as separate method signature params.
   */
  alias(val: string | string[], ...args: string[]) {
    this._aliases = this._aliases.concat(mergeArgs(val, args));
    return this;
  }

  /**
   * Action
   * Adds an action event to be called when parsing matches command.
   *
   * @param fn the callback function when parsed command matches.
   */
  action(fn: ActionCallback) {
    if (!fn) throw new Error('Cannot add action with action method of undefined.');
    this._action = fn;
    return this;
  }

  /**
   * Example
   * Simply stores provided string as an example for displaying in help.
   *
   * @param val the example value to be stored.
   * @param args allows for examples as separate method signature params.
   */
  example(val: string | string[], ...args: any[]) {
    this._examples = this._examples.concat(mergeArgs(val, args));
    return this;
  }

  /**
   * Command
   * Creates new command configuration.
   *
   * @param command the command to be matched or options object.
   * @param description the description or options object.
   * @param options options object for the command.
   */
  command(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig) {
    return this._context.command;
  }

  /**
   * Parse
   * Parses the provided arguments inspecting for commands and options.
   *
   * @param argv the process.argv or custom args array.
   */
  parse(...argv: any[]) {
    return this._context.parse(...argv);
  }

}

// PARGV CONTAINER //

export class Pargv {

  private _usage: string;
  private _parsed: any;

  commands: IPargvCommands = {};
  options: IPargvOptions;

  constructor(options?: IPargvOptions) {
    this.options = extend<IPargvOptions>({}, DEFAULTS, options);
  }

  /**
   * UI
   * Alias to layout for backward compatibility.
   */
  get ui() {
    return this.layout;
  }

  // USAGE & COMMANDS //

  /**
   * Usage
   * Simply a string denoting the general command and options layout.
   * If not defined the usage statement for the first command is used.
   *
   * @param val the usage string.
   */
  usage(val: string) {
    this._usage = val;
    return this;
  }

  /**
   * Command
   * Creates new command configuration.
   *
   * @param command the command to be matched or options object.
   * @param description the description or options object.
   * @param options options object for the command.
   */
  command(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig) {
    const cmd = new PargvCommand(command, description, options, this);
    this.commands[cmd.name] = cmd;
    return cmd;
  }

  /**
   * Parse
   * Parses the provided arguments inspecting for commands and options.
   *
   * @param argv the process.argv or custom args array.
   */
  parse(...argv: any[]) {

    let cmd: string = '';
    let cmds: string[] = [];
    let flags: IMetadata = [];
    let parsedExec, action;

    // if first arg is array then set as argv.
    if (isArray(argv[0]))
      argv = argv[0];

    // use provided args or get process.argv.
    argv = (argv.length && argv) || process.argv;

    // Clone the original args.
    const source = argv.slice(0);

    // Parse the executed filename.
    parsedExec = path.parse(source[1]);

    // Seed result object with paths.
    const obj: any = {
      globalPath: prefix,
      nodePath: source[0],
      execPath: source[1],
      exec: parsedExec.name
    };

    // Check for debug flags if found inject into args.
    if (isDebug())
      argv = argv.concat(normalizeDebug(argv));

    // Remove node and exec path from args.
    argv = argv.slice(2);

    // Don't shift if is a flag arg.
    if (!isFlag(argv[0]))
      cmd = argv.shift();

    // Lookup the command.
    const cmdObj = this.commands[cmd];

    if (!cmdObj)
      throw new Error(`Invalid command, the command ${cmd} was not found.`);

    // Iterate the args.
    argv.forEach((el, i) => {

      // lookup the option.
      const opt = cmdObj.findOption(el);

    });

  }

  /**
   * Help
   * Displays the generated help or supplied help string.
   *
   * @param val optional value to use instead of generated help.
   */
  help(val?: string) {

    const layout = this.layout(95);

    // Supported Types
    const types = [
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

    const typesHelp = layout.join('\n', ...types.map((t) => {
      colurs.yellow(t[0]);
      return t.join('\t');
    }));

    return this;

  }

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
  logo(text: string | IFigletOptions, font?: string) {

    let result: string;

    let defaults: IFigletOptions = {
      text: 'Pargv',
      font: 'Doom',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    };

    let options = isPlainObject(text) ? <IFigletOptions>text : {
      text: text,
      font: font
    };

    // Merge the options.
    options = extend({}, defaults, options);

    // Process the text.
    result = figlet.textSync(options.text, options);

    return {

      // Allows for modifiying the result like colorizing.
      before: (fn: BeforeFigletRender): Pargv => {
        result = fn(result);
        return this;
      },

      // Outputs/shows the result in the console.
      show: (): Pargv => {
        console.log(result);
        return this;
      },

      // Simply returns the current result.
      result: (): string => {
        return result;
      }

    };

  }

  /**
   * Fonts
   * Returns list of figlet fonts.
   */
  fonts() {
    return figlet.fontsSync();
  }

  /**
    * Layout
    * Creates a CLI layout much like creating divs in the terminal.
    * Supports strings with \t \s \n or IUIOptions object.
    * @see https://www.npmjs.com/package/cliui
    *
    * @param width the width of the layout.
    * @param wrap if the layout should wrap.
    */
  layout(width?: number, wrap?: boolean): ILayout {

    // Base width of all divs.
    width = width || 95;

    // Init cli ui.
    const ui = cliui({ width: width, wrap: wrap });

    function invalidExit(element, elements) {
      if (isString(element) && elements.length && isPlainObject(elements[0]))
        throw new Error('Invalid element(s) cannot mix string element with element options objects.');
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
    function div<T>(...elements: T[]) {
      add('div', ...elements);
      return methods;
    }

    /**
     * Span
     * Adds Span to the UI.
     *
     * @param elements array of string or IUIOptions
     */
    function span<T>(...elements: T[]) {
      add('span', ...elements);
      return methods;
    }

    /**
     * Join
     * Simply joins element args separated by space.
     *
     * @param elements the elements to be created.
     */
    function join<T>(by: string, ...elements: T[]) {
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
    function render<T>(...elements: T[]) {
      if (elements.length)
        add('div', ...elements);
      console.log(get());
    }

    // Alias for render.
    const show = render;

    const methods = {
      div,
      join,
      span,
      get,
      render,
      show,
      ui
    };

    return methods;


  }


}

let instance: Pargv;

function createInstance(options?: IPargvOptions): Pargv {
  if (!instance)
    instance = new Pargv(options);
  return instance;
}

export { createInstance as get };


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