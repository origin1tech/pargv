
declare module 'pargv' {

	export interface ILogger {
		level: number;
		error(...args: any[]): ILogger;
		warn(...args: any[]): ILogger;
		info(...args: any[]): ILogger;
		debug(...args: any[]): ILogger;
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

		log: ILogger;
		customParsers: IParsers;
		options: IPargvOptions;
		configure(index: number | IPargvOptions, options?: IPargvOptions): IPargv;
		addParser(name: string, fn: Function, overwrite?: boolean): IPargv;
		parse(args?: string[]): IPargv;
		cast(value: any): any;
		getFlags(): IPargvFlags;
		hasCmd(): boolean;
		getCmd(index?: number): string;
		flagsToArray(): any[];
		flagsToString(): string;
		ui(): any;
		fonts(): any;
		reset(): IPargv;

	}

	export let cmd: string;
	export const cmds: any[];
	export const source: string[];
	export const nodePath: string;
	export const execPath: string;
	export const exec: string;
	export const globalPath: string;
	export const isGlobalExec: boolean;
	export const options: IPargvOptions;
	export const customParsers: IParsers;
	export const log: ILogger;

	export function configure(index: number | IPargvOptions, options?: IPargvOptions): IPargv;
	export function addParser(name: string, fn: Function, overwrite?: boolean): IPargv;
	export function parse(args?: string[]): IPargv;
	export function cast(value: any): any;
	export function getFlags(): IPargvFlags;
	export function hasCmd(...args): boolean;
	export function getCmd(index?: number): string;
	export function flagsToArray(defaults?: Object | boolean, stripQuotes?: boolean): any[];
	export function flagsToString(defaults?: Object | string, char?: string): string[];
	export function stripExec(): string[];
	export function logo(options: any): IPargv;
	export function logo(font: any, text?: string, color?: string): IPargv;
	export function reset(): IPargv;

}