import Phaser from 'phaser';
import { TUNING } from '../config';

type PlayerKeys = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys?: PlayerKeys;
  private controlsEnabled = true;
  private ignoreJumpUntilReleased = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'hero_idle_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(TUNING.player.width, TUNING.player.height);
    body.setOffset(0, 0);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = {
        left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        jump: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
    }
  }

  static createAnimations(scene: Phaser.Scene): void {
    if (!scene.anims.exists('hero-idle')) {
      scene.anims.create({
        key: 'hero-idle',
        frames: [{ key: 'hero_idle_0' }],
        frameRate: 1,
      });
    }

    if (!scene.anims.exists('hero-walk')) {
      scene.anims.create({
        key: 'hero-walk',
        frames: [{ key: 'hero_walk_0' }, { key: 'hero_walk_1' }],
        frameRate: 7,
        repeat: -1,
      });
    }
  }

  setControlsEnabled(enabled: boolean): void {
    this.controlsEnabled = enabled;
    if (!enabled) {
      this.setVelocityX(0);
    }
  }

  suppressJumpUntilReleased(): void {
    if (this.keys?.jump.isDown) {
      this.ignoreJumpUntilReleased = true;
    }
  }

  update(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const jumpKey = this.keys?.jump;

    if (this.ignoreJumpUntilReleased && !jumpKey?.isDown) {
      this.ignoreJumpUntilReleased = false;
    }

    if (!this.controlsEnabled) {
      this.setVelocityX(0);
      this.play(body.blocked.down ? 'hero-idle' : 'hero_jump_0', true);
      return;
    }

    const movingLeft = Boolean(this.cursors?.left.isDown || this.keys?.left.isDown);
    const movingRight = Boolean(this.cursors?.right.isDown || this.keys?.right.isDown);
    const jumpPressed = Boolean(
      jumpKey && Phaser.Input.Keyboard.JustDown(jumpKey) && !this.ignoreJumpUntilReleased,
    );

    if (movingLeft === movingRight) {
      this.setVelocityX(0);
    } else if (movingLeft) {
      this.setVelocityX(-TUNING.player.runSpeed);
      this.setFlipX(true);
    } else {
      this.setVelocityX(TUNING.player.runSpeed);
      this.setFlipX(false);
    }

    if (jumpPressed && body.blocked.down) {
      this.setVelocityY(TUNING.player.jumpVelocity);
    }

    if (!body.blocked.down) {
      this.setTexture('hero_jump_0');
    } else if (Math.abs(body.velocity.x) > 1) {
      this.play('hero-walk', true);
    } else {
      this.play('hero-idle', true);
    }
  }
}
