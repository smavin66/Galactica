import { ObjectPool } from '../../engine/ObjectPool';
import { CANVAS_H } from '../../engine/types';
import { PLAYER_BULLET_SPEED, BULLET_OFF_SCREEN_MARGIN } from './constants';

export interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
}

function createBullet(): Bullet {
  return { x: 0, y: 0, vx: 0, vy: 0, width: 3, height: 10, color: '#00ffcc' };
}

export class BulletManager {
  playerBullets: ObjectPool<Bullet>;
  alienBullets: ObjectPool<Bullet>;

  constructor() {
    this.playerBullets = new ObjectPool<Bullet>(50, createBullet);
    this.alienBullets = new ObjectPool<Bullet>(100, createBullet);
  }

  spawnPlayerBullet(x: number, y: number, vx = 0, vy = PLAYER_BULLET_SPEED): void {
    const b = this.playerBullets.acquire();
    if (b) {
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.width = 3;
      b.height = 10;
      b.color = '#00ffcc';
    }
  }

  spawnAlienBullet(x: number, y: number, vx: number, vy: number): void {
    const b = this.alienBullets.acquire();
    if (b) {
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.width = 4;
      b.height = 8;
      b.color = '#ff4444';
    }
  }

  update(dt: number): void {
    this.playerBullets.forEachActive((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    this.playerBullets.releaseIf((b) => b.y < -BULLET_OFF_SCREEN_MARGIN || b.y > CANVAS_H + BULLET_OFF_SCREEN_MARGIN);

    this.alienBullets.forEachActive((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    this.alienBullets.releaseIf((b) => b.y < -BULLET_OFF_SCREEN_MARGIN || b.y > CANVAS_H + BULLET_OFF_SCREEN_MARGIN);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.playerBullets.forEachActive((b) => {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    });

    this.alienBullets.forEachActive((b) => {
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.width, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }

  reset(): void {
    this.playerBullets.releaseAll();
    this.alienBullets.releaseAll();
  }
}
