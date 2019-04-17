import { writeFileSync, copyFileSync, statSync } from 'fs';
import { resolve, basename } from 'path';
import * as packageJson from '../package.json';
import {modules, projectRoot} from "./util";

main();

function main() {
  console.log('copy modules:', modules.join(', '));

  modules.forEach(process);

  function process(name: string) {
    const distPath = resolve(projectRoot, 'dist', name);
    const distPackageJson = createDistPackageJson(packageJson, name);

    const cpFiles = ['README.md', 'CHANGELOG.md', 'LICENSE', '.npmignore'].map(
        (file) => resolve(projectRoot, file)
    );

    cp(cpFiles, distPath);

    writeFileSync(resolve(distPath, 'package.json'), distPackageJson)
  }
}

function cp(source: string[] | string, target: string) {
  const isDir = statSync(target).isDirectory();

  if (isDir) {
    if (!Array.isArray(source)) {
      throw new Error(
        'if <target> is directory you need to provide source as an array'
      )
    }

    source.forEach((file) =>
      copyFileSync(file, resolve(target, basename(file)))
    );

    return
  }
  if (Array.isArray(source)) {
    throw new Error(
        'if <target> is not a directory you need to provide source as an string'
    )
  }

  copyFileSync(source, target)
}

function createDistPackageJson(packageConfig: typeof packageJson, name: string): string {
  const {
    devDependencies,
    scripts,
    // engines,
    // config,
    // husky,
    // 'lint-staged': lintStaged,
    ...json
  } = packageConfig;

  if(name != 'core') {
    Object.assign(json.dependencies, {
      [json.name]: '^' + json.version
    });

    json.name = `rangy-${name}`;
  }

  return JSON.stringify(json, null, 2)
}
