import { PowerUpManager, PowerUpItem } from './PowerUp';
import { POWERUP_SPAWN_CHANCE, POWERUP_FALL_SPEED, POWERUP_SIZE, BULLET_OFF_SCREEN_MARGIN } from './constants';
import { CANVAS_H } from '../../engine/types';

describe('PowerUpManager', () => {
  let manager: PowerUpManager;

  beforeEach(() => {
    manager = new PowerUpManager();
    vi.restoreAllMocks();
  });

  describe('spawn()', () => {
    it('creates a power-up when Math.random passes the chance threshold', () => {
      // First call: spawn chance check (must be <= POWERUP_SPAWN_CHANCE to pass)
      // Second call: type selection
      // Third call: bobPhase
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0) // pass chance check (0 < 0.25)
        .mockReturnValueOnce(0) // type index: floor(0 * 3) = 0 -> 'rapid'
        .mockReturnValueOnce(0); // bobPhase

      manager.spawn(100, 200);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items).toHaveLength(1);
      expect(items[0].x).toBe(100);
      expect(items[0].y).toBe(200);
      expect(items[0].vy).toBe(POWERUP_FALL_SPEED);
      expect(items[0].size).toBe(POWERUP_SIZE);
    });

    it('does NOT create a power-up when Math.random exceeds the chance threshold', () => {
      vi.spyOn(Math, 'random').mockReturnValue(POWERUP_SPAWN_CHANCE + 0.01);

      manager.spawn(100, 200);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items).toHaveLength(0);
    });

    it('assigns type "rapid" when type random maps to index 0', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)    // pass chance check
        .mockReturnValueOnce(0)    // floor(0 * 3) = 0 -> 'rapid'
        .mockReturnValueOnce(0);   // bobPhase

      manager.spawn(50, 50);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items[0].type).toBe('rapid');
    });

    it('assigns type "shield" when type random maps to index 1', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)      // pass chance check
        .mockReturnValueOnce(0.5)    // floor(0.5 * 3) = 1 -> 'shield'
        .mockReturnValueOnce(0);     // bobPhase

      manager.spawn(50, 50);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items[0].type).toBe('shield');
    });

    it('assigns type "spread" when type random maps to index 2', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)      // pass chance check
        .mockReturnValueOnce(0.8)    // floor(0.8 * 3) = 2 -> 'spread'
        .mockReturnValueOnce(0);     // bobPhase

      manager.spawn(50, 50);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items[0].type).toBe('spread');
    });
  });

  describe('update()', () => {
    it('moves power-ups downward by vy * dt', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0);

      manager.spawn(100, 200);

      const dt = 0.016;
      manager.update(dt);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items[0].y).toBeCloseTo(200 + POWERUP_FALL_SPEED * dt);
    });

    it('advances bobPhase by dt * 4', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0); // bobPhase starts at 0

      manager.spawn(100, 200);

      const dt = 0.016;
      manager.update(dt);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items[0].bobPhase).toBeCloseTo(dt * 4);
    });

    it('releases power-ups that fall off-screen', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0);

      // Spawn just below the release threshold
      const offScreenY = CANVAS_H + BULLET_OFF_SCREEN_MARGIN;
      manager.spawn(100, offScreenY);

      // One small tick to push y past the threshold
      manager.update(0.016);

      const items: PowerUpItem[] = [];
      manager.forEachActive((item) => items.push(item));

      expect(items).toHaveLength(0);
    });
  });

  describe('forEachActive()', () => {
    it('delegates iteration to the underlying pool', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)   // first spawn
        .mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(0); // second spawn

      manager.spawn(10, 20);
      manager.spawn(30, 40);

      const fn = vi.fn();
      manager.forEachActive(fn);

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('release()', () => {
    it('delegates release to the underlying pool', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0);

      manager.spawn(100, 200);

      let captured: PowerUpItem | null = null;
      manager.forEachActive((item) => { captured = item; });
      expect(captured).not.toBeNull();

      manager.release(captured!);

      const remaining: PowerUpItem[] = [];
      manager.forEachActive((item) => remaining.push(item));

      expect(remaining).toHaveLength(0);
    });
  });

  describe('reset()', () => {
    it('clears all active power-ups', () => {
      vi.spyOn(Math, 'random')
        .mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0)
        .mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
        .mockReturnValueOnce(0).mockReturnValueOnce(0.8).mockReturnValueOnce(0);

      manager.spawn(10, 20);
      manager.spawn(30, 40);
      manager.spawn(50, 60);

      // Confirm there are active items
      const beforeReset: PowerUpItem[] = [];
      manager.forEachActive((item) => beforeReset.push(item));
      expect(beforeReset).toHaveLength(3);

      manager.reset();

      const afterReset: PowerUpItem[] = [];
      manager.forEachActive((item) => afterReset.push(item));
      expect(afterReset).toHaveLength(0);
    });
  });
});
