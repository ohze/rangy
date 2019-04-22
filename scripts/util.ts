import {join, resolve} from "path";
import {readdirSync, statSync} from "fs";

export const projectRoot = resolve(__dirname, '..');
export const srcDir = resolve(projectRoot, 'src');
export const distDir = resolve(projectRoot, 'dist');

//['core', 'classapplier',..]
export const modules = readdirSync(srcDir)
    .filter(n => statSync(join(srcDir, n)).isDirectory());

