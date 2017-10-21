const nodeResolve = require('eslint-import-resolver-node').resolve;

const { getOptions } = require('./options');

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

exports.interfaceVersion = 2;

/**
 * Find the full path to 'source', given 'file' as a full reference path.
 *
 * resolveImport('./foo', '/Users/ben/bar.js') => '/Users/ben/foo.js'
 * @param  {string} source - the module to resolve; i.e './some-module'
 * @param  {string} file - the importing file's full path; i.e. '/usr/local/bin/file.js'
 * @param  {object} config - the resolver options
 * @param  {string} [config.babelrc] - the path of the babelrc file
 * @param  {(object|array)} [config.options] - the options passed to the plugin
 * @return {object}
 */
exports.resolve = (source, file, config) => {
    const opts = getOptions(config, process.cwd());

    // [{rootPathPrefix: rootPathSuffix}]
    const rootPathConfig = [];

    if (Array.isArray(opts)) {
        opts.forEach((option) => {
            let prefix = '';
            if (option.rootPathPrefix && typeof option.rootPathPrefix === 'string') {
                prefix = option.rootPathPrefix;
            }

            let suffix = '';
            if (option.rootPathSuffix && typeof option.rootPathSuffix === 'string') {
                suffix = `/${option.rootPathSuffix.replace(/^(\/)|(\/)$/g, '')}`;
            }

            rootPathConfig.push({
                rootPathPrefix: prefix,
                rootPathSuffix: suffix
            });
        });
    } else {
        let rootPathPrefix = '~';
        if (opts.rootPathPrefix && typeof opts.rootPathPrefix === 'string') {
            rootPathPrefix = opts.rootPathPrefix;
        }

        let rootPathSuffix = '';
        if (opts.rootPathSuffix && typeof opts.rootPathSuffix === 'string') {
            rootPathSuffix = `/${opts.rootPathSuffix.replace(/^(\/)|(\/)$/g, '')}`;
        }

        rootPathConfig.push({
            rootPathPrefix,
            rootPathSuffix
        });
    }

    let transformedSource = source;
    for (let i = 0; i < rootPathConfig.length; i += 1) {
        const option = rootPathConfig[i];
        const prefix = option.rootPathPrefix;
        const suffix = option.rootPathSuffix;
        if (hasRootPathPrefixInString(source, option.rootPathPrefix)) {
            transformedSource = transformRelativeToRootPath(source, suffix, prefix);
            break;
        }
    }

    return nodeResolve(transformedSource, file, config);
};

