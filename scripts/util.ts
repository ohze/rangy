import {join, resolve} from "path";
import {readdirSync, statSync} from "fs";

export const projectRoot = resolve(__dirname, '..');
export const packagesDir = resolve(projectRoot, 'packages');

//['core', 'classapplier',..]
export const packages = readdirSync(packagesDir)
    .filter(n => statSync(join(packagesDir, n)).isDirectory());

