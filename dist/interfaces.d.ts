import { PargvCommand, Pargv } from './';
import { PargvError } from './utils';
export declare type ErrorHandler = (message: string, error: PargvError, pargv?: Pargv) => void;
export declare type CoerceHandler = (val: any, command?: PargvCommand) => any;
export declare type ActionHandler = (...args: any[]) => void;
export declare type CompletionHandler = (current: string, argv: any[], done?: CompletionHandlerCallback) => any[];
export declare type CompletionHandlerCallback = (completions: any[]) => void;
export declare type HelpHandler = (command: string, commands?: IMap<PargvCommand>) => string;
export declare type LocalizeInit = (singular: string, plural?: string) => IPargvLocalize;
export declare type AnsiStyles = 'bold' | 'italic' | 'underline' | 'inverse' | 'dim' | 'hidden' | 'strikethrough' | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | 'grey' | 'gray' | 'bgBlack' | 'bgRed' | 'bgGreen' | 'bgYellow' | 'bgBlue' | 'bgMagenta' | 'bgCyan' | 'bgWhite' | 'bgGray' | 'bgGrey';
export declare type FigletLayout = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';
export interface IMap<T> {
    [key: string]: T;
}
export interface IPargvOptions {
    cast?: boolean;
    colorize?: boolean;
    headingDivider?: string;
    itemDivider?: string;
    locale?: string;
    localeDir?: string;
    autoHelp?: boolean;
    defaultHelp?: boolean;
    castBeforeCoerce?: boolean;
    extendCommands?: boolean;
    extendAliases?: boolean;
    extendStats?: boolean;
    spreadCommands?: boolean;
    allowAnonymous?: boolean;
    ignoreTypeErrors?: boolean;
    displayStackTrace?: boolean;
    layoutWidth?: number;
    colors?: {
        primary: AnsiStyles | AnsiStyles[];
        accent: AnsiStyles | AnsiStyles[];
        alert: AnsiStyles | AnsiStyles[];
        muted: AnsiStyles | AnsiStyles[];
    };
}
export interface IPargvEnv {
    EXEC: string;
    EXEC_PATH: string;
    NODE_PATH: string;
    HOME_PATH: string;
    GLOBAL_PATH: string;
    NODE_ENV: string;
    PLATFORM: string;
    PKG: any;
}
export interface IPargvCompletionPaths {
    appName: string;
    appPath: string;
    bashPath: string | boolean;
    completionsDir: string;
    completionsPath: string;
}
export interface IPargvCompletionsConfig {
    paths: IPargvCompletionPaths;
    command: string;
    script: string;
    sourceScript: string;
}
export interface IPargvCompletions {
    getPaths(path: string): IPargvCompletionPaths;
    ensureDir(dir: string): boolean;
    generate(path?: string, command?: string, template?: string): IPargvCompletionsConfig;
    write(path: string, script: string, append?: boolean): boolean;
    install(path?: string, command?: string, template?: string, force?: boolean): any;
    handler(current: string, args: any[], done?: CompletionHandlerCallback): any[];
}
export interface IPargvMetadata {
    name?: string | [string, AnsiStyles | AnsiStyles[], string];
    description?: string;
    version?: string;
    license?: string;
    epilog?: string;
}
export interface IPargvCommandOption {
    key?: string;
    usage?: string[];
    describe?: string;
    default?: any;
    aliases?: string[];
    as?: string;
    index?: number;
    type?: string | RegExp | CoerceHandler;
    flag?: boolean;
    bool?: boolean;
    required?: boolean;
}
export interface IPargvParsedResult {
    $exec?: string;
    $command?: string;
    $commands?: string[];
    $source?: string[];
    $stats?: IPargvStats;
    [key: string]: any;
}
export interface IPargvCoerceConfig {
    fn: string | RegExp | CoerceHandler;
    def?: any;
}
export interface IPargvWhenConfig {
    demand: string;
    converse?: boolean;
}
export interface IFigletOptions {
    text?: string;
    font?: string;
    horizontalLayout?: FigletLayout;
    verticalLayout?: FigletLayout;
}
export interface IPargvLayout {
    div(...elements: any[]): IPargvLayout;
    span(...elements: any[]): IPargvLayout;
    repeat(char: string, len?: number, padding?: number | number[]): IPargvLayout;
    section(title: string, padding?: number | number[]): IPargvLayout;
    join(by: string, ...elements: any[]): IPargvLayout;
    show(...elements: any[]): void;
    get(): string;
    ui: any;
}
export interface IPargvLogo {
    fonts(): any[];
    show(): void;
    get(): string;
}
export interface IPargvStats {
    commands?: any[];
    options?: any[];
    map?: any[];
    normalized: any[];
    missing?: any[];
    anonymous?: any[];
    whens?: any[];
}
export interface IPargvLocalize {
    args(...args: any[]): IPargvLocalize;
    setArg(singular: string, plural?: string | number, index?: number): IPargvLocalize;
    styles(...styles: any[]): IPargvLocalize;
    count(count: number): IPargvLocalize;
    done(): string;
}
export interface WriteStreamExtended extends NodeJS.WriteStream {
    _handle: any;
}
