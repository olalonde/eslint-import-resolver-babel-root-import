const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');

const nodeResolve = require('eslint-import-resolver-node').resolve;
const {
    hasRootPathPrefixInString,
    transformRelativeToRootPath
} = require('babel-plugin-root-import/build/helper.js');

// returns the root import config as an object
function getConfigFromBabel(start, babelrc = '.babelrc') {
    if (start === '/') return [];

    const packageJSONPath = path.join(start, 'package.json');
    // eslint-disable-next-line global-require
    const packageJSON = require(packageJSONPath);
    const babelConfig = packageJSON.babel;
    if (babelConfig) {
        const pluginConfig = babelConfig.plugins.find(p => (
            p[0] === 'babel-plugin-root-import'
        ));
        process.chdir(path.dirname(packageJSONPath));
        return pluginConfig[1];
    }

    const babelrcPath = path.join(start, babelrc);
    if (fs.existsSync(babelrcPath)) {
        const babelrcJson = JSON5.parse(fs.readFileSync(babelrcPath, 'utf8'));
        if (babelrcJson && Array.isArray(babelrcJson.plugins)) {
            const pluginConfig = babelrcJson.plugins.find(p => (
                p[0] === 'babel-plugin-root-import'
            ));
            // The src path inside babelrc are from the root so we have
            // to change the working directory for the same directory
            // to make the mapping to work properly
            process.chdir(path.dirname(babelrcPath));
            return pluginConfig[1];
        }
    }
    return getConfigFromBabel(path.dirname(start));
}

function isString(value) {
    return typeof value === 'string';
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
    const rootPathConfig = opts.map((item = {}) => ({
        rootPathPrefix: isString(item.rootPathPrefix) ? item.rootPathPrefix : '~',
        rootPathSuffix: isString(item.rootPathSuffix) ? item.rootPathSuffix.replace(/^(\/)|(\/)$/g, '') : ''
    }));

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

    // Since babel-plugin-root-import 5.0.0 relative path is now actually relative to the root.
    // Node resolver expects that path would be relative to file, so we have to resolve it first
    transformedSource = path.resolve(transformedSource);

    return nodeResolve(transformedSource, file, config);
};

