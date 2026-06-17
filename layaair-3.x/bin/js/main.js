(function () {
  var DESIGN_WIDTH = 750;
  var DESIGN_HEIGHT = 1334;
  var GameState = { Start: 0, Playing: 1, Over: 2 };

  var OBSTACLES = [
    { kind: 'obstacle', text: 'Bug', icon: 'BUG', color: '#ef4444', fill: '#7f1d1d', damage: 1, size: 70, minSpeed: 280, maxSpeed: 390 },
    { kind: 'obstacle', text: 'Change', icon: 'REQ', color: '#f97316', fill: '#7c2d12', damage: 1, size: 74, minSpeed: 280, maxSpeed: 390 },
    { kind: 'obstacle', text: 'ASAP', icon: 'NOW', color: '#eab308', fill: '#713f12', damage: 1, size: 70, minSpeed: 290, maxSpeed: 410 },
    { kind: 'obstacle', text: 'Prod Err', icon: 'ERR', color: '#dc2626', fill: '#7f1d1d', damage: 2, size: 82, minSpeed: 310, maxSpeed: 430 }
  ];

  var PROPS = [
    { kind: 'prop', text: 'Coffee', icon: 'COF', color: '#f59e0b', fill: '#78350f', heal: 1, score: 0, size: 66, minSpeed: 230, maxSpeed: 310 },
    { kind: 'prop', text: 'Keyboard', icon: 'KEY', color: '#22c55e', fill: '#14532d', score: 100, size: 66, minSpeed: 230, maxSpeed: 310 },
    { kind: 'prop', text: 'Code', icon: '</>', color: '#38bdf8', fill: '#164e63', score: 50, size: 66, minSpeed: 230, maxSpeed: 310 },
    { kind: 'prop', text: 'Review OK', icon: 'OK', color: '#a855f7', fill: '#581c87', invincible: 3, score: 150, size: 72, minSpeed: 240, maxSpeed: 320 }
  ];

  function BugSprintLayaGame() {
    this.state = GameState.Start;
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

    var self = this;
    setTimeout(function () {
      window.__GAME_READY__ = true;
      self.publishBenchmark();
    }, 0);
  }

  BugSprintLayaGame.prototype.createLayers = function () {
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
  };

  BugSprintLayaGame.prototype.createLabels = function () {
    this.titleLabel = this.createLabel(72, '#ffffff', 86);
    this.subtitleLabel = this.createLabel(30, '#facc15', 50);
    this.bodyLabel = this.createLabel(25, '#e5e7eb', 36);
    this.buttonLabel = this.createLabel(34, '#111827', 80);
    this.scoreLabel = this.createLabel(28, '#facc15', 44);
    this.hpLabel = this.createLabel(28, '#f87171', 38);
    this.survivalLabel = this.createLabel(22, '#e5e7eb', 36);
    this.invincibleLabel = this.createLabel(22, '#d8b4fe', 36);
  };

  BugSprintLayaGame.prototype.createLabel = function (fontSize, color, lineHeight) {
    var label = new Laya.Label();
    label.font = 'Arial';
    label.fontSize = fontSize;
    label.color = color;
    label.align = 'center';
    label.valign = 'middle';
    label.leading = 6;
    label.height = lineHeight;
    label.visible = false;
    this.uiLayer.addChild(label);
    return label;
  };

  BugSprintLayaGame.prototype.registerInput = function () {
    Laya.stage.on(Laya.Event.MOUSE_DOWN, this, this.onPointerDown);
    Laya.stage.on(Laya.Event.MOUSE_MOVE, this, this.onPointerMove);
    Laya.stage.on(Laya.Event.MOUSE_UP, this, this.onPointerUp);
    Laya.stage.on(Laya.Event.MOUSE_OUT, this, this.onPointerUp);
    Laya.stage.on(Laya.Event.KEY_DOWN, this, this.onKeyDown);
  };

  BugSprintLayaGame.prototype.loop = function () {
    var dt = Math.min((Laya.timer.delta || 16.67) / 1000, 0.033);
    this.updateBenchmark(dt);
    if (this.state === GameState.Playing) {
      this.updatePlaying(dt);
    }
    this.render();
  };

  BugSprintLayaGame.prototype.onPointerDown = function () {
    this.pointerDown = true;
    if (this.state !== GameState.Playing) {
      this.resetGame();
    }
    this.playerTargetX = this.clamp(Laya.stage.mouseX, 60, DESIGN_WIDTH - 60);
  };

  BugSprintLayaGame.prototype.onPointerMove = function () {
    if (this.pointerDown && this.state === GameState.Playing) {
      this.playerTargetX = this.clamp(Laya.stage.mouseX, 60, DESIGN_WIDTH - 60);
    }
  };

  BugSprintLayaGame.prototype.onPointerUp = function () {
    this.pointerDown = false;
  };

  BugSprintLayaGame.prototype.onKeyDown = function (event) {
    var space = Laya.Keyboard ? Laya.Keyboard.SPACE : 32;
    var left = Laya.Keyboard ? Laya.Keyboard.LEFT : 37;
    var right = Laya.Keyboard ? Laya.Keyboard.RIGHT : 39;
    var keyA = Laya.Keyboard ? Laya.Keyboard.A : 65;
    var keyD = Laya.Keyboard ? Laya.Keyboard.D : 68;

    if (event.keyCode === space && this.state !== GameState.Playing) {
      this.resetGame();
      return;
    }
    if (this.state !== GameState.Playing) {
      return;
    }
    if (event.keyCode === left || event.keyCode === keyA) {
      this.playerTargetX = this.clamp(this.playerTargetX - 80, 60, DESIGN_WIDTH - 60);
    }
    if (event.keyCode === right || event.keyCode === keyD) {
      this.playerTargetX = this.clamp(this.playerTargetX + 80, 60, DESIGN_WIDTH - 60);
    }
  };

  BugSprintLayaGame.prototype.resetGame = function () {
    this.clearObjects();
    this.state = GameState.Playing;
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
  };

  BugSprintLayaGame.prototype.clearObjects = function () {
    for (var index = 0; index < this.objects.length; index += 1) {
      this.objects[index].node.removeSelf();
      this.objects[index].node.destroy();
    }
    this.objects.length = 0;
  };

  BugSprintLayaGame.prototype.updatePlaying = function (dt) {
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
  };

  BugSprintLayaGame.prototype.updateSpawns = function (dt) {
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
  };

  BugSprintLayaGame.prototype.spawnObject = function (template) {
    var node = new Laya.Sprite();
    node.size(template.size, template.size);
    node.pivot(template.size / 2, template.size / 2);

    var label = new Laya.Label(template.icon + '\n' + template.text);
    label.font = 'Arial';
    label.fontSize = template.text.length > 7 ? 14 : 18;
    label.color = '#ffffff';
    label.align = 'center';
    label.valign = 'middle';
    label.leading = 2;
    label.width = template.size - 8;
    label.height = template.size - 8;
    label.pos(-template.size / 2 + 4, -template.size / 2 + 5);

    node.graphics.drawRect(-template.size / 2, -template.size / 2, template.size, template.size, template.fill, template.color, 4);
    node.addChild(label);
    this.itemLayer.addChild(node);

    var object = Object.assign({}, template, {
      x: this.rand(70, DESIGN_WIDTH - 70),
      y: -80,
      radius: template.size / 2,
      speed: this.rand(template.minSpeed, template.maxSpeed) + this.difficulty * 28,
      rotation: this.rand(-10, 10),
      node: node,
      dead: false
    });

    this.syncObjectNode(object);
    this.objects.push(object);
  };

  BugSprintLayaGame.prototype.updateObjects = function (dt) {
    for (var index = 0; index < this.objects.length; index += 1) {
      var object = this.objects[index];
      object.y += object.speed * dt;
      object.rotation += dt * 45;
      this.syncObjectNode(object);
      if (this.hitPlayer(object)) {
        this.collectObject(object);
      }
    }

    var alive = [];
    for (var aliveIndex = 0; aliveIndex < this.objects.length; aliveIndex += 1) {
      var item = this.objects[aliveIndex];
      if (item.dead || item.y > DESIGN_HEIGHT + 100) {
        item.node.removeSelf();
        item.node.destroy();
      } else {
        alive.push(item);
      }
    }
    this.objects = alive;
  };

  BugSprintLayaGame.prototype.syncObjectNode = function (object) {
    object.node.pos(object.x, object.y);
    object.node.rotation = object.rotation;
  };

  BugSprintLayaGame.prototype.collectObject = function (object) {
    if (object.kind === 'obstacle') {
      if (this.invincible > 0) {
        this.score += 20;
        this.spawnParticles(object.x, object.y, '#a855f7', 14);
      } else {
        this.hp -= object.damage || 1;
        this.shake = 0.22;
        this.spawnParticles(object.x, object.y, '#ef4444', 18);
        if (this.hp <= 0) {
          this.hp = 0;
          this.state = GameState.Over;
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
  };

  BugSprintLayaGame.prototype.updateParticles = function (dt) {
    for (var index = 0; index < this.particles.length; index += 1) {
      var particle = this.particles[index];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 620 * dt;
    }
    this.particles = this.particles.filter(function (particle) {
      return particle.life > 0;
    });
  };

  BugSprintLayaGame.prototype.spawnParticles = function (x, y, color, count) {
    for (var index = 0; index < count; index += 1) {
      this.particles.push({
        x: x,
        y: y,
        vx: this.rand(-220, 220),
        vy: this.rand(-280, 80),
        radius: this.rand(4, 9),
        life: this.rand(0.35, 0.75),
        color: color
      });
    }
  };

  BugSprintLayaGame.prototype.render = function () {
    this.renderBackground();
    this.renderForeground();
    this.updateLabels();
  };

  BugSprintLayaGame.prototype.renderBackground = function () {
    var graphics = this.background.graphics;
    graphics.clear();
    graphics.drawRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, '#0f172a');
    graphics.drawRect(0, DESIGN_HEIGHT * 0.55, DESIGN_WIDTH, DESIGN_HEIGHT * 0.45, '#111827');

    for (var index = 0; index < 16; index += 1) {
      var x = (index * 95 + Math.sin(this.time + index) * 20) % DESIGN_WIDTH;
      var y = (index * 121 + this.time * 26) % DESIGN_HEIGHT;
      graphics.drawRect(x, y, 50, 18, 'rgba(59,130,246,0.10)');
    }

    for (var lineIndex = 0; lineIndex < 9; lineIndex += 1) {
      var lineY = (lineIndex * 170 + (this.time * 35) % 170) - 170;
      graphics.drawLine(0, lineY, DESIGN_WIDTH, lineY, 'rgba(255,255,255,0.06)', 2);
    }

    graphics.drawRect(46, DESIGN_HEIGHT - 130, DESIGN_WIDTH - 92, 54, '#0b1220', 'rgba(148,163,184,0.30)', 3);
  };

  BugSprintLayaGame.prototype.renderForeground = function () {
    var graphics = this.foreground.graphics;
    graphics.clear();
    this.foreground.pos(this.shake > 0 ? this.rand(-8, 8) : 0, this.shake > 0 ? this.rand(-8, 8) : 0);

    if (this.state !== GameState.Start) {
      this.drawParticles(graphics);
      this.drawPlayer(graphics);
    }

    if (this.state === GameState.Start) {
      graphics.drawRect(110, 465, DESIGN_WIDTH - 220, 270, 'rgba(15,23,42,0.82)', 'rgba(148,163,184,0.26)', 4);
      graphics.drawRect(150, 820, DESIGN_WIDTH - 300, 92, '#facc15', '#f59e0b', 4);
    }

    if (this.state === GameState.Over) {
      graphics.drawRect(88, 350, DESIGN_WIDTH - 176, 520, 'rgba(15,23,42,0.90)', 'rgba(239,68,68,0.38)', 4);
      graphics.drawRect(150, 735, DESIGN_WIDTH - 300, 92, '#22c55e', '#16a34a', 4);
    }
  };

  BugSprintLayaGame.prototype.drawParticles = function (graphics) {
    for (var index = 0; index < this.particles.length; index += 1) {
      var particle = this.particles[index];
      graphics.drawCircle(particle.x, particle.y, particle.radius, particle.color);
    }
  };

  BugSprintLayaGame.prototype.drawPlayer = function (graphics) {
    var x = this.playerX;
    var y = this.playerY;

    if (this.invincible > 0) {
      graphics.drawCircle(x, y, 64 + Math.sin(this.time * 8) * 4, null, 'rgba(168,85,247,0.65)', 8);
    }

    graphics.drawEllipse(x, y + 62, 58, 18, 'rgba(0,0,0,0.32)');
    graphics.drawRect(x - 35, y - 2, 70, 80, this.invincible > 0 ? '#ddd6fe' : '#2563eb', '#0f172a', 4);
    graphics.drawCircle(x, y - 36, 38, '#f8caa2');
    graphics.drawCircle(x - 13, y - 32, 4, '#111827');
    graphics.drawCircle(x + 13, y - 32, 4, '#111827');
    graphics.drawLine(x - 14, y - 18, x + 14, y - 18, '#111827', 4);
  };

  BugSprintLayaGame.prototype.updateLabels = function () {
    this.updateHudLabels();
    this.updateOverlayLabels();
  };

  BugSprintLayaGame.prototype.updateHudLabels = function () {
    var active = this.state !== GameState.Start;
    this.setLabel(this.scoreLabel, DESIGN_WIDTH - 168, 60, 250, 44, 'Score ' + Math.floor(this.score), active);
    this.setLabel(this.hpLabel, 116, 93, 180, 38, 'HP ' + 'X'.repeat(this.hp) + '-'.repeat(this.maxHp - this.hp), active);
    this.setLabel(this.survivalLabel, DESIGN_WIDTH - 160, 99, 260, 36, 'Time ' + this.survival.toFixed(1) + 's', active);
    this.setLabel(this.invincibleLabel, DESIGN_WIDTH / 2, 98, 240, 36, this.invincible > 0 ? 'Shield ' + this.invincible.toFixed(1) + 's' : '', active && this.invincible > 0);
  };

  BugSprintLayaGame.prototype.updateOverlayLabels = function () {
    if (this.state === GameState.Start) {
      this.setLabel(this.titleLabel, DESIGN_WIDTH / 2, 315, 620, 86, 'Bug Sprint', true);
      this.setLabel(this.subtitleLabel, DESIGN_WIDTH / 2, 370, 690, 50, 'Dodge bugs, catch tools, ship the demo.', true);
      this.setLabel(this.bodyLabel, DESIGN_WIDTH / 2, 595, 560, 170, 'How to play\nMove left and right to dodge bugs and scope changes.\nCollect coffee, keyboards, code, and review passes.\nLose all HP and the release fails.', true);
      this.setLabel(this.buttonLabel, DESIGN_WIDTH / 2, 878, 430, 80, 'Tap To Start', true);
      return;
    }

    if (this.state === GameState.Over) {
      this.setLabel(this.titleLabel, DESIGN_WIDTH / 2, 440, 620, 86, 'Release Failed', true);
      this.setLabel(this.subtitleLabel, DESIGN_WIDTH / 2, 535, 620, 56, 'Final Score: ' + Math.floor(this.score), true);
      this.setLabel(this.bodyLabel, DESIGN_WIDTH / 2, 625, 560, 130, 'Survived: ' + this.survival.toFixed(1) + ' seconds\nThe boss says: one tiny change before morning.', true);
      this.setLabel(this.buttonLabel, DESIGN_WIDTH / 2, 793, 430, 80, 'Run Again', true);
      return;
    }

    this.setLabel(this.titleLabel, 0, 0, 0, 0, '', false);
    this.setLabel(this.subtitleLabel, 0, 0, 0, 0, '', false);
    this.setLabel(this.bodyLabel, 0, 0, 0, 0, '', false);
    this.setLabel(this.buttonLabel, 0, 0, 0, 0, '', false);
  };

  BugSprintLayaGame.prototype.setLabel = function (label, centerX, centerY, width, height, text, visible) {
    label.text = text;
    label.width = width;
    label.height = height;
    label.pos(centerX - width / 2, centerY - height / 2);
    label.visible = visible;
  };

  BugSprintLayaGame.prototype.hitPlayer = function (object) {
    var dx = this.playerX - object.x;
    var dy = this.playerY - object.y;
    var distance = this.playerRadius + object.radius;
    return dx * dx + dy * dy < distance * distance;
  };

  BugSprintLayaGame.prototype.updateBenchmark = function (dt) {
    this.fpsFrames += 1;
    this.fpsElapsed += dt;

    if (this.fpsElapsed >= 1) {
      var fps = this.fpsFrames / this.fpsElapsed;
      this.fpsSamples.push(fps);
      if (this.fpsSamples.length > 30) {
        this.fpsSamples.shift();
      }
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
      this.publishBenchmark();
    }
  };

  BugSprintLayaGame.prototype.resetBenchmark = function () {
    this.fpsFrames = 0;
    this.fpsElapsed = 0;
    this.fpsSamples.length = 0;
    this.publishBenchmark();
  };

  BugSprintLayaGame.prototype.publishBenchmark = function () {
    var avgFps = this.fpsSamples.length > 0
      ? this.round(this.fpsSamples.reduce(function (sum, value) { return sum + value; }, 0) / this.fpsSamples.length, 2)
      : null;
    var minFps = this.fpsSamples.length > 0
      ? this.round(Math.min.apply(Math, this.fpsSamples), 2)
      : null;

    window.__BENCHMARK__ = {
      avgFps: avgFps,
      minFps: minFps,
      objectCount: this.objects.length + this.particles.length
    };
  };

  BugSprintLayaGame.prototype.rand = function (min, max) {
    return Math.random() * (max - min) + min;
  };

  BugSprintLayaGame.prototype.pick = function (items) {
    return items[Math.floor(Math.random() * items.length)];
  };

  BugSprintLayaGame.prototype.clamp = function (value, min, max) {
    return Math.max(min, Math.min(max, value));
  };

  BugSprintLayaGame.prototype.round = function (value, places) {
    var factor = Math.pow(10, places);
    return Math.round(value * factor) / factor;
  };

  function boot() {
    if (typeof window.Laya === 'undefined') {
      var missing = document.getElementById('missing-laya');
      if (missing) {
        missing.style.display = 'grid';
      }
      return;
    }

    var initResult = Laya.init(DESIGN_WIDTH, DESIGN_HEIGHT);
    var start = function () {
      Laya.stage.scaleMode = Laya.Stage.SCALE_SHOWALL || 'showall';
      Laya.stage.screenMode = Laya.Stage.SCREEN_VERTICAL || 'vertical';
      Laya.stage.alignH = Laya.Stage.ALIGN_CENTER || 'center';
      Laya.stage.alignV = Laya.Stage.ALIGN_MIDDLE || 'middle';
      Laya.stage.bgColor = '#111827';
      new BugSprintLayaGame();
    };

    if (initResult && typeof initResult.then === 'function') {
      initResult.then(start);
    } else {
      start();
    }
  }

  boot();
})();
