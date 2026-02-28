import { randomRange } from './math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];

  constructor(maxParticles = 500) {
    for (let i = 0; i < maxParticles; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, size: 0,
        color: '#fff', active: false,
      });
    }
  }

  emit(
    x: number,
    y: number,
    count: number,
    color: string,
    speed = 100,
    lifetime = 0.5,
    size = 3
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool.find(p => !p.active);
      if (!p) break;
      const angle = randomRange(0, Math.PI * 2);
      const spd = randomRange(speed * 0.3, speed);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * spd;
      p.vy = Math.sin(angle) * spd;
      p.life = lifetime;
      p.maxLife = lifetime;
      p.size = randomRange(size * 0.5, size);
      p.color = color;
      p.active = true;
      this.particles.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.particles) {
      p.active = false;
    }
    this.particles.length = 0;
  }
}
