import { CANVAS_W } from '../../engine/types';
import { randomRange } from '../../engine/math';
import { BulletManager } from './Bullets';
import { AlienRenderer } from './AlienRenderer';
import {
  FORMATION_COLS, FORMATION_ROWS, ALIEN_WIDTH, ALIEN_HEIGHT,
  FORMATION_SPACING_X, FORMATION_SPACING_Y, FORMATION_TOP, ALIEN_POINTS,
  BASE_SWAY_SPEED, SWAY_SPEED_PER_WAVE, BASE_SHOOT_INTERVAL, SHOOT_INTERVAL_PER_WAVE,
  MIN_SHOOT_INTERVAL, BASE_DIVE_INTERVAL, DIVE_INTERVAL_PER_WAVE, MIN_DIVE_INTERVAL,
  GROUP_DIVE_CHANCE_PER_WAVE, MAX_GROUP_DIVE_CHANCE, COMMANDER_ARMOR_WAVE, WARRIOR_ARMOR_WAVE,
  ALIEN_BULLET_SPEED,
} from './constants';

export interface Alien {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  type: number; // 0-4 row type for visuals/points
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
  animPhase: number; // per-alien animation offset
  hp: number;
  maxHp: number;
}

export class AlienFormation {
  aliens: Alien[] = [];
  private swayOffset = 0;
  private swaySpeed = 40;
  private swayDir = 1;
  private shootTimer = 0;
  private shootInterval = 1.5;
  private diveTimer = 0;
  private diveInterval = 3;
  private groupDiveChance = 0;

  private formationLeft = 0;
  private formationRight = 0;

  init(wave = 1): void {
    this.aliens = [];
    this.swayOffset = 0;
    this.swayDir = 1;
    this.shootTimer = 0;
    this.diveTimer = 1.5;

    // Scale difficulty with wave
    this.swaySpeed = BASE_SWAY_SPEED + (wave - 1) * SWAY_SPEED_PER_WAVE;
    this.shootInterval = Math.max(MIN_SHOOT_INTERVAL, BASE_SHOOT_INTERVAL - (wave - 1) * SHOOT_INTERVAL_PER_WAVE);
    this.diveInterval = Math.max(MIN_DIVE_INTERVAL, BASE_DIVE_INTERVAL - (wave - 1) * DIVE_INTERVAL_PER_WAVE);
    this.groupDiveChance = Math.min(MAX_GROUP_DIVE_CHANCE, (wave - 1) * GROUP_DIVE_CHANCE_PER_WAVE);

    const startX = (CANVAS_W - (FORMATION_COLS - 1) * FORMATION_SPACING_X) / 2;

    for (let row = 0; row < FORMATION_ROWS; row++) {
      for (let col = 0; col < FORMATION_COLS; col++) {
        const homeX = startX + col * FORMATION_SPACING_X;
        const homeY = FORMATION_TOP + row * FORMATION_SPACING_Y;
        // Armored aliens: commanders from wave 3+, warriors from wave 6+
        let hp = 1;
        if (row === 0 && wave >= COMMANDER_ARMOR_WAVE) hp = 2;
        if (row === 1 && wave >= WARRIOR_ARMOR_WAVE) hp = 2;

        this.aliens.push({
          x: homeX,
          y: homeY,
          width: ALIEN_WIDTH,
          height: ALIEN_HEIGHT,
          alive: true,
          type: row,
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
          animPhase: (row * FORMATION_COLS + col) * 0.7,
          hp,
          maxHp: hp,
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

      alien.animPhase += dt * 3;

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
    const speed = ALIEN_BULLET_SPEED;
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
    const candidates = this.aliens.filter(a => a.alive && !a.diving);
    if (candidates.length === 0) return;

    // Decide if this is a group dive (up to 3 aliens)
    const isGroupDive = Math.random() < this.groupDiveChance;
    const diveCount = isGroupDive ? Math.min(3, candidates.length) : 1;

    // Pick the first diver randomly
    const first = candidates[Math.floor(Math.random() * candidates.length)];
    const divers = [first];

    // For group dives, pick neighbors (same row or adjacent)
    if (diveCount > 1) {
      const neighbors = candidates.filter(
        a => a !== first && Math.abs(a.gridRow - first.gridRow) <= 1 &&
             Math.abs(a.gridCol - first.gridCol) <= 1
      );
      for (let i = 0; i < diveCount - 1 && neighbors.length > 0; i++) {
        const idx = Math.floor(Math.random() * neighbors.length);
        divers.push(neighbors.splice(idx, 1)[0]);
      }
    }

    for (let i = 0; i < divers.length; i++) {
      const alien = divers[i];
      alien.diving = true;
      alien.divePhase = 0;
      alien.diveX = alien.x;
      alien.diveY = alien.y;
      alien.diveAngle = 0;
      alien.diveSpeed = randomRange(180, 280);

      // Bias dive toward player, stagger group slightly
      const bias = (playerX - alien.x) * 0.01;
      alien.diveAngle = bias + i * 0.5;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const alien of this.aliens) {
      if (!alien.alive) continue;
      AlienRenderer.renderAlien(ctx, alien);
    }
  }
}
