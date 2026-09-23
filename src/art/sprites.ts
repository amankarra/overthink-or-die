function makeGrid(width: number, height: number, fill = '.'): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function drawRect(
  grid: string[][],
  x: number,
  y: number,
  width: number,
  height: number,
  char: string,
): void {
  for (let row = y; row < y + height; row += 1) {
    if (!grid[row]) {
      continue;
    }
    for (let col = x; col < x + width; col += 1) {
      if (grid[row]?.[col] !== undefined) {
        grid[row][col] = char;
      }
    }
  }
}

function drawFrame(
  grid: string[][],
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
): void {
  drawRect(grid, x, y, width, height, fill);
  drawRect(grid, x, y, width, 1, 'k');
  drawRect(grid, x, y + height - 1, width, 1, 'k');
  drawRect(grid, x, y, 1, height, 'k');
  drawRect(grid, x + width - 1, y, 1, height, 'k');
}

function drawPixelLine(
  grid: string[][],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  char: string,
  thickness = 1,
): void {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step += 1) {
    const progress = steps === 0 ? 0 : step / steps;
    drawRect(
      grid,
      Math.round(x1 + (x2 - x1) * progress),
      Math.round(y1 + (y2 - y1) * progress),
      thickness,
      thickness,
      char,
    );
  }
}

function drawPolyline(
  grid: string[][],
  points: readonly (readonly [number, number])[],
  char: string,
  thickness = 1,
): void {
  for (let index = 1; index < points.length; index += 1) {
    const [x1, y1] = points[index - 1];
    const [x2, y2] = points[index];
    drawPixelLine(grid, x1, y1, x2, y2, char, thickness);
  }
}

function drawPattern(grid: string[][], x: number, y: number, rows: readonly string[]): void {
  rows.forEach((row, rowIndex) => {
    Array.from(row).forEach((char, colIndex) => {
      if (char !== '.') {
        drawRect(grid, x + colIndex, y + rowIndex, 1, 1, char);
      }
    });
  });
}

function gridRows(grid: string[][]): string[] {
  return grid.map((row) => row.join(''));
}

type WorshipperPose = 'pray0' | 'pray1' | 'walk0' | 'walk1' | 'summon0' | 'summon1';

function makeWorshipperSprite(pose: WorshipperPose): string[] {
  const grid = makeGrid(18, 24);
  drawRect(grid, 7, 0, 4, 1, 'k');
  drawRect(grid, 5, 1, 8, 2, 'k');
  drawRect(grid, 4, 3, 10, 2, 'k');
  drawRect(grid, 3, 5, 12, 5, 'k');
  drawRect(grid, 6, 1, 6, 2, 'd');
  drawRect(grid, 5, 3, 8, 2, 'd');
  drawRect(grid, 4, 5, 10, 5, 'd');
  drawRect(grid, 6, 5, 6, 5, 's');
  drawRect(grid, 7, 7, 1, 1, 'k');
  drawRect(grid, 10, 7, 1, 1, 'k');
  drawRect(grid, 8, 9, 2, 1, 'k');
  drawFrame(grid, 4, 10, 10, 10, 'p');
  drawRect(grid, 5, 11, 8, 2, 'd');
  drawRect(grid, 7, 15, 4, 2, 'y');

  if (pose === 'summon0' || pose === 'summon1') {
    const lift = pose === 'summon0' ? 0 : -1;
    drawRect(grid, 1, 8 + lift, 3, 6, 'p');
    drawRect(grid, 2, 5 + lift, 3, 5, 'p');
    drawRect(grid, 2, 3 + lift, 3, 2, 's');
    drawRect(grid, 14, 8 + lift, 3, 6, 'p');
    drawRect(grid, 13, 5 + lift, 3, 5, 'p');
    drawRect(grid, 13, 3 + lift, 3, 2, 's');
    drawRect(grid, pose === 'summon0' ? 5 : 4, 20, 4, 2, 'd');
    drawRect(grid, pose === 'summon0' ? 9 : 10, 20, 4, 2, 'd');
  } else if (pose === 'pray0' || pose === 'pray1') {
    const leftY = pose === 'pray0' ? 12 : 13;
    const rightY = pose === 'pray0' ? 13 : 12;
    drawRect(grid, 1, leftY, 6, 3, 'p');
    drawRect(grid, 11, rightY, 6, 3, 'p');
    drawRect(grid, 6, 14, 2, 2, 's');
    drawRect(grid, 10, 14, 2, 2, 's');
    drawRect(grid, pose === 'pray0' ? 5 : 4, 20, 4, 2, 'd');
    drawRect(grid, pose === 'pray0' ? 9 : 10, 20, 4, 2, 'd');
  } else {
    drawRect(grid, 2, 11, 4, 7, 'p');
    drawRect(grid, 12, 11, 4, 7, 'p');
    drawRect(grid, 3, 18, 2, 2, 's');
    drawRect(grid, 13, 18, 2, 2, 's');
    drawRect(grid, pose === 'walk0' ? 5 : 4, 19, 4, 4, 'd');
    drawRect(grid, pose === 'walk0' ? 10 : 9, 19, 4, 4, 'd');
    drawRect(grid, pose === 'walk0' ? 4 : 3, 22, 5, 1, 'k');
    drawRect(grid, pose === 'walk0' ? 10 : 11, 22, 5, 1, 'k');
  }

  drawRect(grid, 4, 22, 10, 1, 'k');

  return gridRows(grid);
}

