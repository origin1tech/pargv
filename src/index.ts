
import * as path from 'path';
import * as cliui from 'cliui';
import * as figlet from 'figlet';
import * as prefix from 'global-prefix';
import { Colurs, get as getColurs, IColurs } from 'colurs';
import { IPargvOptions, IMetadata, IFigletOptions, ILayoutOptions, IPargvCommandConfig, IMap, IPargvCommandOption, ActionCallback, ILayout, CoerceCallback, IPargvCommands, CastType, IPargvResult, IPargvOptionStats, AnsiStyles, ILogo, HelpCallback } from './interfaces';
import { extend, isString, isPlainObject, get, set, isUndefined, isArray, isDebug, contains, camelcase, keys, isBoolean, noop, isFunction, toArray, tryRequire, split, castType, getType, isRegExp, toDefault, containsAny, isValue, tryWrap, isNumber, isFloat, isInteger, isDate, last, duplicates, padLeft } from 'chek';

let colurs: IColurs;

const KEYVAL_EXP = /^((.+:.+)(\||\+)?)$/;
const CSV_EXP = /^(.+,.+){1,}$/;
const ARRAY_EXP = /^(.+(,|\||\s).+){1,}$/;
const JSON_EXP = /^"?{.+}"?$/;
const REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
const REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
const DOT_EXP = /^(.+\..+)$/;

