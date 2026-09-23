import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { DebugOverlay } from '../systems/DebugOverlay';
import { GroundMover } from '../systems/GroundMover';
import { GroundPlane, type GroundPoint, pushOutOfCircle } from '../systems/GroundPlane';
import { fadeRestart, fadeToScene, ROUTE_TO_SCENE_KEY, setupSceneHotkeys } from '../util/sceneRouting';
import { mulberry32 } from '../util/rng';

type GroundState = 'grass' | 'dead' | 'cracked';
type RobotArenaState =
  | 'CHASE'
  | 'KICK_WINDUP'
  | 'KICK_ACTIVE'
  | 'LASER_WINDUP'
  | 'LASER_STRIKE'
  | 'RECOVER'
  | 'STUMBLE'
  | 'DYING';

type RodState = 'ground' | 'carried' | 'consumed';

type Rod = {
  id: number;
  spawnIndex: number;
  ground: GroundPoint;
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Sprite;
  state: RodState;
  bobOffset: number;
};

type Cultist = {
  ground: GroundPoint;
  sprite: Phaser.GameObjects.Sprite;
};

type Altar = {
  id: number;
  ground: GroundPoint;
  sprite: Phaser.GameObjects.Sprite;
  destroyed: boolean;
};

type Reticle = {
  ground: GroundPoint;
  sprite: Phaser.GameObjects.Sprite;
};

const ARENA_BOUNDS = {
  minGx: TUNING.bossArenaScene.arenaMinGx,
  maxGx: TUNING.bossArenaScene.arenaMaxGx,
  minGy: TUNING.bossArenaScene.arenaMinGy,
  maxGy: TUNING.bossArenaScene.arenaMaxGy,
};

const ROBOT_BOUNDS = {
  minGx: TUNING.bossArenaScene.robotMinGx,
  maxGx: TUNING.bossArenaScene.robotMaxGx,
  minGy: TUNING.bossArenaScene.robotMinGy,
  maxGy: TUNING.bossArenaScene.robotMaxGy,
};

const ALTAR_CENTER: GroundPoint = {
  gx: TUNING.bossArenaScene.altarGx,
  gy: TUNING.bossArenaScene.altarGy,
};
const ALTAR_POINTS: GroundPoint[] = [
  { gx: ALTAR_CENTER.gx, gy: ALTAR_CENTER.gy - 0.55 },
  { gx: ALTAR_CENTER.gx - 0.72, gy: ALTAR_CENTER.gy + 0.42 },
  { gx: ALTAR_CENTER.gx + 0.72, gy: ALTAR_CENTER.gy + 0.42 },
];
const ALTAR_OBSTACLE_RADIUS = TUNING.bossArenaScene.altarRadius * 0.55;

const CULTIST_POINTS: GroundPoint[] = [
  { gx: 6, gy: 2.5 },
  { gx: 8, gy: 2.5 },
  { gx: 5.8, gy: 4.3 },
  { gx: 8.2, gy: 4.3 },
  { gx: 7, gy: 5.2 },
];

export class BossArenaScene extends Phaser.Scene {
  private readonly plane = new GroundPlane({
    tileW: TUNING.bossArenaScene.tileW,
    tileH: TUNING.bossArenaScene.tileH,
    originX: TUNING.bossArenaScene.originX,
    originY: TUNING.bossArenaScene.originY,
    skewPx: TUNING.boardSkewPx,
  });
  private readonly rng = mulberry32(TUNING.barrelMan.rngSeed + 73);

  private audio?: AudioManager;
  private debugOverlay?: DebugOverlay;
  private groundGraphics?: Phaser.GameObjects.Graphics;
  private cableGraphics?: Phaser.GameObjects.Graphics;
  private effectGraphics?: Phaser.GameObjects.Graphics;
  private reticleGraphics?: Phaser.GameObjects.Graphics;
  private hero?: Phaser.GameObjects.Sprite;
  private heroMover?: GroundMover;
  private carriedRodSprite?: Phaser.GameObjects.Sprite;
  private robot?: Phaser.GameObjects.Sprite;
  private altars: Altar[] = [];
  private footDoor?: Phaser.GameObjects.Rectangle;
  private footDoorPanel?: Phaser.GameObjects.Rectangle;
  private prompt?: Phaser.GameObjects.Container;
  private promptText?: Phaser.GameObjects.Text;
  private hudHearts: Phaser.GameObjects.Image[] = [];
  private hudPips: Phaser.GameObjects.Image[] = [];
  private hudRodIcon?: Phaser.GameObjects.Image;
  private cultists: Cultist[] = [];
  private rods: Rod[] = [];
  private reticles: Reticle[] = [];
  private eKey?: Phaser.Input.Keyboard.Key;
  private invulnerabilityKey?: Phaser.Input.Keyboard.Key;
  private respawnTimer?: Phaser.Time.TimerEvent;

  private heroGround: GroundPoint = {
    gx: TUNING.bossArenaScene.heroEntranceStartGx,
    gy: TUNING.bossArenaScene.heroStartGy,
  };
  private robotGround: GroundPoint = {
    gx: TUNING.bossArenaScene.robotStartGx,
    gy: TUNING.bossArenaScene.heroStartGy,
  };
  private robotState: RobotArenaState = 'CHASE';
  private robotFacing: -1 | 1 = -1;
  private robotStateMs = 0;
  private laserCooldownMs = 1200;
  private robotStepMs = 0;
  private laserTargets: GroundPoint[] = [];
  private hp = TUNING.player.hp;
  private altarHits = 0;
  private fightStarted = false;
  private controlsLocked = true;
  private winStarted = false;
  private invulnerable = false;
  private devInvulnerable = false;
  private cableVisible = false;
  private cableLive = false;
  private groundState: GroundState = 'grass';
  private carriedRod?: Rod;
  private rodId = 0;
  private kickHasHit = false;
  private lastPrompt = '';
  private heroVelocity: GroundPoint = { gx: 0, gy: 0 };

  constructor() {
    super('BossArenaScene');
  }

