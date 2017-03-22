var extend = require('extend');
var path = require('path');

module.exports = (function () {

  'use strict';

  // Default values.
  var defaults = {

    // Index of primary command.
    // Typically you want this at 2
    // because you want to ignore node
    // path. This will result in the command
    // being the file called. Set to 0 in .configure
    // if you wish to parse all arguments.
    index: 2,

    // When NOT false and not number adjusts index by -1. If number
    // index is adjusted as:
    // index += adjustedIndex
    // adjustIndex: undefined,

    // When not false assumes 1 argument after adjusting for
    // node path and above index is the primary command.
    setCommand: undefined,

    // When NOT false data types are cast.
    castTypes: undefined,

    // Normalize command path. Command may be the
    // the full path of the filed called it is usually
    // desirable to strip the path and just leave the
    // file name. Set this option to false to disable.
    normalizeCommand: undefined

  };

  // Parsers attempt to cast string to type by conditions.
  var parsers = {

    // Attempts to parse Date.
    date: function (val) {
      var d = tryParseAs(val, Date),
        n = tryParseAs(val, 'number');
      if (typeof n === 'number' && val.length < 9)
        return false;
      if (d !== 'Invalid Date' && !isNaN(d))
        return d;
      return false;
    },

    // Attempts to parse Number.
    number: function (val) {
      var n = tryParseAs(val, 'number');
      if (isNaN(n))
        return false;
      return n;
    },

    // Check if is true or false.
    boolean: function (val) {
      var likeBool = /^(true|false)$/.test(val);
      if (!likeBool)
        return false;
      return val == 'true';
    },

    // Tests for JSON like string.
    json: function (val) {
      if (/^{/.test(val))
        return tryParseAs(val, 'json');
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
      var self = this,
        match, exp, tmp,
        obj, split;
      obj = {};
      exp = /[a-zA-Z0-9]+:[a-zA-Z0-9]+/g;
      match = val.match(exp);
      if (!match || !match.length)
        return false;
      while ((tmp = exp.exec(val)) !== null) {
        split = tmp[0].split(':');
        // Ensure the value is cast.
        obj[split[0]] = self.cast(split[1]);
      }
      return obj;
    }

  };

  /**
   * Method for casting using try catch.
   * @example
   * tryParseAs('25', Number);
   * @private
   * @param  {String} val the native JavaScript data type to cast to.
   * @param  {Function} T the native function used to cast value.
   * @return {Boolean|Type}
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
   * @return {Boolean}
   */
  function isFlag(val) {
    return /^(-|--)[a-zA-Z0-9]+/.test(val);
  }

  /**
   * Strips dashes from string for flags.
   * @example
   * stripFlag('--save');
   * @private
   * @param  {String} val the string flag to be stripped.
   * @return {String}
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
   * @param  {Array}    arr
   * @return {Array}
   */
  function injectDebug(arr) {
    var _arr = [];
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
   * Pargv Class
   * @class
   * @constructor
   * @returns {Pargv}
   */
  function Pargv() {

    // Boolean true if manually supplied array.
    this._static = false;

    // Array containing original source.
    this._source = [];

    // The parsed result.
    this._parsed = {};

    // Custom parsers
    this._customParsers = {};

    // Object containing
    this._parsers = extend({}, parsers);

    // Object of configuration options.
    this._options = defaults;

    // Return Pargv instance.
    return this;

  }

  /**
   * Configures Pargv.
   * @example
   * pargv.configure(3, {// your options });
   * @param  {Number|Object} [index] index of command or object of options.
   * @param  {Object} [options] [description]
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

    // Return Pargv instance.
    return this;

  }

  /**
   * Adds new parser to configuration.
   * @example
   * pargv.addParser('email', function (val) {
   * 	// return truthy value if success
   * 	// return false if failed to continue inspections.
   * });
   * @param  {String|Object} name - the name of the parser to add or object of parsers.
   * @param  {Function} fn - the function used for parsing.
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
   * Inspects and casts a string value to detected type.
   * @example
   * pargv.cast('true');
   * @param  {String} val the value to be cast.
   * @return {*}
   */
  Pargv.prototype.cast = function cast(val) {

    // Do not process if casting is disabled.
    if (this._options.castTypes === false)
      return val;

    var self = this,
      keys = Object.keys(this._parsers),
      custKeys = Object.keys(this._customParsers),
      parsed,
      key,
      custKey,
      result;

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
   * Parse the arguments.
   * @example
   * pargv.parse(['start', '-p', 3000 ]);
   * @param {String|Object} [args] a string or array of arguments to parse.
   * @return {Objerct}
   */
  Pargv.prototype.parse = function parse(args) {

    var self = this,
      pargs = { cmds: [] },
      indexes = [],
      options, idx,
      warn, next, key,
      tmpFlag, tmpCmd, prev, isDebug;
    // adjustVal, adjustIsNum;

    // Test if we are debugging.
    isDebug = typeof v8debug !== 'undefined';

    options = this._options;

    // Check if adjust is specified int.
    // adjustIsNum = typeof options.adjustIndex === 'number';

    // Set default value of -1 if undefined.
    // Other wise is false and disabled.
    // adjustVal = adjustIsNum ?
    //   options.adjustIndex :
    //   options.adjustIndex !== false ? -1 : false;

    // subtract one so we slice
    // at the correct index.
    idx = options.index += -1;

    // Ensure index is 0 or greater.
    idx = idx < 0 ? 0 : idx;

    // If args are statically
    // defined set flag to true.
    if (args) {
      if (typeof args === 'string')
        args = args.replace(/(\s,|,\s)/, ',').trim().split(',');
      this._static = true;
    }

    // Ensure args.
    args = args || process.argv;

    // Normalize args if debugging.
    if (isDebug)
      args = injectDebug(args);

    // Splice to defined index.
    args = args.splice(idx);

    // Update source with original args after splice.
    this._source = args.slice(0);

    // If setCommand first arg is command.
    if (!/^-/.test(args[0]) && options.setCommand !== false) {
      pargs.cmd = args.shift();
      if (options.normalizeCommand !== false && pargs.cmd)
        pargs.cmd = pargs.cmd.split(path.sep).pop();
    }

    // Iterate the args.
    args.forEach(function (k, i) {

      // Check if is flag.
      if (isFlag(k)) {

        // flags with single "-" are just boolean
        // flags, flags with "--" require a value.
        var isFlagBool = /^-[a-zA-Z0-9]/.test(k);

        // Get next argument.
        next = args[i + 1];

        // Replace flag prefix.
        key = k.replace(/^-{1,2}/g, '');

        // Index has been parsed.
        indexes.push(i);

        // If next argument not flag then parse cast value
        // as this flag requires a value.
        if (next && !isFlag(next) && !isFlagBool) {
          tmpFlag = self.cast(next) || next;
          pargs[key] = tmpFlag;
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

    // Add original source to object.
    pargs.source = this._source;

    // Save the parsed result.
    this._parsed = this.parsed = pargs;

    return pargs;

  }

  /**
   * Returns only flags from parsed object.
   * @example
   * pargv.getFlags();
   * @param  {Object} [parsed] optional parsed object otherwise use this._parsed.
   * @return {Object}
   */
  Pargv.prototype.getFlags = function getFalgs(parsed) {
    parsed = parsed || this._parsed;
    parsed = extend({}, parsed);
    delete parsed.cmd;
    delete parsed.cmds;
    delete parsed.source;
    return parsed;
  };

  /**
   * Check if has command.
   *
   * @param {*} val
   * @returns {Boolean}
   */
  Pargv.prototype.hasCmd = function hasCmd(val, parsed) {

    var self = this,
      args = [].slice.call(arguments);

    parsed = parsed || this._parsed;

    if (!args.length)
      return false;

    // check if first arg is array.
    if (args[0] instanceof Array)
      args = args[0];

    if (args.length === 1)
      return parsed.cmds.indexOf(val) > 0;

    var found;
    args.forEach(function (arg) {
      if (found)
        return;
      if (parsed.cmds.indexOf(val) > 0)
        found = true;
    });

    return found;

  }

  /**
   * Gets the .cmd or index in .cmds.
   * @param [filter] the index of the cmd to retrieve.
   */
  Pargv.prototype.getCmd = function getCmd(filter) {

    var idx;

    if (filter === undefined)
      return this._parsed.cmd;

    return this._parsed.cmds[filter];

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
   * @param  {Object|Boolean} [defaults] object containing defaults for matched flags.
   * @param  {Boolean} [stripQuotes] when true strings are stripped of quotes.
   * @return {Array}
   */
  Pargv.prototype.flagsToArray = function flagsToArray(defaults, stripQuotes) {

    var flags = this.getFlags(),
      arr = [],
      flag,
      keys;

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
   * @param {Object|String} defaults object containing defaults for matching flags.
   * @param {String} char a string character used to join flags array to string.
   * @returns {String}
   */
  Pargv.prototype.flagsToString = function flagsToString(defaults, char) {
    if (typeof defaults === 'string') {
      char = defaults;
      defaults = undefined;
    }
    return this.flagsToArray.call(this, defaults, true).join(char || ' ');
  };

  /**
   * Resets configuration to default.
   * @returns {Pargv}
   */
  Pargv.prototype.reset = function reset() {
    this._static = false;
    this._source = [];
    this._options = extend({}, defaults);
    this._parsed = this.parsed = {};
    this._customParsers = {};
    return this;
  }

  // Create & return new Pargv instance.
  return new Pargv();

})();
