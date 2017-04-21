const extend = require('extend');
const path = require('path');
const figlet = require('figlet');
const Chalk = require('chalk').constructor;
const cliui = require('cliui');
const prefix = require('global-prefix');

const keyValExp = /^([a-zA-Z0-9]+:[a-zA-Z0-9]+,?)+$/g;
const csvExp = /^(.+,.+){1,}$/g;
const regexExp = /^\/.+\/(g|i|m)?([m,i]{1,2})?/;

let chalk, log;

// Default values.
let defaults = {

  // The index to splice the process.argv at.
  // When undefined Pargv will auto splice assuming
  // the primary command is the third argument.
  // The first is the node path, the second is
  // the executed file or module with the third
  // being the primary command. Alternatively you
  // can specify an index to parse the process.argv
  // and Pargv will define the exec and cmd based
  // on the resulting array of elements.
  //
  // example:
  // below results in 'exec' being 'file' and
  // 'cmd' would be 'start'
  //
  // bash$ node /exec/file start
  //
  // example:
  // below results in 'exec' being 'mymodule' and
  // 'cmd' would be 'start'
  //
  // bash$ mymodule start
  index: undefined,

  // When not false assumes 1 argument after adjusting for
  // node path and above index is the primary command.
  setCommand: undefined,

  // When NOT false data types are cast.
  castTypes: undefined,

  // When NOT false colors are used for logger.
  colors: undefined,

  // Simple built in colorized logger for free.
  // log types are error, warn, info, debug with
  // error being level 1 and debug 4.
  logLevel: 3,

  // Callback called on log, Useful
  // for calling back to say write to
  // to file. Very easily done.
  //
  // const writer = createWriteStream('/my/log.txt', { /* flags */ });
  //
  // The callback from logger returns the type of log message
  // the args passed as an array and the logger instance.
  // the below simply joins the log params as a csv and writes.
  //
  // when done be sure to call write.close();
  //
  // function onLogged(type, args, logger) {
  //  args.unshift(type);
  //  writer.write(args.join(','))
  // }
  //
  logCallback: undefined,

  // When NOT false actions are called
  // on parse when a matching command is found.
  autoActions: undefined

};

///////////////////////////////
// PARSERS
///////////////////////////////

