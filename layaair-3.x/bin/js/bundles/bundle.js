"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __pow = Math.pow;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
  var __decorateClass = (decorators, target, key, kind) => {
    var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
    for (var i = decorators.length - 1, decorator; i >= 0; i--)
      if (decorator = decorators[i])
        result = (kind ? decorator(target, key, result) : decorator(result)) || result;
    if (kind && result) __defProp(target, key, result);
    return result;
  };

  // src/Main.ts
  var regClass = typeof Laya !== "undefined" && Laya.regClass ? Laya.regClass : () => (constructor) => constructor;
  var DESIGN_WIDTH = 750;
  var DESIGN_HEIGHT = 1334;
  var OBSTACLES = [
    { kind: "obstacle", text: "Bug", icon: "BUG", color: "#ef4444", fill: "#7f1d1d", damage: 1, size: 70, minSpeed: 280, maxSpeed: 390 },
    { kind: "obstacle", text: "Change", icon: "REQ", color: "#f97316", fill: "#7c2d12", damage: 1, size: 74, minSpeed: 280, maxSpeed: 390 },
    { kind: "obstacle", text: "ASAP", icon: "NOW", color: "#eab308", fill: "#713f12", damage: 1, size: 70, minSpeed: 290, maxSpeed: 410 },
    { kind: "obstacle", text: "Prod Err", icon: "ERR", color: "#dc2626", fill: "#7f1d1d", damage: 2, size: 82, minSpeed: 310, maxSpeed: 430 }
  ];
  var PROPS = [
    { kind: "prop", text: "Coffee", icon: "COF", color: "#f59e0b", fill: "#78350f", heal: 1, score: 0, size: 66, minSpeed: 230, maxSpeed: 310 },
    { kind: "prop", text: "Keyboard", icon: "KEY", color: "#22c55e", fill: "#14532d", score: 100, size: 66, minSpeed: 230, maxSpeed: 310 },
    { kind: "prop", text: "Code", icon: "</>", color: "#38bdf8", fill: "#164e63", score: 50, size: 66, minSpeed: 230, maxSpeed: 310 },
    { kind: "prop", text: "Review OK", icon: "OK", color: "#a855f7", fill: "#581c87", invincible: 3, score: 150, size: 72, minSpeed: 240, maxSpeed: 320 }
  ];
  var _BugSprintLayaGame = class _BugSprintLayaGame {
    constructor() {
      this.state = 0 /* Start */;
      this.time = 0;
      this.score = 0;
      this.hp = 3;
      this.maxHp = 3;
      this.survival = 0;
      this.obstacleTimer = 0;
      this.propTimer = 1.2;
      this.difficulty = 1;
      this.invincible = 0;
      this.shake = 0;
      this.pointerDown = false;
      this.playerX = DESIGN_WIDTH / 2;
      this.playerY = DESIGN_HEIGHT - 190;
      this.playerTargetX = DESIGN_WIDTH / 2;
      this.playerRadius = 44;
      this.objects = [];
      this.particles = [];
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
      this.fpsSamples = [];
      this.createLayers();
      this.createLabels();
      this.registerInput();
      this.resetBenchmark();
      Laya.timer.frameLoop(1, this, this.loop);
      setTimeout(() => {
        window.__GAME_READY__ = true;
        this.publishBenchmark();
      }, 0);
    }
    createLayers() {
      this.root = new Laya.Sprite();
      this.root.size(DESIGN_WIDTH, DESIGN_HEIGHT);
      Laya.stage.addChild(this.root);
      this.background = new Laya.Sprite();
      this.itemLayer = new Laya.Sprite();
      this.foreground = new Laya.Sprite();
      this.uiLayer = new Laya.Sprite();
      this.root.addChild(this.background);
      this.root.addChild(this.itemLayer);
      this.root.addChild(this.foreground);
      this.root.addChild(this.uiLayer);
    }
    createLabels() {
      this.titleLabel = this.createLabel(72, "#ffffff", 86);
      this.subtitleLabel = this.createLabel(30, "#facc15", 50);
      this.bodyLabel = this.createLabel(25, "#e5e7eb", 36);
      this.buttonLabel = this.createLabel(34, "#111827", 80);
      this.scoreLabel = this.createLabel(28, "#facc15", 44);
      this.hpLabel = this.createLabel(28, "#f87171", 38);
      this.survivalLabel = this.createLabel(22, "#e5e7eb", 36);
      this.invincibleLabel = this.createLabel(22, "#d8b4fe", 36);
    }
    createLabel(fontSize, color, lineHeight) {
      const label = new Laya.Label();
      label.font = "Arial";
      label.fontSize = fontSize;
      label.color = color;
      label.align = "center";
      label.valign = "middle";
      label.leading = 6;
      label.height = lineHeight;
      label.visible = false;
      this.uiLayer.addChild(label);
      return label;
    }
    registerInput() {
      Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this.onPointerDown);
      Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
      Laya.stage.on(Laya.Event.MOUSE_UP, this, this.onPointerUp);
      Laya.stage.on(Laya.Event.MOUSE_OUT, this, this.onPointerUp);
      Laya.stage.on(Laya.Event.KEY_DOWN, this, this.onKeyDown);
    }
    loop() {
      const dt = Math.min((Laya.timer.delta || 16.67) / 1e3, 0.033);
      this.updateBenchmark(dt);
      if (this.state === 1 /* Playing */) {
        this.updatePlaying(dt);
      }
      this.render();
    }
    onPointerDown() {
      this.pointerDown = true;
      if (this.state !== 1 /* Playing */) {
        this.resetGame();
      }
      this.playerTargetX = this.clamp(Laya.stage.mouseX, 60, DESIGN_WIDTH - 60);
    }
    onPointerMove() {
      if (this.pointerDown && this.state === 1 /* Playing */) {
        this.playerTargetX = this.clamp(Laya.stage.mouseX, 60, DESIGN_WIDTH - 60);
      }
    }
    onPointerUp() {
      this.pointerDown = false;
    }
    onKeyDown(event) {
      const space = Laya.Keyboard ? Laya.Keyboard.SPACE : 32;
      const left = Laya.Keyboard ? Laya.Keyboard.LEFT : 37;
      const right = Laya.Keyboard ? Laya.Keyboard.RIGHT : 39;
      const keyA = Laya.Keyboard ? Laya.Keyboard.A : 65;
      const keyD = Laya.Keyboard ? Laya.Keyboard.D : 68;
      if (event.keyCode === space && this.state !== 1 /* Playing */) {
        this.resetGame();
        return;
      }
      if (this.state !== 1 /* Playing */) {
        return;
      }
      if (event.keyCode === left || event.keyCode === keyA) {
        this.playerTargetX = this.clamp(this.playerTargetX - 80, 60, DESIGN_WIDTH - 60);
      }
      if (event.keyCode === right || event.keyCode === keyD) {
        this.playerTargetX = this.clamp(this.playerTargetX + 80, 60, DESIGN_WIDTH - 60);
      }
    }
    resetGame() {
      this.clearObjects();
      this.state = 1 /* Playing */;
      this.time = 0;
      this.score = 0;
      this.hp = this.maxHp;
      this.survival = 0;
      this.obstacleTimer = 0;
      this.propTimer = 1.2;
      this.difficulty = 1;
      this.invincible = 0;
      this.shake = 0;
      this.playerX = DESIGN_WIDTH / 2;
      this.playerTargetX = DESIGN_WIDTH / 2;
      this.particles.length = 0;
      this.resetBenchmark();
    }
    clearObjects() {
      for (const object of this.objects) {
        object.node.removeSelf();
        object.node.destroy();
      }
      this.objects.length = 0;
    }
    updatePlaying(dt) {
      this.time += dt;
      this.survival += dt;
      this.score += dt * 10;
      this.difficulty = 1 + Math.floor(this.survival / 15) * 0.45;
      this.invincible = Math.max(0, this.invincible - dt);
      this.shake = Math.max(0, this.shake - dt);
      this.playerX += (this.playerTargetX - this.playerX) * this.clamp(dt * 12, 0, 1);
      this.playerX = this.clamp(this.playerX, 60, DESIGN_WIDTH - 60);
      this.updateSpawns(dt);
      this.updateObjects(dt);
      this.updateParticles(dt);
    }
    updateSpawns(dt) {
      this.obstacleTimer -= dt;
      if (this.obstacleTimer <= 0) {
        this.spawnObject(this.pick(OBSTACLES));
        if (this.survival > 30 && Math.random() < 0.25) {
          this.spawnObject(this.pick(OBSTACLES));
        }
        this.obstacleTimer = Math.max(0.32, 0.85 - this.survival / 90);
      }
      this.propTimer -= dt;
      if (this.propTimer <= 0) {
        this.spawnObject(this.pick(PROPS));
        this.propTimer = this.rand(1.7, 2.6);
      }
    }
    spawnObject(template) {
      const node = new Laya.Sprite();
      node.size(template.size, template.size);
      node.pivot(template.size / 2, template.size / 2);
      const label = new Laya.Label(`${template.icon}
${template.text}`);
      label.font = "Arial";
      label.fontSize = template.text.length > 7 ? 14 : 18;
      label.color = "#ffffff";
      label.align = "center";
      label.valign = "middle";
      label.leading = 2;
      label.width = template.size - 8;
      label.height = template.size - 8;
      label.pos(-template.size / 2 + 4, -template.size / 2 + 5);
      node.graphics.drawRect(-template.size / 2, -template.size / 2, template.size, template.size, template.fill, template.color, 4);
      node.addChild(label);
      this.itemLayer.addChild(node);
      const object = __spreadProps(__spreadValues({}, template), {
        x: this.rand(70, DESIGN_WIDTH - 70),
        y: -80,
        radius: template.size / 2,
        speed: this.rand(template.minSpeed, template.maxSpeed) + this.difficulty * 28,
        rotation: this.rand(-10, 10),
        node,
        dead: false
      });
      this.syncObjectNode(object);
      this.objects.push(object);
    }
    updateObjects(dt) {
      for (const object of this.objects) {
        object.y += object.speed * dt;
        object.rotation += dt * 45;
        this.syncObjectNode(object);
        if (this.hitPlayer(object)) {
          this.collectObject(object);
        }
      }
      const alive = [];
      for (const object of this.objects) {
        if (object.dead || object.y > DESIGN_HEIGHT + 100) {
          object.node.removeSelf();
          object.node.destroy();
        } else {
          alive.push(object);
        }
      }
      this.objects = alive;
    }
    syncObjectNode(object) {
      object.node.pos(object.x, object.y);
      object.node.rotation = object.rotation;
    }
    collectObject(object) {
      if (object.kind === "obstacle") {
        if (this.invincible > 0) {
          this.score += 20;
          this.spawnParticles(object.x, object.y, "#a855f7", 14);
        } else {
          this.hp -= object.damage || 1;
          this.shake = 0.22;
          this.spawnParticles(object.x, object.y, "#ef4444", 18);
          if (this.hp <= 0) {
            this.hp = 0;
            this.state = 2 /* Over */;
          }
        }
      } else {
        this.score += object.score || 0;
        if (object.heal) {
          this.hp = Math.min(this.maxHp, this.hp + object.heal);
        }
        if (object.invincible) {
          this.invincible = object.invincible;
        }
        this.spawnParticles(object.x, object.y, object.color, 16);
      }
      object.dead = true;
    }
    updateParticles(dt) {
      for (const particle of this.particles) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vy += 620 * dt;
      }
      this.particles = this.particles.filter((particle) => particle.life > 0);
    }
    spawnParticles(x, y, color, count) {
      for (let index = 0; index < count; index += 1) {
        this.particles.push({
          x,
          y,
          vx: this.rand(-220, 220),
          vy: this.rand(-280, 80),
          radius: this.rand(4, 9),
          life: this.rand(0.35, 0.75),
          color
        });
      }
    }
    render() {
      this.renderBackground();
      this.renderForeground();
      this.updateLabels();
    }
    renderBackground() {
      const graphics = this.background.graphics;
      graphics.clear();
      graphics.drawRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, "#0f172a");
      graphics.drawRect(0, DESIGN_HEIGHT * 0.55, DESIGN_WIDTH, DESIGN_HEIGHT * 0.45, "#111827");
      for (let index = 0; index < 16; index += 1) {
        const x = (index * 95 + Math.sin(this.time + index) * 20) % DESIGN_WIDTH;
        const y = (index * 121 + this.time * 26) % DESIGN_HEIGHT;
        graphics.drawRect(x, y, 50, 18, "rgba(59,130,246,0.10)");
      }
      for (let index = 0; index < 9; index += 1) {
        const y = index * 170 + this.time * 35 % 170 - 170;
        graphics.drawLine(0, y, DESIGN_WIDTH, y, "rgba(255,255,255,0.06)", 2);
      }
      graphics.drawRect(46, DESIGN_HEIGHT - 130, DESIGN_WIDTH - 92, 54, "#0b1220", "rgba(148,163,184,0.30)", 3);
    }
    renderForeground() {
      const graphics = this.foreground.graphics;
      graphics.clear();
      this.foreground.pos(this.shake > 0 ? this.rand(-8, 8) : 0, this.shake > 0 ? this.rand(-8, 8) : 0);
      if (this.state !== 0 /* Start */) {
        this.drawParticles(graphics);
        this.drawPlayer(graphics);
      }
      if (this.state === 0 /* Start */) {
        graphics.drawRect(110, 465, DESIGN_WIDTH - 220, 270, "rgba(15,23,42,0.82)", "rgba(148,163,184,0.26)", 4);
        graphics.drawRect(150, 820, DESIGN_WIDTH - 300, 92, "#facc15", "#f59e0b", 4);
      }
      if (this.state === 2 /* Over */) {
        graphics.drawRect(88, 350, DESIGN_WIDTH - 176, 520, "rgba(15,23,42,0.90)", "rgba(239,68,68,0.38)", 4);
        graphics.drawRect(150, 735, DESIGN_WIDTH - 300, 92, "#22c55e", "#16a34a", 4);
      }
    }
    drawParticles(graphics) {
      for (const particle of this.particles) {
        graphics.drawCircle(particle.x, particle.y, particle.radius, particle.color);
      }
    }
    drawPlayer(graphics) {
      const x = this.playerX;
      const y = this.playerY;
      if (this.invincible > 0) {
        graphics.drawCircle(x, y, 64 + Math.sin(this.time * 8) * 4, null, "rgba(168,85,247,0.65)", 8);
      }
      graphics.drawEllipse(x, y + 62, 58, 18, "rgba(0,0,0,0.32)");
      graphics.drawRect(x - 35, y - 2, 70, 80, this.invincible > 0 ? "#ddd6fe" : "#2563eb", "#0f172a", 4);
      graphics.drawCircle(x, y - 36, 38, "#f8caa2");
      graphics.drawCircle(x - 13, y - 32, 4, "#111827");
      graphics.drawCircle(x + 13, y - 32, 4, "#111827");
      graphics.drawLine(x - 14, y - 18, x + 14, y - 18, "#111827", 4);
    }
    updateLabels() {
      this.updateHudLabels();
      this.updateOverlayLabels();
    }
    updateHudLabels() {
      const active = this.state !== 0 /* Start */;
      this.setLabel(this.scoreLabel, DESIGN_WIDTH - 168, 60, 250, 44, `Score ${Math.floor(this.score)}`, active);
      this.setLabel(this.hpLabel, 116, 93, 180, 38, `HP ${"X".repeat(this.hp)}${"-".repeat(this.maxHp - this.hp)}`, active);
      this.setLabel(this.survivalLabel, DESIGN_WIDTH - 160, 99, 260, 36, `Time ${this.survival.toFixed(1)}s`, active);
      this.setLabel(this.invincibleLabel, DESIGN_WIDTH / 2, 98, 240, 36, this.invincible > 0 ? `Shield ${this.invincible.toFixed(1)}s` : "", active && this.invincible > 0);
    }
    updateOverlayLabels() {
      if (this.state === 0 /* Start */) {
        this.setLabel(this.titleLabel, DESIGN_WIDTH / 2, 315, 620, 86, "Bug Sprint", true);
        this.setLabel(this.subtitleLabel, DESIGN_WIDTH / 2, 370, 690, 50, "Dodge bugs, catch tools, ship the demo.", true);
        this.setLabel(this.bodyLabel, DESIGN_WIDTH / 2, 595, 560, 170, "How to play\nMove left and right to dodge bugs and scope changes.\nCollect coffee, keyboards, code, and review passes.\nLose all HP and the release fails.", true);
        this.setLabel(this.buttonLabel, DESIGN_WIDTH / 2, 878, 430, 80, "Tap To Start", true);
        return;
      }
      if (this.state === 2 /* Over */) {
        this.setLabel(this.titleLabel, DESIGN_WIDTH / 2, 440, 620, 86, "Release Failed", true);
        this.setLabel(this.subtitleLabel, DESIGN_WIDTH / 2, 535, 620, 56, `Final Score: ${Math.floor(this.score)}`, true);
        this.setLabel(this.bodyLabel, DESIGN_WIDTH / 2, 625, 560, 130, `Survived: ${this.survival.toFixed(1)} seconds
The boss says: one tiny change before morning.`, true);
        this.setLabel(this.buttonLabel, DESIGN_WIDTH / 2, 793, 430, 80, "Run Again", true);
        return;
      }
      this.setLabel(this.titleLabel, 0, 0, 0, 0, "", false);
      this.setLabel(this.subtitleLabel, 0, 0, 0, 0, "", false);
      this.setLabel(this.bodyLabel, 0, 0, 0, 0, "", false);
      this.setLabel(this.buttonLabel, 0, 0, 0, 0, "", false);
    }
    setLabel(label, centerX, centerY, width, height, text, visible) {
      label.text = text;
      label.width = width;
      label.height = height;
      label.pos(centerX - width / 2, centerY - height / 2);
      label.visible = visible;
    }
    hitPlayer(object) {
      const dx = this.playerX - object.x;
      const dy = this.playerY - object.y;
      const distance = this.playerRadius + object.radius;
      return dx * dx + dy * dy < distance * distance;
    }
    updateBenchmark(dt) {
      this.fpsFrames += 1;
      this.fpsElapsed += dt;
      if (this.fpsElapsed >= 1) {
        const fps = this.fpsFrames / this.fpsElapsed;
        this.fpsSamples.push(fps);
        if (this.fpsSamples.length > 30) {
          this.fpsSamples.shift();
        }
        this.fpsFrames = 0;
        this.fpsElapsed = 0;
        this.publishBenchmark();
      }
    }
    resetBenchmark() {
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
      this.fpsSamples.length = 0;
      this.publishBenchmark();
    }
    publishBenchmark() {
      const avgFps = this.fpsSamples.length > 0 ? this.round(this.fpsSamples.reduce((sum, value) => sum + value, 0) / this.fpsSamples.length, 2) : null;
      const minFps = this.fpsSamples.length > 0 ? this.round(Math.min(...this.fpsSamples), 2) : null;
      window.__BENCHMARK__ = {
        avgFps,
        minFps,
        objectCount: this.objects.length + this.particles.length
      };
    }
    rand(min, max) {
      return Math.random() * (max - min) + min;
    }
    pick(items) {
      return items[Math.floor(Math.random() * items.length)];
    }
    clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }
    round(value, places) {
      const factor = __pow(10, places);
      return Math.round(value * factor) / factor;
    }
    destroy() {
      Laya.timer.clear(this, this.loop);
      Laya.stage.off(Laya.Event.MOUSE_DOWN, this, this.onPointerDown);
      Laya.stage.off(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
      Laya.stage.off(Laya.Event.MOUSE_UP, this, this.onPointerUp);
      Laya.stage.off(Laya.Event.MOUSE_OUT, this, this.onPointerUp);
      Laya.stage.off(Laya.Event.KEY_DOWN, this, this.onKeyDown);
      this.clearObjects();
      this.particles.length = 0;
      if (this.root) {
        this.root.removeSelf();
        this.root.destroy(true);
        this.root = null;
      }
    }
  };
  __name(_BugSprintLayaGame, "BugSprintLayaGame");
  var BugSprintLayaGame = _BugSprintLayaGame;
  var activeGame = null;
  function configureStage() {
    Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL || "showall";
    Laya.stage.screenMode = Laya.Stage.SCREEN_VERTICAL || "vertical";
    Laya.stage.alignH = Laya.Stage.ALIGN_CENTER || "center";
    Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE || "middle";
    Laya.stage.bgColor = "#111827";
  }
  __name(configureStage, "configureStage");
  function startGame() {
    configureStage();
    if (activeGame) {
      activeGame.destroy();
    }
    activeGame = new BugSprintLayaGame();
    return activeGame;
  }
  __name(startGame, "startGame");
  var Main = class extends Laya.Script {
    constructor() {
      super(...arguments);
      this.game = null;
    }
    onStart() {
      this.game = startGame();
    }
    onDestroy() {
      if (this.game) {
        this.game.destroy();
        if (activeGame === this.game) {
          activeGame = null;
        }
        this.game = null;
      }
    }
  };
  __name(Main, "Main");
  Main = __decorateClass([
    regClass("97ad607a-038f-4363-bf20-555cba17a62f", "../src/Main.ts")
  ], Main);
  function boot() {
    if (typeof Laya === "undefined") {
      const missing = document.getElementById("missing-laya");
      if (missing) {
        missing.style.display = "grid";
      }
      return;
    }
    const initResult = Laya.init(DESIGN_WIDTH, DESIGN_HEIGHT);
    const start = /* @__PURE__ */ __name(() => startGame(), "start");
    if (initResult && typeof initResult.then === "function") {
      initResult.then(start);
    } else {
      start();
    }
  }
  __name(boot, "boot");
  if (typeof document !== "undefined" && document.getElementById("missing-laya")) {
    boot();
  }
})();
//# sourceMappingURL=bundle.js.map
