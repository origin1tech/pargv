# Pargv

Minimal utility for parsing command line arguments in Node.

## BREAKING CHANGE

Starting with version "1.5.0" Pargv no longer initializes automatically. This has been changed in favor of creating an instance to better suit Typescript and exporting of types. See below under **"usage"**.

## What is Pargv

Parv is a minimilistic parser for node process.argv arguments. It does NOT for example handle creating help and usage information like you might find with Yargs or Commander. The reason for this is that more often than not as good as Yargs or Commander (and others) are there are always scenarios that simply can't solve.

Pargv is moderately opinionated also. This is because 9 times out of 10 what you really are looking for is what "command" the user input and of course the options along with it. Pargv assumes this and as such structures the parsing as follows:

```sh
$ node server start --config development
```

```js
{
	exec: 'server'
	cmd: 'start',

	// Most parsers include 'start' here
	// but since 'start' is first arg Pargv
	// assumes is primary command hence
	// it would not be in the array.
	// any other commands (not --option or -option)
	// would be included as expected.
	cmds: [],

	config: 'development',
	execPath: '/your/path/to/server',
	nodePath: '/your/path/to/node',
	execGlobal: '/your/path/to/global/modules',
	source: ['/your/node/path', '/your/path/to/app', 'start', '--port', '8080' ]
}
```

## Install Using npm

```sh
$ npm install pargv
```

## Usage

```js
// ES5
var Pargv = require('pargv').Pargv;
var pargv = new Pargv(/* options */);

// ES6
import { Pargv } from 'pargv';
const pargv = new Pargv(/* options */);
```

## Configure (DEPRECATED)

Configure still exists on instance but has been **DEPRECATED** in favor of
passing options on new instance.

Pargv accepts two parameters, both of which are optional. The first is a number which represents the index of the primary command's position. By default autotmatically removes the executed script and the node path leaving the command(s) called and its option(s). If this is not the desired behavior set the index to 0 and all process.argv elements are included/parsed. But again that's not likely what you're looking for.

Example setting the index to 0:

```js
// parse everything
pargv.configure(0).parse();
```

## Parsing Arguments

```js
// Require Pargv.
var pargv = require('pargv');

// Parse using defaults.
pargv.parse();

// Configure using chain then parse.
pargv.configure(3, { /* options */ }).parse();

// OR

pargv.configure({ /* your options object */ }).parse();
```

## Data Types & Parsers

Pargv attempts to parse known data types when processing arguments. The supported data types out of the box are as follows.

- Date							import to note numbers (epochs) are not parsed only strings to date.
- Number					if string contains only digits will be parsed as number.
- Boolean				will parse "true" or "false" strings as true or false.
- Array						csv type string one,two,three 22 becomes ['one', 'two', 'three', 22 ]
- Key Value 	"key:value" results in { key: 'value' }
- JSON 						'"{ "name": "Jim", "age": 25 }"' results in JavaScript Object.
- RegExp 				"/^config/i" results in valid RegExp.

**IMPORTANT** Note the single/double quote encapsulation on JSON like strings This is required to preserve the internal quotes of the literal. Basically  just take valid JSON and wrap it with '"{ }"'. This will enable all formatting to be preserved within the brackets.

**PRO-TIP** If you don't like all those quotes (I don't!) just do the following:

```sh
bash$ SOME_CMD  --user.name "Bob" --user.age 25
```

which will result in...

```js
{
	name: "Bob",
	age: 25
}
```

or mix it up

```sh
bash$ SOME_CMD  --user.name "Bob" --user age:33,nickname:Bobby
```

which will result in...

```js
{
	name: "Bob",
	nickname: 'Bobby',
	age: 25
}
```

Working with objects/JSON via a command should be limited though because it kinda sucks to deal with but in a pinch it can be handy.

If you wish to add additional parsers you can do so as shown below. Parsers are called sequentially until a truthy result is found. Custom parsers are called first before known types. If your parser does not return a truthy value it will fall though to internal parsers.

```js

// Parsers are called with Pargv's context
// for conveninece and chaining.

pargv.addParser(name, function (val) {
	// do something then return parsed value
	// or return false to continue down the
	// chain of parsers.
	return val;
});

// If the parser already exists just pass "true"
// as a third argument and then it will overwrite.
pargv.addParser(name, function () {}, true);

// You can also add and object of parsers.
pargv.addParser({
	one: (val) => { /* do something */ },
	two: (val) => { /* do something */ }
});

```
## Commands

