/* eslint reset:true */
const chai = require('chai'),
    assert = chai.assert,
    expect = chai.expect;

// Require the Pargv library.
var pargv = require('../lib');

// Run tests.
describe('Pargv', function () {

    // Test should return object with cmd equal to 'start'.
    it('should return object w/ start command', function () {
        const parsed = pargv.configure(0).parse(['start']);
        expect(parsed.cmd).to.equal('start');
    });

    // Test should return object representing complete object
    // including cmd, cmds, flags and source.
    it('should return object w/ start & config flag', function () {
        var parsed = pargv.configure(0).parse(['start', '--config', 'production']);
        expect(['start', '--config', 'production']).to.deep.equal(parsed.source);
        expect('start').to.equal(parsed.cmd);
        expect('production').to.equal(parsed.config);
    });

    // Test should properly cast an object to a Number.
    it('should return object w/ value cast to number', function () {
        var parsed = pargv.configure(0).parse(['start', '--number', '25']);
        expect(25).to.equal(parsed.number);
    });

    // Test should properly cast a Date.
    it('should return object w/ value cast to date', function () {
        var parsed = pargv.configure(0).parse(['start', '--date', '12/31/2015 8:00 PM']);
        assert.deepEqual(parsed.date, new Date('12/31/2015 8:00 PM'));
    });

    // // Test should properly cast a string to JSON.
    it('should return person object from JSON.', function () {
        var parsed = pargv.configure(0).parse(['--person', '{ "name": "John Smith" }']);
        assert.deepEqual({ person: parsed.person }, { person: { name: 'John Smith' } });
    });

    // // Test should ensure configuration reset return expected results.
    it('should configure custom index then reset to default.', function () {
        var parsed = pargv.configure(0),
            confIdx = parsed._options.index;
        expect(parsed._options.index).to.equal(0);
    });

});
