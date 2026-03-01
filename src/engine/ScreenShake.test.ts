import { ScreenShake } from './ScreenShake';

describe('ScreenShake', () => {
  it('starts with zero offsets', () => {
    const shake = new ScreenShake();
    expect(shake.offsetX).toBe(0);
    expect(shake.offsetY).toBe(0);
  });

  it('has zero offsets when updated without triggering', () => {
    const shake = new ScreenShake();
    shake.update(0.016);
    expect(shake.offsetX).toBe(0);
    expect(shake.offsetY).toBe(0);
  });

  it('produces non-zero offsets after trigger', () => {
    const shake = new ScreenShake();
    shake.trigger(10, 1.0);
    shake.update(0.016);
    // offsets are random, but with intensity=10 they should usually be non-zero
    // We can't guarantee exact values due to Math.random, but at least one should be non-zero
    const hasMoved = shake.offsetX !== 0 || shake.offsetY !== 0;
    expect(hasMoved).toBe(true);
  });

  it('returns to zero offsets after duration expires', () => {
    const shake = new ScreenShake();
    shake.trigger(10, 0.5);
    // Advance past the duration, then update once more to zero out
    shake.update(0.6);
    shake.update(0.016);
    expect(shake.offsetX).toBe(0);
    expect(shake.offsetY).toBe(0);
  });

  it('decays intensity over time', () => {
    const shake = new ScreenShake();
    vi.spyOn(Math, 'random').mockReturnValue(0.75); // consistent random for testing

    shake.trigger(10, 1.0);

    // At t=0, remaining = 1.0, magnitude = 10
    shake.update(0.01);
    const earlyOffset = Math.abs(shake.offsetX) + Math.abs(shake.offsetY);

    // At t=0.9, remaining = 0.1, magnitude = 1
    shake.trigger(10, 1.0); // re-trigger to reset
    shake.update(0.9);
    const lateOffset = Math.abs(shake.offsetX) + Math.abs(shake.offsetY);

    expect(earlyOffset).toBeGreaterThan(lateOffset);

    vi.restoreAllMocks();
  });

  it('new trigger overrides previous shake', () => {
    const shake = new ScreenShake();
    shake.trigger(5, 1.0);
    shake.update(0.5); // halfway through first shake

    shake.trigger(20, 2.0); // new stronger shake
    shake.update(0.01);

    // Should be shaking with the new intensity, not zero
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    shake.update(0.01);
    const hasMoved = shake.offsetX !== 0 || shake.offsetY !== 0;
    expect(hasMoved).toBe(true);

    vi.restoreAllMocks();
  });

  it('zero intensity trigger produces zero offsets', () => {
    const shake = new ScreenShake();
    shake.trigger(0, 1.0);
    shake.update(0.1);
    // intensity=0 means magnitude=0, so offsets should be 0 (or -0)
    expect(shake.offsetX).toBeCloseTo(0);
    expect(shake.offsetY).toBeCloseTo(0);
  });
});
