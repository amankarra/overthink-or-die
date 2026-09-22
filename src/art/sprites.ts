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

function gridRows(grid: string[][]): string[] {
  return grid.map((row) => row.join(''));
}

type WorshipperPose = 'pray0' | 'pray1' | 'walk0' | 'walk1';

function makeWorshipperSprite(pose: WorshipperPose): string[] {
  const grid = makeGrid(14, 20);
  drawFrame(grid, 3, 1, 8, 8, 'd');
  drawRect(grid, 5, 4, 4, 3, 'k');
  drawFrame(grid, 2, 8, 10, 7, 'p');
  drawRect(grid, 3, 10, 8, 1, 'd');

  if (pose === 'pray0' || pose === 'pray1') {
    drawRect(grid, 1, pose === 'pray0' ? 10 : 11, 4, 3, 'p');
    drawRect(grid, 9, pose === 'pray0' ? 11 : 10, 4, 3, 'p');
    drawRect(grid, 2, 13, 3, 2, 'd');
    drawRect(grid, 9, 13, 3, 2, 'd');
    drawRect(grid, pose === 'pray0' ? 4 : 3, 15, 3, 3, 'd');
    drawRect(grid, pose === 'pray0' ? 7 : 8, 15, 3, 3, 'd');
  } else {
    drawRect(grid, 1, 9, 3, 6, 'p');
    drawRect(grid, 10, 9, 3, 6, 'p');
    drawRect(grid, pose === 'walk0' ? 4 : 3, 14, 3, 5, 'd');
    drawRect(grid, pose === 'walk0' ? 8 : 9, 14, 3, 5, 'd');
    drawRect(grid, pose === 'walk0' ? 3 : 2, 18, 4, 1, 'k');
    drawRect(grid, pose === 'walk0' ? 8 : 9, 18, 4, 1, 'k');
  }

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
    drawFrame(grid, 5, 1, 14, 36, 'g');
    drawRect(grid, 8, 5, 2, 25, 'y');
    drawRect(grid, 14, 7, 2, 20, 'y');
    drawRect(grid, 8, 14, 8, 2, 'y');
    drawRect(grid, 10, 25, 6, 2, 'l');
    drawRect(grid, 7, 8, 3, 3, 'l');
    drawRect(grid, 15, 18, 2, 2, 'r');
    drawRect(grid, 4, 37, 16, 3, 'k');
    return gridRows(grid);
  }

  drawFrame(grid, 1, 22, 22, 12, 'g');
  drawRect(grid, 4, 25, 15, 2, 'y');
  drawRect(grid, 8, 28, 9, 2, 'l');
  drawRect(grid, 18, 25, 2, 2, 'r');
  drawRect(grid, 0, 34, 24, 3, 'k');
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
  const grid = makeGrid(22, 30);
  drawRect(grid, 8, 3, 6, 6, 'k');
  drawRect(grid, 7, 9, 8, 10, 'k');
  drawRect(grid, 7, 19, 3, 8, 'k');
  drawRect(grid, 12, 19, 3, 8, 'k');
  drawRect(grid, 6, 27, 5, 2, 'k');
  drawRect(grid, 12, 27, 5, 2, 'k');

  if (pose === 'backswing') {
    drawRect(grid, 2, 4, 9, 2, 'k');
    drawRect(grid, 1, 2, 2, 8, 'k');
    drawRect(grid, 11, 11, 4, 2, 'k');
  } else if (pose === 'swing') {
    drawRect(grid, 13, 12, 8, 2, 'k');
    drawRect(grid, 19, 10, 2, 8, 'k');
    drawRect(grid, 5, 10, 4, 2, 'k');
  } else {
    drawRect(grid, 3, 12, 5, 2, 'k');
    drawRect(grid, 3, 12, 2, 14, 'k');
    drawRect(grid, 13, 11, 4, 2, 'k');
  }

  return gridRows(grid);
}

type HeroDancePose = 'left' | 'right';

