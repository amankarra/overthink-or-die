import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { DebugOverlay } from '../systems/DebugOverlay';
import { setupSceneHotkeys } from '../util/sceneRouting';

export class EndingScene extends Phaser.Scene {
  private debugOverlay?: DebugOverlay;

  constructor() {
    super('EndingScene');
  }

  create(): void {
    setupSceneHotkeys(this);
    new AudioManager(this).loop('music_dance');
    this.cameras.main.setBackgroundColor('#1f1f38');
    this.createAnimations();
    this.drawStage();
    this.runWalkIn();
    this.debugOverlay = new DebugOverlay(this);
  }

  update(): void {
    this.debugOverlay?.update();
  }

  private createAnimations(): void {
    if (!this.anims.exists('hero-dance')) {
      this.anims.create({
        key: 'hero-dance',
        frames: [{ key: 'hero_dance_0' }, { key: 'hero_dance_1' }],
        frameRate: 4,
        repeat: -1,
      });
    }

    if (!this.anims.exists('meditator-dance')) {
      this.anims.create({
        key: 'meditator-dance',
        frames: [{ key: 'meditator_dance_0' }, { key: 'meditator_dance_1' }],
        frameRate: 4,
        repeat: -1,
      });
    }
  }

  private drawStage(): void {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x1f1f38, 1);
    graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    graphics.fillStyle(0x2d4d66, 1);
    graphics.fillRect(0, TUNING.endingScene.stageY, GAME_WIDTH, 70);
    graphics.fillStyle(0x090a14, 1);
    graphics.fillRect(0, TUNING.endingScene.groundY, GAME_WIDTH, 24);

    this.add
      .text(GAME_WIDTH / 2, 58, 'THE END', {
        fontFamily: 'monospace',
        fontSize: '30px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(5);

    const replay = this.add
      .text(GAME_WIDTH / 2, 218, 'R - PLAY AGAIN', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#f6d743',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({
      targets: replay,
      alpha: 0.25,
      duration: 620,
      yoyo: true,
      repeat: -1,
    });
  }

  private runWalkIn(): void {
    const hero = this.add
      .sprite(TUNING.endingScene.heroX, TUNING.endingScene.actorY, 'hero_idle_0')
      .setOrigin(0.5, 1)
      .setDepth(10);
    const barrelMan = this.add
      .sprite(TUNING.endingScene.barrelStartX, TUNING.endingScene.actorY, 'barrelman_run_0')
      .setOrigin(0.5, 1)
      .setDepth(10);
    const meditator = this.add
      .sprite(
        TUNING.endingScene.meditatorStartX,
        TUNING.endingScene.actorY,
        'meditator_point_0',
      )
      .setOrigin(0.5, 1)
      .setDepth(10)
      .setFlipX(true);

    barrelMan.play('barrelman-run');
    this.tweens.add({
      targets: barrelMan,
      x: TUNING.endingScene.barrelEndX,
      duration: TUNING.endingScene.barrelWalkMs,
      ease: 'Linear',
      onComplete: () => barrelMan.stop().setTexture('barrelman_idle_0'),
    });

    this.tweens.add({
      targets: meditator,
      x: TUNING.endingScene.meditatorEndX,
      duration: TUNING.endingScene.meditatorWalkMs,
      ease: 'Linear',
      onComplete: () => meditator.setFlipX(false),
    });

    this.time.delayedCall(TUNING.endingScene.danceStartMs, () => {
      hero.play('hero-dance');
      barrelMan.play('barrelman-run');
      meditator.play('meditator-dance');
    });
  }
}
