import {
  _decorator,
  Color,
  Component,
  EventKeyboard,
  EventMouse,
  EventTouch,
  Graphics,
  Input,
  input,
  KeyCode,
  Label,
  Layers,
  Node,
  ResolutionPolicy,
  UITransform,
  Vec3,
  view
} from 'cc';

const { ccclass } = _decorator;

const DESIGN_WIDTH = 750;
const DESIGN_HEIGHT = 1334;

enum GameState {
  Start,
  Playing,
  Over
}

type FallingKind = 'obstacle' | 'prop';

type FallingTemplate = {
  kind: FallingKind;
  text: string;
  icon: string;
  color: Color;
  damage?: number;
  score?: number;
  heal?: number;
  invincible?: number;
  size: number;
  minSpeed: number;
  maxSpeed: number;
};

type FallingObject = FallingTemplate & {
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  node: Node;
  graphics: Graphics;
  label: Label;
  dead: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: Color;
};

type BenchmarkWindow = typeof globalThis & {
  __GAME_READY__?: boolean;
  __BENCHMARK__?: {
    avgFps: number | null;
    minFps: number | null;
    objectCount: number;
  };
};

const OBSTACLES: FallingTemplate[] = [
  {
    kind: 'obstacle',
    text: 'Bug',
    icon: 'BUG',
    color: new Color(239, 68, 68, 255),
    damage: 1,
    size: 70,
    minSpeed: 280,
    maxSpeed: 390
  },
  {
    kind: 'obstacle',
    text: '需求变更',
    icon: 'REQ',
    color: new Color(249, 115, 22, 255),
    damage: 1,
    size: 74,
    minSpeed: 280,
    maxSpeed: 390
  },
  {
    kind: 'obstacle',
    text: '加急',
    icon: 'ASAP',
    color: new Color(234, 179, 8, 255),
    damage: 1,
    size: 70,
    minSpeed: 290,
    maxSpeed: 410
  },
  {
    kind: 'obstacle',
    text: '线上报错',
    icon: 'ERR',
    color: new Color(220, 38, 38, 255),
    damage: 2,
    size: 82,
    minSpeed: 310,
    maxSpeed: 430
  }
];

const PROPS: FallingTemplate[] = [
  {
    kind: 'prop',
    text: '咖啡',
    icon: 'COF',
    color: new Color(161, 98, 7, 255),
    heal: 1,
    score: 0,
    size: 66,
    minSpeed: 230,
    maxSpeed: 310
  },
  {
    kind: 'prop',
    text: '键盘',
    icon: 'KEY',
    color: new Color(34, 197, 94, 255),
    score: 100,
    size: 66,
    minSpeed: 230,
    maxSpeed: 310
  },
  {
    kind: 'prop',
    text: '代码块',
    icon: '</>',
    color: new Color(56, 189, 248, 255),
    score: 50,
    size: 66,
    minSpeed: 230,
    maxSpeed: 310
  },
  {
    kind: 'prop',
    text: '提审通过',
    icon: 'OK',
    color: new Color(168, 85, 247, 255),
    invincible: 3,
    score: 150,
    size: 72,
    minSpeed: 240,
    maxSpeed: 320
  }
];

@ccclass('BugSprintGame')
export class BugSprintGame extends Component {
  private backgroundGraphics: Graphics | null = null;
  private foregroundGraphics: Graphics | null = null;
  private itemLayer: Node | null = null;
  private uiLayer: Node | null = null;

  private titleLabel: Label | null = null;
  private subtitleLabel: Label | null = null;
  private bodyLabel: Label | null = null;
  private buttonLabel: Label | null = null;
  private scoreLabel: Label | null = null;
  private hpLabel: Label | null = null;
  private survivalLabel: Label | null = null;
  private invincibleLabel: Label | null = null;

  private state = GameState.Start;
  private time = 0;
  private score = 0;
  private hp = 3;
  private maxHp = 3;
  private survival = 0;
  private obstacleTimer = 0;
  private propTimer = 1.2;
  private difficulty = 1;
  private invincible = 0;
  private shake = 0;
  private pointerDown = false;

