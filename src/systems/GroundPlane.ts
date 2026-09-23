import Phaser from 'phaser';

export type GroundPoint = {
  gx: number;
  gy: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type GroundBounds = {
  minGx: number;
  maxGx: number;
  minGy: number;
  maxGy: number;
};

export type GroundPlaneConfig = {
  tileW: number;
  tileH: number;
  originX: number;
  originY: number;
  skewPx: number;
};

export class GroundPlane {
  constructor(readonly config: GroundPlaneConfig) {}

  groundToScreen(gx: number, gy: number): ScreenPoint {
    return {
      x: this.config.originX + gx * this.config.tileW + gy * this.config.skewPx,
      y: this.config.originY + gy * this.config.tileH,
    };
  }

  screenToGround(x: number, y: number): GroundPoint {
    const gy = (y - this.config.originY) / this.config.tileH;
    return {
      gx: (x - this.config.originX - gy * this.config.skewPx) / this.config.tileW,
      gy,
    };
  }

  groundDeltaToScreenDelta(dx: number, dy: number): ScreenPoint {
    const start = this.groundToScreen(0, 0);
    const end = this.groundToScreen(dx, dy);
    return { x: end.x - start.x, y: end.y - start.y };
  }

  tileCorners(col: number, row: number): Phaser.Geom.Point[] {
    const topLeft = this.groundToScreen(col, row);
    const topRight = this.groundToScreen(col + 1, row);
    const bottomRight = this.groundToScreen(col + 1, row + 1);
    const bottomLeft = this.groundToScreen(col, row + 1);
    return [
      new Phaser.Geom.Point(topLeft.x, topLeft.y),
      new Phaser.Geom.Point(topRight.x, topRight.y),
      new Phaser.Geom.Point(bottomRight.x, bottomRight.y),
      new Phaser.Geom.Point(bottomLeft.x, bottomLeft.y),
    ];
  }

  clamp(point: GroundPoint, bounds: GroundBounds): GroundPoint {
    return {
      gx: Phaser.Math.Clamp(point.gx, bounds.minGx, bounds.maxGx),
      gy: Phaser.Math.Clamp(point.gy, bounds.minGy, bounds.maxGy),
    };
  }

  setSpriteFeet(
    sprite: Phaser.GameObjects.Components.Transform &
      Phaser.GameObjects.Components.Depth &
      Phaser.GameObjects.Components.Origin,
    point: GroundPoint,
    offsetY = 7,
    depthOffset = 20,
  ): void {
    const screen = this.groundToScreen(point.gx, point.gy);
    sprite.setPosition(Math.round(screen.x), Math.round(screen.y + offsetY));
    sprite.setDepth(Math.round(screen.y + depthOffset));
  }
}

export function pushOutOfCircle(
  point: GroundPoint,
  centre: GroundPoint,
  radius: number,
): GroundPoint {
  const dx = point.gx - centre.gx;
  const dy = point.gy - centre.gy;
  const distance = Math.hypot(dx, dy);
  if (distance >= radius) {
    return point;
  }
  if (distance <= 0.0001) {
    return { gx: centre.gx + radius, gy: centre.gy };
  }
  const scale = radius / distance;
  return {
    gx: centre.gx + dx * scale,
    gy: centre.gy + dy * scale,
  };
}
