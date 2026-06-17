# Bug Sprint - LayaAir 3.x

This folder contains the LayaAir 3.x implementation of the H5 benchmark demo.

## Open In LayaAir IDE

1. Open LayaAir IDE 3.x.
2. Import or open this folder: `layaair-3.x`.
3. Create a 2D startup scene.
4. Attach the gameplay script logic from `src/Main.ts` to the startup scene, or use the browser preview entry in `bin/index.html`.
5. Preview the project.
6. Export as Web/H5 for benchmark parity.

LayaAir 3.x uses a startup scene as the normal project entry. This repo keeps the demo logic in code so the benchmark can stay close to the Cocos and Godot ports.

## Browser Preview

`bin/index.html` expects LayaAir runtime files under `bin/libs/`.

Typical files:

```text
bin/libs/laya.core.js
bin/libs/laya.webgl.js
bin/libs/laya.ui.js
```

If your LayaAir IDE uses different runtime file names, update the script tags in `bin/index.html`.

Then run:

```bash
npm run preview
node ../engine-benchmark/loadtest.js laya http://127.0.0.1:8090/
```

## Benchmark Hooks

The script sets these values for `engine-benchmark/loadtest.js`:

```js
window.__GAME_READY__ = true;
window.__BENCHMARK__ = {
  avgFps: 60,
  minFps: 54,
  objectCount: 12
};
```

## Gameplay

- Move the programmer left and right.
- Avoid bugs, scope changes, urgent tasks, and production errors.
- Collect coffee, keyboard, code blocks, and review-passed props.
- The run ends when HP reaches 0.
