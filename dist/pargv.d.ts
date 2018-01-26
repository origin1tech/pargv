/// <reference types="node" />
import { ChildProcess } from 'child_process';
import { PargvCommand } from './command';
import { IMap, IPargvOptions, AnsiStyles, HelpHandler, CompletionHandler, IPargvLayout, IPargvParsedResult, ErrorHandler, IPargvMetadata, IPargvEnv, LocalizeInit, IPargvStats, CoerceHandler, LogHandler, IPargvCoerceConfig, IPargvWhenConfig, ActionHandler } from './interfaces';
import { EventEmitter } from 'events';
export declare class Pargv extends EventEmitter {
    private _helpHandler;
    private _errorHandler;
    private _logHandler;
    private _completionsHandler;
    private _completions;
    private _completionsCommand;
    private _completionsReply;
    private _base;
    private _meta;
    private _command;
    _env: IPargvEnv;
    _localize: LocalizeInit;
    _commands: IMap<PargvCommand>;
    _helpCommand: string;
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
     * Compatibility
     * Ensures compatibility with deprecated properties.
     *
     * @param key the key or object to map.
     * @param warn when true deprecation message is logged.
     */
    private compatibility(key, warn?);
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
     * @param err the PargvError instance.
     */
    private errorHandler(err);
    /**
     * Log Handler
     * : Handles internal log messages.
     *
     * @param message the message to be logged.
     */
    private logHandler(message);
    /**
     * Build Help
     * Common method to get help before show or return.
     *
     * @param command optional command to get help for.
     */
    private buildHelp(command?);
    /**
     * Normalize Args
     * Converts -abc to -a -b -c
     * Converts --name=bob to --name bob
     *
     * @param args the arguments to normalize.
     */
    private toNormalized(...args);
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
      * Option
      * : Gets an option value by the specified key.
      *
      * @param key the option key to get.
      */
    getOption(key: string): any;
    /**
     * Option
     * : Sets an option or group of options.
     *
     * @param key the key or PargvOptions object to be set.
     * @param val the value for the provided key.
     */
    setOption(key: string | IPargvOptions, val?: any): this;
    /**
     * Help
     * : Gets help text.
     *
     * @param command optional command to show help for.
     */
    getHelp(command?: string | PargvCommand): any;
    /**
     * Help
     * Shows help in terminal.
     *
     * @param command optional command to show help for.
     */
    showHelp(command?: string | PargvCommand): this;
    /**
      * Get Completion
      * : Gets the completion script.
      *
      * @param path the path/name of executable.
      * @param template the template string.
      */
    getCompletion(path?: string, template?: string): string;
    /**
     * Completion
     * Shows the completion script in terminal.
     *
     * @param path the path/name of executable.
     * @param template the template string.
     */
    showCompletion(path?: string, template?: string): this;
    /**
     * Command
     * : Finds a command by name.
     *
     * @param key the name of the command to find.
     */
    getCommand(key: string): PargvCommand;
    /**
     * Remove
     * Removes a command from the collection.
     *
     * @param key the command key/name to be removed.
     */
    removeCommand(key: string): this;
    /**
     * Meta
     * Enables adding metadata to your header.
     *
     * @example
     * .meta('version', '1.1.0')
     *
     * @param meta the metadata object.
     */
    meta(meta: IPargvMetadata): Pargv;
    /**
      * Meta
      * Enables adding metadata to your header.
      *
      * @example
      * .meta('version', '1.1.0')
      *
      * @param key the key to be added.
      * @param val the value for key, if undefined will try to lookup from package.json.
      */
    meta(key: string, val?: any): Pargv;
    /**
     * Name
     * Adds name of CLI to help header.
     *
     * @param val the value to use as app name.
     * @param font a Figlet font. (DEPRECATED)
     * @param styles an ansi color/style or array of styles. (DEPRECATED)
     */
    name(val?: string, styles?: AnsiStyles | AnsiStyles[], font?: string): Pargv;
    /**
     * Version
     * Adds version to help header.
     *
     * @param val the value to use as version name.
     */
    version(val?: string): Pargv;
    /**
     * License
     * Adds license to help header.
     *
     * @param val the license type.
     */
    license(val?: string): Pargv;
    /**
     * Description
     * Adds description to help header.
     *
     * @param val the description string.
     */
    description(val?: string): Pargv;
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
    command(command: string, describe?: string): Partial<PargvCommand>;
    /**
      * Spawn
      * : Spawns and executes and external command.
      *
      * @param parsed the parsed command result.
      * @param cmd a PargvCommand instance.
      * @param stdio optional stdio for child process.
      * @param exit indicates if should exit after process.
      */
    spawn(parsed: IPargvParsedResult, cmd: PargvCommand, stdio?: any, exit?: boolean): ChildProcess;
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
     * Base
     * : Sets a base path for all external scripts that contain extentions.
     *
     * @param path a base path for ALL external command scripts.
     */
    base(path: string | boolean): void;
    /**
      * Completion
      * : Adds the completion command for use within your app for generating completion script.
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
      * Completion Result
      * Method called maually or by script stored in your bash profile.
      *
      * @param line the Pargv parsed result, array of values or string (current line).
      * @param fn the callback on done compiling completions.
      */
    completionResult(line: string | string[] | IPargvParsedResult, fn?: CompletionHandler): string[];
    /**
      * Reset
      * Clears all defined commands as well as custom handlers and metadata.
      *
      * @param all when true resets metadata, base, help handler if set.
      */
    reset(all?: boolean): Pargv;
    /**
     * Reset
     * Clears all commands and optionally resets custom handlers and metadata.
     *
     * @param options Pargv options to reset with.
     * @param all when true resets metadata, base, help handler if set.
     */
    reset(options?: IPargvOptions, all?: boolean): Pargv;
    /**
     * On Help
     * Method for adding custom help handler, disabling.
     * If custom handler return compiled help to be displayed or false to handle manually.
     *
     * @param fn boolean to enable/disable, or function for custom help.
     */
    onHelp(fn?: boolean | HelpHandler): this;
    /**
     * On Error
     * Add custom on error handler.
     *
     * @param fn the error handler function.
     */
    onError(fn?: ErrorHandler): this;
    /**
     * On Log
     * Add custom on log handler.
     *
     * @param fn the log handler function.
     */
    onLog(fn?: LogHandler): this;
    /**
     * Error
     * : Handles error messages.
     *
     * @param args args to be formatted and logged.
     */
    error(...args: any[]): void;
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
      * Layout
      * Creates a CLI layout much like creating divs in the terminal.
      * @see https://www.npmjs.com/package/cliui
      *
      * @param width the width of the layout.
      * @param wrap if the layout should wrap.
      */
    layout(width?: number, wrap?: boolean): IPargvLayout;
    /**
     * Usage
     * Usage is generated automatically, this method allows override of the internal generated usage for default command.
     *
     * @param val the value to display for command usage.
     */
    usage(val: string): this;
    /**
      * Option
      * Adds option to default command.
      *
      * Supported types: string, date, array,
      * number, integer, float, json, regexp, boolean
      *
      * @param token the option token to parse as option.
      * @param describe the description for the option.
      * @param def an optional default value.
      * @param type a string type, RegExp to match or Coerce method.
      */
    option(token: string, describe?: string, def?: any, type?: string | RegExp | CoerceHandler): Pargv;
    /**
     * Alias
     * Maps alias configs to default command.
     *
     * @param config object map containing aliases.
     */
    alias(config: IMap<string[]>): Pargv;
    /**
     * Alias
     * Maps alias to default command.
     *
     * @param key the key to map alias keys to.
     * @param alias keys to map as aliases.
     */
    alias(key: string, ...alias: string[]): Pargv;
    /**
     * Describe
     * Adds description for default command sub command argument or option.
     *
     * @param config object containing describes by property.
     */
    describe(config: IMap<string>): Pargv;
    /**
     * Describe
     * Adds description for default command sub command argument or option.
     *
     * @param key the option key to add description to.
     * @param describe the associated description.
     */
    describe(key: string, describe?: string): Pargv;
    /**
     * Coerce
     * Coerce or transform each sub command argument or option in config object for default command.
     *
     * @param config object containing coerce configurations.
     */
    coerce(config: IMap<IPargvCoerceConfig>): Pargv;
    /**
     * Demand
     * The sub command argument or option keys to be demanded for default command.
     *
     * @param key the key to demand.
     */
    demand(...keys: string[]): Pargv;
    /**
     * When
     * When a specified key in config object demand dependent key for default command.
     *
     * @param config an object containing when configurations.
     */
    when(config: IMap<IPargvWhenConfig>): Pargv;
    /**
     * When
     * When a specified key demand dependent key for default command.
     *
     * @param key require this key.
     * @param converse when true the coverse when is also created.
     */
    when(key: string, converse?: string): Pargv;
    /**
     * When
     * When a specified key demand dependent key for default command.
     *
     * @param key require this key.
     * @param demand this key is present.
     * @param converse when true the coverse when is also created.
     */
    when(key: string, demand?: string, converse?: boolean): Pargv;
    /**
     * Default
     * Sets a default value for specified sub command argument or option in default command.
     *
     * @param config an object containing configs for property defaults.
     */
    default(config: IMap<any>): Pargv;
    /**
     * Default
     * Sets a default value for specified sub command argument or option in default command.
     *
     * @param key the key to set default value for.
     * @param val the value to set for the provided key.
     */
    default(key: string, val: any): Pargv;
    /**
     * Max Options
     * Specifies the maxium options allowed for default command.
     *
     * @param count the number of options allowed.
     */
    maxOptions(count: number): this;
    /**
     * Min Options
     * Specifies the minimum options required for default command.
     *
     * @param count the number of options required.
     */
    minOptions(count: number): this;
    /**
     * Completion At
     * : Injects custom completion value for specified key.
     * Key can be a known sub command argument option or * for anonymous.
     *
     * @param key the key to inject completion values for.
     * @param vals the completion values for the provided key.
     */
    completionFor(key: string, ...vals: any[]): Pargv;
    /**
     * Action
     * Adds an action event to be called when parsing matches command.
     *
     * @param fn the callback function when parsed command matches.
     */
    action(fn: ActionHandler): Pargv;
    /**
     * Extend Aliases
     * When true option aliases are extended on result object --option, -o results in { option: value, o: value }.
     *
     * @param extend when true aliases are exteneded on Pargv result object.
     */
    extendAliases(extend?: boolean): Pargv;
    /**
     * Example
     * : Saves an example string/tuple of example string & description for default command.
     *
     * @param example string or an array of tuples [example, description].
     * @param describe the description for the example.
     */
    example(example: string | [string, string][], describe?: string): Pargv;
    /**
     * Help
     * Enables or disables help for default command.
     *
     * @param enabled true or false to toggle help.
     */
    help(enabled?: boolean): Pargv;
    readonly if: {
        (config: IMap<IPargvWhenConfig>): Pargv;
        (key: string, converse?: string): Pargv;
        (key: string, demand?: string, converse?: boolean): Pargv;
    };
    /**
     * @deprecated use pargv.command()
     *
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
        command: (key: string) => PargvCommand;
        option: (key: string) => any;
    };
    /**
     * Methods for setting values.
     */
    readonly set: {
        option: (key: string | IPargvOptions, val?: any) => this;
    };
    /**
     * Shows help, completion script or env.
     */
    readonly show: {
        help: (command?: string | PargvCommand) => this;
        completion: (path?: string, template?: string) => this;
    };
    /**
     * Removes elements and objects.
     */
    readonly remove: {
        command: (key: string) => this;
    };
}
