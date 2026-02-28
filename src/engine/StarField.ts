import { CANVAS_W, CANVAS_H } from './types';
import { randomRange } from './math';

interface Star {
  x: number;
  y: number;
  speed: number;
  brightness: number;
  size: number;
}

export class StarField {
  private layers: Star[][] = [];

  constructor(layerCount = 3, starsPerLayer = 40) {
    for (let l = 0; l < layerCount; l++) {
      const layer: Star[] = [];
      const depth = (l + 1) / layerCount;
      for (let i = 0; i < starsPerLayer; i++) {
        layer.push({
          x: randomRange(0, CANVAS_W),
          y: randomRange(0, CANVAS_H),
          speed: 20 + depth * 60,
          brightness: 0.3 + depth * 0.7,
          size: 0.5 + depth * 1.5,
        });
      }
      this.layers.push(layer);
    }
  }

  update(dt: number): void {
    for (const layer of this.layers) {
      for (const star of layer) {
        star.y += star.speed * dt;
        if (star.y > CANVAS_H) {
          star.y = -2;
          star.x = randomRange(0, CANVAS_W);
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const layer of this.layers) {
      for (const star of layer) {
        ctx.globalAlpha = star.brightness;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }
    ctx.globalAlpha = 1;
  }
}
