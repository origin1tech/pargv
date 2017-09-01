/// <reference types="node" />
export interface IDebugrGroup {
    name: string;
    styles: string | string[];
}
export interface IDebugrGroups {
    [key: string]: IDebugrGroup;
}
export declare type Debugger = (...args: any[]) => Debugger;
export declare class Debugr {
    private _formatters;
    private _active;
    private _groups;
    private _colurs;
    private _output;
    private _debuggers;
    constructor(active?: string | string[], colors?: boolean | NodeJS.WritableStream, stream?: NodeJS.WritableStream);
    private exists(arr, key);
    private index(arr, key);
    private isBoolean(val);
    private isPlainObject(val);
    private isFunction(val);
    private isUndefined(val);
    private isString(val);
    private padLeft(val, len);
    private maxLength();
    private contains(args, val);
    private log(group, styles, ...args);
    /**
     * Group
     * Creates new Debugr group.
     *
     * @param group the name of the Debugr group.
     * @param styles any ansi styles to use for colorizing the group.
     */
    add(group: string, ...styles: string[]): any;
    /**
     * Enable
     * Enables debug messages.
     *
     * @param active the active group otherwise '*' is used.
     */
    enable(...active: string[]): this;
    /**
     * Disable
     * Disables debug messages.
     */
    disable(): this;
    remove(group: string): void;
}
export declare const create: (active?: string | string[], colors?: boolean | NodeJS.WritableStream, stream?: NodeJS.WritableStream) => Debugr;