  create(): void {
    this.resetRunState();
    setupSceneHotkeys(this);
    this.audio = new AudioManager(this);
    this.audio.loop('music_level', { volume: 0.22 });
    this.cameras.main.setBackgroundColor('#79a9b3');
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.createAnimations();
    this.drawBackground();
    this.groundGraphics = this.add.graphics().setDepth(1);
    this.cableGraphics = this.add.graphics().setDepth(5);
    this.reticleGraphics = this.add.graphics().setDepth(7);
    this.effectGraphics = this.add.graphics().setDepth(90);
    this.drawGround();
    this.createAltars();
    this.createRods(false);
    this.createCultists();
    this.createRobot();
    this.createHero();
    this.createPrompt();
    this.createHud();

    if (this.input.keyboard) {
      this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      if (import.meta.env.DEV) {
        this.invulnerabilityKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
      }
    }

    this.debugOverlay = new DebugOverlay(this, undefined, () => ({
      robotState: this.robotState,
      heroGround: `${this.heroGround.gx.toFixed(2)}, ${this.heroGround.gy.toFixed(2)}`,
      robotGround: `${this.robotGround.gx.toFixed(2)}, ${this.robotGround.gy.toFixed(2)}`,
      hp: this.hp,
      invulnerable: this.invulnerable || this.devInvulnerable,
      carrying: Boolean(this.carriedRod),
      rodsGround: this.groundRodCount,
      altarHits: this.altarHits,
      altarsLeft: this.remainingAltarCount,
      altarDistance: (this.nearestActiveAltarDistance() ?? 0).toFixed(2),
      inKickBox: this.isHeroInKickBox(),
      laserCooldown: Math.max(0, Math.round(this.laserCooldownMs)),
    }));

    if (this.shouldSkipCinematic()) {
      this.skipToFight();
      return;
    }

    this.runCinematic();
  }

  update(time: number, delta: number): void {
    const deltaSeconds = delta / 1000;

    if (this.invulnerabilityKey && Phaser.Input.Keyboard.JustDown(this.invulnerabilityKey)) {
      this.devInvulnerable = !this.devInvulnerable;
    }

    this.updateHero(deltaSeconds);
    this.updatePrompt();
    this.updateCarriedRod();
    this.updateRods(time);
    this.updateRobot(delta);
    this.updateReticles(time);
    this.renderCable(time);
    this.syncActors();
    this.updateHud();
    this.debugOverlay?.update();
  }

  private resetRunState(): void {
    this.hudHearts = [];
    this.hudPips = [];
    this.altars = [];
    this.cultists = [];
    this.rods = [];
    this.reticles = [];
    this.heroGround = {
      gx: TUNING.bossArenaScene.heroEntranceStartGx,
      gy: TUNING.bossArenaScene.heroStartGy,
    };
    this.robotGround = {
      gx: TUNING.bossArenaScene.robotStartGx,
      gy: TUNING.bossArenaScene.heroStartGy,
    };
    this.robotState = 'CHASE';
    this.robotFacing = -1;
    this.robotStateMs = 0;
    this.laserCooldownMs = 1200;
    this.robotStepMs = 0;
    this.laserTargets = [];
    this.hp = TUNING.player.hp;
    this.altarHits = 0;
    this.fightStarted = false;
    this.controlsLocked = true;
    this.winStarted = false;
    this.invulnerable = false;
    this.devInvulnerable = false;
    this.cableVisible = false;
    this.cableLive = false;
    this.groundState = 'grass';
    this.carriedRod = undefined;
    this.rodId = 0;
    this.kickHasHit = false;
    this.lastPrompt = '';
    this.heroVelocity = { gx: 0, gy: 0 };
  }

  private createAnimations(): void {
    if (!this.anims.exists('worshipper-pray')) {
      this.anims.create({
        key: 'worshipper-pray',
        frames: [{ key: 'worshipper_pray_0' }, { key: 'worshipper_pray_1' }],
        frameRate: 2,
        repeat: -1,
      });
    }

    if (!this.anims.exists('worshipper-walk')) {
      this.anims.create({
        key: 'worshipper-walk',
        frames: [{ key: 'worshipper_walk_0' }, { key: 'worshipper_walk_1' }],
        frameRate: 5,
        repeat: -1,
      });
    }

    if (!this.anims.exists('worshipper-summon')) {
      this.anims.create({
        key: 'worshipper-summon',
        frames: [
          { key: 'worshipper_pray_0' },
          { key: 'worshipper_summon_0' },
          { key: 'worshipper_pray_1' },
          { key: 'worshipper_summon_1' },
          { key: 'worshipper_pray_0' },
          { key: 'worshipper_summon_0' },
          { key: 'worshipper_pray_0' },
        ],
        frameRate: 3,
        repeat: 0,
      });
    }
  }

