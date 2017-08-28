"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYVAL_EXP = /^((.+:.+)(\||\+)?)$/;
exports.CSV_EXP = /^(.+,.+){1,}$/;
exports.ARRAY_EXP = /^(.+(,|\||\s).+){1,}$/;
exports.JSON_EXP = /^"?{.+}"?$/;
exports.REGEX_EXP = /^\/.+\/(g|i|m)?([m,i,u,y]{1,4})?/;
exports.REGEX_OPTS_EXP = /(g|i|m)?([m,i,u,y]{1,4})?$/;
exports.DOT_EXP = /^(.+\..+)$/;
exports.FLAG_EXP = /^--?/;
exports.COMMAND_VAL_EXP = /^(<|\[)/;
exports.FLAG_SHORT_EXP = /^-[a-zA-Z0-9]/;
exports.TOKEN_ANY_EXP = /(^--?|^<|>$|^\[|\]$)/g;
exports.TOKEN_PREFIX_EXP = /^(--?|<|\[)/;
exports.SPLIT_CHARS = ['|', ',', ' '];
//# sourceMappingURL=constants.js.map