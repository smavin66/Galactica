import { CANVAS_W } from '../../engine/types';
import { randomRange } from '../../engine/math';
import { BulletManager } from './Bullets';

export interface Alien {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  type: number; // 0-2 row type for color/points
  gridCol: number;
  gridRow: number;
  diving: boolean;
  diveX: number;
  diveY: number;
  diveAngle: number;
  diveSpeed: number;
  divePhase: number; // 0=diving down, 1=swooping back
  homeX: number;
  homeY: number;
  hitFlash: number;
}

const COLS = 8;
const ROWS = 5;
const ALIEN_W = 28;
const ALIEN_H = 22;
const SPACING_X = 44;
const SPACING_Y = 36;
const FORMATION_TOP = 60;

const ALIEN_COLORS = ['#ff4466', '#ffaa22', '#44ff88'];
const ALIEN_POINTS = [30, 20, 10];

export class AlienFormation {
  aliens: Alien[] = [];
  swayOffset = 0;
  swaySpeed = 40;
  swayDir = 1;
  shootTimer = 0;
  shootInterval = 1.5;
  diveTimer = 0;
  diveInterval = 3;

  private formationLeft = 0;
  private formationRight = 0;

  init(): void {
    this.aliens = [];
    this.swayOffset = 0;
    this.swayDir = 1;
    this.shootTimer = 0;
    this.diveTimer = 1.5;

    const startX = (CANVAS_W - (COLS - 1) * SPACING_X) / 2;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const homeX = startX + col * SPACING_X;
        const homeY = FORMATION_TOP + row * SPACING_Y;
        this.aliens.push({
          x: homeX,
          y: homeY,
          width: ALIEN_W,
          height: ALIEN_H,
          alive: true,
          type: Math.min(row, 2),
          gridCol: col,
          gridRow: row,
          diving: false,
          diveX: 0,
          diveY: 0,
          diveAngle: 0,
          diveSpeed: 0,
          divePhase: 0,
          homeX,
          homeY,
          hitFlash: 0,
        });
      }
    }
  }

  get aliveCount(): number {
    return this.aliens.filter(a => a.alive).length;
  }

  getPointsForAlien(alien: Alien): number {
    return ALIEN_POINTS[alien.type] ?? 10;
  }

  update(dt: number, bullets: BulletManager, playerX: number): void {
    // Sway the formation
    this.swayOffset += this.swaySpeed * this.swayDir * dt;

    // Compute formation bounds for boundary checking
    this.computeFormationBounds();
    const leftEdge = this.formationLeft + this.swayOffset;
    const rightEdge = this.formationRight + this.swayOffset;

    if (rightEdge > CANVAS_W - 20) {
      this.swayDir = -1;
    } else if (leftEdge < 20) {
      this.swayDir = 1;
    }

    // Update alien positions
    for (const alien of this.aliens) {
      if (!alien.alive) continue;

      if (alien.diving) {
        this.updateDivingAlien(alien, dt);
      } else {
        alien.x = alien.homeX + this.swayOffset;
      }

      if (alien.hitFlash > 0) {
        alien.hitFlash -= dt;
      }
    }

    // Alien shooting
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = this.shootInterval;
      this.alienShoot(bullets, playerX);
    }

    // Dive-bombing
    this.diveTimer -= dt;
    if (this.diveTimer <= 0) {
      this.diveTimer = this.diveInterval;
      this.startDive(playerX);
    }
  }

  private computeFormationBounds(): void {
    let minX = CANVAS_W;
    let maxX = 0;
    for (const alien of this.aliens) {
      if (alien.alive && !alien.diving) {
        minX = Math.min(minX, alien.homeX - alien.width / 2);
        maxX = Math.max(maxX, alien.homeX + alien.width / 2);
      }
    }
    this.formationLeft = minX;
    this.formationRight = maxX;
  }

  private updateDivingAlien(alien: Alien, dt: number): void {
    if (alien.divePhase === 0) {
      // Diving down with a sine-wave weave
      alien.diveAngle += dt * 3;
      alien.diveX += Math.sin(alien.diveAngle) * 120 * dt;
      alien.diveY += alien.diveSpeed * dt;
      alien.x = alien.diveX;
      alien.y = alien.diveY;

      // Once past the bottom, start swooping back
      if (alien.y > 620) {
        alien.divePhase = 1;
        alien.diveX = alien.x;
        alien.diveY = -30;
        alien.y = -30;
      }
    } else {
      // Return to formation
      const dx = alien.homeX + this.swayOffset - alien.x;
      const dy = alien.homeY - alien.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        alien.diving = false;
        alien.x = alien.homeX + this.swayOffset;
        alien.y = alien.homeY;
      } else {
        const speed = 200;
        alien.x += (dx / dist) * speed * dt;
        alien.y += (dy / dist) * speed * dt;
      }
    }
  }

  private alienShoot(bullets: BulletManager, playerX: number): void {
    // Pick a random alive alien from the bottom rows
    const bottomAliens = this.getBottomRowAliens();
    if (bottomAliens.length === 0) return;

    const shooter = bottomAliens[Math.floor(Math.random() * bottomAliens.length)];
    const dx = playerX - shooter.x;
    const dy = 500 - shooter.y; // aim below
    const len = Math.sqrt(dx * dx + dy * dy);
    const speed = 200;
    bullets.spawnAlienBullet(
      shooter.x,
      shooter.y + shooter.height / 2,
      (dx / len) * speed,
      (dy / len) * speed
    );
  }

  private getBottomRowAliens(): Alien[] {
    const bottomByCol: Map<number, Alien> = new Map();
    for (const alien of this.aliens) {
      if (!alien.alive || alien.diving) continue;
      const existing = bottomByCol.get(alien.gridCol);
      if (!existing || alien.gridRow > existing.gridRow) {
        bottomByCol.set(alien.gridCol, alien);
      }
    }
    return Array.from(bottomByCol.values());
  }

  private startDive(playerX: number): void {
    // Pick a random alive alien that isn't already diving
    const candidates = this.aliens.filter(a => a.alive && !a.diving);
    if (candidates.length === 0) return;

    const alien = candidates[Math.floor(Math.random() * candidates.length)];
    alien.diving = true;
    alien.divePhase = 0;
    alien.diveX = alien.x;
    alien.diveY = alien.y;
    alien.diveAngle = 0;
    alien.diveSpeed = randomRange(180, 280);

    // Bias dive toward player
    const bias = (playerX - alien.x) * 0.01;
    alien.diveAngle = bias;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const alien of this.aliens) {
      if (!alien.alive) continue;
      this.renderAlien(ctx, alien);
    }
  }

  private renderAlien(ctx: CanvasRenderingContext2D, alien: Alien): void {
    ctx.save();
    ctx.translate(alien.x, alien.y);

    const color = alien.hitFlash > 0 ? '#ffffff' : ALIEN_COLORS[alien.type];

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    if (alien.type === 0) {
      // Top row: diamond shape
      ctx.moveTo(0, -alien.height / 2);
      ctx.lineTo(alien.width / 2, 0);
      ctx.lineTo(0, alien.height / 2);
      ctx.lineTo(-alien.width / 2, 0);
    } else if (alien.type === 1) {
      // Middle rows: octagon-ish
      const w2 = alien.width / 2;
      const h2 = alien.height / 2;
      ctx.moveTo(-w2 * 0.5, -h2);
      ctx.lineTo(w2 * 0.5, -h2);
      ctx.lineTo(w2, -h2 * 0.3);
      ctx.lineTo(w2, h2 * 0.3);
      ctx.lineTo(w2 * 0.5, h2);
      ctx.lineTo(-w2 * 0.5, h2);
      ctx.lineTo(-w2, h2 * 0.3);
      ctx.lineTo(-w2, -h2 * 0.3);
    } else {
      // Bottom rows: round
      ctx.arc(0, 0, alien.width / 2.5, 0, Math.PI * 2);
    }
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(-5, -3, 3, 3);
    ctx.fillRect(2, -3, 3, 3);

    ctx.restore();
  }
}
