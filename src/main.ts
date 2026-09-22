import Phaser from 'phaser';
import './styles.css';
import { PHASER_CONFIG } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GolfIntroScene } from './scenes/GolfIntroScene';
import { BarrelScene } from './scenes/BarrelScene';
import { IllusionScene } from './scenes/IllusionScene';
import { BossScene } from './scenes/BossScene';
import { EndingScene } from './scenes/EndingScene';

const devScenes = import.meta.env.DEV
  ? [
      (await import('./scenes/TestScene')).TestScene,
      (await import('./scenes/GalleryScene')).GalleryScene,
    ]
  : [];

new Phaser.Game({
  ...PHASER_CONFIG,
  scene: [
    BootScene,
    TitleScene,
    GolfIntroScene,
    BarrelScene,
    IllusionScene,
    BossScene,
    EndingScene,
    ...devScenes,
  ],
});
