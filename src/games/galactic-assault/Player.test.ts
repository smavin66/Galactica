import { Player } from './Player';
import { InputManager } from '../../engine/InputManager';
import { CANVAS_W, CANVAS_H } from '../../engine/types';
import {
  PLAYER_SPEED,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  DEFAULT_SHOOT_RATE,
  RAPID_FIRE_MULTIPLIER,
  SHIELD_HITS,
  POWERUP_DURATION,
  INVULN_DURATION,
} from './constants';

// ---------------------------------------------------------------------------
// Stub InputManager
// ---------------------------------------------------------------------------
function createInputStub(keysDown: Set<string> = new Set()): InputManager {
  return {
    isDown: (code: string) => keysDown.has(code),
    justPressed: (_code: string) => false,
  } as unknown as InputManager;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Player', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player();
  });

  // ---- Construction / defaults -----------------------------------------

  it('initialises at the horizontal centre and near the bottom of the canvas', () => {
    expect(player.x).toBe(CANVAS_W / 2);
    expect(player.y).toBe(CANVAS_H - 50);
    expect(player.lives).toBe(3);
    expect(player.shootCooldown).toBe(0);
    expect(player.shootRate).toBe(DEFAULT_SHOOT_RATE);
    expect(player.invulnTime).toBe(0);
    expect(player.powerUp).toBeNull();
    expect(player.powerUpTimer).toBe(0);
    expect(player.shieldHits).toBe(0);
  });

  // ---- Movement --------------------------------------------------------

  it('moves left when ArrowLeft is held', () => {
    const input = createInputStub(new Set(['ArrowLeft']));
    const dt = 0.1;
    const startX = player.x;
    player.update(dt, input);
    expect(player.x).toBeCloseTo(startX - PLAYER_SPEED * dt);
  });

  it('moves left when KeyA is held', () => {
    const input = createInputStub(new Set(['KeyA']));
    const dt = 0.1;
    const startX = player.x;
    player.update(dt, input);
    expect(player.x).toBeCloseTo(startX - PLAYER_SPEED * dt);
  });

  it('moves right when ArrowRight is held', () => {
    const input = createInputStub(new Set(['ArrowRight']));
    const dt = 0.1;
    const startX = player.x;
    player.update(dt, input);
    expect(player.x).toBeCloseTo(startX + PLAYER_SPEED * dt);
  });

  it('moves right when KeyD is held', () => {
    const input = createInputStub(new Set(['KeyD']));
    const dt = 0.1;
    const startX = player.x;
    player.update(dt, input);
    expect(player.x).toBeCloseTo(startX + PLAYER_SPEED * dt);
  });

  it('clamps x to the left boundary', () => {
    player.x = 0;
    const input = createInputStub(new Set(['ArrowLeft']));
    player.update(1, input);
    expect(player.x).toBe(PLAYER_WIDTH / 2);
  });

  it('clamps x to the right boundary', () => {
    player.x = CANVAS_W;
    const input = createInputStub(new Set(['ArrowRight']));
    player.update(1, input);
    expect(player.x).toBe(CANVAS_W - PLAYER_WIDTH / 2);
  });

  // ---- Shoot cooldown --------------------------------------------------

  it('canShoot returns true when shootCooldown is zero', () => {
    player.shootCooldown = 0;
    expect(player.canShoot()).toBe(true);
  });

  it('canShoot returns false when shootCooldown is positive', () => {
    player.shootCooldown = 0.5;
    expect(player.canShoot()).toBe(false);
  });

  it('onShoot sets cooldown to DEFAULT_SHOOT_RATE without rapid power-up', () => {
    player.powerUp = null;
    player.onShoot();
    expect(player.shootCooldown).toBe(DEFAULT_SHOOT_RATE);
  });

  it('onShoot applies RAPID_FIRE_MULTIPLIER when rapid power-up is active', () => {
    player.powerUp = 'rapid';
    player.onShoot();
    expect(player.shootCooldown).toBeCloseTo(DEFAULT_SHOOT_RATE * RAPID_FIRE_MULTIPLIER);
  });

  it('shoot cooldown decreases over time during update', () => {
    const input = createInputStub();
    player.shootCooldown = 0.5;
    player.update(0.2, input);
    expect(player.shootCooldown).toBeCloseTo(0.3);
  });

  // ---- Power-up application --------------------------------------------

  it('applyPowerUp sets rapid power-up and timer', () => {
    player.applyPowerUp('rapid');
    expect(player.powerUp).toBe('rapid');
    expect(player.powerUpTimer).toBe(POWERUP_DURATION);
    expect(player.shieldHits).toBe(0);
  });

  it('applyPowerUp sets spread power-up and timer', () => {
    player.applyPowerUp('spread');
    expect(player.powerUp).toBe('spread');
    expect(player.powerUpTimer).toBe(POWERUP_DURATION);
    expect(player.shieldHits).toBe(0);
  });

  it('applyPowerUp sets shield power-up with SHIELD_HITS', () => {
    player.applyPowerUp('shield');
    expect(player.powerUp).toBe('shield');
    expect(player.powerUpTimer).toBe(POWERUP_DURATION);
    expect(player.shieldHits).toBe(SHIELD_HITS);
  });

  it('power-up timer expires and clearPowerUp is called for non-shield', () => {
    player.applyPowerUp('rapid');
    const input = createInputStub();
    // Advance time past the duration
    player.update(POWERUP_DURATION + 0.1, input);
    expect(player.powerUp).toBeNull();
    expect(player.powerUpTimer).toBe(0);
  });

  it('power-up timer expires but shield is kept by clearPowerUp', () => {
    player.applyPowerUp('shield');
    const input = createInputStub();
    // Advance time past the duration
    player.update(POWERUP_DURATION + 0.1, input);
    // clearPowerUp keeps shield
    expect(player.powerUp).toBe('shield');
    expect(player.powerUpTimer).toBe(0);
  });

  // ---- Shield damage absorption ----------------------------------------

  it('shield absorbs damage and decrements shieldHits', () => {
    player.applyPowerUp('shield');
    const damaged = player.takeDamage();
    expect(damaged).toBe(false);
    expect(player.shieldHits).toBe(SHIELD_HITS - 1);
    expect(player.lives).toBe(3);
  });

  it('shield is removed when shieldHits reaches zero', () => {
    player.applyPowerUp('shield');
    for (let i = 0; i < SHIELD_HITS; i++) {
      player.takeDamage();
    }
    expect(player.shieldHits).toBe(0);
    expect(player.powerUp).toBeNull();
  });

  // ---- takeDamage -------------------------------------------------------

  it('invulnerability prevents damage and returns false', () => {
    player.invulnTime = 1.0;
    const damaged = player.takeDamage();
    expect(damaged).toBe(false);
    expect(player.lives).toBe(3);
  });

  it('returns true and decrements lives on actual damage', () => {
    const damaged = player.takeDamage();
    expect(damaged).toBe(true);
    expect(player.lives).toBe(2);
  });

  it('grants invulnerability after taking real damage', () => {
    player.takeDamage();
    expect(player.invulnTime).toBe(INVULN_DURATION);
  });

  // ---- Invulnerability timer -------------------------------------------

  it('invulnerability timer counts down during update', () => {
    player.invulnTime = INVULN_DURATION;
    const input = createInputStub();
    player.update(0.5, input);
    expect(player.invulnTime).toBeCloseTo(INVULN_DURATION - 0.5);
  });

  // ---- reset -----------------------------------------------------------

  it('reset restores all defaults', () => {
    // Mutate the player into a non-default state
    player.x = 100;
    player.y = 100;
    player.lives = 1;
    player.shootCooldown = 0.5;
    player.shootRate = 0.1;
    player.invulnTime = 1.0;
    player.powerUp = 'rapid';
    player.powerUpTimer = 3;
    player.shieldHits = 2;

    player.reset();

    expect(player.x).toBe(CANVAS_W / 2);
    expect(player.y).toBe(CANVAS_H - 50);
    expect(player.lives).toBe(3);
    expect(player.shootCooldown).toBe(0);
    expect(player.shootRate).toBe(DEFAULT_SHOOT_RATE);
    expect(player.invulnTime).toBe(0);
    expect(player.powerUp).toBeNull();
    expect(player.powerUpTimer).toBe(0);
    expect(player.shieldHits).toBe(0);
  });

  // ---- clearPowerUp / clearAllPowerUps ----------------------------------

  it('clearPowerUp keeps shield active', () => {
    player.applyPowerUp('shield');
    player.clearPowerUp();
    expect(player.powerUp).toBe('shield');
    expect(player.powerUpTimer).toBe(0);
  });

  it('clearPowerUp removes non-shield power-ups', () => {
    player.applyPowerUp('rapid');
    player.clearPowerUp();
    expect(player.powerUp).toBeNull();
    expect(player.powerUpTimer).toBe(0);
  });

  it('clearAllPowerUps removes everything including shield', () => {
    player.applyPowerUp('shield');
    player.clearAllPowerUps();
    expect(player.powerUp).toBeNull();
    expect(player.powerUpTimer).toBe(0);
  });

  // ---- bounds ----------------------------------------------------------

  it('bounds returns a correctly centered Rect', () => {
    const rect = player.bounds();
    expect(rect.x).toBe(player.x - PLAYER_WIDTH / 2);
    expect(rect.y).toBe(player.y - PLAYER_HEIGHT / 2);
    expect(rect.w).toBe(PLAYER_WIDTH);
    expect(rect.h).toBe(PLAYER_HEIGHT);
  });
});
