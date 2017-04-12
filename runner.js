// teeouterr/runner.js

const signals = require('./signals');
const spawn = require('child_process').spawn;
const P = require('bluebird');

const UNRECOGNIZED_SIGNAL = 128 + 32;

// Convert a [code, signal] pair from an child `exit` or `close` event into numeric exit code.
// Uses the bash convention to convert signals into exit codes in the range 129..160.
function asExitCode(code, signal) {
  if (typeof code === 'number') {
    return code;
  } else if (typeof signal === 'string') {
    if (signal in signals) {
      return 128 + signals[signal];
    } else {
      return UNRECOGNIZED_SIGNAL;
    }
  }
}

// Spawn `executable` as a child process with arguments `args`, calling the function `output` for every
// buffer of data output by the child to either stdout or stderr.
// When the child process is fully terminated, execute the callback function `done(err, results)` or return
// a promise if `done` is not provided.
// The `results` returned is an array of the results returned by the child's `exit` and `close` events
// both of which are `[code, signal]` (see e.g. https://nodejs.org/api/child_process.html#child_process_event_exit).
function run({executable, args, output}, done) {

  // Create the child process
  const child = spawn(executable, args);

  // Create a promise that will be resolved when the child process has exited.
  const exited = new P(resolve => {
    child.on('exit', (code, signal) => {
      const exitCode = asExitCode(code, signal);
      process.exitCode = exitCode;
      resolve(exitCode);
    });
  });

  // Create a promise that will be resolved when the child process stdio streams have all closed.
  const closed = new P(resolve => child.on('close', (code, signal) => resolve(asExitCode(code, signal))));

  // When the child closes its stdin stream, close the parent process stdin
  child.stdin.on('close', () => process.stdin.end());

  // When any data is output by the child, call the `output` function with the data.
  child.stdout.on('data', output);
  child.stderr.on('data', output);

  // When the parent process stdin sees end of stream, tell the child that it will not receive any more input
  process.stdin.on('end', () => child.stdin.end());

  // When the parent process receives any data, forward it to the child process
  process.stdin.on('readable', () => {
    let chunk;
    while (chunk = process.stdin.read()) {
      const len = chunk ? chunk.length : 0;
      if (len>0) { // do not forward empty chunks of data
        child.stdin.write(chunk);
      }
    }
  });

  // Wait for both process exit and stdio streams closed, order of which is not guaranteed.
  // When both have happened, call the supplied `done` callback.
  return P.all([exited, closed])
  .then(results => {
    const [exitCode, closeCode] = results;
    if (exitCode !== closeCode) {
      process.stderr.write(`Inconsistent results from child exit and close events: exit:${exitCode}, close:${closeCode}\n`);
    }
    if (exitCode === UNRECOGNIZED_SIGNAL) {
      process.stderr.write(`Child process terminated with unrecognized signal\n`);
    }
    return exitCode;
  })
  .asCallback(done);
}

module.exports = { run };