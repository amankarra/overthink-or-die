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
  drawFrame(grid, 4, 1, 6, 6, 'p');
  drawRect(grid, 6, 4, 2, 2, 's');
  drawFrame(grid, 3, 7, 8, 7, 'p');
  drawRect(grid, 6, 10, 2, 2, 'y');

  if (pose === 'pray0' || pose === 'pray1') {
    drawRect(grid, 1, 10, 4, 3, 'p');
    drawRect(grid, 9, 10, 4, 3, 'p');
    drawRect(grid, 2, 13, 3, 2, 'a');
    drawRect(grid, 9, 13, 3, 2, 'a');
    drawRect(grid, pose === 'pray0' ? 4 : 3, 15, 3, 2, 'a');
    drawRect(grid, pose === 'pray0' ? 7 : 8, 15, 3, 2, 'a');
  } else {
    drawRect(grid, 2, 8, 2, 6, 'p');
    drawRect(grid, 10, 8, 2, 6, 'p');
    drawRect(grid, pose === 'walk0' ? 4 : 3, 14, 3, 5, 'a');
    drawRect(grid, pose === 'walk0' ? 8 : 9, 14, 3, 5, 'a');
    drawRect(grid, pose === 'walk0' ? 3 : 2, 18, 4, 1, 'k');
    drawRect(grid, pose === 'walk0' ? 8 : 9, 18, 4, 1, 'k');
  }

  return gridRows(grid);
}

type RobotPose = 'idle' | 'walk0' | 'walk1' | 'kickWindup' | 'kick' | 'eyes';

function makeRobotSprite(pose: RobotPose): string[] {
  const grid = makeGrid(64, 120);
  const eye = pose === 'eyes' ? 'r' : 'y';
  const leftLegOffset = pose === 'walk0' ? -3 : pose === 'walk1' ? 2 : 0;
  const rightLegOffset = pose === 'walk0' ? 2 : pose === 'walk1' ? -3 : 0;

  drawFrame(grid, 23, 4, 18, 16, 'd');
  drawRect(grid, 28, 10, 3, 3, eye);
  drawRect(grid, 35, 10, 3, 3, eye);
  drawFrame(grid, 18, 22, 28, 40, 'd');
  drawRect(grid, 29, 34, 7, 11, pose === 'eyes' ? 'r' : 'p');
  drawRect(grid, 20, 24, 24, 4, 'w');

  if (pose === 'kickWindup') {
    drawFrame(grid, 8, 25, 12, 25, 'd');
    drawFrame(grid, 45, 27, 11, 25, 'd');
  } else if (pose === 'kick') {
    drawFrame(grid, 4, 45, 24, 9, 'd');
    drawFrame(grid, 45, 27, 11, 25, 'd');
  } else {
    drawFrame(grid, 10, 27, 10, 32, 'd');
    drawFrame(grid, 45, 27, 10, 32, 'd');
  }

  drawFrame(grid, 20 + leftLegOffset, 62, 12, 43, 'd');
  drawFrame(grid, 35 + rightLegOffset, 62, 12, 43, 'd');
  drawFrame(grid, 13 + leftLegOffset, 103, 20, 10, 'd');
  drawFrame(grid, 34 + rightLegOffset, 103, 20, 10, 'd');
  drawRect(grid, 13 + leftLegOffset, 106, 8, 4, 'k');
  drawRect(grid, 34 + rightLegOffset, 106, 8, 4, 'k');

  if (pose === 'kick') {
    drawFrame(grid, 5, 94, 30, 11, 'd');
    drawRect(grid, 5, 97, 8, 5, 'k');
  }

  return gridRows(grid);
}

type SlabPose = 'upright' | 'fallen';

