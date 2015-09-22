'use strict';

var extend = require('extend');

/**
 * Expects index of primary command
 * All other params other than the cmdIdx will
 * be treated as flags for the primary command.
 *
 * Examples:
 *
 * Basic - node server start
 * result: { cmd: start }
 *
 * With Flag - node server start --config production
 * result: { cmd: start, config: 'production' }
 *
 * With JSON - node server start --person "{ "name": "Bob Jones" }"
 * result: { cmd: start, person: { name: "Bob Jones" } }
 *
 * Specified index -
 *
 *
 * Data Types:
 * Booleans, Numbers, Dates & JSON will be cast to the
 * appropriate data type.
 *
 * Key Value Pairs:
 * To specify a key/value pair simply use key:value
 * the result will be an object { key: value }
 *
 * node filename run
 * @param {Number|Object|Array} [index] - the index of the primary command.
 * @param {Object} [options] - pargv options.
 * @returns {Object}
 */
function pargv(index, options){

    // pargv defaults.
    var defaults = {

        // the index where the primary
        // command element is.
        // ex: node server start
        // the index would be 3 where
        // "start" is our command action.
        index: 3,

        // When NOT false the index passed
        // will be subtracted by one so the
        // array is splice at correct element.
        adjustIndex: undefined,

        // When NOT false the first arg
        // is shifted and set as the "cmd"
        // or primary command property.
        shiftCommand: undefined,

        // When NOT false data types are cast.
        castTypes: undefined

    };

    // allow options as first arg.
    if(typeof index === 'object'){
        options = index;
        index = undefined;
    }

    options = extend({}, defaults, options);
    options.index = index !== undefined ? index : options.index;

    /**
     * Enables overwriting global settings.
     * see above for examples the signature 
     * is the same.
     *
     * @param {Number|Object|Array} [_index] - the index of the primary command.
     * @param {Object} [_options] - pargv options.
     */
    return function (_index, _options) {

        var _flags = {},
            idx,
            _argv;

        // allow passing an array of
        // parguments to be parsed.
        if((_index instanceof Array)){
            _argv = _index;
            _index = undefined;
        }

        // extend local options.
        _options = extend({}, options, _options);
        _options.index = idx = _index !== undefined ? _index : _options.index;

        if(_options.adjustIndex !== false && idx > 0)
            idx -= 1;

        // args may be static array so
        // only splice if not defined.
        if(!_argv)
            _argv = process.argv.splice(idx);

        // set our primary command by
        // removing first element array.
        if(_options.shiftCommand !== false)
            _flags.cmd = _argv.shift();

        /*
         * Simple handler to log error messages.
         */
        function logError(e) {
            // don't need full stack err
            // so just create simple msg.
            let msg = (e.name + ': ') || 'Unknown Error: ';
            msg += e.message;
            console.log(msg);
        }

        /*
         * Rudamentary date parser.
         * if you wish to have more robust
         * date parsing you should condider
         * add moment.js as a dependency.
         */
        function tryParseDate(val){
            try {
                var date = new Date(val);
                if(date!=='Invalid Date' && !isNaN(date))
                    return date;
                return false;
            } catch(e){
                return false;
            }
        }

        /*
         * Cast value to correct data type.
         * will cast to Number, Boolean, Date
         * and JSON.
         */
        function castType(val){

            try{

                // do nothing if casting is disabled.
                if(_options.castTypes === false)
                    return val;

                // cast to JSON.
                if(/^{/.test(val))
                    return JSON.parse(val);

                // cast to Date
                if(tryParseDate(val))
                    return tryParseDate(val);

                // cast to Boolean
                if(/^(true|false)$/i.test(val)){
                    if(typeof val === 'boolean')
                        return val;
                    return val == 'true';
                }

                // cast to Number
                if(/^\d+$/.test(val))
                    return Number(val);

                // otherwise just return value
                // unknown data type or doesn't
                // require casting.
                return val;

            } catch(e){

                logError(e);

            }

        }

        // iterate the args parsing for flags
        // commands and casting data types.
        _argv.forEach((k,i)=>{

            if(/-/g.test(k)){
                let next = _argv[i+1];
                let key = k.replace(/-/g, '');
                if(next && !/-/.test(next))
                    _flags[key] = castType(next);
                else
                    _flags[key] = true;
            }

            else {

                let prev = _argv[i-1];
                if(prev && !/-/g.test(prev)){
                    _flags.cmds = _flags.cmds || [];
                    _flags.cmds.push(castType(k));
                }
            }

        });

        return _flags;

    };

}

module.exports = pargv;