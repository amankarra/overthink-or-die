import Phaser from 'phaser';
import './styles.css';
import { PHASER_CONFIG } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { TestScene } from './scenes/TestScene';
import { GolfIntroScene } from './scenes/GolfIntroScene';
import { BarrelScene } from './scenes/BarrelScene';
import { IllusionScene } from './scenes/IllusionScene';
import { BossScene } from './scenes/BossScene';
import { EndingScene } from './scenes/EndingScene';
import { GalleryScene } from './scenes/GalleryScene';

new Phaser.Game({
  ...PHASER_CONFIG,
  scene: [
    BootScene,
    TitleScene,
    TestScene,
    GolfIntroScene,
    BarrelScene,
    IllusionScene,
    BossScene,
    EndingScene,
    GalleryScene,
  ],
});
