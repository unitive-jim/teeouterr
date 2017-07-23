#! /usr/bin/env node
'use strict';

const BufferedWritable = require('../lib/bufferedWritable');
const fs = require('fs');
const P = require('bluebird');
const runner = require('../lib/runner');

const [nodepath, scriptpath, outpath, executable, ...args] = process.argv;

function usage() {
  const lines = [
  'Usage:',
  '  mergeouterr <outpath> <executable> [...args]',
  '',
  '  mergeouterr executes the program <executable> with given command line args,',
  '  merging the executable\'s stdout and stderr to a file at <outpath>.',
  '  If the env variable PROGRESS is defined, mergeout error will write a progress message every N seconds,',
  '  where N defaults to 60, but can be specified with the env variable PSECS'
  ];
  lines.forEach(line => console.error(line));
  console.error({nodepath, scriptpath, outpath, executable});
  process.exit(1);
}

if (!outpath || !executable) {
  usage();
}

const progress = process.env.PROGRESS;
let progressTimer = null;
let numBytesWritten = 0;

const fileStream = fs.createWriteStream(outpath);
const bufferedFileStream = new BufferedWritable(fileStream);

const fileWriteFailed = new P((_, reject) => {
  fileStream.once('error', err => reject(new Error('mergeouterr error on fileStream:' + err.message)));
});

// Called for every chunk of data output by the child process to either stdout or stderr
function output(data) {
  numBytesWritten += data.length;
  bufferedFileStream.write(data);
}

let exitCode = null;
const runnerCompleted = runner.run({executable, args, stdOutput: output, errOutput: output})
.then(status => {
  exitCode = status.exitCode;
});

if (progress) {
  let progressSecs = 60;
  if (process.env.PSECS) {
    progressSecs = parseFloat(process.env.PSECS) || 60;
  }
  let numBytesAtLastInterval = 0;
  function displayProgress() {
    const numBytesThisInterval = numBytesWritten - numBytesAtLastInterval;
    numBytesAtLastInterval = numBytesWritten;
    const stalled = numBytesThisInterval == 0 ? 'stalled' : '';
    process.stderr.write(`${progress} ${stalled}\n`);
  }
  progressTimer = setInterval(displayProgress, progressSecs*1000);
}

P.any([runnerCompleted, fileWriteFailed])
.then(() => progressTimer ? clearInterval(progressTimer) : null)
.then(() => bufferedFileStream.finish())
.catch(err => console.error('\nmergeouterr failed with err:' + err.toString() + err.stack))
.finally(() => {
  if (exitCode == null) {
    console.error('\nFailed to set exitCode!');
    exitCode = 1;
  } else if (exitCode != 0) {
    console.error(`\nChild ${executable} exited with error status: ${exitCode}`);
  }
  process.exit(exitCode);
});
