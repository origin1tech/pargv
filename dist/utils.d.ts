export * from 'chek';
/**
 * Is Flag
 * Checks if value is a flag (ex: -s or --save).
 *
 * @param val the value to inspect.
 */
export declare function isFlag(val: string): boolean;
/**
 * Is Dot Notation
 * Tests if value is dot notated string.
 *
 * @param val the value to be inspected.
 */
export declare function isDotNotation(val: any): boolean;
/**
 * Strip Param
 * Strips -f, --flag <param> [param] resulting in
 * f, flag or param.
 *
 * @param val the value to be stripped.
 */
export declare function stripToken(val: string, exp?: RegExp): string;
/**
 * Merge Args
 * Merges arguments into single array of values.
 *
 * @param val the single value or array of values.
 * @param args rest param of args.
 */
export declare function mergeArgs(val: any | any[], ...args: any[]): any[];
/**
 * Split To List
 * Takes a list 'small, medium, large' and
 * converts it to expression like
 * /^(small|medium|large)$/i
 *
 * @param val the value to convert.
 */
export declare function splitToList(val: string): RegExp;
/**
 * Normalize Args
 * Converts -abc to -a -b -c
 * Converts --name=bob to --name bob
 *
 * @param args the arguments to normalize.
 */
export declare function normalizeArgs(args: any[]): any[];
/**
 * To Option Tokens
 * Formats option string to support Pargv syntax.
 * @example
 * converts: '-n, --name <value>'
 * to: '-n.--name <value>'
 *
 * @param token the string to insepct.
 */
export declare function toOptionToken(token: string): string;
/**
 * Remove Duplicates
 * Removes any duplicate elements in an array.
 *
 * @param args the array of elements to be inspected.
 */
export declare function removeDuplicates(...args: any[]): any[];
/**
 * Concat To
 * Helper method to ensure array in object property then concat values.
 *
 * @param obj the object collection containing keys.
 * @param key the key to concat values to.
 * @param val the array of values to concat.
 */
export declare function concatTo(obj: any, key: string, val: any[]): any;
export declare const logTypes: {
    error: string;
    warn: string;
    info: string;
    debug: string;
};
export declare function logger(colurs: any): {
    error: (...args: any[]) => void;
    info: (...args: any[]) => any;
    warn: (...args: any[]) => any;
    write: (...args: any[]) => void;
    exit: (code?: number) => never;
};