type RobotPose = 'idle' | 'walk0' | 'walk1' | 'kickWindup' | 'kick' | 'eyes';

function makeRobotSprite(pose: RobotPose): string[] {
  const grid = makeGrid(64, 120);
  const eye = 'r';
  const leftLegOffset = pose === 'walk0' ? -3 : pose === 'walk1' ? 2 : 0;
  const rightLegOffset = pose === 'walk0' ? 2 : pose === 'walk1' ? -3 : 0;

  drawFrame(grid, 21, 3, 22, 18, 'd');
  drawRect(grid, 26, 9, 4, 3, eye);
  drawRect(grid, 34, 9, 4, 3, eye);
  drawRect(grid, 25, 15, 14, 2, 'k');
  drawFrame(grid, 15, 22, 34, 42, 'd');
  drawRect(grid, 19, 27, 26, 4, 'w');
  drawRect(grid, 20, 34, 5, 17, 'a');
  drawRect(grid, 40, 34, 5, 17, 'a');
  drawRect(grid, 29, 35, 7, 13, pose === 'eyes' ? 'r' : 'p');
  drawRect(grid, 29, 35, 7, 3, 'y');
  drawRect(grid, 17, 57, 30, 4, 'k');

  if (pose === 'kickWindup') {
    drawFrame(grid, 7, 25, 13, 27, 'd');
    drawFrame(grid, 48, 28, 11, 25, 'd');
  } else if (pose === 'kick') {
    drawFrame(grid, 3, 45, 26, 9, 'd');
    drawFrame(grid, 48, 28, 11, 25, 'd');
  } else {
    drawFrame(grid, 8, 27, 10, 32, 'd');
    drawFrame(grid, 48, 27, 10, 32, 'd');
  }

  drawFrame(grid, 18 + leftLegOffset, 63, 13, 42, 'd');
  drawFrame(grid, 36 + rightLegOffset, 63, 13, 42, 'd');
  drawFrame(grid, 10 + leftLegOffset, 103, 22, 11, 'd');
  drawFrame(grid, 34 + rightLegOffset, 103, 22, 11, 'd');
  drawRect(grid, 16 + leftLegOffset, 105, 8, 7, 'k');
  drawRect(grid, 38 + rightLegOffset, 105, 10, 7, 'k');
  drawRect(grid, 17 + leftLegOffset, 107, 5, 4, 'r');
  drawRect(grid, 39 + rightLegOffset, 107, 5, 4, 'r');

  if (pose === 'kick') {
    drawFrame(grid, 4, 94, 30, 11, 'd');
    drawRect(grid, 4, 97, 8, 5, 'k');
  }

  return gridRows(grid);
}

type SlabPose = 'upright' | 'fallen';

function makeSlabSprite(pose: SlabPose): string[] {
  const grid = makeGrid(24, 40);
  if (pose === 'upright') {
    drawFrame(grid, 4, 2, 16, 32, 'g');
    drawRect(grid, 6, 4, 12, 28, 'l');
    drawFrame(grid, 8, 11, 8, 10, 'k');
    drawRect(grid, 10, 14, 4, 4, 'd');
    for (let y = 7; y <= 27; y += 5) {
      drawRect(grid, 2, y, 4, 2, 'y');
      drawRect(grid, 18, y, 4, 2, 'y');
      drawRect(grid, 6, y, 3, 1, 'y');
      drawRect(grid, 15, y, 3, 1, 'y');
    }
    drawRect(grid, 11, 5, 2, 6, 'y');
    drawRect(grid, 11, 21, 2, 8, 'y');
    drawRect(grid, 7, 25, 10, 2, 'y');
    drawRect(grid, 16, 6, 2, 2, 'r');
    drawRect(grid, 6, 29, 2, 2, 'w');
    drawRect(grid, 4, 34, 16, 3, 'k');
    drawRect(grid, 2, 37, 20, 2, 'd');
    return gridRows(grid);
  }

  drawFrame(grid, 1, 22, 22, 11, 'g');
  drawRect(grid, 3, 24, 18, 7, 'l');
  drawFrame(grid, 8, 25, 8, 4, 'k');
  drawRect(grid, 4, 24, 3, 1, 'y');
  drawRect(grid, 17, 24, 3, 1, 'y');
  drawRect(grid, 5, 30, 5, 1, 'y');
  drawRect(grid, 15, 30, 4, 1, 'r');
  drawRect(grid, 0, 34, 24, 3, 'k');
  return gridRows(grid);
}

