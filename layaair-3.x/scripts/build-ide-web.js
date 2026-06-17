const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const idePath = process.env.LAYA_IDE || 'D:\\Program Files\\LayaAirIDE\\LayaAirIDE.exe';
const appPath = path.join(path.dirname(idePath), 'resources', 'app.asar');
const outDir = path.resolve(projectRoot, 'build', 'web');

function assertInsideProject(target) {
  const relative = path.relative(projectRoot, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to touch path outside project: ${target}`);
  }
}

if (!fs.existsSync(idePath)) {
  console.error(`LayaAir IDE not found: ${idePath}`);
  process.exit(1);
}

if (!fs.existsSync(appPath)) {
  console.error(`LayaAir IDE app archive not found: ${appPath}`);
  process.exit(1);
}

assertInsideProject(outDir);
fs.rmSync(outDir, { recursive: true, force: true });

const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

const result = spawnSync(idePath, [
  appPath,
  `--project=${projectRoot}`,
  '--script=BuildWebCli.run',
  `--script-args="${outDir}"`,
], {
  cwd: projectRoot,
  env: childEnv,
  stdio: 'inherit',
  timeout: 120000,
  windowsHide: true,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const indexPath = path.join(outDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error(`LayaAir IDE build did not produce ${indexPath}`);
  process.exit(1);
}

console.log(`LayaAir IDE web build output: ${outDir}`);
