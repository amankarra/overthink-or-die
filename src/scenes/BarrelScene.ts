import Phaser from 'phaser';
import { GAME_HEIGHT, TUNING } from '../config';
import { BarrelMan } from '../entities/BarrelMan';
import { Player } from '../entities/Player';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DialogueSystem } from '../systems/DialogueSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { DialogueBox } from '../ui/DialogueBox';
import { InteractionButton } from '../ui/InteractionButton';
import { fadeRestart, fadeToScene, ROUTE_TO_SCENE_KEY, setupSceneHotkeys } from '../util/sceneRouting';

type LightDirection = 'LEFT' | 'RIGHT';

type LightZone = {
  name: string;
  x: number;
  width: number;
  direction: LightDirection;
  angle: number;
};

type ShadowSpan = {
  left: number;
  right: number;
};

const LIGHT_ZONES: LightZone[] = [
  { name: 'L1', x: 220, width: 120, direction: 'LEFT', angle: 45 },
  { name: 'L2', x: 430, width: 120, direction: 'RIGHT', angle: 40 },
  { name: 'L3', x: 650, width: 130, direction: 'LEFT', angle: 60 },
  { name: 'L4', x: 870, width: 120, direction: 'RIGHT', angle: 35 },
];

export class BarrelScene extends Phaser.Scene {
  private player?: Player;
  private barrelMan?: BarrelMan;
  private interaction?: InteractionSystem;
  private speakButton?: InteractionButton;
  private debugOverlay?: DebugOverlay;
  private shadowGraphics?: Phaser.GameObjects.Graphics;
  private leafGraphics?: Phaser.GameObjects.Graphics;
  private exposure = 0;
  private protected = false;
  private currentZoneName = 'shade';
  private shadowSpan?: ShadowSpan;
  private transitionStarted = false;
  private plantFailing = false;
  private noPlantMode = false;
  private noPlantKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('BarrelScene');
  }

  create(): void {
    setupSceneHotkeys(this);
    this.validateLightZones();
    this.cameras.main.setBackgroundColor('#647879');
    this.physics.world.setBounds(0, 0, TUNING.barrelScene.worldWidth, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, TUNING.barrelScene.worldWidth, GAME_HEIGHT);

    this.drawBackground();

    const ground = this.physics.add.staticGroup();
    for (let x = 8; x < TUNING.barrelScene.worldWidth + 8; x += 16) {
      ground.create(x, TUNING.barrelScene.groundY, 'ground_tile_0').setOrigin(0.5, 0);
    }
    ground.refresh();

    this.drawSlide();
    this.shadowGraphics = this.add.graphics().setDepth(8);
    this.leafGraphics = this.add.graphics().setDepth(14);

    this.player = new Player(
      this,
      TUNING.barrelScene.playerStartX,
      TUNING.barrelScene.playerStartY,
    );
    this.physics.add.collider(this.player, ground);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.barrelMan = new BarrelMan(
      this,
      TUNING.barrelScene.barrelStartX,
      TUNING.barrelScene.barrelStartY,
    );

    const dialogueBox = new DialogueBox(this);
    const dialogue = new DialogueSystem(this, dialogueBox, this.player);
    this.speakButton = new InteractionButton(this);
    this.interaction = new InteractionSystem(this, this.player, this.barrelMan, this.speakButton, dialogue, () => {
      dialogue.start(
        [
          { speaker: 'HERO', text: 'Where am I?' },
          { speaker: 'BARREL MAN', text: 'In my way. Now let us wash some lettuce.' },
        ],
        () => this.barrelMan?.startRunning(),
      );
    });

    if (import.meta.env.DEV && this.input.keyboard) {
      this.noPlantKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
    }

    this.debugOverlay = new DebugOverlay(this, () => this.player, () => ({
      exposure: this.exposure.toFixed(2),
      protected: this.protected,
      zone: this.currentZoneName,
      shadow: this.shadowSpan
        ? `${Math.round(this.shadowSpan.left)}-${Math.round(this.shadowSpan.right)}`
        : 'none',
      noPlant: this.noPlantMode,
    }));
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.barrelMan || !this.shadowGraphics || !this.leafGraphics) {
      return;
    }

    if (this.noPlantKey && Phaser.Input.Keyboard.JustDown(this.noPlantKey)) {
      this.noPlantMode = !this.noPlantMode;
    }

    if (this.barrelMan.isIdle) {
      this.interaction?.update();
    } else {
      this.speakButton?.hide();
    }
    this.player.update();

    const barrelZone = this.findZoneAt(this.barrelMan.x);
    const playerZone = this.findZoneAt(this.player.x);
    this.currentZoneName = barrelZone?.name ?? 'shade';
    this.shadowSpan = playerZone ? this.calculateShadowSpan(playerZone) : undefined;
    this.protected = Boolean(
      barrelZone &&
        playerZone &&
        barrelZone.name === playerZone.name &&
        this.shadowSpan &&
        this.barrelMan.x >= this.shadowSpan.left &&
        this.barrelMan.x <= this.shadowSpan.right,
    );

    const canExpose =
      this.barrelMan.isRunning && Boolean(barrelZone) && !this.protected && !this.noPlantMode;
    const speedMultiplier = canExpose
      ? TUNING.barrelMan.exposedSpeedMultiplier
      : 1;

    this.barrelMan.update(delta, speedMultiplier, this.exposure);
    this.updateExposure(delta / 1000, canExpose);
    this.renderShadow(playerZone);
    this.renderLeaves();
    this.updateSlideEnding();
    this.debugOverlay?.update();
  }

  private validateLightZones(): void {
    const exposedSpeed =
      TUNING.barrelMan.speeds.normal * TUNING.barrelMan.exposedSpeedMultiplier;
    const requiredWidth = exposedSpeed * TUNING.barrelMan.exposureToPlantSeconds;
    for (const zone of LIGHT_ZONES) {
      if (zone.width <= requiredWidth) {
        console.warn(
          `${zone.name} width ${zone.width} should be greater than exposed speed plant width ${requiredWidth.toFixed(2)}.`,
        );
      }
    }
  }

  private drawBackground(): void {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x758b8d, 1);
    graphics.fillRect(0, 0, TUNING.barrelScene.worldWidth, TUNING.barrelScene.groundY);

    let shadeStart = 0;
    for (const zone of LIGHT_ZONES) {
      if (zone.x > shadeStart) {
        graphics.fillStyle(0x1a1d28, TUNING.barrelScene.shadeAlpha);
        graphics.fillRect(shadeStart, 0, zone.x - shadeStart, TUNING.barrelScene.groundY);
      }
      this.drawLightZone(graphics, zone);
      shadeStart = zone.x + zone.width;
    }

    if (shadeStart < TUNING.barrelScene.worldWidth) {
      graphics.fillStyle(0x1a1d28, TUNING.barrelScene.shadeAlpha);
      graphics.fillRect(
        shadeStart,
        0,
        TUNING.barrelScene.worldWidth - shadeStart,
        TUNING.barrelScene.groundY,
      );
    }
  }

  private drawLightZone(graphics: Phaser.GameObjects.Graphics, zone: LightZone): void {
    graphics.fillStyle(0xf6d743, 0.08);
    graphics.fillRect(zone.x, 0, zone.width, TUNING.barrelScene.groundY);

    const offset = TUNING.barrelScene.groundY / Math.tan(Phaser.Math.DegToRad(zone.angle));
    const sign = zone.direction === 'LEFT' ? 1 : -1;
    const zoneRight = zone.x + zone.width;

    graphics.lineStyle(12, 0xf6d743, TUNING.barrelScene.lightAlpha);
    for (let x = zone.x - offset; x < zoneRight + offset; x += 28) {
      const clipped = this.clipLineToRect(
        x,
        0,
        x + sign * offset,
        TUNING.barrelScene.groundY,
        zone.x,
        0,
        zoneRight,
        TUNING.barrelScene.groundY,
      );
      if (clipped) {
        graphics.lineBetween(clipped.x1, clipped.y1, clipped.x2, clipped.y2);
      }
    }

    graphics.lineStyle(1, 0xffffff, 0.18);
    graphics.strokeRect(zone.x, 0, zone.width, TUNING.barrelScene.groundY);
  }

  private clipLineToRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    left: number,
    top: number,
    right: number,
    bottom: number,
  ): { x1: number; y1: number; x2: number; y2: number } | undefined {
    let t0 = 0;
    let t1 = 1;
    const dx = x2 - x1;
    const dy = y2 - y1;

    const clip = (p: number, q: number): boolean => {
      if (p === 0) {
        return q >= 0;
      }
      const r = q / p;
      if (p < 0) {
        if (r > t1) {
          return false;
        }
        if (r > t0) {
          t0 = r;
        }
      } else if (p > 0) {
        if (r < t0) {
          return false;
        }
        if (r < t1) {
          t1 = r;
        }
      }
      return true;
    };

    if (
      !clip(-dx, x1 - left) ||
      !clip(dx, right - x1) ||
      !clip(-dy, y1 - top) ||
      !clip(dy, bottom - y1)
    ) {
      return undefined;
    }

    return {
      x1: x1 + t0 * dx,
      y1: y1 + t0 * dy,
      x2: x1 + t1 * dx,
      y2: y1 + t1 * dy,
    };
  }

  private drawSlide(): void {
    const graphics = this.add.graphics().setDepth(2);
    const slideX = TUNING.barrelScene.slideX;
    graphics.fillStyle(0x3b4451, 1);
    graphics.fillPoints(
      [
        new Phaser.Geom.Point(slideX, TUNING.barrelScene.groundY),
        new Phaser.Geom.Point(TUNING.barrelScene.worldWidth, TUNING.barrelScene.groundY),
        new Phaser.Geom.Point(TUNING.barrelScene.worldWidth, GAME_HEIGHT),
        new Phaser.Geom.Point(slideX + 48, GAME_HEIGHT),
      ],
      true,
    );
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokePoints(
      [
        new Phaser.Geom.Point(slideX, TUNING.barrelScene.groundY),
        new Phaser.Geom.Point(TUNING.barrelScene.worldWidth, GAME_HEIGHT),
      ],
      false,
    );

    for (let x = slideX + 12; x < TUNING.barrelScene.worldWidth; x += 16) {
      const y = TUNING.barrelScene.groundY + (x - slideX) * 0.45;
      this.add.image(x, y, 'slide_tile_0').setDepth(3).setAngle(24);
    }
  }

  private updateExposure(deltaSeconds: number, canExpose: boolean): void {
    if (!this.barrelMan || this.barrelMan.isPlant || this.barrelMan.isRolling) {
      return;
    }

    if (canExpose) {
      this.exposure += deltaSeconds;
    } else {
      this.exposure = Math.max(
        0,
        this.exposure - TUNING.barrelMan.exposureDecayPerSecond * deltaSeconds,
      );
    }

    if (
      this.exposure >= TUNING.barrelMan.exposureToPlantSeconds &&
      !this.noPlantMode &&
      !this.plantFailing
    ) {
      this.plantFailing = true;
      this.barrelMan.becomePlant();
      this.player?.setControlsEnabled(false);
      this.time.delayedCall(TUNING.barrelScene.plantRestartDelayMs, () => fadeRestart(this));
    }
  }

  private renderShadow(playerZone: LightZone | undefined): void {
    if (!this.shadowGraphics) {
      return;
    }

    this.shadowGraphics.clear();
    if (!playerZone || !this.shadowSpan) {
      return;
    }

    const directionOffset = playerZone.direction === 'LEFT' ? 7 : -7;
    const groundY = TUNING.barrelScene.groundY + TUNING.barrelScene.shadowYOffset;
    this.shadowGraphics.fillStyle(0x08080c, 0.42);
    this.shadowGraphics.fillPoints(
      [
        new Phaser.Geom.Point(this.shadowSpan.left, groundY),
        new Phaser.Geom.Point(this.shadowSpan.right, groundY),
        new Phaser.Geom.Point(
          this.shadowSpan.right + directionOffset,
          groundY + TUNING.barrelScene.shadowHeight,
        ),
        new Phaser.Geom.Point(
          this.shadowSpan.left + directionOffset,
          groundY + TUNING.barrelScene.shadowHeight,
        ),
      ],
      true,
    );
  }

  private renderLeaves(): void {
    if (!this.leafGraphics || !this.barrelMan) {
      return;
    }

    this.leafGraphics.clear();
    if (this.exposure < 2 || this.barrelMan.isPlant || this.barrelMan.isRolling) {
      return;
    }

    this.leafGraphics.fillStyle(0x9be56d, 1);
    this.leafGraphics.fillRect(this.barrelMan.x - 7, this.barrelMan.y - 34, 5, 3);
    this.leafGraphics.fillRect(this.barrelMan.x + 2, this.barrelMan.y - 37, 6, 3);
    this.leafGraphics.fillRect(this.barrelMan.x - 1, this.barrelMan.y - 41, 3, 6);
  }

  private updateSlideEnding(): void {
    if (!this.player || !this.barrelMan || this.transitionStarted || this.plantFailing) {
      return;
    }

    if (this.barrelMan.isRunning && this.barrelMan.x >= TUNING.barrelScene.slideX) {
      this.barrelMan.startRolling();
      this.exposure = 0;
      this.shadowGraphics?.clear();
    }

    if (
      this.barrelMan.isRolling &&
      this.player.x >= TUNING.barrelScene.slideX - TUNING.player.width
    ) {
      this.transitionStarted = true;
      this.player.setControlsEnabled(false);
      fadeToScene(this, ROUTE_TO_SCENE_KEY.illusion);
    }
  }

  private findZoneAt(x: number): LightZone | undefined {
    return LIGHT_ZONES.find((zone) => x >= zone.x && x <= zone.x + zone.width);
  }

  private calculateShadowSpan(zone: LightZone): ShadowSpan {
    if (!this.player) {
      return { left: 0, right: 0 };
    }

    const shadowLength = TUNING.player.height / Math.tan(Phaser.Math.DegToRad(zone.angle));
    const playerLeft = this.player.x - TUNING.player.width / 2;
    const playerRight = this.player.x + TUNING.player.width / 2;

    if (zone.direction === 'LEFT') {
      return {
        left: playerLeft,
        right: playerRight + shadowLength,
      };
    }

    return {
      left: playerLeft - shadowLength,
      right: playerRight,
    };
  }
}
