import { ObjectPool } from '../../engine/ObjectPool';
import { CANVAS_H } from '../../engine/types';
import { PowerUpType } from './Player';

export interface PowerUpItem {
  x: number;
  y: number;
  type: PowerUpType;
  vy: number;
  size: number;
  bobPhase: number;
}

const POWER_UP_COLORS: Record<PowerUpType, string> = {
  rapid: '#ffcc00',
  shield: '#00ff88',
  spread: '#ff66ff',
};

const POWER_UP_LABELS: Record<PowerUpType, string> = {
  rapid: 'R',
  shield: 'S',
  spread: 'W',
};

const TYPES: PowerUpType[] = ['rapid', 'shield', 'spread'];

function createPowerUp(): PowerUpItem {
  return { x: 0, y: 0, type: 'rapid', vy: 0, size: 14, bobPhase: 0 };
}

export class PowerUpManager {
  pool: ObjectPool<PowerUpItem>;

  constructor() {
    this.pool = new ObjectPool<PowerUpItem>(10, createPowerUp);
  }

  spawn(x: number, y: number): void {
    // 25% chance to spawn a power-up
    if (Math.random() > 0.25) return;

    const item = this.pool.acquire();
    if (!item) return;

    item.x = x;
    item.y = y;
    item.type = TYPES[Math.floor(Math.random() * TYPES.length)];
    item.vy = 80;
    item.size = 14;
    item.bobPhase = Math.random() * Math.PI * 2;
  }

  update(dt: number): void {
    this.pool.forEachActive((p) => {
      p.y += p.vy * dt;
      p.bobPhase += dt * 4;
    });
    this.pool.releaseIf((p) => p.y > CANVAS_H + 20);
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.pool.forEachActive((p) => {
      const bob = Math.sin(p.bobPhase) * 3;
      const color = POWER_UP_COLORS[p.type];

      ctx.save();
      ctx.translate(p.x, p.y + bob);

      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      // Diamond shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size, 0);
      ctx.closePath();
      ctx.fill();

      // Label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(POWER_UP_LABELS[p.type], 0, 0);

      ctx.restore();
    });
  }

  reset(): void {
    this.pool.releaseAll();
  }
}
