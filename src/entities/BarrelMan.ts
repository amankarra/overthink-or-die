import Phaser from 'phaser';
import { TUNING } from '../config';
import { mulberry32 } from '../util/rng';

type BarrelState = 'idle' | 'running' | 'rolling' | 'plant';
type SpeedMode = keyof typeof TUNING.barrelMan.speeds;

const SPEED_MODES: SpeedMode[] = ['slow', 'normal', 'burst', 'hesitate'];

export class BarrelMan extends Phaser.GameObjects.Sprite {
  private readonly rng = mulberry32(TUNING.barrelMan.rngSeed);
  private barrelState: BarrelState = 'idle';
  private behaviorMs = 0;
  private currentSpeed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'barrelman_idle_0');
    scene.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(12);
  }

  static createAnimations(scene: Phaser.Scene): void {
    if (!scene.anims.exists('barrelman-run')) {
      scene.anims.create({
        key: 'barrelman-run',
        frames: [{ key: 'barrelman_run_0' }, { key: 'barrelman_run_1' }],
        frameRate: 7,
        repeat: -1,
      });
    }
  }

  get isIdle(): boolean {
    return this.barrelState === 'idle';
  }

  get isRunning(): boolean {
    return this.barrelState === 'running';
  }

  get isRolling(): boolean {
    return this.barrelState === 'rolling';
  }

  get isPlant(): boolean {
    return this.barrelState === 'plant';
  }

  get stateName(): BarrelState {
    return this.barrelState;
  }

  startRunning(): void {
    if (this.barrelState !== 'idle') {
      return;
    }
    this.barrelState = 'running';
    this.pickBehavior();
  }

  startRolling(): void {
    if (this.barrelState !== 'running') {
      return;
    }
    this.barrelState = 'rolling';
    this.stop();
    this.clearTint();
    this.setTexture('barrelman_tucked_0');
  }

  becomePlant(): void {
    if (this.barrelState === 'plant') {
      return;
    }
    this.barrelState = 'plant';
    this.stop();
    this.clearTint();
    this.setAngle(0);
    this.setTexture('barrelman_plant_0');
  }

  update(deltaMs: number, speedMultiplier: number, exposure: number): void {
    const deltaSeconds = deltaMs / 1000;

    if (this.barrelState === 'running') {
      this.behaviorMs -= deltaMs;
      if (this.behaviorMs <= 0) {
        this.pickBehavior();
      }
      this.x += this.currentSpeed * speedMultiplier * deltaSeconds;
      this.updateRunningVisual(exposure);
      return;
    }

    if (this.barrelState === 'rolling') {
      this.x += TUNING.barrelScene.barrelRollSpeedX * deltaSeconds;
      this.y =
        TUNING.barrelScene.groundY +
        Math.max(0, this.x - TUNING.barrelScene.slideX) * TUNING.barrelScene.barrelRollSlope;
      this.rotation += TUNING.barrelScene.barrelRollRotationSpeed * deltaSeconds;
      return;
    }

    if (this.barrelState === 'idle') {
      this.setTexture('barrelman_idle_0');
    }
  }

  private pickBehavior(): void {
    const mode = SPEED_MODES[Math.floor(this.rng() * SPEED_MODES.length)] ?? 'normal';
    this.currentSpeed = TUNING.barrelMan.speeds[mode];
    this.behaviorMs = Phaser.Math.Linear(
      TUNING.barrelMan.behaviorChangeMs.min,
      TUNING.barrelMan.behaviorChangeMs.max,
      this.rng(),
    );
  }

  private updateRunningVisual(exposure: number): void {
    if (exposure >= 2) {
      this.setTint(0xb8ff74);
    } else if (exposure >= 1) {
      this.setTint(0x99e86d);
    } else {
      this.clearTint();
    }

    if (this.currentSpeed === 0) {
      this.stop();
      this.setTexture('barrelman_idle_0');
      return;
    }

    this.play('barrelman-run', true);
  }
}
