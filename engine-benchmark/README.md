# Engine Benchmark

## Directory

```text
engine-benchmark/
  bench.js       Manual timing, build size, build time, and full report
  loadtest.js    Playwright first-screen load test and FPS report
  serve-static.js Local static server for built web output
  results.json   Benchmark data store
```

## Setup

`loadtest.js` needs Playwright:

```bash
npm install -D playwright
npx playwright install chromium
```

## Manual Benchmark

```bash
node engine-benchmark/bench.js start cocos create_project
node engine-benchmark/bench.js end cocos create_project
node engine-benchmark/bench.js size cocos ./build/web-mobile
node engine-benchmark/bench.js buildtime cocos "npm run build"
node engine-benchmark/bench.js report
```

## First-Screen Load Test

The Web Demo page should set this when the first playable frame is ready:

```js
window.__GAME_READY__ = true;
```

Optional FPS data:

```js
window.__BENCHMARK__ = {
  avgFps: 60,
  minFps: 54,
  objectCount: 1000
};
```

Run 5 tests and write the median into `results.json`:

```bash
node engine-benchmark/loadtest.js cocos http://localhost:7456/
node engine-benchmark/loadtest.js laya http://localhost:3000/
node engine-benchmark/loadtest.js godot http://localhost:8060/
```

The first-screen time stops when `window.__GAME_READY__ === true`. After that, the tester clicks the page to start gameplay and samples FPS after a short extra wait. The gameplay wait is not included in first-screen timing.

Print the Markdown load/FPS comparison table:

```bash
node engine-benchmark/loadtest.js report
```

Serve a built Web directory for load testing:

```bash
node engine-benchmark/serve-static.js cocos-creator-3.8/build/web-mobile 8088
node engine-benchmark/loadtest.js cocos http://127.0.0.1:8088/
```
