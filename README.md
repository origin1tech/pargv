# Pargv

Minimal utility for parsing command line arguments in Node.

## What is Pargv

Often when you're parsing arguments it's for the purpose
of running a command within your node command line utility.
Pargv is designed specifically for this purpose by assuming the specified
index provided is the primary command. All other parameters
are ether additional sub-commands or flags/options.

## Pargv or Yargs or Other
If you are looking for a full featured argument parser this is NOT it. I would suggest something like yargs. It is has all the bells and whistles such as usage and more. Pargv is designed for quick and dirty parsing. Often you may need to write a quick little utility and are looking for a simple way to get the command and flags you've passed for your utility. Pargv is perfectly simplistic for this purpose. It even does a fair job at parsing json, key:value pairs among others.

## Install Using npm

```sh
$ npm install pargv
```

## Configure

Pargv accepts two parameters, both of which are optional. The first is a number which represents the index of the primary command's position. By default this is 2 or the second argument. NOTE: position is NOT zero based. Positions are counted starting from 1.

Pargv will then splice arguments before this index leaving the remaining command and options/flags.
This is likely what's desired as the initial elements in the process.argv provided by node are related to node itself and not usually needed for your utility.

To disable this just call:

```js
// parse everything
pargv.configure(0).parse();
```

## Parsing Arguments

```js
// Require Pargv.
var pargv = require('pargv');

// Parse using defaults.
var pargs = pargv.parse();

// Configure using chain then parse.
var pargs = pargv.configure(3, { /* options */ }).parse();

// OR

var pargs = pargv.configure({ /* your options */ }).parse();
```

## Parsed Result.

The below shows an example of an input from your terminal and subsequently the output that would be produced for that input. The example assumes you're using the default configuration where your primary command is "start".

**Terminal Input**

```sh
$ node server start --config development
```

**Would Produce**

```js
var pargs = {
	cmd: 'server',
	cmds: ['start'],
	config: 'development',
	source: ['server', 'start', '--config', 'development']
}
```

It should be noted that in the example above you could conceivably want "server" to be the primary "cmd" property. This is easily accomplished by the following before calling "parse".

## Data Types & Parsers

Pargv attempts to parse known data types when processing arguments either those passed for from process.argv. The supported data types out of the box are as follows.

- Date
- Number
- Boolean
- Key Value - "key:value" results in { key: 'value' }
- JSON - '"{ "name": "Jim", "age": 25 }"' results in JavaScript Object.
- RegExp - "/^config/i" results in valid RegExp.

**IMPORTANT** Note the single/double quote encapsulation on JSON like strings This is required to preserve the internal quotes of the literal. Basically  just take valid JSON and wrap it with '"{ }"'. This will enable all formatting to be preserved within the brackets.

**PRO-TIP** If you don't like all those quotes (I don't!) just do the following:

```sh

bash$ SOME_CMD --user {} --user.name "Bob" --user.age 25

```

which will result in...

```js
{
	name: "Bob",
	age: 25
}

```

Working with objects/JSON via a command should be limited though because it kinda sucks to deal with but in a pinch it can be handy.

If you wish to add additional parsers you can do so as shown below. Parsers are called sequentially until a truthy result is found. Custom parsers are called first before known types. If your parser does not return a truthy value it will fall though to internal parsers.

```js

// Parsers are called with Pargv's context
//  for conveninece and chaining.

pargs.addParser(name, function (val) {
	// do something then return parsed value
	// or return false to continue down the
	// chain of parsers.
	return val;
});

// If the parser already exists just pass "true"
// as a third argument and then it will overwrite.
pargs.addParser(name, function () {});

// You can also add and object of parsers.
pargs.addParser({
	one: (val) => { /* do something */ },
	two: (val) => { /* do something */ }
});

```
## Commands

```js
// Casts the value by iterating custom and internal parsers.
var result = pargs.cast('some_value');

// Gets only the flags from the parsed result.
var flags = pargs.getFlags(/* optionally pass current parsed object. */);

// Check if has command.
var exists = pargs.hasCmd('some_command');

// The following check if ANY command exists.
var exists = pargs.hasCmd(['command1', 'command2'])
var exists = pargs.hasCmd('command1', 'command2', 'command3');
var exists = pargs.hasCmd({ /* existing pargv parsed result */}, 'command1', 'command2', 'command3');

```

## API Docs

Legend for below:

- [] 	 expects optional argument
- opts expects options object.
- \* 	 expects any type.
- | 	 expects value or other value.
- ...	 expects spread operator, any number of arguments
- pargs	 expects pargv parsed object of cmds and flags.

- .configure 		 ([number] | [opts], [opts]) accepts index of cmd and/or configuration options object.
- .parse 				 ([array]) parses process.argv or a supplied array argument.
- .addParser		 (string, function, [boolean]) adds a new parser, used to cast arg to correct data type.
- .modifyParser  [DEPRECATED] use addParser pass true as third arg to overwrite.
- .cast 				 (*) calls parsers returning cast value when truthy value is returned.
- .getFlags 		 ([pargs]) returns only the flags from either the saved parsing or manually provided..
- .hasCmd 			 (* | array | ...) check if cmd exist in cmds, if first arg is parsed result will check it.
- .getCmd				 (number) returns the command by index.
- .flagsToArray  ([defaults], [strip]) returns an array of flags with optional defaults.
- .flagsToString ([defaults], [char]) returns a string of flags w/ optional defaults separated by char
- .reset 				 () resets the configuration back to defaults, often used when parsing manual array of args.

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

	// Normalize command path. Command may be the
	// the full path of the filed called it is usually
	// desirable to strip the path and just leave the
	// file name. Set this option to false to disable.
	normalizeCommand: undefined

};
```

## License

See [LICENSE.md](License.md)
