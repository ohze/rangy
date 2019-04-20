/**
 * This rollup config is used to generate test/*.test.iife.js from test/*.test.ts files
 * The iife file is then used to verify that rangy2 & rangy modules (ie, rangy-classapplier)
 * can be used by referencing directly in `script` tag in html files
 */
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import * as glob from 'glob';
import typescript from 'rollup-plugin-typescript2'
import {modules, projectRoot} from "./util";
import {resolve, join} from "path";
import {ModuleFormat, RollupOptions} from "rollup";

const testDir = resolve(projectRoot, 'test');

const plugins = [
    nodeResolve(),
    commonjs(),
    typescript({
        tsconfig: resolve(testDir, 'tsconfig.json')
    }),
];

//all rangy modules are external dependencies to test code
const external = ['rangy2', ...modules.map(n => 'rangy-' + n)];

//map all external dependencies to global name 'rangy'
const globals = {};
external.forEach(n => Object.assign(globals, {[n]: 'rangy'}));

function iifeConfig(f: string, format: ModuleFormat = 'iife'): RollupOptions {
    f = join(testDir, f);
    return {
        input: [f],
        output: {
            format,
            file: f.replace(/\.ts$/, format == 'iife'? '.js' : `.${format}.js`),
            name: 'unnamed',
            globals,
            sourcemap: true
        },
        external,
        plugins,
    }
}

const configs = glob
    .sync('**/*.ts', {cwd: testDir})
    .filter(f => !f.endsWith('.d.ts'))
    .map(f => iifeConfig(f));
// push amdTestExampleConfig
configs.push(iifeConfig("classapplier/index.test.ts", 'amd'));

export default configs;
