#! /usr/bin/env node
'use strict';

const [nodepath, scriptpath, code, delay] = process.argv;
const exitCode = parseInt(code==undefined ? '1' : code, 10);
const delayMillis = parseFloat(delay==undefined ? '0.0' : delay) * 1000;
console.log(`${nodepath} ${scriptpath} exiting with code: ${exitCode}`);
setTimeout(() => process.exit(exitCode), delayMillis);
