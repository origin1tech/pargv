import { join } from 'path';

export const KEYVAL_EXP = /^(([.'"a-z0-9_-]+):\s?(['"a-z0-9_-]+)[+|]?){1,}$/i;
export const CSV_EXP = /^(.+,.+){1,}$/;
export const LIST_EXP = /^(.+(,|\||\s).+){1,}$/;
export const JSON_EXP = /^"?{.+}"?$/;
export const REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
export const REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
export const DOT_EXP = /^(.+\..+)$/;

export const FLAG_EXP = /^--?/;
export const COMMAND_VAL_EXP = /^(<|\[)/;
export const FLAG_SHORT_EXP = /^-[a-zA-Z0-9]/i;
export const TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/g;
export const TOKEN_PREFIX_EXP = /^(--?|<|\[)/;

export const SPLIT_CHARS = ['|', ',', ' '];
export const SPLIT_KEYVAL_EXP = /(('|")[^('|")]*('|"))|[^\:]+/g;
export const SPLIT_PAIRS_EXP = /(('|")[^('|")]*('|"))|[^(\||+)]+/g;
export const FORMAT_TOKENS_EXP = /(%s|%d)/g;

export const EXE_EXP = /\b(node|iojs)(\.exe)?$/;

export const CWD = process.cwd();
export const ARGV = process.argv;
export const NODE_PATH = process.env._;
export const EXEC_PATH = process.execPath;
export const PARGV_ROOT = join(__dirname, '../');
export const MOCHA_TESTING = /_mocha$/.test(process.argv[1]);

export { EOL } from 'os';