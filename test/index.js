const test = require('tape');
const path = require('path');
const { resolve } = require('../src');

test((t) => {
    const result = resolve('@/file', __filename, {});
    t.deepEqual(result, {
        found: true,
        path: path.resolve(__dirname, 'somepath/file.js'),
    });

    const result2 = resolve('@/file', __filename, { options: { rootPathSuffix: 'test/somepath', rootPathPrefix: '@' } });
    t.deepEqual(result2, {
        found: true,
        path: path.resolve(__dirname, 'somepath/file.js'),
    });

    const result3 = resolve('@/file', __filename, { babelrc: '.babelrcArray' });
    t.deepEqual(result3, {
        found: true,
        path: path.resolve(__dirname, 'somepath/file.js'),
    });

    const result4 = resolve('_/file', __filename, { babelrc: '.babelrcArray' });
    t.deepEqual(result4, {
        found: true,
        path: path.resolve(__dirname, 'anotherpath/file.js'),
    });

    t.end();
});

