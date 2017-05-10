const chai = require('chai');
const crypto = require('crypto');
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

  function testWithBlaster(numLines) {
    it(`blaster ${numLines}`, function () {
      if (numLines >= 20000) {
        this.timeout(100 * numLines); // A rough heuristic that works on a MacBook with plenty of headroom
      }
      let chunks = [];
      function output(data) {
        chunks.push(data.toString());
      }
      const numLinesAsString = `${numLines}`;
      const executable = './testers/blaster.js';
      const args = [numLinesAsString];
      return runner.run({executable, args, output})
      .then(() => {
        const lines = chunks.join('').split('\n');
        expect(lines).to.have.lengthOf(numLines+2);
        expect(lines[0]).to.equal(numLinesAsString);

        const [expectedCheckSum] = lines.slice(-1);
        expect(expectedCheckSum).to.have.lengthOf(64);

        const bigBuf = lines.slice(0, -1).join('\n') + '\n';
        const hash = crypto.createHash('sha256');
        hash.update(bigBuf);
        const actualChecksum = hash.digest('hex');

        expect(actualChecksum).to.equal(expectedCheckSum);
      });
    });
  }

  describe('stress test', function() {
    testWithBlaster(2);
    testWithBlaster(20);
    testWithBlaster(20000);
    testWithBlaster(200000);
    // testWithBlaster(2000000);   // this passes, but is slow and probably overkill
  });
});
