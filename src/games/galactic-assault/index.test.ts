import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GalacticAssault } from './index';
import { DYING_DURATION } from './constants';

/**
 * Creates a mock CanvasRenderingContext2D with all methods used by the game.
 */
function createMockCtx(): CanvasRenderingContext2D {
  const ctx: Record<string, unknown> = {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    closePath: vi.fn(),
    quadraticCurveTo: vi.fn(),
    ellipse: vi.fn(),
    fillText: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    lineWidth: 1,
    globalAlpha: 1,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

/**
 * Creates a mock input manager with controllable isDown/justPressed behavior.
 */
function createMockInput() {
  return {
    isDown: vi.fn((_code: string) => false),
    justPressed: vi.fn((_code: string) => false),
    endFrame: vi.fn(),
    init: vi.fn(),
    cleanup: vi.fn(),
  };
}

describe('GalacticAssault state machine', () => {
  let game: GalacticAssault;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    });

    vi.stubGlobal(
      'AudioContext',
      class MockAudioContext {
        destination = {};
        currentTime = 0;
        sampleRate = 44100;
        state = 'running';
        resume = vi.fn();
        close = vi.fn();
        createOscillator = vi.fn(() => ({
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          frequency: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          type: '',
        }));
        createGain = vi.fn(() => ({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            value: 1,
          },
        }));
        createBuffer = vi.fn((_channels: number, length: number, _sampleRate: number) => ({
          getChannelData: vi.fn(() => new Float32Array(length)),
        }));
        createBufferSource = vi.fn(() => ({
          connect: vi.fn(),
          start: vi.fn(),
          buffer: null,
        }));
        createBiquadFilter = vi.fn(() => ({
          connect: vi.fn(),
          type: '',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        }));
      }
    );

    // InputManager uses window.addEventListener, but mock document too for safety
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    // InputManager calls window.addEventListener/removeEventListener
    const origWindow = globalThis.window ?? ({} as Record<string, unknown>);
    vi.stubGlobal('window', {
      ...origWindow,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    ctx = createMockCtx();
    game = new GalacticAssault();
  });

  /**
   * Helper: initializes the game and replaces the internal input with a mock.
   * Returns the mock input so tests can control key state.
   */
  function initGameWithMockInput() {
    game.init(ctx);
    const mockInput = createMockInput();
    (game as any).input = mockInput;
    return mockInput;
  }

  // ─── Test 1: init() sets state to 'ready' ────────────────────────────

  it('init() sets state to "ready"', () => {
    game.init(ctx);
    expect((game as any).state).toBe('ready');
  });

  // ─── Test 2: init() resets stateTimer to 0 ────────────────────────────

  it('init() resets stateTimer to 0', () => {
    game.init(ctx);
    expect((game as any).stateTimer).toBe(0);
  });

  // ─── Test 3: ready → playing on Space press ──────────────────────────

  it('transitions from ready to playing when Space is pressed', () => {
    const mockInput = initGameWithMockInput();
    expect((game as any).state).toBe('ready');

    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.016);

    expect((game as any).state).toBe('playing');
  });

  // ─── Test 4: ready → playing after 3 seconds ─────────────────────────

  it('transitions from ready to playing after 3 seconds', () => {
    initGameWithMockInput();
    expect((game as any).state).toBe('ready');

    // Accumulate just over 3 seconds of time
    game.update(1.5);
    expect((game as any).state).toBe('ready');

    game.update(1.5);
    expect((game as any).state).toBe('ready');

    game.update(0.1);
    expect((game as any).state).toBe('playing');
  });

  // ─── Test 5: stays in ready if less than 3 seconds and no Space ──────

  it('stays in ready state when less than 3 seconds and no Space pressed', () => {
    initGameWithMockInput();

    game.update(1.0);
    expect((game as any).state).toBe('ready');

    game.update(1.0);
    expect((game as any).state).toBe('ready');
  });

  // ─── Test 6: playing → dying when player takes damage ────────────────

  it('transitions from playing to dying when player is hit by alien bullet', () => {
    const mockInput = initGameWithMockInput();

    // Transition to playing
    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.016);
    expect((game as any).state).toBe('playing');

    // Reset justPressed so Space no longer triggers
    mockInput.justPressed.mockReturnValue(false);
    mockInput.isDown.mockReturnValue(false);

    // Ensure the player is not invulnerable and has no shield
    const player = (game as any).player;
    player.invulnTime = 0;
    player.powerUp = null;
    player.shieldHits = 0;

    // Spawn an alien bullet directly overlapping the player's position
    const bullets = (game as any).bullets;
    bullets.spawnAlienBullet(player.x, player.y, 0, 0);

    // Run one update tick to trigger collision detection
    game.update(0.016);

    expect((game as any).state).toBe('dying');
    expect((game as any).dyingTimer).toBeCloseTo(DYING_DURATION, 1);
  });

  // ─── Test 7: dying → gameover when dyingTimer expires and lives <= 0 ─

  it('transitions from dying to gameover when dyingTimer expires and lives <= 0', () => {
    const mockInput = initGameWithMockInput();

    // Go to playing
    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.016);
    mockInput.justPressed.mockReturnValue(false);
    mockInput.isDown.mockReturnValue(false);

    // Force into dying state with 0 lives remaining
    (game as any).state = 'dying';
    (game as any).dyingTimer = 0.5;
    (game as any).player.lives = 0;

    // Advance time past the dying timer
    game.update(0.6);

    expect((game as any).state).toBe('gameover');
  });

  // ─── Test 8: dying → playing when dyingTimer expires and lives > 0 ───

  it('transitions from dying to playing when dyingTimer expires and lives > 0', () => {
    const mockInput = initGameWithMockInput();

    // Go to playing
    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.016);
    mockInput.justPressed.mockReturnValue(false);
    mockInput.isDown.mockReturnValue(false);

    // Force into dying state with lives remaining
    (game as any).state = 'dying';
    (game as any).dyingTimer = 0.5;
    (game as any).player.lives = 2;

    // Advance time past the dying timer
    game.update(0.6);

    expect((game as any).state).toBe('playing');
  });

  // ─── Test 9: dying stays dying while dyingTimer > 0 ──────────────────

  it('stays in dying state while dyingTimer has not expired', () => {
    initGameWithMockInput();

    (game as any).state = 'dying';
    (game as any).dyingTimer = 1.0;
    (game as any).player.lives = 1;

    game.update(0.3);

    expect((game as any).state).toBe('dying');
    expect((game as any).dyingTimer).toBeCloseTo(0.7, 1);
  });

  // ─── Test 10: gameover → ready on Space press after 1 second ─────────

  it('transitions from gameover to ready on Space press after 1 second', () => {
    const mockInput = initGameWithMockInput();

    // Force into gameover state
    (game as any).state = 'gameover';
    (game as any).stateTimer = 0;

    // Advance past 1 second
    game.update(1.1);

    // Now press Space
    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.016);

    expect((game as any).state).toBe('ready');
    expect((game as any).stateTimer).toBe(0);
  });

  // ─── Test 11: gameover does NOT transition before 1 second ───────────

  it('does not transition from gameover on Space press before 1 second', () => {
    const mockInput = initGameWithMockInput();

    // Force into gameover state
    (game as any).state = 'gameover';
    (game as any).stateTimer = 0;

    // Press Space before 1 second has elapsed
    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.5);

    expect((game as any).state).toBe('gameover');
  });

  // ─── Test 12: playing → nextwave when all aliens are dead ────────────

  it('transitions from playing to nextwave when all aliens are dead', () => {
    const mockInput = initGameWithMockInput();

    // Go to playing
    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.016);
    expect((game as any).state).toBe('playing');

    mockInput.justPressed.mockReturnValue(false);
    mockInput.isDown.mockReturnValue(false);

    // Kill all aliens
    const aliens = (game as any).aliens;
    for (const alien of aliens.aliens) {
      alien.alive = false;
    }

    game.update(0.016);

    expect((game as any).state).toBe('nextwave');
    expect((game as any).stateTimer).toBe(0);
  });

  // ─── Test 13: nextwave → playing after 2 seconds ─────────────────────

  it('transitions from nextwave to playing after 2 seconds', () => {
    initGameWithMockInput();

    // Force into nextwave state
    (game as any).state = 'nextwave';
    (game as any).stateTimer = 0;

    game.update(1.0);
    expect((game as any).state).toBe('nextwave');

    game.update(1.0);
    expect((game as any).state).toBe('nextwave');

    game.update(0.1);
    expect((game as any).state).toBe('playing');
  });

  // ─── Test 14: nextwave increments wave number ────────────────────────

  it('increments wave number when transitioning from nextwave to playing', () => {
    initGameWithMockInput();

    const initialWave = (game as any).wave;

    // Force into nextwave state
    (game as any).state = 'nextwave';
    (game as any).stateTimer = 0;

    // Advance past 2 seconds
    game.update(2.1);

    expect((game as any).state).toBe('playing');
    expect((game as any).wave).toBe(initialWave + 1);
  });

  // ─── Test 15: Escape calls onExit callback ───────────────────────────

  it('calls onExit callback when Escape is pressed', () => {
    const mockInput = initGameWithMockInput();
    const exitCallback = vi.fn();
    game.setOnExit(exitCallback);

    mockInput.justPressed.mockImplementation((code: string) => code === 'Escape');
    game.update(0.016);

    expect(exitCallback).toHaveBeenCalledOnce();
  });

  // ─── Test 16: Score increases when alien is killed ───────────────────

  it('increases score when an alien is killed by a player bullet', () => {
    const mockInput = initGameWithMockInput();

    // Go to playing
    mockInput.justPressed.mockImplementation((code: string) => code === 'Space');
    game.update(0.016);
    expect((game as any).state).toBe('playing');

    mockInput.justPressed.mockReturnValue(false);
    mockInput.isDown.mockReturnValue(false);

    const scoreBefore = (game as any).score;

    // Find the first alive alien and place a player bullet on top of it
    const aliens = (game as any).aliens;
    const targetAlien = aliens.aliens.find((a: any) => a.alive);
    expect(targetAlien).toBeDefined();

    const bullets = (game as any).bullets;
    bullets.spawnPlayerBullet(targetAlien.x, targetAlien.y, 0, 0);

    game.update(0.016);

    expect((game as any).score).toBeGreaterThan(scoreBefore);
  });
});
