// import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import replace from 'rollup-plugin-re';

//remove logging
const replacePlugin = replace({
    exclude: 'node_modules/**',
    // ... do replace before commonjs
    patterns: [
        {
            // regexp match with resolved path
            // match: /tscOut/,
            // string or regexp
            test: /(.*log4javascript.*)|(\s*(\/\/\s*)?log\.(trace|debug|info|warn|error|fatal|time|timeEnd|group|groupEnd).+)/g,
            // string or function to replaced with
            replace: '',
        }
    ]
});

const resolvePlugin = resolve();

function moduleConfig(file) {
    const isCore = file.startsWith('core/');
    const esFileExt = isCore? 'esm.js' : 'js';
    const plugins = isCore? [resolvePlugin] : [];
    return {
        input: [`./tscOut/${file}.js`],
        external: (id, parentId, isResolved) => {
            //console.log(id, parentId, isResolved);
            return !isCore;
        },
        output: [
            { file: `./lib/${file}.cjs.js`, format: 'cjs' },
            { file: `./lib/${file}.${esFileExt}`, format: 'es' },
        ],
        plugins: [
            replacePlugin,
            ...plugins,
        ]
    }
}

const moduleConfigs = [
    'core/index',
    'modules/rangy-classapplier',
    'modules/rangy-highlighter',
    'modules/rangy-selectionsaverestore',
    'modules/rangy-serializer',
    'modules/rangy-util',
].map(moduleConfig);

// see https://github.com/rollup/rollup-starter-lib/blob/master/rollup.config.js
export default [
    {
        input: ["./tscOut/core/index.js"],
        output: {
            format: 'umd',
            name: 'rangy',
            file: pkg.browser,
            // dir: './lib'
        },
        plugins: [
            // typescript(),
            replacePlugin,
            resolvePlugin,
            commonjs()
        ],
    },
    ...moduleConfigs
];