function makeSlabDamagedSprite(stage: 1 | 2): string[] {
  const grid = makeGrid(24, 40);
  drawFrame(grid, 4, 2, 16, 32, 'g');
  drawRect(grid, 6, 4, 12, 28, 'l');
  drawFrame(grid, 8, 11, 8, 10, 'k');
  drawRect(grid, 10, 14, 4, 4, 'd');
  for (let y = 7; y <= 27; y += 5) {
    drawRect(grid, 2, y, 4, 2, 'y');
    drawRect(grid, 18, y, 4, 2, 'y');
    drawRect(grid, 6, y, 3, 1, 'y');
    drawRect(grid, 15, y, 3, 1, 'y');
  }
  drawRect(grid, 9, 7, 1, 8, 'k');
  drawRect(grid, 15, 19, 1, 9, 'k');
  if (stage === 2) {
    drawRect(grid, 6, 13, 1, 10, 'k');
    drawRect(grid, 17, 7, 1, 7, 'k');
    drawRect(grid, 12, 5, 2, 2, 'r');
    drawRect(grid, 7, 29, 2, 2, 'r');
  }
  drawRect(grid, 4, 34, 16, 3, 'k');
  drawRect(grid, 2, 37, 20, 2, 'd');
  return gridRows(grid);
}

function makeRodSprite(): string[] {
  const grid = makeGrid(18, 18);
  drawRect(grid, 8, 2, 2, 12, 'y');
  drawRect(grid, 7, 3, 4, 2, 'w');
  drawRect(grid, 7, 12, 4, 2, 'o');
  drawRect(grid, 6, 1, 6, 2, 'k');
  drawRect(grid, 7, 14, 4, 2, 'k');
  return gridRows(grid);
}

function makeRodGlowSprite(): string[] {
  const grid = makeGrid(24, 10);
  drawRect(grid, 6, 3, 12, 4, 'y');
  drawRect(grid, 3, 4, 18, 2, 'l');
  return gridRows(grid);
}

function makeReticleSprite(frame: 0 | 1): string[] {
  const grid = makeGrid(24, 14);
  const color = frame === 0 ? 'r' : 'y';
  drawRect(grid, 10, 0, 4, 2, color);
  drawRect(grid, 10, 12, 4, 2, color);
  drawRect(grid, 0, 6, 5, 2, color);
  drawRect(grid, 19, 6, 5, 2, color);
  drawRect(grid, 5, 3, 2, 2, color);
  drawRect(grid, 17, 3, 2, 2, color);
  drawRect(grid, 5, 9, 2, 2, color);
  drawRect(grid, 17, 9, 2, 2, color);
  return gridRows(grid);
}

function makePipSprite(filled: boolean): string[] {
  const grid = makeGrid(8, 8);
  drawFrame(grid, 1, 1, 6, 6, filled ? 'y' : 'd');
  if (!filled) {
    drawRect(grid, 3, 3, 2, 2, '.');
  }
  return gridRows(grid);
}

function makeRodIconSprite(): string[] {
  const grid = makeGrid(10, 10);
  drawRect(grid, 4, 1, 2, 7, 'y');
  drawRect(grid, 3, 1, 4, 1, 'w');
  drawRect(grid, 3, 8, 4, 1, 'k');
  return gridRows(grid);
}

type HeroSilhouettePose = 'stand' | 'fall';

function makeHeroSilhouetteSprite(pose: HeroSilhouettePose): string[] {
  const grid = makeGrid(18, 28);
  if (pose === 'fall') {
    drawRect(grid, 2, 13, 14, 5, 'k');
    drawRect(grid, 13, 9, 4, 5, 'k');
    drawRect(grid, 4, 9, 3, 5, 'k');
    drawRect(grid, 1, 15, 3, 2, 'k');
    drawRect(grid, 8, 18, 3, 6, 'k');
    drawRect(grid, 11, 19, 5, 3, 'k');
    return gridRows(grid);
  }

  drawRect(grid, 6, 2, 6, 6, 'k');
  drawRect(grid, 5, 8, 8, 9, 'k');
  drawRect(grid, 3, 9, 3, 7, 'k');
  drawRect(grid, 12, 9, 3, 7, 'k');
  drawRect(grid, 6, 17, 3, 8, 'k');
  drawRect(grid, 10, 17, 3, 8, 'k');
  drawRect(grid, 5, 25, 4, 2, 'k');
  drawRect(grid, 10, 25, 4, 2, 'k');
  return gridRows(grid);
}

type GolferPose = 'idle' | 'backswing' | 'swing';

