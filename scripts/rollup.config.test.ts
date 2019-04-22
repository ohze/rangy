/**
 * This rollup config is used to generate test/*.test.iife.js from test/*.test.ts files
 * The iife file is then used to verify that rangy2 & rangy modules (ie, rangy-classapplier)
 * can be used by referencing directly in `script` tag in html files
 */
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import * as glob from 'glob';
import typescript from 'rollup-plugin-typescript2'
import {packages, packagesDir} from "./util";
import {resolve, join} from "path";
import {ModuleFormat, RollupOptions} from "rollup";

const commonPlugins = [
    nodeResolve(),
    commonjs()
];

//all rangy modules are external dependencies to test code
const external = packages.map(n => '@rangy/' + n);

//map all external dependencies to global name 'rangy'
const globals = {};
external.forEach(n => Object.assign(globals, {[n]: 'rangy'}));

function configsFor(module: string) {
    const cwd = resolve(packagesDir, module, 'test');
    const plugins = [...commonPlugins, typescript({
        tsconfig: resolve(cwd, 'tsconfig.json')
    })];
    function config(f: string, format: ModuleFormat = 'iife'): RollupOptions {
        f = join(cwd, f);
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
        .sync('**/*.ts', {cwd})
        .filter(f => !f.endsWith('.d.ts'))
        .map(f => config(f));

    if (module == 'classapplier') {
        // push amdTestExampleConfig
        configs.push(config("index.test.ts", 'amd'));
    }
    return configs;
}

// export default packages.flatMap(configsFor);
export default configsFor('core');
