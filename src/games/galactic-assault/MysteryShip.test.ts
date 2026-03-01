import { MysteryShip } from './MysteryShip';
import {
  MYSTERY_SHIP_Y,
  MYSTERY_SHIP_WIDTH,
  MYSTERY_SHIP_HEIGHT,
  MYSTERY_SHIP_SPAWN_MIN,
  MYSTERY_SHIP_SPAWN_MAX,
  MYSTERY_SHIP_POINTS,
} from './constants';
import { CANVAS_W } from '../../engine/types';

describe('MysteryShip', () => {
  let ship: MysteryShip;
  let randomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Default Math.random returns 0.5, which maps to:
    //   - randomRange midpoint values for spawn timer / speed
    //   - direction = -1 (since 0.5 is NOT < 0.5)
    //   - points index = floor(0.5 * 3) = 1 => 300 points
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    ship = new MysteryShip();
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('should start inactive', () => {
    expect(ship.active).toBe(false);
  });

  it('should have correct default dimensions and y position', () => {
    expect(ship.y).toBe(MYSTERY_SHIP_Y);
    expect(ship.width).toBe(MYSTERY_SHIP_WIDTH);
    expect(ship.height).toBe(MYSTERY_SHIP_HEIGHT);
  });

  it('should count down the spawn timer while inactive', () => {
    // With random = 0.5, spawnTimer = SPAWN_MIN + 0.5 * (SPAWN_MAX - SPAWN_MIN) = 24
    const expectedTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);

    // Update with a small dt that doesn't exhaust the timer
    ship.update(1);
    expect(ship.active).toBe(false);

    // Update enough to just exhaust the timer
    ship.update(expectedTimer - 1);
    expect(ship.active).toBe(true);
  });

  it('should spawn and become active when spawn timer reaches 0', () => {
    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);

    ship.update(spawnTimer + 0.1);

    expect(ship.active).toBe(true);
    expect(ship.y).toBe(MYSTERY_SHIP_Y);
  });

  it('should spawn moving left-to-right when Math.random < 0.5', () => {
    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);

    // Exhaust timer first, then on spawn() call, random returns 0.25 for direction
    randomSpy.mockReturnValue(0.5); // for timer in constructor
    ship = new MysteryShip();

    // When spawn is called, return 0.25 (< 0.5 => direction = 1, left-to-right)
    randomSpy.mockReturnValue(0.25);
    ship.update(spawnTimer + 0.1);

    expect(ship.active).toBe(true);
    // direction = 1 means ship starts at x = -width (off left edge)
    expect(ship.x).toBe(-MYSTERY_SHIP_WIDTH);
  });

  it('should spawn moving right-to-left when Math.random >= 0.5', () => {
    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);

    randomSpy.mockReturnValue(0.5);
    ship = new MysteryShip();

    // When spawn is called, return 0.75 (>= 0.5 => direction = -1, right-to-left)
    randomSpy.mockReturnValue(0.75);
    ship.update(spawnTimer + 0.1);

    expect(ship.active).toBe(true);
    // direction = -1 means ship starts at x = CANVAS_W + width (off right edge)
    expect(ship.x).toBe(CANVAS_W + MYSTERY_SHIP_WIDTH);
  });

  it('should move x by speed * direction * dt when active', () => {
    // Spawn the ship moving left-to-right
    randomSpy.mockReturnValue(0.25);
    ship = new MysteryShip();

    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.25 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);
    ship.update(spawnTimer + 0.1);

    expect(ship.active).toBe(true);
    const xAfterSpawn = ship.x;

    // With random = 0.25, speed = SPEED_MIN + 0.25 * (SPEED_MAX - SPEED_MIN)
    // direction = 1 (left-to-right)
    const dt = 0.016;
    ship.update(dt);

    expect(ship.x).toBeGreaterThan(xAfterSpawn);
  });

  it('should deactivate when moving left-to-right past right edge', () => {
    // Spawn ship moving left-to-right
    randomSpy.mockReturnValue(0.1);
    ship = new MysteryShip();

    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.1 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);
    ship.update(spawnTimer + 0.1);
    expect(ship.active).toBe(true);

    // Force x past the right edge
    (ship as any).x = CANVAS_W + MYSTERY_SHIP_WIDTH + 1;
    ship.update(0.016);

    expect(ship.active).toBe(false);
  });

  it('should deactivate when moving right-to-left past left edge', () => {
    // Spawn ship moving right-to-left
    randomSpy.mockReturnValue(0.75);
    ship = new MysteryShip();

    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.75 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);
    ship.update(spawnTimer + 0.1);
    expect(ship.active).toBe(true);

    // Force x past the left edge and set direction to -1
    (ship as any).x = -MYSTERY_SHIP_WIDTH - 1;
    (ship as any).direction = -1;
    ship.update(0.016);

    expect(ship.active).toBe(false);
  });

  it('should return points and deactivate when hit()', () => {
    // Spawn the ship
    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);
    ship.update(spawnTimer + 0.1);
    expect(ship.active).toBe(true);

    // With random = 0.5, points index = floor(0.5 * 3) = 1 => MYSTERY_SHIP_POINTS[1] = 300
    const points = ship.hit();
    expect(points).toBe(MYSTERY_SHIP_POINTS[1]);
    expect(ship.active).toBe(false);
  });

  it('should return correct bounds when active', () => {
    // Spawn the ship
    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);
    ship.update(spawnTimer + 0.1);
    expect(ship.active).toBe(true);

    const rect = ship.bounds();
    expect(rect).toEqual({
      x: ship.x - MYSTERY_SHIP_WIDTH / 2,
      y: MYSTERY_SHIP_Y - MYSTERY_SHIP_HEIGHT / 2,
      w: MYSTERY_SHIP_WIDTH,
      h: MYSTERY_SHIP_HEIGHT,
    });
  });

  it('should deactivate and reset spawn timer on reset()', () => {
    // Spawn the ship first
    const spawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);
    ship.update(spawnTimer + 0.1);
    expect(ship.active).toBe(true);

    ship.reset();
    expect(ship.active).toBe(false);

    // After reset, the timer should be set again; updating with a small dt should not spawn
    ship.update(1);
    expect(ship.active).toBe(false);

    // But updating with the full timer duration should spawn again
    const newSpawnTimer = MYSTERY_SHIP_SPAWN_MIN + 0.5 * (MYSTERY_SHIP_SPAWN_MAX - MYSTERY_SHIP_SPAWN_MIN);
    ship.update(newSpawnTimer);
    expect(ship.active).toBe(true);
  });
});