function makeSlabSprite(pose: SlabPose): string[] {
  const grid = makeGrid(24, 40);
  if (pose === 'upright') {
    drawFrame(grid, 6, 1, 12, 36, 'd');
    drawRect(grid, 9, 5, 6, 18, 'p');
    drawRect(grid, 4, 37, 16, 3, 'k');
    return gridRows(grid);
  }

  drawFrame(grid, 1, 22, 22, 12, 'd');
  drawRect(grid, 5, 25, 12, 5, 'p');
  drawRect(grid, 0, 34, 24, 3, 'k');
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
  npc_test_0: [
    '.....kkkk.....',
    '....kppppk....',
    '...kppppppk...',
    '...kpsspppk...',
    '...kpsswppk...',
    '....kssssk....',
    '.....kssk.....',
    '....kkggkk....',
    '...kggggggk...',
    '..kgggyggggk..',
    '..kggggggggk..',
    '...kggkkggk...',
    '....kekkek....',
    '....kekkek....',
    '....kekkek....',
    '....kekkek....',
    '....kekkek....',
    '....krkkrk....',
    '...krrkkrrk...',
    '...kkkkkkkk...',
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
  barrelman_idle_0: [
    '..................',
    '.......kkkk.......',
    '......keeeek......',
    '.....keeeeek......',
    '.....keesssk......',
    '.....kesswsk......',
    '......ksssk.......',
    '.....kkbbkk.......',
    '....kbbbbbbk......',
    '....kbbbybbk......',
    '....kbbbbbbk......',
    '.....kbbbbk.......',
    '....kkeeeekk......',
    '...keeeeeeeek.....',
    '...keeekkkeek.....',
    '...keeeeeeeek.....',
    '....keeeeeek......',
    '.....kekkek.......',
    '.....kekkek.......',
    '.....kekkek.......',
    '.....krkkrk.......',
    '....krrkkrrk......',
    '....kkkkkkkk......',
    '..................',
  ],
  barrelman_run_0: [
    '..................',
    '.......kkkk.......',
    '......keeeek......',
    '.....keeeeek......',
    '.....keesssk......',
    '.....kesswsk......',
    '......ksssk.......',
    '....kkkbbk........',
    '...kbbbbbbk.......',
    '...kbbbybbbk......',
    '...kbbbbbbbk......',
    '....kbbbbbk.......',
    '....kkeeeekk......',
    '...keeeeeeeek.....',
    '..keeeekkkeek.....',
    '..keeeeeeeeek.....',
    '...keeeeeek.......',
    '....kekkek........',
    '...kek..kek.......',
    '..kek....kek......',
    '..krk....krk......',
    '.krrk....krrk.....',
    '.kkkk....kkkk.....',
    '..................',
  ],
  barrelman_run_1: [
    '..................',
    '.......kkkk.......',
    '......keeeek......',
    '.....keeeeek......',
    '.....keesssk......',
    '.....kesswsk......',
    '......ksssk.......',
    '........kbbkkk....',
    '......kbbbbbbk....',
    '.....kbbbybbbk....',
    '.....kbbbbbbbk....',
    '......kbbbbbk.....',
    '....kkeeeekk......',
    '...keeeeeeeek.....',
    '...keeekkkeek.....',
    '...keeeeeeeek.....',
    '.....keeeeek......',
    '......kekkek......',
    '.....kek..kek.....',
    '....kek....kek....',
    '....krk....krk....',
    '...krrk....krrk...',
    '...kkkk....kkkk...',
    '..................',
  ],
  barrelman_tucked_0: [
    '..................',
    '..................',
    '..................',
    '.....kkkkkkkk.....',
    '...kkeeeeeeeekk...',
    '..keeeeeeeeeeeek..',
    '.keeeekkkkkeeeek..',
    '.keeeksssskeeeek..',
    '.keeekssswkeeeek..',
    '.keeeeksskeeeeek..',
    '.keeeeeeeeeeeeek..',
    '.keeeeeeeeeeeeek..',
    '.keeeekkkkkeeeek..',
    '..keeeeeeeeeeeek..',
    '...kkeeeeeeeekk...',
    '.....kkkkkkkk.....',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
    '..................',
  ],
  barrelman_plant_0: [
    '..................',
    '......l..l........',
    '.....ll..ll.......',
    '......llll........',
    '.......ll.........',
    '.......ll.........',
    '.....kkkkkk.......',
    '....kggggggk......',
    '...kggglggggk.....',
    '...kgggglgggk.....',
    '....kggggggk......',
    '.....kggggk.......',
    '....kkeeeekk......',
    '...keeeeeeeek.....',
    '...keeekkkeek.....',
    '...keeeeeeeek.....',
    '....keeeeeek......',
    '.....keeeek.......',
    '......keek........',
    '......keek........',
    '......keek........',
    '.....keeeek.......',
    '.....kkkkkk.......',
    '..................',
  ],
  meditator_meditate_0: [
    '....................',
    '.........kk.........',
    '.......kkeekk.......',
    '......keeeeek.......',
    '......keessk........',
    '.......kssk.........',
    '........kk..........',
    '......kkppkk........',
    '.....kppppppk.......',
    '....kpppyppppk......',
    '....kppppppppk......',
    '.....kppkkppk.......',
    '....kkkkaakkkk......',
    '..kkaaaaaaaakk......',
    '.kaaaakkaaaak.......',
    'kaaaak..kaaaak......',
    'kaak......kaak......',
    '.kk........kk.......',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
  meditator_point_0: [
    '....................',
    '.........kk.........',
    '.......kkeekk.......',
    '......keeeeek.......',
    '......keessk........',
    '.......kssk.........',
    '........kk..........',
    '......kkppkkkk......',
    '.....kpppppppkkk....',
    '....kpppyppppkkk....',
    '....kppppppppk......',
    '.....kppkkppk.......',
    '....kkkkaakkkk......',
    '..kkaaaaaaaakk......',
    '.kaaaakkaaaak.......',
    'kaaaak..kaaaak......',
    'kaak......kaak......',
    '.kk........kk.......',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
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
