import {writeFileSync} from "fs";
import {resolve} from "path";
import {srcDir, modules} from "./util";
import {spawnSync} from "child_process";

function writeTsConfig(name: string, es: boolean) {
    const target = es? "es2018" : "es5";
    const outDir = es? "esm2015" : "esm5";
    const c = {
        extends: "../tsconfig.base.json",
        compilerOptions: {
            declarationDir: `../../dist/${name}/types`,
            outDir: `../../dist/${name}/${outDir}`,
            target,
            baseUrl: ".",
            paths: {
                rangy2: ["../core/index"]
            }
        }
    };

    if (name !== 'core') {
        Object.assign(c, {
            references: [{ path: "../core" }]
        });
    }

    writeFileSync(
        resolve(srcDir, name, 'tsconfig.json'),
        JSON.stringify(c, null, 2)
    );
}

function tsc(es: boolean): boolean {
    modules.forEach(n => writeTsConfig(n, es));
    const args = process.argv.slice(2); //argv[0] is 'node', argv[1] is this script (scripts/tsc.js)
    console.log(`$ tsc ${args.join(' ')} #es=${es}`);
    const r = spawnSync('tsc', args, {
        stdio:'inherit',
        cwd: srcDir,
    });
    return r.status === 0;
}

function main() {
    for(const es of [false, true]) {
        const success = tsc(es);
        if (!success) break;
    }
}

// usage: node [options] scripts/tsc.js [tsc arguments]
// note: tsc will run in cwd: srcDir
main();
