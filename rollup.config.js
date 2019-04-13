// import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import tsconfig from './tsconfig.json';
import replace from 'rollup-plugin-re';
import path from 'path';

const buildVars = (function() {
    var date = new Date();
    var month = "January,February,March,April,May,June,July,August,September,October,November,December".split(",")[date.getMonth()];
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
    resolve(),
    commonjs(),
    // typescript(),
];

const inDir = tsconfig.compilerOptions.outDir;
const outDir = './lib';

const rangyModulesConfigs = (function(){
    function config(globalName, file){
        return {
            input: [`${inDir}/modules/${file}`],
            external: (id, parentId) => {
                if (parentId) {
                    console.log('import: ' + path.relative(inDir, parentId) + ' <- ' + id);
                }
                return id === "../core/index";
            },
            output: {
                format: 'umd',
                name: globalName,
                file: `${outDir}/modules/${file}`,
                globals: (id) => 'rangy',
                // sourcemap: true, TODO
            },
            plugins,
        }
    }

    return [
        ['rangyClassApplier', 'rangy-classapplier.js'],
        ['rangyHighlighter', 'rangy-highlighter.js'],
        ['rangySaveRestore', 'rangy-selectionsaverestore.js'],
        ['rangySerializer', 'rangy-serializer.js'],
        ['rangyUtil', 'rangy-util.js'],
    ].map((name2file) => config(...name2file));
})();

const coreConfig = {
    input: [`${inDir}/core/index.js`],
    output: {
        format: 'umd',
        name: 'rangy',
        file: `${outDir}/core/index.js`,
        // sourcemap: true, TODO
    },
    plugins,
};

export default [
    coreConfig,
    ...rangyModulesConfigs,
];