const FLAG_EXP = /^--?/;
const FLAG_SHORT_EXP = /^-[a-zA-Z0-9]/;
const FLAG_NOT_EXP = /^(--no)?-{0,1}[0-9a-zA-Z]/;
const TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/;
const TOKEN_PREFIX_EXP = /^(--?|<|\[)/;

const SPLIT_CHARS = ['|', ',', ' '];
declare var v8debug;

const DEFAULTS: IPargvOptions = {
  strict: true,       // when true error message shown and exits for missing arguments.
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
 * Is Dot Notation
 * Tests if value is dot notated string.
 *
 * @param val the value to be inspected.
 */
function isDotNotation(val: any) {
  if (!isString(val)) return false;
  return /\..*\./.test(val) && !val.match(/\s/);
}

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

  private _depends: { name?: string[] } = {};

  _usage: string;
  _aliases: string[] = [];
  _name: string;
  _description: string = '';
  _examples: string[] = [];
  _action: ActionCallback = noop;

  pargv: Pargv;
  options: IMap<IPargvCommandOption> = {};

  constructor(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig, context?: Pargv) {

    if (!command)
      log.error('cannot define command using name of undefined.');

    if (isPlainObject(command)) {
      options = <IPargvCommandConfig>command;
      command = undefined;
    }

    if (isPlainObject(description)) {
      options = <IPargvCommandConfig>description;
      description = undefined;
    }

    // Normalize options.
    options = options || {};
    this.pargv = context;
    this._description = <string>description || options.description;
    this._aliases = isString(options.aliases) ? split(options.aliases, SPLIT_CHARS) : [];

    // Add in debug options.
    this.option('--debug, --debug-brk [port]');

    // Parse the Command.
    this.parseTokens(<string>command || options.command, true);

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
      const name = tmpCmd.shift();
      // Exclude help from this check allow overwriting.
      if (name !== 'help' && this.pargv.commands[name])
        log.error(`cannot add command`, colurs.yellow(`${name}`), `the command already exists.`);
      if (name === 'help')
        this.pargv.remove(name);
      this._name = name;
      if (tmpCmd.length)
        this._aliases = tmpCmd;
      usage.push(this._name);
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
      const type = parsed.type = parsed.type || (this.pargv.options.auto ? 'auto' : 'string');

      parsed.coerce = castToType.bind(null, type, null);

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

  /**
   * Stats
   * Validates the arguments to be parsed return stats.
   *
   * @param argv the array of arguments to validate.
   */
  stats(argv: any[]) {

    let clone = argv.slice(0);
    argv = argv.slice(0);

    const opts = this.options;
    const stats: IPargvOptionStats = {
      commandsMissing: [],
      commandsRequiredCount: 0,
      commandsOptionalCount: 0,
      commandsMissingCount: 0,
      flagsMissing: [],
      flagsRequiredCount: 0,
      flagsOptionalCount: 0,
      flagsMissingCount: 0,
      flagsDuplicates: []
    };

    let ctr = 0;
    const filteredCmds = [];
    const filteredFlags = [];

    // Filter out only commands no flags.
    argv.forEach((el, i) => {
      const opt = this.findOption(el);
      if (opt) {
        if (opt.flag) {
          if (opt.type !== 'boolean')
            argv.splice(i + 1, 1);
          filteredFlags.push(el);
        }
      }
      if (!FLAG_EXP.test(el))
        filteredCmds.push(el);
    });

    filteredFlags.sort().forEach((f, i) => {
      const prev = filteredFlags[i - 1];
      const next = filteredFlags[i + 1];
      if (stats.flagsDuplicates.indexOf(f) < 0 && (prev === f || next === f))
        stats.flagsDuplicates.push(f);
    });

    for (let p in opts) {

      let opt = opts[p];
      const names = [opt.name].concat(opt.aliases || []);

      // Don't process injected
      // debug options.
      if (/^--debug/.test(opt.name))
        continue;

      let hasOpt;

      if (opt.flag) {
        hasOpt = containsAny(argv, names);
        if (opt.required) {
          stats.flagsRequiredCount++;
          if (!hasOpt) {
            stats.flagsMissing.push(opt);
            stats.flagsMissingCount++;
          }
        }
        else {
          stats.flagsOptionalCount++;
        }
        clone = clone.filter((el, i) => {
          const tmpOpt = this.findOption(el);
          if (tmpOpt.flag && tmpOpt.type !== 'boolean')
            clone.splice(i + 1, 1);
          return !contains(names, el);
        });
      }

      else {
        hasOpt = filteredCmds[opt.position];
        if (opt.required) {
          stats.commandsRequiredCount++;
          if (!hasOpt) {
            stats.commandsMissing.push(opt);
            stats.commandsMissingCount++;
          }
        }
        else {
          stats.commandsOptionalCount++;
        }
        clone = clone.filter((el) => {
          return el !== hasOpt;
        });
      }

    }

    // Save any uknown args.
    stats.unknown = clone;

    return stats;

  }

  /**
   * Option
   * Adds option to command.
   *
   * @param val the option val to parse or option configuration object.
   * @param description the description for the option.
   * @param def the default value.
   * @param coerce the expression, method or type for validating/casting.
   */
  option(val: string | IPargvCommandOption, description?: string, def?: any, coerce?: string | RegExp | CoerceCallback) {
    if (isPlainObject(val)) {
      const opt = <IPargvCommandOption>val;
      if (!opt.name)
        log.error('cannot add option using name property of undefined.');
      extend(this.options[opt.name], opt);
    }
    else {
      const parsed: IPargvCommandOption = this.parseTokens(val as string)[0];
      parsed.description = description;
      parsed.default = def;
      coerce = coerce || parsed.type || (this.pargv.options.auto ? 'auto' : 'string');
      if (isString(coerce) || isRegExp(coerce))
        coerce = castToType.bind(null, coerce, def);
      if (!isString(coerce) && !isFunction(coerce))
        log.error('invalid cast type only string, RegExp or Callback Function are supported.');
      parsed.coerce = <CoerceCallback | string>coerce;
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
   * Parse
   * Parses the provided arguments inspecting for commands and options.
   *
   * @param argv the process.argv or custom args array.
   */
  parse(...argv: any[]) {
    return this.pargv.parse;
  }

  /**
   * Exec
   * Parses arguments then executes command action if any.
   *
   * @param argv optional arguments otherwise defaults to process.argv.
   */
  exec(...argv: any[]) {
    return this.pargv.exec;
  }

}

// PARGV CONTAINER //

export class Pargv {

  private _name: string;
  private _nameFont: string;
  private _nameStyles: AnsiStyles[];
  private _version: string;
  private _description: string;
  private _epilog: string;
  private _helpDisabled: boolean = false;
  private _helpHandler: HelpCallback;

  commands: IPargvCommands = {};
  options: IPargvOptions;

  constructor(options?: IPargvOptions) {

    this.options = extend<IPargvOptions>({}, DEFAULTS, options);
    colurs = new Colurs({ enabled: this.options.colorize });

    // Set default help handler.
    this._helpHandler = (command?: string) => {
      if (this._helpDisabled === true)
        return;
      return this.compileHelp(command).get();
    };

    // Enable help command.
    this.command('help.h')
      .action(this.showHelp.bind(this));

    // Add catch all command.
    this.command('*', null)

  }

  // PRIVATE

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

      const optKeys = keys(cmd.options);
      let flagCt = 0;
      let cmdCt = 0;

      layout.section(<string>colurs.applyAnsi('Commands:', accent));

      // Build sub commands.
      optKeys.forEach((k) => {
        const opt = cmd.options[k];
        if (!opt.flag) {
          buildOption(opt);
          cmdCt++;
        }
      });

      if (!cmdCt)
        layout.div(colurs.applyAnsi('  none', muted));

      layout.section(<string>colurs.applyAnsi('Flags:', accent));

      // Build flags.
      optKeys.forEach((k) => {
        const opt = cmd.options[k];
        if (opt.flag) {
          buildOption(opt);
          flagCt++;
        }
      });

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
        if (this._description)
          layout.div(`${colurs.applyAnsi('Description:', accent)} ${padLeft(this._description, 3)}`);

        // Add version to layout.
        if (this._version)
          layout.div(`${colurs.applyAnsi('Version:', accent)} ${padLeft(this._version, 7)}`);

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

  // GETTERS

  /**
   * UI
   * Alias to layout for backward compatibility.
   */
  get ui() {
    return this.layout;
  }

  // USAGE & COMMANDS //

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
    this._nameStyles = toArray<AnsiStyles>(styles, []);
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
   * @param val the description string.
   */
  description(val: string) {
    this._description = val;
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

  /**
   * Command
   * Creates new command configuration.
   *
   * @param command the command to be matched or options object.
   * @param description the description or options object.
   * @param options options object for the command.
   */
  command(config: IPargvCommandConfig): PargvCommand;
  command(command: string): PargvCommand;
  command(command: string, config: IPargvCommandConfig): PargvCommand;
  command(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig): PargvCommand {
    const cmd = new PargvCommand(command, description, options, this);
    this.commands[cmd._name] = cmd;
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
    const isExec = last(argv) === '__exec__' ? argv.pop() : null;

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
    let ctr = 0;

    if (!cmd)
      log.error(`invalid command, the command ${cmdStr} was not found.`);

    const stats = cmd.stats(argv);

    // Check if strict parsing is enabled.
    if (this.options.strict && (stats.flagsMissingCount || stats.commandsMissingCount)) {
      if (stats.commandsMissingCount) {
        const missing = stats.commandsMissing[0];
        log.error(`missing required command or subcommand - ${missing.name}.`);
      }
      if (stats.flagsMissingCount) {
        const missing = stats.flagsMissing[0];
        log.error(`missing required flag or option - ${missing.name}.`);
      }
    }

    // Check if duplicate flags are allowed.
    if (!this.options.dupes && stats.flagsDuplicates.length) {
      log.error(`whoops duplicate flags are prohibited, found duplicates - ${stats.flagsDuplicates.join(', ')}.`);
    }

    // Iterate the args.
    argv.forEach((el, i) => {

      const nextId = i + 1;
      let next = argv[nextId];
      const isFlag = FLAG_EXP.test(el);
      const isKeyVal = KEYVAL_EXP.test(next || '');
      const isFlagNext = FLAG_EXP.test(next || '');

      // Lookup the defined option if any.
      const opt = isFlag ? cmd.findOption(el) : cmd.findOption(ctr);

      // No anonymous flags/commands allowed throw error.
      if (!opt && this.options.strict)
        log.error(`unknown argument ${el} is NOT allowed in strict mode.`);

      const isNot = FLAG_NOT_EXP.test(el) ? true : false;
      el = isNot ? el.replace(/^--no/, '') : el;
      const key = el.replace(FLAG_EXP, '');
      const keyName = camelcase((opt && opt.as) || key);
      const isBool = (opt && !opt.as) || (!opt && (isFlagNext || !next));
      const type = this.options.auto ? 'auto' : 'string';
      const fn: CoerceCallback = !opt ? castToType.bind(null, type, next) : opt.coerce as CoerceCallback;

      // Is a flag.
      if (isFlag) {

        const val = isBool ? true : fn(next, opt, cmd);

        // If required and no value throw error.
        if (opt.required && !isValue(val))
          log.error(`command ${cmd._name} requires missing option ${opt.name}.`);

        if (isValue(val)) {

          // If the result is an object use extend
          // in case the object is built over multiple flags.
          if (isPlainObject(val) || isDotNotation(key)) {

            if (isDotNotation(key))
              set(result.flags, key, val);
            else
              result.flags[keyName] = extend({}, result.flags[keyName], val);

          }
          else {
            result.flags[keyName] = val;
          }

        }

        if (!isBool)
          argv.splice(next, 1);

      }

      // Is a sub command.
      else {

        const val = fn(el, opt, cmd);

        if (isValue(val))
          result.cmds.push(val);

        // Update position counter.
        ctr++;

      }


    });

    // If called from exec pad
    // cmds array for use with spread.
    if (isExec) {
      const totalArgs = stats.commandsOptionalCount + stats.commandsRequiredCount;
      let offset = totalArgs - result.cmds.length;
      while (offset > 0 && offset--)
        result.cmds.push(null);
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
    const parsed: IPargvResult = this.parse(...argv, '__exec__');
    const cmd = this.commands[parsed.cmd];

    if (isFunction(cmd._action))
      cmd._action(...parsed.cmds, parsed, cmd);
  }

  /**
   * Help
   * Helper method for defining custom help text.
   *
   * @param val callback for custom help or boolean to toggle enable/disable.
   */
  help(disabled: boolean): Pargv;
  help(fn: boolean | HelpCallback) {
    if (isBoolean(fn)) {
      this._helpDisabled = <boolean>fn;
    }
    else if (isFunction(fn)) {
      this._helpDisabled = undefined;
      this._helpHandler = (command) => {
        return (fn as HelpCallback)(command, this.commands);
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
    const name = isPlainObject(command) ? (command as PargvCommand)._name : command;
    const help = this._helpHandler(<string>name, this.commands);
    console.log(help);
    console.log();
  }

  /**
   * Remove
   * Removes an existing command from the collection.
   *
   * @param cmd the command name to be removed.
   */
  remove(cmd: string) {
    delete this.commands[cmd];
  }

  // EXTENDED METHODS

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

    let options = isPlainObject(text) ? <IFigletOptions>text : {
      text: text,
      font: font
    };

    // Merge the options.
    options = extend({}, defaults, options);

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
      align = toArray<number>(align);
      const isLast = align.length === 1;
      const lastIdx = elements.length - 1;
      elements = elements.map((el, i) => {
        if (isLast && i < lastIdx)
          return el;
        let dir = !isLast ? align[i] : align[0];
        if (!dir || dir === null || dir === -1)
          return el;
        dir = flowMap[dir];
        if (isPlainObject(el))
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
      if (isNumber(padding))
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

let instance: Pargv;

function createInstance(options?: IPargvOptions): Pargv {
  if (!instance)
    instance = new Pargv(options);
  return instance;
}

export { createInstance as get };
