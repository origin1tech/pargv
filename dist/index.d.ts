import { IPargvOptions, IFigletOptions, IPargvCommandConfig, IMap, IPargvCommandOption, ActionCallback, ILayout, CoerceCallback, IPargvCommands, IPargvOptionStats, AnsiStyles, ILogo } from './interfaces';
export declare class PargvCommand {
    private _depends;
    _usage: string;
    _name: string;
    _description: string;
    _aliases: string[];
    _coercions: IMap<CoerceCallback>;
    _demands: string[];
    _examples: string[];
    _action: ActionCallback;
    pargv: Pargv;
    options: IMap<IPargvCommandOption>;
    constructor(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig, context?: Pargv);
    /**
     * Parse Command
     * Parses command tokens to command object.
     *
     * @param val the command value to parse.
     */
    private parseTokens(val, isCommand?);
    /**
     * Coerce
     * Coerce or transform the defined option when matched.
     *
     * @param key the option key to be coerced.
     * @param fn the string type, RegExp or coerce callback.
     * @param def an optional value when coercion fails.
     */
    private normalizeCoercion(fn, def?);
    command(config: IPargvCommandConfig): PargvCommand;
    command(command: string): PargvCommand;
    command(command: string, config: IPargvCommandConfig): PargvCommand;
    command(command: string, description: string, config: IPargvCommandConfig): PargvCommand;
    /**
     * Find Option
     * Looks up an option by name, alias or position.
     *
     * @param key the key or alias name to find option by.
     */
    findOption(key: string | number): IPargvCommandOption;
    findInCollection<T>(key: string, coll: any, def?: any): T;
    /**
     * Alias To Name
     * Converts an alias to the primary option name.
     *
     * @param alias the alias name to be converted.
     */
    aliasToName(alias: string): string;
    /**
     * Stats
     * Validates the arguments to be parsed return stats.
     *
     * @param argv the array of arguments to validate.
     */
    stats(argv: any[]): IPargvOptionStats;
    /**
     * Option
     * Adds option to command.
     *
     * @param val the option val to parse or option configuration object.
     * @param description the description for the option.
     * @param def the default value.
     * @param coerce the expression, method or type for validating/casting.
     */
    option(val: string | IPargvCommandOption, description?: string, coerce?: string | RegExp | CoerceCallback, def?: any): this;
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
     * Demands that the option be present when parsed.
     *
     * @param val the value or list of flags to require.
     * @param args allows for demands as separate method signature params.
     */
    demand(val: string | string[], ...args: string[]): void;
    /**
     * Depends
     * When this option demand dependents.
     *
     * @param when when this option demand the following.
     * @param demand the option to demand.
     * @param args allows for separate additional vals denoting demand param.
     */
    depends(when: string, demand: string | string[], ...args: string[]): void;
    /**
     * Description
     * Saves the description for a command or option.
     *
     * @param key the option key to set description for, none for setting command desc.
     * @param val the description.
     */
    description(key: string, val?: string): this;
    /**
     * Alias
     * Adds aliases for the command.
     *
     * @param val the value containing command aliases.
     * @param args allows for aliases as separate method signature params.
     */
    alias(val: string | string[], ...args: string[]): this;
    /**
     * Action
     * Adds an action event to be called when parsing matches command.
     *
     * @param fn the callback function when parsed command matches.
     */
    action(fn: ActionCallback): this;
    /**
     * Example
     * Simply stores provided string as an example for displaying in help.
     *
     * @param val the example value to be stored.
     * @param args allows for examples as separate method signature params.
     */
    example(val: string | string[], ...args: any[]): this;
    /**
     * Epilog
     * Adds trailing message like copying to help.
     */
    epilog(val: string): Pargv;
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    parse(...argv: any[]): (...argv: any[]) => any;
    /**
     * Exec
     * Parses arguments then executes command action if any.
     *
     * @param argv optional arguments otherwise defaults to process.argv.
     */
    exec(...argv: any[]): (...argv: any[]) => void;
}
export declare class Pargv {
    private _name;
    private _nameFont;
    private _nameStyles;
    private _version;
    private _description;
    private _epilog;
    private _helpDisabled;
    private _helpHandler;
    commands: IPargvCommands;
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
     * UI
     * Alias to layout for backward compatibility.
     */
    readonly ui: (width?: number, wrap?: boolean) => ILayout;
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
     * @param val the description string.
     */
    description(val: string): this;
    /**
     * Command
     * Creates new command configuration.
     *
     * @param command the command to be matched or options object.
     * @param description the description or options object.
     * @param options options object for the command.
     */
    command(config: IPargvCommandConfig): PargvCommand;
    command(command: string): PargvCommand;
    command(command: string, config: IPargvCommandConfig): PargvCommand;
    command(command: string, description: string, config: IPargvCommandConfig): PargvCommand;
    /**
   * Epilog
   * Displays trailing message.
   *
   * @param val the trailing epilogue to be displayed.
   */
    epilog(val: string): this;
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
     * Help
     * Helper method for defining custom help text.
     *
     * @param val callback for custom help or boolean to toggle enable/disable.
     */
    help(disabled: boolean): Pargv;
    /**
     * Show Help
     * Displays all help or help for provided command name.
     *
     * @param command optional name for displaying help for a particular command.
     */
    showHelp(command?: string | PargvCommand): void;
    /**
     * Remove
     * Removes an existing command from the collection.
     *
     * @param cmd the command name to be removed.
     */
    remove(cmd: string): void;
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
declare function createInstance(options?: IPargvOptions): Pargv;
export { createInstance as get };
