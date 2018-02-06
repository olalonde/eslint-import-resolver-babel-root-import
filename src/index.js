const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');
const nodeResolve = require('eslint-import-resolver-node').resolve;
const {
    hasRootPathPrefixInString,
    transformRelativeToRootPath
} = require('babel-plugin-root-import/build/helper.js');

function isString(value) {
    return typeof value === 'string';
}

// returns the root import config as an object. Or an array
function getConfigFromBabel(directory, babelrcName = '.babelrc') {
    const babelrcPath = babelrcName && path.join(directory, babelrcName);
    let babelConfig = babelrcPath && fs.existsSync(babelrcPath)
        ? JSON5.parse(fs.readFileSync(babelrcPath, 'utf8'))
        : null;

    // look for "babel" hash within package.json if didn't find .babelrc file
    const packageJSONPath = path.join(directory, 'package.json');
    if (!babelConfig && fs.existsSync(packageJSONPath)) {
        const packageJSON = JSON.parse(fs.readFileSync(packageJSONPath, 'utf8'));
        babelConfig = packageJSON.babel || babelConfig;
    }

    if (babelConfig !== null && typeof babelConfig === 'object') {
        const plugins = Array.isArray(babelConfig.plugins) ? babelConfig.plugins : [];
        const babelPluginEntry = plugins.find(entry => {
            const pluginName = isString(entry) ? entry : entry[0];
            return pluginName === 'babel-plugin-root-import' || pluginName === 'root-import';
        });

        if (!babelPluginEntry) {
            return null;
        }

        // The src path inside babelrc are from the root so we have
        // to change the working directory for the same directory
        // to make the mapping to work properly
        // Note: maybe it would be better to resolve suffixes here, relative to directory
        process.chdir(directory);

        return isString(babelPluginEntry) ? [] : babelPluginEntry[1] || [];
    }

    /* istanbul ignore next: can't control presence of config file at root directory */
    if (directory === '/' || directory.substr(1) === ':\\') return [];
    return getConfigFromBabel(path.dirname(directory));
}

exports.interfaceVersion = 2;

/**
 * Find the full path to 'source', given 'file' as a full reference path.
 *
 * resolveImport('./foo', '/Users/ben/bar.js') => '/Users/ben/foo.js'
 * @param  {string} source - the module to resolve; i.e './some-module'
 * @param  {string} file - the importing file's full path; i.e. '/usr/local/bin/file.js'
 * @param  {object} config - the resolver options
 * @param  {string} babelrc - the name of the babelrc file
 * @return {object}
 */
exports.resolve = (source, file, config, babelrc) => {
    const optionsRaw = getConfigFromBabel(process.cwd(), babelrc);
    const opts = [].concat(optionsRaw || []);

    if (optionsRaw === null) {
        return nodeResolve(source, file, config);
    }

    // This empty object becomes default '~/` prefix mapped to root during the next step
    if (opts.length === 0) opts.push({});

    const rootPathConfig = opts.map((item = {}) => ({
        rootPathPrefix: isString(item.rootPathPrefix) ? item.rootPathPrefix : '~',
        rootPathSuffix: isString(item.rootPathSuffix) ? item.rootPathSuffix.replace(/^(\/)|(\/)$/g, '') : ''
    }));

    let transformedSource = source;
    for (let i = 0; i < rootPathConfig.length; i += 1) {
        const option = rootPathConfig[i];
        const prefix = option.rootPathPrefix;
        const suffix = option.rootPathSuffix;

        if (hasRootPathPrefixInString(source, prefix)) {
            transformedSource = transformRelativeToRootPath(source, suffix, prefix);
            break;
        }
    }

    // Since babel-plugin-root-import 5.0.0 relative path is now actually relative to the root.
    // Node resolver expects that path would be relative to file, so we have to resolve it first
    transformedSource = path.resolve(transformedSource);

    return nodeResolve(transformedSource, file, config);
};

