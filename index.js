'use strict';

/**
 * Expects index of primary command
 * All other params other than the cmdIdx will
 * be treated as flags for the primary command.
 *
 * Example:
 * In this example run is the 3rd argument
 * so we'd pass in 3 for the cmdIdx.
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
 * @param {Number|Object} [index] - the index of the primary command.
 * @param {Object} [options] - pargv options.
 * @returns {Object}
 */
function pargv(index, options){

    var _flags = {},
        _argv;

    // pargv defaults.
    var defaults = {

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

    // allow passing an array of
    // parguments to be parsed.
    if((index instanceof Array)){
        _argv = index;
        index = undefined;
    } else {
        if(typeof index === 'object'){
            options = index;
            index = undefined;
        }
    }

    // set options.
    options = options || {};
    options.adjustIndex = options.adjustIndex || defaults.adjustIndex;
    options.castTypes = options.castTypes || defaults.castTypes;

    // get index of primary command.
    index = index !== undefined ? index : options.index;
    index = index !== undefined ? index : 3;

    if(options.adjustIndex !== false && index > 0)
        index -= 1;

    // args may be static array so
    // only splice if not defined.
    if(!_argv)
        _argv = process.argv.splice(index);

    // set our primary command by
    // removing first element array.
    if(options.shiftCommand !== false)
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
     * Cast value to correct data type.
     * will cast to Number, Boolean, Date
     * and JSON.
     */
    function castType(val){

        try{

            // do nothing if casting is disabled.
            if(options.castTypes === false)
                return val;

            // cast to JSON.
            if(/^{/.test(val))
                return JSON.parse(val);

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
}

module.exports = pargv;