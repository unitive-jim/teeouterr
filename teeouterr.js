#! /usr/bin/env node
'use strict';

const fs = require('fs');
const spawn = require('child_process').spawn;

const [nodepath, scriptpath, outpath, executable, ...args] = process.argv;

// This script
const justMerge = /.*mergeouterr/.test(scriptpath);

function teeOutErrUsage() {
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
  console.error({nodepath, scriptpath, outpath, executable, justMerge});
}

function mergeOutErrUsage() {
  const lines = [
  'Usage:',
  '  mergeouterr <outpath> <executable> [...args]',
  '',
  '  mergeouterr executes the program <executable> with given command line args,',
  '  merging the executable\'s stdout and stderr to a file at <outpath>.',
  '  mergeouterr is functionally equivalent to using teeouterrr with stdout directed to /dev/null',
  '  but is more efficient.'
  ];
  lines.forEach(line => console.error(line));
  console.error({nodepath, scriptpath, outpath, executable, justMerge});
}

function usage() {
  justMerge ? mergeOutErrUsage() : teeOutErrUsage();
  console.error('\nNote: this program\'s behavior depends on which alias it is run with.');
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
      process.stderr.write(`Child process terminated with unrecognized signal: ${signal}\n`);
      process.exitCode = 128 + 32;
    }
  }
});

child.stdin.on('close', () => {
  process.stdin.end();
});

function teeout(data) {
  fileStream.write(data);
  process.stdout.write(data);
}

function justfileout(data) {
  fileStream.write(data);
}

const output = justMerge ? justfileout : teeout;

child.stdout.on('data', output);
child.stderr.on('data', output);

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
