#! /usr/bin/env node
'use strict';

const fs = require('fs');
const spawn = require('child_process').spawn;

const [nodepath, scriptpath, outpath, executable, ...args] = process.argv;

function usage() {
  const lines = [
  'Usage:',
  '  node teeouterr.js <outpath> <executable> [...args]',
  '',
  '  teeouterr.js executes the program <executable> with given command line args,',
  '  writing the executable\'s stdout and stderr to a file at <outpath>,',
  '  while also writing the executable\'s stderr to teeouterr\'s stdout.',
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

const child = spawn(executable, args);

child.stdout.on('data', (data) => {
  fileStream.write(data);
});

child.stderr.on('data', (data) => {
  fileStream.write(data);
  process.stdout.write(data);
});

child.on('close', (code) => {
  fileStream.close();
});
