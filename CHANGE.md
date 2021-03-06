# Change Log

List of changes in descending order.

### 5.24.2018 (v2.1.6-v2.1.7)

<table>
  <tr><td>npm audit</td><td>update dev dependencies, had vulnerabilities.</td></tr>
  <tr><td>typedoc</td><td>fix typings nag.</td></tr>
</table>

### 5.20.2018 (v2.1.3-v2.1.5)

<table>
  <tr><td>spreadArguments</td><td>fix issue where spreadArguments could be overridden per command.</td></tr>
  <tr><td>spawn</td><td>allow spawn to be called directly .spawn(program, args, options)</td></tr>
  <tr><td>parse</td><td>fix bug where anonymous flags could result in null values.</td></tr>
  <tr><td>PargvCommand</td><td>fix bug in typings where Partial is required.</td></tr>
  <tr><td>exec</td><td>fix issue where spread arguments include anonymous flags.</td></tr>
  <tr><td>epilog</td><td>fix issue where epilog is displayed in the header.</td></tr>
</table>

### 12.28.2017 - 1.25.2018 (v2.1.0 - v2.1.2)

Note minor version change. Configs from 2.0.30 or greater should still be compatible but moving to 2.1.x due to refactor of help and a couple additional methods. Removed Figlet just isn't needed user should pass whatever they like.

<table>
  <tr><td>errorHandler</td><td>bad emit forgot to remove.</td></tr>
  <tr><td>castToType</td><td>remove trim on strings, valid strings might start/end with space.</td></tr>
  <tr><td>command.stats</td><td>fix issue where "whens" are incorrectly demanded.</td></tr>
  <tr><td>usage</td><td>add method to allow manual override of usage string.</td></tr>
  <tr><td>when</td><td>fix bug in whens where error is thrown but no demand was triggered.</td></tr>
  <tr><td>figlet</td><td>deprecate Figlet font generation favor pre-styled provided by user.</td></tr>
  <tr><td>onHelp</td><td>simplify how help is called was unnecessarily complex.</td></tr>
  <tr><td>command.arg</td><td>Add alias to .option() where tokens are auto wrapped with [arg] if [] or <> are not present.</td></tr>
  <tr><td>command</td><td>deprecate pargv.$() in favor of calling pargv.command() without command name to return default command.</td></tr>
  <tr><td>log</td><td>remove app name prefix allow user to define, favor process.stderr.write instead of console.</td></tr>
  <tr><td>error</td><td>remove app name prefix allow user to define, favor process.stderr.write instead of console.</td></tr>
  <tr><td>options.colors</td><td>interface updated to NOT require all properties in options.</td></tr>
  <tr><td>README (options)</td><td>update various readme options to reflect correct properties and defaults.</td></tr>
</table>

### 12.17.2017 (v2.0.32-33)

<table>
  <tr><td>variadic</td><td>improve variadic [var...] argument handling for commands.</td></tr>
  <tr><td>README (options)</td><td>update readme to correct missing or deprecated options.</td></tr>
  <tr><td>test.spect.ts</td><td>add tests for variadic arguments.</td></tr>
  <tr><td>castToType</td><td>issue where value is wrongly converted to epoch.</td></tr>
</table>


### 10.24.2017 (v2.0.26-30)

<table>
   <tr><td>lokales</td><td>update to lokales 1.0.10 bug in 1.0.9.</td></tr>
  <tr><td>test.spec.ts</td><td>disable help text test, throws error in wercker need to look into it.</td></tr>
  <tr><td>formatMessage</td><td>fix log formatting bug for internal method.</td></tr>
  <tr><td>parse</td><td>fixed typo, basically dumbthumb in anonymous arg check preventing errors from being thrown.</td></tr>
  <tr><td>maxCommands & maxOptions</td><td>allow setting options/commands to 0 instead of ignoring.</td></tr>
  <tr><td>minCommands & minOptions</td><td>allow setting options/commands to 0 instead of ignoring.</td></tr>
  <tr><td>commandsCount</td><td>based commands count known & anonymous commands.</td></tr>
  <tr><td>optionsCount</td><td>based options on.</td></tr>
  <tr><td>update</td><td>update various packages after lokales update.</td></tr>
  <tr><td>castToType</td><td>allow forcing to type when explicit. For example a single value should be able to be forced/converted to an array.</td></tr>
</table>

### 10.21.2017 (v2.0.23-25)

<table>
  <tr><td>examples</td><td>fix issue where examples were created as tuples.</td></tr>
  <tr><td>tests</td><td>add tests and simplify a couple.</td></tr>
  <tr><td>fallbackHelp</td><td>v2.0.23 had bug where help fallback command was called when it should not have been.</td></tr>
  <tr><td>fallbackHelp</td><td>deprecate "autoHelp" w/ compatibilty fallback allows specifying a command to fallback to or true/false to enable/disable displaying help.</td></tr>
  <tr><td>command.help()</td><td>fix issue where setting help(false) was not honored.</td></tr>
