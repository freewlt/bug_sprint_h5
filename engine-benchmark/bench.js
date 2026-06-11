#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const RESULTS_FILE = path.join(__dirname, 'results.json');

const DEFAULT_RESULTS = {
  schema_version: 1,
  updated_at: null,
  engines: {
    cocos: {
      name: 'Cocos Creator',
      version: '3.8',
      label: 'Cocos Creator 3.8',
      tasks: {},
      package_size_mb: null,
      package_size_bytes: null,
      package_size_path: null,
      web_build_time_seconds: null,
      last_build_command: null,
      last_build_exit_code: null,
      first_screen_time_ms: null,
      first_screen_runs_ms: [],
      first_screen_url: null,
      benchmark: emptyBenchmark(),
      updated_at: null
    },
    laya: {
      name: 'LayaAir',
      version: '3.x',
      label: 'LayaAir 3.x',
      tasks: {},
      package_size_mb: null,
      package_size_bytes: null,
      package_size_path: null,
      web_build_time_seconds: null,
      last_build_command: null,
      last_build_exit_code: null,
      first_screen_time_ms: null,
      first_screen_runs_ms: [],
      first_screen_url: null,
      benchmark: emptyBenchmark(),
      updated_at: null
    },
    godot: {
      name: 'Godot',
      version: '4.6',
      label: 'Godot 4.6',
      tasks: {},
      package_size_mb: null,
      package_size_bytes: null,
      package_size_path: null,
      web_build_time_seconds: null,
      last_build_command: null,
      last_build_exit_code: null,
      first_screen_time_ms: null,
      first_screen_runs_ms: [],
      first_screen_url: null,
      benchmark: emptyBenchmark(),
      updated_at: null
    }
  }
};

const ENGINE_ALIASES = {
  cocos: 'cocos',
  creator: 'cocos',
  cocoscreator: 'cocos',
  cocos38: 'cocos',
  cocoscreator38: 'cocos',
  laya: 'laya',
  layaair: 'laya',
  laya3: 'laya',
  layaair3: 'laya',
  layaair3x: 'laya',
  godot: 'godot',
  godot4: 'godot',
  godot46: 'godot'
};

const TASK_ORDER = ['create_project', 'core_gameplay'];

function emptyBenchmark() {
  return {
    avgFps: null,
    minFps: null,
    objectCount: null,
    runs: []
  };
}

