import Phaser from 'phaser';
import { GroundBounds, GroundPlane, GroundPoint, pushOutOfCircle } from './GroundPlane';

type Obstacle = {
  centre: GroundPoint;
  radius: number;
};

export class GroundMover {
  readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  readonly upKey?: Phaser.Input.Keyboard.Key;
  readonly downKey?: Phaser.Input.Keyboard.Key;
  readonly leftKey?: Phaser.Input.Keyboard.Key;
  readonly rightKey?: Phaser.Input.Keyboard.Key;
  facing: GroundPoint = { gx: 1, gy: 0 };
  velocity: GroundPoint = { gx: 0, gy: 0 };
  enabled = true;

  constructor(
    scene: Phaser.Scene,
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly plane: GroundPlane,
    private readonly position: GroundPoint,
    private readonly speed: number,
    private readonly bounds: GroundBounds,
  ) {
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.upKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.downKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
      this.leftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.rightKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.velocity = { gx: 0, gy: 0 };
      this.sprite.play('hero-idle', true);
    }
  }

  update(deltaSeconds: number, obstacles: Obstacle[] = []): GroundPoint {
    if (!this.enabled) {
      this.velocity = { gx: 0, gy: 0 };
      this.sprite.play('hero-idle', true);
      this.syncSprite();
      return { ...this.position };
    }

    const left = Boolean(this.cursors?.left.isDown || this.leftKey?.isDown);
    const right = Boolean(this.cursors?.right.isDown || this.rightKey?.isDown);
    const up = Boolean(this.cursors?.up.isDown || this.upKey?.isDown);
    const down = Boolean(this.cursors?.down.isDown || this.downKey?.isDown);
    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    let dy = (down ? 1 : 0) - (up ? 1 : 0);

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy);
      dx /= length;
      dy /= length;
      this.position.gx += dx * this.speed * deltaSeconds;
      this.position.gy += dy * this.speed * deltaSeconds;
      this.velocity = { gx: dx * this.speed, gy: dy * this.speed };
      this.facing = { gx: dx, gy: dy };
      this.sprite.setFlipX(dx < -0.01 ? true : dx > 0.01 ? false : this.sprite.flipX);
      this.sprite.play('hero-walk', true);
    } else {
      this.velocity = { gx: 0, gy: 0 };
      this.sprite.play('hero-idle', true);
    }

    let clamped = this.plane.clamp(this.position, this.bounds);
    for (const obstacle of obstacles) {
      clamped = pushOutOfCircle(clamped, obstacle.centre, obstacle.radius);
      clamped = this.plane.clamp(clamped, this.bounds);
    }
    this.position.gx = clamped.gx;
    this.position.gy = clamped.gy;
    this.syncSprite();
    return { ...this.position };
  }

  syncSprite(offsetY = 7, depthOffset = 20): void {
    this.plane.setSpriteFeet(this.sprite, this.position, offsetY, depthOffset);
  }
}
