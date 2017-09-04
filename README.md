# Pargv 2.x

Pargv has been rewritten in TypeScript as of version **2.0.0**. If you need the last legacy version you can install **1.5.1**. Pargv now automatically builds help based on your configuration but you can also manually create your own help using built in helpers which leverage [cliui](https://www.npmjs.com/package/cliui).

The best way to describe the Pargv cli argument parsing lib is that it is a mix of [commander](https://github.com/tj/commander.js) and [yargs](https://github.com/yargs/yargs). The most unique aspect of Pargv is how commands can be written which simplifies your configuration. Although you can chain calls for various features just like other parsing libs you can also enter them as a string and Pargv will parse out your config. The result is many command configurations can be written in a single. line.

## Installation

You can probably do this in your sleep but for completeness...

```sh
$ npm install pargv -save
```

## Quick Start

Import or require then new up an instance of Pargv.

### Basic Example

```ts
import { Pargv } from 'pargv';

// For ES5
// const Pargv = require('pargv').Pargv;

const pargv = new Pargv(/* your options */);

pargv.command('generate <template>')
  .action((template, parsed, command) => {
    // template - the <template> sub command you defined in your command.
    // parsed - the resulting parsed object see more on this below.
    // command - the command instance that Pargv generated.
  });

const parsed = pargv.parse(); // if array of args not passed process.argv will be used.
```

### Advanced Example

```ts
import { Pargv } from 'pargv';

// For ES5
// const Pargv = require('pargv').Pargv;

const pargv = new Pargv({ locale: 'en', divider: '#', extendCommands: true });

// Command requires template name with optiona directory path.
pargv.command('generate <template> [directory]')

  // Creates option extension with description.
  .option('--extension, --ext [ext]', 'The template\'s extension.')

  // Option to mock force.
  .option('--force, -f', 'When present forces overwrite')

  // Adds alias for extension.
  .alias('--extension', '-e')

  // Adds description for "directory" sub command.
  .describe('directory', 'The directory path to save the template to.')

  // Not very practical but if force is defined required extention.
  // Note we specific --ext, we could also specify -e or --extension
  // Pargv will figure it out meaning u can use the primary or an alias
  // as your key.
  .when('--force', '--ext')

  // Sets a default value for the extension option.
  .default('--extension', '.html')

  // Ensures the value for extension is contained in our expression.
  .coerce('--extension', /^\.(html|hbs|ejs)$/, 'could set default val here as well')

  .action((template, parsed, command) => {
    // template - the <template> sub command you defined in your command.
    // parsed - the resulting parsed object see more on this below.
    // command - the command instance that Pargv generated.
  })
  .exec(); // the above action will be called.
```

## Options

Below are the options supported by Pargv and their uses/descriptions.

<table>
  <thead>
    <tr><th>Option</th><th>Description</th><th>Default</th></tr>
  </thead>
  <tbody>
    <tr><td>auto</td><td>When true Pargv tries to auto cast values to type.</td><td>True</td></tr>
    <tr><td>colorize</td><td>Whether to use colors in help/log messages.</td><td>True</td></tr>
    <tr><td>divider</td><td>A string to repeat as divider in help text.</td><td>=</td></tr>
    <tr><td>locale</td><td>The i18n locale to use for messages/help.</td><td>en</td></tr>
    <tr><td>localeDir</td><td>A directory for locales if u wish to roll your own.</td><td>undefined</td></tr>
    <tr><td>extendCommands</td><td>When true known sub commands extended as properties in result.</td><td>False</td></tr>
    <tr><td>allowAnonymous</td><td>When true anonymous sub commands and options are allowed.</td><td>True</td></tr>
    <tr><td>ignoreTypeErrors</td><td>When true type checking is ignored.</td><td>False</td></tr>
    <tr><td>displayStackTrace</td><td>When true stack trace is displayed for errors.</td><td>True</td></tr>
    <tr><td>exitOnError</td><td>When true Pargv exists after errors.</td><td>True</td></tr>
    <tr><td>colors</td><td>
    <table>
      <thead>
       <tr><th>Option</th><th>Description</th><th>Default</th></tr>
      </thead>
      <tbody>
      <tr><td>primary</td><td>The primary color in help.</td><td>blue</td></tr>
      <tr><td>accent</td><td>The accent color in help.</td><td>cyan</td></tr>
      <tr><td>alert</td><td>The alert, error or required color in help.</td><td>red</td></tr>
      <tr><td>muted</td><td>The muted color in help.</td><td>gray</td></tr>
      </tbody>
    </table>
    </td><td></td>
    </tr>
  </tbody>
</table>

### Colors

For supported colors see [colurs](https://github.com/origin1tech/colurs). The below
colors property in options suports single string value or array of strings
supported in colurs.

For example if you wanted the primary color in help to have a background you
might set your options as follows:

```ts
const opts = {
  colors: {
    primary: ['bold', 'bgBlue', 'white'] // result: bold white text with blue background.
  }
}
```

## Parse & Execute

Using our above example to call the action associated with **generate** we would call the exec method. Calling the exec method parses your arguments and then calls the associated action.

If you do not wish to execute the action you can simply parse and handle the result yourself.

#### Exec Method

```ts
pargv.exec(process.argv);
```

#### Parse Method

```ts
const parsed = pargv.parse(process.argv)
```

#### Parsed Result

Consider the following executed in your terminal and its corresponding configuration below:

```sh
$ app generate about --ext .html
```

```ts
const parsed = pargv.command('generate <template> --ext <ext>')
  .parse(process.argv);
```

The parsed result would be:

```ts
parsed = {
  '$exec': 'example',
  '$command': 'generate',
  '$commands': [ 'about' ],
  '$metadata':
   {
     source: [ 'generate', 'about', '--ext', '.html' ],
     execPath: '/some/path/example',
     nodePath: '/usr/local/bin/node',
     globalPrefix: '/usr/local'
   },
  ext: '.html'
}
```

## Convention Syntax & Types

The following section describes how Pargv parses tokens and conventions in your commands and options as well as how built in Type casting and type checks work.

### Pargv Syntax

Commands and options have a handy syntax that limits the need for
chained calls. For example to denote an argument as required simply
wrap in **<value>**. See below for more examples.

#### Tokens

<table>
  <thead>
    <tr><th>Argument</th><th>Description</th></tr>
  </thead>
  <tbody>
    <tr><td>< value ></td><td>denotes a required command or option.</td></tr>
    <tr><td>[ value ]</td><td>denotes an optional command or option.</td></tr>
    <tr><td>--option</td><td>denotes an option flag.</td></tr>
    <tr><td>-o</td><td>denotes short option flag.</td></tr>
    <tr><td>generate.gen.g</td><td>results in gen & g as aliases for generate command.</td></tr>
    <tr><td>--extension.ext.e</td><td>results in ext & e as aliases for extension option.</td></tr>
    <tr><td>[ value:float ]</td><td>value should be of type float.</td></tr>
    <tr><td>-fsb</td><td>single - breaks out to '-f', '-s', '-b'</td></tr>
    <tr><td>--ext=.html</td><td>is the same as --ext .html</td></tr>
  </tbody>
</table>

### Commands, Options & Chaining API

You can create your commands and options using Pargv's syntax or using the
chaining API. Both do exactly the same and support either or as well as both.
There are some features which are only available through the chaining API but
we'll get to those in a moment.

```ts
// Command: login           Aliases: log, l
// Sub Command: url        (required)
// Option: username         Aliases: --user, -u
// Option: password         Aliases: --pass, -p
pargv.command('login.log.l <url> --username.user.u [username] --password.pass.p [password]');

// The below is the same as above.
pargv.command('login <url>')
  .alias('login', 'log', 'l') // or .alias('login', ['log', 'l'])
  .option('--username, --user, -u [username]')
  .option('--password, --pass, -p [password]');
```

### Spcifying Types

When creating a command or option you can specify types
for sub commands and options which take values. Pargv will then
attempt to cast to these types where applicable and also do some
type checking to ensure the result is the correct type. If you wish
you can allow casting but disable type checking when initializing
Pargv (see options).

Essentially these types are nothing more than internal coercions methods.
If you choose to pass a custom coercion method then any defined types
will be ignored as Pargv assumes you want to handle that manually.

The following are the current supported types:

date, boolean, array, regexp, object
number, float, integer, string, json

```ts
// Creates Command: query
// Requires sub command: table
// Option: start          Type: date
// Option: end            Type: date
// Option: max            Type: integer
pargv.command('query <table> --start [start:date] --end [end:date] --max [max:integer]');
```

### Argument Conventions

Arguments can be entered in your terminal in a couple different ways for certain types and options. For example you can enter flag options as follows:

```sh
$ generate contact --ext .html
```

**OR**

```sh
$ generate contact --ext=.html
```
For puposes of this example assume we have the following option flags
in our config. In this case we're mocking overwriting a template
after backing it up and then we want to publish our changes. Again
This is just all a mock but you get the idea.

NOTE: In our example below how -fbp are all together. This is possible
when prefixed with a single -.

Pargv will then breakout each flag to its own argument.

-f force
-b backup
-p publish

```sh
$ generate aboutus --ext .html -fbp
```

**Becomes**

```ts
const args = ['generate', 'aboutus', '--ext', '.html', '-f', '-b', '-p'];
```

## API

This section describes both Pargv api methods as well as PargvCommand api methods. One of the things that many find confusing when using parsing libs with chaining is how they work with multiple commands or nesting commands. Lets first cover the methods for each and then explain how they work together to accomplish what you need.

You will notice a few special characters in the "arguments" for the method's signature. This is taken from TypeScript. If you are not using TypeScript that's fine and has no relevance other than to denote the characteristics of each argument. TypeScript simply uses these tokens for realtime type checking.

Again if you are not using TypeScirpt don't worry they aren't needed it's just a way of describing what each method expects.

+ **any**       - means any type
+ **?**         - means it's optional.
+ **[]**        - means an array of some type like string[].
+ **...**       - indicates a spread operator.
+ **T**         - indicates generic type (if not using TypeScript you can ignore).

For the following take a look at the [interfaces](https://github.com/origin1tech/pargv/blob/master/dist/interfaces.d.ts) for more on what these objects contain.

+ **IPargvOptions** - denotes the Pargv options object.
+ **IPargvResult** - the resulting object after parse is called.
+ **IPargvLayout** - helpers/wrapper to [cliui](https://github.com/yargs/cliui) for displaying help text.
+ **IPargvLogo** - helpers/wrapper to [figlet](https://github.com/patorjk/figlet.js)
+ **AnsiStyles** - type containing supported [colurs](https://github.com/origin1tech/colurs) styles.
+ **HelpCallback** - an override callback to be called for help.
+ **CoerceCallback** - callback used for custom coercion.
+ **IPargvCoerceConfig** - an object containing coerce configuration.
+ **IPargvWhenConfig** - an object containing when configuration.
+ **ErrorHandler** - custom handler for handling errors.
+ **IMap<T>**   - simple type which basically represents an object literal.

### Pargv

<table>
  <thead>
    <tr><th>Method</th><th>Description</th><th>Params</th><th>Returns</th></tr>
  </thead>
  <tbody>
    <tr><td>$</td><td>returns a default instance you can use to parse args without a command.</td><td>n/a</td><td>PargvCommand</td></tr>
    <tr><td>name</td><td>name of your program.</td><td>val: string, styles?: AnsiStyles | AnsiStyles[], font?: string</td><td>Pargv</td></tr>
    <tr><td>version</td><td>program version.</td><td>val: string</td><td>Pargv</td></tr>
    <tr><td>description</td><td>program description.</td><td>val: string</td><td>Pargv</td></tr>
    <tr><td>license</td><td>program license type.</td><td>val: string</td><td>Pargv</td></tr>
    <tr><td>epilog</td><td>closing message in help ex: copyright Pargv 2018.</td><td>val: string</td><td>Pargv</td></tr>
    <tr><td>command</td><td>primary method creates a PargvCommand.</td><td>command: string, describe?: string</td><td>PargvCommand</td></tr>
    <tr><td>parse</td><td>parses arguments returns result.</td><td>...args: any[]</td><td>IPargvResult</td></tr>
    <tr><td>exec</td><td>parses arguments then executes action.</td><td>...args: any[]</td><td>IPargvResult</td></tr>
    <tr><td>help</td><td>creates custom help method or disables.</td><td>fn: boolean | HelpCallback</td><td>Pargv</td></tr>
    <tr><td>showHelp</td><td>displays help text for all or specified command.</td><td>command?: string | PargvCommand</td><td>void</td></tr>
    <tr><td>fail</td><td>overrides default on error handler.</td><td>fn: ErrorHandler</td><td>Pargv</td></tr>
    <tr><td>reset</td><td>deletes all commands and updates options if provided.</td><td>options?: IPargvOptions</td><td>Pargv</td></tr>
    <tr><td>commands.find</td><td>returns a command instance if found.</td><td>key: string</td><td>PargvCommand</td></tr>
    <tr><td>commands.remove</td><td>removes a command instance if found.</td><td>key: string</td><td>Pargv</td></tr>
    <tr><td>stats</td><td>compares args to command config returning stats/metadata.</td><td>command: string, ...args: any[]</td><td>Pargv</td></tr>
    <tr><td>logo</td><td>wrapper to output Figlet type logo.</td><td>text?: string | IFigletOptions, font?: string, styles?: AnsiStyles | AnsiStyles[]</td><td>IPargvLogo</td></tr>
    <tr><td>layout</td><td>wrapper/helper for building help using cliui.</td><td>width?: number, wrap?: boolean</td><td>IPargvLogo</td></tr>
  </tbody>
</table>

### Pargv Command

<table>
  <thead>
    <tr><th>Method</th><th>Description</th><th>Params</th><th>Returns</th></tr>
  </thead>
  <tbody>
    <tr><td>command</td><td>primary method creates a PargvCommand.</td><td>command: string, describe?: string</td><td>PargvCommand</td></tr>
    <tr><td>option</td><td>adds an option to the command.</td><td>token: string, describe?: string, def?: any, type?: string | RegExp | CoerceCallback</td><td>PargvCommand</td></tr>
    <tr><td>alias</td><td>adds an alias to the command.</td><td>key: string | IMap< string[] >, ...alias: string[]</td><td>PargvCommand</td></tr>
    <tr><td>describe</td><td>adds a description for command or option.</td><td>key: string | IMap< string >, describe?: string</td><td>PargvCommand</td></tr>
    <tr><td>coerce</td><td>adds a coercion type/method to the specified command or option.</td><td>key: string | IMap< IPargvCoerceConfig >, fn?: string | RegExp | CoerceCallback, def?: any</td><td>PargvCommand</td></tr>
    <tr><td>demand</td><td>adds a demand requiring the specified command or option.</td><td>...keys: string[]</td><td>PargvCommand</td></tr>
    <tr><td>when</td><td>requires sibling command or option when present.</td><td>key: string | IMap< IPargvWhenConfig >, demand?: string | boolean, converse?: boolean</td><td>PargvCommand</td></tr>
    <tr><td>default</td><td>adds a default value for command or option.</td><td>key: string | IMap< any >, val: any</td><td>PargvCommand</td></tr>
    <tr><td>min</td><td>add min requirement of commands or options.</td><td>n/a</td><td>{ commands: (count: number), options: (count: number) }</td></tr>
    <tr><td>max</td><td>add max requirement of commands or options.</td><td>n/a</td><td>{ commands: (count: number), options: (count: number) }</td></tr>
    <tr><td>action</td><td>an action to be called when a command is matched on exec.</td><td>fn: ActionCallback</td><td>PargvCommand</td></tr>
    <tr><td>example</td><td>adds an example for the given command.</td><td>example: string, describe?: string</td><td>PargvCommand</td></tr>
    <tr><td>parse</td><td>parses arguments returns result.</td><td>...args: any[]</td><td>IPargvResult</td></tr>
    <tr><td>exec</td><td>parses arguments then executes action.</td><td>...args: any[]</td><td>IPargvResult</td></tr>
    <tr><td>help</td><td>creates custom help method or disables.</td><td>fn: boolean | HelpCallback</td><td>Pargv</td></tr>
    <tr><td>fail</td><td>overrides default on error handler.</td><td>fn: ErrorHandler</td><td>Pargv</td></tr>
    <tr><td>epilog</td><td>closing message in help ex: copyright Pargv 2018.</td><td>val: string</td><td>Pargv</td></tr>
  </tbody>
</table>

## Examples

See [EXAMPLES.md](EXAMPLES.md)

## Change

See [CHANGE.md](CHANGE.md)

## TODO

Probably need to implement tab completion or a hood to make it easier to do manually :) Any thoughts? File an issue if you do.

## License

See [LICENSE.md](LICENSE.md)
