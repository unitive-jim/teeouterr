#! /usr/bin/env node
'use strict';

const fs = require('fs');
const runner = require('./runner');

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

// Called for every chunk of data output by the child process to either stdout or stderr
function output(data) {
  fileStream.write(data);
}

runner.run({executable, args, output})
.then(() => fileStream.close());
