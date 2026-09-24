import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config';
import { Player } from '../entities/Player';
import { AudioManager } from '../systems/AudioManager';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DialogueSystem } from '../systems/DialogueSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { DialogueBox } from '../ui/DialogueBox';
import { InteractionButton } from '../ui/InteractionButton';
import { fadeToScene, ROUTE_TO_SCENE_KEY, setupSceneHotkeys } from '../util/sceneRouting';

type DoorTrap = {
  sprite: Phaser.Types.Physics.Arcade.ImageWithStaticBody;
  labelPanel: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};

const DOOR_LABELS = [
  'ENTRANCE',
  'EXIT',
  'ENTRANCE\n& EXIT',
  'NEITHER\nENTRANCE\nNOR EXIT',
] as const;

export class IllusionScene extends Phaser.Scene {
  private audio?: AudioManager;
  private player?: Player;
  private meditator?: Phaser.GameObjects.Image;
  private interaction?: InteractionSystem;
  private speakButton?: InteractionButton;
  private debugOverlay?: DebugOverlay;
  private wallBlock?: Phaser.Types.Physics.Arcade.ImageWithStaticBody;
  private wallCollider?: Phaser.Physics.Arcade.Collider;
  private wallVisual?: Phaser.GameObjects.Container;
  private doors: DoorTrap[] = [];
  private talked = false;
  private wallCollisionOn = false;
  private failingDoor = false;
  private completing = false;
  private readonly handleDoorInteract = (): void => this.tryFailOverlappingDoor();

  constructor() {
    super('IllusionScene');
  }