  private playerX = DESIGN_WIDTH / 2;
  private playerY = DESIGN_HEIGHT - 190;
  private playerTargetX = DESIGN_WIDTH / 2;
  private playerRadius = 44;

  private objects: FallingObject[] = [];
  private particles: Particle[] = [];

  private fpsFrames = 0;
  private fpsElapsed = 0;
  private fpsSamples: number[] = [];

  onLoad() {
    view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.SHOW_ALL);
    this.ensureLayers();
    this.registerInput();
    this.resetBenchmark();
  }

  start() {
    this.scheduleOnce(() => {
      (globalThis as BenchmarkWindow).__GAME_READY__ = true;
      this.publishBenchmark();
    }, 0);
  }

  onDestroy() {
    input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  update(dt: number) {
    const safeDt = Math.min(dt, 0.033);

    this.updateBenchmark(safeDt);

    if (this.state === GameState.Playing) {
      this.updatePlaying(safeDt);
    }

    this.render();
  }

  private ensureLayers() {
    const transform = this.node.getComponent(UITransform) || this.node.addComponent(UITransform);
    transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    transform.setAnchorPoint(0.5, 0.5);
    this.setUiLayer(this.node);

    const background = this.createLayer('BackgroundLayer');
    this.backgroundGraphics = background.addComponent(Graphics);

    this.itemLayer = this.createLayer('ItemLayer');

    const foreground = this.createLayer('ForegroundLayer');
    this.foregroundGraphics = foreground.addComponent(Graphics);

    this.uiLayer = this.createLayer('UILayer');
    this.createLabels();
  }

  private createLayer(name: string) {
    const layer = new Node(name);
    this.setUiLayer(layer);
    const transform = layer.addComponent(UITransform);
    transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
    transform.setAnchorPoint(0.5, 0.5);
    this.node.addChild(layer);
    return layer;
  }

  private createLabels() {
    this.titleLabel = this.createLabel('Title', 72, new Color(255, 255, 255, 255));
    this.subtitleLabel = this.createLabel('Subtitle', 30, new Color(250, 204, 21, 255));
    this.bodyLabel = this.createLabel('Body', 25, new Color(229, 231, 235, 255), 36);
    this.buttonLabel = this.createLabel('Button', 34, new Color(17, 24, 39, 255));

    this.scoreLabel = this.createLabel('Score', 28, new Color(250, 204, 21, 255));
    this.hpLabel = this.createLabel('HP', 28, new Color(248, 113, 113, 255));
    this.survivalLabel = this.createLabel('Survival', 22, new Color(229, 231, 235, 255));
    this.invincibleLabel = this.createLabel('Invincible', 22, new Color(216, 180, 254, 255));
  }

  private createLabel(name: string, fontSize: number, color: Color, lineHeight = fontSize + 8) {
    const node = new Node(name);
    this.setUiLayer(node);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(600, 80);
    transform.setAnchorPoint(0.5, 0.5);
    this.uiLayer!.addChild(node);

    const label = node.addComponent(Label);
    label.fontSize = fontSize;
    label.lineHeight = lineHeight;
    label.color = color;
    label.string = '';

    return label;
  }

  private registerInput() {
    input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
    input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  private onTouchStart(event: EventTouch) {
    this.pointerDown = true;
    if (this.state !== GameState.Playing) {
      this.resetGame();
    }
    this.playerTargetX = this.pointerToGameX(event);
  }

  private onTouchMove(event: EventTouch) {
    if (this.pointerDown && this.state === GameState.Playing) {
      this.playerTargetX = this.pointerToGameX(event);
    }
  }

  private onTouchEnd() {
    this.pointerDown = false;
  }

  private onMouseDown(event: EventMouse) {
    this.pointerDown = true;
    if (this.state !== GameState.Playing) {
      this.resetGame();
    }
    this.playerTargetX = this.pointerToGameX(event);
  }

  private onMouseMove(event: EventMouse) {
    if (this.pointerDown && this.state === GameState.Playing) {
      this.playerTargetX = this.pointerToGameX(event);
    }
  }

  private onMouseUp() {
    this.pointerDown = false;
  }

  private onKeyDown(event: EventKeyboard) {
    if (event.keyCode === KeyCode.SPACE && this.state !== GameState.Playing) {
      this.resetGame();
      return;
    }

    if (this.state !== GameState.Playing) {
      return;
    }

    if (event.keyCode === KeyCode.ARROW_LEFT || event.keyCode === KeyCode.KEY_A) {
      this.playerTargetX = this.clamp(this.playerTargetX - 80, 60, DESIGN_WIDTH - 60);
    }

    if (event.keyCode === KeyCode.ARROW_RIGHT || event.keyCode === KeyCode.KEY_D) {
      this.playerTargetX = this.clamp(this.playerTargetX + 80, 60, DESIGN_WIDTH - 60);
    }
  }

  private pointerToGameX(event: EventTouch | EventMouse) {
    const transform = this.node.getComponent(UITransform)!;
    const location = event.getUILocation();
    const local = transform.convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
    return this.clamp(local.x + DESIGN_WIDTH / 2, 60, DESIGN_WIDTH - 60);
  }

  private resetGame() {
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
  }

  private clearObjects() {
    for (const object of this.objects) {
      object.node.destroy();
    }
    this.objects.length = 0;
  }

  private updatePlaying(dt: number) {
    this.time += dt;
    this.survival += dt;
    this.score += dt * 10;
    this.difficulty = 1 + Math.floor(this.survival / 15) * 0.45;

    if (this.invincible > 0) {
      this.invincible = Math.max(0, this.invincible - dt);
    }

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
    }

    this.playerX += (this.playerTargetX - this.playerX) * this.clamp(dt * 12, 0, 1);
    this.playerX = this.clamp(this.playerX, 60, DESIGN_WIDTH - 60);

    this.updateSpawns(dt);
    this.updateObjects(dt);
    this.updateParticles(dt);
  }

  private updateSpawns(dt: number) {
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

  private spawnObject(template: FallingTemplate) {
    const node = new Node(template.kind === 'obstacle' ? 'Obstacle' : 'Prop');
    this.setUiLayer(node);
    const transform = node.addComponent(UITransform);
    transform.setContentSize(template.size, template.size);
    transform.setAnchorPoint(0.5, 0.5);
    this.itemLayer!.addChild(node);

    const graphics = node.addComponent(Graphics);
    const labelNode = new Node('Label');
    this.setUiLayer(labelNode);
    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setContentSize(template.size - 8, template.size - 8);
    labelTransform.setAnchorPoint(0.5, 0.5);
    node.addChild(labelNode);

    const label = labelNode.addComponent(Label);
    label.fontSize = template.icon.length > 3 ? 15 : 18;
    label.lineHeight = 22;
    label.color = new Color(255, 255, 255, 255);
    label.string = `${template.icon}\n${template.text}`;

    const object: FallingObject = {
      ...template,
      x: this.rand(70, DESIGN_WIDTH - 70),
      y: -80,
      radius: template.size / 2,
      speed: this.rand(template.minSpeed, template.maxSpeed) + this.difficulty * 28,
      rotation: this.rand(-0.18, 0.18),
      node,
      graphics,
      label,
      dead: false
    };

    this.drawObjectSkin(object);
    this.syncObjectNode(object);
    this.objects.push(object);
  }

  private drawObjectSkin(object: FallingObject) {
    const graphics = object.graphics;
    const half = object.size / 2;
    const fill = object.kind === 'obstacle'
      ? new Color(127, 29, 29, 245)
      : new Color(20, 83, 45, 245);

    graphics.clear();
    graphics.fillColor = fill;
    graphics.roundRect(-half, -half, object.size, object.size, 16);
    graphics.fill();
    graphics.strokeColor = object.color;
    graphics.lineWidth = 4;
    graphics.roundRect(-half, -half, object.size, object.size, 16);
    graphics.stroke();
  }

  private updateObjects(dt: number) {
    for (const object of this.objects) {
      object.y += object.speed * dt;
      object.rotation += dt * 0.8;
      this.syncObjectNode(object);

      if (this.hitPlayer(object)) {
        this.collectObject(object);
      }
    }

    const alive: FallingObject[] = [];
    for (const object of this.objects) {
      if (object.dead || object.y > DESIGN_HEIGHT + 100) {
        object.node.destroy();
      } else {
        alive.push(object);
      }
    }
    this.objects = alive;
  }

  private syncObjectNode(object: FallingObject) {
    object.node.setPosition(this.toLocalX(object.x), this.toLocalY(object.y));
    object.node.setRotationFromEuler(0, 0, object.rotation * 57.2958);
  }

  private collectObject(object: FallingObject) {
    if (object.kind === 'obstacle') {
      if (this.invincible > 0) {
        this.score += 20;
        this.spawnParticles(object.x, object.y, new Color(168, 85, 247, 255), 14);
      } else {
        this.hp -= object.damage || 1;
        this.shake = 0.22;
        this.spawnParticles(object.x, object.y, new Color(239, 68, 68, 255), 18);
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
  }

  private updateParticles(dt: number) {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 620 * dt;
    }

    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private spawnParticles(x: number, y: number, color: Color, count: number) {
    for (let index = 0; index < count; index += 1) {
      this.particles.push({
        x,
        y,
        vx: this.rand(-220, 220),
        vy: this.rand(-280, 80),
        radius: this.rand(4, 9),
        life: this.rand(0.35, 0.75),
        maxLife: 0.75,
        color
      });
    }
  }

  private render() {
    this.renderBackground();
    this.renderForeground();
    this.updateLabels();
  }

  private renderBackground() {
    const graphics = this.backgroundGraphics!;
    graphics.clear();

    this.drawRect(graphics, 0, 0, DESIGN_WIDTH, DESIGN_HEIGHT, 0, new Color(15, 23, 42, 255));
    this.drawRect(graphics, 0, DESIGN_HEIGHT * 0.55, DESIGN_WIDTH, DESIGN_HEIGHT * 0.45, 0, new Color(17, 24, 39, 255));

    graphics.fillColor = new Color(59, 130, 246, 24);
    for (let index = 0; index < 16; index += 1) {
      const x = (index * 95 + Math.sin(this.time + index) * 20) % DESIGN_WIDTH;
      const y = (index * 121 + this.time * 26) % DESIGN_HEIGHT;
      graphics.roundRect(this.toLocalX(x), this.toLocalY(y + 18), 50, 18, 9);
      graphics.fill();
    }

    graphics.strokeColor = new Color(255, 255, 255, 16);
    graphics.lineWidth = 2;
    for (let index = 0; index < 9; index += 1) {
      const y = (index * 170 + (this.time * 35) % 170) - 170;
      graphics.moveTo(this.toLocalX(0), this.toLocalY(y));
      graphics.lineTo(this.toLocalX(DESIGN_WIDTH), this.toLocalY(y));
      graphics.stroke();
    }

    this.drawRound(graphics, 46, DESIGN_HEIGHT - 130, DESIGN_WIDTH - 92, 54, 18, new Color(11, 18, 32, 255), new Color(148, 163, 184, 46));
  }

  private renderForeground() {
    const graphics = this.foregroundGraphics!;
    graphics.clear();

    if (this.shake > 0) {
      graphics.node.setPosition(this.rand(-8, 8), this.rand(-8, 8));
    } else {
      graphics.node.setPosition(0, 0);
    }

    if (this.state !== GameState.Start) {
      this.drawParticles(graphics);
      this.drawPlayer(graphics);
    }

    if (this.state === GameState.Start) {
      this.drawRound(graphics, 110, 465, DESIGN_WIDTH - 220, 270, 32, new Color(15, 23, 42, 210), new Color(148, 163, 184, 66));
      this.drawRound(graphics, 150, 820, DESIGN_WIDTH - 300, 92, 46, new Color(250, 204, 21, 255), new Color(245, 158, 11, 255));
    }

    if (this.state === GameState.Over) {
      this.drawRound(graphics, 88, 350, DESIGN_WIDTH - 176, 520, 36, new Color(15, 23, 42, 230), new Color(239, 68, 68, 96));
      this.drawRound(graphics, 150, 735, DESIGN_WIDTH - 300, 92, 46, new Color(34, 197, 94, 255), new Color(22, 163, 74, 255));
    }
  }

  private drawParticles(graphics: Graphics) {
    for (const particle of this.particles) {
      const alpha = Math.floor(255 * this.clamp(particle.life / particle.maxLife, 0, 1));
      graphics.fillColor = new Color(particle.color.r, particle.color.g, particle.color.b, alpha);
      graphics.circle(this.toLocalX(particle.x), this.toLocalY(particle.y), particle.radius);
      graphics.fill();
    }
  }

  private drawPlayer(graphics: Graphics) {
    const x = this.playerX;
    const y = this.playerY;

    if (this.invincible > 0) {
      graphics.strokeColor = new Color(168, 85, 247, 165);
      graphics.lineWidth = 8;
      graphics.circle(this.toLocalX(x), this.toLocalY(y), 64 + Math.sin(this.time * 8) * 4);
      graphics.stroke();
    }

    graphics.fillColor = new Color(0, 0, 0, 82);
    graphics.ellipse(this.toLocalX(x), this.toLocalY(y + 62), 58, 18);
    graphics.fill();

    this.drawRound(graphics, x - 35, y - 2, 70, 80, 22, this.invincible > 0 ? new Color(221, 214, 254, 255) : new Color(37, 99, 235, 255), new Color(15, 23, 42, 255));

    graphics.fillColor = new Color(248, 202, 162, 255);
    graphics.circle(this.toLocalX(x), this.toLocalY(y - 36), 38);
    graphics.fill();

    graphics.fillColor = new Color(17, 24, 39, 255);
    graphics.circle(this.toLocalX(x - 13), this.toLocalY(y - 32), 4);
    graphics.fill();
    graphics.circle(this.toLocalX(x + 13), this.toLocalY(y - 32), 4);
    graphics.fill();

    graphics.strokeColor = new Color(17, 24, 39, 255);
    graphics.lineWidth = 4;
    graphics.moveTo(this.toLocalX(x - 14), this.toLocalY(y - 18));
    graphics.quadraticCurveTo(this.toLocalX(x), this.toLocalY(y - 8), this.toLocalX(x + 14), this.toLocalY(y - 18));
    graphics.stroke();
  }

  private updateLabels() {
    this.updateHudLabels();
    this.updateOverlayLabels();
  }

  private updateHudLabels() {
    const playingOrOver = this.state !== GameState.Start;
    this.setLabel(this.scoreLabel, DESIGN_WIDTH - 168, 60, 250, 44, `分数 ${Math.floor(this.score)}`, playingOrOver);
    this.setLabel(this.hpLabel, 116, 93, 180, 38, `HP ${'♥'.repeat(this.hp)}${'·'.repeat(this.maxHp - this.hp)}`, playingOrOver);
    this.setLabel(this.survivalLabel, DESIGN_WIDTH - 160, 99, 260, 36, `存活 ${this.survival.toFixed(1)}s`, playingOrOver);
    this.setLabel(this.invincibleLabel, DESIGN_WIDTH / 2, 98, 220, 36, this.invincible > 0 ? `无敌 ${this.invincible.toFixed(1)}s` : '', playingOrOver && this.invincible > 0);
  }

  private updateOverlayLabels() {
    if (this.state === GameState.Start) {
      this.setLabel(this.titleLabel, DESIGN_WIDTH / 2, 315, 620, 86, 'Bug 冲刺', true);
      this.setLabel(this.subtitleLabel, DESIGN_WIDTH / 2, 370, 690, 50, '躲 Bug，捡咖啡，今晚先把 Demo 跑通', true);
      this.setLabel(this.bodyLabel, DESIGN_WIDTH / 2, 595, 560, 170, '玩法\n左右移动程序员，躲开 Bug 和需求变更\n收集咖啡、键盘和代码块拿高分\n血量归零，发布失败', true);
      this.setLabel(this.buttonLabel, DESIGN_WIDTH / 2, 878, 430, 80, '点击开始', true);
      return;
    }

    if (this.state === GameState.Over) {
      this.setLabel(this.titleLabel, DESIGN_WIDTH / 2, 440, 620, 86, '发布失败', true);
      this.setLabel(this.subtitleLabel, DESIGN_WIDTH / 2, 535, 620, 56, `最终分数：${Math.floor(this.score)}`, true);
      this.setLabel(this.bodyLabel, DESIGN_WIDTH / 2, 625, 560, 130, `存活时间：${this.survival.toFixed(1)} 秒\n老板：这个小改一下，明早要。`, true);
      this.setLabel(this.buttonLabel, DESIGN_WIDTH / 2, 793, 430, 80, '再冲一次', true);
      return;
    }

    this.setLabel(this.titleLabel, 0, 0, 0, 0, '', false);
    this.setLabel(this.subtitleLabel, 0, 0, 0, 0, '', false);
    this.setLabel(this.bodyLabel, 0, 0, 0, 0, '', false);
    this.setLabel(this.buttonLabel, 0, 0, 0, 0, '', false);
  }

  private setLabel(label: Label | null, x: number, y: number, width: number, height: number, text: string, active: boolean) {
    if (!label) {
      return;
    }

    label.string = text;
    label.node.active = active;
    const transform = label.node.getComponent(UITransform)!;
    transform.setContentSize(width, height);
    label.node.setPosition(this.toLocalX(x), this.toLocalY(y));
  }

  private drawRect(graphics: Graphics, left: number, top: number, width: number, height: number, radius: number, fill: Color) {
    if (radius > 0) {
      this.drawRound(graphics, left, top, width, height, radius, fill);
      return;
    }

    graphics.fillColor = fill;
    graphics.rect(this.toLocalX(left), this.toLocalY(top + height), width, height);
    graphics.fill();
  }

  private setUiLayer(node: Node) {
    node.layer = Layers.Enum.UI_2D;
    for (const child of node.children) {
      this.setUiLayer(child);
    }
  }

  private drawRound(graphics: Graphics, left: number, top: number, width: number, height: number, radius: number, fill: Color, stroke?: Color) {
    graphics.fillColor = fill;
    graphics.roundRect(this.toLocalX(left), this.toLocalY(top + height), width, height, radius);
    graphics.fill();

    if (stroke) {
      graphics.strokeColor = stroke;
      graphics.lineWidth = 4;
      graphics.roundRect(this.toLocalX(left), this.toLocalY(top + height), width, height, radius);
      graphics.stroke();
    }
  }

  private hitPlayer(object: FallingObject) {
    const dx = this.playerX - object.x;
    const dy = this.playerY - object.y;
    const distance = this.playerRadius + object.radius;
    return dx * dx + dy * dy < distance * distance;
  }

  private updateBenchmark(dt: number) {
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

  private resetBenchmark() {
    this.fpsFrames = 0;
    this.fpsElapsed = 0;
    this.fpsSamples.length = 0;
    this.publishBenchmark();
  }

  private publishBenchmark() {
    const avgFps = this.fpsSamples.length > 0
      ? this.round(this.fpsSamples.reduce((sum, value) => sum + value, 0) / this.fpsSamples.length, 2)
      : null;
    const minFps = this.fpsSamples.length > 0
      ? this.round(Math.min(...this.fpsSamples), 2)
      : null;

    (globalThis as BenchmarkWindow).__BENCHMARK__ = {
      avgFps,
      minFps,
      objectCount: this.objects.length + this.particles.length
    };
  }

  private toLocalX(x: number) {
    return x - DESIGN_WIDTH / 2;
  }

  private toLocalY(y: number) {
    return DESIGN_HEIGHT / 2 - y;
  }

  private rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  private pick<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)];
  }

  private clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  private round(value: number, places: number) {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
  }
}
