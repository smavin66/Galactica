import { ObjectPool } from './ObjectPool';

function createItem() {
  return { value: 0 };
}

describe('ObjectPool', () => {
  describe('acquire', () => {
    it('returns an item from the pool', () => {
      const pool = new ObjectPool(5, createItem);
      const item = pool.acquire();
      expect(item).not.toBeNull();
    });

    it('returns different items on successive calls', () => {
      const pool = new ObjectPool(5, createItem);
      const a = pool.acquire();
      const b = pool.acquire();
      expect(a).not.toBe(b);
    });

    it('returns null when pool is exhausted', () => {
      const pool = new ObjectPool(2, createItem);
      pool.acquire();
      pool.acquire();
      expect(pool.acquire()).toBeNull();
    });

    it('increments activeCount', () => {
      const pool = new ObjectPool(5, createItem);
      expect(pool.activeCount).toBe(0);
      pool.acquire();
      expect(pool.activeCount).toBe(1);
      pool.acquire();
      expect(pool.activeCount).toBe(2);
    });
  });

  describe('release', () => {
    it('decrements activeCount', () => {
      const pool = new ObjectPool(5, createItem);
      const item = pool.acquire()!;
      expect(pool.activeCount).toBe(1);
      pool.release(item);
      expect(pool.activeCount).toBe(0);
    });

    it('allows item to be re-acquired', () => {
      const pool = new ObjectPool(1, createItem);
      const item = pool.acquire()!;
      pool.release(item);
      const reacquired = pool.acquire();
      expect(reacquired).toBe(item);
    });

    it('is no-op for non-member item', () => {
      const pool = new ObjectPool(3, createItem);
      pool.acquire();
      pool.release({ value: 999 }); // not in pool
      expect(pool.activeCount).toBe(1);
    });

    it('is no-op for double release', () => {
      const pool = new ObjectPool(3, createItem);
      const item = pool.acquire()!;
      pool.release(item);
      pool.release(item);
      expect(pool.activeCount).toBe(0);
    });
  });

  describe('forEachActive', () => {
    it('iterates only active items', () => {
      const pool = new ObjectPool(5, createItem);
      const a = pool.acquire()!;
      a.value = 1;
      const b = pool.acquire()!;
      b.value = 2;
      pool.acquire(); // third item, not modified

      const values: number[] = [];
      pool.forEachActive((item) => values.push(item.value));
      expect(values).toHaveLength(3);
      expect(values).toContain(1);
      expect(values).toContain(2);
    });

    it('skips released items', () => {
      const pool = new ObjectPool(3, createItem);
      const a = pool.acquire()!;
      a.value = 10;
      const b = pool.acquire()!;
      b.value = 20;
      pool.release(a);

      const values: number[] = [];
      pool.forEachActive((item) => values.push(item.value));
      expect(values).toEqual([20]);
    });

    it('does nothing on empty pool', () => {
      const pool = new ObjectPool(3, createItem);
      const fn = vi.fn();
      pool.forEachActive(fn);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('releaseIf', () => {
    it('releases items matching predicate', () => {
      const pool = new ObjectPool(5, createItem);
      const a = pool.acquire()!;
      a.value = 1;
      const b = pool.acquire()!;
      b.value = 2;
      const c = pool.acquire()!;
      c.value = 3;

      pool.releaseIf((item) => item.value > 1);
      expect(pool.activeCount).toBe(1);

      const remaining: number[] = [];
      pool.forEachActive((item) => remaining.push(item.value));
      expect(remaining).toEqual([1]);
    });

    it('releases nothing when nothing matches', () => {
      const pool = new ObjectPool(3, createItem);
      pool.acquire();
      pool.acquire();
      pool.releaseIf(() => false);
      expect(pool.activeCount).toBe(2);
    });
  });

  describe('releaseAll', () => {
    it('sets activeCount to 0', () => {
      const pool = new ObjectPool(5, createItem);
      pool.acquire();
      pool.acquire();
      pool.acquire();
      pool.releaseAll();
      expect(pool.activeCount).toBe(0);
    });

    it('allows all items to be re-acquired', () => {
      const pool = new ObjectPool(3, createItem);
      pool.acquire();
      pool.acquire();
      pool.acquire();
      pool.releaseAll();

      expect(pool.acquire()).not.toBeNull();
      expect(pool.acquire()).not.toBeNull();
      expect(pool.acquire()).not.toBeNull();
      expect(pool.activeCount).toBe(3);
    });
  });
});
