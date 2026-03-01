import { lerp, clamp, randomRange, randomInt, distance, normalize, vec2, vec2Add, vec2Scale } from './math';

describe('lerp', () => {
  it('returns a when t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('returns b when t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('returns midpoint when t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });

  it('extrapolates when t > 1', () => {
    expect(lerp(0, 10, 2)).toBe(20);
  });

  it('extrapolates when t < 0', () => {
    expect(lerp(0, 10, -1)).toBe(-10);
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('randomRange', () => {
  it('returns value within [min, max)', () => {
    for (let i = 0; i < 50; i++) {
      const val = randomRange(5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it('returns min when Math.random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(randomRange(5, 10)).toBe(5);
    vi.restoreAllMocks();
  });

  it('approaches max when Math.random approaches 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(randomRange(5, 10)).toBeCloseTo(9.995, 2);
    vi.restoreAllMocks();
  });
});

describe('randomInt', () => {
  it('returns integer within [min, max]', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const val = randomInt(1, 6);
    expect(Number.isInteger(val)).toBe(true);
    expect(val).toBeGreaterThanOrEqual(1);
    expect(val).toBeLessThanOrEqual(6);
    vi.restoreAllMocks();
  });

  it('returns min when Math.random is 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(randomInt(3, 7)).toBe(3);
    vi.restoreAllMocks();
  });

  it('returns max when Math.random approaches 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(randomInt(3, 7)).toBe(7);
    vi.restoreAllMocks();
  });
});

describe('distance', () => {
  it('returns 0 for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('calculates 3-4-5 triangle', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('is commutative', () => {
    const a = { x: 1, y: 2 };
    const b = { x: 4, y: 6 };
    expect(distance(a, b)).toBe(distance(b, a));
  });

  it('handles negative coordinates', () => {
    expect(distance({ x: -3, y: 0 }, { x: 0, y: 4 })).toBe(5);
  });
});

describe('normalize', () => {
  it('returns unit vector with length ~1', () => {
    const result = normalize({ x: 3, y: 4 });
    const len = Math.sqrt(result.x * result.x + result.y * result.y);
    expect(len).toBeCloseTo(1, 10);
  });

  it('preserves direction', () => {
    const result = normalize({ x: 10, y: 0 });
    expect(result.x).toBeCloseTo(1);
    expect(result.y).toBeCloseTo(0);
  });

  it('returns {0,0} for zero vector', () => {
    const result = normalize({ x: 0, y: 0 });
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('normalizes negative vector', () => {
    const result = normalize({ x: -4, y: -3 });
    expect(result.x).toBeCloseTo(-0.8);
    expect(result.y).toBeCloseTo(-0.6);
  });
});

describe('vec2', () => {
  it('creates vector with correct components', () => {
    const v = vec2(3, 7);
    expect(v.x).toBe(3);
    expect(v.y).toBe(7);
  });
});

describe('vec2Add', () => {
  it('adds components', () => {
    const result = vec2Add({ x: 1, y: 2 }, { x: 3, y: 4 });
    expect(result.x).toBe(4);
    expect(result.y).toBe(6);
  });

  it('handles negative values', () => {
    const result = vec2Add({ x: 5, y: 3 }, { x: -2, y: -1 });
    expect(result.x).toBe(3);
    expect(result.y).toBe(2);
  });
});

describe('vec2Scale', () => {
  it('scales components', () => {
    const result = vec2Scale({ x: 2, y: 3 }, 4);
    expect(result.x).toBe(8);
    expect(result.y).toBe(12);
  });

  it('scales by zero', () => {
    const result = vec2Scale({ x: 5, y: 10 }, 0);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('scales by negative', () => {
    const result = vec2Scale({ x: 2, y: 3 }, -1);
    expect(result.x).toBe(-2);
    expect(result.y).toBe(-3);
  });
});
