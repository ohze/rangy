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

const testDir = resolve(projectRoot, 'test');

const plugins = [
    nodeResolve(),
    commonjs(),
    typescript({
        tsconfig: resolve(testDir, 'tsconfig.json'),
        tsconfigOverride: {
            compilerOptions: {
                target: "esnext",
                module: "esnext",
                declaration: false,
                declarationMap: false,
            }
        }
    }),
];

//all rangy modules are external dependencies to test code
const external = ['rangy2', ...modules.map(n => 'rangy-' + n)];

//map all external dependencies to global name 'rangy'
const globals = {};
external.forEach(n => Object.assign(globals, {[n]: 'rangy'}));

const configs = glob
    .sync('**/*.test.ts', {cwd: testDir})
    .map(f => join(testDir, f))
    .map((f) => {
        const n = f.substr(0, f.length - 3); // remove `.ts`
        return {
            input: [f],
            output: {
                format: 'iife',
                file: n + '.iife.js',
                name: 'unnamed',
                globals,
                sourcemap: true
            },
            external,
            plugins,
        }
    });

export default configs;
