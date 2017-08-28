import { IMap, IPargvOptions, ActionCallback, CoerceCallback, AnsiStyles, IFigletOptions, ILayout, ILogo } from './interfaces';
export declare class Pargv {
    private _helpDisabled;
    private _helpHandler;
    private _command;
    _name: string;
    _nameFont: string;
    _nameStyles: AnsiStyles[];
    _version: string;
    _describe: string;
    _epilog: string;
    commands: IMap<PargvCommand>;
    options: IPargvOptions;
    constructor(options?: IPargvOptions);
    /**
      * Compile Help
      * Compiles help for all commands or single defined commnand.
      *
      * @param command the optional command to build help for.
      */
    private compileHelp(command?);
    /**
     * Find
     * Methods for finding commands and options.
     */
    readonly find: {
        command: (key: string) => PargvCommand;
    };
    /**
     * UI
     * Alias to layout.
     */
    readonly ui: (width?: number, wrap?: boolean) => ILayout;
    /**
     * Epilogue
     * Alias to epilog.
     */
    readonly epilogue: (val: string) => this;
    readonly option: (token: string, describe?: string, def?: any) => PargvCommand;
    readonly alias: (key: string, ...alias: string[]) => PargvCommand;
    readonly describe: (key: string, describe: string) => PargvCommand;
    readonly coerce: (key: string, fn: string | RegExp | CoerceCallback, def?: any) => PargvCommand;
    readonly demand: (key: string | string[], ...keys: string[]) => PargvCommand;
    readonly demandIf: (key: string, when: string) => void;
    readonly min: (count: number) => PargvCommand;
    readonly action: (fn: ActionCallback) => PargvCommand;
    /**
     * App
     * Just adds a string to use as title of app, used in help.
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
     *
     * @param val the value to use as version name.
     */
    version(val: string): this;
    /**
     * Description
     * The program's description or purpose.
     *
     * @param describe the description string.
     */
    description(describe: string): this;
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
     * @param token the command token string to parse.
     * @param describe a description describing the command.
     */
    command(token: string, describe?: string): PargvCommand;
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    parse(...argv: any[]): any;
    /**
     * Exec
     * Parses arguments then executes command action if any.
     *
     * @param argv optional arguments otherwise defaults to process.argv.
     */
    exec(...argv: any[]): void;
    /**
      * Show Help
      * Displays all help or help for provided command name.
      *
      * @param command optional name for displaying help for a particular command.
      */
    showHelp(command?: string | PargvCommand): void;
    /**
     * Help
     * Helper method for defining custom help text.
     *
     * @param val callback for custom help or boolean to toggle enable/disable.
     */
    help(disabled: boolean): Pargv;
    /**
     * Stats
     * Iterates array of arguments comparing to defined configuration.
     * To get stats from default command use '__default__' as key name.
     *
     * @param key the command key to get stats for.
     * @param args args to gets stats for.
     */
    stats(key: string, ...args: any[]): {
        commands: any[];
        options: any[];
        anonymous: any[];
        required: any[];
        missing: any[];
        normalized: any[];
    };
    /**
     * Remove
     * Removes a command from the collection.
     *
     * @param key the command key to be removed.
     */
    remove(key: string): this;
    /**
     * Reset
     * Resets the default command.
     */
    reset(): this;
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
    logo(text?: string | IFigletOptions, font?: string, styles?: AnsiStyles | AnsiStyles[]): ILogo;
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
    layout(width?: number, wrap?: boolean): ILayout;
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
    _describes: IMap<string>;
    _coercions: IMap<CoerceCallback>;
    _demands: string[];
    _min: number;
    _action: ActionCallback;
    _pargv: Pargv;
    constructor(token: string, describe?: string, pargv?: Pargv);
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
     * Parse Command
     * Parses a command token.
     *
     * @param token the command token string to parse.
     */
    private parseCommand(token?);
    /**
     * Alias To Name
     * Maps an alias key to primary command/flag name.
     *
     * @param key the key to map to name.
     */
    private aliasToKey(key);
    /**
      * Option
      * Adds option to command.
      *
      * @param token the option token to parse as option.
      * @param describe the description for the option.
      * @param def an optional default value.
      */
    option(token: string, describe?: string, def?: any): this;
    /**
     * Alias
     * Maps alias keys to primary flag/command key.
     *
     * @param key the key to map alias keys to.
     * @param alias keys to map as aliases.
     */
    alias(key: string, ...alias: string[]): this;
    /**
     * Describe
     * Adds description for an option.
     *
     * @param key the option key to add description to.
     * @param describe the associated description.
     */
    describe(key: string, describe: string): this;
    /**
     * Coerce
     * Coerce or transform the defined option when matched.
     *
     * @param key the option key to be coerced.
     * @param fn the string type, RegExp or coerce callback.
     * @param def an optional value when coercion fails.
     */
    coerce(key: string, fn: string | RegExp | CoerceCallback, def?: any): this;
    /**
     * Demand
     * The commands or flag/option keys to demand.
     *
     * @param key the key to demand.
     * @param keys additional keys to demand.
     */
    demand(key: string | string[], ...keys: string[]): this;
    /**
     * Demand If
     * Demands a key when parent key is present.
     *
     * @param key require this key.
     * @param when this key is present.
     */
    demandIf(key: string, when: string): void;
    /**
     * Min
     * A value indicating the minimum number of commands.
     *
     * @param count the minimum command count.
     */
    min(count: number): this;
    /**
     * Action
     * Adds an action event to be called when parsing matches command.
     *
     * @param fn the callback function when parsed command matches.
     */
    action(fn: ActionCallback): this;
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
    stats(args: any[]): {
        commands: any[];
        options: any[];
        anonymous: any[];
        required: any[];
        missing: any[];
        normalized: any[];
    };
}
