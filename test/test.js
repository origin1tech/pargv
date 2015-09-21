
var pargv = require('../lib'),
    chai = require('chai'),
    expect = chai.expect,
    should = chai.should,
    assert = chai.assert;

describe('Pargv Tests', function () {

    it('should return object w/ start command', function() {
        var parsed = pargv()(['start']);
        assert.deepEqual({ cmd: 'start' }, parsed);
    });

    it('should return object w/ start & config flag', function() {
        var parsed = pargv()(['start', '--config', 'production']);
        assert.deepEqual({ cmd: 'start', config: 'production' }, parsed);
    });

    it('should return object w/ start & number', function() {
        var parsed = pargv()(['start', '--number', '25']);
        assert.deepEqual({ cmd: 'start', number: 25 }, parsed);
    });

    it('should return object w/ start & date', function() {
        var parsed = pargv()(['start', '--date', '12/31/2015 8:00 PM']);
        assert.deepEqual({ cmd: 'start', date: new Date('12/31/2015 8:00 PM')}, parsed);
    });

    it('should return person object from JSON.', function() {
        var parsed = pargv({ shiftCommand: false })([ '-person', '{ "name": "John Smith" }']);
        assert.deepEqual({ person: { name: 'John Smith' }}, parsed);
    });

});