import { Pargv, PargvCommand } from './';
export declare type FigletLayout = 'default' | 'full' | 'fitted' | 'controlled smushing' | 'universal smushing';
export declare type BeforeFigletRender = (text: string, options?: IFigletOptions) => string;
export declare type CastCallback = (val: any, option?: IPargvCommandOption, command?: IPargvCommandConfig) => boolean;
export declare type ActionCallback = (parsed?: IMetadata, command?: IPargvCommandConfig, pargv?: Pargv) => void;
export declare type FallbackCallback = (pargv?: Pargv) => void;
export interface IMap<T> {
    [key: string]: T;
}
export interface IMetadata {
    [key: string]: any;
}
export interface IFigletOptions {
    text?: string;
    font?: string;
    horizontalLayout?: FigletLayout;
    verticalLayout?: FigletLayout;
}
export interface ILayoutOptions {
    text: string;
    width?: number;
    padding?: number | number[];
    align?: string;
    border?: boolean;
}
export interface ILayout {
    div<T>(...elements: T[]): ILayout;
    span<T>(...elements: T[]): ILayout;
    join<T>(by: string, ...elements: T[]): ILayout;
    render<T>(...elements: T[]): void;
    show<T>(...elements: T[]): void;
    get(): string;
    ui: any;
}
export interface IPargvOptions {
    strict?: boolean;
    auto?: boolean;
    catchall?: 'help' | 'none' | FallbackCallback;
    injectDebug?: boolean;
}
export interface IPargvCommandConfig {
    name?: string;
    usage?: string;
    command?: string;
    description?: string;
    aliases?: string | string[];
    examples?: string[];
    options?: IMap<IPargvCommandOption>;
    action?: ActionCallback;
}
export interface IPargvCommands {
    [key: string]: PargvCommand;
}
export interface IPargvCommandOption {
    name?: string;
    description?: string;
    aliases?: string | string[];
    type?: string;
    flag?: boolean;
    required?: boolean;
    as?: string;
    position?: number;
    default?: any;
    cast?: string | CastCallback;
}