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

const config = {
    input: ["./tscOut/index.js"],
};

// see https://github.com/rollup/rollup-starter-lib/blob/master/rollup.config.js
export default [
    {   ...config,
        output: {
            format: 'umd',
            name: 'rangy',
            file: pkg.browser,
            // dir: './lib'
        },
        plugins: [
            // typescript(),
            replacePlugin,
            resolve(),
            commonjs()
        ],
    },
    {   ...config,
        // external: ['core-js/features/object/assign'],
        output: [
            { file: pkg.main, format: 'cjs' },
            { file: pkg.module, format: 'es' }
        ],
        plugins: [
            replacePlugin,
        ]
    }
];
