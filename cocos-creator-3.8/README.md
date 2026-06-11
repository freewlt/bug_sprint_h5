# Bug Sprint - Cocos Creator 3.8

This folder contains the Cocos Creator 3.8 implementation of the H5 benchmark demo.

## Open In Cocos Creator

1. Open Cocos Creator 3.8.
2. Choose this folder: `cocos-creator-3.8`.
3. Create or open a 2D scene.
4. Add a `Canvas` node.
5. Add a child node named `Game`.
6. Attach `assets/scripts/BugSprintGame.ts` to `Game`.
7. Save the scene as `assets/scenes/Main.scene`.
8. Press Preview.

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

## Suggested Export Target

Use Cocos Creator Web Mobile build for benchmark parity:

```bash
node ../engine-benchmark/bench.js buildtime cocos "<CocosCreator> --project . --build platform=web-mobile"
node ../engine-benchmark/bench.js size cocos ./build/web-mobile
```

