import Phaser from 'phaser';

export class DialogueBox extends Phaser.GameObjects.Container {
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 20, 182);
    scene.add.existing(this);

    const background = scene.add.rectangle(0, 0, 440, 72, 0x090a14, 0.96);
    background.setOrigin(0, 0);
    background.setStrokeStyle(2, 0xffffff);

    this.speakerText = scene.add.text(12, 9, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#f6d743',
    });
    this.bodyText = scene.add.text(12, 27, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: 416 },
      lineSpacing: 4,
    });

    this.add([background, this.speakerText, this.bodyText]);
    this.setSize(440, 72);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 440, 72),
      Phaser.Geom.Rectangle.Contains,
    );
    this.setScrollFactor(0);
    this.setDepth(1000);
    this.setVisible(false);
  }

  showLine(speaker: string, text: string): void {
    this.speakerText.setText(speaker);
    this.bodyText.setText(text);
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }
}
