# Change Log

List of changes in descending order.

### 10.6.2017 (v2.0.12-13)

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