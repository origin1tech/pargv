import * as chai from 'chai';
import * as mocha from 'mocha';

const expect = chai.expect;
const should = chai.should;
const assert = chai.assert;

import { Pargv } from './';
const pargv = new Pargv({ logLevel: 'disabled' });

const procArgs = process.argv.slice(0, 2);

describe('Pargv', () => {

  before((done) => {
    done();
  });

  it('should do something.', () => {

    const args = procArgs.concat(['']);

    const parsed = pargv.$.option('-test <test>').parse(args);

    console.log(parsed);

  });

});