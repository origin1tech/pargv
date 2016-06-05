# Pargv

Minimal utility for parsing command line arguments in Node.

## What is Pargv

Often when you're parsing arguments it's for the purpose
of running a command within your node command line utility.
Pargv is designed specifically for this purpose by assuming the specified
index provided is the primary command. All other parameters
are ether additional sub-commands or flags/options.

**NOTE** If you are in need of a full blown command line parser I would suggest Yargs. Pargv is a stripped down solution for this very specific need. That said if you are after parsing for the purpose of building up a CLI it packages up the args quite nicely for you.

## Install Using npm

```sh
$ npm install pargv
```

## Configure

Pargv accepts two parameters, both of which are optional. The first is a number which represents the index of the primary command. Pargv will then splice arguments before this index leaving the remaining command and options/flags.
This is likely what's desired as the initial elements in the process.argv provided by node are related to node itself and not usually needed for your utility.

**NOTE** See defaults below.

Pargv uses a fluent or chain approach for configuration and parsing.

```js
// Require Pargv.
var pargv = require('pargv');

// Parse using defaults.
var pargs = pargv.parse();

// Configure using chain then parse.
var pargs = pargv.configure({ /* your options */ }).parse();
```

## Parsed Result.

The below shows an example of an input from your terminal and subsequently the output that would be produced for that input. The example assumes you're using the default configuration where your primary command is "start".

**Example Terminal Input**

```sh
$ node server start --config development
```

**Would Produce**

Using

```js
var pargs = {
	cmd: 'start',
	cmds: [],
	config: 'development',
	source: ['start', '--config', 'development']
}
```
It should be noted that in the example above you could conceivably want "server" to be the primary "cmd" property. This is easily accomplished by the following before calling "parse".

```js
var pargs = pargv.configure(2).parse();

// Which would result in:

var pargs = {
	cmd: 'server',
	cmds: ['start'],
	config: 'development',
	source: ['start', '--config', 'development']
}
```
## API Methods

- .configure - accepts index of cmd and/or configuration options object.
- .parse - parses process.argv or a supplied array argument.
- .addParser - adds a new parser, used to cast arg to correct data type.
- .modifyParser - modifies an existing parser.
- .cast - calls parsers returning cast argument when truthy value is returned.
- .getFlags - returns only the flags from either the saved parsing or passed.
- .reset - resets the configuration back to defaults.

## Supported Data types

Pargv attempts to parse known data types when processing arguments either those passed for from process.argv. The supported data types out of the box are as follows.

- Date
- Number
- Boolean
- Key Value - "key:value" results in { key: 'value' }
- JSON - "{ "key": "value", "key2": "value2" }" results in JavaScript Object.
- RegExp - "/^config/i" results in valid RegExp.

If you need some sort of additional inspection you may do so by simply adding an additional parser. If the argument processed matches the value return the cast/formated value. If fails just return false and the argument continues to the next parser for processing.

## Options

See comments for each option.

```js
var defaults = {

	// Index of primary command.
	index: 3,

	// When NOT false and not number adjusts index by -1. If number
	// index is adjusted as:
	// index += adjustedIndex
	adjustIndex: undefined,

	// When not false assumes 1 arguments is primary command.
	setCommand: undefined,

	// When NOT false data types are cast.
	castTypes: undefined

};
```

## Further Reading

 The purpose of this library is not to take the place of for example Yargs. Essentially it's just a lightweight way of returning an object in the manner we need for building CLI tools. Simply makes it more handy.

 If you have suggestions or would like something added file an issue or create a PR.

## License

See [LICENSE.md](License.md)
