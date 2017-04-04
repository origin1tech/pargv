const extend = require('extend');
const path = require('path');
const cliui = require('cliui');
const figlet = require('figlet');
const chalk = require('chalk');
const prefix = require('global-prefix');

module.exports = (function () {

  'use strict';

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
    logCallback: undefined

  };

  // Parsers attempt to cast string to type by conditions.
  let parsers = {

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

    // Tests for RegExp like string.
    regexp: function (val) {
      if (/^\/.+\/(g|i|m)?([m,i]{1,2})?/.test(val)) {
        val = val.replace(/^\//, '').replace(/\/$/, '');
        return tryParseAs(val, RegExp);
      }
      return false;
    },

    // Tests for key/value type string.
    // example: 'key:value+key2:value2'
    // delimiter can be: + , * or =
    keyValue: function (val) {
      const self = this;
      const obj = {};
      const exp = /[a-zA-Z0-9]+:[a-zA-Z0-9]+/g;
      const match = val.match(exp);
      let tmp;
      if (!match || !match.length)
        return false;
      while ((tmp = exp.exec(val)) !== null) {
        const split = tmp[0].split(':');
        // Ensure the value is cast.
        obj[split[0]] = self.cast(split[1]);
      }
      return obj;
    }

  };

  function isUndefined(val) {
    return typeof val === 'undefined';
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
   * When debugging process.argv will
   * not contain the debug flag so we'll
   * detect it and inject in correct order.
   * NOTE: method is called before any index
   * adjustments are on arguments array.
   * @method injectDebug
   * @param  {array}    arr
   * @return {array}
   */
  function injectDebug(arr) {
    const _arr = [];
    // Get first arg.
    _arr.push(arr.shift());
    // Inject debug. This could be
    // --debug-brk but we just use
    // --debug.
    _arr.push('--debug');
    _arr.push(true);
    // Concat the arrays and return.
    _arr = _arr.concat(arr);
    return _arr;
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
   * @param {function} [fn] the callback function on logged.
   */
  function logger(level, colors, fn) {

    let _level = level || 3;

    let _colors = {
      error: 'red',
      warn: 'yellow',
      info: 'blue',
      debug: 'magenta'
    };

    const keys = Object.keys(_colors);

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
      _log.apply(console, args);

      // Call if on logged callback function.
      if (fn)
        fn(origType, origArgs, _logger);

      // Return the logger instance.
      return _logger;

    }

    // Gets/sets the loggers level.
    function level(lvl) {
      if (!lvl)
        return _level;
      _level = lvl;
      return _level;
    }

    // Exits the application.
    function exit(code) {
      if (isUndefined(code)) code = 0;
      if (!isUndefined(module) && module.exports)
        process.exit(code);
    }

    let _logger = {

      level: level,
      exit: exit,
      error: log.bind(this, 'error'),
      warn: log.bind(this, 'warn'),
      info: log.bind(this, 'info'),
      debug: log.bind(this, 'debug')

    };

    return _logger;

  }

  /**
   * Pargv Class
   * @class
   * @constructor
   * @returns {Pargv}
   */
  function Pargv() {

    const self = this;

    Object.defineProperties(this, {
      _static: { enumerable: false, writable: true, value: [] },
      _parsed: { enumerable: false, writable: true, value: {} },
      _customParsers: { enumerable: false, writable: true, value: {} },
      _parsers: { enumerable: false, writable: true, value: extend({}, parsers) },
      _source: { enumerable: false, writable: true, value: [] },
      _options: { enumerable: false, writable: true, value: JSON.parse(JSON.stringify(defaults)) },
      log: { enumerable: false, writable: true, value: logger(defaults.logLevel, null, defaults.logCallback) }
    })

    // Return Pargv instance.
    return this;

  }

  Pargv.prototype.ui = cliui.bind(cliui);
  Pargv.prototype.chalk = chalk;
  Pargv.prototype.figlet = figlet.bind(figlet);

  /**
   * Adds new parser to configuration.
   * @example
   * pargv.addParser('email', function (val) {
   * 	// return truthy value if success
   * 	// return false if failed to continue inspections.
   * });
   * @param  {string|object} name - the name of the parser to add or object of parsers.
   * @param  {function} fn - the function used for parsing.
   * @return {Pargv}
   */
  Pargv.prototype.addParser = function addParser(name, fn, modify) {

    // If is object extend.
    if (/^{/.test(JSON.stringify(name))) {
      this._customParsers = extend({}, this._customParsers, name);
      return this;
    }

    // If parser exists and not modifying throw error.
    if (this._customParsers[name] && !modify)
      throw new Error('Failed to add parser ' + name + ' the parser already exists. Did you mean to use pargv.modifyParser?');

    this._customParsers[name] = fn;

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
    if (index !== undefined && /^{/.test(JSON.stringify(index))) {
      options = index;
      index = undefined;
    }

    // Merge configuration options.
    this._options = extend({}, this._options, options);
    this._options.index = index !== undefined ? index : this._options.index;

    this.log = logger(this._options.logLevel, null, this._options.logCallback);

    // Return Pargv instance.
    return this;

  }

  /**
   * Parse the arguments.
   * @example
   * pargv.parse(['start', '-p', 3000 ]);
   * @param {string|object} [args] a string or array of arguments to parse.
   * @return {Objerct}
   */
  Pargv.prototype.parse = function parse(args) {

    const self = this;
    const pargs = { cmds: [] };
    const indexes = [];
    let options, idx,
      warn, next, key,
      tmpFlag, tmpCmd, prev, isDebug;

    // Test if we are debugging.
    isDebug = typeof v8debug !== 'undefined';

    options = this._options;

    // subtract one so we slice
    // at the correct index.
    // idx = options.index += -1;
    idx = options.index;

    // If args are statically
    // defined set flag to true.
    if (args) {
      if (typeof args === 'string')
        args = args.replace(/(\s,|,\s)/, ',').trim().split(',');
      this._static = true;
    }

    // Clone user or process args.
    args = [].concat(args || process.argv);

    // Check if is auto index.
    if (typeof idx === 'undefined')
      idx = 2;

    // Ensure index is 0 or greater.
    idx = idx < 0 ? 0 : idx;

    // Create clone of original args.
    this._source = [].concat(args);

    // Normalize args if debugging.
    if (isDebug)
      args = injectDebug(args);

    // Splice by index.
    args = args.splice(idx);

    // If setCommand first arg is command.
    if (!/^-/.test(args[0]) && options.setCommand !== false) {
      pargs.cmd = args.shift();
      if (pargs.cmd)
        pargs.cmd = path.parse(pargs.cmd).name;
    }

    // Iterate the args.
    args.forEach(function (k, i) {

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

          // check if flag is object like.
          const tmpObj = {};
          let tmpKeys, tmpKey;
          tmpFlag = self.cast(next) || next;

          // Is nested object.
          if (/\./.test(key)) {
            tmpKeys = key.split('.');
            tmpKey = tmpKeys.shift();
            pargs[tmpKey] = setObject({}, tmpKeys, tmpFlag);
          }

          // Looks like we want an object.
          else if (/^{}$/.test(next)) {
            pargs[key] = {};
          }

          else {
            pargs[key] = tmpFlag;
          }

          indexes.push(i + 1);

        }

        // Otherwise is simply boolean type flag.
        else {
          pargs[key] = true;
        }

      }

      // Otherwise is cmd or sub command.
      else {

        // Get previous argument.
        prev = args[i - 1];

        // If previous argument and not a flag parse & cast.
        if (prev && !isFlag(prev)) {
          // Cast and push the parsed argument.
          tmpCmd = self.cast(k) || k;
          pargs.cmds.push(tmpCmd);
          indexes.push(i);

        }

        // Otherwise is a cmd.
        else {
          if (indexes.indexOf(i) === -1) {
            tmpCmd = self.cast(k);
            pargs.cmds.push(tmpCmd);
          }
        }

      }

    });

    const parsedExec = path.parse(this._source[1] || '')

    // This is the path to node executeable.
    pargs.nodePath = this._source[0] || '';

    // This is the exec path to the node executable.
    pargs.execPath = this._source[1] || '';

    // This is the exec path stripped of exten and dir.
    pargs.exec = parsedExec.name;

    // Add modified argv source to object.
    pargs.source = this._source;

    // Save the parsed result.
    this._parsed = pargs;

    return pargs;

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
    if (this._options.castTypes === false)
      return val;

    const self = this;
    const keys = Object.keys(this._parsers);
    const custKeys = Object.keys(this._customParsers);

    let parsed, key, custKey, result;

    // Run if custom parsers.
    if (custKeys.length) {
      while (!result && custKeys.length) {
        custKey = custKeys.shift();
        result = self._customParsers[custKey].call(self, val);
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
      result = self._parsers[key].call(self, val);
    }

    // If result is still false set to original value.
    result = result || val;

    return result;

  };

  /**
   * Returns only flags from parsed object.
   * @example
   * pargv.getFlags();
   * @param  {object} [parsed] optional parsed object otherwise use this._parsed.
   * @return {object}
   */
  Pargv.prototype.getFlags = function getFalgs(parsed) {
    parsed = parsed || this._parsed;
    parsed = extend({}, parsed);
    delete parsed.cmd;
    delete parsed.cmds;
    delete parsed.source;
    delete parsed.nodePath;
    delete parsed.execPath;
    delete parsed.exec;
    return parsed;
  };

  /**
   * Check if has command.
   *
   * @param {*} val
   */
  Pargv.prototype.hasCmd = function hasCmd(val) {

    const self = this;
    const args = [].slice.call(arguments);

    parsed = this._parsed;

    if (!args.length)
      return false;

    // check if first arg is array.
    if (args[0] instanceof Array)
      args = args[0];

    if (args.length === 1)
      return parsed.cmds.indexOf(args[0]) >= 0;

    let found;

    while (found !== true && args.length) {
      const arg = args.shift();
      found = parsed.cmds.indexOf(arg) >= 0;
    }

    return found;

  }

  /**
   * Gets the .cmd or index in .cmds.
   * @param {number} [index] the index of the cmd to retrieve.
   */
  Pargv.prototype.getCmd = function getCmd(index) {

    if (typeof index === 'undefined')
      return this._parsed.cmd;

    return this._parsed.cmds[index];

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
    keys.forEach(function (k) {

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
    return [].concat(this._source).slice(2);
  }

  /**
   * Display Figlet Logo
   * @param {string|object} font the font string or figlet object.
   * @param {string} text the text to be displayed.
   * @param {string} [color] the color to colorize the logo with.
   * @returns {Pargv}
   */
  Pargv.prototype.logo = function logo(font, text, color) {
    let options = {
      horizontalLayout: 'default',
      verticalLayout: 'default'
    };
    if (typeof text === 'string') {
      options.font = font;
      options.text = text;
    }
    else {
      options = font;
      color = text;
      text = undefined;
    }
    text = figlet.textSync(options.text, options);
    if (color)
      text = chalk[color](text);
    console.log(text);
    return this;
  };

  /**
   * Resets configuration to default.
   * @returns {Pargv}
   */
  Pargv.prototype.reset = function reset() {
    this._static = false;
    this._source = [];
    this._options = extend({}, defaults);
    this._parsed = {};
    this._customParsers = {};
    return this;
  }

  // Create & return new Pargv instance.
  return new Pargv();

})();
