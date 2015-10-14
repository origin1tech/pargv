/* eslint reset:true */
var chai = require('chai'),
    assert = chai.assert,
    expect = chai.expect;

var pargv = require('../lib');

describe('Pargv Tests', function() {

    it('should return object w/ start command', function() {
        var parsed = pargv.configure(0).parse(['start']);
        expect(parsed.cmd).to.equal('start');
    });

    it('should return object w/ start & config flag', function() {
        var parsed = pargv.configure(0).parse(['start', '--config', 'production']);
        expect(parsed).to.deep.equal({
          cmd: 'start',
          config: 'production',
          cmds: [],
          source: ['start', '--config', 'production']
        });
    });

    it('should return object w/ value cast to number', function() {
        var parsed = pargv.configure(0).parse(['start', '--number', '25']);
        expect(parsed.number).to.equal(25);
    });

    it('should return object w/ value cast to date', function() {
        var parsed = pargv.configure(0).parse(['start', '-date', '12/31/2015 8:00 PM']);
        assert.deepEqual(parsed.date, new Date('12/31/2015 8:00 PM'));
    });

    it('should return person object from JSON.', function() {
        var parsed = pargv.configure(0).parse([ '-person', '{ "name": "John Smith" }']);
        assert.deepEqual({ person: parsed.person }, { person: { name: 'John Smith' } });
    });

    it('should configure custom index then reset to default.', function() {
        var parsed = pargv.configure(0),
            confIdx = parsed._options.index;
        expect(parsed._options.index).to.equal(0);
        parsed.reset();
        expect(parsed._options.index).to.equal(3);
    });

});
