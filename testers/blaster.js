#! /usr/bin/env node
'use strict';

const BufferedWritable = require('../lib/bufferedWritable');
const crypto = require('crypto');
const Deque = require('double-ended-queue');
const P = require('bluebird');

const stdout = process.stdout;
const bufferedStdout = new BufferedWritable(stdout);

const numLines = parseInt(process.argv[2], 10) || 1;

function linesToMerge() {
  // We want buffers with random sizes around 64K bytes.
  // All but the first line is 101 bytes, which is 648.8 lines
  // We'll return a random number in the range of 640..660
  return 640 + Math.trunc(Math.random()*20);
}

const hash = crypto.createHash('sha256');

function makeBuffer(lines) {
  const buffer = lines.toArray().join('');
  lines.clear();
  hash.update(buffer);
  return buffer;
}

const buffers = new Deque();
const lines = new Deque();

lines.enqueue(`${numLines}\n`);
let toMerge = linesToMerge()-1;

for (let i=0; i<numLines; ++i) {
  const line = crypto.randomBytes(50).toString('hex') + '\n';
  lines.enqueue(line);
  --toMerge;
  if (toMerge === 0) {
    buffers.enqueue(makeBuffer(lines));
    toMerge = linesToMerge();
  }
}

if (!lines.isEmpty()) {
  buffers.enqueue(makeBuffer(lines));
}

const checksum = hash.digest('hex');

const failed = new P((_, reject) => {
  stdout.once('error', err => reject(new Error('blaster error on stdout:' + err.message)));
});

const writeAll = P.resolve()
  .then(() => {
    while (!buffers.isEmpty()) {
      const buffer = buffers.dequeue();
      bufferedStdout.write(buffer);
    }
  })
  .then(() => bufferedStdout.write(checksum));

P.any([writeAll, failed])
.catch(err => console.error('\n\nblaster failed with error:' + err.toString() + err.stack));