```js
// Casts the value by iterating custom and internal parsers.
var result = pargs.cast('some_value');

// Gets only the flags from the parsed result.
var flags = pargs.getFlags();

// Check if has command.
var exists = pargs.hasCmd('some_command');

// The following checks if ANY command exists.
var exists = pargs.hasCmd(['command1', 'command2'])
var exists = pargs.hasCmd('command1', 'command2', 'command3');

```

## API

Legend for below:

- [] 	 						expects optional argument
- options		 	expects options object.
- \* 	 						expects any type.
- | 	 							expects value or other value.
- ...	 						expects spread operator, any number of arguments

- .configure 		 	([number] | [options], [options]) accepts index of cmd and/or configuration options object.
- .parse 				 			([array]) parses process.argv or a supplied array argument.
- .addParser		 		(string, function, [boolean]) name, parser callback and true to overwrite existing.
- .cast 				 				(*) calls parsers returning cast value when truthy value is returned.
- .getFlags 		 		() returns only the flags from either the saved parsing or manually provided..
- .hasCmd 			 			(* | array | ...) value, array of values or spread, check if cmd exist in cmds
- .getCmd				 			(number) returns the command by passed index.
- .flagsToArray  ([defaults], [strip]) returns an array of flags with optional defaults.
- .flagsToString ([defaults], [char]) returns a string of flags w/ optional defaults separated by char,
- .stripExec 		 	() simply returns all args less the node path and the executed path.
-. fonts 				 			() returns an array of usable figlet fonts.
- .logo 				 				(string, [string], [string]) text, color, font.
- .ui 				 	 				([number]) usage string and help width returns div, span, show for creating help, call show() to show result.
- .action  			 		(string, string, function) the command to match, aliases and the callback function.
- .reset 				 			() resets the configuration back to defaults, used when parsing manual array of args.


## Configure Options

See comments for each option.

```js

var defaults = {

	// Index of primary command.
	// Typically you want this at 2
	// because you want to ignore node
	// path. This will result in the command
	// being the file called. Set to 0 in .configure
	// if you wish to parse all arguments.
	index: 2,

	// When not false assumes 1 argument after adjusting for
	// node path and above index is the primary command.
	setCommand: undefined,

	// When NOT false parser attempts to cast to the
	// appropriate type. As we're dealing with strings
	// this is not bullet proof in some scenarios.
	castTypes: undefined,

	// When NOT false colors are enabled for logger.
	colors: undefined,

	// The allowed log level where error = 1,
	// warn = 2, info = 3 and debug = 4;
	logLevel: 3,

	// Callback called on message logged.
	// function (type, args, instance) {
	// 		// type = the log type eg: error, warn, info, debug.
	// 		// args = array of all arguments passed.
	//  	// instance = the logger instance itself.
	// }
	logCallback: undefined,

	// When NOT false on parse defined actions are called
	// when a command is matched.
	autoActions: undefined

};
```

## Bonus

### Logger

There's a handy logger built in for simple tasks. It has 6 methods error, warn, info, debug, write and exit. See options for configurations. By default the log level is 3 or "info". Set ".logLevel" to change the level allowed or set "colors" in your options to false to disable colors. You can also set "logCallback" which is called on message logged. This is useful for writing the log message to file or other.

The logger does not attempt to be a full blown solution rather is designed to handle simple logging tasks for a CLI without the need for another dependency. That said it works perfectly fine.

```js
pargv.log.warn('the command %2 is not valid', pargv.cmd);
```

### Ascii Art

Pargv has figlet built in for simple cli ascii art. Handy if you want to dress up your cli. Just call the ".logo" method.

see: https://www.npmjs.com/package/figlet for fonts.

### Chalk

The chalk constructor is also exported. Just new up an instance. Like the logger and ASCII art these modules are exposed so that a complete CLI solution can be created quickly. In short Chalk is needed for the logger hence we just export it for convenience.

```js
const Chalk = require('pargv').Chalk;
const chalk = new Chalk();
```

```js
// Define the text, the color and an available figlet font name.
pargv.logo('My Text Logo', 'cyan', 'figlet font name');
```

![Ascii Art](https://raw.github.com/origin1tech/pargv/master/ascii-art.jpg)

## License

See [LICENSE.md](License.md)