function nowIso() {
  return new Date().toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEngine(input) {
  if (!input) {
    throw new Error('Missing engine. Use one of: cocos, laya, godot.');
  }

  const compact = String(input).toLowerCase().replace(/[^a-z0-9]/g, '');
  const engine = ENGINE_ALIASES[compact];

  if (!engine) {
    throw new Error(`Unknown engine "${input}". Use one of: cocos, laya, godot.`);
  }

  return engine;
}

function loadResults() {
  if (!fs.existsSync(RESULTS_FILE)) {
    return clone(DEFAULT_RESULTS);
  }

  const raw = fs.readFileSync(RESULTS_FILE, 'utf8');
  const data = raw.trim() ? JSON.parse(raw) : {};
  const merged = clone(DEFAULT_RESULTS);

  if (data.schema_version) {
    merged.schema_version = data.schema_version;
  }
  if (data.updated_at) {
    merged.updated_at = data.updated_at;
  }

  for (const engine of Object.keys(merged.engines)) {
    merged.engines[engine] = {
      ...merged.engines[engine],
      ...(data.engines && data.engines[engine] ? data.engines[engine] : {})
    };
    merged.engines[engine].tasks = {
      ...(merged.engines[engine].tasks || {}),
      ...((data.engines && data.engines[engine] && data.engines[engine].tasks) || {})
    };
    merged.engines[engine].benchmark = {
      ...emptyBenchmark(),
      ...((data.engines && data.engines[engine] && data.engines[engine].benchmark) || {})
    };
  }

  return merged;
}

function saveResults(results) {
  results.updated_at = nowIso();
  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  fs.writeFileSync(RESULTS_FILE, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
}

function getEngine(results, engineInput) {
  return results.engines[normalizeEngine(engineInput)];
}

function requireTask(task) {
  if (!task) {
    throw new Error('Missing task name.');
  }
  return task;
}

function startTask(engineInput, taskInput) {
  const results = loadResults();
  const engine = getEngine(results, engineInput);
  const task = requireTask(taskInput);
  const startedAt = nowIso();

  engine.tasks[task] = {
    started_at: startedAt,
    ended_at: null,
    duration_seconds: null
  };
  engine.updated_at = startedAt;

  saveResults(results);
  console.log(`Started ${engine.label} / ${task} at ${startedAt}`);
}

function endTask(engineInput, taskInput) {
  const results = loadResults();
  const engine = getEngine(results, engineInput);
  const task = requireTask(taskInput);
  const record = engine.tasks[task];

  if (!record || !record.started_at) {
    throw new Error(`No start record for ${engine.label} / ${task}. Run start first.`);
  }

  const endedAt = nowIso();
  const durationSeconds = Math.max(0, (Date.parse(endedAt) - Date.parse(record.started_at)) / 1000);

  engine.tasks[task] = {
    ...record,
    ended_at: endedAt,
    duration_seconds: round(durationSeconds, 2)
  };
  engine.updated_at = endedAt;

  saveResults(results);
  console.log(`Ended ${engine.label} / ${task}: ${formatNumber(durationSeconds)}s`);
}

function statBuildSize(engineInput, buildDirInput) {
  if (!buildDirInput) {
    throw new Error('Missing buildDir.');
  }

  const buildDir = path.resolve(process.cwd(), buildDirInput);
  if (!fs.existsSync(buildDir)) {
    throw new Error(`Build directory does not exist: ${buildDir}`);
  }

  const stats = fs.statSync(buildDir);
  if (!stats.isDirectory()) {
    throw new Error(`Build path is not a directory: ${buildDir}`);
  }

  const bytes = directorySize(buildDir);
  const mb = round(bytes / 1024 / 1024, 2);
  const results = loadResults();
  const engine = getEngine(results, engineInput);
  const updatedAt = nowIso();

  engine.package_size_bytes = bytes;
  engine.package_size_mb = mb;
  engine.package_size_path = path.relative(process.cwd(), buildDir) || '.';
  engine.updated_at = updatedAt;

  saveResults(results);
  console.log(`${engine.label} package size: ${formatNumber(mb)} MB`);
}

function directorySize(dir) {
  let total = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      total += directorySize(fullPath);
      continue;
    }

    if (entry.isFile()) {
      total += fs.statSync(fullPath).size;
    }
  }

  return total;
}

function buildTime(engineInput, commandParts) {
  const directSpawn = commandParts[0] === '--';
  const executable = directSpawn ? commandParts[1] : null;
  const args = directSpawn ? commandParts.slice(2) : [];
  const command = directSpawn ? formatCommand([executable, ...args]) : commandParts.join(' ').trim();

  if (!command || (directSpawn && !executable)) {
    throw new Error('Missing buildCommand.');
  }

  const results = loadResults();
  const engine = getEngine(results, engineInput);
  const started = Date.now();
  const env = { ...process.env };

  if (normalizeEngine(engineInput) === 'cocos') {
    delete env.ELECTRON_RUN_AS_NODE;
  }

  console.log(`Running build command for ${engine.label}: ${command}`);

  const child = directSpawn ? spawn(executable, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env
  }) : spawn(command, {
    cwd: process.cwd(),
    shell: true,
    stdio: 'inherit',
    env
  });

  child.on('close', (code) => {
    const durationSeconds = round((Date.now() - started) / 1000, 2);
    const endedAt = nowIso();
    const latest = loadResults();
    const latestEngine = getEngine(latest, engineInput);

    latestEngine.web_build_time_seconds = durationSeconds;
    latestEngine.last_build_command = command;
    latestEngine.last_build_exit_code = code;
    latestEngine.updated_at = endedAt;

    saveResults(latest);
    console.log(`${latestEngine.label} build time: ${formatNumber(durationSeconds)}s`);

    if (!isSuccessfulBuildExit(engineInput, code)) {
      console.error(`Build command exited with code ${code}.`);
      process.exitCode = code || 1;
    }
  });
}