function makeGolferSilhouetteSprite(pose: GolferPose): string[] {
  const grid = makeGrid(32, 32);

  drawRect(grid, 12, 3, 6, 6, 'k');
  drawRect(grid, 11, 4, 11, 2, 'k');
  drawRect(grid, 18, 6, 3, 2, 'k');
  drawRect(grid, 14, 9, 4, 2, 'k');
  drawRect(grid, 11, 11, 8, 5, 'k');
  drawRect(grid, 10, 15, 9, 4, 'k');
  drawRect(grid, 15, 13, 5, 5, 'k');
  drawRect(grid, 12, 19, 5, 2, 'k');
  drawRect(grid, 10, 20, 4, 6, 'k');
  drawRect(grid, 8, 25, 7, 2, 'k');
  drawRect(grid, 16, 20, 4, 5, 'k');
  drawRect(grid, 19, 24, 3, 4, 'k');
  drawRect(grid, 18, 28, 8, 2, 'k');

  if (pose === 'backswing') {
    drawPolyline(
      grid,
      [
        [15, 13],
        [10, 9],
        [6, 5],
        [2, 1],
      ],
      'k',
    );
    drawPolyline(
      grid,
      [
        [18, 13],
        [13, 10],
        [9, 6],
      ],
      'k',
      2,
    );
    drawRect(grid, 0, 0, 5, 2, 'k');
  } else if (pose === 'swing') {
    drawPolyline(
      grid,
      [
        [15, 15],
        [10, 20],
        [6, 25],
        [2, 30],
      ],
      'k',
    );
    drawPolyline(
      grid,
      [
        [18, 15],
        [13, 18],
        [9, 21],
      ],
      'k',
      2,
    );
    drawRect(grid, 0, 30, 5, 2, 'k');
    drawRect(grid, 20, 18, 5, 3, 'k');
  } else {
    drawPolyline(
      grid,
      [
        [17, 14],
        [22, 18],
        [27, 24],
        [31, 29],
      ],
      'k',
    );
    drawPolyline(
      grid,
      [
        [14, 14],
        [19, 17],
        [22, 20],
      ],
      'k',
      2,
    );
    drawRect(grid, 28, 29, 4, 2, 'k');
  }

  return gridRows(grid);
}

type HeroDancePose = 'left' | 'right' | 'kickLeft' | 'kickRight';

function drawHeroHead(grid: string[][], x: number, y: number): void {
  drawPattern(grid, x, y, [
    '...kkkk...',
    '..khhhhk..',
    '.khhhhssk.',
    '.khhhsssk.',
    '.ksswsssk.',
    '.ksssss.k.',
    '..ksss.k..',
  ]);
}

function makeHeroDanceSprite(pose: HeroDancePose): string[] {
  const grid = makeGrid(24, 30);
  const shift = pose === 'left' || pose === 'kickLeft' ? -1 : 1;
  const bob = pose === 'kickLeft' || pose === 'kickRight' ? -1 : 0;
  drawHeroHead(grid, 7 + shift, 1 + bob);
  drawFrame(grid, 7, 9 + bob, 10, 8, 'c');
  drawRect(grid, 11, 12 + bob, 2, 2, 'y');
  if (pose === 'left') {
    drawRect(grid, 2, 7, 5, 3, 'c');
    drawRect(grid, 3, 5, 3, 3, 's');
    drawRect(grid, 17, 12, 5, 3, 'c');
    drawRect(grid, 20, 14, 3, 3, 's');
    drawRect(grid, 7, 17, 3, 8, 'b');
    drawRect(grid, 14, 16, 3, 8, 'b');
    drawRect(grid, 6, 25, 5, 2, 'r');
    drawRect(grid, 13, 24, 5, 2, 'r');
  } else if (pose === 'right') {
    drawRect(grid, 2, 12, 5, 3, 'c');
    drawRect(grid, 2, 14, 3, 3, 's');
    drawRect(grid, 17, 7, 5, 3, 'c');
    drawRect(grid, 19, 5, 3, 3, 's');
    drawRect(grid, 6, 16, 3, 8, 'b');
    drawRect(grid, 13, 17, 3, 8, 'b');
    drawRect(grid, 5, 24, 5, 2, 'r');
    drawRect(grid, 12, 25, 5, 2, 'r');
  } else if (pose === 'kickLeft') {
    drawRect(grid, 1, 10, 6, 3, 'c');
    drawRect(grid, 1, 8, 3, 3, 's');
    drawRect(grid, 17, 9, 6, 3, 'c');
    drawRect(grid, 21, 8, 3, 3, 's');
    drawRect(grid, 6, 16, 3, 9, 'b');
    drawRect(grid, 13, 18, 7, 3, 'b');
    drawRect(grid, 5, 25, 5, 2, 'r');
    drawRect(grid, 19, 18, 4, 2, 'r');
  } else {
    drawRect(grid, 1, 9, 6, 3, 'c');
    drawRect(grid, 1, 8, 3, 3, 's');
    drawRect(grid, 17, 10, 6, 3, 'c');
    drawRect(grid, 21, 8, 3, 3, 's');
    drawRect(grid, 4, 18, 7, 3, 'b');
    drawRect(grid, 14, 16, 3, 9, 'b');
    drawRect(grid, 1, 18, 4, 2, 'r');
    drawRect(grid, 13, 25, 5, 2, 'r');
  }
  return gridRows(grid);
}

function makeHeroHurtSprite(): string[] {
  const grid = makeGrid(18, 28);
  drawFrame(grid, 5, 1, 8, 7, 's');
  drawRect(grid, 7, 4, 1, 1, 'r');
  drawRect(grid, 10, 4, 1, 1, 'r');
  drawFrame(grid, 4, 8, 10, 8, 'c');
  drawRect(grid, 8, 11, 2, 2, 'y');
  drawRect(grid, 1, 8, 4, 3, 'c');
  drawRect(grid, 13, 7, 4, 3, 'c');
  drawRect(grid, 5, 16, 3, 8, 'b');
  drawRect(grid, 10, 17, 3, 8, 'b');
  drawRect(grid, 4, 24, 5, 2, 'r');
  drawRect(grid, 10, 25, 5, 2, 'r');
  return gridRows(grid);
}

