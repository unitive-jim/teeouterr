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
  ];
  lines.forEach(line => console.error(line));
  console.error({nodepath, scriptpath, outpath, executable});
  process.exit(1);
}

if (!outpath || !executable) {
  usage();
}

const fileStream = fs.createWriteStream(outpath);
const bufferedFileStream = new BufferedWritable(fileStream);

const fileWriteFailed = new P((_, reject) => {
  fileStream.once('error', err => reject(new Error('mergeouterr error on fileStream:' + err.message)));
});

// Called for every chunk of data output by the child process to either stdout or stderr
function output(data) {
  bufferedFileStream.write(data);
}

let exitCode = null;
const runnerCompleted = runner.run({executable, args, stdOutput: output, errOutput: output})
.then(status => {
  exitCode = status.exitCode;
});

P.any([runnerCompleted, fileWriteFailed])
.then(() => bufferedFileStream.finish())
.catch(err => console.error('\nmergeouterr failed with err:' + err.toString() + err.stack))
.finally(() => {
  if (exitCode == null) {
    console.error('Failed to set exitCode!');
    exitCode = 1;
  }
  process.exit(exitCode);
});
