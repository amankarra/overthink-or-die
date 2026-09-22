import Phaser from 'phaser';
import { TUNING } from '../config';
import type { Player } from './Player';

export type RobotBossState =
  | 'IDLE'
  | 'WALK'
  | 'KICK_WINDUP'
  | 'KICK_ACTIVE'
  | 'LASER_WINDUP'
  | 'RECOVER'
  | 'DYING';

type LaserProjectile = {
  rect: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
};

type RobotBossHooks = {
  onFootstep?: () => void;
  onKickActive?: () => void;
  onLaserFired?: (x: number, y: number) => void;
};

export class RobotBoss {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly kickHitbox: Phaser.GameObjects.Rectangle;
  private readonly lasers: LaserProjectile[] = [];
  private state: RobotBossState = 'IDLE';
  private stateMs: number = TUNING.robot.idleBetweenAttacksMs;
  private facing: -1 | 1 = -1;
  private attackCounter = 0;
  private fightActive = false;
  private laserTarget?: Phaser.Math.Vector2;
  private laserFired = false;
  private walkStepMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly hooks: RobotBossHooks = {},
  ) {
    this.sprite = scene.add.sprite(x, y, 'robot_idle_0').setOrigin(0.5, 1).setDepth(18);
    this.kickHitbox = scene.add
      .rectangle(0, 0, 34, 18, 0xe84855, 0.42)
      .setDepth(20)
      .setVisible(false);
  }

  static createAnimations(scene: Phaser.Scene): void {
    if (!scene.anims.exists('robot-walk')) {
      scene.anims.create({
        key: 'robot-walk',
        frames: [{ key: 'robot_walk_0' }, { key: 'robot_walk_1' }],
        frameRate: 5,
        repeat: -1,
      });
    }
  }

  get stateName(): RobotBossState {
    return this.state;
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  get isKickActive(): boolean {
    return this.state === 'KICK_ACTIVE';
  }

  get laserProjectiles(): readonly LaserProjectile[] {
    return this.lasers;
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.updateKickHitboxPosition();
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.kickHitbox.setVisible(visible && this.isKickActive);
  }

  startFight(): void {
    if (this.state === 'DYING') {
      return;
    }
    this.fightActive = true;
    this.transitionTo('IDLE', TUNING.robot.idleBetweenAttacksMs);
  }

  stopForDeath(): void {
    this.fightActive = false;
    this.transitionTo('DYING', Number.POSITIVE_INFINITY);
    this.sprite.stop();
    this.sprite.setTexture('robot_eyes_glow_0');
    this.kickHitbox.setVisible(false);
  }

  update(deltaMs: number, player?: Player): void {
    this.updateLasers(deltaMs);
    if (!this.fightActive || !player || this.state === 'DYING') {
      return;
    }

    this.updateFacing(player.x);
    this.stateMs -= deltaMs;

    if (this.state === 'WALK') {
      this.walkToward(player.x, deltaMs);
      if (this.distanceTo(player.x) <= TUNING.robot.kickRange) {
        this.transitionTo('KICK_WINDUP', TUNING.robot.kickWindupMs);
        return;
      }
    }

    if (this.state === 'KICK_ACTIVE') {
      this.updateKickHitboxPosition();
    }

    if (this.state === 'LASER_WINDUP' && this.stateMs <= 80 && !this.laserFired) {
      this.fireLaser();
    }

    if (this.stateMs > 0) {
      return;
    }

    switch (this.state) {
      case 'IDLE':
        this.chooseAction(player);
        break;
      case 'WALK':
      case 'KICK_ACTIVE':
      case 'LASER_WINDUP':
        this.transitionTo('RECOVER', TUNING.robot.kickRecoverMs);
        break;
      case 'KICK_WINDUP':
        this.transitionTo('KICK_ACTIVE', TUNING.robot.kickActiveMs);
        break;
      case 'RECOVER':
        this.transitionTo('IDLE', TUNING.robot.idleBetweenAttacksMs);
        break;
    }
  }

  getFootDoorPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.sprite.x + TUNING.bossScene.footDoorOffsetX,
      this.sprite.y + TUNING.bossScene.footDoorOffsetY,
    );
  }

  getEyePosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.sprite.x + 7 * this.facing, this.sprite.y - 108);
  }

  destroyLaser(laser: LaserProjectile): void {
    Phaser.Utils.Array.Remove(this.lasers, laser);
    laser.rect.destroy();
  }

  private chooseAction(player: Player): void {
    const distance = this.distanceTo(player.x);
    if (distance <= TUNING.robot.kickRange) {
      this.transitionTo('KICK_WINDUP', TUNING.robot.kickWindupMs);
      return;
    }

    this.attackCounter += 1;
    if (this.attackCounter % 2 === 0) {
      this.transitionTo('LASER_WINDUP', TUNING.robot.laserWindupMs, player);
      return;
    }

    this.transitionTo('WALK', TUNING.robot.walkMs);
  }

  private transitionTo(state: RobotBossState, durationMs: number, player?: Player): void {
    this.state = state;
    this.stateMs = durationMs;
    this.walkStepMs = 0;
    this.kickHitbox.setVisible(false);
    this.laserTarget = undefined;
    this.laserFired = false;

    switch (state) {
      case 'IDLE':
      case 'RECOVER':
        this.sprite.stop();
        this.sprite.setTexture('robot_idle_0');
        break;
      case 'WALK':
        this.sprite.play('robot-walk', true);
        break;
      case 'KICK_WINDUP':
        this.sprite.stop();
        this.sprite.setTexture('robot_kick_windup_0');
        break;
      case 'KICK_ACTIVE':
        this.sprite.stop();
        this.sprite.setTexture('robot_kick_0');
        this.updateKickHitboxPosition();
        this.kickHitbox.setVisible(true);
        this.hooks.onKickActive?.();
        break;
      case 'LASER_WINDUP':
        this.sprite.stop();
        this.sprite.setTexture('robot_eyes_glow_0');
        this.laserTarget = player
          ? new Phaser.Math.Vector2(player.x, player.y - 16)
          : new Phaser.Math.Vector2(this.sprite.x - 120, this.sprite.y - 64);
        break;
      case 'DYING':
        break;
    }
  }

  private updateFacing(playerX: number): void {
    this.facing = playerX < this.sprite.x ? -1 : 1;
    this.sprite.setFlipX(this.facing === 1);
  }

  private walkToward(playerX: number, deltaMs: number): void {
    const direction = playerX < this.sprite.x ? -1 : 1;
    const nextX =
      this.sprite.x + direction * TUNING.robot.walkSpeed * (deltaMs / 1000);
    this.sprite.x = Phaser.Math.Clamp(
      nextX,
      TUNING.bossScene.robotMinX,
      TUNING.bossScene.robotMaxX,
    );
    this.walkStepMs += deltaMs;
    if (this.walkStepMs >= 360) {
      this.walkStepMs = 0;
      this.hooks.onFootstep?.();
    }
  }

  private distanceTo(playerX: number): number {
    return Math.abs(playerX - this.sprite.x);
  }

  private updateKickHitboxPosition(): void {
    this.kickHitbox.setPosition(
      this.sprite.x + 38 * this.facing,
      this.sprite.y - 22,
    );
  }

  private fireLaser(): void {
    if (!this.laserTarget) {
      return;
    }

    this.laserFired = true;
    const origin = this.getEyePosition();
    const direction = this.laserTarget.clone().subtract(origin).normalize();
    if (direction.lengthSq() === 0) {
      direction.set(this.facing, 0);
    }

    const rect = this.scene.add
      .rectangle(origin.x, origin.y, 14, 4, 0xe84855, 1)
      .setDepth(16)
      .setRotation(direction.angle());
    this.lasers.push({
      rect,
      vx: direction.x * TUNING.robot.laserProjectileSpeed,
      vy: direction.y * TUNING.robot.laserProjectileSpeed,
    });
    this.hooks.onLaserFired?.(origin.x, origin.y);
  }

  private updateLasers(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    [...this.lasers].forEach((laser) => {
      laser.rect.x += laser.vx * deltaSeconds;
      laser.rect.y += laser.vy * deltaSeconds;
      if (
        laser.rect.x < -40 ||
        laser.rect.x > TUNING.bossScene.worldWidth + 40 ||
        laser.rect.y < -40 ||
        laser.rect.y > this.sprite.y + 40
      ) {
        this.destroyLaser(laser);
      }
    });
  }
}