type BarrelManPose = 'idle' | 'run0' | 'run1' | 'tucked' | 'plant';

function drawClayPotBody(grid: string[][], x: number, y: number): void {
  drawPattern(grid, x, y, [
    '..kkkkkk...',
    '.koooooook.',
    'koeeeeeeook',
    'keeeeeeeeek',
    'keoeeeeoek',
    'keeeeeeeeek',
    '.keeeeeek.',
    '.koeeeeok.',
    '..keeeek..',
    '..koooook.',
    '...kkkk...',
  ]);
  drawRect(grid, x + 1, y + 4, 2, 2, 'e');
  drawRect(grid, x + 8, y + 4, 2, 2, 'e');
  drawRect(grid, x + 3, y + 3, 1, 5, 'd');
  drawRect(grid, x + 7, y + 2, 1, 6, 'o');
}

function drawTuckedClayPot(grid: string[][]): void {
  drawPattern(grid, 2, 5, [
    '...kkkkkk...',
    '..koooooook.',
    '.koeeeeeeok',
    'koeeeeeeeeok',
    'keeeeeeeeeek',
    'keoeeeeeeoek',
    'koeeeeeeeeok',
    '.koeeeeeeok',
    '..kooooook.',
    '...kkkkkk..',
  ]);
  drawRect(grid, 6, 8, 5, 4, 's');
  drawRect(grid, 6, 11, 5, 2, 'w');
  drawRect(grid, 4, 7, 2, 2, 'd');
  drawRect(grid, 12, 12, 2, 2, 'o');
}

function makeBarrelManSprite(pose: BarrelManPose): string[] {
  const grid = makeGrid(18, 24);

  if (pose === 'tucked') {
    drawTuckedClayPot(grid);
    return gridRows(grid);
  }

  if (pose === 'plant') {
    drawRect(grid, 7, 0, 2, 8, 'l');
    drawRect(grid, 4, 2, 5, 2, 'l');
    drawRect(grid, 8, 3, 5, 2, 'g');
  }

  drawFrame(grid, 6, 2, 6, 5, 's');
  drawRect(grid, 5, 1, 8, 2, 'w');
  drawRect(grid, 5, 6, 8, 4, 'w');
  drawRect(grid, 7, 4, 1, 1, 'k');
  drawRect(grid, 10, 4, 1, 1, 'k');
  drawClayPotBody(grid, 3, 10);

  const lanternY = pose === 'run1' ? 11 : 12;
  drawRect(grid, 14, lanternY, 2, 4, 'y');
  drawRect(grid, 13, lanternY - 1, 4, 1, 'k');
  drawRect(grid, 13, lanternY + 4, 4, 1, 'k');
  drawRect(grid, 16, lanternY, 1, 1, 'y');
  drawRect(grid, 16, lanternY + 2, 2, 1, 'o');
  drawRect(grid, 16, lanternY + 4, 1, 1, 'y');
  drawRect(grid, 12, lanternY + 2, 1, 1, 'o');

  if (pose === 'run0') {
    drawRect(grid, 3, 20, 3, 3, 's');
    drawRect(grid, 10, 20, 4, 2, 's');
  } else if (pose === 'run1') {
    drawRect(grid, 4, 20, 4, 2, 's');
    drawRect(grid, 11, 19, 3, 4, 's');
  } else {
    drawRect(grid, 5, 20, 3, 3, 's');
    drawRect(grid, 10, 20, 3, 3, 's');
  }

  return gridRows(grid);
}

function drawBaldMonkHeadAt(grid: string[][], x: number, y: number): void {
  drawRect(grid, x + 7, y + 3, 6, 1, 's');
  drawRect(grid, x + 6, y + 4, 8, 5, 's');
  drawRect(grid, x + 7, y + 9, 6, 2, 's');
  drawRect(grid, x + 6, y + 6, 1, 2, 's');
  drawRect(grid, x + 13, y + 6, 1, 2, 's');
  drawRect(grid, x + 8, y + 7, 1, 1, 'k');
  drawRect(grid, x + 11, y + 7, 1, 1, 'k');
  drawRect(grid, x + 9, y + 9, 2, 1, 'k');
}

type MeditatorDancePose = 'left' | 'right' | 'hopLeft' | 'hopRight';

