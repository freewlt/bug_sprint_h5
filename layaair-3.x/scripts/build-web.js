#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const esbuildName = isWindows ? 'esbuild.cmd' : 'esbuild';

const candidates = [
  process.env.ESBUILD_BIN,
  path.join(projectRoot, 'node_modules', '.bin', esbuildName),
  isWindows
    ? 'D:\\Program Files\\LayaAirIDE\\resources\\node_modules\\@esbuild\\win32-x64\\esbuild.exe'
    : null,
  isWindows
    ? 'D:\\Program Files\\LayaAirIDE\\resources\\node_modules\\.bin\\esbuild.cmd'
    : null
].filter(Boolean);

const esbuild = candidates.find((candidate) => fs.existsSync(candidate));

if (!esbuild) {
  console.error('Unable to find esbuild. Set ESBUILD_BIN or install esbuild.');
  process.exit(1);
}

const outDir = path.join(projectRoot, 'bin', 'js', 'bundles');
const outFile = path.join(outDir, 'bundle.js');
const sceneFile = path.join(outDir, 'bundle.scene.js');
const sourceFile = path.join(projectRoot, 'src', 'Main.ts');

fs.mkdirSync(outDir, { recursive: true });

const result = spawnSync(esbuild, [
  sourceFile,
  '--bundle',
  '--format=iife',
  '--target=es2017',
  `--outfile=${outFile}`,
  '--sourcemap'
], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: false
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

fs.copyFileSync(outFile, sceneFile);

const mapFile = `${outFile}.map`;
if (fs.existsSync(mapFile)) {
  fs.copyFileSync(mapFile, `${sceneFile}.map`);
}

console.log(`Built ${path.relative(projectRoot, outFile)}`);
