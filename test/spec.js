const chai = require('chai');
const crypto = require('crypto');
const fs = require('fs');
const runner = require('../runner');

const expect = chai.expect;

function tempFilePath() {
  const name = crypto.randomBytes(10).toString('hex');
  return `/tmp/${name}.tmp`;
}

function testWithBlaster(parent, numLines) {
  let tempFile;
  let cmdline;
  if (parent) {
    tempFile = tempFilePath();
    cmdline = `${parent} ${tempFile} ./testers/blaster.js ${numLines}`;
  } else {
    cmdline = `./testers/blaster.js ${numLines}`;
  }

  it(cmdline, function () {
    if (numLines >= 20000) {
      this.timeout(100 * numLines); // A rough heuristic that works on a MacBook with plenty of headroom
    }
    let chunks = [];
    function output(data) {
      chunks.push(data.toString());
    }

    const [executable, ...args] = cmdline.split(' ');
    return runner.run({executable, args, output})
    .then(() => {
      const lines = chunks.join('').split('\n');
      validateChecksum(lines, numLines);
    })
    .then(() => {
      if (tempFile) {
        // The temp file should also have contents that pass validateChecksum()
        const lines = fs.readFileSync(tempFile, {encoding: 'utf8'}).split('\n');
        expect(lines).to.have.length.above(2);
        validateChecksum(lines, numLines);
        fs.unlinkSync(tempFile);
      }
    });
  });
}

function validateChecksum(lines, numLines) {
  if (lines.length <= 1) {
    return;
  }
  expect(lines).to.have.lengthOf(numLines+2);
  expect(lines[0]).to.equal(`${numLines}`);

  const [expectedCheckSum] = lines.slice(-1);
  expect(expectedCheckSum).to.have.lengthOf(64);

  const bigBuf = lines.slice(0, -1).join('\n') + '\n';
  const hash = crypto.createHash('sha256');
  hash.update(bigBuf);
  const actualChecksum = hash.digest('hex');

  expect(actualChecksum).to.equal(expectedCheckSum);
};

describe('teeouterr', function() {

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

    describe('stress test', function() {
      const parent = null;
      testWithBlaster(parent, 2);
      testWithBlaster(parent, 20);
      testWithBlaster(parent, 20000);
      testWithBlaster(parent, 200000);
    });
  });

  describe('teeouterr', function() {

    describe('stress test', function() {
      const parent = './teeouterr.js';
      testWithBlaster(parent, 2);
      testWithBlaster(parent, 20);
      testWithBlaster(parent, 20000);
      testWithBlaster(parent, 200000);
    });

  });

  describe('mergeouterr', function() {

    describe('stress test', function() {
      const parent = './mergeouterr.js';
      testWithBlaster(parent, 2);
      testWithBlaster(parent, 20);
      testWithBlaster(parent, 20000);
      testWithBlaster(parent, 200000);
    });

  });

});
