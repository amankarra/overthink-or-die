import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TUNING } from '../config';
import { Player } from '../entities/Player';
import { DebugOverlay } from '../systems/DebugOverlay';
import { DialogueSystem } from '../systems/DialogueSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { DialogueBox } from '../ui/DialogueBox';
import { InteractionButton } from '../ui/InteractionButton';
import { setupSceneHotkeys } from '../util/sceneRouting';

export class TestScene extends Phaser.Scene {
  private player?: Player;
  private interaction?: InteractionSystem;
  private debugOverlay?: DebugOverlay;

  constructor() {
    super('TestScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#5f6f89');
    setupSceneHotkeys(this);

    const ground = this.physics.add.staticGroup();
    for (let x = 8; x < GAME_WIDTH + 8; x += 16) {
      ground.create(x, TUNING.testScene.groundY, 'ground_tile_0').setOrigin(0.5, 0);
    }
    ground.refresh();

    const wall = this.add
      .rectangle(
        TUNING.testScene.wallX,
        TUNING.testScene.wallY,
        TUNING.testScene.wallWidth,
        TUNING.testScene.wallHeight,
        0x3b4451,
      )
      .setStrokeStyle(2, 0x000000);
    this.physics.add.existing(wall, true);
    const wallBody = wall.body as Phaser.Physics.Arcade.StaticBody;
    wallBody.updateFromGameObject();

    this.player = new Player(this, TUNING.testScene.playerStartX, TUNING.testScene.playerStartY);
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, wall);

    const npc = this.add.sprite(TUNING.testScene.npcX, TUNING.testScene.npcY, 'npc_test_0').setOrigin(0.5, 1);

    const dialogueBox = new DialogueBox(this);
    const dialogue = new DialogueSystem(this, dialogueBox, this.player);
    const speakButton = new InteractionButton(this);
    this.interaction = new InteractionSystem(this, this.player, npc, speakButton, dialogue, () => {
      dialogue.start([
        { speaker: 'NPC', text: 'Hello.' },
        { speaker: 'NPC', text: 'Try jumping after closing this.' },
      ]);
    });

    this.add
      .text(12, 12, 'TEST SCENE', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setDepth(50);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 16, GAME_WIDTH, 2, 0x000000, 0.35);
    this.debugOverlay = new DebugOverlay(this, () => this.player);
  }

  update(): void {
    this.interaction?.update();
    this.player?.update();
    this.debugOverlay?.update();
  }
}
