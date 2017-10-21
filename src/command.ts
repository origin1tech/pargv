
import { Pargv } from './';
import { SpawnOptions } from 'child_process';
import { IMap, ActionHandler, CoerceHandler, IPargvCommandOption, IPargvCoerceConfig, IPargvWhenConfig, IPargvStats, ErrorHandler, IPargvParsedResult, LogHandler, SpawnActionHandler } from './interfaces';
import { TOKEN_PREFIX_EXP, SPLIT_CHARS, FLAG_EXP, COMMAND_VAL_EXP, LIST_EXP, KEYVAL_EXP, SPLIT_PAIRS_EXP, DOT_EXP, SPLIT_KEYVAL_EXP, JSON_EXP, REGEX_EXP } from './constants';
import { sep, extname, basename, join } from 'path';
import * as utils from './utils';

export class PargvCommand {

  _name: string;
  _usage: string;
  _describe: string;
  _commands: string[] = [];
  _options: string[] = [];
  _bools: string[] = [];
  _aliases: IMap<string> = {};
  _usages: IMap<string[]> = {};
  _defaults: IMap<any> = {};
  _describes: IMap<string> = {};
  _coercions: IMap<CoerceHandler> = {};
  _demands: string[] = [];
  _whens: IMap<string> = {};
  _examples: [string, string][] = [];
  _action: ActionHandler;
  _maxCommands: number = 0;
  _maxOptions: number = 0;
  _minCommands: number = 0;
  _minOptions: number = 0;
  _showHelp: boolean;
  _completions: IMap<any[]> = {};
  _external: string = null;
  _cwd: string | boolean = false;
  _extension: string = null;

  // Overrides.
  _spawnOptions: SpawnOptions;
  _spawnAction: SpawnActionHandler;
  _spreadCommands: boolean;
  _extendCommands: boolean;
  _extendAliases: boolean;

  _pargv: Pargv;

  constructor(token: string, describe?: string, pargv?: Pargv) {
    utils.setEnumerable(this, '_name, _usage, _describe, _commands, _options, _bools, _aliases, _usages, _defaults, _describes, _coercions, _demands, _whens, _examples, _action, _maxCommands, _maxOptions, _minCommands, _maxOptions, _showHelp, _completions, _external, _cwd, _extension, _spawnOptions, _spawnAction, _spreadCommands, _extendCommands, _extendAliases');
    this._describe = describe;
    this._pargv = pargv;
    this.parseCommand(token);
    this.toggleHelp(pargv.options.defaultHelp);
    // Set defaults for overrides.
    this._spreadCommands = pargv.options.spreadCommands;
    this._extendCommands = pargv.options.extendCommands;
    this._extendAliases = pargv.options.extendAliases;
  }

  // PRIVATE //

  /**
   * Parse Token
   * Parses a usage token.
   *
   * @param token the token string to be parsed.
   * @param next the next element in usage command.
   */
  private parseToken(token: string, next?: any): IPargvCommandOption {

    token = token.replace(/\s/g, '');
    token = token.replace(/(\>|])$/, '');
    let tokens = token.split(':');                // <age:number> to ['<age', 'number>'];
    let key = tokens[0];                          // first element is command/option key.
    let type = tokens[1];                         // optional type.
    let def = tokens[2];                          // optional default value.

    if (!TOKEN_PREFIX_EXP.test(key)) {
      this.err(
        this._pargv._localize('the token %s is missing, invalid or has unwanted space.')
          .args(key)
          .styles(['bgRed', 'white'])
          .done()
      );
    }          // ensure valid token.
    const isRequired = /^</.test(key);            // starts with <.

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

    if (def) // try to parse default val.
      def = this.castToType(key, 'auto', def);

    let usage: string[] = [[token].concat(aliases).join(', ')];

    if (!next)
      return {
        key: key,
        usage: usage,
        aliases: aliases,
        flag: isFlag,
        bool: isBool,
        type: type,
        default: def,
        required: isRequired
      };

    next = this.parseToken(next, null);

