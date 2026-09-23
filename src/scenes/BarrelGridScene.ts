import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DialogueSystem } from '../systems/DialogueSystem';
import { GroundMover } from '../systems/GroundMover';
import { GroundPlane, type GroundPoint, type ScreenPoint } from '../systems/GroundPlane';
import { DialogueBox } from '../ui/DialogueBox';
import { InteractionButton } from '../ui/InteractionButton';
import { fadeRestart, fadeToScene, ROUTE_TO_SCENE_KEY, setupSceneHotkeys } from '../util/sceneRouting';
import { mulberry32 } from '../util/rng';

type LightDigit = '2' | '3' | '4' | '6' | '7' | '8';
type TileChar = LightDigit | '.';
type BarrelState = 'idle' | 'running' | 'floating' | 'plant';
type SpeedMode = keyof typeof TUNING.barrelGridScene.barrelGridSpeeds;

type LightVector = {
  dx: number;
  dy: number;
  label: string;
};

const GRID_MAP = [
  '......222.....666....333333.........',
  '.............666.....3333333........',
  '.....44444...........3333333.7777...',
  '....4444444..88888...3333333.77777..',
  '....4444444..888888..33.3333.77777..',
  '.....444444..888888..3333333.77777..',
  '......4444...888888..........77777..',
  '.............88.888...........777...',
] as const;

const WAYPOINT_TILES = [
  [2, 4],
  [10, 4],
  [12, 4],
  [13, 5],
  [18, 6],
  [20, 4],
  [21, 2],
  [26, 2],
  [28, 4],
  [33, 5],
  [35, 5],
] as const;

const LIGHT_DIRECTIONS: Record<LightDigit, LightVector> = {
  '2': { dx: 0, dy: 1, label: 'S' },
  '3': { dx: 1, dy: 1, label: 'SE' },
  '4': { dx: -1, dy: 0, label: 'W' },
  '6': { dx: 1, dy: 0, label: 'E' },
  '7': { dx: -1, dy: -1, label: 'NW' },
  '8': { dx: 0, dy: -1, label: 'N' },
};

const SPEED_MODES: SpeedMode[] = ['slow', 'normal', 'burst', 'hesitate'];

const HERO_START: GroundPoint = { gx: 0.5, gy: 4.5 };
const BARREL_START: GroundPoint = {
  gx: WAYPOINT_TILES[0][0] + 0.5,
  gy: WAYPOINT_TILES[0][1] + 0.5,
};

export class BarrelGridScene extends Phaser.Scene {
  private readonly columns = GRID_MAP[0].length;
  private readonly rows = GRID_MAP.length;
  private readonly path = WAYPOINT_TILES.map(([col, row]) => ({ gx: col + 0.5, gy: row + 0.5 }));
  private readonly rng = mulberry32(TUNING.barrelMan.rngSeed);
  private readonly debugLabels: Phaser.GameObjects.Text[] = [];
  private readonly groundPlane = new GroundPlane({
    tileW: TUNING.barrelGridScene.tileW,
    tileH: TUNING.barrelGridScene.tileH,
    originX: TUNING.barrelGridScene.boardOriginX,
    originY: TUNING.barrelGridScene.boardOriginY,
    skewPx: TUNING.barrelGridScene.boardSkewPx,
  });

  private audio?: AudioManager;
  private hero?: Phaser.GameObjects.Sprite;
  private heroMover?: GroundMover;
  private barrelMan?: Phaser.GameObjects.Sprite;
  private speakButton?: InteractionButton;
  private dialogue?: DialogueSystem;
  private debugOverlay?: DebugOverlay;
  private boardGraphics?: Phaser.GameObjects.Graphics;
  private lightCueGraphics?: Phaser.GameObjects.Graphics;
  private lampGlowGraphics?: Phaser.GameObjects.Graphics;
  private shadowGraphics?: Phaser.GameObjects.Graphics;
  private waterWakeGraphics?: Phaser.GameObjects.Graphics;
  private leafGraphics?: Phaser.GameObjects.Graphics;
  private debugLightGraphics?: Phaser.GameObjects.Graphics;

  private interactKey?: Phaser.Input.Keyboard.Key;
  private noPlantKey?: Phaser.Input.Keyboard.Key;
  private lightDebugKey?: Phaser.Input.Keyboard.Key;

  private heroGround: GroundPoint = { ...HERO_START };
  private barrelBaseGround: GroundPoint = { ...BARREL_START };
  private barrelGround: GroundPoint = { ...BARREL_START };
  private barrelState: BarrelState = 'idle';
  private waypointIndex = 0;
  private behaviorMs = 0;
  private currentSpeedMode: SpeedMode = 'normal';
  private currentSpeed = 0;
  private wobblePhase = 0;
  private floatPhase = 0;
  private exposure = 0;
  private isProtected = false;
  private shadowCenter?: GroundPoint;
  private currentBarrelTile = 'none';
  private currentBarrelDirection = 'shade';
  private requiredHeroTile = 'none';
  private controlsEnabled = true;
  private transitionStarted = false;
  private plantFailing = false;
  private noPlantMode = false;
  private showLightDebug = false;

  constructor() {
    super('BarrelGridScene');
  }

