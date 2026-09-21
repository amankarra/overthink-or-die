import Phaser from 'phaser';
import { buildTextures } from '../art/buildTextures';
import { BarrelMan } from '../entities/BarrelMan';
import { Player } from '../entities/Player';
import { getRequestedSceneKey } from '../util/sceneRouting';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    buildTextures(this);
    Player.createAnimations(this);
    BarrelMan.createAnimations(this);
    this.scene.start(getRequestedSceneKey());
  }
}
