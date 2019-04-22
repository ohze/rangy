import glob from 'glob';
import util from 'util';
import {projectRoot} from './util';
import fs from 'fs';
import deleteEmpty from 'delete-empty';

const g = util.promisify(glob);
const unlink = util.promisify(fs.unlink);

async function main() {
    const files = await g("packages/*/lib/**", {
        cwd: projectRoot,
        nodir: true,
        ignore: "packages/*/lib/types/types.d.ts"
    });
    await Promise.all(files.map(f => unlink(f)));
    const dirs = await g("packages/*/lib/**/");
    await Promise.all(dirs.map(d => deleteEmpty(d)));
}

main();
