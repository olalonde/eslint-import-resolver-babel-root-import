const path = require('path');
const fs = require('fs');
const JSON5 = require('json5');

const ROOT_PATH = path.resolve('/');

const PLUGIN_NAMES = [
    'babel-plugin-root-import',
    'babel-root-import',
    'root-import',
];

const existsBabelrc = (filepath) => (
    fs.existsSync(filepath)
);

const parseBabelrc = (filepath) => (
    JSON5.parse(fs.readFileSync(filepath, 'utf-8'))
);

const existsPackage = (filepath) => (
    // eslint-disable-next-line global-require
    fs.existsSync(filepath) && !!(require(filepath).babel)
);

const parsePackage = (filepath) => (
    // eslint-disable-next-line global-require
    require(filepath).babel
);

const extractOptions = babelConfig => {
    let plugin;

    if (babelConfig && babelConfig.plugins) {
        plugin = babelConfig.plugins.find(([pluginName]) => (
            PLUGIN_NAMES.includes(pluginName)
        ));
    }

    return (plugin ? plugin[1] : []);
};

const mergeOptions = (...options) => (
    options.reduce((result, item) => {
        if (Array.isArray(item)) {
            result.push(...item);
        } else {
            result.push(item);
        }

        return result;
    }, [])
);

const getOptions = (lintConfig, cwd) => {
    // If all trials fail until reaching the root, stop finding
    if (cwd === ROOT_PATH) {
        return null;
    }

    // If the lint config exists, just use it
    if (lintConfig) {
        const babelrcOptions = lintConfig.babelrc && (
            extractOptions(parseBabelrc(path.resolve(cwd, lintConfig.babelrc)))
        );

        if (babelrcOptions && lintConfig.options) {
            return mergeOptions(babelrcOptions, lintConfig.options);
        } else if (babelrcOptions) {
            return babelrcOptions;
        } else if (lintConfig.options) {
            return lintConfig.options;
        }
    }

    // Otherwise, find .babelrc file from the cwd
    const babelrcPath = path.join(cwd, '.babelrc');

    if (existsBabelrc(babelrcPath)) {
        return extractOptions(parseBabelrc(babelrcPath));
    }

    // Otherwise, check if package.json has babel section
    const packagePath = path.join(cwd, 'package.json');

    if (existsPackage(packagePath)) {
        return extractOptions(parsePackage(packagePath));
    }

    // If all trials fail, retry from the parent directory
    return getOptions(lintConfig, path.resolve(cwd, '..'));
};

exports.getOptions = getOptions;
