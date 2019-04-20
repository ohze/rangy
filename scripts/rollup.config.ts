import sourceMaps from 'rollup-plugin-sourcemaps'
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import * as pkg from '../package.json';
import replace from 'rollup-plugin-re';
import {RollupOptions} from "rollup";
import {modules, projectRoot} from "./util";
import {resolve} from "path";
import { uglify } from 'rollup-plugin-uglify'
import { terser } from 'rollup-plugin-terser'

const buildVars = (function() {
    const date = new Date();
    const month = "January,February,March,April,May,June,July,August,September,October,November,December"
        .split(",")[date.getMonth()];
    return {
        "%%build:version%%": pkg.version,
        "%%build:date%%": date.getDate() + " " + month + " " + date.getFullYear(),
        "%%build:year%%,": date.getFullYear() + ','
    };
})();

const plugins = [
    replace({
        exclude: 'node_modules/**',
        replaces: buildVars,
        patterns: [ //remove logging
            {
                test: /(.*log4javascript.*)|(\s*(\/\/\s*)?log\.(trace|debug|info|warn|error|fatal|time|timeEnd|group|groupEnd).+)/g,
                replace: '',
            }
        ]
    }),
    nodeResolve(),
    commonjs(),
    // Resolve source maps to the original source
    sourceMaps(),
];

function concatIf<T>(test: boolean, a: T[], b:()=>T[]) {
    return test? a.concat(b()) : a;
}

function outputFile(f: string, isProd: boolean) {
    return isProd ? f.replace(/\.js$/, '.min.js') : f;
}

function configsFor(module: string, isProd: boolean): RollupOptions[] {
    // const tsconfig = await import(`${srcDir}/${name}/tsconfig.json`);
    // const outDir = tsconfig.compilerOptions.outDir;
    const d = resolve(projectRoot, 'dist', module);
    const isRangyModule = module !== 'core';
    // Indicate here external modules you don't wanna include in your bundle
    const external = isRangyModule? ['rangy2'] : [];
    return [
        {   input: [`${d}/esm5/index.js`],
            output: {
                file: outputFile(`${d}/bundles/index.umd.js`, isProd),
                format: 'umd',
                name: 'rangy',
                sourcemap: true,
                extend: isRangyModule,
                globals: { rangy2: "rangy" }
            },
            inlineDynamicImports: true,
            external,
            plugins: concatIf(isProd, plugins, uglify),
        },
        {   input: [`${d}/esm2015/index.js`],
            output: {
                file: outputFile(`${d}/bundles/index.esm.js`, isProd),
                format: 'es',
                sourcemap: true,
            },
            inlineDynamicImports: true,
            // only bundle tslib, core-js in umd file
            external: (id) => [...external, 'tslib', 'core-js'].includes(id) || id.startsWith('core-js/'),
            plugins: concatIf(isProd, plugins, terser),
        }
    ]
}

const configs = modules.flatMap(m => [
    ...configsFor(m, false),
    ...configsFor(m, true)
]);

export default configs;
