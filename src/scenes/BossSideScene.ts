import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config';
import { Player } from '../entities/Player';
import { RobotBoss } from '../entities/RobotBoss';
import { AudioManager } from '../systems/AudioManager';
import { DebugOverlay } from '../systems/DebugOverlay';
import { fadeRestart, fadeToScene, ROUTE_TO_SCENE_KEY, setupSceneHotkeys } from '../util/sceneRouting';

type GroundState = 'grass' | 'dead' | 'cracked';

export class BossSideScene extends Phaser.Scene {
  private audio?: AudioManager;
  private player?: Player;
  private robot?: RobotBoss;
  private slab?: Phaser.GameObjects.Image;
  private footDoor?: Phaser.GameObjects.Rectangle;
  private cableGraphics?: Phaser.GameObjects.Graphics;
  private effectGraphics?: Phaser.GameObjects.Graphics;
  private debugOverlay?: DebugOverlay;
  private groundTiles: Phaser.GameObjects.Image[] = [];
  private worshippers: Phaser.GameObjects.Sprite[] = [];
  private hearts: Phaser.GameObjects.Image[] = [];
  private hp = TUNING.player.hp;
  private invulnerable = false;
  private playerControlEnabled = false;
  private fightStarted = false;
  private winStarted = false;
  private cableVisible = false;
  private cableLive = false;

  constructor() {
    super('BossSideScene');
  }

  create(): void {
    this.resetRunState();
    setupSceneHotkeys(this);
    this.audio = new AudioManager(this);
    this.audio.loop('music_level', { volume: 0.22 });
    this.cameras.main.setBackgroundColor('#78a4ad');
    this.physics.world.setBounds(0, 0, TUNING.bossScene.worldWidth, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, TUNING.bossScene.worldWidth, GAME_HEIGHT);

    this.createAnimations();
    this.drawBackground();
    const ground = this.createGround();
    this.cableGraphics = this.add.graphics().setDepth(5);
    this.effectGraphics = this.add.graphics().setDepth(40);
    this.createSlab();
    this.createWorshippers();
    this.createRobot();
    this.createPlayer(ground);
    this.createHud();

    this.debugOverlay = new DebugOverlay(this, () => this.player, () => ({
      robotState: this.robot?.stateName ?? 'none',
      hp: this.hp,
      invulnerable: this.invulnerable,
      slabDistance: this.player && this.slab
        ? Math.round(Math.abs(this.player.x - this.slab.x))
        : 'none',
    }));

    if (this.shouldSkipCinematic()) {
      this.skipToFight();
      return;
    }

    this.runIntroCinematic();
  }

  update(time: number, delta: number): void {
    if (this.player && this.playerControlEnabled) {
      this.player.update();
    }

    this.robot?.update(delta, this.fightStarted && !this.winStarted ? this.player : undefined);
    this.renderCable(time);
    this.checkDamage();
    this.checkSlabWin();
    this.debugOverlay?.update();
  }

  private resetRunState(): void {
    this.groundTiles = [];
    this.worshippers = [];
    this.hearts = [];
    this.hp = TUNING.player.hp;
    this.invulnerable = false;
    this.playerControlEnabled = false;
    this.fightStarted = false;
    this.winStarted = false;
    this.cableVisible = false;
    this.cableLive = false;
  }

  private createAnimations(): void {
    if (!this.anims.exists('worshipper-pray')) {
      this.anims.create({
        key: 'worshipper-pray',
        frames: [{ key: 'worshipper_pray_0' }, { key: 'worshipper_pray_1' }],
        frameRate: 2,
        repeat: -1,
      });
    }

    if (!this.anims.exists('worshipper-walk')) {
      this.anims.create({
        key: 'worshipper-walk',
        frames: [{ key: 'worshipper_walk_0' }, { key: 'worshipper_walk_1' }],
        frameRate: 5,
        repeat: -1,
      });
    }
  }

