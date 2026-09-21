import Phaser from 'phaser';
import type { Player } from '../entities/Player';

type ExtraLines = () => Record<string, string | number | boolean>;

export class DebugOverlay {
  private readonly text?: Phaser.GameObjects.Text;
  private readonly toggleKey?: Phaser.Input.Keyboard.Key;
  private visible = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly getPlayer?: () => Player | undefined,
    private readonly getExtraLines?: ExtraLines,
  ) {
    if (!import.meta.env.DEV || !scene.input.keyboard) {
      return;
    }

    this.text = scene.add
      .text(4, 4, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 4, y: 3 },
      })
      .setDepth(10_000)
      .setScrollFactor(0)
      .setVisible(false);
    this.toggleKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2);
  }

  update(): void {
    if (!this.text || !this.toggleKey) {
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.toggleKey)) {
      this.visible = !this.visible;
      this.text.setVisible(this.visible);
    }

    if (!this.visible) {
      return;
    }

    const player = this.getPlayer?.();
    const lines = [
      `scene: ${this.scene.scene.key}`,
      `fps: ${Math.round(this.scene.game.loop.actualFps)}`,
      `player: ${player ? `${Math.round(player.x)}, ${Math.round(player.y)}` : 'none'}`,
    ];

    const extra = this.getExtraLines?.() ?? {};
    for (const [key, value] of Object.entries(extra)) {
      lines.push(`${key}: ${value}`);
    }

    this.text.setText(lines);
  }
}