    return {
      key: key,
      usage: usage.concat(next.usage),
      aliases: aliases,
      flag: isFlag,
      bool: false,
      type: next.type,
      as: next.key,
      required: next.required,
      default: next.default
    };

  }

  /**
   * Parse Command
   * Parses a command token.
   *
   * @param token the command token string to parse.
   */
  private parseCommand(token?: string) {

    let split = utils.split(token.trim(), SPLIT_CHARS);     // Break out usage command.
    let origExt;
    let isExternal;

    if (/^@/.test(split[0])) {      // is external program cmd.
      let tmpExt = origExt = split.shift().trim().replace(/^@/, '');
      const splitExt = tmpExt.split(sep);
      tmpExt = splitExt.pop().replace(/^@/, '');
      this._extension = extname(tmpExt);
      this._external = basename(tmpExt, this._extension);
      this._cwd = splitExt.join(sep) || '';
    }

    let ctr = 0;                                            // Counter for command keys.
    let aliases = (split.shift() || '').trim().split('.');  // Break out command aliases.
    let name = aliases.shift();                             // First is key name.

    if (/(<|\[)/.test(name)) {
      split.unshift(name);
      name = undefined;
    }

    if (this._external && !name) { // if no command name and is program use program.
      name = this._external;
      aliases.push(origExt); // full path alias.
      aliases.push(this._external + this._extension || ''); // name & ext alias.
      aliases.push(join(<string>this._cwd, this._external)); // full path w/o ext.
    }

    const usage = [];                                       // Usage command values.
    usage.push(name);                                       // Add command key.

    // Iterate the tokens.
    split.forEach((el, i) => {

      if (el === '--tries') {
        const x = true;
      }

      let next = split[i + 1];                              // next value.
      const isFlag = utils.isFlag(el);                       // if is -o or --opt.
      next = utils.isFlag(next) ||                           // normalize next value.
        !COMMAND_VAL_EXP.test(next || '') ? null : next;
      const parsed = this.parseToken(el, next);        // parse the token.
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

    const cmdStr =
      this._pargv._localize('command').done();

    this._name = name;                                 // Save the commmand name.
    this._describe = this._describe ||                 // Ensure command description.
      `${name} ${cmdStr}.`;
    this._usage = usage.join(' ');                     // create usage string.
    this.alias(name, ...aliases);                      // Map aliases to command name.
    this.alias(name, name);

  }

  /**
   * Expand Option
   * This breaks out the parsed option in to several
   * arrays/objects. This prevents some recursion rather
   * than storing the object itself in turn requiring more loops.
   *
   * @param option the parsed PargvOption object.
   */
  private expandOption(option: IPargvCommandOption) {

    let describe;

    const reqCmd =
      this._pargv._localize('Required command.').done();

    const optCmd =
      this._pargv._localize('Optional command.').done();

    const reqFlag =
      this._pargv._localize('Required flag.').done();

    const optFlag =
      this._pargv._localize('Optional flag.').done();

    if (option.flag) {
      this._options.push(option.key);
      if (option.bool)
        this._bools.push(option.key);
      describe = option.required ? reqFlag : optFlag;
    }

    else {
      this._commands.push(option.key);
      describe = option.required ? reqCmd : optCmd;
    }

    this.describe(option.key, option.describe || describe); // Add default descriptions
    this.alias(option.key, option.key);                     // Add key to self.
    this.alias(option.key, ...option.aliases);              // Add aliases to map.
    if (!utils.isUndefined(option.index))                   // Index to Command map.
      this.alias(option.key, option.index + '');
    if (option.required)                                   // set as required.
      this.demand(option.key);
    if (option.default)
      this._defaults[option.key] = option.default;
    this._usages[option.key] = option.usage;               // Add usage.
    this.coerce(option.key, option.type, option.default);  // Add default coerce method.

  }

  /**
   * Toggle Help
   * Enables or disables help while toggling the help option.
   * @param enabled whether or not help is enabled.
   */
  private toggleHelp(enabled?: boolean) {
    if (enabled !== false)
      enabled = true;
    let helpCmd = '--' + this._pargv._helpCommand;
    let helpCmdWithAlias = `${helpCmd}, -${this._pargv._helpCommand.charAt(0)}`;
    this._showHelp = enabled;
    if (enabled) {
      const str = this._pargv._localize('Displays help for %s.')
        .args(this._name)
        .done();
      this.option(helpCmdWithAlias, str);
    }
    else {
      this._options = this._options.filter((el) => {
        return el !== helpCmd;
      });
    }
  }

  /**
   * Clean
   * : Filters arrays deletes keys from objects.
   *
   * @param key the key name to be cleaned.
   */
  private clean(key: string) {

    const isFlag = FLAG_EXP.test(key);

    key = this.aliasToKey(key);
    const aliases = [key].concat(this.aliases(key));

    delete this._usages[key];
    delete this._defaults[key];
    delete this._describes[key];
    delete this._coercions[key];
    delete this._whens[key];
    this._demands = this._demands.filter(k => k !== key);
    aliases.forEach(k => delete this._aliases[k]);

    if (!isFlag) {
      this._commands = this._commands.filter(k => k !== key);
    }
    else {
      this._bools = this._bools.filter(k => k !== key);
      this._options = this._options.filter(k => k !== key);
    }

  }

  // GETTERS //

  /**
   * Min
   * : Gets methods for adding min commands or options.
   */
  get min() {

    return {

      /**
       * Min Commands
       * Sets minimum command count.
       *
       * @param count the minimum number of commands.
       */
      commands: (count: number) => {
        this._minCommands = count;
        return this;
      },

      /**
       * Min Options
       * Sets minimum option count.
       *
       * @param count the minimum number of options.
       */
      options: (count: number) => {
        this._minOptions = count;
        return this;
      }

    };

  }

  /**
    * Max
    * : Gets methods for adding max commands or options.
    */
  get max() {

    return {

      /**
       * Max Commands
       * Sets maximum command count.
       *
       * @param count the maximum number of commands.
       */
      commands: (count: number) => {
        this._maxCommands = count;
        return this;
      },

      /**
       * Max Options
       * Sets maximum option count.
       *
       * @param count the maximum number of options.
       */
      options: (count: number) => {
        this._maxOptions = count;
        return this;
      }

    };

  }

  /**
   * If
   * : Alias for when.
   */
  get if() {
    return this.when;
  }

  /**
   * Error
   * : Handles error messages.
   *
   * @param args args to be formatted and logged.
   */
  private get err() {
    return this._pargv.error.bind(this._pargv);
  }

  /**
   * Parse
   * : Parses the provided arguments inspecting for commands and options.
   *
   * @param argv the process.argv or custom args array.
   */
  get parse(): (...args: any[]) => IPargvParsedResult {
    return this._pargv.parse.bind(this._pargv);
  }

  /**
   * Exec
   * : Parses arguments then executes command action if any.
   *
   * @param argv optional arguments otherwise defaults to process.argv.
   */
  get exec(): (...args: any[]) => IPargvParsedResult {
    return this._pargv.exec.bind(this._pargv);
  }

  /**
   * Completion
   * : Adds the completion command for use within your app for generating completion script.
   *
   * @param command the name of the commpletion install command.
   * @param describe the description of the command or complete handler.
   * @param template optional template for generating completions or complete handler.
   * @param fn the optional completion handler.
   */
  get completion() {
    return this._pargv.completion.bind(this._pargv);
  }

  /**
   * Listen
   * : Parses arguments then executes command action if any.
   *
   * @param argv optional arguments otherwise defaults to process.argv.
   */
  get listen() {
    return this._pargv.exec.bind(this._pargv);
  }

  // METHODS //

  /**
    * Option
    * Adds option to command.
    * Supported to type strings: string, date, array,
    * number, integer, float, json, regexp, boolean
    * @example
    *
    * @param token the option token to parse as option.
    * @param describe the description for the option.
    * @param def an optional default value.
    * @param type a string type, RegExp to match or Coerce method.
    */
  option(token: string, describe?: string, def?: any, type?: string | RegExp | CoerceHandler): PargvCommand {
    token = utils.toOptionToken(token);
    const tokens = utils.split(token.trim(), SPLIT_CHARS);
    tokens.forEach((el, i) => {
      let next;
      if (tokens.length > 1) {
        next = tokens[i + 1];
        tokens.splice(i + 1, 1);
      }
      const parsed = this.parseToken(el, next);
      parsed.describe = describe || parsed.describe;
      parsed.default = def;
      parsed.type = type || parsed.type;
      this.clean(parsed.key); // clean so we don't end up with dupes.
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
  alias(config: IMap<string[]>): PargvCommand;
  alias(key: string, ...alias: string[]): PargvCommand;
  alias(key: string | IMap<string[]>, ...alias: string[]): PargvCommand {
    let obj: any = key;
    const colors = this._pargv.options.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = alias;
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v) || !utils.isArray(v)) {
        const aliasStr = this._pargv._localize('alias').done();
        this.err(
          this._pargv._localize('cannot set %s for %s using value of undefined.')
            .setArg('alias')
            .setArg(k)
            .styles(colors.accent, colors.accent)
            .done()
        );
      }
      v.forEach((el) => {
        el = utils.stripToken(el, /(<|>|\[|\])/g);
        this._aliases[el] = k;
      });
    }
    return this;
  }

  /**
   * Describe
   * Adds description for an option.
   *
   * @param key the option key to add description to.
   * @param describe the associated description.
   */
  describe(config: IMap<string>): PargvCommand;
  describe(key: string, describe?: string): PargvCommand;
  describe(key: string | IMap<string>, describe?: string): PargvCommand {
    let obj: any = key;
    const colors = this._pargv.options.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = describe;
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v))
        this.err(
          this._pargv._localize('cannot set %s for %s using value of undefined.')
            .setArg('describe')
            .setArg(k)
            .styles(colors.accent, colors.accent)
            .done()
        );
      this._describes[k] = v;
    }
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
  coerce(key: string | IMap<IPargvCoerceConfig>): PargvCommand;
  coerce(key: string, type?: string | RegExp | CoerceHandler, def?: any): PargvCommand;
  coerce(key: string | IMap<IPargvCoerceConfig>, fn?: string | RegExp | CoerceHandler, def?: any): PargvCommand {

    let obj: any = key;
    const colors = this._pargv.options.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = {
        fn: fn,
        def: def
      };
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v))
        this.err(
          this._pargv._localize('cannot set %s for %s using value of undefined.')
            .setArg('coerce')
            .setArg(k)
            .styles(colors.accent, colors.accent)
            .done()
        );
      if (v.def) this.default(k, v.def);
      this._coercions[k] = v.fn;
    }
    return this;
  }

  /**
   * Demand
   * The commands or flag/option keys to demand.
   *
   * @param key the key to demand.
   * @param keys additional keys to demand.
   */
  demand(...keys: string[]) {
    keys.forEach((k) => {
      if (!utils.contains(this._demands, this.aliasToKey(k)))
        this._demands.push(k);
    });
    return this;
  }

  /**
   * When
   * When a specified key demand dependent key.
   *
   * @param key require this key.
   * @param demand this key is present.
   * @param converse when true the coverse when is also created.
   */
  when(config: IMap<IPargvWhenConfig>): PargvCommand;
  when(key: string, demand?: string, converse?: boolean): PargvCommand;
  when(key: string | IMap<IPargvWhenConfig>, demand?: string | boolean, converse?: boolean): PargvCommand {
    let obj: any = key;
    const colors = this._pargv.options.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      demand = this.stripToAlias(<string>demand);
      obj = {};
      obj[<string>key] = {
        demand: demand,
        converse: converse
      };
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      let v = obj[k];
      v.demand = this.stripToAlias(v.demand);
      if (!utils.isValue(v.demand))
        this.err(
          this._pargv._localize('cannot set %s for %s using value of undefined.')
            .setArg('when')
            .setArg(k)
            .styles(colors.accent, colors.accent)
            .done()
        );
      this._whens[k] = v.demand;
      if (v.converse)
        this._whens[v.demand] = k;
    }
    return this;
  }

  /**
   * Default
   * Sets a default value for a command or option.
   *
   * @param key the key to set the default for or an object of key/val.
   * @param val the value to set for the provided key.
   */
  default(key: string | IMap<any>, val: any) {
    let obj: any = key;
    const colors = this._pargv.options.colors;
    if (utils.isString(key)) {
      key = this.stripToAlias(<string>key);
      obj = {};
      obj[<string>key] = val;
    }
    for (let k in obj) {
      k = this.stripToAlias(<string>k);
      const v = obj[k];
      if (!utils.isValue(v))
        this.err(
          this._pargv._localize('cannot set %s for %s using value of undefined.')
            .setArg('default')
            .setArg(k)
            .styles(colors.accent, colors.accent)
            .done()
        );
      this._defaults[k] = v;
    }
    return this;
  }

  /**
   * Completion At
   * : Injects custom completion value for specified key.
   * Key can be a know command, option or * for anonymous.
   *
   * @param key the key to inject completion values for.
   * @param vals the completion values for the provided key.
   */
  completionFor(key: string, ...vals: any[]) {
    key = key === '*' ? key : this.aliasToKey(key);
    if (utils.isArray(vals[0]))
      vals = vals[0];
    const colors = this._pargv.options.colors;
    if (!key)
      this.err(
        this._pargv._localize('cannot set completion for using key of undefined.')
          .done()
      );
    this._completions[key] = vals;
    return this;
  }

  /**
   * Action
   * Adds an action event to be called when parsing matches command.
   *
   * @param fn the callback function when parsed command matches.
   */
  action(fn: ActionHandler) {
    const colors = this._pargv.options.colors;
    if (!fn)
      this.err(
        this._pargv._localize('cannot set %s for %s using value of undefined.')
          .setArg('action')
          .setArg(this._name)
          .styles(colors.accent, colors.accent)
          .done()
      );
    this._action = <ActionHandler>fn;
    return this;
  }

  /**
   * Spawn Action
   * : When defined externally spawned commands will call this action.
   *
   * @param options the SpawnOptions for child_process spawn.
   * @param handler external spawn action handler.
   */
  spawnAction(options: SpawnOptions | SpawnActionHandler, handler?: SpawnActionHandler) {
    if (utils.isFunction(options)) {
      handler = <SpawnActionHandler>options;
      options = undefined;
    }
    this._spawnAction = handler;
    this._spawnOptions = <SpawnOptions>options;
    return this;
  }

  /**
   * CWD
   * : Sets the working directory prepended to external commands/programs. Ignored when action is present.
   * TODO: Not sure I like this need to play with it more.
   *
   * @param path the base path when command is external program.
   */
  cwd(path: string | boolean) {
    if (this._action || !this._external) // not needed if action defined.
      return;
    this._cwd = path;
    if (this._external !== this._name || utils.isBoolean(path)) // external prog is not cmd just return.
      return;
    const fullPath = join(<string>path, this._external);
    this._aliases[fullPath] = this._name;
    if (this._extension)
      this._aliases[fullPath + this._extension] = this._name;
    return this;
  }

  /**
   * Help
   * Enables or disables help for this command.
   *
   * @param enabled true or false to toggle help.
   */
  help(enabled?: boolean): PargvCommand {
    if (!utils.isValue(enabled))
      enabled = true;
    this._showHelp = enabled;
    return this;
  }

  /**
   * Spread Commands
   * : Allows for spreading commands on command instance only.
   *
   * @param spread when true spreads command args in callback action.
   */
  spreadCommands(spread?: boolean) {
    this._spreadCommands = spread;
    return this;
  }

  /**
   * Extend Commands
   * : Allows for extending commands on command instance only.
   *
   * @param extend when true commands are exteneded on Pargv result object.
   */
  extendCommands(extend?: boolean) {
    this._extendCommands = extend;
    return this;
  }

  /**
   * Extend Aliases
   * : Allows for extending aliases on command instance only.
   *
   * @param extend when true aliases are exteneded on Pargv result object.
   */
  extendAliases(extend?: boolean) {
    this._extendAliases = extend;
    return this;
  }

  /**
   * Example
   * Stores and example for the command displayed in help.
   * You can also provide an object where the key is the
   * example text and the value is the describe text.
   *
   * @param val string or array of strings.
   */
  example(example: string | [string, string][], describe?: string) {
    let arr: any = example;
    if (utils.isString(example))
      arr = [example, describe || null];
    this._examples = this._examples.concat(arr);
    return this;
  }

  // UTILS //

  /**
   * Cast To Type
   * Casts a value to the specified time or fallsback to default.
   *
   * @param type the type to cast to.
   * @param val the value to be cast.
   */
  castToType(key: string, type: string | RegExp, val?: any, def?: any) {

    let result = null;
    const opts = this._pargv.options;
    const colors = opts.colors;
    const origVal = val;
    type = utils.isString(type) ? (type as string).trim() : type;
    const isAuto = type === 'auto';

    if (utils.isString(val))
      val = val.trim();

    // Check if is list type expression.
    let isListType =
      (utils.isString(type) && LIST_EXP.test(<string>type)) ||
      utils.isRegExp(type);

    let listexp;
    if (isListType) {
      listexp = type;
      type = 'list';
    }

    function castObject(obj) {
      if (utils.isPlainObject(obj)) {
        for (const k in obj) {
          const val = obj[k];
          if (utils.isPlainObject(val))
            obj[k] = utils.toDefault(castObject(val), val);
          else if (utils.isArray(val))
            obj[k] = utils.toDefault(castObject(val), val);
          else
            obj[k] = utils.toDefault(autoCast(val), val);
        }
        return obj;
      }
      else if (utils.isArray(obj)) {
        return obj.map((el) => {
          return autoCast(el);
        });
      }
      else {
        return obj;
      }
    }

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

      object: (v) => {
        if (!KEYVAL_EXP.test(v))
          return null;
        const obj = {};
        // split key:val+key:val to [key:val, key:val].
        const pairs = v.match(SPLIT_PAIRS_EXP);
        if (!pairs.length) return null;
        let parentPath;
        if (DOT_EXP.test(pairs[0])) { // split user.profile.name to [user, profile, name]
          const matches = pairs.shift().match(SPLIT_KEYVAL_EXP);
          const segments = matches[0].split('.');
          const key = segments.pop();
          if (segments.length)
            parentPath = segments.join('.');
          pairs.unshift(`${key}:${matches[1]}`); // set back to key:val without parent path.
        }
        pairs.forEach((p) => {
          const kv = p.replace(/('|")/g, '').split(':');
          if (kv.length > 1) {
            let castVal: any = kv[1];
            if (DOT_EXP.test(castVal)) {
              castVal = to.object(castVal);
            }
            else {
              if (/^\[\s*?("|').+("|')\s*?\]$/.test(castVal))
                castVal = castVal.replace(/(^\[|\]$)/g, '');
              if (opts.cast) { // check if auto casting is enabled.
                castVal = utils.toDefault(autoCast(castVal), castVal);
                if (utils.isArray(castVal))
                  castVal = (castVal as any[]).map((el) => {
                    return utils.toDefault(autoCast(el), el);
                  });
              }
            }
            let setPath = parentPath ? `${parentPath}.${kv[0]}` : kv[0];
            utils.set(obj, setPath, castVal);
          }
        });
        return obj;

      },

      json: (v) => {
        if (!JSON_EXP.test(v))
          return null;
        v = v.replace(/^"/, '').replace(/"$/, '');
        let obj = utils.tryWrap(JSON.parse, v)();
        if (utils.isPlainObject(obj) && opts.cast) { // auto casting is permitted.
          obj = castObject(obj);
        }
        return obj;
      },

      regexp: (v) => {
        if (!REGEX_EXP.test(v))
          return null;
        return utils.castType(val, 'regexp');
      },

      array: (v) => {
        if (!LIST_EXP.test(v))
          return null;
        return utils.toArray(v);
      },

      number: (v) => {
        if (!/[0-9]/g.test(v))
          return null;
        return utils.castType(v, 'number');
      },

      date: (v) => {
        if (!isAuto)
          return utils.fromEpoch(to.number(v));
        return utils.castType(v, 'date');
      },

      boolean: (v) => {
        if (!/^(true|false)$/.test(v))
          return null;
        return utils.castType(v, 'boolean');
      },

      string: (v) => {
        return v;
      },

      // Following NOT called in auto cast.

      list: (v) => {
        const exp = utils.isRegExp(listexp) ? listexp : utils.splitToList(<string>listexp);
        const match = (v.match && v.match(exp)) || null;
        result = match && match[0];
        return result;
      },

    };

    to.float = to.number;
    to.integer = to.number;

    function autoCast(v) {

      // Ensure type is set to auto.
      const origType = type;
      type = 'auto';

      let _result;

      let castMethods = [
        to.object.bind(null, v),
        to.json.bind(null, v),
        to.regexp.bind(null, v), // should be before array.
        to.array.bind(null, v),
        to.date.bind(null, v),
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

    // If not a special type just cast to the type.
    if (type !== 'auto') {
      if (!to[<string>type])
        result = null;
      else
        result = to[<string>type](val);
    }

    // Try to auto cast type.
    else {
      result = utils.toDefault(autoCast(val), val);
    }

    // If Auto no type checking.
    if (isAuto) return result;

    if (!isListType)  // if not matching list/regexp check default.
      result = utils.toDefault(result, def);

    // Ensure valid type.
    if (!utils.isValue(result) || !is[<string>type](result)) {
      if (!opts.ignoreTypeErrors) {
        if (!isListType) {
          this.err(
            this._pargv._localize('expected type %s but got %s instead.')
              .args(<string>type, utils.getType(result))
              .styles(colors.accent, colors.accent)
              .done()
          );
        }
        else {
          this.err(
            this._pargv._localize('expected list or expression %s to contain %s.')
              .args(listexp, origVal)
              .styles(colors.accent, colors.accent)
              .done()
          );
        }
      }
      else {
        result = origVal;
      }
    }

    return result;


  }

  /**
   * Alias To Name
   * Maps an alias key to primary command/flag name.
   *
   * @param key the key to map to name.
   * @param def default value if alias is not found.
   */
  aliasToKey(key: string | number, def?: any): string {
    const result = this._aliases[key];
    if (!utils.isValue(result) && def)
      return def;
    return result;
  }

  /**
   * Strip To Alias
   * Strips tokens then returns alias or original key.
   *
   * @param key the key to retrieve alias for.
   */
  stripToAlias(key: string | number) {
    if (utils.isString(key))
      key = utils.stripToken(<string>key, /(<|>|\[|\])/g);    // strip <, >, [ or ]
    return this.aliasToKey(key, key);
  }

  /**
   * Aliases
   * Looks up aliases for a given key.
   *
   * @param key the primary key to find aliases for.
   */
  aliases(key: string) {
    key = this.aliasToKey(key); // get primary name.
    const found = [];
    for (const p in this._aliases) {
      if (this._aliases[p] === key && p !== key)
        found.push(p);
    }
    return found;
  }

  /**
   * Stats
   * Iterates arguments mapping to known options and commands
   * finding required, anonymous and missing args.
   *
   * @param args the args to get stats for.
   * @param skip when true deamnds and whens are not built.
   */
  stats(args: any[], skip?: boolean): IPargvStats {

    const lastIdx = this._commands.length - 1;
    const clone = args.slice(0);

    const commands = [];        // contains only commands.
    const options = [];         // contains only options.
    const anonymous = [];       // contains only anonymous options.
    const mapCmds = [];         // contains command keys.
    const mapOpts = [];         // contains option keys.
    const mapAnon = [];         // contains anon keys.
    let ctr = 0;


    // Ensure defaults for missing keys.
    for (const k in this._defaults) {
      const isFlag = FLAG_EXP.test(k);
      const def = this._defaults[k];
      const isBool = this.isBool(k);
      if (isFlag) { // check if is missing default value.
        if (!utils.contains(clone, k)) {
          clone.push(k);
          if (!isBool)
            clone.push(def);
        }
      }
      else {
        const idx = this._commands.indexOf(k);
        const cur = clone[idx];
        if (!utils.isValue(cur) || FLAG_EXP.test(clone[idx]))
          clone.splice(idx, 0, def);
      }
    }

    clone.forEach((el, i) => {

      const next = clone[i + 1];
      const isFlag = utils.isFlag(el);
      const isFlagNext = utils.isFlag(next);
      const isNot = /^--no/.test(el) ? true : false;  // flag prefixed with --no.
      const origEl = el;
      el = el.replace(/^--no/, '');                   // strip --no;
      let key = isFlag || ctr > lastIdx ? this.aliasToKey(el) : this.aliasToKey(ctr);

      if (!key) {                                 // is anonymous command or option.
        anonymous.push(origEl);
        mapAnon.push(el);
        if (isFlag && !isFlagNext && next) {     // add only if not opt or cmd.
          anonymous.push(next);
          mapAnon.push('$value');            // keeps ordering denotes expects val.
          clone.splice(i + 1, 1);
        }
      }

      else if (isFlag && key) { // is a known flag/option.
        options.push(isNot ? '--no' + key : key);  // converted from alias to key.
        mapOpts.push(key);
        if (!this.isBool(el) && utils.isValue(next)) {
          options.push(next);
          mapOpts.push('$value');                // keeps ordering denotes expects val.
          clone.splice(i + 1, 1);
        }
      }

      else if (!isFlag && key) {                 // is a known command.
        commands.push(el);
        mapCmds.push(key);
        ctr++;
      }

    });

    let map = mapCmds.concat(mapOpts).concat(mapAnon);    // map by key to normalized.
    let normalized = commands.concat(options).concat(anonymous);  // normalized args.

    const missing = [];

    this._demands.forEach((el) => {
      if (!utils.contains(map, el)) {
        const isFlag = FLAG_EXP.test(el);
        let def = this._defaults[el] || null;
        if (!isFlag) {
          const idx = this._commands.indexOf(el);
          if (!utils.isValue(def))
            missing.push(el);
          map.splice(idx, 0, el);
          normalized.splice(idx, 0, def);
        }
        else {
          if (!utils.isValue(def))
            missing.push(el);
          map.push(el);
          if (!this.isBool(el)) {
            normalized.push(el);
            map.push('$value');
            normalized.push(def);
          }
          else {
            normalized.push(def);
          }
        }
      }
    });

    let whens: any = [];

    if (!skip) // skipped when getting completions, not needed
      for (const k in this._whens) {                // iterate whens ensure demand exists.
        const demand = this._whens[k];
        if (!utils.contains(map, demand))
          whens.push([k, demand]);
      }

    return {
      commands,
      options,
      anonymous,
      missing,
      map,
      normalized,
      whens
    };

  }

  /**
   * Has Command
   * Checks if a command exists by index or name.
   *
   * @param key the command string or index.
   */
  isCommand(key: string | number) {
    key = this.aliasToKey(key);
    return utils.isValue(key);
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

  // PARGV WRAPPERS //

  /**
   * Command
   * A string containing Parv tokens to be parsed.
   *
   * @param command the command token string to parse.
   * @param describe a description describing the command.
   */
  command(command: string, describe?: string): PargvCommand {
    const cmd = new PargvCommand(command, describe, this._pargv);
    this._pargv._commands[cmd._name] = cmd;
    return cmd;
  }

  /**
   * On Error
   * Add custom on error handler.
   *
   * @param fn the error handler function.
   */
  onError(fn: ErrorHandler) {
    this._pargv.onError(fn);
    return this;
  }

  /**
   * On Log
   * Add custom on log handler.
   *
   * @param fn the log handler function.
   */
  onLog(fn: LogHandler) {
    if (fn)
      this._pargv.onLog(fn);
    return this;
  }

  /**
   * Epilog
   * Displays trailing message.
   *
   * @param val the trailing epilogue to be displayed.
   */
  epilog(val: string) {
    this._pargv.epilog(val);
    return this;
  }

}
