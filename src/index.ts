
import * as path from 'path';
import * as cliui from 'cliui';
import * as figlet from 'figlet';
import * as prefix from 'global-prefix';
import { Colurs, get as getColurs, IColurs } from 'colurs';
import { IPargvOptions, IMetadata, IFigletOptions, BeforeFigletRender, ILayoutOptions, IPargvCommandConfig, IMap, IPargvCommandOption, ActionCallback, ILayout, CastCallback, IPargvCommands, CastType, IPargvResult } from './interfaces';
import { extend, isString, isPlainObject, get, set, isUndefined, isArray, isDebug, contains, camelcase, keys, isBoolean, noop, isFunction, toArray, tryRequire, split, castType, getType, isRegExp, toDefault, containsAny, isValue, tryWrap, isNumber, isFloat, isInteger, isDate, last } from 'chek';

const pkg = tryRequire(path.resolve(process.cwd(), 'package.json'), { version: '0.0.0' });
let colurs: IColurs;

const KEYVAL_EXP = /^((.+:.+)(\||\+)?)$/;
const CSV_EXP = /^(.+,.+){1,}$/;
const ARRAY_EXP = /^(.+(,|\||\s).+){1,}$/;
const JSON_EXP = /^"?{.+}"?$/;
const REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
const REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;

