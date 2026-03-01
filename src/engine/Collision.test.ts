import { circleOverlap, rectOverlap, pointInRect } from './Collision';

describe('circleOverlap', () => {
  it('detects overlapping circles', () => {
    expect(circleOverlap({ x: 0, y: 0, r: 10 }, { x: 5, y: 0, r: 10 })).toBe(true);
  });

  it('detects concentric circles', () => {
    expect(circleOverlap({ x: 5, y: 5, r: 3 }, { x: 5, y: 5, r: 7 })).toBe(true);
  });

  it('detects one inside another', () => {
    expect(circleOverlap({ x: 0, y: 0, r: 20 }, { x: 1, y: 1, r: 2 })).toBe(true);
  });

  it('returns false for non-overlapping circles', () => {
    expect(circleOverlap({ x: 0, y: 0, r: 5 }, { x: 20, y: 0, r: 5 })).toBe(false);
  });

  it('returns false for touching circles (exclusive boundary)', () => {
    // distance = 10, radii sum = 10, uses strict < so touching = false
    expect(circleOverlap({ x: 0, y: 0, r: 5 }, { x: 10, y: 0, r: 5 })).toBe(false);
  });

  it('handles zero-radius circles at same point', () => {
    // dist=0, radii=0, 0 < 0 is false
    expect(circleOverlap({ x: 0, y: 0, r: 0 }, { x: 0, y: 0, r: 0 })).toBe(false);
  });
});

describe('rectOverlap', () => {
  it('detects overlapping rects', () => {
    expect(rectOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 }
    )).toBe(true);
  });

  it('detects one rect inside another', () => {
    expect(rectOverlap(
      { x: 0, y: 0, w: 20, h: 20 },
      { x: 5, y: 5, w: 5, h: 5 }
    )).toBe(true);
  });

  it('detects same rect', () => {
    const r = { x: 3, y: 4, w: 10, h: 10 };
    expect(rectOverlap(r, r)).toBe(true);
  });

  it('returns false for non-overlapping on x axis', () => {
    expect(rectOverlap(
      { x: 0, y: 0, w: 5, h: 5 },
      { x: 10, y: 0, w: 5, h: 5 }
    )).toBe(false);
  });

  it('returns false for non-overlapping on y axis', () => {
    expect(rectOverlap(
      { x: 0, y: 0, w: 5, h: 5 },
      { x: 0, y: 10, w: 5, h: 5 }
    )).toBe(false);
  });

  it('returns false for adjacent rects (touching edges)', () => {
    // Uses strict < so touching = false
    expect(rectOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 10, y: 0, w: 10, h: 10 }
    )).toBe(false);
  });

  it('handles partial overlap on one axis only', () => {
    expect(rectOverlap(
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 15, w: 10, h: 10 }
    )).toBe(false);
  });
});

describe('pointInRect', () => {
  it('returns true for point inside rect', () => {
    expect(pointInRect(5, 5, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
  });

  it('returns true for point on boundary (inclusive)', () => {
    expect(pointInRect(0, 0, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
    expect(pointInRect(10, 10, { x: 0, y: 0, w: 10, h: 10 })).toBe(true);
  });

  it('returns false for point outside left', () => {
    expect(pointInRect(-1, 5, { x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('returns false for point outside right', () => {
    expect(pointInRect(11, 5, { x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('returns false for point outside top', () => {
    expect(pointInRect(5, -1, { x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });

  it('returns false for point outside bottom', () => {
    expect(pointInRect(5, 11, { x: 0, y: 0, w: 10, h: 10 })).toBe(false);
  });
});
