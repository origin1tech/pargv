# Pargv

Minimal utility for parsing command line arguments in NodeJs.

## What is Parv

Often when you're parsing arguments it's for the purpose
of running a command within your node command line utility.
Pargv makes this rather simple by assuming the specified
index provided is this primary command. All other parameters
are ether additional sub-commands or flags/options. This is
exactly the purpose of Pargv.

## Install Using npm

```sh
$ npm install pargv
```

## Configure

Pargv accepts two parameters, both of which are optional. The first is a number which represents the index of the primary command. Pargv will then splice arguments before this index leaving the remaining command and options/flags.
This is likely what's desired as the initial elements in the process.argv provided by node are related to node itself and not usually needed.

**NOTE** See default options below.

There are two ways to configure and get the resulting parsed arguments. You can use multiple functions where upon configuring a function is returned to be called again to return the result.

The other option is to use the fluent api approach where chaining is used to parse the arguments. Both methods accept the same params/options.

**Multi Function**

```js
// require Pargv.
var pargv = require('pargv');

// initialize with options.
pargv = pargv(3, { /* options */});

// or simply use defaults which
// works with most scenarios.
var pargs = pargv();
```

**Fluent Api**

```js
// require Pargv.
var pargv = require('pargv');

// Configure using chain then parse.
var pargs = pargv.configure().parse();
```

## Basic Usage

Once you have initialized and configured Pargv as needed you are now ready to access the object containing your primary command, sub commands and flags which are essentially options.

```js
var cmd = pargv.cmd;
var flags = pargv.flags;

```

## Options

See comments for each option.

```js
var defaults = {

		// the index where the primary
		// command element is.
		// ex: node server start
		// the index would be 3 where
		// "start" is our command action.
		index: 3,

		// When NOT false the index passed
		// will be subtracted by one so the
		// array is splice at correct element.
		adjustIndex: undefined,

		// When NOT false the first arg
		// is shifted and set as the "cmd"
		// or primary command property.
		shiftCommand: undefined,

		// When NOT false data types are cast.
		castTypes: undefined,

		// Character to use when wrapping strings.
		// set to false to disable.
		stringChar: "'"

};
```

## License

See [LICENSE.md](License.md)
