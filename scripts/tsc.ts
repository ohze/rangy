import {writeFileSync} from "fs";
import {resolve} from "path";
import {srcDir, modules} from "./util";
import {spawnSync} from "child_process";

function writeTsConfig(name: string, es: boolean) {
    const target = es? "es2018" : "es5";
    const outDir = es? "esm2015" : "esm5";
    const c = {
        extends: "../tsconfig.json",
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
    console.log(`$ tsc -b #es=${es}`);
    const r = spawnSync('tsc', ['-b'], {stdio:'inherit'});
    return r.status === 0;
}

function main() {
    for(const es of [false, true]) {
        const success = tsc(es);
        if (!success) break;
    }
}

main();
