import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { DebugOverlay } from '../systems/DebugOverlay';
import { fadeToScene, ROUTE_TO_SCENE_KEY, setupSceneHotkeys } from '../util/sceneRouting';

export class TitleScene extends Phaser.Scene {
  private debugOverlay?: DebugOverlay;
  private started = false;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#090a14');
    new AudioManager(this);
    setupSceneHotkeys(this);
    this.debugOverlay = new DebugOverlay(this);

    this.add
      .text(GAME_WIDTH / 2, 72, 'OVERTHINK\nOR DIE!', {
        fontFamily: 'monospace',
        fontSize: '31px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const touchOnly = this.isTouchOnly();
    this.add
      .text(
        GAME_WIDTH / 2,
        172,
        touchOnly ? 'THIS GAME NEEDS A KEYBOARD.\nPLEASE PLAY ON A COMPUTER.' : 'CLICK TO START',
        {
          fontFamily: 'monospace',
          fontSize: touchOnly ? '12px' : '13px',
          color: touchOnly ? '#e84855' : '#f6d743',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 225, 'A SHORT RETRO PANIC PLATFORMER', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#87a96b',
      })
      .setOrigin(0.5);

    if (touchOnly) {
      return;
    }

    const start = (): void => {
      if (this.started) {
        return;
      }
      this.started = true;
      fadeToScene(this, ROUTE_TO_SCENE_KEY.barrel);
    };

    this.input.once(Phaser.Input.Events.POINTER_DOWN, start);
    this.input.keyboard?.once('keydown', start);
  }

  update(): void {
    this.debugOverlay?.update();
  }

  private isTouchOnly(): boolean {
    const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const hasFinePointer = window.matchMedia?.('(pointer: fine)').matches ?? true;
    return hasCoarsePointer && !hasFinePointer;
  }
}