let parsers = {

  // Tests for key/value type string.
  // example: 'key:value|key2:value2'
  // delimiter can be: | or ,
  keyValue: function (val) {
    const obj = {};
    const exp = keyValExp;
    const match = val.match(exp);
    let tmp;
    let arr = [val];

    if (!match || !match.length)
      return false;

    if (val.indexOf('|') > -1)
      arr = val.split('|');

    else if (val.indexOf(',') > -1)
      arr = val.split(',');

    while (arr.length) {
      const split = arr.shift().split(':');
      // Ensure the value is cast.
      obj[split[0]] = this.cast(split[1]);
    }
    return obj;
  },

  // Tests for JSON like string.
  // JSON is a bit tricky due to how
  // quotes are parsed in commands
  // must be in format of:
  // '"{ "age": 25 }"'
  // note the singe then double
  // quote encapsulation.
  json: function (val) {
    if (/^"?{.+}"?$/.test(val)) {
      val = val.replace(/^"/, '').replace(/"$/, '');
      return tryParseAs(val, 'json');
    }
    return false;
  },

  // Check if is csv like string that
  // can be split to array then cast
  // values to type.
  array: function (val) {
    if (!csvExp.test(val))
      return false;
    const arr = val.trim().split(',');
    arr.forEach((v, i) => {
      arr[i] = this.cast(v);
    });
    return arr;
  },

  // Tests for RegExp like string.
  regexp: function (val) {
    if (regexExp.test(val)) {
      val = val.replace(/^\//, '').replace(/\/$/, '');
      return tryParseAs(val, RegExp);
    }
    return false;
  },

  // Attempts to parse Date.
  date: function (val) {
    // looks like a number return false.
    if (/^\d+(\.\d+)?$/.test(val))
      return false;
    var d = tryParseAs(val, Date);
    if (d !== 'Invalid Date' && !isNaN(d))
      return d;
    return false;
  },

  // Attempts to parse Number.
  number: function (val) {
    const n = tryParseAs(val, 'number');
    if (isNaN(n))
      return false;
    return n;
  },

  // Check if is true or false.
  boolean: function (val) {
    const likeBool = /^(true|false)$/.test(val);
    if (!likeBool)
      return false;
    return val == 'true';
  }

};

///////////////////////////////
// UTILS
///////////////////////////////

function isUndefined(val) {
  return typeof val === 'undefined';
}

function isPlainObject(val) {
  if (!val)
    return false;
  return val.constructor === {}.constructor;
}

function isGlobalExec(str) {
  const exp = new RegExp('^' + prefix, 'i');
  return exp.test(str);
}

/**
 * Method for casting using try catch.
 * @example
 * tryParseAs('25', Number);
 * @private
 * @param  {string} val the native JavaScript data type to cast to.
 * @param  {function} Type the native function used to cast value.
 * @return {boolean|*}
 */
function tryParseAs(val, Type) {
  try {
    if (Type === 'json')
      return JSON.parse(val);
    if (Type === 'number')
      return parseFloat(val);
    return new Type(val);
  } catch (e) {
    return false;
  }
}

/**
 * Tests of argument is a flag type.
 * @example
 * isFlag('-m');
 * @private
 * @param  {*} val the value to test for flag.
 * @return {boolean}
 */
function isFlag(val) {
  return /^(-|--)[a-zA-Z0-9]+/.test(val);
}

/**
 * Strips dashes from string for flags.
 * @example
 * stripFlag('--save');
 * @private
 * @param  {string} val the string flag to be stripped.
 * @return {string}
 */
function stripFlag(val) {
  return val.replace(/^(-|--)/, '');
}

/**
 * Try to detect deubgging if v8Debug or
 * --debug in process.execArgv then push
 * to array.
 * @method injectDebug
 * @param  {array}    arr
 * @return {array}
 */
function injectDebug(arr) {

  const hasV8 = typeof v8debug !== 'undefined';
  const debugFlag = process.argv.filter((arg) => {
    return /^--debug.*/.test(arg);
  })[0];

  if (hasV8) {
    arr.push('--debug');
    arr.push(true);
  }
  else if (debugFlag) {
    if (debugFlag.indexOf('=') > -1) {
      const split = debugFlag.split('=');
      arr.push(split[0]);
      arr.push(split[1]);
    }
    else {
      arr.push(debugFlag);
      arr.push(true);
    }
  }

  return arr;

}

/**
 * Sets nested value in object.
 * When "dynamic" is not false an
 * empty value is set with {}.
 * @method setObject
 * @param  {object} obj
 * @param  {string} path
 * @param  {*} value
 * @param  {boolean} dynamic
 * @return {array}
 */
function setObject(obj, path, value, dynamic) {

  if (typeof path === 'string')
    path = path.split('.');

  if (!path.length)
    return;

  if (dynamic !== false && typeof value === 'undefined')
    value = {};

  if (path.length > 1) {
    setObject(obj[path.shift()] = {}, path, value);
  }

  else {
    obj[path[0]] = value;
  }

  return obj;

}

/**
 * Logger
 * Creates a simple logger.
 *
 * Default level is 3 which is "info"
 * with error being 1 and debug 4.
 *
 * Default color map.
 *  {
 *   error: 'red',
 *   warn: 'yellow',
 *   info: 'blue',
 *   debug: 'magenta'
 *  }
 *
 * @param {number} [level] the log level of the logger.
 * @param {object} [colors] the color map of the logger.
 * @param {boolean} [trace] when NOT false stack trace is added to log messages.
 * @param {function} [fn] the callback function on logged.
 */
function logger(level, colors, trace, fn) {

  let _level = level || 3;
  let _trace;

  let _colors = {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    debug: 'magenta'
  };

  if (isPlainObject(level)) {
    colors = level;
    level = undefined;
  }

  else if (typeof level === 'boolean') {
    trace = level;
    level = undefined;
  }

  else if (typeof level === 'function') {
    fn = level;
    level = undefined;
  }

  if (typeof colors === 'boolean') {
    fn = trace;
    trace = colors;
    colors = undefined;
  }

  else if (typeof colors === 'function') {
    fn = colors;
    colors = undefined;
    trace = undefined;
  }

  if (typeof trace === 'function') {
    fn = trace;
    trace = undefined;
  }

  // Gets stack trace info from callsite.
  function getStackTrace(id) {
    id = id >= 0 ? id : 1;
    const orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function (_, stack) { return stack; };
    const err = new Error;
    Error.captureStackTrace(err, arguments.callee);
    const stack = err.stack;
    Error.prepareStackTrace = orig;
    const parsed = path.parse(stack[1].getFileName());
    return '(' + stack[id].getLineNumber() + ':' +
      stack[id].getColumnNumber() + ' ' +
      parsed.base + ')';
  }

  // Gets/sets the loggers level.
  function logLevel(lvl) {
    if (isUndefined(lvl))
      return _level;
    _level = lvl;
    return _level;
  }

  // Gets/sets trace enabled.
  function stackTrace(trc) {
    if (isUndefined(trc))
      return _trace;
    _trace = trc;
    return _trace;
  }

  // Exits the application.
  function exit(code) {
    if (isUndefined(code)) code = 0;
    if (!isUndefined(module) && module.exports)
      process.exit(code);
  }

  const keys = Object.keys(_colors);

  if (trace !== false)
    _trace = true;

  if (colors)
    _colors = colors;

  function log(type, msg) {

    const idx = keys.indexOf(type) + 1;

    if (idx > _level)
      return;

    let _log = console.log;
    const args = [].slice.call(arguments, 1);
    const origArgs = [].slice.call(args, 0);
    const origType = type;
    const color = _colors[type];
    args.unshift(chalk[color](type + ':'));
    if (console[origType])
      _log = console[origType];
    // Check if should add stacktrace.
    if (_trace) {
      const stack = getStackTrace(1);
      args.push(stack);
      origArgs.push(stack);
    }
    _log.apply(console, args);

    // Call if on logged callback function.
    if (fn)
      fn(origType, origArgs, _logger);

    // Return the logger instance.
    return _logger;

  }

  let _logger = {

    level: logLevel,
    trace: stackTrace,
    exit: exit,
    write: function () {
      const args = [].slice.call(arguments, 0);
      console.log.apply(console, args);
      return _logger;
    },
    error: log.bind(this, 'error'),
    warn: log.bind(this, 'warn'),
    info: log.bind(this, 'info'),
    debug: log.bind(this, 'debug')

  };

  return _logger;

}

///////////////////////////////
// PARGV
///////////////////////////////

/**
 * Pargv Class
 * @class
 * @constructor
 * @returns {Pargv}
 */
function Pargv(index, options) {

  Object.defineProperties(this, {
    customParsers: { enumerable: false, writable: true, value: {} },
    options: { enumerable: false, writable: true, value: JSON.parse(JSON.stringify(defaults)) },
    actions: {
      enumerable: false, writable: true, value: {}
    },
    parsed: { enumerable: false, writable: true, value: false }
  })

  this.cmd = ''
  this.cmds = [];
  this.source = [];
  this.nodePath = '';
  this.execPath = '';
  this.globalPath = '';

  // Init chalk this may be overridden in configure.
  chalk = new Chalk();

  // Init the logger.
  log = logger(defaults.logLevel, null, defaults.logCallback);

  // Return Pargv instance.
  return this.configure(index, options);

}

/**
 * Adds new parser to configuration.
 * @example
 * pargv.addParser('email', function (val) {
 * 	// return truthy value if success
 * 	// return false if failed to continue inspections.
 * });
 * @param  {string|object} name the name of the parser to add or object of parsers.
 * @param  {function} fn the function used for parsing.
 * @param  {boolean} [overwrite] when true overwrites existing.
 * @return {Pargv}
 */
Pargv.prototype.addParser = function addParser(name, fn, overwrite) {

  // If is object extend.
  if (/^{/.test(JSON.stringify(name))) {
    extend(this.customParsers, name);
    return this;
  }

  // If parser exists and not modifying throw error.
  if (this.customParsers[name] && !overwrite)
    return log.warn('failed to add parser ' + name + ' the parser already exists. Did you mean to pass true to overwrite?');

  this.customParsers[name] = fn;

  return this;

}

// DEPRECATED USE addParser.
Pargv.prototype.modifyParser = Pargv.prototype.addParser;

/**
 * Configures Pargv.
 * @example
 * pargv.configure(3, {// your options });
 * @param  {number|object} [index] index of command or object of options.
 * @param  {object} [options] [description]
 * @return {Pargv}         [description]
 */
Pargv.prototype.configure = function configure(index, options) {

  // Allow options as first param.
  if (index !== undefined && typeof index !== 'number') {
    options = index;
    index = undefined;
  }

  // Merge configuration options.
  this.options = extend({}, this.options, options);
  this.options.index = index !== undefined ? index : this.options.index;

  if (this.options.colors === false)
    chalk = new Chalk({ enabled: false });

  log = logger(this.options.logLevel, null, this.options.logCallback);

  // Return Pargv instance.
  return this;

}

/**
 * Parse the arguments.
 * @param {array} args
 * @return {object}
 */
Pargv.prototype.parse = function parse(args) {

  let help;

  if (typeof args === 'boolean') {
    args = undefined;
    help = true;
  }

  // const self = this;
  // const pargs = { cmds: [] };
  const indexes = [];
  let options, idx,
    warn, next, key,
    tmpFlag, tmpCmd, prev, isDebug;

  // Test if we are debugging.
  isDebug = typeof v8debug !== 'undefined';

  options = this.options;

  // subtract one so we slice
  // at the correct index.
  // idx = options.index += -1;
  idx = options.index;

  // used passed or process args.
  args = [].concat(args || process.argv);

  // Check if executed file is executed from
  // a global node module.
  const globalExp = new RegExp('^' + prefix, 'i');
  this.isGlobalExec = globalExp.test(args[1]);

  // Check if is auto index.
  if (typeof idx === 'undefined')
    idx = 2;

  // Ensure index is 0 or greater.
  idx = idx < 0 ? 0 : idx;

  // Create clone of original args.
  this.source = [].concat(args);

  // If debugging inject args.
  args = injectDebug(args);

  // Splice by index.
  args = args.splice(idx);

  // If setCommand first arg is command.
  if (!/^-/.test(args[0]) && options.setCommand !== false) {
    this.cmd = args.shift();
    if (this.cmd)
      this.cmd = path.parse(this.cmd).name;
  }

  // Iterate the args.
  args.forEach((k, i) => {

    // Check if is flag.
    if (isFlag(k)) {

      // flags with single "-" are just boolean
      // flags, flags with "--" require a value.
      const isFlagBool = /^-[a-zA-Z0-9]/.test(k);

      // Get next argument.
      next = args[i + 1];

      // Replace flag prefix.
      key = k.replace(/^-{1,2}/g, '');

      // Index has been parsed.
      indexes.push(i);

      // If next argument not flag then parse cast value
      // as this flag requires a value.
      if (next && !isFlag(next) && !isFlagBool) {

        const isFlagKeyVal = keyValExp.test(next);

        // check if flag is object like.
        const tmpObj = {};
        let tmpKeys, tmpKey;
        tmpFlag = this.cast(next) || next;

        // Is nested object.
        if (/\./.test(key)) {
          tmpKeys = key.split('.');
          tmpKey = tmpKeys.shift();
          this[tmpKey] = this[tmpKey] || {};
          const tmpObj = setObject({}, tmpKeys, tmpFlag);
          extend(this[tmpKey], tmpObj);
        }

        else if (isFlagKeyVal) {
          this[key] = this[key] || {};
          extend(this[key], tmpFlag);
        }

        // Looks like we want an object.
        else if (/^{}$/.test(next)) {
          this[key] = {};
        }

        else {
          this[key] = tmpFlag;
        }

        indexes.push(i + 1);

      }

      // Otherwise is simply boolean type flag.
      else {
        this[key] = true;
      }

    }

    // Otherwise is cmd or sub command.
    else {

      // Get previous argument.
      prev = args[i - 1];

      // If previous argument and not a flag parse & cast.
      if (prev && !isFlag(prev)) {
        // Cast and push the parsed argument.
        tmpCmd = this.cast(k) || k;
        this.cmds.push(tmpCmd);
        indexes.push(i);

      }

      // Otherwise is a cmd.
      else {
        if (indexes.indexOf(i) === -1) {
          tmpCmd = this.cast(k);
          this.cmds.push(tmpCmd);
        }
      }

    }

  });

  const parsedExec = path.parse(this.source[1] || '')

  // This is the path to node executeable.
  if (this.source[0].indexOf('/') !== -1)
    this.nodePath = this.source[0] || '';

  // This is the exec path to the node executable.
  if (this.source[0].indexOf('/') !== -1)
    this.execPath = this.source[1] || '';

  this.globalPath = prefix;

  // This is the exec path stripped of exten and dir.
  this.exec = parsedExec.name;

  // Get an array of commands from action keys.
  const actionKeys = Object.keys(this.actions);

  // Action found.
  let action = this.actions[this.cmd];

  // If not action check for catch all.
  if (isUndefined(action) && this.actions['*'])
    action = this.actions['*'];

  this.parsed = true;

  if (typeof action !== 'undefined' && this.options.autoActions !== false && !help)
    return action();

  return this;

}

/**
 * Inspects and casts a string value to detected type.
 * @example
 * pargv.cast('true');
 * @param  {string} val the value to be cast.
 * @return {*}
 */
Pargv.prototype.cast = function cast(val) {

  // Do not process if casting is disabled.
  if (this.options.castTypes === false)
    return val;

  const keys = Object.keys(parsers);
  const custKeys = Object.keys(this.customParsers);

  let parsed, key, custKey, result;

  // Run if custom parsers.
  if (custKeys.length) {
    while (!result && custKeys.length) {
      custKey = custKeys.shift();
      result = this.customParsers[custKey].call(this, val);
    }
  }

  // If known type immediately return.
  if (typeof val === 'number' ||
    typeof val === 'boolean' ||
    typeof val === 'date' ||
    (val instanceof RegExp) ||
    (typeof val === 'object' && val !== null)) {
    return val;
  }

  // If a string trim.
  if (typeof val === 'string')
    val = val.trim();
  // Iterate until some returns truthy value.
  while (!result && keys.length) {
    key = keys.shift();
    result = parsers[key].call(this, val);
  }

  // If result is still false set to original value.
  result = result || val;

  return result;

};

/**
 * Returns only flags from parsed object.
 * @example
 * pargv.getFlags();
 * @return {object}
 */
Pargv.prototype.getFlags = function getFlags() {

  const exclude = ['cmd', 'cmds', 'source', 'nodePath', 'execPath', 'globalPath'];
  const keys = Object.keys(JSON.parse(JSON.stringify(this)))
  const obj = {};

  keys.forEach((k) => {
    if (exclude.indexOf(k) === -1)
      obj[k] = this[k];
  });

  return obj;

};

/**
 * Check if has command.
 *
 * @param {*} val
 */
Pargv.prototype.hasCmd = function hasCmd(val) {

  const args = [].slice.call(arguments);

  if (!args.length)
    return false;

  // check if first arg is array.
  if (args[0] instanceof Array)
    args = args[0];

  if (args.length === 1)
    return this.cmds.indexOf(args[0]) >= 0;

  let found;

  while (found !== true && args.length) {
    const arg = args.shift();
    found = this.cmds.indexOf(arg) >= 0;
  }

  return found;

}

/**
 * Gets the .cmd or index in .cmds.
 * @param {number} [index] the index of the cmd to retrieve.
 */
Pargv.prototype.getCmd = function getCmd(index) {

  if (typeof index === 'undefined')
    return this.cmd;

  return this.cmds[index];

};

/**
 * Flags to Array
 *
 * Using parsed object will get flags only then
 * convert to an array of elements in array.
 * It is important to NOT include prefixes such as
 * "-" or "--" in your defaults object. By default
 * stripQuotes is off by default. Often when converting
 * flags to an array you need quotes removed for passing
 * to an .exec or .spawn for example.
 *
 * @example
 * pargv.flagsToArray();
 * pargs.flagsToArray({ // your defaults }, true)
 *
 * @param  {object|boolean} [defaults] object containing defaults for matched flags.
 * @param  {boolean} [stripQuotes] when true strings are stripped of quotes.
 * @return {array}
 */
Pargv.prototype.flagsToArray = function flagsToArray(defaults, stripQuotes) {

  const flags = this.getFlags();
  const arr = [];
  let flag, keys;

  // Enable wrapQuotes as first argument.
  if (typeof defaults === 'boolean') {
    stripQuotes = defaults;
    defaults = undefined;
  }

  // Simple function to return
  function getFlagPrefix(f) {
    if (f.length > 1)
      return '--' + f;
    return '-' + f;
  }

  // Ensure value defaults object.
  if (typeof defaults !== 'object')
    defaults = {};

  // Useful when you want to have a flag default to a value.
  flags = extend({}, defaults, flags);

  // Get an array of flag keys.
  keys = Object.keys(flags);

  // Iterate keys and build array.
  keys.forEach((k) => {

    flag = flags[k];

    // Get key prefix.
    k = getFlagPrefix(k);

    arr.push(k);

    // push flag only.
    if (flag !== true) {

      if (typeof flag === 'string' && !stripQuotes) {
        flag = flag.replace(/^('|")/, '').replace(/('|")$/, '');
        flag = '"' + flag + '"';
      }

      arr.push(flag);

    }

  });

  return arr;
};

/**
 * Flags to String
 *
 * @param {object|string} defaults object containing defaults for matching flags.
 * @param {string} char a string character used to join flags array to string.
 * @returns {string}
 */
Pargv.prototype.flagsToString = function flagsToString(defaults, char) {
  if (typeof defaults === 'string') {
    char = defaults;
    defaults = undefined;
  }
  return this.flagsToArray.call(this, defaults, true).join(char || ' ');
};

/**
 * Strip Exec
 * Strips node and exec paths from source argv.
 * @returns {array}
 */
Pargv.prototype.stripExec = function () {
  return [].concat(this.source).slice(2);
}

/**
 * Fonts
 * Returns list of Figlet fonts.
 */
Pargv.prototype.fonts = function fonts() {
  return figlet.fontsSync();
};

/**
 * Logo
 * Displays Ascii Logo.
 *
 * @param {string|object} font the font string or figlet object.
 * @param {string} text the text to be displayed.
 * @param {string} [color] the color to colorize the logo with.
 * @returns {Pargv}
 */
Pargv.prototype.logo = function logo(text, color, font) {

  let options = {
    horizontalLayout: 'default',
    verticalLayout: 'default'
  };

  // If not string assume options config.
  if (typeof text !== 'string') {
    options = font;
    options.color = options.color || 'blue';
    options.font = options.font || 'Doom';
  }


  else {
    options.text = text;
    options.font = font;
    options.color = color;
  }

  options.font = options.font || 'Doom';
  options.color = options.color || 'white';
  options.color = options.color.toLowerCase();

  text = figlet.textSync(options.text, options);

  if (options.color)
    text = chalk[options.color](text);

  console.log(text);

  return this;

};

/**
 * Action
 * Adds action to be called when matching command.
 * Context is bound for convenience.
 *
 * @param {string} cmd the command name to match.
 * @param {string|array|function} alias alias or function for command.
 * @param {function} [fn] the callback to be called on match.
 * @returns {Pargv}
 */
Pargv.prototype.action = function action(cmd, alias, fn) {

  if (typeof alias === 'function') {
    fn = alias;
    alias = [];
  }

  else if (typeof alias === 'string') {
    alias = alias.trim().replace(/\s/g, '').split(',');
  }

  alias = alias || [];
  this.actions[cmd] = fn;

  alias.forEach((a) => {
    this.actions[a] = this.actions[cmd];
  });

  return this;

};

/**
 * UI
 * Exposes cliui methods with some handy wrappers.
 *
 * @see: https://github.com/yargs/cliui
 *
 * @param {number} width the width of the help ui.
 * @returns {Pargv}
 */
Pargv.prototype.ui = function ui(width) {

  let _ui = cliui({ width: width || 80 });
  let methods;

  // call parse.
  if (!this.parsed)
    this.parse();

  function div() {
    _ui.div.apply(_ui, arguments);
    return methods;
  }

  function span() {
    _ui.span.apply(_ui, arguments);
    return methods;
  }

  function join() {
    // allows for passing array as first arg.
    let args = arguments[0];
    if (typeof arguments[0] === 'string')
      args = [].slice.call(arguments, 0);
    div(args.join(' '));
    return methods;
  }

  // When display is false just returns
  // ui so .toString() can be called man.
  function show(display) {
    if (display === false)
      return _ui;
    console.log(_ui.toString());
    console.log();
  }

  // wrapping cliui methods simply
  // for chaning nothing special here.
  methods = {
    div: div,
    span: span,
    join: join,
    show: show
  };

  return methods;

};

/**
 * Resets configuration to default.
 * @returns {Pargv}
 */
Pargv.prototype.reset = function reset() {
  this.options = extend({}, defaults);
  this.customParsers = {};
  this.cmd = '';
  this.cmds = []
  this.source = [];
  this.nodePath = '';
  this.execPath = '';
  this.exec = '';
  this.globalPath = '';
  this.isGlobalExec = undefined;
  this.parsed = false;
  return this;
}

module.exports = {
  Pargv,
  logger,
  Chalk
};

