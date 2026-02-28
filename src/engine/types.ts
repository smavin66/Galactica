export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface Game {
  init(ctx: CanvasRenderingContext2D): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D): void;
  cleanup(): void;
}

export const CANVAS_W = 800;
export const CANVAS_H = 600;
