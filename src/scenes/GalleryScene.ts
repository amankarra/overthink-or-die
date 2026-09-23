import Phaser from 'phaser';
import { SPRITES } from '../art/sprites';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DebugOverlay } from '../systems/DebugOverlay';
import { setupSceneHotkeys } from '../util/sceneRouting';

type GalleryAnimation = {
  key: string;
  frames: string[];
};

const GALLERY_SCALE = 3;
const GALLERY_PADDING = 14;
const ANIMATIONS: GalleryAnimation[] = [
  { key: 'gallery-hero-walk', frames: ['hero_walk_0', 'hero_walk_1'] },
  { key: 'gallery-hero-dance', frames: ['hero_dance_0', 'hero_dance_1', 'hero_dance_2', 'hero_dance_3'] },
  {
    key: 'gallery-golfer-swing',
    frames: [
      'golfer_silhouette_idle_0',
      'golfer_silhouette_backswing_0',
      'golfer_silhouette_swing_0',
    ],
  },
  { key: 'gallery-barrelman-run', frames: ['barrelman_run_0', 'barrelman_run_1'] },
  {
    key: 'gallery-meditator-dance',
    frames: ['meditator_dance_0', 'meditator_dance_1', 'meditator_dance_2', 'meditator_dance_3'],
  },
  { key: 'gallery-worshipper-pray', frames: ['worshipper_pray_0', 'worshipper_pray_1'] },
  { key: 'gallery-worshipper-walk', frames: ['worshipper_walk_0', 'worshipper_walk_1'] },
  { key: 'gallery-robot-walk', frames: ['robot_walk_0', 'robot_walk_1'] },
];

export class GalleryScene extends Phaser.Scene {
  private debugOverlay?: DebugOverlay;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private maxScrollY = 0;

  constructor() {
    super('GalleryScene');
  }

  create(): void {
    setupSceneHotkeys(this);
    this.cameras.main.setBackgroundColor('#111421');
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.createGalleryAnimations();

    let cursor = this.addSectionTitle('ANIMATIONS', 10);
    cursor = this.layoutItems(
      ANIMATIONS.map((animation) => ({
        key: animation.key,
        textureKey: animation.frames[0],
        animationKey: animation.key,
      })),
      cursor,
    );

    cursor = this.addSectionTitle('TEXTURES', cursor + 16);
    cursor = this.layoutItems(
      Object.keys(SPRITES).map((key) => ({
        key,
        textureKey: key,
      })),
      cursor,
    );

    this.maxScrollY = Math.max(0, cursor - GAME_HEIGHT + 28);
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, cursor + 28);
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (_pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, dy: number) => {
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + dy * 0.6,
        0,
        this.maxScrollY,
      );
    });
    this.add
      .text(GAME_WIDTH - 6, 6, 'GALLERY 3X', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#f6d743',
        backgroundColor: '#111421',
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000);
    this.debugOverlay = new DebugOverlay(this);
  }

  update(_time: number, delta: number): void {
    const speed = 160 * (delta / 1000);
    if (this.cursors?.down.isDown) {
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + speed,
        0,
        this.maxScrollY,
      );
    } else if (this.cursors?.up.isDown) {
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY - speed,
        0,
        this.maxScrollY,
      );
    }
    this.debugOverlay?.update();
  }

  private createGalleryAnimations(): void {
    ANIMATIONS.forEach((animation) => {
      if (this.anims.exists(animation.key)) {
        return;
      }
      this.anims.create({
        key: animation.key,
        frames: animation.frames.map((key) => ({ key })),
        frameRate: animation.frames.length === 2 ? 4 : 3,
        repeat: -1,
      });
    });
  }

  private addSectionTitle(label: string, y: number): number {
    this.add.text(GALLERY_PADDING, y, label, {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f6d743',
    });
    return y + 18;
  }

  private layoutItems(
    items: Array<{ key: string; textureKey: string; animationKey?: string }>,
    startY: number,
  ): number {
    let x = GALLERY_PADDING;
    let y = startY;
    let rowHeight = 0;

    items.forEach((item) => {
      const frame = this.textures.getFrame(item.textureKey);
      const width = (frame?.width ?? 16) * GALLERY_SCALE;
      const height = (frame?.height ?? 16) * GALLERY_SCALE;
      if (x + width > GAME_WIDTH - GALLERY_PADDING && x > GALLERY_PADDING) {
        x = GALLERY_PADDING;
        y += rowHeight + 20;
        rowHeight = 0;
      }

      const label = this.add.text(x, y, item.key, {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#ffffff',
        wordWrap: { width: Math.max(width, 52) },
      });
      const sprite = this.add.sprite(x, y + 14, item.textureKey).setOrigin(0, 0).setScale(GALLERY_SCALE);
      if (item.animationKey) {
        sprite.play(item.animationKey);
      }

      x += Math.max(width, label.width, 52) + 18;
      rowHeight = Math.max(rowHeight, height + 24);
    });

    return y + rowHeight;
  }
}
