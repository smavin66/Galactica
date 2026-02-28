import { CANVAS_W } from '../../engine/types';
import { randomRange } from '../../engine/math';
import { BulletManager } from './Bullets';

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
}

const COLS = 8;
const ROWS = 5;
const ALIEN_W = 34;
const ALIEN_H = 28;
const SPACING_X = 50;
const SPACING_Y = 42;
const FORMATION_TOP = 60;

// 5 distinct types, one per row
const ALIEN_POINTS = [50, 40, 30, 20, 10];

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
          animPhase: (row * COLS + col) * 0.7,
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

    const t = alien.animPhase;
    const flash = alien.hitFlash > 0;

    if (flash) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 12;
    }

    switch (alien.type) {
      case 0: this.renderCommander(ctx, t, flash); break;
      case 1: this.renderWarrior(ctx, t, flash); break;
      case 2: this.renderSentinel(ctx, t, flash); break;
      case 3: this.renderDrone(ctx, t, flash); break;
      case 4: this.renderScout(ctx, t, flash); break;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // Row 0 — Commander: Insectoid overlord with crown, mandibles, multi-eyes, energy aura
  private renderCommander(ctx: CanvasRenderingContext2D, t: number, flash: boolean): void {
    const pulse = Math.sin(t * 1.5) * 0.15 + 1;

    // Energy aura
    if (!flash) {
      ctx.globalAlpha = 0.15 + Math.sin(t * 2) * 0.08;
      const auraGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 22 * pulse);
      auraGrad.addColorStop(0, '#ff2244');
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Main body — segmented thorax
    const bodyColor = flash ? '#ffffff' : '#cc1133';
    const bodyLight = flash ? '#ffffff' : '#ff3355';
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 2, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = bodyLight;
    ctx.beginPath();
    ctx.ellipse(0, -8, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crown spikes
    const crownColor = flash ? '#ffffff' : '#ff6688';
    ctx.fillStyle = crownColor;
    for (let i = -2; i <= 2; i++) {
      const sx = i * 4;
      const sway = Math.sin(t * 2 + i * 0.8) * 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 1.5, -13);
      ctx.lineTo(sx + sway, -19 - Math.abs(i) * -1.5);
      ctx.lineTo(sx + 1.5, -13);
      ctx.closePath();
      ctx.fill();
    }

    // Mandibles
    const mandibleAngle = Math.sin(t * 2) * 0.2;
    ctx.strokeStyle = flash ? '#ffffff' : '#aa0022';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -3);
    ctx.quadraticCurveTo(-10, 2 + mandibleAngle * 10, -7, 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -3);
    ctx.quadraticCurveTo(10, 2 + mandibleAngle * 10, 7, 7);
    ctx.stroke();

    // Multi-eyes (3 pairs)
    if (!flash) {
      const eyeGlow = ctx.createRadialGradient(0, -8, 0, 0, -8, 8);
      eyeGlow.addColorStop(0, '#ffcc00');
      eyeGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGlow;
      ctx.beginPath();
      ctx.arc(0, -8, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const eyeColor = flash ? '#ffffff' : '#ffee00';
    ctx.fillStyle = eyeColor;
    // Center eye
    ctx.beginPath();
    ctx.arc(0, -9, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Side eyes
    ctx.beginPath();
    ctx.arc(-5, -7, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -7, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = flash ? '#cccccc' : '#880000';
    ctx.beginPath();
    ctx.arc(0, -9, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-5, -7, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -7, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Body segments
    ctx.strokeStyle = flash ? '#dddddd' : '#880022';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.lineTo(8, 4);
    ctx.stroke();
  }

  // Row 1 — Warrior: Armored wings, angular body, visor eye, claw arms
  private renderWarrior(ctx: CanvasRenderingContext2D, t: number, flash: boolean): void {
    const wingFlap = Math.sin(t * 4) * 0.3;

    // Wings
    const wingColor = flash ? '#ffffff' : '#cc8800';
    const wingTip = flash ? '#ffffff' : '#ffaa00';
    ctx.fillStyle = wingColor;

    // Left wing
    ctx.save();
    ctx.rotate(-0.3 + wingFlap);
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(-20, -8);
    ctx.lineTo(-18, 0);
    ctx.lineTo(-14, 4);
    ctx.lineTo(-5, 3);
    ctx.closePath();
    ctx.fill();
    // Wing membrane lines
    ctx.strokeStyle = wingTip;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-5, -1);
    ctx.lineTo(-18, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(-16, 2);
    ctx.stroke();
    ctx.restore();

    // Right wing
    ctx.save();
    ctx.rotate(0.3 - wingFlap);
    ctx.fillStyle = wingColor;
    ctx.beginPath();
    ctx.moveTo(5, -2);
    ctx.lineTo(20, -8);
    ctx.lineTo(18, 0);
    ctx.lineTo(14, 4);
    ctx.lineTo(5, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = wingTip;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(5, -1);
    ctx.lineTo(18, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, 1);
    ctx.lineTo(16, 2);
    ctx.stroke();
    ctx.restore();

    // Armored body
    const armorColor = flash ? '#ffffff' : '#dd8800';
    const armorDark = flash ? '#dddddd' : '#995500';
    ctx.fillStyle = armorColor;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, -4);
    ctx.lineTo(10, 4);
    ctx.lineTo(6, 10);
    ctx.lineTo(-6, 10);
    ctx.lineTo(-10, 4);
    ctx.lineTo(-8, -4);
    ctx.closePath();
    ctx.fill();

    // Armor plate lines
    ctx.strokeStyle = armorDark;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.lineTo(7, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, 3);
    ctx.lineTo(9, 3);
    ctx.stroke();

    // Visor eye (horizontal slit)
    if (!flash) {
      ctx.shadowColor = '#ff4400';
      ctx.shadowBlur = 6;
    }
    ctx.fillStyle = flash ? '#ffffff' : '#ff4400';
    ctx.beginPath();
    ctx.ellipse(0, -6, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Visor pupil that tracks
    const pupilShift = Math.sin(t * 0.7) * 2;
    ctx.fillStyle = flash ? '#cccccc' : '#ffcc00';
    ctx.beginPath();
    ctx.ellipse(pupilShift, -6, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Claw arms
    const clawAngle = Math.sin(t * 2) * 0.15;
    ctx.strokeStyle = flash ? '#ffffff' : '#aa6600';
    ctx.lineWidth = 2;
    // Left claw
    ctx.save();
    ctx.translate(-9, 5);
    ctx.rotate(-0.4 + clawAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-4, 6);
    ctx.moveTo(-2, 4);
    ctx.lineTo(-6, 5);
    ctx.stroke();
    ctx.restore();
    // Right claw
    ctx.save();
    ctx.translate(9, 5);
    ctx.rotate(0.4 - clawAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(4, 6);
    ctx.moveTo(2, 4);
    ctx.lineTo(6, 5);
    ctx.stroke();
    ctx.restore();
  }

  // Row 2 — Sentinel: Geometric crystalline body, orbiting shield fragments, beam eye
  private renderSentinel(ctx: CanvasRenderingContext2D, t: number, flash: boolean): void {
    // Orbiting shield fragments
    if (!flash) {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const angle = t * 1.2 + (i * Math.PI) / 2;
        const ox = Math.cos(angle) * 18;
        const oy = Math.sin(angle) * 14;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(angle + t);
        ctx.fillStyle = '#22aa55';
        ctx.fillRect(-3, -1.5, 6, 3);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // Main crystalline body (hexagonal)
    const baseColor = flash ? '#ffffff' : '#22cc66';
    const lightColor = flash ? '#ffffff' : '#44ff88';
    const darkColor = flash ? '#dddddd' : '#118844';

    ctx.fillStyle = baseColor;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const r = 12;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Inner facets
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(10, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(-10, 5);
    ctx.stroke();

    // Core glow
    if (!flash) {
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 8);
      coreGrad.addColorStop(0, '#aaffcc');
      coreGrad.addColorStop(0.5, '#44ff8844');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central eye — beam style
    const beamPulse = Math.sin(t * 3) * 0.3 + 0.7;
    if (!flash) {
      ctx.shadowColor = '#88ffaa';
      ctx.shadowBlur = 8 * beamPulse;
    }
    ctx.fillStyle = flash ? '#ffffff' : '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Iris ring
    ctx.strokeStyle = flash ? '#cccccc' : lightColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Scanning beam (downward)
    if (!flash) {
      ctx.globalAlpha = 0.15 * beamPulse;
      ctx.fillStyle = '#44ff88';
      ctx.beginPath();
      ctx.moveTo(-2, 5);
      ctx.lineTo(2, 5);
      ctx.lineTo(6, 18);
      ctx.lineTo(-6, 18);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  // Row 3 — Drone: Jellyfish bio-organic, pulsing dome, trailing tentacles, bioluminescence
  private renderDrone(ctx: CanvasRenderingContext2D, t: number, flash: boolean): void {
    const pulse = Math.sin(t * 2) * 0.1 + 1;

    // Bioluminescent glow
    if (!flash) {
      ctx.globalAlpha = 0.12 + Math.sin(t * 1.5) * 0.06;
      const bioGlow = ctx.createRadialGradient(0, -2, 2, 0, -2, 16);
      bioGlow.addColorStop(0, '#00ccff');
      bioGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = bioGlow;
      ctx.beginPath();
      ctx.arc(0, -2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Tentacles (4 pairs)
    ctx.strokeStyle = flash ? '#ffffff' : '#0088aa';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const xBase = -7 + i * 4.5;
      const wave = Math.sin(t * 3 + i * 1.2) * 3;
      const wave2 = Math.sin(t * 2.5 + i * 0.9) * 2;
      ctx.beginPath();
      ctx.moveTo(xBase, 6);
      ctx.quadraticCurveTo(xBase + wave, 12, xBase + wave2, 18);
      ctx.stroke();

      // Tentacle tips glow
      if (!flash) {
        ctx.fillStyle = '#00eeff';
        ctx.globalAlpha = 0.4 + Math.sin(t * 4 + i) * 0.3;
        ctx.beginPath();
        ctx.arc(xBase + wave2, 18, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Dome body
    const domeColor = flash ? '#ffffff' : '#0099cc';
    const domeLight = flash ? '#ffffff' : '#00bbee';
    ctx.fillStyle = domeColor;
    ctx.beginPath();
    ctx.ellipse(0, -2, 11 * pulse, 9 * pulse, 0, Math.PI, 0);
    ctx.lineTo(11 * pulse, 5);
    ctx.quadraticCurveTo(0, 8, -11 * pulse, 5);
    ctx.closePath();
    ctx.fill();

    // Dome sheen
    if (!flash) {
      ctx.globalAlpha = 0.3;
      const sheen = ctx.createLinearGradient(-8, -10, 8, 0);
      sheen.addColorStop(0, '#88eeff');
      sheen.addColorStop(0.5, 'transparent');
      sheen.addColorStop(1, '#88eeff22');
      ctx.fillStyle = sheen;
      ctx.beginPath();
      ctx.ellipse(0, -3, 8 * pulse, 6 * pulse, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Inner organs (visible through translucent dome)
    if (!flash) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#44ddff';
      const organPulse = Math.sin(t * 2.5);
      ctx.beginPath();
      ctx.ellipse(-3, -3, 2 + organPulse * 0.5, 2.5, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(3, -2, 1.8, 2 + organPulse * 0.4, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Eyes — two large round eyes
    ctx.fillStyle = flash ? '#ffffff' : domeLight;
    if (!flash) {
      ctx.shadowColor = '#00eeff';
      ctx.shadowBlur = 4;
    }
    ctx.beginPath();
    ctx.arc(-4, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Pupils
    ctx.fillStyle = flash ? '#cccccc' : '#003344';
    ctx.beginPath();
    ctx.arc(-4, -4, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Rim detail
    ctx.strokeStyle = flash ? '#dddddd' : '#006688';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-10 * pulse, 5);
    ctx.quadraticCurveTo(0, 7, 10 * pulse, 5);
    ctx.stroke();
  }

  // Row 4 — Scout: Sleek dart shape, engine trails, rotating scanner, speed lines
  private renderScout(ctx: CanvasRenderingContext2D, t: number, flash: boolean): void {
    // Engine trails
    if (!flash) {
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 3; i++) {
        const trailAlpha = 0.3 - i * 0.1;
        ctx.globalAlpha = trailAlpha;
        ctx.fillStyle = '#aa44ff';
        ctx.beginPath();
        ctx.ellipse(
          -3 + i * 3,
          10 + i * 3 + Math.sin(t * 8 + i) * 2,
          1.5 - i * 0.3,
          3 + Math.random() * 2,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(
          3 - i * 3,
          10 + i * 3 + Math.sin(t * 8 + i + 1) * 2,
          1.5 - i * 0.3,
          3 + Math.random() * 2,
          0, 0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Main body — sleek dart
    const bodyColor = flash ? '#ffffff' : '#8833cc';
    const lightColor = flash ? '#ffffff' : '#aa55ee';
    const darkColor = flash ? '#dddddd' : '#5522aa';

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(6, -4);
    ctx.lineTo(8, 4);
    ctx.lineTo(4, 10);
    ctx.lineTo(-4, 10);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();

    // Side fins
    ctx.fillStyle = lightColor;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(-14, 2);
    ctx.lineTo(-12, 6);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, -2);
    ctx.lineTo(14, 2);
    ctx.lineTo(12, 6);
    ctx.lineTo(7, 4);
    ctx.closePath();
    ctx.fill();

    // Center stripe
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(2, -4);
    ctx.lineTo(2, 8);
    ctx.lineTo(-2, 8);
    ctx.lineTo(-2, -4);
    ctx.closePath();
    ctx.fill();

    // Rotating scanner dish
    const scanAngle = t * 4;
    if (!flash) {
      ctx.strokeStyle = '#cc88ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, -2, 4, scanAngle, scanAngle + Math.PI * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -2, 4, scanAngle + Math.PI, scanAngle + Math.PI * 1.6);
      ctx.stroke();
    }

    // Eye — single cyclopean
    if (!flash) {
      ctx.shadowColor = '#cc66ff';
      ctx.shadowBlur = 6;
    }
    ctx.fillStyle = flash ? '#ffffff' : '#ff66ff';
    ctx.beginPath();
    ctx.arc(0, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner eye
    ctx.fillStyle = flash ? '#cccccc' : '#ffaaff';
    ctx.beginPath();
    ctx.arc(0, -4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#aaaaaa' : '#330033';
    ctx.beginPath();
    ctx.arc(0, -4, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Speed accent lines on fins
    ctx.strokeStyle = flash ? '#ffffff' : '#aa44ee';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-12, 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(12, 4);
    ctx.stroke();
  }
}
