import * as chai from 'chai';
import * as mocha from 'mocha';
import * as Colurs from 'colurs';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;
const colurs = Colurs.get();

import { Pargv, PargvCommand } from './';
import * as passpipe from 'passpipe';
import { isWindows } from 'chek';

const pargv = new Pargv();
const procArgs = process.argv.slice(0, 2);

describe('Pargv', () => {

  before((done) => {
    done();
  });

  it('should ensure is instance of Pargv.', () => {
    assert.instanceOf(pargv, Pargv);
  });

  it('should ensure is instance of PargvCommand.', () => {
    assert.instanceOf(pargv.$, PargvCommand);
  });

  it('should split args from space separated string.', () => {
    pargv.set.option('splitArgs', ' ');
    const parsed = pargv.parse('mycommand arg1 arg2');
    assert.deepEqual(parsed.$commands, ['mycommand', 'arg1', 'arg2']);
    pargv.set.option('splitArgs', null);
  });

  it('should parse args for command "generate <template> [name]".', () => {

    const args = procArgs.concat(['generate', 'component.tpl']);

    pargv.command('generate <template> [name] --force.f')
      .describe('generate', 'Generates a new template with optional name.')
      .default('name', 'aboutus.html')
      .default('-f', true);

    const parsed = pargv.parse(args);

    const expected = {
      '$exec': 'node_modules/mocha/bin/_mocha',
      '$command': 'generate',
      '$external': null,
      '$commands': ['component.tpl', 'aboutus.html'],
      '$source': ['generate', 'component.tpl'],
      force: true
    };

    if (isWindows())
      expected.$exec = "node_modules\\mocha\\bin\\_mocha";

    assert.deepEqual(parsed, expected);

  });

  it('should reset Pargv and add extendCommands option.', () => {
    pargv.reset({ extendCommands: true });
    const len = Object.keys(pargv._commands).length; // should be zero now.
    assert.isTrue(pargv.options.extendCommands);
    assert.equal(len, 0);
  });

  it('should parse args for command "generate <template> [name] and execute action.', (done) => {

    const args = procArgs.concat(['generate', 'component.tpl', 'about.html']);

    pargv.command('generate <template> [name]')
      .describe('generate', 'Generates a new template with optional name.')
      .action((template, name, parsed, cmd) => {

        assert.equal(template, 'component.tpl');
        assert.equal(name, 'about.html');
        assert.instanceOf(cmd, PargvCommand);
        done();
      }).exec(args);

  });

  it('should parse args for command "generate <template> [name], return completions.', (done) => {

    const args = procArgs.concat(['generate', 'ho']);
    const comps = ['home', 'about', 'contact'];

    pargv.command('generate <template> [name]')
      .describe('generate', 'Generates a new template with optional name.')
      .action((template, name, parsed, cmd) => {

        assert.equal(template, 'component.tpl');
        assert.equal(name, 'about.html');
        assert.instanceOf(cmd, PargvCommand);
        done();
      })
      .completionFor('template', comps)
      .command('install')
      .command('get');


    const parsed = pargv.parse(args);
    const replies = pargv.completionResult(parsed);
    assert.deepEqual(replies, comps.sort());

    done();

  });

  it('should spread args including anonymous for "generate <template> [name].', (done) => {

    const args = procArgs.concat(['generate', 'component.tpl', 'about.html', 'other.jsx']);

    pargv.command('generate <template> [name]')
      .describe('generate', 'Generates a new template with optional name.')
      .action((template, name, other, parsed, cmd) => {
        assert.equal(template, 'component.tpl');
        assert.equal(name, 'about.html');
        assert.equal(other, 'other.jsx');
        assert.instanceOf(cmd, PargvCommand);
        done();
      }).exec(args);

  });

  it('should DISABLE spread args for "generate <template> [name].', (done) => {

    const args = procArgs.concat(['generate', 'component.tpl', 'about.html', 'other.jsx']);

    pargv.set.option('spreadCommands', false);

    pargv.command('generate <template> [name]')
      .describe('generate', 'Generates a new template with optional name.')
      .action((parsed, cmd) => {
        assert.instanceOf(cmd, PargvCommand);
        pargv.set.option('spreadCommands', true);
        done();
      }).exec(args);

  });

  it('should parse args for command "download <url> with at least 2 options and coerce.', () => {

    const args = procArgs.concat(['download', 'http://url.com', '-u=bsmith', '-p=123456']);

    pargv.reset()
      .command('download <url> --username.user.u [username] --password.pass.p [password]', 'Downloads from url.')
      .min.options(2)
      .coerce('--password', (val, cmd) => {
        let len = val.length;
        let result = '';
        while (len--) {
          result += '*';
        }
        return result;
      });

    const parsed = pargv.parse(args);

    assert.equal(parsed.password, '******');

  });

  it('should set custom help callback.', () => {

    const helpTxt = 'My custom help.';

    pargv.reset()
      .onHelp((cmd, cmds) => {
        return helpTxt;
      });

    assert.equal(pargv.get.help(), helpTxt);

  });

  it('should set custom error callback.', (done) => {

    const func = function errorHandler(err) {
      assert.equal('at least 1 commands are required but got 0.', colurs.strip(err.message));
      done();
    };

    pargv.$
      .min.commands(1)
      .onError(func)
      .parse(['test']);

  });

  it('should require property when specified property exists.', (done) => {

    const func = function errorHandler(err) {
      assert.equal('-x requires -y but is missing.', colurs.strip(err.message));
      done();
    };

    pargv.reset();

    pargv.$
      .when('-x', '-y')
      .onError(func)
      .parse(['-x']);

  });

  it('should demand the -x and -y options.', (done) => {

    const func = function errorHandler(err) {
      assert.equal('missing required arguments -y or have no default value.', colurs.strip(err.message));
      done();
    };

    pargv.reset();

    pargv.$
      .demand('-x', '-y')
      .onError(func)
      .parse(['-x']);

  });

  it('should get auto generated help text.', () => {
    pargv.reset();
    pargv.command('help');
    let resultTxt = colurs.strip(pargv.get.help());
    expect(resultTxt.length).gt(0);
    assert.match(resultTxt, /usage: help/gi);
    pargv.remove.command('help');
  });

  it('should fallback to catchall command.', (done) => {
    pargv.reset()
      .set.option('fallbackHelp', 'fallback');
    pargv.command('fallback')
      .action((parsed) => {
        assert(parsed.$command, 'unknown');
        pargv.set.option('fallbackHelp', true);
        pargv.remove.command('fallback');
        done();
      });
    pargv.exec(['uknown']);
  });

  it('should parse value to date.', () => {
    const parsed =
      pargv.reset().parse(['--date', '1/1/2000']);
    assert.instanceOf(parsed.date, Date);
  });

  it('should parse value to boolean.', () => {
    const parsed =
      pargv.reset().parse(['--boolean', 'true']);
    assert.equal(parsed.boolean, true);
  });

  it('should parse value to number.', () => {
    const parsed =
      pargv.reset().parse(['--number', '25']);
    assert.equal(parsed.number, 25);
  });

  it('should parse value to number.', () => {
    const parsed =
      pargv.reset().parse(['--number', '25']);
    assert.equal(parsed.number, 25);
  });

  it('should parse value to regexp.', () => {
    const parsed =
      pargv.reset().parse(['--regexp', '/^(test|testing)$/i']);
    const str1 = 'test';
    const str2 = 'Testing';
    assert.equal(parsed.regexp.test(str1), true);
    assert.equal(parsed.regexp.test(str2), true);
    assert.instanceOf(parsed.regexp, RegExp);
  });

  it('should parse value outputting as an array.', () => {
    const parsed =
      pargv.reset().parse(['--array', 'one, two, three, four']);
    assert.deepEqual(parsed.array, ['one', 'two', 'three', 'four']);
  });

  it('should parse value to object from JSON.', () => {
    const parsed =
      pargv.reset().parse(['--json', '{"name": "bob", "age": "35"}']);
    assert.deepEqual(parsed.json, { name: 'bob', age: 35 });
  });

  it('should parse value to object.', () => {
    const parsed =
      pargv.reset().parse(['--obj', 'name:bob+age:40', '--obj2.sizes', 'small,medium,large', '--obj3', 'work.office:"5555679897"+secretary:"5553459878"']);
    assert.deepEqual(parsed.obj, { name: 'bob', age: 40 });
    assert.deepEqual(parsed.obj2, { sizes: ['small', 'medium', 'large'] });
    assert.deepEqual(parsed.obj3, { work: { office: 5555679897, secretary: 5553459878 } });
  });

  it('should spawn and test bash script.', (done) => {
    if (isWindows()) // windows can't run bash.
      return done();
    const cmd = pargv.command('@bash.sh');
    cmd.cwd('src/test');
    const parsed = pargv.parse(['bash.sh']);
    const proc = pargv.spawn(parsed, cmd, [], false);
    passpipe.proc(proc, (chunk) => {
      assert.equal(chunk, 'executed bash script.');
      done();
    });
  });

  it('should spawn and test node script.', (done) => {
    const cmd = pargv.command('@node.js');
    pargv.base('src/test');
    const parsed = pargv.parse(['node.js']);
    const proc = pargv.spawn(parsed, cmd, [], false);
    passpipe.proc(proc, (chunk) => {
      assert.equal(chunk, 'executed node script.');
      pargv.base(null);
      done();
    });
  });

});

