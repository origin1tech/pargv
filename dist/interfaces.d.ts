/// <reference types="node" />
import { SpawnOptions, ChildProcess, SpawnSyncReturns, SpawnSyncOptions } from 'child_process';
import { PargvCommand } from './';
import { IAnsiStyles } from 'colurs';
export declare type ErrorHandler = (err: Error) => void;
export declare type NodeCallback = (err?: Error, data?: any) => void;
export declare type LogHandler = (message: string) => void;
export declare type CoerceHandler = (val: any, command?: PargvCommand) => any;
export declare type ActionHandler = (...args: any[]) => void;
export declare type SpawnAsyncMethod = (command: string | IPargvSpawnConfig, args?: string[], options?: SpawnOptions) => ChildProcess;
export declare type SpawnSyncMethod = (command: string, args?: string[], options?: SpawnSyncOptions) => SpawnSyncReturns<Buffer | string>;
export declare type SpawnMethod = SpawnAsyncMethod;
export declare type SpawnActionHandler = (method: SpawnMethod, config: IPargvSpawnConfig, parsed?: IPargvParsedResult, cmd?: PargvCommand) => void | ChildProcess;
export declare type CompletionHandler = (current: string, argv: any[] | NodeCallback, done?: CompletionHandlerCallback) => any[];
export declare type CompletionHandlerCallback = (completions: any[]) => void;
export declare type HelpHandler = (command: string, commands?: IMap<PargvCommand>) => any;
export declare type LocalizeInit = (singular: string, plural?: string) => IPargvLocalize;
export declare type AnsiStyles = keyof IAnsiStyles;
export interface IMap<T> {
    [key: string]: T;
}
export interface IPargvSpawnConfig {
    command: string;
    args: any[];
    options: SpawnOptions;
}
export interface IPargvOptions {
    cast?: boolean;
    splitArgs?: string | null;
    colorize?: boolean;
    displayHeader?: boolean;
    displayFooter?: boolean;
    displayNone?: boolean;
    displayTitles?: boolean;
    headingDivider?: string;
    commandDivider?: string;
    itemDivider?: string;
    locale?: string;
    localeDir?: string;
    defaultHelp?: boolean;
    castBeforeCoerce?: boolean;
    extendArguments?: boolean;
    spreadArguments?: boolean;
    extendAliases?: boolean;
    extendStats?: boolean;
    allowAnonymous?: boolean;
    ignoreTypeErrors?: boolean;
    layoutWidth?: number;
    colors?: {
        primary?: AnsiStyles | AnsiStyles[];
        accent?: AnsiStyles | AnsiStyles[];
        alert?: AnsiStyles | AnsiStyles[];
        muted?: AnsiStyles | AnsiStyles[];
    };
    fallbackHelp?: boolean | HelpHandler;
    autoHelp?: boolean;
    exitHelp?: boolean;
    extendCommands?: boolean;
    spreadCommands?: boolean;
    displayStackTrace?: boolean;
}
export interface IPargvEnv {
    CWD: string;
    EXEC: string;
    EXEC_PATH: string;
    NODE_PATH: string;
    HOME_PATH: string;
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
    name?: string;
    description?: string;
    version?: string;
    license?: string;
    epilog?: string;
    [key: string]: any;
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
    isVariadic: boolean;
}
export interface IPargvParsedResult {
    $exec?: string;
    $command?: string;
    $external?: string;
    $arguments?: any[];
    $variadics?: any[];
    $source?: string[];
    $stats?: IPargvStats;
    [key: string]: any;
    $commands?: any[];
}
export interface IPargvCoerceConfig {
    fn: string | RegExp | CoerceHandler;
    def?: any;
}
export interface IPargvWhenConfig {
    demand: string;
    converse?: boolean;
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
    arguments?: any[];
    options?: any[];
    map?: any[];
    normalized: any[];
    missing?: any[];
    anonymous?: any[];
    whens?: any[];
    argumentsCount?: number;
    optionsCount?: number;
    commands?: any[];
    commandsCount?: number;
}
export interface IPargvLocalize {
    args(...args: any[]): IPargvLocalize;
    setArg(singular: string, plural?: string | number, index?: number): IPargvLocalize;
    styles(...styles: any[]): IPargvLocalize;
    count(count: number): IPargvLocalize;
    done(): string;
}
