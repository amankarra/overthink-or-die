import Phaser from 'phaser';
import './styles.css';
import { PHASER_CONFIG } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GolfIntroScene } from './scenes/GolfIntroScene';
import { BarrelGridScene } from './scenes/BarrelGridScene';
import { BarrelSideScene } from './scenes/BarrelSideScene';
import { IllusionScene } from './scenes/IllusionScene';
import { BossArenaScene } from './scenes/BossArenaScene';
import { BossSideScene } from './scenes/BossSideScene';
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
    BarrelGridScene,
    BarrelSideScene,
    IllusionScene,
    BossArenaScene,
    BossSideScene,
    EndingScene,
    ...devScenes,
  ],
});