function makeHeroDanceSprite(pose: HeroDancePose): string[] {
  const grid = makeGrid(18, 28);
  drawFrame(grid, 5, 1, 8, 7, 's');
  drawRect(grid, 7, 4, 2, 1, 'w');
  drawFrame(grid, 4, 8, 10, 8, 'c');
  drawRect(grid, 8, 11, 2, 2, 'y');
  if (pose === 'left') {
    drawRect(grid, 1, 6, 4, 3, 'c');
    drawRect(grid, 13, 10, 4, 3, 'c');
    drawRect(grid, 5, 16, 3, 8, 'b');
    drawRect(grid, 11, 15, 3, 8, 'b');
  } else {
    drawRect(grid, 1, 10, 4, 3, 'c');
    drawRect(grid, 13, 6, 4, 3, 'c');
    drawRect(grid, 4, 15, 3, 8, 'b');
    drawRect(grid, 10, 16, 3, 8, 'b');
  }
  drawRect(grid, 4, 24, 5, 2, 'r');
  drawRect(grid, 10, 24, 5, 2, 'r');
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

function drawBarrelBody(grid: string[][], x: number, y: number): void {
  drawFrame(grid, x, y, 11, 10, 'e');
  drawRect(grid, x + 1, y + 2, 9, 1, 'd');
  drawRect(grid, x + 1, y + 7, 9, 1, 'd');
  drawRect(grid, x + 3, y + 1, 1, 8, 'o');
  drawRect(grid, x + 7, y + 1, 1, 8, 'o');
}

function makeBarrelManSprite(pose: BarrelManPose): string[] {
  const grid = makeGrid(18, 24);

  if (pose === 'tucked') {
    drawFrame(grid, 2, 5, 14, 10, 'e');
    drawRect(grid, 3, 7, 12, 1, 'd');
    drawRect(grid, 3, 12, 12, 1, 'd');
    drawRect(grid, 5, 6, 1, 8, 'o');
    drawRect(grid, 11, 6, 1, 8, 'o');
    drawRect(grid, 6, 8, 5, 4, 's');
    drawRect(grid, 6, 11, 5, 2, 'w');
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
  drawBarrelBody(grid, 4, 10);

  const lanternY = pose === 'run1' ? 11 : 12;
  drawRect(grid, 14, lanternY, 2, 4, 'y');
  drawRect(grid, 13, lanternY - 1, 4, 1, 'k');
  drawRect(grid, 13, lanternY + 4, 4, 1, 'k');

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

type MeditatorDancePose = 'left' | 'right';

function makeMeditatorDanceSprite(pose: MeditatorDancePose): string[] {
  const grid = makeGrid(20, 22);
  drawFrame(grid, 7, 1, 7, 6, 's');
  drawFrame(grid, 5, 7, 10, 7, 'p');
  drawRect(grid, 9, 10, 2, 2, 'y');
  if (pose === 'left') {
    drawRect(grid, 1, 7, 5, 3, 'p');
    drawRect(grid, 14, 11, 5, 3, 'p');
    drawRect(grid, 4, 15, 5, 3, 'a');
    drawRect(grid, 11, 16, 5, 3, 'a');
  } else {
    drawRect(grid, 1, 11, 5, 3, 'p');
    drawRect(grid, 14, 7, 5, 3, 'p');
    drawRect(grid, 4, 16, 5, 3, 'a');
    drawRect(grid, 11, 15, 5, 3, 'a');
  }
  drawRect(grid, 4, 18, 12, 2, 'k');
  return gridRows(grid);
}

type MeditatorPose = 'meditate' | 'point';

function drawSerpentCanopy(grid: string[][]): void {
  drawFrame(grid, 1, 1, 5, 6, 'g');
  drawFrame(grid, 5, 0, 5, 7, 'l');
  drawFrame(grid, 10, 0, 5, 7, 'l');
  drawFrame(grid, 14, 1, 5, 6, 'g');
  drawRect(grid, 3, 4, 1, 1, 'y');
  drawRect(grid, 7, 3, 1, 1, 'y');
  drawRect(grid, 12, 3, 1, 1, 'y');
  drawRect(grid, 16, 4, 1, 1, 'y');
}

function makeMeditatorSprite(pose: MeditatorPose): string[] {
  const grid = makeGrid(20, 22);
  drawSerpentCanopy(grid);
  drawFrame(grid, 7, 5, 6, 6, 's');
  drawRect(grid, 8, 8, 1, 1, 'k');
  drawRect(grid, 11, 8, 1, 1, 'k');
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
} as const;
