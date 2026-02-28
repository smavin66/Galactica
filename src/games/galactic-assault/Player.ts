import { CANVAS_W, CANVAS_H } from '../../engine/types';
import { clamp } from '../../engine/math';
import { InputManager } from '../../engine/InputManager';

export type PowerUpType = 'rapid' | 'shield' | 'spread';

export class Player {
  x: number;
  y: number;
  width = 32;
  height = 24;
  speed = 300;
  lives = 3;
  shootCooldown = 0;
  shootRate = 0.3; // seconds between shots
  invulnTime = 0;
  powerUp: PowerUpType | null = null;
  powerUpTimer = 0;
  shieldHits = 0;

  constructor() {
    this.x = CANVAS_W / 2;
    this.y = CANVAS_H - 50;
  }

  reset(): void {
    this.x = CANVAS_W / 2;
    this.y = CANVAS_H - 50;
    this.lives = 3;
    this.shootCooldown = 0;
    this.shootRate = 0.3;
    this.invulnTime = 0;
    this.powerUp = null;
    this.powerUpTimer = 0;
    this.shieldHits = 0;
  }

  update(dt: number, input: InputManager): void {
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
      this.x -= this.speed * dt;
    }
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
      this.x += this.speed * dt;
    }
    this.x = clamp(this.x, this.width / 2, CANVAS_W - this.width / 2);

    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }

    if (this.invulnTime > 0) {
      this.invulnTime -= dt;
    }

    if (this.powerUpTimer > 0) {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        this.clearPowerUp();
      }
    }
  }

  canShoot(): boolean {
    return this.shootCooldown <= 0;
  }

  onShoot(): void {
    const rate = this.powerUp === 'rapid' ? this.shootRate * 0.4 : this.shootRate;
    this.shootCooldown = rate;
  }

  applyPowerUp(type: PowerUpType): void {
    this.powerUp = type;
    this.powerUpTimer = 10; // 10 seconds
    if (type === 'shield') {
      this.shieldHits = 3;
    }
  }

  clearPowerUp(): void {
    if (this.powerUp !== 'shield') {
      this.powerUp = null;
    }
    this.powerUpTimer = 0;
  }

  takeDamage(): boolean {
    if (this.invulnTime > 0) return false;
    if (this.powerUp === 'shield' && this.shieldHits > 0) {
      this.shieldHits--;
      if (this.shieldHits <= 0) {
        this.powerUp = null;
      }
      return false;
    }
    this.lives--;
    this.invulnTime = 2;
    return true;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.invulnTime > 0 && Math.floor(this.invulnTime * 10) % 2 === 0) {
      return; // blink when invulnerable
    }

    ctx.save();
    ctx.translate(this.x, this.y);

    // Ship body
    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(-this.width / 2, this.height / 2);
    ctx.lineTo(-this.width / 4, this.height / 3);
    ctx.lineTo(this.width / 4, this.height / 3);
    ctx.lineTo(this.width / 2, this.height / 2);
    ctx.closePath();
    ctx.fill();

    // Cockpit glow
    ctx.fillStyle = '#88eeff';
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 4);
    ctx.lineTo(-6, this.height / 6);
    ctx.lineTo(6, this.height / 6);
    ctx.closePath();
    ctx.fill();

    // Engine glow
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(-5, this.height / 3, 4, 4 + Math.random() * 4);
    ctx.fillRect(1, this.height / 3, 4, 4 + Math.random() * 4);

    // Shield visual
    if (this.powerUp === 'shield') {
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.4 + 0.2 * Math.sin(Date.now() / 200)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.width * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
