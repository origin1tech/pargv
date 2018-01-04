# Pargv 2.x

Pargv is a CLI argument parsing library. While similar to Yargs or Commander it differs in that it focuses on commands. Without custom logic/help most libs lump options together where most real CLI tools require different argument and option requirements. Pargv takes aim at that issue. For this reason Pargv is likely more suited to larger CLI modules.

### New (v2.1.x)

The minor version upgrade from 2.0.x to 2.1.x should be compatible with older configs. You may see deprecation warnings which will indicate the new method or property name to be used however your config should still work. The reason for the minor upgrade is a lot of refactoring was done and several new methods and properties were created. Handling of help was significantly simplified. It was just overly complex and needed to be simplified. Additionally added events see [events](#events) below for details.

[![Help Preview](screenshot.png)](https://www.youtube.com/watch?v=c2tg32oNC8E)

### Tutorial Video

This is a bit dated but still largely relevant. To be safe also view [docs](docs/index.html)

See >> [https://www.youtube.com/watch?v=c2tg32oNC8E](https://www.youtube.com/watch?v=c2tg32oNC8E)

## Installation

You can probably do this in your sleep but for completeness...

```sh
$ npm install pargv
```

OR (exlude dev dependencies)

```sh
$ npm install pargv  --production
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

More Examples [EXAMPLES.md](EXAMPLES.md)

### Advanced Example

```ts
import { Pargv } from 'pargv';

// For ES5
// const Pargv = require('pargv').Pargv;

const pargv = new Pargv({ locale: 'en', headingDivider: '#', extendCommands: true });

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

  // Note we specify --ext, we could also specify -e or --extension
  // Pargv will figure it out meaning you can use the primary or an alias
  // as your key.
  .when('--force', '--ext')

  // Sets a default value for the extension option.
  .default('--extension', '.html')

  // Ensures the value for extension is contained in our expression.
  .coerce('--extension', /^\.(html|hbs|ejs)$/, 'could set default val here as well')

  .coerce('directory', (value, command) => {
    // value is the argument value.
    // command the PargvCommand instance.
    // do something and return value.
    return value;
  })

  .action((template, parsed, command) => {
    // template - the <template> sub command you defined in your command.
    // parsed - the resulting parsed object see more on this below.
    // command - the command instance that Pargv generated.
  })
  .exec(); // the above action will be called.
```

More [EXAMPLES.md](EXAMPLES.md) here.

## Options

Pargv options, descriptions and defaults.

<table>
  <thead>
    <tr><th>Option</th><th>Description</th><th>Default</th></tr>
  </thead>
  <tbody>
    <tr><td>cast</td><td>When true Pargv tries to auto cast values to type.</td><td>True</td></tr>
    <tr><td>splitArgs</td><td>when args[0] is ONLY arg and string split to array by specified char. Null to disable.</td><td>null</td></tr>
    <tr><td>colorize</td><td>Whether to use colors in help/log messages.</td><td>True</td></tr>
    <tr><td>displayHeader</td><td>When true help header is displayed.</td><td>True</td></tr>
    <tr><td>displayFooter</td><td>When true help footer is displayed.</td><td>True</td></tr>
    <tr><td>displayNone</td><td>When Arguments & Options show "none" in help otherwise hidden.</td><td>True</td></tr>
    <tr><td>displayTitles</td><td>When true Arguments & Options titles displayed in help.</td><td>True</td></tr>
    <tr><td>headingDivider</td><td>A string repeated for heading/footing in help.</td><td>><><</td></tr>
    <tr><td>commandDivider</td><td>A string divider repeated between command help.</td><td>.</td></tr>
    <tr><td>locale</td><td>The i18n locale to use for messages/help.</td><td>en</td></tr>
    <tr><td>localeDir</td><td>A directory for locales if u wish to roll your own.</td><td>undefined</td></tr>
    <tr><td>defaultHelp</td><td>When true commands automatically to help.</td><td>True</td></tr>
    <tr><td>exitHelp</td><td>Exit after displaying help.</td><td>True</td></tr>
    <tr><td>layoutWidth</td><td>The width of help text layout.</td><td>80</td></tr>
    <tr><td>castBeforeCoerce</td><td>When true will attempt to cast to type before coerce is called.</td><td>True</td></tr>
    <tr><td>extendCommands</td><td>When true known sub commands extended as properties in result.</td><td>False</td></tr>
    <tr><td>extendAliases</td><td>When true option aliases extended to result.</td><td>False</td></tr>
    <tr><td>extendStats</td><td>When true stats object is extended to results.</td><td>False</td></tr>
    <tr><td>spreadCommands</td><td>When true commands are spread in action callback.</td><td>True</td></tr>
    <tr><td>allowAnonymous</td><td>When true anonymous sub commands and options are allowed.</td><td>True</td></tr>
    <tr><td>ignoreTypeErrors</td><td>When true type checking is ignored.</td><td>False</td></tr>
    <tr><td>colors</td>
    <td colspan="2">
      <table width="100%">
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
    </td>
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
  $exec: 'example',
  $command: 'generate',
  $commands: [ 'about' ],
  $source: [ 'generate', 'about', '--ext', '.html' ],
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
    <tr><td>`<value>`</td><td>denotes a required command or option.</td></tr>
    <tr><td>`[value]`</td><td>denotes an optional command or option.</td></tr>
    <tr><td>--option</td><td>denotes an option flag.</td></tr>
    <tr><td>-o</td><td>denotes short option flag.</td></tr>
    <tr><td>generate.gen.g</td><td>results in gen & g as aliases for generate command.</td></tr>
    <tr><td>--extension.ext.e</td><td>results in ext & e as aliases for extension option.</td></tr>
    <tr><td>`[value:float]`</td><td>value should be of type float.</td></tr>
    <tr><td>`[other...]`</td><td>denotes variadic (must be last command) remaining commands pushed to single array.</td></tr>
    <tr><td>-fsb</td><td>single - breaks out to '-f', '-s', '-b'</td></tr>
    <tr><td>--ext=html</td><td>is the same as --ext html</td></tr>
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
// Creates Command: query which requires a sub command of table name.
// Option: start          Type: date
// Option: end            Type: date
// Option: max            Type: integer
pargv.command('query <tablename> --start [start:date] --end [end:date] --max [max:integer]');
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

Please pull source and see [docs](docs/index.html) initially this readme displayed tables denoting properities and methods for class instances but it's too difficult to keep in sync see docs instead.

## Events

The below events should not be confused with methods such as onLog, onError or onHelp. Those methods allow intercepting the actual log, error or help handler whereas events simply listen to the emitted events. For example if you simply wish to log to a file or something you could call <code>.on('log', your_handler)</code>. If you wanted to intercept all log events and handle them yourself use the onLog(handler) which will prevent them from being output to the terminal. You would need to handle this yourself.

<table>
  <tr><td>log</td><td>when not overridden listens to log events.</td></tr>
  <tr><td>error</td><td>when not overridden listens to error events.</td></tr>
  <tr><td>completion</td><td>listens to completion, returns completion results.</td></tr>
  <tr><td>help</td><td>when not overridden listens to show help events.</td></tr>
</table>

## Localization

The following are the supported languages however you could certainly copy the built in locales located in **node_modules/pargv/locales** of your project and then extend with whatever language you prefer. It's as simple as creating a copy of **en.json** file then changing the values to your language. Then initialize Pargv with that locale and you're off.

+ English
+ Spanish
+ French
+ Hindi
+ Italian
+ Japanese
+ Russian
+ Chinese (Simplified)
+ Chinese (Traditional)

## Examples

See [EXAMPLES.md](EXAMPLES.md)

## Change

See [CHANGE.md](CHANGE.md)

## License

See [LICENSE.md](LICENSE.md)