</table>

### 10.20.2017 (v2.0.20-22)

<table>
    <tr><td>EXAMPLES.md</td><td>fixed errors in examples.</td></tr>
  <tr><td>spawnAction()</td><td>when defined creates process and calls back to this custom action.</td></tr>
  <tr><td>spreadCommands()</td><td>add override on command to enable/disable spread commands..</td></tr>
  <tr><td>extendCommands()</td><td>add override method extend commands to result object for this command.</td></tr>
  <tr><td>extendAliases()</td><td>add override method to extend aliases on result object for this command.</td></tr>
  <tr><td>stats()</td><td>fix bug where all anonymous args might remove args.</td></tr>
  <tr><td>parse()</td><td>handle new option "splitArgs" which allows passing string to parse or exec, Pargv will split to args.</td></tr>
  <tr><td>command.onLog()</td><td>extend command with onLog callback consistent with existing onError wrapper.</td></tr>
</table>

### 10.18.2017 (v2.0.18-19)

<table>
  <tr><td>onLog() & onError()</td><td>minor breaking change, Pargv instance no longer passed as this causes issues when handing off to other modules in message formatting.</td></td></tr>
  <tr><td>Pargv</td><td>set internal props as non-enumerable less cluttered.</td></tr>
  <tr><td>PargvCommand</td><td>set internal props as non-enumerable less cluttered.</td></tr>
  <tr><td>completionResult()</td><td>expose completion result method publicly for external use. Also made method more generic to support calling as completer from Node's readline.</td></tr>
  <tr><td>help text</td><td>Capitalized strings for default help text.</td></tr>
  <tr><td>exitHelp</td><td>Exit process after showing help, helpful in some cases to disable this when calling help from another module.</td></tr>
  <tr><td>completions.handler()</td><td>sort completion results before returning.</td></td></tr>
  <tr><td>tests</td><td>add fix up tests a bit.</td></td></tr>
</table>

### 10.8.2017 (v2.0.16-17)

<table>
  <tr><td>test.spec.ts</td><td>fix bug in tests after adding default help values.</td></tr>
  <tr><td>test.spec.ts</td><td>disable help text test, blowing up wercker add to TODO's.</td></tr>
  <tr><td>wercker.yml</td><td>add wercker to project.</td></tr>
</table>

### 10.6.2017 (v2.0.12-15)

<table>
  <tr><td>onLog</td><td>added onLog override for custom handling of log messages.</td></tr>
  <tr><td>error</td><td>improve error handling.</td></tr>
  <tr><td>log</td><td>improve log handling.</td></tr>
  <tr><td>help text</td><td>show defaults when no command are configured, makes sure a blank line isn't output basically, essentially showing something.</td></tr>
</table>

### 9.21.2017 (v2.0.11)

<table>
  <tr><td>help</td><td>flag option optional/required values were not showing in help.</td></tr>
  <tr><td>help alias</td><td>add first char of localized help as alias to command help.</td></tr>
</table>

### 9.21.2017 (v2.0.9)

<table>
  <tr><td>chaining</td><td>improved chaining and typings.</td></tr>
  <tr><td>.completion()</td><td>extend PargvCommand with .completion() command.</td></tr>
</table>

### 9.20.2017 (v2.0.8)

<table>
  <tr><td>.cwd()</td><td>Allow specifying cwd base dir for external commands.</td></tr>
  <tr><td>examples</td><td>Add more examples for calling external commands.</td></tr>
  <tr><td>.reset()</td><td>Remove redundancy from reset command.</td></tr>
  <tr><td>external commands</td><td>Allow for specifying external commands prefixed with "@" see examples.</td></tr>
  <tr><td>WriteStreamExtended</td><td>Remove unneeded custom interface.</td></tr>
  <tr><td>.exec()</td><td>fix issue where help shows incorrectly.</td></tr>
  <tr><td>.command()</td><td>fix issue where intellisense not chaining.</td></tr>
</table>

### 9.16.2017 (v2.0.7)

<table>
  <tr><td>readme</td><td>Update various options/properties in Readme.</td></tr>
  <tr><td>test.spec.ts</td><td>Correctly refactor .fail() to .onError.</td></tr>
  <tr><td>command.ts</td><td>index.ts was a monster refactored to own file.</td></tr>
  <tr><td>.parse()</td><td>fix error message didn't display all missing args.</td></tr>
</table>

### 9.15.2017 (v2.0.6)

<table>
  <tr><td>readme</td><td>Update readme with tutorial video link.</td></tr>
</table>

### 9.14.2017 (v2.0.5)

<table>
  <tr><td>help</td><td>fix issue where help isn't auto shown on command not found.</td></tr>
  <tr><td>default</td><td>fix issue where inline default isn't used.</td></tr>
</table>

### 9.4.2017 (v2.0.0 - 2.0.4)

<table>
  <tr><td>ver 2.x</td><td>Migration from 1.x branch to 2.x</td></tr>
</table>