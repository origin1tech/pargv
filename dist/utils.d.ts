export * from 'chek';
/**
 * Get Prefix
 * Returns the node prefix path.
 */
export declare function getPrefix(): any;
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
/**
 * Levenshtein
 * Computes the edit distance between two strings.
 *
 * Based on gist by Andrei Mackenzie
 * @see https://gist.github.com/andrei-m/982927
 *
 * @param source the source string.
 * @param compare the string to be compared.
 */
export declare function levenshtein(source: any, compare: any): any;
/**
 * Pargv Error
 */
export declare class PargvError extends Error {
    constructor(message: string, ...args: any[]);
}
