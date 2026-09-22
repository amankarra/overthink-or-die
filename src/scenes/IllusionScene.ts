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
    this.audio.loop('music_level', { volume: 0.22 });
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
    graphics.fillStyle(0x18202f, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, TUNING.illusionScene.groundY);
    graphics.fillStyle(0x222b3d, 1);
    graphics.fillRect(0, 170, GAME_WIDTH, TUNING.illusionScene.groundY - 170);

    graphics.lineStyle(1, 0x445066, 0.7);
    for (let x = 0; x <= GAME_WIDTH; x += 32) {
      graphics.lineBetween(x, 170, x - 34, TUNING.illusionScene.groundY);
    }

    graphics.fillStyle(0x0d111d, 0.45);
    graphics.fillRect(0, 0, GAME_WIDTH, 52);
    this.add
      .text(16, 18, 'THE OBVIOUS EXIT', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#87a96b',
      })
      .setDepth(1);
  }

  private createGround(): Phaser.Physics.Arcade.StaticGroup {
    const ground = this.physics.add.staticGroup();
    for (let x = 8; x < TUNING.illusionScene.worldWidth + 8; x += 16) {
      ground.create(x, TUNING.illusionScene.groundY, 'ground_tile_0').setOrigin(0.5, 0);
    }
    ground.refresh();
    return ground;
  }

  private createWall(): void {
    this.wallVisual = this.add.container(0, 0).setDepth(6);
    for (
      let x = TUNING.illusionScene.wallX + 8;
      x < TUNING.illusionScene.wallX + TUNING.illusionScene.wallWidth;
      x += 16
    ) {
      for (
        let y = TUNING.illusionScene.wallY + 8;
        y < TUNING.illusionScene.wallY + TUNING.illusionScene.wallHeight;
        y += 16
      ) {
        this.wallVisual.add(this.add.image(x, y, 'wall_tile_0'));
      }
    }

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

  private createMeditator(): Phaser.GameObjects.Image {
    this.meditator = this.add
      .image(
        TUNING.illusionScene.meditatorX,
        TUNING.illusionScene.meditatorY,
        'meditator_meditate_0',
      )
      .setOrigin(0.5, 1)
      .setDepth(10);

    this.add
      .ellipse(
        TUNING.illusionScene.meditatorX,
        TUNING.illusionScene.meditatorY + 2,
        42,
        8,
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

      const label = this.add
        .text(x, TUNING.illusionScene.doorY - 45, DOOR_LABELS[index], {
          fontFamily: 'monospace',
          fontSize: '7px',
          color: '#ffffff',
          backgroundColor: '#111421',
          fixedWidth: 58,
          align: 'center',
          lineSpacing: -1,
        })
        .setOrigin(0.5, 1)
        .setPadding(0, 2, 0, 2)
        .setDepth(7)
        .setAlpha(0)
        .setVisible(false);

      return { sprite, label };
    });
  }

  private startMeditatorDialogue(dialogue: DialogueSystem): void {
    dialogue.start(
      [
        { speaker: 'HERO', text: 'How do I get out of here?' },
        { speaker: 'MEDITATOR', text: this.getHintText() },
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
      door.label.setVisible(true);
      this.tweens.add({
        targets: [door.sprite, door.label],
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
