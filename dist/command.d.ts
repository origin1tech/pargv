import { Pargv } from './';
import { IMap, ActionHandler, CoerceHandler, IPargvCoerceConfig, IPargvWhenConfig, IPargvStats, ErrorHandler } from './interfaces';
export declare class PargvCommand {
    _name: string;
    _usage: string;
    _describe: string;
    _commands: string[];
    _options: string[];
    _bools: string[];
    _aliases: IMap<string>;
    _usages: IMap<string[]>;
    _defaults: IMap<any>;
    _describes: IMap<string>;
    _coercions: IMap<CoerceHandler>;
    _demands: string[];
    _whens: IMap<string>;
    _examples: [string, string][];
    _action: ActionHandler;
    _maxCommands: number;
    _maxOptions: number;
    _minCommands: number;
    _minOptions: number;
    _showHelp: boolean;
    _completions: IMap<any[]>;
    _pargv: Pargv;
    constructor(token: string, describe?: string, pargv?: Pargv);
    /**
     * Parse Token
     * Parses a usage token.
     *
     * @param token the token string to be parsed.
     * @param next the next element in usage command.
     */
    private parseToken(token, next?);
    /**
     * Parse Command
     * Parses a command token.
     *
     * @param token the command token string to parse.
     */
    private parseCommand(token?);
    /**
     * Expand Option
     * This breaks out the parsed option in to several
     * arrays/objects. This prevents some recursion rather
     * than storing the object itself in turn requiring more loops.
     *
     * @param option the parsed PargvOption object.
     */
    private expandOption(option);
    /**
     * Toggle Help
     * Enables or disables help while toggling the help option.
     * @param enabled whether or not help is enabled.
     */
    private toggleHelp(enabled?);
    /**
     * Clean
     * : Filters arrays deletes keys from objects.
     *
     * @param key the key name to be cleaned.
     */
    private clean(key);
    private readonly err;
    /**
     * Command
     * : Access to Pargv command.
     */
    readonly command: any;
    /**
     * Min
     * : Gets methods for adding min commands or options.
     */
    readonly min: {
        commands: (count: number) => this;
        options: (count: number) => this;
    };
    /**
      * Max
      * : Gets methods for adding max commands or options.
      */
    readonly max: {
        commands: (count: number) => this;
        options: (count: number) => this;
    };
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    readonly parse: any;
    /**
     * Exec
     * Parses arguments then executes command action if any.
     *
     * @param argv optional arguments otherwise defaults to process.argv.
     */
    readonly exec: any;
    /**
     * Listen
     * Parses arguments then executes command action if any.
     *
     * @param argv optional arguments otherwise defaults to process.argv.
     */
    readonly listen: any;
    /**
     * If
     * : Alias for when.
     */
    readonly if: {
        (config: IMap<IPargvWhenConfig>): PargvCommand;
        (key: string, demand?: string, converse?: boolean): PargvCommand;
    };
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
    option(token: string, describe?: string, def?: any, type?: string | RegExp | CoerceHandler): PargvCommand;
    /**
     * Alias
     * Maps alias keys to primary flag/command key.
     *
     * @param key the key to map alias keys to.
     * @param alias keys to map as aliases.
     */
    alias(config: IMap<string[]>): PargvCommand;
    alias(key: string, ...alias: string[]): PargvCommand;
    /**
     * Describe
     * Adds description for an option.
     *
     * @param key the option key to add description to.
     * @param describe the associated description.
     */
    describe(config: IMap<string>): PargvCommand;
    describe(key: string, describe?: string): PargvCommand;
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
    /**
     * Demand
     * The commands or flag/option keys to demand.
     *
     * @param key the key to demand.
     * @param keys additional keys to demand.
     */
    demand(...keys: string[]): this;
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
    /**
     * Default
     * Sets a default value for a command or option.
     *
     * @param key the key to set the default for or an object of key/val.
     * @param val the value to set for the provided key.
     */
    default(key: string | IMap<any>, val: any): this;
    /**
     * Completion At
     * : Injects custom completion value for specified key.
     * Key can be a know command, option or * for anonymous.
     *
     * @param key the key to inject completion values for.
     * @param vals the completion values for the provided key.
     */
    completionFor(key: string, ...vals: any[]): this;
    /**
     * Action
     * Adds an action event to be called when parsing matches command.
     *
     * @param fn the callback function when parsed command matches.
     */
    action(fn: ActionHandler): this;
    /**
     * Help
     * Enables or disables help for this command.
     *
     * @param enabled true or false to toggle help.
     */
    help(enabled?: boolean): PargvCommand;
    /**
     * Example
     * Stores and example for the command displayed in help.
     * You can also provide an object where the key is the
     * example text and the value is the describe text.
     *
     * @param val string or array of strings.
     */
    example(example: string | [string, string][], describe?: string): this;
    /**
     * Cast To Type
     * Casts a value to the specified time or fallsback to default.
     *
     * @param type the type to cast to.
     * @param val the value to be cast.
     */
    castToType(key: string, type: string | RegExp, val?: any, def?: any): any;
    /**
     * Alias To Name
     * Maps an alias key to primary command/flag name.
     *
     * @param key the key to map to name.
     * @param def default value if alias is not found.
     */
    aliasToKey(key: string | number, def?: any): string;
    /**
     * Strip To Alias
     * Strips tokens then returns alias or original key.
     *
     * @param key the key to retrieve alias for.
     */
    stripToAlias(key: string | number): string;
    /**
     * Aliases
     * Looks up aliases for a given key.
     *
     * @param key the primary key to find aliases for.
     */
    aliases(key: string): any[];
    /**
     * Stats
     * Iterates arguments mapping to known options and commands
     * finding required, anonymous and missing args.
     *
     * @param args the args to get stats for.
     * @param skip when true deamnds and whens are not built.
     */
    stats(args: any[], skip?: boolean): IPargvStats;
    /**
     * Has Command
     * Checks if a command exists by index or name.
     *
     * @param key the command string or index.
     */
    isCommand(key: string | number): boolean;
    /**
     * Has Option
     * Inspects if key is known option.
     */
    isOption(key: string): boolean;
    /**
     * Is Required
     * Checks if command or option is required.
     *
     * @param key the command, index or option key.
     */
    isRequired(key: string | number): boolean;
    /**
     * Is Bool
     * Looks up flag option check if is of type boolean.
     *
     * @param key the option key to check.
     */
    isBool(key: string): boolean;
    /**
     * Fail
     * Add custom on error handler.
     *
     * @param fn the error handler function.
     */
    onError(fn: ErrorHandler): this;
    /**
     * Epilog
     * Displays trailing message.
     *
     * @param val the trailing epilogue to be displayed.
     */
    epilog(val: string): this;
}