  create(): void {
    this.resetRunState();
    setupSceneHotkeys(this);
    this.audio = new AudioManager(this);
    this.audio.loop('nagarjuna_music', { volume: 0.15 });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.audio?.stop('nagarjuna_music');
    });
    this.cameras.main.setBackgroundColor('#18202f');
    this.physics.world.setBounds(0, 0, TUNING.illusionScene.worldWidth, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawBackground();
    const ground = this.createGround();

    this.player = new Player(
      this,
      TUNING.illusionScene.playerStartX,
      TUNING.illusionScene.playerStartY,
    );
    this.physics.add.collider(this.player, ground);

    this.createWall();
    const meditator = this.createMeditator();
    this.createDoors();

    const dialogueBox = new DialogueBox(this);
    const dialogue = new DialogueSystem(this, dialogueBox, this.player);
    this.speakButton = new InteractionButton(this);
    this.interaction = new InteractionSystem(
      this,
      this.player,
      meditator,
      this.speakButton,
      dialogue,
      () => this.startMeditatorDialogue(dialogue),
    );
    this.input.keyboard?.on('keydown-E', this.handleDoorInteract);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-E', this.handleDoorInteract);
    });

    if (this.failureCount >= 4) {
      this.flickerWall();
    }

    this.debugOverlay = new DebugOverlay(this, () => this.player, () => ({
      illusionFailures: this.failureCount,
      wallCollision: this.wallCollisionOn ? 'on' : 'off',
      talked: this.talked,
    }));
  }

  update(): void {
    if (!this.player) {
      return;
    }

    this.player.update();
    if (this.talked) {
      this.speakButton?.hide();
    } else {
      this.interaction?.update();
    }

    this.checkWalkthroughSuccess();
    this.debugOverlay?.update();
  }

  private resetRunState(): void {
    this.doors = [];
    this.talked = false;
    this.wallCollisionOn = false;
    this.failingDoor = false;
    this.completing = false;
  }

  private get failureCount(): number {
    const value = Number(this.registry.get('illusionFailures') ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  private setFailureCount(value: number): void {
    this.registry.set('illusionFailures', value);
  }

  private drawBackground(): void {
    const graphics = this.add.graphics().setDepth(0);
    this.drawMonasterySky(graphics);
    this.drawDistantMonastery(graphics);
    this.drawStoneTerrace(graphics);
  }

  private drawMonasterySky(graphics: Phaser.GameObjects.Graphics): void {
    const top = new Phaser.Display.Color(0x10, 0x14, 0x22);
    const bottom = new Phaser.Display.Color(0x4b, 0x35, 0x4b);
    for (let y = 0; y < 170; y += 4) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, 170, y);
      graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      graphics.fillRect(0, y, GAME_WIDTH, 4);
    }

    graphics.fillStyle(0xd7c78e, 0.12);
    graphics.fillCircle(380, 44, 34);
    graphics.fillStyle(0xf6d743, 0.12);
    graphics.fillCircle(380, 44, 18);
  }

  private drawDistantMonastery(graphics: Phaser.GameObjects.Graphics): void {
    const horizonY = 170;

    graphics.fillStyle(0x161b2a, 0.7);
    graphics.fillTriangle(0, horizonY, 72, 116, 156, horizonY);
    graphics.fillTriangle(96, horizonY, 196, 104, 320, horizonY);
    graphics.fillTriangle(270, horizonY, 388, 112, 480, horizonY);

    this.drawStupa(graphics, 62, horizonY, 0.85);
    this.drawStupa(graphics, 360, horizonY + 1, 1);
    this.drawMonasteryWall(graphics, 182, horizonY);
    this.drawBodhiTree(graphics, 432, horizonY);
    this.drawPrayerFlags(graphics, 132, 132, 246, 132, 10);

    graphics.fillStyle(0x30384a, 1);
    graphics.fillRect(0, horizonY, GAME_WIDTH, 8);
    graphics.fillStyle(0x6b5c4a, 0.65);
    graphics.fillRect(0, horizonY + 6, GAME_WIDTH, 3);
  }

  private drawStupa(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    baseY: number,
    scale: number,
  ): void {
    const width = 58 * scale;
    const domeH = 27 * scale;
    graphics.fillStyle(0xd8d1bd, 0.92);
    graphics.fillRect(x - width / 2, baseY - 8 * scale, width, 8 * scale);
    graphics.fillEllipse(x, baseY - 9 * scale, width * 0.9, domeH);
    graphics.fillStyle(0xf1ead2, 0.92);
    graphics.fillRect(x - 12 * scale, baseY - 38 * scale, 24 * scale, 14 * scale);
    graphics.fillStyle(0xc6b98f, 0.9);
    graphics.fillRect(x - 18 * scale, baseY - 25 * scale, 36 * scale, 4 * scale);
    graphics.fillRect(x - 14 * scale, baseY - 42 * scale, 28 * scale, 3 * scale);
    graphics.fillStyle(0xd8d1bd, 0.92);
    graphics.fillTriangle(x - 9 * scale, baseY - 42 * scale, x, baseY - 57 * scale, x + 9 * scale, baseY - 42 * scale);
    graphics.lineStyle(1, 0xf6d743, 0.5);
    graphics.lineBetween(x, baseY - 57 * scale, x, baseY - 68 * scale);
  }

  private drawMonasteryWall(graphics: Phaser.GameObjects.Graphics, x: number, baseY: number): void {
    graphics.fillStyle(0x5a4650, 0.9);
    graphics.fillRect(x - 62, baseY - 39, 124, 39);
    graphics.fillStyle(0x8f6b5a, 0.95);
    graphics.fillRect(x - 70, baseY - 44, 140, 6);
    graphics.fillStyle(0xd8d1bd, 0.9);
    for (let col = 0; col < 5; col += 1) {
      graphics.fillRect(x - 47 + col * 23, baseY - 29, 9, 16);
      graphics.fillRect(x - 49 + col * 23, baseY - 12, 13, 3);
    }
  }

  private drawBodhiTree(graphics: Phaser.GameObjects.Graphics, x: number, baseY: number): void {
    graphics.fillStyle(0x332417, 0.92);
    graphics.fillRect(x - 3, baseY - 35, 7, 35);
    graphics.lineStyle(3, 0x332417, 0.85);
    graphics.lineBetween(x, baseY - 27, x - 19, baseY - 50);
    graphics.lineBetween(x + 1, baseY - 26, x + 22, baseY - 53);
    graphics.fillStyle(0x294735, 0.82);
    for (let index = 0; index < 20; index += 1) {
      const angle = index * 0.75;
      const radius = 13 + (index % 5) * 3;
      graphics.fillEllipse(x + Math.cos(angle) * radius, baseY - 55 + Math.sin(angle) * 13, 14, 9);
    }
  }

  private drawPrayerFlags(
    graphics: Phaser.GameObjects.Graphics,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    sag: number,
  ): void {
    const controlX = (startX + endX) / 2;
    const controlY = (startY + endY) / 2 + sag;
    const pointOnThread = (t: number): Phaser.Math.Vector2 => {
      const inverse = 1 - t;
      return new Phaser.Math.Vector2(
        inverse * inverse * startX + 2 * inverse * t * controlX + t * t * endX,
        inverse * inverse * startY + 2 * inverse * t * controlY + t * t * endY,
      );
    };
    const tangentOnThread = (t: number): Phaser.Math.Vector2 =>
      new Phaser.Math.Vector2(
        2 * (1 - t) * (controlX - startX) + 2 * t * (endX - controlX),
        2 * (1 - t) * (controlY - startY) + 2 * t * (endY - controlY),
      ).normalize();

    graphics.lineStyle(1, 0xd8d1bd, 0.55);
    let previous = pointOnThread(0);
    for (let step = 1; step <= 18; step += 1) {
      const current = pointOnThread(step / 18);
      graphics.lineBetween(previous.x, previous.y, current.x, current.y);
      previous = current;
    }

    const colors = [0xf6d743, 0x38d5c8, 0xe84855, 0x9be56d, 0x7e5bef];
    for (let index = 0; index < 8; index += 1) {
      const t = 0.08 + index * 0.12;
      const point = pointOnThread(t);
      const tangent = tangentOnThread(t);
      const normal = new Phaser.Math.Vector2(-tangent.y, tangent.x);
      if (normal.y < 0) {
        normal.negate();
      }
      graphics.fillStyle(colors[index % colors.length], 0.72);
      graphics.fillTriangle(
        point.x,
        point.y,
        point.x + tangent.x * 8,
        point.y + tangent.y * 8,
        point.x + tangent.x * 2 + normal.x * 10,
        point.y + tangent.y * 2 + normal.y * 10,
      );
    }
  }

  private drawStoneTerrace(graphics: Phaser.GameObjects.Graphics): void {
    const topY = 170;

    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(0, topY, GAME_WIDTH, GAME_HEIGHT - topY);
  }

  private createGround(): Phaser.Physics.Arcade.StaticGroup {
    const ground = this.physics.add.staticGroup();
    for (let x = 8; x < TUNING.illusionScene.worldWidth + 8; x += 16) {
      ground.create(x, TUNING.illusionScene.groundY, 'ground_tile_0').setOrigin(0.5, 0).setVisible(false);
    }
    ground.refresh();
    return ground;
  }

  private createWall(): void {
    this.wallVisual = this.add.container(0, 0).setDepth(6);
    const wallArt = this.add.graphics();
    this.drawMonasteryGate(wallArt);
    this.wallVisual.add(wallArt);

    const centerX = TUNING.illusionScene.wallX + TUNING.illusionScene.wallWidth / 2;
    const centerY = TUNING.illusionScene.wallY + TUNING.illusionScene.wallHeight / 2;
    this.wallBlock = this.physics.add
      .staticImage(centerX, centerY, 'wall_tile_0')
      .setVisible(false);
    this.wallBlock.setDisplaySize(
      TUNING.illusionScene.wallWidth,
      TUNING.illusionScene.wallHeight,
    );
    this.wallBlock.refreshBody();
  }

  private drawMonasteryGate(graphics: Phaser.GameObjects.Graphics): void {
    const x = TUNING.illusionScene.wallX;
    const y = TUNING.illusionScene.wallY;
    const w = TUNING.illusionScene.wallWidth;
    const h = TUNING.illusionScene.wallHeight;

    graphics.fillStyle(0x322f3a, 1);
    graphics.fillRect(x - 2, y + 8, w + 4, h - 8);
    graphics.fillStyle(0x7a766e, 1);
    graphics.fillRect(x, y + 12, w, h - 12);
    graphics.fillStyle(0xbfb7a1, 1);
    graphics.fillRect(x - 14, y, w + 22, 8);
    graphics.fillStyle(0xd8d0b8, 1);
    graphics.fillRect(x - 10, y - 8, w + 14, 8);
    graphics.fillStyle(0xeee6ca, 1);
    graphics.fillTriangle(x - 6, y - 8, x + w / 2, y - 24, x + w + 2, y - 8);

    graphics.fillStyle(0x5f5a55, 0.72);
    for (let row = 0; row < 9; row += 1) {
      const blockY = y + 15 + row * 18;
      const offset = row % 2 === 0 ? 0 : 7;
      graphics.fillRect(x + offset, blockY, 12, 7);
      graphics.fillRect(x + 17 - offset / 2, blockY + 8, 11, 7);
    }

    graphics.lineStyle(1, 0xd7ceb8, 0.65);
    graphics.strokeCircle(x + w / 2, y + 34, 9);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      graphics.lineBetween(
        x + w / 2,
        y + 34,
        x + w / 2 + Math.cos(angle) * 9,
        y + 34 + Math.sin(angle) * 9,
      );
    }

    graphics.lineStyle(1, 0x272634, 0.6);
    graphics.lineBetween(x + 6, y + 62, x + 13, y + 80);
    graphics.lineBetween(x + 25, y + 112, x + 18, y + 133);
    graphics.lineBetween(x + 12, y + 152, x + 20, y + 166);

    graphics.fillStyle(0x2d4b35, 0.65);
    graphics.fillRect(x - 2, y + h - 26, 9, 5);
    graphics.fillRect(x + 18, y + h - 42, 12, 4);
    graphics.fillStyle(0x8f8a78, 1);
    graphics.fillRect(x - 4, y + h - 8, w + 8, 8);
  }

  private createMeditator(): Phaser.GameObjects.Image {
    this.meditator = this.add
      .image(
        TUNING.illusionScene.meditatorX,
        TUNING.illusionScene.meditatorY,
        'meditator_meditate_0',
      )
      .setOrigin(0.5, 1)
      .setScale(1.35)
      .setDepth(10);

    this.add
      .ellipse(
        TUNING.illusionScene.meditatorX,
        TUNING.illusionScene.meditatorY + 2,
        54,
        10,
        0x000000,
        0.22,
      )
      .setDepth(4);

    return this.meditator;
  }

  private createDoors(): void {
    this.doors = TUNING.illusionScene.doorXs.map((x, index) => {
      const sprite = this.physics.add
        .staticImage(x, TUNING.illusionScene.doorY, 'door_0')
        .setOrigin(0.5, 1)
        .setDepth(5)
        .setAlpha(0)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      sprite.refreshBody();
      sprite.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: Phaser.Input.Pointer,
          _localX: number,
          _localY: number,
          event: Phaser.Types.Input.EventData,
        ) => {
          event.stopPropagation();
          this.failDoor();
        },
      );

      const labelText = DOOR_LABELS[index];
      const lineCount = labelText.split('\n').length;
      const isVerticalSign = index < 3;
      const labelY = TUNING.illusionScene.doorY - (isVerticalSign ? 60 : 64);
      const labelWidth = isVerticalSign ? 54 : 58;
      const labelHeight = isVerticalSign ? 56 : lineCount * 11 + 9;
      const labelPanel = this.add
        .rectangle(x, labelY, labelWidth, labelHeight, 0x060914, 0.94)
        .setStrokeStyle(1, 0xf6d743, 0.9)
        .setDepth(7)
        .setAlpha(0)
        .setVisible(false);

      const label = this.add
        .text(x, labelY, labelText, {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#fff3a6',
          fixedWidth: labelWidth - 4,
          align: 'center',
          lineSpacing: 2,
        })
        .setOrigin(0.5)
        .setStroke('#05070f', 2)
        .setDepth(8)
        .setAlpha(0)
        .setVisible(false);

      return { sprite, labelPanel, label };
    });
  }

  private startMeditatorDialogue(dialogue: DialogueSystem): void {
    dialogue.start(
      [
        { speaker: 'NOWHERE MAN', text: 'How do I get out of here?' },
        { speaker: 'NAGARJUNA', text: this.getHintText() },
      ],
      () => this.revealDoors(),
    );
  }

  private getHintText(): string {
    if (this.failureCount >= 3) {
      return 'Did I say you had to ask?';
    }
    if (this.failureCount >= 2) {
      return 'You keep asking me.';
    }
    return 'By going there.';
  }

  private revealDoors(): void {
    if (this.talked) {
      return;
    }

    this.talked = true;
    this.meditator?.setTexture('meditator_point_0');
    this.setWallCollisionEnabled(true);

    this.doors.forEach((door, index) => {
      door.sprite.setVisible(true);
      door.labelPanel.setVisible(true);
      door.label.setVisible(true);
      this.tweens.add({
        targets: [door.sprite, door.labelPanel, door.label],
        alpha: 1,
        duration: 160,
        delay: index * 55,
        ease: 'Quad.easeOut',
      });
    });
  }

  private setWallCollisionEnabled(enabled: boolean): void {
    if (!this.player || !this.wallBlock || this.wallCollisionOn === enabled) {
      return;
    }

    this.wallCollisionOn = enabled;
    if (enabled) {
      this.wallCollider = this.physics.add.collider(this.player, this.wallBlock);
      return;
    }

    this.wallCollider?.destroy();
    this.wallCollider = undefined;
  }

  private tryFailOverlappingDoor(): void {
    if (!this.player || !this.talked || this.failingDoor || this.completing) {
      return;
    }

    const playerBounds = this.player.getBounds();
    const overlappingDoor = this.doors.some(
      (door) =>
        door.sprite.visible &&
        Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, door.sprite.getBounds()),
    );
    if (overlappingDoor) {
      this.failDoor();
    }
  }

  private failDoor(): void {
    if (!this.talked || this.failingDoor || this.completing) {
      return;
    }

    this.failingDoor = true;
    this.player?.setControlsEnabled(false);
    this.setFailureCount(this.failureCount + 1);
    this.audio?.play('door_fail');
    fadeToScene(this, ROUTE_TO_SCENE_KEY.illusion);
  }

  private checkWalkthroughSuccess(): void {
    if (!this.player || this.wallCollisionOn || this.failingDoor || this.completing) {
      return;
    }

    if (this.player.x > TUNING.illusionScene.wallRightEdge) {
      this.completing = true;
      this.player.setControlsEnabled(false);
      this.setFailureCount(0);
      fadeToScene(this, ROUTE_TO_SCENE_KEY.boss);
    }
  }

  private flickerWall(): void {
    if (!this.wallVisual) {
      return;
    }

    this.tweens.add({
      targets: this.wallVisual,
      alpha: 0.2,
      duration: 80,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.wallVisual?.setAlpha(1),
    });
  }
}
