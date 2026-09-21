import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DebugOverlay } from '../systems/DebugOverlay';
import { setupSceneHotkeys } from '../util/sceneRouting';

export abstract class StubScene extends Phaser.Scene {
  private debugOverlay?: DebugOverlay;

  protected constructor(
    key: string,
    private readonly label: string,
    private readonly backgroundColor: string,
  ) {
    super(key);
  }

  create(): void {
    setupSceneHotkeys(this);
    this.cameras.main.setBackgroundColor(this.backgroundColor);
    this.add
      .text(GAME_WIDTH / 2, 108, this.label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 25, GAME_WIDTH, 4, 0x000000, 0.85);
    this.add
      .text(GAME_WIDTH / 2, 150, 'M1 STUB', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#f6d743',
      })
      .setOrigin(0.5);
    this.debugOverlay = new DebugOverlay(this);
  }

  update(): void {
    this.debugOverlay?.update();
  }
}
