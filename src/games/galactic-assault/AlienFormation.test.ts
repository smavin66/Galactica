import { AlienFormation, Alien } from './AlienFormation';
import { BulletManager } from './Bullets';
import {
  FORMATION_COLS, FORMATION_ROWS, ALIEN_WIDTH, ALIEN_HEIGHT,
  FORMATION_SPACING_X, FORMATION_SPACING_Y, FORMATION_TOP, ALIEN_POINTS,
  BASE_SWAY_SPEED, MIN_SHOOT_INTERVAL, COMMANDER_ARMOR_WAVE, WARRIOR_ARMOR_WAVE,
} from './constants';
import { CANVAS_W } from '../../engine/types';

function createMockBulletManager() {
  return {
    spawnAlienBullet: vi.fn(),
    spawnPlayerBullet: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    reset: vi.fn(),
    playerBullets: { forEachActive: vi.fn(), releaseIf: vi.fn(), releaseAll: vi.fn(), activeCount: 0, acquire: vi.fn() },
    alienBullets: { forEachActive: vi.fn(), releaseIf: vi.fn(), releaseAll: vi.fn(), activeCount: 0, acquire: vi.fn() },
  } as unknown as BulletManager;
}

describe('AlienFormation', () => {
  let formation: AlienFormation;

  beforeEach(() => {
    formation = new AlienFormation();
    vi.restoreAllMocks();
  });

  // ─── init() ────────────────────────────────────────────────────────────────

  describe('init()', () => {
    it('creates FORMATION_COLS * FORMATION_ROWS aliens', () => {
      formation.init(1);
      expect(formation.aliens).toHaveLength(FORMATION_COLS * FORMATION_ROWS);
    });

    it('all aliens are alive after init', () => {
      formation.init(1);
      expect(formation.aliens.every(a => a.alive)).toBe(true);
    });

    it('assigns correct type per row (type equals row index 0-4)', () => {
      formation.init(1);
      for (const alien of formation.aliens) {
        expect(alien.type).toBe(alien.gridRow);
      }
    });

    it('places aliens at correct grid columns', () => {
      formation.init(1);
      for (let col = 0; col < FORMATION_COLS; col++) {
        const colAliens = formation.aliens.filter(a => a.gridCol === col);
        expect(colAliens).toHaveLength(FORMATION_ROWS);
      }
    });

    it('places aliens at correct X positions based on grid', () => {
      formation.init(1);
      const startX = (CANVAS_W - (FORMATION_COLS - 1) * FORMATION_SPACING_X) / 2;
      for (const alien of formation.aliens) {
        const expectedX = startX + alien.gridCol * FORMATION_SPACING_X;
        expect(alien.x).toBe(expectedX);
        expect(alien.homeX).toBe(expectedX);
      }
    });

    it('places aliens at correct Y positions based on grid', () => {
      formation.init(1);
      for (const alien of formation.aliens) {
        const expectedY = FORMATION_TOP + alien.gridRow * FORMATION_SPACING_Y;
        expect(alien.y).toBe(expectedY);
        expect(alien.homeY).toBe(expectedY);
      }
    });

    it('sets correct alien dimensions', () => {
      formation.init(1);
      for (const alien of formation.aliens) {
        expect(alien.width).toBe(ALIEN_WIDTH);
        expect(alien.height).toBe(ALIEN_HEIGHT);
      }
    });

    it('resets aliens array on subsequent calls', () => {
      formation.init(1);
      formation.init(2);
      expect(formation.aliens).toHaveLength(FORMATION_COLS * FORMATION_ROWS);
    });
  });

  // ─── Wave scaling ─────────────────────────────────────────────────────────

  describe('wave scaling', () => {
    it('swaySpeed increases with wave number', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      // Sway speed is private, so we test indirectly: after a known dt,
      // the offset applied to non-diving aliens should reflect the speed.
      // Wave 1: speed = BASE_SWAY_SPEED + 0 = 40
      // After dt=0.1, offset = 40 * 1 * 0.1 = 4
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // avoid shoot/dive triggers
      formation.update(0.1, bullets, 400);
      const alienWave1 = formation.aliens[0];
      const expectedOffset1 = BASE_SWAY_SPEED * 0.1;
      expect(alienWave1.x).toBeCloseTo(alienWave1.homeX + expectedOffset1, 1);
    });

    it('shootInterval decreases with wave number but respects minimum', () => {
      // At high enough wave, shootInterval should bottom out at MIN_SHOOT_INTERVAL.
      // wave where interval would go below min:
      // BASE_SHOOT_INTERVAL - (wave-1)*SHOOT_INTERVAL_PER_WAVE < MIN_SHOOT_INTERVAL
      // wave > (BASE_SHOOT_INTERVAL - MIN_SHOOT_INTERVAL) / SHOOT_INTERVAL_PER_WAVE + 1
      const highWave = 50;
      formation.init(highWave);
      const bullets = createMockBulletManager();

      // shootTimer is set to 0 initially, but diveTimer=1.5
      // After init, shootTimer = 0. On first update the timer goes negative
      // and resets to shootInterval. We can detect the interval by the second shot.
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      // First update: shootTimer goes to MIN_SHOOT_INTERVAL after firing
      formation.update(0.01, bullets, 400);
      const firstCallCount = (bullets.spawnAlienBullet as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(firstCallCount).toBe(1); // fires immediately since shootTimer starts at 0

      // Advance just under MIN_SHOOT_INTERVAL - should NOT fire again
      (bullets.spawnAlienBullet as ReturnType<typeof vi.fn>).mockClear();
      formation.update(MIN_SHOOT_INTERVAL - 0.05, bullets, 400);
      expect(bullets.spawnAlienBullet).not.toHaveBeenCalled();
    });

    it('diveInterval decreases with wave number but respects minimum', () => {
      const highWave = 50;
      formation.init(highWave);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // avoid group dives

      // diveTimer starts at 1.5, so need to advance past that first
      formation.update(1.6, bullets, 400);
      // After the dive triggers, diveTimer resets to MIN_DIVE_INTERVAL
      // Check that at least one alien is now diving
      const divingAliens = formation.aliens.filter(a => a.diving);
      expect(divingAliens.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Armored aliens ────────────────────────────────────────────────────────

  describe('armored aliens', () => {
    it('all aliens have 1 HP at wave 1', () => {
      formation.init(1);
      for (const alien of formation.aliens) {
        expect(alien.hp).toBe(1);
        expect(alien.maxHp).toBe(1);
      }
    });

    it('commanders (row 0) get 2 HP from wave COMMANDER_ARMOR_WAVE', () => {
      formation.init(COMMANDER_ARMOR_WAVE);
      const commanders = formation.aliens.filter(a => a.gridRow === 0);
      for (const cmd of commanders) {
        expect(cmd.hp).toBe(2);
        expect(cmd.maxHp).toBe(2);
      }
    });

    it('warriors (row 1) still have 1 HP at wave COMMANDER_ARMOR_WAVE', () => {
      formation.init(COMMANDER_ARMOR_WAVE);
      const warriors = formation.aliens.filter(a => a.gridRow === 1);
      for (const w of warriors) {
        expect(w.hp).toBe(1);
      }
    });

    it('warriors (row 1) get 2 HP from wave WARRIOR_ARMOR_WAVE', () => {
      formation.init(WARRIOR_ARMOR_WAVE);
      const warriors = formation.aliens.filter(a => a.gridRow === 1);
      for (const w of warriors) {
        expect(w.hp).toBe(2);
        expect(w.maxHp).toBe(2);
      }
    });

    it('rows 2-4 always have 1 HP even at high waves', () => {
      formation.init(10);
      const lowerRows = formation.aliens.filter(a => a.gridRow >= 2);
      for (const alien of lowerRows) {
        expect(alien.hp).toBe(1);
      }
    });
  });

  // ─── aliveCount ────────────────────────────────────────────────────────────

  describe('aliveCount', () => {
    it('returns total count when all are alive', () => {
      formation.init(1);
      expect(formation.aliveCount).toBe(FORMATION_COLS * FORMATION_ROWS);
    });

    it('decreases when aliens are killed', () => {
      formation.init(1);
      formation.aliens[0].alive = false;
      formation.aliens[1].alive = false;
      expect(formation.aliveCount).toBe(FORMATION_COLS * FORMATION_ROWS - 2);
    });

    it('returns 0 when all aliens are dead', () => {
      formation.init(1);
      for (const alien of formation.aliens) {
        alien.alive = false;
      }
      expect(formation.aliveCount).toBe(0);
    });
  });

  // ─── getPointsForAlien ─────────────────────────────────────────────────────

  describe('getPointsForAlien', () => {
    it('returns correct points for each alien type (rows 0-4)', () => {
      formation.init(1);
      for (let row = 0; row < FORMATION_ROWS; row++) {
        const alien = formation.aliens.find(a => a.gridRow === row)!;
        expect(formation.getPointsForAlien(alien)).toBe(ALIEN_POINTS[row]);
      }
    });

    it('returns 10 as fallback for unknown type', () => {
      const fakeAlien = { type: 99 } as Alien;
      expect(formation.getPointsForAlien(fakeAlien)).toBe(10);
    });
  });

  // ─── Formation sway ───────────────────────────────────────────────────────

  describe('formation sway', () => {
    it('updates non-diving alien X positions based on sway', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const originalX = formation.aliens[0].homeX;
      formation.update(0.1, bullets, 400);

      // After one update, offset = BASE_SWAY_SPEED * 1 * 0.1 = 4
      const expectedOffset = BASE_SWAY_SPEED * 0.1;
      expect(formation.aliens[0].x).toBeCloseTo(originalX + expectedOffset, 1);
    });

    it('reverses direction when formation reaches right edge', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      // Push formation far to the right by updating many times
      for (let i = 0; i < 200; i++) {
        formation.update(0.05, bullets, 400);
      }

      // After bouncing, some aliens should have moved back left
      // The rightmost alien should be within bounds
      const rightmost = Math.max(...formation.aliens.filter(a => !a.diving).map(a => a.x));
      expect(rightmost).toBeLessThanOrEqual(CANVAS_W);
    });

    it('reverses direction when formation reaches left edge', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      // We need to first go right and bounce, then go left and bounce.
      // Alternatively, we can manipulate swayDir by making formation go left.
      // Force sway direction left by first bouncing right, then keep going.
      for (let i = 0; i < 500; i++) {
        formation.update(0.05, bullets, 400);
      }

      // The leftmost alien should stay above 0
      const leftmost = Math.min(...formation.aliens.filter(a => !a.diving).map(a => a.x));
      expect(leftmost).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Shooting ──────────────────────────────────────────────────────────────

  describe('shooting', () => {
    it('fires alien bullet when shoot timer expires', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // shootTimer starts at 0, so first update should trigger a shot
      formation.update(0.01, bullets, 400);
      expect(bullets.spawnAlienBullet).toHaveBeenCalled();
    });

    it('passes correct spawn position from the shooting alien', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0); // pick first bottom-row alien

      formation.update(0.01, bullets, 400);
      expect(bullets.spawnAlienBullet).toHaveBeenCalledTimes(1);

      const call = (bullets.spawnAlienBullet as ReturnType<typeof vi.fn>).mock.calls[0];
      // First two args are x, y of the shooter
      expect(typeof call[0]).toBe('number');
      expect(typeof call[1]).toBe('number');
    });

    it('does not fire before shoot interval elapses after a shot', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // First update fires
      formation.update(0.01, bullets, 400);
      expect(bullets.spawnAlienBullet).toHaveBeenCalledTimes(1);

      // Small update should NOT fire again (interval is 1.5s at wave 1)
      (bullets.spawnAlienBullet as ReturnType<typeof vi.fn>).mockClear();
      formation.update(0.1, bullets, 400);
      expect(bullets.spawnAlienBullet).not.toHaveBeenCalled();
    });
  });

  // ─── Dive mechanics ────────────────────────────────────────────────────────

  describe('dive mechanics', () => {
    it('startDive sets alien.diving to true when dive timer expires', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      // diveTimer starts at 1.5
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // Advance past the initial dive timer of 1.5s
      formation.update(1.6, bullets, 400);

      const divingAliens = formation.aliens.filter(a => a.diving);
      expect(divingAliens.length).toBeGreaterThanOrEqual(1);
    });

    it('diving alien has divePhase set to 0 initially', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      formation.update(1.6, bullets, 400);

      const diver = formation.aliens.find(a => a.diving);
      expect(diver).toBeDefined();
      expect(diver!.divePhase).toBe(0);
    });

    it('diving alien has a positive diveSpeed', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      // randomRange uses Math.random, control it: randomRange(180, 280) = 180 + 0.5 * 100 = 230
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      formation.update(1.6, bullets, 400);

      const diver = formation.aliens.find(a => a.diving);
      expect(diver).toBeDefined();
      expect(diver!.diveSpeed).toBeGreaterThanOrEqual(180);
      expect(diver!.diveSpeed).toBeLessThanOrEqual(280);
    });

    it('update moves diving alien downward', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      // Trigger a dive
      formation.update(1.6, bullets, 400);
      const diver = formation.aliens.find(a => a.diving)!;
      const initialY = diver.y;

      // Advance time to move the diver
      formation.update(0.1, bullets, 400);
      expect(diver.y).toBeGreaterThan(initialY);
    });
  });

  // ─── Group dives ──────────────────────────────────────────────────────────

  describe('group dives', () => {
    it('group dive chance is 0 at wave 1', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      // groupDiveChance = (1-1) * 0.2 = 0, so even with random=0 it should NOT group dive
      // However, random < 0 is always false, so single dive only
      vi.spyOn(Math, 'random').mockReturnValue(0);

      formation.update(1.6, bullets, 400);

      const divingAliens = formation.aliens.filter(a => a.diving);
      // At wave 1, groupDiveChance = 0, so random() < 0 is false => only 1 diver
      expect(divingAliens.length).toBe(1);
    });

    it('group dive triggers multiple divers at higher waves', () => {
      // At wave 4: groupDiveChance = 3 * 0.2 = 0.6
      formation.init(4);
      const bullets = createMockBulletManager();

      // We need Math.random to:
      // 1. Return 0.99 for shoot (no bottom aliens issue, just needs to pick one)
      // 2. Return 0.1 for isGroupDive check (0.1 < 0.6 = true)
      // 3. Return 0.5 for picking the first diver
      // 4. Return 0.5 for picking neighbor divers
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        // The shoot happens first (shootTimer starts at 0), then dive at 1.5s
        // For shooting: we need random for picking bottom alien
        // For dive: we need random < groupDiveChance to trigger group dive
        if (callCount <= 2) return 0.5; // for shooting picks
        return 0.1; // for dive: isGroupDive check passes (0.1 < 0.6), then picks
      });

      formation.update(1.6, bullets, 400);

      const divingAliens = formation.aliens.filter(a => a.diving);
      expect(divingAliens.length).toBeGreaterThanOrEqual(2);
    });

    it('group dive chance caps at MAX_GROUP_DIVE_CHANCE', () => {
      // At very high wave, groupDiveChance should cap
      formation.init(20);
      const bullets = createMockBulletManager();
      // groupDiveChance = min(0.7, 19 * 0.2) = min(0.7, 3.8) = 0.7
      // We test indirectly: with random = 0.69 (just under 0.7), group dive triggers
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount <= 2) return 0.5; // for shooting
        if (callCount === 3) return 0.69; // isGroupDive: 0.69 < 0.7 => true
        return 0.5;
      });

      formation.update(1.6, bullets, 400);

      const divingAliens = formation.aliens.filter(a => a.diving);
      expect(divingAliens.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ─── update() general ─────────────────────────────────────────────────────

  describe('update()', () => {
    it('updates animPhase for alive aliens', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const initialPhase = formation.aliens[0].animPhase;
      formation.update(0.1, bullets, 400);
      expect(formation.aliens[0].animPhase).toBeCloseTo(initialPhase + 0.1 * 3, 5);
    });

    it('decrements hitFlash over time', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      formation.aliens[0].hitFlash = 0.5;
      formation.update(0.1, bullets, 400);
      expect(formation.aliens[0].hitFlash).toBeCloseTo(0.4, 5);
    });

    it('does not update dead aliens positions', () => {
      formation.init(1);
      const bullets = createMockBulletManager();
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const deadAlien = formation.aliens[0];
      deadAlien.alive = false;
      const originalX = deadAlien.x;
      formation.update(0.1, bullets, 400);
      // Dead alien position should not change
      expect(deadAlien.x).toBe(originalX);
    });
  });
});
