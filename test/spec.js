const chai = require('chai');
const runner = require('../runner');

const expect = chai.expect;

describe('runner', function() {

  it('nominal test using ./testers/nominal.js', function () {
    let chunks = [];
    function output(data) {
      chunks.push(data.toString());
    }
    const executable = './testers/nominal.js';
    const args = [];
    return runner.run({executable, args, output})
    .then(() => {
      const lines = chunks.sort().join('').split('\n');
      const expected = [
        '1. stdout',
        '2. stdout',
        '3. stdout',
        '4. stderr',
        '5. stdout',
        '6. stdout end',
        ''
      ];
      expect(lines).to.deep.equal(expected);
    });
  });

});
