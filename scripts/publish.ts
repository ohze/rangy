import {spawnSync} from "child_process";
import {modules, projectRoot} from "./util";

function publish(module: string) {
    const args = ['yarn', ['publish', `dist/${module}`, '--non-interactive']];
    console.log(args.flat().join(' '));
    spawnSync('yarn', ['publish', `dist/${module}`, '--non-interactive'], {
        stdio:'inherit',
        cwd: projectRoot,
    });
}

console.log('publishing modules: ' + modules.join(', ') + '...');
modules.forEach(publish);
