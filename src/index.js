const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');

const nodeResolve = require('eslint-import-resolver-node').resolve;

/* eslint-disable no-console */
const babelRootImport = require('babel-root-import/build/helper.js');

// newer version of babel root import exports the 2 functions
// but older versions exported a class
/* eslint-disable new-cap */
const babelRootImportObj = babelRootImport.default ?
    new babelRootImport.default() : babelRootImport;

let {
    hasRootPathPrefixInString,
    transformRelativeToRootPath
} = babelRootImportObj;

if (babelRootImport.default) {
    /* eslint-disable no-console */
    hasRootPathPrefixInString = hasRootPathPrefixInString.bind(babelRootImportObj);
    transformRelativeToRootPath = transformRelativeToRootPath.bind(babelRootImportObj);
}

// returns the root import config as an object
function getConfigFromBabel(start) {
    if (start === '/') return [];

    const babelrc = path.join(start, '.babelrc');
    if (fs.existsSync(babelrc)) {
        const babelrcJson = JSON5.parse(fs.readFileSync(babelrc, 'utf8'));
        if (babelrcJson && Array.isArray(babelrcJson.plugins)) {
            const pluginConfig = babelrcJson.plugins.find(p => (
                p[0] === 'babel-plugin-root-import'
            ));
            // The src path inside babelrc are from the root so we have
            // to change the working directory for the same directory
            // to make the mapping to work properly
            process.chdir(path.dirname(babelrc));
            return pluginConfig[1];
        }
    }
    return getConfigFromBabel(path.dirname(start));
}

exports.interfaceVersion = 2;

/**
 * Find the full path to 'source', given 'file' as a full reference path.
 *
 * resolveImport('./foo', '/Users/ben/bar.js') => '/Users/ben/foo.js'
 * @param  {string} source - the module to resolve; i.e './some-module'
 * @param  {string} file - the importing file's full path; i.e. '/usr/local/bin/file.js'
 * @param  {object} config - the resolver options
 * @return {object}
 */
exports.resolve = (source, file, config) => {
    const opts = getConfigFromBabel(process.cwd());

    let rootPathSuffix = '';
    let rootPathPrefix = '';

    if (opts.rootPathSuffix && typeof opts.rootPathSuffix === 'string') {
        rootPathSuffix = `/${opts.rootPathSuffix.replace(/^(\/)|(\/)$/g, '')}`;
    }

    if (opts.rootPathPrefix && typeof opts.rootPathPrefix === 'string') {
        rootPathPrefix = opts.rootPathPrefix;
    } else {
        rootPathPrefix = '~';
    }

    let transformedSource = source;
    if (hasRootPathPrefixInString(source, rootPathPrefix)) {
        transformedSource = transformRelativeToRootPath(source, rootPathSuffix, rootPathPrefix);
    }

    return nodeResolve(transformedSource, file, config);
};
