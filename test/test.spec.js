/* eslint reset:true */
const chai = require('chai'),
    assert = chai.assert,
    expect = chai.expect;

// Require the Pargv library.
var pargv = require('../lib');

// Run tests.
describe('Pargv', () => {

    // Test should return object with cmd equal to 'start'.
    it('should return object w/ start command', () => {
        const parsed = pargv.configure(0).parse(['start']);
        expect(parsed.cmd).to.equal('start');
    });

    // Test should return object representing complete object
    // including cmd, cmds, flags and source.
    it('should return object w/ start & config flag', () => {
        const parsed = pargv.configure(0).parse(['start', '--config', 'production']);
        expect(['start', '--config', 'production']).to.deep.equal(parsed.source);
        expect('start').to.equal(parsed.cmd);
        expect('production').to.equal(parsed.config);
    });

    // Test should properly cast an object to a Number.
    it('should return object w/ value cast to number', () => {
        const parsed = pargv.configure(0).parse(['start', '--number', '25']);
        expect(25).to.equal(parsed.number);
    });

    it('should cast value to instanceof RegExp', () => {
        const parsed = pargv.configure(0).parse(['--exp', '/^test$/'])
        assert.instanceOf(parsed.exp, RegExp);
    });

    // Test should properly cast a Date.
    it('should return object w/ value cast to date', () => {
        const parsed = pargv.configure(0).parse(['start', '--date', '12/31/2015 8:00 PM']);
        assert.deepEqual(parsed.date, new Date('12/31/2015 8:00 PM'));
    });

    // Test should properly cast a string to JSON.
    // NOTE: the below '{ "name": "John Smith" }' would need
    // to be '"{ "name": "John Smith" }""' from the command line!
    it('should return person object from JSON.', () => {
        const parsed = pargv.configure(0).parse(['--person', '{ "name": "John Smith" }']);
        assert.deepEqual({ person: parsed.person }, { person: { name: 'John Smith' } });
    });

    // Test key value pairs.
    it('should convert key:value to object', () => {
        const parsed = pargv.configure(0).parse(['--person', 'name:Bob', '--person', 'age:44']);
        assert.equal('Bob', parsed.person.name);
        assert.equal(44, parsed.person.age);
    });

    // Test should ensure configuration reset return expected results.
    it('should configure custom index then reset to default.', () => {
        pargv.configure(0);
        const confIdx = pargv.options.index;
        assert.equal(pargv.options.index, 0);
    });

});
