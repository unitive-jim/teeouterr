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
// a promise for results if `done` is not provided.
// The `results` returned is an object with this shape:
// {
//   exitCode: number, // the code from the child's `exit` event
//   closeCode: number, // the code from the child's `close` event (should be same as exitCode)
// }
function run({executable, args, stdOutput, errOutput, stdin = null, options}, done) {

  if (typeof stdOutput !== 'function') {
    return P.reject(new Error('A stdOutput function must be provided'));
  }
  if (typeof errOutput !== 'function') {
    return P.reject(new Error('An errOutput function must be provided'));
  }

  const eventOrder = [];

  // Create the child process
  const child = spawn(executable, args, options);

  // Catch ctrl-C and forward it to child. Let the parent process terminate using the normal error handling path
  process.on('SIGINT', () => child.kill('SIGINT'));

  // Create a promise that will be resolved when the child process has exited.
  // The promise will be rejected if error event is raised for the child process
  const childExited = new P((resolve, reject) => {
    child.once('exit', (code, signal) => {
      eventOrder.push('child process exit');
      resolve(asExitCode(code, signal));
    });
    child.once('error', err => reject(new Error('Error from child process:' + err.toString())));
  });

  // Create a promise that will be resolved when the child process has closed.
  // This is documented as occuring after the stdio streams of the child process have been closed,
  // so is in some way redundant with the above.
  // The promise will be rejected if an error event is raised on the child's streams
  const childClosed = new P((resolve) => {
    child.once('close', (code, signal) => {
      eventOrder.push('child process close');
      resolve(asExitCode(code, signal));
    });
  });

  // Create a promise that will be resolved when the child process stdout stream has closed.
  // The promise will be rejected if an error event is raised on the stdout stream
  const childStdoutClosed = new P((resolve, reject) => {
    child.stdout.once('close', () => {
      eventOrder.push('child stdout close');
      resolve();
    });
    child.stdout.once('error', err => reject(new Error('Error from child stdout:' + err.toString())));
  });

  // Create a promise that will be resolved when the child process stdout stream has closed.
  // The promise will be rejected if an error event is raised on the stdout stream
  const childStderrClosed = new P((resolve, reject) => {
    child.stderr.once('close', () => {
      eventOrder.push('child stderr close');
      resolve();
    });
    child.stderr.once('error', err => reject(new Error('Error from child stderr:' + err.toString())));
  });

  // When any data is output by the child, call the corresponding `output` function with the data.
  child.stdout.on('data', stdOutput);
  child.stderr.on('data', errOutput);

  // When the parent process receives any data, forward it to the child process
  function onProcessStdinReadable() {
    let chunk;
    while (chunk = stdin.read()) {
      const len = chunk ? chunk.length : 0;
      if (len>0) { // do not forward empty chunks of data
        child.stdin.write(chunk);
      }
    }
  }

  // When the parent process stdin sees end of stream, tell the child that it will not receive any more input
  function onProcessStdinEnd() {
    child.stdin.end();
  }

  if (stdin) {
    // If stdin is provided, forward events between the parent process stdin and child process stdin
    child.stdin.once('close', () => stdin.end());
    stdin.once('end', onProcessStdinEnd);
    stdin.once('readable', onProcessStdinReadable);
  }

  let exitCode;
  let closeCode;

  // Wait for both process exit and stdio streams closed, order of which is not guaranteed.
  // When both have happened, call the supplied `done` callback.
  return P.all([childExited, childClosed])
  .then(results => {
    [exitCode, closeCode] = results;
    if (stdin) {
      stdin.removeListener('readable', onProcessStdinReadable);
      stdin.removeListener('end', onProcessStdinEnd);
    }
  })
  .then(() => {
    return P.all([childStdoutClosed, childStderrClosed])
    .timeout(20)
    .catch(P.TimeoutError, err => {
      console.error('\nChild stdio closed events not received', err.toString());
    });
  })
  .then(() => {
    return {exitCode, closeCode, eventOrder};
  })
  .catch(err => {
    console.error('\n' + err.toString());
    throw err;
  })
  .asCallback(done);
}

module.exports = { run };
