#! /usr/bin/env node
'use strict';

const BufferedWritable = require('./bufferedWritable');
const fs = require('fs');
const P = require('bluebird');
const runner = require('./runner');

const { stdout, stderr } = process;

const [nodepath, scriptpath, outpath, executable, ...args] = process.argv;

function usage() {
  const lines = [
  'Usage:',
  '  teeouterr <outpath> <executable> [...args]',
  '',
  '  teeouterr executes the program <executable> with given command line args.',
  '  It merges the the executable\'s stdout and stderr to one stream,',
  '  and then sends that stream to both the file at <outpath> and to stdout.',
  '  If teeouterr itself has errors, they are written to stderr.'
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
const bufferedStdout = new BufferedWritable(stdout);

const fileWriteFailed = new P((_, reject) => {
  fileStream.once('error', err => reject(new Error('teeouterr error on fileStream:' + err.message)));
});

const stdoutFailed = new P((_, reject) => {
  stdout.once('error', err => reject(new Error('teeouterr error on process.stdout:' + err.message)));
});

const stderrFailed = new P((_, reject) => {
  stderr.once('error', err => reject(new Error('teeouterr error on process.stderr:' + err.message)));
});

const eitherStreamFailed = P.any([fileWriteFailed, stdoutFailed, stderrFailed]);

// Called for every chunk of data output by the child process to either stdout or stderr
function output(data) {
  bufferedFileStream.write(data);
  bufferedStdout.write(data);
}

const runnerCompleted = runner.run({executable, args, stdOutput: output, errOutput: output});

P.any([runnerCompleted, eitherStreamFailed])
.then(() => P.all([bufferedFileStream.finish(), bufferedStdout.finish()]))
.catch(err => {
  console.error('\nteeouterr failed with err:' + err.toString() + err.stack);
});