function formatCommand(parts) {
  return parts
    .filter((part) => part !== null && part !== undefined && part !== '')
    .map((part) => {
      const text = String(part);
      return /\s|;/.test(text) ? `"${text.replace(/"/g, '\\"')}"` : text;
    })
    .join(' ');
}

function isSuccessfulBuildExit(engineInput, code) {
  if (code === 0) {
    return true;
  }

  return normalizeEngine(engineInput) === 'cocos' && code === 36;
}

function report() {
  const results = loadResults();
  const engines = Object.values(results.engines);
  const taskNames = collectTaskNames(engines);
  const headers = [
    'Engine',
    'Version',
    ...taskNames.map((task) => `${task} (s)`),
    'First Screen (ms)',
    'Avg FPS',
    'Min FPS',
    'Object Count',
    'Web Build (s)',
    'Package Size (MB)'
  ];

  const rows = engines.map((engine) => [
    engine.name,
    engine.version,
    ...taskNames.map((task) => valueOrDash(engine.tasks[task] && engine.tasks[task].duration_seconds)),
    valueOrDash(engine.first_screen_time_ms),
    valueOrDash(engine.benchmark && engine.benchmark.avgFps),
    valueOrDash(engine.benchmark && engine.benchmark.minFps),
    valueOrDash(engine.benchmark && engine.benchmark.objectCount),
    valueOrDash(engine.web_build_time_seconds),
    valueOrDash(engine.package_size_mb)
  ]);

  console.log(markdownTable(headers, rows));
}

function collectTaskNames(engines) {
  const names = new Set();

  for (const engine of engines) {
    for (const task of Object.keys(engine.tasks || {})) {
      names.add(task);
    }
  }

  return [...names].sort((a, b) => {
    const aIndex = TASK_ORDER.indexOf(a);
    const bIndex = TASK_ORDER.indexOf(b);

    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });
}

function markdownTable(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);

  for (const row of rows) {
    lines.push(`| ${row.join(' | ')} |`);
  }

  return lines.join('\n');
}

function valueOrDash(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return formatNumber(value);
}

function formatNumber(value) {
  if (typeof value !== 'number') {
    return String(value);
  }

  if (!Number.isFinite(value)) {
    return '-';
  }

  return String(round(value, 2)).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function usage() {
  return [
    'Usage:',
    '  node engine-benchmark/bench.js start <engine> <task>',
    '  node engine-benchmark/bench.js end <engine> <task>',
    '  node engine-benchmark/bench.js size <engine> <buildDir>',
    '  node engine-benchmark/bench.js buildtime <engine> <buildCommand>',
    '  node engine-benchmark/bench.js report',
    '',
    'Engines:',
    '  cocos  -> Cocos Creator 3.8',
    '  laya   -> LayaAir 3.x',
    '  godot  -> Godot 4.6'
  ].join('\n');
}

function main() {
  const [command, engine, ...rest] = process.argv.slice(2);

  try {
    switch (command) {
      case 'start':
        startTask(engine, rest[0]);
        break;
      case 'end':
        endTask(engine, rest[0]);
        break;
      case 'size':
        statBuildSize(engine, rest[0]);
        break;
      case 'buildtime':
        buildTime(engine, rest);
        break;
      case 'report':
        report();
        break;
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        console.log(usage());
        break;
      default:
        throw new Error(`Unknown command "${command}".`);
    }
  } catch (error) {
    console.error(error.message);
    console.error('');
    console.error(usage());
    process.exitCode = 1;
  }
}

main();
