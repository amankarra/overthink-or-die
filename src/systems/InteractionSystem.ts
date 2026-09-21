import Phaser from 'phaser';
import { TUNING } from '../config';
import type { Player } from '../entities/Player';
import { InteractionButton } from '../ui/InteractionButton';
import type { DialogueSystem } from './DialogueSystem';

type Target = Phaser.GameObjects.Components.Transform;

export class InteractionSystem {
  private readonly interactKey?: Phaser.Input.Keyboard.Key;
  private wasDialogueActive = false;
  private suppressInteractUntilReleased = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly target: Target,
    private readonly button: InteractionButton,
    private readonly dialogue: DialogueSystem,
    private readonly onInteract: () => void,
  ) {
    this.interactKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.button.on('selected', this.tryInteract, this);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.button.off('selected', this.tryInteract, this);
    });
  }

  update(): void {
    if (this.wasDialogueActive && !this.dialogue.active && this.interactKey?.isDown) {
      this.suppressInteractUntilReleased = true;
    }
    this.wasDialogueActive = this.dialogue.active;

    if (this.suppressInteractUntilReleased && !this.interactKey?.isDown) {
      this.suppressInteractUntilReleased = false;
    }

    if (this.dialogue.active) {
      this.button.hide();
      return;
    }

    const inRange = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.target.x,
      this.target.y,
    ) <= TUNING.interaction.radius;

    if (inRange) {
      this.button.showAt(this.target.x, this.target.y - 42);
      if (
        this.interactKey &&
        !this.suppressInteractUntilReleased &&
        Phaser.Input.Keyboard.JustDown(this.interactKey)
      ) {
        this.tryInteract();
      }
    } else {
      this.button.hide();
    }
  }

  private tryInteract(): void {
    if (!this.button.visible || this.dialogue.active) {
      return;
    }
    this.onInteract();
  }
}
