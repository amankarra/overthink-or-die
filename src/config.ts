import Phaser from 'phaser';

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const TUNING = {
  fadeMs: 250,
  worldGravity: 600,
  player: {
    width: 18,
    height: 28,
    runSpeed: 110,
    jumpVelocity: -260,
    hp: 3,
    invulnerabilityMs: 1000,
  },
  interaction: {
    radius: 54,
  },
  barrelMan: {
    speeds: {
      slow: 35,
      normal: 55,
      burst: 75,
      hesitate: 0,
    },
    behaviorChangeMs: {
      min: 700,
      max: 1400,
    },
    exposedSpeedMultiplier: 0.45,
    exposureToPlantSeconds: 3,
    exposureDecayPerSecond: 1,
    rngSeed: 41473,
  },
  barrelScene: {
    worldWidth: 1200,
    groundY: 246,
    playerStartX: 64,
    playerStartY: 198,
    barrelStartX: 132,
    barrelStartY: 230,
    slideX: 1048,
    slideExitX: 1135,
    plantRestartDelayMs: 900,
    shadeAlpha: 0.24,
    lightAlpha: 0.22,
    shadowHeight: 8,
    shadowYOffset: 2,
  },
  robot: {
    walkSpeed: 30,
    kickRange: 70,
    kickWindupMs: 500,
    kickActiveMs: 200,
    kickRecoverMs: 600,
    laserWindupMs: 600,
    laserProjectileSpeed: 180,
    idleBetweenAttacksMs: 800,
  },
  testScene: {
    groundY: 246,
    playerStartX: 72,
    playerStartY: 198,
    npcX: 214,
    npcY: 230,
    wallX: 320,
    wallY: 218,
    wallWidth: 18,
    wallHeight: 56,
  },
} as const;

const search = new URLSearchParams(window.location.search);
export const RECORD_MODE = search.get('record') === '1';

export const PHASER_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#111421',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    mode: RECORD_MODE ? Phaser.Scale.NONE : Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: RECORD_MODE ? 4 : 1,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: TUNING.worldGravity },
      debug: false,
    },
  },
};