const FLAG_EXP = /^--?/;
const FLAG_SHORT_EXP = /^-[a-zA-Z0-9]/;
const TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/;
const TOKEN_PREFIX_EXP = /^(--?|<|\[)/;

const NESTED_EXP = /^[a-zA-Z0-9]+\./;
const GLOBAL_PREFIX_EXP = new RegExp('^' + prefix, 'i');
const SPLIT_CHARS = ['|', ',', ' '];
declare var v8debug;

const DEFAULTS: IPargvOptions = {
  strict: false,          // when true error message shown and exits for missing arguments.
  auto: true,             // when true parsed values are auto cast to type if not defined.
  colors: true,           // wether or not to use colors in help & log messages.
  catchAll: 'help'        // defines action when no command is found by default shows help.
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

  return [debugFlag];

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
 * Normalize Args
 * Converts -abc to -a -b -c
 * Converts --name=bob to --name bob
 *
 * @param args the arguments to normalize.
 */
function normalizeArgs(args: any[]) {
  let arr = [],
    idx;
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
  const type = stripToken(split[1] || '');

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
    log.error(`alias ${name} cannot be the same as option name property.`);

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

// Crude logger just need to show some messages.
const logTypes = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'magenta'
};
const log = {
  error: (...args: any[]) => {
    args.unshift(colurs.bold[logTypes['error']]('error:'));
    console.log('');
    console.log.apply(console, args);
    console.log('');
    log.exit(1);
  },
  info: (...args: any[]) => {
    args.unshift(colurs.bold[logTypes['info']]('info:'));
    console.log.apply(console, args);
    return log;
  },
  warn: (...args: any[]) => {
    args.unshift(colurs.bold[logTypes['warn']]('warn:'));
    console.log.apply(console, args);
    return log;
  },
  write: (...args: any[]) => {
    console.log.apply(console, args);
  },
  exit: process.exit
};

// PARGV COMMAND CLASS //

export class PargvCommand {

  private _usage: string;
  private _description: string = '';
  private _aliases: string[] = [];
  private _examples: string[] = [];
  private _depends: { name?: string[] } = {};

  pargv: Pargv;
  name: string;
  onAction: ActionCallback = noop;
  options: IMap<IPargvCommandOption> = {};

  constructor(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig, context?: Pargv) {

    if (!command)
      log.error('cannot define command using name of undefined.');

    if (isPlainObject(command)) {
      options = <IPargvCommandConfig>command;
      description = undefined;
    }

    if (isPlainObject(description)) {
      options = <IPargvCommandConfig>description;
      description = undefined;
    }

    options = options || {};

    this.pargv = context;
    this.parseTokens(<string>command || options.command, true);
    this._description = <string>description || options.description || `Executes ${command} command.`;
    this._aliases = isString(options.aliases) ? split(options.aliases, SPLIT_CHARS) : [];

    // Add debug options
    this.option('--debug', 'Debug flag.');
    this.option('--debug-brk [debugPort]', 'Debug break flag.');

    return this;

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
    let ctr = 0;

    // If command shift out the command.
    if (isCommand) {
      let tmpCmd: any = arr.shift().trim();
      // split out aliases
      tmpCmd = tmpCmd.split('.');
      if (this.pargv.commands[tmpCmd[0]])
        log.error(`cannot add command`, colurs.yellow(`${tmpCmd[0]}`), `the command already exists.`);
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

      // Set postion and update counter.
      if (!parsed.flag) {
        parsed.position = ctr;
        ctr++;
      }

      // The following may be overwritten from .option.
      const type = parsed.type || (this.pargv.options.auto ? 'auto' : 'string');
      parsed.cast = this.castToType.bind(this, type, null);
      parsed.description = parsed.flag ? `flag option.` : `sub command/argument.`;

      // Store the options for the command.
      this.options[parsed.name] = extend<IPargvCommandOption>({}, this.options[parsed.name], parsed);

      // Add to collection of parsed options.
      parsedOpts.push(this.options[parsed.name]);

    });

    if (isCommand)
      this._usage = usage.join(' ');

    return parsedOpts;

  }

  /**
   * Cast To Type
   * Casts a value to the specified time or fallsback to default.
   *
   * @param type the type to cast to.
   * @param def an optional default value.
   * @param val the value to be cast.
   */
  private castToType(type: string | RegExp, def: any, val: any) {

    let result = null;
    type = (type as string).trim();
    const isAuto = type === 'auto';

    if (isString(val))
      val = val.trim();

    // Check if is list type expression.
    const isListType = ARRAY_EXP.test(type) || isRegExp(type);
    type = isListType ? 'list' : type;

    const is: any = {
      object: isPlainObject,
      number: isNumber,
      integer: isInteger,
      float: isFloat,
      date: isDate,
      array: isArray,
      json: isPlainObject,
      regexp: isRegExp,
      boolean: isBoolean,
      list: (v: any) => { return isValue(v); }
    };

    const to: any = {

      // Never called in autoCast method.
      list: (v) => {
        const match = val.match(splitToList(<string>type));
        result = match && match[0];
      },

      object: (v) => {
        if (!KEYVAL_EXP.test(v))
          return null;
        const obj = {};
        const pairs = split(v, ['|', '+']);
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
            if (this.pargv.options.auto) {
              castVal = autoCast(castVal) || castVal;
              if (isArray(castVal))
                castVal = (castVal as any[]).map((el) => {
                  return autoCast(el) || el;
                });
            }
            set(obj, kv[0], castVal);
          }
        });
        return obj;

      },

      json: (v) => {
        if (!JSON_EXP.test(v))
          return null;
        v = v.replace(/^"/, '').replace(/"$/, '');
        return tryWrap(JSON.parse, v)();
      },

      array: (v) => {
        if (!ARRAY_EXP.test(v))
          return null;
        return toArray(v);
      },

      number: (v) => {
        if (!/[0-9]/g.test(v))
          return null;
        return castType(v, 'number');
      },

      date: (v) => {
        return castType(v, 'date');
      },

      regexp: (v) => {
        if (!REGEX_EXP.test(v))
          return null;
        return castType(val, 'regexp');
      },

      boolean: (v) => {
        if (!/^(true|false)$/.test(v))
          return null;
        return castType(v, 'boolean');
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
      return toDefault(result, def || val);

    // Check if there is a default value if nothing is defined.
    result = toDefault(result, def);

    // Ensure valid type.
    if (!is[type](result))
      log.error(`expected type ${colurs.cyan(type)} but got ${colurs.cyan(getType(type))}.`);

    return result;

  }

  /**
   * Find Option
   * Looks up an option by name, alias or position.
   *
   * @param key the key or alias name to find option by.
   */
  findOption(key: string | number): IPargvCommandOption {
    let option;
    for (const k in this.options) {
      const opt = this.options[k];
      const aliases = this.options[k].aliases;
      if (isString(key) && (key === k || contains(<string[]>aliases, key))) {
        option = opt;
        break;
      }
      else if (key === opt.position) {
        option = opt;
      }
    }
    return option;
  }

  /**
   * Alias To Name
   * Converts an alias to the primary option name.
   *
   * @param alias the alias name to be converted.
   */
  aliasToName(alias: string) {
    const opt = this.findOption(alias);
    return (opt && opt.name) || null;
  }

  validate(argv: any[]) {

    console.log();
    console.log(this._usage);
    console.log('arguments: ' + argv.join(' '));
    console.log();

    const opts = this.options;
    const stats: any = {
      commandsMissing: {},
      commandsRequiredCount: 0,
      commandsOptionalCount: 0,
      commandsMissingCount: 0,
      flagsMissing: {},
      flagsRequiredCount: 0,
      flagsOptionalCount: 0,
      flagsMissingCount: 0
    };

    let ctr = 0;
    const filteredCmds = [];

    argv.forEach((el, i) => {
      const opt = this.findOption(el);
      if (opt) {
        if (opt.flag && opt.type !== 'boolean')
          argv.splice(i + 1, 1);
      }
      if (!FLAG_EXP.test(el))
        filteredCmds.push(el);
    });

    console.log(filteredCmds);

    for (let p in opts) {

      const opt = opts[p];
      const names = [opt.name].concat(opt.aliases || []);

      // Don't process injected
      // debug options.
      if (/^--debug/.test(opt.name))
        continue;

      // Store required and optiona total counts.
      if (opt.required)
        opt.flag ? stats.flagsRequiredCount++ : stats.commandsRequiredCount++;
      else
        opt.flag ? stats.flagsOptionalCount++ : stats.commandsOptionalCount++;

      let hasOpt;

      if (opt.flag) {
        hasOpt = containsAny(argv, names);
        if (opt.required) {
          stats.flagsRequiredCount++;
          if (!hasOpt) {
            stats.flagsMissing[opt.name] = opt;
            stats.flagsMissingCount++;
          }
        }
      }
      else {


      }

      //console.log('match:', opt.name, names.join(', '), '-', hasOpt);

    }

    return stats;

  }

  /**
   * Command Count
   * Gets the total sub command count and total required.
   */
  commandStats() {
    let stats = {
      cmds: {
        required: [],
        requiredAny: [],
        total: []
      },
      flags: {
        required: [],
        requiredAny: [],
        total: []
      }
    };
    const cmds = stats.cmds;
    const flags = stats.flags;
    const opts = this.options;
    for (let p in opts) {
      const opt = opts[p];
      if (!opt.flag) {
        cmds.total.push(opt.name);
        if (opt.required) {
          cmds.required.push(opt.name);
          cmds.requiredAny = cmds.requiredAny.concat([opt.name].concat(opt.aliases || []));
        }
      }
      else {
        flags.total.push(opt.name);
        if (opt.required) {
          flags.required.push(opt.name);
          flags.requiredAny = flags.requiredAny.concat([opt.name].concat(opt.aliases || []));
        }
      }
    }
    return stats;
  }

  /**
   * Option
   * Adds option to command.
   *
   * @param val the option val to parse or option configuration object.
   * @param description the description for the option.
   * @param def the default value.
   * @param type the expression, method or type for validating/casting.
   */
  option(val: string | IPargvCommandOption, description?: string, def?: any, type?: string | RegExp | CastCallback) {
    if (isPlainObject(val)) {
      const opt = <IPargvCommandOption>val;
      if (!opt.name)
        log.error('cannot add option using name property of undefined.');
      extend(this.options[opt.name], opt);
    }
    else {
      const parsed: IPargvCommandOption = this.parseTokens(val as string)[0];
      parsed.description = description || parsed.description;
      parsed.default = def;
      type = type || parsed.type || (this.pargv.options.auto ? 'auto' : 'string');
      if (isString(type) || isRegExp(type))
        type = this.castToType.bind(this, type, def);
      if (!isString(type) && !isFunction(type))
        log.error('invalid cast type only string, RegExp or Callback Function are supported.');
      parsed.cast = <CastCallback | string>type;
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
        const type = this.pargv.options.auto ? 'auto' : 'string';
        this.options[d] = { name: d, required: true, aliases: [], type: type, flag: true };
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
    if (!fn) log.error('cannot add action with action method of undefined.');
    this.onAction = fn;
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

}

// PARGV CONTAINER //

export class Pargv {

  private _usage: string;
  private _parsed: any;
  private _suppress: boolean = false;

  commands: IPargvCommands = {};
  options: IPargvOptions;

  constructor(options?: IPargvOptions) {
    this.options = extend<IPargvOptions>({}, DEFAULTS, options);
    colurs = new Colurs({ enabled: this.options.colors });
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

    let cmdStr: string = '';
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
    const result: any = {
      cmd: '',
      cmds: [],
      flags: {},
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

    // Normalize the args/flags.
    argv = normalizeArgs(argv);

    // Don't shift if is a flag arg.
    if (!FLAG_EXP.test(argv[0]))
      cmdStr = result.cmd = argv.shift();

    // Lookup the command.
    const cmd = this.commands[cmdStr];
    const autoType = this.options.auto ? 'auto' : 'string';
    let ctr = 0;

    if (!cmd)
      log.error(`invalid command, the command ${cmdStr} was not found.`);

    // Validate the arguments.
    if (this.options.strict) {

    }

    const validation = cmd.validate(argv);
    // console.log(validation);

    // Iterate the args.
    argv.forEach((el, i) => {

      const nextId = i + 1;
      let next = argv[nextId];
      const isFlag = FLAG_EXP.test(el);
      // const prev = argv[i - 1];
      // const isPrevFlag = FLAG_EXP.test(prev || '');
      // const isNextFlag = FLAG_EXP.test(next || '');
      // const isShortFlag = FLAG_SHORT_EXP.test(el);
      // const isPrevShortFlag = FLAG_SHORT_EXP.test(prev);

      const isKeyVal = KEYVAL_EXP.test(next || '');

      // Lookup the defined option if any.
      const opt = isFlag ? cmd.findOption(el) : cmd.findOption(ctr);

      // No anonymous flags/commands allowed throw error.
      if (!opt)
        log.error(`unknown argument ${el} is NOT allowed in strict mode.`);

      // Is a flag.
      if (isFlag) {

        const key = el.replace(FLAG_EXP, '');
        const keyName = camelcase(opt.as || key);
        const isBool = !opt.as;

        const fn: CastCallback = opt.cast as CastCallback;
        const val = isBool ? true : fn(next);

        // If required and no value throw error.
        if (opt.required && !isValue(val))
          log.error(`command ${cmd.name} requires missing option ${opt.name}.`);

        if (isValue(val)) {
          // If the result is an object use extend
          // in case the object is built over multiple flags.
          if (isPlainObject(val))
            result.flags[keyName] = extend({}, result.flags[keyName], val);
          else
            result.flags[keyName] = val;
        }

        if (!isBool)
          argv.splice(next, 1);

      }

      // Is a sub command.
      else {

        const fn: CastCallback = opt.cast as CastCallback;
        const val = fn(el);
        result.cmds.push(val);

        // Update position counter.
        ctr++;

      }

    });

    return result;

  }

  /**
   * Exec
   * Parses arguments then executes command action if any.
   *
   * @param argv optional arguments otherwise defaults to process.argv.
   */
  exec(...argv: any[]) {
    const parsed: IPargvResult = this.parse(...argv);
    const cmd = this.commands[parsed.cmd];
    // We should never hit the following.
    if (!cmd)
      log.error(`whoops successfully parsed args but command ${parsed.cmd} could not be found.`);
    // Make clone of the sub commands.
    let cmds = parsed.cmds.slice(0);
    const stats = cmd.commandStats();
    let offset = stats.cmds.total.length - cmds.length;
    while (offset > 0 && offset--)
      cmds.push(null);
    if (isFunction(cmd.onAction))
      cmd.onAction(...cmds, parsed, cmd);
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
      ['Array', '- native array.']
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