  create(): void {
    this.resetRunState();
    setupSceneHotkeys(this);
    this.audio = new AudioManager(this);
    this.audio.loop('music_level', { volume: 0.22 });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio?.stop('hiss');
      this.audio?.stop('roll');
    });

    this.validateGrid();
    this.cameras.main.setBackgroundColor('#536d70');
    this.cameras.main.setBounds(0, 0, this.worldWidth, GAME_HEIGHT);

    this.drawBackground();
    this.boardGraphics = this.add.graphics().setDepth(1);
    this.lightCueGraphics = this.add.graphics().setDepth(3);
    this.lampGlowGraphics = this.add.graphics().setDepth(9);
    this.shadowGraphics = this.add.graphics().setDepth(8);
    this.waterWakeGraphics = this.add.graphics().setDepth(10);
    this.leafGraphics = this.add.graphics().setDepth(20);
    this.debugLightGraphics = this.add.graphics().setDepth(900);
    this.drawBoard();
    this.drawRiverExit();
    this.createLightDebugLabels();

    this.hero = this.add.sprite(0, 0, 'hero_idle_0').setOrigin(0.5, 1);
    this.heroMover = new GroundMover(
      this,
      this.hero,
      this.groundPlane,
      this.heroGround,
      TUNING.barrelGridScene.heroGridSpeed,
      { minGx: 0.15, maxGx: this.columns - 0.15, minGy: 0.15, maxGy: this.rows - 0.15 },
    );
    this.barrelMan = this.add.sprite(0, 0, 'barrelman_idle_0').setOrigin(0.5, 1);
    this.syncActorSprites();

    const dialogueBox = new DialogueBox(this);
    this.dialogue = new DialogueSystem(this, dialogueBox);
    this.speakButton = new InteractionButton(this);
    this.speakButton.on('selected', () => this.tryStartDialogue());

    if (this.input.keyboard) {
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

      if (import.meta.env.DEV) {
        this.noPlantKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
        this.lightDebugKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
      }
    }

    this.debugOverlay = new DebugOverlay(this, undefined, () => ({
      heroGround: `${this.heroGround.gx.toFixed(2)}, ${this.heroGround.gy.toFixed(2)}`,
      heroTile: this.tileLabel(this.heroGround),
      barrelGround: `${this.barrelGround.gx.toFixed(2)}, ${this.barrelGround.gy.toFixed(2)}`,
      barrelTile: this.currentBarrelTile,
      barrelDir: this.currentBarrelDirection,
      requiredHeroTile: this.requiredHeroTile,
      protected: this.isProtected,
      exposure: this.exposure.toFixed(2),
      waypoint: this.waypointIndex,
      speed: this.currentSpeedMode,
      noPlant: this.noPlantMode,
    }));
  }

  update(time: number, delta: number): void {
    if (
      !this.hero ||
      !this.barrelMan ||
      !this.lightCueGraphics ||
      !this.shadowGraphics ||
      !this.waterWakeGraphics ||
      !this.leafGraphics
    ) {
      return;
    }

    if (this.noPlantKey && Phaser.Input.Keyboard.JustDown(this.noPlantKey)) {
      this.noPlantMode = !this.noPlantMode;
    }

    if (this.lightDebugKey && Phaser.Input.Keyboard.JustDown(this.lightDebugKey)) {
      this.showLightDebug = !this.showLightDebug;
      this.debugLabels.forEach((label) => label.setVisible(this.showLightDebug));
    }

    this.updateInteractionButton();
    this.updateHero(delta / 1000);
    this.updateProtection();
    this.updateBarrel(delta);
    this.updateProtection();
    this.updateExposure(delta / 1000);
    this.updateExposureAudio();
    this.renderLightCues(time);
    this.renderShadow();
    this.renderWaterWake(time);
    this.renderLampGlow(time);
    this.renderLeaves();
    this.renderLightDebug();
    this.syncActorSprites();
    this.updateCamera();
    this.updateWaterEnding();
    this.debugOverlay?.update();
  }

  private get worldWidth(): number {
    return (
      TUNING.barrelGridScene.boardOriginX +
      this.columns * TUNING.barrelGridScene.tileW +
      Math.abs(this.rows * TUNING.barrelGridScene.boardSkewPx) +
      120
    );
  }

  private resetRunState(): void {
    this.heroGround = { ...HERO_START };
    this.barrelBaseGround = { ...BARREL_START };
    this.barrelGround = { ...BARREL_START };
    this.barrelState = 'idle';
    this.waypointIndex = 0;
    this.behaviorMs = 0;
    this.currentSpeedMode = 'normal';
    this.currentSpeed = 0;
    this.wobblePhase = this.rng() * Math.PI * 2;
    this.floatPhase = this.rng() * Math.PI * 2;
    this.exposure = 0;
    this.isProtected = false;
    this.shadowCenter = undefined;
    this.currentBarrelTile = 'none';
    this.currentBarrelDirection = 'shade';
    this.requiredHeroTile = 'none';
    this.controlsEnabled = true;
    this.transitionStarted = false;
    this.plantFailing = false;
    this.noPlantMode = false;
    this.showLightDebug = false;
  }

  private groundToScreen(gx: number, gy: number): ScreenPoint {
    return this.groundPlane.groundToScreen(gx, gy);
  }

  private screenToGround(x: number, y: number): GroundPoint {
    return this.groundPlane.screenToGround(x, y);
  }

  private tileAt(gx: number, gy: number): TileChar | undefined {
    const col = Math.floor(gx);
    const row = Math.floor(gy);
    if (!this.isInsideTile(col, row)) {
      return undefined;
    }
    return GRID_MAP[row][col] as TileChar;
  }

  private tileAtCoord(col: number, row: number): TileChar | undefined {
    if (!this.isInsideTile(col, row)) {
      return undefined;
    }
    return GRID_MAP[row][col] as TileChar;
  }

  private isInsideTile(col: number, row: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.columns;
  }

  private getLightVector(tile: TileChar | undefined): LightVector | undefined {
    if (!tile || tile === '.') {
      return undefined;
    }
    return LIGHT_DIRECTIONS[tile];
  }

  private tileLabel(point: GroundPoint): string {
    return `${Math.floor(point.gx)}, ${Math.floor(point.gy)}`;
  }

  private drawBackground(): void {
    const graphics = this.add.graphics().setDepth(0);
    const boardTop = TUNING.barrelGridScene.boardOriginY;
    const boardBottom = boardTop + this.rows * TUNING.barrelGridScene.tileH;

    graphics.fillStyle(0x2f667c, 1);
    graphics.fillRect(0, 0, this.worldWidth, GAME_HEIGHT);
    this.drawSkyBackground(graphics, boardTop);
    graphics.fillStyle(0x1e475e, 0.42);
    graphics.fillRect(0, boardTop - 14, this.worldWidth, 14);

    this.drawRiverDetails(graphics, boardBottom);

    this.drawDistantBuildings(graphics);
  }

  private drawSkyBackground(graphics: Phaser.GameObjects.Graphics, height: number): void {
    const top = new Phaser.Display.Color(0x2a, 0x22, 0x45);
    const bottom = new Phaser.Display.Color(0xd1, 0x73, 0x55);
    for (let y = 0; y < height; y += 4) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, height, y);
      graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      graphics.fillRect(0, y, this.worldWidth, 4);
    }
  }

  private skyColorAt(y: number): number {
    const top = new Phaser.Display.Color(0x2a, 0x22, 0x45);
    const bottom = new Phaser.Display.Color(0xd1, 0x73, 0x55);
    const skyHeight = TUNING.barrelGridScene.boardOriginY;
    const clampedY = Phaser.Math.Clamp(y, 0, skyHeight);
    const color = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, skyHeight, clampedY);
    return Phaser.Display.Color.GetColor(color.r, color.g, color.b);
  }

  private drawRiverDetails(graphics: Phaser.GameObjects.Graphics, boardBottom: number): void {
    graphics.lineStyle(1, 0x7bb1c4, 0.26);
    for (let y = boardBottom + 13; y < GAME_HEIGHT - 5; y += 12) {
      for (let x = (y % 24) * 2; x < this.worldWidth; x += 112) {
        graphics.lineBetween(x, y, x + 28, y);
      }
    }

    graphics.lineStyle(1, 0x153849, 0.25);
    for (let y = boardBottom + 8; y < GAME_HEIGHT; y += 22) {
      graphics.lineBetween(0, y, this.worldWidth, y + 2);
    }
  }

  private drawDistantBuildings(graphics: Phaser.GameObjects.Graphics): void {
    const skylineBaseY = TUNING.barrelGridScene.boardOriginY - 14;
    graphics.fillStyle(0x1a4152, 0.65);
    graphics.fillRect(0, skylineBaseY - 2, this.worldWidth, 3);

    this.drawBrokenTemple(graphics, -36, skylineBaseY, {
      columns: [12, 30, 55],
      roofPoints: [
        [-6, -18],
        [38, -42],
        [92, -15],
      ],
      missingColumnIndex: 1,
    });

    this.drawFallenPortico(graphics, 128, skylineBaseY, {
      wallWidth: 94,
      wallHeight: 36,
      capBreakX: 62,
      holes: [
        [26, -25, 8, 14],
        [66, -19, 12, 16],
      ],
      chips: [
        [0, -36, 18, 13],
        [78, -36, 16, 11],
      ],
      rubble: [
        [12, -4, 11],
        [82, -6, 14],
        [103, -3, 9],
      ],
    });

    this.drawBrokenTower(graphics, 326, skylineBaseY, {
      width: 56,
      height: 58,
      chip: 'left',
      windows: [
        [16, -38],
        [36, -35],
      ],
    });

    this.drawColumnStumps(graphics, 480, skylineBaseY, [
      { x: 0, h: 26 },
      { x: 18, h: 43 },
      { x: 39, h: 21 },
      { x: 60, h: 36 },
      { x: 82, h: 18 },
    ]);

    this.drawBrokenTemple(graphics, 644, skylineBaseY, {
      columns: [14, 35, 73, 94],
      roofPoints: [
        [2, -13],
        [58, -47],
        [122, -18],
      ],
      missingColumnIndex: 2,
    });

    this.drawFallenPortico(graphics, 828, skylineBaseY, {
      wallWidth: 78,
      wallHeight: 42,
      capBreakX: 20,
      holes: [
        [16, -27, 10, 19],
        [48, -34, 7, 13],
      ],
      chips: [
        [2, -42, 11, 9],
        [59, -42, 19, 17],
      ],
      rubble: [
        [-8, -2, 10],
        [60, -5, 16],
        [88, -3, 12],
      ],
    });

    this.drawColumnStumps(graphics, 1004, skylineBaseY, [
      { x: 2, h: 17 },
      { x: 23, h: 31 },
      { x: 49, h: 24 },
      { x: 71, h: 45 },
    ]);

    this.drawBrokenTower(graphics, 1128, skylineBaseY, {
      width: 70,
      height: 49,
      chip: 'right',
      windows: [
        [19, -31],
        [46, -22],
      ],
    });
  }

  private drawBrokenTemple(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    baseY: number,
    config: {
      columns: number[];
      roofPoints: Array<[number, number]>;
      missingColumnIndex: number;
    },
  ): void {
    graphics.fillStyle(0xf1efe5, 0.94);
    graphics.fillTriangle(
      x + config.roofPoints[0][0],
      baseY + config.roofPoints[0][1],
      x + config.roofPoints[1][0],
      baseY + config.roofPoints[1][1],
      x + config.roofPoints[2][0],
      baseY + config.roofPoints[2][1],
    );
    graphics.fillStyle(0xc4cbc5, 0.88);
    graphics.fillRect(x + config.roofPoints[0][0] - 4, baseY - 17, config.roofPoints[2][0] - config.roofPoints[0][0] + 7, 5);
    graphics.fillStyle(0xf8f5ea, 0.96);
    config.columns.forEach((col, index) => {
      if (index === config.missingColumnIndex) {
        graphics.fillRect(x + col, baseY - 14, 8, 14);
        return;
      }
      const height = index % 2 === 0 ? 31 : 25;
      graphics.fillRect(x + col, baseY - height, 8, height);
    });
    graphics.fillStyle(0xd2d4ca, 0.9);
    graphics.fillRect(x + 4, baseY - 4, config.roofPoints[2][0] - 8, 4);
    graphics.fillStyle(0xaab5b0, 0.5);
    graphics.fillRect(x + config.columns[config.missingColumnIndex] + 2, baseY - 20, 10, 3);
  }

  private drawFallenPortico(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    baseY: number,
    config: {
      wallWidth: number;
      wallHeight: number;
      capBreakX: number;
      holes: Array<[number, number, number, number]>;
      chips: Array<[number, number, number, number]>;
      rubble: Array<[number, number, number]>;
    },
  ): void {
    graphics.fillStyle(0xd2d4ca, 0.82);
    graphics.fillRect(x - 10, baseY - 4, config.wallWidth + 24, 4);
    graphics.fillRect(x + 2, baseY - 9, config.wallWidth - 3, 4);

    const columns = [7, 24, 43, 62, config.wallWidth - 12].filter((column) => column < config.wallWidth - 2);
    columns.forEach((column, index) => {
      const height = config.wallHeight - (index === 1 ? 10 : index === 3 ? 5 : 0);
      graphics.fillStyle(0xf8f5ea, 0.94);
      graphics.fillRect(x + column, baseY - height, 7, height);
      graphics.fillStyle(0xcbd1c9, 0.86);
      graphics.fillRect(x + column - 3, baseY - height - 4, 13, 4);
      graphics.fillRect(x + column - 2, baseY - 3, 11, 3);
      graphics.lineStyle(1, 0xd7d3c5, 0.55);
      graphics.lineBetween(x + column + 2, baseY - height + 4, x + column + 2, baseY - 6);
      graphics.lineBetween(x + column + 5, baseY - height + 4, x + column + 5, baseY - 6);
    });

    graphics.fillStyle(0xc6cdc5, 0.88);
    graphics.fillRect(x - 6, baseY - config.wallHeight - 8, config.capBreakX, 5);
    graphics.fillRect(
      x + config.capBreakX + 10,
      baseY - config.wallHeight - 5,
      config.wallWidth - config.capBreakX + 10,
      5,
    );

    graphics.fillStyle(0xe9e5d7, 0.9);
    graphics.fillTriangle(
      x + 2,
      baseY - config.wallHeight - 9,
      x + config.capBreakX - 2,
      baseY - config.wallHeight - 26,
      x + config.capBreakX + 24,
      baseY - config.wallHeight - 8,
    );
    graphics.fillStyle(this.skyColorAt(baseY - config.wallHeight - 19), 1);
    graphics.fillTriangle(
      x + config.capBreakX - 3,
      baseY - config.wallHeight - 25,
      x + config.capBreakX + 15,
      baseY - config.wallHeight - 8,
      x + config.capBreakX + 30,
      baseY - config.wallHeight - 8,
    );

    graphics.lineStyle(1, 0xb7beb8, 0.62);
    graphics.lineBetween(x + 11, baseY - config.wallHeight - 4, x + 29, baseY - 18);
    graphics.lineBetween(x + config.wallWidth - 18, baseY - config.wallHeight + 2, x + config.wallWidth - 31, baseY - 7);
    graphics.fillStyle(0xd7d3c5, 0.9);
    config.rubble.forEach(([rockX, rockY, width]) => {
      graphics.fillRect(x + rockX, baseY + rockY, width, 4);
    });
  }

  private drawBrokenTower(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    baseY: number,
    config: {
      width: number;
      height: number;
      chip: 'left' | 'right';
      windows: Array<[number, number]>;
    },
  ): void {
    graphics.fillStyle(0xd2d4ca, 0.82);
    graphics.fillRect(x - 8, baseY - 4, config.width + 16, 4);
    graphics.fillStyle(0xf4f1e6, 0.93);
    graphics.fillRect(x + 8, baseY - config.height + 22, config.width - 16, config.height - 22);

    const pedimentTipX = config.chip === 'left' ? x + config.width - 18 : x + 18;
    graphics.fillStyle(0xf4f1e6, 0.93);
    graphics.fillTriangle(
      x,
      baseY - config.height + 22,
      pedimentTipX,
      baseY - config.height - 10,
      x + config.width,
      baseY - config.height + 22,
    );

    graphics.fillStyle(this.skyColorAt(baseY - config.height + 8), 1);
    if (config.chip === 'left') {
      graphics.fillTriangle(x, baseY - config.height + 2, x + 22, baseY - config.height + 2, x, baseY - config.height + 25);
    } else {
      graphics.fillTriangle(
        x + config.width,
        baseY - config.height + 2,
        x + config.width - 24,
        baseY - config.height + 2,
        x + config.width,
        baseY - config.height + 27,
      );
    }
    graphics.fillStyle(this.skyColorAt(baseY - config.height + 33), 1);
    graphics.fillRect(x + 15, baseY - config.height + 31, config.width - 30, 9);
    graphics.fillStyle(this.skyColorAt(baseY - 8), 1);
    graphics.fillRect(x + 5, baseY - 13, 16, 13);

    const columnOffsets = [12, Math.round(config.width / 2) - 4, config.width - 20];
    columnOffsets.forEach((column, index) => {
      const columnHeight = config.height - (index === 1 ? 22 : 27);
      graphics.fillStyle(0xf8f5ea, 0.96);
      graphics.fillRect(x + column, baseY - columnHeight, 8, columnHeight);
      graphics.fillStyle(0xcbd1c9, 0.88);
      graphics.fillRect(x + column - 3, baseY - columnHeight - 4, 14, 4);
      graphics.fillRect(x + column - 2, baseY - 3, 12, 3);
      graphics.lineStyle(1, 0xd7d3c5, 0.55);
      graphics.lineBetween(x + column + 2, baseY - columnHeight + 4, x + column + 2, baseY - 6);
      graphics.lineBetween(x + column + 5, baseY - columnHeight + 4, x + column + 5, baseY - 6);
    });

    graphics.lineStyle(1, 0xb7beb8, 0.68);
    graphics.lineBetween(x + 12, baseY - config.height + 14, x + 25, baseY - config.height + 35);
    graphics.lineBetween(x + config.width - 14, baseY - 27, x + config.width - 25, baseY - 7);
    graphics.fillStyle(0xd0d2c7, 0.72);
    graphics.fillRect(x - 5, baseY - 3, config.width + 10, 3);
  }

  private drawColumnStumps(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    baseY: number,
    columns: Array<{ x: number; h: number }>,
  ): void {
    graphics.fillStyle(0xd8d4c7, 0.78);
    graphics.fillRect(x - 10, baseY - 4, columns[columns.length - 1].x + 24, 4);
    graphics.fillStyle(0xf8f5ea, 0.92);
    columns.forEach((column, index) => {
      graphics.fillRect(x + column.x, baseY - column.h, 8, column.h);
      if (index % 2 === 1) {
        graphics.fillStyle(0xc6cdc5, 0.86);
        graphics.fillRect(x + column.x - 3, baseY - column.h - 4, 14, 4);
        graphics.fillStyle(0xf8f5ea, 0.92);
      }
    });
    graphics.fillStyle(0xd6d2c5, 0.88);
    graphics.fillRect(x + columns[0].x - 8, baseY - 12, 14, 4);
    graphics.fillRect(x + columns[columns.length - 1].x + 11, baseY - 8, 16, 4);
  }

  private drawBoard(): void {
    if (!this.boardGraphics) {
      return;
    }

    this.boardGraphics.clear();
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.columns; col += 1) {
        const tile = this.tileAtCoord(col, row);
        const lit = tile !== '.';
        const alternate = (row + col) % 2 === 0;
        this.boardGraphics.fillStyle(
          lit ? (alternate ? 0xc8b966 : 0xb1a057) : alternate ? 0x2b3440 : 0x232b35,
          1,
        );
        this.boardGraphics.fillPoints(this.tileCorners(col, row), true);
        this.boardGraphics.lineStyle(1, lit ? 0xe0d47d : 0x39424d, lit ? 0.25 : 0.35);
        this.boardGraphics.strokePoints(this.tileCorners(col, row), true, true);
      }
    }
  }

  private drawRiverExit(): void {
    const x = this.groundToScreen(this.columns - 0.8, 5.9).x;
    const y = this.groundToScreen(this.columns - 0.8, 5.9).y;
    const graphics = this.add.graphics().setDepth(2);
    graphics.fillStyle(0x1f536b, 0.92);
    graphics.fillEllipse(x + 16, y + 17, 104, 40);
    graphics.fillStyle(0x2f667c, 0.92);
    graphics.fillEllipse(x + 40, y + 24, 126, 44);
    graphics.lineStyle(2, 0x79b6c9, 0.38);
    graphics.lineBetween(x - 18, y + 9, x + 78, y + 7);
    graphics.lineBetween(x + 3, y + 26, x + 106, y + 23);
    graphics.fillStyle(0x536d70, 1);
    graphics.fillRect(x - 34, y - 11, 28, 20);
    graphics.fillStyle(0x344952, 0.78);
    graphics.fillRect(x - 34, y + 5, 28, 4);
  }

  private tileCorners(col: number, row: number): Phaser.Geom.Point[] {
    return this.groundPlane.tileCorners(col, row);
  }

  private createLightDebugLabels(): void {
    if (!import.meta.env.DEV) {
      return;
    }

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.columns; col += 1) {
        const tile = this.tileAtCoord(col, row);
        if (!tile || tile === '.') {
          continue;
        }
        const center = this.groundToScreen(col + 0.5, row + 0.55);
        const label = this.add
          .text(center.x, center.y, tile, {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 1, y: 0 },
          })
          .setOrigin(0.5)
          .setDepth(901)
          .setVisible(false);
        this.debugLabels.push(label);
      }
    }
  }

  private updateInteractionButton(): void {
    if (
      !this.speakButton ||
      !this.barrelMan ||
      this.barrelState !== 'idle' ||
      this.dialogue?.active ||
      this.plantFailing
    ) {
      this.speakButton?.hide();
      return;
    }

    const distance = Phaser.Math.Distance.Between(
      this.heroGround.gx,
      this.heroGround.gy,
      this.barrelGround.gx,
      this.barrelGround.gy,
    );
    if (distance > 1.8) {
      this.speakButton.hide();
      return;
    }

    const screen = this.groundToScreen(this.barrelGround.gx, this.barrelGround.gy);
    this.speakButton.showAt(screen.x, screen.y - 44);
    if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryStartDialogue();
    }
  }

  private tryStartDialogue(): void {
    if (this.barrelState !== 'idle' || this.dialogue?.active) {
      return;
    }

    this.speakButton?.hide();
    this.controlsEnabled = false;
    this.dialogue?.start(
      [
        { speaker: 'HERO', text: 'Where am I?' },
        { speaker: 'DIOGENES', text: 'In my way. Now let us wash some lettuce.' },
      ],
      () => {
        this.controlsEnabled = true;
        this.startBarrelRun();
      },
    );
  }

  private updateHero(deltaSeconds: number): void {
    if (!this.hero || !this.heroMover) {
      return;
    }

    this.heroMover.setEnabled(this.controlsEnabled && !this.dialogue?.active && !this.plantFailing);
    this.heroMover.update(deltaSeconds);
  }

  private startBarrelRun(): void {
    if (this.barrelState !== 'idle' || !this.barrelMan) {
      return;
    }

    this.barrelState = 'running';
    this.waypointIndex = 1;
    this.pickBarrelBehavior();
    this.barrelMan.play('barrelman-run', true);
  }

  private updateBarrel(deltaMs: number): void {
    if (!this.barrelMan) {
      return;
    }

    if (this.barrelState === 'running') {
      this.behaviorMs -= deltaMs;
      if (this.behaviorMs <= 0) {
        this.pickBarrelBehavior();
      }
      this.advanceBarrel(deltaMs / 1000);
      this.updateRunningVisual();
      return;
    }

    if (this.barrelState === 'floating') {
      const deltaSeconds = deltaMs / 1000;
      this.floatPhase += deltaSeconds * 4.2;
      this.barrelGround.gx += 0.82 * deltaSeconds;
      this.barrelGround.gy += 0.36 * deltaSeconds;
      this.barrelMan.rotation = Math.sin(this.floatPhase) * 0.14;
      return;
    }

    if (this.barrelState === 'idle') {
      this.barrelMan.setTexture('barrelman_idle_0');
    }
  }

  private pickBarrelBehavior(): void {
    const mode = SPEED_MODES[Math.floor(this.rng() * SPEED_MODES.length)] ?? 'normal';
    this.currentSpeedMode = mode;
    this.currentSpeed = TUNING.barrelGridScene.barrelGridSpeeds[mode];
    this.behaviorMs = Phaser.Math.Linear(
      TUNING.barrelMan.behaviorChangeMs.min,
      TUNING.barrelMan.behaviorChangeMs.max,
      this.rng(),
    );
  }

  private advanceBarrel(deltaSeconds: number): void {
    if (this.waypointIndex >= this.path.length) {
      this.startBarrelFloat();
      return;
    }

    const target = this.path[this.waypointIndex];
    const speedMultiplier = this.canExposeBarrel() ? TUNING.barrelMan.exposedSpeedMultiplier : 1;
    let remainingDistance = this.currentSpeed * speedMultiplier * deltaSeconds;

    while (remainingDistance > 0 && this.waypointIndex < this.path.length) {
      const activeTarget = this.path[this.waypointIndex];
      const dx = activeTarget.gx - this.barrelBaseGround.gx;
      const dy = activeTarget.gy - this.barrelBaseGround.gy;
      const distance = Math.hypot(dx, dy);

      if (distance <= 0.0001) {
        this.waypointIndex += 1;
        continue;
      }

      if (remainingDistance >= distance) {
        this.barrelBaseGround = { ...activeTarget };
        remainingDistance -= distance;
        this.waypointIndex += 1;
        continue;
      }

      this.barrelBaseGround.gx += (dx / distance) * remainingDistance;
      this.barrelBaseGround.gy += (dy / distance) * remainingDistance;
      remainingDistance = 0;
    }

    if (this.waypointIndex >= this.path.length) {
      this.startBarrelFloat();
      return;
    }

    const segmentTarget = this.path[Math.min(this.waypointIndex, this.path.length - 1)] ?? target;
    const sx = segmentTarget.gx - this.barrelBaseGround.gx;
    const sy = segmentTarget.gy - this.barrelBaseGround.gy;
    const length = Math.max(0.0001, Math.hypot(sx, sy));
    this.wobblePhase += deltaSeconds * 3.2;
    const wobble = Math.sin(this.wobblePhase) * TUNING.barrelGridScene.barrelWobble;
    this.barrelGround = {
      gx: Phaser.Math.Clamp(this.barrelBaseGround.gx + (-sy / length) * wobble, 0.15, this.columns - 0.15),
      gy: Phaser.Math.Clamp(this.barrelBaseGround.gy + (sx / length) * wobble, 0.15, this.rows - 0.15),
    };
  }

  private startBarrelFloat(): void {
    if (!this.barrelMan || this.barrelState === 'floating') {
      return;
    }

    this.barrelState = 'floating';
    this.audio?.stop('hiss');
    this.barrelGround = { ...this.path[this.path.length - 1] };
    this.barrelBaseGround = { ...this.barrelGround };
    this.floatPhase = 0;
    this.barrelMan.stop();
    this.barrelMan.clearTint();
    this.barrelMan.setTexture('barrelman_tucked_0');
    this.barrelMan.setAngle(-4);
  }

  private updateRunningVisual(): void {
    if (!this.barrelMan) {
      return;
    }

    if (this.exposure >= 2) {
      this.barrelMan.setTint(0xb8ff74);
    } else if (this.exposure >= 1) {
      this.barrelMan.setTint(0x99e86d);
    } else {
      this.barrelMan.clearTint();
    }

    if (this.currentSpeed === 0) {
      this.barrelMan.stop();
      this.barrelMan.setTexture('barrelman_idle_0');
      return;
    }

    this.barrelMan.play('barrelman-run', true);
  }

  private updateProtection(): void {
    const heroTile = this.tileAt(this.heroGround.gx, this.heroGround.gy);
    const heroLight = this.getLightVector(heroTile);
    this.shadowCenter = heroLight
      ? { gx: this.heroGround.gx - heroLight.dx, gy: this.heroGround.gy - heroLight.dy }
      : undefined;

    const barrelCol = Math.floor(this.barrelGround.gx);
    const barrelRow = Math.floor(this.barrelGround.gy);
    const barrelTile = this.tileAtCoord(barrelCol, barrelRow);
    const barrelLight = this.getLightVector(barrelTile);

    this.currentBarrelTile = barrelTile && barrelTile !== '.' ? `${barrelTile} @ ${barrelCol},${barrelRow}` : 'shade';
    this.currentBarrelDirection = barrelLight?.label ?? 'shade';
    this.requiredHeroTile = barrelLight
      ? `${barrelCol + barrelLight.dx}, ${barrelRow + barrelLight.dy}`
      : 'none';

    if (!this.shadowCenter || !barrelLight) {
      this.isProtected = false;
      return;
    }

    this.isProtected =
      Math.abs(this.barrelGround.gx - this.shadowCenter.gx) <=
        TUNING.barrelGridScene.shadowHalfSize &&
      Math.abs(this.barrelGround.gy - this.shadowCenter.gy) <=
        TUNING.barrelGridScene.shadowHalfSize;
  }

  private canExposeBarrel(): boolean {
    return (
      this.barrelState === 'running' &&
      Boolean(this.getLightVector(this.tileAt(this.barrelGround.gx, this.barrelGround.gy))) &&
      !this.isProtected &&
      !this.noPlantMode
    );
  }

  private updateExposure(deltaSeconds: number): void {
    const canExpose = this.canExposeBarrel();
    if (canExpose) {
      this.exposure = Math.min(
        TUNING.barrelMan.exposureToPlantSeconds,
        this.exposure + deltaSeconds,
      );
    } else {
      this.exposure = Math.max(
        0,
        this.exposure - TUNING.barrelMan.exposureDecayPerSecond * deltaSeconds,
      );
    }

    if (
      this.exposure >= TUNING.barrelMan.exposureToPlantSeconds &&
      this.barrelState === 'running' &&
      !this.plantFailing
    ) {
      this.failIntoPlant();
    }
  }

  private updateExposureAudio(): void {
    if (this.canExposeBarrel()) {
      this.audio?.loop('hiss', { volume: 0.32 });
      return;
    }
    this.audio?.stop('hiss');
  }

  private failIntoPlant(): void {
    if (!this.barrelMan) {
      return;
    }

    this.barrelState = 'plant';
    this.plantFailing = true;
    this.controlsEnabled = false;
    this.exposure = TUNING.barrelMan.exposureToPlantSeconds;
    this.audio?.stop('hiss');
    this.barrelMan.stop();
    this.barrelMan.clearTint();
    this.barrelMan.setAngle(0);
    this.barrelMan.setTexture('barrelman_plant_0');
    this.barrelMan.setScale(1.12);
    this.cameras.main.shake(140, 0.003);
    this.time.delayedCall(TUNING.barrelGridScene.plantRestartDelayMs, () => fadeRestart(this));
  }

  private renderLightCues(time: number): void {
    if (!this.lightCueGraphics) {
      return;
    }

    this.lightCueGraphics.clear();
    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.columns; col += 1) {
        const tile = this.tileAtCoord(col, row);
        const vector = this.getLightVector(tile);
        if (!vector) {
          continue;
        }
        const center = this.groundToScreen(col + 0.5, row + 0.5);
        const travel = this.groundDeltaToScreenDelta(-vector.dx, -vector.dy);
        const length = Math.max(0.001, Math.hypot(travel.x, travel.y));
        const nx = travel.x / length;
        const ny = travel.y / length;
        const pulse = ((time / 260 + col * 0.37 + row * 0.21) % 1) - 0.5;
        this.lightCueGraphics.lineStyle(2, 0xffee8a, 0.18 + Math.abs(pulse) * 0.2);
        const startX = center.x - nx * (8 + pulse * 4);
        const startY = center.y - ny * (5 + pulse * 2);
        const endX = center.x + nx * (8 - pulse * 4);
        const endY = center.y + ny * (5 - pulse * 2);
        this.lightCueGraphics.lineBetween(
          startX,
          startY,
          endX,
          endY,
        );
        this.drawLightArrowHead(
          this.lightCueGraphics,
          endX,
          endY,
          nx,
          ny,
          6,
          0.3 + Math.abs(pulse) * 0.28,
        );
      }
    }
  }

  private drawLightArrowHead(
    graphics: Phaser.GameObjects.Graphics,
    headX: number,
    headY: number,
    nx: number,
    ny: number,
    size: number,
    alpha: number,
  ): void {
    const baseX = headX - nx * size;
    const baseY = headY - ny * size;
    const sideX = -ny * size * 0.58;
    const sideY = nx * size * 0.58;

    graphics.fillStyle(0xffee8a, alpha);
    graphics.fillTriangle(
      headX,
      headY,
      baseX + sideX,
      baseY + sideY,
      baseX - sideX,
      baseY - sideY,
    );
  }

  private renderShadow(): void {
    if (!this.shadowGraphics) {
      return;
    }

    this.shadowGraphics.clear();
    if (!this.shadowCenter) {
      return;
    }

    const half = TUNING.barrelGridScene.shadowHalfSize;
    const points = [
      this.groundToScreen(this.shadowCenter.gx - half, this.shadowCenter.gy - half),
      this.groundToScreen(this.shadowCenter.gx + half, this.shadowCenter.gy - half),
      this.groundToScreen(this.shadowCenter.gx + half, this.shadowCenter.gy + half),
      this.groundToScreen(this.shadowCenter.gx - half, this.shadowCenter.gy + half),
    ].map((point) => new Phaser.Geom.Point(point.x, point.y));

    this.shadowGraphics.fillStyle(0x0b0c13, 0.42);
    this.shadowGraphics.fillPoints(points, true);
  }

  private renderLeaves(): void {
    if (!this.leafGraphics || !this.barrelMan) {
      this.leafGraphics?.clear();
      return;
    }

    if (this.barrelState !== 'plant' && (this.exposure < 1 || this.barrelState !== 'running')) {
      this.leafGraphics.clear();
      return;
    }

    this.leafGraphics.clear();
    const screen = this.groundToScreen(this.barrelGround.gx, this.barrelGround.gy);
    const count = this.barrelState === 'plant' ? 12 : this.exposure >= 2 ? 8 : 4;
    this.leafGraphics.fillStyle(0x88d454, 0.7);
    for (let index = 0; index < count; index += 1) {
      const angle = index * 0.9 + this.exposure * 1.8 + (this.barrelState === 'plant' ? 0.6 : 0);
      this.leafGraphics.fillEllipse(
        screen.x + Math.cos(angle) * 13,
        screen.y - 26 + Math.sin(angle) * 7,
        5,
        3,
      );
    }
  }

  private renderLightDebug(): void {
    if (!this.debugLightGraphics) {
      return;
    }

    this.debugLightGraphics.clear();
    if (!this.showLightDebug) {
      return;
    }

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.columns; col += 1) {
        const vector = this.getLightVector(this.tileAtCoord(col, row));
        if (!vector) {
          continue;
        }
        const start = this.groundToScreen(col + 0.5, row + 0.5);
        const end = this.groundToScreen(col + 0.5 + vector.dx * 0.32, row + 0.5 + vector.dy * 0.32);
        this.debugLightGraphics.lineStyle(1, 0xffffff, 0.75);
        this.debugLightGraphics.lineBetween(start.x, start.y, end.x, end.y);
        this.debugLightGraphics.fillStyle(0xffffff, 0.75);
        this.debugLightGraphics.fillCircle(end.x, end.y, 2);
      }
    }
  }

  private renderLampGlow(time: number): void {
    if (!this.lampGlowGraphics || !this.barrelMan) {
      return;
    }

    this.lampGlowGraphics.clear();
    if (this.barrelState === 'floating' || this.barrelState === 'plant') {
      return;
    }

    const screen = this.groundToScreen(this.barrelGround.gx, this.barrelGround.gy);
    const lampX = Math.round(screen.x + 7);
    const lampY = Math.round(screen.y - 4);
    const pulse = 0.5 + Math.sin(time * 0.012) * 0.5;

    this.lampGlowGraphics.fillStyle(0xf6d743, 0.12 + pulse * 0.04);
    this.lampGlowGraphics.fillEllipse(lampX + 4, lampY, 34, 22);
    this.lampGlowGraphics.fillStyle(0xf28f3b, 0.1 + pulse * 0.03);
    this.lampGlowGraphics.fillEllipse(lampX + 8, lampY + 1, 22, 14);
    this.lampGlowGraphics.lineStyle(1, 0xf6d743, 0.42 + pulse * 0.18);
    this.lampGlowGraphics.lineBetween(lampX + 3, lampY - 2, lampX + 21, lampY - 9);
    this.lampGlowGraphics.lineBetween(lampX + 4, lampY + 1, lampX + 23, lampY + 1);
    this.lampGlowGraphics.lineBetween(lampX + 2, lampY + 4, lampX + 18, lampY + 11);
  }

  private renderWaterWake(time: number): void {
    if (!this.waterWakeGraphics || !this.barrelMan) {
      return;
    }

    this.waterWakeGraphics.clear();
    if (this.barrelState !== 'floating') {
      return;
    }

    const screen = this.groundToScreen(this.barrelGround.gx, this.barrelGround.gy);
    const pulse = Math.sin(time * 0.012) * 3;
    this.waterWakeGraphics.lineStyle(2, 0x9bd0df, 0.5);
    this.waterWakeGraphics.lineBetween(screen.x - 23, screen.y + 5, screen.x - 9, screen.y + 3 + pulse);
    this.waterWakeGraphics.lineBetween(screen.x - 20, screen.y + 13, screen.x + 15, screen.y + 11 - pulse);
    this.waterWakeGraphics.lineStyle(1, 0x173c50, 0.28);
    this.waterWakeGraphics.lineBetween(screen.x - 30, screen.y + 18, screen.x + 23, screen.y + 16);
  }

  private syncActorSprites(): void {
    if (!this.hero || !this.barrelMan) {
      return;
    }

    const heroScreen = this.groundToScreen(this.heroGround.gx, this.heroGround.gy);
    this.hero.setPosition(Math.round(heroScreen.x), Math.round(heroScreen.y + 7));
    const barrelScreen = this.groundToScreen(this.barrelGround.gx, this.barrelGround.gy);
    const floatBob = this.barrelState === 'floating' ? Math.sin(this.floatPhase * 1.7) * 3 : 0;
    this.barrelMan.setPosition(Math.round(barrelScreen.x), Math.round(barrelScreen.y + 7 + floatBob));
    this.hero.setDepth(Math.round(heroScreen.y + 20));
    this.barrelMan.setDepth(Math.round(barrelScreen.y + 20));
  }

  private updateCamera(): void {
    const focusGround = this.plantFailing || this.barrelState === 'floating' ? this.barrelGround : this.heroGround;
    const focusScreen = this.groundToScreen(focusGround.gx, focusGround.gy);
    const maxScrollX = Math.max(0, this.worldWidth - GAME_WIDTH);
    const scrollX = Phaser.Math.Clamp(
      focusScreen.x - GAME_WIDTH * (this.plantFailing ? 0.5 : 0.36),
      0,
      maxScrollX,
    );
    this.cameras.main.setScroll(scrollX, 0);
  }

  private updateWaterEnding(): void {
    if (
      this.transitionStarted ||
      this.barrelState !== 'floating' ||
      this.barrelGround.gx <= this.columns + 1.35
    ) {
      return;
    }

    this.transitionStarted = true;
    fadeToScene(this, ROUTE_TO_SCENE_KEY.illusion);
  }

  private groundDeltaToScreenDelta(dx: number, dy: number): ScreenPoint {
    return this.groundPlane.groundDeltaToScreenDelta(dx, dy);
  }

  private validateGrid(): void {
    const rowLengths = new Set(GRID_MAP.map((row) => row.length));
    if (rowLengths.size !== 1) {
      console.warn('[BarrelGridScene] Grid rows must all have equal length.');
    }

    const impossiblePathTiles = new Map<string, string>();
    const impossiblePathSequence: string[] = [];

    for (let row = 0; row < this.rows; row += 1) {
      for (let col = 0; col < this.columns; col += 1) {
        const tile = this.tileAtCoord(col, row);
        const vector = this.getLightVector(tile);
        if (!vector) {
          continue;
        }

        if (!this.isInsideTile(col + vector.dx, row + vector.dy)) {
          console.warn(
            `[BarrelGridScene] Lit tile ${tile} at ${col},${row} points outside the board.`,
          );
        }

        for (let ny = -1; ny <= 1; ny += 1) {
          for (let nx = -1; nx <= 1; nx += 1) {
            if (nx === 0 && ny === 0) {
              continue;
            }
            const neighbor = this.tileAtCoord(col + nx, row + ny);
            if (neighbor && neighbor !== '.' && neighbor !== tile) {
              console.warn(
                `[BarrelGridScene] Different light neighbours at ${col},${row} and ${col + nx},${row + ny}.`,
              );
            }
          }
        }
      }
    }

    for (let index = 0; index < this.path.length - 1; index += 1) {
      const start = this.path[index];
      const end = this.path[index + 1];
      const distance = Phaser.Math.Distance.Between(start.gx, start.gy, end.gx, end.gy);
      const steps = Math.max(1, Math.ceil(distance / 0.05));

      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        const gx = Phaser.Math.Linear(start.gx, end.gx, t);
        const gy = Phaser.Math.Linear(start.gy, end.gy, t);
        const col = Math.floor(gx);
        const row = Math.floor(gy);
        const tile = this.tileAtCoord(col, row);
        const vector = this.getLightVector(tile);
        if (!vector) {
          continue;
        }

        const requiredTile = this.tileAtCoord(col + vector.dx, row + vector.dy);
        if (requiredTile !== tile) {
          const key = `${col},${row}`;
          if (!impossiblePathTiles.has(key)) {
            impossiblePathTiles.set(key, `${tile} at ${key}, needs ${col + vector.dx},${row + vector.dy}`);
            impossiblePathSequence.push(key);
          }
        }
      }
    }

    if (impossiblePathTiles.size > 0) {
      console.warn(
        `[BarrelGridScene] Path protection notices: ${[...impossiblePathTiles.values()].join('; ')}.`,
      );
    }

    let consecutive = 1;
    for (let index = 1; index < impossiblePathSequence.length; index += 1) {
      const previous = impossiblePathSequence[index - 1];
      const current = impossiblePathSequence[index];
      if (this.areNeighbourTileKeys(previous, current)) {
        consecutive += 1;
        if (consecutive >= 2) {
          console.warn(
            `[BarrelGridScene] Consecutive impossible path protection starts at ${previous}.`,
          );
          break;
        }
      } else {
        consecutive = 1;
      }
    }
  }

  private areNeighbourTileKeys(a: string, b: string): boolean {
    const [aCol, aRow] = a.split(',').map(Number);
    const [bCol, bRow] = b.split(',').map(Number);
    return Math.max(Math.abs(aCol - bCol), Math.abs(aRow - bRow)) <= 1;
  }
}
