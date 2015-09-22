# Pargv

Minimal utility for parsing command line arguments in NodeJs.

## Getting Started

Often when you're parsing arguments it's for the purpose 
of running a command within your node command line utility.
Pargv makes this rather simple by assuming the specified
index provided is this primary command. All other paramters
are ether additional sub-commands or flags/options. This is
exactly the purpose of Pargv.

#### Installing

```sh
$ npm install pargv
```

#### Configure

Pargv accepts two paramters, both of which are optional.
The first is a number which represents the index of 
the primary command. Pargv will then splice arguments
before this index leaving the remaining command and options/flags.

If an index is not provided in the first param or in the options
object it will be defaulted to 3.

For example you might run a command as: node server start

In the above example **start** is the 3 argument hence this is the default.

```js
// initialize pargv
var pargv(3, { /* options */});

// get the flags, options command object.
var flags = pargv();

// NOTE: you can also pass an array of predefined
//       arguments. This is useful when you want
//       take an array of parsed arguments from 
//       another source.
```



