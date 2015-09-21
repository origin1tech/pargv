
var pargv = require('../'),
    chai = require('chai'),
    expect = chai.expect,
    should = chai.should,
    assert = chai.assert;


describe('Parse Commands', function () {

    it('should return object w/ start command', function() {
        var parsed = pargv(['start']);
        assert.deepEqual({ cmd: 'start' }, parsed);
    });

    it('should return object w/ start & config flag', function() {
        var parsed = pargv(['start', '--config', 'production']);
        assert.deepEqual({ cmd: 'start', config: 'production' }, parsed);
    });

    it('should return person object from JSON.', function() {
        var parsed = pargv([ '-person', '{ "name": "John Smith" }'], { shiftCommand: false });
        assert.deepEqual({ person: { name: 'John Smith' }}, parsed);
    });

});