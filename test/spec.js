const _ = require('lodash');
const chai = require('chai');
const crypto = require('crypto');
const Deque = require('double-ended-queue');
const fs = require('fs');
const path = require('path');
const runner = require('../lib/runner');
const os = require('os');

const expect = chai.expect;

function tempFilePath() {
  const name = crypto.randomBytes(10).toString('hex');
  const tmpdir = os.tmpdir();
  return path.resolve(tmpdir, `${name}.tmp`);
}

function testExitCodeWith(parent, code) {
  let tempFile;
  let cmdline;
  if (parent) {
    tempFile = tempFilePath();
    cmdline = `${parent} ${tempFile} ./testers/exitwithcode.js ${code}`;
  } else {
    cmdline = `./testers/exitwithcode.js ${code}`;
  }

  it(cmdline, function () {
    const chunks = new Deque();
    function output(data) {
      chunks.enqueue(data.toString());
    }

    const [executable, ...args] = cmdline.split(' ');
    return runner.run({executable, args, stdOutput: output, errOutput: output})
    .then(status => {
      return expect(status).to.deep.equal({ exitCode: code, closeCode: code });
    });
  });
}

function testWithBlaster(parent, numLines, delay=0, options = {env: process.env}) {
  let tempFile;
  let cmdline;
  if (parent) {
    tempFile = tempFilePath();
    cmdline = `${parent} ${tempFile} ./testers/blaster.js ${numLines} ${delay}`;
  } else {
    cmdline = `./testers/blaster.js ${numLines} ${delay}`;
  }

  it(cmdline, function () {
    if (numLines >= 20000) {
      this.timeout(100 * numLines); // A rough heuristic that works on a MacBook with plenty of headroom
    }

    const chunks = new Deque(numLines + 2);
    function output(data) {
      chunks.enqueue(data.toString());
    }

    const [executable, ...args] = cmdline.split(' ');
    return runner.run({executable, args, stdOutput: output, errOutput: output, options})
    .then(status => {
      expect(status).to.deep.equal({ exitCode: 0, closeCode: 0 });
      const lines = chunks.toArray().join('').split('\n');
      if (/teeouterr/.test(parent)) {
        validateChecksum(lines, numLines);
      } else if (options.env.PROGRESS) {
        const progressLines = _.filter(lines, line => line.includes(options.env.PROGRESS));
        expect(progressLines).to.exist;
        expect(progressLines).to.have.length.above(2);
      }
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
      const chunks = new Deque();
      function output(data) {
        chunks.enqueue(data.toString());
      }
      const executable = './testers/nominal.js';
      const args = [];
      return runner.run({executable, args, stdOutput: output, errOutput: output})
      .then(() => {
        const lines = chunks.toArray().sort().join('').split('\n');
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

    const parent = null;

    describe('preserves error code', () => {
      const parent = null;
      testExitCodeWith(parent, 0);
      testExitCodeWith(parent, 1);
      testExitCodeWith(parent, 2);
      testExitCodeWith(parent, 31);
    });

    describe('stress test', function() {
      testWithBlaster(parent, 2);
      testWithBlaster(parent, 20);
      testWithBlaster(parent, 20000);
      testWithBlaster(parent, 200000);
    });
  });

  describe('teeouterr', function() {
    const parent = './bin/teeouterr.js';

    describe('preserves error code', () => {
      testExitCodeWith(parent, 0);
      testExitCodeWith(parent, 1);
      testExitCodeWith(parent, 2);
      testExitCodeWith(parent, 31);
    });

    describe('stress test', function() {
      testWithBlaster(parent, 2);
      testWithBlaster(parent, 20);
      testWithBlaster(parent, 20000);
      testWithBlaster(parent, 200000);
    });
  });

  describe('mergeouterr', function() {
    const parent = './bin/mergeouterr.js';

    describe('preserves error code', () => {
      testExitCodeWith(parent, 0);
      testExitCodeWith(parent, 1);
      testExitCodeWith(parent, 2);
      testExitCodeWith(parent, 31);
    });

    describe('stress test', function() {
      testWithBlaster(parent, 2);
      testWithBlaster(parent, 20);
      testWithBlaster(parent, 20000);
      testWithBlaster(parent, 200000);
    });

    describe('with delay and progress', function() {
      const parent = './bin/mergeouterr.js';
      const options = {
        env: _.assign({}, process.env, {PSECS: 0.2, PROGRESS: 'Running...'})
      };
      testWithBlaster(parent, 2000, 5, options);
    });

  });

});