  private drawBackground(): void {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x79a9b3, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(0x4f7d68, 0.8);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(0, 88),
        new Phaser.Geom.Point(64, 54),
        new Phaser.Geom.Point(146, 86),
        new Phaser.Geom.Point(226, 48),
        new Phaser.Geom.Point(338, 86),
        new Phaser.Geom.Point(480, 42),
        new Phaser.Geom.Point(480, 112),
        new Phaser.Geom.Point(0, 112),
      ],
      true,
    );
    graphics.fillStyle(0x365a53, 0.55);
    graphics.fillRect(0, 82, GAME_WIDTH, 34);
  }

  private drawGround(): void {
    if (!this.groundGraphics) {
      return;
    }
    this.groundGraphics.clear();
    const color =
      this.groundState === 'grass'
        ? 0x4f8f5b
        : this.groundState === 'dead'
          ? 0x7a563c
          : 0x4a3f3a;
    const topLeft = this.plane.groundToScreen(0, 0);
    const bottomRight = this.plane.groundToScreen(14, 7);
    this.groundGraphics.fillStyle(color, 1);
    this.groundGraphics.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    if (this.groundState === 'cracked') {
      this.groundGraphics.lineStyle(1, 0x161923, 0.4);
      for (let index = 0; index < 18; index += 1) {
        const x = topLeft.x + ((index * 37) % 430);
        const y = topLeft.y + 10 + ((index * 23) % 116);
        this.groundGraphics.lineBetween(x, y, x + 20, y + (index % 2 === 0 ? 8 : -6));
      }
    }
  }

  private createHero(): void {
    this.hero = this.add.sprite(0, 0, 'hero_idle_0').setOrigin(0.5, 1).setDepth(30);
    this.heroMover = new GroundMover(
      this,
      this.hero,
      this.plane,
      this.heroGround,
      TUNING.barrelGridScene.heroGridSpeed,
      ARENA_BOUNDS,
    );
    this.heroMover.setEnabled(false);
    this.carriedRodSprite = this.add.sprite(0, 0, 'rod_0').setOrigin(0.5, 1).setDepth(60).setVisible(false);
    this.syncHero();
  }

  private createRobot(): void {
    this.robot = this.add.sprite(0, 0, 'robot_idle_0').setOrigin(0.5, 1).setDepth(40);
    this.robot.play('robot-walk');
    this.footDoor = this.add
      .rectangle(0, 0, 17, 30, 0x020204, 1)
      .setOrigin(0.5, 1)
      .setStrokeStyle(3, 0xf6d743, 1)
      .setDepth(70)
      .setScale(1, 0.1)
      .setAlpha(0)
      .setVisible(false);
    this.footDoorPanel = this.add
      .rectangle(0, 0, 17, 30, 0x5c6674, 1)
      .setOrigin(0.5, 1)
      .setStrokeStyle(2, 0x151a24, 1)
      .setDepth(72)
      .setVisible(false);
    this.syncRobot();
  }

  private createAltars(): void {
    this.altars = ALTAR_POINTS.map((point, index) => {
      const sprite = this.add.sprite(0, 0, 'slab_upright_0').setOrigin(0.5, 1).setDepth(40);
      const altar = {
        id: index,
        ground: { ...point },
        sprite,
        destroyed: false,
      };
      this.syncAltar(altar);
      return altar;
    });
  }

  private createCultists(): void {
    this.cultists = CULTIST_POINTS.map((point) => {
      const sprite = this.add.sprite(0, 0, 'worshipper_pray_0').setOrigin(0.5, 1);
      sprite.play('worshipper-pray');
      const cultist = { ground: { ...point }, sprite };
      this.syncCultist(cultist);
      return cultist;
    });
  }

  private createRods(glowing: boolean): void {
    this.rods = TUNING.bossArenaScene.rodSpawnPoints.map((point, index) =>
      this.createRod({ gx: point.gx, gy: point.gy }, index, glowing),
    );
  }

  private createRod(point: GroundPoint, spawnIndex: number, glowing: boolean): Rod {
    const glow = this.add.sprite(0, 0, 'rod_ground_glow_0').setOrigin(0.5).setDepth(6).setAlpha(glowing ? 0.5 : 0);
    const sprite = this.add.sprite(0, 0, 'rod_0').setOrigin(0.5, 1).setDepth(20);
    const rod: Rod = {
      id: this.rodId,
      spawnIndex,
      ground: { ...point },
      sprite,
      glow,
      state: 'ground',
      bobOffset: this.rng() * Math.PI * 2,
    };
    this.rodId += 1;
    this.syncRod(rod, 0, glowing);
    return rod;
  }

  private createPrompt(): void {
    this.prompt = this.add.container(0, 0).setDepth(1000).setVisible(false);
    const background = this.add.rectangle(0, 0, 64, 18, 0x111421, 1).setStrokeStyle(2, 0xffffff);
    this.promptText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.prompt.add([background, this.promptText]);
  }

  private createHud(): void {
    this.hudHearts = Array.from({ length: TUNING.player.hp }, (_value, index) =>
      this.add.image(14 + index * 13, 14, 'heart_0').setScrollFactor(0).setDepth(1000).setVisible(false),
    );
    this.hudPips = Array.from({ length: 3 }, (_value, index) =>
      this.add.image(62 + index * 11, 14, 'pip_full_0').setScrollFactor(0).setDepth(1000).setVisible(false),
    );
    this.hudRodIcon = this.add.image(104, 14, 'rod_icon_0').setScrollFactor(0).setDepth(1000).setVisible(false);
  }

  private shouldSkipCinematic(): boolean {
    return (
      Boolean(this.registry.get('bossCinematicSeen')) ||
      (import.meta.env.DEV && new URLSearchParams(window.location.search).get('skipcine') === '1')
    );
  }

  private runCinematic(): void {
    this.controlsLocked = true;
    this.hero?.play('hero-walk', true);
    this.tweens.add({
      targets: this.heroGround,
      gx: TUNING.bossArenaScene.heroStartGx,
      duration: 1050,
      ease: 'Linear',
      onUpdate: () => this.syncHero(),
      onComplete: () => this.hero?.play('hero-idle', true),
    });

    this.time.delayedCall(1160, () => this.summonCultists());
    this.time.delayedCall(3650, () => {
      this.audio?.play('robot_on');
      this.cameras.main.shake(260, 0.012);
      this.groundState = 'dead';
      this.drawGround();
    });
    this.time.delayedCall(4200, () => {
      this.cameras.main.shake(260, 0.015);
      this.groundState = 'cracked';
      this.drawGround();
    });
    this.time.delayedCall(4550, () => this.walkRobotTo({ gx: TUNING.bossArenaScene.robotIntroStopGx, gy: 3.5 }, 1250));
    this.time.delayedCall(6000, () => this.lineUpCultistsForRobot());
    this.time.delayedCall(7150, () => this.openFootDoor());
    this.cultists.forEach((_cultist, index) => {
      this.time.delayedCall(7600 + index * 560, () => this.sendCultistIntoRobot(index));
    });
    this.time.delayedCall(10550, () => this.closeFootDoor());
    this.time.delayedCall(10850, () => this.showCable(true));
    this.time.delayedCall(11200, () => {
      this.walkRobotPath(
        [
          { gx: 8.5, gy: 5.3 },
          { gx: TUNING.bossArenaScene.robotFightGx, gy: TUNING.bossArenaScene.robotFightGy },
        ],
        () => this.beginFight(),
      );
    });
  }

  private skipToFight(): void {
    this.registry.set('bossCinematicSeen', true);
    this.groundState = 'cracked';
    this.drawGround();
    this.heroGround.gx = TUNING.bossArenaScene.heroStartGx;
    this.heroGround.gy = TUNING.bossArenaScene.heroStartGy;
    this.robotGround.gx = TUNING.bossArenaScene.robotFightGx;
    this.robotGround.gy = TUNING.bossArenaScene.robotFightGy;
    this.cultists.forEach((cultist) => cultist.sprite.setVisible(false));
    this.showCable(true);
    this.beginFight();
  }

  private beginFight(): void {
    this.registry.set('bossCinematicSeen', true);
    this.controlsLocked = false;
    this.fightStarted = true;
    this.robotState = 'CHASE';
    this.robotStateMs = 0;
    this.resetLaserCooldown(0.6);
    this.heroMover?.setEnabled(true);
    this.robot?.setTexture('robot_idle_0');
    this.hudHearts.forEach((heart) => heart.setVisible(true));
    this.hudPips.forEach((pip) => pip.setVisible(true));
    this.rods.forEach((rod) => {
      if (rod.state === 'ground') {
        rod.glow.setAlpha(0.5);
      }
    });
  }

  private updateHero(deltaSeconds: number): void {
    if (!this.hero || !this.heroMover) {
      return;
    }

    if (this.controlsLocked || !this.fightStarted || this.winStarted) {
      if (this.fightStarted || this.winStarted) {
        this.heroMover.setEnabled(false);
      }
      this.syncHero();
      return;
    }

    const before = { ...this.heroGround };
    this.heroMover.setEnabled(true);
    this.heroMover.update(deltaSeconds, this.activeAltarObstacles());
    this.heroVelocity = {
      gx: (this.heroGround.gx - before.gx) / Math.max(0.001, deltaSeconds),
      gy: (this.heroGround.gy - before.gy) / Math.max(0.001, deltaSeconds),
    };
  }

  private updatePrompt(): void {
    if (!this.prompt || !this.promptText || !this.hero || !this.fightStarted || this.controlsLocked || this.winStarted) {
      this.prompt?.setVisible(false);
      this.lastPrompt = '';
      return;
    }

    const action = this.getAvailableAction();
    if (!action) {
      this.prompt.setVisible(false);
      this.lastPrompt = '';
      return;
    }

    const label = action === 'pickup' ? '[E] PICK UP' : '[E] STRIKE';
    const screen = this.plane.groundToScreen(this.heroGround.gx, this.heroGround.gy);
    this.promptText.setText(label);
    this.prompt.setPosition(Math.round(screen.x), Math.round(screen.y - 34));
    this.prompt.setVisible(true);
    this.lastPrompt = label;

    if (this.eKey && Phaser.Input.Keyboard.JustDown(this.eKey)) {
      if (action === 'pickup') {
        this.pickUpNearestRod();
      } else if (this.isCarryingNearAltar()) {
        this.startStrike('altar');
      } else {
        this.startStrike('robot');
      }
    }
  }

  private getAvailableAction(): 'pickup' | 'strike' | undefined {
    if (!this.carriedRod) {
      return this.nearestRodInRange() ? 'pickup' : undefined;
    }
    if (this.isCarryingNearAltar() || this.isRobotStrikeAvailable()) {
      return 'strike';
    }
    return undefined;
  }

  private nearestRodInRange(): Rod | undefined {
    let nearest: Rod | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const rod of this.rods) {
      if (rod.state !== 'ground') {
        continue;
      }
      const distance = this.distance(this.heroGround, rod.ground);
      if (distance <= TUNING.bossArenaScene.pickupRange && distance < nearestDistance) {
        nearest = rod;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private pickUpNearestRod(): void {
    const rod = this.nearestRodInRange();
    if (!rod || this.carriedRod) {
      return;
    }
    rod.state = 'carried';
    rod.sprite.setVisible(false);
    rod.glow.setVisible(false);
    this.carriedRod = rod;
    this.carriedRodSprite?.setVisible(true);
    this.updateCarriedRod();
    this.updateHud();
  }

  private isCarryingNearAltar(): boolean {
    return Boolean(this.carriedRod && this.nearestActiveAltarInRange());
  }

  private isRobotStrikeAvailable(): boolean {
    if (!this.carriedRod || !this.robot || this.robotState === 'DYING') {
      return false;
    }
    const distance = this.distance(this.heroGround, this.robotGround);
    if (distance <= TUNING.bossArenaScene.strikeRange + 0.5) {
      return true;
    }
    const facing = this.heroMover?.facing ?? { gx: 1, gy: 0 };
    const dx = this.robotGround.gx - this.heroGround.gx;
    return distance <= 1.8 && dx * (facing.gx || 1) > 0;
  }

  private startStrike(target: 'altar' | 'robot'): void {
    if (!this.carriedRod || this.controlsLocked || this.winStarted) {
      return;
    }

    this.controlsLocked = true;
    this.heroMover?.setEnabled(false);
    this.audio?.play('swing', { volume: 0.75 });
    const rodSprite = this.carriedRodSprite;
    if (rodSprite) {
      this.tweens.add({
        targets: rodSprite,
        angle: rodSprite.flipX ? -95 : 95,
        duration: 170,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    this.time.delayedCall(250, () => {
      if (target === 'altar') {
        this.resolveAltarStrike();
      } else {
        this.resolveRobotStrike();
      }
      this.dropConsumedRod();
      if (!this.winStarted) {
        this.controlsLocked = false;
      }
    });
  }

  private resolveAltarStrike(): void {
    const altar = this.nearestActiveAltarInRange();
    if (!altar) {
      this.resolveRobotStrike();
      return;
    }

    altar.destroyed = true;
    this.altarHits = this.altars.filter((candidate) => candidate.destroyed).length;
    altar.sprite.setTexture('slab_fallen_0').setAlpha(0.82);
    this.syncAltar(altar);
    this.audio?.play('bonk', { volume: 0.75 });
    this.cameras.main.shake(170, 0.009);
    const screen = this.plane.groundToScreen(altar.ground.gx, altar.ground.gy);
    this.sparkAt(screen.x, screen.y - 22, 0xf6d743, 8);

    if (this.remainingAltarCount > 0) {
      this.stumbleRobot();
    } else {
      this.startWinSequence();
    }
  }

  private resolveRobotStrike(): void {
    const screen = this.plane.groundToScreen(this.robotGround.gx, this.robotGround.gy);
    this.sparkAt(screen.x, screen.y - 58, 0xffffff);
    this.popText(screen.x, screen.y - 96, 'CLANG!', '#ffffff');
    this.time.delayedCall(220, () => this.popText(screen.x, screen.y - 112, 'HA HA.', '#f6d743'));
  }

  private dropConsumedRod(): void {
    const rod = this.carriedRod;
    this.carriedRod = undefined;
    this.carriedRodSprite?.setVisible(false).setAngle(0);
    if (!rod) {
      return;
    }

    rod.state = 'consumed';
    rod.ground = { ...this.heroGround };
    rod.sprite.setTexture('rod_0').setVisible(true).setAlpha(1);
    rod.glow.setVisible(false);
    this.syncRod(rod, 0, false);
    const start = this.plane.groundToScreen(rod.ground.gx, rod.ground.gy);
    rod.sprite.setPosition(start.x, start.y - 24);
    this.tweens.add({
      targets: rod.sprite,
      y: start.y + 7,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeIn',
      onComplete: () => rod.sprite.setVisible(false),
    });
    this.ensureRodSupply();
    this.updateHud();
  }

  private updateCarriedRod(): void {
    if (!this.carriedRodSprite || !this.hero || !this.carriedRod) {
      this.carriedRodSprite?.setVisible(false);
      return;
    }
    const facingLeft = this.hero.flipX;
    this.carriedRodSprite
      .setVisible(true)
      .setFlipX(facingLeft)
      .setPosition(this.hero.x + (facingLeft ? -8 : 8), this.hero.y - 13)
      .setDepth(this.hero.depth + 1)
      .setAngle(facingLeft ? -28 : 28);
  }

  private updateRods(time: number): void {
    for (const rod of this.rods) {
      if (rod.state !== 'ground') {
        continue;
      }
      this.syncRod(rod, time, this.fightStarted);
      if (this.fightStarted && Math.floor((time + rod.id * 211) / 1000) !== Math.floor((time - 16 + rod.id * 211) / 1000)) {
        const screen = this.plane.groundToScreen(rod.ground.gx, rod.ground.gy);
        this.sparkAt(screen.x, screen.y - 14, 0xf6d743, 4);
      }
    }
  }

  private updateRobot(deltaMs: number): void {
    if (!this.robot || !this.fightStarted || this.winStarted || this.robotState === 'DYING') {
      return;
    }

    this.robotFacing = this.heroGround.gx < this.robotGround.gx ? -1 : 1;
    this.robot.setFlipX(this.robotFacing === 1);
    this.robotStateMs -= deltaMs;
    this.laserCooldownMs -= deltaMs;

    switch (this.robotState) {
      case 'CHASE':
        this.updateRobotChase(deltaMs / 1000);
        if (this.isHeroInKickBox()) {
          this.transitionRobot('KICK_WINDUP', TUNING.robot.kickWindupMs);
        } else if (this.laserCooldownMs <= 0) {
          this.startLaserWindup();
        }
        break;
      case 'KICK_WINDUP':
        if (this.robotStateMs <= 0) {
          this.transitionRobot('KICK_ACTIVE', TUNING.robot.kickActiveMs);
        }
        break;
      case 'KICK_ACTIVE':
        this.checkKickDamage();
        if (this.robotStateMs <= 0) {
          this.transitionRobot('RECOVER', TUNING.robot.kickRecoverMs);
        }
        break;
      case 'LASER_WINDUP':
        if (this.robotStateMs <= 0) {
          this.fireLaserStrike();
        }
        break;
      case 'LASER_STRIKE':
        if (this.robotStateMs <= 0) {
          this.transitionRobot('RECOVER', TUNING.robot.kickRecoverMs);
        }
        break;
      case 'RECOVER':
        if (this.robotStateMs <= 0) {
          this.transitionRobot('CHASE', 0);
        }
        break;
      case 'STUMBLE':
        if (this.robotStateMs <= 0) {
          this.transitionRobot('CHASE', 0);
        }
        break;
    }
  }

  private updateRobotChase(deltaSeconds: number): void {
    const targetSide = this.robotGround.gx < this.heroGround.gx ? -1 : 1;
    const target = {
      gx: Phaser.Math.Clamp(this.heroGround.gx + targetSide * 1.6, ROBOT_BOUNDS.minGx, ROBOT_BOUNDS.maxGx),
      gy: Phaser.Math.Clamp(this.heroGround.gy, ROBOT_BOUNDS.minGy, ROBOT_BOUNDS.maxGy),
    };
    const speed = this.robotSpeed;
    const dx = target.gx - this.robotGround.gx;
    const dy = target.gy - this.robotGround.gy;
    const distance = Math.hypot(dx, dy);
    if (distance > 0.01) {
      this.robotGround.gx += (dx / distance) * speed * deltaSeconds;
      this.robotGround.gy += (dy / distance) * speed * deltaSeconds;
    }
    this.robotGround = this.pushOutOfActiveAltars(
      this.robotGround,
      ALTAR_OBSTACLE_RADIUS + 0.15,
    );
    this.robotGround = this.plane.clamp(this.robotGround, ROBOT_BOUNDS);
    this.robotStepMs += deltaSeconds * 1000;
    if (this.robotStepMs >= 360) {
      this.robotStepMs = 0;
      this.cameras.main.shake(70, 0.003);
    }
  }

  private transitionRobot(state: RobotArenaState, durationMs: number): void {
    this.robotState = state;
    this.robotStateMs = durationMs;
    this.kickHasHit = false;
    switch (state) {
      case 'CHASE':
        this.robot?.play('robot-walk', true);
        break;
      case 'KICK_WINDUP':
        this.robot?.stop();
        this.robot?.setTexture('robot_kick_windup_0');
        break;
      case 'KICK_ACTIVE':
        this.robot?.stop();
        this.robot?.setTexture('robot_kick_0');
        this.cameras.main.shake(130, 0.008);
        break;
      case 'LASER_WINDUP':
        this.robot?.stop();
        this.robot?.setTexture('robot_eyes_glow_0');
        break;
      case 'RECOVER':
        this.robot?.stop();
        this.robot?.setTexture('robot_idle_0');
        break;
      case 'STUMBLE':
        this.robot?.stop();
        this.robot?.setTexture('robot_eyes_glow_0');
        break;
      case 'DYING':
        this.robot?.stop();
        this.robot?.setTexture('robot_eyes_glow_0');
        break;
    }
  }

  private startLaserWindup(): void {
    this.laserTargets = [this.clampToArena({ ...this.heroGround })];
    if (this.altarHits >= 2) {
      this.laserTargets.push(
        this.clampToArena({
          gx: this.heroGround.gx + this.heroVelocity.gx * (TUNING.bossArenaScene.laserWindupMs / 1000),
          gy: this.heroGround.gy + this.heroVelocity.gy * (TUNING.bossArenaScene.laserWindupMs / 1000),
        }),
      );
    }
    this.reticles = this.laserTargets.map((target, index) => {
      const sprite = this.add.sprite(0, 0, 'reticle_0').setOrigin(0.5).setDepth(8);
      const reticle = { ground: target, sprite };
      const screen = this.plane.groundToScreen(target.gx, target.gy);
      sprite.setPosition(screen.x, screen.y).setAlpha(0.85).setScale(1 + index * 0.1);
      return reticle;
    });
    this.transitionRobot('LASER_WINDUP', TUNING.bossArenaScene.laserWindupMs);
  }

  private fireLaserStrike(): void {
    this.audio?.play('laser', { volume: 0.8 });
    for (const target of this.laserTargets) {
      const targetScreen = this.plane.groundToScreen(target.gx, target.gy);
      const eye = this.robotEyeScreen();
      this.effectGraphics?.lineStyle(4, 0xe84855, 0.85);
      this.effectGraphics?.lineBetween(eye.x, eye.y, targetScreen.x, targetScreen.y);
      this.sparkAt(targetScreen.x, targetScreen.y, 0xe84855, 8);
      if (this.distance(this.heroGround, target) <= TUNING.bossArenaScene.laserRadius) {
        this.damageHero(target);
      }
    }
    this.time.delayedCall(140, () => this.effectGraphics?.clear());
    this.clearReticles();
    this.resetLaserCooldown();
    this.transitionRobot('LASER_STRIKE', 170);
  }

  private stumbleRobot(): void {
    this.clearReticles();
    this.transitionRobot('STUMBLE', TUNING.bossArenaScene.robotStumbleMs);
    this.cameras.main.shake(200, 0.006);
    this.tweens.add({
      targets: this.robot,
      alpha: 0.35,
      duration: 80,
      yoyo: true,
      repeat: 8,
      onComplete: () => this.robot?.setAlpha(1),
    });
  }

  private checkKickDamage(): void {
    if (this.kickHasHit || !this.isHeroInKickActiveBox()) {
      return;
    }
    this.kickHasHit = true;
    this.damageHero(this.robotGround);
  }

  private isHeroInKickBox(): boolean {
    const dx = this.heroGround.gx - this.robotGround.gx;
    const dy = this.heroGround.gy - this.robotGround.gy;
    return (
      dx * this.robotFacing > 0 &&
      Math.abs(dx) <= TUNING.bossArenaScene.kickRangeX &&
      Math.abs(dy) <= TUNING.bossArenaScene.kickRangeY
    );
  }

  private isHeroInKickActiveBox(): boolean {
    const dx = (this.heroGround.gx - this.robotGround.gx) * this.robotFacing;
    const dy = Math.abs(this.heroGround.gy - this.robotGround.gy);
    return dx >= 0.5 && dx <= 2.2 && dy <= 0.6;
  }

  private damageHero(source: GroundPoint): void {
    if (this.invulnerable || this.devInvulnerable || this.winStarted || this.hp <= 0) {
      return;
    }
    this.hp -= 1;
    this.audio?.play('hit', { volume: 0.8 });
    this.cameras.main.shake(140, 0.01);
    if (TUNING.dropRodOnHit && this.carriedRod) {
      this.dropHeldRod();
    }

    if (this.hp <= 0) {
      this.controlsLocked = true;
      this.registry.set('bossCinematicSeen', true);
      fadeRestart(this);
      return;
    }

    this.invulnerable = true;
    this.controlsLocked = true;
    this.hero?.setTexture('hero_hurt_0').setTint(0xe84855);
    const dx = this.heroGround.gx - source.gx;
    const dy = this.heroGround.gy - source.gy;
    const distance = Math.max(0.001, Math.hypot(dx, dy));
    const target = this.clampToArena(
      this.pushOutOfActiveAltars(
        {
          gx: this.heroGround.gx + (dx / distance) * 0.8,
          gy: this.heroGround.gy + (dy / distance) * 0.8,
        },
        ALTAR_OBSTACLE_RADIUS,
      ),
    );
    this.tweens.add({
      targets: this.heroGround,
      gx: target.gx,
      gy: target.gy,
      duration: 150,
      ease: 'Quad.easeOut',
      onUpdate: () => this.syncHero(),
      onComplete: () => {
        if (!this.winStarted && this.hp > 0) {
          this.controlsLocked = false;
          this.hero?.setTexture('hero_idle_0');
        }
      },
    });
    this.tweens.add({
      targets: this.hero,
      alpha: 0.25,
      duration: 80,
      yoyo: true,
      repeat: 6,
    });
    this.time.delayedCall(TUNING.player.invulnerabilityMs, () => {
      this.invulnerable = false;
      this.hero?.clearTint();
      this.hero?.setAlpha(1);
    });
  }

  private dropHeldRod(): void {
    const rod = this.carriedRod;
    if (!rod) {
      return;
    }
    this.carriedRod = undefined;
    rod.state = 'ground';
    rod.ground = { ...this.heroGround };
    rod.sprite.setVisible(true).setAlpha(1);
    rod.glow.setVisible(true).setAlpha(0.5);
    this.carriedRodSprite?.setVisible(false);
    this.syncRod(rod, 0, true);
  }

  private ensureRodSupply(): void {
    const remainingHits = this.remainingAltarCount;
    const available = this.groundRodCount + (this.carriedRod ? 1 : 0) + (this.respawnTimer ? 1 : 0);
    if (available >= remainingHits || remainingHits <= 0 || this.respawnTimer) {
      return;
    }
    this.respawnTimer = this.time.delayedCall(TUNING.bossArenaScene.rodRespawnMs, () => {
      this.respawnTimer = undefined;
      this.spawnReplacementRod();
      this.ensureRodSupply();
    });
  }

  private spawnReplacementRod(): void {
    const occupied = this.rods.filter((rod) => rod.state === 'ground').map((rod) => rod.ground);
    const point = [...TUNING.bossArenaScene.rodSpawnPoints]
      .sort((a, b) => this.distance(b, this.robotGround) - this.distance(a, this.robotGround))
      .find((spawn) => occupied.every((rod) => this.distance(spawn, rod) > 0.4)) ??
      TUNING.bossArenaScene.rodSpawnPoints[0];
    const spawnIndex = TUNING.bossArenaScene.rodSpawnPoints.indexOf(point);
    const rod = this.createRod({ gx: point.gx, gy: point.gy }, spawnIndex, true);
    this.rods.push(rod);
    const screen = this.plane.groundToScreen(point.gx, point.gy);
    this.sparkAt(screen.x, screen.y - 10, 0xf6d743, 8);
  }

  private startWinSequence(): void {
    if (this.winStarted) {
      return;
    }
    this.winStarted = true;
    this.controlsLocked = true;
    this.fightStarted = false;
    this.clearReticles();
    this.transitionRobot('DYING', Number.POSITIVE_INFINITY);
    this.altars.forEach((altar) => {
      altar.destroyed = true;
      altar.sprite.setTexture('slab_fallen_0').setAlpha(0.82);
      this.syncAltar(altar);
    });
    this.cableLive = false;
    this.audio?.play('bonk', { volume: 0.8 });
    this.cameras.main.shake(200, 0.01);
    const altarScreen = this.plane.groundToScreen(ALTAR_CENTER.gx, ALTAR_CENTER.gy);
    this.sparkAt(altarScreen.x + 18, altarScreen.y - 22, 0xf6d743, 8);
    this.time.delayedCall(350, () => this.malfunctionRobot());
  }

  private malfunctionRobot(): void {
    this.cameras.main.shake(600, 0.012);
    this.tweens.add({
      targets: this.robot,
      x: '+=4',
      duration: 45,
      yoyo: true,
      repeat: 12,
    });
    this.tweens.add({
      targets: this.robot,
      alpha: 0.35,
      duration: 60,
      yoyo: true,
      repeat: 8,
      onComplete: () => this.robot?.setAlpha(1),
    });
    const screen = this.plane.groundToScreen(this.robotGround.gx, this.robotGround.gy);
    this.time.delayedCall(180, () => this.sparkAt(screen.x, screen.y - 88, 0xf6d743, 8));
    this.time.delayedCall(520, () => this.sparkAt(screen.x, screen.y - 44, 0xf6d743, 8));
    this.time.delayedCall(900, () => this.explodeRobot());
  }

  private explodeRobot(): void {
    if (!this.robot) {
      return;
    }
    const screen = this.plane.groundToScreen(this.robotGround.gx, this.robotGround.gy);
    this.audio?.play('explosion', { volume: 0.9 });
    this.cameras.main.shake(480, 0.017);
    this.debrisAt(screen.x, screen.y - 62, 0xf28f3b, 16);
    const boom = this.add.circle(screen.x, screen.y - 62, 8, 0xf6d743, 0.95).setDepth(120);
    this.robot.setVisible(false);
    this.tweens.add({
      targets: boom,
      scale: 5,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => boom.destroy(),
    });
    this.time.delayedCall(650, () => fadeToScene(this, ROUTE_TO_SCENE_KEY.ending));
  }

  private openFootDoor(): void {
    if (!this.footDoor || !this.footDoorPanel) {
      return;
    }

    this.footDoor.setVisible(true).setAlpha(1).setScale(1, 0.1);
    this.footDoorPanel.setVisible(true).setAlpha(1).setScale(1);
    this.syncRobot();
    this.audio?.play('door_fail', { volume: 0.35 });
    this.tweens.add({
      targets: this.footDoor,
      scaleY: 1,
      duration: 260,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: this.footDoorPanel,
      x: this.footDoorPanel.x + 15 * -this.robotFacing,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeIn',
      onComplete: () => this.footDoorPanel?.setVisible(false),
    });
    const door = this.robotDoorScreen();
    this.sparkAt(door.x, door.y - 16, 0xf6d743, 5);
  }

  private closeFootDoor(): void {
    if (!this.footDoor || !this.footDoorPanel) {
      return;
    }

    this.syncRobot();
    this.footDoorPanel.setVisible(true).setAlpha(0).setScale(1);
    this.tweens.add({
      targets: this.footDoorPanel,
      alpha: 1,
      duration: 180,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: this.footDoor,
      scaleY: 0.1,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeIn',
      onComplete: () => this.footDoor?.setVisible(false),
    });
  }

  private summonCultists(): void {
    this.cultists.forEach((cultist) => {
      cultist.sprite.setVisible(true).setScale(1).setAlpha(1).play('worshipper-summon', true);
      cultist.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        cultist.sprite.play('worshipper-pray', true);
      });
    });
  }

  private lineUpCultistsForRobot(): void {
    this.cultists.forEach((cultist, index) => {
      cultist.sprite.setVisible(true).setScale(1).setAlpha(1).play('worshipper-walk', true);
      this.tweens.add({
        targets: cultist.ground,
        gx: this.cultistQueuePoint(index).gx,
        gy: this.cultistQueuePoint(index).gy,
        duration: 620 + index * 80,
        delay: index * 80,
        ease: 'Quad.easeOut',
        onUpdate: () => this.syncCultist(cultist),
        onComplete: () => {
          cultist.sprite.stop();
          cultist.sprite.setTexture(index % 2 === 0 ? 'worshipper_pray_0' : 'worshipper_pray_1');
          this.syncCultist(cultist);
        },
      });
    });
  }

  private sendCultistIntoRobot(index: number): void {
    const cultist = this.cultists[index];
    if (!cultist) {
      return;
    }
    const door = this.cultistDoorPoint();
    cultist.sprite.setVisible(true).setScale(1).setAlpha(1).play('worshipper-walk', true);
    this.tweens.add({
      targets: cultist.ground,
      gx: door.gx - 0.18,
      gy: door.gy,
      duration: 290,
      ease: 'Quad.easeInOut',
      onUpdate: () => this.syncCultist(cultist),
      onComplete: () => {
        this.tweens.add({
          targets: cultist.ground,
          gx: door.gx,
          gy: door.gy - 0.08,
          duration: 210,
          ease: 'Quad.easeIn',
          onUpdate: () => this.syncCultist(cultist),
        });
        this.tweens.add({
          targets: cultist.sprite,
          scale: 0.45,
          alpha: 0,
          duration: 210,
          ease: 'Quad.easeIn',
          onComplete: () => cultist.sprite.setVisible(false),
        });
      },
    });
  }

  private cultistQueuePoint(index: number): GroundPoint {
    const door = this.cultistDoorPoint();
    return {
      gx: door.gx - 0.58 - index * 0.42,
      gy: door.gy + 0.03,
    };
  }

  private cultistDoorPoint(): GroundPoint {
    const door = this.robotDoorScreen();
    return this.plane.screenToGround(door.x, door.y + 22);
  }

  private walkRobotTo(target: GroundPoint, duration: number, done?: () => void): void {
    this.robot?.play('robot-walk', true);
    this.tweens.add({
      targets: this.robotGround,
      gx: target.gx,
      gy: target.gy,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.syncRobot();
        if (Math.floor(this.robotStateMs / 260) !== Math.floor((this.robotStateMs + 16) / 260)) {
          this.cameras.main.shake(60, 0.003);
        }
      },
      onComplete: () => {
        this.robot?.stop();
        this.robot?.setTexture('robot_idle_0');
        done?.();
      },
    });
  }

  private walkRobotPath(path: GroundPoint[], done: () => void): void {
    const [first, ...rest] = path;
    if (!first) {
      done();
      return;
    }
    this.walkRobotTo(first, 900, () => this.walkRobotPath(rest, done));
  }

  private showCable(live: boolean): void {
    this.cableVisible = true;
    this.cableLive = live;
  }

  private renderCable(time: number): void {
    if (!this.cableGraphics || !this.cableVisible) {
      return;
    }
    this.cableGraphics.clear();
    const foot = this.robotFootScreen();
    const pulse = this.cableLive
      ? 0.45 + Math.sin((time / TUNING.bossScene.cablePulseMs) * Math.PI * 2) * 0.3
      : 0.18;
    for (const altar of this.altars) {
      if (altar.destroyed) {
        continue;
      }
      const start = this.plane.groundToScreen(altar.ground.gx, altar.ground.gy);
      this.cableGraphics.lineStyle(5, this.cableLive ? 0xf6d743 : 0x3b4451, pulse);
      this.cableGraphics.lineBetween(start.x, start.y - 10, foot.x, foot.y);
      this.cableGraphics.lineStyle(2, this.cableLive ? 0xffffff : 0x111421, pulse);
      this.cableGraphics.lineBetween(start.x, start.y - 10, foot.x, foot.y);
    }
  }

  private updateReticles(time: number): void {
    for (const reticle of this.reticles) {
      const screen = this.plane.groundToScreen(reticle.ground.gx, reticle.ground.gy);
      const pulse = 1 + Math.sin(time / 80) * 0.08;
      reticle.sprite
        .setTexture(Math.floor(time / 110) % 2 === 0 ? 'reticle_0' : 'reticle_1')
        .setPosition(screen.x, screen.y)
        .setScale(pulse);
    }
  }

  private clearReticles(): void {
    this.reticles.forEach((reticle) => reticle.sprite.destroy());
    this.reticles = [];
    this.laserTargets = [];
  }

  private syncActors(): void {
    this.syncHero();
    this.syncRobot();
    this.altars.forEach((altar) => this.syncAltar(altar));
    this.cultists.forEach((cultist) => this.syncCultist(cultist));
  }

  private syncHero(): void {
    if (!this.hero) {
      return;
    }
    this.plane.setSpriteFeet(this.hero, this.heroGround, 7, 20);
  }

  private syncRobot(): void {
    if (!this.robot) {
      return;
    }
    this.plane.setSpriteFeet(this.robot, this.robotGround, 7, 22);
    const door = this.robotDoorScreen();
    this.footDoor?.setPosition(door.x, door.y).setDepth(this.robot.depth + 4);
    this.footDoorPanel?.setPosition(door.x, door.y).setDepth(this.robot.depth + 5);
  }

  private syncCultist(cultist: Cultist): void {
    this.plane.setSpriteFeet(cultist.sprite, cultist.ground, 6, 18);
  }

  private syncAltar(altar: Altar): void {
    this.plane.setSpriteFeet(altar.sprite, altar.ground, 5, 18);
  }

  private syncRod(rod: Rod, time: number, glowing: boolean): void {
    const screen = this.plane.groundToScreen(rod.ground.gx, rod.ground.gy);
    const bob = glowing ? Math.sin(time / 420 + rod.bobOffset) * 2 : 0;
    rod.glow.setPosition(screen.x, screen.y + 3).setVisible(rod.state === 'ground').setDepth(Math.round(screen.y + 4));
    rod.sprite
      .setPosition(screen.x, screen.y + 6 + bob)
      .setVisible(rod.state === 'ground')
      .setDepth(Math.round(screen.y + 16));
  }

  private updateHud(): void {
    this.hudHearts.forEach((heart, index) => {
      heart.setAlpha(index < this.hp ? 1 : 0.2);
    });
    this.hudPips.forEach((pip, index) => {
      pip.setTexture(index < this.remainingAltarCount ? 'pip_full_0' : 'pip_empty_0');
    });
    this.hudRodIcon?.setVisible(Boolean(this.carriedRod) && this.fightStarted);
  }

  private activeAltars(): Altar[] {
    return this.altars.filter((altar) => !altar.destroyed);
  }

  private activeAltarObstacles(): { centre: GroundPoint; radius: number }[] {
    return this.activeAltars().map((altar) => ({
      centre: altar.ground,
      radius: ALTAR_OBSTACLE_RADIUS,
    }));
  }

  private nearestActiveAltarInRange(
    range = TUNING.bossArenaScene.strikeRange,
  ): Altar | undefined {
    let nearest: Altar | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const altar of this.activeAltars()) {
      const distance = this.distance(this.heroGround, altar.ground);
      if (distance <= range && distance < nearestDistance) {
        nearest = altar;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private nearestActiveAltarDistance(): number | undefined {
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const altar of this.activeAltars()) {
      nearestDistance = Math.min(nearestDistance, this.distance(this.heroGround, altar.ground));
    }
    return Number.isFinite(nearestDistance) ? nearestDistance : undefined;
  }

  private pushOutOfActiveAltars(point: GroundPoint, radius: number): GroundPoint {
    let pushed = { ...point };
    for (const altar of this.activeAltars()) {
      pushed = pushOutOfCircle(pushed, altar.ground, radius);
    }
    return pushed;
  }

  private get remainingAltarCount(): number {
    return this.activeAltars().length;
  }

  private get groundRodCount(): number {
    return this.rods.filter((rod) => rod.state === 'ground').length;
  }

  private get robotSpeed(): number {
    return (
      TUNING.bossArenaScene.robotChaseSpeed *
      Math.pow(TUNING.bossArenaScene.escalationSpeedMul, this.altarHits)
    );
  }

  private resetLaserCooldown(multiplier = 1): void {
    const jitter = Phaser.Math.Linear(-500, 500, this.rng());
    this.laserCooldownMs =
      (TUNING.bossArenaScene.laserCooldownMs + jitter) *
      Math.pow(TUNING.bossArenaScene.escalationCooldownMul, this.altarHits) *
      multiplier;
  }

  private clampToArena(point: GroundPoint): GroundPoint {
    return this.plane.clamp(point, ARENA_BOUNDS);
  }

  private distance(a: GroundPoint, b: GroundPoint): number {
    return Math.hypot(a.gx - b.gx, a.gy - b.gy);
  }

  private robotFootScreen(): Phaser.Math.Vector2 {
    const screen = this.plane.groundToScreen(this.robotGround.gx, this.robotGround.gy);
    return new Phaser.Math.Vector2(screen.x - 9 * this.robotFacing, screen.y - 8);
  }

  private robotDoorScreen(): Phaser.Math.Vector2 {
    if (!this.robot) {
      const screen = this.plane.groundToScreen(this.robotGround.gx, this.robotGround.gy);
      return new Phaser.Math.Vector2(screen.x, screen.y);
    }
    return new Phaser.Math.Vector2(this.robot.x - 11 * this.robotFacing, this.robot.y - 15);
  }

  private robotEyeScreen(): Phaser.Math.Vector2 {
    const screen = this.plane.groundToScreen(this.robotGround.gx, this.robotGround.gy);
    return new Phaser.Math.Vector2(screen.x + 7 * this.robotFacing, screen.y - 92);
  }

  private sparkAt(x: number, y: number, color = 0xf6d743, count = 6): void {
    if (!this.effectGraphics) {
      return;
    }
    const graphics = this.effectGraphics;
    graphics.lineStyle(2, color, 1);
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      graphics.lineBetween(x, y, x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
    }
    this.time.delayedCall(110, () => graphics.clear());
    this.debrisAt(x, y, color, Math.max(3, Math.floor(count / 2)));
  }

  private debrisAt(x: number, y: number, color: number, count: number): void {
    const pieces = Array.from({ length: count }, (_value, index) => {
      const angle = (Math.PI * 2 * index) / count + Phaser.Math.FloatBetween(-0.25, 0.25);
      const distance = Phaser.Math.Between(10, 28);
      const piece = this.add.rectangle(x, y, 3, 3, index % 3 === 0 ? 0xffffff : color, 1).setDepth(125);
      this.tweens.add({
        targets: piece,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(240, 500),
        ease: 'Quad.easeOut',
        onComplete: () => piece.destroy(),
      });
      return piece;
    });
    this.time.delayedCall(540, () => pieces.forEach((piece) => piece.destroy()));
  }

  private popText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(130);
    this.tweens.add({
      targets: label,
      y: y - 18,
      alpha: 0,
      duration: 900,
      ease: 'Quad.easeOut',
      onComplete: () => label.destroy(),
    });
  }
}
