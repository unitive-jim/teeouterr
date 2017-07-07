#! /usr/bin/env node
'use strict';

const [nodepath, scriptpath, code] = process.argv;
const exitCode = parseInt(code==undefined ? '1' : code, 10);
console.log(`${nodepath} ${scriptpath} exiting with code: ${exitCode}`);
process.exit(exitCode);
