"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
/**
 * Generate
 * Generates completion script.
 *
 * @param name the program name to generate for.
 */
function generate(name, command) {
    command = command || '--get-completions';
    var script = fs_1.readFileSync(path_1.resolve(__dirname, 'completion.sh.tpl'), 'utf-8');
    var base = path_1.basename(name); // get the basename from path.
    if (name.match(/\.js$/))
        name = "./" + name; // add if not yet installed as bin.
    script = script.replace(/{{app_name}}/g, base); // replace app name.
    script = script.replace(/{{app_command}})/g, command); // replace the command.
    return script.replace(/{{app_path}}/g, name); // replace the path.
}
exports.generate = generate;
//# sourceMappingURL=completion.js.map