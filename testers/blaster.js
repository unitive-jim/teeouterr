#! /usr/bin/env node
'use strict';

const _ = require('lodash');
const crypto = require('crypto');
const P = require('bluebird');


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

const stdout = process.stdout;
const write = P.promisify(stdout.write, {context: stdout});
P.resolve()
.then(() => write(bigBuf))
.then(() => write(checksum));
