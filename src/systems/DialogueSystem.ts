import Phaser from 'phaser';
import { TUNING } from '../config';
import type { Player } from '../entities/Player';
import { AudioManager } from './AudioManager';
import { DialogueBox } from '../ui/DialogueBox';

export type DialogueLine = {
  speaker: string;
  text: string;
};

export class DialogueSystem {
  private lines: DialogueLine[] = [];
  private index = 0;
  private done?: () => void;
  private currentLine?: DialogueLine;
  private visibleChars = 0;
  private revealTimer?: Phaser.Time.TimerEvent;
  private readonly audio: AudioManager;
  private readonly handleAdvance = (): void => this.advance();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly box: DialogueBox,
    private readonly player?: Player,
  ) {
    this.audio = new AudioManager(scene);
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

    if (this.isRevealing()) {
      this.completeCurrentLine();
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
    this.clearRevealTimer();
    this.currentLine = undefined;
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

    this.clearRevealTimer();
    this.currentLine = line;
    this.visibleChars = 0;
    this.audio.play('blip', { volume: 0.45 });
    this.box.showLine(line.speaker, '');

    if (line.text.length === 0) {
      return;
    }

    this.revealTimer = this.scene.time.addEvent({
      delay: TUNING.dialogue.typewriterCharMs,
      repeat: line.text.length - 1,
      callback: () => {
        if (!this.currentLine) {
          return;
        }
        this.visibleChars += 1;
        this.box.setBodyText(this.currentLine.text.slice(0, this.visibleChars));
        if (!this.isRevealing()) {
          this.revealTimer = undefined;
        }
      },
    });
  }

  private isRevealing(): boolean {
    return Boolean(this.currentLine && this.visibleChars < this.currentLine.text.length);
  }

  private completeCurrentLine(): void {
    if (!this.currentLine) {
      return;
    }
    this.clearRevealTimer();
    this.visibleChars = this.currentLine.text.length;
    this.box.setBodyText(this.currentLine.text);
  }

  private clearRevealTimer(): void {
    this.revealTimer?.remove(false);
    this.revealTimer = undefined;
  }
}
