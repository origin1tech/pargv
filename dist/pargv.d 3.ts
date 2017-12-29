/// <reference types="node" />
import { ChildProcess } from 'child_process';
import { IColurs } from 'colurs';
import { PargvCommand } from './command';
import { IMap, IPargvOptions, AnsiStyles, HelpHandler, CompletionHandler, IFigletOptions, IPargvLayout, IPargvParsedResult, ErrorHandler, IPargvMetadata, IPargvEnv, LocalizeInit, IPargvStats, LogHandler } from './interfaces';
export declare class Pargv {
    private _helpEnabled;
    private _helpHandler;
    private _errorHandler;
    private _logHandler;
    private _completionsHandler;
    private _completions;
    private _completionsCommand;
    private _completionsReply;
    _colurs: IColurs;
    _localize: LocalizeInit;
    _env: IPargvEnv;
    _name: string;
    _nameFont: string;
    _nameStyles: AnsiStyles[];
    _version: string;
    _license: string;
    _describe: string;
    _base: string | boolean;
    _epilog: string;
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
     * : Maps methods/props for legacy compatiblity.
     */
    private compatibility();
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
     * Default Command
     * Exposes default command for parsing anonymous arguments.
     *
     * @example pargv.$.option('-t').parse(['one', '-t', 'test'])
     */
    readonly $: PargvCommand;
    /**
     * Env
     * Returns environment variables.
     */
    readonly env: IPargvEnv;
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
     * Shows help, completion script or env.
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
    command(command?: string, describe?: string): PargvCommand;
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
      * : Deletes all commands and resets the default command and handlers.
      * If you wish to reset all meta data like name, describe, license etc
      * set "all" to true.
      *
      * @param options Pargv options to reset with.
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
     * On Log
     * Add custom on log handler.
     *
     * @param fn the log handler function.
     */
    onLog(fn: LogHandler): this;
    /**
     * Error
     * : Handles error messages.
     *
     * @param args args to be formatted and logged.
     */
    error(...args: any[]): this;
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
     * Logo
     * Builds or Displays an ASCII logo using Figlet.
     *
     * @param text the text to be displayed.
     * @param font the figlet font to be used.
     * @param styles the optional styles to be used.
     */
    logo(text?: string | IFigletOptions, font?: string, styles?: AnsiStyles | AnsiStyles[]): string;
    /**
      * Layout
      * Creates a CLI layout much like creating divs in the terminal.
      * @see https://www.npmjs.com/package/cliui
      *
      * @param width the width of the layout.
      * @param wrap if the layout should wrap.
      */
    layout(width?: number, wrap?: boolean): IPargvLayout;
}
