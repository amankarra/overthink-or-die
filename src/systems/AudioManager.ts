import Phaser from 'phaser';

export class AudioManager {
  constructor(private readonly scene: Phaser.Scene) {}

  play(key: string): void {
    if (!this.scene.cache.audio.exists(key)) {
      return;
    }
    this.scene.sound.play(key);
  }

  loop(key: string): void {
    if (!this.scene.cache.audio.exists(key)) {
      return;
    }
    this.scene.sound.play(key, { loop: true });
  }

  stop(key: string): void {
    if (!this.scene.cache.audio.exists(key)) {
      return;
    }
    this.scene.sound.stopByKey(key);
  }
}
