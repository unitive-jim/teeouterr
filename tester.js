#! /usr/bin/env node
'use strict';

process.stdout.write('out: 1. only in log\n');
process.stdout.write('out: 2. only in log\n');
process.stdout.write('out: 3. only in log\n');
process.stderr.write('err: 4. both log and stdout\n');
process.stdout.write('out: 5. only in log\n');
process.stdout.write('out: 6. last only in log\n');

