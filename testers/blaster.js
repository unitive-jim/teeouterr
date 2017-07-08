#! /usr/bin/env node
'use strict';

const BufferedWritable = require('../lib/bufferedWritable');
const crypto = require('crypto');
const Deque = require('double-ended-queue');
const P = require('bluebird');

const stdout = process.stdout;
const bufferedStdout = new BufferedWritable(stdout);

const numLines = parseInt(process.argv[2], 10) || 1;
const delay = parseInt(process.argv[3], 10) || 0;

let remaining = numLines;
function linesToMerge() {
  const minLines = delay ? 2 : 50;
  const maxLines = delay ? 30 : 600;
  let toMerge = Math.trunc(Math.random()*(maxLines-minLines)) + minLines;
  if (toMerge > remaining) {
    toMerge = remaining;
  }
  remaining -= toMerge;
  return toMerge;
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

function defer(delay) {
  return new P(resolve => {
    if (delay == 0) {
      setImmediate(resolve);
    } else {
      setTimeout(resolve, delay);
    }
  });
}

function writeAllBuffers() {
  return P.resolve()
  .then(() => {
    if (buffers.isEmpty()) {
      return P.resolve();
    } else {
      bufferedStdout.write(buffers.dequeue());
      return defer(delay)
      .then(() => writeAllBuffers());
    }
  });
}

const writeAll = P.resolve()
  .then(() => writeAllBuffers())
  .then(() => bufferedStdout.write(checksum))
  .then(() => bufferedStdout.finish());

P.any([writeAll, failed])
.catch(err => console.error('\n\nblaster failed with error:' + err.toString() + err.stack));
