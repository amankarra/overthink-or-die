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
  private ballTrail?: Phaser.GameObjects.Graphics;
  private swingMarks?: Phaser.GameObjects.Graphics;
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

    const groundY = TUNING.golfIntroScene.groundY;
    const ballX = TUNING.golfIntroScene.ballStartX;
    const ballY = TUNING.golfIntroScene.ballStartY;
    const holeX = TUNING.golfIntroScene.holeX;

    graphics.fillStyle(0x111111, 1);
    graphics.fillRect(0, groundY, GAME_WIDTH, 44);
    graphics.fillStyle(0x152317, 1);
    graphics.fillEllipse(214, groundY + 14, 360, 36);
    graphics.fillStyle(0x1e351e, 1);
    graphics.fillEllipse(96, groundY + 5, 96, 14);
    graphics.fillEllipse(holeX, groundY + 4, 86, 18);

    graphics.fillStyle(0x080808, 1);
    graphics.fillRect(ballX - 19, groundY - 4, 36, 3);
    graphics.fillStyle(0xd7b66a, 1);
    graphics.fillTriangle(ballX - 2, ballY + 3, ballX + 2, ballY + 3, ballX, groundY);

    graphics.lineStyle(2, 0x000000, 1);
    graphics.lineBetween(holeX + 16, groundY - 2, holeX + 16, groundY - 40);
    graphics.fillStyle(0x000000, 1);
    graphics.fillTriangle(holeX + 17, groundY - 40, holeX + 17, groundY - 28, holeX + 39, groundY - 34);

    graphics.fillStyle(0x000000, 1);
    graphics.fillEllipse(holeX, groundY, 28, 8);
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
      .image(TUNING.golfIntroScene.ballStartX, TUNING.golfIntroScene.ballStartY, 'golfball_0')
      .setOrigin(0.5)
      .setDepth(6)
      .setVisible(true);
    this.ballTrail = this.add.graphics().setDepth(4);
    this.swingMarks = this.add.graphics().setDepth(7);
  }

  private bindSkipInput(): void {
    const skip = (): void => this.skipToGame();
    this.input.once(Phaser.Input.Events.POINTER_DOWN, skip);
    this.input.keyboard?.once('keydown', skip);
  }

  private runCinematic(): void {
    this.time.delayedCall(TUNING.golfIntroScene.backswingAtMs, () => {
      this.golfer?.setTexture('golfer_silhouette_backswing_0');
      this.drawBackswingArc();
    });
    this.time.delayedCall(TUNING.golfIntroScene.swingAtMs, () => {
      this.golfer?.setTexture('golfer_silhouette_swing_0');
      this.drawSwingArc();
      this.drawImpactBurst();
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
    this.ballTrail?.clear();
    let previousX: number = startX;
    let previousY: number = startY;

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
        this.ballTrail?.lineStyle(2, 0xffffff, 0.32);
        this.ballTrail?.lineBetween(previousX, previousY, this.ball.x, this.ball.y);
        previousX = this.ball.x;
        previousY = this.ball.y;
      },
      onComplete: () => {
        this.time.delayedCall(650, () => this.ballTrail?.clear());
        this.hitHero();
      },
    });
  }

  private drawBackswingArc(): void {
    if (!this.swingMarks) {
      return;
    }

    const x = TUNING.golfIntroScene.golferX;
    const y = TUNING.golfIntroScene.groundY;
    this.swingMarks.clear();
    this.swingMarks.lineStyle(2, 0xffffff, 0.2);
    this.drawPath(this.swingMarks, [
      [x - 4, y - 51],
      [x - 17, y - 43],
      [x - 25, y - 30],
      [x - 24, y - 15],
    ]);
  }

  private drawSwingArc(): void {
    if (!this.swingMarks) {
      return;
    }

    const x = TUNING.golfIntroScene.golferX;
    const y = TUNING.golfIntroScene.groundY;
    this.swingMarks.clear();
    this.swingMarks.lineStyle(3, 0xffffff, 0.36);
    this.drawPath(this.swingMarks, [
      [x - 24, y - 49],
      [x - 19, y - 34],
      [x - 9, y - 18],
      [TUNING.golfIntroScene.ballStartX, TUNING.golfIntroScene.ballStartY + 2],
    ]);
    this.time.delayedCall(420, () => this.swingMarks?.clear());
  }

  private drawImpactBurst(): void {
    const x = TUNING.golfIntroScene.ballStartX;
    const y = TUNING.golfIntroScene.ballStartY + 2;
    const burst = this.add.graphics().setDepth(8);
    burst.lineStyle(1, 0xffffff, 0.8);
    burst.lineBetween(x - 7, y - 1, x - 13, y - 6);
    burst.lineBetween(x - 5, y + 2, x - 15, y + 4);
    burst.lineBetween(x + 5, y - 1, x + 12, y - 5);
    burst.lineStyle(2, 0x000000, 0.7);
    burst.lineBetween(x - 1, y + 4, x + 12, y + 7);
    this.time.delayedCall(220, () => burst.destroy());
  }

  private drawPath(graphics: Phaser.GameObjects.Graphics, points: Array<[number, number]>): void {
    for (let index = 1; index < points.length; index += 1) {
      const [previousX, previousY] = points[index - 1];
      const [nextX, nextY] = points[index];
      graphics.lineBetween(previousX, previousY, nextX, nextY);
    }
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
