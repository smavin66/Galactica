import { CANVAS_W } from '../../engine/types';
import { randomRange } from '../../engine/math';

export class MysteryShip {
  x = 0;
  y = 32;
  width = 40;
  height = 18;
  active = false;
  direction = 1; // 1 = left-to-right, -1 = right-to-left
  speed = 0;
  points = 0;
  spawnTimer = 0;
  private animPhase = 0;

  constructor() {
    this.resetTimer();
  }

  reset(): void {
    this.active = false;
    this.resetTimer();
  }

  private resetTimer(): void {
    this.spawnTimer = randomRange(18, 30);
  }

  private spawn(): void {
    this.active = true;
    this.direction = Math.random() < 0.5 ? 1 : -1;
    this.x = this.direction === 1 ? -this.width : CANVAS_W + this.width;
    this.speed = randomRange(120, 180);
    this.points = [200, 300, 500][Math.floor(Math.random() * 3)];
    this.animPhase = 0;
  }

  update(dt: number): void {
    if (!this.active) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawn();
      }
      return;
    }

    this.x += this.speed * this.direction * dt;
    this.animPhase += dt;

    // Off-screen check
    if (this.direction === 1 && this.x > CANVAS_W + this.width) {
      this.active = false;
      this.resetTimer();
    } else if (this.direction === -1 && this.x < -this.width) {
      this.active = false;
      this.resetTimer();
    }
  }

  hit(): number {
    this.active = false;
    this.resetTimer();
    return this.points;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const t = this.animPhase;
    const bob = Math.sin(t * 4) * 2;

    ctx.save();
    ctx.translate(this.x, this.y + bob);

    // Tractor beam glow underneath
    ctx.globalAlpha = 0.08 + Math.sin(t * 6) * 0.04;
    const beamGrad = ctx.createLinearGradient(0, 8, 0, 30);
    beamGrad.addColorStop(0, '#ffcc00');
    beamGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(8, 8);
    ctx.lineTo(14, 28);
    ctx.lineTo(-14, 28);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Main saucer body — bottom dome
    const bodyGrad = ctx.createLinearGradient(0, -4, 0, 8);
    bodyGrad.addColorStop(0, '#ccccdd');
    bodyGrad.addColorStop(0.5, '#8888aa');
    bodyGrad.addColorStop(1, '#555577');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 7, 0, 0, Math.PI);
    ctx.fill();

    // Saucer disk — main plate
    const diskGrad = ctx.createLinearGradient(-20, 0, 20, 0);
    diskGrad.addColorStop(0, '#aaaacc');
    diskGrad.addColorStop(0.3, '#ddddee');
    diskGrad.addColorStop(0.7, '#ddddee');
    diskGrad.addColorStop(1, '#8888aa');
    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 5, 0, Math.PI, 0);
    ctx.ellipse(0, 0, 20, 3, 0, 0, Math.PI);
    ctx.fill();

    // Running lights around rim
    ctx.shadowBlur = 4;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + t * 3;
      const lx = Math.cos(angle) * 16;
      const ly = Math.sin(angle) * 3;
      if (ly > -1) continue; // only show top-facing lights
      const lightColor = i % 2 === 0 ? '#ff4444' : '#44ff44';
      ctx.shadowColor = lightColor;
      ctx.fillStyle = lightColor;
      ctx.beginPath();
      ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Top dome — cockpit
    const domeGrad = ctx.createRadialGradient(0, -4, 1, 0, -4, 8);
    domeGrad.addColorStop(0, '#aaeeff');
    domeGrad.addColorStop(0.6, '#4488aa88');
    domeGrad.addColorStop(1, '#22556688');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.ellipse(0, -3, 8, 6, 0, Math.PI, 0);
    ctx.fill();

    // Dome highlight
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-2, -6, 3, 2, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Points indicator (flashing text above)
    ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.3;
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffcc00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${this.points}`, 0, -12);
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}
