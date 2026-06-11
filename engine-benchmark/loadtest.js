#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RESULTS_FILE = path.join(__dirname, 'results.json');
const RUN_COUNT = 5;
const NAVIGATION_TIMEOUT_MS = 120000;
const READY_TIMEOUT_MS = 120000;

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

  for (const engineKey of Object.keys(merged.engines)) {
    const existing = data.engines && data.engines[engineKey] ? data.engines[engineKey] : {};
    merged.engines[engineKey] = {
      ...merged.engines[engineKey],
      ...existing
    };
    merged.engines[engineKey].tasks = {
      ...(merged.engines[engineKey].tasks || {}),
      ...(existing.tasks || {})
    };
    merged.engines[engineKey].benchmark = {
      ...emptyBenchmark(),
      ...(existing.benchmark || {})
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

function loadPlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    throw new Error([
      'Playwright is not installed.',
      'Install it first:',
      '  npm install -D playwright',
      '  npx playwright install chromium'
    ].join('\n'));
  }
}

async function runLoadTest(engineInput, url) {
  if (!url) {
    throw new Error('Missing url.');
  }

  validateUrl(url);

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const runs = [];

  try {
    for (let index = 0; index < RUN_COUNT; index += 1) {
      const result = await measureOnce(browser, url);
      runs.push(result);
      console.log(formatRun(index + 1, result));
    }
  } finally {
    await browser.close();
  }

  const firstScreenRuns = runs.map((run) => run.first_screen_time_ms);
  const medianTime = median(firstScreenRuns);
  const benchmark = aggregateBenchmark(runs.map((run) => run.benchmark));

  const results = loadResults();
  const engine = getEngine(results, engineInput);
  const updatedAt = nowIso();

  engine.first_screen_time_ms = medianTime;
  engine.first_screen_runs_ms = firstScreenRuns;
  engine.first_screen_url = url;
  engine.benchmark = benchmark;
  engine.updated_at = updatedAt;

  saveResults(results);

  console.log('');
  console.log(`Median first screen time: ${formatNumber(medianTime)} ms`);
  console.log(`Median benchmark: ${formatBenchmark(benchmark)}`);
  console.log('');
  console.log('Markdown report:');
  console.log(createReport(loadResults()));
}

async function measureOnce(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();
  const started = Date.now();

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: NAVIGATION_TIMEOUT_MS
    });
    await page.waitForFunction(
      () => window.__GAME_READY__ === true,
      undefined,
      { timeout: READY_TIMEOUT_MS }
    );

    const elapsed = Date.now() - started;
    const benchmark = await readBenchmark(page);

    return {
      first_screen_time_ms: elapsed,
      benchmark
    };
  } finally {
    await context.close();
  }
}

async function readBenchmark(page) {
  const benchmark = await page.evaluate(() => {
    const source = window.__BENCHMARK__;

    if (!source || typeof source !== 'object') {
      return null;
    }

    const numeric = (value) => {
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };

    return {
      avgFps: numeric(source.avgFps),
      minFps: numeric(source.minFps),
      objectCount: numeric(source.objectCount)
    };
  });

  return benchmark || emptyBenchmark();
}

function aggregateBenchmark(benchmarks) {
  const keys = ['avgFps', 'minFps', 'objectCount'];
  const aggregate = emptyBenchmark();

  for (const key of keys) {
    const values = benchmarks
      .map((benchmark) => benchmark && benchmark[key])
      .filter((value) => typeof value === 'number' && Number.isFinite(value));

    aggregate[key] = values.length > 0 ? round(median(values), 2) : null;
  }

  aggregate.runs = benchmarks.map((benchmark) => ({
    avgFps: benchmark.avgFps,
    minFps: benchmark.minFps,
    objectCount: benchmark.objectCount
  }));

  return aggregate;
}

function formatRun(index, result) {
  return [
    `Run ${index}/${RUN_COUNT}:`,
    `${formatNumber(result.first_screen_time_ms)} ms`,
    formatBenchmark(result.benchmark)
  ].join(' ');
}

function formatBenchmark(benchmark) {
  if (!benchmark) {
    return 'avgFps=- minFps=- objectCount=-';
  }

  return [
    `avgFps=${valueOrDash(benchmark.avgFps)}`,
    `minFps=${valueOrDash(benchmark.minFps)}`,
    `objectCount=${valueOrDash(benchmark.objectCount)}`
  ].join(' ');
}

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:', 'file:'].includes(parsed.protocol)) {
      throw new Error('Unsupported protocol.');
    }
  } catch (error) {
    throw new Error(`Invalid url "${url}". Use an http, https, or file URL.`);
  }
}

function report() {
  console.log(createReport(loadResults()));
}

function createReport(results) {
  const headers = [
    'Engine',
    'Version',
    'First Screen (ms)',
    'Avg FPS',
    'Min FPS',
    'Object Count',
    'URL'
  ];

  const rows = Object.values(results.engines).map((engine) => [
    engine.name,
    engine.version,
    valueOrDash(engine.first_screen_time_ms),
    valueOrDash(engine.benchmark && engine.benchmark.avgFps),
    valueOrDash(engine.benchmark && engine.benchmark.minFps),
    valueOrDash(engine.benchmark && engine.benchmark.objectCount),
    engine.first_screen_url || '-'
  ]);

  return markdownTable(headers, rows);
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

function median(values) {
  const sorted = values
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .slice()
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return null;
  }

  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return round((sorted[middle - 1] + sorted[middle]) / 2, 2);
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function usage() {
  return [
    'Usage:',
    '  node engine-benchmark/loadtest.js <engine> <url>',
    '  node engine-benchmark/loadtest.js run <engine> <url>',
    '  node engine-benchmark/loadtest.js report',
    '',
    'The page must set:',
    '  window.__GAME_READY__ = true',
    '',
    'Optional FPS data:',
    '  window.__BENCHMARK__ = { avgFps, minFps, objectCount }',
    '',
    'Engines:',
    '  cocos  -> Cocos Creator 3.8',
    '  laya   -> LayaAir 3.x',
    '  godot  -> Godot 4.6'
  ].join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'report') {
      report();
      return;
    }

    if (command === 'help' || command === '--help' || command === '-h' || command === undefined) {
      console.log(usage());
      return;
    }

    if (command === 'run') {
      await runLoadTest(args[1], args[2]);
      return;
    }

    await runLoadTest(args[0], args[1]);
  } catch (error) {
    console.error(error.message);
    console.error('');
    console.error(usage());
    process.exitCode = 1;
  }
}

main();
