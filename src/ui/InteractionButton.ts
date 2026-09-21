import Phaser from 'phaser';

export class InteractionButton extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);

    this.background = scene.add.rectangle(0, 0, 42, 18, 0x111421).setStrokeStyle(2, 0xffffff);
    const label = scene.add
      .text(0, 0, 'SPEAK', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add([this.background, label]);
    this.setSize(42, 18);
    this.setDepth(500);
    this.setVisible(false);
    this.setInteractive({ useHandCursor: true });

    this.on(
      Phaser.Input.Events.POINTER_DOWN,
      (
        _pointer: Phaser.Input.Pointer,
        _localX: number,
        _localY: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.emit('selected');
      },
    );
  }

  showAt(x: number, y: number): void {
    this.setPosition(Math.round(x), Math.round(y));
    this.setVisible(true);
    this.background.setFillStyle(0x111421, 1);
  }

  hide(): void {
    this.setVisible(false);
  }
}
