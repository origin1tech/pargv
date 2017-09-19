import { IColurs } from 'colurs';
import { IMap, IPargvOptions, ActionHandler, CoerceHandler, AnsiStyles, HelpHandler, CompletionHandler, IFigletOptions, IPargvLayout, IPargvLogo, IPargvParsedResult, IPargvCoerceConfig, IPargvWhenConfig, ErrorHandler, IPargvMetadata, IPargvEnv, LocalizeInit, IPargvStats } from './interfaces';
export * from './interfaces';
export declare class Pargv {
    private _helpEnabled;
    private _helpHandler;
    private _errorHandler;
    private _completionsHandler;
    private _completions;
    private _completionsCommand;
    private _completionsReply;
    private _command;
    _colurs: IColurs;
    _localize: LocalizeInit;
    _env: IPargvEnv;
    _name: string;
    _nameFont: string;
    _nameStyles: AnsiStyles[];
    _version: string;
    _license: string;
    _describe: string;
    _epilog: string;
    _commands: IMap<PargvCommand>;
    options: IPargvOptions;
    constructor(options?: IPargvOptions);
    /**
     * Init
     * Common method to initialize Pargv also used in .reset().
     *
     * @param options the Pargv options object.
     */
    private init(options?);
    /**
     * Logger
     * Formats messages for logging.
     *
     * @param args log arguments.
     */
    private formatLogMessage(...args);
    /**
      * Compile Help
      * Compiles help for all commands or single defined commnand.
      *
      * @param command the optional command to build help for.
      */
    private compileHelp(command?);
    /**
     * Help Handler
     * The default help handler.
     *
     * @param command optional command to get help for.
     */
    private helpHandler(command?);
    /**
     * Error Handler
     * The default error handler.
     *
     * @param message the error message to display.
     * @param err the PargvError instance.
     */
    private errorHandler(message, err);
    /**
     * Completions Reply
     * Method called form bash profile for compreply.
     *
     * @param argv the current argv from tab completions.
     * @param done the callback on done compiling completions.
     */
    private completionsReply(parsed);
    /**
     * Build Help
     * Common method to get help before show or return.
     *
     * @param command optional command to get help for.
     */
    private buildHelp(command?);
    /**
     * Default Command
     * Exposes default command for parsing anonymous arguments.
     *
     * @example pargv.$.option('-t').parse(['one', '-t', 'test'])
     */
    readonly $: PargvCommand;
    /**
     * Gets help, completion script, completions, options...
     */
    readonly get: {
        help: (command?: string | PargvCommand) => any;
        completion: (path?: string, template?: string) => string;
        completions: (args: any[], fn: Function) => void;
        command: (key: string) => PargvCommand;
        env: () => IPargvEnv;
        option: (key: string) => any;
    };
    /**
     * Methods for setting values.
     */
    readonly set: {
        option: (key: string | IPargvOptions, val?: any) => this;
    };
    /**
     * Shows help completion script env.
     */
    readonly show: {
        help: (command?: string | PargvCommand) => void;
        completion: (path?: string, template?: string) => void;
        env: () => this;
    };
    /**
     * Removes elements and objects.
     */
    readonly remove: {
        command: (key: string) => this;
    };
    /**
     * Listen
     * : Alias for exec.
     */
    readonly listen: (...argv: any[]) => IPargvParsedResult;
    /**
     * Argv
     * Alias to exec.
     */
    readonly argv: (...argv: any[]) => IPargvParsedResult;
    /**
     * Epilogue
     * Alias to epilog.
     */
    readonly epilogue: (val: string) => this;
    /**
     * Meta
     * Accepts object containing metadata information for program.
     * Simply a way to enter name, description, version etc by object
     * rather than chaining each value.
     *
     * @param data the metadata object.
     */
    meta(data: IPargvMetadata): void;
    /**
     * App
     * Just adds a string to use as title of app, used in help.
     * If invoked without value package.json name is used.
     *
     * @see http://flamingtext.com/tools/figlet/fontlist.html
     * Simple Font examples
     * standard, doom, ogre, slant, rounded, big, banner
     *
     * @param val the value to use as app name.
     * @param font a Figlet font.
     * @param styles an ansi color/style or array of styles.
     */
    name(val: string, styles?: AnsiStyles | AnsiStyles[], font?: string): this;
    /**
     * Version
     * Just adds a string to use as the version for your program, used in help.
     * If no value is provided package.json version is used.
     *
     * @param val the value to use as version name.
     */
    version(val?: string): this;
    /**
     * Description
     * The program's description or purpose.
     *
     * @param val the description string.
     */
    description(val: string): this;
    /**
     * License
     * Stores license type for showing in help.
     *
     * @param val the license type.
     */
    license(val: string): this;
    /**
     * Epilog
     * Displays trailing message.
     *
     * @param val the trailing epilogue to be displayed.
     */
    epilog(val: string): this;
    /**
     * Command
     * A string containing Parv tokens to be parsed.
     *
     * @param command the command token string to parse.
     * @param describe a description describing the command.
     */
    command(command: string, describe?: string): PargvCommand;
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    parse(...argv: any[]): IPargvParsedResult;
    /**
     * Exec
     * Parses arguments then executes command action if any.
     *
     * @param argv optional arguments otherwise defaults to process.argv.
     */
    exec(...argv: any[]): IPargvParsedResult;
    /**
      * Reset
      * Deletes all commands and resets the default command.
      * Reset does to reset or clear custom help or error handlers
      * nor your name, description license or version. If you wish
      * to reset everyting pass true as second arg.
      */
    reset(options?: IPargvOptions, all?: boolean): this;
    /**
     * On Help
     * Method for adding custom help handler.
     *
     * @param fn the custom help handler.
     */
    onHelp(fn: HelpHandler): this;
    /**
     * On Error
     * Add custom on error handler.
     *
     * @param fn the error handler function.
     */
    onError(fn: ErrorHandler): this;
    /**
     * Error
     * Handles error messages.
     *
     * @param args args to be formatted and logged.
     */
    err(...args: any[]): this;
    /**
     * Log
     * Displays log messages after formatting, supports metadata.
     *
     * @param args the arguments to log.
     */
    log(...args: any[]): this;
    /**
     * Stats
     * Iterates array of arguments comparing to defined configuration.
     * To get stats from default command use '__default__' as key name.
     *
     * @param command the command key to get stats for.
     * @param args args to gets stats for.
     */
    stats(command: string, ...args: any[]): IPargvStats;
    /**
     * Normalize Args
     * Converts -abc to -a -b -c
     * Converts --name=bob to --name bob
     *
     * @param args the arguments to normalize.
     */
    toNormalized(...args: any[]): any[];
    /**
     * Completion
     * Adds the completion command for use within your app for generating completion script.
     *
     * @param command the name of the commpletion install command.
     * @param describe the description of the command or complete handler.
     * @param template optional template for generating completions or complete handler.
     * @param fn the optional completion handler.
     */
    completion(command?: string, fn?: CompletionHandler): Pargv;
    completion(command?: string, describe?: string, fn?: CompletionHandler): Pargv;
    completion(command?: string, describe?: string, template?: string, fn?: CompletionHandler): Pargv;
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
    logo(text?: string | IFigletOptions, font?: string, styles?: AnsiStyles | AnsiStyles[]): IPargvLogo;
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
    layout(width?: number, wrap?: boolean): IPargvLayout;
}
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