function makeMeditatorDanceSprite(pose: MeditatorDancePose): string[] {
  const grid = makeGrid(24, 24);
  const shift = pose === 'left' || pose === 'hopLeft' ? -1 : 1;
  const bob = pose === 'hopLeft' || pose === 'hopRight' ? -1 : 0;
  drawBaldMonkHeadAt(grid, 2 + shift, bob);
  drawFrame(grid, 7, 11 + bob, 12, 6, 'p');
  drawRect(grid, 12, 13 + bob, 2, 2, 'y');
  if (pose === 'left') {
    drawRect(grid, 1, 10, 6, 3, 'p');
    drawRect(grid, 2, 8, 3, 3, 's');
    drawRect(grid, 18, 14, 5, 3, 'p');
    drawRect(grid, 21, 16, 2, 2, 's');
    drawRect(grid, 5, 18, 6, 3, 'a');
    drawRect(grid, 13, 17, 6, 3, 'a');
  } else if (pose === 'right') {
    drawRect(grid, 1, 14, 6, 3, 'p');
    drawRect(grid, 1, 16, 2, 2, 's');
    drawRect(grid, 18, 10, 5, 3, 'p');
    drawRect(grid, 20, 8, 3, 3, 's');
    drawRect(grid, 5, 17, 6, 3, 'a');
    drawRect(grid, 13, 18, 6, 3, 'a');
  } else if (pose === 'hopLeft') {
    drawRect(grid, 1, 11, 6, 3, 'p');
    drawRect(grid, 1, 9, 3, 3, 's');
    drawRect(grid, 18, 11, 5, 3, 'p');
    drawRect(grid, 21, 9, 2, 2, 's');
    drawRect(grid, 4, 18, 7, 3, 'a');
    drawRect(grid, 14, 18, 7, 3, 'a');
  } else {
    drawRect(grid, 1, 11, 6, 3, 'p');
    drawRect(grid, 1, 9, 2, 2, 's');
    drawRect(grid, 18, 11, 5, 3, 'p');
    drawRect(grid, 20, 9, 3, 3, 's');
    drawRect(grid, 4, 18, 7, 3, 'a');
    drawRect(grid, 14, 18, 7, 3, 'a');
  }
  drawRect(grid, 5, 21, 14, 2, 'k');
  return gridRows(grid);
}

type MeditatorPose = 'meditate' | 'point';

function drawBaldMonkHead(grid: string[][]): void {
  drawBaldMonkHeadAt(grid, 0, 0);
}

function makeMeditatorSprite(pose: MeditatorPose): string[] {
  const grid = makeGrid(20, 22);
  drawBaldMonkHead(grid);
  drawFrame(grid, 4, 11, 12, 6, 'p');
  drawRect(grid, 8, 13, 4, 2, 'y');
  if (pose === 'point') {
    drawRect(grid, 14, 11, 5, 3, 'p');
    drawRect(grid, 17, 10, 2, 2, 's');
    drawRect(grid, 1, 14, 5, 3, 'p');
  } else {
    drawRect(grid, 1, 13, 5, 3, 'p');
    drawRect(grid, 14, 13, 5, 3, 'p');
  }
  drawRect(grid, 3, 17, 6, 2, 'a');
  drawRect(grid, 11, 17, 6, 2, 'a');
  drawRect(grid, 4, 19, 12, 2, 'k');
  return gridRows(grid);
}

