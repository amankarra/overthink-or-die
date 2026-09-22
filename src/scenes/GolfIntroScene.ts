import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { DebugOverlay } from '../systems/DebugOverlay';
import { fadeToScene, ROUTE_TO_SCENE_KEY, setupSceneHotkeys } from '../util/sceneRouting';

export class GolfIntroScene extends Phaser.Scene {
  private audio?: AudioManager;
  private debugOverlay?: DebugOverlay;
  private golfer?: Phaser.GameObjects.Image;
  private hero?: Phaser.GameObjects.Image;
  private ball?: Phaser.GameObjects.Image;
  private skipped = false;

  constructor() {
    super('GolfIntroScene');
  }

  create(): void {
    this.skipped = false;
    setupSceneHotkeys(this);
    this.audio = new AudioManager(this);
    this.cameras.main.setBackgroundColor('#41334f');
    this.drawDuskBackground();
    this.createActors();
    this.bindSkipInput();
    this.runCinematic();
    this.debugOverlay = new DebugOverlay(this);
  }

  update(): void {
    this.debugOverlay?.update();
  }

  private drawDuskBackground(): void {
    const graphics = this.add.graphics().setDepth(0);
    const top = new Phaser.Display.Color(0x2a, 0x22, 0x45);
    const bottom = new Phaser.Display.Color(0xd1, 0x73, 0x55);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        top,
        bottom,
        GAME_HEIGHT,
        y,
      );
      graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      graphics.fillRect(0, y, GAME_WIDTH, 4);
    }

    graphics.fillStyle(0x111111, 1);
    graphics.fillRect(0, TUNING.golfIntroScene.groundY, GAME_WIDTH, 44);
    graphics.fillStyle(0x000000, 1);
    graphics.fillEllipse(TUNING.golfIntroScene.holeX, TUNING.golfIntroScene.groundY, 28, 8);
  }

  private createActors(): void {
    this.golfer = this.add
      .image(
        TUNING.golfIntroScene.golferX,
        TUNING.golfIntroScene.actorY,
        'golfer_silhouette_idle_0',
      )
      .setOrigin(0.5, 1)
      .setDepth(5);
    this.hero = this.add
      .image(TUNING.golfIntroScene.heroX, TUNING.golfIntroScene.actorY, 'hero_silhouette_stand_0')
      .setOrigin(0.5, 1)
      .setDepth(5);
    this.ball = this.add
      .image(TUNING.golfIntroScene.ballStartX + 2, TUNING.golfIntroScene.ballStartY + 5, 'golfball_0')
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(false);
  }

  private bindSkipInput(): void {
    const skip = (): void => this.skipToGame();
    this.input.once(Phaser.Input.Events.POINTER_DOWN, skip);
    this.input.keyboard?.once('keydown', skip);
  }

  private runCinematic(): void {
    this.time.delayedCall(TUNING.golfIntroScene.backswingAtMs, () =>
      this.golfer?.setTexture('golfer_silhouette_backswing_0'),
    );
    this.time.delayedCall(TUNING.golfIntroScene.swingAtMs, () => {
      this.golfer?.setTexture('golfer_silhouette_swing_0');
      this.audio?.play('swing');
      this.launchBall();
    });

    this.time.delayedCall(TUNING.golfIntroScene.totalMs, () => this.skipToGame());
  }

  private launchBall(): void {
    if (!this.ball || !this.hero) {
      return;
    }

    const startX = TUNING.golfIntroScene.ballStartX;
    const startY = TUNING.golfIntroScene.ballStartY;
    const endX = this.hero.x - 2;
    const endY = this.hero.y - 24;
    this.ball.setPosition(startX, startY).setVisible(true);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: TUNING.golfIntroScene.ballFlightMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        if (!this.ball) {
          return;
        }
        const progress = tween.getValue();
        if (typeof progress !== 'number') {
          return;
        }
        this.ball.x = Phaser.Math.Linear(startX, endX, progress);
        this.ball.y =
          Phaser.Math.Linear(startY, endY, progress) - Math.sin(progress * Math.PI) * 84;
      },
      onComplete: () => this.hitHero(),
    });
  }

  private hitHero(): void {
    if (!this.hero || !this.ball) {
      return;
    }

    this.audio?.play('bonk');
    this.cameras.main.shake(220, 0.01);
    this.ball.setVisible(false);

    const bonk = this.add
      .text(this.hero.x, this.hero.y - 54, 'BONK', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.time.delayedCall(TUNING.golfIntroScene.bonkPauseMs, () => {
      bonk.destroy();
      this.hero?.setTexture('hero_silhouette_fall_0');
      this.hero?.setOrigin(0.5, 0.5);
      this.hero?.setPosition(TUNING.golfIntroScene.heroX + 8, TUNING.golfIntroScene.groundY - 11);
      this.hero?.setAngle(0);
      this.tweens.add({
        targets: this.hero,
        x: TUNING.golfIntroScene.holeX,
        y: TUNING.golfIntroScene.groundY + 18,
        angle: 12,
        alpha: 0,
        duration: TUNING.golfIntroScene.dropMs,
        ease: 'Quad.easeIn',
      });
    });
  }

  private skipToGame(): void {
    if (this.skipped) {
      return;
    }

    this.skipped = true;
    fadeToScene(this, ROUTE_TO_SCENE_KEY.barrel);
  }
}
