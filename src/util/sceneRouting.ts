import Phaser from 'phaser';
import { TUNING } from '../config';

export type RouteName =
  | 'title'
  | 'test'
  | 'intro'
  | 'barrel'
  | 'illusion'
  | 'boss'
  | 'ending'
  | 'gallery';

export const ROUTE_TO_SCENE_KEY: Record<RouteName, string> = {
  title: 'TitleScene',
  test: 'TestScene',
  intro: 'GolfIntroScene',
  barrel: 'BarrelScene',
  illusion: 'IllusionScene',
  boss: 'BossScene',
  ending: 'EndingScene',
  gallery: 'GalleryScene',
};

const DEV_NUMBER_ROUTES: Record<string, RouteName> = {
  ONE: 'intro',
  TWO: 'barrel',
  THREE: 'illusion',
  FOUR: 'boss',
  FIVE: 'ending',
};

export function getRequestedSceneKey(): string {
  const scene = new URLSearchParams(window.location.search).get('scene')?.toLowerCase();
  if (scene === 'gallery' && !import.meta.env.DEV) {
    return ROUTE_TO_SCENE_KEY.title;
  }
  if (scene && scene in ROUTE_TO_SCENE_KEY) {
    return ROUTE_TO_SCENE_KEY[scene as RouteName];
  }
  return ROUTE_TO_SCENE_KEY.title;
}

export function fadeToScene(scene: Phaser.Scene, sceneKey: string): void {
  if (scene.data.get('__transitioning')) {
    return;
  }
  scene.data.set('__transitioning', true);
  scene.cameras.main.fadeOut(TUNING.fadeMs, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(sceneKey);
  });
}

export function fadeRestart(scene: Phaser.Scene): void {
  const currentKey = scene.scene.key;
  if (currentKey === ROUTE_TO_SCENE_KEY.ending) {
    scene.registry.set('illusionFailures', 0);
  }
  fadeToScene(scene, currentKey === ROUTE_TO_SCENE_KEY.ending ? ROUTE_TO_SCENE_KEY.title : currentKey);
}

export function setupSceneHotkeys(scene: Phaser.Scene): void {
  scene.data.set('__transitioning', false);

  const keyboard = scene.input.keyboard;
  if (!keyboard) {
    return;
  }

  const restartHandler = (): void => {
    fadeRestart(scene);
  };
  keyboard.on('keydown-R', restartHandler);

  const devHandlers: Array<[string, () => void]> = [];
  if (import.meta.env.DEV) {
    for (const [code, route] of Object.entries(DEV_NUMBER_ROUTES)) {
      const handler = (): void => fadeToScene(scene, ROUTE_TO_SCENE_KEY[route]);
      devHandlers.push([`keydown-${code}`, handler]);
      keyboard.on(`keydown-${code}`, handler);
    }
  }

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    keyboard.off('keydown-R', restartHandler);
    devHandlers.forEach(([eventName, handler]) => keyboard.off(eventName, handler));
  });
}
