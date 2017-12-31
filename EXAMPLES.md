# Examples

A list of examples demonstrating features of Pargv. You will notice some examples
omit calling .parse() or .exec() which is required to either parsed the args or
parse and execute a matching action. This is done for brevity sake and to help
focus on the primary purpose of the example.

You can view a [Video Tutorial](https://www.youtube.com/watch?v=c2tg32oNC8E) on YouTube
also which may also help.

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
const parsed =
  pargv.command()
    .option('-x')
    .option('-y')
    .option('-z')
    .when('-x', '-y')
    .demand('-z')
    .parse();
```

## Adding some meta data for help text:

```ts
const parsed =
  pargv.command()
    .name('My App')
    .description('My awesome CLI app.')
    .version('1.0.0')
    .license('ISC');
```

You can also create fancy text for your program name by way of Figlet fonts.
Below we're adding some color and a custom font. The below will now
display in help as blue text using the Doom font. Cool right?

```ts
const parsed =
  pargv.command()
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

// NOTE: both .parse() & .exec() can accept rest params or array of args.
// The following is also valid.
pargv.exec('download', 'http://someurl.com');
```

## Specify type for command or option:

**Supported types**:  "date, number, integer, float, regexp, array, boolean, json, object"

```ts
pargv.command('download <url> <timeout:number>')
  .action((url, timeout, parsed, cmd) => {
    // timeout here will be a number.
  });
pargv.exec(['download', 'http://someurl.com']);
```

## Specify a default inline:

Define a default value inline in our command. In this example "deadpool" is the default username.
The syntax is as follows:

[key : type : default]

Each segement or part must have a value. If you have a default but do not need to ensure a type you can set the type segment to "string" or "auto". Meaning the "default" can't be the second arg in the segments.

```ts
const result = pargv.command('download <url> --username [username:string:deadpool]')
  .parse('download', 'http://someurl.com');
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

## Restrict to min or max commands:

```ts
pargv.command('download <url>')
  .min.commands(1); // this is redundant but ensures <url> is provided.
```

```ts
pargv.command('download <url>')
  .max.commands(1); // ensure only <url> is allowed.
// for example if your cli command was: $ download /some/path other_variable
// max command error would be thrown.
```

## Restrict to min or max options:

```ts
pargv.command('download <url>')
  .option('--force, -f')
  .option('--other, -o')
  .min.options(1); // would ensure either --force or --other is provided.
```

```ts
pargv.command('download <url>')
  .option('--force, -f')
  .option('--other, -o')
  .max.options(1); // would allow only --force or --other.
```

## Variadic Command Args

**Default:** When setting a default for variadic args these values are not merged meaning the default is triggered ONLY when the variadic arg contains no values.

**Coerce:** Unlike above default, the coerce method will be run against EACH value in the array of variadic values.

```ts
pargv.command('download <url> [others...]')
  .default('others', ['url1', 'url2'])
  .action((url, others, parsed, cmd) => {
    // others will be array of values.
  });
```


## External Commands:

Pargv supports executing any external command. To define a command as external the command must be prefixed with an **@**. This tells Pargv that **@some_program** should be executed externally as opposed to calling a callback action.

#### Basic Usage

This example would be synonymous with calling **$ git push** in your terminal.

```ts
pargv.command('@git push')
```

This could be called in the following manner where "app" is the name of your program that is using Pargv and has been added to your path.

```sh
$ app push
```

You could also call it directly via full path to Pargv config.

```sh
$ node /some/path/to/pargv/config push
```

#### Full Path

You can also specify a full path to an executable file. The below would result in a command name of **run**. However Pargv will auto create aliases to the full path and the full path without an extension.

```ts
pargv.command('@some/full/path/run.sh [arg1]')
```

```sh
$ app run arg1
```

Or call with full path, however the above would be best practice!

```sh
$ app some/full/path/run.sh arg1 arg2...
```

#### External Command Only

You can also just specify the external command by itself which essentially creates a wrapper if you will. This may not seem very useful at first but it allows you to create your own config and constraints on the external command. In the below example you must have at least two --flag type options.

```ts
pargv.command('@git')
  .min.options(2);
```

This will allow you to pass whatever you wish to the git command now wrapped into your application.

```sh
$ app git ...args
```

#### Handle Spawn Manually

If you specify "spawnAction" Pargv will do it's parsing then provide the parsed result as wel as a config that can be handed off to spawn. You may then set any other options you wish then execute the method. If you return from this value Pargv will wire up handlers for catching errors as well as closing.

```ts
pargv.command('@ls', 'Lists files in directory')
  .spawnAction((spawn, config, parsed, cmd) => {

    // spawn - a wrapper to Node's spawn which allows passing
    //    command, args, options or the config object below itself.

    // config - object containing the following
    //    command: the command to be spawned in this case "ls".
    //    args: an array of arguments to be passed to command.
    //    options: the SpawnOptions object for Node's ChildProcess.

    // parsed - the Pargv Parsed Result.
    // cmd - the Pargv Command.

    const child = spwan(config.command, config.args, config.options);

    // OR

    const child = spawn(config);

    // You could handle close event yourself here
    // or return the child process below for Pargv
    // to do so for you.
    child.on('close', () => {
      // handle clean up here.
    });

    // OR

    // returning here allows Pargv to handle errors
    // for you but is NOT required.
    return child;

  });
```

## Setup completions:

```ts
pargv.command('login --username <username> --password [password]')
  .completion(); // auto adds command 'completions'
```

Or define custom command name for completions.

```ts
pargv.command('login --username <username> --password [password]')
  .completion('comps');
```

Or define custom tab completions handler

```ts
pargv.command('login --username <username> --password [password]')
  .completion('completions', (current: string, argv: any[], done?: CompletionHandlerCallback) => {
    // current - the current argument for completions.
    // argv - the array of all arguments in stream.
    // done - optional callback for async completions.
    //        done handler accepts 1 arg (completions: any[])
  });
  // Pargv is pretty good with tab completions unless you have a really
  // special need and have the time to sort it out it is suggested to
  // use built in tab completions. They work pretty good!
```

## Install completions:

The following assume your "completions" command is named "completions"
and your program name is called "app".

```sh
$ app completions --install
```

Or (with custom path)

```sh
$ app completions --install ~/.bash_profile
```

Or (manual redirect to path)

```sh
$ app completions >> ~/.bash_profile
```

Or (call without options prints to screen)

```sh
$ app completions
```

## Adding custom completions for:

```ts
pargv.command('login --username <username> --password [password]')
  .completionFor('--username', 'jsmith', 'bjones');
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
  .onError((message, err, instance) => {
    // message - is the error message thrown.
    // err - is the PargvError object you can access the stack here err.stack.
    // instance - the pargv instance.
    process.exit(1);
  });
```

## Custom help handler:

```ts
pargv
  .onHelp((command, commands) => {
    // These args are injected for convenience you could just as
    // easily access them from pargv._commands if you wish.
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
  .onHelp((command, commands) => {

    // We'll create a layout that is a 80 wide
    const layout = this.layout(80);

    for (const k in commands) {
      const cmd = commands[k];
      layout.section(cmd._name); // add the name of the command as a section.
      layout.repeat('=') // add a divider.
      layout.div() // just some space you could also pad see cliui for padding instructions.
      layout.section('Commands:');
      cmd._commands.forEach((el) => {
        // iterate the commands add to layout.
      });
      layout.section('Options:');
      cmd._options.forEach((el) => {
        // iterate options add to layout.
      });
    }

    // Quick note on .repeat() method. You can use patterns and
    // Pargv layout will calculate the number of repeats so that
    // it is constrained to the layout's width.

    // ex: layout.repeat('><><')

  });
```

## Parsing Objects

```sh
$ app --user.name Joe --user.age 35
```

OR

```sh
$ app --user.name=Joe --user.age=35
```

OR

```sh
$ app --user name:Joe|age:35
```

Result:

```js
const result = {
  user: {
    name: 'Joe',
    age: 35
  }
};
```

## Parsing Arrays

By default csv strings are converted to Arrays.

```sh
$ app --size 'small, medium,large, xl'
```

Result:

```js
const result = {
  size: ['small', 'medium', 'large', 'xl']
};
```

To disable auto cast to array of csv strings set to type "string".

```ts
// forces string instead of auto convert to array.
pargv.command('--size, -s [size:string]')
```

## Parsing Date

```sh
$ app --start-date 01/01/2018
```

Result:

```js
const result = {
  size: 2018-01-01T08:00:00.000Z // JavaScript Date object.
};
```

## More Examples

Take a look at [test.spec.ts](src/test.spec.ts) to see internal tests. May give you a few ideas. Will try to add more as time permits.