import { describe, it, expect, beforeEach } from 'vitest';
import { BulletManager } from './Bullets';
import { PLAYER_BULLET_SPEED, BULLET_OFF_SCREEN_MARGIN } from './constants';
import { CANVAS_H } from '../../engine/types';

describe('BulletManager', () => {
  let manager: BulletManager;

  beforeEach(() => {
    manager = new BulletManager();
  });

  // ── spawnPlayerBullet ─────────────────────────────────────────────

  it('creates a player bullet with correct position and default velocity', () => {
    manager.spawnPlayerBullet(100, 200);

    let found = false;
    manager.playerBullets.forEachActive((b) => {
      expect(b.x).toBe(100);
      expect(b.y).toBe(200);
      expect(b.vx).toBe(0);
      expect(b.vy).toBe(PLAYER_BULLET_SPEED);
      expect(b.width).toBe(3);
      expect(b.height).toBe(10);
      expect(b.color).toBe('#00ffcc');
      found = true;
    });
    expect(found).toBe(true);
    expect(manager.playerBullets.activeCount).toBe(1);
  });

  it('creates a player bullet with custom vx/vy for spread shot', () => {
    manager.spawnPlayerBullet(150, 300, -50, -400);

    let found = false;
    manager.playerBullets.forEachActive((b) => {
      expect(b.x).toBe(150);
      expect(b.y).toBe(300);
      expect(b.vx).toBe(-50);
      expect(b.vy).toBe(-400);
      found = true;
    });
    expect(found).toBe(true);
  });

  // ── spawnAlienBullet ──────────────────────────────────────────────

  it('creates an alien bullet with correct position and velocity', () => {
    manager.spawnAlienBullet(250, 80, 10, 200);

    let found = false;
    manager.alienBullets.forEachActive((b) => {
      expect(b.x).toBe(250);
      expect(b.y).toBe(80);
      expect(b.vx).toBe(10);
      expect(b.vy).toBe(200);
      expect(b.width).toBe(4);
      expect(b.height).toBe(8);
      expect(b.color).toBe('#ff4444');
      found = true;
    });
    expect(found).toBe(true);
    expect(manager.alienBullets.activeCount).toBe(1);
  });

  // ── playerBullets and alienBullets track separately ───────────────

  it('tracks player bullets and alien bullets in separate pools', () => {
    manager.spawnPlayerBullet(100, 200);
    manager.spawnPlayerBullet(110, 200);
    manager.spawnAlienBullet(300, 50, 0, 200);

    expect(manager.playerBullets.activeCount).toBe(2);
    expect(manager.alienBullets.activeCount).toBe(1);
  });

  // ── update() ──────────────────────────────────────────────────────

  it('moves bullets by velocity * dt on update', () => {
    manager.spawnPlayerBullet(100, 400);
    manager.spawnAlienBullet(200, 50, 20, 150);

    const dt = 0.016; // ~60 fps frame
    manager.update(dt);

    manager.playerBullets.forEachActive((b) => {
      expect(b.x).toBe(100 + 0 * dt);
      expect(b.y).toBeCloseTo(400 + PLAYER_BULLET_SPEED * dt);
    });

    manager.alienBullets.forEachActive((b) => {
      expect(b.x).toBeCloseTo(200 + 20 * dt);
      expect(b.y).toBeCloseTo(50 + 150 * dt);
    });
  });

  it('updates multiple bullets independently', () => {
    manager.spawnPlayerBullet(50, 300, -30, PLAYER_BULLET_SPEED);
    manager.spawnPlayerBullet(100, 300, 30, PLAYER_BULLET_SPEED);

    const dt = 0.02;
    manager.update(dt);

    const positions: { x: number; y: number }[] = [];
    manager.playerBullets.forEachActive((b) => {
      positions.push({ x: b.x, y: b.y });
    });

    expect(positions).toHaveLength(2);

    // First bullet moved left
    expect(positions[0].x).toBeCloseTo(50 + -30 * dt);
    expect(positions[0].y).toBeCloseTo(300 + PLAYER_BULLET_SPEED * dt);

    // Second bullet moved right
    expect(positions[1].x).toBeCloseTo(100 + 30 * dt);
    expect(positions[1].y).toBeCloseTo(300 + PLAYER_BULLET_SPEED * dt);
  });

  // ── Off-screen removal ────────────────────────────────────────────

  it('releases player bullets that go above the screen (y < -margin)', () => {
    // Place bullet just inside the margin, then move it past
    const startY = -BULLET_OFF_SCREEN_MARGIN + 1;
    manager.spawnPlayerBullet(100, startY, 0, -500);

    expect(manager.playerBullets.activeCount).toBe(1);

    // A large enough dt to push it beyond the margin
    manager.update(1);

    expect(manager.playerBullets.activeCount).toBe(0);
  });

  it('releases alien bullets that go below the screen (y > CANVAS_H + margin)', () => {
    const startY = CANVAS_H + BULLET_OFF_SCREEN_MARGIN - 1;
    manager.spawnAlienBullet(200, startY, 0, 500);

    expect(manager.alienBullets.activeCount).toBe(1);

    manager.update(1);

    expect(manager.alienBullets.activeCount).toBe(0);
  });

  it('does not release bullets that are still on-screen', () => {
    manager.spawnPlayerBullet(100, 300);
    manager.spawnAlienBullet(200, 100, 0, 150);

    // Small dt so bullets stay well within the screen
    manager.update(0.016);

    expect(manager.playerBullets.activeCount).toBe(1);
    expect(manager.alienBullets.activeCount).toBe(1);
  });

  // ── reset() ───────────────────────────────────────────────────────

  it('clears all bullets on reset', () => {
    manager.spawnPlayerBullet(100, 200);
    manager.spawnPlayerBullet(120, 200);
    manager.spawnAlienBullet(300, 50, 0, 200);
    manager.spawnAlienBullet(320, 50, 0, 200);

    expect(manager.playerBullets.activeCount).toBe(2);
    expect(manager.alienBullets.activeCount).toBe(2);

    manager.reset();

    expect(manager.playerBullets.activeCount).toBe(0);
    expect(manager.alienBullets.activeCount).toBe(0);
  });

  // ── Pool exhaustion ───────────────────────────────────────────────

  it('stops spawning player bullets when pool is exhausted (capacity 50)', () => {
    for (let i = 0; i < 55; i++) {
      manager.spawnPlayerBullet(i, 300);
    }

    // Pool capacity is 50, so only 50 should be active
    expect(manager.playerBullets.activeCount).toBe(50);
  });

  it('stops spawning alien bullets when pool is exhausted (capacity 100)', () => {
    for (let i = 0; i < 105; i++) {
      manager.spawnAlienBullet(i, 100, 0, 200);
    }

    // Pool capacity is 100, so only 100 should be active
    expect(manager.alienBullets.activeCount).toBe(100);
  });
});
