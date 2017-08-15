# Pargv

Minimal utility for parsing command line arguments in Node.

## BREAKING CHANGE

Starting with version "1.5.0" Pargv no longer initializes automatically. This has been changed in favor of creating an instance to better suit Typescript and exporting of types. See below under **"usage"**.

## What is Pargv

Parv is a minimilistic parser for node process.argv arguments. It does NOT for example handle creating help and usage information like you might find with Yargs or Commander. The reason for this is that more often than not as good as Yargs or Commander (and others) are there are always scenarios where they don't quite build out the help/usage as you need.

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

## Configure Options

See comments for each option.

```js

var defaults = {

	// Index of primary command.
	// Typically you want this at 2
	// because you want to ignore node
	// path. This will result in the command
	// being the file called. Set to 0
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

	// The allowed log level where error = 0,
	// warn = 1, info = 2 and debug = 3;
	logLevel: 2,

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

## Parsing Arguments

```js
// Require Pargv.
var pargv = require('pargv');

// Parse using defaults.
pargv.parse();
```

## Data Types & Parsers

Pargv attempts to parse known data types when processing arguments. The supported data types out of the box are as follows.

<table>
	<thead>
		<tr>
			<th>Type</th><th>Description</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Date</td><td>import to note numbers (epochs) are not parsed only strings to date.</td>
			<td>Number</td><td>if string contains only digits will be parsed as number.</td>
			<td>Boolean</td><td>	will parse "true" or "false" strings as true or false.</td>
			<td>Array</td><td>csv type string one,two,three 22 becomes ['one', 'two', 'three', 22 ]</td>
			<td>Key Value</td><td>"key:value" results in { key: 'value' }</td>
			<td>JSON</td><td>'"{ "name": "Jim", "age": 25 }"' results in JavaScript Object.</td>
			<td>RegExp</td><td>"/^config/i" results in valid RegExp.</td>
		</tr>
	</tbody>
</table>

**IMPORTANT** Note the single/double quote encapsulation on JSON like strings This is required to preserve the internal quotes of the literal. Basically just take valid JSON and wrap it with '"{ }"'. This will enable all formatting to be preserved within the brackets.

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

or use key:value separated by commas.

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

pargv.addParser('name', function (val) {
	// do something then return parsed value
	// or return false to continue down the
	// chain of parsers.
	return val;
});

// If the parser already exists just pass "true"
// as a third argument and then it will overwrite.
pargv.addParser('name', function () {}, true);

// You can also add an object of parsers.
pargv.addParser({
	one: (val) => { /* do something */ },
	two: (val) => { /* do something */ }
});

```
## Commands

```js
// Casts the value by iterating custom and internal parsers.
var result = pargv.cast('some_value');

// Gets only the flags from the parsed result.
var flags = pargv.getFlags();

// Check if has command.
var exists = pargv.hasCmd('some_command');

// The following checks if ANY command exists.
var exists = pargv.hasCmd(['command1', 'command2'])
var exists = pargv.hasCmd('command1', 'command2', 'command3');

```

## API

<table>
	<caption>LEGEND</caption>
	<thead>
		<tr>
			<th>Token</th><th>Description</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>[]</td><td>Optional param.</td>
			<td>*</td><td>Indicates any type.</td>
			<td>|</td><td>Indicates or</td>
			<td>...</td><td>Spread operator.</td>
		</tr>
	</tbody>
</table>

<table>
	<caption>API METHODS</caption>
	<thead>
		<tr>
			<th>Method</th><th>Description</th><th>Deprecated</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>.configure</td><td>([number] | [options], [options]) - accepts cmd and/or config options.</td><td>TRUE</td>
			<td>.parse</td><td>	([array]) - parses process.argv or provided args.</td><td></td>
			<td>.addParser</td><td>(string, function, [boolean]) - name, parser callback and true to overwrite.</td><td></td>
			<td>.cast</td><td>(*) - calls parsers returning cast value.</td><td></td>
			<td>.getFlags</td><td>() gets stored flags or parses provided args for flags.</td><td></td>
			<td>.hasCmd</td><td>(* | array | ...) - check if has command.</td><td></td>
			<td>.getCmd</td><td>(number) - gets command by index.</td><td></td>
			<td>.flagsToArray</td><td>([defaults], [strip]) - returns an array of flags with optional defaults.</td><td></td>
			<td>.flagsToString</td><td>([defaults], [char]) returns a string of flags w/ optional defaults separated by char,</td><td></td>
			<td>.stripExec</td><td>() - returns all args less the node path and the executed path.</td><td></td>
			<td>.fonts</td><td>	() returns an array of usable figlet fonts.</td><td></td>
			<td>.logo</td><td>(string, [string], [string]) - pass text, color, font to return ascii logo.</td><td></td>
			<td>.ui</td><td>([number]) - pass width to return ui layout helpers.</td><td></td>
			<td>.action</td><td>(string, string, function) the command to match, aliases and the callback function on listening for command.</td><td></td>
			<td>.reset</td><td>() - resets used when parsing args manually.</td><td></td>
		</tr>
	</tbody>
</table>

## Bonus

Typically re-exporting packages is a bad idea but in this case it makes it rather convenient. This is because it is rather handy to have a command line parser with logging, colurs, layout ui helper for help menus and ascii art generator for simply CLI logos. In a large majority of cases these tools will be exactly what you're after.

### Logger

There's a handy logger built in for simple tasks. It has 6 methods error, warn, info, debug, write and exit. See options for configurations. By default the log level is 3 or "info". Set ".logLevel" to change the level allowed or set "colors" in your options to false to disable colors. You can also set "logCallback" which is called on message logged. This is useful for writing the log message to file or other.

The logger does not attempt to be a full blown solution rather is designed to handle simple logging tasks for a CLI without the need for another dependency. That said it works perfectly fine.

```js
pargv.log.warn('the command %2 is not valid', pargv.cmd);
```

### Ascii Art

Pargv has figlet built in for simple cli ascii art. Handy if you want to dress up your cli. Just call the ".logo" method.

see: https://www.npmjs.com/package/figlet for fonts.

```js
// Define the text, the color and an available figlet font name.
pargv.logo('My Text Logo', 'cyan', 'figlet font name');
```

![Ascii Art](https://raw.github.com/origin1tech/pargv/master/ascii-art.jpg)

### Colurs

The chalk constructor is also exported. Just new up an instance. Like the logger and ASCII art these modules are exposed so that a complete CLI solution can be created quickly. In short Chalk is needed for the logger hence we just export it for convenience.

```js
const Chalk = require('pargv').Chalk;
const chalk = new Chalk();
```



## License

See [LICENSE.md](License.md)
