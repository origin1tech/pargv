import { ChalkChain, Chalk as ChalkChalk } from 'chalk';

export type LoggerCallback = { (type?: string, args?: any[], logger?: ILogger) };

export type ActionCallback = { () };

export interface IUIOptions {
	text: string,
	width?: number;
	padding?: number[];
	align?: 'right' | 'center';
}

export interface IUI {
	div(value: string | IUIOptions, ...args: IUIOptions[]): IUI;
	span(value: string | IUIOptions, ...args: IUIOptions[]): IUI;
	join(...args: any[]): IUI;
	show(display?: boolean): void;
}

export interface ILoggerColors {
	error: string,
	warn: string,
	info: string,
	debug: string
}

export interface ILogger {

	enabled(state?: boolean): void;
	trace(trace?: boolean): boolean;
	level(level?: number): number;

	error(...args: any[]): ILogger;
	warn(...args: any[]): ILogger;
	info(...args: any[]): ILogger;
	debug(...args: any[]): ILogger;
	write(): ILogger;

	exit(): void;

}

export interface IPargvOptions {
	index: number;
	setCommand: boolean;
	castTypes: boolean;
	logLevel: number;
	logCallback: { type: string, args: any[], logger: ILogger }
}

export interface IPargvFlags {
	[key: string]: any;
}

export interface IParsers {
	[key: string]: { (val: any): boolean };
}

export interface IPargvParsed extends IPargvFlags {
	cmd: string;
	cmds: any[];
	source: string[];
	nodePath: string;
	execPath: string;
	exec: string;
	globalPath: string;
	isGlobalExec: boolean;
	[key: string]: any; // for custom parsed props.
}

export interface IPargv extends IPargvParsed {

	cmd: string;
	cmds: any[];
	source: string[];
	nodePath: string;
	execPath: string;
	exec: string;
	globalPath: string;
	isGlobalExec: boolean;
	options: IPargvOptions;
	customParsers: IParsers;
	log: ILogger;
	chalk: ChalkChain;
	actions: { [key: string]: ActionCallback };

	configure(index: number | IPargvOptions, options?: IPargvOptions): IPargv;
	addParser(name: string, fn: Function, overwrite?: boolean): IPargv;
	parse(args?: string[]): IPargv | void;
	cast(value: any): any;
	getFlags(): IPargvFlags;
	hasCmd(...args): boolean;
	getCmd(index?: number): string;
	flagsToArray(defaults?: Object | boolean, stripQuotes?: boolean): any[];
	flagsToString(defaults?: Object | string, char?: string): string[];
	stripExec(): string[];
	logo(options: any): IPargv;
	logo(font: any, text?: string, color?: string): IPargv;
	action(cmd: string, action: ActionCallback): IPargv;
	action(cmd: string, alias: string | string[] | ActionCallback, action?: ActionCallback): IPargv;
	ui(wdith?: number): IUI;
	ui(usage?: string | number, width?: number): IUI;
	fonts(): string[];
	reset(): IPargv;

}

interface PargvStatic extends IPargv {
	new (index?: number | IPargvOptions, options?: IPargvOptions): IPargv;
}

interface ChalkStatic {
	new (options?: { enabled?: boolean }): ChalkChalk;
}

export function logger(colors: ILoggerColors): ILogger;
export function logger(trace: boolean): ILogger;
export function logger(fn: LoggerCallback): ILogger;
export function logger(level: number, trace: boolean): ILogger;
export function logger(level: number, fn: LoggerCallback): ILogger;
export function logger(level: number, colors: ILoggerColors, fn: LoggerCallback): ILogger;
export function logger(level?: number | ILoggerColors | boolean | LoggerCallback, colors?: ILoggerColors | boolean | LoggerCallback, trace?: boolean | LoggerCallback, fn?: LoggerCallback): ILogger;

declare const Pargv: PargvStatic;
declare const Chalk: ChalkStatic;

// export interface ICLIUI {

// 	width: number;
// 	wrap: any;
// 	rows: any[];
// 	span(): void;
// 	div(): any;

// 	_shouldApplyLayoutDSL(): boolean;
// 	_applyLayoutDSL(str: any): any;
// 	_colFromString(str: any): {
// 		text: any;
// 		padding: number[];
// 	};
// 	_measurePadding(str: any): number[];
// 	toString(): string;
// 	rowToString(row: any, lines: any): any;
// 	_renderInline(source: any, previousLine: any): any;
// 	_rasterize(row: any): any[];
// 	_negatePadding(col: any): any;
// 	_columnWidths(row: any): any[];

// }

