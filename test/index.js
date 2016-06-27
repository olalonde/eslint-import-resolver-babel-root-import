const test = require('tape');
const path = require('path');
const { resolve } = require('../src');

test((t) => {
    const result = resolve('@/file', __filename, {});
    t.deepEqual(result, {
        found: true,
        path: path.resolve(__dirname, 'somepath/file.js'),
    });
    t.end();
});
