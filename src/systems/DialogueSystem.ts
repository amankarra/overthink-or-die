import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import { DialogueBox } from '../ui/DialogueBox';

export type DialogueLine = {
  speaker: string;
  text: string;
};

export class DialogueSystem {
  private lines: DialogueLine[] = [];
  private index = 0;
  private done?: () => void;
  private readonly handleAdvance = (): void => this.advance();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly box: DialogueBox,
    private readonly player?: Player,
  ) {
    this.box.on(Phaser.Input.Events.POINTER_DOWN, this.handleAdvance);
    this.scene.input.keyboard?.on('keydown-SPACE', this.handleAdvance);
    this.scene.input.keyboard?.on('keydown-E', this.handleAdvance);

    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.box.off(Phaser.Input.Events.POINTER_DOWN, this.handleAdvance);
      this.scene.input.keyboard?.off('keydown-SPACE', this.handleAdvance);
      this.scene.input.keyboard?.off('keydown-E', this.handleAdvance);
    });
  }

  get active(): boolean {
    return this.lines.length > 0;
  }

  start(lines: DialogueLine[], done?: () => void): void {
    if (lines.length === 0) {
      return;
    }
    this.lines = lines;
    this.index = 0;
    this.done = done;
    this.player?.setControlsEnabled(false);
    this.renderCurrentLine();
  }

  private advance(): void {
    if (!this.active) {
      return;
    }

    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
      return;
    }

    this.renderCurrentLine();
  }

  private close(): void {
    const done = this.done;
    this.lines = [];
    this.done = undefined;
    this.box.hide();
    this.player?.setControlsEnabled(true);
    this.player?.suppressJumpUntilReleased();
    done?.();
  }

  private renderCurrentLine(): void {
    const line = this.lines[this.index];
    if (!line) {
      return;
    }
    this.box.showLine(line.speaker, line.text);
  }
}
