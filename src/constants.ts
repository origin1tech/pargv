export const KEYVAL_EXP = /^((.+:.+)(\||\+)?)$/;
export const CSV_EXP = /^(.+,.+){1,}$/;
export const LIST_EXP = /^(.+(,|\||\s).+){1,}$/;
export const JSON_EXP = /^"?{.+}"?$/;
export const REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
export const REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
export const DOT_EXP = /^(.+\..+)$/;

export const FLAG_EXP = /^--?/;
export const COMMAND_VAL_EXP = /^(<|\[)/;
export const FLAG_SHORT_EXP = /^-[a-zA-Z0-9]/;
export const TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/g;
export const TOKEN_PREFIX_EXP = /^(--?|<|\[)/;

export const SPLIT_CHARS = ['|', ',', ' '];
export const SPLIT_KEYVAL_EXP = /(('|")[^('|")]*('|"))|[^\:]+/g;
export const SPLIT_PAIRS_EXP = /(('|")[^('|")]*('|"))|[^(\||+)]+/g;
export const FORMAT_TOKENS_EXP = /(%s|%d)/g;
