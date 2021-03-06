import * as chai from 'chai';
import * as mocha from 'mocha';
import * as Colurs from 'colurs';
import * as MuteStream from 'mute-stream';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;
const colurs = Colurs.init();


const ms = new MuteStream();
ms.pipe(process.stderr);
ms.mute();

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
    assert.instanceOf(pargv['_command'], PargvCommand);
  });

  it('should split args from space separated string.', () => {
    pargv.setOption('splitArgs', ' ');
    const parsed = pargv.parse('mycommand arg1 arg2');
    assert.deepEqual(parsed.$arguments, ['mycommand', 'arg1', 'arg2']);
    pargv.setOption('splitArgs', null);
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
      '$variadics': [],
      '$commands': ['component.tpl', 'aboutus.html'],
      '$arguments': ['component.tpl', 'aboutus.html'],
      '$source': ['generate', 'component.tpl'],
      force: true
    };

    if (isWindows())
      expected.$exec = "node_modules\\mocha\\bin\\_mocha";

    assert.deepEqual(parsed, expected);

  });

  it('should reset Pargv and add extendArguments option.', () => {
    pargv.reset({ extendArguments: true });
    const len = Object.keys(pargv._commands).length; // should be zero now.
    assert.isTrue(pargv.options.extendArguments);
    assert.equal(len, 1); // should contain only the default command.
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

    pargv.setOption('spreadArguments', false);

    pargv.command('generate <template> [name]')
      .describe('generate', 'Generates a new template with optional name.')
      .action((parsed, cmd) => {
        assert.instanceOf(cmd, PargvCommand);
        pargv.setOption('spreadArguments', true);
        done();
      }).exec(args);

  });

  it('should parse known and anonymous flags regardless of order.', () => {
    pargv.reset();
    pargv.command('generate.g <name> [args...] --test');
    const parsed = pargv.parse(['g', 'app', 'one', 'two', '--flag0', 'flagval', '--flag1', '--test']);

    const expected = {
      '$exec': 'node_modules/mocha/bin/_mocha',
      '$command': 'g',
      '$external': null,
      '$arguments': ['app', ['one', 'two']],
      '$variadics': ['one', 'two'],
      '$source':
        ['g',
          'app',
          'one',
          'two',
          '--flag0',
          'flagval',
          '--flag1',
          '--test'],
      '$commands': ['app', ['one', 'two']],
      test: true,
      flag0: 'flagval',
      flag1: true
    };

    assert.deepEqual(parsed, expected);
  });

  it('should parse additional commands as variadic', (done) => {

    const args = procArgs.concat(['download', 'http://domain.com/file.zip']);

    pargv.setOption('extendArguments', false);

    pargv.command('download <url> [others...]')
      .default('others', ['other1', 'other2'])
      .action((url, others, parsed) => {
        assert.deepEqual(others, ['other1', 'other2']);
        done();
      })
      .exec(args);


  });

  it('should parse args for command "download <url> with at least 2 options and coerce.', () => {

    const args = procArgs.concat(['download', 'http://url.com', '-u=bsmith', '-p=123456']);

    pargv
      .command('download <url> --username.user.u [username] --password.pass.p [password]', 'Downloads from url.')
      .minOptions(2)
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

    assert.equal(pargv.getHelp(), helpTxt);

  });

  it('should set custom error callback.', (done) => {

    const func = function errorHandler(err) {
      assert.equal('at least 1 arguments are required but got 0.', colurs.strip(err.message));
      done();
    };

    pargv.command('command [path]')
      .minArguments(1)
      .onError(func)
      .parse(['command']);

  });

  it('should require property when specified property exists.', (done) => {

    const func = function errorHandler(err) {
      assert.equal('-x requires -y but is missing.', colurs.strip(err.message));
      done();
    };

    pargv.reset();

    pargv.command('command')
      .when('-x', '-y')
      .onError(func)
      .parse(['command', '-x']);

  });

  it('should demand the -x and -y options.', (done) => {

    const func = function errorHandler(err) {
      assert.equal('missing required arguments -y or have no default value.', colurs.strip(err.message));
      done();
    };

    pargv.command('command')
      .demand('-x', '-y')
      .onError(func)
      .parse(['command', '-x']);

  });

  // Skip if Wercker, complains about figlet fonts.
  if (!process.env.WERCKER)
    it('should get auto generated help text.', () => {
      pargv.command('help');
      let resultTxt = colurs.strip(pargv.getHelp());
      expect(resultTxt.length).gt(0);
      assert.match(resultTxt, /usage: help/gi);
      pargv.removeCommand('help');
    });

  it('should fallback to catchall command.', (done) => {
    pargv.reset()
      .onHelp((command, commands) => {
        assert.isUndefined(command);
        assert.deepProperty(commands.__default__, '_name');
        done();
        pargv.onHelp(true);
      });
    pargv.exec(['uknown']);
  });

  it('should parse value to date.', () => {
    const parsed =
      pargv.parse(['--date', '1/1/2000']);
    assert.instanceOf(parsed.date, Date);
  });

  it('should parse value to boolean.', () => {
    const parsed =
      pargv.parse(['--boolean', 'true']);
    assert.equal(parsed.boolean, true);
  });

  it('should parse value to number.', () => {
    const parsed =
      pargv.parse(['--number', '25']);
    assert.equal(parsed.number, 25);
  });

  it('should parse value to number.', () => {
    const parsed =
      pargv.parse(['--number', '25']);
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
      pargv.parse(['--array', 'one, two, three, four']);
    assert.deepEqual(parsed.array, ['one', 'two', 'three', 'four']);
  });

  it('should parse value to object from JSON.', () => {
    const parsed =
      pargv.parse(['--json', '{"name": "bob", "age": "35"}']);
    assert.deepEqual(parsed.json, { name: 'bob', age: 35 });
  });

  it('should parse value to object.', () => {
    const parsed =
      pargv.parse(['--obj', 'name:bob+age:40', '--obj2.sizes', 'small,medium,large', '--obj3', 'work.office:"5555679897"+secretary:"5553459878"']);
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
    const proc = pargv.spawnHandler(parsed, cmd, [], false);
    passpipe.proc(proc, (chunk) => {
      assert.equal(chunk, 'executed bash script.');
      done();
    });
  });

  it('should spawn and test node script.', (done) => {
    const cmd = pargv.command('@node.js');
    pargv.base('src/test');
    const parsed = pargv.parse(['node.js']);
    const proc = pargv.spawnHandler(parsed, cmd, [], false);
    passpipe.proc(proc, (chunk) => {
      assert.equal(chunk, 'executed node script.');
      pargv.base(null);
      done();
    });
  });

});

