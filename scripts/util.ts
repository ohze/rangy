import {join, resolve} from "path";
import {readdirSync, statSync, readFileSync} from "fs";

export const projectRoot = resolve(__dirname, '..');
export const packagesDir = resolve(projectRoot, 'packages');

/** all packages, included private ones */
export const allPackages = readdirSync(packagesDir)
    .filter(n => statSync(join(packagesDir, n)).isDirectory());

/** public packages, eg ['core', 'classapplier',..] */
export const packages = allPackages.filter(p => {
    const f = join(packagesDir, p, 'package.json');
    const pkg = JSON.parse(readFileSync(f, 'utf8'));
    return !pkg.private;
});
