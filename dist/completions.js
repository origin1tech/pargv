"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var path_1 = require("path");
function generate(app) {
    var script = fs_1.readFileSync(path_1.resolve(__dirname, 'completion.sh.tpl'), 'utf-8');
    var name = path_1.basename(app); // get the basename from path.
    if (app.match(/\.js$/))
        app = "./" + app; // add if not yet installed as bin.
    script = script.replace(/{{app_name}}/g, name); // replace app name.
    return script.replace(/{{app_path}}/g, app);
}
exports.generate = generate;
function show(app) {
    _logger.log(completion.generateCompletionScript($0));
    return self;
}
exports.show = show;
//# sourceMappingURL=completions.js.map