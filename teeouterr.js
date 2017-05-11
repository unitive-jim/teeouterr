#! /usr/bin/env node
'use strict';

const fs = require('fs');
const P = require('bluebird');
const runner = require('./runner');

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

const fileWrite = P.promisify(fileStream.write, {context: fileStream});
const fileEnd = P.promisify(fileStream.end, {context: fileStream});
const stdoutWrite = P.promisify(process.stdout.write, {context: process.stdout});

let pendingWrites = P.resolve();

// Called for every chunk of data output by the child process to either stdout or stderr
function output(data) {
  pendingWrites = pendingWrites.then(() => P.all([fileWrite(data), stdoutWrite(data)]));
}

runner.run({executable, args, output})
.then(() => pendingWrites)
.then(() => fileEnd());
