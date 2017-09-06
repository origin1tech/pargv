# Examples

A list of examples demonstrating features of Pargv. You will notice some examples
omit calling .parse() or .exec() which is required to either parsed the args or
parse and execute a matching action. This is done for brevity sake and to help
focus on the primary purpose of the example.

## Import or Require

ES6 or TypeScript
```ts
import { Pargv } from 'pargv';
```

ES5
```js
const Pargv = require('pargv').Pargv;
```

Create the Instance
```ts
const pargv = new Pargv(/* your options */);
```

## Simple command and action:

```ts
pargv.command('download <url>')
  .action((url, parsed, cmd) => {
    // do something with the url, parsed result or command instance.
  });
pargv.exec(['download', 'http://someurl.com']);
```

## Just parse don't execute action:

```ts
const parsed = pargv.command('download <url>')
  .parse(['download', 'http://someurl.com']);
```

## Using Pargv without a command:

A command is not required to use Pargv just envoke the default
instance and then you can define your config and simply use
Pargv as a straight parser leveraging all it's good ness.

```ts
const parsed = argv.$
  .option('-x')
  .option('-y')
  .option('-z')
  .when('-x', '-y')
  .demand('-z')
  .parse();
```

## Adding some meta data for help text:

```ts
const parsed = argv.$
  .name('My App')
  .description('My awesome CLI app.')
  .version('1.0.0')
  .license('ISC');
```

You can also create fancy text for your program name by way of Figlet fonts.
Below we're adding some color and a custom font. The below will now
display in help as blue text using the Doom font. Cool right?

```ts
const parsed = argv.$
  .name('My App', 'blue', 'Doom');
```

## Multiple args spread in callback:

```ts
pargv.command('download <url> <savedir>')
  .action((url, savedir, parsed, cmd) => {
    // notice we now have two arguments in our
    // action callback before parsed result and
    // command instance.
  });
pargv.exec(['download', 'http://someurl.com']);
```

## Specify type for command or option:

Supported types "date, number, integer, float, regexp, array, boolean, json, object"

```ts
pargv.command('download <url> <timeout:number>')
  .action((url, timeout, parsed, cmd) => {
    // timeout here will be a number.
  });
pargv.exec(['download', 'http://someurl.com']);
```

## Require min or max:

```ts
// Require 2 commands
pargv.command('download <url>')
  .min.commands(2);

// Require 2 options.
pargv.command('download <url>')
  .min.options(2);

// Allow a max of 2 commands.
pargv.command('download <url>')
  .max.commands(2);

// Allow a max of 2 options.
pargv.command('download <url>')
  .max.commands(2);
```

## Adding option with description:

```ts
pargv.command('download <url>')
  .option('--directory, -dir <dir>', 'Saves to directory.');
```

## Adding option with description default value:

```ts
pargv.command('download <url>')
  .option('--directory, -dir <dir>', 'Saves to directory.', './downloads');
```

## Adding option with description where dir is value in RegExp:

The directory string must be a value in the defined RegExp

```ts
pargv.command('download <url>')
  .option('--directory, -dir <dir>', 'Saves to directory.', null, /^(downloads|saved|temp)$/);
```

## Adding option with description where dir is value in list:

A bit redundant but you can also use a simple list for matching
or restricting values. This will do the same as above. Up to you!

```ts
pargv.command('download <url>')
  .option('--directory, -dir <dir>', 'Saves to directory.', null, 'dowloads, saved, temp');
```

## Adding an alias:

Notice we enter '--dir' to denote which key to add our alias for.
We could also have used '--directory'. Pargv will just figure it out.
Behind the scenes the longer key is alwways the primary in this case '--directory'.

```ts
pargv.command('download <url>')
  .option('--directory, -dir <dir>', 'Saves to directory.')
  .alias('--dir', '-d');
```

## Adding a describe:

The directory string must be a value in the defined RegExp

```ts
pargv.command('download <url>')
  .option('--dir, -d <dir>')
  .describe('--dir', 'Saves to the specified directory');
```

## Adding a demand:

Notice that we init the option with [dir] using [] instead of <>
indicates that it is optional. When we then call demand for that
key we are essentially changing it to `<dir>`.

```ts
pargv.command('download <url>')
  .option('--dir, -d [dir]')
  .demand('--dir');
```

## Adding a when:

We've intentially set password to optional here but then ensure password
is present when --username is called by using the "when" method.

```ts
pargv.command('login --username <username> --password [password]')
  .when('--username', '--password');
```

## Adding a default value:

```ts
pargv.command('login --username <username> --password [password]')
  .default('--username', 'jsmith');
```
## Adding an example for your help text:

Nothing exciting here just adds examples that are displayed
in help texts below its commands and options. The second param
is an optional description.

```ts
pargv.example('login --username jsmith --password changeme', 'Logs in a user.');
```

Or you can add as a tuple.

```ts
pargv.example([
  ['your example', 'your optional description'],
  ['your other example without description']
])
```

## Custom error handler:

When creating a custom error handler you'll want to handle exiting
the process yourself as shown below after you handle the error.
This is what Pargv does internally.

```ts
pargv
  .fail((message, err, instance) => {
    // message - is the error message thrown.
    // err - is the PargvError object you can access the stack here err.stack.
    // instance - the pargv instance.
    process.exit(1);
  });
```

## Custom help handler:

```ts
pargv
  .help((command, commands) => {
    // command - optional value if help was called with a specific command.
    // commands - contains all commands that have been configured.
  });
```

Use Pargv's built in wrappers for building help menus. The below is not
complete it's just here to point you in the right direction. If you wish
to build custom help it is largely up to you how it would look or be configured
but again this should give you an idea. You can also look at the private
method "compileHelp" in the Pargv class.

```ts
pargv
  .help((command, commands) => {

    // We'll create a layout that is a 100 wide
    const layout = this.layout(100);

    for (const k in commands) {
      const cmd = commands[k];
      layout.section(cmd._name); // add the name of the command as a section.
      layout.repeat('=') // add a divider.
      layout.div() // just some space you could also pad.
      layout.section('Commands:');
      cmd._commands.forEach((el) => {
        // iterate the commands add to layout.
      });
      layout.section('Options:');
      cmd._options.forEach((el) => {
        // iterate options add to layout.
      });
    }

  });
```