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

const signals = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGILL: 4,
  SIGTRAP: 5,
  SIGABRT: 6,
  SIGEMT: 7,
  SIGFPE: 8,
  SIGKILL: 9,
  SIGBUS: 10,
  SIGSEGV: 11,
  SIGSYS: 12,
  SIGPIPE: 13,
  SIGALRM: 14,
  SIGTERM: 15,
  SIGURG: 16,
  SIGSTOP: 17,
  SIGTSTP: 18,
  SIGCONT: 19,
  SIGCHLD: 20,
  SIGTTIN: 21,
  SIGTTOU: 22,
  SIGIO: 23,
  SIGXCPU: 24,
  SIGXFSZ: 25,
  SIGVTALRM: 26,
  SIGPROF: 27,
  SIGWINCH: 28,
  SIGINFO: 29,
  SIGUSR1: 30,
  SIGUSR2: 31,
}

child.on('exit', (code, signal) => {
  if (typeof code === 'number') {
    process.exitCode = code;
  } else if (typeof signal === 'string') {
    if (signal in signals) {
      process.exitCode = 128 + signals[signal];
    } else {
      process.stdout.write(`Child process terminated with unrecognized signal: ${signal}\n`);
      process.exitCode = 128 + 32;
    }
  }
});

child.stdin.on('close', () => {
  process.stdin.end();
});

child.stdout.on('data', (data) => {
  fileStream.write(data);
});

child.stderr.on('data', (data) => {
  fileStream.write(data);
  process.stdout.write(data);
});

process.stdin.on('end', () => {
  child.stdin.end();
});

process.stdin.on('readable', () => {
  let chunk;
  while (chunk = process.stdin.read()) {
    const len = chunk ? chunk.length : 0;
    if (len>0) {
      child.stdin.write(chunk);
    }
  }
});

child.on('close', (code) => {
  fileStream.close();
});
