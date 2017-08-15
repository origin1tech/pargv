import { IPargvOptions, IFigletOptions, BeforeFigletRender, IPargvCommandConfig, IMap, IPargvCommandOption, ActionCallback, ILayout, CastCallback, IPargvCommands } from './interfaces';
export declare class PargvCommand {
    private _context;
    private _usage;
    private _description;
    private _aliases;
    private _examples;
    private _action;
    private _depends;
    name: string;
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
     * Find Option
     * Looks up an option by name or alias.
     *
     * @param key the key or alias name to find option by.
     */
    findOption(key: string): IPargvCommandOption;
    /**
     * Option
     * Adds option to command.
     *
     * @param val the option val to parse or option configuration object.
     * @param description the description for the option.
     * @param def the default value.
     * @param cast the expression, method or type for validating/casting.
     */
    option(val: string | IPargvCommandOption, description?: string, def?: any, cast?: string | RegExp | CastCallback): this;
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
     * Saves the description for the command.
     *
     * @param val the description.
     */
    description(val: string): this;
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
     * Command
     * Creates new command configuration.
     *
     * @param command the command to be matched or options object.
     * @param description the description or options object.
     * @param options options object for the command.
     */
    command(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig): (command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig) => PargvCommand;
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    parse(...argv: any[]): void;
}
export declare class Pargv {
    private _usage;
    private _parsed;
    commands: IPargvCommands;
    options: IPargvOptions;
    constructor(options?: IPargvOptions);
    /**
     * UI
     * Alias to layout for backward compatibility.
     */
    readonly ui: (width?: number, wrap?: boolean) => ILayout;
    /**
     * Usage
     * Simply a string denoting the general command and options layout.
     * If not defined the usage statement for the first command is used.
     *
     * @param val the usage string.
     */
    usage(val: string): this;
    /**
     * Command
     * Creates new command configuration.
     *
     * @param command the command to be matched or options object.
     * @param description the description or options object.
     * @param options options object for the command.
     */
    command(command: string | IPargvCommandConfig, description?: string | IPargvCommandConfig, options?: IPargvCommandConfig): PargvCommand;
    /**
     * Parse
     * Parses the provided arguments inspecting for commands and options.
     *
     * @param argv the process.argv or custom args array.
     */
    parse(...argv: any[]): void;
    /**
     * Help
     * Displays the generated help or supplied help string.
     *
     * @param val optional value to use instead of generated help.
     */
    help(val?: string): this;
    /**
     * Logo
     * Displays an ASCII logo using Figlet.
     *
     * @param text the text to be displayed.
     * @param font the figlet font to be used.
     * @param color the optional color to be used.
     * @param horizontalLayout the horizontal layout mode.
     * @param verticalLayout the vertical layout mode.
     */
    logo(text: string | IFigletOptions, font?: string): {
        before: (fn: BeforeFigletRender) => Pargv;
        show: () => Pargv;
        result: () => string;
    };
    /**
     * Fonts
     * Returns list of figlet fonts.
     */
    fonts(): any;
    /**
      * Layout
      * Creates a CLI layout much like creating divs in the terminal.
      * Supports strings with \t \s \n or IUIOptions object.
      * @see https://www.npmjs.com/package/cliui
      *
      * @param width the width of the layout.
      * @param wrap if the layout should wrap.
      */
    layout(width?: number, wrap?: boolean): ILayout;
}
declare function createInstance(options?: IPargvOptions): Pargv;
export { createInstance as get };
