#! /usr/bin/env node
'use strict';

const _ = require('lodash');
const crypto = require('crypto');
const P = require('bluebird');

const stdout = process.stdout;

const numLines = parseInt(process.argv[2], 10) || 1;
const lines = _.map(_.range(numLines+1), i => {
  if (i === 0) {
    return `${numLines}\n`;
  } else {
    return crypto.randomBytes(50).toString('hex') + '\n';
  }
});

const bigBuf = lines.join('');
const hash = crypto.createHash('sha256');
hash.update(bigBuf);
const checksum = hash.digest('hex');

const failed = new P((_, reject) => {
  stdout.once('error', err => reject(new Error('blaster error on stdout:' + err.message)));
});

const write = P.promisify(stdout.write, {context: stdout});

const writeAll = P.resolve()
  .then(() => write(bigBuf))
  .then(() => write(checksum));

P.any([writeAll, failed])
.catch(err => console.error('\n\nblaster failed with error:' + err.toString() + err.stack));
