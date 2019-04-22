/**
 * This rollup config is used to generate test/*.test.iife.js from test/*.test.ts files
 * The iife file is then used to verify that rangy2 & rangy modules (ie, rangy-classapplier)
 * can be used by referencing directly in `script` tag in html files
 */
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import * as glob from 'glob';
import {packages, packagesDir} from "./util";
import {resolve, join} from "path";
import {ModuleFormat, RollupOptions} from "rollup";
import fs from "fs";
import sourceMaps from 'rollup-plugin-sourcemaps'

const plugins = [
    nodeResolve(),
    commonjs(),
    sourceMaps(),
];

//all rangy modules are external dependencies to test code
const external = packages.map(n => '@rangy/' + n);

//map all external dependencies to global name 'rangy'
const globals = {};
external.forEach(n => Object.assign(globals, {[n]: 'rangy'}));

function configsFor(module: string) {
    const cwd = resolve(packagesDir, module, 'test');
    const tsconfig = resolve(cwd, 'tsconfig.json');

    if (!fs.existsSync(tsconfig)) return [];

    function config(f: string, format: ModuleFormat = 'iife'): RollupOptions {
        f = join(cwd, f);
        return {
            input: [f],
            output: {
                format,
                file: f.replace(/\.js$/, `.${format}.js`),
                name: 'unnamed',
                globals,
                sourcemap: true
            },
            external,
            plugins,
        }
    }
    const configs = glob
        .sync('**/*.test.js', {cwd})
        .map(f => config(f));

    if (module == 'classapplier') {
        // push amdTestExampleConfig
        configs.push(config("index.test.js", 'amd'));
    }
    return configs;
}

export default packages.flatMap(configsFor);
