import Phaser from 'phaser';
import { PALETTE } from './palette';
import { SPRITES } from './sprites';

function toCssColor(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

export function buildTextures(scene: Phaser.Scene): void {
  for (const [key, rows] of Object.entries(SPRITES)) {
    const spriteRows: readonly string[] = rows;
    const width = spriteRows[0]?.length ?? 0;
    if (width === 0 || spriteRows.length === 0) {
      throw new Error(`Sprite "${key}" must have at least one non-empty row.`);
    }

    for (const row of spriteRows) {
      if (row.length !== width) {
        throw new Error(`Sprite "${key}" has inconsistent row lengths.`);
      }
    }

    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }

    const texture = scene.textures.createCanvas(key, width, rows.length);
    if (!texture) {
      throw new Error(`Could not create canvas texture for sprite "${key}".`);
    }
    const context = texture.getContext();
    context.clearRect(0, 0, width, rows.length);

    spriteRows.forEach((row, y) => {
      Array.from(row).forEach((char, x) => {
        const color = PALETTE[char];
        if (color === undefined) {
          throw new Error(`Sprite "${key}" uses unknown palette character "${char}".`);
        }
        if (color === null) {
          return;
        }
        context.fillStyle = toCssColor(color);
        context.fillRect(x, y, 1, 1);
      });
    });

    texture.refresh();
  }
}
