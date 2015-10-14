/** eslint reset:true */
var extend = require('extend');

module.exports = (function (arg) {

  'use strict';

  // Default values.
  var defaults = {

    // Index of primary command.
    index: 3,

    // When NOT false adjusts index by -1 since arrays are 0 based.
    adjustIndex: undefined,

    // When not false assumes 1 arguments is primary command.
    setCommand: undefined,

    // When NOT false data types are cast.
    castTypes: undefined

  };

  // Parsers attempt to cast string to type by conditions.
  var parsers = {

    // Attempts to parse Date.
    date: function (val) {
      var d = tryParseAs(val, Date);
      if(d!=='Invalid Date' && !isNaN(d))
        return d;
      return false;
    },

    // Attempts to parse Number.
    number: function (val) {
      var n = tryParseAs(val, 'number');
      if(isNaN(n))
        return false;
      return n;
    },

    // Check if is true or false.
    boolean: function (val) {
      var likeBool = /^(true|false)$/.test(val);
      if(!likeBool)
        return false;
      return val == 'true';
    },

    // Tests for JSON like string.
    json: function (val) {
      if(/^{/.test(val))
        return tryParseAs(val, 'json');
      return false;
    },

    // Tests for RegExp like string.
    regexp: function (val) {
      if(/^\/.+\/(g|i|m)?([m,i]{1,2})?/.test(val))
        return tryParseAs(val, RegExp);
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
      if(!match || !match.length)
        return false;
      while((tmp = exp.exec(val)) !== null){
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
  function tryParseAs(val, Type){
    try {
      if(Type === 'json')
        return JSON.parse(val);
      if(Type === 'number')
        return parseFloat(val);
      return new Type(val);
    } catch(e) {
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
    if(typeof index === 'object'){
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
   * @param  {String} name - the name of the parser to add.
   * @param  {Object} fn - the function used for parsing.
   * @return {Pargv}
   */
  Pargv.prototype.addParser = function addParser(name, fn, modify) {
    // If parser exists and not modifying throw error.
    if(this._parsers[name] && !modify)
      throw new Error('Failed to add parser ' + name + ' the parser already exists. Did you mean to use pargv.modifyParser?');
    this._parsers[name] = fn;
    return this;
  }

  /**
   * Modify parser, ensures already exists.
   * @example
   * see pargv.addParser().
   * @param  {String} name - the name of the parser to modify.
   * @param  {Object} fn - the function used for parsing.
   * @return {Pargv}
   */
  Pargv.prototype.modifyParser = function modifyParser(name, fn) {
    // If parser does not exsit throw error.
    if(!this._parsers[name])
      throw new Error('Failed to modify parser ' + name + ' the parser does not exist, use "addParser".');
    return this._addParser(name, fn, true);
  }

  /**
   * Inspects and casts a string value to detected type.
   * @example
   * pargv.cast('true');
   * @param  {String} val the value to be cast.
   * @return {*}
   */
  Pargv.prototype.cast = function cast(val) {

    // Do not process if casting is disabled.
    if(this._options.castTypes === false)
      return val;

    var self = this,
        keys = Object.keys(this._parsers),
        parsed,
        key,
        result;

    // If known type immediately return.
    if(typeof val === 'number' ||
       typeof val === 'boolean' ||
       typeof val === 'date' ||
       (val instanceof RegExp) ||
       (typeof val === 'object' && val !== null)) {
         return val;
       }

    // If a string trim.
    if(typeof val === 'string')
      val = val.trim();

    // Iterate until some returns truthy value.
    while(!result && keys.length){
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
   * @param {String|Object} [args] - a string or array of arguments to parse.
   * @return {Objerct}
   */
  Pargv.prototype.parse = function parse(args) {

    var self = this,
        pargs = { cmds: []},
        indexes = [],
        options, idx,
        warn, next, key,
        tmpFlag, tmpCmd, prev;

    options = this._options
    idx = options.adjustIndex !== false ? options.index-=1 : options.index;
    idx = idx < 0 ? 0 : idx;

    // If args are statically
    // defined set flag to true.
    if(args) {
      if(typeof args === 'string')
        args = args.replace(/(\s,|,\s)/, ',').trim().split(',');
      this._static = true;
    }

    // Ensure args.
    args = args || process.argv;

    // Splice to defined index.
    args = args.splice(idx);

    // Ensure args or warn.
    if(!args.length) {
      if(console){
        warn = 'Failed to parse args the collection contains no elements.';
        if(console.warn)
          console.warn(warn);
        else
          console.log(warn);
      }
      return {};
    }

    // Update source with original args after splice.
    this._source = args.slice(0);

    // If setCommand first arg is command.
    if(!/^-/.test(args[0]) && options.setCommand !== false)
      pargs.cmd = args.shift();

   // Iterate the args.
    args.forEach((k,i) =>{

       // Check if is flag options.
       if(isFlag(k)){

         // Get next argument.
         next = args[i+1];

         // Replace flag prefix.
         key = k.replace(/^-{1,2}/g, '');

         // Index has been parsed.
         indexes.push(i);

         // If next argument not flag then parse cast value.
         if(next && !isFlag(next)) {
            tmpFlag = self.cast(next) || next;
            pargs[key] = tmpFlag;
            indexes.push(i+1);
         }

         // Otherwise is simply boolean type flag.
         else {
            pargs[key] = true;
         }

       }

       // Otherwise is cmd or sub command.
       else {

         // Get previous argument.
         prev = args[i-1];

         // If previous argument and not a flag parse & cast.
         if(prev && !isFlag(prev)){
           // Cast and push the parsed argument.
           tmpCmd = self.cast(k) || k;
           pargs.cmds.push(tmpCmd);
           indexes.push(i);

         }

         // Otherwise is a cmd.
         else {
           if(indexes.indexOf(i) === -1){
              tmpCmd = self.cast(k);
              pargs.cmds.push(tmpCmd);
           }
         }

       }

    });

    // Add original source to object.
    pargs.source = this._source;

    // Save the parsed result.
    this._parsed = pargs;

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
   * Resets configuration to default.
   * @returns {Pargv}
   */
  Pargv.prototype.reset = function reset() {
    this._static = false;
    this._source = [];
    this._options = extend({}, defaults);
    this._parsed = {};
    return this;
  }

  // Create & return new Pargv instance.
  return new Pargv();

})();