export const SPRITES = {
  hero_idle_0: [
    '......kkkk........',
    '.....khhhhk.......',
    '....khhhhssk......',
    '....khhhsssk......',
    '....ksswsssk......',
    '....ksssss.k......',
    '.....ksss.k.......',
    '....kkccc..k......',
    '...kccccccck......',
    '..kcccycccck......',
    '..kcccccccck......',
    '..kccckkccck......',
    '...kcckkcck.......',
    '....kbbbbk........',
    '....kbbbbk........',
    '....kbbbbk........',
    '....kbbbbk........',
    '....kbbbbk........',
    '....kbbkbk........',
    '....kbk.kbk.......',
    '....kbk.kbk.......',
    '....kbk.kbk.......',
    '....krk.krk.......',
    '...krrk.krrk......',
    '...krrk.krrk......',
    '...kkkk.kkkk......',
    '..................',
    '..................',
  ],
  hero_walk_0: [
    '......kkkk........',
    '.....khhhhk.......',
    '....khhhhssk......',
    '....khhhsssk......',
    '....ksswsssk......',
    '....ksssss.k......',
    '.....ksss.k.......',
    '...kkkccc.........',
    '..kccccccck.......',
    '.kcccycccck.......',
    '.kcccccccck.......',
    '..kcckkccck.......',
    '...kcckkcck.......',
    '....kbbbbk........',
    '....kbbbbk........',
    '....kbbbbk........',
    '....kbbbk.........',
    '....kbbbk.........',
    '....kbbk..........',
    '...kbbk...........',
    '..kbbk............',
    '..kbk.............',
    '..krk.............',
    '.krrk.............',
    '.krrk.............',
    '.kkkk.............',
    '.......kkkk.......',
    '.......krrk.......',
  ],
  hero_walk_1: [
    '......kkkk........',
    '.....khhhhk.......',
    '....khhhhssk......',
    '....khhhsssk......',
    '....ksswsssk......',
    '....ksssss.k......',
    '.....ksss.k.......',
    '.......ccckkk.....',
    '....kccccccck.....',
    '....kccccyccck....',
    '....kcccccccck....',
    '....kccckkcck.....',
    '....kcckkcck......',
    '.....kbbbbk.......',
    '.....kbbbbk.......',
    '.....kbbbbk.......',
    '......kbbbk.......',
    '......kbbbk.......',
    '.......kbbk.......',
    '........kbbk......',
    '.........kbbk.....',
    '..........kbk.....',
    '..........krk.....',
    '..........krrk....',
    '..........krrk....',
    '..........kkkk....',
    '....kkkk..........',
    '....krrk..........',
  ],
  hero_jump_0: [
    '......kkkk........',
    '.....khhhhk.......',
    '....khhhhssk......',
    '....khhhsssk......',
    '....ksswsssk......',
    '....ksssss.k......',
    '.....ksss.k.......',
    '...kkkccc.kkk.....',
    '..kcccccckcck.....',
    '.kcccyccccck......',
    '.kcccccccck.......',
    '..kcckkcck........',
    '...kcckkk.........',
    '....kbbbbk........',
    '....kbbbbk........',
    '...kbbkkbbk.......',
    '..kbbk..kbbk......',
    '..kbk....kbk......',
    '..krk....krk......',
    '.krrk....krrk.....',
    '.kkkk....kkkk.....',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
  ],
  hero_silhouette_stand_0: makeHeroSilhouetteSprite('stand'),
  hero_silhouette_fall_0: makeHeroSilhouetteSprite('fall'),
  hero_kick_0: [
    '......kkkk........',
    '.....khhhhk.......',
    '....khhhhssk......',
    '....khhhsssk......',
    '....ksswsssk......',
    '....ksssss.k......',
    '.....ksss.k.......',
    '...kkkccc.........',
    '..kccccccckk......',
    '.kcccyccccckkkk...',
    '.kcccccccckkkkk...',
    '..kcckkccck.......',
    '...kcckkcck.......',
    '....kbbbbk........',
    '....kbbbbk........',
    '.....kbbbk........',
    '......kbbbk.......',
    '.......kbbk.......',
    '........kbbbbkk...',
    '.........kbbbbbk..',
    '..........kkkkkk..',
    '....kbk...........',
    '....krk...........',
    '...krrk...........',
    '...krrk...........',
    '...kkkk...........',
    '..................',
    '..................',
  ],
  hero_hurt_0: makeHeroHurtSprite(),
  heart_0: [
    '.rr...rr.',
    'rrrr.rrrr',
    'rrrrrrrrr',
    '.rrrrrrr.',
    '..rrrrr..',
    '...rrr...',
    '....r....',
    '.........',
  ],
  hero_dance_0: makeHeroDanceSprite('left'),
  hero_dance_1: makeHeroDanceSprite('right'),
  hero_dance_2: makeHeroDanceSprite('kickLeft'),
  hero_dance_3: makeHeroDanceSprite('kickRight'),
  golfer_silhouette_idle_0: makeGolferSilhouetteSprite('idle'),
  golfer_silhouette_backswing_0: makeGolferSilhouetteSprite('backswing'),
  golfer_silhouette_swing_0: makeGolferSilhouetteSprite('swing'),
  golfball_0: [
    'www',
    'www',
    'www',
  ],
  npc_test_0: [
    '.....kkkk.....',
    '....khhhhk....',
    '...khhhhssk...',
    '...khsswssk...',
    '...khsssssk...',
    '....kssssk....',
    '.....kssk.....',
    '....kkggkk....',
    '...kggggggk...',
    '..kgggyggggk..',
    '..kggggggggk..',
    '...kggkkggk...',
    '..kkggaaggkk..',
    '.kggaa..aagk..',
    '.kaa......aak.',
    '..kek....kek..',
    '..kek....kek..',
    '..krk....krk..',
    '.krrk....krrk.',
    '.kkkk....kkkk.',
    '..............',
    '..............',
  ],
  ground_tile_0: [
    'llllllllllllllll',
    'lgglgglgglgglggl',
    'gggggggggggggggg',
    'eeeeeeeeeeeeeeee',
    'eedeedeedeedeede',
    'eeeeeeeeeeeeeeee',
    'edeeedeeedeeedee',
    'eeeeeeeeeeeeeeee',
    'eedeedeedeedeede',
    'eeeeeeeeeeeeeeee',
    'edeeedeeedeeedee',
    'eeeeeeeeeeeeeeee',
    'eedeedeedeedeede',
    'eeeeeeeeeeeeeeee',
    'edeeedeeedeeedee',
    'eeeeeeeeeeeeeeee',
  ],
  slide_tile_0: [
    'dddddddddddddddd',
    'ddddddddddddddde',
    'dddddddddddddeee',
    'dddddddddddeeeee',
    'dddddddddeeeeeee',
    'dddddddeeeeeeeee',
    'ddddddeeeeeeeeee',
    'ddddeeeeeeeeeeee',
    'dddeeeeeeeeeeeee',
    'ddeeeeeeeeeeeeee',
    'deeeeeeeeeeeeeee',
    'eeeeeeeeeeeeeeee',
    'eedeedeedeedeede',
    'eeeeeeeeeeeeeeee',
    'edeeedeeedeeedee',
    'eeeeeeeeeeeeeeee',
  ],
  grass_tile_0: [
    'llllllllllllllll',
    'lgglgglgglgglggl',
    'gggggggggggggggg',
    'aaaaaaaaaaaaaaaa',
    'aagaaagaaagaaaga',
    'aaaaaaaaaaaaaaaa',
    'aaagaaaagaaaagaa',
    'aaaaaaaaaaaaaaaa',
    'aagaaagaaagaaaga',
    'aaaaaaaaaaaaaaaa',
    'aaagaaaagaaaagaa',
    'aaaaaaaaaaaaaaaa',
    'aagaaagaaagaaaga',
    'aaaaaaaaaaaaaaaa',
    'aaagaaaagaaaagaa',
    'aaaaaaaaaaaaaaaa',
  ],
  dead_tile_0: [
    'eeeeeeeeeeeeeeee',
    'eoeeeoeeeoeeeoee',
    'eeeeeeeeeeeeeeee',
    'dddddddddddddddd',
    'ddeedddeedddeedd',
    'dddddddddddddddd',
    'dddeddddeddddedd',
    'dddddddddddddddd',
    'ddeedddeedddeedd',
    'dddddddddddddddd',
    'dddeddddeddddedd',
    'dddddddddddddddd',
    'ddeedddeedddeedd',
    'dddddddddddddddd',
    'dddeddddeddddedd',
    'dddddddddddddddd',
  ],
  cracked_tile_0: [
    'dddddddddddddddd',
    'dkdddddddkdddddd',
    'ddkdddddkddddddd',
    'dddkdddkdddddkdd',
    'ddddkdkdddddkddd',
    'dddddkdddddkdddd',
    'dddkddddddkddddd',
    'dddddddddkdddddd',
    'dkddddddkddddddd',
    'ddkddddkdddddkdd',
    'dddkddkdddddkddd',
    'ddddkkdddddkdddd',
    'ddddddddddkddddd',
    'dddkdddddkdddddd',
    'ddddddddkddddddd',
    'dddddddddddddddd',
  ],
  barrelman_idle_0: makeBarrelManSprite('idle'),
  barrelman_run_0: makeBarrelManSprite('run0'),
  barrelman_run_1: makeBarrelManSprite('run1'),
  barrelman_tucked_0: makeBarrelManSprite('tucked'),
  barrelman_plant_0: makeBarrelManSprite('plant'),
  meditator_meditate_0: makeMeditatorSprite('meditate'),
  meditator_point_0: makeMeditatorSprite('point'),
  meditator_dance_0: makeMeditatorDanceSprite('left'),
  meditator_dance_1: makeMeditatorDanceSprite('right'),
  meditator_dance_2: makeMeditatorDanceSprite('hopLeft'),
  meditator_dance_3: makeMeditatorDanceSprite('hopRight'),
  door_0: [
    '........................',
    '........kkkkkkkk........',
    '......kkddddddddkk......',
    '.....kddddddddddddk.....',
    '....kddddddddddddddk....',
    '....kdddkkkkkkkkdddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddk........kddk....',
    '....kddddddddddddddk....',
    '....kddddddddddddddk....',
    '....kkkkkkkkkkkkkkkk....',
    '........................',
    '........................',
  ],
  wall_tile_0: [
    'dddddddddddddddd',
    'dkdddddddkdddddd',
    'dddddddddddddddd',
    'dddddkddddddddkd',
    'dddddddddddddddd',
    'dddkddddkddddddd',
    'dddddddddddddddd',
    'dddddddddddkdddd',
    'dddddddddddddddd',
    'dkdddddddkdddddd',
    'dddddddddddddddd',
    'dddddkddddddddkd',
    'dddddddddddddddd',
    'dddkddddkddddddd',
    'dddddddddddddddd',
    'dddddddddddkdddd',
  ],
  worshipper_pray_0: makeWorshipperSprite('pray0'),
  worshipper_pray_1: makeWorshipperSprite('pray1'),
  worshipper_summon_0: makeWorshipperSprite('summon0'),
  worshipper_summon_1: makeWorshipperSprite('summon1'),
  worshipper_walk_0: makeWorshipperSprite('walk0'),
  worshipper_walk_1: makeWorshipperSprite('walk1'),
  robot_idle_0: makeRobotSprite('idle'),
  robot_walk_0: makeRobotSprite('walk0'),
  robot_walk_1: makeRobotSprite('walk1'),
  robot_kick_windup_0: makeRobotSprite('kickWindup'),
  robot_kick_0: makeRobotSprite('kick'),
  robot_eyes_glow_0: makeRobotSprite('eyes'),
  slab_upright_0: makeSlabSprite('upright'),
  slab_fallen_0: makeSlabSprite('fallen'),
  slab_damaged_1: makeSlabDamagedSprite(1),
  slab_damaged_2: makeSlabDamagedSprite(2),
  rod_0: makeRodSprite(),
  rod_ground_glow_0: makeRodGlowSprite(),
  reticle_0: makeReticleSprite(0),
  reticle_1: makeReticleSprite(1),
  pip_full_0: makePipSprite(true),
  pip_empty_0: makePipSprite(false),
  rod_icon_0: makeRodIconSprite(),
} as const;