  private drawBackground(): void {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x78a4ad, 1);
    graphics.fillRect(0, 0, TUNING.bossScene.worldWidth, TUNING.bossScene.groundY);
    graphics.fillStyle(0x4f7d68, 0.9);
    graphics.fillRect(0, 172, TUNING.bossScene.worldWidth, 74);
    graphics.lineStyle(1, 0xffffff, 0.12);
    for (let x = 0; x < TUNING.bossScene.worldWidth; x += 48) {
      graphics.lineBetween(x, 172, x - 28, TUNING.bossScene.groundY);
    }
  }

  private createGround(): Phaser.Physics.Arcade.StaticGroup {
    const ground = this.physics.add.staticGroup();
    for (let x = 8; x < TUNING.bossScene.worldWidth + 8; x += 16) {
      const tile = ground
        .create(x, TUNING.bossScene.groundY, 'grass_tile_0')
        .setOrigin(0.5, 0) as Phaser.GameObjects.Image;
      this.groundTiles.push(tile);
    }
    ground.refresh();
    return ground;
  }

  private setGroundState(state: GroundState): void {
    const texture =
      state === 'grass'
        ? 'grass_tile_0'
        : state === 'dead'
          ? 'dead_tile_0'
          : 'cracked_tile_0';
    this.groundTiles.forEach((tile) => tile.setTexture(texture));
  }

  private createPlayer(ground: Phaser.Physics.Arcade.StaticGroup): void {
    this.player = new Player(
      this,
      TUNING.bossScene.playerStartX,
      TUNING.bossScene.playerStartY,
    );
    this.player.setControlsEnabled(false);
    this.physics.add.collider(this.player, ground);
  }

  private createSlab(): void {
    this.slab = this.add
      .image(TUNING.bossScene.slabX, TUNING.bossScene.slabY, 'slab_upright_0')
      .setOrigin(0.5, 1)
      .setDepth(11);
  }

  private createWorshippers(): void {
    const offsets = [-12, 10, -16, 8, -10];
    this.worshippers = TUNING.bossScene.worshipperXs.map((x, index) => {
      const sprite = this.add
        .sprite(x, TUNING.bossScene.groundY + offsets[index], 'worshipper_pray_0')
        .setOrigin(0.5, 1)
        .setDepth(13);
      sprite.play('worshipper-pray');
      return sprite;
    });
  }

  private createRobot(): void {
    this.robot = new RobotBoss(
      this,
      TUNING.bossScene.robotStartX,
      TUNING.bossScene.groundY,
      {
        onFootstep: () => this.cameras.main.shake(80, 0.004),
        onKickActive: () => this.cameras.main.shake(140, 0.008),
        onLaserFired: (x, y) => {
          this.audio?.play('laser', { volume: 0.75 });
          this.sparkAt(x, y, 0xe84855);
        },
      },
    );
    this.robot.sprite.setVisible(true);
    this.footDoor = this.add
      .rectangle(0, 0, 10, 16, 0x090a14, 1)
      .setDepth(25)
      .setVisible(false);
  }

  private createHud(): void {
    this.hearts = Array.from({ length: TUNING.player.hp }, (_value, index) =>
      this.add
        .image(16 + index * 14, 15, 'heart_0')
        .setScrollFactor(0)
        .setDepth(1000)
        .setVisible(false),
    );
    this.updateHud();
  }

  private shouldSkipCinematic(): boolean {
    return (
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('skipcine') === '1'
    );
  }

  private runIntroCinematic(): void {
    this.lockPlayer();
    this.cameras.main.setScroll(220, 0);

    this.time.delayedCall(700, () => {
      this.audio?.play('robot_on');
      this.cameras.main.shake(260, 0.01);
      this.setGroundState('dead');
    });

    this.time.delayedCall(1050, () => {
      this.cameras.main.shake(260, 0.014);
      this.setGroundState('cracked');
    });

    this.time.delayedCall(1250, () => {
      if (!this.robot) {
        return;
      }
      this.tweens.add({
        targets: this.robot.sprite,
        x: TUNING.bossScene.robotStopX,
        duration: 1050,
        ease: 'Quad.easeOut',
      });
    });

    this.time.delayedCall(2500, () => this.openFootDoor());
    this.worshippers.forEach((_worshipper, index) => {
      this.time.delayedCall(2800 + index * 420, () => this.sendWorshipperIntoRobot(index));
    });
    this.time.delayedCall(5050, () => this.closeFootDoor());
    this.time.delayedCall(5300, () => this.showCable(true));
    this.time.delayedCall(5700, () => this.beginFight());
  }

  private skipToFight(): void {
    if (this.player) {
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    }
    this.setGroundState('cracked');
    this.worshippers.forEach((worshipper) => worshipper.setVisible(false));
    this.robot?.setPosition(TUNING.bossScene.robotStopX, TUNING.bossScene.groundY);
    this.showCable(true);
    this.beginFight();
  }

  private openFootDoor(): void {
    if (!this.robot || !this.footDoor) {
      return;
    }

    const position = this.robot.getFootDoorPosition();
    this.footDoor.setPosition(position.x, position.y).setVisible(true);
  }

  private closeFootDoor(): void {
    this.footDoor?.setVisible(false);
  }

  private sendWorshipperIntoRobot(index: number): void {
    const worshipper = this.worshippers[index];
    if (!worshipper || !this.robot) {
      return;
    }

    const door = this.robot.getFootDoorPosition();
    worshipper.stop();
    worshipper.play('worshipper-walk');
    this.tweens.add({
      targets: worshipper,
      x: door.x,
      y: door.y + 8,
      alpha: 0,
      duration: 360,
      ease: 'Linear',
      onComplete: () => worshipper.setVisible(false),
    });
  }

  private showCable(live: boolean): void {
    this.cableVisible = true;
    this.cableLive = live;
  }

  private beginFight(): void {
    if (!this.player || !this.robot) {
      return;
    }

    this.fightStarted = true;
    this.playerControlEnabled = true;
    this.player.setControlsEnabled(true);
    this.hearts.forEach((heart) => heart.setVisible(true));
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.time.delayedCall(TUNING.bossScene.fightStartDelayMs, () => this.robot?.startFight());
  }

  private lockPlayer(): void {
    if (!this.player) {
      return;
    }
    this.playerControlEnabled = false;
    this.player.setControlsEnabled(false);
    this.player.setVelocity(0, 0);
  }

  private renderCable(time: number): void {
    if (!this.cableGraphics || !this.cableVisible || !this.robot) {
      return;
    }

    this.cableGraphics.clear();
    const foot = this.robot.getFootDoorPosition();
    const startX = TUNING.bossScene.slabX;
    const startY = TUNING.bossScene.groundY - 10;
    const pulse =
      this.cableLive
        ? 0.45 + Math.sin((time / TUNING.bossScene.cablePulseMs) * Math.PI * 2) * 0.3
        : 0.22;
    this.cableGraphics.lineStyle(5, this.cableLive ? 0xf6d743 : 0x3b4451, pulse);
    this.cableGraphics.lineBetween(startX, startY, foot.x, foot.y + 10);
    this.cableGraphics.lineStyle(2, this.cableLive ? 0xffffff : 0x111421, pulse);
    this.cableGraphics.lineBetween(startX, startY, foot.x, foot.y + 10);
  }

  private checkDamage(): void {
    if (
      !this.player ||
      !this.robot ||
      !this.fightStarted ||
      this.winStarted ||
      this.invulnerable
    ) {
      return;
    }

    const playerBounds = this.player.getBounds();
    if (
      this.robot.isKickActive &&
      Phaser.Geom.Intersects.RectangleToRectangle(
        playerBounds,
        this.robot.kickHitbox.getBounds(),
      )
    ) {
      this.damagePlayer(this.robot.kickHitbox.x);
      return;
    }

    for (const laser of this.robot.laserProjectiles) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, laser.rect.getBounds())) {
        this.robot.destroyLaser(laser);
        this.damagePlayer(laser.rect.x);
        return;
      }
    }
  }

  private damagePlayer(sourceX: number): void {
    if (!this.player || this.invulnerable || this.winStarted) {
      return;
    }

    this.hp -= 1;
    this.updateHud();
    this.audio?.play('hit');
    this.cameras.main.shake(110, 0.008);

    if (this.hp <= 0) {
      this.lockPlayer();
      fadeRestart(this);
      return;
    }

    this.invulnerable = true;
    this.playerControlEnabled = false;
    this.player.setControlsEnabled(false);
    this.player.setTexture('hero_hurt_0');
    this.player.setTint(0xe84855);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const direction = this.player.x < sourceX ? -1 : 1;
    body.setVelocity(
      direction * TUNING.bossScene.damageKnockbackX,
      TUNING.bossScene.damageKnockbackY,
    );

    this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 80,
      yoyo: true,
      repeat: 6,
    });

    this.time.delayedCall(TUNING.bossScene.hitStunMs, () => {
      if (!this.winStarted && this.hp > 0 && this.player) {
        this.playerControlEnabled = true;
        this.player.setControlsEnabled(true);
        this.player.setTexture('hero_idle_0');
      }
    });

    this.time.delayedCall(TUNING.player.invulnerabilityMs, () => {
      if (!this.player) {
        return;
      }
      this.invulnerable = false;
      this.player.clearTint();
      this.player.setAlpha(1);
    });
  }

  private updateHud(): void {
    this.hearts.forEach((heart, index) => {
      heart.setAlpha(index < this.hp ? 1 : 0.2);
    });
  }

  private checkSlabWin(): void {
    if (!this.player || !this.slab || !this.fightStarted || this.winStarted) {
      return;
    }

    if (
      Phaser.Geom.Intersects.RectangleToRectangle(
        this.player.getBounds(),
        this.slab.getBounds(),
      )
    ) {
      this.startWinSequence();
    }
  }

  private startWinSequence(): void {
    if (!this.player || !this.slab || !this.robot) {
      return;
    }

    this.winStarted = true;
    this.fightStarted = false;
    this.lockPlayer();
    this.robot.stopForDeath();
    [...this.robot.laserProjectiles].forEach((laser) => this.robot?.destroyLaser(laser));

    this.tweens.add({
      targets: this.player,
      x: TUNING.bossScene.slabX - 24,
      duration: 330,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.player?.setFlipX(false);
        this.player?.setTexture('hero_kick_0');
        this.audio?.play('swing');
        this.time.delayedCall(180, () => this.toppleSlab());
      },
    });
  }

  private toppleSlab(): void {
    this.slab?.setTexture('slab_fallen_0');
    this.audio?.play('bonk');
    this.cameras.main.shake(180, 0.009);
    this.cableLive = false;
    this.sparkAt(TUNING.bossScene.slabX + 18, TUNING.bossScene.groundY - 22);
    this.debrisAt(TUNING.bossScene.slabX + 8, TUNING.bossScene.groundY - 22, 0x3b4451, 7);
    this.time.delayedCall(320, () => this.malfunctionRobot());
  }

  private malfunctionRobot(): void {
    if (!this.robot) {
      return;
    }

    this.cameras.main.shake(600, 0.012);
    this.tweens.add({
      targets: this.robot.sprite,
      x: '+=4',
      duration: 45,
      yoyo: true,
      repeat: 12,
    });
    this.tweens.add({
      targets: this.robot.sprite,
      alpha: 0.35,
      duration: 60,
      yoyo: true,
      repeat: 8,
      onComplete: () => this.robot?.sprite.setAlpha(1),
    });

    this.time.delayedCall(180, () => this.sparkAt(this.robot?.x ?? 0, TUNING.bossScene.groundY - 88));
    this.time.delayedCall(520, () => this.sparkAt(this.robot?.x ?? 0, TUNING.bossScene.groundY - 44));
    this.time.delayedCall(900, () => this.explodeRobot());
  }

  private explodeRobot(): void {
    if (!this.robot) {
      return;
    }

    this.audio?.play('explosion');
    this.cameras.main.shake(480, 0.017);
    this.debrisAt(this.robot.x, this.robot.y - 62, 0xf28f3b, 16);
    const boom = this.add
      .circle(this.robot.x, this.robot.y - 62, 8, 0xf6d743, 0.95)
      .setDepth(50);
    this.robot.sprite.setVisible(false);
    this.tweens.add({
      targets: boom,
      scale: 5,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => boom.destroy(),
    });
    this.time.delayedCall(650, () => fadeToScene(this, ROUTE_TO_SCENE_KEY.ending));
  }

  private sparkAt(x: number, y: number, color = 0xf6d743): void {
    if (!this.effectGraphics) {
      return;
    }

    const graphics = this.effectGraphics;
    graphics.lineStyle(2, color, 1);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      graphics.lineBetween(
        x,
        y,
        x + Math.cos(angle) * 14,
        y + Math.sin(angle) * 14,
      );
    }
    this.time.delayedCall(120, () => graphics.clear());
    this.debrisAt(x, y, color, 5);
  }

  private debrisAt(x: number, y: number, color: number, count: number): void {
    const pieces = Array.from({ length: count }, (_value, index) => {
      const angle = (Math.PI * 2 * index) / count + Phaser.Math.FloatBetween(-0.25, 0.25);
      const distance = Phaser.Math.Between(12, 34);
      const piece = this.add
        .rectangle(x, y, 3, 3, index % 3 === 0 ? 0xffffff : color, 1)
        .setDepth(55);
      this.tweens.add({
        targets: piece,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: Phaser.Math.Between(260, 520),
        ease: 'Quad.easeOut',
        onComplete: () => piece.destroy(),
      });
      return piece;
    });
    this.time.delayedCall(560, () => pieces.forEach((piece) => piece.destroy()));
  }
}
